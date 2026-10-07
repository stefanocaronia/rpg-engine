// What the classes of a character give (D-201, D-219, PRO-1–PRO-4): the row of each class's table at its level, and the features gained so far, with those its
// subclasses add. The tables are the pages' own; this is where the system's progression meets the pages of a world.
import { listItems, parseFormula } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { type Page, pagesWithName, sectionTitles, systemPageNamed, type World } from "../pages/index.ts";
import { featureParts, fieldName, gainedFeatures, levelledFeatures, type LevelTable, levelTable, mergedFeatures, rowFields } from "../progression/index.ts";

/** A field the rows give, with its value and the items it comes from, such as rage-damage +2 from Barbarian 3 (PRO-2). */
export interface ProgressionValue
{
    field: string;
    value: number | string;
    from: { name: string; level: number; }[];
}

/**
 * What the classes of a character give: the fields of their rows, in the order of their columns, and its features, each with the pages that tell it, more than
 * one when two classes give the same name (PRO-2–PRO-4).
 */
export interface Progression
{
    /** The list the items come from, such as classes, and the list of the parts, such as subclasses. */
    lists: string[];
    values: ProgressionValue[];
    /** The name of the field that holds the features, such as features. */
    featuresField: string;
    features: { name: string; pages: Page[]; }[];
    /** Each feature as a row or a part gives it, before they are merged, with its level and page: what a new level adds, even a feature gained again. */
    gains: { name: string; level: number; page: Page; }[];
    /** The items that give them: each class with its level, and each part that adds features. */
    from: { list: string; name: string; level?: number; }[];
}

/** What the classes in these fields give, by the system's progression; undefined when the system has none or the fields name no class (PRO-1). */
export function progressionOf(world: World, fields: Record<string, unknown>): Progression | undefined
{
    const rule = world.system?.progression;
    const written = rule === undefined ? undefined : readField(fields, rule.list);

    if (rule === undefined || written === undefined || written === null) {
        return undefined;
    }

    const entries = listItems(written).flatMap((item, order) => {
        const page = pageNamed(world, item.name);
        return item.number === undefined || item.number < 1 || page === undefined ? [] : [{ name: item.name, level: item.number, page, order }];
    });
    const values = new Map<string, ProgressionValue>();
    const features: { level: number; order: number; part: number; name: string; page: Page; }[] = [];

    for (const entry of entries) {
        const { table, title } = readTable(entry.page, rule.features);

        if (table === undefined) {
            continue;
        }

        for (const [field, cell] of rowFields(table, entry.level, [...rule.skip, rule.features])) {
            addValue(values, field, cell, { name: entry.page.name, level: entry.level });
        }

        features.push(...gainedFeatures(table, rule.features, entry.level, title).map((gained) => ({ ...gained, order: entry.order, part: 0, page: entry.page })));
    }

    const featuresField = fieldName(rule.features);
    const parts = partsOf(world, fields, rule.parts, entries);

    for (const part of parts) {
        const levelled = levelledFeatures(listItemsOf(readField(part.page.fields, featuresField)));
        features.push(...levelled.flatMap((gained) => (gained === undefined || gained.level > part.level ? [] : [{ ...gained, order: part.order, part: 1, page: part.page }])));
    }

    // Item by item, then level by level; at the same level, a class's own features before its subclass's.
    features.sort((first, second) => first.order - second.order || first.level - second.level || first.part - second.part);
    return {
        lists: rule.parts === undefined ? [rule.list] : [rule.list, rule.parts.list],
        values: [...values.values()],
        featuresField,
        features: mergedFeatures(features).map(({ name }) => ({ name, pages: pagesGiving(features, name) })),
        gains: features.map(({ name, level, page }) => ({ name, level, page })),
        from: [...entries.map((entry) => ({ list: rule.list, name: entry.page.name, level: entry.level })), ...parts.map((part) => ({ list: rule.parts?.list ?? "", name: part.page.name }))],
    };
}

/** The value the progression gives a field, or the features for its features field; undefined for any other field (PRO-2, PRO-3). */
export function progressionValue(progression: Progression | undefined, field: string): number | string | string[] | undefined
{
    if (progression === undefined) {
        return undefined;
    }

    if (comparableText(field) === comparableText(progression.featuresField)) {
        return progression.features.map((feature) => feature.name);
    }

    return progression.values.find((value) => comparableText(value.field) === comparableText(field))?.value;
}

