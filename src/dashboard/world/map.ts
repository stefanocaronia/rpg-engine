// The world map as the page works it out (D-318): what is drawn as a point or an area, the ways as drawn by hand, what the fog lifts, the hexes and the
// regions' edges, where the labels go, the ways of a place. Hexes are only the drawing, never a measure: they grow as the map goes farther. Pure, so the tests
// read it; what looks random is seeded by names and places, so the map is the same at every drawing.
import type { MapPlace, MapPoint, WorldMap } from "../data.ts";
import { numberText, t } from "../text.ts";

/** Where the map looks and how near: its centre in km, and pixels a km. */
export interface MapView
{
    x: number;
    y: number;
    s: number;
}

/** What the map draws: the places as points, the regions as areas, the places each one holds, and the point of the party's place. */
export interface MapLayout
{
    spots: Spot[];
    regions: Area[];
    inside: (name: string) => MapPlace[];
    partySpot?: Spot;
}

export type Spot = MapPlace & MapPoint;
export type Area = MapPlace & MapPoint & { radius: number; };

/** What the fog lifts, in km: around each place, over each region, along the known roads and the trail. */
export interface Lifted
{
    circles: { x: number; y: number; r: number; }[];
    lines: MapPoint[][];
}

/** A hex of the drawing: its centre in km, whether something known is near, the smallest region over it and its biome, and its tone, from 0 to 1. */
export interface Hex
{
    x: number;
    y: number;
    lit: boolean;
    region?: string;
    biome?: string;
    tone: number;
}

/**
 * A way as drawn by hand (D-318): its course wandering through every point of the road, in km, the place of each point in the course, and the tails that
 * fade into the fog beyond the known ends, in the direction the road goes on.
 */
export interface WayShape
{
    name: string;
    kind: string;
    course: MapPoint[];
    stops: number[];
    tails: { from: "before" | "after"; course: MapPoint[]; }[];
}

/** A rectangle on the screen, in pixels. */
export interface Box
{
    x: number;
    y: number;
    width: number;
    height: number;
}

/** A label to place by its mark: its text, the mark's centre and radius in pixels, its font size, and how much it weighs against the others. */
export interface LabelWish
{
    text: string;
    x: number;
    y: number;
    r: number;
    size: number;
    weight: number;
}

/** A label placed: where, anchored how; hidden when it found no room, to come back as the map comes nearer. */
export interface PlacedLabel
{
    text: string;
    x: number;
    y: number;
    anchor: "start" | "middle" | "end";
    hidden: boolean;
}

/** A way out of a place, as its card says it: the road, its kind, the next stop the character knows and how far; none past a stop it does not know. */
export interface Way
{
    road: string;
    kind: string;
    to?: string;
    km?: number;
    /** The map the next stop is on, when it is another, through a passage (ROA-8). */
    map?: string;
}

/**
 * What one map draws (POS-8, D-320): its places, its roads cut where they leave it, its party and the runs of the trail on it; the passages from it to other
 * maps; and, under a map aligned with another, that other one as a ghost.
 */
export interface MapPart
{
    name: string;
    places: WorldMap["places"];
    roads: WorldMap["roads"];
    party?: WorldMap["party"];
    trails: MapPoint[][];
    passages: { place: string; road: string; to: string; map: string; }[];
    ghost?: { name: string; places: WorldMap["places"]; roads: WorldMap["roads"]; };
}

/** How a kind of way wanders off the straight line: at most a share of the stretch, and so many km; and how long its bends are, in km. */
interface Wander
{
    share: number;
    most: number;
    bend: number;
}

// How each kind of way wanders.
const wander: Record<string, Wander> = {
    river: { share: 0.09, most: 1.6, bend: 7 },
    road: { share: 0.05, most: 0.9, bend: 7 },
    path: { share: 0.1, most: 1.3, bend: 2.6 },
    trail: { share: 0.06, most: 0.8, bend: 4 },
    other: { share: 0.03, most: 0.8, bend: 9 },
};
// How many marks a hex of each biome holds, and where, as shares of its radius from its centre.
const markCounts: Record<string, number> = { forest: 3, moor: 3, swamp: 2, hills: 2, mountains: 2, plains: 2, desert: 2, snow: 2, water: 2 };
const markPattern: [number, number][] = [[-0.36, -0.18], [0.34, -0.12], [0.0, 0.36]];
// How far past a lake's or a sea's hexes a road or a path goes round it, in km.
const shore = 0.8;
// How far at least a river and a way between the same two places keep off the line between them, each on its side, in km.
const bank = 0.3;
// How wide a hex is at the nearest, in km.
const hexKm = 6;
// How far a way's tail goes into the fog, in km: a hex and a half.
const tailKm = 9;
// How near a place, in km, the fog lifts around it, and along a road or the trail.
const placeReach = 5;
const lineReach = 3.4;
// The narrowest a hex is drawn, in pixels: past it, the hexes double.
const narrowestHex = 20;
// The nearest and the farthest the map goes, in pixels a km.
export const nearest = 60;
export const farthest = 0.05;

