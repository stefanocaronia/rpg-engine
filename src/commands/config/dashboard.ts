// The player's settings and the setup's questions as the dashboard shows them (D-341, D-370)
import { type CampaignSettings, customLevel, customLevels, customSettings, lastChoices, type LeveledSetting, listSettingNames, readOneSetting, readSettings, setupSettingNames } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { type HostId, hostOfClient, hosts } from "../../core/hosts.ts";
import { comparableText } from "../../core/text.ts";
import { antigravitySays, claudeSays, codexSays } from "../../helpers/index.ts";
import { readBetweenSessions } from "../../time/index.ts";
import { gitProblem, isCampaignRepository, isInLargerRepository } from "../shared/campaign/git.ts";
import { heldSystemSettings, isLeading, offeredValues, playedEngineSetting } from "../shared/campaign/offers.ts";
import { playedSettingValue } from "../shared/campaign/world.ts";
import { customOf } from "./custom-levels.ts";
import { betweenSessionsWays, gitSettingNames, playerSettingNames, type PlayerWords, playerWords, setupWords, wordsOf } from "./words.ts";

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
    /** In the setup, the game system its question names as {game}, by its name (T-211). */
    game?: string;
    /**
     * What the player should know of it on this computer, as whether pictures can be made here; fix when it says how to have what is missing; the values its
     * {names} take, as a maker's own words; and the lines after it.
     */
    note?: { text: string; fix?: true; values?: Record<string, string>; also?: string[]; };
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
    const last = lastChoices(context.home, root);
    const suggested: Record<string, string> = { ...suggestedValues, ...(difficulty === undefined ? {} : { lethality: suggestedLethality[difficulty] ?? "dice" }), ...systemSuggests, ...last };
    // The system's settings others depend on right after the mentor, before what they change (DAT-16, DAT-17).
    const leading = held.filter(isLeading).map((setting) => setting.name);
    const order = setupOrder.filter((name) => !writtenWorld || !worldSettingNames.includes(name));
    const others = system.filter((name) => !leading.includes(name));
    // How well the player knows the game, once the chat has chosen it: the question names it (T-211).
    const game = settings.system;
    const first = game === undefined ? [] : order.slice(0, 1);
    return [...first, ...leading, ...order.slice(1), ...others, "lines", "veils"].flatMap(named).map((question) => {
        const suggestion = suggested[question.name];
        // A suggestion the game does not offer is none (DAT-16).
        const offered = suggestion !== undefined && (question.choices === undefined || question.choices.some((choice) => choice.value === suggestion));
        const asked = { ...question, ...(question.choices === undefined ? {} : { choices: question.choices.filter((choice) => choice.value !== customLevel) }) };
        const lastOne = offered && last[question.name] === suggestion ? { last: suggestion } : {};
        const worded = Object.hasOwn(questionTexts, question.name) ? { question: questionText(question.name, root) } : {};
        return { ...(question.name === "mentor" ? mentorQuestion(asked, game ?? "") : unsetUnanswered(asked, settings)), ...worded, ...(offered ? { suggested: suggestion } : {}), ...lastOne };
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
    return playerSettings(root, context).map((setting) => {
        if (setting.name === "pictures") {
            return { ...setting, ...withOwnPicture(picturesReadyNote(context)) };
        }

        return setting.name === "git" ? { ...setting, ...gitNote(root) } : setting;
    });
}

// What went wrong the last time git ran (D-576), told until it goes right.
const gitFailed = {
    commit: "The last commit failed; the game goes on all the same. Ask the master to look at it. ({why})",
    push: "The last push failed: the campaign is safe on this computer, only its copy online is behind. Ask the master to look at it. ({why})",
};

/** Every note the setting of git may have, which the dashboard writes in its language (D-394). */
export const gitNotes = Object.values(gitFailed);

/** What went wrong the last time git ran for the campaign; nothing when it went right. */
function gitNote(root: string): Pick<PlayerSetting, "note">
{
    const problem = gitProblem(root);
    return problem === undefined ? {} : { note: { text: gitFailed[problem.act], values: { why: problem.why } } };
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
        }).flatMap((setting) => offeredSetting(root, context, setting)).map((setting) => (setting.name === "pictures-by" ? makersInChat(context, setting) : setting))
            .filter((setting) => !gitSettingNames.includes(setting.name) || isCampaignRepository(root)),
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
const setupOrder = ["mentor", "difficulty", "lethality", "saves", "rigor", "dice", "master-rolls", "units", "character", "companions", "preparation", "length", "pictures", "pictures-by", "git"];

