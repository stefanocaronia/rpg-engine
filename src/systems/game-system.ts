import { join } from "node:path";
import { z } from "zod";
import { type FieldKind, fieldKinds } from "../core/field-kind.ts";
import { type Formula, type FormulaData, formulaOf, parseFormula, readFormulas, type SystemFormulas } from "../core/formula.ts";
import { frozen } from "../core/frozen.ts";
import { type InstructionPart, readParts } from "../core/instruction-parts.ts";
import { type ImperialUnits, lengthHelp, readLength, readSpeed, speedHelp } from "../core/length.ts";
import { type DeclaredWidget, declaredWidgets, type FigureSize, packagePartsIssues, packagePartsShape } from "../core/package-declarations.ts";
import type { ProgressionRule } from "../core/progression-rule.ts";
import { files } from "../core/store.ts";
import { comparableText, sameName } from "../core/text.ts";
import { readYamlValues } from "../core/yaml-file.ts";
import { systemApiProblem, systemHasCode } from "./system-code.ts";
import { systemFolders } from "./system-folders.ts";

/** The file that makes a folder a game system and says what it is. */
export const systemFileName = "system.yaml";

/**
 * What the player does with an item of the sheet on the dashboard, said as their own sentence to the master (D-495): the engine's verbs, whose sentences
 * the page has in every language; a system says which fields take which. Talking to someone comes from the people, never from the sheet.
 */
export const actVerbs = ["attack", "cast", "use", "equip", "unequip", "prepare"] as const;

export type ActVerb = (typeof actVerbs)[number];

// An entry of the sheet: a field, ? when it is written only when it applies, and a field shown beside it in parentheses.
const sheetEntryPattern = /^([^\s()?]+)(\?)?(?: \(([^\s()?]+)\))?$/;
// The dice a number of the sheet is rolled with: dice alone, as 1d20 or 2d6+1d4 (D-280).
const sheetDicePattern = /^\d*d\d+(?:\+\d*d\d+)*$/;
// A roll the game has a name for: dice of one kind, with the highest or the lowest kept or dropped, as 2d20kh1 (D-399).
const rollNamePattern = /^\d*d(?:\d+|%)(?:[kd][hl]\d*)?$/i;
// A field named in the headline under a character's name: {level} (D-288).
const headlineFieldPattern = /\{([^{}]+)\}/g;
// A group's icon on the dashboard: the d of an SVG path, its letters and numbers alone (D-284).
const iconPattern = /^[Mm][MmLlHhVvCcSsQqTtAaZz\d.,\s+-]*$/;

const recipeSchema = z.object({
    set: z.record(z.string(), z.union([z.literal("max"), z.number().int()])).optional(),
    regain: z.record(z.string(), z.union([z.number(), z.string().min(1)])).optional(),
    lower: z.record(z.string(), z.union([z.number().int().positive(), z.string().min(1)])).optional(),
    needs: z.string().min(1).optional(),
    "once-per": z.string().regex(/^(\d+d)?\s*(\d+h)?\s*(\d+m)?$/, "write it as a duration, such as 24h").optional(),
    lasts: z.string().regex(/^(\d+d)?\s*(\d+h)?\s*(\d+m)?$/, "write it as a duration, such as 8h").optional(),
    spend: z.record(z.string(), z.object({ gives: z.string().min(1), adds: z.union([z.string().min(1), z.number()]).optional() }).strict()).optional(),
    ends: z.array(z.string().min(1)).optional(),
    rules: z.array(z.string().min(1)).optional(),
}).strict();

const lengthSchema = z.string().refine((text) => readLength(text) !== undefined, `write it ${lengthHelp}`);
const speedSchema = z.string().refine((text) => readSpeed(text) !== undefined, `write ${speedHelp}`);
// A factor of speed, such as 1/2 for difficult terrain, or 0.5.
const factorSchema = z.union([z.number().positive(), z.string().regex(/^\d+\/[1-9]\d*$/, "write it as 1/2, or as a number such as 0.5")]);
const hoursSchema = z.number().positive().max(24);
// What a state check reads (CHK-2): an effect by its name, or a field against a number, as hp <= 0.
const checkFieldPattern = /^([\p{L}][\p{L}\p{M}\p{N}_-]*)\s*(<=|>=|!=|=|<|>)\s*(-?\d+)$/u;
const checkAtomSchema = z.string().trim().min(1, "give an effect's name, or a field against a number, such as hp <= 0");
const inWordsHelp = "give the words a foe's counter is heard in, from full to 0, such as [unhurt, hurt, badly hurt, down]";
const inWordsSchema = z.array(z.string().min(1), { error: inWordsHelp }).min(2, inWordsHelp);

const travelSchema = z.object({
    paces: z.record(z.string().min(1), speedSchema).optional(),
    pace: z.string().min(1).optional(),
    hours: hoursSchema.optional(),
    rule: z.string().min(1).optional(),
    beyond: z.string().min(1).optional(),
    terrain: z.record(z.string().min(1), factorSchema).optional(),
    vehicles: z.record(z.string().min(1), z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]), {
        error: "give a field and the values of what is a vehicle, such as {category: drawn vehicle}",
    }).optional(),
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

const gridSchema = z.object({
    square: lengthSchema,
    diagonal: z.number().positive(),
    difficult: z.number().positive(),
    speed: z.string().min(1),
    walking: z.string().min(1).optional(),
    size: z.string().min(1).optional(),
    footprints: z.record(z.string().min(1), z.number().int().min(1)).optional(),
    leaving: z.string().min(1).optional(),
}, { error: "write it as a square's length, a diagonal step's cost in squares, the factor of difficult ground and the field of the speed, such as {square: 1.5 m, diagonal: 1, difficult: 2, speed: speed}" }).strict();

