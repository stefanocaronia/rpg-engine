import { comparableText, sameName } from "../../core/text.ts";
import { readCounter } from "../../counters/index.ts";
import { type Coin, formatAmount, readAmount } from "../../money/index.ts";
import { declaredKind, isDeclaredUncounted, isEmptyField, isStandardField, type Page, type World } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { experienceOf, experienceText } from "./experience.ts";
import { counterOf } from "./sheet.ts";
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
    const shown = lineCounters(world, page, coins, system);
    const experience = lineExperience(world, page, shown);

    if (experience !== undefined) {
        shown[experience.field] = `${String(shown[experience.field])} (${experience.text})`;
    }

    return shown;
}

/** The counters of someone's line as partyCounters gives them, but for the experience's next level, which view gives the dashboard beside its points. */
export function lineCounters(world: World, page: Page, coins: Coin[] | undefined, system: GameSystem | undefined): Record<string, unknown>
{
    const counters = pageCounters(world, page, coins);
    const fields = effectiveFields(world, page);
    const shown: Record<string, unknown> = {};
    const used = new Set<string>();

    for (const { field, whenSet } of system?.statusLine ?? []) {
        const key = sameName(Object.keys(fields), field);

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

    // A field the campaign's settings leave out, as xp with milestones, is not shown (DAT-10).
    const leftOut = (field: string): boolean => (system?.leftOut ?? []).some((name) => comparableText(name) === comparableText(field));

    for (const [field, value] of Object.entries(counters)) {
        const counter = readCounter(value);
        // A number written without a maximum, as age: 30, is not something spent: only money, a counter the system declares or one with limits shows (D-430).
        const resource = counter === undefined || counterOf(world, fields, field, value) !== undefined;

        if (resource && !used.has(field) && !leftOut(field) && !(declaredKind(world, field) === "counter" && counter?.max === undefined && counter?.value === 0)) {
            shown[field] = value;
        }
    }

    // Rolls kept for later, such as a diviner's Portent, when there are any (KEP-1).
    for (const [field, value] of keptRolls(world, page)) {
        shown[field] = value.join(", ");
    }

    return shown;
}

/** The experience among someone's counters, with how many points the next level needs or the level they reach (PRO-6); undefined when it says neither. */
export function lineExperience(world: World, page: Page, counters: Record<string, unknown>): { field: string; text: string; } | undefined
{
    const experience = experienceOf(world, effectiveFields(world, page));
    const text = experience === undefined ? undefined : experienceText(experience);
    const field = experience === undefined ? undefined : sameName(Object.keys(counters), experience.field);
    return field === undefined || text === undefined ? undefined : { field, text };
}

/** The fields of kept rolls a page holds that are not empty, each with its numbers (KEP-1). */
export function keptRolls(world: World, page: Page): [string, number[]][]
{
    return Object.entries(effectiveFields(world, page)).flatMap(([field, value]): [string, number[]][] => {
        const numbers = (Array.isArray(value) ? value : [value]).map(Number).filter((number) => Number.isFinite(number));
        return declaredKind(world, field) !== "rolls" || isEmptyField(value) || numbers.length === 0 ? [] : [[field, numbers]];
    });
}

/** "hp 5/12 · arrows 18": counters as the outputs show them. */
export function countersText(counters: Record<string, unknown>): string
{
    return Object.entries(counters).map(([field, value]) => `${field} ${String(value).trim()}`).join(" · ");
}
