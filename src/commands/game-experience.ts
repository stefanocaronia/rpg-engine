// The experience points of a character (D-205, D-233, PRO-6): how many it lacks for the next level, and the level they reach that its classes have not.
import { listItems, numberOf } from "../core/formula.ts";
import { comparableText } from "../core/text.ts";
import type { World } from "../pages/index.ts";

/** A character's points as the system counts them: its level, the next level and the points it needs, and the highest level the points reach beyond its own. */
export interface Experience
{
    field: string;
    points: number;
    level: number;
    next?: { level: number; points: number; };
    due?: number;
    rules?: string;
}

/**
 * The experience of a character with these fields, when the system counts it (PRO-6): the level is the sum of the numbers of the progression's list. Undefined
 * without a system that counts it, without points, or without a level.
 */
export function experienceOf(world: World, fields: Record<string, unknown>): Experience | undefined
{
    const progression = world.system?.progression;
    const rule = progression?.experience;
    const table = rule === undefined ? undefined : Object.entries(world.system?.formulas?.tables ?? {}).find(([name]) => comparableText(name) === comparableText(rule.table))?.[1];
    const points = rule === undefined ? undefined : numberOf(fieldOf(fields, rule.field));
    const level = progression === undefined ? 0 : listItems(fieldOf(fields, progression.list)).reduce((total, item) => total + (item.number ?? 0), 0);

    if (rule === undefined || table === undefined || points === undefined || level === 0) {
        return undefined;
    }

    const needs = (target: number): number | undefined => table.rows.find(([key]) => Number(key) === target)?.[1];
    const reached = table.rows.filter(([key, value]) => Number(key) > level && value <= points).map(([key]) => Number(key));
    const next = needs(level + 1);
    return {
        field: rule.field,
        points,
        level,
        ...(next === undefined ? {} : { next: { level: level + 1, points: next } }),
        ...(reached.length === 0 ? {} : { due: Math.max(...reached) }),
        ...(rule.rules === undefined ? {} : { rules: rule.rules }),
    };
}

/** "550 to level 3", or "level 3 due": what the line and the sheet say beside the points (PRO-6); undefined at the last level of the table. */
export function experienceText(experience: Experience): string | undefined
{
    if (experience.due !== undefined) {
        return `level ${experience.due} due`;
    }

    return experience.next === undefined ? undefined : `${experience.next.points - experience.points} to level ${experience.next.level}`;
}

/** "Ennio has the xp for level 3: level up with the player, …": said while the points reach a level the classes have not (PRO-6); undefined when they reach none. */
export function levelDueNote(name: string, experience: Experience | undefined): string | undefined
{
    if (experience?.due === undefined) {
        return undefined;
    }

    const rules = experience.rules === undefined ? "" : `: read rules "${experience.rules}"`;
    return `${name} has the ${experience.field} for level ${experience.due}: level up with the player, who chooses the class and what the new level asks${rules}.`;
}

/** The note of a change that brings the points to a new level (PRO-6): none when that level was already due, or none is. */
export function newLevelNotes(name: string, before: Experience | undefined, after: Experience | undefined): string[]
{
    const note = levelDueNote(name, after);
    return note === undefined || (before?.due !== undefined && before.due >= (after?.due ?? 0)) ? [] : [note];
}

function fieldOf(fields: Record<string, unknown>, field: string): unknown
{
    return Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}
