// How the page draws the values of any game (D-272, D-273): from the kind of each value, never from the names of one game's fields.
import type { Member, SheetCards, SheetGroup, SheetValue, ShownRoll } from "./data.ts";

/**
 * How a value is drawn: a number on its way from one mark to the next, as the experience toward the next level, with a bar under it (D-284); a counter as pips up
 * to 10, as a bar beyond, as a track centred on zero when it goes below; a list as chips; long text as a paragraph.
 */
export type Widget = "progress" | "pips" | "bar" | "track" | "number" | "list" | "text";

/** How a group is laid out: a few short numbers as tiles, items as a table, anything else as rows. */
export type GroupLayout = "tiles" | "table" | "rows";

// Longer text than this reads as a paragraph, such as a personality trait.
const shortText = 40;

// More numbers than this in a group read better as rows, such as the skills.
const mostTiles = 8;

// The rolls the page shows at first: those of the last half hour (D-302).
const halfHour = 30 * 60 * 1000;

// A number with its progress stays among the numbers, in the system's order.
const widgetOrder: Widget[] = ["number", "bar", "track", "pips", "list", "text"];

export function widgetOf(value: SheetValue): Widget
{
    if (value.progress !== undefined) {
        return "progress";
    }

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

/**
 * The groups of a sheet as the page lays them out (D-295): in the rail, those the system puts there, in its order, or else those of a few short numbers; the
 * others in the system's order of cards, those it does not name after them as the sheet has them.
 */
export function arrangedGroups(groups: SheetGroup[], cards?: SheetCards): { rail: SheetGroup[]; others: SheetGroup[]; }
{
    const at = (names: string[], group: SheetGroup): number => names.findIndex((name) => name.toLowerCase() === group.name.toLowerCase());
    const placed = cards !== undefined && cards.rail.length > 0;
    const inRail = (group: SheetGroup): boolean => (placed ? at(cards.rail, group) >= 0 : groupLayout(group) === "tiles");

    const rank = (group: SheetGroup): number => {
        const place = cards === undefined ? -1 : at(cards.order, group);
        return place < 0 ? Number.MAX_SAFE_INTEGER : place;
    };

    const rail = groups.filter(inRail).sort((first, second) => (placed ? at(cards.rail, first) - at(cards.rail, second) : 0));
    const others = groups.filter((group) => !inRail(group)).map((group, index) => ({ group, index }));
    return { rail, others: others.sort((first, second) => rank(first.group) - rank(second.group) || first.index - second.index).map(({ group }) => group) };
}

/** The column of each card, by its height, in its order into the shortest column, the first of the shortest when two are even (D-383). */
export function columnsByHeight(heights: number[], count: number): number[]
{
    const filled = Array.from({ length: Math.max(1, count) }, () => 0);
    return heights.map((height) => {
        const shortest = filled.indexOf(Math.min(...filled));
        filled[shortest] += height;
        return shortest;
    });
}

/**
 * The rolls the page shows (D-302): of those read, the ones of the last half hour since the player last cleared the list, and as many older ones as they asked
 * for; how many older ones the page has read, and whether there are more, read or still in the log, unless the list was cleared before them.
 */
export function rollWindow(rolls: ShownRoll[], given: { now: number; cleared: number; older: number; unread: boolean; }): { shown: ShownRoll[]; before: number; more: boolean; }
{
    const since = given.now - halfHour;
    const kept = rolls.filter((roll) => rollTime(roll) >= given.cleared);
    const before = kept.filter((roll) => rollTime(roll) < since);
    const recent = kept.filter((roll) => rollTime(roll) >= since);
    const older = given.older === 0 ? [] : before.slice(-given.older);
    const unread = given.unread && (rolls.length === 0 || rollTime(rolls[0]) >= given.cleared);
    return { shown: [...older, ...recent], before: before.length, more: before.length > older.length || unread };
}

/** A group's values in the order the page shows them: numbers, then counters, then lists, then text, each in the system's order. */
export function orderedValues(values: SheetValue[]): SheetValue[]
{
    return [...values].sort((first, second) => widgetRank(first) - widgetRank(second));
}

/** The counter the party's strip shows for someone: the first of their line with a maximum, such as hit points or health. */
export function stripCounter(member: Member): SheetValue | undefined
{
    return member.counters.find((value) => value.counter?.max !== undefined);
}

/** Where a number is between its two marks, from 0 to 1: full when the marks are one. */
export function progressShare(progress: { value: number; from: number; to: number; }): number
{
    return progress.to > progress.from ? Math.min(1, Math.max(0, (progress.value - progress.from) / (progress.to - progress.from))) : 1;
}

/** Where a value sits on a track from its minimum to its maximum, and where zero is, from 0 to 1. */
export function trackPlaces(counter: { value: number; min?: number; max?: number; }): { zero: number; value: number; }
{
    const min = counter.min ?? 0;
    const span = Math.max(1, (counter.max ?? counter.value) - min);
    const place = (number: number): number => Math.min(1, Math.max(0, (number - min) / span));
    return { zero: place(0), value: place(counter.value) };
}

function widgetRank(value: SheetValue): number
{
    const widget = widgetOf(value);
    return widgetOrder.indexOf(widget === "progress" ? "number" : widget);
}

/** When a roll was made, in milliseconds; 0 for a time that cannot be read. */
function rollTime(roll: ShownRoll): number
{
    const time = Date.parse(roll.at);
    return Number.isNaN(time) ? 0 : time;
}
