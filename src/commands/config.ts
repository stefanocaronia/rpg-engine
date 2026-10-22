import { join } from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import {
    type CampaignSettings,
    changeListSetting,
    changeListSettingToNone,
    changeMapSetting,
    changeOtherSetting,
    changeSetting,
    checkSettingName,
    clearSetting,
    companionWays,
    diceWays,
    difficulties,
    efforts,
    lethalities,
    listSettingNames,
    mapSettingNames,
    mentorWays,
    missingSettings,
    pictureWays,
    preparations,
    proseWays,
    readCampaignData,
    readSettings,
    readTextSetting,
    refreshHostFiles,
    requireCampaign,
    rigors,
    saveModes,
    settingMeaning,
    type SettingName,
    settingNames,
    setupSettingNames,
    storyWays,
    styleTextLengths,
    unitSystems,
    voiceWays,
    writeEffortFiles,
} from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { getVersion } from "../core/version.ts";
import { readYamlValues } from "../core/yaml-file.ts";
import { hostInstructions } from "../instructions/index.ts";
import { coinList, readAmount, readCoins } from "../money/index.ts";
import { declaredKind } from "../pages/index.ts";
import { claudeSays, codexSays } from "../pictures/index.ts";
import { campaignDataNames, findCampaignSystem, findSystem, installedSystems, systemFileName, type SystemSetting } from "../systems/index.ts";
import { readCalendar, readCalendarStart } from "../time/index.ts";
import { libraryAdditions, libraryRemovals, libraryShown, startLibraryReading } from "./game-library.ts";
import { campaignNote } from "./game-mode.ts";
import { campaignCoins, coinsShown } from "./game-money.ts";
import { readOpenScene } from "./game-scene.ts";
import { campaignCalendar, newDatedLogEntry } from "./game-time.ts";
import { campaignSystem, campaignWorld, countedByGame, installedSystemName, missingWithSystems, systemSetting, systemSettingValue, valuesText } from "./game-world.ts";
import { missingSettingsNote } from "./notes.ts";
import { mentorPart, stylePart } from "./parts.ts";

// A use whose maximum reads what gives it, in quotes for its commas (CAM-1).
const counterExample = 'bulwark-dice: {max: "4 * has(features, Bulwark)", refill: short rest}';

export const config = defineCommand({
    name: "config",
    description: "Show or change the campaign settings. "
        + "Without a setting it shows them all and which are missing; with a setting and a value it changes that one. "
        + "Use it at the start of a campaign, to learn what to ask the player, and whenever the player changes a setting. "
        + "system: one of the installed game systems, listed while it is missing. difficulty, how hard the world plays: story, easy, normal, hard, brutal. "
        + "lethality, what a fall means: narrative (the character never dies), epic (only when it matters), dice (the dice decide). "
        + "saves, when the game may go back: permadeath (never, only to the start, the campaign starting over), checkpoint (to the last end of a scene, once the player character dies), free (to any save, and saves when the player asks). "
        + "rigor, how closely travel, fatigue, food and the like follow the rules: smooth (you gloss over them), rules (as written), simulation (beyond them). "
        + "dice, who rolls the player character's dice: digital (rpg) or physical (the player, who tells you the values). units: metric or imperial. "
        + "voices, who voices the characters where your app has subagents: auto (a subagent at key moments, as you choose), master (you, always), "
        + "important (always a subagent for the companions and the characters with kind main), always (always a subagent); unset, auto. "
        + "companions: none, made with the player or made by the master in session zero, or met in play. "
        + "Without a written world: premise (the genre, the tone and a few elements of the world, in the player's words) and preparation (on the fly or all at the start). "
        + "lines (what never appears in the game) and veils (what happens only off screen) change with add and remove, or value none when the player wants none; when the player signals stop, add that content to lines. "
        + "mentor, how much you teach the game, out of the story: off (the story alone, answering what the player asks between brackets), "
        + "hints (a tip before choices that matter and when a rule slips by), tutorial (each mechanic explained the first time, a roll's whole sum, a debrief after fights). "
        + "learned: the mechanics you explained, by their names in the system's language. "
        + "How you write and build what you invent, as the player asks: prose (plain, literary, pulp, wry), story (situations, arcs, episodes, mystery), author (one whose way of writing you take), "
        + "style (the player's own words on how you write); none takes away an author or a style. "
        + "table: what you promise the player about how you play, in the words you said. "
        + "precedents: each ruling you made without the text, the name of the rule in the system's language first, then what you said, such as 'Poisoned: …'. "
        + "library: the player's own books, folders or files by their full path, which rules searches after the system: added once to this computer, with the player's yes "
        + "in a window of their computer, then turned on in each campaign with add and off with remove; remove with computer takes one off this computer; "
        + "text, or PDFs whose text can be selected, read best: a scan is read from its pictures, on Windows only, slowly. "
        + 'coins, for a game with money whose system does not give them: each coin with its value in the smallest coin, other names after a slash, "rare" for a coin never given as change; totals count in the first. '
        + "The game system may add settings, such as advancement for 5e: config lists them with what each value means. "
        + "fields, tables, computed, counters and recipes add to the game system what it lacks, or change it as a house rule: the value gives entries by name, written as in system.yaml, "
        + "each replacing the system's one of that name (a recipe adds to the system's); remove takes their names. status-line adds fields to the player character's line. "
        + "A formula with commas goes in quotes; a use's max reads what gives it, so that only who has it has it. "
        + `Example: setting language, value it; or setting lines, add "spiders"; or setting counters, value '${counterExample}'.`,
    group: "campaign",
    positionals: ["setting", "value"],
    input: z.object({
        setting: z.string().optional().describe(`setting to show or change: ${settingNames.join(", ")}, or one the game system adds`),
        value: z.string().optional().describe("new value of the setting"),
        add: z.array(z.string()).optional().describe(`items to add to a list setting (${listSettingNames.join(", ")}), repeatable`),
        remove: z.array(z.string()).optional().describe(`items to remove from a list setting (${listSettingNames.join(", ")}), repeatable`),
        computer: z.boolean().optional().describe("with library and remove: off this computer too, out of every campaign, its books' text deleted"),
    }),

    run(input, context)
    {
        if (input.computer !== undefined && (input.setting?.trim() !== "library" || input.remove === undefined)) {
            throw new Error("computer goes only with setting library and remove: it takes those folders off this computer. Nothing changed.");
        }

        // What the library holds is checked, and an addition allowed by the player, before it is written (LIB-1).
        if (input.setting?.trim() === "library" && (input.add !== undefined || input.remove !== undefined)) {
            return changeLibrary(input, context);
        }

        return configure(input, context);
    },

    format(result)
    {
        const lines = Object.entries(result.settings).map(([name, value]) => `${name}: ${formatValue(value)}`);
        return [[...lines, ...result.replaced].join("\n"), result.note, result.part ?? ""].filter((block) => block !== "").join("\n\n");
    },
});

