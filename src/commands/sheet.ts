// The character sheet of the game system (D-204, D-207, DAT-2): its groups as show gives them, the fields a character still lacks, and the names a list takes (SYS-8).
import { listItemNames, numberOf } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { type Counter, readCounter } from "../counters/index.ts";
import { baseChain, containerFieldOf, declaredKind, entryKind, entryPage, inheritedFields, isEmptyField, isStandardField, linksIn, type Page, readEntry, stackName, stacksOf, textsIn, validHoldersOf, type World } from "../pages/index.ts";
import { fieldName } from "../progression/index.ts";
import type { GameSystem, SheetEntry, SheetGroup, SystemWords } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { experienceOf, experienceText, type LevelNeed, levelNeed } from "./game-experience.ts";
import { givenItems, progressionOf } from "./progression.ts";
import { counterLimits, formulaValue, hasSheet, isUse, itemLines, itemList, signedText, workedFields, workedLine, workedMaximum, workedParts } from "./worked-out.ts";

/** What status says of the sheet before there is a player character (DAT-2): what is written, what only when it applies, what the system works out, and the lists it names. */
export interface SheetSummary
{
    system: string;
    written: string[];
    whenTheyApply: string[];
    workedOut: string[];
    lists: string[];
}

/** The sheet of the game system as status gives it before there is a player character (DAT-2); undefined when the system has none. */
export function sheetSummary(system: GameSystem): SheetSummary | undefined
{
    if (system.sheet.length === 0) {
        return undefined;
    }

    const entries = system.sheet.flatMap((group) => group.entries);
    const workedOut = system.sheet.flatMap((group) => {
        const fields = entryFields(group.entries);
        // A group the system works out whole, but for what is written only when it applies, is named as a group, such as Saving Throws.
        const required = entryFields(group.entries.filter((entry) => !entry.optional));
        const whole = required.length > 0 && required.every((field) => isWorkedOut(system, field));
        return whole ? [group.name] : fields.filter((field) => isWorkedOut(system, field));
    });
    const onSheet = sheetFields(system);
    const lineOnly = system.statusLine.map((entry) => entry.field).filter((field) => !isWorkedOut(system, field) && !onSheet.has(comparableText(field)));
    return {
        system: system.name,
        written: remindedFields(system),
        // A use is written full by the engine (DAT-9): no one writes it by hand.
        whenTheyApply: [...entries.filter((entry) => entry.optional).flatMap((entry) => entryFields([entry]).filter((field) => !isWorkedOut(system, field) && !isSystemUse(system, field))), ...lineOnly],
        workedOut,
        // "save-proficiencies (str, dex, con…)": a few names whole, many by the first two, as the system writes them.
        lists: Object.entries({ ...system.values, ...system.sheetValues }).filter(([field]) => onSheet.has(comparableText(field))).map(([field, names]) =>
            `${field} (${names.length <= 6 ? names.join(", ") : `such as ${names.slice(0, 2).join(", ")}`})`
        ),
    };
}

/**
 * The fields of the system's character sheet that a page lacks (DAT-2): a player character's, or a companion's that does not derive from a creature; none for other
 * pages. Those written only when they apply are never missing (D-206), nor those the system works out (FOR-7).
 */
export function missingSheetFields(system: GameSystem | undefined, world: World, page: Page): string[]
{
    if (system === undefined || !hasSheet(world, page)) {
        return [];
    }

    const fields = new Set(Object.entries(effectiveFields(world, page)).filter(([, value]) => !isEmptyField(value)).map(([field]) => comparableText(field)));
    return remindedFields(system).filter((field) => !fields.has(comparableText(field)));
}

/**
 * What write says once when a character joins the party (DAT-2): the fields its sheet still lacks, then the system's notes on the groups of the sheet, such as
 * that the personality is the player's (D-206).
 */
export function joiningNotes(system: GameSystem | undefined, world: World, page: Page): string[]
{
    if (system === undefined || !hasSheet(world, page)) {
        return [];
    }

    const missing = missingSheetFields(system, world, page);
    const lacks = missing.length === 0 ? [] : [`${page.name}'s sheet of the system ${system.name} still lacks, by these names: ${missing.join(", ")}.`];
    return [...lacks, ...system.sheet.flatMap((group) => (group.note === undefined ? [] : [`${group.name}: ${group.note}`]))];
}

/** A value of a character's sheet as data, which the dashboard draws (D-272), with the text the chat gives it. */
export interface SheetValue
{
    field: string;
    /** As the game system declares the field, such as modifier, counter or list; undefined when it does not. */
    kind?: string;
    /** As the sheet shows it: "+3", "18/24", "Cleric 3". */
    text: string;
    /** A counter's value, with its limits as the field writes them or the system works them out (FOR-6). */
    counter?: Counter;
    /** The names of a list, links read as their names. */
    items?: string[];
    /** What the parts of the character add to a list, apart and not counted with it, such as a domain's spells (PRO-7). */
    always?: { from: string[]; items: string[]; };
    /** How many marks it earns: one for each list of the system's marks it reads, as a proficiency (D-217). */
    marks: number;
    /** For money, its coins from the largest, each with its metal when the game names it, as the dashboard draws them (D-431). */
    coins?: { coin: string; count: number; metal?: string; }[];
    /** What the sheet shows beside it, such as +2 by str, or how many points the next level needs (PRO-6). */
    beside?: string;
    /** The field shown beside it, such as str-mod by str: a check that names it is rolled from this value too (ASK-12). */
    besideField?: string;
    /** The free roll the dashboard offers in its explanation, when the system rolls it, or what is beside it, with dice (D-280). */
    roll?: SheetRoll;
    /** How far it has come from one mark to the next, as the experience between its level's points and the next level's (PRO-6): a bar on the dashboard. */
    progress?: Progress;
    /** Beside the points, what they say of the levels, as data the dashboard writes in its language (PRO-6). */
    levelNeed?: LevelNeed;
}

