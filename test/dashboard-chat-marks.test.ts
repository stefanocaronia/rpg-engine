// The engine's marks in the master's words (D-585, D-586): a roll's mark, [roll <id>], a clock's, [clock <page>], and the turns', [turns], read wherever
// they stand; brackets of the master's own left as written; the rolls the story tells, whose own line goes; and a roll of the engine's as a line of the chat.
import { describe, expect, it } from "vitest";
import { rollLine } from "../src/dashboard/chat/chat.ts";
import { masterMarks, rollsTold } from "../src/dashboard/chat/marks.ts";
import type { ChatMessage, ShownRoll } from "../src/dashboard/data.ts";

const roll = (id: string): { kind: "roll"; id: string; } => ({ kind: "roll", id });

describe("the engine's marks in the chat", () => {
    it("reads a roll's mark among the master's words, whatever its capitals and spaces", () => {
        expect(masterMarks("The shadow darts. [roll 3cb1a2f0] It is fast.")).toEqual(["The shadow darts. ", roll("3cb1a2f0"), " It is fast."]);
        expect(masterMarks("[roll 3cb1a2f0]")).toEqual([roll("3cb1a2f0")]);
        expect(masterMarks("[ Roll   3CB1A2F0 ] and [ROLL 00ff00ff]")).toEqual([roll("3cb1a2f0"), " and ", roll("00ff00ff")]);
        // A colon after the word, and a backslash before each bracket, as some masters write the same mark.
        expect(masterMarks("hit [roll: 3cb1a2f0] and \\[roll 00ff00ff\\] too")).toEqual(["hit ", roll("3cb1a2f0"), " and ", roll("00ff00ff"), " too"]);
        // Bold or italics around it are the text's to drop: the mark is read inside them.
        expect(masterMarks("**[roll 3cb1a2f0]**")).toEqual(["**", roll("3cb1a2f0"), "**"]);
        expect(masterMarks("No brackets here.")).toEqual(["No brackets here."]);
        expect(masterMarks("")).toEqual([]);
    });

    it("reads a clock's mark by its page, spaces and all, and the mark of the turns, as tolerantly as a roll's (D-586)", () => {
        const clock = (page: string): { kind: "clock"; page: string; } => ({ kind: "clock", page });
        expect(masterMarks("The bells ring. [clock Fuga dal castello] Run.")).toEqual(["The bells ring. ", clock("Fuga dal castello"), " Run."]);
        expect(masterMarks("[ CLOCK:  Fuga   dal castello ] and \\[clock Fuga\\]")).toEqual([clock("Fuga dal castello"), " and ", clock("Fuga")]);
        expect(masterMarks("Ombra moves. [turns] Then Lupa.")).toEqual(["Ombra moves. ", { kind: "turns" }, " Then Lupa."]);
        expect(masterMarks("[ Turns ] [turns:] \\[TURNS\\]")).toEqual([{ kind: "turns" }, " ", { kind: "turns" }, " ", { kind: "turns" }]);
    });

    it("leaves the master's own brackets as they are written: a clock with its numbers, dice, the order of the turns, a roll named otherwise", () => {
        for (
            const free of [
                "[Fuga 1/4]",
                "[Scatto 2d6: 5 (4+1)]",
                "[Ettore → Ombra → Lupa]",
                "(d6: 1, serviva 4)",
                "[roll the dice]",
                "[roll]",
                "[roll xyz]",
                "[rolls 3cb1a2f0]",
                "[roll3cb1a2f0]",
                "[clock]",
                "[clocks Fuga]",
                "[turns of Ombra]",
                "[the rules](https://example.org)",
            ]
        ) {
            expect(masterMarks(`It goes on ${free} from here.`), free).toEqual([`It goes on ${free} from here.`]);
        }
    });

    it("leaves out a mark still being written at the end of the words, never the brackets of the master's own", () => {
        const whole = "Lupa sniffs the air. [roll 3cb1a2f0] She growls.";
        const mark = whole.indexOf("[");

        for (let length = 1; length <= whole.length; length++) {
            const shown = masterMarks(whole.slice(0, length)).map((part) => (typeof part === "string" ? part : "")).join("");
            expect(shown, whole.slice(0, length)).toBe(length <= mark ? whole.slice(0, length) : `Lupa sniffs the air. ${whole.slice(mark + "[roll 3cb1a2f0]".length, length)}`);
        }

        expect(masterMarks("and then [roll 3cb1a2f0 ")).toEqual(["and then "]);
        expect(masterMarks("and then [Fu")).toEqual(["and then [Fu"]);
        expect(masterMarks("and then [rosso")).toEqual(["and then [rosso"]);

        // A clock's page with its spaces, and the turns, hidden letter by letter until the mark closes; a backslash before the brackets too.
        for (const written of ["[clock Fuga dal castello]", "\\[clock: Fuga dal castello\\]", "[turns]"]) {
            // A backslash alone may be the story's: hidden from its bracket on.
            for (let length = written.startsWith("\\") ? 2 : 1; length < written.length; length++) {
                expect(masterMarks(`Run. ${written.slice(0, length)}`), written.slice(0, length)).toEqual(["Run. "]);
            }
        }
    });

    it("tells which rolls the master's words tell: those marked in a message of the master's after them", () => {
        const rolled = (id: number, rollId: string): ChatMessage => ({
            id,
            from: "roll",
            text: "",
            roll: { id: rollId, at: "2026-11-25T18:00:00.000Z", by: "master", notation: "1d6", total: 4, text: "1d6 = 4 [4]", dice: [{ sides: 6, value: 4 }] },
        });
        const master = (id: number, text: string): ChatMessage => ({ id, from: "master", text });
        expect([...rollsTold([rolled(1, "3cb1a2f0"), master(2, "She growls. [roll 3cb1a2f0]")])]).toEqual(["3cb1a2f0"]);
        // Not marked, it keeps its line; nor is one whose mark came before it, or in the player's words.
        expect([...rollsTold([rolled(1, "3cb1a2f0"), master(2, "She growls.")])]).toEqual([]);
        expect([...rollsTold([master(1, "[roll 3cb1a2f0]"), rolled(2, "3cb1a2f0")])]).toEqual([]);
        expect([...rollsTold([rolled(1, "3cb1a2f0"), { id: 2, from: "player", text: "[roll 3cb1a2f0]" }])]).toEqual([]);
        // A mark of a roll the chat does not have tells none; two rolls, each by its own mark, in capitals too.
        expect([...rollsTold([rolled(1, "3cb1a2f0"), master(2, "[roll deadbeef]")])]).toEqual([]);
        expect([...rollsTold([rolled(1, "3cb1a2f0"), rolled(2, "00ff00ff"), master(3, "One [roll 00FF00FF], then the other."), master(4, "[roll 3cb1a2f0]")])].sort()).toEqual(["00ff00ff", "3cb1a2f0"]);
        expect([...rollsTold([])]).toEqual([]);
    });

    it("says a roll of the engine's in one line: whom and what, its result, and the whole of it for a tooltip", () => {
        const bare: ShownRoll = { id: "r", at: "2026-11-25T18:00:00.000Z", by: "player", who: "Ettore", notation: "1d20+5", total: 9, text: "1d20+5 = 9 [4] + 5", dice: [{ sides: 20, value: 4 }] };
        const checked: ShownRoll = { ...bare, check: "Athletics" };
        expect(rollLine(checked, "Ettore")).toEqual({ what: "Ettore · Athletics", result: "9", detail: "1d20+5 = 9 [4] + 5" });
        // With no check, whom alone; an extension's words in place of the total; a toss, its coins in words.
        expect(rollLine(bare, "Ettore").what).toBe("Ettore");
        expect(rollLine({ ...checked, says: "Two pins" }, "Ettore").result).toBe("Two pins");
        const tossed: ShownRoll = { ...checked, toss: ["heads", "tails"] };
        expect(rollLine(tossed, "Lupa", "heads, tails")).toEqual({ what: "Lupa · Athletics", result: "heads, tails", detail: "heads, tails" });
        expect(rollLine({ ...checked, check: "" }, "").what).toBe("");
    });
});