const systemSchema = z.object({
    title: z.string().min(1),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
    attribution: z.string().min(1).optional(),
    fields: z.record(z.string(), z.enum(fieldKinds)).optional(),
    coins: z.union([z.string().min(1), z.record(z.string(), z.unknown())]).optional(),
    "coin-metals": z.record(z.string().min(1), z.string().min(1), { error: "write it as a map, each coin with its metal, such as {gp: gold, sp: silver}" }).optional(),
    round: z.string().regex(/^[1-9]\d* seconds?$/, 'write it as "6 seconds"').optional(),
    imperial: z.object({ mile: lengthSchema, foot: lengthSchema, pound: z.string().regex(/^\d+(\.\d+)? kg$/, { error: "write it in kilograms, such as 0.5 kg" }).optional() }).strict().optional(),
    "length-unit": z.string().min(1).optional(),
    "bonus-lists": z.array(z.string().min(1)).optional(),
    load: z.object({
        field: z.string().min(1),
        limit: z.union([z.string().min(1), z.array(z.union([z.string().min(1), z.number()])).min(1)]),
        coins: z.number().int().positive().optional(),
        weightless: z.string().min(1).optional(),
        stages: z.array(z.object({ name: z.string().min(1), when: z.string().min(1) }).strict()).optional(),
    }, {
        error:
            "write it as the field of an item's weight, the formula of the limit, and how many coins weigh one unit, such as {field: weight, limit: str * 15, coins: 50}; weightless names the field of an item whose contents weigh nothing; "
            + "stages lists what a load makes a character, the heaviest last, each with when, the formula that says so above 0, such as [{name: Encumbered, when: ceil(load - 5 * str)}]",
    }).strict().optional(),
    travel: travelSchema.optional(),
    grid: gridSchema.optional(),
    sheet: z.record(z.string().min(1), z.array(z.string().regex(sheetEntryPattern, 'write it as "str", "str (str-mod)" for a field shown beside it, or "flaw?" for one written only when it applies')).min(1), {
        error: "write the sheet as groups, each with its fields, such as Abilities: [str (str-mod), dex (dex-mod)]",
    }).optional(),
    "sheet-notes": z.record(z.string().min(1), z.string().min(1)).optional(),
    "sheet-cards": z.object({ rail: z.array(z.string().min(1)).optional(), order: z.array(z.string().min(1)).optional(), "at-hand": z.array(z.string().min(1)).optional() }, {
        error: "write it as the groups the dashboard puts in its rail, the order of the others, and the fields and groups at hand in a fight, such as {rail: [Abilities], order: [Skills, Combat], at-hand: [ac, hp, Attacks]}",
    }).strict().optional(),
    "sheet-actions": z.record(z.string().min(1), z.array(z.enum(actVerbs)).min(1), {
        error: `write it as the fields whose items the player acts with on the dashboard, each with its verbs among ${actVerbs.join(", ")}, such as {spells: [cast], inventory: [use, equip]}`,
    }).optional(),
    "sheet-headline": z.string().min(1).regex(/\{[^{}\s]+\}/, "write it as words with fields in braces, such as Level {level} {classes}").optional(),
    "sheet-icons": z.record(z.string().min(1), z.string().max(2000).regex(iconPattern, "write it as the d of an SVG path on a grid of 24, its letters and numbers alone, such as M4 12h16")).optional(),
    "token-icons": z.object({
        field: z.string().min(1),
        icons: z.record(z.string().min(1), z.string().max(2000).regex(iconPattern, "write it as the d of an SVG path on a grid of 24, its letters and numbers alone, such as M4 12h16")),
    }).strict().optional(),
    "sheet-dice": z.record(z.string().regex(sheetDicePattern), z.array(z.string().min(1)).min(1), {
        error: "write it as dice alone, as 1d20 or 2d6+1d4, and the fields of the sheet rolled with them, such as 1d20: [athletics, stealth]",
    }).optional(),
    "sheet-odds": z.object({
        better: z.string().regex(rollNamePattern),
        worse: z.string().regex(rollNamePattern),
        when: z.array(
            z.object({ fields: z.array(z.string().min(1)).min(1), better: z.string().min(1).optional(), worse: z.string().min(1).optional(), why: z.string().min(1).optional() }).strict(),
        ),
    }, {
        error: "write it as the dice of a better and a worse roll, and when: fields of the sheet with the formulas that make them better or worse above 0, and why in a word of the system, "
            + "such as {better: 2d20kh1, worse: 2d20kl1, when: [{fields: [stealth], worse: count(equipped, stealth-disadvantage = true), why: Armor}]}",
    }).strict().optional(),
    "roll-names": z.record(z.string().regex(rollNamePattern), z.union([z.string().min(1), z.record(z.string().min(2), z.string().min(1))]), {
        error: "write it as dice with the highest or the lowest kept or dropped, and the name the game gives such a roll, by language, such as 2d20kh1: {en: with advantage, it: con vantaggio}",
    }).optional(),
    values: z.record(z.string().min(1), z.array(z.string().min(1)).min(1)).optional(),
    "sheet-values": z.record(z.string().min(1), z.array(z.string().min(1)).min(1)).optional(),
    marks: z.array(z.string().min(1)).optional(),
    "status-line": z.array(z.string().min(1)).optional(),
    thresholds: z.record(z.string().regex(/^[^\s]+( -?\d+)?$/, 'write it as "hp 0", or the field alone'), z.string().min(1)).optional(),
    recipes: z.record(z.string(), recipeSchema).optional(),
    conditions: z.array(z.string().min(1)).optional(),
    "condition-icons": z.record(z.string().min(1), z.string().max(2000).regex(iconPattern, "write it as the d of an SVG path on a grid of 24, its letters and numbers alone, such as M4 12h16")).optional(),
    upkeep: z.object({
        daily: z.string().min(1),
        short: z.string().min(1),
        grace: z.string().min(1),
        worsens: z.string().min(1),
        water: z.string().min(1).optional(),
        lifestyle: z.object({ field: z.string().min(1), costs: z.record(z.string().min(1), z.string().min(1)), rules: z.string().min(1) }).strict().optional(),
        rules: z.string().min(1),
    }, {
        error: "write it as the kind spent each day, the field that counts the days without it, the formula of the days one goes without, the counter they then raise, "
            + "a word on water, what a day in a settlement costs by the lifestyle chosen, and the rules, such as {daily: Rations, short: days-without-food, grace: 3 + con-mod, "
            + "worsens: exhaustion, lifestyle: {field: lifestyle, costs: {modest: 1 gp}, rules: Lifestyle Expenses}, rules: Food and Water}",
    }).strict().optional(),
    burning: z.record(z.string().min(1), z.object({ lasts: z.string().min(1), spends: z.string().min(1).optional() }).strict(), {
        error: "write each thing that burns with how long it lasts, and what it spends when not itself, such as Lamp: {lasts: 6 hours, spends: Oil}",
    }).optional(),
    bonds: z.record(z.string().min(1), z.object({ most: z.number().int().positive(), needs: z.string().min(1), while: z.string().min(1).optional(), rules: z.string().min(1) }).strict(), {
        error: "write each list with the most items it holds, the field an item that asks for it has, the list it gives its bonuses only while in, and the rules to read, "
            + "such as attuned: {most: 3, needs: attunement, while: equipped, rules: Attunement}",
    }).optional(),
    immune: z.string().min(1).optional(),
    "turn-uses": z.record(
        z.string().min(1).refine((name) => !/ (by|for) /i.test(` ${name} `), "a use's name takes no word by or for, which the engine reads in what it keeps"),
        z.object({
            most: z.union([z.string().min(1), z.number()]).optional(),
            within: z.string().min(1).optional(),
            needs: z.string().min(1).optional(),
            "any-turn": z.boolean().optional(),
            resets: z.enum(["own turn", "each turn"]).optional(),
            note: z.string().min(1).optional(),
            "note-when": z.string().min(1).optional(),
        }).strict(),
        { error: "write each use of a turn with its most, the use it goes within, what it needs, whether it goes in any turn and when it comes back, such as attack: {within: action, most: 1 + extra-attacks}" },
    ).optional(),
    "at-most": z.record(z.string().min(1), z.union([z.string().min(1), z.number()]), {
        error: "write each field of a sheet with the most it holds, a number or a formula, such as str: 20 + 4 * has(features, Primal Champion), or prepared: max-prepared",
    }).optional(),
    damage: z.object({ counter: z.string().min(1), halves: z.string().min(1), ignores: z.string().min(1), doubles: z.string().min(1), rules: z.string().min(1) }, {
        error: "write it as the counter damage takes from and the lists of a page that halve, ignore and double a type, such as "
            + "{counter: hp, halves: damage-resistances, ignores: damage-immunities, doubles: damage-vulnerabilities, rules: Damage Resistance and Vulnerability}",
    }).strict().optional(),
    keeping: z.object({ counter: z.string().min(1), conditions: z.array(z.string().min(1)).optional(), rules: z.string().min(1) }, {
        error: "write it as what can break what someone keeps alive, such as {counter: hp, conditions: [Unconscious], rules: Concentration}",
    }).strict().optional(),
    combat: z.object({ track: z.string().min(1), "in-words": inWordsSchema.optional(), inactive: z.array(z.string().min(1)).optional() }, {
        error: "write it as the counter a fight follows, the words the player hears a foe's in, from full to 0, and the conditions that keep from acting, "
            + "such as {track: hp, in-words: [unhurt, hurt, badly hurt, down], inactive: [Stunned]}",
    }).strict().optional(),
    down: z.object({ at: z.string().regex(/^[^\s]+ -?\d+$/, 'write it as "hp 0"') }, {
        error: "write it as when one of the party is down, such as {at: hp 0}; what being down does, and how the dashboard draws it, is the system's code (D-448, D-516)",
    }).strict().optional(),
    checks: z.array(
        z.object({ when: checkAtomSchema, needs: checkAtomSchema, say: z.string().min(1) }, {
            error: 'write each as what holds, what must hold with it, and the line for the master, such as {when: Stable, needs: hp <= 0, say: "{page} is Stable with {hp}: effect end {page} Stable."}',
        }).strict(),
    ).optional(),
    tables: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    progression: z.object({
        list: z.string().min(1),
        level: z.string().min(1).optional(),
        features: z.string().min(1),
        skip: z.array(z.string().min(1)).optional(),
        parts: z.object({ list: z.string().min(1), field: z.string().min(1), lists: z.array(z.string().min(1)).optional() }).strict().optional(),
        experience: z.object({ field: z.string().min(1), table: z.string().min(1), rules: z.string().min(1).optional() }).strict().optional(),
    }).strict().optional(),
    settings: z.record(
        z.string().min(1),
        z.record(
            z.string().min(1),
            z.union([z.string().min(1), z.object({ means: z.string().min(1), player: z.string().min(1).optional(), without: z.array(z.string().min(1)).optional() }).strict()]),
        ).refine(
            (values) => Object.entries(values).every(([key, value]) => (key === "about") === (typeof value === "string")),
            "give about as what the setting is to the player, in a few words, and each value with what it means, such as {about: how your character levels up, xp: {means: ...}}",
        ).refine(
            (values) => Object.keys(values).filter((key) => key !== "about").length >= 2,
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
    ...packagePartsShape,
}).strict();

/** A recipe of the system (D-185, DAT-4): the fields it brings to their maximum or to a value, the occasions it ends, the rules to read for the rest. */
export interface Recipe
{
    name: string;
    /** By field, "max" or a value; a field ending in * stands for every field that begins so, such as slots-*. */
    set: Record<string, "max" | number>;
    /** By field, or by fields that begin so, how many come back in all, such as half the hit dice (DAT-4). */
    regain: Record<string, Formula>;
    /** By field, how much a counter goes down, a formula on the page, never below 0, as exhaustion after a long rest when one has eaten (D-449). */
    lower: Record<string, Formula>;
    /** A counter that must be above 0 when the rest begins, or it gives that page nothing, as hit points for a long rest (D-449). */
    needs?: string;
    /** How often it gives a page anything, as a long rest once in 24h (RST-1). */
    oncePer?: string;
    /** How long it takes, as a long rest's 8h: the master advances them before applying it (RST-1, D-500). */
    lasts?: string;
    /** By counter named after its die, or counters that begin so, what spending one gives and adds to each die, as hit dice healing (D-449). */
    spend: Record<string, { gives: string; adds: Formula; }>;
    ends: string[];
    rules: string[];
}

/** A use of a turn (D-453, TRN-1): at most so many, within another use, only for who has it, in any turn or only in one's own, back at one's turn or at every turn. */
export interface TurnUse
{
    most?: Formula;
    within?: string;
    needs?: Formula;
    anyTurn: boolean;
    resets: "own turn" | "each turn";
    /** What its line says each time, as what a spell cast with a bonus action leaves (TRN-1), and only for whom a formula gives more than 0. */
    note?: string;
    noteWhen?: Formula;
}

/** What a day in a settlement costs under the rigor «rules» (UPK-4): the field of the lifestyle chosen, the coins of each, and the rules to read. */
export interface Lifestyle
{
    field: string;
    costs: Record<string, string>;
    rules: string;
}

/** Damage of a type (D-449, DMG-1): the counter it takes from, and the lists of a page whose types halve it, ignore it or double it. */
export interface DamageRule
{
    counter: string;
    halves: string;
    ignores: string;
    doubles: string;
    rules: string;
}

/** What can break what someone keeps alive (D-266, EFF-14): their counter going down, the conditions they may take, and the title of the rule to read. */
export interface Keeping
{
    counter: string;
    conditions: string[];
    rules: string;
}

/** What a fight follows on the dashboard's Combat (D-314): each one's counter, whether the player hears a foe's in words, and the conditions that keep from acting. */
export interface CombatData
{
    track: string;
    /** The words a foe's counter is heard in, from full to 0, the others between at equal shares (D-314); none when the player hears the numbers. */
    inWords: string[];
    inactive: string[];
}

/** What a state check reads (CHK-2): an effect a page has, with no end and no keeper, or one of its fields against a number. */
export type CheckAtom = { effect: string; } | { field: string; op: CheckOperator; value: number; };

/** How a state check compares a field with a number. */
export type CheckOperator = "<" | "<=" | "=" | "!=" | ">=" | ">";

/** A state check of the system (CHK-2): when `when` holds, `needs` must hold too, else the master reads `say`, with {page} and each {field} filled in. */
export interface SystemCheck
{
    when: CheckAtom;
    needs: CheckAtom;
    say: string;
}

/** When one of the party is down, at a counter's value or under it, such as hp 0 (D-314, D-516). What being down does is the system's code (D-448). */
export interface Down
{
    field: string;
    value: number;
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
    /** Its icon on the dashboard: the d of an SVG path on a grid of 24, drawn as a line (D-284). */
    icon?: string;
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
    /** What it is to the player, in a few words, as the setup asks it (D-370). */
    about?: string;
    /** Each value with what it means to the master, and to the player when the system says it, as the dashboard shows it (D-341). */
    values: { value: string; means: string; player?: string; without: string[]; }[];
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
    /** What is a vehicle (TRV-6): an item with one of these fields at one of its values, or the vehicle of a kind; none when the game declares none. */
    vehicles: { field: string; value: string; }[];
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

/**
 * How a game counts on the map of a place (GRD-4, GRD-5): a square in metres, a diagonal step in squares, the factor of difficult ground, the fields that give
 * the speed and the size, the side in squares of each size larger than one, and the rule to read when one leaves the side of another.
 */
export interface GridRules
{
    square: number;
    diagonal: number;
    difficult: number;
    speed: string;
    /** The computed field of the walking speed now, in the unit the speed is written in, which a move counts with when it has a value (SPD-1). */
    walking?: string;
    size?: string;
    footprints: Record<string, number>;
    leaving?: string;
}

/** An installed game system: what it is and what it declares (SYS-1). */
export interface GameSystem
{
    /** The name a campaign gives as its system: the folder's name, such as 5e. */
    name: string;
    /** The folder that holds its system.yaml and its pages. */
    folder: string;
    /** Whether it brings code of its own, as its package.json says (D-448): the engine has loaded it, and calls its hooks. */
    code: boolean;
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
    /** The metal of each coin, as the dashboard draws it, such as gold for gp (D-431). */
    coinMetals: Record<string, string>;
    /** How long a round lasts, in seconds (D-187, DAT-7). */
    roundSeconds?: number;
    /** How many metres its mile and foot are worth, when it has its own (D-262): outputs in imperial use them. */
    imperial?: ImperialUnits;
    /**
     * What a character carries weighs (D-432, LOAD-1): the field of an item's weight, the limit as a formula, how many coins make one unit of weight, and the
     * field of an item whose contents weigh nothing.
     */
    load?: { field: string; limit: Formula; coins?: number; weightless?: string; stages?: { name: string; formula: Formula; }[]; };
    /** The unit its computed lengths are in, as ft, which the sheet writes after them (SPD-1). */
    lengthUnit?: string;
    /** The lists whose pages give their bonus fields to who lists them, as attuned items and feats (D-449). */
    bonusLists: string[];
    /** The kilograms of the system's unit of weight, for a player who counts in metric, such as 0.5 for the pound of the 5e (LOAD-2). */
    pound?: number;
    /** How one travels, when the game says so (D-261, TRV-1). */
    travel?: Travel;
    /** How the map of a place counts, when the game has one (GRD-4). */
    grid?: GridRules;
    /** The groups of a character sheet, in order (D-183, D-207, DAT-2). */
    sheet: SheetGroup[];
    /** By field, the dice a number of the sheet is rolled with, for the dashboard's free roll (D-280), such as 1d20 by insight. */
    sheetDice: Record<string, string>;
    /**
     * The dice of a better and a worse free roll, and the fields of the sheet that formulas make better or worse above 0, as Stealth in heavy armor or a check
     * at exhaustion 1; both cancel out (D-445).
     */
    sheetOdds?: { better: string; worse: string; when: { fields: string[]; better?: Formula; worse?: Formula; why?: string; }[]; };
    /** The line under a character's name on the dashboard, with fields in braces, such as Level {level} {classes} (D-288). */
    sheetHeadline?: string;
    /** The icon on the token of one of the party (D-414): by the name of the first item of a field that has one, such as a class of classes. */
    tokenIcons?: { field: string; icons: Record<string, string>; };
    /** The names the game gives some rolls, by their dice as rollName reads them, and by language: 2d20kh1, with advantage (D-399). */
    rollNames: Record<string, Record<string, string>>;
    /** Where the dashboard puts the groups of the sheet (D-295): those of its rail, in order, the order of the others, and the fields and groups at hand in a fight (D-315). */
    sheetCards?: { rail: string[]; order: string[]; atHand: string[]; };
    /** The fields whose items the player acts with on the dashboard, each with its verbs, the first the one a click says (D-495). */
    sheetActions?: Record<string, ActVerb[]>;
    /** The names a list field accepts, by field, such as the skills of save-proficiencies (SYS-8). */
    values: Record<string, string[]>;
    /** The names a list field accepts on a page that keeps the sheet, the player character's and a companion's, as the languages (D-435). */
    sheetValues: Record<string, string[]>;
    /** The lists whose items mark a number of the sheet that reads them, such as a proficiency (D-217, DAT-2). */
    marks: string[];
    /** The fields the line of a character shows, in order; whenSet marks a field usually at zero, shown only when it is not (DAT-2, DAT-4). */
    statusLine: { field: string; whenSet: boolean; }[];
    thresholds: Threshold[];
    recipes: Recipe[];
    /** The names of its conditions (D-186, DAT-6). */
    conditions: string[];
    /** By the name of a condition or any effect, its drawing on a token, in Combat and in its chip (D-419, D-516): the d of an SVG path on a grid of 24. */
    conditionIcons: Record<string, string>;
    /** Its icons, widgets and figures on the dashboard, as an extension's (D-502, D-510, D-514): its code's hooks show its widgets. */
    icons: Record<string, string>;
    widgets: DeclaredWidget[];
    figures: Record<string, FigureSize>;
    /** What can break what someone keeps alive, when the game has it (EFF-14). */
    /** The lists a character binds items in, as attunement (BND-1): at most so many, each an item whose field asks for it, with the rules to read. */
    bonds: Record<string, { most: number; needs: string; while?: string; rules: string; }>;
    /** By bonus list, the list its pages must be in too to give their bonuses, as an attuned ring worn (BND-4). */
    bonusWhile: Record<string, string>;
    /** What each party member uses up a day under the rigor «rules» (UPK-1, UPK-2). */
    upkeep?: { daily: string; short: string; grace: string; worsens: string; water?: string; lifestyle?: Lifestyle; rules: string; };
    /** What burns, by the effect named after it: how long it lasts, and the kind it spends when not itself, such as Oil (UPK-3). */
    burning: Record<string, { lasts: string; spends?: string; }>;
    /** The list of a page that names the conditions it does not take, as condition-immunities (EFF-17). */
    immune?: string;
    /** By name, what one may do in a turn (TRN-1), as an action, a bonus action and a reaction. */
    turnUses: Record<string, TurnUse>;
    /** By field of a sheet, the most it holds (LIM-1): a number written, or the items of a list. */
    atMost: Record<string, Formula>;
    /** What damage of a type does, by the lists of who takes it (DMG-1). */
    damage?: DamageRule;
    keeping?: Keeping;
    /** What a fight follows on the dashboard (D-314). */
    combat?: CombatData;
    /** When one of the party is down (D-516). */
    down?: Down;
    /** What cannot be true together, which the engine says to the master (CHK-2). */
    checks: SystemCheck[];
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

/**
 * The name the game gives a roll of these dice, in the language asked, else in the system's (D-399): 2d20kh1, or 2d20dl1, is "with advantage" in 5e; undefined
 * when the game names it not, or the dice are more than one kind.
 */
export function rollName(system: GameSystem, dice: string, language: string): string | undefined
{
    const names = system.rollNames[plainRoll(dice)];
    return names === undefined ? undefined : (names[language] ?? names[language.split("-")[0] ?? language] ?? names[system.language]);
}

/** A roll's dice as a name reads them: in lower case, the highest or the lowest kept one when one of two is dropped, as 2d20dl1 is 2d20kh1. */
function plainRoll(dice: string): string
{
    const compact = dice.toLowerCase().replace(/\s+/g, "").replace(/([kd][hl])$/, (rule: string) => `${rule}1`);
    return /^2d/.test(compact) ? compact.replace(/dl1$/, "kh1").replace(/dh1$/, "kl1") : compact;
}

/** The systems installed in these folders, nearest folder first: each folder in them with a system.yaml. A name found twice is the nearest one. */
export function installedSystems(folders: string[]): GameSystem[]
{
    const systems: GameSystem[] = [];

    for (const found of systemFolders(folders)) {
        if (!systems.some((system) => comparableText(system.name) === comparableText(found.name))) {
            systems.push(readSystem(found.folder, found.name));
        }
    }

    return systems;
}

/** What a campaign may add to its game system in campaign.yaml (CAM-1): its own fields, tables, formulas, counters, recipes, line of the player character and travel. */
export const campaignDataNames = ["fields", "tables", "computed", "counters", "recipes", "status-line", "travel", "values", "condition-icons"] as const;

/** What campaign.yaml adds to the game system, as it writes it: checked when the system is read with it (CAM-3). */
export type CampaignData = Partial<Record<(typeof campaignDataNames)[number], unknown>>;

/** What an extension or the campaign adds to the game system (CAM-1, CAM-2): from where, as messages name it, and what. */
export interface SystemLayer
{
    from: string;
    data: CampaignData;
}

/**
 * The installed system with the layers over it, in order, the nearest to the campaign last and winning (CAM-2); a layer with which it does not read is left out,
 * with why, and the others stay (CAM-3). Undefined as a system when none is installed by that name.
 */
export function findCampaignSystem(folders: string[], name: string, layers: SystemLayer[]): { system?: GameSystem; refused: { from: string; problem: string; }[]; }
{
    const found = systemFolders(folders).find((candidate) => comparableText(candidate.name) === comparableText(name.trim()));
    const given = layers.filter((layer) => campaignDataNames.some((key) => layer.data[key] !== undefined && layer.data[key] !== null));

    if (found === undefined) {
        return { refused: [] };
    }

    try {
        return { system: readSystem(found.folder, found.name, given), refused: [] };
    } catch {
        // One layer at a time, to leave out only those that do not read.
    }

    const kept: SystemLayer[] = [];
    const refused: { from: string; problem: string; }[] = [];

    for (const layer of given) {
        try {
            readSystem(found.folder, found.name, [...kept, layer]);
            kept.push(layer);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            refused.push({ from: layer.from, problem: message.replace(/^The game system .*? cannot be read, because .*? is not valid:\s*/s, "") });
        }
    }

    return { system: readSystem(found.folder, found.name, kept), refused };
}

/** The installed system with this name, ignoring case, from the nearest folder that has it; undefined when none is. Only its own system.yaml is read. */
export function findSystem(folders: string[], name: string): GameSystem | undefined
{
    const found = systemFolders(folders).find((candidate) => comparableText(candidate.name) === comparableText(name.trim()));
    return found === undefined ? undefined : readSystem(found.folder, found.name);
}

function readSystem(folder: string, name: string, layers: SystemLayer[] = []): GameSystem
{
    const file = join(folder, systemFileName);
    const path = layers.length === 0 ? file : `${file} with the additions of ${layers.map((layer) => layer.from).join(", ")}`;
    const raw = readYamlValues(file, 'what the system is, such as "title: ..."');
    let merged: unknown = raw;

    try {
        merged = layers.reduce((below: unknown, layer) => withCampaignData(below, layer.data), raw);
    } catch (error) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${error instanceof Error ? error.message : String(error)}`);
    }

    const parsed = systemSchema.safeParse(merged);

    if (!parsed.success) {
        // One made for a newer API may declare what this engine does not know yet (D-515).
        const unread = systemApiProblem(folder);
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${issuesText(parsed.error)}${unread === undefined ? "" : ` Besides, ${unread}.`}`);
    }

    const data = parsed.data;
    const parts = packagePartsIssues(data, "a game system")[0];

    if (parts !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${[...parts.path, ""].join(".").replace(/\.$/, ": ")}${parts.message}.`);
    }

    // What a counter shields is no limit of it: a counter with only that has none (DAT-14).
    const limited = Object.entries(data.counters ?? {}).flatMap(([counter, { min, max, refill }]) => min === undefined && max === undefined && refill === undefined ? [] : [[counter, { min, max, refill }] as const]);
    const formulas = systemFormulas({ ...data, counters: Object.fromEntries(limited) }, name, path);
    const stray = strayOccasion(data, formulas);

    if (stray !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${stray}`);
    }

    const sheet = sheetOf(data, name, path);
    const values = data.values ?? {};
    const sheetValues = data["sheet-values"] ?? {};
    const kindOf = (field: string): string | undefined => Object.entries(data.fields ?? {}).find(([declared]) => comparableText(declared) === comparableText(field))?.[1];
    // Closed names for a list, as the skills, or for a text, as an alignment.
    const notList = [...Object.keys(values), ...Object.keys(sheetValues)].find((field) => kindOf(field) !== "list" && kindOf(field) !== "text");

    if (notList !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: values.${notList}: declare ${notList} as a list or a text in fields, or give no values to it.`);
    }

    // What breaks what someone keeps, and what a counter shields, read counters (EFF-14, DAT-14).
    const counted = [
        ...(data.keeping === undefined ? [] : [{ where: "keeping.counter", field: data.keeping.counter }]),
        ...(data.damage === undefined ? [] : [{ where: "damage.counter", field: data.damage.counter }]),
        ...(data.combat === undefined ? [] : [{ where: "combat.track", field: data.combat.track }]),
        ...(data.down === undefined ? [] : [{ where: "down.at", field: data.down.at.split(" ")[0] }]),
        ...Object.entries(data.counters ?? {}).flatMap(([counter, limits]) => (limits.shields === undefined ? [] : [{ where: `counters.${counter}.shields`, field: limits.shields }])),
    ].find((entry) => kindOf(entry.field) !== "counter");

    const unknownCondition = [
        ...(data.keeping?.conditions ?? []).map((condition) => ({ where: "keeping.conditions", condition })),
        ...(data.combat?.inactive ?? []).map((condition) => ({ where: "combat.inactive", condition })),
    ].find((entry) => !(data.conditions ?? []).some((named) => comparableText(named) === comparableText(entry.condition)));

    if (unknownCondition !== undefined) {
        const named = (data.conditions ?? []).length === 0 ? "" : ` (${(data.conditions ?? []).join(", ")})`;
        const what = `${unknownCondition.where}: ${unknownCondition.condition} is not one of its conditions${named}; write it as one of them, or add it to conditions.`;
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${what}`);
    }

    const gridField = [data.grid?.speed, data.grid?.size].find((field) => field !== undefined && kindOf(field) === undefined);

    if (gridField !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: grid: ${gridField} is not declared in fields.`);
    }

    if (counted !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${counted.where}: ${counted.field} is not declared as a counter in fields.`);
    }

    // A state check compares a field the system declares, written as one, and its line names only the page and such fields (CHK-2).
    const checks = data.checks ?? [];
    const atoms = checks.flatMap((check) => [check.when, check.needs]);
    const miswritten = atoms.find((atom) => /[<>=!]/.test(atom) && !checkFieldPattern.test(atom.trim()));
    const checkField = atoms.map(checkAtom).find((atom) => "field" in atom && kindOf(atom.field) === undefined);
    const placeholder = checks.flatMap((check) => [...check.say.matchAll(/\{([^{}]+)\}/g)].map((found) => found[1])).find((named) => named !== "page" && kindOf(named) === undefined);
    const checkProblem = miswritten !== undefined
        ? `"${miswritten}" is no comparison: write a field, one of < <= = != >= >, and a whole number, such as hp <= 0`
        : checkField !== undefined && "field" in checkField
        ? `${checkField.field} is not declared in fields`
        : placeholder === undefined
        ? undefined
        : `{${placeholder}} in say is neither {page} nor a field declared in fields`;

    if (checkProblem !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: checks: ${checkProblem}.`);
    }

    // A use of a turn goes within another the system names (TRN-3).
    const turnUses = data["turn-uses"] ?? {};
    const looseUse = Object.entries(turnUses).find(([, rule]) => rule.within !== undefined && !Object.keys(turnUses).some((use) => comparableText(use) === comparableText(rule.within ?? "")));

    if (looseUse !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: turn-uses.${looseUse[0]}: ${looseUse[1].within} is not one of its turn-uses; name one, or add it.`);
    }

    // The lists whose types change damage are lists (DMG-1).
    const damageLists = data.damage === undefined ? [] : (["halves", "ignores", "doubles"] as const).map((key) => ({ where: `damage.${key}`, field: data.damage?.[key] ?? "" }));
    const notListed = damageLists.find((entry) => kindOf(entry.field) !== "list");

    if (notListed !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${notListed.where}: ${notListed.field} is not declared as a list in fields.`);
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

    // The cards the dashboard places are groups of the sheet (D-295); at hand in a fight, its fields too (D-315).
    for (const [key, names] of Object.entries(data["sheet-cards"] ?? {})) {
        const fields = key === "at-hand" ? sheet.flatMap((group) => group.entries.map((entry) => comparableText(entry.field))) : [];
        const stray = (names ?? []).find((group) => !sheet.some((declared) => comparableText(declared.name) === comparableText(group)) && !fields.includes(comparableText(group)));

        if (stray !== undefined) {
            const kinds = key === "at-hand" ? "group or field" : "group";
            throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-cards.${key}: the sheet has no ${kinds} ${stray}; its groups are ${sheet.map((group) => group.name).join(", ")}.`);
        }
    }

    // The fields the player acts with are fields of the sheet (D-495).
    const actless = Object.keys(data["sheet-actions"] ?? {}).find((field) => !sheet.some((group) => group.entries.some((entry) => entry.field === field)));

    if (actless !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-actions: the sheet has no field ${actless}.`);
    }

    // Each field the headline names is a declared one (D-288).
    const unnamed = [...(data["sheet-headline"] ?? "").matchAll(headlineFieldPattern)].map((match) => match[1]).find((field) => kindOf(field) === undefined);

    if (unnamed !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: sheet-headline: ${unnamed} is not declared in fields.`);
    }

    // The tokens' icons read a declared field (D-414).
    const iconField = data["token-icons"]?.field;

    if (iconField !== undefined && kindOf(iconField) === undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: token-icons.field: ${iconField} is not declared in fields.`);
    }

    const experience = data.progression?.experience?.table;

    if (experience !== undefined && !Object.keys(formulas.tables).some((table) => comparableText(table) === comparableText(experience))) {
        throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: progression.experience.table: there is no table ${experience} in tables.`);
    }

    return frozen({
        name,
        folder,
        code: systemHasCode(folder),
        title: data.title,
        language: data.language,
        attribution: data.attribution,
        fields: data.fields ?? {},
        coins: data.coins,
        coinMetals: data["coin-metals"] ?? {},
        roundSeconds: data.round === undefined ? undefined : Number.parseInt(data.round, 10),
        ...(data.imperial === undefined ? {} : { imperial: { mile: readLength(data.imperial.mile) ?? 0, foot: readLength(data.imperial.foot) ?? 0 } }),
        ...(data.imperial?.pound === undefined ? {} : { pound: Number.parseFloat(data.imperial.pound) }),
        ...(data["length-unit"] === undefined ? {} : { lengthUnit: data["length-unit"] }),
        bonusLists: data["bonus-lists"] ?? [],
        bonusWhile: Object.fromEntries(Object.entries(data.bonds ?? {}).flatMap(([list, bond]) => (bond.while === undefined ? [] : [[list, bond.while]]))),
        ...(data.load === undefined ? {} : {
            load: {
                field: data.load.field,
                // Formulas in order, the first with a value counts, as a computed field's (D-210).
                limit: Array.isArray(data.load.limit)
                    ? { kind: "first", options: data.load.limit.map((option) => parseFormula(String(option))) }
                    : parseFormula(data.load.limit),
                ...(data.load.coins === undefined ? {} : { coins: data.load.coins }),
                ...(data.load.weightless === undefined ? {} : { weightless: data.load.weightless }),
                ...(data.load.stages === undefined ? {} : { stages: data.load.stages.map((stage) => ({ name: stage.name, formula: parseFormula(stage.when) })) }),
            },
        }),
        ...(data.travel === undefined ? {} : { travel: travelOf(data.travel) }),
        ...(data.grid === undefined ? {} : { grid: gridOf(data.grid) }),
        sheet,
        sheetDice: Object.fromEntries(rolled),
        ...(data["sheet-odds"] === undefined ? {} : {
            sheetOdds: {
                better: data["sheet-odds"].better,
                worse: data["sheet-odds"].worse,
                when: data["sheet-odds"].when.map((when) => ({
                    fields: when.fields,
                    ...(when.better === undefined ? {} : { better: parseFormula(when.better) }),
                    ...(when.worse === undefined ? {} : { worse: parseFormula(when.worse) }),
                    ...(when.why === undefined ? {} : { why: when.why }),
                })),
            },
        }),
        rollNames: Object.fromEntries(Object.entries(data["roll-names"] ?? {}).map(([dice, names]) => [plainRoll(dice), typeof names === "string" ? { [data.language]: names } : names])),
        ...(data["sheet-headline"] === undefined ? {} : { sheetHeadline: data["sheet-headline"] }),
        ...(data["token-icons"] === undefined ? {} : { tokenIcons: data["token-icons"] }),
        ...(data["sheet-actions"] === undefined ? {} : { sheetActions: data["sheet-actions"] }),
        ...(data["sheet-cards"] === undefined ? {} : { sheetCards: { rail: data["sheet-cards"].rail ?? [], order: data["sheet-cards"].order ?? [], atHand: data["sheet-cards"]["at-hand"] ?? [] } }),
        values,
        sheetValues,
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
            lower: Object.fromEntries(Object.entries(value.lower ?? {}).map(([field, amount]) => [field, parseFormula(String(amount))])),
            ...(value.needs === undefined ? {} : { needs: value.needs }),
            ...(value["once-per"] === undefined ? {} : { oncePer: value["once-per"] }),
            ...(value.lasts === undefined ? {} : { lasts: value.lasts }),
            spend: Object.fromEntries(Object.entries(value.spend ?? {}).map(([field, rule]) => [field, { gives: rule.gives, adds: parseFormula(String(rule.adds ?? 0)) }])),
            ends: value.ends ?? [],
            rules: value.rules ?? [],
        })),
        conditions: data.conditions ?? [],
        conditionIcons: data["condition-icons"] ?? {},
        icons: data.icons ?? {},
        widgets: declaredWidgets(data.widgets),
        figures: data.figures ?? {},
        bonds: data.bonds ?? {},
        ...(data.upkeep === undefined ? {} : { upkeep: data.upkeep }),
        burning: data.burning ?? {},
        ...(data.immune === undefined ? {} : { immune: data.immune }),
        turnUses: Object.fromEntries(
            Object.entries(data["turn-uses"] ?? {}).map(([use, rule]) => [use, {
                ...(rule.most === undefined ? {} : { most: parseFormula(String(rule.most)) }),
                ...(rule.within === undefined ? {} : { within: rule.within }),
                ...(rule.needs === undefined ? {} : { needs: parseFormula(rule.needs) }),
                anyTurn: rule["any-turn"] ?? false,
                resets: rule.resets ?? "own turn",
                ...(rule.note === undefined ? {} : { note: rule.note }),
                ...(rule["note-when"] === undefined ? {} : { noteWhen: parseFormula(rule["note-when"]) }),
            }]),
        ),
        atMost: Object.fromEntries(Object.entries(data["at-most"] ?? {}).map(([field, most]) => [field, parseFormula(String(most))])),
        ...(data.damage === undefined ? {} : { damage: data.damage }),
        ...(data.keeping === undefined ? {} : { keeping: { counter: data.keeping.counter, conditions: data.keeping.conditions ?? [], rules: data.keeping.rules } }),
        ...(data.combat === undefined ? {} : { combat: { track: data.combat.track, inWords: data.combat["in-words"] ?? [], inactive: data.combat.inactive ?? [] } }),
        ...(data.down === undefined ? {} : { down: downRule(data.down.at) }),
        checks: (data.checks ?? []).map((check) => ({ when: checkAtom(check.when), needs: checkAtom(check.needs), say: check.say })),
        shields: Object.fromEntries(Object.entries(data.counters ?? {}).flatMap(([counter, limits]) => (limits.shields === undefined ? [] : [[counter, limits.shields]]))),
        formulas,
        ...(data.progression === undefined ? {} : { progression: progressionRule(data.progression) }),
        itemFormulas: data["item-formulas"] ?? {},
        alwaysIn: data["always-in"] ?? {},
        uses: usesOf(data),
        settings: Object.entries(data.settings ?? {}).map(([setting, values]) => ({
            name: setting,
            ...(typeof values.about === "string" ? { about: values.about } : {}),
            values: Object.entries(values).flatMap(([value, meaning]) =>
                typeof meaning === "string" ? [] : [{
                    value,
                    means: meaning.means,
                    ...(meaning.player === undefined ? {} : { player: meaning.player }),
                    without: meaning.without ?? [],
                }]
            ),
        })),
        leftOut: [],
        rewards: Object.entries(data.rewards ?? {}).map(([field, reward]) => {
            const [counter, value] = reward.overcome.split(" ");
            return { field, from: reward.from, counter, value: Number(value) };
        }),
        parts: readParts(folder, `The game system ${name}`),
    });
}

