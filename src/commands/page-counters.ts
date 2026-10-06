import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { type Coin, formatAmount, readAmount } from "../money/index.ts";
import { declaredKind, isDeclaredUncounted, isEmptyField, isStandardField, type Page, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { signedText } from "./worked-out.ts";

/**
 * The counters of a page as the outputs show them, such as hp 5/12: all those it holds, and those it inherits written as current/max (D-116, as for copies in D-110).
 * A statistic it inherits, such as ac 13, is read from its base. With the campaign's coins, its money too, held or inherited (MON-7).
 */
export function pageCounters(world: World, page: Page, coins?: Coin[]): Record<string, unknown>
{
    const given = effectsOf(page).flatMap((effect) => effect.values.map(([field]) => field));
    const own = new Set([...Object.entries(page.fields).filter(([, value]) => !isEmptyField(value)).map(([field]) => field), ...given].map(comparableText));
    // A field the game system declares as a number, text or list is never counted, and no field it declares is money (SYS-8).
    const counter = (field: string, value: unknown): boolean =>
        !isStandardField(page.type, field) && !isDeclaredUncounted(world, field) && readCounter(value) !== undefined && (own.has(comparableText(field)) || readCounter(value)?.max !== undefined);

    return Object.fromEntries(
        Object.entries(effectiveFields(world, page)).flatMap(([field, value]): [string, unknown][] => {
            const purse = coins === undefined || isStandardField(page.type, field) || declaredKind(world, field) !== undefined ? undefined : readAmount(value, coins);
            return purse !== undefined && coins !== undefined ? [[field, formatAmount(purse, coins)]] : counter(field, value) ? [[field, value]] : [];
        }),
    );
}

/**
 * The counters of the player character or a companion as their line shows them (DAT-2): first the fields of the system's status line, in its order, numbers it
 * declares too, one marked so only when it is not at zero; then the other counters, but one the system declares without a maximum, such as xp, at zero.
 */
export function partyCounters(world: World, page: Page, coins: Coin[] | undefined, system: GameSystem | undefined): Record<string, unknown>
{
    const counters = pageCounters(world, page, coins);
    const fields = effectiveFields(world, page);
    const shown: Record<string, unknown> = {};
    const used = new Set<string>();

    for (const { field, whenSet } of system?.statusLine ?? []) {
        const key = Object.keys(fields).find((name) => comparableText(name) === comparableText(field));

        // A value written by hand as a map or a list, such as ac: {base: 14, shield: 2}, is not one a line can show.
        if (key === undefined || isEmptyField(fields[key]) || !["number", "string"].includes(typeof fields[key])) {
            continue;
        }

        used.add(key);
        const value = counters[key] ?? fields[key];

        if (!whenSet || readCounter(value)?.value !== 0) {
            // A modifier shows its sign, as the system declares it (FOR-8).
            shown[key] = typeof value === "number" ? signedText(world, key, value) : value;
        }
    }

    for (const [field, value] of Object.entries(counters)) {
        const counter = readCounter(value);

        if (!used.has(field) && !(declaredKind(world, field) === "counter" && counter?.max === undefined && counter?.value === 0)) {
            shown[field] = value;
        }
    }

    return shown;
}

/**
 * The fields of the system's character sheet that a page lacks (DAT-2): a player character's, or a companion's that does not derive from a creature; none for other pages.
 */
export function missingSheetFields(system: GameSystem | undefined, world: World, page: Page): string[]
{
    const sheeted = page.fields.role === "pc" || (page.fields.role === "companion" && page.fields.creature === undefined);

    if (system === undefined || page.type !== "character" || !sheeted) {
        return [];
    }

    const fields = Object.keys(effectiveFields(world, page)).map(comparableText);
    return system.sheet.filter((field) => !fields.includes(comparableText(field)));
}

/** "hp 5/12 · arrows 18": counters as the outputs show them. */
export function countersText(counters: Record<string, unknown>): string
{
    return Object.entries(counters).map(([field, value]) => `${field} ${String(value).trim()}`).join(" · ");
}
