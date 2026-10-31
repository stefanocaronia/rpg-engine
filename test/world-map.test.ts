// The World map as the page works it out (D-318): what is a point and what an area, the ways of a place, the hexes, the labels, the scale; the page's
// symbols and biomes are the engine's (POS-7).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { MapPoint, WorldMap } from "../src/dashboard/data.ts";
import { biomes as pageBiomes, placeKinds as pageKinds } from "../src/dashboard/map-symbols.ts";
import {
    fading,
    hexAcross,
    hexAt,
    hexCentre,
    hexesOf,
    lengthText,
    liftedOf,
    mapLayout,
    mapPart,
    marksOf,
    meander,
    nameRun,
    nameShares,
    placeAreaLabels,
    placeLabels,
    regionEdges,
    riverOutline,
    scaleBar,
    trailCourse,
    wayShapes,
    waysOf,
} from "../src/dashboard/world/map.ts";
import { biomes, placeKinds } from "../src/map/index.ts";

// Guado at the centre in the Colli, a hills region; Rocca 20 km north; the road Guado –8– (a stop the character does not know) –12– Rocca, then on toward
// another; the Locanda inside Guado; the party at Guado.
const map: WorldMap = {
    unit: { name: "km", km: 1 },
    maps: [{ name: "Valle", main: true }],
    places: [
        { name: "Guado", kind: "village", x: 0, y: 0, within: ["Colli"], from: { km: 0 } },
        { name: "Colli", x: 1, y: 0, within: [], radius: 6, biome: "hills" },
        { name: "Rocca", kind: "castle", x: 0, y: 20, within: [], from: { km: 20, direction: "north" } },
        { name: "Locanda", kind: "inn", within: ["Guado", "Colli"] },
    ],
    roads: [{ name: "Strada", kind: "road", points: [{ name: "Guado", x: 0, y: 0, km: 0 }, { x: 0, y: 8, km: 8 }, { name: "Rocca", x: 0, y: 20, km: 12 }], after: { x: 0, y: 23 } }],
    party: { x: 0, y: 0, place: "Guado" },
    trail: [{ x: 0, y: 20 }, { x: 0, y: 0 }],
};

