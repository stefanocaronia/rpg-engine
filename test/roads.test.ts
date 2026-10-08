// Roads as a graph (MECCANICHE, ROA-1, ROA-4, TRV-4, D-262): lengths, the stops of a road, and the laws of the quickest way on roads made at random.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatLength, readLength, readSpeed } from "../src/core/length.ts";
import { crossingAlong, directionName, directionTo, distanceBetween, meanPoint, pointAlong, pointFrom, quickestWay, readDirection, type Stretch, stretchesOf, type Way } from "../src/map/index.ts";
import { readStops } from "../src/pages/index.ts";

describe("lengths and speeds (ROA-1, TRV-1, D-262)", () => {
    it.each([
        ["8 km", 8000],
        ["1.5 km", 1500],
        ["500 m", 500],
        [" 12km ", 12000],
        ["8 KM", 8000],
    ])("D-262: %s reads as %d metres", (text, metres) => {
        expect(readLength(text)).toBe(metres);
    });

    it.each(["5 miles", "300 feet", "8", "0 km", "km", "8,5 km", "-3 km", "1½ km"])("D-262: %s is not a length: the engine keeps measures in metric", (text) => {
        expect(readLength(text)).toBeUndefined();
    });

    it("TRV-1: a speed is the distance of an hour, with or without /h", () => {
        expect(readSpeed("4.5 km")).toBe(4500);
        expect(readSpeed("4.5 km/h")).toBe(4500);
        expect(readSpeed("3 mph")).toBeUndefined();
    });

    it("D-262: outputs give metric, or imperial with the game's mile and foot", () => {
        expect(formatLength(36000, "metric")).toBe("36 km");
        expect(formatLength(800, "metric")).toBe("800 m");
        expect(formatLength(999.6, "metric")).toBe("1 km");
        expect(formatLength(36000, "imperial", { mile: 1500, foot: 0.3 })).toBe("24 miles");
        expect(formatLength(1500, "imperial", { mile: 1500, foot: 0.3 })).toBe("1 mile");
        expect(formatLength(90, "imperial", { mile: 1500, foot: 0.3 })).toBe("300 feet");
        expect(formatLength(1609.344, "imperial")).toBe("1 mile");
    });
});

describe("a road's stops (ROA-1)", () => {
    it("ROA-1: links and lengths taking turns, read as names and metres", () => {
        expect(readStops(["[[Guadoscuro]]", "12 km", "[[Bivio|il bivio]]", "500 m", "[[places/Rocca.md]]"])).toEqual({ stops: ["Guadoscuro", "Bivio", "Rocca"], lengths: [12000, 500] });
        expect(readStops(["[[A]]", "3 km", "[[B]]", "3 km", "[[A]]"])).toEqual({ stops: ["A", "B", "A"], lengths: [3000, 3000] });
    });

    it.each([
        [["[[A]]"], "start and end with a stop and have at least two"],
        [["[[A]]", "3 km"], "start and end with a stop"],
        [["[[A]]", "3 km", "[[B]]", "2 km"], "start and end with a stop"],
        [["[[A]]", "[[B]]"], "where the length of a stretch goes"],
        [["[[A]]", "3 miles", "[[B]]"], "in km or m"],
        [["A", "3 km", "[[B]]"], "where a stop goes"],
        [["[[A]]", "3 km", "[[a]]"], "twice in a row"],
        ["[[A]], 3 km, [[B]]", "must be a list"],
        [[], "must be a list"],
    ])("ROA-1: %j is refused, saying why", (value, why) => {
        const read = readStops(value);
        expect("problem" in read ? read.problem : "").toContain(why);
    });
});

// Roads at random among five stops: each road two to four stops, lengths from 1 to 9 km; a speed for each road and direction, or none.
const stopNames = ["A", "B", "C", "D", "E"];
const roads = fc.array(fc.tuple(fc.array(fc.constantFrom(...stopNames), { minLength: 2, maxLength: 4 }), fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 3, maxLength: 3 })), {
    minLength: 1,
    maxLength: 5,
}).map((list) =>
    list.flatMap(([stops, lengths], road) => {
        const kept = stops.filter((stop, index) => index === 0 || stop !== stops[index - 1]);
        return kept.length < 2 ? [] : stretchesOf(`R${road}`, kept, kept.slice(1).map((_, index) => lengths[index % lengths.length] * 1000));
    })
);
const speeds = fc.array(fc.option(fc.integer({ min: 1, max: 4 }), { nil: undefined }), { minLength: 10, maxLength: 10 });

/** Every way without a stop twice, from a stop to another, by walking the stretches every way they can be walked: the model the quickest way is checked against. */
function allWays(stretches: Stretch[], from: string, to: string, speed: (stretch: Stretch, forward: boolean) => number | undefined): Way[]
{
    const ways: Way[] = [];

    const walk = (at: string, seen: string[], way: Way): void => {
        if (at === to) {
            ways.push(way);
            return;
        }

        for (const stretch of stretches) {
            for (const forward of [true, false]) {
                const next = forward ? stretch.to : stretch.from;
                const metresAMinute = speed(stretch, forward);

                if ((forward ? stretch.from : stretch.to) === at && !seen.includes(next) && metresAMinute !== undefined) {
                    walk(next, [...seen, next], { steps: [...way.steps, { stretch, forward, length: stretch.length }], minutes: way.minutes + stretch.length / metresAMinute, length: way.length + stretch.length });
                }
            }
        }
    };

    walk(from, [from], { steps: [], minutes: 0, length: 0 });
    return ways;
}

