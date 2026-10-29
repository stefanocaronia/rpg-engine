// The values effects give for a while, as a layer over a page (D-123, EFF-3): read by every command that shows or changes a page's fields.
import { fieldsRead } from "../../core/formula.ts";
import { comparableText, valueNamed } from "../../core/text.ts";
import { readCounter } from "../../counters/index.ts";
import { type Effect, formatEffect, readEffects } from "../../effects/index.ts";
import { declaredKind, type Page, type World } from "../../pages/index.ts";
import { hasSheet, signedText, withEffectValues, withWorkedOut } from "./worked-out.ts";

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

    const known = byPage.get(page) ?? withWorkedOut(world, withEffectValues(world, page), hasSheet(world, page));
    byPage.set(page, known);
    return { ...known };
}

const readByWorld = new WeakMap<World, WeakMap<Page, Record<string, unknown>>>();

/** The newest effect that gives a field to a page: change changes its value, not the page's (EFF-7). */
export function effectGiving(page: Page, field: string): Effect | undefined
{
    return effectsOf(page).findLast((effect) => effect.values.some(([name]) => comparableText(name) === comparableText(field)));
}

/**
 * "ac 13 → 15": the values an effect changes on a page, as they read before and after it; and "ac stays 17, from Scudo della fede" for a value
 * another effect still gives, which was written while this one was on (EFF-3). A bonus that changes nothing else is said to be read by nothing.
 */
export function valuesChanged(world: World, before: Page, after: Page, effect: Effect): string[]
{
    const was = effectiveFields(world, before);
    const is = effectiveFields(world, after);
    const value = (fields: Record<string, unknown>, field: string): unknown => valueNamed(fields, field);
    const read = (fields: Record<string, unknown>, field: string): string => valueText(world, field, value(fields, field));
    const changed = (field: string): boolean => read(was, field) !== read(is, field);
    const given = new Set(effect.values.map(([field]) => comparableText(field)));
    // Anything else that changed with it, worked out or not, but the list of effects itself.
    const followed = [...new Set([...Object.keys(was), ...Object.keys(is)])].some((field) => !given.has(comparableText(field)) && comparableText(field) !== "effects" && changed(field));

    const own = effect.values.map(([field]) => field).flatMap((field) => {
        if (changed(field)) {
            // An item's bonus is read by who has it, as a weapon's by its wielder's attack.
            const unread = !followed && after.type !== "item" && declaredKind(world, field) === "bonus" ? `, which nothing of ${after.name} reads` : "";
            return [`${field} ${read(was, field)} → ${read(is, field)}${unread}`];
        }

        const other = effectGiving(after, field);
        return other === undefined || comparableText(other.name) === comparableText(effect.name) ? [] : [`${field} stays ${read(is, field)}, from ${other.name}: check it`];
    });
    // The counters whose maximum follows what the effect gives, as hp after Aid (FOR-6), the numbers worked out right from it, as ac from Mage Armor's
    // unarmored-base (FOR-3), and those of the status line, as ac after dex.
    const counters = Object.keys(is).filter((field) => !given.has(comparableText(field)) && readCounter(is[field])?.max !== undefined && changed(field));
    const computed = (world.system?.formulas?.computed ?? [])
        .filter(([name, formula]) => !given.has(comparableText(name)) && fieldsRead(formula).some((field) => given.has(comparableText(field))) && changed(name))
        .map(([name]) => name);
    const status = (world.system?.statusLine ?? []).map((entry) => entry.field).filter((field) => !given.has(comparableText(field)) && changed(field));
    const others = [...counters, ...computed, ...status].filter((field, index, all) => all.findIndex((other) => comparableText(other) === comparableText(field)) === index);
    return [...own, ...others.map((field) => `${field} ${read(was, field)} → ${read(is, field)}`)];
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

/** "+2", "Dueling, Defense", "none": a value as an effect's output says it, with its sign when the system declares a modifier or a bonus (FOR-8). */
function valueText(world: World, field: string, value: unknown): string
{
    if (value === undefined || value === null) {
        return "none";
    }

    return typeof value === "number" ? signedText(world, field, value) : Array.isArray(value) ? value.map(String).join(", ") : String(value);
}
