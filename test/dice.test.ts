import { describe, expect, it } from "vitest";
import { defaultContext } from "../src/core/context.js";
import { DiceError, rollDice } from "../src/dice/index.js";

describe("dice notation", () => {
    it.each([
        ["1d20+5", [14], 19, "1d20+5 = 19 [14] + 5"],
        ["2d20kh1+5", [14, 7], 19, "2d20kh1+5 = 19 [14, (7)] + 5"],
        ["2d20kl1", [14, 7], 7, "2d20kl1 = 7 [(14), 7]"],
        ["4d6dl1", [3, 5, 1, 6], 14, "4d6dl1 = 14 [3, 5, (1), 6]"],
        ["2d6ro<=2", [1, 6, 3], 9, "2d6ro<=2 = 9 [1->6, 3]"],
        ["1d6!", [6, 6, 2], 14, "1d6! = 14 [6, 6, 2]"],
        ["1d6!!", [6, 3], 9, "1d6!! = 9 [6+3]"],
        ["6d10>=8", [8, 3, 10, 5, 2, 7], 2, "6d10>=8 = 2 successes [8*, 3, 10*, 5, 2, 7]"],
        ["4dF+2", [1, 0, -1, 1], 3, "4dF+2 = 3 [+, 0, -, +] + 2"],
        ["d%", [57], 57, "d% = 57 [57]"],
        ["1d8-1", [1], 0, "1d8-1 = 0 [1] - 1"],
        ["2d6 + 1d4 + 3", [2, 3, 4], 12, "2d6 + 1d4 + 3 = 12 [2, 3] + [4] + 3"],
    ])("%s with faces %j totals %i", (notation, faces, total, text) => {
        const diceRoll = rollDice(notation, { values: faces });
        expect(diceRoll.total).toBe(total);
        expect(diceRoll.text).toBe(text);
    });

    it("covers the dice of games very different from D&D", () => {
        expect(rollDice("1d6+2", { values: [4] }).total).toBe(6); // Ironsworn action die
        expect(rollDice("2d10", { values: [3, 9] }).total).toBe(12); // Ironsworn challenge dice
        expect(rollDice("3d6kh1", { values: [2, 6, 4] }).total).toBe(6); // Blades in the Dark pool
        expect(rollDice("5d10>=8", { values: [8, 9, 1, 10, 3] }).total).toBe(3); // dice pool with successes
        expect(rollDice("1d10!+5", { values: [10, 4] }).total).toBe(19); // exploding d10
    });

    it.each(["", "d", "1d", "1d1", "0d6", "101d6", "1d6x", "2d20kh1dl1", "1d6!>=1", "4dFkh1", "1d20++5", "2d6kh3", "2d6dl2"])(
        "rejects %j",
        (notation) => {
            expect(() => rollDice(notation, { random: () => 1 })).toThrow(DiceError);
        },
    );
});

describe("physical dice", () => {
    it("rejects an impossible face", () => {
        expect(() => rollDice("1d6", { values: [9] })).toThrow("Impossible value 9 on a d6");
        expect(() => rollDice("4dF", { values: [2, 0, 0, 0] })).toThrow("Impossible value 2 on a Fudge die");
    });

    it("asks for missing faces and refuses extra ones", () => {
        expect(() => rollDice("2d20kh1", { values: [14] })).toThrow("needs at least 2 values (2 d20)");
        expect(() => rollDice("1d6!", { values: [6] })).toThrow("needs one more d6");
        expect(() => rollDice("1d6", { values: [3, 4] })).toThrow("Too many values");
    });
});

describe("digital dice", () => {
    it("stays within the faces of the dice", () => {
        const random = defaultContext().random;
        for (let index = 0; index < 1000; index++) {
            const d20 = rollDice("1d20", { random }).total;
            const fudge = rollDice("4dF", { random }).total;
            expect(d20).toBeGreaterThanOrEqual(1);
            expect(d20).toBeLessThanOrEqual(20);
            expect(fudge).toBeGreaterThanOrEqual(-4);
            expect(fudge).toBeLessThanOrEqual(4);
        }
    });
});