/**
 * The pages that tell a feature a character has, in the order of the classes, and its section's title, found by the name with or without its value in
 * parentheses (PRO-4); undefined when the character has no such feature.
 */
export function featureSource(progression: Progression | undefined, name: string): { pages: Page[]; title: string; } | undefined
{
    const wanted = comparableText(featureParts(name).name);
    const feature = progression?.features.find((candidate) => comparableText(featureParts(candidate.name).name) === wanted);
    return feature === undefined ? undefined : { pages: feature.pages, title: featureParts(feature.name).name };
}

/**
 * What validate says of the progression on a page (PRO-1, PRO-4): an item whose page has no table of levels, or no row at its level; a part whose page names no
 * item, names one the list lacks, or lists features without a level.
 */
export function progressionProblems(world: World, page: Page, fields: Record<string, unknown>): Problem[]
{
    const rule = world.system?.progression;
    const written = rule === undefined ? undefined : readField(fields, rule.list);

    if (rule === undefined || written === undefined || written === null) {
        return [];
    }

    const items = listItems(written).map((item, order) => ({ ...item, order, page: pageNamed(world, item.name) }));
    const entries = items.flatMap((item) => (item.number === undefined || item.page === undefined ? [] : [{ name: item.name, level: item.number, page: item.page, order: item.order }]));
    // An item without a level or without a page gives nothing (PRO-1).
    const unread = items.filter((item) => item.number === undefined || item.page === undefined).map((item): Problem => ({
        path: page.path,
        message: item.page === undefined
            ? `${rule.list} on ${page.name} names ${item.name}, which has no page, so it gives nothing.`
            : `${item.name} in ${rule.list} on ${page.name} has no level, so it gives nothing.`,
        fix: item.page === undefined
            ? `write ${item.name} with its table of levels, or link one of the system's, such as [[${systemExample(world, rule.list)}]] ${item.number ?? 1}`
            : `write ${page.name}, set ${rule.list} with each level, such as [[${item.page.name}]] 1`,
    }));
    const rows = entries.flatMap((entry): Problem[] => {
        const { table } = readTable(entry.page, rule.features);
        const message = table === undefined
            ? `${entry.page.name} has no table with a ${rule.features} column whose first column counts levels, so ${rule.list} on ${page.name} gives nothing from it.`
            : !table.rows.has(entry.level)
            ? `${entry.page.name} has no row for level ${entry.level} in its table, so ${rule.list} on ${page.name} gives nothing from it.`
            : undefined;
        return message === undefined ? [] : [{ path: page.path, message, fix: table === undefined ? `write ${entry.page.name} with its table of levels, as the system's do` : `check the level of ${entry.page.name} in ${rule.list}` }];
    });
    return [...unread, ...rows, ...formulaProblems(page, rule, entries), ...partProblems(world, page, fields, rule, entries)];
}

/** A formula an item's page gives that does not read, so that the character has no value from it (PRO-5). */
function formulaProblems(page: Page, rule: NonNullable<NonNullable<World["system"]>["progression"]>, entries: { page: Page; }[]): Problem[]
{
    return entries.flatMap((entry) =>
        (rule.formulas ?? []).flatMap((field): Problem[] => {
            const text = readField(entry.page.fields, field);

            if (text === undefined || text === null) {
                return [];
            }

            try {
                parseFormula(String(text));
                return [];
            } catch (error) {
                const why = error instanceof Error ? error.message : String(error);
                return [{ path: page.path, message: `${field} on ${entry.page.name} does not read, so ${page.name} has none from it: ${why}`, fix: `write ${entry.page.name}, set ${field} as a formula` }];
            }
        })
    );
}

/** The name of a page of the system that an item of the list may link to, for an example: the first one that has a table of levels. */
function systemExample(world: World, list: string): string
{
    const rule = world.system?.progression;
    const page = rule === undefined ? undefined : world.system?.pages.find((candidate) => readTable(candidate, rule.features).table !== undefined);
    return page?.name ?? list;
}

/** The pages that give a feature by this name, with or without its value in parentheses, each once, in the order they come (D-224). */
function pagesGiving(features: { name: string; page: Page; }[], name: string): Page[]
{
    const wanted = comparableText(featureParts(name).name);
    return [...new Set(features.filter((feature) => comparableText(featureParts(feature.name).name) === wanted).map((feature) => feature.page))];
}

const tables = new WeakMap<Page, { table?: LevelTable; title: (name: string) => string | undefined; }>();

