import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { numberOf } from "../core/formula.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName, valueNamed, withArticle } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import type { Effect } from "../effects/index.ts";
import { findPage, isEmptyField, isInParty, isPartyMember, linkListItems, linksIn, locate, type Page, pageNamed, pagesWithName, pageWithPath, parsePageReference, type World, writePage } from "../pages/index.ts";
import { copyNames, nextTurn, type Scene, type SceneCopy, sceneTypes } from "../scene/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { formatGameDate } from "../time/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { dyingTurn } from "./game-dying.ts";
import { effectShown, endedByTurn, endEffects, endsWithScene, keptBy } from "./game-effects.ts";
import { surroundings, surroundingsText } from "./game-environment.ts";
import { clearCopies, offMapNote, placeGrid, standing } from "./game-grids.ts";
import { metPictureNote, picturesNote } from "./game-images.ts";
import { campaignMode, checklistLine } from "./game-mode.ts";
import { movePages } from "./game-moves.ts";
import { isTickedOpenQuest, tickedQuestNote } from "./game-quests.ts";
import { turnEffectsNote } from "./game-reminders.ts";
import { isPlayerDead, makeSave, saveText } from "./game-saves.ts";
import { copyCounters, copyPage, openScene, rawScene, readOpenScene, saveScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { turnUsesOf, useInTurn, usesAtTurn } from "./game-turn-uses.ts";
import { campaignSystem, campaignWorld, missingSystemHint, systemPagesHint } from "./game-world.ts";
import { countersText, pageCounters, partyCounters } from "./page-counters.ts";
import { situationPart } from "./parts.ts";
import { hasSheet, startingAtZero } from "./worked-out.ts";

const actions = ["open", "add", "leave", "order", "next", "use", "now", "hostile", "calm", "close"] as const;
type Action = (typeof actions)[number];

// The parameters each action takes; any other is refused, so that nothing given is silently ignored.
const actionParameters: Record<Action, string[]> = {
    open: ["title", "type", "place", "with", "creatures", "now", "seen"],
    add: ["with", "creatures", "seen"],
    leave: ["who"],
    order: ["order"],
    next: [],
    use: ["who", "uses", "by"],
    now: ["now"],
    hostile: ["who"],
    calm: ["who"],
    close: ["summary"],
};

// The most copies of one creature a scene takes.
const mostCopies = 50;

// A list, or one text, as an MCP client may send it; run turns one text into a list of one.
const textList = z.union([z.string(), z.array(z.string())]);

interface SceneInput
{
    action: Action;
    title?: string;
    type?: string;
    place?: string;
    with?: string[];
    creatures?: string[] | Record<string, number>;
    who?: string[];
    order?: string[];
    uses?: string;
    by?: string;
    now?: string;
    summary?: string;
    seen?: string[] | Record<string, string>;
}

/** The input as given: a list may come as one text. */
type GivenInput = Omit<SceneInput, "with" | "creatures" | "who" | "order" | "seen"> & {
    with?: string | string[];
    creatures?: string | string[] | Record<string, number>;
    who?: string | string[];
    order?: string | string[];
    seen?: string | string[] | Record<string, string>;
};

/** The order of turns, where the scene has one, and whether the turn is the player's character's. */
interface Turns
{
    order: string[];
    round: number;
    turn: string;
    player: boolean;
}

/** Someone in the scene, with their counters. */
interface Member
{
    name: string;
    counters: Record<string, unknown>;
    /** A character's effects with their end, such as "Poisoned until day 1, 19:00". */
    effects?: string[];
}

/** Who of the party a scene brought into its place, and what that set off (CON-6). */
interface Brought
{
    moved: string[];
    notes: string[];
}

type SceneResult =
    | ({ action: "open"; title: string; type: string; opened?: string; place?: string; members: Member[]; around: string; part: string; } & Brought)
    | ({ action: "add"; title: string; place?: string; members: Member[]; ordered: boolean; seen?: Record<string, string>; } & Brought)
    | { action: "leave"; left: Member[]; turns?: Turns; noTurns: boolean; ended: string[]; acting?: string; }
    | ({ action: "order" | "next"; noTurn: string[]; ended: string[]; acting?: string; } & Turns)
    | { action: "now"; title: string; now: string; }
    | { action: "use"; line: string; }
    | { action: "hostile" | "calm"; title: string; marked: string[]; hostile: string[]; }
    | ({ action: "close"; title?: string; rounds?: number; copies: Member[]; gone?: Member[]; unreadable?: string; ended: string[]; endless: string[]; rewards?: string[]; quests: string[]; } & Saved);

/** The save the end of a scene made, or why it made none (SAV-3). */
interface Saved
{
    saved?: string;
    unsaved?: string;
}

export const scene = defineCommand({
    name: "scene",
    description: "Open, run and close a scene of the story. "
        + "open starts one with a title, a type, a place, who is in it and creatures as numbered copies, such as Annegato 1: a copy holds only what changes, the rest is read from the creature. "
        + "Whoever of the party is elsewhere moves to the scene's place, except in a travel scene. "
        + "add brings in more characters or creatures; leave takes out who goes (fled, fallen, gone); order sets who takes turns, after rolling for it if the game does; next passes the turn; "
        + "use marks what one uses of a turn, such as who Ettore, uses attack: the engine counts the game's uses (action, reaction, the attacks of an action) and refuses one too many; "
        + "now gives the line the player's dashboard shows: give it at open too, and change it as the scene turns. "
        + "In a fight, hostile marks who attacks the party, the moment they show it, and calm takes the mark off one who surrenders, flees or parleys: the player's dashboard shows it. "
        + "seen, at open or add, gives what the character sees of those it does not know by name; the player's dashboard calls them so until the character learns the name. "
        + "close ends the scene with a summary: the player may read the title and summary. Change a copy's counters with change, as for a page. "
        + 'Example: action open, title "Scontro all\'ossario", type combat, creatures {"Annegato": 2}.',
    group: "game",
    positionals: ["action"],
    input: z.object({
        action: z.enum(actions).describe("open, add, leave, order, next, use, now, hostile, calm or close"),
        title: z.string().optional().describe("open: the scene's title"),
        type: z.enum(sceneTypes).optional().describe(`open: ${sceneTypes.join(", ")}`),
        place: z.string().optional().describe("open: the place, such as [[Ossario]]; the character's if left out"),
        with: textList.optional().describe("open, add: the characters in the scene, the player character included, such as [[Lena]]; at open, the character and the companions with them if left out"),
        creatures: z.union([textList, z.record(z.string(), z.number().int())]).optional().describe('open, add: creatures as numbered copies: Annegato=2 (Annegato alone is one), or through MCP an object such as {"Annegato": 2}'),
        who: textList.optional().describe("leave: who leaves the scene; hostile, calm: who attacks the party, or stops; use: who uses it; characters or copies, such as Annegato 2"),
        uses: z.string().optional().describe("use: what of a turn, by the game's names, such as action, bonus action, reaction, attack"),
        by: z.string().optional().describe('use: what gives one more, or lets it in another\'s turn, such as "Action Surge"'),
        order: textList.optional().describe("order: who takes turns, in order; those left out (fallen, fled) take none"),
        now: z.string().optional().describe('open, now: what is happening now, in one line as the player sees it, such as "The bandits overturn the tables"; never what they cannot see'),
        summary: z.string().optional().describe("close: what happened, in one or two sentences, as the player saw it"),
        seen: z.union([textList, z.record(z.string(), z.string())]).optional().describe(
            "open, add: what the character sees of one it does not know by name, by its page or creature, in two or three words, never its kind when that is a secret: "
                + 'Bandito=brigante incappucciato, or through MCP an object such as {"Varro": "il mugnaio"}',
        ),
    }),

    run(given, context): SceneResult
    {
        const root = requireCampaign(context.folder);
        const input = asLists(given);
        checkParameters(input);
        const world = campaignWorld(root, context);

        if (input.action === "close") {
            return close(root, world, input.summary ?? "", context);
        }

        const current = openScene(root);

        if (input.action === "open") {
            return openNew(root, world, input, context, current);
        }

        if (current === undefined) {
            throw new Error("No scene is open: open one with scene open, giving its title and type.");
        }

        switch (input.action) {
            case "now":
                return tellNow(root, input.now ?? "", context, current);
            case "add":
                return addTo(root, world, input, context, current);
            case "leave":
                return withActing(root, context, current, leave(root, world, input.who ?? [], context, current));
            case "hostile":
            case "calm":
                return markHostile(root, input.who ?? [], input.action === "hostile", context, current);
            case "order":
                return withActing(root, context, current, setOrder(root, world, input.order ?? [], context, current));
            case "use":
                return useOfTurn(root, world, input, context, current);
            default:
                return withActing(root, context, current, passTurn(root, world, context, current));
        }
    },

    format(result)
    {
        switch (result.action) {
            case "open": {
                const when = result.opened === undefined ? "" : `, ${result.opened}`;
                const where = result.place === undefined ? "" : ` at ${result.place}`;
                const members = result.members.length === 0 ? "No one in it yet: add who is there with scene add." : `In it: ${membersText(result.members)}.`;
                const around = result.around === "" ? undefined : `Here: ${result.around}.`;
                const part = result.part === "" ? undefined : result.part;
                return `Scene opened${when}: ${result.title} (${result.type})${where}. ${members}${broughtText(result, result.place)}${lineOf(around)}${lineOf(part)}`;
            }

            case "add": {
                const last = result.ordered ? " They take their turns last: change the order with scene order if needed." : "";
                const added = result.members.length === 0 ? "" : `Added to ${result.title}: ${membersText(result.members)}.${last}`;
                const seen = result.seen === undefined ? "" : `Seen: ${Object.entries(result.seen).map(([name, said]) => `${name} as ${said}`).join(", ")}.`;
                return `${[added, seen].filter((line) => line !== "").join(" ")}${broughtText(result, result.place)}`;
            }

            case "leave": {
                const turns = result.turns === undefined ? (result.noTurns ? "\nNo one takes turns now." : "") : `\n${turnText(result.turns)}`;
                const left = result.left.map((member) => (Object.keys(member.counters).length === 0 ? member.name : `${member.name} (${countersText(member.counters)})`));
                return `${left.join(", ")} left the scene.${turns}${actingText(result.acting)}${endedText(result.ended)}`;
            }

            case "order":
                return `Order: ${result.order.join(" · ")}.${result.noTurn.length === 0 ? "" : ` No turn: ${result.noTurn.join(", ")}.`}\n${turnText(result)}${actingText(result.acting)}${endedText(result.ended)}`;
            case "next":
                return `${turnText(result)}${actingText(result.acting)}${endedText(result.ended)}`;
            case "now":
                return `${result.title}: the player's dashboard now shows "${result.now}".`;
            case "use":
                return result.line;
            case "hostile":
            case "calm":
                return markedText(result);

            default:
                return closedText(result);
        }
    },
});

/** Lists as lists: one text is a list of one, or of its links when it gives them separated by commas; an empty text, list or object counts as left out (SCN-8). */
function asLists(given: GivenInput): SceneInput
{
    const items = (texts: string[]): string[] => texts.flatMap((text) => linkListItems(text) ?? [text]);

    const list = <Value extends object>(value: string | Value | undefined): Value | string[] | undefined => {
        if (isEmptyField(value) || (typeof value === "object" && Object.keys(value as object).length === 0)) {
            return undefined;
        }

        return typeof value === "string" ? items([value]) : Array.isArray(value) ? items(value) : value;
    };

    return { ...given, with: list(given.with), creatures: list(given.creatures), who: list(given.who), order: list(given.order), seen: list(given.seen) };
}

/** The line of what is happening now, which the player's dashboard shows (SCN-11): a public line of the log, out of the diary. */
function tellNow(root: string, now: string, context: Context, current: Scene): SceneResult
{
    if (now.trim() === "") {
        throw new Error('Give now: what is happening, in one line as the player sees it, such as "The bandits overturn the tables".');
    }

    updateScene(root, [[["now"], now.trim()]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-now", "public", { title: current.title, now: now.trim() }));
    return { action: "now", title: current.title, now: now.trim() };
}

function checkParameters(input: SceneInput): void
{
    const allowed = actionParameters[input.action];

    const given = (name: string): boolean => {
        const value = input[name as keyof SceneInput];
        return !isEmptyField(value) && !(Array.isArray(value) && value.length === 0) && !(typeof value === "object" && Object.keys(value).length === 0);
    };

    const extra = Object.keys(input).filter((name) => name !== "action" && given(name) && !allowed.includes(name));

    if (extra.length > 0) {
        throw new Error(`scene ${input.action} does not take ${extra.join(", ")}: it takes ${allowed.length === 0 ? "nothing else" : allowed.join(", ")}.`);
    }
}

function openNew(root: string, world: World, input: SceneInput, context: Context, current: Scene | undefined): SceneResult
{
    if (current !== undefined) {
        throw new Error(`A scene is open: ${current.title}. Close it first with scene close and a summary.`);
    }

    if (input.title === undefined || input.title.trim() === "" || input.type === undefined) {
        throw new Error(`Give the scene a title and a type: ${sceneTypes.join(", ")}.`);
    }

    checkInPlay(root, context, world);
    const place = input.place === undefined ? leadPlace(world) : placePage(world, input.place);
    const characters = [...new Set(input.with === undefined ? enteringParty(world, place) : input.with.map((name) => characterPage(world, name)))];
    const copies = newCopies(world, input.creatures, characters.map((page) => page.name));
    const brought = bringParty(root, context, world, characters, place, input.type);
    const opened = readPresent(root).date;
    // A scene without copies leaves the key out: an empty {} would be written on one line.
    const seen = seenOf(world, input.seen, characters, copies);
    const created: Scene = {
        title: input.title.trim(),
        type: input.type,
        place: place === undefined ? undefined : `[[${place.name}]]`,
        opened: opened === undefined ? undefined : formatGameDate(opened),
        now: input.now?.trim() || undefined,
        with: characters.map((page) => `[[${page.name}]]`),
        copies,
        ...(seen === undefined ? {} : { seen }),
    };
    saveScene(root, withoutUndefined({ ...created, copies: Object.keys(copies).length === 0 ? undefined : copies } as unknown as Scene));
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-opened", "public", { title: created.title, type: created.type, place: created.place, with: created.with }));

    // What the character sees, kept for the rolls of this scene once it closes (D-421); hidden, as the names it is given by are.
    if (seen !== undefined) {
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: created.title, seen }));
    }

    logCopies(root, context, created.title, copies);
    const after = brought.world;
    const system = campaignSystem(root, context);
    const members = [...characters.map((page) => characterMember(after, page, system)), ...copyMembers(after, copies)];
    const around = surroundingsText(surroundings(after, place === undefined ? undefined : pageWithPath(after, place.path)));
    // The part of the instructions that the scene's type opens, such as how a fight is told (D-111, D-139).
    const part = situationPart(created.type, context, system);
    // A place without a picture, where the campaign wants one for each new place (D-308).
    const picture = picturesNote(root, context, after, place === undefined ? undefined : pageWithPath(after, place.path));
    const offMap = offMapNote(after, place === undefined ? undefined : pageWithPath(after, place.path), created, [...characters.map((page) => page.name), ...Object.keys(copies)]);
    // Who enters without a picture, where the campaign wants one for each one met (D-420).
    const met = metPictureNote(root, context, [...characters, ...copyCreatures(world, copies)]);
    return {
        action: "open",
        title: created.title,
        type: created.type,
        opened: created.opened,
        place: place?.name,
        members,
        around,
        part,
        moved: brought.moved,
        notes: [...brought.notes, ...(picture === undefined ? [] : [picture]), ...(met === undefined ? [] : [met]), ...(offMap === undefined ? [] : [offMap])],
    };
}

