// The config command: shows a setting, checks it and writes it
import { z } from "zod";
import {
    changeListSetting,
    changeListSettingToNone,
    changeMapSetting,
    changeOtherSetting,
    changeSetting,
    checkSettingName,
    clearSetting,
    customLevel,
    customSettings,
    entrySettingNames,
    listSettingNames,
    mapSettingNames,
    readSettings,
    readTextSetting,
    refreshHostFiles,
    rememberChoice,
    requireCampaign,
    settingDescription,
    type SettingName,
    settingNames,
    startingLevels,
    writeEffortFiles,
} from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { defineCommand } from "../../core/registry.ts";
import { comparableText } from "../../core/text.ts";
import { hostInstructions } from "../../instructions/index.ts";
import { coinList, readAmount, readCoins } from "../../money/index.ts";
import { declaredKind } from "../../pages/index.ts";
import { campaignDataNames, rulesetSetting, type SystemSetting } from "../../systems/index.ts";
import { readBetweenSessions, readCalendar, readCalendarStart } from "../../time/index.ts";
import { checkLibraryRemovals, libraryAdditions, libraryRemovals, startLibraryReading } from "../shared/books/library.ts";
import { campaignMode, campaignNote } from "../shared/campaign/mode.ts";
import { campaignCoins } from "../shared/campaign/money.ts";
import { askedBy, heldSystemSettings, offerRefusal, playedEngineSetting, unofferedLines, valuePart } from "../shared/campaign/offers.ts";
import { lengthPart, mentorPart, stylePart } from "../shared/campaign/parts.ts";
import { campaignSystem, campaignWorld, installedSystemName, playersOfTheGame, systemSetting, valuesText } from "../shared/campaign/world.ts";
import { loadNewSystemCode } from "../shared/packages/code.ts";
import { checkWidgetSpots } from "../shared/packages/widgets.ts";
import { readOpenScene } from "../shared/scene/scene.ts";
import { campaignCalendar, newDatedLogEntry } from "../shared/time/time.ts";
import { customEntries, customOf } from "./custom-levels.ts";
import { checkAdditions, counterShape, entriesOf, formatValue, replacedEntries, yamlValue } from "./entries.ts";
import { offeredShown, shownValue, systemShownValue } from "./shown.ts";
import { styleSettingNames, wordsOf } from "./words.ts";

// A use whose maximum reads what gives it, in quotes for its commas (CAM-1).
const counterExample = 'bulwark-dice: {max: "4 * has(features, Bulwark)", refill: {{rest}}}';