/**
 * "counters.bulwark-dice: unknown key "Bulwark)", a formula with commas goes in quotes": the problems of a system's data, one after the other on
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

/** The groups of a system's sheet, each with its note and its icon; a note or an icon for a group the sheet does not have is refused. */
function sheetOf(data: z.infer<typeof systemSchema>, name: string, path: string): SheetGroup[]
{
    const groups = Object.entries(data.sheet ?? {});
    const notes = Object.entries(data["sheet-notes"] ?? {});
    const icons = Object.entries(data["sheet-icons"] ?? {});
    const byGroup = (pairs: [string, string][], group: string): string | undefined => pairs.find(([other]) => comparableText(other) === comparableText(group))?.[1];

    for (const [key, pairs] of [["sheet-notes", notes], ["sheet-icons", icons]] as const) {
        const stray = pairs.find(([group]) => !groups.some(([other]) => comparableText(other) === comparableText(group)));

        if (stray !== undefined) {
            throw new Error(`The game system ${name} cannot be read, because ${path} is not valid: ${key}.${stray[0]}: the sheet has no group ${stray[0]}; its groups are ${groups.map(([group]) => group).join(", ")}.`);
        }
    }

    return groups.map(([group, entries]) => {
        const note = byGroup(notes, group);
        const icon = byGroup(icons, group);
        return {
            name: group,
            entries: entries.map((entry) => {
                const [, field, optional, beside] = sheetEntryPattern.exec(entry) ?? [];
                return { field, optional: optional === "?", ...(beside === undefined ? {} : { beside }) };
            }),
            ...(note === undefined ? {} : { note }),
            ...(icon === undefined ? {} : { icon }),
        };
    });
}

