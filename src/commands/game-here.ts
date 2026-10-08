// A place written where the party is (TRV-14) and a position written as a relation (POS-2): what write does beyond the page it writes.
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText } from "../core/text.ts";
import { type FieldChange, formatPosition, type Page, pagesWithName, type Position, readStops, withPage, type World, writePage } from "../pages/index.ts";
import { type Journey, journeyPoint, journeyStart, moversNamed, type OnRoad, readJourney, saveJourney } from "./game-journey.ts";
import { movePages } from "./game-moves.ts";
import { positionFromWrite, regionAt } from "./game-positions.ts";
import { lengthText, roadsOf } from "./game-roads.ts";
import { newDatedLogEntry } from "./game-time.ts";

/** Where a place written `here` goes (TRV-14): on a road at the point its journey stopped, or at a point in the open; with the journey and who travels. */
export interface Here
{
    journey: Journey;
    movers: Page[];
    on?: OnRoad;
    at?: Position;
}

/** What a position written for a place does besides (POS-2): the place that becomes the map's centre, and what write says. */
export interface Placed
{
    origin?: Page;
    notes: string[];
}

/**
 * Where the journey stopped, for a place written `here` (TRV-14): refused for a page that exists or is not a place, with a position given too, or without a
 * journey stopped between two places, with how to write a place inside another.
 */
export function hereOf(root: string, world: World, name: string, existing: Page | undefined, type: string | undefined, change: FieldChange): Here
{
    if (existing !== undefined || type !== "place") {
        throw new Error(`here makes a new place where the party stopped: give a new name and type place, such as write Accampamento, type place, here. Nothing changed.`);
    }

    if (change.set?.position !== undefined) {
        throw new Error("here gives the place its position, where the party stopped: leave position out. Nothing changed.");
    }

    const journey = readJourney(root);
    const movers = journey === undefined ? [] : moversNamed(world, journey);
    const on = journey === undefined || journeyStart(world, roadsOf(world), journey, movers) === undefined ? undefined : journey.on;
    const at = journey === undefined ? undefined : journeyPoint(world, journey, movers);

    if (journey === undefined || (on === undefined && at === undefined)) {
        throw new Error(
            `here is where a journey stopped, on a road or in the open, and none did: to write ${name} inside a place, write ${name}, type place, then add contains=[[${name}]] to that place. Nothing changed.`,
        );
    }

    return { journey, movers, on, at };
}

/** The fields a place written `here` in the open takes: the point's position (TRV-14). */
export function hereFields(here: Here, change: FieldChange): FieldChange
{
    return here.at === undefined ? change : { ...change, set: { ...change.set, position: formatPosition(here.at) } };
}

/**
 * After the place is written `here` (TRV-14): on a road, it becomes a stop that splits the stretch at the point, and the road holds it; in the open, the region
 * that covers the point holds it. Those who travel go into it, and the journey goes on from it. Returns the world after it and what write says.
 */
export function placeHere(root: string, context: Context, world: World, page: Page, here: Here): { world: World; notes: string[]; }
{
    let now = world;
    const holder = here.on === undefined ? (here.at === undefined ? undefined : regionAt(now, here.at)?.page) : pagesWithName(now, here.on.road)[0];
    const notes: string[] = [];

    if (here.on !== undefined) {
        const road = pagesWithName(now, here.on.road)[0];
        const stops = splitStops(road, here.on, page.name);
        now = withPage(now, road, writePage(now, road.name, undefined, { set: { stops } }).page);
        appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: road.name, set: { stops }, why: `${page.name} written where the journey stopped` }));
        notes.push(`${page.name} is now a stop of ${road.name}: ${stops.join(", ")}.`);
    }

    if (holder !== undefined) {
        now = withPage(now, pagesWithName(now, holder.name)[0], writePage(now, holder.name, undefined, { add: { contains: [`[[${page.name}]]`] } }).page);
        appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: holder.name, add: { contains: [`[[${page.name}]]`] }, why: `${page.name} written where the journey stopped` }));
    }

    const placeNow = pagesWithName(now, page.name)[0];
    const moved = movePages(root, context, now, here.movers.map((mover) => pagesWithName(now, mover.name)[0]), placeNow);
    saveJourney(root, { ...here.journey, on: undefined, at: undefined });
    const where = holder === undefined ? "in the open" : `in ${holder.name}`;
    return { world: moved.world, notes: [...notes, `${here.movers.map((mover) => mover.name).join(", ")} ${here.movers.length === 1 ? "is" : "are"} now in ${page.name}, ${where}; the journey goes on from there.`, ...moved.notes] };
}

/**
 * A position given to a place (POS-2): the coordinates to write in place of relations, the place that becomes the map's centre when none had a position, and
 * what write says: how far apart the relations were, and the centre.
 */
export function positionToWrite(world: World, name: string, change: FieldChange): { change: FieldChange; placed: Placed; }
{
    const value = change.set?.position;

    if (value === undefined) {
        return { change, placed: { notes: [] } };
    }

    const { position, spread, origin } = positionFromWrite(world, value, name);
    const notes = [
        spread >= 100 ? `The relations given are up to ${Math.round(spread / 100) / 10} km apart: ${name} is at their middle. If one is wrong, write the position again.` : "",
        origin === undefined ? "" : `${origin.name} is now the centre of the map, at 0 km E, 0 km N: every other position is given from a place that has one.`,
    ].filter((note) => note !== "");
    return { change: { ...change, set: { ...change.set, position: formatPosition(position) } }, placed: { origin, notes } };
}

/** Writes the map's centre on the place a first relation started from (POS-2). */
export function writeOrigin(root: string, context: Context, world: World, origin: Page): World
{
    const written = writePage(world, origin.name, undefined, { set: { position: "0 km E, 0 km N" } }).page;
    appendLogEntry(root, newDatedLogEntry(root, context, "page-updated", "hidden", { page: origin.name, set: { position: "0 km E, 0 km N" }, why: "the centre of the map" }));
    return withPage(world, origin, written);
}

/** A road's stops with a new one splitting the stretch where a journey stopped, the rest as written: the two lengths make the one before, to the metre. */
function splitStops(road: Page, on: OnRoad, name: string): string[]
{
    const read = readStops(road.fields.stops);

    if ("problem" in read || !Array.isArray(road.fields.stops)) {
        throw new Error(`${road.name}'s stops do not read: fix them first. Nothing changed.`);
    }

    const same = (first: string, second: string): boolean => comparableText(first) === comparableText(second);
    const joins = (at: number): boolean => at >= 0 && at < read.stops.length - 1 && ((same(read.stops[at], on.from) && same(read.stops[at + 1], on.toward)) || (same(read.stops[at], on.toward) && same(read.stops[at + 1], on.from)));
    // The stretch by its place in the road, so that a road through the same two stops twice splits the right one.
    const index = joins(on.index) ? on.index : read.stops.findIndex((_, at) => joins(at));
    const length = read.lengths[index];
    const along = same(read.stops[index], on.from) ? on.done : length - on.done;
    const first = Math.min(Math.max(Math.round(along / 100) * 100, 100), length - 100);
    const metres = (value: number): string => (value % 100 === 0 ? lengthText(value, { units: "metric", imperial: { mile: 0, foot: 0 } }) : `${Math.round(value)} m`);
    const written = road.fields.stops.map(String);
    // The stop at `index` is item 2 * index of the list; the length after it, 2 * index + 1.
    written.splice(2 * index + 1, 1, metres(first), `[[${name}]]`, metres(length - first));
    return written;
}