interface ConfigInput
{
    setting?: string;
    value?: string;
    add?: string[];
    remove?: string[];
    computer?: boolean;
}

interface ConfigResult
{
    settings: Record<string, unknown>;
    note: string;
    replaced: string[];
    part?: string;
}

/**
 * The library changed (LIB-1, LIB-3): additions as full paths, added to this computer first, from the chat with the player's yes; removals by any spelling of
 * their path, off this computer too with computer; then the new books read apart.
 */
async function changeLibrary(input: ConfigInput, context: Context): Promise<ConfigResult>
{
    const root = requireCampaign(context.folder);
    const add = input.add === undefined ? undefined : await libraryAdditions(root, context, input.add);
    const remove = input.remove === undefined ? undefined : libraryRemovals(root, context, input.remove, input.computer === true);
    // Taken off the computer only: the campaign did not use it.
    const result = configure(add === undefined && remove?.length === 0 ? { setting: "library" } : { ...input, add, remove }, context);
    startLibraryReading(context);
    return result;
}

function configure(input: ConfigInput, context: Context): ConfigResult
{
    const root = requireCampaign(context.folder);
    const listChange = input.add !== undefined || input.remove !== undefined;
    const own = input.setting === undefined ? undefined : systemSetting(root, context, input.setting);

    // A setting the game system adds, with one of its values (DAT-10).
    if (own !== undefined) {
        return systemSettingResult(root, context, own, input);
    }

    if (input.setting !== undefined && !(settingNames as string[]).includes(input.setting.trim())) {
        const added = (campaignSystem(root, context)?.settings ?? []).map((setting) => setting.name);
        throw new Error(`There is no setting "${input.setting}". The settings are: ${[...settingNames, ...added].join(", ")}.`);
    }

    if (input.add !== undefined && input.setting !== undefined && mapSettingNames.includes(checkSettingName(input.setting))) {
        throw new Error(`"${input.setting}" takes entries by name as the value, such as setting counters, value '${counterExample}'; remove takes their names.`);
    }

    if (listChange && (input.setting === undefined || (input.value !== undefined && !mapSettingNames.includes(checkSettingName(input.setting))))) {
        throw new Error('Give add or remove with a list setting and no value, such as setting lines, add "spiders".');
    }

    // The master's effort is the player's to choose, in their terminal or on the dashboard, never the master's own (D-462).
    if (input.setting?.trim() === "effort" && input.value !== undefined && context.terminal !== true && context.actor !== "player") {
        throw new Error(
            "effort is the player's to choose, never yours: tell them they can set it on the dashboard's Settings, or in their terminal with rpg config effort and low, medium, high or app. Nothing changed.",
        );
    }

    // app, or none, takes the effort away: each app keeps its own again (D-462).
    if (input.setting?.trim() === "effort" && ["app", "none"].includes(input.value?.trim().toLowerCase() ?? "")) {
        if (clearSetting(root, "effort")) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: "effort", value: "app" }));
        }

        const unwritten = writeEffortFiles(root, context.platform, true);
        return { settings: { effort: shownValue(root, context, readSettings(root), "effort") }, note: "", replaced: ["Taken away for Claude Code, Codex and Gemini CLI: from the next chat each keeps its own.", ...unwritten], part: "" };
    }

    const shown = input.setting === undefined ? settingNames : [checkSettingName(input.setting)];
    const mapped = input.setting !== undefined && mapSettingNames.includes(checkSettingName(input.setting));
    let replaced: string[] = [];

    // What the campaign adds to its game system, checked with the system before it is written (CAM-1, CAM-3).
    if (mapped && input.setting !== undefined && (input.value !== undefined || input.remove !== undefined)) {
        const change = { set: input.value === undefined ? undefined : entriesOf(input.setting, input.value), remove: input.remove };
        checkAdditions(root, context, input.setting, change);
        replaced = replacedEntries(root, context, input.setting, Object.keys(change.set ?? {}));

        if (changeMapSetting(root, input.setting, change)) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, value: input.value, remove: input.remove }));
        }
    } else if (input.setting !== undefined && listChange && changeListSetting(root, input.setting, { add: input.add, remove: input.remove })) {
        appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, add: input.add, remove: input.remove }));
    } else if (input.setting !== undefined && input.value?.trim().toLowerCase() === "none" && listSettingNames.includes(checkSettingName(input.setting))) {
        // A list answered with none still answers the setup (MOD-3).
        if (changeListSettingToNone(root, input.setting)) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, value: "none" }));
        }
    } else if (input.setting !== undefined && input.value?.trim().toLowerCase() === "none" && freeSettingNames.includes(checkSettingName(input.setting))) {
        if (clearSetting(root, input.setting)) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, value: "none" }));
        }
    } else if (input.setting !== undefined && input.value !== undefined && changeSetting(root, input.setting, settingValue(root, input.setting, input.value, context))) {
        appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, value: input.value }));
    }

    // The effort written where each app reads it in the campaign's folder (D-462).
    if (input.setting?.trim() === "effort" && input.value !== undefined) {
        const unwritten = writeEffortFiles(root, context.platform);
        replaced = [
            ...replaced,
            "Written for Claude Code, Codex and Gemini CLI: it applies from the next chat; in Codex and Gemini CLI only in a folder they trust; an effort picked in the app for one chat wins there.",
            ...unwritten,
        ];
    }

    // The character agent written or taken away at once, not when the server starts again (D-490).
    if (input.setting?.trim() === "voices" && input.value !== undefined) {
        refreshHostFiles(root, hostInstructions(), context.platform);
        replaced = [...replaced, "Claude Code finds the character agent, or finds it gone, from the next chat."];
    }

    // New months may leave the day the story starts on without its month (TIM-8): said at once, not at the next date.
    if (input.setting?.trim() === "calendar" && input.value !== undefined) {
        replaced = [...replaced, ...campaignCalendar(root, context).problems.map((problem) => `${problem.message.replace(/\.$/, "")}: ${problem.fix ?? "fix it"}.`)];
    }

    const settings = readSettings(root);
    // Listed all together, what the campaign adds to its system only when it adds something.
    const added = (name: SettingName): boolean => (campaignDataNames as readonly string[]).includes(name);
    const listed = input.setting === undefined ? shown.filter((name) => !(added(name) || name === "calendar") || settings[name] !== undefined) : shown;
    const system = input.setting === undefined ? (campaignSystem(root, context)?.settings ?? []) : [];
    // The master's own change of the mentor brings its part, once in the chat; the player's comes with the news of the dashboard (D-347).
    const changed = input.value !== undefined && context.actor !== "player" ? input.setting?.trim() : undefined;
    // And of how the master writes, the parts as they are now (D-395).
    const style = styleSettingNames.includes(changed ?? "") ? stylePart(root, context) : "";
    // An author or the player's words taken away: what holds now, as the dashboard's news says it.
    const cleared = changed !== undefined && input.value?.trim().toLowerCase() === "none" ? wordsOf(changed)?.cleared : undefined;
    const part = changed === "mentor"
        ? mentorPart(root, context, settings.mentor)
        : [cleared === undefined ? "" : `${cleared.charAt(0).toUpperCase()}${cleared.slice(1)}.`, style].filter((text) => text !== "").join("\n\n");
    return {
        settings: { ...Object.fromEntries(listed.map((name) => [name, shownValue(root, context, settings, name)])), ...Object.fromEntries(system.map((setting) => [setting.name, systemShownValue(root, setting)])) },
        note: campaignNote(root, context),
        replaced,
        part,
    };
}

