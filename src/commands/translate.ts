import { z } from "zod";
import { readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { type ChatBatch, chatBatch, keepChatAnswer, languageName, shipsLanguage, type WordsSystem } from "./shared/page-words.ts";
import { newDatedLogEntry } from "./shared/time.ts";
import { campaignSystem } from "./shared/world.ts";

type TranslateResult =
    | { kind: "batch"; language: string; system?: string; batch: ChatBatch; kept?: number; dropped?: string[]; }
    | { kind: "done"; language: string; kept?: number; dropped?: string[]; };

export const translate = defineCommand({
    name: "translate",
    description: "Translate the player's dashboard into the campaign's language yourself, in the chat. "
        + "Once the player says yes as status offers it, or when they ask; only where the page does not ship that language and nothing here translates it in the background. "
        + "Without phrases it gives the first batch and how to translate it; call it again with each batch translated until it says the page is done. "
        + 'The page changes language batch by batch; tell the player only that it is being translated. Example: phrases {"p12": "Tung xúc xắc"}.',
    group: "campaign",
    input: z.object({
        phrases: z.union([z.record(z.string(), z.string()), z.string()]).optional().describe("the last batch translated: from each id, such as p12, to its translation"),
    }),

    run(input, context): TranslateResult
    {
        const root = requireCampaign(context.folder);
        const { home, page, language } = translationPlaces(context, readSettings(root).language?.toLowerCase());
        const found = campaignSystem(root, context);
        const system: WordsSystem | undefined = found === undefined ? undefined : { name: found.name, folder: found.folder, ...(found.version === undefined ? {} : { version: found.version }) };
        const answer = input.phrases === undefined ? undefined : readAnswer(input.phrases);
        const saved = answer === undefined ? undefined : keepChatAnswer(home, page, language, system, answer);

        if (saved !== undefined && saved.kept === 0) {
            throw new Error("None of these phrases was kept: give the last batch translated, from each id it gave, such as p12, to its translation, keeping every {name} as it is.");
        }

        // The page reads its words again when the campaign changes: this line tells it that more have come.
        if (saved !== undefined) {
            appendLogEntry(root, newDatedLogEntry(root, context, "page-translated", "hidden", { language, kept: saved.kept }));
        }

        const next = chatBatch(home, page, language, system);
        const keptPart = saved === undefined ? {} : { kept: saved.kept, dropped: saved.dropped };
        return next === undefined ? { kind: "done", language, ...keptPart } : { kind: "batch", language, ...(found === undefined ? {} : { system: found.name }), batch: next, ...keptPart };
    },

    format(result)
    {
        const name = languageName(result.language);
        const dropped = result.dropped === undefined || result.dropped.length === 0 ? "" : ` ${result.dropped.join(", ")} lost a {name} or came garbled: they come again.`;
        const kept = result.kept === undefined ? "" : `Kept ${result.kept}.${dropped}\n\n`;

        if (result.kind === "done") {
            return `${kept}The dashboard is now in ${name} on this computer, for every campaign. Tell the player it is ready, in a few words, and go on.`;
        }

        const { batch } = result;
        const lines = batch.entries.map((entry) => `${entry.id}${entry.kind === undefined ? "" : ` (${entry.kind})`}: ${entry.english} · it: ${entry.italian}`);
        const how = batch.part === "page"
            ? `Translate into ${name} (${result.language}) these phrases of the player's dashboard: its sheet, dice, quests, maps, saves and settings. Natural, concise ${name}, as a well-made game app: buttons and labels short, the player addressed informally where the language can. Keep RPG Engine, Codex, Claude and file names as they are.`
            : `Translate into ${name} (${result.language}) these words the game system${
                result.system === undefined ? "" : ` ${result.system}`
            } shows on the dashboard: where the game has an official translation in ${name}, its terms exactly, else the words its players use; one concept, one term. A group is a heading of the sheet, a field a short label, a word a name of the game, the headline the line under a character's name.`;
        return [
            `${kept}${how} Keep every {name} in braces exactly as it is. After each id, the English, then the Italian, written for the same page, which shows what it means.`,
            ...lines,
            `Then call translate with phrases: from each id to its translation. ${batch.left - batch.entries.length > 0 ? `${batch.left - batch.entries.length} more after these.` : "The last ones."}`,
        ].join("\n");
    },
});

/**
 * In the setup, with the dashboard open, the offer of status where the page lacks the campaign's language and nothing here translates it in the background
 * (D-423); undefined anywhere else.
 */
export function translationOffer(root: string, context: Context): string | undefined
{
    const language = readSettings(root).language?.toLowerCase();

    if (context.dashboard === undefined || language === undefined || context.home === undefined || context.pageFolder === undefined) {
        return undefined;
    }

    if (shipsLanguage(context.pageFolder, language) || context.writer?.ready() === true) {
        return undefined;
    }

    const found = campaignSystem(root, context);
    const left = chatBatch(context.home, context.pageFolder, language, found === undefined ? undefined : { name: found.name, folder: found.folder, ...(found.version === undefined ? {} : { version: found.version }) })?.left;
    const lacks = `The dashboard is not in ${languageName(language)} on this computer, and nothing here translates it in the background`;

    if (left === undefined) {
        return undefined;
    }

    // Where the engine can install them, a program first, by the player's account (D-424, D-425); the chat for whoever has none.
    return context.helpers === undefined
        ? `${lacks}: offer the player once to translate it now, in a couple of minutes, with translate; if they say no, it stays in English until they ask.`
        : `${lacks}. Ask the player once which account they have, and offer: with ChatGPT, any plan, to install Codex, with install codex (the page in the background, `
            + "pictures from Plus up); with Claude Pro or Max, Claude Code, with install claude (the page, and drawn pictures); with neither, to translate it now in the chat, "
            + "in a couple of minutes, with translate. If they say no, it stays in English until they ask.";
}

/** Where the translation goes and what it reads: the player's data folder and the built page, for a language the page does not ship; else why there is nothing to do. */
function translationPlaces(context: Context, language: string | undefined): { home: string; page: string; language: string; }
{
    if (language === undefined) {
        throw new Error("The campaign has no language yet: set it with config language, as the player confirms it, then translate.");
    }

    if (context.home === undefined || context.pageFolder === undefined) {
        throw new Error("This computer keeps no player's data here, so the dashboard cannot be translated: it stays in English.");
    }

    if (shipsLanguage(context.pageFolder, language)) {
        throw new Error(`The dashboard is already written in ${languageName(language)}: nothing to translate.`);
    }

    if (context.writer?.ready() === true) {
        throw new Error(`This computer translates the dashboard into ${languageName(language)} by itself, in the background: nothing to do in the chat.`);
    }

    return { home: context.home, page: context.pageFolder, language };
}

/** The phrases given: an object, or its JSON text from the command line. */
function readAnswer(phrases: Record<string, string> | string): Record<string, unknown>
{
    if (typeof phrases !== "string") {
        return phrases;
    }

    try {
        const parsed = JSON.parse(phrases) as unknown;
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
        throw new Error('Give phrases as an object from each id to its translation, such as {"p12": "Tung xúc xắc"}.');
    }
}
