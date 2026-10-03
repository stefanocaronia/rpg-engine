import { readCounter } from "../counters/index.ts";
import { isStandardField, type Page } from "../pages/index.ts";

/** The counters on a page, as they are written, such as hp 5/12; fixed fields are never counters. */
export function pageCounters(page: Page): Record<string, unknown>
{
    return Object.fromEntries(Object.entries(page.fields).filter(([field, value]) => !isStandardField(page.type, field) && readCounter(value) !== undefined));
}

/** "hp 5/12 · arrows 18": counters as the outputs show them. */
export function countersText(counters: Record<string, unknown>): string
{
    return Object.entries(counters).map(([field, value]) => `${field} ${String(value).trim()}`).join(" · ");
}
