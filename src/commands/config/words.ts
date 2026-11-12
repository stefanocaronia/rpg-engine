// What each player setting and setup question is, in the player's words
import {
    characterWays,
    companionWays,
    customLevel,
    diceWays,
    difficulties,
    efforts,
    lengths,
    lethalities,
    listLimits,
    masterRollWays,
    mentorWays,
    pictureWays,
    preparations,
    proseWays,
    rigors,
    saveModes,
    storyWays,
    styleTextLengths,
    unitSystems,
    voiceWays,
} from "../../campaign/index.ts";

export const styleSettingNames = ["prose", "story", "author", "style"];

// The game time between sessions the dashboard offers (D-133): stopped, a day of the game for each real week, or as real time.
export const betweenSessionsWays = ["stops", "1d per 7d", "1d per 1d"] as const;

/** The settings the player changes on the dashboard (D-341): how the game plays for them; the master's own, as house rules, coins and precedents, stay in the chat. */
export const playerSettingNames = [
    "difficulty",
    "custom-difficulty",
    "lethality",
    "saves",
    "rigor",
    "custom-rigor",
    "between-sessions",
    "mentor",
    "learned",
    "prose",
    "story",
    "author",
    "style",
    "dice",
    "master-rolls",
    "units",
    "voices",
    "pictures",
    "effort",
    "lines",
    "veils",
    "orders",
    "language",
] as const;

// What each of the player's settings is, and what its values mean to the player, in their words rather than the master's.
export const playerWords: Record<(typeof playerSettingNames)[number], PlayerWords> = {
    difficulty: {
        about: "how hard the world plays",
        values: [...difficulties, customLevel],
        means: {
            story: "fights low, foes naive, clues obvious, resources plentiful",
            easy: "fights low to moderate, simple foes, resources generous",
            normal: "fights moderate to high, sensible foes, resources standard",
            hard: "fights high, smart and tenacious foes, resources scarce",
            brutal: "fights far beyond, optimized and fanatical foes, resources very scarce",
            custom: "each part at its own level, chosen below",
        },
    },
    "custom-difficulty": { about: "how hard each part of the world plays", values: difficulties },
    lethality: { about: "what a fall means", values: lethalities, means: { narrative: "your character never dies", epic: "your character dies only when it matters", dice: "the dice decide" } },
    saves: {
        about: "when the game may go back",
        values: saveModes,
        means: { permadeath: "never: what happens stays; only starting the campaign over", checkpoint: "if your character dies: back to the end of the last scene", free: "back to any save, and a save whenever you ask" },
    },
    rigor: {
        about: "how closely food, light, fatigue and the like follow the rules",
        values: [...rigors, customLevel],
        means: {
            smooth: "only when the story turns on them",
            rules: "as written: food and water each day, light as it burns, fatigue and encumbrance",
            simulation: "as written, and beyond: wear, spoilage, weather",
            custom: "each part at its own level, chosen below",
        },
    },
    "custom-rigor": { about: "how closely each part follows the rules", values: rigors },
    // The few rates the dashboard offers (D-133); one written in the chat or by hand shows as it is, beside them.
    "between-sessions": {
        about: "whether the story's time runs while you are away, from one session to the next",
        values: betweenSessionsWays,
        means: {
            stops: "the world waits for you: the story picks up at the moment you left it",
            "1d per 7d": "a day of the story for each week you are away: when you come back, at your first move the master lets it pass and tells what the world did meanwhile",
            "1d per 1d": "a day of the story for each day you are away: when you come back, at your first move the master lets it pass and tells what the world did meanwhile",
        },
        unset: "stops",
    },
    mentor: {
        about: "how much the master teaches the game, out of the story",
        values: mentorWays,
        means: {
            off: "only the story; ask in brackets whenever you want",
            hints: "a short note before big choices and when a rule slips by",
            tutorial: "each rule explained the first time, the numbers shown, a short review after fights",
        },
    },
    learned: {
        about: "what the master has explained: take one off to have it explained again",
        added: "they know it already: no need to explain it",
        takenOff: "explain it again the next time it comes up",
    },
    prose: {
        about: "how the master writes",
        values: proseWays,
        unset: "plain",
        means: {
            plain: "short sentences, one concrete detail at a time",
            literary: "more room at the high points, images and subtext",
            pulp: "tense action, strong colours, each message ending on a threat or a hook",
            wry: "a narrator with a half smile at the world, never at your character",
        },
    },
    story: {
        about: "how the master builds the stories they invent; a written adventure keeps its own",
        values: storyWays,
        unset: "situations",
        means: {
            situations: "factions, threats and places with secrets, no main plot: you choose where to go",
            arcs: "a central threat that advances by stages, your character's own story woven in",
            episodes: "a story that closes each session, with a thread that comes back",
            mystery: "every story an investigation, its truth decided before you start",
        },
    },
    author: {
        about: "an author the master writes like: their way of telling, never their sentences, names or places",
        most: styleTextLengths.author,
        cleared: "write as the prose setting says again",
    },
    style: {
        about: "your own wishes for how the master writes, in a few words, such as third person, past tense",
        most: styleTextLengths.style,
        cleared: "their own words on how you write no longer hold",
    },
    dice: { about: "who rolls your character's dice", values: diceWays, means: { digital: "the engine rolls them", physical: "you roll your own and tell the values" } },
    "master-rolls": {
        about: "the master's rolls for foes and the characters you meet; yours and your companions' are always in view",
        values: masterRollWays,
        means: { "behind the screen": "hidden: the master tells you only what comes of them", "in view": "shown among the rolls, beside yours" },
        unset: "behind the screen",
    },
    units: { about: "the units of the story", values: unitSystems, means: { metric: "metres and kilometres", imperial: "feet and miles" } },
    voices: {
        about: "who speaks for the characters you meet",
        values: voiceWays,
        means: {
            master: "the master, always",
            auto: "at key moments, as the master chooses, the character themselves, knowing only what they know, where your AI app can",
            important: "always the character themselves for your companions and the main characters, the others only at key moments: slower answers, and more of your plan",
            always: "always the character themselves, for everyone: much slower answers, and much more of your plan",
        },
        unset: "auto",
    },
    pictures: {
        about: "the pictures of places, quests and those you meet, made on this computer",
        values: pictureWays,
        means: { none: "no pictures", "on request": "those you ask for", "new elements": "one for each new place and quest, and for each one you meet" },
    },
    effort: {
        about: "how much the master thinks before each answer, from the next chat",
        values: [...efforts, "app"],
        means: { low: "quicker answers, a little less thought", medium: "the usual balance", high: "slower answers, more thought", app: "your AI app decides, as it does in any chat" },
        unset: "app",
    },
    lines: { about: "what never appears in the game" },
    veils: { about: "what happens only off screen, without details" },
    // The standing orders, always before the master: their longest item, which the page's field keeps to (D-563).
    orders: {
        about: "the orders you give your companions, kept until you lift one",
        added: "the companions keep it from now on, as their pages allow",
        takenOff: "the companions no longer keep it",
        most: listLimits.orders?.length,
    },
    language: { about: "the language the master plays in, and the page's too when it is translated" },
};

