// Positions in play (D-259, POS-1–POS-8): where a place is, its own position or one worked out; relations turned into a position; regions; what is near a point;
// each on its map, with the coordinates its map uses (D-320).
import { lengthHelp, readLength } from "../core/length.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { biomes, directionHelp, directionName, directionTo, distanceBetween, meanPoint, placeKinds, pointAlong, pointFrom, readDirection } from "../map/index.ts";
import { environmentAt, formatPosition, isEmptyField, locate, type Page, pageNamed, pagesWithName, parsePageReference, type Position, readPosition, readStops, type World } from "../pages/index.ts";
import { mapKey, mapOf, sameFrame } from "./game-maps.ts";
import { lengthText, type Measures, roadsOf } from "./game-roads.ts";

/** A region (POS-6): a place with a position and a radius, which covers the circle. */
export interface Region
{
    page: Page;
    centre: Position;
    radius: number;
}

/** A relation written for a position (POS-2): a distance in metres, a direction in degrees, and the place it starts from. */
interface Relation
{
    metres: number;
    degrees: number;
    place: string;
}

/** What the map of a world holds, worked out once for each world (D-194): the places with a position, by their file, and the regions. */
interface Placed
{
    positions: Map<string, Position>;
    regions: Region[];
}

/** How to write a relation, for messages. */
export const relationHelp = "a distance, a direction and a place with a position, such as 12 km NE of [[Guadoscuro]]";

/**
 * Where a page is on the map (POS-4): the first of its chain, itself first, with a position: its own; for a stop, on the line between the nearest stops of its
 * road that have one, by the lengths; undefined when none has one. A character or an item is where the place that holds it is.
 */
export function positionOf(world: World, page: Page): Position | undefined
{
    for (const holder of [page, ...locate(world, page).chain]) {
        const position = placedPosition(world, holder);

        if (position !== undefined) {
            return position;
        }
    }

    return undefined;
}

/** A place's own position, or the one its roads give it, rather than its container's: the places that show on the map. */
export function placedPosition(world: World, page: Page): Position | undefined
{
    return page.type !== "place" || page.system !== undefined ? undefined : placedOf(world).positions.get(page.path);
}

/**
 * The position a write gives a place (POS-2): written as the engine writes it, or as relations, whose points are averaged, with the largest distance between
 * them. When no place with the same coordinates has a position yet, the one a relation starts from becomes the centre of its map: `origin`, to write too. The
 * places it is given from share their coordinates, and those of the place written when something already holds it (POS-8); a place nothing holds yet takes
 * them, and `map` names the map to put it in. Refused with the fix otherwise.
 */
export function positionFromWrite(world: World, value: unknown, name: string): { position: Position; spread: number; origin?: Page; map?: Page; }
{
    const own = readPosition(value);

    if (own !== undefined) {
        return { position: own, spread: 0 };
    }

    const texts = Array.isArray(value) ? value.map(String) : [String(value)];
    const relations = texts.map((text) => relationOf(text));
    const places = relations.map((relation) => referenceOf(world, relation.place, name));
    const map = sharedMap(world, places, pageNamed(world, name), name);
    const unplaced = places.filter((place) => positionOf(world, place) === undefined);
    const known = world.pages.filter((page) => page.system === undefined && readPosition(page.fields.position) !== undefined && mapOf(world, page).frame === mapOf(world, places[0]).frame);

    if (unplaced.length > 0 && (known.length > 0 || new Set(unplaced).size > 1 || unplaced.length < places.length)) {
        const such = known.length === 0 ? "" : `, such as ${known.slice(0, 3).map((page) => page.name).join(", ")}`;
        throw new Error(`${unplaced[0].name} has no position yet: give it one first, relative to a place that has one${such}, then write ${name}. Nothing changed.`);
    }

    const origin = unplaced[0];
    const points = relations.map((relation, index) => pointFrom(positionOf(world, places[index]) ?? { east: 0, north: 0 }, relation.degrees, relation.metres));
    const spread = Math.max(0, ...points.flatMap((point) => points.map((other) => distanceBetween(point, other))));
    return { position: meanPoint(points), spread, ...(origin === undefined ? {} : { origin }), ...(map === undefined ? {} : { map }) };
}

