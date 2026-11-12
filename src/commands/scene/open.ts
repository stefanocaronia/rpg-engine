// scene open and scene add: where, who enters, the creatures' copies, what the character sees of them
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { comparableText, sameName, withArticle } from "../../core/text.ts";
import { findPage, isInParty, isPartyMember, locate, type Page, pageNamed, pageWithPath, parsePageReference, type World } from "../../pages/index.ts";
import { copyNames, type Scene, type SceneCopy, sceneTypes } from "../../scene/index.ts";
import { formatGameDate } from "../../time/index.ts";
import { metPictureNote, picturesNote } from "../shared/campaign/images.ts";
import { campaignMode, checklistLine } from "../shared/campaign/mode.ts";
import { situationPart } from "../shared/campaign/parts.ts";
import { campaignSystem, missingSystemHint, systemPagesHint } from "../shared/campaign/world.ts";
import { surroundings, surroundingsText } from "../shared/places/environment.ts";
import { offMapNote } from "../shared/places/grids.ts";
import { readJourney } from "../shared/places/journey.ts";
import { movePages } from "../shared/places/moves.ts";
import { partyLead, playersApart } from "../shared/places/roads.ts";
import { saveScene, updateScene } from "../shared/scene/scene.ts";
import { newDatedLogEntry, readPresent } from "../shared/time/time.ts";
import { characterMember, copyMembers, logCopies, memberNames } from "./members.ts";
import type { Brought, SceneInput, SceneResult } from "./result.ts";

// The most copies of one creature a scene takes.
const mostCopies = 50;

export function openNew(root: string, world: World, input: SceneInput, context: Context, current: Scene | undefined): SceneResult
{
    if (current !== undefined) {
        throw new Error(`A scene is open: ${current.title}. Close it first with scene close and a summary.`);
    }

    if (input.title === undefined || input.title.trim() === "" || input.type === undefined) {
        throw new Error(`Give the scene a title and a type: ${sceneTypes.join(", ")}.`);
    }

    checkInPlay(root, context, world);
    const named = input.with?.map((name) => characterPage(world, name));
    const movers = readJourney(root)?.movers ?? [];
    const place = input.place === undefined ? defaultPlace(world, movers, named) : placePage(world, input.place);
    const characters = [...new Set(named ?? enteringParty(world, movers, place))];
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

export function addTo(root: string, world: World, input: SceneInput, context: Context, current: Scene): SceneResult
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

/**
 * Where a scene opens without a place (SCN-2): where the player characters are; while they are apart (VIEW-12), where those it is with are, when they are
 * together; else refused, with where each is.
 */
function defaultPlace(world: World, movers: string[], named: Page[] | undefined): Page | undefined
{
    if (named !== undefined && playersApart(world, movers) !== undefined) {
        const places = [...new Set(named.map((page) => nearestPlace(world, page)))];

        if (places.length > 1) {
            throw new Error(
                `${named.map((page) => `${page.name}, in ${nearestPlace(world, page)?.name ?? "the open"}`).join("; ")}: a scene is in one place. Give place to bring the others there now, `
                    + "if they can be there at once; if the way takes time, travel first, or open a scene for each group. Nothing changed.",
            );
        }

        return places[0];
    }

    const lead = partyLead(world, movers, "Give place, where the scene is, or with, who is in it.");
    return lead === undefined ? undefined : nearestPlace(world, lead);
}

/** The nearest place of the living player characters when they are all together; undefined when they are apart (VIEW-12), or in the open. */
function togetherPlace(world: World, movers: string[]): Page | undefined
{
    const lead = playersApart(world, movers) === undefined ? partyLead(world, movers, "") : undefined;
    return lead === undefined ? undefined : nearestPlace(world, lead);
}

function nearestPlace(world: World, page: Page): Page | undefined
{
    return locate(world, page).chain.find((holder) => holder.type === "place");
}

/**
 * Who of the party enters a scene when with is left out (CON-6): the living members in its place, and those where the player characters are, when they are
 * together (VIEW-12); all of them when there is no place.
 */
function enteringParty(world: World, movers: string[], place: Page | undefined): Page[]
{
    const lead = togetherPlace(world, movers);
    return world.pages.filter((page) => isInParty(page) && (place === undefined || locate(world, page).chain.includes(place) || (lead !== undefined && nearestPlace(world, page) === lead)));
}

function withoutUndefined(current: Scene): Scene
{
    return Object.fromEntries(Object.entries(current).filter(([, value]) => value !== undefined)) as unknown as Scene;
}
