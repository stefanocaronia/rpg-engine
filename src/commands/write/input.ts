// Reads what set, add and remove give: assignments, lists, money, and leaves out fields the system works out
import { numberOf } from "../../core/formula.ts";
import type { Problem } from "../../core/problem.ts";
import { comparableText } from "../../core/text.ts";
import { type Coin, formatAmount, namesCoins, readAmount } from "../../money/index.ts";
import { declaredKind, linkListItems, listFieldNames, type Page, type PageType, readFieldValue, type World } from "../../pages/index.ts";
import { effectiveFields } from "../shared/sheet/effect-layer.ts";
import { computedField, directBonuses } from "../shared/sheet/worked-out.ts";
import { signedText } from "../shared/sheet/worked-text.ts";

/** Fields from field=value pairs, each value read as a link, links, a number, true or false, a list or text; or from an object, as they are. */
export function readFields(fields: string[] | Record<string, unknown>): Record<string, unknown>
{
    if (!Array.isArray(fields)) {
        return Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, listFromText(name, value)]));
    }

    // The same name twice would be lost in one object; the same field in another case is refused later, with the other changes.
    const entries = fields.map(readAssignment);
    const repeated = entries.find(([name], index) => entries.findIndex(([other]) => other === name) !== index);

    if (repeated !== undefined) {
        throw new Error(`The field ${repeated[0]} is given twice: give each field once.`);
    }

    return Object.fromEntries(entries);
}

/** Items for list fields: each value gives one item, or several when it is a list; the same field may come more than once. */
export function readListItems(fields: string[] | Record<string, unknown>): Record<string, unknown[]>
{
    // No prototype: a field named constructor or toString is a field like any other.
    const items: Record<string, unknown[]> = Object.create(null) as Record<string, unknown[]>;

    for (const [name, given] of Array.isArray(fields) ? fields.map(readAssignment) : Object.entries(fields)) {
        const value = listFromText(name, given);
        items[name] = [...(items[name] ?? []), ...(Array.isArray(value) ? value : [value])];
    }

    return items;
}

function readAssignment(assignment: string): [string, unknown]
{
    const separator = assignment.indexOf("=");
    const value = assignment.slice(separator + 1).trim();

    if (separator <= 0 || value === "") {
        throw new Error(`Write a field as field=value, not "${assignment}". To remove a field, use unset.`);
    }

    return [assignment.slice(0, separator).trim(), readFieldValue(value)];
}

/**
 * Text given through MCP to a field that is always a list, such as "[[A]], [[B]]", or written as a list, such as "[dex, int]", read as the command line reads it
 * (D-136); any other value as it is.
 */
