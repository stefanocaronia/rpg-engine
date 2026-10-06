import { join } from "node:path";
import { z } from "zod";
import { houseRulesFolderName, missingSettings, readSettings, requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { isInParty, isPartyMember, locate, type Page, pagesWithName, parsePageReference, type World } from "../pages/index.ts";
import { bookTitles, readRuleBook } from "../rules/index.ts";
import { type Scene, sceneTypes } from "../scene/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { formatGameDate } from "../time/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { effectShown, keptEffects } from "./game-effects.ts";
import { surroundings, surroundingsText } from "./game-environment.ts";
import { clocksToMove, dueAdvice, dueText, isDated, isDue, plannedEvents, plannedText, worldFacts } from "./game-events.ts";
import { campaignCoins } from "./game-money.ts";
import { type ClosedScene, closedScenes, copyCounters, copyPage, partyAwayText, readOpenScene } from "./game-scene.ts";
import { problemText, readPresent } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingWithSystems, systemInStatus } from "./game-world.ts";
import { missingSettingsNote } from "./notes.ts";
import { countersText, missingSheetFields, pageCounters, partyCounters } from "./page-counters.ts";
import { campaignProblems } from "./problems.ts";

// Lists in the status show this many names, then say how many more there are and how to find them.
const shownNames = 3;

/** A member of the player's party as the status shows them. */
interface Member
{
    name: string;
    /** The containers the member is in, nearest first. */
    where: string[];
    /** Whether the member is where the first player character is. */
    withLead: boolean;
    counters: string[];
    /** Its effects, with their end: "Spaventato (until round 3, Lena)". */
    effects: string[];
}

