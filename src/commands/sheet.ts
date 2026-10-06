// The character sheet of the game system (D-204, D-207, DAT-2): its groups as show gives them, the fields a character still lacks, and the names a list takes (SYS-8).
import { listItemNames } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { isEmptyField, type Page, type World } from "../pages/index.ts";
import type { GameSystem, SheetEntry } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { signedText, workedFields, workedLine, workedMaximum, workedParts } from "./worked-out.ts";

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
        // A group the system works out whole is named as a group, such as Skills.
        return fields.every((field) => isWorkedOut(system, field)) ? [group.name] : fields.filter((field) => isWorkedOut(system, field));
    });
    const onSheet = sheetFields(system);
    const lineOnly = system.statusLine.map((entry) => entry.field).filter((field) => !isWorkedOut(system, field) && !onSheet.has(comparableText(field)));
    return {
        system: system.name,
        written: remindedFields(system),
        whenTheyApply: [...entries.filter((entry) => entry.optional).flatMap((entry) => entryFields([entry]).filter((field) => !isWorkedOut(system, field))), ...lineOnly],
        workedOut,
        lists: Object.keys(system.values).filter((field) => onSheet.has(comparableText(field))),
    };
}

/**
 * The fields of the system's character sheet that a page lacks (DAT-2): a player character's, or a companion's that does not derive from a creature; none for other
 * pages. Those written only when they apply are never missing (D-206), nor those the system works out (FOR-7).
 */
export function missingSheetFields(system: GameSystem | undefined, world: World, page: Page): string[]
{
    if (system === undefined || !isSheeted(page)) {
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
    if (system === undefined || !isSheeted(page)) {
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
    if (system === undefined || !isSheeted(page)) {
        return [];
    }

    const fields = effectiveFields(world, page);
    return system.sheet.flatMap((group) => {
        const shown = group.entries.flatMap((entry) => {
            const value = readField(fields, entry.field);
            return isEmptyField(value) ? [] : [`${entry.field} ${valueText(world, entry.field, value)}${besideText(world, fields, entry)}`];
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
    const group = system === undefined || !isSheeted(page) ? undefined : system.sheet.find((candidate) => comparableText(candidate.name) === comparableText(name.trim()));

    if (group === undefined) {
        return undefined;
    }

    const fields = effectiveFields(world, page);
    const worked = workedFields(world, fields, true);
    const lines = group.entries.flatMap((entry) => {
        const value = readField(fields, entry.field);
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
export function sheetGroupNames(system: GameSystem | undefined, page: Page): string[]
{
    return system === undefined || !isSheeted(page) ? [] : system.sheet.map((group) => group.name);
}

/** The fields the sheet of a character shows (DAT-2), which show leaves out of the fields as written; none for a page that shows no sheet. */
export function sheetFieldNames(system: GameSystem | undefined, page: Page): string[]
{
    return system === undefined || !isSheeted(page) ? [] : entryFields(system.sheet.flatMap((group) => group.entries));
}

/** Refuses items given to a list that the game system does not take, with the names it takes (SYS-8). */
export function checkListValues(system: GameSystem | undefined, lists: Record<string, unknown>): void
{
    for (const [field, value] of Object.entries(lists)) {
        const wrong = wrongValues(system, field, value);

        if (system !== undefined && wrong.length > 0) {
            throw new Error(`${wrongText(system, field, wrong)} Nothing changed.`);
        }
    }
}

/** The lists written on the campaign's pages with names the game system does not take (SYS-8), such as one written by hand. */
export function listValueProblems(world: World, system: GameSystem | undefined): Problem[]
{
    if (system === undefined || Object.keys(system.values).length === 0) {
        return [];
    }

    return world.pages.filter((page) => page.system === undefined).flatMap((page) =>
        Object.entries(page.fields).flatMap(([field, value]): Problem[] => {
            const wrong = wrongValues(system, field, value);
            return wrong.length === 0 ? [] : [{ path: page.path, message: `On ${page.name}: ${wrongText(system, field, wrong)}`, fix: `write ${page.name}, remove ${field}=${wrong[0]}, then add the right name` }];
        })
    );
}

/** The fields of the sheet a character writes and status reminds until they are (DAT-2): neither worked out by the system nor written only when they apply (D-206). */
function remindedFields(system: GameSystem): string[]
{
    return system.sheet.flatMap((group) => group.entries).filter((entry) => !entry.optional).flatMap((entry) => entryFields([entry]).filter((field) => !isWorkedOut(system, field)));
}

/** A player character, or a companion that does not derive from a creature, keeps the sheet of the system (DAT-2). */
function isSheeted(page: Page): boolean
{
    return page.type === "character" && (page.fields.role === "pc" || (page.fields.role === "companion" && page.fields.creature === undefined));
}

function isWorkedOut(system: GameSystem, field: string): boolean
{
    return system.formulas.computed.some(([name]) => comparableText(name) === comparableText(field));
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
    const value = entry.beside === undefined ? undefined : readField(fields, entry.beside);
    return entry.beside === undefined || isEmptyField(value) ? "" : ` (${valueText(world, entry.beside, value)})`;
}

/** A value as the sheet shows it: a modifier with its sign (FOR-8), the items of a list one after the other. */
function valueText(world: World, field: string, value: unknown): string
{
    if (typeof value === "number") {
        return signedText(world, field, value);
    }

    if (Array.isArray(value)) {
        return value.map(String).join("; ");
    }

    return typeof value === "object" && value !== null ? JSON.stringify(value) : String(value).trim();
}

function readField(fields: Record<string, unknown>, field: string): unknown
{
    return Object.entries(fields).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}

/** The items of a list that the game system does not take, by the names they are read as (SYS-8); none for a field without values. */
function wrongValues(system: GameSystem | undefined, field: string, value: unknown): string[]
{
    const allowed = Object.entries(system?.values ?? {}).find(([name]) => comparableText(name) === comparableText(field))?.[1];
    return allowed === undefined ? [] : listItemNames(value).filter((name) => !allowed.some((item) => comparableText(item) === comparableText(name)));
}

/** "Stealthh is not one of the names skill-proficiencies takes in the system 5e: Acrobatics, …": with how to write a list, when a name holds a comma. */
function wrongText(system: GameSystem, field: string, wrong: string[]): string
{
    const allowed = Object.entries(system.values).find(([name]) => comparableText(name) === comparableText(field))?.[1] ?? [];
    const list = wrong.some((name) => name.includes(",")) ? " A list is written [a, b]." : "";
    const names = wrong.map((name) => `"${name}"`).join(", ");
    return `${names} ${wrong.length === 1 ? "is not one of the names" : "are not names"} ${field} takes in the system ${system.name}: ${allowed.join(", ")}.${list}`;
}
