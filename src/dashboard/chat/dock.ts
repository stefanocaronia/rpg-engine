// The chat beside the page (D-582): the one part of the page the player may take out of its section, to the window's left or right, where it stays in sight
// whatever section is shown. Here what that takes, with no drawing: the side, as the player chose or the page's own, how wide the panel may be in a window,
// and where its edge goes under a pointer or a key.
/** Where the chat stands: in its own section, as a tab of the page, or beside the page at the window's left or right. */
export type ChatSide = "tab" | "left" | "right";

/**
 * The panel's widths, in pixels: its least and most, the one it has until the player drags it, and a key's step; the least the page keeps beside it, under
 * which there is no panel; and the least the page needs to keep its own table beside it too.
 */
export const dockWidths = { least: 360, first: 480, most: 800, step: 24, page: 760, table: 900 } as const;

/** The narrowest window with a panel: under it the chat stays in its section, whatever the player chose. */
export const dockFrom = dockWidths.page + dockWidths.least;

/**
 * Where the chat stands: as the player chose; until they choose, beside the page at its end side, where the page's own table is and where the chat stands
 * in the setup: the right, or the left where the page is written from right to left. The sides are the window's own, as the player names them.
 */
export function chatSide(chosen: string, direction: "ltr" | "rtl"): ChatSide
{
    return chosen === "tab" || chosen === "left" || chosen === "right" ? chosen : direction === "rtl" ? "left" : "right";
}

/** A side of the window as the page's style names it, by the way the page is written: its start or its end. */
export function logicalSide(side: "left" | "right", direction: "ltr" | "rtl"): "start" | "end"
{
    return (side === "left") === (direction === "ltr") ? "start" : "end";
}

/** The width the browser kept, as a number; the first width for none, or one that does not read. */
export function keptWidth(kept: string | undefined): number
{
    const width = Number(kept);
    return kept === undefined || kept.trim() === "" || !Number.isFinite(width) ? dockWidths.first : width;
}

/**
 * How wide the panel is in a window: the width wanted, between its least and its most, and never so wide that the page beside it has less than its least;
 * none in a window too narrow for both.
 */
export function dockWidth(wanted: number, windowWidth: number): number | undefined
{
    return windowWidth < dockFrom ? undefined : Math.round(Math.min(Math.max(wanted, dockWidths.least), dockWidths.most, windowWidth - dockWidths.page));
}

/** Whether the page beside a panel this wide still has room for its own table beside it; else the table's cards go back into the page, as on a narrow screen. */
export function tableFits(windowWidth: number, panel: number): boolean
{
    return windowWidth - panel >= dockWidths.table;
}

/**
 * The width wanted as a pointer drags the panel's inner edge to `x`: on the left the panel ends there, on the right it starts there. The panel's own outer
 * edges say where it stands, as a scroll bar keeps its right one off the window's.
 */
export function widthAtPointer(side: "left" | "right", x: number, panel: { left: number; right: number; }): number
{
    return side === "left" ? x - panel.left : panel.right - x;
}

/**
 * The width wanted after a key on the panel's inner edge: the arrows move the edge a step the way they point, so that on the left the right arrow widens
 * the panel and on the right it narrows it; Home is the least, End the most the window allows. Nothing for another key.
 */
export function widthAfterKey(key: string, width: number, side: "left" | "right", windowWidth: number): number | undefined
{
    const grows = side === "left" ? "ArrowRight" : "ArrowLeft";
    const shrinks = side === "left" ? "ArrowLeft" : "ArrowRight";
    const wanted = key === grows ? width + dockWidths.step : key === shrinks ? width - dockWidths.step : key === "Home" ? dockWidths.least : key === "End" ? dockWidths.most : undefined;
    return wanted === undefined ? undefined : dockWidth(wanted, windowWidth);
}
