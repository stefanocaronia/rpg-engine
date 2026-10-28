// The dashboard's dice (D-278): the seven dice of dice.json, which make-dice.py writes with Blender, their symmetries, a throw simulated and recorded, and the
// number decided before the throw brought up by turning the die by one of its symmetries. The coin of coin.json, by make-coin.py, as one more (D-524 (1)).
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { coinsToThrow, combine, diceToThrow, type DieModel, landedValue, landingTurn, rareFace, rotate, symmetries, type Vector } from "../src/dashboard/dice/models.ts";
import { loadPhysics, throwDice } from "../src/dashboard/dice/throw.ts";

const models = JSON.parse(readFileSync(new URL("../src/dashboard/assets/dice/dice.json", import.meta.url), "utf8")) as Record<string, DieModel>;
const coin = JSON.parse(readFileSync(new URL("../src/dashboard/assets/dice/coin.json", import.meta.url), "utf8")) as DieModel;
const tray = { width: 7, depth: 4.5 };

beforeAll(() => loadPhysics());

/** A random source that repeats, from a seed: the same throws at every run. */
function seeded(seed: number): () => number
{
    let state = seed;

    return () => {
        state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
        return state / 4_294_967_296;
    };
}

function near(first: Vector, second: Vector): boolean
{
    return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]) < 1e-3;
}