function addTo(root: string, world: World, input: SceneInput, context: Context, current: Scene): SceneResult
{
    if (input.with === undefined && input.creatures === undefined && input.seen === undefined) {
        throw new Error("Give who enters the scene: with (characters) or creatures (such as Annegato=1); or seen, what the character sees of who is already in it.");
    }

    const members = memberNames(current);
    const characters = [...new Set((input.with ?? []).map((name) => characterPage(world, name)))];
    const already = characters.filter((page) => sameName(members, page.name) !== undefined);

    if (already.length > 0) {
        throw new Error(`${already.map((page) => page.name).join(", ")} ${already.length === 1 ? "is" : "are"} already in the scene.`);
    }

    const copies = newCopies(world, input.creatures, [...members, ...(current.left ?? []), ...characters.map((page) => page.name)], current.copies);
    const place = current.place === undefined ? undefined : findPage(world, parsePageReference(current.place).name);
    const brought = bringParty(root, context, world, characters, place, current.type);
    const added = [...characters.map((page) => page.name), ...Object.keys(copies)];
    const changes: [string[], unknown][] = [[["with"], [...current.with, ...characters.map((page) => `[[${page.name}]]`)]], ...Object.entries(copies).map(([name, copy]): [string[], unknown] => [["copies", name], copy])];
    const inScene = [...current.with.flatMap((link) => findPage(world, parsePageReference(link).name) ?? []), ...characters];
    const seen = seenOf(world, input.seen, inScene, { ...current.copies, ...copies });

    if (seen !== undefined) {
        changes.push([["seen"], { ...current.seen, ...seen }]);
    }

    if (current.order !== undefined) {
        changes.push([["order"], [...current.order, ...added]]);
    }

    updateScene(root, changes);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, added, ...(seen === undefined ? {} : { seen }) }));
    logCopies(root, context, current.title, copies);
    const system = campaignSystem(root, context);
    const entered = [...characters.map((page) => characterMember(brought.world, page, system)), ...copyMembers(brought.world, copies)];
    const offMap = offMapNote(brought.world, place === undefined ? undefined : pageWithPath(brought.world, place.path), { ...current, copies: { ...current.copies, ...copies } }, added);
    const met = metPictureNote(root, context, [...characters, ...copyCreatures(world, copies)]);
    return {
        action: "add",
        title: current.title,
        place: place?.name,
        members: entered,
        ordered: current.order !== undefined,
        ...(seen === undefined ? {} : { seen }),
        moved: brought.moved,
        notes: [...brought.notes, ...(met === undefined ? [] : [met]), ...(offMap === undefined ? [] : [offMap])],
    };
}