// The settings of free words the player may leave unset again, with the value none, and all those of how the master writes (D-395).
const freeSettingNames: SettingName[] = ["author", "style", "calendar"];
const styleSettingNames = ["prose", "story", "author", "style"];

/** The settings the player changes on the dashboard (D-341): how the game plays for them; the master's own, as house rules, coins and precedents, stay in the chat. */
export const playerSettingNames = ["difficulty", "lethality", "saves", "rigor", "mentor", "learned", "prose", "story", "author", "style", "dice", "units", "voices", "pictures", "effort", "lines", "veils", "language"] as const;

/** A setting of the player's as the dashboard shows it (D-341): what it is, its value or a list's items, and its values with what each means to the player. */
export interface PlayerSetting
{
    name: string;
    about: string;
    value?: string;
    items?: string[];
    /** Its values, each with what it means to the player, and in the setup the words that answer its question, as a little for hints (D-370). */
    choices?: { value: string; means?: string; label?: string; }[];
    /** In the setup, the value the game suggests, never chosen for the player (D-370). */
    suggested?: string;
    /** In the setup, the question its card asks in place of its name, as how well the player knows the game (D-347). */
    question?: string;
    /** What the player should know of it on this computer, as whether pictures can be made here; fix when it says how to have what is missing. */
    note?: { text: string; fix?: true; };
    /** A setting of the player's own words, as the author the master writes like: the longest its text may be (D-395). */
    most?: number;
}

