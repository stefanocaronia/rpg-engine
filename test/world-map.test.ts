// The World map as the page works it out (D-318): what is a point and what an area, the ways of a place, the hexes, the labels, the scale; the page's
// symbols and biomes are the engine's (POS-7).
import { describe, expect, it } from "vitest";
import type { WorldMap } from "../src/dashboard/data.ts";
import { biomes as pageBiomes, placeKinds as pageKinds } from "../src/dashboard/map-symbols.ts";
import { hexAcross, hexesOf, lengthText, liftedOf, longestStretch, mapLayout, placeAreaLabels, placeLabels, scaleBar, waysOf } from "../src/dashboard/world-map.ts";
import { biomes, placeKinds } from "../src/map/index.ts";

// Guado at the centre in the Colli, a hills region; Rocca 20 km north; the road Guado –8– (a stop the character does not know) –12– Rocca, then on toward
// another; the Locanda inside Guado; the party at Guado.
const map: WorldMap = {
    unit: { name: "km", km: 1 },
    places: [
        { name: "Guado", kind: "village", x: 0, y: 0, within: ["Colli"], from: "here" },
        { name: "Colli", x: 1, y: 0, within: [], radius: 6, biome: "hills" },
        { name: "Rocca", kind: "castle", x: 0, y: 20, within: [], from: "20 km north" },
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
        const lifted = liftedOf(map, layout);
        const near = hexesOf({ x: 0, y: 10, s: 10 }, 400, 400, lifted, layout.regions);
        const at = (x: number, y: number) => near.hexes.reduce((best, hex) => (Math.hypot(hex.x - x, hex.y - y) < Math.hypot(best.x - x, best.y - y) ? hex : best));
        expect(at(0, 20)).toMatchObject({ lit: true });
        expect(at(1, 0)).toMatchObject({ lit: true, biome: "hills" });
        expect(at(18, 10)).toMatchObject({ lit: false });
        // Far away the hexes are 48 km wide: Rocca still lights the one it stands in.
        const far = hexesOf({ x: 0, y: 10, s: 0.5 }, 400, 400, lifted, layout.regions);
        expect(far.across).toBe(48);
        expect(far.hexes.filter((hex) => hex.lit).some((hex) => Math.hypot(hex.x, hex.y - 20) <= 48 / Math.sqrt(3))).toBe(true);
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
        expect(longestStretch([{ x: 300, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 50 }])).toEqual([{ x: 0, y: 0 }, { x: 300, y: 0 }]);
        expect(lengthText(20, map.unit)).toBe("20 km");
        expect(lengthText(1.5, { name: "mi", km: 1.5 })).toBe("1 mile");
        expect(scaleBar(10, map.unit)).toEqual({ value: 10, width: 100 });
        expect(scaleBar(10, { name: "mi", km: 1.5 })).toEqual({ value: 5, width: 75 });
    });

    it("has a symbol for every kind of place and a look for every biome the engine names (POS-7)", () => {
        expect(Object.keys(pageKinds)).toEqual([...placeKinds]);
        expect(Object.keys(pageBiomes)).toEqual([...biomes]);
    });
});