/**
 * A system's data with a campaign's additions over it (CAM-2): fields, tables, formulas and counters by name, the campaign's taking the place of the system's
 * with that name; a recipe added to the system's of that name, field by field, with its occasions and rules; the line's fields after the system's; travel key
 * by key, its paces, terrain, vehicles and kinds by name.
 */
function withCampaignData(raw: unknown, data: CampaignData): Record<string, unknown>
{
    const base = isMap(raw) ? raw : {};
    const merged: Record<string, unknown> = { ...base };

    for (const key of ["fields", "tables", "computed", "counters", "condition-icons"] as const) {
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
        merged.travel = Object.fromEntries(Object.entries({ ...own, ...travel, paces: byName("paces"), terrain: byName("terrain"), vehicles: byName("vehicles"), kinds: byName("kinds") }).filter(([, value]) => value !== undefined));
    }

    const names = mapOf(data.values, "values");

    if (names !== undefined) {
        // A campaign's own names, as a language of its world, join the system's list, on the sheet or everywhere (D-435).
        const onSheet = isMap(base["sheet-values"]) ? { ...base["sheet-values"] } : {};
        const everywhere = isMap(base.values) ? { ...base.values } : {};

        for (const [field, added] of Object.entries(names)) {
            if (!Array.isArray(added)) {
                throw new Error(`values.${field}: give the names the campaign adds as a list, such as ${field}: [Lingua dei Guadi].`);
            }

            const target = nameIn(onSheet, field) !== undefined ? onSheet : everywhere;
            const key = nameIn(target, field) ?? field;
            const own = Array.isArray(target[key]) ? target[key].map(String) : [];
            target[key] = [...own, ...added.map(String).filter((name) => !own.some((other) => comparableText(other) === comparableText(name)))];
        }

        merged.values = everywhere;
        merged["sheet-values"] = onSheet;
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
        throw new Error(`recipes.${name}: give it as what it sets, regains, ends and the rules to read, such as {set: {bulwark-dice: max}}.`);
    }

    const base = isMap(own) ? own : {};
    const map = (key: string): Record<string, unknown> | undefined =>
        isMap(base[key]) || isMap(added[key]) ? { ...withoutNames(isMap(base[key]) ? base[key] : {}, Object.keys(isMap(added[key]) ? added[key] : {})), ...(isMap(added[key]) ? added[key] : {}) } : undefined;

    const list = (key: string): unknown[] | undefined => {
        const items = [...(Array.isArray(base[key]) ? base[key] : []), ...(Array.isArray(added[key]) ? added[key] : [])];
        return items.length === 0 ? undefined : items.filter((item, index) => items.findIndex((other) => comparableText(String(other)) === comparableText(String(item))) === index);
    };

    const merged = { ...base, ...added, set: map("set"), regain: map("regain"), lower: map("lower"), ends: list("ends"), rules: list("rules") };
    return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined));
}