// What each of the player's settings is, and what its values mean to the player, in their words rather than the master's.
const playerWords: Record<(typeof playerSettingNames)[number], PlayerWords> = {
    difficulty: {
        about: "how hard the world plays",
        values: difficulties,
        means: {
            story: "fights low, foes naive, clues obvious, resources plentiful",
            easy: "fights low to moderate, simple foes, resources generous",
            normal: "fights moderate to high, sensible foes, resources standard",
            hard: "fights high, smart and tenacious foes, resources scarce",
            brutal: "fights far beyond, optimized and fanatical foes, resources very scarce",
        },
    },
    lethality: { about: "what a fall means", values: lethalities, means: { narrative: "your character never dies", epic: "your character dies only when it matters", dice: "the dice decide" } },
    saves: {
        about: "when the game may go back",
        values: saveModes,
        means: { permadeath: "never: what happens stays; only starting the campaign over", checkpoint: "if your character dies: back to the end of the last scene", free: "back to any save, and a save whenever you ask" },
    },
    rigor: {
        about: "how closely food, light, fatigue and the like follow the rules",
        values: rigors,
        means: {
            smooth: "only when the story turns on them",
            rules: "as written: food and water each day, light as it burns, fatigue and encumbrance",
            simulation: "as written, and beyond: wear, spoilage, weather",
        },
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
    units: { about: "the units of the story", values: unitSystems, means: { metric: "metres and kilometres", imperial: "feet and miles" } },
    voices: {
        about: "who speaks for the characters you meet",
        values: voiceWays,
        means: {
            auto: "at key moments, as the master chooses, the character themselves, knowing only what they know, where your AI app can",
            master: "the master, always",
            important: "always the character themselves for your companions and the main characters, the others as in auto: slower answers, and more of your plan",
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
    language: { about: "the language the master plays in, and the page's too when it is translated" },
};

/**
 * What a setting of the player's is to them, its values and what each means; what the master does when an item is added to a list or taken off it, or a text
 * cleared; the value shown while it is unset, the core's own; the longest text of the player's own words.
 */
interface PlayerWords
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

// What the setup asks besides the player's settings (D-370): how the companions come, how far ahead a world is made, the campaign's name.
const setupWords: Record<string, { about: string; values?: readonly string[]; means?: Record<string, string>; }> = {
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
    name: { about: "the campaign's name" },
};

// The setup's questions, in the order the player meets them on the dashboard: how well they know the game, how it plays, how it is rolled, who comes along,
// then the limits.
const setupOrder = ["mentor", "difficulty", "lethality", "saves", "rigor", "dice", "units", "companions", "preparation"];

// The mentor as the setup asks it (D-347): how well the player knows the game, each answer a way of the mentor, from the newest player's.
const mentorAnswers: Record<string, string> = { tutorial: "never played it", hints: "a little", off: "I know it" };

// The values the game suggests in the setup, as the design has them by default (D-370): never chosen for the player.
const suggestedValues: Record<string, string> = { saves: "checkpoint", rigor: "smooth", preparation: "on the fly" };
// The lethality the difficulty suggests (D-141).
const suggestedLethality: Record<string, string> = { story: "narrative", easy: "epic" };

/**
 * The setup's questions as the dashboard asks them (D-370), each with its value or items, if answered, and its values with what each means: the player's
 * settings of the setup, how companions come, the preparation of a world not written, those the game system adds, then the lines and veils.
 */
export function setupQuestions(root: string, context: Context, writtenWorld: boolean): PlayerSetting[]
{
    const own = playerSettings(root, context);

    const named = (name: string): PlayerSetting[] => {
        const setting = own.find((one) => one.name === name) ?? setupSettingNamed(root, name);
        return setting === undefined ? [] : [setting];
    };

    const system = (campaignSystem(root, context)?.settings ?? []).map((setting) => setting.name);
    const difficulty = readSettings(root).difficulty;
    const suggested: Record<string, string> = { ...suggestedValues, ...(difficulty === undefined ? {} : { lethality: suggestedLethality[difficulty] ?? "dice" }) };
    return [...setupOrder.filter((name) => name !== "preparation" || !writtenWorld), ...system, "lines", "veils"].flatMap(named).map((question) => ({
        ...(question.name === "mentor" ? mentorQuestion(question) : question),
        ...(suggested[question.name] === undefined ? {} : { suggested: suggested[question.name] }),
    }));
}

/** The mentor as the setup asks it (D-347): how well the player knows the game, never played it first. */
function mentorQuestion(question: PlayerSetting): PlayerSetting
{
    const order = Object.keys(mentorAnswers);
    const choices = (question.choices ?? []).map((choice) => ({ ...choice, label: mentorAnswers[choice.value] })).sort((one, other) => order.indexOf(one.value) - order.indexOf(other.value));
    return { ...question, question: "How well do you know this game?", about: "the master teaches it as much as you need", choices };
}

/** A setting only the setup lets the dashboard change (D-370): how companions come, the preparation, the name; undefined for any other. */
export function setupSettingNamed(root: string, name: string): PlayerSetting | undefined
{
    const key = Object.keys(setupWords).find((one) => comparableText(one) === comparableText(name));

    if (key === undefined) {
        return undefined;
    }

    const words = setupWords[key];
    const value = (readSettings(root) as Record<string, unknown>)[key];
    return {
        name: key,
        about: words.about,
        ...(typeof value === "string" ? { value } : {}),
        ...(words.values === undefined ? {} : { choices: words.values.map((one) => ({ value: one, ...(words.means?.[one] === undefined ? {} : { means: words.means[one] }) })) }),
    };
}

/** The player's settings as the dashboard shows them (D-341): with what this computer lacks, as pictures without Codex, asked again. */
export function shownPlayerSettings(root: string, context: Context): PlayerSetting[]
{
    return playerSettings(root, context).map((setting) => (setting.name === "pictures" ? { ...setting, ...picturesReadyNote(context) } : setting));
}

/** The player's settings with their values, then those the game system adds (D-341). */
export function playerSettings(root: string, context: Context): PlayerSetting[]
{
    const settings = readSettings(root);
    const own = (campaignSystem(root, context)?.settings ?? []).map((setting): PlayerSetting => {
        const value = systemSettingValue(root, setting);
        const choices = setting.values.map((one) => ({ value: one.value, ...(one.player === undefined ? {} : { means: one.player }) }));
        return { name: setting.name, about: setting.about ?? "a setting of the game system", ...(value === undefined ? {} : { value }), choices };
    });
    return [
        ...playerSettingNames.map((name): PlayerSetting => {
            const words: PlayerWords = playerWords[name];
            const value = settings[name] ?? words.unset;
            const choices = words.values?.map((one) => ({ value: one, ...(words.means?.[one] === undefined ? {} : { means: words.means[one] }) }));
            return {
                name,
                about: words.about,
                ...(Array.isArray(value) ? { items: value.map(String) } : value === undefined || value === null ? {} : { value: String(value) }),
                ...(choices === undefined ? {} : { choices }),
                ...(words.most === undefined ? {} : { most: words.most }),
            };
        }),
        ...own,
    ];
}

// Who makes the pictures on this computer, in the player's words (D-390).
const madeBy = { Codex: "Codex makes them on this computer, from your ChatGPT plan.", Claude: "Claude draws them on this computer, as vector pictures, from your Claude plan." };

/** Every note the pictures' setting may have, which the dashboard writes in its language (D-394). */
export const picturesNotes = [...Object.values(madeBy), ...[...Object.values(codexSays), ...Object.values(claudeSays)].map(notReadyText)];

/** Whether this computer makes pictures, and with whose plan, in the player's words (D-308, D-390); why not and how to have them; nothing where no maker is asked. */
function picturesReadyNote(context: Context): Pick<PlayerSetting, "note">
{
    const ready = context.pictures?.ready(true);
    return ready === undefined ? {} : { note: ready.ready ? { text: madeBy[ready.maker ?? "Codex"] } : { text: notReadyText(ready), fix: true } };
}

/** How the player has pictures, or else why there are none. */
function notReadyText(said: { why: string; fix?: string; }): string
{
    return said.fix ?? `${said.why}.`;
}

/** One of the player's settings by its name, in any case, as the dashboard changes them (D-341); undefined for a setting of the master's or none. */
export function playerSettingNamed(root: string, context: Context, name: string): PlayerSetting | undefined
{
    return playerSettings(root, context).find((setting) => comparableText(setting.name) === comparableText(name));
}

/**
 * What the master hears, at the head of their next call, of a setting the player changed on the dashboard (D-341): how it is now against how it was before the
 * player's first change since their last call, a value with what it means to the master; nothing for one that came back as it was.
 */
export function playerChangeNews(root: string, context: Context, before: PlayerSetting, after: PlayerSetting): string[]
{
    if (before.items !== undefined || after.items !== undefined) {
        const added = (after.items ?? []).filter((item) => !(before.items ?? []).includes(item));
        const removed = (before.items ?? []).filter((item) => !(after.items ?? []).includes(item));
        return [
            ...(added.length === 0 ? [] : [`The player added ${quotedItems(added)} to ${after.name} on the dashboard: ${addedText(after)}.`]),
            ...(removed.length === 0 ? [] : [`The player took ${quotedItems(removed)} off ${after.name} on the dashboard${takenOffText(after.name)}.`]),
        ];
    }

    if (after.value === before.value) {
        return [];
    }

    // The master's effort is no rule of play: it changes how the next chat thinks, never this one (D-462).
    if (after.name === "effort") {
        return [`The player set how much you think to ${after.value ?? "their app's own"} on the dashboard: it applies from their next chat; nothing to do now.`];
    }

    // How the master writes comes with its parts as they are now, on a line of their own: the same for each of them the player changed (D-395).
    const style = styleSettingNames.includes(after.name) ? stylePart(root, context) : "";

    if (after.value === undefined) {
        const cleared = wordsOf(after.name)?.cleared;
        return cleared === undefined ? [] : [`The player took ${after.name} away on the dashboard: ${cleared}. Play by it from now on.`, ...(style === "" ? [] : [style])];
    }

    const meaning = settingMeaning(after.name, after.value, countedByGame(campaignSystem(root, context))) ?? systemSetting(root, context, after.name)?.values.find((one) => one.value === after.value)?.means;
    const value = after.most === undefined ? after.value : `"${after.value}"`;
    const author = after.name === "prose" && readSettings(root).author !== undefined ? " An author is written: theirs takes its place until the player takes it away." : "";
    // The mentor's new part comes with it, once in the chat (D-347).
    const part = after.name === "mentor" ? mentorPart(root, context, after.value) : "";
    return [
        `The player set ${after.name} to ${value} on the dashboard${meaning === undefined ? "" : `: ${meaning}`}. Play by it from now on.${author}${part === "" ? "" : `\n\n${part}`}`,
        ...(style === "" ? [] : [style]),
    ];
}

/** What an item the player added to a list means to the master: what the list holds, or what to do, as for learned. */
function addedText(setting: PlayerSetting): string
{
    return wordsOf(setting.name)?.added ?? setting.about;
}

/** What the master does when the player takes an item off a list, as for learned: explain it again. */
function takenOffText(name: string): string
{
    const taken = wordsOf(name)?.takenOff;
    return taken === undefined ? "" : `: ${taken}`;
}

/** Items in quotes, one after another: "spiders", "drowning". */
function quotedItems(items: string[]): string
{
    return items.map((item) => `"${item}"`).join(", ");
}

/** A setting the game system adds, shown, or changed to one of its values (DAT-10); refused with them for any other. */
function systemSettingResult(
    root: string,
    context: Context,
    setting: SystemSetting,
    input: { value?: string; add?: string[]; remove?: string[]; },
): { settings: Record<string, unknown>; note: string; replaced: string[]; part?: string; }
{
    if (input.add !== undefined || input.remove !== undefined) {
        throw new Error(`${setting.name} takes one value, ${valuesText(setting)}, such as setting ${setting.name}, value ${setting.values[0].value}. Nothing changed.`);
    }

    if (input.value !== undefined) {
        const given = input.value.trim();
        const value = setting.values.find((candidate) => comparableText(candidate.value) === comparableText(given));

        if (value === undefined) {
            throw new Error(`"${given}" is not a value of ${setting.name}, which takes ${setting.values.map((candidate) => `${candidate.value} (${candidate.means})`).join("; or ")}. Nothing changed.`);
        }

        if (changeOtherSetting(root, setting.name, value.value)) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: setting.name, value: value.value }));
        }
    }

    return { settings: { [setting.name]: systemShownValue(root, setting) }, note: campaignNote(root, context), replaced: [] };
}

