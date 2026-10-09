import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { type FieldKind, fieldKinds } from "../core/field-kind.ts";
import { type Formula, type FormulaData, formulaOf, readFormulas, type SystemFormulas } from "../core/formula.ts";
import { frozen } from "../core/frozen.ts";
import { type ImperialUnits, lengthHelp, readLength, readSpeed, speedHelp } from "../core/length.ts";
import type { ProgressionRule } from "../core/progression-rule.ts";
import { files } from "../core/store.ts";
import { comparableText, sameName } from "../core/text.ts";
import { readYamlValues } from "../core/yaml-file.ts";

/** The file that makes a folder a game system and says what it is. */
export const systemFileName = "system.yaml";

// An entry of the sheet: a field, ? when it is written only when it applies, and a field shown beside it in parentheses.
const sheetEntryPattern = /^([^\s()?]+)(\?)?(?: \(([^\s()?]+)\))?$/;
// The dice a number of the sheet is rolled with: dice alone, as 1d20 or 2d6+1d4 (D-280).
const sheetDicePattern = /^\d*d\d+(?:\+\d*d\d+)*$/;

const recipeSchema = z.object({
    set: z.record(z.string(), z.union([z.literal("max"), z.number().int()])).optional(),
    regain: z.record(z.string(), z.union([z.number(), z.string().min(1)])).optional(),
    ends: z.array(z.string().min(1)).optional(),
    rules: z.array(z.string().min(1)).optional(),
}).strict();

const lengthSchema = z.string().refine((text) => readLength(text) !== undefined, `write it ${lengthHelp}`);
const speedSchema = z.string().refine((text) => readSpeed(text) !== undefined, `write ${speedHelp}`);
// A factor of speed, such as 1/2 for difficult terrain, or 0.5.
const factorSchema = z.union([z.number().positive(), z.string().regex(/^\d+\/[1-9]\d*$/, "write it as 1/2, or as a number such as 0.5")]);
const hoursSchema = z.number().positive().max(24);

const travelSchema = z.object({
    paces: z.record(z.string().min(1), speedSchema).optional(),
    pace: z.string().min(1).optional(),
    hours: hoursSchema.optional(),
    rule: z.string().min(1).optional(),
    beyond: z.string().min(1).optional(),
    terrain: z.record(z.string().min(1), factorSchema).optional(),
    kinds: z.record(
        z.string().min(1),
        z.object({
            vehicle: z.record(z.string().min(1), z.string().min(1)).refine((match) => Object.keys(match).length === 1, "give one field and its value, such as {category: waterborne vehicle}").optional(),
            speed: z.string().min(1).optional(),
            hours: hoursSchema.optional(),
            current: speedSchema.optional(),
        }).strict().refine((kind) => (kind.vehicle === undefined) === (kind.speed === undefined), "give vehicle and speed together: what carries one on it, and its field that holds its speed"),
    ).optional(),
}).strict().refine((travel) => travel.pace === undefined || Object.keys(travel.paces ?? {}).some((pace) => comparableText(pace) === comparableText(travel.pace ?? "")), {
    message: "pace must be one of paces",
    path: ["pace"],
});

