// The world map as the page works it out (D-318): what is drawn as a point or an area, what the fog lifts, the hexes, where the labels go, the ways of a
// place. Hexes are only the drawing, never a measure: they grow as the map goes farther. Pure, so the tests read it.
import type { MapPlace, MapPoint, MapRoad, WorldMap } from "./data.ts";

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

/** A hex of the drawing: its centre in km, whether something known is near, the biome of the smallest region over it. */
export interface Hex
{
    x: number;
    y: number;
    lit: boolean;
    biome?: string;
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
}

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

export function liftedOf(map: WorldMap, layout: MapLayout): Lifted
{
    return {
        circles: [...layout.spots.map((spot) => ({ x: spot.x, y: spot.y, r: placeReach })), ...layout.regions.map((region) => ({ x: region.x, y: region.y, r: region.radius }))],
        lines: [...map.roads.map(roadLine), map.trail].filter((line) => line.length > 0),
    };
}

/** A road as drawn: its beginning toward a stop the character does not know, its points, its end toward another. */
export function roadLine(road: MapRoad): MapPoint[]
{
    return [...(road.before === undefined ? [] : [road.before]), ...road.points, ...(road.after === undefined ? [] : [road.after])];
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
    let across = 6;

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
            const centre = { x: column * radius * 1.5, y: row * across + (Math.abs(column % 2) === 1 ? across / 2 : 0) };
            const lit = lifted.circles.some((circle) => Math.hypot(centre.x - circle.x, centre.y - circle.y) <= Math.max(circle.r, radius))
                || lifted.lines.some((line) => line.some((point, index) => index > 0 && toSegment(centre, line[index - 1], point) <= Math.max(lineReach, radius * 0.9)));
            const biome = smallestFirst.find((region) => Math.hypot(centre.x - region.x, centre.y - region.y) <= region.radius)?.biome;
            hexes.push({ ...centre, lit, ...(biome === undefined ? {} : { biome }) });
        }
    }

    return { across, hexes };
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

/** The longest stretch of a line on the screen, from left to right, so that a name written along it reads upright; none for a line of one point. */
export function longestStretch(points: MapPoint[]): [MapPoint, MapPoint] | undefined
{
    const stretches = points.slice(1).map((point, index): [MapPoint, MapPoint] => (points[index].x <= point.x ? [points[index], point] : [point, points[index]]));
    return stretches.sort((first, second) => Math.hypot(second[1].x - second[0].x, second[1].y - second[0].y) - Math.hypot(first[1].x - first[0].x, first[1].y - first[0].y))[0];
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
                    return [{ road: road.name, kind: road.kind, to: point.name, km: Math.round(km * 10) / 10 }];
                }
            }

            const beyond = step > 0 ? road.after : road.before;
            const passed = step > 0 ? at < road.points.length - 1 : at > 0;
            return beyond !== undefined || passed ? [{ road: road.name, kind: road.kind }] : [];
        });
    });
}

/** A length in km as the player measures it: km, or the game's miles. */
export function lengthText(km: number, unit: WorldMap["unit"]): string
{
    const value = Math.round(km / unit.km * 10) / 10;
    return unit.name === "km" ? `${value} km` : `${value} ${value === 1 ? "mile" : "miles"}`;
}

/** The scale bar: a round number of the player's units about as wide as `about` pixels, and its width in pixels. */
export function scaleBar(s: number, unit: WorldMap["unit"], about = 96): { value: number; width: number; }
{
    const perUnit = s * unit.km;
    const value = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((candidate) => candidate * perUnit >= about * 0.7) ?? 5000;
    return { value, width: value * perUnit };
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

/** How far a point is from a segment, in km. */
function toSegment(point: MapPoint, from: MapPoint, to: MapPoint): number
{
    const [dx, dy] = [to.x - from.x, to.y - from.y];
    const share = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(point.x - from.x - share * dx, point.y - from.y - share * dy);
}