/** A setting of the system as config shows it: its value with what it means, or missing with every value and what it means (DAT-10). */
function systemShownValue(root: string, setting: SystemSetting): string
{
    const value = systemSettingValue(root, setting);
    const chosen = setting.values.find((candidate) => candidate.value === value);
    return chosen === undefined ? `(missing; ${setting.values.map((candidate) => `${candidate.value}: ${candidate.means}`).join("; ")})` : `${chosen.value}: ${chosen.means}`;
}

/** A setting as config shows it: a list or entries by name, none when missing; the coins and the system as they read (MON-7, D-173); difficulty and rigor with what they mean (D-263). */
function shownValue(root: string, context: Context, settings: CampaignSettings, name: SettingName): unknown
{
    const meaning = settingMeaning(name, settings[name], countedByGame(campaignSystem(root, context)));

    if (meaning !== undefined) {
        return `${String(settings[name])}: ${meaning}`;
    }

    // The library with what is read of each entry, and what is skipped (LIB-5).
    if (name === "library") {
        return libraryShown(root, context);
    }

    // Lines and veils not yet answered are missing: [] is the answer none (MOD-3).
    if (listSettingNames.includes(name)) {
        return settings[name] ?? (setupSettingNames.includes(name) ? undefined : []);
    }

    if (mapSettingNames.includes(name)) {
        return settings[name] ?? {};
    }

    // How the master writes, unset: the core's own ways, never missing (D-395).
    // And the master's effort, unset: each app's own, the player's to choose (D-462); who voices the characters, unset: auto (D-490).
    const own: Record<string, string> = {
        prose: "plain (as your instructions write)",
        story: "situations (as your instructions write)",
        author: "(none)",
        style: "(none)",
        effort: "(the app's own: the player's to choose)",
        voices: "auto (a subagent at key moments, as you choose, where the app has them)",
    };

    if (settings[name] === undefined && Object.hasOwn(own, name)) {
        return own[name];
    }

    return name === "coins" ? coinsShown(root, context) : name === "system" ? systemShown(settings.system, context) : settings[name];
}

