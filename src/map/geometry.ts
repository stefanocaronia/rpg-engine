// Where things are on the world map (D-259): points in metres east and north of the map's centre, the 16 directions of the compass, distances, crossings.

/** A point of the map, in metres east and north of its centre; west and south are negative. */
export interface Point
{
    east: number;
    north: number;
}

/** The 16 points of the compass, clockwise from north, as abbreviations and as names. */
const abbreviations = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const names = [
    "north",
    "north-north-east",
    "north-east",
    "east-north-east",
    "east",
    "east-south-east",
    "south-east",
    "south-south-east",
    "south",
    "south-south-west",
    "south-west",
    "west-south-west",
    "west",
    "west-north-west",
    "north-west",
    "north-north-west",
];

/** How to write a direction, for messages. */
export const directionHelp = "one of the 16 points of the compass, as N, NNE, NE… or north, north-north-east, north-east…";

/** A direction in degrees clockwise from north, from one of the 16 points of the compass, as NE or north-east (also northeast, north east); undefined for anything else. */
export function readDirection(text: string): number | undefined
{
    const plain = (name: string): string => name.toLowerCase().replace(/[\s_-]+/g, "");
    const written = plain(text);
    const index = abbreviations.findIndex((abbreviation, position) => plain(abbreviation) === written || plain(names[position]) === written);
    return index === -1 ? undefined : index * 22.5;
}

/** The name of the point of the compass nearest to a direction: north-east for 40°. */
export function directionName(degrees: number): string
{
    return names[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

/** The point at a distance from another in a direction (dead reckoning, D-259). */
export function pointFrom(origin: Point, degrees: number, metres: number): Point
{
    const radians = (degrees * Math.PI) / 180;
    return { east: origin.east + metres * Math.sin(radians), north: origin.north + metres * Math.cos(radians) };
}

export function distanceBetween(first: Point, second: Point): number
{
    return Math.hypot(second.east - first.east, second.north - first.north);
}

/** The direction from one point to another, in degrees clockwise from north. */
export function directionTo(from: Point, to: Point): number
{
    return ((Math.atan2(to.east - from.east, to.north - from.north) * 180) / Math.PI + 360) % 360;
}

/** The point that best fits several (D-259): their mean, which is nearest to all of them together. */
export function meanPoint(points: Point[]): Point
{
    return { east: points.reduce((sum, point) => sum + point.east, 0) / points.length, north: points.reduce((sum, point) => sum + point.north, 0) / points.length };
}

/** The point a fraction of the way from one point to another. */
export function pointAlong(from: Point, to: Point, fraction: number): Point
{
    return { east: from.east + (to.east - from.east) * fraction, north: from.north + (to.north - from.north) * fraction };
}

/** Where a segment crosses another, as the fraction of the way along the first; undefined when they do not cross, or run side by side. */
export function crossingAlong(from: Point, to: Point, otherFrom: Point, otherTo: Point): number | undefined
{
    const [ax, ay, bx, by] = [to.east - from.east, to.north - from.north, otherTo.east - otherFrom.east, otherTo.north - otherFrom.north];
    const denominator = ax * by - ay * bx;

    if (Math.abs(denominator) < 1e-9) {
        return undefined;
    }

    const [cx, cy] = [otherFrom.east - from.east, otherFrom.north - from.north];
    const along = (cx * by - cy * bx) / denominator;
    const across = (cx * ay - cy * ax) / denominator;
    return along >= 0 && along <= 1 && across >= 0 && across <= 1 ? along : undefined;
}