export function mapLayout(map: WorldMap): MapLayout
{
    const spots = map.places.filter((place): place is Spot => place.x !== undefined && place.y !== undefined && place.radius === undefined);
    const regions = map.places.filter((place): place is Area => place.x !== undefined && place.y !== undefined && place.radius !== undefined);
    const partySpot = spots.find((spot) => spot.name === map.party?.place);
    return { spots, regions, inside: (name) => map.places.filter((place) => place.within[0] === name), ...(partySpot === undefined ? {} : { partySpot }) };
}

/** What the fog lifts: around the places and over the regions, along the ways as drawn and their beginnings toward the unknown, and along the trail. */
export function liftedOf(map: WorldMap, layout: MapLayout, ways: WayShape[], trails: MapPoint[][]): Lifted
{
    const beginnings = map.roads.flatMap((road) => [
        ...(road.before === undefined || road.points[0] === undefined ? [] : [[road.points[0], road.before]]),
        ...(road.after === undefined || road.points.at(-1) === undefined ? [] : [[road.points.at(-1) as MapPoint, road.after]]),
    ]);
    return {
        circles: [...layout.spots.map((spot) => ({ x: spot.x, y: spot.y, r: placeReach })), ...layout.regions.map((region) => ({ x: region.x, y: region.y, r: region.radius }))],
        lines: [...ways.map((way) => way.course), ...beginnings, ...trails].filter((line) => line.length > 0),
    };
}

/** The ways as drawn by hand: each road's course wandering through its points, seeded by its name, and its tails into the fog beyond its known ends. */
export function wayShapes(map: WorldMap): WayShape[]
{
    const water = waterOf(map);
    const banks = sharedStretches(map.roads);
    return map.roads.map((road) => {
        // A river may run into a lake and out of it; a road or a path goes round it. Between two places a river and a way share, each keeps to its bank.
        const around = road.kind === "river" ? [] : water;
        const side = (from: MapPoint, to: MapPoint): number => banks.has(stretchKey(from, to)) ? (road.kind === "river" ? 1 : -1) * (pointKey(from) < pointKey(to) ? 1 : -1) : 0;
        const { course, stops } = meander(road.points, road.kind, road.name, around, side);

        const tail = (end: MapPoint | undefined, toward: MapPoint | undefined, from: "before" | "after"): WayShape["tails"] => {
            const length = end === undefined || toward === undefined ? 0 : Math.hypot(toward.x - end.x, toward.y - end.y);

            if (end === undefined || toward === undefined || length === 0) {
                return [];
            }

            const far = { x: end.x + (toward.x - end.x) / length * tailKm, y: end.y + (toward.y - end.y) / length * tailKm };
            return [{ from, course: meander([end, far], road.kind, `${road.name} ${from}`, around).course }];
        };

        return { name: road.name, kind: road.kind, course, stops, tails: [...tail(road.points[0], road.before, "before"), ...tail(road.points.at(-1), road.after, "after")] };
    });
}

/**
 * A line drawn by hand through its points, in km: each stretch wanders off the straight line and back, as a kind of way does, the same at every drawing for
 * the same seed; one that would cross a lake or a sea of `around` goes round it, and one that `sideOf` gives a side, 1 or -1, keeps to that side of its line.
 * Returns the course and the place of each point in it.
 */
export function meander(points: MapPoint[], kind: string, seed: string, around: Water[] = [], sideOf = (from: MapPoint, to: MapPoint): number => 0): {
    course: MapPoint[];
    stops: number[];
}
{
    const random = seeded(seed);
    const style = wander[kind] ?? wander.other;
    const course: MapPoint[] = [];
    const stops: number[] = [];

    for (const [index, point] of points.entries()) {
        const from = points[index - 1];

        if (from !== undefined) {
            course.push(...stretch(from, point, around, style, random, sideOf(from, point)));
        }

        course.push(point);
        stops.push(course.length - 1);
    }

    return { course, stops };
}

/** A lake or a sea of the map, in km: its circle, and how far from its centre a way keeps when it can, past the hexes it is drawn with at the nearest. */
export interface Water
{
    x: number;
    y: number;
    radius: number;
    reach: number;
}