/** A setting's value as config writes it: an installed system by the name it is installed under (D-167), the coins read and checked (MON-1), anything else as given. */
function settingValue(root: string, setting: string, value: string, context: Context): unknown
{
    if (setting === "calendar") {
        const read = yamlValue(value, "the calendar", "months: [{name: January, days: 31, season: winter}, ...]");

        try {
            return readCalendar(read);
        } catch (error) {
            throw new Error(`${error instanceof Error ? error.message : String(error)} Nothing changed.`);
        }
    }

    if (setting === "calendar-start") {
        return calendarStartValue(root, context, value);
    }

    return setting === "coins" ? newCoins(root, value, context) : setting === "system" ? installedSystemName(value, context, "config") : value;
}

/** When the story starts, day 1 or a day of the campaign's calendar (TIM-8), checked and written as given. */
function calendarStartValue(root: string, context: Context, value: string): string
{
    try {
        readCalendarStart(value, campaignCalendar(root, context).calendar);
    } catch (error) {
        throw new Error(`${error instanceof Error ? error.message : String(error)} Nothing changed.`);
    }

    return value.trim().replace(/\s+/g, " ");
}

/** The system as config shows it: what it is and which version brings it (D-173); missing or not installed, with those that are (D-167). */
function systemShown(system: string | undefined, context: Context): string
{
    const installed = `installed: ${installedSystems(context.systemFolders).map((installedSystem) => installedSystem.name).join(", ") || "none"}`;

    if (system === undefined) {
        return `(missing; ${installed})`;
    }

    // The systems come with the engine until they are packages of their own (D-171).
    const found = findSystem(context.systemFolders, system);
    return found === undefined ? `${system} (not installed; ${installed})` : `${found.name}, ${found.title} (rpg-engine ${getVersion()})`;
}