function listFromText(name: string, value: unknown): unknown
{
    if (typeof value !== "string") {
        return value;
    }

    // Links separated by commas are a list, as on the command line, for a list of the game system too, such as spells (T-167).
    const writtenAsList = /^\[(?!\[).*\]$/s.test(value.trim()) || linkListItems(value) !== undefined;
    return writtenAsList || listFieldNames.some((field) => comparableText(field) === comparableText(name)) ? readFieldValue(value) : value;
}

/**
 * A field that is always a list, or that the game system declares one, given one item, such as contains=[[Locanda]] or tags=boss, holds a list of that one item;
 * text with commas is left to the checks that ask for a list, but a road's stops, links and lengths taking turns, which are split at the commas (ROA-6).
 */
export function oneItemLists(world: World, set: Record<string, unknown>, type: PageType | undefined): Record<string, unknown>
{
    const isList = (name: string): boolean => listFieldNames.some((field) => comparableText(field) === comparableText(name)) || declaredKind(world, name) === "list";

    const listOf = (name: string, value: unknown): unknown => {
        if (typeof value !== "string" || !isList(name) || value.trim() === "") {
            return value;
        }

        return comparableText(name) === "stops" && type === "place" ? value.split(",").map((item) => item.trim()) : value.includes(",") ? value : [value];
    };

    return Object.fromEntries(Object.entries(set).map(([name, value]) => [name, listOf(name, value)]));
}

/**
 * The fields given to set without those the game system works out on the page as the write leaves it, a copy in the open scene or a page that gets its base in
 * the same write included (FOR-7), with a note that gives the values the system works out and what they come from.
 */
export function withoutComputed(world: World, target: Page | undefined, set: Record<string, unknown>, name: string, type: PageType | undefined): { set: Record<string, unknown>; note?: string; }
{
    const after: Page = { ...(target ?? { name, path: "", body: "" }), type: type ?? target?.type, fields: { ...(target?.fields ?? {}), ...set } };
    const fields = effectiveFields(world, after);
    const computed = Object.entries(set).flatMap(([field, given]) => {
        const found = computedField(world, field, fields);
        return found === undefined ? [] : [{ ...found, given }];
    });

    if (computed.length === 0) {
        return { set };
    }

    const kept = Object.fromEntries(Object.entries(set).filter(([field]) => !computed.some((found) => comparableText(found.name) === comparableText(field))));
    const values = computed.map((found) => {
        const value = signedText(world, found.name, found.value);
        return `${found.name} ${value}${numberOf(found.given) === found.value ? ", as you gave it" : ` (you gave ${String(found.given)})`}`;
    });
    const sources = [...new Set(computed.flatMap((found) => found.from))];
    const bonuses = [...new Set(computed.flatMap((found) => directBonuses(world, found)))];
    const bonus = bonuses.length === 0 ? "" : ` A bonus such as ${bonuses[0]} comes from an effect, for what gives one, such as a magic item.`;
    const note = `Not written, the system ${world.system?.name ?? ""} works ${computed.length === 1 ? "it" : "them"} out: ${values.join("; ")}. They come from ${sources.join(", ")}.${bonus}`;
    return { set: kept, note };
}

/** The items given to add or remove without the fields the game system works out on the page, which no list change writes (FOR-7, D-200), with a note. */
export function listsWithoutComputed(world: World, target: Page | undefined, lists: Record<string, unknown[]> | undefined): { lists?: Record<string, unknown[]>; note?: string; }
{
    if (lists === undefined || target === undefined) {
        return { lists };
    }

    const fields = effectiveFields(world, target);
    const computed = Object.keys(lists).flatMap((field) => computedField(world, field, fields) ?? []);

    if (computed.length === 0) {
        return { lists };
    }

    const kept = Object.fromEntries(Object.entries(lists).filter(([field]) => !computed.some((found) => comparableText(found.name) === comparableText(field))));
    const values = computed.map((found) => `${found.name} ${signedText(world, found.name, found.value)}`).join("; ");
    const sources = [...new Set(computed.flatMap((found) => found.from))].join(", ");
    return {
        lists: Object.keys(kept).length === 0 ? undefined : kept,
        note: `Not written, the system ${world.system?.name ?? ""} works ${computed.length === 1 ? "it" : "them"} out: ${values}. ${computed.length === 1 ? "It comes" : "They come"} from ${sources}.`,
    };
}

/** Money given to set, written as the engine writes it (MON-2): from the coin worth most, by first names. A field the game system declares is never money (SYS-8). */
export function asAmounts(world: World, set: Record<string, unknown>, coins: Coin[] | undefined): Record<string, unknown>
{
    return Object.fromEntries(
        Object.entries(set).map(([field, value]) => {
            const purse = coins === undefined || declaredKind(world, field) !== undefined ? undefined : readAmount(value, coins);
            return [field, purse === undefined || coins === undefined ? value : formatAmount(purse, coins)];
        }),
    );
}

/** What a write should say about money: a value that names coins but does not read as money, and coins that cannot be read (MON-2, MON-8). */
export function moneyNotesOf(world: World, page: string, set: Record<string, unknown> | undefined, coins: Coin[] | undefined, problem: Problem | undefined): string[]
{
    // A field the game system declares is never money (SYS-8).
    const texts = Object.entries(set ?? {}).filter(([field, value]) => typeof value === "string" && declaredKind(world, field) === undefined) as [string, string][];
    const unread = coins === undefined ? [] : texts.filter(([, value]) => readAmount(value, coins) === undefined && namesCoins(value, coins));
    const notes = unread.map(([field, value]) => `${field} on ${page} is "${value}", which is not money: write the coins one after the other, such as ${field}=12 ${coins?.[0].name ?? ""}, to count them.`);
    const looksLikeMoney = texts.some(([, value]) => /\d+\s*\p{L}/u.test(value));
    return problem !== undefined && looksLikeMoney ? [...notes, `The campaign's coins cannot be read, so no money is counted: ${problem.message} To fix it, ${problem.fix}.`] : notes;
}