/** The lakes and the seas of a map: its regions whose biome is water. */
export function waterOf(map: WorldMap): Water[]
{
    const hexRadius = hexKm / Math.sqrt(3);
    return map.places.flatMap((place) => {
        if (place.biome !== "water" || place.radius === undefined || place.x === undefined || place.y === undefined) {
            return [];
        }

        // The water as drawn: the hexes whose centre is in its circle, whose corners reach past it.
        const [x, y, radius] = [place.x, place.y, place.radius];
        const [firstColumn, lastColumn] = [Math.floor((x - radius) / (hexRadius * 1.5)), Math.ceil((x + radius) / (hexRadius * 1.5))];
        const [firstRow, lastRow] = [Math.floor((y - radius) / hexKm) - 1, Math.ceil((y + radius) / hexKm)];
        let reach = radius;

        for (let column = firstColumn; column <= lastColumn; column++) {
            for (let row = firstRow; row <= lastRow; row++) {
                const centre = hexCentre(column, row, hexKm);
                const distance = Math.hypot(centre.x - x, centre.y - y);

                if (distance <= radius) {
                    reach = Math.max(reach, distance + hexRadius);
                }
            }
        }

        return [{ x, y, radius, reach: reach + shore }];
    });
}

/** The trail as drawn: along a way between two of its points where it went by one, else wandering a little, as one walks in the open, round the water. */
export function trailCourse(trail: MapPoint[], ways: WayShape[], around: Water[] = []): MapPoint[]
{
    const same = (first: MapPoint, second: MapPoint): boolean => Math.abs(first.x - second.x) < 0.02 && Math.abs(first.y - second.y) < 0.02;
    return trail.flatMap((point, index) => {
        const before = trail[index - 1];

        if (before === undefined) {
            return [point];
        }

        for (const way of ways) {
            const [from, to] = [way.stops.find((stop) => same(way.course[stop], before)), way.stops.find((stop) => same(way.course[stop], point))];

            if (from !== undefined && to !== undefined) {
                return from < to ? way.course.slice(from + 1, to + 1) : way.course.slice(to, from).reverse();
            }
        }

        // A stretch walked there and back is one course, the same wandering from either end.
        const [first, second] = [before, point].sort((one, other) => one.x - other.x || one.y - other.y);
        const course = meander([first, second], "trail", `${first.x} ${first.y} ${second.x} ${second.y}`, around).course;
        return (first === before ? course : [...course].reverse()).slice(1);
    });
}

/** The view that shows all the character knows; a view around the origin when it knows nothing. */
export function fitView(lifted: Lifted, width: number, height: number): MapView
{
    const xs = [...lifted.circles.flatMap((circle) => [circle.x - circle.r, circle.x + circle.r]), ...lifted.lines.flat().map((point) => point.x)];
    const ys = [...lifted.circles.flatMap((circle) => [circle.y - circle.r, circle.y + circle.r]), ...lifted.lines.flat().map((point) => point.y)];

    if (xs.length === 0) {
        return { x: 0, y: 0, s: clampScale(width / 60) };
    }

    const [left, right, low, high] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const s = Math.min(width / Math.max(right - left, 10), height / Math.max(high - low, 10)) * 0.92;
    return { x: (left + right) / 2, y: (low + high) / 2, s: clampScale(s) };
}

/** The view zoomed by a factor around a point of the screen, which stays where it is. */
export function zoomedView(view: MapView, factor: number, at: { x: number; y: number; }, width: number, height: number): MapView
{
    const s = clampScale(view.s * factor);
    const x = view.x + (at.x - width / 2) / view.s - (at.x - width / 2) / s;
    const y = view.y - (at.y - height / 2) / view.s + (at.y - height / 2) / s;
    return { x, y, s };
}

export function clampScale(s: number): number
{
    return Math.min(nearest, Math.max(farthest, s));
}

/** How wide a hex is drawn, in km: 6, or twice as much as often as it takes to stay wider than narrowestHex pixels. */
export function hexAcross(s: number): number
{
    let across = hexKm;

    while (across * s < narrowestHex) {
        across *= 2;
    }

    return across;
}

/**
 * The hexes on the screen, flat on top: lit when something known is near their centre, coloured by the smallest region over it. A place lights the hex it
 * stands in at least, however wide the hexes are.
 */
