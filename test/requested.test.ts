// A roll the master asks, as the page's sheet and tray answer it (D-330, ASK-12): the rows its checks name, the tray's dice that make one, every other roll free.
import { describe, expect, it } from "vitest";
import type { Asked } from "../src/dashboard/data.ts";
import { sameDice, shownNotation } from "../src/dashboard/labels.ts";
import { requestedOf, requestedRow, trayCheck } from "../src/dashboard/requested.ts";

const asked: Asked = {
    id: "a1",
    question: "Il guado è gonfio di pioggia",
    title: "Tiro",
    labels: ["Tiro: Atletica (1d20+2)", "Tiro: Acrobazia (1d20-1)", "Cambio idea"],
    who: "Ettore",
    fields: ["athletics", "acrobatics", null],
};

describe("a roll the master asks, on the sheet and in the tray (D-330, ASK-12)", () => {
    const answered: number[] = [];
    const requested = requestedOf(asked, (index) => answered.push(index));

    it("lights the rows its checks name on the sheet of whom it is asked, and answers by the check's place", () => {
        expect(requested?.checks).toEqual([{ index: 0, check: "Atletica", dice: "1d20+2" }, { index: 1, check: "Acrobazia", dice: "1d20-1" }]);
        expect([requestedRow(requested, "Ettore", "Athletics"), requestedRow(requested, "Ettore", "acrobatics"), requestedRow(requested, "Ettore", "insight"), requestedRow(requested, "Lupa", "athletics")])
            .toEqual([0, 1, undefined, undefined]);
        requested?.answer(1);
        expect(answered).toEqual([1]);
    });

    it("answers with the tray's dice that make one check alone, its number included; any other dice are a free roll", () => {
        expect([trayCheck(requested, "1d20+2"), trayCheck(requested, "1d20−1"), trayCheck(requested, "1d20"), trayCheck(requested, "1d20+2+1d6")]).toEqual([0, 1, undefined, undefined]);
        const twins = requestedOf({ ...asked, labels: ["Tiro: Atletica (1d20+2)", "Tiro: Acrobazia (1d20+2)", "Cambio idea"] }, () => undefined);
        expect(trayCheck(twins, "1d20+2")).toBeUndefined();
        expect(requestedOf({ ...asked, title: "Scelta", labels: ["Sì", "No"] }, () => undefined)).toBeUndefined();
        expect(requestedOf(undefined, () => undefined)).toBeUndefined();
    });

    it("tells dice apart as the tray and a check write them", () => {
        expect([sameDice("1d20 + 2", "1d20+2"), sameDice("1d20−1", "1d20-1"), sameDice("1d20+0", "1d20"), sameDice("1D20", "1d20"), sameDice("1d20+1", "1d20-1")]).toEqual([true, true, true, true, false]);
        expect(shownNotation("2d20kh1-1")).toBe("2d20kh1−1");
    });
});