describe("the world map's drawing (D-318)", () => {
    it("draws as points the places with one, as areas the regions; a place inside another is in its card", () => {
        const layout = mapLayout(map);
        expect(layout.spots.map((spot) => spot.name)).toEqual(["Guado", "Rocca"]);
        expect(layout.regions.map((region) => region.name)).toEqual(["Colli"]);
        expect(layout.inside("Guado").map((place) => place.name)).toEqual(["Locanda"]);
        expect(layout.partySpot?.name).toBe("Guado");
    });

    it("gives a place's ways to the next stop the character knows, the km summed over the ones it does not; past them, no distance", () => {
        expect(waysOf(map, "Guado")).toEqual([{ road: "Strada", kind: "road", to: "Rocca", km: 20 }]);
        // From Rocca back to Guado, and on toward a stop it does not know.
        expect(waysOf(map, "Rocca")).toEqual([{ road: "Strada", kind: "road", to: "Guado", km: 20 }, { road: "Strada", kind: "road" }]);
    });

    it("draws hexes 6 km wide, doubled as the map goes farther; a place lights the hex it stands in, the region colours its own", () => {
        expect([hexAcross(10), hexAcross(3), hexAcross(2), hexAcross(0.5)]).toEqual([6, 12, 12, 48]);
        const layout = mapLayout(map);
        const ways = wayShapes(map);
        const lifted = liftedOf(map, layout, ways, [trailCourse(map.trail, ways)]);
        const near = hexesOf({ x: 0, y: 10, s: 10 }, 400, 400, lifted, layout.regions);
        const at = (x: number, y: number) => hexAt(near.hexes, { x, y });
        expect(at(0, 20)).toMatchObject({ lit: true });
        expect(at(1, 0)).toMatchObject({ lit: true, biome: "hills" });
        expect(at(18, 10)).toMatchObject({ lit: false });
        // Far away the hexes are 48 km wide: Rocca still lights the one it stands in.
        const far = hexesOf({ x: 0, y: 10, s: 0.5 }, 400, 400, lifted, layout.regions);
        expect(far.across).toBe(48);
        expect(far.hexes.filter((hex) => hex.lit).some((hex) => Math.hypot(hex.x, hex.y - 20) <= 48 / Math.sqrt(3))).toBe(true);
        // Galleries 28 km wide with a lake below their middle: their name goes over their own hexes, never on the lake; a plain the lake covers goes anywhere.
        const galleries = { name: "Gallerie", x: 0, y: 0, within: [], radius: 14, biome: "mountains" };
        const lake = { name: "Lago", x: 0, y: -8, within: [], radius: 6, biome: "water" };
        const plain = { name: "Piana", x: 0, y: -8, within: [], radius: 6.5, biome: "plains" };
        const nothing = { circles: [], lines: [] };
        expect(nameShares(galleries, hexesOf({ x: 0, y: 0, s: 10 }, 600, 600, nothing, [galleries, lake]).hexes)).toEqual([0.55, 0, 0.8]);
        expect(nameShares(plain, hexesOf({ x: 0, y: 0, s: 10 }, 600, 600, nothing, [plain, lake]).hexes)).toEqual([-0.55, 0.55, 0, -0.8, 0.8]);
    });

    it("puts a name right of its mark, else left, above or below, the heaviest first; one with no room is hidden", () => {
        const wishes = [
            { text: "Rocca", x: 100, y: 100, r: 10, size: 14, weight: 1 },
            { text: "Guado", x: 150, y: 100, r: 10, size: 14, weight: 9 },
        ];
        const marks = [{ x: 90, y: 90, width: 20, height: 20 }, { x: 140, y: 90, width: 20, height: 20 }];
        const [rocca, guado] = placeLabels(wishes, marks, [], 400, 300);
        expect(guado).toMatchObject({ anchor: "start", hidden: false });
        // Right of Rocca is Guado's mark: its name goes left.
        expect(rocca).toMatchObject({ anchor: "end", hidden: false });
        expect(placeLabels([{ text: "Lontano", x: 10, y: 10, r: 10, size: 14, weight: 1 }], [], [{ x: 0, y: 0, width: 400, height: 300 }], 400, 300)[0].hidden).toBe(true);
        expect(placeAreaLabels([{ x: 200, ys: [100, 200], width: 80, height: 20 }], [{ x: 150, y: 80, width: 100, height: 30 }], [], 400, 300)).toEqual([{ x: 200, y: 200 }]);
    });

    it("writes a way's name along its longest stretch, upright; a scale and lengths in the player's units", () => {
        // The longest run between two stops, turned to read from left to right; none shorter than asked.
        expect(nameRun([{ x: 300, y: 0 }, { x: 150, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 50 }], [0, 2, 3], 100)).toEqual([{ x: 0, y: 0 }, { x: 150, y: 5 }, { x: 300, y: 0 }]);
        expect(nameRun([{ x: 0, y: 0 }, { x: 50, y: 0 }], [0, 1], 100)).toBeUndefined();
        expect(lengthText(20, map.unit)).toBe("20 km");
        expect(lengthText(1.5, { name: "mi", km: 1.5 })).toBe("1 mile");
        expect(scaleBar(10, map.unit)).toEqual({ value: 10, width: 100 });
        expect(scaleBar(10, { name: "mi", km: 1.5 })).toEqual({ value: 5, width: 75 });
    });

    it("draws the ways by hand: through every point of the road, the same at every drawing, off the straight line between them; tails beyond the known ends", () => {
        const [road] = wayShapes(map);
        expect(road.stops.map((stop) => road.course[stop])).toEqual(map.roads[0].points.map((point) => ({ x: point.x, y: point.y, ...(point.name === undefined ? {} : { name: point.name }), km: point.km })));
        expect(wayShapes(map)[0].course).toEqual(road.course);
        expect(road.course.some((point) => Math.abs(point.x) > 0.05)).toBe(true);
        // Toward the stop beyond Rocca the road goes on into the fog, 9 km.
        expect(road.tails).toHaveLength(1);
        expect(road.tails[0].course.at(-1)?.y).toBeCloseTo(29);
        expect(meander([{ x: 0, y: 0 }, { x: 10, y: 0 }], "river", "Fiume").course).not.toEqual(meander([{ x: 0, y: 0 }, { x: 10, y: 0 }], "river", "Torrente").course);
        // The trail goes along the road where it went by it.
        expect(trailCourse(map.trail, [road]).length).toBeGreaterThan(map.trail.length);
        // A stretch walked there and back in the open is one course, the same wandering from either end.
        const there = trailCourse([{ x: 0, y: 0 }, { x: 9, y: 4 }], []);
        const back = trailCourse([{ x: 9, y: 4 }, { x: 0, y: 0 }], []);
        expect(back.toReversed()).toEqual(there);
        expect(there.length).toBeGreaterThan(2);
    });

    it("takes a road round a lake as the lake is drawn, never across its hexes, and a river through it; a river and a road between the same places meet only there", () => {
        // A lake 8 km wide halfway between two villages 24 km apart, a road straight across it, a river from one village to the other and a road along it.
        const ends = [{ name: "Ovest", x: 0, y: 0, km: 0 }, { name: "Est", x: 24, y: 0, km: 30 }];
        const lake = { name: "Lago", x: 12, y: 0, within: [], radius: 4, biome: "water" };
        const [road, river] = wayShapes({ ...map, places: [lake], roads: [{ name: "Strada", kind: "road", points: ends }, { name: "Fiume", kind: "river", points: ends }] });
        const lakeHexes = (point: MapPoint): boolean => Math.hypot(nearestHex(point).x - 12, nearestHex(point).y) <= 4;
        expect(road.course.some(lakeHexes)).toBe(false);
        expect(road.stops.map((stop) => road.course[stop].x)).toEqual([0, 24]);
        expect(river.course.some(lakeHexes)).toBe(true);
        // Between two places on its shore 3 km apart, the road swings out only a little.
        const [shore] = wayShapes({ ...map, places: [lake], roads: [{ name: "Riva", kind: "road", points: [{ x: 10.5, y: 4.3, km: 0 }, { x: 13.5, y: 4.3, km: 3 }] }] });
        expect(Math.max(...shore.course.map((point) => point.y))).toBeLessThan(5.5);
        expect(shore.course.some(lakeHexes)).toBe(false);
        // Apart, they would cross each other between the villages; together, the river keeps to one bank and the road to the other.
        const along = wayShapes({ ...map, places: [], roads: [{ name: "Strada", kind: "road", points: ends }, { name: "Fiume", kind: "river", points: ends }] });
        expect(crossings(meander(ends, "road", "Strada").course, meander(ends, "river", "Fiume").course)).toBeGreaterThan(0);
        expect(crossings(along[0].course, along[1].course)).toBe(0);
    });

    it("draws the ink round a region along its hexes' edges, a river widening to its mouth, tails fading, a few marks a hex", () => {
        const hex = (x: number, y: number, region?: string) => ({ x, y, lit: true, tone: 0.5, ...(region === undefined ? {} : { region, biome: "forest" }) });
        const across = 6;
        // A forest of one hex, ringed by six others: its six edges.
        const ring = Array.from({ length: 6 }, (_, side) => hex(across * Math.cos(Math.PI / 6 + Math.PI / 3 * side), across * Math.sin(Math.PI / 6 + Math.PI / 3 * side)));
        expect(regionEdges([hex(0, 0, "Bosco"), ...ring], across).get("Bosco")).toHaveLength(6);
        const outline = riverOutline([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }], 2, 6);
        expect(outline.endsWith("Z")).toBe(true);
        expect(outline).toContain("L20.0 3.0");
        expect(fading(Array.from({ length: 11 }, (_, index) => ({ x: index, y: 0 }))).map((piece) => piece.opacity)).toEqual([0.7, 0.5, 0.32, 0.18, 0.08]);
        expect(marksOf(hex(0, 0, "Bosco"), 60)).toHaveLength(3);
        expect(marksOf({ x: 0, y: 0, lit: true, tone: 0 }, 60)).toHaveLength(0);
    });

    it("has a symbol for every kind of place and a look for every biome the engine names (POS-7)", () => {
        expect(Object.keys(pageKinds)).toEqual([...placeKinds]);
        expect(Object.keys(pageBiomes)).toEqual([...biomes]);
    });
});

