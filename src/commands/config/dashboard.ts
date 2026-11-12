// The player's settings and the setup's questions as the dashboard shows them (D-341, D-370)
import { type CampaignSettings, customLevel, customLevels, customSettings, lastChoices, type LeveledSetting, listSettingNames, readOneSetting, readSettings, setupSettingNames } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { comparableText } from "../../core/text.ts";
import { claudeSays, codexSays } from "../../helpers/index.ts";
import { readBetweenSessions } from "../../time/index.ts";
import { heldSystemSettings, isLeading, offeredValues, playedEngineSetting } from "../shared/campaign/offers.ts";
import { playedSettingValue } from "../shared/campaign/world.ts";
import { customOf } from "./custom-levels.ts";
import { betweenSessionsWays, playerSettingNames, type PlayerWords, playerWords, setupWords, wordsOf } from "./words.ts";

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
    /** In the setup, the player's choice in their last campaign on this computer, which is the one suggested (T-134). */
    last?: string;
    /** In the setup, the question its card asks in place of its name, as how well the player knows the game (D-347). */
    question?: string;
    /** What the player should know of it on this computer, as whether pictures can be made here; fix when it says how to have what is missing. */
    note?: { text: string; fix?: true; };
    /** A setting of the player's own words, as the author the master writes like, the longest its text may be (D-395); for a list, each item's (D-563). */
    most?: number;
    /** The items of a custom difficulty or rigor, each with its level, one of the choices (T-132). */
    entries?: { name: string; value: string; }[];
}

/**
 * The setup's questions as the dashboard asks them (D-370), each with its value or items, if answered, and its values with what each means: the player's
 * settings of the setup, how the character and the companions come, the preparation and length of a world not written, those the game system adds, then the lines and veils.
 */
export function setupQuestions(root: string, context: Context, writtenWorld: boolean): PlayerSetting[]
{
    const own = playerSettings(root, context);

    const named = (name: string): PlayerSetting[] => {
        const setting = own.find((one) => one.name === name) ?? setupSettingNamed(root, name);
        return setting === undefined ? [] : [setting];
    };

    const held = heldSystemSettings(root, context);
    const system = held.map((setting) => setting.name);
    const settings = readSettings(root);
    const difficulty = settings.difficulty;
    // The value a system's setting suggests (DAT-17).
    const systemSuggests = Object.fromEntries(held.flatMap((setting) => setting.values.filter((value) => value.suggested === true).map((value) => [setting.name, value.value])));
    // The player's last choices first: how they like to play, from their last campaign on this computer (T-134).
    const last = lastChoices(context.home);
    const suggested: Record<string, string> = { ...suggestedValues, ...(difficulty === undefined ? {} : { lethality: suggestedLethality[difficulty] ?? "dice" }), ...systemSuggests, ...last };
    // The system's settings others depend on right after the mentor, before what they change (DAT-16, DAT-17).
    const leading = held.filter(isLeading).map((setting) => setting.name);
    const order = setupOrder.filter((name) => !writtenWorld || !worldSettingNames.includes(name));
    const others = system.filter((name) => !leading.includes(name));
    return [...order.slice(0, 1), ...leading, ...order.slice(1), ...others, "lines", "veils"].flatMap(named).map((question) => {
        const suggestion = suggested[question.name];
        // A suggestion the game does not offer is none (DAT-16).
        const offered = suggestion !== undefined && (question.choices === undefined || question.choices.some((choice) => choice.value === suggestion));
        const asked = { ...question, ...(question.choices === undefined ? {} : { choices: question.choices.filter((choice) => choice.value !== customLevel) }) };
        const lastOne = offered && last[question.name] === suggestion ? { last: suggestion } : {};
        return { ...(question.name === "mentor" ? mentorQuestion(asked) : unsetUnanswered(asked, settings)), ...(offered ? { suggested: suggestion } : {}), ...lastOne };
    });
}

/** A setting only the setup lets the dashboard change (D-370): how the character and the companions come, the preparation, the length, the name; undefined for any other. */
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
        ...(words.values === undefined ? {} : {
            choices: words.values.map((one) => ({
                value: one,
                ...(words.means?.[one] === undefined ? {} : { means: words.means[one] }),
                ...(words.labels?.[one] === undefined ? {} : { label: words.labels[one] }),
            })),
        }),
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
    const own = heldSystemSettings(root, context).map((setting): PlayerSetting => {
        const value = playedSettingValue(root, context, setting);
        const choices = setting.values.map((one) => ({ value: one.value, ...(one.player === undefined ? {} : { means: one.player }) }));
        return { name: setting.name, about: setting.about ?? "a setting of the game system", ...(value === undefined ? {} : { value }), choices };
    });
    return [
        ...playerSettingNames.flatMap((name): PlayerSetting[] => {
            const words: PlayerWords = playerWords[name];
            const custom = customOf(name);

            if (custom !== undefined) {
                return customItems(root, context, custom, words);
            }

            // A list the setup never asks holds nothing yet, never unanswered (MOD-3).
            const empty = listSettingNames.includes(name) && !setupSettingNames.includes(name) ? [] : undefined;
            const written = settings[name] ?? words.unset ?? empty;
            const value = name === "between-sessions" && typeof written === "string" ? shownBetweenSessions(written) : written;
            const choices = words.values?.map((one) => ({ value: one, ...(words.means?.[one] === undefined ? {} : { means: words.means[one] }) }));
            return [{
                name,
                about: words.about,
                ...(Array.isArray(value) ? { items: value.map(String) } : value === undefined || value === null ? {} : { value: String(value) }),
                ...(choices === undefined ? {} : { choices }),
                ...(words.most === undefined ? {} : { most: words.most }),
            }];
        }).flatMap((setting) => offeredSetting(root, context, setting)),
        ...own,
    ];
}

