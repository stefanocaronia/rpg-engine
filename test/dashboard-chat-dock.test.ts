// The chat beside the page (D-582), as the page reads it: the side, as the player chose or the page's own, how wide the panel may be in a window and under
// which width there is none, whether the page's own table still fits beside it, and where the panel's edge goes under a pointer or a key.
import { describe, expect, it } from "vitest";
import { chatSide, dockFrom, dockWidth, dockWidths, keptWidth, logicalSide, tableFits, widthAfterKey, widthAtPointer } from "../src/dashboard/chat/dock.ts";

describe("the chat beside the page (D-582)", () => {
    it("stands where the player chose, in its tab, on the left or on the right; until they choose, at the page's end side, the right, or the left from right to left", () => {
        expect([chatSide("tab", "ltr"), chatSide("left", "ltr"), chatSide("right", "rtl")]).toEqual(["tab", "left", "right"]);
        expect([chatSide("", "ltr"), chatSide("", "rtl"), chatSide("middle", "ltr")]).toEqual(["right", "left", "right"]);
        // The window's own sides, whatever way the page is written: only the page's style names them by its reading.
        expect([logicalSide("left", "ltr"), logicalSide("right", "ltr"), logicalSide("left", "rtl"), logicalSide("right", "rtl")]).toEqual(["start", "end", "end", "start"]);
    });

    it("is 480 pixels wide until the player drags it, between 360 and 800, and never so wide that the page keeps less than 760; under 1120 there is no panel", () => {
        expect(dockFrom).toBe(1120);
        expect([keptWidth(undefined), keptWidth(""), keptWidth("wide"), keptWidth("512")]).toEqual([480, 480, 480, 512]);
        expect([dockWidth(480, 1280), dockWidth(480, 1600), dockWidth(480, 1920)]).toEqual([480, 480, 480]);
        expect([dockWidth(100, 1600), dockWidth(2000, 1920), dockWidth(700, 1280), dockWidth(480.4, 1600)]).toEqual([360, 800, 520, 480]);
        // The narrowest window with a panel has it at its least; a pixel under, none, whatever was chosen.
        expect([dockWidth(480, 1120), dockWidth(480, 1119), dockWidth(360, 800)]).toEqual([360, undefined, undefined]);
    });

    it("keeps the page's own table beside the page only while the page has 900 pixels left", () => {
        expect([tableFits(1280, 480), tableFits(1380, 480), tableFits(1600, 480), tableFits(1920, 800)]).toEqual([false, true, true, true]);
        expect([tableFits(1260, dockWidths.least), tableFits(1259, dockWidths.least), tableFits(1280, 0), tableFits(899, 0)]).toEqual([true, false, true, false]);
    });

    it("follows a pointer on its inner edge from the side it stands at, and the arrows the way they point, Home and End to its least and most", () => {
        expect([widthAtPointer("left", 520, { left: 0, right: 480 }), widthAtPointer("right", 1100, { left: 1105, right: 1585 })]).toEqual([520, 485]);
        // On the left the right arrow widens it; on the right it narrows it.
        expect([widthAfterKey("ArrowRight", 480, "left", 1600), widthAfterKey("ArrowLeft", 480, "left", 1600)]).toEqual([504, 456]);
        expect([widthAfterKey("ArrowRight", 480, "right", 1600), widthAfterKey("ArrowLeft", 480, "right", 1600)]).toEqual([456, 504]);
        expect([widthAfterKey("Home", 480, "left", 1600), widthAfterKey("End", 480, "right", 1600), widthAfterKey("End", 480, "right", 1280)]).toEqual([360, 800, 520]);
        // At its ends it stays; another key is not the edge's.
        expect([widthAfterKey("ArrowLeft", 360, "left", 1600), widthAfterKey("ArrowLeft", 520, "right", 1280)]).toEqual([360, 520]);
        expect([widthAfterKey("Enter", 480, "left", 1600), widthAfterKey("ArrowUp", 480, "left", 1600)]).toEqual([undefined, undefined]);
    });
});
