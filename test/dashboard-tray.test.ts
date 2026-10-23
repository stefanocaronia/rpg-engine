// The dice the tray throws by itself (D-284, D-337): which of a kind count, as a notation and as the chat writes them, and the checks they answer (D-330).
import { describe, expect, it } from "vitest";
import { diceText, doubled, keepsOf, keptOf, keptTotal, notation, trayThrows, withDropped } from "../src/dashboard/dice/pool.ts";
import { type PageRoll, readFree, withFree } from "../src/dashboard/free-rolls.ts";
import { sameDice } from "../src/dashboard/labels.ts";
import { requestedOf, trayCheck } from "../src/dashboard/requested.ts";

describe("which dice of a kind count in the tray (D-337)", () => {
    it("writes the highest or the lowest one alone kept, however many of a kind, the biggest first (D-397)", () => {
        expect([
            notation([20, 20], 5, { 20: "highest" }),
            notation([20, 20], 0, { 20: "lowest" }),
            notation([6, 6, 6, 6], 0, { 6: "highest" }),
            notation([6, 20, 20], -1, { 20: "highest" }),
            notation([20, 20], 0, {}),
        ]).toEqual(["2d20kh1+5", "2d20kl1", "4d6kh1", "2d20kh1+1d6-1", "2d20"]);
    });

    it("keeps a choice only for a kind of two dice or more, never for the d%", () => {
        expect(keptOf([20, 6], { 20: "highest", 6: "lowest" })).toEqual({});
        expect(keptOf([100, 100, 6, 6], { 100: "highest", 6: "lowest" })).toEqual({ 6: "lowest" });
    });

    it("keeps the highest face alone for the highest, the lowest alone for the lowest, however many, and writes the others in parentheses", () => {
        const two = [{ sides: 20, value: 4 }, { sides: 20, value: 17 }];
        expect(withDropped(two, { 20: "highest" }).map((die) => die.dropped === true)).toEqual([true, false]);
        expect(withDropped(two, { 20: "lowest" }).map((die) => die.dropped === true)).toEqual([false, true]);
        const four = [3, 1, 6, 4].map((value) => ({ sides: 6, value }));
        expect(withDropped(four, { 6: "highest" }).filter((die) => die.dropped !== true).map((die) => die.value)).toEqual([6]);
        expect(withDropped(four, { 6: "lowest" }).filter((die) => die.dropped !== true).map((die) => die.value)).toEqual([1]);
        expect(diceText(withDropped(two, { 20: "highest" }), 5)).toBe("[(4), 17] + 5");
    });

    it("answers a check with advantage the master asks, however its dropping is written", () => {
        const asked = requestedOf({ id: "a", question: "Lo spettro", title: "Tiro", labels: ["Tiro: Tiro salvezza Saggezza (2d20kh1+5)", "Cambio idea"] }, () => undefined);
        expect(trayCheck(asked, notation([20, 20], 5, { 20: "highest" }))).toBe(0);
        expect(trayCheck(asked, notation([20, 20], 5, {}))).toBeUndefined();
        expect(sameDice("2d20dl1+5", "2d20kh1+5")).toBe(true);
    });
});

describe("a number of the sheet rolled for fun, and the dice doubled", () => {
    it("keeps of a roll better or worse only the die its notation keeps, as 2d20kl1+3 counts the lowest d20 alone", () => {
        expect([keepsOf("2d20kl1+3"), keepsOf("2d20kh1-1"), keepsOf("1d20+5"), keepsOf("2d20KH1+1d6")]).toEqual([{ 20: "lowest" }, { 20: "highest" }, {}, { 20: "highest" }]);
        const two = [{ sides: 20, value: 4 }, { sides: 20, value: 17 }];
        expect(keptTotal(withDropped(two, keepsOf("2d20kl1+3")), 3)).toBe(7);
        expect(keptTotal(withDropped(two, keepsOf("2d20kh1+3")), 3)).toBe(20);
        expect(keptTotal(withDropped(two, keepsOf("2d20+3")), 3)).toBe(24);
    });

    it("doubles the dice, never the number added, as a critical hit's damage", () => {
        expect(doubled([8, 6])).toEqual([8, 8, 6, 6]);
        expect(notation(doubled([8]), 3, {})).toBe("2d8+3");
        expect(notation(doubled([6, 6, 8]), -1, {})).toBe("2d8+4d6-1");
    });
});

describe("the checks the tray can answer by hand (D-339, D-380)", () => {
    it("throws its own kinds, all counting or with the highest or the lowest kept or dropped, and a number; never a reroll, an explosion or a die taken away", () => {
        expect(["1d20+5", "2d20kh1+3", "3d20kh1", "2d20dl1+5", "1d20+1d4+2", "1d%", "2d6 + 2"].map(trayThrows)).toEqual([true, true, true, true, true, true, true]);
        expect(["2d6ro<=2+2", "1d6!", "1d20-1d4", "1d3", "4dF", "+3", "4d6dl1"].map(trayThrows)).toEqual([false, false, false, false, false, false, false]);
    });
});

describe("the free rolls this browser keeps (D-330 (4))", () => {
    it("takes back only whole free rolls, as the page writes them, and keeps the last ones", () => {
        const kept = new Map<string, string>();
        const storage = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) };
        Object.assign(globalThis, { localStorage: storage });

        try {
            const roll: PageRoll = { id: "free-1", at: "2026-10-11T10:00:00.000Z", by: "player", notation: "1d20+3", total: 18, text: "[15] + 3", dice: [{ sides: 20, value: 15 }], free: true };
            withFree("Prova", [], roll);
            expect(readFree("Prova")).toEqual([roll]);
            const key = [...kept.keys()][0];
            kept.set(key, JSON.stringify([roll, { ...roll, id: "free-2", dice: "oops" }, { ...roll, id: "free-3", notation: 5 }, { ...roll, id: "free-4", at: "never" }, null]));
            expect(readFree("Prova").map((one) => one.id)).toEqual(["free-1"]);
        } finally {
            Reflect.deleteProperty(globalThis, "localStorage");
        }
    });
});