/** The coins given to config, refused when money already written in the world would no longer read as money with them (MON-1). */
function newCoins(root: string, text: string, context: Context): Record<string, number | string>
{
    const coins = readCoins(text);
    const before = campaignCoins(root, context).coins;

    if (before === undefined) {
        return coins;
    }

    const after = coinList(coins);
    const scene = readOpenScene(root).scene;
    const world = campaignWorld(root, context);
    const holders = [...world.pages.map((page) => ({ name: page.name, fields: page.fields })), ...Object.entries(scene?.copies ?? {}).map(([name, copy]) => ({ name, fields: copy }))];
    // A field the game system declares is never money (SYS-8).
    const lost = holders.flatMap((holder) =>
        Object.entries(holder.fields).filter(([field, value]) => declaredKind(world, field) === undefined && readAmount(value, before) !== undefined && readAmount(value, after) === undefined)
            .map(([field, value]) => `${holder.name}: ${field} ${String(value)}`)
    );

    if (lost.length > 0) {
        const more = lost.length > 5 ? `, and ${lost.length - 5} more` : "";
        throw new Error(
            `With these coins, money already written would no longer be money: ${lost.slice(0, 5).join("; ")}${more}. Keep their coins in the list (another name works too, such as gp/mo), or change those first. Nothing changed.`,
        );
    }

    return coins;
}