/**
 * Brings into the scene's place whoever of the party in the scene is elsewhere, as move does, with what that sets off (CON-6); a travel scene moves no one.
 * Done before the scene is written, so that a move refused leaves no scene behind.
 */
function bringParty(root: string, context: Context, world: World, characters: Page[], place: Page | undefined, type: string): Brought & { world: World; }
{
    const away = place === undefined || type === "travel" ? [] : characters.filter((page) => isInParty(page) && !locate(world, page).chain.includes(place));

    if (place === undefined || away.length === 0) {
        return { moved: [], notes: [], world };
    }

    const done = movePages(root, context, world, away, place);
    return { moved: done.moved.map((page) => page.name), notes: done.notes, world: done.world };
}

/** "\nMoved into Ossario: Ennio, Lena.", with what that set off, or nothing when no one moved (CON-6). */
function broughtText(result: Brought, place: string | undefined): string
{
    const moved = result.moved.length === 0 ? [] : [`Moved into ${place ?? "the scene's place"}: ${result.moved.join(", ")}.`];
    return [...moved, ...result.notes].map((line) => `\n${line}`).join("");
}

/**
 * Marks who attacks the party, or takes the mark off (D-415): only in a fight, and only who is in the scene. The player's dashboard shows it, so that a token
 * changes only when the master says so.
 */
