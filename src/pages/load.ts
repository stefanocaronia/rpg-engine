// What a character carries weighs (D-432, LOAD-1): its stacks by their bundle, its items with what they hold, and its coins.
import { valueNamed } from "../core/text.ts";
import { inheritedFields } from "./inheritance.ts";
import { readEntry } from "./stack-entry.ts";
import { entryKind, entryPage, stacksOf } from "./stacks.ts";
import { containerFieldOf } from "./standard-fields.ts";
import { type Page, textsIn, validHoldersOf, type World } from "./world.ts";

/** How a system weighs what one carries: the field of an item's weight, and how many coins make one unit of weight. */
export interface LoadRule
{
    field: string;
    coins?: number;
}

/** The weight a holder carries, coins included (LOAD-1). */
export function carriedWeight(world: World, rule: LoadRule, holder: Page): number
{
    return carriedLoad(world, rule.field, holder) + coinsWeight(inheritedFields(world, holder), rule.coins);
}

/** The unit the system's weights are written in, as lb; undefined when no page says. */
export function weightUnit(world: World, field: string): string | undefined
{
    const written = (world.system?.pages ?? []).map((page) => page.fields[field]).find((value) => typeof value === "string" && /\p{L}/u.test(value));
    return typeof written === "string" ? /(\p{L}[\p{L}.]*)\s*$/u.exec(written)?.[1] : undefined;
}

/** The weight a holder carries (LOAD-1): each stack by its pieces, at its kind's weight over its bundle; each item at its own weight or its base's, and what it holds. */
function carriedLoad(world: World, field: string, holder: Page, seen = new Set<Page>()): number
{
    const container = containerFieldOf(holder.type);
    const stacks = stacksOf(world, holder);
    const counted = new Set<Page>();

    return (container === undefined ? [] : textsIn(holder.fields[container])).reduce((total, entry) => {
        const kind = entryKind(world, entry)?.kind;
        const stack = kind === undefined ? undefined : stacks.find((candidate) => candidate.kind === kind);

        if (stack !== undefined) {
            const first = !counted.has(stack.kind);
            counted.add(stack.kind);
            const bundle = Number(stack.kind.fields.bundle);
            return first ? total + (weightOf(world, field, stack.kind) * stack.count) / (Number.isSafeInteger(bundle) && bundle > 1 ? bundle : 1) : total;
        }

        const read = readEntry(entry);
        const page = read.shape === "text" ? undefined : entryPage(world, read.page);

        if (page === undefined || page.type !== "item" || seen.has(page) || validHoldersOf(world, page)[0] !== holder) {
            return total;
        }

        seen.add(page);
        return total + weightOf(world, field, page) + carriedLoad(world, field, page, seen);
    }, 0);
}

/** A page's weight as a number of the system's unit, its own or its base's: 1 lb, 1/2 lb, 1½ lb, 1,000 lb; 0 when it has none. */
function weightOf(world: World, field: string, page: Page): number
{
    const value = valueNamed(inheritedFields(world, page), field);
    const match = typeof value === "string" ? /^\s*([\d,]*)\s*(½|¼|¾|\d+\/\d+)?\s*[\p{L}.]*\s*$/u.exec(value) : null;

    if (typeof value === "number") {
        return value;
    }

    if (match === null || (match[1] === "" && match[2] === undefined)) {
        return 0;
    }

    const whole = match[1] === "" ? 0 : Number(match[1].replace(/,/g, ""));
    const part = match[2] === undefined ? 0 : ({ "½": 0.5, "¼": 0.25, "¾": 0.75 } as Record<string, number>)[match[2]] ?? Number(match[2].split("/")[0]) / Number(match[2].split("/")[1]);
    return whole + part;
}

/** What the coins of a purse weigh, as many coins as the system says make one unit of weight; 0 when it says none. */
function coinsWeight(fields: Record<string, unknown>, perUnit: number | undefined): number
{
    const money = valueNamed(fields, "money");
    const coins = typeof money === "string" ? [...money.matchAll(/(\d+)\s*\p{L}+/gu)].reduce((total, match) => total + Number(match[1]), 0) : 0;
    return perUnit === undefined ? 0 : coins / perUnit;
}