/** A number between two marks: where it is, where it started from, where it goes. */
export interface Progress
{
    value: number;
    from: number;
    to: number;
}

/** A free roll of a number of the sheet (D-280): the dice, by their sides, the number added to them, and both as a notation, such as 1d20+5. */
export interface SheetRoll
{
    notation: string;
    dice: number[];
    modifier: number;
}

/**
 * A group of a character's sheet as data: its values, or for a group that the items of one list give, each item with its values, as the attacks (PRO-5); for what a
 * character carries, each thing with how many, how deep inside another it is, and whether it is equipped (D-431).
 */
export interface SheetGroupData
{
    name: string;
    /** Its icon on the dashboard, when the system gives one (D-284). */
    icon?: string;
    values: SheetValue[];
    items?: SheetItem[];
}

/** An item of a group: its name and values; for what is carried, how deep inside another thing, and whether it is equipped (D-431). */
export interface SheetItem
{
    item: string;
    values: SheetValue[];
    depth?: number;
    /** The thing it is inside, for what the screen reader says of a row a step in. */
    inside?: string;
    /** The page it is, or the kind it is counted by, whose icon the row shows (D-431). */
    page?: string;
    /** That icon, as the dashboard reads a picture; none for text, or a page without one. */
    image?: { file: string; version: number; };
    equipped?: boolean;
}

/**
 * The sheet of a player character or a companion as data, a group for each that has a value, as the character reads it, effects and formulas included (DAT-2).
 * None for other pages, which show their fields as written, with where each comes from.
 */
export function sheetData(world: World, system: GameSystem | undefined, page: Page): SheetGroupData[]
{
    if (system === undefined || !hasSheet(world, page)) {
        return [];
    }

    const fields = effectiveFields(world, page);
    const marks = markCounts(world, system, fields);
    return system.sheet.flatMap((group): SheetGroupData[] => {
        // The group of what a character carries (D-431): its purse and the other values, then a row for each thing, stack or text, with what each item holds below it.
        if (group.entries.some((entry) => comparableText(entry.field) === "inventory")) {
            const values = group.entries.filter((entry) => comparableText(entry.field) !== "inventory").flatMap((entry) => {
                const value = valueNamed(fields, entry.field);
                return isEmptyField(value) ? [] : [sheetValue(world, fields, entry.field, value)];
            });
            const items = carriedRows(world, page, equippedPages(world, page));
            const load = loadValue(world, system, page, fields);
            const shown = [...values, ...(load === undefined ? [] : [load])];
            return shown.length + items.length === 0 ? [] : [{ name: group.name, ...iconOf(group), values: shown, ...(items.length === 0 ? {} : { items }) }];
        }

        const list = itemGroupList(world, group);

        // A group of what the items of one list give is shown item by item, as the attacks of the weapons equipped (PRO-5).
        if (list !== undefined) {
            const items = itemLines(world, fields, list, entryFields(group.entries)).map((item) => ({
                item: item.item,
                values: item.values.map((value) => sheetValue(world, fields, value.field, value.value)),
            }));
            return items.length === 0 ? [] : [{ name: group.name, ...iconOf(group), values: [], items }];
        }

        const progression = progressionOf(world, fields);
        const values = groupEntries(world, system, group, fields).flatMap((entry): SheetValue[] => {
            const value = valueNamed(fields, entry.field);
            const given = givenItems(progression, entry.field);

            if (given.length > 0) {
                return [givenValue(world, entry.field, value, given)];
            }

            const beside = besideValue(world, fields, entry);
            const roll = sheetRoll(system, fields, entry);
            const progress = experienceProgress(world, fields, entry.field);
            const need = experienceNeed(world, fields, entry.field);
            return isEmptyField(value) ? [] : [{
                ...sheetValue(world, fields, entry.field, value),
                marks: marks.get(comparableText(entry.field)) ?? 0,
                ...(beside === undefined ? {} : { beside }),
                ...(beside === undefined || entry.beside === undefined ? {} : { besideField: entry.beside }),
                ...(roll === undefined ? {} : { roll }),
                ...(progress === undefined ? {} : { progress }),
                ...(need === undefined ? {} : { levelNeed: need }),
            }];
        });
        return values.length === 0 ? [] : [{ name: group.name, ...iconOf(group), values }];
    });
}