const systemSchema = z.object({
    title: z.string().min(1),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
    attribution: z.string().min(1).optional(),
    fields: z.record(z.string(), z.enum(fieldKinds)).optional(),
    coins: z.union([z.string().min(1), z.record(z.string(), z.unknown())]).optional(),
    round: z.string().regex(/^[1-9]\d* seconds?$/, 'write it as "6 seconds"').optional(),
    imperial: z.object({ mile: lengthSchema, foot: lengthSchema }).strict().optional(),
    travel: travelSchema.optional(),
    sheet: z.record(z.string().min(1), z.array(z.string().regex(sheetEntryPattern, 'write it as "str", "str (str-mod)" for a field shown beside it, or "flaw?" for one written only when it applies')).min(1), {
        error: "write the sheet as groups, each with its fields, such as Abilities: [str (str-mod), dex (dex-mod)]",
    }).optional(),
    "sheet-notes": z.record(z.string().min(1), z.string().min(1)).optional(),
    "sheet-dice": z.record(z.string().regex(sheetDicePattern), z.array(z.string().min(1)).min(1), {
        error: "write it as dice alone, as 1d20 or 2d6+1d4, and the fields of the sheet rolled with them, such as 1d20: [athletics, stealth]",
    }).optional(),
    values: z.record(z.string().min(1), z.array(z.string().min(1)).min(1)).optional(),
    marks: z.array(z.string().min(1)).optional(),
    "status-line": z.array(z.string().min(1)).optional(),
    thresholds: z.record(z.string().regex(/^[^\s]+( -?\d+)?$/, 'write it as "hp 0", or the field alone'), z.string().min(1)).optional(),
    recipes: z.record(z.string(), recipeSchema).optional(),
    conditions: z.array(z.string().min(1)).optional(),
    keeping: z.object({ counter: z.string().min(1), conditions: z.array(z.string().min(1)).optional(), rules: z.string().min(1) }, {
        error: "write it as what can break what someone keeps alive, such as {counter: hp, conditions: [Unconscious], rules: Concentration}",
    }).strict().optional(),
    tables: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    progression: z.object({
        list: z.string().min(1),
        features: z.string().min(1),
        skip: z.array(z.string().min(1)).optional(),
        parts: z.object({ list: z.string().min(1), field: z.string().min(1), lists: z.array(z.string().min(1)).optional() }).strict().optional(),
        experience: z.object({ field: z.string().min(1), table: z.string().min(1), rules: z.string().min(1).optional() }).strict().optional(),
    }).strict().optional(),
    settings: z.record(
        z.string().min(1),
        z.record(z.string().min(1), z.object({ means: z.string().min(1), without: z.array(z.string().min(1)).optional() }).strict()).refine(
            (values) => Object.keys(values).length >= 2,
            "give at least two values, each with what it means, such as {xp: {means: ...}, milestones: {means: ...}}",
        ),
    ).optional(),
    rewards: z.record(z.string().min(1), z.object({ from: z.string().min(1), overcome: z.string().regex(/^[^\s]+ -?\d+$/, 'write it as "hp 0"') }).strict()).optional(),
    "item-formulas": z.record(z.string().min(1), z.array(z.string().min(1)).min(1)).optional(),
    "always-in": z.record(z.string().min(1), z.array(z.string().min(1)).min(1), { error: "write it as lists, each with the names of the pages in it, such as equipped: [Unarmed Strike]" }).optional(),
    computed: z.record(z.string(), z.union([z.number(), z.string().min(1), z.array(z.union([z.number(), z.string().min(1)]))])).optional(),
    counters: z.record(
        z.string(),
        z.object({
            min: z.union([z.number(), z.string().min(1)]).optional(),
            max: z.union([z.number(), z.string().min(1)]).optional(),
            refill: z.union([z.string().min(1), z.record(z.string().min(1), z.union([z.number(), z.string().min(1)]))]).optional(),
            shields: z.string().min(1).optional(),
        }).strict(),
    ).optional(),
}).strict();

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

