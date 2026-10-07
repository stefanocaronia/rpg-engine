import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { type FieldKind, fieldKinds } from "../core/field-kind.ts";
import { type Formula, type FormulaData, formulaOf, readFormulas, type SystemFormulas } from "../core/formula.ts";
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
    regain: z.record(z.string(), z.union([z.number(), z.string().min(1)])).optional(),
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
    counters: z.record(
        z.string(),
        z.object({
            min: z.union([z.number(), z.string().min(1)]).optional(),
            max: z.union([z.number(), z.string().min(1)]).optional(),
            refill: z.union([z.string().min(1), z.record(z.string().min(1), z.union([z.number(), z.string().min(1)]))]).optional(),
        }).strict(),
    ).optional(),
});

/** A recipe of the system (D-185, DAT-4): the fields it brings to their maximum or to a value, the occasions it ends, the rules to read for the rest. */
export interface Recipe
{
    name: string;
    /** By field, "max" or a value; a field ending in * stands for every field that begins so, such as slots-*. */
    set: Record<string, "max" | number>;
    /** By field, or by fields that begin so, how many come back in all, such as half the hit dice (DAT-4). */
    regain: Record<string, Formula>;
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
    /** The counters that come back with a rest, by name or by a name ending in *: a character has them full until it spends them (DAT-9). */
    uses: string[];
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

/** What a campaign may add to its game system in campaign.yaml (CAM-1): its own fields, tables, formulas, counters, recipes and line of the player character. */
export const campaignDataNames = ["fields", "tables", "computed", "counters", "recipes", "status-line"] as const;

/** What campaign.yaml adds to the game system, as it writes it: checked when the system is read with it (CAM-3). */
export type CampaignData = Partial<Record<(typeof campaignDataNames)[number], unknown>>;

/**
 * The installed system with what the campaign adds to it, the nearest layer winning (CAM-2); when the additions do not read, the system alone and why (CAM-3).
 * Undefined as a system when none is installed by that name.
 */
export function findCampaignSystem(folders: string[], name: string, data: CampaignData): { system?: GameSystem; problem?: string; }
{
    const system = findSystem(folders, name);

    if (system === undefined || campaignDataNames.every((key) => data[key] === undefined || data[key] === null)) {
        return { system };
    }

    try {
        return { system: findSystem(folders, name, data) };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { system, problem: message.replace(/^The game system .*? cannot be read, because .*? is not valid:\s*/s, "") };
    }
}

/**
 * The installed system with this name, ignoring case, from the nearest folder that has it, with what a campaign adds to it; undefined when none is. Only its own
 * system.yaml is read.
 */
export function findSystem(folders: string[], name: string, data?: CampaignData): GameSystem | undefined
{
    for (const folder of folders.filter((candidate) => existsSync(candidate))) {
        const entry = readdirSync(folder, { withFileTypes: true })
            .filter((candidate) => candidate.isDirectory() && comparableText(candidate.name) === comparableText(name.trim()))
            .sort((first, second) => (first.name < second.name ? -1 : 1))
            .find((candidate) => existsSync(join(folder, candidate.name, systemFileName)));

        if (entry !== undefined) {
            return readSystem(join(folder, entry.name), entry.name, data);
        }
    }

    return undefined;
}

function readSystem(folder: string, name: string, additions?: CampaignData): GameSystem
{
    const file = join(folder, systemFileName);
    const path = additions === undefined ? file : `${file} with the additions of campaign.yaml`;
    const raw = readYamlValues(file, 'what the system is, such as "title: ..."');
    let merged: unknown = raw;

    try {
        merged = additions === undefined ? raw : withCampaignData(raw, additions);
    } catch (error) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${error instanceof Error ? error.message : String(error)}`);
    }

    const parsed = systemSchema.safeParse(merged);

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
        recipes: Object.entries(data.recipes ?? {}).map(([recipe, value]) => ({
            name: recipe,
            set: value.set ?? {},
            regain: regainOf(value.regain ?? {}, name, path, recipe),
            ends: value.ends ?? [],
            rules: value.rules ?? [],
        })),
        conditions: data.conditions ?? [],
        formulas,
        ...(data.progression === undefined ? {} : { progression: { ...data.progression, skip: data.progression.skip ?? [] } }),
        uses: usesOf(data),
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

/**
 * A system's data with a campaign's additions over it (CAM-2): fields, tables, formulas and counters by name, the campaign's taking the place of the system's
 * with that name; a recipe added to the system's of that name, field by field, with its occasions and rules; the line's fields after the system's.
 */
function withCampaignData(raw: unknown, data: CampaignData): Record<string, unknown>
{
    const base = isMap(raw) ? raw : {};
    const merged: Record<string, unknown> = { ...base };

    for (const key of ["fields", "tables", "computed", "counters"] as const) {
        const added = mapOf(data[key], key);
        merged[key] = added === undefined ? base[key] : { ...withoutNames(isMap(base[key]) ? base[key] : {}, Object.keys(added)), ...added };
    }

    const recipes = mapOf(data.recipes, "recipes");

    if (recipes !== undefined) {
        const own = isMap(base.recipes) ? base.recipes : {};
        merged.recipes = { ...own, ...Object.fromEntries(Object.entries(recipes).map(([recipe, added]) => [nameIn(own, recipe) ?? recipe, recipeWith(own[nameIn(own, recipe) ?? ""], added, recipe)])) };
    }

    const line = data["status-line"];

    if (line !== undefined && line !== null) {
        if (!Array.isArray(line)) {
            throw new Error("status-line: give it as a list of fields, such as [portent?].");
        }

        const own = Array.isArray(base["status-line"]) ? base["status-line"].map(String) : [];
        const plain = (entry: string): string => comparableText(entry.replace(/\?$/, ""));
        merged["status-line"] = [...own, ...line.map(String).filter((entry) => !own.some((other) => plain(other) === plain(entry)))];
    }

    return merged;
}

/** A system's recipe with a campaign's over it (CAM-2): what both set and regain, the campaign's first, and the occasions and rules of both. */
function recipeWith(own: unknown, added: unknown, name: string): Record<string, unknown>
{
    if (!isMap(added)) {
        throw new Error(`recipes.${name}: give it as what it sets, regains, ends and the rules to read, such as {set: {superiority-dice: max}}.`);
    }

    const base = isMap(own) ? own : {};
    const map = (key: string): Record<string, unknown> | undefined =>
        isMap(base[key]) || isMap(added[key]) ? { ...withoutNames(isMap(base[key]) ? base[key] : {}, Object.keys(isMap(added[key]) ? added[key] : {})), ...(isMap(added[key]) ? added[key] : {}) } : undefined;

    const list = (key: string): unknown[] | undefined => {
        const items = [...(Array.isArray(base[key]) ? base[key] : []), ...(Array.isArray(added[key]) ? added[key] : [])];
        return items.length === 0 ? undefined : items.filter((item, index) => items.findIndex((other) => comparableText(String(other)) === comparableText(String(item))) === index);
    };

    const merged = { ...base, ...added, set: map("set"), regain: map("regain"), ends: list("ends"), rules: list("rules") };
    return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined));
}

/** An addition that must be a map by name, such as counters; undefined when the campaign gives none. */
function mapOf(value: unknown, key: string): Record<string, unknown> | undefined
{
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!isMap(value)) {
        throw new Error(`${key}: give it as a map by name, such as {superiority-dice: ...}.`);
    }

    return value;
}

/** The entries of a map whose names are none of these, as names are compared. */
function withoutNames(map: Record<string, unknown>, names: string[]): Record<string, unknown>
{
    return Object.fromEntries(Object.entries(map).filter(([name]) => !names.some((other) => comparableText(other) === comparableText(name))));
}

/** The name under which a map holds this one, as names are compared. */
function nameIn(map: Record<string, unknown>, name: string): string | undefined
{
    return Object.keys(map).find((key) => comparableText(key) === comparableText(name));
}

function isMap(value: unknown): value is Record<string, unknown>
{
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The counters that come back with a rest (DAT-9): those with a refill, and those a recipe sets or regains. */
function usesOf(data: z.infer<typeof systemSchema>): string[]
{
    const names = [
        ...Object.entries(data.counters ?? {}).filter(([, limits]) => limits.refill !== undefined).map(([name]) => name),
        ...Object.values(data.recipes ?? {}).flatMap((recipe) => [...Object.keys(recipe.set ?? {}), ...Object.keys(recipe.regain ?? {})]),
    ];
    return names.filter((name, index) => names.findIndex((other) => comparableText(other) === comparableText(name)) === index);
}

/** The formulas of a recipe's regain, each read at its place (FOR-9). */
function regainOf(regain: Record<string, number | string>, name: string, path: string, recipe: string): Record<string, Formula>
{
    return Object.fromEntries(
        Object.entries(regain).map(([field, amount]) => {
            try {
                return [field, formulaOf(amount)];
            } catch (error) {
                throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: recipes.${recipe}.regain.${field}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
    );
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
