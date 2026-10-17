// The death save on the page (D-461): its outcome read from what the system's code wrote against what the question carried (DIE-4), never worked out by it.
import { describe, expect, it } from "vitest";
import { dyingState, effectsBesideState, saveOutcome } from "../src/dashboard/save-outcome.ts";

const save = {
    sides: 20,
    atLeast: 10,
    successes: { field: "death-successes", value: 1, most: 3 },
    failures: { field: "death-failures", value: 1, most: 3 },
    lowest: 2,
    highest: { field: "hp", value: 1 },
};
// The counters as the roll left them, failures first, as a system may show them in any order.
const after = (successes: number, failures: number) => ({
    dying: [{ field: "death-failures", value: failures, limit: 3, side: "failures" as const }, { field: "death-successes", value: successes, limit: 3, side: "successes" as const }],
});

describe("the outcome of a death save (D-461)", () => {
    it("tells a success, a failure and two failures by what the counters gained", () => {
        expect(saveOutcome(save, after(2, 1))).toEqual({ kind: "success", successes: 2, failures: 1, count: 0 });
        expect(saveOutcome(save, after(1, 2))).toEqual({ kind: "failure", successes: 1, failures: 2, count: 1 });
        expect(saveOutcome({ ...save, failures: { ...save.failures, value: 0 } }, after(1, 2))).toEqual({ kind: "failures", successes: 1, failures: 2, count: 2 });
    });

    it("is stable at the last success, its failures gone, and dead at the last failure or once the page says dead", () => {
        expect(saveOutcome({ ...save, successes: { ...save.successes, value: 2 } }, after(3, 0))).toEqual({ kind: "stable", successes: 3, failures: 0, count: 0 });
        expect(saveOutcome(save, after(1, 3))).toEqual({ kind: "dead", successes: 1, failures: 3, count: 2 });
        expect(saveOutcome({ ...save, failures: { ...save.failures, value: 2 } }, after(1, 3))).toMatchObject({ kind: "dead", count: 1 });
        expect(saveOutcome(save, { dead: true })).toMatchObject({ kind: "dead", failures: 3 });
    });

    it("is back once no longer dying, and nothing when the roll changed nothing, as when the system's code did not run", () => {
        expect(saveOutcome(save, {})).toEqual({ kind: "back", successes: 0, failures: 0, count: 0 });
        expect(saveOutcome(save, after(1, 1))).toBeUndefined();
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

describe("the marks of one stable (playtest 11)", () => {
    it("say the stable state once, never again by the effect that names it", () => {
        const counters = [{ field: "death-successes", value: 3, limit: 3, side: "successes" as const, full: "Stable" }, { field: "death-failures", value: 0, limit: 3, side: "failures" as const }];
        const effects = [{ name: "Stable", text: "Stable", condition: true as const }, { name: "Unconscious", text: "Unconscious", condition: true as const }];
        expect(effectsBesideState(effects, counters).map((effect) => effect.name)).toEqual(["Unconscious"]);
        expect(effectsBesideState(effects, [{ ...counters[0], value: 2 }, counters[1]])).toEqual(effects);
    });
});
