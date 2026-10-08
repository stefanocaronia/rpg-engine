import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { type LogEntry, readLog } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { readEffect } from "../effects/index.ts";
import { findPage, locate, type Page, parsePageReference, textsIn, type World } from "../pages/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { effectShown } from "./game-effects.ts";
import { knowledgeOf, knownPart, knownText, knowsPage, playerCharacter } from "./game-knowledge.ts";
import { campaignCoins } from "./game-money.ts";
import { readOpenScene } from "./game-scene.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";
import { countersText, partyCounters } from "./page-counters.ts";
import { sheetLines } from "./sheet.ts";

// How many lines of the diary the view gives when no number is asked.
const diaryLines = 10;

type ViewResult =
    | { kind: "none"; }
    | { kind: "overview"; party: string[]; quests: string[]; scene?: string; diary: string[]; total: number; }
    | { kind: "page"; title: string; sheet: string[]; text: string; }
    | { kind: "unknown"; text: string; };

export const view = defineCommand({
    name: "view",
    description: "What the player may see, without spoilers: use it, not show, when the player asks what their character knows, remembers or carries. "
        + "Alone, it gives the player character and the companions, where they are and their numbers, the open quests, the open scene and the diary of what happened, "
        + "without your reasons. With a page, the page as the player character knows it: its introduction and public sections, only the secrets they discovered, "
        + "and the whole sheet of the character and the companions. A page they do not know reads as one that does not exist. "
        + "Example: page Varro; or diary all.",
    group: "game",
    readOnly: true,
    positionals: ["page"],
    input: z.object({
        page: z.string().optional().describe("a page as the player character knows it, or Page#Name for one section or discovered secret; none for the whole view"),
        diary: z.string().optional().describe(`how many lines of the diary, from the last, or all; ${diaryLines} if left out`),
    }),

    run(input, context): ViewResult
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const pc = playerCharacter(world);

        if (pc === undefined) {
            return { kind: "none" };
        }

        const knowledge = knowledgeOf(root, world, pc);

        if (input.page !== undefined && input.page.trim() !== "") {
            if (input.diary !== undefined) {
                throw new Error("Give page or diary, not both: diary goes with the whole view.");
            }

            const reference = parsePageReference(input.page);
            const page = findPage(world, reference.name);
            const unknown = { kind: "unknown" as const, text: `${pc.name} does not know ${reference.name}.` };

            if (page === undefined || !knowsPage(knowledge, page)) {
                return unknown;
            }

            if (reference.section !== undefined && reference.section !== "") {
                const part = knownPart(world, knowledge, page, reference.section);
                return part === undefined ? { kind: "unknown", text: `${pc.name} knows nothing of ${page.name} called ${reference.section}.` } : { kind: "page", title: `${page.name}#${reference.section}`, sheet: [], text: part };
            }

            const party = page === pc || page.fields.role === "companion";
            return { kind: "page", title: `${page.name} (${page.type ?? "page"})`, sheet: party ? sheetLines(world, campaignSystem(root, context), page) : [], text: knownText(world, knowledge, page) };
        }

        const { coins } = campaignCoins(root, context);
        const system = campaignSystem(root, context);

        const member = (page: Page): string => {
            const where = locate(world, page).chain.map((holder) => holder.name);
            const shown = [countersText(partyCounters(world, page, coins, system)), ...effectsOf(page).map((effect) => effectShown(world, effect))].filter((part) => part !== "");
            const role = page === pc ? "" : page.fields.status === "dead" ? " (companion, dead)" : " (companion)";
            return `${page.name}${role}${where.length === 0 ? "" : `, in ${where.join(" › ")}`}${shown.length === 0 ? "" : `: ${shown.join(" · ")}`}`;
        };

        const companions = world.pages.filter((page) => page.type === "character" && page.fields.role === "companion");
        const diary = readLog(root).filter((entry) => entry.visibility === "public").flatMap((entry) => diaryLine(world, entry));
        const shown = input.diary?.trim().toLowerCase() === "all" ? diary.length : diaryCount(input.diary);
        return {
            kind: "overview",
            party: [pc, ...companions].map(member),
            quests: world.pages.filter((page) => page.type === "quest" && page.fields.status === "open").map((page) => page.name),
            scene: sceneLine(root),
            diary: diary.slice(Math.max(0, diary.length - shown)),
            total: diary.length,
        };
    },

    format(result)
    {
        switch (result.kind) {
            case "none":
                return "There is no player character yet: the player's view starts with one.";
            case "unknown":
                return result.text;
            case "page":
                return [result.title, result.sheet.join("\n"), result.text].filter((block) => block !== "").join("\n\n");

            default: {
                const more = result.diary.length < result.total ? ` (the last ${result.diary.length} of ${result.total}: view, diary all gives every one)` : "";
                return [
                    result.party.join("\n"),
                    result.quests.length === 0 ? "" : `Open quests: ${result.quests.join(" · ")}`,
                    result.scene === undefined ? "" : `Scene: ${result.scene}`,
                    result.diary.length === 0 ? "Diary: nothing yet." : `Diary${more}:\n${result.diary.map((line) => `- ${line}`).join("\n")}`,
                ].filter((block) => block !== "").join("\n\n");
            }
        }
    },
});

