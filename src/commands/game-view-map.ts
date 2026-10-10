// The world map as the player character knows it, for the dashboard (VIEW-7, D-316, D-318): the places it knows with their kind and where they are, the regions
// with their biome, the roads as far as it knows their stops, the party and its trail. Never a place it does not know, neither its name nor its point.
import { readLog } from "../core/log.ts";
import { comparableText } from "../core/text.ts";
import { distanceBetween, type Point } from "../map/index.ts";
import { environmentAt, locate, type Page, pagesWithName, parsePageReference, readStops, type World } from "../pages/index.ts";
import { shownImage } from "./game-images.ts";
import { moversNamed, moversPosition, readJourney } from "./game-journey.ts";
import { knowsPage } from "./game-knowledge.ts";
import { placedPosition, positionOf, regionsOf, relationText } from "./game-positions.ts";
import { kindOf, type Measures, type Roads, roadsOf, travellingParty } from "./game-roads.ts";
import type { PlaceSight } from "./game-view-place.ts";
import { campaignSystem } from "./game-world.ts";

/** A point of the map, in km east and north of its centre. */
export interface MapPoint
{
    x: number;
    y: number;
}

/**
 * A place the character knows: its kind, its point when it is drawn on the map (a position of its own or from its road), the places it knows that hold it,
 * the nearest first; for a region its radius in km, biome and terrain; where it is from the party, in the player's units.
 */
export interface MapPlace
{
    name: string;
    kind?: string;
    x?: number;
    y?: number;
    within: string[];
    radius?: number;
    biome?: string;
    terrain?: string;
    from?: string;
    image?: { file: string; version: number; };
}

/**
 * A road the character knows, from its first known stop to its last: each point with its name when the character knows the stop, and the km from the point
 * before; beyond, toward a stop it does not know, a short stretch in its direction.
 */
export interface MapRoad
{
    name: string;
    kind: string;
    points: (MapPoint & { name?: string; km: number; })[];
    before?: MapPoint;
    after?: MapPoint;
}

/** The world map as the player character knows it (VIEW-7): the unit of the player and its km, the places nearest the party first, the roads, the party and its trail. */
export interface ShownMap
{
    unit: { name: "km" | "mi"; km: number; };
    places: MapPlace[];
    roads: MapRoad[];
    party?: MapPoint & { place?: string; };
    trail: MapPoint[];
}

// How far a road toward a stop the character does not know is drawn, at most: a beginning, never where the stop is.
const stubMetres = 3000;

// How many places the chat lists.
const mostListed = 20;

export function shownMap(sight: PlaceSight, measures: Measures): ShownMap
{
    const { world, knowledge } = sight;
    const roads = roadsOf(world);
    const known = (page: Page): boolean => page.system === undefined && knowsPage(knowledge, page);
    const journey = readJourney(sight.root);
    const movers = journey === undefined ? travellingParty(world, knowledge.pc, []) : moversNamed(world, journey);
    const partyAt = moversPosition(world, roads, journey, movers) ?? positionOf(world, knowledge.pc);
    const partyPlace = locate(world, knowledge.pc).chain.find((holder) => isDrawn(world, roads, holder) && known(holder));
    const places = world.pages.filter((page) => page.type === "place" && known(page) && !roads.pages.has(page.name)).flatMap((page) => {
        const shown = mapPlace(sight, roads, page, known, partyAt, measures);
        return shown === undefined ? [] : [shown];
    });
    const system = campaignSystem(sight.root, sight.context);
    return {
        unit: measures.units === "imperial" ? { name: "mi", km: measures.imperial.mile / 1000 } : { name: "km", km: 1 },
        places: nearestFirst(places, partyAt),
        roads: [...roads.pages.values()].filter(known).flatMap((road) => {
            const course = roadCourse(world, road, known);
            return course === undefined ? [] : [{ name: road.name, kind: kindOf(system, road).name, ...course }];
        }),
        ...(partyAt === undefined ? {} : { party: { ...mapPoint(partyAt), ...(partyPlace === undefined ? {} : { place: partyPlace.name }) } }),
        trail: trailOf(sight, roads).map(mapPoint),
    };
}