/**
 * What a setting of the player's is to them, its values and what each means; what the master does when an item is added to a list or taken off it, or a text
 * cleared; the value shown while it is unset, the core's own; the longest text of the player's own words, or of each item of a list.
 */
export interface PlayerWords
{
    about: string;
    means?: Record<string, string>;
    values?: readonly string[];
    added?: string;
    takenOff?: string;
    cleared?: string;
    unset?: string;
    most?: number;
}

// What the setup asks besides the player's settings (D-370): how the player character and the companions come, how far ahead a world is made and how long it
// plays, the campaign's name.
export const setupWords: Record<string, { about: string; values?: readonly string[]; means?: Record<string, string>; labels?: Record<string, string>; }> = {
    companions: {
        about: "how companions come to your side",
        values: companionWays,
        means: {
            none: "you play alone",
            "made with the player": "you make them with the master in session zero",
            "made by the master": "the master makes them in session zero",
            "met in play": "you meet them in the story",
        },
    },
    preparation: {
        about: "how far ahead the master makes the world",
        values: preparations,
        means: { "on the fly": "just before it is needed, so the story can go anywhere", "all at the start": "all of it before the first scene" },
    },
    length: {
        about: "how long the story you play lasts; at its end you can always go on",
        values: lengths,
        means: {
            "one evening": "one adventure that begins and ends in an evening",
            "a few sessions": "an adventure of three to five evenings",
            open: "a campaign with no set end, one adventure after another",
        },
    },
    character: {
        about: "how your character is made in session zero",
        values: characterWays,
        means: {
            "made with the player": "you make it with the master, choice by choice",
            "made by the master": "the master makes it from a few words of yours",
            "the player's own": "you bring one you already have, as a sheet, a file or a description, at its level",
        },
        labels: { "made with the player": "With the master", "made by the master": "The master makes it", "the player's own": "I already have one" },
    },
    name: { about: "the campaign's name" },
};

/** What a setting of the player's is to them and to the master, by its name; undefined for one of the game system. */
export function wordsOf(name: string): (typeof playerWords)[keyof typeof playerWords] | undefined
{
    return Object.hasOwn(playerWords, name) ? playerWords[name as keyof typeof playerWords] : undefined;
}
