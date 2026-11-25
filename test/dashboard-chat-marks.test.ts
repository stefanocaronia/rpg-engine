// What the master writes in plain square brackets, told by its shape (D-582): a roll, a clock, or a note; and a roll of the engine's as a line of the chat.
import { describe, expect, it } from "vitest";
import { rollLine } from "../src/dashboard/chat/chat.ts";
import { markOf, masterMarks } from "../src/dashboard/chat/marks.ts";
import type { ShownRoll } from "../src/dashboard/data.ts";

describe("the master's marks in the chat", () => {
    it("tells a roll by its dice, however the master writes it: what it is, the dice, the total and what follows", () => {
        expect(markOf("Scatto 2d6: 5 (4+1)")).toEqual({ kind: "roll", text: "Scatto 2d6: 5 (4+1)", label: "Scatto", notation: "2d6", total: "5", rest: "(4+1)" });
        expect(markOf("d20+5 = 17")).toEqual({ kind: "roll", text: "d20+5 = 17", label: "", notation: "d20+5", total: "17", rest: "" });
        expect(markOf("Athletics: 1d20 + 2 → 14, a success")).toEqual({ kind: "roll", text: "Athletics: 1d20 + 2 → 14, a success", label: "Athletics", notation: "1d20+2", total: "14", rest: ", a success" });
        expect(markOf("2d6")).toEqual({ kind: "roll", text: "2d6", label: "", notation: "2d6", rest: "" });
        expect(markOf("Luck d% -> 07")).toMatchObject({ kind: "roll", label: "Luck", notation: "d%", total: "07" });
        expect(markOf("Fate 4dF = -1")).toMatchObject({ kind: "roll", notation: "4dF", total: "-1" });
        // Dice with no total given: what follows stays as it is.
        expect(markOf("Damage 1d8+3 slashing")).toEqual({ kind: "roll", text: "Damage 1d8+3 slashing", label: "Damage", notation: "1d8+3", rest: "slashing" });
        // Dice win over a count of steps beside them.
        expect(markOf("Escape 2d6: 9, 2/4")).toMatchObject({ kind: "roll", notation: "2d6", total: "9", rest: ", 2/4" });
    });

    it("tells a clock by its count of steps, and nothing by a date, a part of a number or a count past its end", () => {
        expect(markOf("Fuga 1/4")).toEqual({ kind: "clock", text: "Fuga 1/4", label: "Fuga", filled: 1, steps: 4, rest: "" });
        expect(markOf("Alarm: 0 / 6 (the guards)")).toEqual({ kind: "clock", text: "Alarm: 0 / 6 (the guards)", label: "Alarm", filled: 0, steps: 6, rest: "(the guards)" });
        expect(markOf("3/3")).toEqual({ kind: "clock", text: "3/3", label: "", filled: 3, steps: 3, rest: "" });
        expect(markOf("12/11/2026").kind).toBe("note");
        expect(markOf("5/4").kind).toBe("note");
        expect(markOf("1/0").kind).toBe("note");
        expect(markOf("1.5/3").kind).toBe("note");
    });

    it("takes anything else for a note, and never a word that only looks like dice", () => {
        expect(markOf("Ettore → Brigante 1 → Lupa")).toEqual({ kind: "note", text: "Ettore → Brigante 1 → Lupa" });
        expect(markOf("non entrare")).toEqual({ kind: "note", text: "non entrare" });
        // A d among letters, or with no number after it, is a word.
        expect(markOf("round 2").kind).toBe("note");
        expect(markOf("and2").kind).toBe("note");
        expect(markOf("3d").kind).toBe("note");
        expect(markOf("grid6b").kind).toBe("note");
    });

    it("finds the marks among the words of a line, and leaves a link's brackets, an escaped one, an empty one and a long sentence as written", () => {
        expect(masterMarks("A shadow darts. [Scatto 2d6: 5 (4+1)] It is fast. [Fuga 1/4]")).toEqual([
            "A shadow darts. ",
            { kind: "roll", text: "Scatto 2d6: 5 (4+1)", label: "Scatto", notation: "2d6", total: "5", rest: "(4+1)" },
            " It is fast. ",
            { kind: "clock", text: "Fuga 1/4", label: "Fuga", filled: 1, steps: 4, rest: "" },
        ]);
        expect(masterMarks("[2d6]")).toEqual([{ kind: "roll", text: "2d6", label: "", notation: "2d6", rest: "" }]);
        expect(masterMarks("No brackets here.")).toEqual(["No brackets here."]);
        expect(masterMarks("")).toEqual([]);
        expect(masterMarks("See [the rules](https://example.org) and \\[this\\] and ![a picture]")).toEqual(["See [the rules](https://example.org) and \\[this\\] and ![a picture]"]);
        expect(masterMarks("- [ ] to do, [x] done, [] none")).toEqual(["- [ ] to do, [x] done, [] none"]);
        // A page's name in its double brackets is a link, whoever reads the line first.
        expect(masterMarks("to the [[Whispering Tower]] at dusk")).toEqual(["to the [[Whispering Tower]] at dusk"]);
        const long = `[${"a long sentence of the story in brackets ".repeat(3)}]`;
        expect(masterMarks(long)).toEqual([long]);
        // Never across a line, nor an unclosed one.
        expect(masterMarks("an open [bracket\nand its end] and [one more")).toEqual(["an open [bracket\nand its end] and [one more"]);
        // Trimmed inside, and the words around kept as they are.
        expect(masterMarks("go [  Fuga 2/4  ] on")).toEqual(["go ", { kind: "clock", text: "Fuga 2/4", label: "Fuga", filled: 2, steps: 4, rest: "" }, " on"]);
    });

    it("takes a roll in a sentence's own round brackets, as a real master writes it, and no other words in them", () => {
        expect(masterMarks("You slip on a wet stone (d6: 1, serviva 4) and fall.")).toEqual([
            "You slip on a wet stone ",
            { kind: "roll", text: "d6: 1, serviva 4", label: "", notation: "d6", total: "1", rest: ", serviva 4" },
            " and fall.",
        ]);
        expect(masterMarks("The innkeeper (an old soldier) nods, 2/4 of the way there (or so).")).toEqual(["The innkeeper (an old soldier) nods, 2/4 of the way there (or so)."]);
        // A link's address, and the round brackets inside a roll's square ones, are no marks of their own.
        expect(masterMarks("[the d6 rules](https://example.org/2d6)")).toEqual(["[the d6 rules](https://example.org/2d6)"]);
        expect(masterMarks("[Scatto 2d6: 5 (4+1)]")).toHaveLength(1);
        // Square brackets inside round ones are found as they are.
        expect(masterMarks("(it hits you [Danno 1d6: 4])")).toEqual(["(it hits you ", { kind: "roll", text: "Danno 1d6: 4", label: "Danno", notation: "1d6", total: "4", rest: "" }, ")"]);
    });

    it("takes the clocks a pair of brackets lists one by one, and a list that holds anything else as one mark", () => {
        expect(masterMarks("[Fuga 2/3 · Inseguimento 0/4]")).toEqual([
            { kind: "clock", text: "Fuga 2/3", label: "Fuga", filled: 2, steps: 3, rest: "" },
            { kind: "clock", text: "Inseguimento 0/4", label: "Inseguimento", filled: 0, steps: 4, rest: "" },
        ]);
        expect(masterMarks("[Ettore · Ombra · Lupa]")).toEqual([{ kind: "note", text: "Ettore · Ombra · Lupa" }]);
        expect(masterMarks("[Fuga 2/3 · di corsa]")).toHaveLength(1);
    });

    it("says a roll of the engine's in one line: whom and what, its result, and the whole of it for a tooltip", () => {
        const bare: ShownRoll = { id: "r", at: "2026-11-25T18:00:00.000Z", by: "player", who: "Ettore", notation: "1d20+5", total: 9, text: "1d20+5 = 9 [4] + 5", dice: [{ sides: 20, value: 4 }] };
        const roll: ShownRoll = { ...bare, check: "Athletics" };
        expect(rollLine(roll, "Ettore")).toEqual({ what: "Ettore · Athletics", result: "9", detail: "1d20+5 = 9 [4] + 5" });
        // With no check, whom alone; an extension's words in place of the total; a toss, its coins in words.
        expect(rollLine(bare, "Ettore").what).toBe("Ettore");
        expect(rollLine({ ...roll, says: "Two pins" }, "Ettore").result).toBe("Two pins");
        const tossed: ShownRoll = { ...roll, toss: ["heads", "tails"] };
        expect(rollLine(tossed, "Lupa", "heads, tails")).toEqual({ what: "Lupa · Athletics", result: "heads, tails", detail: "heads, tails" });
        expect(rollLine({ ...roll, check: "" }, "").what).toBe("");
    });
});
