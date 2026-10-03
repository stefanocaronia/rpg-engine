import { describe, expect, it } from "vitest";
import { canSpend, changeCounter, counterLimit, formatCounter, isSafeCounter, readCounter, readCounterText } from "../src/counters/index.ts";

// Counters for any game: fifth edition hit points next to Ironsworn's health, momentum and progress (Ironsworn by Shawn Tomkin, CC-BY 4.0).
describe("counters", () => {
    it("reads a whole number and current/max, and nothing else", () => {
        expect(readCounter(20)).toEqual({ value: 20 });
        expect(readCounter("12/12")).toEqual({ value: 12, max: 12 });
        expect(readCounter(" 5 / 12 ")).toEqual({ value: 5, max: 12 });
        expect(readCounter("-3/10")).toEqual({ value: -3, max: 10 });

        for (const other of ["dodici", "12", "1.5/3", "5/-2", 1.5, true, null, undefined, ["12/12"], { value: 2 }]) {
            expect(readCounter(other), JSON.stringify(other)).toBeUndefined();
        }
    });

    it("stops a change by an amount at a limit, and says how far it went beyond", () => {
        expect(changeCounter({ value: 12, max: 12 }, { by: -7 })).toEqual({ counter: { value: 5, max: 12 }, beyond: 0 });
        expect(changeCounter({ value: 4, max: 22 }, { by: -9 })).toEqual({ counter: { value: 0, max: 22 }, beyond: -5 });
        expect(changeCounter({ value: 10, max: 12 }, { by: 5 })).toEqual({ counter: { value: 12, max: 12 }, beyond: 3 });
        expect(changeCounter({ value: 20 }, { by: 100 })).toEqual({ counter: { value: 120 }, beyond: 0 });
    });

    it("never pushes a value set outside its limits further out, but lets it come back", () => {
        expect(changeCounter({ value: -3, max: 10 }, { by: -1 })).toEqual({ counter: { value: -3, max: 10 }, beyond: -1 });
        expect(changeCounter({ value: -3, max: 10 }, { by: 2 })).toEqual({ counter: { value: -1, max: 10 }, beyond: 0 });
    });

    it("spends only what is there, and sets any value", () => {
        expect(canSpend({ value: 4, max: 5 }, 1)).toBe(true);
        expect(canSpend({ value: 0 }, 1)).toBe(false);
        expect(canSpend({ value: 3 }, 0)).toBe(false);
        expect(changeCounter({ value: 4, max: 5 }, { spend: 1 })).toEqual({ counter: { value: 3, max: 5 }, beyond: 0 });
        expect(changeCounter({ value: 2, max: 10 }, { to: { value: -3, max: 10 } })).toEqual({ counter: { value: -3, max: 10 }, beyond: 0 });
    });

    it("reads a counter given as text, and refuses numbers too large to count exactly", () => {
        expect(readCounterText(" 15/15 ")).toEqual({ value: 15, max: 15 });
        expect(readCounterText("-3")).toEqual({ value: -3 });
        expect(readCounterText("-0")).toEqual({ value: 0 });
        expect(readCounterText("molti")).toBeUndefined();
        expect(readCounter("99999999999999999999/1")).toBeUndefined();
        expect(isSafeCounter({ value: 2 ** 53 })).toBe(false);
    });

    it("writes the field back and says where it stands", () => {
        expect(formatCounter({ value: 5, max: 12 })).toBe("5/12");
        expect(formatCounter({ value: 17 })).toBe(17);
        expect(counterLimit({ value: 0, max: 5 })).toBe("at 0");
        expect(counterLimit({ value: 40, max: 40 })).toBe("at max");
        expect(counterLimit({ value: -3, max: 10 })).toBe("outside");
        expect(counterLimit({ value: 3, max: 5 })).toBeUndefined();
    });
});