// The questions the setup's cards ask in place of a setting's name (D-572).
const questionTexts: Record<string, string> = {
    pictures: "Do you want pictures of places and of those you meet?",
    "pictures-by": "Who makes them?",
    git: "This campaign's folder is a git repository: what should the engine do with it?",
};

// The question of git where the repository holds more than the campaign: a push sends the player's other commits too (D-576).
const largerGitQuestion = "This campaign's folder is in a git repository that holds other folders too: what should the engine do with it? A push sends your commits on those folders as well.";

/** Every question of git the setup may ask, which the dashboard writes in its language. */
export const gitQuestions = [questionTexts.git, largerGitQuestion];

/** The question a setting's card asks in the setup. */
function questionText(name: string, root: string): string | undefined
{
    return name === "git" && isInLargerRepository(root) ? largerGitQuestion : questionTexts[name];
}

// The mentor as the setup asks it (D-347): how well the player knows the game, each answer a way of the mentor, from the newest player's.
const mentorAnswers: Record<string, string> = { tutorial: "never played it", hints: "a little", off: "I know it" };

// What the setup asks only of a world not written (D-80, D-558): a written one has its own.
const worldSettingNames = ["preparation", "length"];

// The values the game suggests in the setup, as the design has them by default (D-370): never chosen for the player.
const suggestedValues: Record<string, string> = { saves: "checkpoint", rigor: "smooth", "master-rolls": "behind the screen", character: "made with the player", preparation: "on the fly", length: "one evening", "pictures-by": "chat" };

// The lethality the difficulty suggests (D-141).
const suggestedLethality: Record<string, string> = { story: "narrative", easy: "epic" };

/** A question whose value is only the one shown while it is unset, as master-rolls behind the screen (D-287): still unanswered in the setup. */
function unsetUnanswered(question: PlayerSetting, settings: CampaignSettings): PlayerSetting
{
    const { value, ...unanswered } = question;
    return value !== undefined && wordsOf(question.name)?.unset === value && (settings as Record<string, unknown>)[question.name] === undefined ? unanswered : question;
}

/** The mentor as the setup asks it (D-347): how well the player knows the game, by the name of its system (T-211), never played it first. */
function mentorQuestion(question: PlayerSetting, game: string): PlayerSetting
{
    const order = Object.keys(mentorAnswers);
    const choices = (question.choices ?? []).map((choice) => ({ ...choice, label: mentorAnswers[choice.value] })).sort((one, other) => order.indexOf(one.value) - order.indexOf(other.value));
    // Free play has no rules of its own to know: the question is about role-playing games.
    const named = game === freePlay ? { question: "How well do you know role-playing games?" } : { question: "How well do you know {game}?", game };
    return { ...question, ...named, about: "the master teaches it as much as you need", choices };
}

// The engine's own game system, free play, without rules of its own.
const freePlay = "free";

// The chats that are themselves a maker of pictures the campaign may choose, with that choice's value.
const ownMakers: Partial<Record<HostId, string>> = { codex: "codex", antigravity: "antigravity" };

/**
 * Who makes the pictures as the chat in use offers it (D-572, T-251): in Codex, Codex is the chat itself, as Antigravity in Antigravity, so it is not offered,
 * and a campaign that chose it plays chat.
 */
