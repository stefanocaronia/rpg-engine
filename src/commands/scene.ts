import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName, withArticle } from "../core/text.ts";
import { findPage, isEmptyField, isInParty, loadWorld, locate, type Page, parsePageReference, type World } from "../pages/index.ts";
import { copyNames, nextTurn, type Scene, type SceneCopy, sceneTypes } from "../scene/index.ts";
import { formatGameDate } from "../time/index.ts";
import { endedByTurn, endEffects, endsWithScene } from "./game-effects.ts";
import { copyCounters, openScene, rawScene, readOpenScene, saveScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { countersText, pageCounters } from "./page-counters.ts";

const actions = ["open", "add", "leave", "order", "next", "close"] as const;
type Action = (typeof actions)[number];

// The parameters each action takes; any other is refused, so that nothing given is silently ignored.
const actionParameters: Record<Action, string[]> = { open: ["title", "type", "place", "with", "creatures"], add: ["with", "creatures"], leave: ["who"], order: ["order"], next: [], close: ["summary"] };

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
    summary?: string;
}

/** The input as given: a list may come as one text. */
type GivenInput = Omit<SceneInput, "with" | "creatures" | "who" | "order"> & { with?: string | string[]; creatures?: string | string[] | Record<string, number>; who?: string | string[]; order?: string | string[]; };

/** The order of turns, where the scene has one. */
interface Turns
{
    order: string[];
    round: number;
    turn: string;
}

/** Someone in the scene, with their counters. */
interface Member
{
    name: string;
    counters: Record<string, unknown>;
}

type SceneResult =
    | { action: "open"; title: string; type: string; opened?: string; place?: string; members: Member[]; }
    | { action: "add"; title: string; members: Member[]; ordered: boolean; }
    | { action: "leave"; left: Member[]; turns?: Turns; noTurns: boolean; ended: string[]; }
    | ({ action: "order" | "next"; noTurn: string[]; ended: string[]; } & Turns)
    | { action: "close"; title?: string; rounds?: number; copies: Member[]; unreadable?: string; ended: string[]; };

export const scene = defineCommand({
    name: "scene",
    description: "Open, run and close a scene of the story. "
        + `open starts one: title, type (${sceneTypes.join(", ")}), place (the character's if left out), `
        + "with (everyone in it, the character included: the character and companions there, if left out) and creatures, as numbered copies such as Annegato 1: a copy holds only what changes, the rest is read from the creature. "
        + "add brings in more characters or creatures; leave takes out who goes (fled, fallen, gone); order sets who takes turns, in order, after rolling for it if the game does; next passes the turn; "
        + "close ends the scene with a summary of one or two sentences, as the player saw it: the player may read the title and summary. "
        + "Change a copy's counters with change, as for a page. "
        + 'Example: action open, title "Scontro all\'ossario", type combat, creatures {"Annegato": 2}.',
    group: "game",
    positionals: ["action"],
    input: z.object({
        action: z.enum(actions).describe("open, add, leave, order, next or close"),
        title: z.string().optional().describe("open: the scene's title"),
        type: z.enum(sceneTypes).optional().describe(`open: ${sceneTypes.join(", ")}`),
        place: z.string().optional().describe("open: the place, such as [[Ossario]]; the character's if left out"),
        with: textList.optional().describe("open, add: the characters in the scene, such as [[Lena]]"),
        creatures: z.union([textList, z.record(z.string(), z.number().int())]).optional().describe('open, add: creatures as numbered copies: Annegato=2 (Annegato alone is one), or through MCP an object such as {"Annegato": 2}'),
        who: textList.optional().describe("leave: who leaves the scene, characters or copies, such as Annegato 2"),
        order: textList.optional().describe("order: who takes turns, in order; those left out (fallen, fled) take none"),
        summary: z.string().optional().describe("close: what happened, in one or two sentences, as the player saw it"),
    }),

    run(given, context): SceneResult
    {
        const root = requireCampaign(context.folder);
        const input = asLists(given);
        checkParameters(input);
        const world = loadWorld(root);

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
            case "add":
                return addTo(root, world, input, context, current);
            case "leave":
                return leave(root, world, input.who ?? [], context, current);
            case "order":
                return setOrder(root, world, input.order ?? [], context, current);
            default:
                return passTurn(root, world, context, current);
        }
    },

    format(result)
    {
        switch (result.action) {
            case "open": {
                const when = result.opened === undefined ? "" : `, ${result.opened}`;
                const where = result.place === undefined ? "" : ` at ${result.place}`;
                const members = result.members.length === 0 ? "No one in it yet: add who is there with scene add." : `In it: ${membersText(result.members)}.`;
                return `Scene opened${when}: ${result.title} (${result.type})${where}. ${members}`;
            }

            case "add": {
                const last = result.ordered ? " They take their turns last: change the order with scene order if needed." : "";
                return `Added to ${result.title}: ${membersText(result.members)}.${last}`;
            }

            case "leave": {
                const turns = result.turns === undefined ? (result.noTurns ? "\nNo one takes turns now." : "") : `\n${turnText(result.turns)}`;
                const left = result.left.map((member) => (Object.keys(member.counters).length === 0 ? member.name : `${member.name} (${countersText(member.counters)})`));
                return `${left.join(", ")} left the scene.${turns}${endedText(result.ended)}`;
            }

            case "order":
                return `Order: ${result.order.join(" · ")}.${result.noTurn.length === 0 ? "" : ` No turn: ${result.noTurn.join(", ")}.`}\n${turnText(result)}${endedText(result.ended)}`;
            case "next":
                return `${turnText(result)}${endedText(result.ended)}`;
            default:
                return closedText(result);
        }
    },
});