export function hexesOf(view: MapView, width: number, height: number, lifted: Lifted, regions: Area[]): { across: number; hexes: Hex[]; }
{
    const across = hexAcross(view.s);
    const radius = across / Math.sqrt(3);
    const [halfWidth, halfHeight] = [width / 2 / view.s, height / 2 / view.s];
    const [firstColumn, lastColumn] = [Math.floor((view.x - halfWidth) / (radius * 1.5)) - 1, Math.ceil((view.x + halfWidth) / (radius * 1.5)) + 1];
    const [firstRow, lastRow] = [Math.floor((view.y - halfHeight) / across) - 1, Math.ceil((view.y + halfHeight) / across) + 1];
    const smallestFirst = [...regions].sort((first, second) => first.radius - second.radius);
    const hexes: Hex[] = [];

    for (let column = firstColumn; column <= lastColumn; column++) {
        for (let row = firstRow; row <= lastRow; row++) {
            const centre = hexCentre(column, row, across);
            const lit = lifted.circles.some((circle) => Math.hypot(centre.x - circle.x, centre.y - circle.y) <= Math.max(circle.r, radius))
                || nearSegment(segmentGrid(lifted), centre, Math.max(lineReach, radius * 0.9));
            const region = smallestFirst.find((candidate) => Math.hypot(centre.x - candidate.x, centre.y - candidate.y) <= candidate.radius);
            hexes.push({ ...centre, lit, ...(region === undefined ? {} : { region: region.name }), ...(region?.biome === undefined ? {} : { biome: region.biome }), tone: toneOf(column, row) });
        }
    }

    return { across, hexes };
}

/**
 * The edges between a region's lit hexes and those outside it, by region: the ink line around a region, as a hexcrawl map draws it. An edge at the screen's
 * border, with no hex beyond it, is not drawn.
 */
export function regionEdges(hexes: Hex[], across: number): Map<string, [MapPoint, MapPoint][]>
{
    const key = (point: MapPoint): string => `${Math.round(point.x * 10)},${Math.round(point.y * 10)}`;
    const byPlace = new Map(hexes.map((hex) => [key(hex), hex]));
    const edges = new Map<string, [MapPoint, MapPoint][]>();

    for (const hex of hexes) {
        const region = hex.region;

        if (!hex.lit || region === undefined) {
            continue;
        }

        const corners = hexCorners(hex, across);

        for (let side = 0; side < 6; side++) {
            const angle = Math.PI / 6 + Math.PI / 3 * side;
            const neighbour = byPlace.get(key({ x: hex.x + across * Math.cos(angle), y: hex.y + across * Math.sin(angle) }));

            if (neighbour !== undefined && (neighbour.region !== region || !neighbour.lit)) {
                edges.set(region, [...(edges.get(region) ?? []), [corners[side], corners[(side + 1) % 6]]]);
            }
        }
    }

    return edges;
}

/**
 * Where a region's name may go, as shares of its radius north of its centre, below its middle first, then above, across it: those over its own hexes, not
 * over a region inside it, as a lake; all of them when none is.
 */
export function nameShares(region: Area, hexes: Hex[]): number[]
{
    const shares = [-0.55, 0.55, 0, -0.8, 0.8];
    const own = shares.filter((share) => hexAt(hexes, { x: region.x, y: region.y + region.radius * share })?.region === region.name);
    return own.length > 0 ? own : shares;
}

/** The hex a point stands in, of those given: the one whose centre is nearest; none when there are none. */
export function hexAt(hexes: Hex[], point: MapPoint): Hex | undefined
{
    const distance = (hex: Hex): number => Math.hypot(hex.x - point.x, hex.y - point.y);
    return hexes.reduce<Hex | undefined>((best, hex) => (best === undefined || distance(hex) < distance(best) ? hex : best), undefined);
}

/** The centre of a hex of the grid, in km: flat on top, its odd columns half a hex lower. */
export function hexCentre(column: number, row: number, across: number): MapPoint
{
    return { x: column * across / Math.sqrt(3) * 1.5, y: row * across + (Math.abs(column % 2) === 1 ? across / 2 : 0) };
}

/** The corners of a hex flat on top, in km, from its centre and how wide it is. */
export function hexCorners(hex: MapPoint, across: number): MapPoint[]
{
    const radius = across / Math.sqrt(3);
    return Array.from({ length: 6 }, (_, corner) => ({ x: hex.x + radius * Math.cos(Math.PI / 3 * corner), y: hex.y + radius * Math.sin(Math.PI / 3 * corner) }));
}

/**
 * The labels where they fit, heaviest first: right of the mark, left, above, below; a label that finds no room on the screen, or that would cover another
 * label, a mark or a reserved box, is hidden. Widths are estimated from the text.
 */