/** How many lines of the diary are asked: a whole number from 1. */
function diaryCount(asked: string | undefined): number
{
    if (asked === undefined) {
        return diaryLines;
    }

    const count = Number(asked.trim());

    if (!Number.isInteger(count) || count < 1) {
        throw new Error(`"${asked}" is not how many lines of the diary: give a whole number from 1, or all.`);
    }

    return count;
}

/** "Scontro all'ossario (combat), at Ossario, with Ennio, Lena, Annegato 1": the open scene as the player sees it. */
function sceneLine(root: string): string | undefined
{
    const { scene } = readOpenScene(root);

    if (scene === undefined) {
        return undefined;
    }

    const present = [...scene.with.map((link) => parsePageReference(link).name), ...Object.keys(scene.copies)];
    const place = scene.place === undefined ? "" : `, at ${parsePageReference(scene.place).name}`;
    return `${scene.title} (${scene.type})${place}${present.length === 0 ? "" : `, with ${present.join(", ")}`}`;
}

/** A public line of the log as the diary tells it (VIEW-4): the facts, with the game date, never the master's why. Lines of no story, as a setting changed, are left out. */
function diaryLine(world: World, entry: LogEntry): string[]
{
    const data = entry.data as Record<string, unknown>;
    const text = (value: unknown): string => (Array.isArray(value) ? value.map(String).join(", ") : String(value ?? ""));
    const fact = ((): string | undefined => {
        switch (entry.type) {
            case "scene-opened":
                return `Scene opened: ${text(data.title)} (${text(data.type)})`;
            case "scene-closed":
                return `Scene: ${text(data.title)} (${text(data.type)}): ${text(data.summary)}`;
            case "roll":
                return `${data.who === undefined ? "Roll" : text(data.who)}: ${text(data.result)}`;
            case "roll-revealed":
                return "A hidden roll was shown";
            case "counter-changed":
                return `${text(data.page)}: ${text(data.field)} ${text(data.before)} → ${text(data.after)}`;
            case "time-advanced":
                return data.from === undefined ? `The story starts on ${text(data.to)}` : `Time passes: ${text(data.from)} → ${text(data.to)}`;
            case "moved":
                return `${text(data.pages)} to ${text(data.to)}`;
            case "learned":
                return `${text(data.page)} learned: ${textsIn(data.knows).map(learnedText).join(", ")}`;
            case "effect-added":
                return `${text(data.page)}: ${effectText(world, text(data.effect))}`;
            case "effect-ended":
                return `${text(data.page)}: ${text(data.effect)} ended`;
            case "saved":
                return `Saved: ${text(data.save)}${data.label === undefined ? "" : ` - ${text(data.label)}`}`;
            case "save-loaded":
                return `Back to save ${text(data.save)}: what came after it is gone`;
            case "mode-changed":
                return `The campaign is now in ${text(data.to)}`;
            default:
                return undefined;
        }
    })();
    return fact === undefined ? [] : [entry.date === undefined ? fact : `${entry.date} · ${fact}`];
}

/** "Coppa#Veleno": what was learned, as a link names it. */
function learnedText(link: string): string
{
    const reference = parsePageReference(link);
    return reference.section === undefined ? reference.name : `${reference.name}#${reference.section}`;
}

/** An effect as the player sees it: its name and its end, without who keeps it, which may be a secret. */
function effectText(world: World, line: string): string
{
    const read = readEffect(line);
    return "effect" in read ? effectShown(world, { ...read.effect, values: [] }) : line;
}
