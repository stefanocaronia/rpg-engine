// The death save on the page (D-461): its outcome read from the roll and what the question carried, as the engine writes it (DIE-4).
import { describe, expect, it } from "vitest";
import { dyingState, saveOutcome } from "../src/dashboard/save-outcome.ts";

const save = {
    sides: 20,
    atLeast: 10,
    successes: { field: "death-successes", value: 1, most: 3 },
    failures: { field: "death-failures", value: 1, most: 3 },
    lowest: 2,
    highest: { field: "hp", value: 1 },
};
const d20 = (value: number, total = value) => ({ total, dice: [{ sides: 20, value }] });

describe("the outcome of a death save (D-461)", () => {
    it("counts a success at the total asked, a failure under it, two on the lowest face", () => {
        expect(saveOutcome(save, d20(13))).toEqual({ kind: "success", successes: 2, failures: 1, count: 0 });
        expect(saveOutcome(save, d20(10))).toMatchObject({ kind: "success" });
        expect(saveOutcome(save, d20(6))).toEqual({ kind: "failure", successes: 1, failures: 2, count: 1 });
        expect(saveOutcome({ ...save, failures: { ...save.failures, value: 0 } }, d20(1))).toEqual({ kind: "failures", successes: 1, failures: 2, count: 2 });
    });

    it("is stable at the last success and dead at the last failure, never past the most", () => {
        expect(saveOutcome({ ...save, successes: { ...save.successes, value: 2 } }, d20(15))).toMatchObject({ kind: "stable", successes: 3 });
        expect(saveOutcome({ ...save, failures: { ...save.failures, value: 2 } }, d20(4))).toMatchObject({ kind: "dead", failures: 3 });
        expect(saveOutcome({ ...save, failures: { ...save.failures, value: 2 } }, d20(1))).toMatchObject({ kind: "dead", failures: 3, count: 2 });
    });

    it("ends it all on the highest face, by the natural die, not the total", () => {
        expect(saveOutcome(save, d20(20))).toEqual({ kind: "back", successes: 0, failures: 0, count: 0 });
        expect(saveOutcome(save, d20(19, 21))).toMatchObject({ kind: "success" });
        expect(saveOutcome({ ...save, highest: undefined }, d20(20))).toMatchObject({ kind: "success" });
        expect(saveOutcome(save, { total: 3, dice: [{ sides: 20, value: 20, dropped: true }, { sides: 20, value: 3 }] })).toMatchObject({ kind: "failure" });
    });
});

describe("where one at their dying point stands (D-461)", () => {
    it("is dying until the last success makes them stable or the last failure dead, the failures counting first", () => {
        // By their sides, in any order of show (review of 17 October).
        const counters = (successes: number, failures: number) => [{ value: failures, limit: 3, side: "failures" as const }, { value: successes, limit: 3, side: "successes" as const }];
        expect([dyingState(counters(1, 1)), dyingState(counters(3, 2)), dyingState(counters(2, 3)), dyingState(counters(3, 3)), dyingState(undefined)]).toEqual(["dying", "stable", "dead", "dead", undefined]);
        expect(dyingState([{ value: 5 }, { value: 9 }])).toBe("dying");
    });
});
