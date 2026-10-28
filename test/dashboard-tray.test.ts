// The dice the tray throws by itself (D-284, D-337): which of a kind count, as a notation and as the chat writes them, and the checks they answer (D-330).
import { describe, expect, it } from "vitest";
import { coinPictures } from "../src/dashboard/dice/coin-pictures.ts";
import { diceText, doubled, droppedBy, flies, keptOf, keptTotal, notation, trayCoin, trayThrows, withAdded, withDropped } from "../src/dashboard/dice/pool.ts";
import { coinDesignPref, coinDesigns, coinLook, coinMetals, coinOf, coinPref, diceLook, diceSets, mastersDice, masterSet } from "../src/dashboard/dice/sets.ts";
import { type PageRoll, readFree, withFree } from "../src/dashboard/free-rolls.ts";
import { sameDice } from "../src/dashboard/labels.ts";
import { readChoice } from "../src/dashboard/prefs.ts";
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
    it("keeps of a roll better or worse only the dice its notation keeps, as 2d20kl1+3 counts the lowest d20 alone", () => {
        const two = [{ sides: 20, value: 4 }, { sides: 20, value: 17 }];
        const total = (written: string, dice = two, modifier = 3): number => keptTotal(droppedBy(dice, written), modifier);
        expect([total("2d20kl1+3"), total("2d20KH1+3"), total("2d20+3"), total("2d20kh1-1", two, -1)]).toEqual([7, 20, 24, 16]);
        // Dropping one is keeping the other; a count keeps or drops as many.
        expect([total("2d20dl1+3"), total("2d20dh1+3")]).toEqual([20, 7]);
        const four = [{ sides: 6, value: 5 }, { sides: 6, value: 1 }, { sides: 6, value: 6 }, { sides: 6, value: 3 }];
        expect([total("4d6kh3", four, 0), total("4d6dl1", four, 0), total("4d6kl2", four, 0), total("4d6dh2", four, 0)]).toEqual([14, 14, 4, 4]);
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

describe("the tray's coins (D-524 (1))", () => {
    it("adds a coin to the coins alone, at most three, and a die to the dice alone: coins and dice are never thrown together", () => {
        expect(withAdded([], trayCoin)).toEqual([trayCoin]);
        expect(withAdded([trayCoin, trayCoin], trayCoin)).toEqual([trayCoin, trayCoin, trayCoin]);
        expect(withAdded([trayCoin, trayCoin, trayCoin], trayCoin)).toEqual([trayCoin, trayCoin, trayCoin]);
        expect(withAdded([20, 6], trayCoin)).toEqual([trayCoin]);
        expect(withAdded([trayCoin, trayCoin], 20)).toEqual([20]);
        expect(withAdded([20], 20)).toEqual([20, 20]);
        // The tray answers no check with a coin: a d2 is none of its dice.
        expect(trayThrows("1d2")).toBe(false);
    });

    it("answers a toss the master asks with its coins, as many as it asks; never a toss with dice, nor a check with coins (ASK-15)", () => {
        const toss = requestedOf({ id: "a1", question: "La corda regge?", title: "Tiro", labels: ["Tiro: Lancia 2 monete (2d2)", "Cambio idea"], who: "Bruna", toss: true }, () => undefined);
        expect(toss?.toss).toBe(true);
        expect([notation([trayCoin, trayCoin], 0, {}), notation([trayCoin], 0, {}), "1d20"].map((thrown) => trayCheck(toss, thrown))).toEqual([0, undefined, undefined]);
        const check = requestedOf({ id: "a2", question: "Il muro", title: "Tiro", labels: ["Tiro: Sorte (1d2)", "Cambio idea"] }, () => undefined);
        expect([trayCheck(check, notation([trayCoin], 0, {}))]).toEqual([undefined]);
    });
});

describe("the master's rolls in the tray (VIEW-13, D-525 (2))", () => {
    it("throws a roll the master shows when they say so, dice or coins; left out, a toss flies and dice stay in the list", () => {
        expect([{ tray: true }, { tray: false, toss: ["heads" as const] }, { toss: ["tails" as const] }, {}].map(flies)).toEqual([true, false, true, false]);
    });
});

describe("the master's dice (D-525 (3))", () => {
    it("draws a set for each campaign, the same at every look, never the player's, and the next one drawn when the player takes it", () => {
        const named = diceSets.filter((set) => set.look !== undefined).map((set) => set.value);
        const drawn = masterSet("Guadoscuro", "theme").value;
        expect(named).toContain(drawn);
        expect(masterSet("Guadoscuro", "theme").value).toBe(drawn);
        // Another set of the player's leaves the master's as it was.
        expect(masterSet("Guadoscuro", named.find((value) => value !== drawn) ?? "theme").value).toBe(drawn);
        const taken = masterSet("Guadoscuro", drawn).value;
        expect(taken).not.toBe(drawn);
        expect(named).toContain(taken);
        // Campaigns draw apart: ten names give more than a few sets.
        expect(new Set(Array.from({ length: 10 }, (_, index) => masterSet(`Campagna ${index}`, "theme").value)).size).toBeGreaterThan(4);
    });
});

describe("the coins' looks (D-526)", () => {
    it("keeps the player's coins in this browser: as the dice at first, or one of the five metals; a value it no longer offers is the dice's", () => {
        const kept = new Map<string, string>();
        Object.assign(globalThis, { localStorage: { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value) } });

        try {
            expect(coinMetals.map((metal) => metal.value)).toEqual(["gold", "silver", "copper", "bronze", "iron"]);
            expect(readChoice(coinPref)).toBe("dice");
            kept.set(coinPref.key, "copper");
            expect(readChoice(coinPref)).toBe("copper");
            kept.set(coinPref.key, "platinum");
            expect(readChoice(coinPref)).toBe("dice");
        } finally {
            Reflect.deleteProperty(globalThis, "localStorage");
        }
    });

    it("makes the coins as the dice, their body the coin's and their ink its pictures', grain and crystal too; a metal whatever the dice", () => {
        const look = (value: string) => diceSets.find((set) => set.value === value)?.look;
        expect(coinLook("dice", diceLook("obsidian"))).toEqual(look("obsidian"));
        expect(coinLook("dice", diceLook("walnut")).finish.texture).toBe("walnut");
        expect(coinLook("dice", diceLook("ruby-crystal")).finish.clarity).toBeGreaterThan(0);
        const copper = coinMetals.find((metal) => metal.value === "copper")?.look;
        expect(["obsidian", "walnut", "glass"].map((set) => coinLook("copper", diceLook(set)))).toEqual([copper, copper, copper]);
        expect(copper?.finish.metalness).toBe(1);
    });

    it("tosses the master's coins of their dice's material, whatever metal the player chose; the party's toss with the player's (D-526 (3))", () => {
        const party = [{ name: "Ettore" }, { name: "Lupa" }];
        const masters = masterSet("Guadoscuro").look;
        const foes = mastersDice({ by: "master", who: "Brigante" }, party, "Guadoscuro");
        expect(foes).toEqual(masters);
        expect(coinLook("dice", foes)).toEqual(masters);
        expect(coinLook("dice", mastersDice({ by: "master" }, party, "Guadoscuro"))).toEqual(masters);
        // The party's rolls and the player's own are the player's: no look of the master's.
        expect([mastersDice({ by: "master", who: "Lupa" }, party, "Guadoscuro"), mastersDice({ by: "player" }, party, "Guadoscuro"), mastersDice({ by: "master" }, party, undefined)])
            .toEqual([undefined, undefined, undefined]);
    });

    it("offers the designs make-coin.py draws, Sun and moon first and at first, each face a picture to add to, in the order of the coin's relief (D-526 (2))", () => {
        expect(coinDesigns.map((design) => design.value)).toEqual(Object.keys(coinPictures));
        expect(coinDesignPref.initial).toBe("sun");
        expect(coinDesignPref.values).toEqual(["sun", "crown", "rose", "planet", "gear", "eye"]);

        for (const { heads, tails } of Object.values(coinPictures)) {
            for (const parts of [heads, tails]) {
                expect(parts[0]?.[0]).toBe("add");
                expect(parts.every(([step, outline]) => ["add", "cut"].includes(step) && /^M[\d.]/.test(outline) && outline.endsWith("Z"))).toBe(true);
            }
        }
    });

    it("tosses everyone's coins with the player's design; the master's of their dice's material, the player's of what they chose (D-526 (3))", () => {
        const kept = new Map<string, string>([[coinDesignPref.key, "rose"], [coinPref.key, "silver"]]);
        Object.assign(globalThis, { localStorage: { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value) } });

        try {
            const masters = masterSet("Guadoscuro").look;
            expect(coinOf(masters)).toEqual({ look: masters, design: "rose" });
            expect(coinOf()).toEqual({ look: coinMetals.find((metal) => metal.value === "silver")?.look, design: "rose" });
            kept.set(coinDesignPref.key, "dragon");
            expect(coinOf().design).toBe("sun");
        } finally {
            Reflect.deleteProperty(globalThis, "localStorage");
        }
    });
});