/** A group's icon, as the data of the sheet carries it: none when the system gives none. */
function iconOf(group: SheetGroup): Pick<SheetGroupData, "icon">
{
    return group.icon === undefined ? {} : { icon: group.icon };
}

/**
 * The icon on the token of one of the party (D-414): the system's for the first item of its field that has one, by its name or by a page it derives from, as a
 * class of the campaign built on the system's; none when the system gives none.
 */
export function tokenIcon(world: World, system: GameSystem | undefined, page: Page): string | undefined
{
    const rule = system?.tokenIcons;
    const value = rule === undefined ? undefined : valueNamed(effectiveFields(world, page), rule.field);

    if (rule === undefined || isEmptyField(value)) {
        return undefined;
    }

    const iconOf = (name: string): string | undefined => Object.entries(rule.icons).find(([key]) => comparableText(key) === comparableText(name))?.[1];
    const item = (name: string): Page | undefined => world.pages.find((candidate) => comparableText(candidate.name) === comparableText(name));
    return listItemNames(value).flatMap((name) => {
        const own = item(name);
        return [name, ...(own === undefined ? [] : baseChain(world, own).map((base) => base.name))];
    }).map(iconOf).find((icon) => icon !== undefined);
}

/**
 * The line under a character's name on the dashboard (D-288): the system's headline, each field in braces as the sheet shows it and a list as the names of its
 * items, as Level 3 Cleric, in the campaign's language when the system has its words (D-403); none when the system has none, or when its fields are all empty.
 */
export function sheetHeadline(world: World, system: GameSystem | undefined, page: Page, words?: SystemWords): string | undefined
{
    const headline = words?.headline ?? system?.sheetHeadline;

    if (headline === undefined || !hasSheet(world, page)) {
        return undefined;
    }

    const fields = effectiveFields(world, page);

    const shown = (field: string): string => {
        const value = valueNamed(fields, field);
        const said = (name: string): string => words?.words[name] ?? name;
        return isEmptyField(value) ? "" : declaredKind(world, field) === "list" ? listItemNames(value).map(said).join(" / ") : said(valueText(world, field, value));
    };

    const named = [...headline.matchAll(/\{([^{}]+)\}/g)].map((match) => shown(match[1]));
    return named.every((text) => text === "") ? undefined : headline.replace(/\{([^{}]+)\}/g, (_, field: string) => shown(field)).replace(/\s+/g, " ").trim();
}

/**
 * The stat block of a companion who keeps no sheet, as the creature it derives from writes it (D-275): one group named after the creature, with the fields the
 * game system declares, in the order the creature writes them, as the companion reads them, and beside a field what the sheet shows beside it, such as str-mod
 * by str. None for a page that derives from no creature.
 */
export function statBlock(world: World, system: GameSystem | undefined, page: Page): SheetGroupData[]
{
    const creature = baseChain(world, page).find((base) => base.type === "creature");

    if (system === undefined || creature === undefined) {
        return [];
    }

    const fields = effectiveFields(world, page);
    const besides = new Map(system.sheet.flatMap((group) => group.entries).flatMap((entry): [string, string][] => (entry.beside === undefined ? [] : [[comparableText(entry.field), entry.beside]])));
    // From the creature at the root of the chain to the companion: the order of the stat block, then what the companion adds.
    const names = [...new Set([...baseChain(world, page)].reverse().concat(page).flatMap((holder) => Object.keys(holder.fields)))];
    const values = names.flatMap((field): SheetValue[] => {
        const value = valueNamed(fields, field);

        if (declaredKind(world, field) === undefined || isStandardField(page.type, field) || isEmptyField(value)) {
            return [];
        }

        const besideField = besides.get(comparableText(field));
        const besideValue = besideField === undefined ? undefined : valueNamed(fields, besideField);
        const beside = besideField === undefined || isEmptyField(besideValue) ? undefined : valueText(world, besideField, besideValue);
        return [{ ...sheetValue(world, fields, field, value), ...(beside === undefined ? {} : { beside }) }];
    });
    return values.length === 0 ? [] : [{ name: creature.name, values }];
}

/** "Abilities: str 14 (+2) · dex 12 (+1)…": the sheet as the chat gives it, a line for each group. */
export function sheetText(groups: SheetGroupData[]): string[]
{
    return groups.map((group) => {
        const values = group.values.map((value) => `${value.field} ${value.text}${value.marks === 0 ? "" : ` ${"●".repeat(value.marks)}`}${value.beside === undefined ? "" : ` (${value.beside})`}`);
        const items = (group.items ?? []).map((item) => {
            const text = `${item.item}${item.values.map((value) => value.text).filter((text) => text !== "").map((text) => ` ${text}`).join(",")}${item.equipped === true ? " (equipped)" : ""}`;
            return (item.depth ?? 0) > 0 ? `${"› ".repeat(item.depth ?? 0)}${text}` : text;
        });
        return `${group.name}: ${[...values, ...items].join(" · ")}`;
    });
}

/** The sheet of a player character or a companion as the chat gives it (DAT-2): sheetData as text. */
export function sheetLines(world: World, system: GameSystem | undefined, page: Page): string[]
{
    return sheetText(sheetData(world, system, page));
}

