import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { closedSquare, featureAt, firstOpenSquare, type Grid, readSquare, type Square, squareName } from "../grid/index.ts";
import { isInParty, locate, type Page, pageNamed, pagesWithName, pageTypeNames, parsePageReference, type World, writePage } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import { type Surrounding, surroundings, surroundingsChange } from "./game-environment.ts";
import { moveFacts } from "./game-grid-moves.ts";
import { atEntries, atEntry, clearCopies, offMapNote, placeGrid, type Standing, standing } from "./game-grids.ts";
import { picturesNote } from "./game-images.ts";
import { movePages } from "./game-moves.ts";
import { measuresOf, roadsOf, sameSpot, stopOf } from "./game-roads.ts";
import { copyName, readOpenScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";
import { shortList, skippedPagesNote } from "./notes.ts";

// A list, or one text, as an MCP client may send it.
const textList = z.union([z.string(), z.array(z.string())]);

/** What move did, as its output tells it (CON-8, ENV-5). */
interface MoveResult
{
    moved: string[];
    /** Those that were already only there. */
    already: string[];
    to: string;
    /** The destination and what holds it, nearest first. */
    chain: string[];
    /** The other characters right in the destination. */
    there: string[];
    /** What changes around the characters who moved. */
    here: string[];
    noLonger: string[];
    notes: string[];
    problems: string[];
    /** Who stands on a square of the place's map now (GRD-3), and the place; how far they went, and from where, when the game counts it (GRD-5). */
    placed?: { who: string; square: string; place: string; distance?: string; from?: string; };
}

export const move = defineCommand({
    name: "move",
    description: "Move characters, items or places into a place, a character's inventory or an item: whenever someone or something goes somewhere, before you narrate it. "
        + "Each ends up only there, wherever it was before, and conditions such as party in [[Ossario]] fire. Time does not pass: advance does that. "
        + "Example: page [Ettore, Lena], to Ossario.",
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: textList.describe("what moves: one or more characters, items or places, such as [Ettore, Lena]"),
        to: z.string().optional().describe("where: a place; for characters and items also an item, such as a cart; for items also a character who carries them"),
        at: z.string().optional().describe("the square one stands on, such as E6: on the map of the place they are in, or with to of the place they go into; for one page or one copy of the open scene"),
    }),

    run(input, context): MoveResult
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const { scene } = readOpenScene(root);
        const names = (typeof input.page === "string" ? [input.page] : input.page).filter((name) => name.trim() !== "");

        if (names.length === 0) {
            throw new Error("Give what moves, such as page Ettore.");
        }

        if (input.at !== undefined) {
            return moveOnMap(root, context, world, scene, names, input.at, input.to);
        }

        if (input.to === undefined) {
            throw new Error("Give where they go, to, such as to Ossario; or the square of the map they stand on, at, such as E6. Nothing moved.");
        }

        return moveInto(root, context, world, scene, names, input.to);
    },

    format(result)
    {
        const way = result.placed?.distance === undefined ? "" : `, ${result.placed.distance} from ${result.placed.from ?? "where they stood"}`;
        const placed = result.placed === undefined ? "" : `${result.placed.who}: now on ${result.placed.square} in ${result.placed.place}${way}.`;

        if (result.moved.length === 0 && result.placed !== undefined) {
            return [[placed, ...result.notes].filter((line) => line !== "").join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
        }

        if (result.moved.length === 0) {
            return [`Nothing changed: ${result.already.join(", ")} ${result.already.length === 1 ? "is" : "are"} already in ${result.to}.`, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
        }

        const already = result.already.length === 0 ? "" : ` Already there: ${result.already.join(", ")}.`;
        const there = result.there.length === 0 ? "" : ` There: ${shortList(result.there, ", ")}.`;
        const around = [result.here.length === 0 ? "" : `Here: ${result.here.join(" · ")}.`, result.noLonger.length === 0 ? "" : `No longer: ${result.noLonger.join(" · ")}.`].filter((part) => part !== "").join(" ");
        const lines = [`Moved ${result.moved.join(", ")}: now in ${result.chain.join(" › ")}.${already}${there}`, placed, around, ...result.notes];
        return [lines.filter((line) => line !== "").join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** Puts one on a square of the map of the place it is right in, as move with at, and what move says of it (ASK-11). */
export function placeOnMap(root: string, context: Context, name: string, square: string): string
{
    const { scene } = readOpenScene(root);
    return move.format(moveOnMap(root, context, campaignWorld(root, context), scene, [name], square, undefined));
}

/** Moves pages into a place, an item or a character (CON-4), and says what changed around them (CON-8, ENV-5). */
function moveInto(root: string, context: Context, world: World, scene: Scene | undefined, names: string[], to: string, placing = false): MoveResult
{
    const pages = names.map((name) => pageOf(world, scene, name, "what")).filter((page, index, all) => all.indexOf(page) === index);
    const destination = pageOf(world, scene, to, "where");
    // The characters who go, by themselves or inside a place that goes, such as a cart or a ship (CON-8, ENV-5).
    const riders = world.pages.filter((page) => page.type === "character" && (pages.includes(page) || locate(world, page).chain.some((holder) => pages.includes(holder))));
    const before = new Map(riders.map((page) => [page.path, surroundings(world, page)]));
    const journey = journeyNote(world, riders, destination);
    const done = movePages(root, context, world, pages, destination);
    const after = done.world;
    const now = (page: Page): Page => after.pages.find((other) => other.path === page.path) ?? page;
    const target = now(destination);
    const moved = new Set(done.moved.map((page) => page.path));
    const changes = riders.map((page) => surroundingsChange(before.get(page.path) ?? [], surroundings(after, now(page))));
    const went = riders.filter((page) => moved.has(page.path) || locate(world, page).chain.some((holder) => moved.has(holder.path)));
    const sceneNote = scene === undefined ? undefined : followParty(root, context, after, scene, went, target);
    // Who else is there matters to characters who arrive (CON-8), not to things.
    // The party's player character arrives where the campaign wants pictures: the place gets one (D-308).
    const arrived = went.some((page) => page.fields.role === "pc") ? picturesNote(root, context, after, target) : undefined;
    const there = riders.length === 0 ? [] : after.pages.filter((page) => page.type === "character" && !pages.some((other) => other.path === page.path) && locate(after, page).chain[0] === target);
    // Who is put on a square at once needs no word on where they came in.
    const squares = placing ? undefined : squaresNote(after, target, done.moved);
    return {
        moved: done.moved.map((page) => page.name),
        already: pages.filter((page) => !moved.has(page.path)).map((page) => page.name),
        to: target.name,
        chain: [target, ...locate(after, target).chain].map((page) => page.name),
        there: there.map((page) => (page.fields.status === "dead" ? `${page.name} (dead)` : page.name)),
        here: distinctTexts(changes.flatMap((change) => change.here)),
        noLonger: distinctTexts(changes.flatMap((change) => change.noLonger)),
        notes: [
            ...done.notes,
            ...(sceneNote === undefined ? [] : [sceneNote]),
            ...(done.moved.length === 0 || journey === undefined ? [] : [journey]),
            ...(arrived === undefined ? [] : [arrived]),
            ...(squares === undefined ? [] : [squares]),
        ],
        problems: world.problems,
    };
}

/**
 * Puts one page or copy of the open scene on a square of a place's map (GRD-3): of the place it goes to with `to`, or of the one it is right in; the place's
 * `at` changes, and a line goes in the log, kept out of the diary. Refused before anything moves: outside the map, on a wall or on what blocks, or for a place
 * without a map.
 */
function moveOnMap(root: string, context: Context, world: World, scene: Scene | undefined, names: string[], at: string, to: string | undefined): MoveResult
{
    const square = readSquare(at);

    if (square === undefined) {
        throw new Error(`Give the square as the map names it, a letter and a number, such as E6. Nothing moved.`);
    }

    if (names.length > 1) {
        throw new Error(`Put one at a time on the map: each stands on its own square, such as page ${names[0]}, at ${squareName(square)}. Nothing moved.`);
    }

    const copy = copyName(world, scene, parsePageReference(names[0]).name);

    if (copy !== undefined && to !== undefined) {
        throw new Error(`${copy} is a copy in the open scene: it stands where the scene is, so give it only at, such as page ${copy}, at ${squareName(square)}. Nothing moved.`);
    }

    const page = copy === undefined ? pageOf(world, scene, names[0], "what") : undefined;
    const who = copy ?? page?.name ?? names[0];
    // The place whose map they stand on: the scene's for a copy, the one they go into with to, else the one they are right in.
    const place = copy !== undefined ? scenePlace(world, scene) : to !== undefined ? pageOf(world, scene, to, "where") : page === undefined ? undefined : locate(world, page).chain[0];

    if (place === undefined || place.type !== "place") {
        throw new Error(
            to === undefined
                ? `${who} is not right in a place${place === undefined ? "" : `: it is in ${place.name}`}, so it has no square to stand on. Move it into a place first, with to. Nothing moved.`
                : `${place?.name ?? to} is not a place, so ${who} would stand on no square of it: give at only with a place, or move without at. Nothing moved.`,
        );
    }

    const map = placeGrid(place);

    if (map === undefined) {
        throw new Error(`${place.name} has no map, so ${who} has no square to stand on: write one in a map block of its page (GRD-1). Nothing moved.`);
    }

    const closed = closedSquare(map.grid, square);

    if (closed !== undefined) {
        throw new Error(`${closed}: ${who} cannot stand there. Give a square of the floor. Nothing moved.`);
    }

    const moved = to === undefined ? undefined : moveInto(root, context, world, scene, names, to, true);
    const now = moved === undefined ? world : campaignWorld(root, context);
    const fresh = page === undefined ? undefined : now.pages.find((other) => other.path === page.path);
    const here = now.pages.find((other) => other.path === place.path) ?? place;
    // Where everyone stood before: the mover's square, from which the way is counted, the one it came in by when it just came in (GRD-5).
    const before = standing(now, here, scene);
    const isMover = (one: Standing): boolean => (copy === undefined ? one.page === fresh : one.copy === copy);
    const from = before.find((one) => isMover(one) && one.square !== undefined)?.square;
    const entry = atEntry({ ...(fresh === undefined ? {} : { page: fresh }), ...(copy === undefined ? {} : { copy }) }, square);
    const kept = atEntries(here).filter((other) => !before.some((one) => one.entry === other && isMover(one)));
    writePage(now, here.name, undefined, { set: { at: [...kept, entry] } });
    const party = fresh !== undefined && (isInParty(fresh) || locate(now, fresh).chain.some(isInParty));
    appendLogEntry(root, newDatedLogEntry(root, context, "placed", party ? "public" : "hidden", { page: who, place: here.name, square: squareName(square) }));
    const system = campaignSystem(root, context);
    const mover: Standing = { entry, name: who, ...(fresh === undefined ? {} : { page: fresh }), ...(copy === undefined ? {} : { copy }), square };
    const others = before.filter((one) => !isMover(one));
    const facts = from === undefined ? undefined : moveFacts(now, system, measuresOf(root, system), scene, { grid: map.grid, who: mover, from, to: square, others });

    if (facts?.moved !== undefined) {
        updateScene(root, [[["moved"], facts.moved]]);
    }

    const cameIn = moved !== undefined && moved.moved.length > 0;
    const ground = groundNote(map.grid, square);
    return {
        ...(moved ?? { moved: [], already: [], to: here.name, chain: [here.name], there: [], here: [], noLonger: [], notes: [], problems: world.problems }),
        notes: [...(moved?.notes ?? []), ...(ground === undefined ? [] : [ground]), ...(facts?.notes ?? [])],
        placed: {
            who,
            square: squareName(square),
            place: here.name,
            ...(facts?.distance === undefined || from === undefined ? {} : { distance: facts.distance, from: cameIn ? `${squareName(from)}, where ${who} came in` : squareName(from) }),
        },
    };
}

/** A word to the master on the square one now stands on (GRD-5): what it is, when it is difficult or hidden from the player. */
function groundNote(grid: Grid, square: Square): string | undefined
{
    const feature = featureAt(grid, square);
    const marks = [feature?.difficult ? "difficult ground" : "", feature?.hidden ? "hidden: the player does not know it is there" : ""].filter((mark) => mark !== "");
    return feature === undefined || marks.length === 0 ? undefined : `${squareName(square)} is ${feature.name}, ${marks.join(", ")}.`;
}

/** The place where the open scene is; none when there is no scene, or it is in no place. */
function scenePlace(world: World, scene: Scene | undefined): Page | undefined
{
    return scene?.place === undefined ? undefined : pagesWithName(world, parsePageReference(scene.place).name)[0];
}

/**
 * Where those who went into a place with a map stand (GRD-3): on the square they entered by, or, for those whose way in the map does not show, a word that the
 * map wants them on it.
 */
function squaresNote(world: World, place: Page, moved: Page[]): string | undefined
{
    const map = placeGrid(place);
    const characters = moved.filter((page) => page.type === "character");

    if (map === undefined || characters.length === 0) {
        return undefined;
    }

    const placed = standing(world, place, undefined);
    const on = characters.flatMap((page) => placed.flatMap((one) => (one.page?.path === page.path && one.square !== undefined ? [`${page.name} on ${squareName(one.square)}`] : [])));
    const off = characters.filter((page) => !placed.some((one) => one.page?.path === page.path)).map((page) => page.name);
    const entered = on.length === 0 ? "" : `They stand where they came in: ${on.join(", ")}.`;
    const missing = off.length === 0 ? "" : `${place.name} has a map: put ${off.join(", ")} on it, such as page ${off[0]}, at ${squareName(firstOpenSquare(map.grid))}.`;
    return [entered, missing].filter((part) => part !== "").join(" ");
}

/** The page that moves, or where it goes: by name or alias, never a copy in the open scene, which has no place of its own (CON-3). */
function pageOf(world: World, scene: Scene | undefined, name: string, role: "what" | "where"): Page
{
    const reference = parsePageReference(name);

    if (reference.section !== undefined) {
        throw new Error(`Give ${reference.name} without #${reference.section}: whole pages move. Nothing moved.`);
    }

    const copy = copyName(world, scene, reference.name);

    if (copy !== undefined) {
        const why = role === "what" ? "has no place of its own: it is where the scene is, and one that goes leaves with scene leave" : "holds nothing: give a place, a character or an item";
        throw new Error(`${copy} is a copy in the open scene, which ${why}. Nothing moved.`);
    }

    const page = pageNamed(world, reference.name);

    if (page === undefined) {
        // A list sent as one text, as some clients do, names no page: creating one by that name would be wrong.
        const list = reference.name.includes(",")
            ? ` For more than one, give a list, such as page [${reference.name.split(",").map((part) => part.trim()).join(", ")}].`
            : ` Look for it with find, or create it with write and its type: ${pageTypeNames.join(", ")}.`;
        throw new Error(`There is no page named ${reference.name}.${list}${missingSystemHint(world)} Nothing moved.`);
    }

    return page;
}

/**
 * The open scene follows the party (CON-6): when all its living members in the scene went, by themselves or aboard a place that moved, into the destination and out
 * of the scene's place, the scene goes there, copies and all; when only some of them left the scene's place, they may have left the scene.
 */
function followParty(root: string, context: Context, world: World, scene: Scene, went: Page[], destination: Page): string | undefined
{
    // Read without stopping at names two pages share: the move is already done.
    const pageCalled = (link: string): Page | undefined => pagesWithName(world, parsePageReference(link).name)[0];
    const party = scene.with.map(pageCalled).filter((page): page is Page => page !== undefined && isInParty(page));
    const gone = party.filter((page) => went.some((other) => other.path === page.path));
    const place = scene.place === undefined ? undefined : pageCalled(scene.place);
    const outside = (page: Page): boolean => place === undefined || !locate(world, page).chain.includes(place);

    if (gone.length === 0) {
        return undefined;
    }

    // A scene is in a place: into an item, such as a cart, it goes to the place the item is in.
    const spot = [destination, ...locate(world, destination).chain].find((holder) => holder.type === "place");

    if (spot !== undefined && party.every((page) => locate(world, page).chain.includes(destination) && outside(page))) {
        // The copies leave the squares of the place they were in: on the new map the master puts them again (GRD-3).
        clearCopies(world, scene, Object.keys(scene.copies));
        updateScene(root, [[["place"], `[[${spot.name}]]`]]);
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: scene.title, place: `[[${spot.name}]]` }));
        const copies = Object.keys(scene.copies);
        const copiesToo = copies.length === 0 ? "" : `, with ${copies.join(", ")}`;
        // The copies stand on no square of the new map until the master puts them there.
        const onTheMap = offMapNote(world, spot, scene, copies);
        const ended = `Close it if it ended${place === undefined ? "" : ` in ${place.name}`}; scene leave whoever stays behind.`;
        return `The open scene, ${scene.title}, goes with them: now at ${spot.name}${copiesToo}. ${ended}${onTheMap === undefined ? "" : ` ${onTheMap}`}`;
    }

    if (place === undefined) {
        return undefined;
    }

    const left = gone.filter(outside).map((page) => page.name);
    const who = left.length === 1 ? left[0] : `[${left.join(", ")}]`;
    return left.length === 0 ? undefined : `${left.join(", ")} left ${place.name}, where the open scene is: if they left the scene, scene leave, who ${who}.`;
}

/**
 * A journey made with move (TRV-15): the party taken from one stop of the roads to another, which travel would walk stop by stop, letting the time pass; undefined
 * for any other move.
 */
function journeyNote(world: World, riders: Page[], destination: Page): string | undefined
{
    const roads = roadsOf(world);
    const member = riders.find(isInParty);
    const [from, to] = [member === undefined ? undefined : stopOf(world, roads, member), stopOf(world, roads, destination)];

    if (from === undefined || to === undefined || sameSpot(world, from, to) !== undefined) {
        return undefined;
    }

    return `${from.name} and ${to.name} are joined by roads: a journey goes with travel, which lets the time pass and moves them stop by stop (route to ${destination.name} says how long). If the time has passed already, advance it.`;
}

/** The texts of what changed around those who moved, each once. */
function distinctTexts(items: Surrounding[]): string[]
{
    return [...new Set(items.map((item) => item.text))];
}
