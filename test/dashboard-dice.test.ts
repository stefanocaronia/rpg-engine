// The dashboard's dice (D-278): the seven dice of dice.json, which make-dice.py writes with Blender, their symmetries, a throw simulated and recorded, and the
// number decided before the throw brought up by turning the die by one of its symmetries.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aboutVertical, combine, diceToThrow, type DieModel, landedValue, landingTurn, rareFace, rotate, symmetries, uprightAngle, type Vector } from "../src/dashboard/dice/models.ts";
import { throwDice } from "../src/dashboard/dice/throw.ts";

const models = JSON.parse(readFileSync(new URL("../src/dashboard/assets/dice/dice.json", import.meta.url), "utf8")) as Record<string, DieModel>;
const tray = { width: 7, depth: 4.5 };

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
                // Turned on its face as it stops, the die shows the number upright, still up.
                const shown = combine(aboutVertical(uprightAngle(model, landing, wanted)), landing);
                expect(landedValue(model, shown).value, kind).toBe(wanted);
                const top = model.values.find((value) => value.value === wanted)?.top;
                const [x, , z] = top === undefined ? [0, 0, -1] : rotate(shown, top);

                if (Math.hypot(x, z) >= 0.2) {
                    expect(Math.atan2(x, -z), kind).toBeCloseTo(0, 6);
                }

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

        // The dice knock on the floor and on each other: what the page plays.
        expect(throwDice([d20, d20], tray, random).knocks.length).toBeGreaterThan(0);
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