function formatValue(value: unknown): string
{
    if (Array.isArray(value)) {
        return value.length > 0 ? value.join("; ") : "(none)";
    }

    // Entries by name, as campaign.yaml writes them, on one line.
    if (value !== null && typeof value === "object") {
        return Object.keys(value).length === 0 ? "(none)" : stringify(value, { collectionStyle: "flow", lineWidth: 0 }).trim();
    }

    return value === undefined ? "(missing)" : String(value);
}

/** The entries given to a setting that holds them, read as YAML, such as "bulwark-dice: {max: 4, refill: short rest}" (CAM-1). */
function entriesOf(setting: string, text: string): Record<string, unknown>
{
    const value = yamlValue(text, "the entries", "name: value");

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${setting} takes entries by name, written as in system.yaml, such as ${setting === "counters" ? `'${counterExample}'` : '"name: value"'}. Nothing changed.`);
    }

    return value as Record<string, unknown>;
}

/** A value given as YAML text, read; what does not read says how to write it. */
function yamlValue(text: string, what: string, example: string): unknown
{
    try {
        return parse(text) as unknown;
    } catch (error) {
        throw new Error(`"${text}" does not read: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}. Write ${what} as in system.yaml, such as ${example}. Nothing changed.`);
    }
}

/**
 * "counters channel-divinity takes the place of the system 5e's {max: …, refill: short rest}": what an entry given in place of one of the system's leaves out,
 * said so that nothing is lost unseen (CAM-2). A recipe adds to the system's and replaces nothing.
 */
function replacedEntries(root: string, context: Context, setting: string, names: string[]): string[]
{
    const system = findSystem(context.systemFolders, readTextSetting(root, "system") ?? "");

    if (system === undefined || setting === "recipes") {
        return [];
    }

    const data = readYamlValues(join(system.folder, systemFileName), "what the system is");
    const own = data !== null && typeof data === "object" ? (data as Record<string, unknown>)[setting] : undefined;
    const entries = own !== null && typeof own === "object" && !Array.isArray(own) ? Object.entries(own) : [];
    return names.flatMap((name) => {
        const [found, value] = entries.find(([other]) => comparableText(other) === comparableText(name)) ?? [];
        return found === undefined ? [] : [`${setting} ${name} takes the place of the system ${system.name}'s ${found}, ${formatValue(value)}: what this one leaves out of it is gone.`];
    });
}

/** Refuses what the campaign would add to its game system when the system would not read with it (CAM-3), saying where and why; and when it has no system yet. */
function checkAdditions(root: string, context: Context, setting: string, change: { set?: Record<string, unknown>; remove?: string[]; }): void
{
    const system = readTextSetting(root, "system");

    if (system === undefined || findSystem(context.systemFolders, system) === undefined) {
        throw new Error(`The campaign has no installed game system to add ${setting} to: set its system first. Nothing changed.`);
    }

    const data = readCampaignData(root);
    const held = data[setting] !== null && typeof data[setting] === "object" && !Array.isArray(data[setting]) ? (data[setting] as Record<string, unknown>) : {};
    const dropped = [...(change.remove ?? []), ...Object.keys(change.set ?? {})];
    const entries = { ...Object.fromEntries(Object.entries(held).filter(([name]) => !dropped.some((other) => comparableText(other) === comparableText(name)))), ...change.set };
    const problem = findCampaignSystem(context.systemFolders, system, { ...data, [setting]: entries }).problem;

    if (problem !== undefined) {
        throw new Error(`With this, the system ${system} would not read: ${problem} Nothing changed.`);
    }
}

/** What a setting of the player's is to them and to the master, by its name; undefined for one of the game system. */
function wordsOf(name: string): (typeof playerWords)[keyof typeof playerWords] | undefined
{
    return Object.hasOwn(playerWords, name) ? playerWords[name as keyof typeof playerWords] : undefined;
}