export function placeLabels(wishes: LabelWish[], marks: Box[], reserved: Box[], width: number, height: number): PlacedLabel[]
{
    const taken = [...reserved, ...marks];
    const placed = new Map<LabelWish, PlacedLabel>();

    for (const wish of [...wishes].sort((first, second) => second.weight - first.weight)) {
        const textWidth = wish.text.length * wish.size * 0.56;
        const tries: [number, number, PlacedLabel["anchor"]][] = [
            [wish.x + wish.r + 4, wish.y + wish.size * 0.35, "start"],
            [wish.x - wish.r - 4, wish.y + wish.size * 0.35, "end"],
            [wish.x, wish.y - wish.r - 5, "middle"],
            [wish.x, wish.y + wish.r + wish.size, "middle"],
        ];
        const fit = tries.find(([x, y, anchor]) => {
            const box = labelBox(x, y, anchor, textWidth, wish.size);
            return box.x > 4 && box.y > 4 && box.x + box.width < width - 4 && box.y + box.height < height - 4 && !taken.some((other) => overlaps(box, other));
        });

        if (fit !== undefined) {
            taken.push(labelBox(fit[0], fit[1], fit[2], textWidth, wish.size));
        }

        placed.set(wish, { text: wish.text, x: fit?.[0] ?? wish.x, y: fit?.[1] ?? wish.y, anchor: fit?.[2] ?? "start", hidden: fit === undefined });
    }

    return wishes.map((wish) => placed.get(wish) as PlacedLabel);
}

/** An area's name to place: its text's box, its centre across, and the heights to try, in order. */
export interface AreaLabelWish
{
    x: number;
    ys: number[];
    width: number;
    height: number;
}

/** The areas' names where they fit, at the first height that leaves the marks free and stays on the screen; none where none does. */
export function placeAreaLabels(wishes: AreaLabelWish[], marks: Box[], reserved: Box[], width: number, height: number): ({ x: number; y: number; } | undefined)[]
{
    const taken = [...reserved, ...marks];
    return wishes.map((wish) => {
        const y = wish.ys.find((candidate) => {
            const box = { x: wish.x - wish.width / 2 - 3, y: candidate - 15, width: wish.width + 6, height: wish.height };
            return box.x > 4 && box.y > 4 && box.x + box.width < width - 4 && box.y + box.height < height - 4 && !taken.some((other) => overlaps(box, other));
        });

        if (y === undefined) {
            return undefined;
        }

        taken.push({ x: wish.x - wish.width / 2 - 3, y: y - 15, width: wish.width + 6, height: wish.height });
        return { x: wish.x, y };
    });
}

/**
 * Where a way's name goes on the screen: the longest run of its course between two of its stops, from left to right so that the name reads upright, when it is
 * at least `minimum` pixels long; none otherwise.
 */
export function nameRun(points: MapPoint[], stops: number[], minimum: number): MapPoint[] | undefined
{
    const runs = stops.slice(1).map((stop, index) => points.slice(stops[index], stop + 1));
    const longest = runs.sort((first, second) => lengthOf(second) - lengthOf(first))[0];

    if (longest === undefined || lengthOf(longest) < minimum) {
        return undefined;
    }

    return (longest[0]?.x ?? 0) <= (longest.at(-1)?.x ?? 0) ? longest : [...longest].reverse();
}

/** A line on the screen as an SVG path. */
export function pathOf(points: MapPoint[]): string
{
    return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join("");
}

/** A river on the screen as water: a shape around its course, `from` pixels wide at its source and `to` at its mouth. */
export function riverOutline(points: MapPoint[], from: number, to: number): string
{
    if (points.length < 2) {
        return "";
    }

    const sides = points.map((point, index) => {
        const [before, after] = [points[Math.max(0, index - 1)], points[Math.min(points.length - 1, index + 1)]];
        const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
        const half = (from + (to - from) * index / (points.length - 1)) / 2;
        const [nx, ny] = [-(after.y - before.y) / length * half, (after.x - before.x) / length * half];
        return { left: { x: point.x + nx, y: point.y + ny }, right: { x: point.x - nx, y: point.y - ny } };
    });
    return `${pathOf(sides.map((side) => side.left))}L${pathOf([...sides].reverse().map((side) => side.right)).slice(1)}Z`;
}

/** A tail into the fog in pieces, each fainter than the one before. */
export function fading(points: MapPoint[]): { points: MapPoint[]; opacity: number; }[]
{
    const shades = [0.7, 0.5, 0.32, 0.18, 0.08];
    const size = Math.max(1, Math.ceil((points.length - 1) / shades.length));
    return shades.flatMap((opacity, index) => {
        const piece = points.slice(index * size, (index + 1) * size + 1);
        return piece.length < 2 ? [] : [{ points: piece, opacity }];
    });
}