/** The regions of the world (POS-6): places of the campaign with a radius and a position, their own or one their roads give them. */
export function regionsOf(world: World): Region[]
{
    return placedOf(world).regions;
}

/** The smallest region of a map, by its key (POS-8), that covers a point (POS-6); undefined when none does. */
export function regionAt(world: World, point: Position, map = ""): Region | undefined
{
    return regionsOf(world)
        .filter((region) => mapKey(world, region.page) === map && distanceBetween(region.centre, point) <= region.radius)
        .sort((first, second) => first.radius - second.radius)[0];
}

/**
 * The places near a point (TRV-13): those with a position of their own or from their roads within 3 km, nearest first, at most 5, or else the nearest one; each
 * as "Torre Mozza, 2.1 km north-east". Regions and roads are left out.
 */
export function nearPlaces(world: World, point: Position, measures: Measures, map = "", except: Page[] = []): string[]
{
    const placed = placesByDistance(world, point, map, except);
    const near = placed.filter((place) => place.distance <= 3000).slice(0, 5);
    return (near.length > 0 ? near : placed.slice(0, 1)).map((place) => `${place.page.name}, ${relationText(point, place.position, measures)}`);
}

/** "12 km west of Guadoscuro": a point of a map told from its nearest place with a position, or that place's name at it; its position when there is none. */
export function pointText(world: World, point: Position, measures: Measures, map = ""): string
{
    const nearest = placesByDistance(world, point, map, [])[0];

    if (nearest === undefined) {
        return formatPosition(point);
    }

    const relation = relationText(nearest.position, point, measures);
    return relation === "here" ? nearest.page.name : `${relation} of ${nearest.page.name}`;
}

/** "2.1 km north-east", from a point to another; "here" closer than 50 m. */
export function relationText(from: Position, to: Position, measures: Measures): string
{
    const distance = distanceBetween(from, to);
    return distance < 50 ? "here" : `${lengthText(distance, measures)} ${directionName(directionTo(from, to))}`;
}

/**
 * What write says when a place first comes on the map without a kind, a region apart, or becomes a region without a biome (POS-7): the names the map draws. `before`
 * is the world before the write, `existing` the page as it was there.
 */
export function mapLookNotes(before: World, existing: Page | undefined, after: World, page: Page): string[]
{
    const placed = (world: World, candidate: Page | undefined): boolean => candidate !== undefined && placedPosition(world, candidate) !== undefined;
    const region = (world: World, candidate: Page | undefined): boolean => candidate !== undefined && regionsOf(world).some((found) => found.page.path === candidate.path);
    const isRoad = page.fields.stops !== undefined;
    const biome = environmentAt(after, page).some(({ entry }) => comparableText(entry.name) === "biome");
    return [
        !isRoad && !region(after, page) && isEmptyField(page.fields.kind) && placed(after, page) && !placed(before, existing)
            ? `For the dashboard's map, give ${page.name} a kind, as set kind=${placeKinds[2]}: ${placeKinds.join(", ")}.`
            : "",
        region(after, page) && !region(before, existing) && !biome
            ? `For the map, give ${page.name}'s environment a biome, as add environment="biome: ${biomes[0]}": ${biomes.join(", ")}; what it holds shares it.`
            : "",
    ].filter((note) => note !== "");
}

/** The roads shorter than the straight line between two of their stops that have a position of their own (POS-5): a length or a position is wrong. */
export function shortRoadProblems(world: World): Problem[]
{
    return shortRoads(world).map((short) => short.problem);
}

