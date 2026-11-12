// The zod shape of system.yaml
import { isAbsolute } from "node:path";
import { z } from "zod";
import { fieldKinds } from "../core/field-kind.ts";
import { lengthHelp, readLength, readSpeed, speedHelp } from "../core/length.ts";
import { packagePartsShape } from "../core/packages/declarations.ts";
import { comparableText } from "../core/text.ts";
import { actVerbs, rulesetSetting } from "./game-system.ts";

// An entry of the sheet: a field, ? when it is written only when it applies, and a field shown beside it in parentheses.
export const sheetEntryPattern = /^([^\s()?]+)(\?)?(?: \(([^\s()?]+)\))?$/;

// The dice a number of the sheet is rolled with: dice alone, as 1d20 or 2d6+1d4 (D-280).
const sheetDicePattern = /^\d*d\d+(?:\+\d*d\d+)*$/;

// A roll the game has a name for: dice of one kind, with the highest or the lowest kept or dropped, as 2d20kh1 (D-399).
const rollNamePattern = /^\d*d(?:\d+|%)(?:[kd][hl]\d*)?$/i;

// A group's icon on the dashboard: the d of an SVG path, its letters and numbers alone (D-284).
const iconPattern = /^[Mm][MmLlHhVvCcSsQqTtAaZz\d.,\s+-]*$/;

// What a state check reads (CHK-2): an effect by its name, or a field against a number, as hp <= 0.
export const checkFieldPattern = /^([\p{L}][\p{L}\p{M}\p{N}_-]*)\s*(<=|>=|!=|=|<|>)\s*(-?\d+)$/u;

/** A sentence of a system's verb, with the {names} the page fills (D-514). */
function phraseWith(names: string[])
{
    const shown = names.map((name) => `{${name}}`).join(" and ");
    return z.string().min(1).refine((text) => names.every((name) => text.includes(`{${name}}`)), `write it with ${shown}, which the page fills`);
}

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

const checkAtomSchema = z.string().trim().min(1, "give an effect's name, or a field against a number, such as hp <= 0");

const inWordsHelp = "give the words a foe's counter is heard in, from full to 0, such as [unhurt, hurt, badly hurt, down]";

const inWordsSchema = z.array(z.string().min(1), { error: inWordsHelp }).min(2, inWordsHelp);