/** What can break what someone keeps alive (D-266, EFF-14): their counter going down, the conditions they may take, and the title of the rule to read. */
export interface Keeping
{
    counter: string;
    conditions: string[];
    rules: string;
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

/** A setting the setup asks for the system (D-212, DAT-10): its values, each with what it means and the fields it leaves out of the sheet. */
export interface SystemSetting
{
    name: string;
    values: { value: string; means: string; without: string[]; }[];
}

/** What the creatures overcome in a scene give the party (DAT-11): the field of the party, the creatures' field that gives it, and the counter at which one is overcome. */
export interface Reward
{
    field: string;
    from: string;
    counter: string;
    value: number;
}

/** How one travels in the game (TRV-1–TRV-3, TRV-8): its paces, the hours of a day's travel, what terrain does to a pace, the kinds of road. */
export interface Travel
{
    /** By name, the distance of an hour, in metres. */
    paces: Record<string, number>;
    /** The pace used when none is given: the one the system names, else the first. */
    pace?: string;
    /** How many hours one travels in a day; beyond them, the rule `beyond` says what happens. */
    hours?: number;
    /** The title of the rule that tells what each pace does. */
    rule?: string;
    beyond?: string;
    /** By value of the environment's terrain entry, what it multiplies the speed of a pace by. */
    terrain: Record<string, number>;
    kinds: TravelKind[];
}

/** A kind of road (D-260, TRV-2): travelled at a pace, or only in a vehicle that has a field with a value, at the speed its field holds; its hours of a day; its current, downstream. */
export interface TravelKind
{
    name: string;
    vehicle?: { field: string; value: string; speed: string; };
    hours?: number;
    /** Metres an hour, added going downstream. */
    current?: number;
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
    /** How many metres its mile and foot are worth, when it has its own (D-262): outputs in imperial use them. */
    imperial?: ImperialUnits;
    /** How one travels, when the game says so (D-261, TRV-1). */
    travel?: Travel;
    /** The groups of a character sheet, in order (D-183, D-207, DAT-2). */
    sheet: SheetGroup[];
    /** By field, the dice a number of the sheet is rolled with, for the dashboard's free roll (D-280), such as 1d20 by insight. */
    sheetDice: Record<string, string>;
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
    /** What can break what someone keeps alive, when the game has it (EFF-14). */
    keeping?: Keeping;
    /** By counter, the counter it shields, which loses from it first, as temp-hp shields hp (DAT-14). */
    shields: Record<string, string>;
    /** What it works out from the fields of a page (D-199, FOR-1). */
    formulas: SystemFormulas;
    /** How the classes of a character give the rows of their tables and their features (D-219, PRO-1–PRO-3). */
    progression?: ProgressionRule;
    /** By list, the fields whose value on the page of each item is a formula worked out on who lists it, as a class's spell-save-dc or an armor's armor-class (PRO-5). */
    itemFormulas: Record<string, string[]>;
    /** By list, the pages every character who keeps the sheet has in it without writing them, as the unarmed strike in equipped (DAT-13, D-235). */
    alwaysIn: Record<string, string[]>;
    /** The counters that come back with a rest, by name or by a name ending in *: a character has them full until it spends them (DAT-9). */
    uses: string[];
    /** The settings it adds to the setup (DAT-10). */
    settings: SystemSetting[];
    /** The fields the campaign's settings leave out, as xp with milestones (DAT-10). */
    leftOut: string[];
    /** What the creatures overcome in a scene give the party (DAT-11). */
    rewards: Reward[];
    /**
     * Its parts of the master's instructions, by name, from instructions/<part>.md: each adds to the core's part of that name, such as creation or fight, or takes
     * its place when its frontmatter says replace: true (D-121).
     */
    parts: Record<string, InstructionPart>;
}

/** A part of the master's instructions as a layer gives it: its text, and whether it takes the place of the layers below instead of adding to them (D-121). */
export interface InstructionPart
{
    text: string;
    replace: boolean;
}

/**
 * The system as a campaign plays it, with the values its settings have (DAT-10): the fields a value leaves out are gone from the sheet, the line, the experience
 * and the rewards. A setting without a value, or with one the system lacks, leaves out nothing.
 */
export function withSettings(system: GameSystem, valueOf: (setting: string) => string | undefined): GameSystem
{
    const leftOut = system.settings.flatMap((setting) => {
        const chosen = valueOf(setting.name);
        return setting.values.find((value) => chosen !== undefined && comparableText(value.value) === comparableText(chosen))?.without ?? [];
    });

    if (leftOut.length === 0) {
        return system;
    }

    const kept = (field: string): boolean => !leftOut.some((name) => comparableText(name) === comparableText(field));
    const progression = system.progression === undefined ? undefined : withoutExperience(system.progression, kept);
    return frozen({
        ...system,
        sheet: system.sheet.map((group) => ({ ...group, entries: group.entries.filter((entry) => kept(entry.field)) })).filter((group) => group.entries.length > 0),
        statusLine: system.statusLine.filter((entry) => kept(entry.field)),
        ...(progression === undefined ? {} : { progression }),
        rewards: system.rewards.filter((reward) => kept(reward.field)),
        leftOut,
    });
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

/** What a campaign may add to its game system in campaign.yaml (CAM-1): its own fields, tables, formulas, counters, recipes, line of the player character and travel. */
export const campaignDataNames = ["fields", "tables", "computed", "counters", "recipes", "status-line", "travel"] as const;

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
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${issuesText(parsed.error)}`);
    }

    const data = parsed.data;
    // What a counter shields is no limit of it: a counter with only that has none (DAT-14).
    const limited = Object.entries(data.counters ?? {}).flatMap(([counter, { min, max, refill }]) => min === undefined && max === undefined && refill === undefined ? [] : [[counter, { min, max, refill }] as const]);
    const formulas = systemFormulas({ ...data, counters: Object.fromEntries(limited) }, name, path);
    const stray = strayOccasion(data, formulas);

    if (stray !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${stray}`);
    }

    const sheet = sheetOf(data, name, path);
    const values = data.values ?? {};
    const kindOf = (field: string): string | undefined => Object.entries(data.fields ?? {}).find(([declared]) => comparableText(declared) === comparableText(field))?.[1];
    const notList = Object.keys(values).find((field) => kindOf(field) !== "list");

    if (notList !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: values.${notList}: declare ${notList} as a list in fields, or give no values to it.`);
    }

    // What breaks what someone keeps, and what a counter shields, read counters (EFF-14, DAT-14).
    const counted = [
        ...(data.keeping === undefined ? [] : [{ where: "keeping.counter", field: data.keeping.counter }]),
        ...Object.entries(data.counters ?? {}).flatMap(([counter, limits]) => (limits.shields === undefined ? [] : [{ where: `counters.${counter}.shields`, field: limits.shields }])),
    ].find((entry) => kindOf(entry.field) !== "counter");

    const unknownCondition = data.keeping?.conditions?.find((condition) => !(data.conditions ?? []).some((named) => comparableText(named) === comparableText(condition)));

    if (unknownCondition !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: keeping.conditions: ${unknownCondition} is not one of its conditions.`);
    }

    if (counted !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${counted.where}: ${counted.field} is not declared as a counter in fields.`);
    }

    const notMarking = [...(data.marks ?? []), ...[data.progression?.list, data.progression?.parts?.list].filter((field) => field !== undefined)].find((field) => kindOf(field) !== "list");

    if (notMarking !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${notMarking} is not declared as a list in fields, as marks and progression need.`);
    }

    // Each number rolled with dice is a declared field, and has one set of dice (D-280).
    const rolled = Object.entries(data["sheet-dice"] ?? {}).flatMap(([dice, fields]) => fields.map((field): [string, string] => [field, dice]));
    const undeclared = rolled.find(([field]) => kindOf(field) === undefined);
    const twice = rolled.find(([field], index) => rolled.findIndex(([other]) => comparableText(other) === comparableText(field)) !== index);

    if (undeclared !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-dice.${undeclared[1]}: ${undeclared[0]} is not declared in fields.`);
    }

    if (twice !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-dice: ${twice[0]} is listed twice; give each field one set of dice.`);
    }

    const experience = data.progression?.experience?.table;

    if (experience !== undefined && !Object.keys(formulas.tables).some((table) => comparableText(table) === comparableText(experience))) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: progression.experience.table: there is no table ${experience} in tables.`);
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
        ...(data.imperial === undefined ? {} : { imperial: { mile: readLength(data.imperial.mile) ?? 0, foot: readLength(data.imperial.foot) ?? 0 } }),
        ...(data.travel === undefined ? {} : { travel: travelOf(data.travel) }),
        sheet,
        sheetDice: Object.fromEntries(rolled),
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
        ...(data.keeping === undefined ? {} : { keeping: { counter: data.keeping.counter, conditions: data.keeping.conditions ?? [], rules: data.keeping.rules } }),
        shields: Object.fromEntries(Object.entries(data.counters ?? {}).flatMap(([counter, limits]) => (limits.shields === undefined ? [] : [[counter, limits.shields]]))),
        formulas,
        ...(data.progression === undefined ? {} : { progression: progressionRule(data.progression) }),
        itemFormulas: data["item-formulas"] ?? {},
        alwaysIn: data["always-in"] ?? {},
        uses: usesOf(data),
        settings: Object.entries(data.settings ?? {}).map(([setting, values]) => ({
            name: setting,
            values: Object.entries(values).map(([value, meaning]) => ({ value, means: meaning.means, without: meaning.without ?? [] })),
        })),
        leftOut: [],
        rewards: Object.entries(data.rewards ?? {}).map(([field, reward]) => {
            const [counter, value] = reward.overcome.split(" ");
            return { field, from: reward.from, counter, value: Number(value) };
        }),
        parts: readParts(folder, name),
    });
}

/**
 * "counters.superiority-dice: unknown key "Combat Superiority)", a formula with commas goes in quotes": the problems of a system's data, one after the other on
 * a line, each at its place.
 */
function issuesText(error: z.ZodError): string
{
    return error.issues.map((issue) => {
        const place = issue.path.map(String).join(".");
        const keys = issue.code === "unrecognized_keys" ? issue.keys : [];
        const quotes = keys.some((key) => /[()]/.test(key)) ? ": a formula with commas goes in quotes" : "";
        const vague = issue.message === "Invalid input" ? "not a value it takes, as system.yaml writes it" : issue.message;
        const message = keys.length > 0 ? `unknown ${keys.length === 1 ? "key" : "keys"} ${keys.map((key) => `"${key}"`).join(", ")}${quotes}` : vague;
        return place === "" ? `${message}.` : `${place}: ${message}.`;
    }).join(" ");
}

/**
 * A recipe that sets kept rolls (KEP-4), or a refill on an occasion that no recipe ends, which would never bring the use back (DAT-9): where it is and why;
 * undefined when there is none.
 */
function strayOccasion(data: z.infer<typeof systemSchema>, formulas: SystemFormulas): string | undefined
{
    const occasions = Object.values(data.recipes ?? {}).flatMap((recipe) => recipe.ends ?? []).filter((occasion, index, all) => all.findIndex((other) => comparableText(other) === comparableText(occasion)) === index);

    // Kept rolls come back as the player rolls them again (KEP-4), never at a value a recipe gives.
    for (const [recipe, value] of Object.entries(data.recipes ?? {})) {
        const rolls = Object.keys(value.set ?? {}).find((field) => Object.entries(data.fields ?? {}).some(([declared, kind]) => kind === "rolls" && comparableText(declared) === comparableText(field)));

        if (rolls !== undefined) {
            return `recipes.${recipe}.set.${rolls}: ${rolls} keeps rolls, which come back as they are rolled again with roll and keep, not at a value.`;
        }
    }

    for (const [counter, limits] of Object.entries(formulas.counters)) {
        const occasion = Object.keys(limits.refill ?? {}).find((candidate) => !occasions.some((other) => comparableText(other) === comparableText(candidate)));

        if (occasion !== undefined) {
            const known = occasions.length === 0 ? "no recipe ends one yet: give a recipe its ends" : `the occasions are ${occasions.join(", ")}`;
            return `counters.${counter}.refill: ${occasion} is no occasion a recipe ends, so it would never come back; ${known}.`;
        }
    }

    return undefined;
}

/** The progression as the system declares it (PRO-1–PRO-4, PRO-6). */
function progressionRule(data: NonNullable<z.infer<typeof systemSchema>["progression"]>): ProgressionRule
{
    const { skip, ...rule } = data;
    return { ...rule, skip: skip ?? [] };
}

/** The system's parts of the master's instructions, from the files of its instructions folder: a part is named after its file (D-121). */
function readParts(folder: string, name: string): Record<string, InstructionPart>
{
    const parts: Record<string, InstructionPart> = {};

    for (const path of files().files(join(folder, "instructions"), (file) => file.endsWith(".md"))) {
        parts[basename(path, ".md")] = partOf(files().text(path) ?? "", name, path);
    }

    return parts;
}

/** A part from its file: the text after its frontmatter, which says only whether it takes the place of the core's part, replace: true (D-121). */
function partOf(file: string, system: string, path: string): InstructionPart
{
    const text = file.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    let settings: unknown;

    try {
        settings = frontmatter === null ? {} : (parse(frontmatter[1]) ?? {});
    } catch {
        settings = undefined;
    }

    const parsed = z.object({ replace: z.boolean().optional() }).strict().safeParse(settings);

    if (!parsed.success) {
        throw new Error(`The game system ${system} cannot be read, because ${path} is not valid: a part's frontmatter says only replace: true, for a part that takes the place of the core's.`);
    }

    return { text: (frontmatter === null ? text : text.slice(frontmatter[0].length)).trim(), replace: parsed.data.replace === true };
}

/** The progression without its experience, when a setting leaves its field out (DAT-10). */
function withoutExperience(progression: ProgressionRule, kept: (field: string) => boolean): ProgressionRule
{
    if (progression.experience === undefined || kept(progression.experience.field)) {
        return progression;
    }

    const rest = { ...progression };
    delete rest.experience;
    return rest;
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
 * with that name; a recipe added to the system's of that name, field by field, with its occasions and rules; the line's fields after the system's; travel key
 * by key, its paces, terrain and kinds by name.
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

    const travel = mapOf(data.travel, "travel");

    if (travel !== undefined) {
        const own = isMap(base.travel) ? base.travel : {};
        const byName = (key: string): unknown => (isMap(travel[key]) ? { ...withoutNames(isMap(own[key]) ? own[key] : {}, Object.keys(travel[key])), ...travel[key] } : own[key]);
        merged.travel = Object.fromEntries(Object.entries({ ...own, ...travel, paces: byName("paces"), terrain: byName("terrain"), kinds: byName("kinds") }).filter(([, value]) => value !== undefined));
    }

    const line = data["status-line"];

    if (line !== undefined && line !== null) {
        if (!Array.isArray(line)) {
            throw new Error("status-line: give it as a list of fields, such as [portent?].");
        }

        const own = Array.isArray(base["status-line"]) ? base["status-line"].map(String) : [];
        const plain = (entry: string): string => comparableText(entry.replace(/\?$/, ""));
        const added = line.map(String).filter((entry, index, all) => all.findIndex((other) => plain(other) === plain(entry)) === index);
        merged["status-line"] = [...own, ...added.filter((entry) => !own.some((other) => plain(other) === plain(entry)))];
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
    return sameName(Object.keys(map), name);
}

/** The system's travel as the engine reads it (TRV-1–TRV-3): speeds in metres an hour, factors as numbers. */
function travelOf(data: z.infer<typeof travelSchema>): Travel
{
    const paces = Object.fromEntries(Object.entries(data.paces ?? {}).map(([name, speed]) => [name, readSpeed(speed) ?? 0]));
    return {
        paces,
        pace: data.pace === undefined ? Object.keys(paces)[0] : sameName(Object.keys(paces), data.pace),
        hours: data.hours,
        rule: data.rule,
        beyond: data.beyond,
        terrain: Object.fromEntries(Object.entries(data.terrain ?? {}).map(([value, factor]) => [value, factorOf(factor)])),
        kinds: Object.entries(data.kinds ?? {}).map(([name, kind]) => {
            const [field, value] = Object.entries(kind.vehicle ?? {})[0] ?? [];
            return {
                name,
                ...(field === undefined || value === undefined || kind.speed === undefined ? {} : { vehicle: { field, value, speed: kind.speed } }),
                hours: kind.hours,
                current: kind.current === undefined ? undefined : readSpeed(kind.current),
            };
        }),
    };
}

/** A factor of speed as a number: 1/2 is 0.5. */
function factorOf(factor: number | string): number
{
    if (typeof factor === "number") {
        return factor;
    }

    const [numerator, denominator] = factor.split("/").map(Number);
    return numerator / denominator;
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