/** What write says of the roads a place's position or a road's stops make shorter than the straight line (POS-5): those of the page, or with it as a stop. */
export function shortRoadNotes(world: World, page: Page): string[]
{
    const same = (name: string): boolean => comparableText(name) === comparableText(page.name);
    return shortRoads(world).filter((short) => [short.road, short.from, short.to].some(same)).map(({ problem }) => `${problem.message} Fix: ${problem.fix}.`);
}

/** The roads shorter than the straight line (POS-5): each stop with the next one that has a position, in order; with the road and the stops it is about. */
function shortRoads(world: World): { road: string; from: string; to: string; problem: Problem; }[]
{
    return [...roadsOf(world).pages.values()].flatMap((road) => {
        const read = readStops(road.fields.stops);

        if ("problem" in read) {
            return [];
        }

        const placed = read.stops.flatMap((name, index) => {
            const page = pagesWithName(world, name)[0];
            const position = ownPositionNamed(world, name);
            return position === undefined || page === undefined ? [] : [{ name, index, position, page }];
        });
        const along = (index: number): number => read.lengths.slice(0, index).reduce((sum, length) => sum + length, 0);
        return placed.slice(1).flatMap((stop, index) => {
            const before = placed[index];

            // A passage between maps measures nothing in a straight line (POS-8, ROA-8).
            if (mapKey(world, before.page) !== mapKey(world, stop.page)) {
                return [];
            }

            const [length, straight] = [along(stop.index) - along(before.index), distanceBetween(before.position, stop.position)];
            const km = (metres: number): number => Math.round(metres / 100) / 10;
            return length >= straight * 0.99 ? [] : [{
                road: road.name,
                from: before.name,
                to: stop.name,
                problem: {
                    path: road.path,
                    message: `${road.name} is ${km(length)} km from ${before.name} to ${stop.name}, shorter than the ${km(straight)} km between them in a straight line: a length or a position is wrong.`,
                    fix: `write ${road.name}, set stops again with the right lengths, or write the position of ${before.name} or ${stop.name} again`,
                },
            }];
        });
    });
}

/** A relation as written (POS-2): a length in metric, a direction of the compass, "of" and a link; refused with how to write it. */
function relationOf(text: string): Relation
{
    const match = /^\s*(\d+(?:\.\d+)?\s*k?m)\s+(.+?)\s+of\s+(\[\[[^\]]+\]\])\s*$/i.exec(text);
    const metres = match === null ? undefined : readLength(match[1]);
    const degrees = match === null ? undefined : readDirection(match[2]);

    if (match === null || metres === undefined || degrees === undefined) {
        const why = match === null ? `write ${relationHelp}` : metres === undefined ? `write the distance ${lengthHelp}` : `the direction must be ${directionHelp}`;
        throw new Error(`"${text}" is not a position: ${why}. Nothing changed.`);
    }

    return { metres, degrees, place: parsePageReference(match[3]).name };
}

/**
 * The map whose coordinates the places a position is given from share (POS-8): refused when they do not, or when the place written is held where they are not;
 * the map to put it in when nothing holds it yet and they are on a map a place holds, which write names.
 */
function sharedMap(world: World, places: Page[], written: Page | undefined, name: string): Page | undefined
{
    const first = places[0];
    const other = places.find((place) => !sameFrame(world, place, first));

    if (other !== undefined) {
        throw new Error(`${first.name} and ${other.name} are on maps with other coordinates: give the position of ${name} from places of one map. Nothing changed.`);
    }

    const map = mapOf(world, first);
    const held = written !== undefined && (locate(world, written).chain.length > 0 || written.fields.map !== undefined);

    if (written !== undefined && held && !sameFrame(world, written, first)) {
        const where = mapOf(world, written).root?.name ?? "the main map";
        throw new Error(
            `${name} is on ${where === "the main map" ? where : `the map of ${where}`}, ${first.name} on ${
                map.root === undefined ? "the main map" : `that of ${map.root.name}`
            }: give its position from a place of its map, or of one with the same coordinates. Nothing changed.`,
        );
    }

    return held || written?.fields.map !== undefined ? undefined : map.root;
}