/** The table of levels of a page, read once for each page, and how a name of its features column is a title of the page: as it is, or as the singular of one. */
function readTable(page: Page, column: string): { table?: LevelTable; title: (name: string) => string | undefined; }
{
    const known = tables.get(page);

    if (known !== undefined) {
        return known;
    }

    const titles = sectionTitles(page.body);
    const title = (name: string): string | undefined => titles.find((candidate) => [comparableText(name), `${comparableText(name)}s`].includes(comparableText(candidate)));
    const read = { table: levelTable(page.body, column), title };
    tables.set(page, read);
    return read;
}

/** A cell as a value: a whole number as a number, anything else as written. Two items with the same column add up their numbers; otherwise the first counts (PRO-2). */
function addValue(values: Map<string, ProgressionValue>, field: string, cell: string, from: { name: string; level: number; }): void
{
    const value = /^\d+$/.test(cell) ? Number(cell) : cell;
    const known = values.get(comparableText(field));

    if (known === undefined) {
        values.set(comparableText(field), { field, value, from: [from] });
        return;
    }

    if (typeof known.value === "number" && typeof value === "number") {
        values.set(comparableText(field), { ...known, value: known.value + value, from: [...known.from, from] });
    }
}

/** The parts the fields name whose page names an item of the list, each with the level of that item (PRO-3). */
function partsOf(world: World, fields: Record<string, unknown>, parts: { list: string; field: string; } | undefined, entries: { name: string; level: number; page: Page; order: number; }[]): { page: Page; level: number; order: number; }[]
{
    if (parts === undefined) {
        return [];
    }

    return listItems(readField(fields, parts.list)).flatMap((item) => {
        const page = pageNamed(world, item.name);
        const owner = page === undefined ? undefined : ownerName(page, parts.field);
        const entry = owner === undefined ? undefined : entries.find((candidate) => [comparableText(candidate.name), comparableText(candidate.page.name)].includes(comparableText(owner)));
        return page === undefined || entry === undefined ? [] : [{ page, level: entry.level, order: entry.order }];
    });
}

function partProblems(world: World, page: Page, fields: Record<string, unknown>, rule: NonNullable<NonNullable<World["system"]>["progression"]>, entries: { name: string; page: Page; }[]): Problem[]
{
    if (rule.parts === undefined) {
        return [];
    }

    const { list, field } = rule.parts;
    const featuresField = fieldName(rule.features);
    return listItems(readField(fields, list)).flatMap((item): Problem[] => {
        const part = pageNamed(world, item.name);

        if (part === undefined) {
            return [];
        }

        const owner = ownerName(part, field);
        const unlevelled = levelledFeatures(listItemsOf(readField(part.fields, featuresField))).some((gained) => gained === undefined);
        const message = owner === undefined
            ? `${part.name} names no ${field}, so it adds no ${featuresField} to ${page.name}.`
            : !entries.some((entry) => [comparableText(entry.name), comparableText(entry.page.name)].includes(comparableText(owner)))
            ? `${part.name} is a part of ${owner}, which is not in ${rule.list} on ${page.name}: it adds nothing.`
            : unlevelled
            ? `${part.name} lists ${featuresField} without the level at which each comes, such as "Improved Critical 3": those are left out.`
            : undefined;
        return message === undefined
            ? []
            : [{
                path: page.path,
                message,
                fix: owner === undefined
                    ? `write ${part.name}, set ${field}=[[...]] and ${featuresField} with their levels`
                    : unlevelled
                    ? `write ${part.name}, set ${featuresField} with the level of each, such as [Improved Critical 3]`
                    : `add ${owner} to ${rule.list} on ${page.name}, or remove ${part.name} from ${list}`,
            }];
    });
}

/** The name of the item a part names in its field, such as Fighter for class: [[Fighter]]. */
function ownerName(page: Page, field: string): string | undefined
{
    return listItems(readField(page.fields, field))[0]?.name;
}

/** The items of a list as text, a single value as a list of one. */
function listItemsOf(value: unknown): string[]
{
    return (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]).map((item) => String(item));
}

/** The page with this name, the campaign's first, then the system's (SYS-3). */
function pageNamed(world: World, name: string): Page | undefined
{
    const [named] = pagesWithName(world, name);
    return named ?? systemPageNamed(world, name);
}

function readField(fields: Record<string, unknown>, field: string): unknown
{
    return Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}