/** The map in the chat (VIEW-7): the places drawn on it, nearest the party first, with their kind and where they are; then the regions with their biome. */
export function mapText(map: ShownMap): string
{
    const points = map.places.filter((place) => place.x !== undefined && place.radius === undefined);
    const shown = points.slice(0, mostListed);
    const regions = map.places.filter((place) => place.radius !== undefined);
    const where = map.party === undefined ? "" : `, nearest first, from where the party is${map.party.place === undefined ? "" : ` (${map.party.place})`}`;
    const line = (place: MapPlace): string => `- ${place.name}${place.kind === undefined ? "" : ` (${place.kind})`}${place.from === undefined ? "" : `: ${place.from}`}`;
    return [
        points.length === 0 ? "The character knows no place on the map yet." : `Places on the map${where}:\n${shown.map(line).join("\n")}`,
        points.length > shown.length ? `…and ${points.length - shown.length} more, on the dashboard's map.` : "",
        regions.length === 0 ? "" : `Regions: ${regions.map((region) => `${region.name}${region.biome === undefined ? "" : ` (${region.biome})`}`).join(", ")}.`,
    ].filter((block) => block !== "").join("\n");
}

/** A place as the map shows it; none for one neither drawn nor held by a place that is. */
function mapPlace(sight: PlaceSight, roads: Roads, page: Page, known: (page: Page) => boolean, partyAt: Point | undefined, measures: Measures): MapPlace | undefined
{
    const { world } = sight;
    const at = placedPosition(world, page);
    const holders = locate(world, page).chain.filter((holder) => holder.type === "place" && known(holder));

    if (at === undefined && !holders.some((holder) => isDrawn(world, roads, holder))) {
        return undefined;
    }

    const region = regionsOf(world).find((candidate) => candidate.page === page);
    const kind = typeof page.fields.kind === "string" && page.fields.kind.trim() !== "" ? page.fields.kind.trim() : undefined;
    const voice = (name: string): string | undefined => environmentAt(world, page).find(({ entry }) => comparableText(entry.name) === name)?.entry.value;
    const image = shownImage(sight.root, sight.context, world, page, (base) => knowsPage(sight.knowledge, base));
    return {
        name: page.name,
        ...(kind === undefined ? {} : { kind }),
        ...(at === undefined ? {} : mapPoint(at)),
        within: holders.map((holder) => holder.name),
        ...(region === undefined ? {} : { radius: km(region.radius) }),
        ...(region === undefined || voice("biome") === undefined ? {} : { biome: voice("biome") }),
        ...(region === undefined || voice("terrain") === undefined ? {} : { terrain: voice("terrain") }),
        ...(at === undefined || partyAt === undefined ? {} : { from: relationText(partyAt, at, measures) }),
        ...(image === undefined ? {} : { image }),
    };
}

/** Whether a page is drawn on the map as a point or an area: a place of the campaign, not a road, with a position of its own or from its road. */
function isDrawn(world: World, roads: Roads, page: Page): boolean
{
    return page.type === "place" && !roads.pages.has(page.name) && placedPosition(world, page) !== undefined;
}

/** The places drawn on the map, nearest the party first, then those held by them; as they come without a party on the map. */
function nearestFirst(places: MapPlace[], partyAt: Point | undefined): MapPlace[]
{
    const distance = (place: MapPlace): number => place.x === undefined || place.y === undefined ? Number.MAX_SAFE_INTEGER : partyAt === undefined ? 0 : distanceBetween(partyAt, { east: place.x * 1000, north: place.y * 1000 });
    return [...places].sort((first, second) => distance(first) - distance(second));
}