/** The hex a point stands in at the nearest, 6 km wide: the nearest centre of the grid. */
function nearestHex(point: MapPoint): MapPoint
{
    const column = Math.round(point.x / (6 / Math.sqrt(3) * 1.5));
    const centres = [column - 1, column, column + 1].flatMap((each) => [-1, 0, 1].map((row) => hexCentre(each, Math.round(point.y / 6) + row, 6)));
    return centres.reduce((best, centre) => (Math.hypot(centre.x - point.x, centre.y - point.y) < Math.hypot(best.x - point.x, best.y - point.y) ? centre : best));
}

/** How many times two lines cross, touching at an end not counted. */
function crossings(first: MapPoint[], second: MapPoint[]): number
{
    const side = (from: MapPoint, to: MapPoint, point: MapPoint): number => Math.sign((to.x - from.x) * (point.y - from.y) - (to.y - from.y) * (point.x - from.x));
    const cross = (a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint): boolean => side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
    return first.slice(1).reduce((count, to, index) => count + second.slice(1).filter((other, at) => cross(first[index], to, second[at], other)).length, 0);
}

describe("the maps on the page (D-320)", () => {
    // Guado on the main map; the Sottosuolo under it, its city reached by a well from Guado.
    const worlds: WorldMap = {
        unit: { name: "km", km: 1 },
        maps: [{ name: "Valle", main: true }, { name: "Sottosuolo", under: "Valle" }],
        places: [
            { name: "Guado", x: 0, y: 0, within: [] },
            { name: "Città", x: 0, y: -3, map: "Sottosuolo", within: ["Sottosuolo"] },
        ],
        roads: [{ name: "Pozzo", kind: "portal", points: [{ name: "Guado", x: 0, y: 0, km: 0 }, { name: "Città", x: 0, y: -3, map: "Sottosuolo", km: 0.5 }] }],
        party: { x: 0, y: 0, place: "Guado" },
        trail: [{ x: 0, y: 5 }, { x: 0, y: 0 }, { x: 0, y: -3, map: "Sottosuolo" }],
    };

    it("draws one map at a time: its places, its roads cut where they leave it, its trail; the passages from it; the map it lies under as a ghost", () => {
        const under = mapPart(worlds, "Sottosuolo");
        expect(under.places.map((place) => place.name)).toEqual(["Città"]);
        expect(under.party).toBeUndefined();
        expect(under.passages).toEqual([{ place: "Città", road: "Pozzo", to: "Guado", map: "Valle" }]);
        expect(under.ghost?.places.map((place) => place.name)).toEqual(["Guado"]);
        const main = mapPart(worlds, "Valle");
        expect(main.trails).toEqual([[{ x: 0, y: 5 }, { x: 0, y: 0 }]]);
        expect(main.roads[0].points).toHaveLength(1);
        expect(main.ghost).toBeUndefined();
        expect(waysOf(worlds, "Guado")).toEqual([{ road: "Pozzo", kind: "portal", to: "Città", km: 0.5, map: "Sottosuolo" }]);
    });

    it("lights the same hexes near the known ways however many segments they have, found by their cells rather than one by one", () => {
        const point = fc.record({ x: fc.double({ min: -200, max: 200, noNaN: true }), y: fc.double({ min: -200, max: 200, noNaN: true }) });

        const toSegment = (at: { x: number; y: number; }, from: { x: number; y: number; }, to: { x: number; y: number; }): number => {
            const [dx, dy] = [to.x - from.x, to.y - from.y];
            const share = Math.max(0, Math.min(1, ((at.x - from.x) * dx + (at.y - from.y) * dy) / (dx * dx + dy * dy || 1)));
            return Math.hypot(at.x - from.x - share * dx, at.y - from.y - share * dy);
        };

        fc.assert(
            fc.property(fc.array(fc.array(point, { minLength: 2, maxLength: 8 }), { maxLength: 6 }), fc.double({ min: 0.5, max: 20, noNaN: true }), (lines, scale) => {
                const lifted = { circles: [], lines: lines.map((line) => line.map((one) => ({ ...one, km: 0 }))) };
                const { across, hexes } = hexesOf({ x: 0, y: 0, s: scale }, 800, 600, lifted, []);
                const reach = Math.max(3.4, (across / Math.sqrt(3)) * 0.9);
                return hexes.every((hex) => hex.lit === lines.some((line) => line.some((one, index) => index > 0 && toSegment(hex, line[index - 1], one) <= reach)));
            }),
            { numRuns: 60 },
        );
    });
});