function markHostile(root: string, who: string[], hostile: boolean, context: Context, current: Scene): SceneResult
{
    if (current.type !== "combat") {
        throw new Error(`${current.title} is a ${current.type} scene: hostile and calm mark who fights in a combat scene. When a fight breaks out, close this one and open one of type combat.`);
    }

    if (who.length === 0) {
        throw new Error(`Give who ${hostile ? "attacks the party" : "stops attacking"}, such as who "Annegato 2".`);
    }

    const members = memberNames(current);
    const marked = [
        ...new Set(who.map((name) => {
            const member = sameName(members, parsePageReference(name).name);

            if (member === undefined) {
                throw new Error(`${name} is not in the scene. In it: ${members.length === 0 ? "no one" : members.join(", ")}.`);
            }

            return member;
        })),
    ];
    const before = current.hostile ?? [];
    const now = hostile ? [...before, ...marked.filter((name) => !before.includes(name))] : before.filter((name) => !marked.includes(name));
    updateScene(root, [[["hostile"], now.length === 0 ? undefined : now]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, [hostile ? "hostile" : "calm"]: marked }));
    return { action: hostile ? "hostile" : "calm", title: current.title, marked, hostile: now };
}

/** Takes out who goes (D-114): a copy vanishes with its numbers, a character leaves the scene without changing place. The turn of who leaves passes on. */
function leave(root: string, world: World, who: string[], context: Context, current: Scene): SceneResult
{
    if (who.length === 0) {
        throw new Error('Give who leaves the scene, such as who "Annegato 2".');
    }

    const members = memberNames(current);
    const leaving = who.map((name) => {
        const member = sameName(members, parsePageReference(name).name);

        if (member === undefined) {
            throw new Error(`${name} is not in the scene. In it: ${members.length === 0 ? "no one" : members.join(", ")}.`);
        }

        return member;
    }).filter((name, index, all) => all.indexOf(name) === index);
    const copies = Object.fromEntries(Object.entries(current.copies).filter(([name]) => leaving.includes(name)));
    const staying = Object.keys(current.copies).filter((name) => !leaving.includes(name));
    const changes: [string[], unknown][] = [[["with"], current.with.filter((link) => !leaving.includes(parsePageReference(link).name))]];
    changes.push(...(staying.length === 0 ? [[["copies"], undefined] as [string[], unknown]] : Object.keys(copies).map((name): [string[], unknown] => [["copies", name], undefined])));
    const order = current.order?.filter((name) => !leaving.includes(name));
    const kept = order === undefined || order.length === 0 ? undefined : keptTurn(current, order);
    const turns = order === undefined || kept === undefined ? undefined : { order, ...kept, player: isPlayerTurn(world, kept.turn) };

    if (current.order !== undefined) {
        changes.push([["order"], turns?.order], [["turn"], turns?.turn]);

        if (turns !== undefined) {
            changes.push([["round"], turns.round]);
        }
    }

    changes.push([["left"], [...(current.left ?? []), ...leaving]]);
    // Who leaves is hostile no more (D-415).
    const hostile = current.hostile?.filter((name) => !leaving.includes(name));

    if (current.hostile !== undefined) {
        changes.push([["hostile"], hostile === undefined || hostile.length === 0 ? undefined : hostile]);
    }

    // A copy that leaves, fallen or fled, is kept as it left, without its effects, which go with it (D-145): closing the scene counts what overcoming it gives (DAT-11).
    changes.push(...Object.entries(copies).map(([name, copy]): [string[], unknown] => [["gone", name], Object.fromEntries(Object.entries(copy).filter(([field]) => field !== "effects"))]));

    updateScene(root, changes);
    clearCopies(world, current, Object.keys(copies));
    // The turn it moves to, as next logs it, so that the open scene's log reads the round (SCN-10).
    const moved = turns === undefined || (turns.turn === current.turn && turns.round === (current.round ?? 1)) ? {} : { round: turns.round, turn: turns.turn };
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, left: leaving, copies: Object.keys(copies).length === 0 ? undefined : copies, ...moved }));
    const left = leaving.map((name) => (name in copies ? { name, counters: copyCounters(world, copies[name]) } : { name, counters: {} }));
    // The copies that left are gone with their effects, and with those they kept alive (D-145); the turn may have passed, and with it the end of some effects.
    const remaining = { ...current, copies: Object.fromEntries(Object.entries(current.copies).filter(([name]) => !leaving.includes(name))) };
    const keptByGone = (effect: Effect): boolean => Object.keys(copies).some((name) => keptBy(effect, name));
    const byTurn = (effect: Effect): boolean => turns !== undefined && endedByTurn(effect, turns.round, turns.turn, turns.order);
    const ended = endEffects(root, context, world, remaining, (effect) => keptByGone(effect) || byTurn(effect), (effect) => (keptByGone(effect) ? "who kept it left" : "turn"));
    return { action: "leave", left, turns, noTurns: current.order !== undefined && turns === undefined, ended };
}

/** Who takes turns, in order; those left out take none. A new order in a running scene keeps the round, and the turn if its owner is still in it. */
function setOrder(root: string, world: World, order: string[], context: Context, current: Scene): SceneResult
{
    const members = memberNames(current);
    const inScene = members.length === 0 ? "no one yet" : members.join(", ");
    const named = order.map((name) => {
        const member = sameName(members, parsePageReference(name).name);

        if (member === undefined) {
            throw new Error(`${name} is not in the scene. In it: ${inScene}.`);
        }

        return member;
    });
    const repeated = named.find((name, index) => named.indexOf(name) !== index);

    if (repeated !== undefined) {
        throw new Error(`${repeated} is in the order twice: give each one once.`);
    }

    if (named.length === 0) {
        throw new Error(`Give who takes turns, in order. In the scene: ${inScene}.`);
    }

    const { round, turn } = keptTurn(current, named);
    updateScene(root, [[["order"], named], [["round"], round], [["turn"], turn]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, order: named }));
    const ended = endEffects(root, context, world, current, (effect) => endedByTurn(effect, round, turn, named), "turn");
    return { action: "order", order: named, round, turn, player: isPlayerTurn(world, turn), noTurn: members.filter((name) => !named.includes(name)), ended };
}

/**
 * The round and turn after a new order. A first order starts round 1. In a running scene the round goes on: the turn stays with its owner,
 * or, if they left the order, passes to the next of the old order still in it, or to a new round when no one after them is.
 */
function keptTurn(current: Scene, named: string[]): { round: number; turn: string; }
{
    const round = current.round ?? 1;

    if (current.order === undefined || current.turn === undefined) {
        return { round: 1, turn: named[0] };
    }

    if (named.includes(current.turn)) {
        return { round, turn: current.turn };
    }

    const after = current.order.slice(current.order.indexOf(current.turn) + 1).find((name) => named.includes(name));
    return after === undefined ? { round: round + 1, turn: named[0] } : { round, turn: after };
}

