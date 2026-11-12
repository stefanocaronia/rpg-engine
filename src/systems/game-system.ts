// What an installed system is: its shape and the engine's names for it
import type { FieldKind } from "../core/field-kind.ts";
import type { Formula, SystemFormulas } from "../core/formula.ts";
import type { InstructionPart } from "../core/instruction-parts.ts";
import { codeAndBase } from "../core/language.ts";
import type { ImperialUnits } from "../core/length.ts";
import type { DeclaredWidget, FigureSize } from "../core/packages/declarations.ts";
import type { ProgressionRule } from "../core/progression-rule.ts";

/** The file that makes a folder a game system and says what it is. */
export const systemFileName = "system.yaml";

/** The setting by which a campaign plays one of the versions of its system's rules (VER-1): the engine's name for it, whatever the system. */
export const rulesetSetting = "ruleset";

/**
 * What the player does with an item of the sheet on the dashboard, said as their own sentence to the master (D-495): the engine's verbs, whose sentences
 * the page has in every language; a system declares its own beside them in sheet-verbs (D-514), and says which fields take which. Talking to someone comes
 * from the people, never from the sheet.
 */
export const actVerbs = ["attack", "use", "equip", "unequip"] as const;

/** One of the engine's verbs, or one the system declares. */
export type ActVerb = string;

/**
 * A verb a system declares (D-514), in its language, its words translating it: its name alone, what it does with a thing, the player's sentence, and the
 * sentences on someone, at a square and on oneself when it lets the player choose one.
 */
export interface SheetVerb
{
    label: string;
    title: string;
    says: string;
    on?: string;
    at?: string;
    self?: string;
}

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
    /**
     * Each value with what it means to the master, and to the player when the system says it, as the dashboard shows it (D-341); the values of the engine's
     * settings it offers (DAT-16), the settings of the system it asks (DAT-17), and whether the setup suggests it.
     */
    values: { value: string; means: string; player?: string; without: string[]; engineSettings: Record<string, string[]>; asks: string[]; suggested?: true; }[];
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
    /** The version of its rules it is read with, when it has versions (VER-1): its name, its title, and its folder, whose pages win over the common ones (VER-3). */
    version?: { name: string; title?: string; folder: string; };
    /** Whether it brings code of its own, as its package.json says (D-448): the engine has loaded it, and calls its hooks. */
    code: boolean;
    /** What it is, for messages: "the fifth edition, from the SRD 5.1". */
    title: string;
    /** The language it names its pages in, as a code such as en. */
    language: string;
    /** What a work that uses it must say of its source, when its license asks for it. */
    attribution?: string;
    /** The folder of its theme of the dashboard, when it names one (D-528): read and checked by the themes module. */
    theme?: string;
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
    load?: { field: string; limit: Formula; coins?: number; weightless?: string; bundle?: string; stages?: { name: string; formula: Formula; }[]; };
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
    /** The fields of the sheet whose rolls recall what the character knows, as History: their outcome is told as knowledge (D-530, Elena's tests of 28 October). */
    sheetKnowledge: string[];
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
    /** Its own verbs beside the engine's, by name (D-514). */
    sheetVerbs: Record<string, SheetVerb>;
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
    /** Where the oracle's d100 says yes, high in Ironsworn; low when the system says nothing. */
    oracleYes?: "low" | "high";
    /** By name, what one may do in a turn (TRN-1), as an action, a bonus action and a reaction. */
    turnUses: Record<string, TurnUse>;
    /** By field of a sheet, the most it holds (LIM-1): a number written, or the items of a list. */
    atMost: Record<string, Formula>;
    /** What damage of a type does, by the lists of who takes it (DMG-1). */
    damage?: DamageRule;
    /** What can break what someone keeps alive, when the game has it (EFF-14). */
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
    /** The values of the engine's settings it offers, by setting (DAT-16): one alone is no choice. */
    engineSettings: Record<string, string[]>;
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
 * The name the game gives a roll of these dice, in the language asked, else in the system's (D-399): 2d20kh1, or 2d20dl1, is "with advantage" in 5e; undefined
 * when the game names it not, or the dice are more than one kind.
 */
export function rollName(system: GameSystem, dice: string, language: string): string | undefined
{
    const names = system.rollNames[plainRoll(dice)];
    return names === undefined ? undefined : ([language, ...codeAndBase(language).slice(1)].map((code) => names[code]).find((name) => name !== undefined) ?? names[system.language]);
}

/** A roll's dice as a name reads them: in lower case, the highest or the lowest kept one when one of two is dropped, as 2d20dl1 is 2d20kh1. */
export function plainRoll(dice: string): string
{
    const compact = dice.toLowerCase().replace(/\s+/g, "").replace(/([kd][hl])$/, (rule: string) => `${rule}1`);
    return /^2d/.test(compact) ? compact.replace(/dl1$/, "kh1").replace(/dh1$/, "kl1") : compact;
}
