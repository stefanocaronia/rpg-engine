import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { type ChatMessage, undoneAt } from "../chats/index.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { campaignChats, undoneStretches } from "./shared/campaign/chats.ts";

// How many passages a search shows, the newest first; the others are counted.
const shownPassages = 8;
// About how many characters a passage shows around the words found.
const passageLength = 320;
// About how many characters a day's reading gives at once: the rest is read from where it stopped.
const readLength = 24_000;

export const chats = defineCommand({
    name: "chats",
    description: "Read what the player and you said in the campaign's past chats, kept as text: what was narrated or promised, a detail described, a name said and never written. "
        + "Give words to find the passages that hold them, the newest first; a day, as find gives it, to read that day's chats in order; nothing to list the days. "
        + "What a loaded save undid is left out: it did not happen. The chat going on is yours already, and may be a few minutes behind here.",
    group: "game",
    readOnly: true,
    positionals: ["text"],
    input: z.object({
        text: z.string().optional().describe("words to find in the chats, ignoring case and accents"),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a day is written 2026-11-19").optional().describe("a day of real time, as 2026-11-19, to read its chats in order"),
        from: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "a time is written 21:40 or 21:40:15").optional().describe("with day: read from this time (UTC), where the last reading stopped"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const undone = undoneStretches(root);
        const all = campaignChats(root).flatMap((chat) => chat.messages).sort((one, other) => one.at.localeCompare(other.at));
        const standing = all.filter((message) => undoneAt(message.at, undone) === undefined);
        const leftOut = all.length - standing.length;

        if (input.day !== undefined) {
            const day = input.day;
            const from = input.from === undefined ? `${day}T00:00:00Z` : `${day}T${input.from.length === 5 ? `${input.from}:00` : input.from}Z`;
            const ofDay = (messages: ChatMessage[]): ChatMessage[] => messages.filter((message) => message.at.startsWith(day) && message.at >= from);
            const read = upTo(ofDay(standing), readLength);
            return { kind: "day" as const, day, messages: read, next: ofDay(standing)[read.length]?.at, leftOut: ofDay(all).length - ofDay(standing).length };
        }

        const words = comparableText(input.text ?? "").split(/\s+/).filter((word) => word !== "");

        if (words.length === 0) {
            const days = new Map<string, number>();
            standing.forEach((message) => days.set(message.at.slice(0, 10), (days.get(message.at.slice(0, 10)) ?? 0) + 1));
            return { kind: "days" as const, days: [...days].reverse(), leftOut };
        }

        const holds = (message: ChatMessage): boolean => words.every((word) => comparableText(message.text).includes(word));
        const found = standing.filter(holds).reverse();
        return {
            kind: "found" as const,
            passages: found.slice(0, shownPassages).map((message) => ({ ...message, text: passage(message.text, words[0] ?? "") })),
            more: Math.max(0, found.length - shownPassages),
            leftOut: all.filter(holds).length - found.length,
        };
    },

    format(result)
    {
        const undone = result.leftOut > 0
            ? `\n\n${result.leftOut} message${result.leftOut === 1 ? "" : "s"} of what a loaded save undid ${result.leftOut === 1 ? "is" : "are"} left out: ${result.leftOut === 1 ? "it" : "they"} did not happen.`
            : "";

        if (result.kind === "days") {
            return result.days.length === 0
                ? `The campaign keeps no chat yet: they are copied from Claude Code and Codex as the game goes on.${undone}`
                : `Days with chats, the newest first (give one as day to read it):\n${result.days.map(([day, count]) => `${day}: ${count} messages`).join("\n")}${undone}`;
        }

        if (result.kind === "day") {
            const lines = result.messages.map((message) => `${message.at.slice(11, 19)} ${speaker(message)}: ${message.text}`);
            const rest = result.next === undefined ? "" : `\n\nThe day goes on: call chats again with day ${result.day} and from ${result.next.slice(11, 19)}.`;
            return `${lines.length === 0 ? `No chat of ${result.day}${result.next === undefined ? "" : " from then"}: call chats without words for the days.` : lines.join("\n\n")}${rest}${undone}`;
        }

        const lines = result.passages.map((message) => `${message.at.slice(0, 16).replace("T", " ")} ${speaker(message)}: ${message.text}`);
        const more = result.more > 0 ? `\n\nAnd ${result.more} older: give more words, or read their day.` : "";
        return `${lines.length === 0 ? "No chat holds those words. What happened only in this chat is yours already." : lines.join("\n\n")}${more}${undone}`;
    },
});

function speaker(message: ChatMessage): string
{
    return message.who === "player" ? "Player" : "Master";
}

/** The messages from the first, as many as fit in `length` characters, one at least. */
function upTo(messages: ChatMessage[], length: number): ChatMessage[]
{
    let used = 0;
    return messages.filter((message, index) => {
        used += message.text.length;
        return index === 0 || used <= length;
    });
}

/** The part of a message around the first word found, on one line. */
function passage(text: string, word: string): string
{
    const flat = text.replace(/\s+/g, " ").trim();

    if (flat.length <= passageLength) {
        return flat;
    }

    const at = Math.max(0, comparableText(flat).indexOf(word));
    const start = Math.max(0, Math.min(at - passageLength / 3, flat.length - passageLength));
    return `${start > 0 ? "…" : ""}${flat.slice(start, start + passageLength).trim()}${start + passageLength < flat.length ? "…" : ""}`;
}
