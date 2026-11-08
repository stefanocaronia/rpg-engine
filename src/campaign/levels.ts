// The difficulty and the rigor (D-13, D-42): their presets, and the custom one, each item at a level of its own (T-132), with what they mean to the master.

/** How hard the world plays (D-13, D-141): its presets. */
export const difficulties = ["story", "easy", "normal", "hard", "brutal"] as const;

/** How closely the rules are followed, apart from difficulty (D-42): the master glosses over them, as they are written, or beyond them. */
export const rigors = ["smooth", "rules", "simulation"] as const;

/** The value of difficulty and rigor whose items each have a level of their own, written in custom-difficulty and custom-rigor (D-13, D-42). */
export const customLevel = "custom";

/** The items of a custom difficulty, as the GDD's table has them. */
export const difficultyItems = ["fights", "foes", "clues", "resources", "encounters", "clocks", "take-backs"] as const;

/** The items of a custom rigor: those the engine counts (food, light, load) and those the master counts. */
export const rigorItems = ["food", "light", "load", "fatigue", "travel", "supplies"] as const;

/** The setting that holds the items' levels of a custom difficulty or rigor, by the setting's name. */
export const customSettings = { difficulty: "custom-difficulty", rigor: "custom-rigor" } as const;

export type LeveledSetting = keyof typeof customSettings;

/** What the game system counts itself (UPK-1, UPK-3): the day's food, and what burns as it is lit, by its first name; what a rigor's meaning adds of them. */
export interface CountedByGame
{
    upkeep: boolean;
    /** Whether advance pays a day of the lifestyle chosen in a settlement (UPK-4). */
    lifestyle?: boolean;
    burning?: string;
}

/** The items of a difficulty or rigor, the levels each takes, and the level of an item the custom one does not write: the setting's default. */
export const leveled = {
    difficulty: { items: difficultyItems, levels: difficulties, unset: "normal" },
    rigor: { items: rigorItems, levels: rigors, unset: "smooth" },
} as const;

/** The level of each item of a custom difficulty or rigor, as the setting that holds them writes it; an item written wrongly, or not at all, takes the default. */
export function customLevels(setting: LeveledSetting, written: unknown): Record<string, string>
{
    const { items, levels, unset } = leveled[setting];
    const entries = written !== null && typeof written === "object" && !Array.isArray(written) ? (written as Record<string, unknown>) : {};
    return Object.fromEntries(items.map((item) => {
        const level = entries[item];
        return [item, typeof level === "string" && (levels as readonly string[]).includes(level) ? level : unset];
    }));
}

/** The level a custom difficulty or rigor starts from: each item at the preset played until then, or at the default. */
export function startingLevels(setting: LeveledSetting, preset: unknown): Record<string, string>
{
    const { items, levels, unset } = leveled[setting];
    const level = typeof preset === "string" && (levels as readonly string[]).includes(preset) ? preset : unset;
    return Object.fromEntries(items.map((item) => [item, level]));
}

/**
 * What a difficulty or rigor means to the master (D-263), the rigor with what the game counts itself; the custom one, item by item, with the levels written.
 * Undefined for a value it does not take.
 */
export function levelMeaning(setting: LeveledSetting, value: string, counted: CountedByGame | undefined, custom: unknown): string | undefined
{
    if (setting === "difficulty") {
        return value === customLevel ? customDifficultyMeaning(customLevels("difficulty", custom)) : presetDifficultyMeaning(value);
    }

    return value === customLevel ? customRigorMeaning(customLevels("rigor", custom), counted) : rigorMeaning(value, counted);
}

/** What each item of the difficulty means at each level, from the GDD's table; fights in the words of a budget of low, moderate and high (D-266). */
const difficultyItemMeanings: Record<(typeof difficultyItems)[number], Record<(typeof difficulties)[number], string>> = {
    fights: {
        story: "fights low, yet each asks one choice that counts; the plain approach wins at a small cost, the risk falling on goals and allies",
        easy: "fights low to moderate; the plain approach wins at a cost",
        normal: "fights moderate to high; two to four between full rests; the plain approach wins at a real cost, a good choice cheaply",
        hard: "fights high and beyond; the plain approach may lose, a good choice wins at a cost",
        brutal: "fights far beyond high; the plain approach loses, only good choices win",
    },
    foes: {
        story: "foes naive, ignoring the place, quick to flee",
        easy: "foes with simple tactics, using the plainest feature of the place",
        normal: "foes with sensible tactics, using the place, normal morale",
        hard: "foes smart (focus, control), taking the place first, tenacious",
        brutal: "foes optimized (prepared ground, retreats, ambushes, finishing the fallen), fanatical",
    },
    clues: {
        story: "clues obvious, four or more",
        easy: "clues plain",
        normal: "clues three for each conclusion",
        hard: "clues subtle",
        brutal: "clues subtle",
    },
    resources: {
        story: "resources plentiful",
        easy: "resources generous",
        normal: "resources standard (treasure, supplies, prices)",
        hard: "resources scarce",
        brutal: "resources very scarce; rests at their harshest",
    },
    encounters: {
        story: "random encounters rare",
        easy: "random encounters rare",
        normal: "random encounters normal",
        hard: "random encounters frequent",
        brutal: "random encounters frequent",
    },
    clocks: {
        story: "threat clocks slow: one of them a step every other day",
        easy: "threat clocks slow: one of them a step every other day",
        normal: "threat clocks at their pace: one of them a step each day",
        hard: "threat clocks fast: each of them a step each day",
        brutal: "threat clocks fast: each of them a step each day",
    },
    "take-backs": {
        story: "you may soften your own rolls; take-backs granted whenever asked",
        easy: "small take-backs granted gladly",
        normal: "a take-back now and then, when little hangs on it",
        hard: "take-backs rare",
        brutal: "no take-backs",
    },
};