/** Where a hex's marks go, in pixels from its centre, and how large, by its biome: a few, turned by the hex's tone so that no two hexes look alike. */
export function marksOf(hex: Hex, hexPixels: number): { x: number; y: number; scale: number; }[]
{
    const radius = hexPixels / Math.sqrt(3);
    const count = hex.biome === undefined ? 0 : markCounts[hex.biome] ?? 2;
    const size = Math.min(1.6, Math.max(0.75, hexPixels / 56)) * (hex.biome === "mountains" ? 1.35 : 1);
    const turn = hex.tone * Math.PI * 2;
    return markPattern.slice(0, count).map(([x, y], index) => ({
        x: (x * Math.cos(turn) - y * Math.sin(turn)) * radius,
        y: (x * Math.sin(turn) + y * Math.cos(turn)) * radius + 2,
        scale: size * (0.85 + ((hex.tone * 7 + index * 0.37) % 1) * 0.3),
    }));
}

/** The ways out of a place by the roads through it (D-318): to the next stop the character knows each way, the km summed; past a stop it does not know, no distance. */
export function waysOf(map: WorldMap, name: string): Way[]
{
    return map.roads.flatMap((road) => {
        const at = road.points.findIndex((point) => point.name === name);

        if (at < 0) {
            return [];
        }

        return ([-1, 1] as const).flatMap((step): Way[] => {
            let km = 0;

            for (let index = at + step; index >= 0 && index < road.points.length; index += step) {
                km += road.points[step > 0 ? index : index + 1].km;
                const point = road.points[index];

                if (point.name !== undefined) {
                    const there = mapNameOf(map, point);
                    return [{ road: road.name, kind: road.kind, to: point.name, km: Math.round(km * 10) / 10, ...(there === mapNameOf(map, road.points[at]) ? {} : { map: there }) }];
                }
            }

            const beyond = step > 0 ? road.after : road.before;
            const passed = step > 0 ? at < road.points.length - 1 : at > 0;
            return beyond !== undefined || passed ? [{ road: road.name, kind: road.kind }] : [];
        });
    });
}

/** The map a point or a place is on, by name: the main map's for one that names none. */
export function mapNameOf(map: WorldMap, thing: { map?: string; }): string
{
    return thing.map ?? map.maps.find((known) => known.main)?.name ?? "";
}

/** One map of the world as drawn (POS-8): what is on it, its roads cut where they leave it, the trail's runs on it, its passages, the map it lies over as a ghost. */
export function mapPart(map: WorldMap, name: string): MapPart
{
    const on = (thing: { map?: string; }): boolean => mapNameOf(map, thing) === name;
    const known = map.maps.find((one) => one.name === name);
    const under = known?.under ?? known?.mirror;
    const passages = map.roads.flatMap((road) =>
        road.points.flatMap((point, index) => {
            const others = [road.points[index - 1], road.points[index + 1]].filter((other) => other !== undefined && !on(other) && other.name !== undefined);
            return on(point) && point.name !== undefined ? others.map((other) => ({ place: point.name as string, road: road.name, to: other.name as string, map: mapNameOf(map, other) })) : [];
        })
    );
    const part = (wanted: (thing: { map?: string; }) => boolean): Pick<MapPart, "places" | "roads"> => ({
        places: map.places.filter(wanted),
        roads: map.roads.flatMap((road) =>
            runsOf(road.points, wanted).map((points, index, runs) => ({
                ...road,
                points,
                ...(index === 0 && road.before !== undefined && wanted(road.points[0]) ? { before: road.before } : { before: undefined }),
                ...(index === runs.length - 1 && road.after !== undefined && wanted(road.points.at(-1) ?? {}) ? { after: road.after } : { after: undefined }),
            }))
        ).map((road) => withoutUndefined(road)),
    });
    return {
        name,
        ...part(on),
        ...(map.party !== undefined && on(map.party) ? { party: map.party } : {}),
        trails: runsOf(map.trail, on).filter((run) => run.length > 1),
        passages,
        ...(under === undefined ? {} : { ghost: { name: under, ...part((thing) => mapNameOf(map, thing) === under) } }),
    };
}

/** A length in km as the player measures it, as the chat writes it: km or m, or the game's miles or feet below a mile. */
export function lengthText(km: number, unit: WorldMap["unit"]): string
{
    const value = Math.round(km / unit.km * 10) / 10;

    if (unit.name === "km") {
        return km >= 0.9995 ? t("{count} km", { count: numberText(value) }) : t("{count} m", { count: numberText(Math.round(km * 1000)) });
    }

    return value >= 1 ? value === 1 ? t("1 mile") : t("{count} miles", { count: numberText(value) }) : t("{count} feet", { count: numberText(Math.round(km * 1000 / (unit.foot ?? 0.3048))) });
}

