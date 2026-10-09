import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { type LogEntry, readLog } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { formatEnd, readEffect } from "../effects/index.ts";
import { declaredKind, locate, type Page, pagesWithName, parsePageReference, systemPageNamed, textsIn, type World } from "../pages/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { effectShown } from "./game-effects.ts";
import { shownImage } from "./game-images.ts";
import { readJourney } from "./game-journey.ts";
import { type Knowledge, knowledgeOf, knownPart, knownText, knowsPage, playerCharacter } from "./game-knowledge.ts";
import { campaignCoins } from "./game-money.ts";
import { readOpenScene } from "./game-scene.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";
import { partyCounters } from "./page-counters.ts";
import { counterOf, sheetData, sheetGroup, type SheetGroupData, sheetText, type SheetValue } from "./sheet.ts";

// How many lines of the diary the view gives when no number is asked.
const diaryLines = 10;

/** Someone of the party as the player sees them (VIEW-1): the dashboard draws them (D-272), the chat reads them as a line. */
export interface PartyMember
{
    name: string;
    role: "pc" | "companion";
    dead: boolean;
    /** The file of their picture, their own or inherited (D-267). */
    image?: string;
    /** Where they are, as far as the player character knows the places: "in Ossario › Cripta", "elsewhere" or "in the open" (D-254, TRV-13). */
    place?: string;
    /** The numbers of their line, in its order (DAT-2). */
    counters: SheetValue[];
    /** Their effects, each with its end when it has one, and as the line writes it. */
    effects: { name: string; end?: string; text: string; }[];
}

/** What the player may see: the party, the open quests and scene and the diary; a page as the player character knows it, whole or one section; or nothing. */
export type ViewResult =
    | { kind: "none"; }
    | { kind: "overview"; party: PartyMember[]; quests: string[]; scene?: string; diary: string[]; total: number; }
    | { kind: "page"; title: string; sheet: SheetGroupData[]; text: string; }
    | { kind: "section"; title: string; lines: string[]; text: string; }
    | { kind: "unknown"; text: string; };