/**
 * A group of a character's sheet, by the name the system gives it, with how each value is made (FOR-8): "insight +5: wis-mod +3, proficiency +2, Insight in
 * skill-proficiencies", for show Page#Group. Undefined when the system's sheet has no group by that name.
 */
export function sheetGroup(world: World, system: GameSystem | undefined, page: Page, name: string): { name: string; lines: string[]; } | undefined
{
    const group = system === undefined || !hasSheet(world, page) ? undefined : system.sheet.find((candidate) => comparableText(candidate.name) === comparableText(name.trim()));

    if (system === undefined || group === undefined) {
        return undefined;
    }

    const fields = effectiveFields(world, page);
    const list = itemGroupList(world, group);

    if (list !== undefined) {
        const items = itemLines(world, fields, list, entryFields(group.entries), true);
        const lines = items.map((item) => `${item.item}: ${item.values.map((value) => workedLine(world, value)).join("; ")}`);
        const empty = `${page.name} has nothing in ${group.name} yet: the pages of the items in its ${list} give it, as ${entryFields(group.entries).join(" and ")}.`;
        return { name: group.name, lines: lines.length === 0 ? [empty] : lines };
    }

    const worked = workedFields(world, fields, true);
    const lines = groupEntries(world, system, group, fields).flatMap((entry) => {
        const value = valueNamed(fields, entry.field);
        const computed = worked.find((candidate) => comparableText(candidate.field) === comparableText(entry.field));

        if (computed !== undefined) {
            return [workedLine(world, computed)];
        }

        const given = givenItems(progressionOf(world, fields), entry.field);

        if (given.length > 0) {
            return [`${entry.field} ${givenValue(world, entry.field, value, given).text}`];
        }

        if (isEmptyField(value)) {
            return [];
        }

        const maximum = readCounter(value) === undefined ? undefined : workedMaximum(world, fields, entry.field);
        const parts = maximum === undefined ? "" : workedParts(world, maximum.reads);
        return [`${entry.field} ${valueText(world, entry.field, value)}${besideText(world, fields, entry)}${parts === "" ? "" : `: the maximum from ${parts}`}`];
    });
    return { name: group.name, lines: lines.length === 0 ? [`${page.name} has nothing in ${group.name} yet.`] : lines };
}

/** The names of the groups of a character's sheet, for a message; none for a page that shows no sheet. */
export function sheetGroupNames(world: World, system: GameSystem | undefined, page: Page): string[]
{
    return system === undefined || !hasSheet(world, page) ? [] : system.sheet.map((group) => group.name);
}

/**
 * The fields the sheet of a character shows (DAT-2), those the rows of its classes give included (PRO-4), and what the items of its lists give (PRO-5), which
 * show leaves out of the fields as written; none for a page that shows no sheet.
 */
export function sheetFieldNames(world: World, system: GameSystem | undefined, page: Page): string[]
{
    if (system === undefined || !hasSheet(world, page)) {
        return [];
    }

    const fields = effectiveFields(world, page);
    const shown = entryFields(system.sheet.flatMap((group) => groupEntries(world, system, group, fields)));
    // What the items of a list the sheet shows give is part of the values that read it, as an armor's armor-class in ac (PRO-5).
    const given = Object.entries(system.itemFormulas).filter(([list]) => shown.some((field) => comparableText(field) === comparableText(list)) || comparableText(list) === comparableText(system.progression?.list ?? "")).flatMap((
        [, names],
    ) => names);
    return [...shown, ...given.filter((field) => !shown.some((other) => comparableText(other) === comparableText(field)))];
}

/**
 * Refuses items given to a list that the game system does not take, with the names it takes, and links in place of its names (SYS-8); and text with commas for a
 * list the system declares without names, which would be one item, as "simple weapons, martial weapons".
 */
export function checkListValues(system: GameSystem | undefined, lists: Record<string, unknown>, onSheet = false): void
{
    for (const [field, value] of Object.entries(lists)) {
        // A map where a list goes, as {"[[Fighter]]": 1}, would read as nothing: the sheet would come out at level 0 (D-246).
        if (system !== undefined && isListField(system, field) && value !== null && typeof value === "object" && !Array.isArray(value)) {
            const example = Object.entries(value).map(([key, number]) => `${key} ${String(number)}`).join(", ");
            throw new Error(`${field} is a list in the system ${system.name}: give it as one, such as ${field}=[${example}]. Nothing changed.`);
        }

        if (system !== undefined && isOpenList(system, field) && isCommaText(value)) {
            throw new Error(`${field} is a list in the system ${system.name}: write its names apart, as ${field}=[${String(value)}]. Nothing changed.`);
        }

        const wrong = wrongValues(system, field, value, onSheet);
        const links = allowedValues(system, field, onSheet) === undefined ? [] : (Array.isArray(value) ? value : [value]).filter((item) => /\[\[/.test(String(item)));

        if (system !== undefined && wrong.length > 0) {
            throw new Error(`${wrongText(system, field, wrong, onSheet)} Nothing changed.`);
        }

        if (links.length > 0) {
            throw new Error(`${field} takes the system's names, not links: ${listItemNames(links).join(", ")}. Nothing changed.`);
        }
    }
}

/** Text with commas outside links and parentheses, as "simple weapons, martial weapons": several names that a list holds apart. */
function isCommaText(value: unknown): boolean
{
    return typeof value === "string" && value.replace(/\[\[[^\]]*\]\]/g, "").replace(/\([^)]*\)/g, "").includes(",");
}

