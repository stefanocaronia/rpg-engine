// What the system says of a page's fields: their key, counters, uses, item lists, who keeps the sheet
import { comparableText, sameName } from "../../../core/text.ts";
import { declaredKind, inheritedFields, isEmptyField, type Page, type World } from "../../../pages/index.ts";

/** The name under which the fields hold a field, in any case. */
export function keyOf(fields: Record<string, unknown>, field: string): string | undefined
{
    return sameName(Object.keys(fields), field);
}

/** Whether the system gives the limits of a counter by this name (FOR-1). */
export function isSystemCounter(world: World, field: string): boolean
{
    return Object.keys(world.system?.formulas?.counters ?? {}).some((name) => comparableText(name) === comparableText(field));
}

/** The list whose items' pages give a field as a formula, as classes for spell-save-dc (PRO-5); undefined when none does. */
export function itemList(world: World, field: string): string | undefined
{
    return Object.entries(world.system?.itemFormulas ?? {}).find(([, names]) => names.some((name) => comparableText(name) === comparableText(field.trim())))?.[0];
}

/** Whether a counter of the system comes back with a rest (DAT-9): who keeps the sheet has it full until it spends it. */
export function isUse(world: World, field: string): boolean
{
    return (world.system?.uses ?? []).some((name) => name.endsWith("*") ? comparableText(field).startsWith(comparableText(name.slice(0, -1))) : comparableText(name) === comparableText(field));
}

/**
 * The name, as the game system declares it, of a counter that starts at 0 where a page does not hold it yet, as temporary hit points or experience points:
 * declared a counter, with no maximum and not a use that comes back with a rest (CNT-8, D-266). Undefined for any other.
 */
export function startingAtZero(world: World, field: string): string | undefined
{
    const declared = Object.keys(world.system?.fields ?? {}).find((name) => comparableText(name) === comparableText(field.trim()));
    const limits = Object.entries(world.system?.formulas?.counters ?? {}).find(([counter]) => comparableText(counter) === comparableText(field.trim()))?.[1];
    return declared !== undefined && declaredKind(world, declared) === "counter" && limits?.max === undefined && limits?.refill === undefined ? declared : undefined;
}

/**
 * Whether a page keeps the sheet of the system (DAT-2, D-225): the player character, and a companion with a level, written or given by its classes, or that
 * derives from no creature. A fighter who derives from her race does, a wolf with its stat block does not; nor does any other page.
 */
export function hasSheet(world: World, page: Page): boolean
{
    // A level or classes the page inherits count too, as a companion deriving from a creature with classes.
    return page.type === "character" && keepsSheet(world, page.fields.role === "companion" ? inheritedFields(world, page) : page.fields);
}

/** Whether a character with these fields keeps the sheet (DAT-2): the player character, and a companion with a level or classes, or that derives from no creature. */
export function keepsSheet(world: World, fields: Record<string, unknown>): boolean
{
    // The level's field is the game's, as its list is: a game without levels has none (review of 17 October).
    const progression = world.system?.progression;
    const list = progression === undefined ? undefined : keyOf(fields, progression.list);
    const level = progression?.level === undefined ? undefined : (keyOf(fields, progression.level) ?? progression.level);
    const levelled = (level !== undefined && !isEmptyField(fields[level])) || (list !== undefined && !isEmptyField(fields[list]));
    return fields.role === "pc" || (fields.role === "companion" && (isEmptyField(fields.creature) || levelled));
}