function makersInChat(context: Context, setting: PlayerSetting): PlayerSetting
{
    const host = hostOfClient(context.host?.());
    const own = host === undefined ? undefined : ownMakers[host];

    if (own === undefined) {
        return setting;
    }

    return { ...setting, ...(setting.value === own ? { value: "chat" } : {}), choices: setting.choices?.filter((choice) => choice.value !== own) };
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

// Who makes the pictures on this computer, in the player's words (D-390, D-572).
const madeBy = {
    Codex: "Codex makes them on this computer, from your ChatGPT plan.",
    Claude: "Claude draws them on this computer, as vector pictures, from your Claude plan.",
    Antigravity: "Antigravity makes them in your chat, from your Google plan.",
    // Antigravity's agy, started apart from the chat in use (T-251).
    AntigravityApart: "Antigravity paints them on this computer, from your Google plan.",
};

// The chat in use draws them itself, as OpenCode (D-572).
const drawnInChat = "{maker} draws them in your chat, as simple vector pictures, from your plan.";

// The master makes them with an image tool of its own, as ElevenLabs's (D-572).
const madeWithTool = "The master makes them with {tool}.";
const toolAsked = "The master asks you in the chat which tool to use.";

// Where the maker the player chose made no picture, and the chat in use makes them (D-572): it refused one, with its own words, or it cannot.
const refusedNote = "{maker} refused the last picture: {why}. {by} makes them instead.";
const madeMeanwhile = "{by} makes them meanwhile.";

// Whoever makes them, the player may give a page a picture of their own (D-572 (3)).
const ownPicture = "You can also give a page you see a picture of your own: with its picture button, or dropped in the campaign's inbox folder for the master.";

/** Every note the pictures' setting may have, which the dashboard writes in its language (D-394). */
export const picturesNotes = [
    ...Object.values(madeBy),
    drawnInChat,
    madeWithTool,
    toolAsked,
    refusedNote,
    madeMeanwhile,
    ownPicture,
    ...[...Object.values(codexSays), ...Object.values(claudeSays), ...Object.values(antigravitySays)].map(notReadyText),
];

/**
 * Whether this computer makes pictures, and with whose plan, in the player's words (D-308, D-390); why not and how to have them; where the maker the player
 * chose made none and the chat in use makes them, why (D-572); nothing where no maker is asked.
 */
function picturesReadyNote(context: Context): Pick<PlayerSetting, "note">
{
    const ready = context.pictures?.ready(true);

    if (ready === undefined) {
        return {};
    }

    if (!ready.ready) {
        return { note: { text: notReadyText(ready), fix: true } };
    }

    const instead = ready.instead;

    if (instead !== undefined) {
        return instead.refused === true
            ? { note: { text: refusedNote, values: { maker: instead.maker, why: instead.why.replace(/\.$/, ""), by: instead.by } } }
            : { note: { text: notReadyText(instead), fix: true, values: { by: instead.by }, also: [madeMeanwhile] } };
    }

    if (ready.tool !== undefined) {
        return { note: { text: madeWithTool, values: { tool: ready.tool } } };
    }

    if (ready.askTool === true) {
        return { note: { text: toolAsked } };
    }

    if (ready.draws === true) {
        return { note: { text: drawnInChat, values: { maker: ready.maker ?? "" } } };
    }

    // Antigravity makes them in its own chat, and paints them apart from any other.
    const antigravity = context.host?.() === hosts.antigravity.client ? "Antigravity" : "AntigravityApart";
    return { note: { text: madeBy[ready.maker === "Claude" ? "Claude" : ready.maker === "Antigravity" ? antigravity : "Codex"] } };
}

/** The pictures' note with the line that the player may give a picture of their own after it. */
function withOwnPicture(note: Pick<PlayerSetting, "note">): Pick<PlayerSetting, "note">
{
    return note.note === undefined ? note : { note: { ...note.note, also: [...note.note.also ?? [], ownPicture] } };
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