/** A field the system declares as a list, such as classes. */
function isListField(system: GameSystem, field: string): boolean
{
    return Object.entries(system.fields).some(([name, kind]) => kind === "list" && comparableText(name) === comparableText(field));
}

/** A list the system declares without the names it takes, which are checked by name, as weapon-proficiencies (SYS-8). */
function isOpenList(system: GameSystem, field: string): boolean
{
    return allowedValues(system, field, false) === undefined && Object.entries(system.fields).some(([name, kind]) => kind === "list" && comparableText(name) === comparableText(field));
}

/**
 * The lists written on the campaign's pages with names the game system does not take, or as text with commas, which reads as one name (SYS-8), such as one
 * written by hand.
 */
export function listValueProblems(world: World, system: GameSystem | undefined): Problem[]
{
    if (system === undefined) {
        return [];
    }

    return world.pages.filter((page) => page.system === undefined).flatMap((page) => {
        const sheet = hasSheet(world, page);
        return Object.entries(page.fields).flatMap(([field, value]): Problem[] => {
            if (isOpenList(system, field) && isCommaText(value)) {
                return [{ path: page.path, message: `${field} on ${page.name} is text with commas, read as one name: a list is written [a, b].`, fix: `write ${page.name}, set ${field}=[${String(value)}]` }];
            }

            const wrong = wrongValues(system, field, value, sheet);
            return wrong.length === 0 ? [] : [{ path: page.path, message: `On ${page.name}: ${wrongText(system, field, wrong, sheet)}`, fix: `write ${page.name}, remove ${field}=${wrong[0]}, then add the right name` }];
        });
    });
}

/** How many marks each computed field earns (D-217, DAT-2): one for each list of the system's marks that it reads with its item, where that item changes it. */
function markCounts(world: World, system: GameSystem, fields: Record<string, unknown>): Map<string, number>
{
    const marking = new Set(system.marks.map(comparableText));

    if (marking.size === 0) {
        return new Map();
    }

    return new Map(
        workedFields(world, fields, true).map((worked) => [
            comparableText(worked.field),
            // Each list once, though a formula may read it twice, as a skill read for its proficiency and for half of it.
            new Set(worked.reads.flatMap((read) => ("item" in read && read.value === 1 && marking.has(comparableText(read.list)) ? [comparableText(read.list)] : []))).size,
        ]),
    );
}

/** The fields of the sheet a character writes and status reminds until they are (DAT-2): neither worked out by the system nor written only when they apply (D-206). */
function remindedFields(system: GameSystem): string[]
{
    return system.sheet.flatMap((group) => group.entries).filter((entry) => !entry.optional).flatMap((entry) => entryFields([entry]).filter((field) => !isWorkedOut(system, field)));
}

/** Whether the system gives a field as a use with its limits, which write puts on a character full when it has it (DAT-9), as hit dice and spell slots. */
function isSystemUse(system: GameSystem, field: string): boolean
{
    const counted = Object.keys(system.formulas.counters).some((name) => comparableText(name) === comparableText(field));
    return counted && system.uses.some((name) => name.endsWith("*") ? comparableText(field).startsWith(comparableText(name.slice(0, -1))) : comparableText(name) === comparableText(field));
}

function isWorkedOut(system: GameSystem, field: string): boolean
{
    const progression = system.progression;
    const given = [...(progression === undefined ? [] : [fieldName(progression.features)]), ...Object.values(system.itemFormulas).flat()];
    return [...system.formulas.computed.map(([name]) => name), ...given].some((name) => comparableText(name) === comparableText(field));
}

/**
 * The entries of a group: those the system lists, and in the group of the features those the rows of the character's classes give, in order (PRO-4), then the
 * uses it has that no other group shows, such as channel-divinity (DAT-9).
 */
function groupEntries(world: World, system: GameSystem, group: SheetGroup, fields: Record<string, unknown>): SheetEntry[]
{
    const features = system.progression === undefined ? undefined : fieldName(system.progression.features);

    if (features === undefined || !group.entries.some((entry) => comparableText(entry.field) === comparableText(features))) {
        return group.entries;
    }

    const listed = new Set(entryFields(system.sheet.flatMap((other) => other.entries)).map(comparableText));
    const rows = (progressionOf(world, fields)?.values ?? []).map((value) => value.field).filter((field) => !listed.has(comparableText(field)));
    const uses = Object.keys(world.system?.formulas?.counters ?? {}).filter((field) =>
        isUse(world, field) && !listed.has(comparableText(field)) && !rows.some((row) => comparableText(row) === comparableText(field)) && !isEmptyField(valueNamed(fields, field))
    );
    return [...group.entries, ...[...rows, ...uses].map((field) => ({ field, optional: true }))];
}

