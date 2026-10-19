import { join } from "node:path";
import { z } from "zod";
import { houseRulesFolderName, missingSettings, readSettings, requireCampaign, settingMeaning } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { defineCommand } from "../core/registry.ts";
import { isInParty, isPartyMember, locate, type Page, pagesWithName, parsePageReference, type World } from "../pages/index.ts";
import { bookTitles, readRuleBook } from "../rules/index.ts";
import { type Scene, sceneTypes } from "../scene/index.ts";
import type { GameDate } from "../time/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { allStateChecks, type Contradiction, markStateChecksTold } from "./game-checks.ts";
import { effectShown, keptEffects } from "./game-effects.ts";
import { surroundings, surroundingsText } from "./game-environment.ts";
import { clocksToMove, dueAdvice, dueText, isDated, isDue, plannedEvents, plannedText, worldFacts } from "./game-events.ts";
import { experienceOf, levelDueNote } from "./game-experience.ts";
import { extensionsLine } from "./game-extension-list.ts";
import { extensionCodeProblems } from "./game-extensions.ts";
import { picturesNote } from "./game-images.ts";
import { journeyText, readJourney } from "./game-journey.ts";
import { campaignMode, campaignNote } from "./game-mode.ts";
import { campaignCoins } from "./game-money.ts";
import { livingMood, masterMood } from "./game-moods.ts";
import { isTickedOpenQuest, openQuestText } from "./game-quests.ts";
import { measuresOf, roadsOf } from "./game-roads.ts";
import { interruptedLoad } from "./game-saves.ts";
import { type ClosedScene, closedScenes, copyCounters, copyPage, partyAwayText, readOpenScene } from "./game-scene.ts";
import { datedText, problemText, readPresent } from "./game-time.ts";
import { campaignSystem, campaignWorld, countedByGame, missingWithSystems, systemInStatus, systemSettingValue } from "./game-world.ts";
import { missingSettingsNote } from "./notes.ts";
import { countersText, pageCounters, partyCounters } from "./page-counters.ts";
import { campaignProblems } from "./problems.ts";
import { missingSheetFields, overLoad, type SheetSummary, sheetSummary } from "./sheet.ts";
import { translationOffer } from "./translate.ts";

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
    /** Its mood, when it has one (MOOD-6). */
    mood?: string;
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

    async run(input, context)
    {
        const root = requireCampaign(context.folder);
        const codeProblems = await extensionCodeProblems(root, context, []);
        const settings = readSettings(root);
        const world = campaignWorld(root, context);
        const characters = world.pages.filter((page) => page.type === "character");
        const players = characters.filter((page) => page.fields.role === "pc");
        const place = players.length > 0 ? placeOf(world, players[0]) : undefined;
        const withLead = (page: Page): boolean => place !== undefined && placeOf(world, page) === place;
        const { coins } = campaignCoins(root, context);
        const system = campaignSystem(root, context);
        const openScene = readOpenScene(root);

        const member = (page: Page): Member => {
            const mood = livingMood(page);
            return {
                name: characterName(page),
                where: locate(world, page).chain.map((holder) => holder.name),
                withLead: withLead(page),
                // Under the rigor «rules», a load over the limit (LOAD-3).
                counters: [
                    ...Object.entries(partyCounters(world, page, coins, system)).map(([field, value]) => countersText({ [field]: value })),
                    ...(settings.rigor === "rules" ? [overLoad(world, system, page) ?? ""].filter((text) => text !== "") : []),
                ],
                effects: [...effectsOf(page).map((effect) => effectShown(world, effect)), ...keptEffects(world, openScene.scene, page.name).map((kept) => `keeps ${kept}`)],
                ...(mood === "neutral" ? {} : { mood }),
            };
        };

        const present = readPresent(root);
        const now = present.date;
        const events = plannedEvents(world);
        const facts = worldFacts(world);
        const due = events.filter((event) => isDue(event, now, facts));
        const closed = closedScenes(root);
        const mode = campaignMode(root, world);
        return {
            campaign: [
                settings.name,
                settings.language,
                systemInStatus(root, context),
                named("difficulty", settings.difficulty),
                named("lethality", settings.lethality),
                named("saves", settings.saves),
                // What the master follows in play (D-241).
                named("rigor", settings.rigor),
                named("dice", settings.dice),
                named("units", settings.units),
                // How much the master teaches, only when they do (D-347).
                named("mentor", settings.mentor === "off" ? undefined : settings.mentor),
                // What the system adds to the setup, as advancement xp (DAT-10).
                ...(system?.settings ?? []).map((setting) => named(setting.name, systemSettingValue(root, setting))),
                named("mode", mode),
            ].filter((part) => part !== undefined),
            // What the chosen difficulty and rigor mean in play, one line each (D-263).
            meanings: (["difficulty", "rigor"] as const).flatMap((name) => {
                const meaning = settingMeaning(name, settings[name], countedByGame(system));
                return meaning === undefined ? [] : [`${name.charAt(0).toUpperCase()}${name.slice(1)} ${settings[name]}: ${meaning}.`];
            }),
            // Before play, what the next mode needs and how to enter it; in play, the settings still missing (MOD-7).
            note: campaignNote(root, context),
            premise: settings.premise === undefined ? undefined : `${settings.premise}${settings.preparation === undefined ? "" : ` (preparation ${settings.preparation})`}`,
            // How the master writes, as the player chose it, under the eyes at every start (D-395).
            writing: [
                named("prose", settings.author === undefined ? settings.prose : undefined),
                named("story", settings.story),
                settings.author === undefined ? undefined : `like ${settings.author}`,
                settings.style === undefined ? undefined : `the player's words: "${settings.style}"`,
            ].filter((part) => part !== undefined),
            lines: settings.lines ?? [],
            veils: settings.veils ?? [],
            table: settings.table ?? [],
            precedents: settings.precedents ?? [],
            // The extensions it uses, each with what it brings (D-28).
            extensions: extensionsLine(root, context),
            houseRules: bookTitles(readRuleBook(join(root, houseRulesFolderName), "house rules")),
            players: players.map(member),
            companions: characters.filter((page) => page.fields.role === "companion").map(member),
            dashboard: context.dashboard,
            // The chat's first status opens with the dashboard, for the master to offer it in their first answer (D-353).
            offerDashboard: offerDashboard(context),
            // Whether to ask for the places' pictures, or to have this one made (D-308).
            pictures: picturesNote(root, context, world, players[0] === undefined ? undefined : locate(world, players[0]).chain.find((holder) => holder.type === "place")),
            // In the setup, the dashboard translated in the chat where nothing here does it in the background (D-423).
            translation: mode === "setup" ? translationOffer(root, context) : undefined,
            mood: masterMood(root),
            place,
            alsoThere: characters.filter((page) => !isPartyMember(page) && withLead(page)).map(characterName),
            around: players.length === 0 ? "" : surroundingsText(surroundings(world, players[0])),
            scene: sceneText(world, openScene.scene),
            journey: journeyText(world, roadsOf(world), readJourney(root), measuresOf(root, system)),
            lastScenes: closed.slice(0, shownNames).map((scene) => `${scene.title} (${scene.type}): ${scene.summary}`),
            sceneCounts: sceneCounts(closed),
            openQuests: openQuests(world, now),
            now: now === undefined ? undefined : datedText(root, context, now),
            dateProblem: present.problem === undefined ? undefined : problemText(present.problem),
            datedEvents: events.some(isDated),
            dueEvents: due.map(dueText),
            plannedEvents: events.filter((event) => !due.includes(event)).map((event) => plannedText(event, now)),
            clocks: clocksToMove(world, now, facts),
            problems: campaignProblems(root, world, context).length + codeProblems.length,
            // Every contradiction of the state, always, told for the turns that follow (CHK-3).
            contradictions: toldContradictions(context, allStateChecks(root, context)),
            // The opening of an evening, once in a chat: notes said while the master read the game reached the player (playtests 15, 16).
            opening: openingOnce(context),
            // A load that stopped halfway leaves the campaign between two times (SAV-5).
            halfLoaded: interruptedLoad(root)?.number,
            sheet: system === undefined ? undefined : sheetSummary(system),
            // A dead character's sheet is no longer kept (D-190); before play, the checklist says what it lacks.
            incompleteSheets: mode !== "play" ? [] : characters.filter(isInParty).flatMap((page) => {
                const missing = missingSheetFields(system, world, page);
                return missing.length === 0 ? [] : [`${characterName(page)}'s sheet still lacks, by these names: ${missing.join(", ")}.`];
            }),
            // A level the points reach, until the classes rise (PRO-6).
            levelsDue: characters.filter(isInParty).flatMap((page) => levelDueNote(characterName(page), experienceOf(world, effectiveFields(world, page)), page.fields.role === "companion") ?? []),
        };
    },

    format(result)
    {
        const lead = result.players[0]?.name;
        const companion = (member: Member): string => `${member.name}${member.withLead && lead !== undefined ? `, with ${lead}` : whereabouts(member)}${memberCounters(member)}`;
        const state = [
            result.offerDashboard && result.dashboard !== undefined
                ? `Offer the player their dashboard in your first answer, with its link: ${result.dashboard}. Their sheet, their settings and the dice of the checks you ask `
                    + "follow the game there, live; the link stays the same, and a page they keep open comes back by itself next time."
                : "",
            result.campaign.join(" · "),
            ...result.meanings,
            result.note,
            result.premise === undefined ? "" : `Premise: ${result.premise}`,
            result.writing.length === 0 ? "" : `Your writing: ${result.writing.join(" · ")}`,
            boundariesLine(result.lines, result.veils),
            result.table.length === 0 ? "" : `Table: ${result.table.join("; ")}`,
            result.precedents.length === 0 ? "" : `Precedents: ${result.precedents.join("; ")}`,
            result.extensions,
            result.houseRules.length === 0 ? "" : `House rules (rules): ${result.houseRules.join(", ")}`,
            timeLine(result),
            ...(result.players.length === 0 ? [`No player character yet.${sheetNote(result.sheet)}`] : result.players.map((member) => `PC: ${member.name}${whereabouts(member)}${memberCounters(member)}`)),
            result.around === "" ? "" : `Around ${lead}: ${result.around}`,
            namesLine("Companions", result.companions.map(companion), "find text companion, type character", "; "),
            result.dashboard === undefined || result.offerDashboard ? "" : `Dashboard: ${result.dashboard}, the player's sheet, their settings and the dice of the checks you ask, live.`,
            result.pictures ?? "",
            result.translation ?? "",
            result.mood === "neutral" ? "" : `Your mood is ${result.mood}: let your voice follow it.`,
            ...result.incompleteSheets,
            ...result.levelsDue,
            namesLine("Also there", result.alsoThere, `show ${result.place}`),
            result.scene === undefined ? "" : `Scene: ${result.scene}`,
            result.journey === undefined ? "" : `Journey: ${result.journey}`,
            result.lastScenes.length === 0 ? "" : `Last scenes: ${result.lastScenes.join(" · ")}`,
            result.sceneCounts === "" ? "" : `Scenes so far: ${result.sceneCounts}`,
            dueLine(result.dueEvents),
            namesLine("Open quests", result.openQuests, "find text open, type quest"),
            namesLine("Planned events", result.plannedEvents, "find text planned, type event"),
            result.clocks.length === 0 ? "" : `Clocks: ${result.clocks.join(" · ")}`,
            result.halfLoaded === undefined ? "" : `The load of save ${result.halfLoaded} stopped halfway: call save load to finish it, before anything else.`,
            ...result.contradictions,
            result.opening ? "Write nothing to the player until your message is ready: your first words are the opening itself." : "",
            result.problems === 0 ? "" : `${result.problems} ${result.problems === 1 ? "problem" : "problems"} in the campaign: validate lists them, with how to fix each.`,
        ];
        return state.filter((line) => line !== "").join("\n");
    },
});