/** What each rigor means in play (D-42, D-263): what the master counts. */
const rigorMeanings: Record<(typeof rigors)[number], string> = {
    smooth: "you gloss over food and water, light, encumbrance, fatigue and the like: count them only when the story turns on them",
    rules: "as written: charge with change what is used up; encumbrance, fatigue and the like as the rules say; warn before something runs out, and once it has, the rule applies",
    simulation: "as rules, and beyond what is written: wear, spoilage, weather and the like",
};

/** The items of the rigor as the master reads them. */
const rigorItemNames: Record<(typeof rigorItems)[number], string> = {
    food: "food and water",
    light: "light",
    load: "load",
    fatigue: "fatigue",
    travel: "travel",
    supplies: "ammunition and components",
};

/** What each level of a custom rigor means for the items at it. */
const rigorLevelMeanings: Record<(typeof rigors)[number], string> = {
    smooth: "glossed over: count them only when the story turns on them",
    rules: "as written: charge with change what is used up, warn before something runs out, and once it has, the rule applies",
    simulation: "as written, and beyond: wear, spoilage, weather and the like",
};

function presetDifficultyMeaning(value: string): string | undefined
{
    const level = difficulties.find((one) => one === value);
    return level === undefined ? undefined : difficultyItems.map((item) => difficultyItemMeanings[item][level]).join("; ");
}

function customDifficultyMeaning(levels: Record<string, string>): string
{
    const items = difficultyItems.map((item) => difficultyItemMeanings[item][levels[item] as (typeof difficulties)[number]]);
    return `item by item: ${items.join("; ")}`;
}

/** A rigor's meaning with what the game counts itself said (review of 17 October): a game that counts no food is never promised it. */
function rigorMeaning(rigor: string, counted: CountedByGame | undefined): string | undefined
{
    const meaning = (rigorMeanings as Record<string, string>)[rigor];
    const burns = counted?.burning === undefined ? "" : `an effect named after what burns, such as ${counted.burning}, spends it as it is lit`;

    if (meaning === undefined || rigor === "simulation" || counted === undefined) {
        return meaning;
    }

    if (rigor === "smooth") {
        return burns === "" ? meaning : `${meaning}; a light you put on as an effect, as a ${counted.burning}, still spends one`;
    }

    const food = counted.upkeep ? `${foodCounted(counted)}; ${yoursToCharge(counted)} are yours to charge` : "";
    const counts = [food, burns].filter((part) => part !== "").join("; ");
    return counts === "" ? meaning : meaning.replace("charge with change what is used up; ", `charge with change what is used up; ${counts}; `);
}

/** A custom rigor's meaning: the items grouped by level, each level with what it asks and what the game counts itself of its items. */
function customRigorMeaning(levels: Record<string, string>, counted: CountedByGame | undefined): string
{
    const groups = rigors.flatMap((level) => {
        const items = rigorItems.filter((item) => levels[item] === level);

        if (items.length === 0) {
            return [];
        }

        const names = items.map((item) => rigorItemNames[item]);
        const counts = items.flatMap((item) => gameCounts(item, level, counted));
        return [`${listText(names)} ${rigorLevelMeanings[level]}${counts.map((count) => `, and ${count}`).join("")}`];
    });

    return `item by item: ${groups.join("; ")}. Where your instructions name a rigor, read it as the level of the item they speak of`;
}

/** What the game counts itself of an item at a level, said so that the master leaves it to the game. */
function gameCounts(item: (typeof rigorItems)[number], level: string, counted: CountedByGame | undefined): string[]
{
    if (item === "food" && level !== "smooth" && counted?.upkeep === true) {
        return [`${foodCounted(counted)}, ${yoursToCharge(counted)} yours to charge`];
    }

    if (item === "light" && counted?.burning !== undefined) {
        return [level === "smooth" ? `a light you put on as an effect, as a ${counted.burning}, still spends one` : `an effect named after what burns, such as ${counted.burning}, spends it as it is lit`];
    }

    return [];
}

/**
 * What one item of a custom difficulty or rigor means at a level, as the master hears it when the player changes it: food and water as written, with what the game
 * counts itself of it.
 */
export function itemMeaning(setting: LeveledSetting, item: string, level: string, counted: CountedByGame | undefined): string | undefined
{
    if (setting === "difficulty") {
        const meanings = (difficultyItemMeanings as Record<string, Record<string, string> | undefined>)[item];
        return meanings?.[level];
    }

    const known = rigorItems.find((one) => one === item);
    const meaning = (rigorLevelMeanings as Record<string, string | undefined>)[level];

    if (known === undefined || meaning === undefined) {
        return undefined;
    }

    return [`${rigorItemNames[known]} ${meaning}`, ...gameCounts(known, level, counted)].join(", and ");
}

/** What advance spends itself of the day's upkeep (UPK-1, UPK-4): the food outside a settlement, and the lifestyle inside one where the game has it. */
function foodCounted(counted: CountedByGame): string
{
    return counted.lifestyle === true ? "advance spends the day's food outside a settlement and the day's lifestyle inside one" : "advance spends the day's food outside a settlement";
}

/** What of the day's upkeep is the master's to charge: what advance does not spend itself. */
function yoursToCharge(counted: CountedByGame): string
{
    return counted.lifestyle === true ? "water and wages" : "water, lifestyle and wages";
}

/** "a, b and c". */
function listText(items: string[]): string
{
    return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1) ?? ""}`;
}