export const config = defineCommand({
    name: "config",
    description: "Show or change the campaign settings. "
        + "Without a setting it shows them all and which are missing; with a setting alone, that one with what it is and its values; with a value it changes it. "
        + "Use it in the setup, for each setting status says is missing, and whenever the player changes one. "
        + "system is fixed once there is a player character. lines and veils change with add and remove, or value none when the player wants none. "
        + "effort and ruleset are the player's: change them only when they ask. "
        + "library: the player's own books, folders or files by their full path, added once to this computer with the player's yes in a window of their computer, "
        + "then turned on in each campaign with add and off with remove; remove with computer takes one off this computer. "
        + "precedents: each ruling you made without the text, the rule's name in the system's language first, such as 'Poisoned: …'. learned: the mechanics you explained, by name. "
        + "table: what you promised the player about how you play, in the words you said. "
        + 'coins, when the system gives none: each coin with its value in the smallest coin, other names after a slash, "rare" for one never given as change. '
        + "widgets: where the dashboard shows an extension's widget, such as value 'weather.today: side'; remove gives it back its place. "
        + "difficulty and rigor custom: each item at its own level, which custom-difficulty and custom-rigor take by item, such as value 'food: rules, load: smooth'; "
        + "custom starts from the level played until then, and remove gives an item the default. "
        + "fields, tables, computed, counters and recipes add to the game system what it lacks, or change it as a house rule: entries by name, written as in system.yaml, "
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

    run(given, context)
    {
        const input = { ...given, setting: given.setting?.trim() };

        if (input.computer !== undefined && (input.setting !== "library" || input.remove === undefined)) {
            throw new Error("computer goes only with setting library and remove: it takes those folders off this computer. Nothing changed.");
        }

        // What the library holds is checked, and an addition allowed by the player, before it is written (LIB-1).
        if (input.setting === "library" && (input.add !== undefined || input.remove !== undefined)) {
            return changeLibrary(input, context);
        }

        const result = configure(input, context);

        // A system installed in this chat, as in the setup, brings its code once the campaign plays it (D-513 (1)).
        return input.setting === "system" && input.value !== undefined ? loadNewSystemCode(context).then(() => result) : result;
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

    // A removal refused writes nothing: checked before an addition reaches this computer's library.
    if (input.remove !== undefined) {
        checkLibraryRemovals(root, context, input.remove, input.computer === true);
    }

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

    // One a value asks holds only with that value (DAT-17).
    if (own !== undefined && !heldSystemSettings(root, context).some((setting) => setting.name === own.name)) {
        throw new Error(`${own.name} holds only with ${askedBy(root, context, own.name)}: change that first, if the player wants it. Nothing changed.`);
    }

    // A setting the game system adds, with one of its values (DAT-10).
    if (own !== undefined) {
        return systemSettingResult(root, context, own, input);
    }

    if (input.setting !== undefined && !(settingNames as string[]).includes(input.setting.trim())) {
        const added = (campaignSystem(root, context)?.settings ?? []).map((setting) => setting.name);
        throw new Error(`There is no setting "${input.setting}". The settings are: ${[...settingNames, ...added].join(", ")}.`);
    }

    if (input.add !== undefined && input.setting !== undefined && entrySettingNames.includes(checkSettingName(input.setting))) {
        throw new Error(`"${input.setting}" takes entries by name as the value, such as setting counters, value '${counterShape}'; remove takes their names.`);
    }

    if (listChange && (input.setting === undefined || (input.value !== undefined && !entrySettingNames.includes(checkSettingName(input.setting))))) {
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
        return { settings: { effort: shownValue(root, context, readSettings(root), "effort") }, note: "", replaced: ["Taken away for Claude Code and Codex: from the next chat each keeps its own.", ...unwritten], part: "" };
    }

    if (input.setting?.trim() === "system" && input.value !== undefined) {
        checkSystemOpen(root, context, input.value);
    }

    // An engine's setting the game offers only some values of (DAT-16).
    const refused = input.setting === undefined || input.value === undefined ? undefined : offerRefusal(root, context, input.setting.trim(), input.value);

    if (refused !== undefined) {
        throw new Error(refused);
    }

    const shown = input.setting === undefined ? settingNames : [checkSettingName(input.setting)];
    const mapped = input.setting !== undefined && mapSettingNames.includes(checkSettingName(input.setting));
    let replaced: string[] = [];

    // A custom difficulty or rigor starts from the preset played until then, each item not yet written at its level (T-132).
    const leveledName = input.setting === "difficulty" || input.setting === "rigor" ? input.setting : undefined;
    const startsCustom = leveledName !== undefined && input.value?.trim().toLowerCase() === customLevel;
    const preset = leveledName === undefined ? undefined : (readSettings(root) as Record<string, unknown>)[leveledName];
    const custom = customOf(input.setting ?? "");

    // The items of a custom difficulty or rigor, each at a level it takes (T-132).
    if (custom !== undefined && (input.value !== undefined || input.remove !== undefined)) {
        const name = customSettings[custom];

        if (changeMapSetting(root, name, { set: input.value === undefined ? undefined : customEntries(custom, input.value), remove: input.remove })) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: name, value: input.value, remove: input.remove }));
        }

        // Kept for when it is chosen, but played only then.
        if (playedEngineSetting(root, context, custom) !== customLevel) {
            replaced = [...replaced, `${name} plays only while ${custom} is custom.`];
        }
    } else if (input.setting?.trim() === "widgets" && (input.value !== undefined || input.remove !== undefined)) {
        const set = input.value === undefined ? undefined : entriesOf("widgets", input.value);
        checkWidgetSpots(root, context, set ?? {});

        if (changeMapSetting(root, "widgets", { set, remove: input.remove })) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: "widgets", value: input.value, remove: input.remove }));
        }
    } else if (mapped && input.setting !== undefined && (input.value !== undefined || input.remove !== undefined)) {
        // What the campaign adds to its game system, checked with the system before it is written (CAM-1, CAM-3).
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
        // What the next campaign's setup suggests; a custom difficulty or rigor is this campaign's own (T-134).
        const chosen = (readSettings(root) as Record<string, unknown>)[input.setting];

        if (chosen !== customLevel) {
            rememberChoice(context.home, input.setting, chosen);
        }
    }

    if (startsCustom && leveledName !== undefined && readSettings(root)[leveledName] === customLevel) {
        const written = readSettings(root)[customSettings[leveledName]] ?? {};
        const unwritten = Object.entries(startingLevels(leveledName, preset)).filter(([item]) => !Object.hasOwn(written, item));

        if (unwritten.length > 0) {
            changeMapSetting(root, customSettings[leveledName], { set: Object.fromEntries(unwritten) });
        }
    }

    // The effort written where each app reads it in the campaign's folder (D-462).
    if (input.setting?.trim() === "effort" && input.value !== undefined) {
        const unwritten = writeEffortFiles(root, context.platform);
        const written = "Written for Claude Code and Codex: it applies from the next chat; in Codex only in a folder it trusts; an effort picked in the app for one chat wins there.";
        replaced = [...replaced, ...(unwritten.length === 0 ? [written] : unwritten)];
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

    // A setting asked alone comes with what it is and its values, which the description leaves to it (T-64).
    const about = input.setting !== undefined && input.value === undefined && !listChange ? settingDescription(checkSettingName(input.setting)) : undefined;

    if (about !== undefined) {
        replaced = [...replaced, `${checkSettingName(input.setting ?? "")}: ${about}.`];
    }

    const settings = readSettings(root);
    // Listed all together, what the campaign adds to its system only when it adds something.
    const added = (name: SettingName): boolean => (campaignDataNames as readonly string[]).includes(name);
    const listed = input.setting === undefined ? shown.filter((name) => !(added(name) || name === "calendar" || name === "widgets" || customOf(name) !== undefined) || settings[name] !== undefined) : shown;
    const system = input.setting === undefined ? heldSystemSettings(root, context) : [];
    // The master's own change of the mentor brings its part, once in the chat; the player's comes with the news of the dashboard (D-347).
    const changed = input.value !== undefined && context.actor !== "player" ? input.setting?.trim() : undefined;
    // And of how the master writes, the parts as they are now (D-395).
    const style = styleSettingNames.includes(changed ?? "") ? stylePart(root, context) : "";
    // And of the length, past the setup, how to size the adventures now (D-558); entering play gives it otherwise.
    const sized = changed === "length" && campaignMode(root, campaignWorld(root, context)) !== "setup";
    const length = !sized ? "" : settings.length === "open" ? "The campaign is open now: the adventures take the size the story asks, one after another." : lengthPart(root, context);
    // An author or the player's words taken away: what holds now, as the dashboard's news says it.
    const cleared = changed !== undefined && input.value?.trim().toLowerCase() === "none" ? wordsOf(changed)?.cleared : undefined;
    const part = changed === "mentor"
        ? mentorPart(root, context, settings.mentor)
        : [cleared === undefined ? "" : `${cleared.charAt(0).toUpperCase()}${cleared.slice(1)}.`, style, length].filter((text) => text !== "").join("\n\n");
    return {
        settings: {
            ...Object.fromEntries(listed.map((name) => [name, offeredShown(root, context, name, shownValue(root, context, settings, name))])),
            ...Object.fromEntries(system.map((setting) => [setting.name, systemShownValue(root, context, setting)])),
        },
        note: campaignNote(root, context, true),
        replaced,
        part,
    };
}