/** One use of a turn by one in the scene (TRN-1–TRN-3), kept in the scene, with its line in the log. */
function useOfTurn(root: string, world: World, input: SceneInput, context: Context, current: Scene): SceneResult
{
    const [who] = input.who ?? [];

    if (who === undefined || input.uses === undefined || input.uses.trim() === "") {
        throw new Error("Give who and what they use, such as who Ettore, uses attack.");
    }

    if (current.order === undefined) {
        throw new Error("The scene has no order of turns, so no turn to use: set it with scene order first, after rolling for it if the game does.");
    }

    const name = memberNames(current).find((member) => comparableText(member) === comparableText(parsePageReference(who).name));

    if (name === undefined) {
        throw new Error(`${who} is not in the scene ${current.title}: bring them in with scene add, or give one of ${memberNames(current).join(", ")}.`);
    }

    const copy = current.copies[name];
    const page = copy === undefined ? findPage(world, name) : copyPage(name, copy);

    if (page === undefined) {
        throw new Error(`There is no page named ${name}. Look for it with the find command.`);
    }

    const by = input.by?.trim() === "" ? undefined : input.by?.trim();
    const system = campaignSystem(root, context);
    const done = useInTurn(world, system, current, { name, page }, input.uses.trim(), by);
    updateScene(root, [[["used", name], done.used]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "turn-used", "hidden", { title: current.title, who: name, use: input.uses.trim(), by }));

    // What gave one more, spent from the sheet that counts it (TRN-5).
    if (done.spends !== undefined) {
        spendOne(root, context, world, { name, copy: copy !== undefined, page }, done.spends, by ?? "");
    }

    // One who cannot act, as Stunned, is said so: the game's rule, which the master applies (pp. 91, 358).
    const inactive = effectsOf(page).map((effect) => effect.name).filter((effect) => (system?.combat?.inactive ?? []).some((condition) => comparableText(condition) === comparableText(effect)));
    const warned = inactive.length === 0 ? "" : ` ${name} is ${inactive.join(", ")}: read what it may still do.`;
    return { action: "use", line: `${done.line}${warned}` };
}

/** One of a counter spent, on a page as it writes it or on a copy in the scene, with its line in the log. */
function spendOne(root: string, context: Context, world: World, who: { name: string; copy: boolean; page: Page; }, spends: { field: string; before: number; max?: number; }, why: string): void
{
    const after = spends.before - 1;
    const value = spends.max === undefined ? after : `${after}/${spends.max}`;

    if (who.copy) {
        updateScene(root, [[["copies", who.name, spends.field], value]]);
    } else {
        writePage(world, who.page.name, undefined, { set: { [spends.field]: value } });
    }

    const visibility = who.copy ? "hidden" : "public";
    appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", visibility, { page: who.name, field: spends.field, before: String(spends.before), after: String(after), why }));
}

function passTurn(root: string, world: World, context: Context, current: Scene): SceneResult
{
    if (current.order === undefined) {
        throw new Error("The scene has no order of turns: set it with scene order, after rolling for it if the game does.");
    }

    const { turn, round } = nextTurn(current.order, current.turn, current.round ?? 1);
    updateScene(root, [[["round"], round], [["turn"], turn]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, round, turn }));
    const order = current.order;
    const ended = endEffects(root, context, world, current, (effect) => endedByTurn(effect, round, turn, order), "turn");
    return { action: "next", order, round, turn, player: isPlayerTurn(world, turn), noTurn: [], ended };
}

/** Ends the scene; one that cannot be read is closed too, so that a scene written wrongly by hand never blocks the game. */
function close(root: string, world: World, summary: string, context: Context): SceneResult
{
    if (summary.trim() === "") {
        throw new Error("Give the scene a summary of one or two sentences: what happened, as the player saw it.");
    }

    const { scene: current, problem } = readOpenScene(root);

    if (current === undefined && problem === undefined) {
        throw new Error("No scene is open: there is nothing to close.");
    }

    const present = readPresent(root).date;
    const closed = present === undefined ? undefined : formatGameDate(present);
    const raw = current === undefined ? rawScene(root) : undefined;
    // Rounds exist only in the scene: the effects counted in them end with it, on the pages; the copies go with theirs, and with what they kept alive (D-145).
    const keptByCopy = (effect: Effect): boolean => current !== undefined && Object.keys(current.copies).some((name) => keptBy(effect, name));
    // What the close says is worked out before anything is written: a page it cannot find stops it with the scene still open.
    const endless = (current?.with ?? []).flatMap((link) => {
        const page = findPage(world, parsePageReference(link).name);
        return page === undefined ? [] : effectsOf(page).filter((effect) => effect.end === undefined && !keptByCopy(effect)).map((effect) => `${effect.name} on ${page.name}`);
    });
    const rewards = current === undefined ? [] : rewardLines(world, campaignSystem(root, context), current);
    // A scene that ends may end the story of a quest whose goals are all ticked: the master says whether it did (D-239).
    const quests = world.pages.filter(isTickedOpenQuest).map(tickedQuestNote);
    const ended = endEffects(root, context, world, undefined, (effect) => endsWithScene(effect) || keptByCopy(effect), "scene closed");

    if (current !== undefined) {
        clearCopies(campaignWorld(root, context), current, Object.keys(current.copies));
    }

    saveScene(root, undefined);

    if (current === undefined) {
        const titled = rawTitleAndType(raw);
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-closed", "public", { ...titled, closed, summary: summary.trim() }));
        return { action: "close", copies: [], unreadable: problem?.message, ended, endless: [], quests, ...endOfSceneSave(root, context, world, titled.title) };
    }

    logCopies(root, context, current.title, current.copies);
    const left = current.left?.filter((name) => pagesWithName(world, name).length > 0);
    // Who the character saw without learning their name stays so after the scene (D-416).
    const unnamed = current.seen === undefined ? undefined : Object.keys(current.seen);
    const data = { title: current.title, type: current.type, place: current.place, with: current.with, left: left?.length === 0 ? undefined : left, unnamed, opened: current.opened, closed, rounds: current.round, summary: summary.trim() };
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-closed", "public", data));
    // The copies that left during the scene, fled or fallen, end with it too: one that may come back needs a page now, with its wounds (D-246).
    const gone = copyMembers(world, current.gone ?? {});
    const saved = endOfSceneSave(root, context, world, current.title);
    return { action: "close", title: current.title, rounds: current.round, copies: copyMembers(world, current.copies), gone, ended, endless, ...(rewards.length === 0 ? {} : { rewards }), quests, ...saved };
}

/**
 * The save at the end of a scene, named by its title (D-55, SAV-3): none while the player character is dead, since going back is what one is for. A save that
 * cannot be written never stops the close, which is already done: it says why.
 */
function endOfSceneSave(root: string, context: Context, world: World, title: string): Saved
{
    if (isPlayerDead(world)) {
        return { unsaved: "No save: the player character is dead. If the player wants to go back, save load, as the campaign's saves setting allows." };
    }

    try {
        return { saved: saveText(makeSave(root, context, title, "scene closed")) };
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return { unsaved: `No save: it could not be written (${reason}). Make .saves a folder that can be written; the next scene's end saves again.` };
    }
}