/** One of the player's settings by its name, in any case, as the dashboard changes them (D-341); undefined for a setting of the master's or none. */
export function playerSettingNamed(root: string, context: Context, name: string): PlayerSetting | undefined
{
    return playerSettings(root, context).find((setting) => comparableText(setting.name) === comparableText(name));
}

// The setup's questions, in the order the player meets them on the dashboard: how well they know the game, how it plays, how it is rolled, who comes along,
// the world and how long it plays, then the limits.
const setupOrder = ["mentor", "difficulty", "lethality", "saves", "rigor", "dice", "master-rolls", "units", "character", "companions", "preparation", "length"];

// The mentor as the setup asks it (D-347): how well the player knows the game, each answer a way of the mentor, from the newest player's.
const mentorAnswers: Record<string, string> = { tutorial: "never played it", hints: "a little", off: "I know it" };

// What the setup asks only of a world not written (D-80, D-558): a written one has its own.
const worldSettingNames = ["preparation", "length"];

// The values the game suggests in the setup, as the design has them by default (D-370): never chosen for the player.
const suggestedValues: Record<string, string> = { saves: "checkpoint", rigor: "smooth", "master-rolls": "behind the screen", character: "made with the player", preparation: "on the fly", length: "one evening" };

// The lethality the difficulty suggests (D-141).
const suggestedLethality: Record<string, string> = { story: "narrative", easy: "epic" };

/** A question whose value is only the one shown while it is unset, as master-rolls behind the screen (D-287): still unanswered in the setup. */
function unsetUnanswered(question: PlayerSetting, settings: CampaignSettings): PlayerSetting
{
    const { value, ...unanswered } = question;
    return value !== undefined && wordsOf(question.name)?.unset === value && (settings as Record<string, unknown>)[question.name] === undefined ? unanswered : question;
}

/** The mentor as the setup asks it (D-347): how well the player knows the game, never played it first. */
function mentorQuestion(question: PlayerSetting): PlayerSetting
{
    const order = Object.keys(mentorAnswers);
    const choices = (question.choices ?? []).map((choice) => ({ ...choice, label: mentorAnswers[choice.value] })).sort((one, other) => order.indexOf(one.value) - order.indexOf(other.value));
    return { ...question, question: "How well do you know this game?", about: "the master teaches it as much as you need", choices };
}

/** A player's setting as the game offers it (DAT-16): none where it plays one value alone; only the values it offers, and no value written that it does not. */
function offeredSetting(root: string, context: Context, setting: PlayerSetting): PlayerSetting[]
{
    const offered = offeredValues(root, context, setting.name);

    if (offered === undefined) {
        return [setting];
    }

    if (offered.length === 1) {
        return [];
    }

    const { value, ...rest } = setting;
    const kept = offered.some((one) => comparableText(one) === comparableText(value ?? "")) ? { value } : {};
    return [{ ...rest, ...kept, ...(setting.choices === undefined ? {} : { choices: setting.choices.filter((choice) => offered.some((one) => comparableText(one) === comparableText(choice.value))) }) }];
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

/** The game time between sessions as the dashboard shows it (D-133): by the words of a way it offers that plays the same, as STOPS or 2d per 14d; any other as written. */
function shownBetweenSessions(written: string): string
{
    const read = readBetweenSessions(written);

    const same = (way: string): boolean => {
        const offered = readBetweenSessions(way);
        return read === "stops" || offered === "stops" ? read === offered : read !== undefined && offered !== undefined && read.game * offered.real === offered.game * read.real;
    };

    return betweenSessionsWays.find(same) ?? written;
}

/** The items of a custom difficulty or rigor as the dashboard shows them, each with its level, only while the campaign plays it custom (T-132). */
function customItems(root: string, context: Context, setting: LeveledSetting, words: PlayerWords): PlayerSetting[]
{
    if (playedEngineSetting(root, context, setting) !== customLevel) {
        return [];
    }

    const levels = customLevels(setting, readOneSetting(root, customSettings[setting]));
    return [{
        name: customSettings[setting],
        about: words.about,
        entries: Object.entries(levels).map(([name, value]) => ({ name, value })),
        choices: (words.values ?? []).map((value) => ({ value })),
    }];
}
