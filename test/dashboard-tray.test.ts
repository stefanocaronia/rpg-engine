// The dice the tray throws by itself (D-284, D-337): which of a kind count, as a notation and as the chat writes them, and the checks they answer (D-330).
import { describe, expect, it } from "vitest";
import { diceText, keptOf, notation, withDropped } from "../src/dashboard/dice/pool.ts";
import { type PageRoll, readFree, withFree } from "../src/dashboard/free-rolls.ts";
import { sameDice } from "../src/dashboard/labels.ts";
import { requestedOf, trayCheck } from "../src/dashboard/requested.ts";

describe("which dice of a kind count in the tray (D-337)", () => {
    it("writes two of a kind as the higher or the lower kept, more as the lowest or the highest dropped, the biggest first", () => {
        expect([
            notation([20, 20], 5, { 20: "highest" }),
            notation([20, 20], 0, { 20: "lowest" }),
            notation([6, 6, 6, 6], 0, { 6: "highest" }),
            notation([6, 20, 20], -1, { 20: "highest" }),
            notation([20, 20], 0, {}),
        ]).toEqual(["2d20kh1+5", "2d20kl1", "4d6dl1", "2d20kh1+1d6-1", "2d20"]);
    });

    it("keeps a choice only for a kind of two dice or more, never for the d%", () => {
        expect(keptOf([20, 6], { 20: "highest", 6: "lowest" })).toEqual({});
        expect(keptOf([100, 100, 6, 6], { 100: "highest", 6: "lowest" })).toEqual({ 6: "lowest" });
    });

    it("drops the lowest face for the highest, the highest for the lowest, one die a kind, and writes it in parentheses", () => {
        const two = [{ sides: 20, value: 4 }, { sides: 20, value: 17 }];
        expect(withDropped(two, { 20: "highest" }).map((die) => die.dropped === true)).toEqual([true, false]);
        expect(withDropped(two, { 20: "lowest" }).map((die) => die.dropped === true)).toEqual([false, true]);
        const four = [3, 1, 6, 4].map((value) => ({ sides: 6, value }));
        expect(withDropped(four, { 6: "highest" }).filter((die) => die.dropped !== true).map((die) => die.value)).toEqual([3, 6, 4]);
        expect(diceText(withDropped(two, { 20: "highest" }), 5)).toBe("[(4), 17] + 5");
    });

    it("answers a check with advantage the master asks, however its dropping is written", () => {
        const asked = requestedOf({ id: "a", question: "Lo spettro", title: "Tiro", labels: ["Tiro: Tiro salvezza Saggezza (2d20kh1+5)", "Cambio idea"] }, () => undefined);
        expect(trayCheck(asked, notation([20, 20], 5, { 20: "highest" }))).toBe(0);
        expect(trayCheck(asked, notation([20, 20], 5, {}))).toBeUndefined();
        expect(sameDice("2d20dl1+5", "2d20kh1+5")).toBe(true);
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
