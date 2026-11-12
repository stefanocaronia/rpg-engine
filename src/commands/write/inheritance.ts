// How a write reaches the pages that derive from the page: followers, keepers, own values, bases, the log lines for their counters
import type { Context } from "../../core/context.ts";
import { listItemNames } from "../../core/formula.ts";
import { appendLogEntry } from "../../core/log.ts";
import { comparableText, valueNamed, withArticle } from "../../core/text.ts";
import { formatCounter, readCounter } from "../../counters/index.ts";
import { type Coin, formatAmount, readAmount } from "../../money/index.ts";
import {
    baseFieldOf,
    baseValue,
    concernsPlayer,
    declaredKind,
    derivedPages,
    type FieldChange,
    followersOf,
    inheritedFields,
    introductionFollowersOf,
    introductionText,
    isDeclaredUncounted,
    isEmptyField,
    isNeverInherited,
    isStandardField,
    keepersOf,
    linksIn,
    type Page,
    type PageType,
    removedFieldName,
    sectionFollowersOf,
    systemPageNamed,
    textParts,
    withPage,
    type World,
    writtenFieldName,
} from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { systemBaseHint } from "../shared/campaign/world.ts";
import { keepersNote } from "../shared/notes.ts";
import { weightlessNote } from "../shared/sheet/sheet.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { guarded } from "./checks.ts";

/**
 * The pages that change with a page a write changed (INH-11): all those deriving from it when it is new or derives from another creature now;
 * else those that read a field it changed, or show the section it wrote.
 */
export function followersOfWrite(now: World, before: Page | undefined, after: Page): { pages: Page[]; why: string; }
{
    if (!isBaseType(after.type)) {
        return { pages: [], why: "" };
    }

    const changed = before === undefined ? [] : changedNames(before, after);

    if (before === undefined || changed.some((field) => comparableText(field) === baseFieldOf(after.type))) {
        return { pages: derivedPages(now, after), why: `since they derive from ${after.name}` };
    }

    const byField = changed.map((field) => ({ name: field, pages: followersOf(now, after, field) }));
    const bySection = changedParts(before.body, after.body).map((part) => ({ name: part === "" ? "a secret without a name" : `#${part}`, pages: part === "" ? derivedPages(now, after) : sectionFollowersOf(now, after, part) }));
    const byIntroduction = introductionText(before.body) === introductionText(after.body) ? [] : [{ name: "the introduction", pages: introductionFollowersOf(now, after) }];
    const reasons = [...byField, ...bySection, ...byIntroduction].filter((reason) => reason.pages.length > 0);
    const pages = new Set(reasons.flatMap((reason) => reason.pages));
    return { pages: now.pages.filter((page) => pages.has(page)), why: `since they read ${reasons.map((reason) => reason.name).join(", ")} from ${after.name}` };
}

/** The names of the sections and secrets that a text has with another text, gained or no longer has; "" when its secrets without a name changed, which every derived page shows. */
function changedParts(before: string, after: string): string[]
{
    const texts = (body: string): Map<string, string> => new Map(textParts(body).filter((part) => part.name !== "").map((part) => [comparableText(part.name), part.text]));
    const unnamed = (body: string): string => textParts(body).filter((part) => part.name === "").map((part) => part.text).join("\n");
    const old = texts(before);
    const now = texts(after);
    const names = new Map(textParts(`${before}\n\n${after}`).filter((part) => part.name !== "").map((part) => [comparableText(part.name), part.name]));
    const named = [...names].filter(([key]) => old.get(key) !== now.get(key)).map(([, name]) => name);
    return unnamed(before) === unnamed(after) ? named : [...named, ""];
}

/**
 * One public line for each counter that a write changed through inheritance on a page that concerns the player: a page that follows the base written,
 * or the page itself when its creature changes. Its name, the field, before and after (INH-10, INH-11). Each page comes as it was and as it is.
 */
export function logCounterChanges(root: string, context: Context, world: World, now: World, pages: [Page, Page][], coins: Coin[] | undefined): void
{
    for (const [before, after] of pages.filter(([, page]) => concernsPlayer(now, page))) {
        const old = inheritedFields(world, before);

        for (const [field, value] of Object.entries(inheritedFields(now, after)).filter(([name]) => !isStandardField(after.type, name) && !isDeclaredUncounted(now, name))) {
            const was = countedText(valueNamed(old, field), coins);
            const is = countedText(value, coins);

            if (was !== undefined && is !== undefined && was !== is) {
                appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: after.name, field, before: was, after: is }));
            }
        }
    }
}