describe("points of the map (POS-2, POS-4)", () => {
    const point = fc.record({ east: fc.integer({ min: -50000, max: 50000 }), north: fc.integer({ min: -50000, max: 50000 }) });
    const direction = fc.integer({ min: 0, max: 15 }).map((index) => index * 22.5);

    it("POS-2: a point given by a relation is at the distance given from where it starts, in the direction given, which keeps its name", () => {
        fc.assert(fc.property(point, direction, fc.integer({ min: 1, max: 100000 }), (from, degrees, metres) => {
            const to = pointFrom(from, degrees, metres);
            expect(distanceBetween(from, to)).toBeCloseTo(metres, 6);
            expect(directionName(directionTo(from, to))).toBe(directionName(degrees));
            expect(readDirection(directionName(degrees))).toBe(degrees);
        }));
    });

    it("POS-2: the middle of relations that agree is the point of each", () => {
        fc.assert(fc.property(point, direction, fc.integer({ min: 1, max: 100000 }), (target, degrees, metres) => {
            const start = pointFrom(target, (degrees + 180) % 360, metres);
            const other = pointFrom(target, degrees, metres);
            const middle = meanPoint([pointFrom(start, degrees, metres), pointFrom(other, (degrees + 180) % 360, metres)]);
            expect(distanceBetween(middle, target)).toBeLessThan(1e-6);
        }));
    });

    it("POS-4: a point a fraction of the way is on the line, at that fraction of the distance", () => {
        fc.assert(fc.property(point, point, fc.double({ min: 0, max: 1, noNaN: true }), (from, to, fraction) => {
            const along = pointAlong(from, to, fraction);
            expect(distanceBetween(from, along) + distanceBetween(along, to)).toBeCloseTo(distanceBetween(from, to), 6);
            expect(distanceBetween(from, along)).toBeCloseTo(fraction * distanceBetween(from, to), 6);
        }));
    });

    it("TRV-13: two segments that cross are crossed at the point where they meet", () => {
        expect(crossingAlong({ east: 0, north: 10000 }, { east: 0, north: -10000 }, { east: -5000, north: 0 }, { east: 5000, north: 0 })).toBe(0.5);
        expect(crossingAlong({ east: 0, north: 10000 }, { east: 0, north: 5000 }, { east: -5000, north: 0 }, { east: 5000, north: 0 })).toBeUndefined();
        expect(readDirection("north east")).toBe(45);
        expect(readDirection("NNW")).toBe(337.5);
        expect(readDirection("up")).toBeUndefined();
    });
});

describe("the quickest way (ROA-4, TRV-4)", () => {
    const speedFrom = (list: (number | undefined)[]) => (stretch: Stretch, forward: boolean): number | undefined => {
        const value = list[(Number(stretch.road.slice(1)) * 2 + (forward ? 0 : 1)) % list.length];
        return value === undefined ? undefined : value * 10;
    };

    it("TRV-4: no way is quicker, and among the quickest none is shorter; it exists exactly when a way does", () => {
        fc.assert(fc.property(roads, speeds, fc.constantFrom(...stopNames), fc.constantFrom(...stopNames), (stretches, list, from, to) => {
            const speed = speedFrom(list);
            const way = quickestWay(stretches, { stop: from }, to, speed);
            const ways = allWays(stretches, from, to, speed);
            expect(way === undefined).toBe(ways.length === 0);

            if (way !== undefined) {
                const quickest = Math.min(...ways.map((other) => other.minutes));
                expect(way.minutes).toBeCloseTo(quickest, 6);
                expect(way.length).toBeCloseTo(Math.min(...ways.filter((other) => Math.abs(other.minutes - quickest) < 1e-6).map((other) => other.length)), 6);
            }
        }));
    });

    it("ROA-3, ROA-4: walked both ways at the same speed, a way back is as long as the way there, and every step follows a stretch that exists, from where the last ended", () => {
        fc.assert(fc.property(roads, fc.constantFrom(...stopNames), fc.constantFrom(...stopNames), (stretches, from, to) => {
            const there = quickestWay(stretches, { stop: from }, to, () => 1);
            const back = quickestWay(stretches, { stop: to }, from, () => 1);
            expect(there?.length).toBe(back?.length);
            let at = from;

            for (const step of there?.steps ?? []) {
                expect(stretches).toContain(step.stretch);
                expect(step.forward ? step.stretch.from : step.stretch.to).toBe(at);
                at = step.forward ? step.stretch.to : step.stretch.from;
            }

            expect(there === undefined || at === to).toBe(true);
        }));
    });

    it("TRV-9: from halfway along a stretch, the way goes on forward or back, whichever is quicker", () => {
        const stretches = stretchesOf("Strada", ["A", "B", "C"], [10000, 10000]);
        expect(quickestWay(stretches, { stretch: stretches[0], done: 4000 }, "C", () => 100)).toMatchObject({ length: 16000, steps: [{ forward: true, length: 6000 }, { forward: true, length: 10000 }] });
        expect(quickestWay(stretches, { stretch: stretches[0], done: 4000 }, "A", () => 100)).toMatchObject({ length: 4000, steps: [{ forward: false, length: 4000 }] });
        expect(quickestWay(stretches, { stretch: stretches[0], done: 0 }, "A", () => 100)).toMatchObject({ length: 0, steps: [] });
    });

    it("TRV-4: as quick and as long, the first by the order of the stretches", () => {
        const stretches = [...stretchesOf("Nord", ["A", "B", "C"], [5000, 5000]), ...stretchesOf("Sud", ["A", "D", "C"], [5000, 5000])];
        expect(quickestWay(stretches, { stop: "A" }, "C", () => 50)?.steps.map((step) => step.stretch.road)).toEqual(["Nord", "Nord"]);
        expect(quickestWay(stretches.toReversed(), { stop: "A" }, "C", () => 50)?.steps.map((step) => step.stretch.road)).toEqual(["Sud", "Sud"]);
    });
});