/**
 * What a holder carries, as rows of the sheet (D-431): a stack with its count (STK-1), an item with a story of its own, 1, and below it what it holds, one level deeper, and
 * text as written; marked when equipped. Pages that are elsewhere, or not items, are left out.
 */
function carriedRows(world: World, holder: Page, equipped: Page[], depth = 0, seen = new Set<Page>()): SheetItem[]
{
    const field = containerFieldOf(holder.type);
    const stacks = stacksOf(world, holder);
    const shown = new Set<Page>();
    const row = (item: string, count: string, on: boolean, page?: Page): SheetItem => ({
        item,
        ...(page === undefined ? {} : { page: page.name }),
        values: [{ field: "quantity", text: count, marks: 0 }],
        ...(depth === 0 ? {} : { depth, inside: holder.name }),
        ...(on ? { equipped: true } : {}),
    });

    return (field === undefined ? [] : textsIn(holder.fields[field])).flatMap((entry): SheetItem[] => {
        const counted = entryKind(world, entry);
        const stack = counted === undefined ? undefined : stacks.find((candidate) => candidate.kind === counted.kind);

        if (stack !== undefined) {
            // Two entries of a kind are one stack, shown once (STK-3).
            const first = !shown.has(stack.kind);
            shown.add(stack.kind);
            return first ? [row(stackName(stack), quantity(stack.count), equipped.includes(stack.kind), stack.kind)] : [];
        }

        const read = readEntry(entry);

        if (read.shape === "text") {
            return [row(entry.trim(), "", false)];
        }

        const page = entryPage(world, read.page);

        if (page === undefined || page.type !== "item" || seen.has(page) || validHoldersOf(world, page)[0] !== holder) {
            return [];
        }

        seen.add(page);
        return [row(page.name, "", equipped.includes(page), page), ...carriedRows(world, page, equipped, depth + 1, seen)];
    });
}

/** A character's load when it is over its limit, as status says it under the rigor «rules» (LOAD-3): "load 230 / 210 lb, over the limit"; undefined otherwise. */
export function overLoad(world: World, system: GameSystem | undefined, page: Page): string | undefined
{
    if (system?.load === undefined || !hasSheet(world, page)) {
        return undefined;
    }

    const fields = effectiveFields(world, page);
    const load = carriedLoad(world, system.load.field, page) + coinsWeight(fields, system.load.coins);
    const limit = loadLimit(world, system.load, fields);
    const value = loadValue(world, system, page, fields);
    return limit === undefined || load <= limit || value === undefined ? undefined : `load ${value.text}, over the limit`;
}

/** For an item created without a weight, its own or its base's, when the system counts loads: the AI estimates one (LOAD-1). */
export function weightlessNote(system: GameSystem | undefined, world: World, page: Page): string[]
{
    if (system?.load === undefined || page.type !== "item" || valueNamed(inheritedFields(world, page), system.load.field) !== undefined) {
        return [];
    }

    const unit = weightUnit(world, system.load.field) ?? "lb";
    return [`${page.name} has no ${system.load.field}, so it adds nothing to a load: if it weighs, estimate it from things like it, such as set ${system.load.field}="2 ${unit}".`];
}

/** What a character carries weighs, against its limit, as the sheet shows it (D-432, LOAD-2): "23 / 210 lb", in the system's unit; none when the system counts no load. */
function loadValue(world: World, system: GameSystem, page: Page, fields: Record<string, unknown>): SheetValue | undefined
{
    if (system.load === undefined) {
        return undefined;
    }

    const load = carriedLoad(world, system.load.field, page) + coinsWeight(fields, system.load.coins);

    // Empty hands, no line: a character who carries nothing has no Equipment to show.
    if (load === 0) {
        return undefined;
    }

    const limit = loadLimit(world, system.load, fields);
    const unit = weightUnit(world, system.load.field);
    const text = `${weightText(load)}${limit === undefined ? "" : ` / ${weightText(limit)}`}${unit === undefined ? "" : ` ${unit}`}`;
    return { field: "load", text, marks: 0 };
}

/** The limit of a character's load: the system's formula, times the factor of its size, written or from its race (LOAD-4). */
function loadLimit(world: World, load: NonNullable<GameSystem["load"]>, fields: Record<string, unknown>): number | undefined
{
    const limit = formulaValue(world, fields, load.limit);
    const size = load.size === undefined ? undefined : valueNamed(fields, load.size);
    const factor = typeof size === "string" ? Object.entries(load.sizes).find(([name]) => comparableText(name) === comparableText(size))?.[1] : undefined;
    return limit === undefined ? undefined : limit * (factor ?? 1);
}

/** The weight a holder carries (LOAD-1): each stack by its pieces, at its kind's weight over its bundle; each item at its own weight or its base's, and what it holds. */
export function carriedLoad(world: World, field: string, holder: Page, seen = new Set<Page>()): number
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

/** The unit the system's weights are written in, as lb; undefined when no page says. */
function weightUnit(world: World, field: string): string | undefined
{
    const written = (world.system?.pages ?? []).map((page) => page.fields[field]).find((value) => typeof value === "string" && /\p{L}/u.test(value));
    return typeof written === "string" ? /(\p{L}[\p{L}.]*)\s*$/u.exec(written)?.[1] : undefined;
}

