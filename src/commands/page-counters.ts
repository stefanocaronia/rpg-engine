import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { type Coin, formatAmount, readAmount } from "../money/index.ts";
import { declaredKind, isDeclaredUncounted, isEmptyField, isStandardField, type Page, type World } from "../pages/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";

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

/** "hp 5/12 · arrows 18": counters as the outputs show them. */
export function countersText(counters: Record<string, unknown>): string
{
    return Object.entries(counters).map(([field, value]) => `${field} ${String(value).trim()}`).join(" · ");
}