/**
 * What the creatures overcome in a scene give the party there (DAT-11): for each reward of the system, the copies, also those that left, and the characters
 * outside the party at its counter's value or below, or dead, with what each gives, shared, rounded down, among the living party members who were there and
 * keep the sheet. Said with the calls to make, never given: a character may have been an ally, and who fled or was overcome another way is the master's to judge.
 */
function rewardLines(world: World, system: GameSystem | undefined, scene: Scene): string[]
{
    const there = [...scene.with.map((link) => parsePageReference(link).name), ...(scene.left ?? [])].flatMap((name) => findPage(world, name) ?? []);
    const party = there.filter((page, index) => there.indexOf(page) === index && isPartyMember(page) && page.fields.status !== "dead" && hasSheet(world, page));
    const copies = [...Object.entries(scene.copies), ...Object.entries(scene.gone ?? {})].map(([name, copy]) => ({ page: copyPage(name, copy), left: name in (scene.gone ?? {}) }));
    const others = [...copies, ...there.filter((page) => !isPartyMember(page)).map((page) => ({ page, left: (scene.left ?? []).includes(page.name) }))];
    const read = (fields: Record<string, unknown>, field: string): unknown => valueNamed(fields, field);

    return (system?.rewards ?? []).flatMap((reward) => {
        const worth = others.flatMap(({ page, left }) => {
            const fields = effectiveFields(world, page);
            const value = numberOf(read(fields, reward.from));
            const counter = readCounter(read(fields, reward.counter))?.value;
            const down = page.fields.status === "dead" || (counter !== undefined && counter <= reward.value);
            return [{ name: page.name, kind: linksIn(page.fields.creature)[0] ?? page.name, worth: value ?? 0, given: value !== undefined, down, left, character: page.type === "character" }];
        });
        const overcome = worth.filter((item) => item.down && item.worth > 0);
        const fled = worth.filter((item) => !item.down && item.left && item.worth > 0);
        // A creature of the campaign written without the field, as cr 2 (450 XP), would count nothing in silence.
        const unknown = worth.filter((item) => item.down && !item.given);
        const total = overcome.reduce((sum, item) => sum + item.worth, 0);

        if ((total === 0 && fled.length === 0 && unknown.length === 0) || party.length === 0) {
            return [];
        }

        const share = Math.floor(total / party.length);
        const to = party.length === 1 ? `${share} to ${party[0].name}` : `${share} each to ${party.map((page) => page.name).join(", ")}`;
        // Who has no such field yet gets it written, unless change starts it at 0 (CNT-8).
        const held = (page: Page): boolean => read(effectiveFields(world, page), reward.field) !== undefined || startingAtZero(world, reward.field) !== undefined;
        const calls = party.map((page) => (held(page) ? `change ${page.name}, field ${reward.field}, by ${share}` : `write ${page.name}, set ${reward.field}=${share}`)).join("; ");
        const kinds = [...new Set(unknown.map((item) => item.kind))];
        const characters = overcome.filter((item) => item.character).map((item) => item.name);
        const parts = [
            total === 0 ? `${reward.field}:` : `${reward.field} of those overcome: ${overcome.map((item) => `${item.name} ${item.worth}`).join(", ")}, ${total} in all; ${to}: ${calls}.`,
            characters.length === 0 ? "" : `${characters.join(", ")} ${characters.length === 1 ? "is a character" : "are characters"}: leave out any who fought on your side, and share again.`,
            fled.length === 0 ? "" : `Fled: ${fled.map((item) => `${item.name} ${item.worth}`).join(", ")}, to count if the party overcame them.`,
            unknown.length === 0
                ? ""
                : `${unknown.map((item) => item.name).join(", ")} ${unknown.length === 1 ? "counts" : "count"} nothing, with no ${reward.from} on ${kinds.join(", ")}: write it, such as write ${
                    kinds[0]
                }, set ${reward.from}=…, and share it.`,
            "Leave out what the party summoned; count those overcome another way and what the story rewards, as you judge, and tell the player only what each gained.",
        ];
        return [parts.filter((part) => part !== "").join(" ")];
    });
}

/** The title and type of a scene that cannot be read, as far as they can be, so that the log still holds a closed scene. */
function rawTitleAndType(raw: unknown): { title: string; type: string; }
{
    const fields = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const title = typeof fields.title === "string" && fields.title.trim() !== "" ? fields.title : "Untitled scene";
    const type = typeof fields.type === "string" && (sceneTypes as readonly string[]).includes(fields.type) ? fields.type : "other";
    return { title, type };
}

function closedText(result: { title?: string; rounds?: number; copies: Member[]; gone?: Member[]; unreadable?: string; ended: string[]; endless: string[]; rewards?: string[]; quests: string[]; } & Saved): string
{
    const saved = result.saved === undefined ? (result.unsaved === undefined ? "" : `\n${result.unsaved}`) : `\nSaved: ${result.saved}.`;
    const advance = "Advance any time it took that you have not advanced yet; write on their pages what it changed for good, such as a fire put out or a door broken.";
    const endless = result.endless.length === 0 ? "" : `\nStill there, with no end: ${result.endless.join(" · ")}. End those the scene ended, with effect end.`;
    const ended = `${result.ended.length === 0 ? "" : `\nEnded with the scene: ${result.ended.join(" · ")}.`}${endless}`;
    const quests = result.quests.map((line) => `\n${line}`).join("");

    if (result.unreadable !== undefined) {
        return `The open scene could not be read (${result.unreadable}): closed it, without its copies. ${advance}${ended}${quests}${saved}`;
    }

    const rounds = result.rounds === undefined ? "" : ` after ${result.rounds} ${result.rounds === 1 ? "round" : "rounds"}`;
    const gone = result.copies.length === 0 ? "" : ` Copies gone: ${membersText(result.copies)}.`;
    const left = (result.gone ?? []).length === 0
        ? ""
        : `\nLeft during the scene: ${membersText(result.gone ?? [])}. A copy ends with its scene: if one may come back, give it a page now, with its wounds.`;
    const rewards = (result.rewards ?? []).map((line) => `\n${line}`).join("");
    return `Scene closed${rounds}: ${result.title}.${gone} ${advance}${ended}${left}${rewards}${quests}${saved}`;
}

/** "\nEnded: Spaventato on Annegato 2.", or nothing when no effect ended. */
function endedText(ended: string[]): string
{
    return ended.length === 0 ? "" : `\nEnded: ${ended.join(" · ")}.`;
}

