import { readCounter } from "../counters/index.ts";
import { inheritedFields, isEmptyField, isStandardField, type Page, type World } from "../pages/index.ts";

/**
 * The counters of a page as the outputs show them, such as hp 5/12: all those it holds, and those it inherits written as current/max (D-116, as for copies in D-110).
 * A statistic it inherits, such as ac 13, is read from its base.
 */
export function pageCounters(world: World, page: Page): Record<string, unknown>
{
    const own = new Set(Object.entries(page.fields).filter(([, value]) => !isEmptyField(value)).map(([field]) => field));
    const counter = (field: string, value: unknown): boolean => !isStandardField(page.type, field) && readCounter(value) !== undefined;
    return Object.fromEntries(Object.entries(inheritedFields(world, page)).filter(([field, value]) => counter(field, value) && (own.has(field) || readCounter(value)?.max !== undefined)));
}

/** "hp 5/12 · arrows 18": counters as the outputs show them. */
export function countersText(counters: Record<string, unknown>): string
{
    return Object.entries(counters).map(([field, value]) => `${field} ${String(value).trim()}`).join(" · ");
}