export const travelSchema = z.object({
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

export const gridSchema = z.object({
    square: lengthSchema,
    diagonal: z.number().positive(),
    difficult: z.number().positive(),
    speed: z.string().min(1),
    walking: z.string().min(1).optional(),
    size: z.string().min(1).optional(),
    footprints: z.record(z.string().min(1), z.number().int().min(1)).optional(),
    leaving: z.string().min(1).optional(),
}, { error: "write it as a square's length, a diagonal step's cost in squares, the factor of difficult ground and the field of the speed, such as {square: 1.5 m, diagonal: 1, difficult: 2, speed: speed}" }).strict();

// A setting the setup asks (DAT-10), or the versions of the rules (VER-1): what it is to the player, then its values, each with what it means: a setting at
// least two, the versions at least one.
// The values of the engine's settings a game offers, or one of its values (DAT-16): one alone is no choice.
const engineSettingsSchema = z.record(z.string().min(1), z.array(z.string().min(1)).min(1), {
    error: "write it as the engine's settings, each with the values the game offers, such as {rigor: [smooth]}",
});

function settingSchema(fewest: number)
{
    return z.record(
        z.string().min(1),
        z.union([
            z.string().min(1),
            z.object({
                means: z.string().min(1),
                player: z.string().min(1).optional(),
                without: z.array(z.string().min(1)).optional(),
                "engine-settings": engineSettingsSchema.optional(),
                asks: z.array(z.string().min(1)).optional(),
                suggested: z.literal(true).optional(),
            }).strict(),
        ]),
    ).refine(
        (values) => Object.entries(values).every(([key, value]) => (key === "about") === (typeof value === "string")),
        "give about as what the setting is to the player, in a few words, and each value with what it means, such as {about: how your character levels up, xp: {means: ...}}",
    ).refine(
        (values) => Object.keys(values).filter((key) => key !== "about").length >= fewest,
        fewest === 1 ? "give at least one version, with what it means, such as {srd-5.1: {means: ...}}" : "give at least two values, each with what it means, such as {xp: {means: ...}, milestones: {means: ...}}",
    );
}

export const systemSchema = z.object({
    title: z.string().min(1),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
    attribution: z.string().min(1).optional(),
    // Its theme of the dashboard (D-528): a folder of its own, written from it, as theme.
    theme: z.string().min(1).refine((folder) => !isAbsolute(folder) && !folder.split(/[\\/]/).includes(".."), { error: "write it as a folder of the system, such as theme" }).optional(),
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
        bundle: z.string().min(1).optional(),
        stages: z.array(z.object({ name: z.string().min(1), when: z.string().min(1) }).strict()).optional(),
    }, {
        error:
            "write it as the field of an item's weight, the formula of the limit, and how many coins weigh one unit, such as {field: weight, limit: str * 15, coins: 50}; weightless names the field of an item whose contents weigh nothing, bundle the field of how many pieces one of a kind sold by the bundle holds; "
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
    "sheet-actions": z.record(z.string().min(1), z.array(z.string().min(1)).min(1), {
        error: `write it as the fields whose items the player acts with on the dashboard, each with its verbs, among ${actVerbs.join(", ")} and those of sheet-verbs, such as {inventory: [use, equip]}`,
    }).optional(),
    "sheet-verbs": z.record(
        z.string().regex(/^[a-z][a-z-]*$/, "write a verb's name in lowercase, such as invoke"),
        z.object({
            label: z.string().min(1),
            title: phraseWith(["item"]),
            says: phraseWith(["item"]),
            "says-on": phraseWith(["item", "target"]).optional(),
            "says-at": phraseWith(["item", "square"]).optional(),
            "says-self": phraseWith(["item"]).optional(),
        }).strict().refine((verb) => [verb["says-on"], verb["says-at"], verb["says-self"]].every((said, _index, all) => (said === undefined) === (all[0] === undefined)), {
            message: "give says-on, says-at and says-self together, for a verb that lets the player choose on whom, or none of them",
        }),
        { error: 'write it as the system\'s own verbs, each with its words, such as {invoke: {label: Invoke, title: "Invoke {item}", says: "I invoke {item}."}}' },
    ).optional(),
    "sheet-headline": z.string().min(1).regex(/\{[^{}\s]+\}/, "write it as words with fields in braces, such as Level {level} {classes}").optional(),
    "sheet-icons": z.record(z.string().min(1), z.string().max(2000).regex(iconPattern, "write it as the d of an SVG path on a grid of 24, its letters and numbers alone, such as M4 12h16")).optional(),
    "token-icons": z.object({
        field: z.string().min(1),
        icons: z.record(z.string().min(1), z.string().max(2000).regex(iconPattern, "write it as the d of an SVG path on a grid of 24, its letters and numbers alone, such as M4 12h16")),
    }).strict().optional(),
    "sheet-dice": z.record(z.string().regex(sheetDicePattern), z.array(z.string().min(1)).min(1), {
        error: "write it as dice alone, as 1d20 or 2d6+1d4, and the fields of the sheet rolled with them, such as 1d20: [athletics, stealth]",
    }).optional(),
    "sheet-knowledge": z.array(z.string().min(1)).min(1).optional(),
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
    oracle: z.object({ yes: z.enum(["low", "high"]) }, { error: "write it as where the oracle's d100 says yes, low up to the odds or high above 100 less them, such as {yes: high}" }).strict().optional(),
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
    settings: z.record(z.string().min(1).refine((name) => comparableText(name) !== rulesetSetting, `${rulesetSetting} is the engine's setting of the versions: give this one another name`), settingSchema(2))
        .optional(),
    // Its versions of the rules, each a folder in versions/ (VER-1): a setting of their own, ruleset.
    versions: settingSchema(1).optional(),
    "engine-settings": engineSettingsSchema.optional(),
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