describe("the dice of the dashboard (D-278)", () => {
    it("makes each die a real die: its values, opposite faces adding up as on a real one, and the symmetries of its shape", () => {
        const dice: Record<string, { values: number[]; sum?: number; turns: number; }> = {
            d4: { values: [1, 2, 3, 4], turns: 12 },
            d6: { values: [1, 2, 3, 4, 5, 6], sum: 7, turns: 24 },
            d8: { values: [1, 2, 3, 4, 5, 6, 7, 8], sum: 9, turns: 24 },
            d10: { values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], sum: 9, turns: 10 },
            d100: { values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], sum: 90, turns: 10 },
            d12: { values: Array.from({ length: 12 }, (_, index) => index + 1), sum: 13, turns: 60 },
            d20: { values: Array.from({ length: 20 }, (_, index) => index + 1), sum: 21, turns: 60 },
        };
        expect(Object.keys(models).sort()).toEqual(Object.keys(dice).sort());

        for (const [kind, expected] of Object.entries(dice)) {
            const model = models[kind];
            expect(model.values.map((value) => value.value)).toEqual(expected.values);
            const turns = symmetries(model.shape);
            expect(turns, kind).toHaveLength(expected.turns);

            for (const value of model.values) {
                // On the d4 a value is a corner, and its opposite is a face.
                const opposite = model.values.find((other) => near(other.up, [-value.up[0], -value.up[1], -value.up[2]]));
                expect(opposite === undefined ? undefined : value.value + opposite.value, kind).toBe(expected.sum);
                // Each symmetry brings a value's up direction onto another's: the die looks the same after it.
                turns.forEach((turn) => expect(model.values.some((other) => near(rotate(turn, value.up), other.up))).toBe(true));
            }
        }
    });

    it("lands each die on any value: thrown as the physics wants, then shown turned by a symmetry that brings the wanted value up", () => {
        const random = seeded(7);

        for (const [kind, model] of Object.entries(models)) {
            const turns = symmetries(model.shape);
            const landed = new Set<number>();

            for (let throwNumber = 0; throwNumber < 60; throwNumber++) {
                const thrown = throwDice([model.shape], tray, random);
                const last = thrown.frames.at(-1)?.[0];
                expect(last).toBeDefined();
                expect(thrown.frames.length).toBeLessThan(8 * 60);
                // The die lies on the floor, inside the walls.
                expect(Math.abs(last?.position[0] ?? 99)).toBeLessThan(tray.width);
                expect(Math.abs(last?.position[2] ?? 99)).toBeLessThan(tray.depth);
                const turn = last?.quaternion ?? [0, 0, 0, 1];
                landed.add(landedValue(model, turn).value);
                const wanted = model.values[throwNumber % model.values.length].value;
                const landing = combine(turn, landingTurn(model, turns, turn, wanted));
                expect(landedValue(model, landing).value, kind).toBe(wanted);

                // Turned by a symmetry, the die is where it was: its corners are the same.
                model.shape.vertices.forEach((corner) => expect(model.shape.vertices.some((other) => near(rotate(landing, corner), rotate(turn, other)))).toBe(true));
            }

            // The throws are not stuck on a few faces.
            expect(landed.size, kind).toBeGreaterThan(model.values.length / 2);
        }
    });

    it("throws dice together, as two d20 with advantage, each in every frame, landing apart; and a reroll past the dice already lying", () => {
        const random = seeded(11);
        const d20 = models.d20.shape;

        for (let throwNumber = 0; throwNumber < 100; throwNumber++) {
            const thrown = throwDice([d20, d20], tray, random);
            const last = thrown.frames.at(-1) ?? [];
            expect(thrown.frames.every((frame) => frame.length === 2)).toBe(true);
            const [first, second] = last;
            // Two dice never end inside each other: their centres stay a die apart.
            expect(Math.hypot(first.position[0] - second.position[0], first.position[1] - second.position[1], first.position[2] - second.position[2])).toBeGreaterThan(1.2);
            const rerolled = throwDice([d20], tray, random, [{ shape: d20, frame: first }]);
            const again = rerolled.frames.at(-1)?.[0];
            expect(Math.hypot((again?.position[0] ?? 0) - first.position[0], (again?.position[2] ?? 0) - first.position[2])).toBeGreaterThan(1.2);
        }

        // The dice knock on the floor and on each other, each its own sound: what the page plays.
        const knocks = Array.from({ length: 20 }, () => throwDice([d20, d20, d20, d20], tray, random).knocks).flat();
        expect(knocks.some((knock) => knock.onDie)).toBe(true);
        expect(knocks.some((knock) => !knock.onDie)).toBe(true);
    });

    it("ends a throw with each die lying flat on the floor: never on an edge, leaning on a wall or a die, nor on top of one, six dice on a computer's tray too (D-400)", () => {
        const random = seeded(17);
        // A clock that stands still: the throw is taken again as often as it needs.
        const still = (): number => 0;

        for (const [kind, model] of Object.entries(models)) {
            for (const [width, depth, count, throws] of [[7, 4.5, 1, 15], [3, 4.1, 2, 15], [9.7, 4.5, 6, 3]] as const) {
                for (let throwNumber = 0; throwNumber < throws; throwNumber++) {
                    const last = throwDice(Array.from({ length: count }, () => model.shape), { width, depth }, random, [], still).frames.at(-1) ?? [];

                    for (const die of last) {
                        const up = rotate(die.quaternion, landedValue(model, die.quaternion).up);
                        expect(up[1] / Math.hypot(...up), kind).toBeGreaterThan(Math.cos((3.5 * Math.PI) / 180));
                        expect(Math.min(...model.shape.vertices.map((corner) => rotate(die.quaternion, corner)[1] + die.position[1])), kind).toBeLessThan(0.1);
                    }
                }
            }
        }
    });

    it("throws the same with the same randomness, a throw taken again included, its knocks within its frames (D-400)", () => {
        const sixDice = Array.from({ length: 6 }, () => models.d6.shape);
        const phone = { width: 3, depth: 4.1 };
        const first = throwDice(sixDice, phone, seeded(23), [], () => 0);
        const second = throwDice(sixDice, phone, seeded(23), [], () => 0);
        expect(second).toEqual(first);
        expect(first.knocks.every((knock, index) => knock.frame < first.frames.length && knock.frame >= (first.knocks[index - 1]?.frame ?? 0))).toBe(true);
    });

    it("takes the throw that leaned least once its time is spent: twenty dice crowd a phone's tray, and the throw ends with all of them (D-400)", () => {
        let now = 0;
        // A clock that runs a tenth of a second at each look: the budget is spent in a few tries.
        const thrown = throwDice(Array.from({ length: 20 }, () => models.d6.shape), { width: 3, depth: 4.1 }, seeded(29), [], () => (now += 100));
        expect(thrown.frames.length).toBeGreaterThan(0);
        expect(thrown.frames.length).toBeLessThanOrEqual(8 * 60);
        expect(thrown.frames.every((frame) => frame.length === 20)).toBe(true);
    });

    it("knocks first when a die falls on the floor, never in the air as it leaves the hand, in a narrow tray too", () => {
        const random = seeded(13);

        for (const [kind, model] of Object.entries(models)) {
            for (const width of [3, 7]) {
                for (let throwNumber = 0; throwNumber < 20; throwNumber++) {
                    const knocks = throwDice([model.shape], { width, depth: 4.5 }, random).knocks;
                    // A die let go at least 2.5 above the floor needs more than ten frames to reach it.
                    expect(knocks[0]?.frame, kind).toBeGreaterThan(10);
                }
            }
        }
    });

    it("marks a rare face, as one throw in ten or rarer, on a die that counts: the highest or the lowest of a d10 or bigger, a d% on its tens (D-281)", () => {
        expect([{ sides: 20, value: 20 }, { sides: 20, value: 1 }, { sides: 20, value: 19 }].map(rareFace)).toEqual(["highest", "lowest", undefined]);
        // A d8's 8 is one throw in eight: not rare. A dropped die, or one that exploded, counts for no celebration.
        expect([{ sides: 8, value: 8 }, { sides: 20, value: 20, dropped: true }, { sides: 10, value: 13, faces: [10, 3] }, { sides: "F" as const, value: 1 }].map(rareFace)).toEqual([undefined, undefined, undefined, undefined]);
        expect([{ sides: 10, value: 10 }, { sides: 12, value: 1 }].map(rareFace)).toEqual(["highest", "lowest"]);
        expect(diceToThrow([{ sides: 100, value: 100 }], new Set(Object.keys(models)))).toEqual([
            { kind: "d100", values: [0], dropped: false, rare: "highest" },
            { kind: "d10", values: [0], dropped: false },
        ]);
    });

    it("throws a d% as its tens and its units, a d10's 10 as its 0, a reroll and an explosion in turn, and leaves out dice with no model", () => {
        const kinds = new Set(Object.keys(models));
        expect(diceToThrow([{ sides: 100, value: 47 }, { sides: 100, value: 100, dropped: true }], kinds)).toEqual([
            { kind: "d100", values: [40], dropped: false },
            { kind: "d10", values: [7], dropped: false },
            { kind: "d100", values: [0], dropped: true },
            { kind: "d10", values: [0], dropped: true },
        ]);
        expect(diceToThrow([{ sides: 10, value: 10 }, { sides: 20, value: 13 }, { sides: "F", value: -1 }, { sides: 3, value: 2 }], kinds)).toEqual([
            { kind: "d10", values: [0], dropped: false, rare: "highest" },
            { kind: "d20", values: [13], dropped: false },
        ]);
        // A die rerolled shows the face it had, then the new one; one that exploded, each of its faces.
        expect(diceToThrow([{ sides: 6, value: 5, rerolledFrom: 1 }, { sides: 6, value: 9, faces: [6, 3] }, { sides: 6, value: 9, faces: [6, 3], rerolledFrom: 1 }], kinds)).toEqual([
            { kind: "d6", values: [1, 5], dropped: false },
            { kind: "d6", values: [6, 3], dropped: false },
            { kind: "d6", values: [1, 6, 3], dropped: false },
        ]);
    });
});