export const view = defineCommand({
    name: "view",
    description: "What the player may see, without spoilers: use it, not show, when the player asks what their character knows, remembers or carries. "
        + "Alone, it gives the player character and the companions, where they are and their numbers, the open quests, the open scene and the diary of what happened, "
        + "without your reasons. With a page, the page as the player character knows it: its introduction and public sections, only the secrets they discovered, "
        + "and the whole sheet of the character and the companions. A page they do not know reads as one that does not exist. "
        + "Example: page Varro; or diary 30.",
    group: "game",
    readOnly: true,
    positionals: ["page"],
    input: z.object({
        page: z.string().optional().describe("a page as the player character knows it, or Page#Name for one section or discovered secret; none for the whole view"),
        diary: z.string().optional().describe(`how many lines of the diary, from the last; ${diaryLines} if left out; all only when the player asks for the whole story`),
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
            const page = knownPage(world, knowledge, reference.name);
            const system = campaignSystem(root, context);

            if (page === undefined) {
                return { kind: "unknown", text: `${pc.name} does not know ${reference.name}.` };
            }

            const party = page === pc || page.fields.role === "companion";

            if (reference.section !== undefined && reference.section !== "") {
                const part = knownPart(world, knowledge, page, reference.section);
                // A group of the sheet of the character or a companion, as show gives it (DAT-2).
                const group = part === undefined && party ? sheetGroup(world, system, page, reference.section) : undefined;

                if (part === undefined && group === undefined) {
                    return { kind: "unknown", text: `${pc.name} knows nothing of ${page.name} called ${reference.section}.` };
                }

                return { kind: "section", title: `${page.name}#${group?.name ?? reference.section}`, lines: group?.lines ?? [], text: part ?? "" };
            }

            return { kind: "page", title: `${page.name} (${page.type ?? "page"})`, sheet: party ? sheetData(world, system, page) : [], text: knownText(world, knowledge, page) };
        }

        const { coins } = campaignCoins(root, context);
        const system = campaignSystem(root, context);

        const open = readJourney(root)?.at !== undefined;

        // Where someone is, as far as the character knows the places: elsewhere when it knows none of them (D-254).
        const member = (page: Page): PartyMember => {
            const chain = locate(world, page).chain;
            const where = chain.filter((holder) => knowsPage(knowledge, holder)).map((holder) => holder.name);
            // In no place at all while a journey stopped in the open (TRV-13).
            const place = where.length > 0 ? `in ${where.join(" › ")}` : chain.length > 0 ? "elsewhere" : open ? "in the open" : undefined;
            const image = shownImage(root, context, world, page);
            return {
                name: page.name,
                role: page === pc ? "pc" : "companion",
                dead: page.fields.status === "dead",
                ...(image === undefined ? {} : { image }),
                ...(place === undefined ? {} : { place }),
                counters: lineValues(world, page, partyCounters(world, page, coins, system)),
                effects: effectsOf(page).map((effect) => ({ name: effect.name, ...(effect.end === undefined ? {} : { end: formatEnd(effect.end) }), text: effectShown(world, effect) })),
            };
        };

        const companions = world.pages.filter((page) => page.type === "character" && page.fields.role === "companion");
        const named = (name: unknown): string | undefined => shownName(world, knowledge, name);
        const diary = readLog(root).filter((entry) => entry.visibility === "public").flatMap((entry) => diaryLine(world, entry, named));
        const shown = input.diary?.trim().toLowerCase() === "all" ? diary.length : diaryCount(input.diary);
        return {
            kind: "overview",
            party: [pc, ...companions].map(member),
            quests: world.pages.filter((page) => page.type === "quest" && page.fields.status === "open").map((page) => page.name),
            scene: sceneLine(root, named),
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
                return [result.title, sheetText(result.sheet).join("\n"), result.text].filter((block) => block !== "").join("\n\n");
            case "section":
                return [result.title, result.lines.join("\n"), result.text].filter((block) => block !== "").join("\n\n");

            default: {
                const more = result.diary.length < result.total ? ` (the last ${result.diary.length} of ${result.total}: view, diary all gives every one)` : "";
                return [
                    result.party.map(memberLine).join("\n"),
                    result.quests.length === 0 ? "" : `Open quests: ${result.quests.join(" · ")}`,
                    result.scene === undefined ? "" : `Scene: ${result.scene}`,
                    result.diary.length === 0 ? "Diary: nothing yet." : `Diary${more}:\n${result.diary.map((line) => `- ${line}`).join("\n")}`,
                ].filter((block) => block !== "").join("\n\n");
            }
        }
    },
});

/** "Lena (companion), in Locanda: hp 9/15 · Poisoned until day 2, 14:20": someone of the party as the chat reads them. */
function memberLine(member: PartyMember): string
{
    const role = member.role === "pc" ? "" : member.dead ? " (companion, dead)" : " (companion)";
    const shown = [member.counters.map((value) => `${value.field} ${value.text}`).join(" · "), ...member.effects.map((effect) => effect.text)].filter((part) => part !== "");
    return `${member.name}${role}${member.place === undefined ? "" : `, ${member.place}`}${shown.length === 0 ? "" : `: ${shown.join(" · ")}`}`;
}

/** The values of someone's line as data (DAT-2): as the line writes them, with a counter's limits. */
function lineValues(world: World, page: Page, counters: Record<string, unknown>): SheetValue[]
{
    const fields = effectiveFields(world, page);
    return Object.entries(counters).map(([field, value]) => {
        const kind = declaredKind(world, field);
        const counter = counterOf(world, fields, field, value);
        return { field, ...(kind === undefined ? {} : { kind }), text: String(value).trim(), ...(counter === undefined ? {} : { counter }), marks: 0 };
    });
}

/**
 * The page the player character knows by this name, of the campaign or of the system, or by one of its aliases (VIEW-2): only one it knows, so that neither two
 * pages of one name nor an alias tells that a page it does not know exists.
 */
function knownPage(world: World, knowledge: Knowledge, name: string): Page | undefined
{
    const one = (pages: Page[]): Page | undefined => {
        const known = pages.filter((page) => knowsPage(knowledge, page));
        return known.length === 1 ? known[0] : undefined;
    };

    const system = systemPageNamed(world, name);
    const named = pagesWithName(world, name);
    const aliased = world.pages.filter((page) => textsIn(page.fields.aliases).some((alias) => comparableText(alias.trim()) === comparableText(name.trim())));
    return one(named) ?? (named.length === 0 && system !== undefined ? one([system]) : undefined) ?? one(aliased);
}

