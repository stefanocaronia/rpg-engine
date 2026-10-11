import { basename } from "node:path";
import { z } from "zod";
import { readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { lengthsInUnits } from "../core/length.ts";
import { type LogEntry, readLog } from "../core/log.ts";
import type { Mood } from "../core/mood.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { notationWords, type ThrownDie } from "../dice/index.ts";
import { readEffect } from "../effects/index.ts";
import { declaredKind, locate, type Page, pagesWithName, parsePageReference, systemPageNamed, textsIn, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { formatGameDate } from "../time/index.ts";
import { type PlayerSetting, setupQuestions, shownPlayerSettings } from "./config.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { effectShown } from "./game-effects.ts";
import { shownImage } from "./game-images.ts";
import { readJourney } from "./game-journey.ts";
import { type Knowledge, knowledgeOf, knownPart, knownText, knowsPage, playerCharacter } from "./game-knowledge.ts";
import { blockingMode, campaignMode, type Mode, modes } from "./game-mode.ts";
import { campaignCoins } from "./game-money.ts";
import { lastMoment, livingMood, masterMood, type MoodMoment } from "./game-moods.ts";
import { type Measures, measuresOf } from "./game-roads.ts";
import { campaignSaves, isPlayerDead, loadRefusal, loadRule, type ResetPoint, resetPoints, resetSave, type SaveMode, saveMode, savesWhy, wentBackTo } from "./game-saves.ts";
import { readOpenScene } from "./game-scene.ts";
import { readPresent } from "./game-time.ts";
import { questText, type ShownChapter, shownJournal, type ShownQuest } from "./game-view-journal.ts";
import { mapText, type ShownMap, shownMap } from "./game-view-map.ts";
import { type DyingCounter, dyingOf, seenEffect, type ShownPlace, shownPlace, type ShownScene, shownScene } from "./game-view-place.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";
import { countersText, lineCounters, lineExperience } from "./page-counters.ts";
import { counterOf, experienceProgress, sheetData, sheetGroup, type SheetGroupData, sheetHeadline, sheetText, type SheetValue, statBlock } from "./sheet.ts";
import { hasSheet } from "./worked-out.ts";

// How many lines of the diary the view gives when no number is asked.
const diaryLines = 10;

// How many rolls the view gives, the last ones.
const rollsShown = 20;

/** A roll the player may see (D-279): theirs, or one the master showed; never a hidden one. */
export interface ShownRoll
{
    id: string;
    /** The game date, when there is one. */
    date?: string;
    /** When it was rolled, in real time: ISO 8601 (D-299). */
    at: string;
    /** Who rolled it: the player, or the master. */
    by: "player" | "master";
    /** For whom, as the player character knows them: Ettore, Lupa, a creature. */
    who?: string;
    /** What the roll is, as the player sees it: the check the master asked, or what the master names a roll of theirs, such as Bite (D-292). */
    check?: string;
    /** The picture of whom it is for, when the player character knows them and they have one (D-286). */
    image?: { file: string; version: number; };
    /** Whom it is for is someone the player character does not know by name: a creature, someone (D-286). */
    stranger?: true;
    /** The notation in words, when it says more than its dice, as "2d20, keep the highest, +5" (D-292). */
    words?: string;
    notation: string;
    total: number;
    text: string;
    dice: ThrownDie[];
}

/** Someone of the party as the player sees them (VIEW-1): the dashboard draws them (D-272), the chat reads them as a line. */
export interface PartyMember
{
    name: string;
    role: "pc" | "companion";
    dead: boolean;
    /** Their picture, their own or from a base the player character knows (D-267, D-277): its file, and when it last changed. */
    image?: { file: string; version: number; };
    /** Where they are, as far as the player character knows the places: "in Ossario › Cripta", "elsewhere" or "in the open" (D-254, TRV-13). */
    place?: string;
    /** The numbers of their line, in its order (DAT-2). */
    counters: SheetValue[];
    /** Their effects, each with its end when it has one, and as the line writes it. */
    effects: { name: string; end?: string; text: string; }[];
    /** Their mood (MOOD-6); none when neutral, or dead. */
    mood?: Mood;
    /** At the system's dying point, as hp 0, the counters the dashboard shows large in their band (D-310 (7)). */
    dying?: DyingCounter[];
}

/** What the player may see: the party, the open quests and scene and the diary; a page as the player character knows it, whole or one section; or nothing. */
export type ViewResult =
    | { kind: "none"; }
    | {
        kind: "overview";
        campaign: string;
        /** The game system the campaign plays, for the dashboard: its name, what it is, and what its source asks a work that uses it to say (D-284). */
        system?: { name: string; title: string; attribution?: string; };
        now?: string;
        /** The master's mood, which the robot shows, and their last moment, which the dashboard shows for a few seconds when it is new (MOOD-4, MOOD-6). */
        master: { mood: Mood; moment?: MoodMoment; };
        party: PartyMember[];
        /** Where the player character is, and the open scene, as data for the dashboard (VIEW-6). */
        place?: ShownPlace;
        openScene?: ShownScene;
        quests: string[];
        scene?: string;
        diary: string[];
        total: number;
        rolls: ShownRoll[];
        /** How many public rolls the log has, for the dashboard to offer more (D-302). */
        rollsTotal: number;
    }
    | {
        kind: "page";
        title: string;
        /** The line under the character's name on the dashboard (D-288). */
        headline?: string;
        sheet: SheetGroupData[];
        /** Where the dashboard puts the groups of the sheet, as the system says (D-295), and those at hand in a fight (D-315). */
        cards?: { rail: string[]; order: string[]; atHand: string[]; };
        text: string;
    }
    | { kind: "section"; title: string; lines: string[]; text: string; }
    /** The world map as the player character knows it (VIEW-7). */
    | ({ kind: "map"; } & ShownMap)
    /** The player's settings, which the dashboard changes (D-341). */
    | { kind: "settings"; settings: PlayerSetting[]; }
    /** The setup (D-370): the mode, the campaign's name and whether it is still its folder's, what the next mode still needs, and the setup's questions. */
    | { kind: "setup"; mode: Mode; name: string; folderName: boolean; missing: string[]; questions: PlayerSetting[]; }
    /** The journal (D-367): the quests the player character knows, and the story by scenes. */
    | { kind: "journal"; now?: string; quests: ShownQuest[]; chapters: ShownChapter[]; }
    /** The saves and what the mode allows (D-359): make one, go back to some, start over from the first. */
    | { kind: "saves"; mode: SaveMode; rule: string; saves: ShownSave[]; make: boolean; reset: ResetPoint[]; wentBack?: string; }
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
        rolls: z.string().optional().describe(`for the dashboard: how many of the last public rolls; ${rollsShown} if left out`),
        map: z.boolean().optional().describe("the world map as the player character knows it: the places it knows, nearest the party first, with their kind, distance and direction, and the regions"),
        settings: z.boolean().optional().describe("for the dashboard: the player's settings, with their values and what each means"),
        saves: z.boolean().optional().describe("for the dashboard: the saves, with what the campaign's saves setting lets the player do with each"),
        setup: z.boolean().optional().describe("for the dashboard: the setup, with the campaign's mode and name, what the next mode needs, and the setup's questions"),
        journal: z.boolean().optional().describe("for the dashboard: the quests the character knows, with their goals, counters, clock and deadline, and the story by scenes"),
    }),

    run(input, context): ViewResult
    {
        const root = requireCampaign(context.folder);

        // The player's settings, with or without a player character (D-341).
        if (input.settings === true) {
            if ([input.page, input.diary, input.rolls, input.map, input.journal].some((given) => given !== undefined)) {
                throw new Error("Give settings alone: they are the player's settings, apart from the page, the diary, the rolls, the map and the journal.");
            }

            return { kind: "settings", settings: shownPlayerSettings(root, context) };
        }

        // The setup, with or without a player character (D-370).
        if (input.setup === true) {
            if ([input.page, input.diary, input.rolls, input.map, input.settings, input.saves, input.journal].some((given) => given !== undefined)) {
                throw new Error("Give setup alone: it is the campaign's setup, apart from the page, the diary, the rolls, the map, the settings, the saves and the journal.");
            }

            const world = campaignWorld(root, context);
            const mode = campaignMode(root, world);
            const next = modes[modes.indexOf(mode) + 1];
            const blocked = next === undefined ? undefined : blockingMode(next, root, context, world);
            const name = readSettings(root).name;
            return {
                kind: "setup",
                mode,
                name,
                folderName: comparableText(name) === comparableText(basename(root)),
                missing: blocked?.missing ?? [],
                questions: setupQuestions(root, context, world.pages.length > 0),
            };
        }

        if (input.saves === true) {
            if ([input.page, input.diary, input.rolls, input.map, input.settings, input.journal].some((given) => given !== undefined)) {
                throw new Error("Give saves alone: they are the campaign's saves, apart from the page, the diary, the rolls, the map, the settings and the journal.");
            }

            return shownSaves(root, context);
        }

        const world = campaignWorld(root, context);
        const pc = playerCharacter(world);

        if (pc === undefined) {
            return { kind: "none" };
        }

        const knowledge = knowledgeOf(root, world, pc);

        // The journal (D-367, VIEW-8, VIEW-9).
        if (input.journal === true) {
            if ([input.page, input.diary, input.rolls, input.map].some((given) => given !== undefined)) {
                throw new Error("Give journal alone: it is the quests and the story, apart from the page, the diary, the rolls and the map.");
            }

            const present = readPresent(root).date;
            const known = (name: unknown): string | undefined => shownName(world, knowledge, name);
            return {
                kind: "journal",
                ...(present === undefined ? {} : { now: formatGameDate(present) }),
                ...shownJournal(root, world, knowledge, present, (entry) => diaryLine(world, entry, known), known),
            };
        }

        if (input.map === true && [input.page, input.diary, input.rolls].some((given) => given !== undefined)) {
            throw new Error("Give map alone: it is the world map, apart from the page, the diary and the rolls.");
        }

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

            // A companion who keeps no sheet shows the stat block of the creature it derives from (D-275).
            const sheet = speedInUnits(!party ? [] : hasSheet(world, page) ? sheetData(world, system, page) : statBlock(world, system, page), system, measuresOf(root, system));
            const headline = party ? sheetHeadline(world, system, page) : undefined;
            const cards = party && hasSheet(world, page) ? system?.sheetCards : undefined;
            return {
                kind: "page",
                title: `${page.name} (${page.type ?? "page"})`,
                ...(headline === undefined ? {} : { headline }),
                sheet,
                ...(cards === undefined ? {} : { cards }),
                text: knownText(world, knowledge, page),
            };
        }

        const { coins } = campaignCoins(root, context);
        const system = campaignSystem(root, context);

        const open = readJourney(root)?.at !== undefined;
        const companions = world.pages.filter((page) => page.type === "character" && page.fields.role === "companion");
        const sight = { root, context, world, knowledge, party: [pc, ...companions] };

        if (input.map === true) {
            return { kind: "map", ...shownMap(sight, measuresOf(root, system), readSettings(root).name) };
        }

        // Where someone is, as far as the character knows the places: elsewhere when it knows none of them (D-254).
        const member = (page: Page): PartyMember => {
            const chain = locate(world, page).chain;
            const where = chain.filter((holder) => knowsPage(knowledge, holder)).map((holder) => holder.name);
            // In no place at all while a journey stopped in the open (TRV-13).
            const place = where.length > 0 ? `in ${where.join(" › ")}` : chain.length > 0 ? "elsewhere" : open ? "in the open" : undefined;
            const image = shownImage(root, context, world, page, (base) => knowsPage(knowledge, base));
            const mood = livingMood(page);
            const dying = dyingOf(world, system, page);
            return {
                name: page.name,
                role: page === pc ? "pc" : "companion",
                dead: page.fields.status === "dead",
                ...(image === undefined ? {} : { image }),
                ...(place === undefined ? {} : { place }),
                counters: lineValues(world, page, lineCounters(world, page, coins, system)),
                effects: effectsOf(page).map((effect) => seenEffect(sight, effect)),
                ...(mood === "neutral" ? {} : { mood }),
                ...(dying === undefined ? {} : { dying }),
            };
        };

        const now = readPresent(root).date;
        const named = (name: unknown): string | undefined => shownName(world, knowledge, name);

        // The picture of someone the log names, as the player character knows them.
        const picture = (name: unknown): ShownRoll["image"] => {
            const page = knownNamedPage(world, knowledge, name);
            return page === undefined ? undefined : shownImage(root, context, world, page, (base) => knowsPage(knowledge, base));
        };

        const shownLines = readLog(root).filter((entry) => entry.visibility === "public");
        const moment = lastMoment(shownLines);
        const diary = shownLines.flatMap((entry) => diaryLine(world, entry, named));
        const shown = input.diary?.trim().toLowerCase() === "all" ? diary.length : diaryCount(input.diary);
        const shownRolls = shownLines.filter((entry) => entry.type === "roll");
        const place = shownPlace(sight);
        const openScene = shownScene(sight);
        return {
            kind: "overview",
            campaign: readSettings(root).name,
            ...(system === undefined ? {} : { system: { name: system.name, title: system.title, ...(system.attribution === undefined ? {} : { attribution: system.attribution }) } }),
            ...(now === undefined ? {} : { now: formatGameDate(now) }),
            master: { mood: masterMood(root), ...(moment === undefined ? {} : { moment }) },
            party: [pc, ...companions].map(member),
            ...(place === undefined ? {} : { place }),
            ...(openScene === undefined ? {} : { openScene }),
            quests: world.pages.filter((page) => page.type === "quest" && page.fields.status === "open").map((page) => page.name),
            scene: sceneLine(root, named),
            diary: diary.slice(Math.max(0, diary.length - shown)),
            total: diary.length,
            rolls: shownRolls.slice(-rollCount(input.rolls)).map((entry) => shownRoll(world, entry, named, picture)),
            rollsTotal: shownRolls.length,
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
            case "map":
                return mapText(result);
            case "settings":
                return result.settings.map((setting) => `${setting.name}: ${settingText(setting)}`).join("\n");
            case "setup":
                return [
                    `${result.name}: ${result.mode}${result.missing.length === 0 ? "" : `; still missing: ${result.missing.join(", ")}`}`,
                    ...result.questions.map((question) => `${question.name}: ${question.items === undefined ? (question.value ?? "(not chosen)") : question.items.length === 0 ? "(none)" : question.items.join(", ")}`),
                ].join("\n");
            case "journal":
                return [
                    ...(result.quests.length === 0 ? ["No quests yet."] : result.quests.map(questText)),
                    ...result.chapters.map((chapter) => `${chapter.title ?? "Between scenes"}${chapter.date === undefined ? "" : `, ${chapter.date}`}${chapter.summary === undefined ? "" : `: ${chapter.summary}`}`),
                ].join("\n");
            case "saves":
                return [
                    ...result.saves.map((save) => `${save.number} - ${save.label}${save.place === undefined ? "" : `, in ${save.place}`}${save.point === undefined ? "" : ` (${save.point})`}${save.load ? "" : " (not to go back to)"}`),
                    result.rule,
                ].join("\n");

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

/** A public roll of the log as the player sees it: who rolled, for whom as the character knows them, the check, the dice; never the master's why (VIEW-4). */
function shownRoll(world: World, entry: LogEntry, named: (name: unknown) => string | undefined, picture: (name: unknown) => ShownRoll["image"]): ShownRoll
{
    const data = entry.data as { who?: unknown; check?: unknown; notation?: unknown; total?: unknown; result?: unknown; dice?: unknown; physical?: unknown; };
    const known = data.who === undefined ? undefined : named(data.who);
    const who = data.who === undefined ? undefined : known ?? (isCopyName(world, data.who) ? "a creature" : "someone");
    const image = known === undefined ? undefined : picture(data.who);
    const words = notationWords(String(data.notation ?? ""));
    return {
        id: entry.id,
        ...(entry.date === undefined ? {} : { date: entry.date }),
        at: entry.at,
        // Physical dice are the player's, though the master writes their values.
        by: entry.by === "player" || data.physical === true ? "player" : "master",
        ...(who === undefined ? {} : { who }),
        ...(image === undefined ? {} : { image }),
        ...(who !== undefined && known === undefined ? { stranger: true as const } : {}),
        ...(typeof data.check === "string" ? { check: data.check } : {}),
        notation: String(data.notation ?? ""),
        ...(words === undefined ? {} : { words }),
        total: Number(data.total ?? 0),
        text: String(data.result ?? ""),
        dice: Array.isArray(data.dice) ? (data.dice as ThrownDie[]) : [],
    };
}

/** "Lena (companion, worried), in Locanda: hp 9/15 · Poisoned until day 2, 14:20": someone of the party as the chat reads them. */
function memberLine(member: PartyMember): string
{
    // A dead companion's line says so; the player character's never did.
    const told = [member.role === "pc" ? "" : "companion", member.dead && member.role === "companion" ? "dead" : member.mood ?? ""].filter((part) => part !== "");
    const role = told.length === 0 ? "" : ` (${told.join(", ")})`;
    const counters = countersText(Object.fromEntries(member.counters.map((value) => [value.field, value.beside === undefined ? value.text : `${value.text} (${value.beside})`])));
    const shown = [counters, ...member.effects.map((effect) => effect.text)].filter((part) => part !== "");
    return `${member.name}${role}${member.place === undefined ? "" : `, ${member.place}`}${shown.length === 0 ? "" : `: ${shown.join(" · ")}`}`;
}

/** The values of someone's line as data (DAT-2): as the line writes them, with a counter's limits, and beside the experience what the next level needs (PRO-6). */
function lineValues(world: World, page: Page, counters: Record<string, unknown>): SheetValue[]
{
    const fields = effectiveFields(world, page);
    const experience = lineExperience(world, page, counters);
    return Object.entries(counters).map(([field, value]) => {
        const kind = declaredKind(world, field);
        const counter = counterOf(world, fields, field, value);
        const progress = experienceProgress(world, fields, field);
        const beside = field === experience?.field ? experience.text : undefined;
        return {
            field,
            ...(kind === undefined ? {} : { kind }),
            text: String(value).trim(),
            ...(counter === undefined ? {} : { counter }),
            marks: 0,
            ...(beside === undefined ? {} : { beside }),
            ...(progress === undefined ? {} : { progress }),
        };
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
    return knownNamedPage(world, knowledge, name)?.name;
}

/** The page the player character knows by a name the log writes, of the campaign or of the system. */
function knownNamedPage(world: World, knowledge: Knowledge, name: unknown): Page | undefined
{
    if (typeof name !== "string") {
        return undefined;
    }

    const reference = parsePageReference(name).name;
    const page = pagesWithName(world, reference)[0] ?? systemPageNamed(world, reference);
    return page !== undefined && knowsPage(knowledge, page) ? page : undefined;
}

/** How many rolls the dashboard asks for: a whole number from 1. */
function rollCount(asked: string | undefined): number
{
    const count = asked === undefined ? rollsShown : Number(asked.trim());

    if (!Number.isInteger(count) || count < 1) {
        throw new Error(`"${asked}" is not how many rolls: give a whole number from 1.`);
    }

    return count;
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
                return `${who(data.page)}: ${effectText(world, text(data.effect), named)}`;
            case "effect-ended":
                return `${who(data.page)}: ${text(data.effect)} ended`;
            case "saved":
                return `Saved: ${text(data.save)}${data.label === undefined ? "" : ` - ${text(data.label)}`}`;
            case "save-loaded":
                return `Back to save ${text(data.save)}: what came after it is gone`;
            case "mode-changed":
                return `The campaign is now in ${text(data.to)}`;
            case "quest-changed":
                return `${data.status === "open" ? "Quest taken" : data.status === "done" ? "Quest completed" : "Quest failed"}: ${named(data.quest) ?? text(data.quest)}`;
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

/** An effect as the player sees it: its name and its end, without who keeps it, which may be a secret; an end at someone's turn names them as the diary does. */
function effectText(world: World, line: string, named: (name: unknown) => string | undefined): string
{
    const read = readEffect(line);

    if (!("effect" in read)) {
        return line;
    }

    const end = read.effect.end;
    const seen = end !== undefined && "turn" in end ? { end: { ...end, turn: named(end.turn) ?? (isCopyName(world, end.turn) ? "a creature" : "someone") } } : {};
    return effectShown(world, { ...read.effect, values: [], ...seen });
}

/** A sheet with the speed told in the units of the story (D-328), as the maps tell their measures: 30 ft is 9 m in metric. */
function speedInUnits(groups: SheetGroupData[], system: GameSystem | undefined, measures: Measures): SheetGroupData[]
{
    const field = system?.grid?.speed;
    const told = (value: SheetValue): SheetValue => (field !== undefined && comparableText(value.field) === comparableText(field) ? { ...value, text: lengthsInUnits(value.text, measures.units, measures.imperial) } : value);
    return groups.map((group) => ({ ...group, values: group.values.map(told), ...(group.items === undefined ? {} : { items: group.items.map((item) => ({ ...item, values: item.values.map(told) })) }) }));
}

/** A setting of the player's in the chat: a list's items, none for an empty one, or its value; not chosen while it has none. */
function settingText(setting: PlayerSetting): string
{
    return setting.items === undefined ? (setting.value ?? "(not chosen)") : setting.items.length === 0 ? "(none)" : setting.items.join(", ");
}

/**
 * A save as the dashboard shows it (D-359): its number and label, the words that name it and the game date, when it was made in real time, the place the party
 * was in with its kind and picture, the point of a reset it is, and whether the player may go back to it, never to such a point, which is a reset's (D-361).
 */
export interface ShownSave
{
    number: number;
    label: string;
    name?: string;
    date?: string;
    at?: string;
    place?: string;
    kind?: string;
    picture?: { file: string; version: number; };
    point?: ResetPoint;
    load: boolean;
}

/** The saves, newest first, each with whether the mode lets the player go back to it; whether they may make one, and the points they may start over from (D-359). */
function shownSaves(root: string, context: Context): Extract<ViewResult, { kind: "saves"; }>
{
    const mode = saveMode(root);
    const saves = campaignSaves(root);
    const why = savesWhy(root);
    const points = new Map(resetPoints.flatMap((point) => {
        const save = resetSave(saves, why, point);
        return save === undefined ? [] : [[save.number, point] as const];
    }));
    const world = campaignWorld(root, context);
    const dead = isPlayerDead(world);
    const made = new Map(readLog(root).filter((entry) => entry.type === "saved").map((entry) => [Number((entry.data as { save?: unknown; }).save), entry]));

    const madeOf = (number: number): Partial<ShownSave> => {
        const entry = made.get(number);
        const { label, place } = (entry?.data ?? {}) as { label?: unknown; place?: unknown; };
        return {
            ...(typeof label === "string" ? { name: label } : {}),
            ...(entry?.date === undefined ? {} : { date: entry.date }),
            ...(entry === undefined ? {} : { at: entry.at }),
            ...(typeof place === "string" ? savedPlace(root, context, world, place) : {}),
        };
    };

    return {
        kind: "saves",
        mode,
        rule: loadRule(mode),
        saves: saves.map((save) => ({
            number: save.number,
            label: save.label,
            ...madeOf(save.number),
            ...(points.has(save.number) ? { point: points.get(save.number) } : {}),
            load: !points.has(save.number) && loadRefusal(mode, saves, save, dead) === undefined,
        })).toReversed(),
        make: mode === "free",
        reset: resetPoints.filter((point) => [...points.values()].includes(point)),
        // Until the player confirms a new chat with the master (D-362).
        ...(wentBackTo(root) === undefined ? {} : { wentBack: wentBackTo(root) }),
    };
}

/** The place a save was made in, with its picture, else that of the nearest place that holds it, as a room of the inn shows the inn. */
function savedPlace(root: string, context: Context, world: World, name: string): { place: string; kind?: string; picture?: { file: string; version: number; }; }
{
    const page = pagesWithName(world, name)[0];
    const kind = page?.fields.kind;
    const picture = page === undefined
        ? undefined
        : [page, ...locate(world, page).chain].map((holder) => shownImage(root, context, world, holder)).find((image) => image !== undefined);
    return { place: name, ...(typeof kind === "string" ? { kind } : {}), ...(picture === undefined ? {} : { picture }) };
}