/** Lists as lists: one text is a list of one, and an empty text, list or object counts as left out. */
function asLists(given: GivenInput): SceneInput
{
    const list = <Value extends object>(value: string | Value | undefined): Value | string[] | undefined => {
        if (isEmptyField(value) || (typeof value === "object" && Object.keys(value as object).length === 0)) {
            return undefined;
        }

        return typeof value === "string" ? [value] : value;
    };

    return { ...given, with: list(given.with), creatures: list(given.creatures), who: list(given.who), order: list(given.order) };
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

    const place = input.place === undefined ? leadPlace(world) : placePage(world, input.place);
    const characters = unique(input.with === undefined ? partyAt(world, place) : input.with.map((name) => characterPage(world, name)));
    const copies = newCopies(world, input.creatures, characters.map((page) => page.name));
    const opened = readPresent(root).date;
    // A scene without copies leaves the key out: an empty {} would be written on one line.
    const created: Scene = {
        title: input.title.trim(),
        type: input.type,
        place: place === undefined ? undefined : `[[${place.name}]]`,
        opened: opened === undefined ? undefined : formatGameDate(opened),
        with: characters.map((page) => `[[${page.name}]]`),
        copies,
    };
    saveScene(root, withoutUndefined({ ...created, copies: Object.keys(copies).length === 0 ? undefined : copies } as unknown as Scene));
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-opened", "public", { title: created.title, type: created.type, place: created.place, with: created.with }));
    logCopies(root, context, created.title, copies);
    return { action: "open", title: created.title, type: created.type, opened: created.opened, place: place?.name, members: [...characters.map((page) => characterMember(world, page)), ...copyMembers(world, copies)] };
}

function addTo(root: string, world: World, input: SceneInput, context: Context, current: Scene): SceneResult
{
    if (input.with === undefined && input.creatures === undefined) {
        throw new Error("Give who enters the scene: with (characters) or creatures (such as Annegato=1).");
    }

    const members = memberNames(current);
    const characters = unique((input.with ?? []).map((name) => characterPage(world, name)));
    const already = characters.filter((page) => sameName(members, page.name) !== undefined);

    if (already.length > 0) {
        throw new Error(`${already.map((page) => page.name).join(", ")} ${already.length === 1 ? "is" : "are"} already in the scene.`);
    }

    const copies = newCopies(world, input.creatures, [...members, ...(current.left ?? []), ...characters.map((page) => page.name)], current.copies);
    const added = [...characters.map((page) => page.name), ...Object.keys(copies)];
    const changes: [string[], unknown][] = [[["with"], [...current.with, ...characters.map((page) => `[[${page.name}]]`)]], ...Object.entries(copies).map(([name, copy]): [string[], unknown] => [["copies", name], copy])];

    if (current.order !== undefined) {
        changes.push([["order"], [...current.order, ...added]]);
    }

    updateScene(root, changes);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, added }));
    logCopies(root, context, current.title, copies);
    return { action: "add", title: current.title, members: [...characters.map((page) => characterMember(world, page)), ...copyMembers(world, copies)], ordered: current.order !== undefined };
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
    const turns = order === undefined || order.length === 0 ? undefined : { order, ...keptTurn(current, order) };

    if (current.order !== undefined) {
        changes.push([["order"], turns?.order], [["turn"], turns?.turn]);

        if (turns !== undefined) {
            changes.push([["round"], turns.round]);
        }
    }

    changes.push([["left"], [...(current.left ?? []), ...leaving]]);

    updateScene(root, changes);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, left: leaving, copies: Object.keys(copies).length === 0 ? undefined : copies }));
    const left = leaving.map((name) => (name in copies ? { name, counters: copyCounters(world, copies[name]) } : { name, counters: {} }));
    // The copies that left are gone with their effects; the turn may have passed, and with it the end of some effects.
    const remaining = { ...current, copies: Object.fromEntries(Object.entries(current.copies).filter(([name]) => !leaving.includes(name))) };
    const ended = turns === undefined ? [] : endEffects(root, context, world, remaining, (effect) => endedByTurn(effect, turns.round, turns.turn, turns.order), "turn");
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
    return { action: "order", order: named, round, turn, noTurn: members.filter((name) => !named.includes(name)), ended };
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
    return { action: "next", order, round, turn, noTurn: [], ended };
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
    // Rounds exist only in the scene: the effects counted in them end with it, on the pages; the copies go with theirs.
    const ended = endEffects(root, context, world, undefined, endsWithScene, "scene closed");
    saveScene(root, undefined);

    if (current === undefined) {
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-closed", "public", { ...rawTitleAndType(raw), closed, summary: summary.trim() }));
        return { action: "close", copies: [], unreadable: problem?.message, ended };
    }

    logCopies(root, context, current.title, current.copies);
    const left = current.left?.filter((name) => world.pages.some((page) => comparableText(page.name) === comparableText(name)));
    const data = { title: current.title, type: current.type, place: current.place, with: current.with, left: left?.length === 0 ? undefined : left, opened: current.opened, closed, rounds: current.round, summary: summary.trim() };
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-closed", "public", data));
    return { action: "close", title: current.title, rounds: current.round, copies: copyMembers(world, current.copies), ended };
}