/** A counter or money as the log writes it; undefined for any other value. */
function countedText(value: unknown, coins: Coin[] | undefined): number | string | undefined
{
    const purse = coins === undefined ? undefined : readAmount(value, coins);
    const counter = readCounter(value);
    return purse !== undefined && coins !== undefined ? formatAmount(purse, coins) : counter === undefined ? undefined : formatCounter(counter);
}

/**
 * A list written whole that leaves out items the page read from a base, as an elf's Perception from its race: said, since the page no longer reads them (INH-7).
 */
export function droppedFromBaseNotes(now: World, page: Page, set: Record<string, unknown> | undefined): string[]
{
    return Object.entries(set ?? {}).filter(([, value]) => Array.isArray(value)).flatMap(([field, value]) => {
        const base = baseValue(now, page, field);

        if (base === undefined || !Array.isArray(base.value)) {
            return [];
        }

        const held = new Set(listItemNames(value).map(comparableText));
        const missing = listItemNames(base.value).filter((name) => !held.has(comparableText(name)));
        const them = missing.length === 1 ? "it" : "them";
        return missing.length === 0 ? [] : [`${field} on ${page.name} leaves out ${missing.join(", ")}, which it read from ${base.base.name}: if the character keeps ${them}, add ${them}, such as add ${field}=${missing[0]}.`];
    });
}

/** What a new page is told of its base; a weight is asked only of an item with no base to look for, which would give one (LOAD-1). */
export function baseNotesOrWeight(system: GameSystem | undefined, now: World, page: Page): string[]
{
    const notes = [...derivesFromNothingNote(now, page), ...noBaseNote(now, page)];
    return notes.length > 0 ? notes : weightlessNote(system, now, page);
}

/** A page created with a name that other pages give as their creature or item, though it is not one: they derive from nothing (INH-2). */
function derivesFromNothingNote(now: World, page: Page): string[]
{
    return (["creature", "item"] as const).filter((field) => field !== page.type).flatMap((field) => {
        const linking = now.pages.filter((other) => baseFieldOf(other.type) === field && linksIn(other.fields[field]).some((name) => comparableText(name) === comparableText(page.name)));
        return linking.length === 0
            ? []
            : [`${linking.map((other) => other.name).join(", ")} name ${page.name} as their ${field}, but it is ${withArticle(page.type ?? "free page")}: they derive from nothing until ${field} links to ${withArticle(field)}.`];
    });
}

/**
 * For a creature or an item created without a base, when the game system has pages of its type: it may be a kind of one of them (D-165, SYS-7).
 * When another field already links to one, the field to use instead.
 */
function noBaseNote(now: World, page: Page): string[]
{
    const field = baseFieldOf(page.type);

    if (page.type === "character" || field === undefined || !isEmptyField(page.fields[field])) {
        return [];
    }

    // Only a free field links to its base by mistake: a field the system declares, such as magic, links to something else (D-164).
    const free = Object.entries(page.fields).filter(([name]) => declaredKind(now, name) === undefined);
    const elsewhere = free.flatMap(([name, value]) => linksIn(value).map((link) => ({ name, page: systemPageNamed(now, link) }))).find((link) => link.page?.type === field);

    if (elsewhere?.page !== undefined) {
        const linked = elsewhere.page;
        const system = linked.system ?? "";
        return [
            `${page.name} links to ${linked.name}, ${withArticle(field)} of the system ${system}, in ${elsewhere.name}: if it is a kind of it, the field is ${field}, `
            + `such as write "${page.name}", set ${field}=[[${linked.name}]], unset ${elsewhere.name}.`,
        ];
    }

    // A story item, such as a letter, writes no field of the system: it is no kind of one of its items.
    if (page.type === "item" && !Object.keys(page.fields).some((name) => declaredKind(now, name) !== undefined)) {
        return [];
    }

    const hint = systemBaseHint(now, field, field);
    return hint === "" ? [] : [`${page.name} derives from no ${field}:${hint.replace(" If it", " if it")}`];
}

/** "Not changed, since they hold their own fiuto: Grigio (fiuto 2)": for each field a write changed on a base, the pages deriving from it that keep their own value. */
export function keepersNotes(now: World, before: Page, after: Page): string[]
{
    if (!isBaseType(after.type)) {
        return [];
    }

    return changedNames(before, after).flatMap((field) => {
        const keepers = keepersOf(now, after, field).map((keeper) => `${keeper.name} (${field} ${valueText(valueNamed(inheritedFields(now, keeper), field))})`);
        const note = keepersNote(keepers, field);
        return note === "" ? [] : [note];
    });
}