/** The copies and what they changed go in a hidden line: the player does not see the enemies' numbers, nor the names of creatures in disguise. */
function logCopies(root: string, context: Context, title: string, copies: Record<string, SceneCopy>): void
{
    if (Object.keys(copies).length > 0) {
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title, copies }));
    }
}

/**
 * The result of a change of turn, with the effects on who ends the turn and on who starts the next (EFF-15), read after the effects that the turn ends have
 * ended; nothing when the turn stays where it was.
 */
function withActing(root: string, context: Context, before: Scene, result: SceneResult): SceneResult
{
    if (result.action !== "leave" && result.action !== "order" && result.action !== "next") {
        return result;
    }

    const turns = result.action === "leave" ? result.turns : result;

    if (turns === undefined || (turns.turn === before.turn && turns.round === (before.round ?? 1))) {
        return result;
    }

    // A turn that begins gives back what its one used, and every turn what lasts only a turn (TRN-4).
    const used = readOpenScene(root).scene?.used;

    if (used !== undefined) {
        updateScene(root, [[["used"], usesAtTurn(campaignSystem(root, context), used, turns.turn)]]);
    }

    const world = campaignWorld(root, context);
    const system = campaignSystem(root, context);
    const scene = readOpenScene(root).scene;
    const effects = turnEffectsNote(world, scene, before.turn, turns.turn);
    // A party member's turn reminds what to mark of it (TRN-1), or, dying, the death save it starts with (DIE-5).
    const member = findPage(world, turns.turn);
    const dying = member === undefined ? "" : dyingTurn(root, context, system, member);
    const uses = member === undefined || !isPartyMember(member) || dying !== "" ? [] : turnUsesOf(system);
    const mark = uses.length > 0 ? `Mark with scene use what ${turns.turn} uses of the turn, as it happens: ${uses.join(", ")}.` : "";
    const acting = [effects, dying, mark, offTheMap(world, scene, turns.turn)].filter((line) => line !== "").join(" ");
    return acting === "" ? result : { ...result, acting };
}

/** Who acts and stands on no square of the scene's map, when its place has one (GRD-3, playtest 07): where it stands decides reach, cover and the way. */
function offTheMap(world: World, scene: Scene | undefined, name: string): string
{
    const place = scene?.place === undefined ? undefined : pagesWithName(world, parsePageReference(scene.place).name)[0];

    if (place === undefined || placeGrid(place) === undefined || standing(world, place, scene).some((one) => sameName([one.name], name) !== undefined && one.square !== undefined)) {
        return "";
    }

    return `${name} is not on the map of ${place.name}: put it on its square with move ${name} --at, such as E4, before telling its turn.`;
}

/** "Marked hostile: Annegato 1. Hostile now: Annegato 1, Annegato 2." (D-415). */
function markedText(result: { action: "hostile" | "calm"; marked: string[]; hostile: string[]; }): string
{
    const now = result.hostile.length === 0 ? "No one is hostile now." : `Hostile now: ${result.hostile.join(", ")}.`;
    return `${result.action === "hostile" ? "Marked hostile" : "Calm"}: ${result.marked.join(", ")}. ${now}`;
}

function actingText(acting: string | undefined): string
{
    return acting === undefined ? "" : `\n${acting}`;
}

/** "Round 2 · now Lena (then Annegato 2).", and on the player's character's turn, to stop there (D-139). */
function turnText(result: Turns): string
{
    const then = result.order.length > 1 ? nextTurn(result.order, result.turn, 1).turn : undefined;
    const now = result.player ? `${result.turn}, the player's character` : result.turn;
    const stop = result.player ? ": stop here and hand them the turn, even if all they can do is roll to stay alive." : ".";
    return `Round ${result.round} · now ${now}${then === undefined ? "" : ` (then ${then})`}${stop}`;
}

/** Whether the turn is the player's character's, which only the player plays. */
function isPlayerTurn(world: World, name: string): boolean
{
    const page = findPage(world, name);
    return page?.type === "character" && page.fields.role === "pc";
}

/** A note on a line of its own, or nothing. */
function lineOf(note: string | undefined): string
{
    return note === undefined ? "" : `\n${note}`;
}

/** "Ennio: hp 12/12; Annegato 1: hp 22/22". */
function membersText(members: Member[]): string
{
    return members.map((member) => {
        const shown = [countersText(member.counters), ...(member.effects ?? [])].filter((part) => part !== "").join(" · ");
        return shown === "" ? member.name : `${member.name}: ${shown}`;
    }).join("; ");
}

/** A character in the scene, with their effects: the player character and a companion with the counters of their line (DAT-2), anyone else with all of theirs. */
function characterMember(world: World, page: Page, system: GameSystem | undefined): Member
{
    const counters = isPartyMember(page) ? partyCounters(world, page, undefined, system) : pageCounters(world, page);
    return { name: page.name, counters, effects: effectsOf(page).map((effect) => effectShown(world, effect)) };
}

function copyMembers(world: World, copies: Record<string, SceneCopy>): Member[]
{
    return Object.entries(copies).map(([name, copy]) => ({ name, counters: copyCounters(world, copy) }));
}

/** The names of everyone in the scene: its characters and its copies. */
function memberNames(current: Scene): string[]
{
    return [...current.with.map((link) => parsePageReference(link).name), ...Object.keys(current.copies)];
}

/**
 * New copies of the creatures asked for: each holds only the creature it copies, and later what changes (D-110). They are numbered after the copies in the scene,
 * skipping the names of pages and of those in the scene, so that a copy written as a character never blocks the next ones.
 */
function newCopies(world: World, creatures: SceneInput["creatures"], names: string[], existing: Record<string, SceneCopy> = {}): Record<string, SceneCopy>
{
    const copies: Record<string, SceneCopy> = {};
    const taken = [...names, ...world.pages.map((page) => page.name)];

    for (const [creature, count] of creatureCounts(world, creatures)) {
        const inScene = Object.values(existing).filter((copy) => comparableText(parsePageReference(copy.creature).name) === comparableText(creature.name)).length;

        if (inScene + count > mostCopies) {
            throw new Error(`A scene takes at most ${mostCopies} copies of ${creature.name}; it has ${inScene}.`);
        }

        for (const name of copyNames(creature.name, count, [...taken, ...Object.keys(existing), ...Object.keys(copies)])) {
            copies[name] = { creature: `[[${creature.name}]]` };
        }
    }

    return copies;
}

/** The creatures of some copies, each once. */
function copyCreatures(world: World, copies: Record<string, SceneCopy>): Page[]
{
    return [...new Set(Object.values(copies).flatMap((copy) => findPage(world, parsePageReference(copy.creature).name) ?? []))];
}

/**
 * What the character sees of those it does not know by name (D-416), by the name of a character in the scene or of a creature with copies in it: Bandito=brigante
 * incappucciato on the command line, {"Varro": "il mugnaio"} through MCP; none when not given.
 */
