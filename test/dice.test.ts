import { describe, expect, it } from "vitest";
import { defaultContext } from "../src/context.js";
import { digitalFaces, evaluate, physicalFaces } from "../src/dice/evaluate.js";
import { formatRoll } from "../src/dice/format.js";
import { DiceError, parseNotation } from "../src/dice/notation.js";

/** Rolls `notation` using `faces` as the dice, like a player with physical dice. */
function rollWith(notation: string, faces: number[]) {
  const source = physicalFaces(faces);
  const result = evaluate(notation, parseNotation(notation), source.next);
  return { total: result.total, line: formatRoll(result), unused: source.unused() };
}

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
  ])("%s with faces %j totals %i", (notation, faces, total, line) => {
    const roll = rollWith(notation, faces);
    expect(roll.total).toBe(total);
    expect(roll.line).toBe(line);
    expect(roll.unused).toBe(0);
  });

  it("covers the dice of games very different from D&D", () => {
    expect(rollWith("1d6+2", [4]).total).toBe(6); // Ironsworn action die
    expect(rollWith("2d10", [3, 9]).total).toBe(12); // Ironsworn challenge dice
    expect(rollWith("3d6kh1", [2, 6, 4]).total).toBe(6); // Blades in the Dark pool
    expect(rollWith("5d10>=8", [8, 9, 1, 10, 3]).total).toBe(3); // dice pool with successes
    expect(rollWith("1d10!+5", [10, 4]).total).toBe(19); // exploding d10
  });

  it.each(["", "d", "1d", "1d1", "0d6", "101d6", "1d6x", "2d20kh1dl1", "1d6!>=1", "4dFkh1", "1d20++5", "2d6kh3", "2d6dl2"])(
    "rejects %j",
    (notation) => {
      expect(() => parseNotation(notation)).toThrow(DiceError);
    },
  );
});

describe("physical dice", () => {
  it("rejects an impossible face", () => {
    expect(() => rollWith("1d6", [9])).toThrow("Impossible value 9 on a d6");
    expect(() => rollWith("4dF", [2, 0, 0, 0])).toThrow("Impossible value 2 on a Fudge die");
  });

  it("asks for the die an explosion needs", () => {
    expect(() => rollWith("1d6!", [6])).toThrow("needs one more d6");
  });
});

describe("digital dice", () => {
  it("stays within the faces of the die", () => {
    const next = digitalFaces(defaultContext().random);
    for (let i = 0; i < 1000; i++) {
      const face = next(20);
      expect(face).toBeGreaterThanOrEqual(1);
      expect(face).toBeLessThanOrEqual(20);
      expect([-1, 0, 1]).toContain(next("F"));
    }
  });
});