/** The scale bar: a round number of the player's units about as wide as `about` pixels, and its width in pixels. */
export function scaleBar(s: number, unit: WorldMap["unit"], about = 96): { value: number; width: number; }
{
    const perUnit = s * unit.km;
    const value = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((candidate) => candidate * perUnit >= about * 0.7) ?? 5000;
    return { value, width: value * perUnit };
}

/**
 * The points a stretch is drawn through between its ends, them left out: wandering off the straight line and back, on either side or on the one given, and
 * round the water it would cross.
 */
function stretch(from: MapPoint, to: MapPoint, around: Water[], style: Wander, random: () => number, side: number): MapPoint[]
{
    for (const water of around) {
        const arc = shoreArc(from, to, water, style, random);

        if (arc.length > 0) {
            const rest = around.filter((other) => other !== water);
            return [...stretch(from, arc[0], rest, style, random, side), ...arc, ...stretch(arc[arc.length - 1], to, rest, style, random, side)];
        }
    }

    const length = Math.hypot(to.x - from.x, to.y - from.y);

    if (length === 0) {
        return [];
    }

    const [dx, dy] = [to.x - from.x, to.y - from.y];
    const steps = stepsAlong(length);
    const offset = swing(length, style, random, side);
    return Array.from({ length: steps - 1 }, (_, index) => {
        const share = (index + 1) / steps;
        return { x: from.x + dx * share - dy / length * offset(share), y: from.y + dy * share + dx / length * offset(share) };
    });
}

/**
 * The way round a lake or a sea a stretch would cross, the short way: from where the line from its start touches the water's reach, along it, to where the
 * line to its end leaves it, wandering only outward; from a place on the shore it starts at the place and swings out. None when the stretch does not cross
 * it, or starts or ends on the water, as at a port.
 */
function shoreArc(from: MapPoint, to: MapPoint, water: Water, style: Wander, random: () => number): MapPoint[]
{
    const [fromDistance, toDistance] = [from, to].map((point) => Math.hypot(point.x - water.x, point.y - water.y));
    const [fromAngle, toAngle] = [from, to].map((point) => Math.atan2(point.y - water.y, point.x - water.x));
    // How near the water the way starts and ends its turn round it, and how far round from each end the line touches it there.
    const [fromRadius, toRadius] = [fromDistance, toDistance].map((distance) => Math.min(water.reach, Math.max(water.radius, distance - 0.05)));
    const [fromTouch, toTouch] = [Math.acos(fromRadius / fromDistance), Math.acos(toRadius / toDistance)];
    const total = Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle));

    if (Math.min(fromDistance, toDistance) <= water.radius || Math.abs(total) <= fromTouch + toTouch) {
        return [];
    }

    const sign = Math.sign(total);
    const sweep = total - sign * (fromTouch + toTouch);
    const length = Math.abs(sweep) * Math.max(fromRadius, toRadius);
    // From a place on the shore the way swings out to the reach, as little as a short way allows.
    const top = Math.min(water.reach, Math.max(fromRadius, toRadius) + length / 4);
    const steps = stepsAlong(length);
    const offset = swing(length, style, random, 1);
    return Array.from({ length: steps + 1 }, (_, index) => {
        const at = index / steps;
        const angle = fromAngle + sign * fromTouch + sweep * at;
        const radius = top - (top - fromRadius) * (1 - at) ** 4 - (top - toRadius) * at ** 4 + offset(at);
        return { x: water.x + radius * Math.cos(angle), y: water.y + radius * Math.sin(angle) };
    });
}

/**
 * How far off its line a stretch of a way wanders at each share of it, in km, to its left: either side, or only on the side given, 1 for the left and -1 for
 * the right, and then at least a bank off it.
 */
function swing(length: number, style: Wander, random: () => number, side = 0): (share: number) => number
{
    const amplitude = Math.min(style.most, length * style.share);
    const bends = Math.max(0.6, length / style.bend);
    const least = Math.min(bank, length * 0.08);
    const [first, second, weight] = [random() * Math.PI * 2, random() * Math.PI * 2, 0.25 + random() * 0.3];

    return (share) => {
        const wave = Math.sin(2 * Math.PI * bends * share + first) * (1 - weight) + Math.sin(2 * Math.PI * bends * 2.3 * share + second) * weight;
        return Math.sin(Math.PI * share) * (side === 0 ? amplitude * wave : side * (least + amplitude * (1 + wave) / 2));
    };
}

/** The stretches between two places that a river shares with a road or a path, by their stretchKey. */
function sharedStretches(roads: WorldMap["roads"]): Set<string>
{
    const keys = (rivers: boolean): string[] => roads.filter((road) => (road.kind === "river") === rivers).flatMap((road) => road.points.slice(1).map((point, index) => stretchKey(road.points[index], point)));
    const river = new Set(keys(true));
    return new Set(keys(false).filter((key) => river.has(key)));
}