/** What the coins of a purse weigh, as many coins as the system says make one unit of weight; 0 when it says none. */
function coinsWeight(fields: Record<string, unknown>, perUnit: number | undefined): number
{
    const money = valueNamed(fields, "money");
    const coins = typeof money === "string" ? [...money.matchAll(/(\d+)\s*\p{L}+/gu)].reduce((total, match) => total + Number(match[1]), 0) : 0;
    return perUnit === undefined ? 0 : coins / perUnit;
}

/** A weight as the sheet writes it: whole, or with one decimal. */
function weightText(weight: number): string
{
    return String(Math.round(weight * 10) / 10);
}

/** How many there are, as the sheet shows it: blank for one, which goes without saying (Stefano, 14 October). */
function quantity(count: number): string
{
    return count === 1 ? "" : String(count);
}

/** The pages a character has equipped, items or kinds (CON-12, STK-11). */
function equippedPages(world: World, page: Page): Page[]
{
    return linksIn(page.fields.equipped).flatMap((name) => entryPage(world, name) ?? []);
}

/** The list whose items' formulas give every field of a group, as equipped for the attacks; undefined for any other group (PRO-5). */
function itemGroupList(world: World, group: SheetGroup): string | undefined
{
    const lists = [...new Set(entryFields(group.entries).map((field) => itemList(world, field)))];
    return lists.length === 1 ? lists[0] : undefined;
}

/** Every field the sheet shows, as names are compared. */
function sheetFields(system: GameSystem): Set<string>
{
    return new Set(entryFields(system.sheet.flatMap((group) => group.entries)).map(comparableText));
}

function entryFields(entries: SheetEntry[]): string[]
{
    return entries.flatMap((entry) => (entry.beside === undefined ? [entry.field] : [entry.field, entry.beside]));
}

/**
 * A field's value as a counter, with the limits the field writes or the system works out (FOR-6): 18/24, or momentum 4 from -6; undefined for a number that is
 * no counter, such as str 14, and for any other value.
 */
export function counterOf(world: World, fields: Record<string, unknown>, field: string, value: unknown): Counter | undefined
{
    const kind = declaredKind(world, field);
    const read = readCounter(value);
    const limits = counterLimits(world, fields, field);
    // A field the system declares as anything else is never one, as a challenge rating of 1/4.
    const counted = kind === "counter" || (kind === undefined && (read?.max !== undefined || limits.min !== undefined || limits.max !== undefined));
    return read === undefined || !counted ? undefined : { ...limits, ...read };
}

/** A value of the sheet as data, without marks or what is beside it: its kind, its text, a counter with its limits and the names of a list. */
function sheetValue(world: World, fields: Record<string, unknown>, field: string, value: unknown): SheetValue
{
    const kind = declaredKind(world, field);
    const counter = counterOf(world, fields, field, value);
    const items = Array.isArray(value) ? value.map((item) => linkText(String(item).trim())) : undefined;
    return { field, ...(kind === undefined ? {} : { kind }), text: valueText(world, field, value), ...(counter === undefined ? {} : { counter }), ...(items === undefined ? {} : { items }), marks: 0 };
}

/** The experience between the points of the character's level and those of the next, for the field that counts it (PRO-6); none at the last level. */
export function experienceProgress(world: World, fields: Record<string, unknown>, field: string): Progress | undefined
{
    if (comparableText(field) !== comparableText(world.system?.progression?.experience?.field ?? "")) {
        return undefined;
    }

    const experience = experienceOf(world, fields);
    return experience?.next === undefined ? undefined : { value: experience.points, from: experience.least ?? 0, to: experience.next.points };
}

/** What the points of the field that counts the experience say of the levels (PRO-6); none for another field, or at the last level. */
export function experienceNeed(world: World, fields: Record<string, unknown>, field: string): LevelNeed | undefined
{
    const experience = comparableText(field) === comparableText(world.system?.progression?.experience?.field ?? "") ? experienceOf(world, fields) : undefined;
    return experience === undefined ? undefined : levelNeed(experience);
}

/** The free roll of an entry of the sheet (D-280): the dice the system rolls its number with, or the number beside it, as str-mod by str; none for a text. */
function sheetRoll(system: GameSystem, fields: Record<string, unknown>, entry: SheetEntry): SheetRoll | undefined
{
    for (const field of [entry.field, entry.beside].filter((candidate) => candidate !== undefined)) {
        const dice = Object.entries(system.sheetDice).find(([listed]) => comparableText(listed) === comparableText(field))?.[1];
        const number = dice === undefined ? undefined : numberOf(valueNamed(fields, field));

        if (dice !== undefined && number !== undefined) {
            const sides = dice.split("+").flatMap((term) => {
                const [count, faces] = term.split("d");
                return Array.from({ length: count === "" ? 1 : Number(count) }, () => Number(faces));
            });
            return { notation: number === 0 ? dice : `${dice}${number > 0 ? "+" : "-"}${Math.abs(number)}`, dice: sides, modifier: number };
        }
    }

    return undefined;
}