export const status = defineCommand({
    name: "status",
    description: "Show where the game stands. "
        + "It gives the campaign's settings, the player character and companions with their counters and whereabouts, who is with them, open quests, "
        + "the game date, the events due and planned, the open scene and the last ones, problems. "
        + "Call it right after instructions at the start of every chat and after a summary, and whenever you need to check where things stand. "
        + "It shows names and numbers only: read pages with show. Read-only, no parameters.",
    group: "game",
    readOnly: true,
    alwaysLoad: true,
    input: z.object({}),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const settings = readSettings(root);
        const world = campaignWorld(root, context);
        const characters = world.pages.filter((page) => page.type === "character");
        const players = characters.filter((page) => page.fields.role === "pc");
        const place = players.length > 0 ? placeOf(world, players[0]) : undefined;
        const withLead = (page: Page): boolean => place !== undefined && placeOf(world, page) === place;
        const { coins } = campaignCoins(root, context);
        const system = campaignSystem(root, context);
        const openScene = readOpenScene(root);
        const member = (page: Page): Member => ({
            name: characterName(page),
            where: locate(world, page).chain.map((holder) => holder.name),
            withLead: withLead(page),
            counters: Object.entries(partyCounters(world, page, coins, system)).map(([field, value]) => countersText({ [field]: value })),
            effects: [...effectsOf(page).map((effect) => effectShown(world, effect)), ...keptEffects(world, openScene.scene, page.name).map((kept) => `keeps ${kept}`)],
        });
        const present = readPresent(root);
        const now = present.date;
        const events = plannedEvents(world);
        const facts = worldFacts(world);
        const due = events.filter((event) => isDue(event, now, facts));
        const closed = closedScenes(root);
        return {
            campaign: [settings.name, settings.language, systemInStatus(root, context), named("difficulty", settings.difficulty), named("lethality", settings.lethality)].filter((part) => part !== undefined),
            missing: missingWithSystems(missingSettings(settings), context),
            lines: settings.lines ?? [],
            veils: settings.veils ?? [],
            table: settings.table ?? [],
            precedents: settings.precedents ?? [],
            houseRules: bookTitles(readRuleBook(join(root, houseRulesFolderName), "house rules")),
            players: players.map(member),
            companions: characters.filter((page) => page.fields.role === "companion").map(member),
            place,
            alsoThere: characters.filter((page) => !isPartyMember(page) && withLead(page)).map(characterName),
            around: players.length === 0 ? "" : surroundingsText(surroundings(world, players[0])),
            scene: sceneText(world, openScene.scene),
            lastScenes: closed.slice(0, shownNames).map((scene) => `${scene.title} (${scene.type}): ${scene.summary}`),
            sceneCounts: sceneCounts(closed),
            openQuests: pagesWith(world, "quest", "open"),
            now: now === undefined ? undefined : formatGameDate(now),
            dateProblem: present.problem === undefined ? undefined : problemText(present.problem),
            datedEvents: events.some(isDated),
            dueEvents: due.map(dueText),
            plannedEvents: events.filter((event) => !due.includes(event)).map((event) => plannedText(event, now)),
            clocks: clocksToMove(world, now, facts),
            problems: campaignProblems(root, world, context).length,
            sheet: system === undefined ? undefined : { system: system.name, fields: system.sheet, alsoLine: lineOnlyFields(system) },
            // A dead character's sheet is no longer kept (D-190).
            incompleteSheets: characters.filter(isInParty).flatMap((page) => {
                const missing = missingSheetFields(system, world, page);
                return missing.length === 0 ? [] : [`${characterName(page)}'s sheet still lacks, by these names: ${missing.join(", ")}.`];
            }),
        };
    },

    format(result)
    {
        const lead = result.players[0]?.name;
        const companion = (member: Member): string => `${member.name}${member.withLead && lead !== undefined ? `, with ${lead}` : whereabouts(member)}${memberCounters(member)}`;
        const state = [
            result.campaign.join(" · "),
            missingSettingsNote(result.missing),
            boundariesLine(result.lines, result.veils),
            result.table.length === 0 ? "" : `Table: ${result.table.join("; ")}`,
            result.precedents.length === 0 ? "" : `Precedents: ${result.precedents.join("; ")}`,
            result.houseRules.length === 0 ? "" : `House rules (rules): ${result.houseRules.join(", ")}`,
            timeLine(result),
            ...(result.players.length === 0 ? [`No player character yet.${sheetNote(result.sheet)}`] : result.players.map((member) => `PC: ${member.name}${whereabouts(member)}${memberCounters(member)}`)),
            result.around === "" ? "" : `Around ${lead}: ${result.around}`,
            namesLine("Companions", result.companions.map(companion), "find text companion, type character", "; "),
            ...result.incompleteSheets,
            namesLine("Also there", result.alsoThere, `show ${result.place}`),
            result.scene === undefined ? "" : `Scene: ${result.scene}`,
            result.lastScenes.length === 0 ? "" : `Last scenes: ${result.lastScenes.join(" · ")}`,
            result.sceneCounts === "" ? "" : `Scenes so far: ${result.sceneCounts}`,
            dueLine(result.dueEvents),
            namesLine("Open quests", result.openQuests, "find text open, type quest"),
            namesLine("Planned events", result.plannedEvents, "find text planned, type event"),
            result.clocks.length === 0 ? "" : `Clocks: ${result.clocks.join(" · ")}`,
            result.problems === 0 ? "" : `${result.problems} ${result.problems === 1 ? "problem" : "problems"} in the campaign: validate lists them, with how to fix each.`,
        ];
        return state.filter((line) => line !== "").join("\n");
    },
});

/** The game date; or why it cannot be read; or, before there is one, a reminder to set it when some planned event has a date. */
function timeLine(result: { now?: string; dateProblem?: string; datedEvents: boolean; }): string
{
    if (result.now !== undefined) {
        return `Now: ${result.now}`;
    }

    if (result.dateProblem !== undefined) {
        return result.dateProblem;
    }

    return result.datedEvents ? "No game date yet: at the first scene, set it with advance to, at the scene's hour, such as day 1, 18:00." : "";
}

/** "difficulty normal": a setting named, or nothing when it is missing. */
function named(name: string, value: string | undefined): string | undefined
{
    return value === undefined ? undefined : `${name} ${value}`;
}

function boundariesLine(lines: string[], veils: string[]): string
{
    const listed = (items: string[]): string => (items.length > 0 ? items.join("; ") : "none");
    return lines.length === 0 && veils.length === 0 ? "" : `Lines: ${listed(lines)} · Veils: ${listed(veils)}`;
}

function characterName(page: Page): string
{
    return page.fields.status === "dead" ? `${page.name} (dead)` : page.name;
}

function placeOf(world: World, page: Page): string | undefined
{
    return locate(world, page).chain[0]?.name;
}

/** ", in Room › Building › Town", or nothing when the member is in no container. */
function whereabouts(member: Member): string
{
    return member.where.length === 0 ? "" : `, in ${member.where.join(" › ")}`;
}

