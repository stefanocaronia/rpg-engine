// The values effects give for a while, as a layer over a page (D-123, EFF-3): read by every command that shows or changes a page's fields.
import { numberOf } from "../core/formula.ts";
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { type Effect, formatEffect, readEffects } from "../effects/index.ts";
import { declaredKind, inheritedFields, type Page, readFieldValue, type World } from "../pages/index.ts";
import { hasSheet, withWorkedOut } from "./worked-out.ts";

/** The effects field of a page or copy, written in any case (EFF-1). */
export function effectsField(page: Page): unknown
{
    return Object.entries(page.fields).find(([field]) => comparableText(field) === "effects")?.[1];
}

/** The effects a page or copy holds; none when its field cannot be read, which validate reports and effect refuses to touch (EFF-12). */
export function effectsOf(page: Page): Effect[]
{
    const read = readEffects(effectsField(page));
    return "effects" in read ? read.effects : [];
}

/**
 * The fields a page reads with its effects over them (EFF-3): from the newest effect that gives a field, then the page, then its bases; a bonus field adds up
 * the effects that give it (FOR-5). Over them, what the game system works out (FOR-3).
 */
export function effectiveFields(world: World, page: Page): Record<string, unknown>
{
    // A world and its pages never change: a page's fields are worked out once in each world, and each caller gets its own copy (D-194).
    let byPage = readByWorld.get(world);

    if (byPage === undefined) {
        byPage = new WeakMap();
        readByWorld.set(world, byPage);
    }

    const known = byPage.get(page) ?? layeredFields(world, page);
    byPage.set(page, known);
    return { ...known };
}

const readByWorld = new WeakMap<World, WeakMap<Page, Record<string, unknown>>>();

function layeredFields(world: World, page: Page): Record<string, unknown>
{
    const fields = { ...inheritedFields(world, page) };

    for (const effect of effectsOf(page)) {
        for (const [field, value] of effect.values) {
            const key = Object.keys(fields).find((name) => comparableText(name) === comparableText(field)) ?? field;
            fields[key] = declaredKind(world, field) === "bonus" ? (numberOf(fields[key]) ?? 0) + (numberOf(valueOf(value)) ?? 0) : valueOf(value);
        }
    }

    return withWorkedOut(world, fields, hasSheet(world, page));
}

/** The newest effect that gives a field to a page: change changes its value, not the page's (EFF-7). */
export function effectGiving(page: Page, field: string): Effect | undefined
{
    return effectsOf(page).findLast((effect) => effect.values.some(([name]) => comparableText(name) === comparableText(field)));
}

/**
 * "ac 13 → 15": the values an effect changes on a page, as they read before and after it; and "ac stays 17, from Scudo della fede" for a value
 * another effect still gives, which was written while this one was on (EFF-3).
 */
export function valuesChanged(world: World, before: Page, after: Page, effect: Effect): string[]
{
    const was = effectiveFields(world, before);
    const is = effectiveFields(world, after);
    const read = (fields: Record<string, unknown>, field: string): string => String(Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1] ?? "none");

    const own = effect.values.map(([field]) => field).flatMap((field) => {
        if (read(was, field) !== read(is, field)) {
            return [`${field} ${read(was, field)} → ${read(is, field)}`];
        }

        const other = effectGiving(after, field);
        return other === undefined || comparableText(other.name) === comparableText(effect.name) ? [] : [`${field} stays ${read(is, field)}, from ${other.name}: check it`];
    });
    // The counters whose maximum follows what the effect gives, as hp after Aid (FOR-6).
    const given = new Set(effect.values.map(([field]) => comparableText(field)));
    const counters = Object.keys(is).filter((field) => !given.has(comparableText(field)) && readCounter(is[field])?.max !== undefined && read(was, field) !== read(is, field));
    return [...own, ...counters.map((field) => `${field} ${read(was, field)} → ${read(is, field)}`)];
}

/** The effect with a new value for one of its fields, as change writes it (EFF-7). */
export function withValue(effect: Effect, field: string, value: string): Effect
{
    return { ...effect, values: effect.values.map(([name, old]): [string, string] => [name, comparableText(name) === comparableText(field) ? value : old]) };
}

/** A page or copy with these effects instead of its own. */
export function withEffects(page: Page, effects: Effect[]): Page
{
    const fields = Object.fromEntries(Object.entries(page.fields).filter(([field]) => comparableText(field) !== "effects"));
    return { ...page, fields: effects.length === 0 ? fields : { ...fields, effects: effects.map(formatEffect) } };
}

/** A value of an effect as a page would hold it: a number, a link, a counter as text; text as it is when it does not read. */
function valueOf(value: string): unknown
{
    try {
        return readFieldValue(value);
    } catch {
        return value;
    }
}
