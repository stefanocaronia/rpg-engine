import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { type FieldKind, fieldKinds } from "../core/field-kind.ts";
import { type FormulaData, readFormulas, type SystemFormulas } from "../core/formula.ts";
import { frozen } from "../core/frozen.ts";
import type { ProgressionRule } from "../core/progression-rule.ts";
import { comparableText } from "../core/text.ts";
import { readYamlValues } from "../core/yaml-file.ts";

/** The file that makes a folder a game system and says what it is. */
export const systemFileName = "system.yaml";

// An entry of the sheet: a field, ? when it is written only when it applies, and a field shown beside it in parentheses.
const sheetEntryPattern = /^([^\s()?]+)(\?)?(?: \(([^\s()?]+)\))?$/;

const recipeSchema = z.object({
    set: z.record(z.string(), z.union([z.literal("max"), z.number().int()])).optional(),
    ends: z.array(z.string().min(1)).optional(),
    rules: z.array(z.string().min(1)).optional(),
});

const systemSchema = z.object({
    title: z.string().min(1),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
    attribution: z.string().min(1).optional(),
    fields: z.record(z.string(), z.enum(fieldKinds)).optional(),
    coins: z.union([z.string().min(1), z.record(z.string(), z.unknown())]).optional(),
    round: z.string().regex(/^[1-9]\d* seconds?$/, 'write it as "6 seconds"').optional(),
    sheet: z.record(z.string().min(1), z.array(z.string().regex(sheetEntryPattern, 'write it as "str", "str (str-mod)" for a field shown beside it, or "flaw?" for one written only when it applies')).min(1), {
        error: "write the sheet as groups, each with its fields, such as Abilities: [str (str-mod), dex (dex-mod)]",
    }).optional(),
    "sheet-notes": z.record(z.string().min(1), z.string().min(1)).optional(),
    values: z.record(z.string().min(1), z.array(z.string().min(1)).min(1)).optional(),
    marks: z.array(z.string().min(1)).optional(),
    "status-line": z.array(z.string().min(1)).optional(),
    thresholds: z.record(z.string().regex(/^[^\s]+( -?\d+)?$/, 'write it as "hp 0", or the field alone'), z.string().min(1)).optional(),
    recipes: z.record(z.string(), recipeSchema).optional(),
    conditions: z.array(z.string().min(1)).optional(),
    tables: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    progression: z.object({
        list: z.string().min(1),
        features: z.string().min(1),
        skip: z.array(z.string().min(1)).optional(),
        parts: z.object({ list: z.string().min(1), field: z.string().min(1) }).strict().optional(),
    }).strict().optional(),
    computed: z.record(z.string(), z.union([z.number(), z.string().min(1), z.array(z.union([z.number(), z.string().min(1)]))])).optional(),
    counters: z.record(z.string(), z.object({ min: z.union([z.number(), z.string().min(1)]).optional(), max: z.union([z.number(), z.string().min(1)]).optional() }).strict()).optional(),
});

/** A recipe of the system (D-185, DAT-4): the fields it brings to their maximum or to a value, the occasions it ends, the rules to read for the rest. */
export interface Recipe
{
    name: string;
    /** By field, "max" or a value; a field ending in * stands for every field that begins so, such as slots-*. */
    set: Record<string, "max" | number>;
    ends: string[];
    rules: string[];
}

/** A threshold (D-184, DAT-3): a field, the value at which it matters, or none for every change, and the title of the rule to read. */
export interface Threshold
{
    field: string;
    value?: number;
    rule: string;
}

/** A group of the character sheet (D-207, DAT-2): its name, which show takes as Page#Group, its fields in order, and what write says of it when a character joins the party. */
export interface SheetGroup
{
    name: string;
    entries: SheetEntry[];
    note?: string;
}

/** A field of the sheet; one written only when it applies is never reminded (D-206); beside, a field shown next to it, such as str-mod by str. */
export interface SheetEntry
{
    field: string;
    optional: boolean;
    beside?: string;
}

/** An installed game system: what it is and what it declares (SYS-1). */
export interface GameSystem
{
    /** The name a campaign gives as its system: the folder's name, such as 5e. */
    name: string;
    /** The folder that holds its system.yaml and its pages. */
    folder: string;
    /** What it is, for messages: "the fifth edition, from the SRD 5.1". */
    title: string;
    /** The language it names its pages in, as a code such as en. */
    language: string;
    /** What a work that uses it must say of its source, when its license asks for it. */
    attribution?: string;
    /** The kind of each field it declares (SYS-8). */
    fields: Record<string, FieldKind>;
    /** Its coins, as config takes them, "gp 100, sp 10, cp 1", or as campaign.yaml writes them (D-182, DAT-1). */
    coins?: string | Record<string, unknown>;
    /** How long a round lasts, in seconds (D-187, DAT-7). */
    roundSeconds?: number;
    /** The groups of a character sheet, in order (D-183, D-207, DAT-2). */
    sheet: SheetGroup[];
    /** The names a list field accepts, by field, such as the skills of save-proficiencies (SYS-8). */
    values: Record<string, string[]>;
    /** The lists whose items mark a number of the sheet that reads them, such as a proficiency (D-217, DAT-2). */
    marks: string[];
    /** The fields the line of a character shows, in order; whenSet marks a field usually at zero, shown only when it is not (DAT-2, DAT-4). */
    statusLine: { field: string; whenSet: boolean; }[];
    thresholds: Threshold[];
    recipes: Recipe[];
    /** The names of its conditions (D-186, DAT-6). */
    conditions: string[];
    /** What it works out from the fields of a page (D-199, FOR-1). */
    formulas: SystemFormulas;
    /** How the classes of a character give the rows of their tables and their features (D-219, PRO-1–PRO-3). */
    progression?: ProgressionRule;
}