function memberCounters(member: Member): string
{
    const shown = [...member.counters, ...member.effects];
    return shown.length === 0 ? "" : `: ${shown.join(" · ")}`;
}

/**
 * " The system 5e keeps on a character sheet, by these names: level, xp, hp…; and when they apply: slots-1…", for status before there is a player character
 * (DAT-2): the fields of the sheet, then those of the status line that are not on it.
 */
function sheetNote(sheet: { system: string; fields: string[]; alsoLine: string[]; } | undefined): string
{
    if (sheet === undefined || sheet.fields.length === 0) {
        return "";
    }

    const also = sheet.alsoLine.length === 0 ? "" : `; and when they apply: ${sheet.alsoLine.join(", ")}`;
    return ` The system ${sheet.system} keeps on a character sheet, by these names: ${sheet.fields.join(", ")}${also}.`;
}

/** The fields of the system's status line that its character sheet does not list, such as spell slots. */
function lineOnlyFields(system: GameSystem): string[]
{
    return system.statusLine.map((entry) => entry.field).filter((field) => !system.sheet.some((name) => comparableText(name) === comparableText(field)));
}

/** The planned events due, all of them: the master plays each one first (D-135). */
function dueLine(events: string[]): string
{
    return events.length === 0 ? "" : `Due: ${events.join(" · ")}. ${dueAdvice(events.length)}`;
}

/** "Scontro all'ossario (combat) at Ossario; round 1, Lena's turn; copies: Annegato 1: hp 22/22; Annegato 2: hp 13/22". */
function sceneText(world: World, scene: Scene | undefined): string | undefined
{
    if (scene === undefined) {
        return undefined;
    }

    const place = scene.place === undefined ? "" : ` at ${parsePageReference(scene.place).name}`;
    const characters = scene.with.length === 0 ? "" : `, with ${scene.with.map((link) => sceneMemberText(world, parsePageReference(link).name)).join(", ")}`;
    const turn = scene.turn === undefined ? "" : `; round ${scene.round ?? 1}, ${scene.turn}'s turn`;
    const copies = Object.entries(scene.copies).map(([name, copy]) => {
        const counters = [countersText(copyCounters(world, copy)), ...effectsOf(copyPage(name, copy)).map((effect) => effectShown(world, effect))].filter((part) => part !== "").join(" · ");
        return counters === "" ? name : `${name}: ${counters}`;
    });
    const away = partyAwayText(world, scene);
    return `${scene.title} (${scene.type})${place}${characters}${turn}${copies.length === 0 ? "" : `; copies: ${copies.join("; ")}`}${away === "" ? "" : `; ${away}`}`;
}

/** "Varro (hp 23/30 · Prono)": a character in the scene who is not of the party, with counters and effects, as a copy shows them (EFF-10). */
function sceneMemberText(world: World, name: string): string
{
    const page = pagesWithName(world, name)[0];

    if (page === undefined || isPartyMember(page)) {
        return name;
    }

    const shown = [countersText(pageCounters(world, page)), ...effectsOf(page).map((effect) => effectShown(world, effect))].filter((part) => part !== "");
    return shown.length === 0 ? name : `${name} (${shown.join(" · ")})`;
}

/** "4 social, 2 exploration, 1 combat": the closed scenes by type, most first, then in the order of the list of types. */
function sceneCounts(scenes: ClosedScene[]): string
{
    const counts = new Map<string, number>();

    for (const scene of scenes) {
        counts.set(scene.type, (counts.get(scene.type) ?? 0) + 1);
    }

    const rank = (type: string): number => (sceneTypes as readonly string[]).indexOf(type);
    return [...counts].sort((first, second) => second[1] - first[1] || rank(first[0]) - rank(second[0])).map(([type, count]) => `${count} ${type}`).join(", ");
}

function pagesWith(world: World, type: Page["type"], wanted: string): string[]
{
    return world.pages.filter((page) => page.type === type && page.fields.status === wanted).map((page) => page.name);
}

/** "Label: A · B · C, and 2 more: find …", or nothing when there are none. */
function namesLine(label: string, names: string[], more: string, separator = " · "): string
{
    if (names.length === 0) {
        return "";
    }

    const shown = names.slice(0, shownNames).join(separator);
    return names.length > shownNames ? `${label}: ${shown}, and ${names.length - shownNames} more: ${more}` : `${label}: ${shown}`;
}