/** A known road's course from its first known stop with a point to its last, an unknown stop as a point alone, and the beginnings toward unknown ones beyond. */
function roadCourse(world: World, road: Page, known: (page: Page) => boolean): Omit<MapRoad, "name" | "kind"> | undefined
{
    const read = readStops(road.fields.stops);

    if ("problem" in read) {
        return undefined;
    }

    const stops = read.stops.map((name, index) => {
        const page = pagesWithName(world, name)[0];
        return { page, at: page === undefined ? undefined : placedPosition(world, page), metres: index === 0 ? 0 : read.lengths[index - 1] ?? 0 };
    });
    const isKnownPoint = (stop: (typeof stops)[number]): boolean => stop.page !== undefined && stop.at !== undefined && known(stop.page);
    const first = stops.findIndex(isKnownPoint);
    const last = stops.findLastIndex(isKnownPoint);

    if (first < 0) {
        return undefined;
    }

    const points: MapRoad["points"] = [];
    let metres = 0;

    for (const [index, stop] of stops.entries()) {
        if (index > first && index <= last) {
            metres += stop.metres;
        }

        if (index >= first && index <= last && stop.at !== undefined) {
            points.push({ ...(stop.page !== undefined && known(stop.page) ? { name: stop.page.name } : {}), ...mapPoint(stop.at), km: km(metres) });
            metres = 0;
        }
    }

    // From an end of the course toward the next stop beyond it with a point, a beginning only.
    const beyond = (from: Point | undefined, others: typeof stops): MapPoint | undefined => {
        const next = others.find((stop) => stop.at !== undefined)?.at;
        return from === undefined || next === undefined ? undefined : stub(from, next);
    };

    const before = beyond(stops[first].at, stops.slice(0, first).reverse());
    const after = beyond(stops[last].at, stops.slice(last + 1));
    return { points, ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }) };
}

/** The beginning of a road from a point toward another: at most stubMetres, at most half the way. */
function stub(from: Point, toward: Point): MapPoint | undefined
{
    const distance = distanceBetween(from, toward);

    if (distance === 0) {
        return undefined;
    }

    const share = Math.min(stubMetres, distance / 2) / distance;
    return mapPoint({ east: from.east + (toward.east - from.east) * share, north: from.north + (toward.north - from.north) * share });
}

/**
 * Where the party has been (VIEW-7): the places the player character moved from and to, as the public lines of the log keep them, in order; along a road
 * between the places it joined it at and left it at, by its stops; else in a straight line. A region is an area, not a point of the trail.
 */
function trailOf(sight: PlaceSight, roads: Roads): Point[]
{
    const { world, knowledge } = sight;
    const pc = comparableText(knowledge.pc.name);
    const regions = new Set(regionsOf(world).map((region) => region.page));
    const names = readLog(sight.root).filter((entry) => entry.type === "moved" && entry.visibility === "public").flatMap((entry) => {
        const pages = Array.isArray(entry.data.pages) ? entry.data.pages.map(String) : [];

        if (!pages.some((name) => comparableText(name) === pc)) {
            return [];
        }

        const from = Object.entries((entry.data.from ?? {}) as Record<string, unknown>).find(([name]) => comparableText(name) === pc)?.[1];
        return [typeof from === "string" ? from : undefined, typeof entry.data.to === "string" ? entry.data.to : undefined];
    });
    const points: Point[] = [];
    let road: Page | undefined;
    let last: Page | undefined;

    for (const name of names) {
        const page = name === undefined ? undefined : pagesWithName(world, parsePageReference(name).name)[0];

        if (page === undefined || regions.has(page)) {
            continue;
        }

        if (roads.pages.has(page.name)) {
            road = page;
            continue;
        }

        const at = positionOf(world, page);

        if (at === undefined) {
            continue;
        }

        if (road !== undefined && last !== undefined) {
            points.push(...stopsBetween(world, road, last, page));
        }

        points.push(at);
        [road, last] = [undefined, page];
    }

    return points.filter((point, index) => index === 0 || distanceBetween(point, points[index - 1]) > 0);
}

/** The points of a road's stops strictly between the stops two places are at, or are held by, in the order of the way; none when either is not on it. */
function stopsBetween(world: World, road: Page, from: Page, to: Page): Point[]
{
    const read = readStops(road.fields.stops);

    if ("problem" in read) {
        return [];
    }

    const indexOf = (page: Page): number => {
        const names = [page, ...locate(world, page).chain].map((holder) => comparableText(holder.name));
        return read.stops.findIndex((stop) => names.includes(comparableText(stop)));
    };

    const [start, end] = [indexOf(from), indexOf(to)];

    if (start < 0 || end < 0) {
        return [];
    }

    const between = start < end ? read.stops.slice(start + 1, end) : read.stops.slice(end + 1, start).reverse();
    return between.flatMap((name) => {
        const page = pagesWithName(world, name)[0];
        const at = page === undefined ? undefined : placedPosition(world, page);
        return at === undefined ? [] : [at];
    });
}

function mapPoint(point: Point): MapPoint
{
    return { x: km(point.east), y: km(point.north) };
}

/** Metres as km with two decimals. */
function km(metres: number): number
{
    return Math.round(metres / 10) / 100;
}
