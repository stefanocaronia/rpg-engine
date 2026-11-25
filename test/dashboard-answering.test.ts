// What answers the master's question, as the question over the page and the one in the chat both read it (D-279, D-582): which buttons show, and which
// checks the sheet or the tray answer by hand (D-330, D-380).
import { describe, expect, it } from "vitest";
import type { Asked } from "../src/dashboard/data.ts";
import { asksRoll, byHandAnswers, handChecks, shownAnswers } from "../src/dashboard/play/answering.ts";

/** A question as the page is asked it: a roll with these buttons, unless told. */
function asked(labels: string[], more: Partial<Asked> = {}): Asked
{
    return { id: "q", question: "The ford is swollen", title: "Roll", labels, ...more };
}

const twoChecks = asked(["Roll: Athletics (1d20+5)", "Roll: Acrobatics (1d20-1)", "I change my mind"], { who: "Ettore", fields: ["athletics", "acrobatics", null] });

describe("what answers the master's question", () => {
    it("tells a roll from a choice by its buttons", () => {
        expect(asksRoll(twoChecks)).toBe(true);
        expect(asksRoll(asked(["To the bank", "To the boat"], { title: "Choice" }))).toBe(false);
        // A label that looks like a check of another word is an answer.
        expect(asksRoll(asked(["Choice: left (now)"]))).toBe(false);
        expect(asksRoll(asked([]))).toBe(false);
    });

    it("shows every button, in order; folded with no room, the checks alone", () => {
        expect(shownAnswers(twoChecks, false)).toEqual([0, 1, 2]);
        expect(shownAnswers(twoChecks, false, true)).toEqual([0, 1]);
        expect(shownAnswers(asked(["To the bank", "To the boat"], { title: "Choice" }), true, true)).toEqual([]);
        expect(shownAnswers(asked([]), false)).toEqual([]);
    });

    it("by hand leaves out the checks the sheet or the tray answer, and keeps the buttons of those neither does", () => {
        expect(shownAnswers(twoChecks, true)).toEqual([2]);
        expect(handChecks(twoChecks)).toEqual([{ check: "Athletics", dice: "1d20+5", field: "athletics" }, { check: "Acrobatics", dice: "1d20-1", field: "acrobatics" }]);
        // Two checks of the same field and the same dice: neither the row nor the tray tells them apart.
        const same = asked(["Roll: Push (1d20+5)", "Roll: Pull (1d20+5)"], { fields: ["athletics", "athletics"] });
        expect([byHandAnswers(same, 0), byHandAnswers(same, 1)]).toEqual([false, false]);
        expect(shownAnswers(same, true)).toEqual([0, 1]);
        expect(handChecks(same)).toEqual([]);
        // No field of the sheet, and dice the tray cannot throw by itself, as a reroll: the engine alone rolls it.
        const reroll = asked(["Roll: Damage (2d6ro<=2+2)", "Roll: Faith (2d6kh1)"]);
        expect([byHandAnswers(reroll, 0), byHandAnswers(reroll, 1)]).toEqual([false, true]);
        expect(shownAnswers(reroll, true)).toEqual([0]);
        expect(handChecks(reroll)).toEqual([{ check: "Faith", dice: "2d6kh1", field: null }]);
        // An answer that is no check is never rolled by hand.
        expect(byHandAnswers(twoChecks, 2)).toBe(false);
    });
});