/** The place a relation starts from: a place of the campaign, not the place being written. */
function referenceOf(world: World, name: string, written: string): Page
{
    const page = pageNamed(world, name);

    if (page === undefined || page.type !== "place" || page.system !== undefined) {
        throw new Error(`${name} is ${page === undefined ? "no page" : "not a place of the campaign"}: a position is given from a place that has one. Nothing changed.`);
    }

    if (comparableText(page.name) === comparableText(written)) {
        throw new Error(`${written} cannot be placed from itself: give its position from another place. Nothing changed.`);
    }

    return page;
}

/**
 * The positions and regions of a world, once for each world: the places' own positions, then each stop without one on the line between the nearest stops of its
 * road that have one, by the lengths (POS-4), the first road that gives one; the regions among them (POS-6).
 */
function placedOf(world: World): Placed
{
    let placed = known.get(world);

    if (placed === undefined) {
        placed = readPlaced(world);
        known.set(world, placed);
    }

    return placed;
}

const known = new WeakMap<World, Placed>();

function readPlaced(world: World): Placed
{
    const positions = new Map<string, Position>();

    for (const page of world.pages.filter((candidate) => candidate.type === "place" && candidate.system === undefined)) {
        const own = readPosition(page.fields.position);

        if (own !== undefined) {
            positions.set(page.path, own);
        }
    }

    for (const road of roadsOf(world).pages.values()) {
        const read = readStops(road.fields.stops);
        const pages = "problem" in read ? [] : read.stops.map((name) => pagesWithName(world, name)[0]);
        const owned = pages.map((page) => (page === undefined ? undefined : readPosition(page.fields.position)));
        const along = (index: number): number => ("problem" in read ? 0 : read.lengths.slice(0, index).reduce((sum, length) => sum + length, 0));

        pages.forEach((page, index) => {
            const before = owned.slice(0, index).findLastIndex((position) => position !== undefined);
            const after = owned.findIndex((position, at) => at > index && position !== undefined);
            // Only between stops of the same map: a passage between maps places nothing (POS-8).
            const shared = page !== undefined && before !== -1 && after !== -1 && [pages[before], pages[after]].every((other) => other !== undefined && mapKey(world, page) === mapKey(world, other));

            if (page !== undefined && page.type === "place" && !positions.has(page.path) && shared) {
                const [from, to] = [owned[before] as Position, owned[after] as Position];
                positions.set(page.path, pointAlong(from, to, (along(index) - along(before)) / (along(after) - along(before))));
            }
        });
    }

    const regions = world.pages.flatMap((page) => {
        const radius = isEmptyField(page.fields.radius) ? undefined : readLength(page.fields.radius);
        const centre = radius === undefined ? undefined : positions.get(page.path);
        return centre === undefined || radius === undefined || page.type !== "place" || page.system !== undefined ? [] : [{ page, centre, radius }];
    });
    return { positions, regions };
}

/** The places of a map with a position of their own or from their roads, nearest to a point first; regions and roads left out. */
function placesByDistance(world: World, point: Position, map: string, except: Page[]): { page: Page; position: Position; distance: number; }[]
{
    const { positions } = placedOf(world);
    return world.pages.flatMap((page) => {
        const position = positions.get(page.path);
        const listed = position !== undefined && isEmptyField(page.fields.radius) && isEmptyField(page.fields.stops) && !except.includes(page) && mapKey(world, page) === map;
        return listed ? [{ page, position, distance: distanceBetween(point, position) }] : [];
    }).sort((first, second) => first.distance - second.distance);
}

function ownPositionNamed(world: World, name: string): Position | undefined
{
    const page = pagesWithName(world, name)[0];
    return page?.type === "place" && page.system === undefined ? readPosition(page.fields.position) : undefined;
}