describe("the coin of the dashboard (D-524 (1))", () => {
    it("is a coin: heads up on one face, tails on the other, and the turns of a prism of 24 sides, the flips among them", () => {
        expect(coin.values.map((value) => value.value)).toEqual([1, 2]);
        expect(near(coin.values[0].up, [0, 1, 0]) && near(coin.values[1].up, [0, -1, 0])).toBe(true);
        // Its faces for the physics are only the two it lies on.
        expect(coin.shape.faces).toHaveLength(2);
        const turns = symmetries(coin.shape);
        expect(turns).toHaveLength(48);
        expect(turns.some((turn) => near(rotate(turn, coin.values[0].up), coin.values[1].up))).toBe(true);
    });

    it("lands on the face decided, as it fell, its picture as upright as its turns allow; one, two or three coins, each flat on the floor, never on its edge", () => {
        const random = seeded(31);
        const turns = symmetries(coin.shape);
        const still = (): number => 0;
        const fell = new Set<number>();

        for (const [width, depth, count] of [[7, 4.5, 1], [7, 4.5, 3], [3, 4.1, 2], [3, 4.1, 3]] as const) {
            for (let throwNumber = 0; throwNumber < 12; throwNumber++) {
                const last = throwDice(Array.from({ length: count }, () => coin.shape), { width, depth }, random, [], still).frames.at(-1) ?? [];
                expect(last).toHaveLength(count);
                // A thin coin fallen on another never ends through it: two coins on the floor are a coin apart.
                const across = 2 * Math.hypot(coin.shape.vertices[0][0], coin.shape.vertices[0][2]);
                last.forEach((one, index) => last.slice(index + 1).forEach((other) => expect(Math.hypot(one.position[0] - other.position[0], one.position[2] - other.position[2])).toBeGreaterThan(across * 0.97)));

                for (const [index, lying] of last.entries()) {
                    const up = rotate(lying.quaternion, landedValue(coin, lying.quaternion).up);
                    expect(up[1]).toBeGreaterThan(Math.cos((3.5 * Math.PI) / 180));
                    expect(Math.abs(lying.position[0])).toBeLessThan(width);
                    fell.add(landedValue(coin, lying.quaternion).value);
                    const wanted = (throwNumber + index) % 2 === 0 ? 1 : 2;
                    const landing = combine(lying.quaternion, landingTurn(coin, turns, lying.quaternion, wanted));
                    expect(landedValue(coin, landing).value).toBe(wanted);
                    // Of 24 turns about its axis, the one nearest upright: its top within half a side, 7.5 degrees, of the screen's up.
                    const top = rotate(landing, coin.values[wanted - 1].top ?? [0, 0, 0]);
                    expect(-top[2] / Math.hypot(top[0], top[2])).toBeGreaterThan(Math.cos((7.6 * Math.PI) / 180));
                }
            }
        }

        expect(fell).toEqual(new Set([1, 2]));
    });

    it("throws a toss's coins, each on its face: 1 heads, 2 tails", () => {
        expect(coinsToThrow(["heads", "tails", "tails"])).toEqual([
            { kind: "coin", values: [1], dropped: false },
            { kind: "coin", values: [2], dropped: false },
            { kind: "coin", values: [2], dropped: false },
        ]);
        // A d2 rolled by its notation is no coin: the page has no model for it.
        expect(diceToThrow([{ sides: 2, value: 1 }], new Set([...Object.keys(models), "coin"]))).toEqual([]);
    });
});