// The settings of free words the player may leave unset again, with the value none, and all those of how the master writes (D-395).
const freeSettingNames: SettingName[] = ["author", "style", "calendar"];

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

        const before = campaignSystem(root, context)?.version?.name;

        if (changeOtherSetting(root, setting.name, value.value)) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: setting.name, value: value.value }));
        }

        // Another version of the rules holds from the next read; what is written stays (VER-4).
        if (setting.name === rulesetSetting && before !== undefined && comparableText(before) !== comparableText(value.value)) {
            return {
                settings: { [setting.name]: systemShownValue(root, context, setting) },
                note: campaignNote(root, context, true),
                replaced: [`From now on the campaign plays the rules ${value.value}, in place of ${before}: the pages already written stay as they are.`, ...unofferedLines(root, context)],
            };
        }

        // The master's own change of a value brings its part, as the player's does with the dashboard's news (DAT-18).
        const part = context.actor === "player" || campaignMode(root, campaignWorld(root, context)) !== "play" ? undefined : valuePart(root, context, setting.name, value.value);
        return {
            settings: { [setting.name]: systemShownValue(root, context, setting) },
            note: campaignNote(root, context, true),
            replaced: unofferedLines(root, context),
            ...(part === undefined ? {} : { part }),
        };
    }

    return { settings: { [setting.name]: systemShownValue(root, context, setting) }, note: campaignNote(root, context, true), replaced: [] };
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

    // The game time between sessions (D-133): it stops, or runs at a rate of game time to real time.
    if (setting === "between-sessions") {
        if (readBetweenSessions(value) === undefined) {
            throw new Error(`"${value}" is no between-sessions: give stops, or the game time that passes for a real time, such as 1d per 7d. Nothing changed.`);
        }

        return value.trim().replace(/\s+/g, " ");
    }

    return setting === "coins" ? newCoins(root, value, context) : setting === "system" ? installedSystemName(value, context, "config") : value;
}

/**
 * The system stays once the campaign has a player character, whose sheet is written in it, whatever the mode (D-519): another installed one, or none, is
 * refused, with a new campaign as the way; the same one, by any case, is no change.
 */
function checkSystemOpen(root: string, context: Context, value: string): void
{
    const current = readTextSetting(root, "system");
    // A name that is no installed system is said as such first; none takes the system away.
    const asked = value.trim().toLowerCase() === "none" ? value : installedSystemName(value, context, "config");

    if (current === undefined || comparableText(current) === comparableText(asked)) {
        return;
    }

    const players = playersOfTheGame(root, context);

    if (players.length > 0) {
        const name = readSettings(root).name;
        throw new Error(
            `The system of ${name} is ${current}, and the game has begun with ${players.join(", ")}: a campaign keeps its system. To play another, start a new campaign with init. Nothing changed.`,
        );
    }
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
