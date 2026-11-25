// The table's chat with the master as the page reads it (D-582): what its place shows, the choice a chat opens with, what is told as it changes, and when its
// list follows what comes. No drawing here: the page's parts draw what these say.
import type { ChatChoice, ChatHost, ChatMessage, MasterShown } from "../data.ts";
import { t } from "../text.ts";

/** What the chat's place shows: where a chat is opened, a chat opened by hand in its place, the open chat, or one whose program ended. */
export type ChatView = "start" | "elsewhere" | "open" | "ended";

/**
 * Where the chat stands: its own section, from the page's top; beside the setup's questions, in sight as they scroll; under them, far down the page; or in
 * its panel beside the page, which gives it its room.
 */
export type ChatPlace = "section" | "beside" | "under" | "dock";

// The least room the open chat takes, however little the window leaves it, and the room it leaves under itself.
const leastRoom = 320;
const footRoom = 16;

/** How far from its end, in pixels, a list still counts as showing it: a line or so. */
export const endSlack = 32;

/** What the chat's place shows now. A chat that ended leaves its place to start another, unless one opened by hand plays meanwhile. */
export function chatView(shown: MasterShown): ChatView
{
    if (shown.chat !== undefined && shown.chat.state !== "ended") {
        return "open";
    }

    if (shown.elsewhere) {
        return "elsewhere";
    }

    return shown.chat === undefined ? "start" : "ended";
}

/** The apps a chat can open in, those on this computer, and the others, which the page only names. */
export function hostsFound(shown: MasterShown): { found: ChatHost[]; missing: ChatHost[]; }
{
    return { found: shown.hosts.filter((host) => host.found), missing: shown.hosts.filter((host) => !host.found) };
}

/** The choice a chat opens with before the player changes it: the campaign's last, when its app is on this computer, else the first app found; none with no app. */
export function firstChoice(shown: MasterShown): ChatChoice | undefined
{
    const { found } = hostsFound(shown);
    const host = found.find((one) => one.id === shown.last?.host) ?? found[0];
    return host === undefined ? undefined : choiceOf(shown, host.id);
}

/** The choice as an app is picked: the model and effort the campaign last played with in it, else the model it proposes and its own effort. */
export function choiceOf(shown: MasterShown, id: string): ChatChoice
{
    const host = shown.hosts.find((one) => one.id === id);
    const last = shown.last?.host === id ? shown.last : undefined;
    const effort = last?.effort !== undefined && host?.efforts.includes(last.effort) === true ? last.effort : undefined;
    return { host: id, model: last?.model ?? host?.model ?? "", ...(effort === undefined ? {} : { effort }) };
}

/** Whether a chat in this app takes up the campaign's last one. */
export function resumes(shown: MasterShown, host: string): boolean
{
    return shown.last?.resumable === true && shown.last.host === host;
}

/** What the master does in their turn, in words: the command they use now, when the table tells one; nothing out of a turn. */
export function turnWords(chat: MasterShown["chat"]): string | undefined
{
    if (chat?.state !== "turn") {
        return undefined;
    }

    return chat.tool === undefined ? t("The master is answering…") : t("The master is using {tool}…", { tool: chat.tool });
}

// How far a message's own length counts in the mark of what was heard: under a million characters, as the table keeps far fewer.
const mostLength = 1_000_000;

/**
 * How far what the master or the table said has come, as one number that only grows: the last message that is not the player's own, by its number, and
 * within it by how long it is, as the master's message grows while they answer; 0 with none.
 */
export function lastHeard(shown: MasterShown | undefined): number
{
    const last = shown?.messages.findLast((message) => message.from !== "player");
    return last === undefined ? 0 : last.id * mostLength + Math.min(last.text.length, mostLength - 1);
}

/**
 * Whether the master said something the player has not seen: more than they had said when the player last saw the chat. The messages there when the
 * page is opened count as seen, and so does everything when their numbers start again, as with a table started anew.
 */
export function unseenWords(seen: number | undefined, heard: number, inChat: boolean): { seen: number; unseen: boolean; }
{
    return seen === undefined || inChat || heard < seen ? { seen: heard, unseen: false } : { seen, unseen: heard > seen };
}

/** Whose words a message is, for whoever cannot see where it stands. */
export function speaker(from: ChatMessage["from"]): string
{
    return from === "player" ? t("You") : from === "master" ? t("The master") : t("The table");
}

/** The app, model and effort of a chat in one line, as its foot says them. */
export function choiceLine(shown: MasterShown, choice: ChatChoice): string
{
    const name = shown.hosts.find((host) => host.id === choice.host)?.name ?? choice.host;
    return [name, choice.model, ...(choice.effort === undefined ? [] : [choice.effort])].join(" · ");
}

/**
 * What a screen reader hears as the chat changes, once: that the master answers, then that they answered, or the table's word when the turn failed, or that
 * the chat ended; nothing while the master's words only grow.
 */
export function chatNews(before: MasterShown | undefined, now: MasterShown): string | undefined
{
    const was = before?.chat?.state;
    const state = now.chat?.state;

    if (state === "ended" && was !== "ended") {
        return endedWords(now.chat?.why);
    }

    if (state === "turn" && was !== "turn") {
        return t("The master is answering…");
    }

    if (was === "turn" && state === "idle") {
        const seen = Math.max(0, ...(before?.messages ?? []).map((message) => message.id));
        const told = now.messages.findLast((message) => message.from === "table" && message.id > seen);
        return told?.text ?? t("The master answered.");
    }

    return undefined;
}

/** That the chat ended, with why when the table says it. */
export function endedWords(why: string | undefined): string
{
    return why === undefined || why.trim() === "" ? t("The chat ended.") : t("The chat ended: {why}", { why });
}

/**
 * How tall the open chat is, in pixels: from where it starts in the page to the window's foot, or to the bar of the sections where one stands there, less
 * the room under it. Under the setup's questions it starts wherever they end: the window's height, less its own title and what the page keeps clear at
 * its foot on a phone, where a field that takes the focus is scrolled over the dice's button, so that the chat stands whole over it and stays put. Never
 * less than the least, however little the window leaves.
 */
export function chatRoom(place: ChatPlace, measures: { foot: number; top: number; title: number; clear: number; }): number
{
    const top = place === "under" ? measures.title + footRoom + measures.clear : measures.top;
    return Math.max(leastRoom, Math.floor(measures.foot - top - footRoom));
}

/** Whether a list scrolled so shows its end, within a line or so: then it follows what comes; farther up the player is reading, and it stays where it is. */
export function atEnd(list: { scrollTop: number; clientHeight: number; scrollHeight: number; }, slack = endSlack): boolean
{
    return list.scrollHeight - list.scrollTop - list.clientHeight <= slack;
}

/** Whether a key pressed in the player's words sends them: Enter alone; with Shift it starts a new line, and an input method composing a word keeps it. */
export function sendsWords(event: { key: string; shiftKey: boolean; isComposing: boolean; }): boolean
{
    return event.key === "Enter" && !event.shiftKey && !event.isComposing;
}

/** The player's words as they go: trimmed, none when they are empty or the master cannot take them now. */
export function wordsToSend(text: string, state: "idle" | "turn" | "ended" | undefined): string | undefined
{
    const words = text.trim();
    return words === "" || state !== "idle" ? undefined : words;
}