/** After its creature changes, the values a page keeps that its new bases give otherwise: they may belong to the old one (D-125). */
export function ownValuesNote(now: World, before: Page, after: Page, coins: Coin[] | undefined): string[]
{
    const field = baseFieldOf(after.type);

    if (field === undefined || !changedNames(before, after).some((name) => comparableText(name) === field)) {
        return [];
    }

    const kept = Object.entries(after.fields).filter(([name, value]) => !isEmptyField(value) && !isNeverInherited(name)).flatMap(([name, value]) => {
        const base = baseValue(now, after, name);
        return base === undefined || JSON.stringify(base.value) === JSON.stringify(value) ? [] : [{ field: name, value, base }];
    });

    if (kept.length === 0) {
        return [];
    }

    // A current/max counter or money goes back to the base's value with change; anything else is removed.
    const back = kept.map(({ field, value, base }) => {
        const mine = guarded(value, coins, false);
        const theirs = guarded(base.value, coins, false);
        return mine !== undefined && mine.kind === theirs?.kind ? `change ${field} to ${mine.kind === "money" ? `"${theirs.text}"` : theirs.text}` : `unset ${field}`;
    });
    const listed = kept.map(({ field, value, base }) => `${field} ${valueText(value)} (${base.base.name} gives ${valueText(base.value)})`);
    return [`${after.name} keeps its own ${listed.join(", ")}. If they came from its old ${field}: ${back.join(", ")}.`];
}

/** The fields whose value a write changed on a page. */
export function changedNames(before: Page, after: Page): string[]
{
    return [...new Set([...Object.keys(before.fields), ...Object.keys(after.fields)])].filter((field) => JSON.stringify(before.fields[field]) !== JSON.stringify(after.fields[field]));
}

/** A value as the outputs show it: a list as its items, anything else as written. */
function valueText(value: unknown): string
{
    return Array.isArray(value) ? value.map(String).join(", ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
}

/** Whether pages of this type can be bases: creatures and items (INH-1). */
function isBaseType(type: PageType | undefined): boolean
{
    return type === "creature" || type === "item";
}

/**
 * The names of the fields a write changed, as the page writes them (INH-5). A value equal to the base's is not written (D-125): it is no change, unless the page
 * held another, which it holds no more ("ac again as Lupo").
 */
export function writtenNames(world: World, page: Page | undefined, change: FieldChange, after: Page): { set: string[]; again: string[]; unset: string[]; add: string[]; remove: string[]; }
{
    const names = (fields: string[]): string[] => fields.map((field) => (page === undefined ? field : writtenFieldName(world, page, field)));
    const removed = (change.unset ?? []).map((field) => (page === undefined ? field : removedFieldName(page, field)));
    const [set, add, remove] = [Object.keys(change.set ?? {}), Object.keys(change.add ?? {}), Object.keys(change.remove ?? {})].map(names);
    const now = withPage(world, page, after);
    const base = (field: string): string | undefined => baseValue(now, after, field)?.base.name;
    // What the page held and holds no more, without being removed: it reads it from a base again. What it was given and does not hold: it reads it from a base all the same.
    const gone = page === undefined ? [] : Object.keys(page.fields).filter((field) => !isEmptyField(page.fields[field]) && !Object.hasOwn(after.fields, field) && !removed.includes(field) && base(field) !== undefined);
    const asBase = [...set, ...add, ...remove].filter((field, index, all) => all.indexOf(field) === index && !gone.includes(field) && !Object.hasOwn(after.fields, field) && base(field) !== undefined);
    const shown = (field: string): boolean => !gone.includes(field) && !asBase.includes(field);
    return {
        set: set.filter((field) => shown(field) && JSON.stringify(page?.fields[field]) !== JSON.stringify(after.fields[field])),
        again: [...byBase(gone, base, "again as"), ...byBase(asBase, base, "as")],
        unset: removed,
        add: add.filter(shown),
        remove: remove.filter(shown),
    };
}

/** "hp, ac again as Wolf": fields grouped by the base they are read from. */
function byBase(fields: string[], base: (field: string) => string | undefined, how: string): string[]
{
    return [...new Set(fields.map(base))].map((name) => `${fields.filter((field) => base(field) === name).join(", ")} ${how} ${name ?? ""}`);
}