/** A stretch between two points, the same both ways. */
function stretchKey(from: MapPoint, to: MapPoint): string
{
    return [pointKey(from), pointKey(to)].sort().join(" ");
}

function pointKey(point: MapPoint): string
{
    return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

/** In how many steps a line of this length is drawn: one each 250 m, from 2 to 160. */
function stepsAlong(length: number): number
{
    return Math.max(2, Math.min(160, Math.ceil(length / 0.25)));
}

/** Numbers that look random, the same for the same seed: mulberry32 over a hash of the seed. */
function seeded(seed: string): () => number
{
    let state = [...seed].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619), 2166136261) >>> 0;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

/** A hex's tone, from 0 to 1, by its column and row: the same at every drawing. */
function toneOf(column: number, row: number): number
{
    return seeded(`${column} ${row}`)();
}

/** The runs of points that stand where `wanted` says, in order: a line cut where it leaves a map. */
function runsOf<T>(points: T[], wanted: (point: T) => boolean): T[][]
{
    return points.reduce<T[][]>((runs, point, index) => {
        if (!wanted(point)) {
            return runs;
        }

        if (index > 0 && wanted(points[index - 1]) && runs.length > 0) {
            runs[runs.length - 1].push(point);
        } else {
            runs.push([point]);
        }

        return runs;
    }, []);
}

/** A road without the ends it does not have. */
function withoutUndefined<T extends { before?: MapPoint; after?: MapPoint; }>(road: T): T
{
    const { before, after, ...rest } = road;
    return { ...rest, ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }) } as T;
}

function labelBox(x: number, y: number, anchor: PlacedLabel["anchor"], width: number, size: number): Box
{
    const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
    return { x: left - 3, y: y - size - 1, width: width + 6, height: size + 4 };
}

function overlaps(first: Box, second: Box): boolean
{
    return first.x < second.x + second.width && second.x < first.x + first.width && first.y < second.y + second.height && second.y < first.y + first.height;
}

function lengthOf(points: MapPoint[]): number
{
    return points.reduce((sum, point, index) => (index === 0 ? 0 : sum + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y)), 0);
}

/** How far a point is from a segment, in km. */
// The segments of the known ways in square cells, built once for each lifting: a hex looks only at the cells near it, however many ways the world has.
const segmentCell = 10;
const segmentGrids = new WeakMap<Lifted, Map<string, [MapPoint, MapPoint][]>>();

function segmentGrid(lifted: Lifted): Map<string, [MapPoint, MapPoint][]>
{
    const known = segmentGrids.get(lifted);

    if (known !== undefined) {
        return known;
    }

    const grid = new Map<string, [MapPoint, MapPoint][]>();

    for (const line of lifted.lines) {
        for (let index = 1; index < line.length; index++) {
            const [from, to] = [line[index - 1], line[index]];

            for (let column = Math.floor(Math.min(from.x, to.x) / segmentCell); column <= Math.floor(Math.max(from.x, to.x) / segmentCell); column++) {
                for (let row = Math.floor(Math.min(from.y, to.y) / segmentCell); row <= Math.floor(Math.max(from.y, to.y) / segmentCell); row++) {
                    const key = `${column} ${row}`;
                    const cell = grid.get(key);

                    if (cell === undefined) {
                        grid.set(key, [[from, to]]);
                    } else {
                        cell.push([from, to]);
                    }
                }
            }
        }
    }

    segmentGrids.set(lifted, grid);
    return grid;
}

/** Whether a segment of the grid passes within `reach` of a point: the same answer as looking at every segment. */
function nearSegment(grid: Map<string, [MapPoint, MapPoint][]>, point: MapPoint, reach: number): boolean
{
    const [firstColumn, lastColumn] = [Math.floor((point.x - reach) / segmentCell), Math.floor((point.x + reach) / segmentCell)];
    const [firstRow, lastRow] = [Math.floor((point.y - reach) / segmentCell), Math.floor((point.y + reach) / segmentCell)];

    for (let column = firstColumn; column <= lastColumn; column++) {
        for (let row = firstRow; row <= lastRow; row++) {
            if ((grid.get(`${column} ${row}`) ?? []).some(([from, to]) => toSegment(point, from, to) <= reach)) {
                return true;
            }
        }
    }

    return false;
}

function toSegment(point: MapPoint, from: MapPoint, to: MapPoint): number
{
    const [dx, dy] = [to.x - from.x, to.y - from.y];
    const share = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(point.x - from.x - share * dx, point.y - from.y - share * dy);
}
