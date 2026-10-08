// The character sheet of the game system (D-204, D-207, DAT-2): its groups as show gives them, the fields a character still lacks, and the names a list takes (SYS-8).
import { listItemNames } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { isEmptyField, type Page, type World } from "../pages/index.ts";
import { fieldName } from "../progression/index.ts";
import type { GameSystem, SheetEntry, SheetGroup } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { experienceOf, experienceText } from "./game-experience.ts";
import { progressionOf } from "./progression.ts";
import { hasSheet, isUse, itemLines, itemList, signedText, workedFields, workedLine, workedMaximum, workedParts } from "./worked-out.ts";

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

/**
 * "Abilities: str 14 (+2) · dex 12 (+1)…": the sheet of a player character or a companion, a line for each group with a value, as the character reads it, effects
 * and formulas included (DAT-2). None for other pages, which show their fields as written, with where each comes from.
 */
export function sheetLines(world: World, system: GameSystem | undefined, page: Page): string[]
{
    if (system === undefined || !hasSheet(world, page)) {
        return [];
    }

    const fields = effectiveFields(world, page);
    const marks = markCounts(world, system, fields);
    return system.sheet.flatMap((group) => {
        const list = itemGroupList(world, group);

        // A group of what the items of one list give is shown item by item, as the attacks of the weapons equipped (PRO-5).
        if (list !== undefined) {
            const items = itemLines(world, fields, list, entryFields(group.entries));
            return items.length === 0 ? [] : [`${group.name}: ${items.map((item) => `${item.item} ${item.values.map((value) => valueText(world, value.field, value.value)).join(", ")}`).join(" · ")}`];
        }

        const shown = groupEntries(world, system, group, fields).flatMap((entry) => {
            const value = valueNamed(fields, entry.field);
            const marked = "●".repeat(marks.get(comparableText(entry.field)) ?? 0);
            return isEmptyField(value) ? [] : [`${entry.field} ${valueText(world, entry.field, value)}${marked === "" ? "" : ` ${marked}`}${besideText(world, fields, entry)}`];
        });
        return shown.length === 0 ? [] : [`${group.name}: ${shown.join(" · ")}`];
    });
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

/** " (+2)": the field shown beside an entry, such as str-mod by str, when it has a value. */
function besideText(world: World, fields: Record<string, unknown>, entry: SheetEntry): string
{
    // Beside the points, how many the next level needs, or the level they reach (PRO-6).
    const experience = comparableText(entry.field) === comparableText(world.system?.progression?.experience?.field ?? "") ? experienceOf(world, fields) : undefined;
    const text = experience === undefined ? undefined : experienceText(experience);

    if (text !== undefined) {
        return ` (${text})`;
    }

    const value = entry.beside === undefined ? undefined : valueNamed(fields, entry.beside);
    return entry.beside === undefined || isEmptyField(value) ? "" : ` (${valueText(world, entry.beside, value)})`;
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
