// How the page draws the values of any game (D-272, D-273): from the kind of each value, never from the names of one game's fields.
import type { Member, SheetGroup, SheetValue } from "./data.ts";

/** How a value is drawn: a counter as pips up to 10, as a bar beyond, as a track centred on zero when it goes below; a list as chips; long text as a paragraph. */
export type Widget = "pips" | "bar" | "track" | "number" | "list" | "text";

/** How a group is laid out: a few short numbers as tiles, items as a table, anything else as rows. */
export type GroupLayout = "tiles" | "table" | "rows";

// Longer text than this reads as a paragraph, such as a personality trait.
const shortText = 40;

// More numbers than this in a group read better as rows, such as the skills.
const mostTiles = 8;

const widgetOrder: Widget[] = ["number", "bar", "track", "pips", "list", "text"];

export function widgetOf(value: SheetValue): Widget
{
    const counter = value.counter;

    if (counter?.max !== undefined) {
        return (counter.min ?? 0) < 0 ? "track" : counter.max <= 10 ? "pips" : "bar";
    }

    if (value.items !== undefined || value.always !== undefined) {
        return "list";
    }

    return value.text.length > shortText ? "text" : "number";
}

export function groupLayout(group: SheetGroup): GroupLayout
{
    if (group.items !== undefined) {
        return "table";
    }

    return group.values.length <= mostTiles && group.values.every((value) => widgetOf(value) === "number") ? "tiles" : "rows";
}

/** A group's values in the order the page shows them: numbers, then counters, then lists, then text, each in the system's order. */
export function orderedValues(values: SheetValue[]): SheetValue[]
{
    return [...values].sort((first, second) => widgetOrder.indexOf(widgetOf(first)) - widgetOrder.indexOf(widgetOf(second)));
}

/** The counter the party's strip shows for someone: the first of their line with a maximum, such as hit points or health. */
export function stripCounter(member: Member): SheetValue | undefined
{
    return member.counters.find((value) => value.counter?.max !== undefined);
}

/** Where a value sits on a track from its minimum to its maximum, and where zero is, from 0 to 1. */
export function trackPlaces(counter: { value: number; min?: number; max?: number; }): { zero: number; value: number; }
{
    const min = counter.min ?? 0;
    const span = Math.max(1, (counter.max ?? counter.value) - min);
    const place = (number: number): number => Math.min(1, Math.max(0, (number - min) / span));
    return { zero: place(0), value: place(counter.value) };
}
