// The experience points of a character (D-205, D-233, PRO-6): how many it lacks for the next level, the least its level needs, and the level they reach that its
// classes have not.
import { listItems, numberOf } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { isInParty, type World } from "../pages/index.ts";
import { effectiveFields } from "./effect-layer.ts";

/**
 * A character's points as the system counts them: its level, the least its level needs, the next level and the points it needs, and the highest level the
 * points reach beyond its own.
 */
export interface Experience
{
    field: string;
    points: number;
    level: number;
    least?: number;
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
    const least = needs(level);
    const next = needs(level + 1);
    return {
        field: rule.field,
        points,
        level,
        ...(least === undefined ? {} : { least }),
        ...(next === undefined ? {} : { next: { level: level + 1, points: next } }),
        ...(reached.length === 0 ? {} : { due: Math.max(...reached) }),
        ...(rule.rules === undefined ? {} : { rules: rule.rules }),
    };
}

/** What the points say of the levels (PRO-6): how many the next level needs, the level they reach that is due, or the least the level needs when they are below it. */
export type LevelNeed = { needs: number; level: number; } | { due: number; } | { least: number; level: number; };

/** What the points say of the levels, as the dashboard writes it in its language (PRO-6); undefined at the last level of the table. */
export function levelNeed(experience: Experience): LevelNeed | undefined
{
    if (experience.least !== undefined && experience.points < experience.least) {
        return { least: experience.least, level: experience.level };
    }

    if (experience.due !== undefined) {
        return { due: experience.due };
    }

    return experience.next === undefined ? undefined : { needs: experience.next.points - experience.points, level: experience.next.level };
}

/**
 * "550 to level 3", "level 3 due", or "at least 6500 at level 5" for points below what the level needs: what the line and the sheet say beside the points
 * (PRO-6); undefined at the last level of the table.
 */
export function experienceText(experience: Experience): string | undefined
{
    const need = levelNeed(experience);

    if (need === undefined) {
        return undefined;
    }

    return "least" in need ? `at least ${need.least} at level ${need.level}` : "due" in need ? `level ${need.due} due` : `${need.needs} to level ${need.level}`;
}

/**
 * "Ennio has the xp for level 3: level up with the player, …": said while the points reach a level the classes have not (PRO-6); a companion's choices are the
 * master's (D-205, D-209). Undefined when they reach none.
 */
export function levelDueNote(name: string, experience: Experience | undefined, companion: boolean): string | undefined
{
    if (experience?.due === undefined) {
        return undefined;
    }

    const rules = experience.rules === undefined ? "" : `: read rules "${experience.rules}"`;
    const how = companion
        ? "level up the companion: the class and what the new level asks are yours to choose, as the story has shaped the companion, or the player's if they made it"
        : "level up with the player, out of the story, now or at the next rest as they prefer; they choose the class and what the new level asks";
    return `${name} has the ${experience.field} for level ${experience.due}: ${how}${rules}.`;
}

/**
 * The note of a change that brings the points to a new level, with what `levelUp` gives of the part on what a level gives, empty once told (PRO-6, D-97): none when
 * that level was already due, and then the part is not asked for.
 */
export function newLevelNotes(name: string, before: Experience | undefined, after: Experience | undefined, companion: boolean, levelUp: () => string): string[]
{
    const note = levelDueNote(name, after, companion);

    if (note === undefined || (before?.due !== undefined && before.due >= (after?.due ?? 0))) {
        return [];
    }

    const part = levelUp();
    return [part === "" ? note : `${note} ${part}`];
}

/** "Ennio is level 5: a character of that level has at least 6500 xp": said when a write leaves the points below what the level needs (PRO-6). */
export function leastNotes(name: string, before: Experience | undefined, after: Experience | undefined): string[]
{
    const low = (experience: Experience | undefined): boolean => experience?.least !== undefined && experience.points < experience.least;
    return after === undefined || !low(after) || (low(before) && before?.level === after.level)
        ? []
        : [`${name} is level ${after.level}: a character of that level has at least ${after.least ?? 0} ${after.field}: change ${name}, field ${after.field}, to ${after.least ?? 0}.`];
}

/**
 * The living player characters and companions whose points are below what their level needs, or are written with a maximum, which points never have (PRO-6), as
 * validate reports them.
 */
export function experienceProblems(world: World): Problem[]
{
    const field = world.system?.progression?.experience?.field;
    return world.pages.filter(isInParty).flatMap((page): Problem[] => {
        const experience = experienceOf(world, effectiveFields(world, page));
        const written = experience === undefined ? undefined : readCounter(fieldOf(page.fields, experience.field));
        const raw = field === undefined ? undefined : fieldOf(page.fields, field);

        // Points written as text, such as 350 XP, count for nothing.
        if (field !== undefined && raw !== undefined && raw !== null && readCounter(raw) === undefined) {
            return [{ path: page.path, message: `${page.name} has ${field} "${String(raw)}", which is no number of points.`, fix: `write ${page.name}, set ${field} as a whole number, such as ${field}=0` }];
        }

        if (experience !== undefined && written?.max !== undefined) {
            return [{
                path: page.path,
                message: `${page.name} has ${experience.field} written with a maximum, ${written.max}: experience points have none, and change stops at it.`,
                fix: `write ${page.name}, set ${experience.field}=${written.value}`,
            }];
        }

        return experience?.least === undefined || experience.points >= experience.least ? [] : [{
            path: page.path,
            message: `${page.name} has ${experience.points} ${experience.field} at level ${experience.level}, which needs at least ${experience.least}.`,
            fix: `change ${page.name}, field ${experience.field}, to ${experience.least}`,
        }];
    });
}

function fieldOf(fields: Record<string, unknown>, field: string): unknown
{
    return valueNamed(fields, field);
}