/** Whether the opening line is due: once in a chat with the master; never on the command line, where no master opens an evening. */
function openingOnce(context: Context): boolean
{
    if (context.told === undefined || context.told.has("opening")) {
        return false;
    }

    context.told.add("opening");
    return true;
}

/** The lines of the contradictions, marked told in the chat. */
function toldContradictions(context: Context, found: Contradiction[]): string[]
{
    markStateChecksTold(context, found);
    return found.map((one) => one.line);
}

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
    const shown = [...member.counters, ...member.effects, ...(member.mood === undefined ? [] : [`mood ${member.mood}`])];
    return shown.length === 0 ? "" : `: ${shown.join(" · ")}`;
}

/**
 * " The system 5e keeps on a character sheet, by these names: level, xp…; and when they apply: traits…, slots-1…. It works out Skills, str-mod…: never write them.",
 * for status before there is a player character (DAT-2).
 */
function sheetNote(sheet: SheetSummary | undefined): string
{
    if (sheet === undefined) {
        return "";
    }

    const also = sheet.whenTheyApply.length === 0 ? "" : `; and when they apply: ${sheet.whenTheyApply.join(", ")}`;
    const worked = sheet.workedOut.length === 0 ? "" : ` It works out ${sheet.workedOut.join(", ")}: never write them.`;
    const lists = sheet.lists.length === 0 ? "" : ` Only its names go in ${sheet.lists.join(", ")}, as it writes them: write lists them if a name is not one.`;
    return ` The system ${sheet.system} keeps on a character sheet, by these names: ${sheet.written.join(", ")}${also}.${worked}${lists}`;
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
    // What happened in it so far is in its log, which show gives (SCN-10).
    const told = `. show ${scene.title} for what happened so far`;
    return `${scene.title} (${scene.type})${place}${characters}${turn}${copies.length === 0 ? "" : `; copies: ${copies.join("; ")}`}${away === "" ? "" : `; ${away}`}${told}`;
}

/** "Varro (hp 23/30 · Prono · mood angry)": a character in the scene who is not of the party, with counters, effects (EFF-10) and mood (MOOD-6). */
function sceneMemberText(world: World, name: string): string
{
    const page = pagesWithName(world, name)[0];

    if (page === undefined || isPartyMember(page)) {
        return name;
    }

    const mood = livingMood(page);
    const shown = [countersText(pageCounters(world, page)), ...effectsOf(page).map((effect) => effectShown(world, effect)), mood === "neutral" ? "" : `mood ${mood}`].filter((part) => part !== "");
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

/** The open quests, those whose goals are all ticked first, with what to do about them (D-239). */
function openQuests(world: World, now: GameDate | undefined): string[]
{
    const open = world.pages.filter((page) => page.type === "quest" && page.fields.status === "open");
    return [...open.filter(isTickedOpenQuest), ...open.filter((page) => !isTickedOpenQuest(page))].map((page) => openQuestText(page, now));
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

/** Whether this status is the chat's first with a dashboard, which has the master offer it; the next ones only give its link (D-353). */
function offerDashboard(context: Context): boolean
{
    const first = context.dashboard !== undefined && context.dashboardOffered !== true;
    context.dashboardOffered ||= first;
    return first;
}