/** A name as the view may write it: one of a page the player character knows; undefined for any other, which the view tells another way (D-254). */
function shownName(world: World, knowledge: Knowledge, name: unknown): string | undefined
{
    if (typeof name !== "string") {
        return undefined;
    }

    const reference = parsePageReference(name).name;
    const page = pagesWithName(world, reference)[0] ?? systemPageNamed(world, reference);
    return page !== undefined && knowsPage(knowledge, page) ? page.name : undefined;
}

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

/**
 * "Scontro all'ossario (combat), at Ossario, with Ennio, Lena, someone and 2 creatures": the open scene as the player sees it; who the character does not know
 * is someone, and the copies are counted, never named (D-254).
 */
function sceneLine(root: string, named: (name: unknown) => string | undefined): string | undefined
{
    const { scene } = readOpenScene(root);

    if (scene === undefined) {
        return undefined;
    }

    const people = scene.with.map((link) => named(link));
    const strangers = people.filter((name) => name === undefined).length;
    const copies = Object.keys(scene.copies).length;
    const present = [
        ...people.filter((name): name is string => name !== undefined),
        ...(strangers === 0 ? [] : [strangers === 1 ? "someone" : `${strangers} others`]),
        ...(copies === 0 ? [] : [copies === 1 ? "1 creature" : `${copies} creatures`]),
    ];
    const place = named(scene.place);
    const listed = present.length <= 1 ? present.join("") : `${present.slice(0, -1).join(", ")} and ${present.at(-1)}`;
    return `${scene.title} (${scene.type})${place === undefined ? "" : `, at ${place}`}${present.length === 0 ? "" : `, with ${listed}`}`;
}

/**
 * A public line of the log as the diary tells it (VIEW-4): the facts, with the game date, never the master's why; who and where the character does not know as
 * someone and somewhere (D-254). Lines of no story, as a setting changed, are left out.
 */
function diaryLine(world: World, entry: LogEntry, named: (name: unknown) => string | undefined): string[]
{
    const data = entry.data as Record<string, unknown>;
    const text = (value: unknown): string => (Array.isArray(value) ? value.map(String).join(", ") : String(value ?? ""));
    const who = (name: unknown): string => named(name) ?? (isCopyName(world, name) ? "A creature" : "Someone");
    const where = (name: unknown): string => named(name) ?? "somewhere";
    const pages = Array.isArray(data.pages) ? data.pages.map((name) => named(name) ?? "someone") : [];
    const fact = ((): string | undefined => {
        switch (entry.type) {
            case "scene-opened":
                return `Scene opened: ${text(data.title)} (${text(data.type)})`;
            case "scene-closed":
                return `Scene: ${text(data.title)} (${text(data.type)}): ${text(data.summary)}`;
            case "roll":
                return `${data.who === undefined ? "Roll" : who(data.who)}: ${text(data.result)}`;
            case "roll-revealed":
                return "A hidden roll was shown";
            case "counter-changed":
                return `${who(data.page)}: ${text(data.field)} ${text(data.before)} → ${text(data.after)}`;
            case "time-advanced":
                return data.from === undefined ? `The story starts on ${text(data.to)}` : `Time passes: ${text(data.from)} → ${text(data.to)}`;
            case "moved":
                return pages.every((name) => name === "someone") && named(data.to) === undefined ? undefined : `${pages.join(", ")} to ${data.to === null ? "the open" : where(data.to)}`;
            case "learned":
                return `${text(data.page)} learned: ${textsIn(data.knows).map(learnedText).join(", ")}`;
            case "effect-added":
                return `${who(data.page)}: ${effectText(world, text(data.effect))}`;
            case "effect-ended":
                return `${who(data.page)}: ${text(data.effect)} ended`;
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

/** Whether a name is a copy's in a scene, such as Lupo mannaro 1: a creature's name and a number, with no page of its own. */
function isCopyName(world: World, name: unknown): boolean
{
    const match = typeof name === "string" ? /^(.+) \d+$/.exec(name.trim()) : null;
    return match !== null && pagesWithName(world, match[0]).length === 0 && [...pagesWithName(world, match[1]), systemPageNamed(world, match[1])].some((page) => page?.type === "creature");
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
