// The most a sheet holds (D-449, LIM-1, LIM-2): a number written no higher than the system's formula, as an ability score of 20, and a list no longer, as
// the spells prepared; what an item or an effect raises is no part of it.
import { numberOf } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { type FieldChange, type Page, textsIn, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { formulaValue, hasSheet, keepsSheet } from "./worked-out.ts";

/** Refuses a change of a sheet that writes a number above its most, or makes a list longer than its most (LIM-1); before anything is written. */
export function checkLimits(world: World, system: GameSystem | undefined, page: Page | undefined, name: string, change: FieldChange): void
{
    // The most reads what effects give, as a manual that raises a score's most; the number checked is the one written.
    const after = fieldsAfter(page === undefined ? {} : effectiveFields(world, page), change);

    // A character that keeps a sheet after the change, as an npc becoming a companion with classes.
    if (system === undefined || (page !== undefined && page.type !== "character") || !keepsSheet(world, after)) {
        return;
    }

    // A page that begins to keep a sheet has all of it checked; one that kept it, what the change writes.
    const begins = page === undefined || !hasSheet(world, page);

    for (const [field, formula] of Object.entries(system.atMost)) {
        const touched = begins || [change.set, change.add].some((values) => Object.keys(values ?? {}).some((key) => comparableText(key) === comparableText(field)));
        const most = touched ? formulaValue(world, after, formula) : undefined;
        const over = most === undefined ? undefined : overMost(after, field, most);

        if (most !== undefined && over !== undefined) {
            const fix = "first" in over
                ? `remove one first, such as remove ${field}=${over.first}`
                : `write it as ${most} at most; what an item or a feature raises above it is worked out, never written`;
            throw new Error(`${name} would have ${over.text}, more than ${most}, the most ${system.name} allows: ${fix}. Nothing changed.`);
        }
    }
}

/** Sheets written by hand above their most (LIM-2). */
export function limitProblems(world: World, system: GameSystem | undefined): Problem[]
{
    return Object.entries(system?.atMost ?? {}).flatMap(([field, formula]) =>
        world.pages.filter((page) => page.system === undefined && hasSheet(world, page)).flatMap((page): Problem[] => {
            const own = valueNamed(page.fields, field);
            const most = own === undefined ? undefined : formulaValue(world, effectiveFields(world, page), formula);
            const over = most === undefined ? undefined : overMost({ [field]: own }, field, most);
            const fix = over === undefined ? "" : "first" in over ? `write ${page.name}, remove ${field}=${over.first}` : `write ${page.name}, set ${field}=${most}`;
            return over === undefined ? [] : [{ path: page.path, message: `${page.name} has ${over.text}, more than ${most}, the most.`, fix }];
        })
    );
}

/** What is above the most in a field, "str 21" or "7 in prepared" with its first item; undefined when it is not. */
function overMost(fields: Record<string, unknown>, field: string, most: number): { text: string; first?: string; } | undefined
{
    const value = valueNamed(fields, field);
    const items = Array.isArray(value) ? textsIn(value) : undefined;

    if (items !== undefined) {
        return items.length <= most ? undefined : { text: `${items.length} in ${field}`, first: items[0] };
    }

    const number = numberOf(value);
    return number === undefined || number <= most ? undefined : { text: `${field} ${number}` };
}

/** The fields a change leaves, on the fields a page has: what it sets, adds, removes and unsets. */
function fieldsAfter(fields: Record<string, unknown>, change: FieldChange): Record<string, unknown>
{
    const after: Record<string, unknown> = { ...fields, ...change.set };
    const keyOf = (field: string): string => Object.keys(after).find((key) => comparableText(key) === comparableText(field)) ?? field;

    for (const [field, values] of Object.entries(change.add ?? {})) {
        const key = keyOf(field);
        after[key] = [...textsIn(after[key]), ...values.flatMap(textsIn)];
    }

    for (const [field, values] of Object.entries(change.remove ?? {})) {
        const key = keyOf(field);
        const removed = values.flatMap(textsIn).map(comparableText);
        after[key] = textsIn(after[key]).filter((item) => !removed.includes(comparableText(item)));
    }

    for (const field of change.unset ?? []) {
        delete after[keyOf(field)];
    }

    return after;
}