/** An addition that must be a map by name, such as counters; undefined when the campaign gives none. */
function mapOf(value: unknown, key: string): Record<string, unknown> | undefined
{
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!isMap(value)) {
        throw new Error(`${key}: give it as a map by name, such as {bulwark-dice: ...}.`);
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

/** How the system's map of a place counts, as the engine reads it (GRD-4): the square in metres. */
function gridOf(data: z.infer<typeof gridSchema>): GridRules
{
    const { square, size, footprints, leaving, ...rest } = data;
    return { ...rest, square: readLength(square) ?? 0, ...(size === undefined ? {} : { size }), footprints: footprints ?? {}, ...(leaving === undefined ? {} : { leaving }) };
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
        vehicles: Object.entries(data.vehicles ?? {}).flatMap(([field, values]) => [values].flat().map((value) => ({ field, value }))),
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

/** What a state check reads, as written (CHK-2): "hp <= 0" a field against a number, anything else an effect's name. */
function checkAtom(text: string): CheckAtom
{
    const field = checkFieldPattern.exec(text.trim());
    return field === null ? { effect: text.trim() } : { field: field[1], op: field[2] as CheckOperator, value: Number(field[3]) };
}

/** When one is down as the system writes it: "hp 0" read as a field and a number. */
function downRule(at: string): Down
{
    const [field, value] = at.split(" ");
    return { field, value: Number(value) };
}