/** The systems installed in these folders, nearest folder first: each folder in them with a system.yaml. A name found twice is the nearest one. */
export function installedSystems(folders: string[]): GameSystem[]
{
    const systems: GameSystem[] = [];

    for (const folder of folders.filter((candidate) => existsSync(candidate))) {
        for (const entry of readdirSync(folder, { withFileTypes: true }).filter((candidate) => candidate.isDirectory()).sort((first, second) => (first.name < second.name ? -1 : 1))) {
            if (existsSync(join(folder, entry.name, systemFileName)) && !systems.some((system) => comparableText(system.name) === comparableText(entry.name))) {
                systems.push(readSystem(join(folder, entry.name), entry.name));
            }
        }
    }

    return systems;
}

/** The installed system with this name, ignoring case, from the nearest folder that has it; undefined when none is. Only its own system.yaml is read. */
export function findSystem(folders: string[], name: string): GameSystem | undefined
{
    for (const folder of folders.filter((candidate) => existsSync(candidate))) {
        const entry = readdirSync(folder, { withFileTypes: true })
            .filter((candidate) => candidate.isDirectory() && comparableText(candidate.name) === comparableText(name.trim()))
            .sort((first, second) => (first.name < second.name ? -1 : 1))
            .find((candidate) => existsSync(join(folder, candidate.name, systemFileName)));

        if (entry !== undefined) {
            return readSystem(join(folder, entry.name), entry.name);
        }
    }

    return undefined;
}

function readSystem(folder: string, name: string): GameSystem
{
    const path = join(folder, systemFileName);
    const parsed = systemSchema.safeParse(readYamlValues(path, 'what the system is, such as "title: ..."'));

    if (!parsed.success) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid:\n${z.prettifyError(parsed.error)}`);
    }

    const data = parsed.data;
    const formulas = systemFormulas(data, name, path);
    const sheet = sheetOf(data, name, path);
    const values = data.values ?? {};
    const kindOf = (field: string): string | undefined => Object.entries(data.fields ?? {}).find(([declared]) => comparableText(declared) === comparableText(field))?.[1];
    const notList = Object.keys(values).find((field) => kindOf(field) !== "list");

    if (notList !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: values.${notList}: declare ${notList} as a list in fields, or give no values to it.`);
    }

    const notMarking = [...(data.marks ?? []), ...[data.progression?.list, data.progression?.parts?.list].filter((field) => field !== undefined)].find((field) => kindOf(field) !== "list");

    if (notMarking !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${notMarking} is not declared as a list in fields, as marks and progression need.`);
    }

    return frozen({
        name,
        folder,
        title: data.title,
        language: data.language,
        attribution: data.attribution,
        fields: data.fields ?? {},
        coins: data.coins,
        roundSeconds: data.round === undefined ? undefined : Number.parseInt(data.round, 10),
        sheet,
        values,
        marks: data.marks ?? [],
        statusLine: (data["status-line"] ?? []).map((entry) => ({ field: entry.replace(/\?$/, ""), whenSet: entry.endsWith("?") })),
        thresholds: Object.entries(data.thresholds ?? {}).map(([key, rule]) => {
            const [field, value] = key.split(" ");
            return { field, value: value === undefined ? undefined : Number(value), rule };
        }),
        recipes: Object.entries(data.recipes ?? {}).map(([recipe, value]) => ({ name: recipe, set: value.set ?? {}, ends: value.ends ?? [], rules: value.rules ?? [] })),
        conditions: data.conditions ?? [],
        formulas,
        ...(data.progression === undefined ? {} : { progression: { ...data.progression, skip: data.progression.skip ?? [] } }),
    });
}

/** The groups of a system's sheet, each with its note; a note for a group the sheet does not have is refused. */
function sheetOf(data: z.infer<typeof systemSchema>, name: string, path: string): SheetGroup[]
{
    const groups = Object.entries(data.sheet ?? {});
    const notes = Object.entries(data["sheet-notes"] ?? {});
    const stray = notes.find(([group]) => !groups.some(([other]) => comparableText(other) === comparableText(group)));

    if (stray !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-notes.${stray[0]}: the sheet has no group ${stray[0]}; its groups are ${groups.map(([group]) => group).join(", ")}.`);
    }

    return groups.map(([group, entries]) => {
        const note = notes.find(([other]) => comparableText(other) === comparableText(group))?.[1];
        return {
            name: group,
            entries: entries.map((entry) => {
                const [, field, optional, beside] = sheetEntryPattern.exec(entry) ?? [];
                return { field, optional: optional === "?", ...(beside === undefined ? {} : { beside }) };
            }),
            ...(note === undefined ? {} : { note }),
        };
    });
}

/** The formulas of a system, read once; a system whose formulas do not read cannot be read either (FOR-9). */
function systemFormulas(data: FormulaData, name: string, path: string): SystemFormulas
{
    try {
        return readFormulas(data);
    } catch (error) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${error instanceof Error ? error.message : String(error)}`);
    }
}