/** A list with what the parts of the character add to it (PRO-7): the names written, then those given, apart and not counted with it. */
function givenValue(world: World, field: string, value: unknown, given: { name: string; page: Page; }[]): SheetValue
{
    const kind = declaredKind(world, field);
    const written = listItemNames(value).filter((name) => !given.some((item) => comparableText(item.name) === comparableText(name)));
    const always = { from: [...new Set(given.map((item) => item.page.name))], items: given.map((item) => item.name) };
    return { field, ...(kind === undefined ? {} : { kind }), text: listWithGiven(world, field, written, always), items: written.map(linkText), always, marks: 0 };
}

/** " (+2)": the field shown beside an entry, such as str-mod by str, when it has a value. */
function besideText(world: World, fields: Record<string, unknown>, entry: SheetEntry): string
{
    const beside = besideValue(world, fields, entry);
    return beside === undefined ? "" : ` (${beside})`;
}

/** "+2": the field shown beside an entry, such as str-mod by str, when it has a value; beside the points, how many the next level needs, or the level they reach (PRO-6). */
function besideValue(world: World, fields: Record<string, unknown>, entry: SheetEntry): string | undefined
{
    const experience = comparableText(entry.field) === comparableText(world.system?.progression?.experience?.field ?? "") ? experienceOf(world, fields) : undefined;
    const text = experience === undefined ? undefined : experienceText(experience);

    if (text !== undefined) {
        return text;
    }

    const value = entry.beside === undefined ? undefined : valueNamed(fields, entry.beside);
    return entry.beside === undefined || isEmptyField(value) ? undefined : valueText(world, entry.beside, value);
}

/** "Healing Word, Guiding Bolt; always, from Life Domain: Bless, Cure Wounds": a list with what the parts add to it, apart and not counted with it (PRO-7). */
function listWithGiven(world: World, field: string, written: string[], always: { from: string[]; items: string[]; }): string
{
    const given = `always, from ${always.from.join(" and ")}: ${always.items.join(", ")}`;
    return written.length === 0 ? given : `${valueText(world, field, written)}; ${given}`;
}

/** A value as the sheet shows it: a modifier with its sign (FOR-8), the items of a list one after the other. */
function valueText(world: World, field: string, value: unknown): string
{
    if (typeof value === "number") {
        return signedText(world, field, value);
    }

    // Items with commas of their own are told apart by semicolons.
    if (Array.isArray(value)) {
        const items = value.map((item) => linkText(String(item).trim()));
        return items.join(items.some((item) => item.includes(",")) ? "; " : ", ");
    }

    return typeof value === "object" && value !== null ? JSON.stringify(value) : linkText(String(value).trim());
}

/** "Cleric 3" for "[[Cleric]] 3": a sheet reads as on paper, with the name or label of a link. */
function linkText(text: string): string
{
    return text.replace(/\[\[(?:[^\]|]*\|)?([^\]|]+)\]\]/g, "$1");
}

/** The items of a list that the game system does not take, by the names they are read as (SYS-8); none for a field without values. */
function wrongValues(system: GameSystem | undefined, field: string, value: unknown, onSheet: boolean): string[]
{
    const allowed = allowedValues(system, field, onSheet);
    // A text with closed names, as an alignment, is one name whole, commas and all.
    const names = isTextField(system, field) ? (isEmptyField(value) ? [] : [String(value).trim()]) : listItemNames(value);
    return allowed === undefined ? [] : names.filter((name) => !allowed.some((item) => comparableText(item) === comparableText(name)));
}

/** A field the system declares as text, such as alignment. */
function isTextField(system: GameSystem | undefined, field: string): boolean
{
    return Object.entries(system?.fields ?? {}).some(([name, kind]) => kind === "text" && comparableText(name) === comparableText(field));
}

/** The names a list field takes in the game system (SYS-8), and on a page that keeps the sheet those it closes there (D-435); undefined for a field without values. */
function allowedValues(system: GameSystem | undefined, field: string, onSheet: boolean): string[] | undefined
{
    const named = (values: Record<string, string[]>): string[] | undefined => Object.entries(values).find(([name]) => comparableText(name) === comparableText(field))?.[1];
    return named(system?.values ?? {}) ?? (onSheet ? named(system?.sheetValues ?? {}) : undefined);
}

/** "Stealthh is not one of the names skill-proficiencies takes in the system 5e: Acrobatics, …": with how to write a list, when a name holds a comma. */
function wrongText(system: GameSystem, field: string, wrong: string[], onSheet: boolean): string
{
    const allowed = allowedValues(system, field, onSheet) ?? [];
    // A sheet's list the campaign may widen, as a language of its own world (D-435).
    const own = Object.keys(system.sheetValues).some((name) => comparableText(name) === comparableText(field))
        ? ` A name of the campaign's own world joins them with config values "${field}: [${wrong[0] ?? ""}]".`
        : "";
    const list = wrong.some((name) => /[,;]/.test(name)) ? " A list is written [a, b]." : "";
    const names = wrong.map((name) => `"${name}"`).join(", ");
    return `${names} ${wrong.length === 1 ? "is not one of the names" : "are not names"} ${field} takes in the system ${system.name}: ${allowed.join(", ")}.${list}${own}`;
}
