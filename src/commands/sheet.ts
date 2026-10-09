// The character sheet of the game system (D-204, D-207, DAT-2): its groups as show gives them, the fields a character still lacks, and the names a list takes (SYS-8).
import { listItemNames, numberOf } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { type Counter, readCounter } from "../counters/index.ts";
import { baseChain, declaredKind, isEmptyField, isStandardField, type Page, type World } from "../pages/index.ts";
import { fieldName } from "../progression/index.ts";
import type { GameSystem, SheetEntry, SheetGroup } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { experienceOf, experienceText } from "./game-experience.ts";
import { givenItems, progressionOf } from "./progression.ts";
import { counterLimits, hasSheet, isUse, itemLines, itemList, signedText, workedFields, workedLine, workedMaximum, workedParts } from "./worked-out.ts";

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
        lists: Object.entries(system.values).filter(([field]) => onSheet.has(comparableText(field))).map(([field, names]) => `${field} (${names.length <= 6 ? names.join(", ") : `such as ${names.slice(0, 2).join(", ")}`})`),
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
    /** What the sheet shows beside it, such as +2 by str, or how many points the next level needs (PRO-6). */
    beside?: string;
    /** The free roll the dashboard offers in its explanation, when the system rolls it, or what is beside it, with dice (D-280). */
    roll?: SheetRoll;
    /** How far it has come from one mark to the next, as the experience between its level's points and the next level's (PRO-6): a bar on the dashboard. */
    progress?: Progress;
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

/** A group of a character's sheet as data: its values, or for a group that the items of one list give, each item with its values, as the attacks (PRO-5). */
export interface SheetGroupData
{
    name: string;
    /** Its icon on the dashboard, when the system gives one (D-284). */
    icon?: string;
    values: SheetValue[];
    items?: { item: string; values: SheetValue[]; }[];
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
            return isEmptyField(value) ? [] : [{
                ...sheetValue(world, fields, entry.field, value),
                marks: marks.get(comparableText(entry.field)) ?? 0,
                ...(beside === undefined ? {} : { beside }),
                ...(roll === undefined ? {} : { roll }),
                ...(progress === undefined ? {} : { progress }),
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
 * The line under a character's name on the dashboard (D-288): the system's headline, each field in braces as the sheet shows it and a list as the names of its
 * items, as Level 3 Cleric; none when the system has none, or when its fields are all empty.
 */
export function sheetHeadline(world: World, system: GameSystem | undefined, page: Page): string | undefined
{
    const headline = system?.sheetHeadline;

    if (headline === undefined || !hasSheet(world, page)) {
        return undefined;
    }

    const fields = effectiveFields(world, page);

    const shown = (field: string): string => {
        const value = valueNamed(fields, field);
        return isEmptyField(value) ? "" : declaredKind(world, field) === "list" ? listItemNames(value).join(" / ") : valueText(world, field, value);
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
        const shown = group.items === undefined
            ? group.values.map((value) => `${value.field} ${value.text}${value.marks === 0 ? "" : ` ${"●".repeat(value.marks)}`}${value.beside === undefined ? "" : ` (${value.beside})`}`)
            : group.items.map((item) => `${item.item} ${item.values.map((value) => value.text).join(", ")}`);
        return `${group.name}: ${shown.join(" · ")}`;
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
export function checkListValues(system: GameSystem | undefined, lists: Record<string, unknown>): void
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

        const wrong = wrongValues(system, field, value);
        const links = allowedValues(system, field) === undefined ? [] : (Array.isArray(value) ? value : [value]).filter((item) => /\[\[/.test(String(item)));

        if (system !== undefined && wrong.length > 0) {
            throw new Error(`${wrongText(system, field, wrong)} Nothing changed.`);
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
    return allowedValues(system, field) === undefined && Object.entries(system.fields).some(([name, kind]) => kind === "list" && comparableText(name) === comparableText(field));
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

    return world.pages.filter((page) => page.system === undefined).flatMap((page) =>
        Object.entries(page.fields).flatMap(([field, value]): Problem[] => {
            if (isOpenList(system, field) && isCommaText(value)) {
                return [{ path: page.path, message: `${field} on ${page.name} is text with commas, read as one name: a list is written [a, b].`, fix: `write ${page.name}, set ${field}=[${String(value)}]` }];
            }

            const wrong = wrongValues(system, field, value);
            return wrong.length === 0 ? [] : [{ path: page.path, message: `On ${page.name}: ${wrongText(system, field, wrong)}`, fix: `write ${page.name}, remove ${field}=${wrong[0]}, then add the right name` }];
        })
    );
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
function wrongValues(system: GameSystem | undefined, field: string, value: unknown): string[]
{
    const allowed = allowedValues(system, field);
    return allowed === undefined ? [] : listItemNames(value).filter((name) => !allowed.some((item) => comparableText(item) === comparableText(name)));
}

/** The names a list field takes in the game system (SYS-8); undefined for a field without values. */
function allowedValues(system: GameSystem | undefined, field: string): string[] | undefined
{
    return Object.entries(system?.values ?? {}).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}

/** "Stealthh is not one of the names skill-proficiencies takes in the system 5e: Acrobatics, …": with how to write a list, when a name holds a comma. */
function wrongText(system: GameSystem, field: string, wrong: string[]): string
{
    const allowed = allowedValues(system, field) ?? [];
    const list = wrong.some((name) => /[,;]/.test(name)) ? " A list is written [a, b]." : "";
    const names = wrong.map((name) => `"${name}"`).join(", ");
    return `${names} ${wrong.length === 1 ? "is not one of the names" : "are not names"} ${field} takes in the system ${system.name}: ${allowed.join(", ")}.${list}`;
}