function seenOf(world: World, seen: SceneInput["seen"], characters: Page[], copies: Record<string, SceneCopy>): Record<string, string> | undefined
{
    const pairs: [string, string][] = Array.isArray(seen)
        ? seen.map((entry) => {
            const separator = entry.indexOf("=");
            return separator === -1 ? [entry, ""] : [entry.slice(0, separator), entry.slice(separator + 1)];
        })
        : Object.entries(seen ?? {});

    if (pairs.length === 0) {
        return undefined;
    }

    const kinds = [...new Set(Object.values(copies).map((copy) => parsePageReference(copy.creature).name))];
    const names = [...characters.map((page) => page.name), ...kinds];
    return Object.fromEntries(pairs.map(([name, said]) => {
        const named = sameName(names, parsePageReference(name.trim()).name);

        // A copy's name, as Cultista 1: seen is given by its creature, once for all its copies.
        const kind = sameName(kinds, /^(.*\S)\s+\d+$/.exec(name.trim())?.[1] ?? "");

        if (named === undefined && kind !== undefined) {
            throw new Error(`seen ${name.trim()}: give it by the creature, ${kind}, once for all its copies, such as ${kind}=${said.trim() || "uomo incappucciato"}: they are numbered from those words.`);
        }

        if (named === undefined) {
            throw new Error(`seen ${name.trim()}: there is no character or creature of that name in the scene. In it: ${names.length === 0 ? "no one" : names.join(", ")}.`);
        }

        // The party knows itself: seen is for those the character does not know by name.
        if (characters.some((page) => page.name === named && isPartyMember(page))) {
            throw new Error(`seen ${named}: ${named} is of the party, whom the character knows by name. Give seen only for those it does not know, such as a stranger or a creature.`);
        }

        if (said.trim() === "") {
            throw new Error(`Give what the character sees of ${named}, in two or three words, such as ${named}=uomo incappucciato.`);
        }

        return [named, said.trim()];
    }));
}

/** Creatures and how many of each, the same creature given twice counted once: Annegato=2 or Annegato on the command line, {"Annegato": 2} through MCP. */
function creatureCounts(world: World, creatures: SceneInput["creatures"]): [Page, number][]
{
    const pairs: [string, number][] = Array.isArray(creatures)
        ? creatures.map((entry) => {
            const separator = entry.lastIndexOf("=");
            return separator === -1 ? [entry, 1] : [entry.slice(0, separator), Number(entry.slice(separator + 1).trim())];
        })
        : Object.entries(creatures ?? {});
    const counts = new Map<Page, number>();

    for (const [name, count] of pairs) {
        if (name.trim().startsWith("{")) {
            throw new Error(`Write creatures as Name=count, such as Annegato=2: an object such as {"Annegato": 2} works only through MCP.`);
        }

        if (!Number.isInteger(count) || count < 1 || count > mostCopies) {
            throw new Error(`Give how many ${name.trim()} enter as a whole number from 1 to ${mostCopies}, such as ${name.trim()}=2.`);
        }

        const creature = creaturePage(world, parsePageReference(name).name);
        counts.set(creature, (counts.get(creature) ?? 0) + count);
    }

    return [...counts];
}

function creaturePage(world: World, name: string): Page
{
    const page = findPage(world, name);

    if (page?.type === "creature") {
        return page;
    }

    const creatures = world.pages.filter((candidate) => candidate.type === "creature").map((candidate) => candidate.name);
    const more = creatures.length > 10 ? `, and ${creatures.length - 10} more: find --type creature` : "";
    const system = systemPagesHint(world, "creature");
    const none = system === "" ? "There are no creature pages yet: create one with write, type creature." : "The campaign has no creature pages yet.";
    const known = `${creatures.length === 0 ? none : `The campaign's creatures are: ${creatures.slice(0, 10).join(", ")}${more}.`}${system}${missingSystemHint(world)}`;
    throw new Error(page === undefined ? `There is no creature named ${name}. ${known}` : `${page.name} is ${withArticle(page.type ?? "free page")}, not a creature: characters enter with with. ${known}`);
}

function characterPage(world: World, name: string): Page
{
    const reference = parsePageReference(name).name;
    // A renamed page answers to its old name too, among its aliases (D-417).
    const page = pageNamed(world, reference);

    if (page === undefined) {
        throw new Error(`There is no page named ${reference}. Create the character with write first, or bring in a creature with creatures.`);
    }

    if (page.type !== "character") {
        const how = page.type === "creature" ? `creatures enter as copies, with creatures, such as ${page.name}=1` : "only characters and creatures take part in a scene";
        throw new Error(`${page.name} is ${withArticle(page.type ?? "free page")}, not a character: ${how}.`);
    }

    if (page.fields.status === "dead") {
        throw new Error(`${page.name} is dead (status dead): set their status first, if they rise.`);
    }

    return page;
}

function placePage(world: World, name: string): Page
{
    const reference = parsePageReference(name).name;
    // A renamed page answers to its old name too, among its aliases (D-417).
    const page = pageNamed(world, reference);

    if (page?.type !== "place") {
        throw new Error(page === undefined ? `There is no place named ${reference}. Create it with write, type place, or leave place out.` : `${page.name} is ${withArticle(page.type ?? "free page")}, not a place.`);
    }

    return page;
}

/** A scene opens only in play: the game starts once the checklists of setup and session zero are complete (D-221, MOD-6). */
function checkInPlay(root: string, context: Context, world: World): void
{
    const mode = campaignMode(root, world);

    if (mode !== "play") {
        throw new Error(`The game has not started: the campaign is in ${mode}, and scenes open in play. ${checklistLine(mode, root, context, world) ?? ""}`.trim());
    }
}

/** Where the player character is: the nearest place among its containers. */
function leadPlace(world: World): Page | undefined
{
    const lead = world.pages.find((page) => page.type === "character" && page.fields.role === "pc");
    return lead === undefined ? undefined : locate(world, lead).chain.find((holder) => holder.type === "place");
}

/**
 * Who of the party enters a scene when with is left out (CON-6): the living members in its place, and those where the player character is; all of them when
 * there is no place.
 */
function enteringParty(world: World, place: Page | undefined): Page[]
{
    const lead = leadPlace(world);
    const nearestPlace = (page: Page): Page | undefined => locate(world, page).chain.find((holder) => holder.type === "place");
    return world.pages.filter((page) => isInParty(page) && (place === undefined || locate(world, page).chain.includes(place) || (lead !== undefined && nearestPlace(page) === lead)));
}

function withoutUndefined(current: Scene): Scene
{
    return Object.fromEntries(Object.entries(current).filter(([, value]) => value !== undefined)) as unknown as Scene;
}