/** The title and type of a scene that cannot be read, as far as they can be, so that the log still holds a closed scene. */
function rawTitleAndType(raw: unknown): { title: string; type: string; }
{
    const fields = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const title = typeof fields.title === "string" && fields.title.trim() !== "" ? fields.title : "Untitled scene";
    const type = typeof fields.type === "string" && (sceneTypes as readonly string[]).includes(fields.type) ? fields.type : "other";
    return { title, type };
}

function closedText(result: { title?: string; rounds?: number; copies: Member[]; unreadable?: string; ended: string[]; }): string
{
    const advance = "Advance any time it took that you have not advanced yet.";
    const ended = result.ended.length === 0 ? "" : `\nEnded with the scene: ${result.ended.join(" · ")}.`;

    if (result.unreadable !== undefined) {
        return `The open scene could not be read (${result.unreadable}): closed it, without its copies. ${advance}${ended}`;
    }

    const rounds = result.rounds === undefined ? "" : ` after ${result.rounds} ${result.rounds === 1 ? "round" : "rounds"}`;
    const gone = result.copies.length === 0 ? "" : ` Copies gone: ${membersText(result.copies)}.`;
    return `Scene closed${rounds}: ${result.title}.${gone} ${advance}${ended}`;
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

/** "Round 2 · now Lena (then Annegato 2)." */
function turnText(result: Turns): string
{
    const then = result.order.length > 1 ? nextTurn(result.order, result.turn, 1).turn : undefined;
    return `Round ${result.round} · now ${result.turn}${then === undefined ? "" : ` (then ${then})`}.`;
}

/** "Ennio: hp 12/12; Annegato 1: hp 22/22". */
function membersText(members: Member[]): string
{
    return members.map((member) => {
        const counters = countersText(member.counters);
        return counters === "" ? member.name : `${member.name}: ${counters}`;
    }).join("; ");
}

function characterMember(world: World, page: Page): Member
{
    return { name: page.name, counters: pageCounters(world, page) };
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
    const known = creatures.length === 0 ? "There are no creature pages yet: create one with write, type creature." : `The creatures are: ${creatures.slice(0, 10).join(", ")}${more}.`;
    throw new Error(page === undefined ? `There is no creature named ${name}. ${known}` : `${page.name} is ${withArticle(page.type ?? "free page")}, not a creature: characters enter with with. ${known}`);
}

function characterPage(world: World, name: string): Page
{
    const reference = parsePageReference(name).name;
    const page = findPage(world, reference);

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
    const page = findPage(world, reference);

    if (page?.type !== "place") {
        throw new Error(page === undefined ? `There is no place named ${reference}. Create it with write, type place, or leave place out.` : `${page.name} is ${withArticle(page.type ?? "free page")}, not a place.`);
    }

    return page;
}

/** Where the player character is: the nearest place among its containers. */
function leadPlace(world: World): Page | undefined
{
    const lead = world.pages.find((page) => page.type === "character" && page.fields.role === "pc");
    return lead === undefined ? undefined : locate(world, lead).chain.find((holder) => holder.type === "place");
}

/** The player character and the companions in a place, alive; all of them when there is no place. */
function partyAt(world: World, place: Page | undefined): Page[]
{
    return world.pages.filter((page) => isInParty(page) && (place === undefined || locate(world, page).chain.includes(place)));
}

function unique(pages: Page[]): Page[]
{
    return pages.filter((page, index) => pages.indexOf(page) === index);
}

function withoutUndefined(current: Scene): Scene
{
    return Object.fromEntries(Object.entries(current).filter(([, value]) => value !== undefined)) as unknown as Scene;
}
