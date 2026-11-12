// What the master hears of a setting the player changed on the dashboard
import { itemMeaning, readSettings, settingMeaning } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { formatDuration, readBetweenSessions } from "../../time/index.ts";
import { campaignMode } from "../shared/campaign/mode.ts";
import { unofferedLines, valuePart } from "../shared/campaign/offers.ts";
import { mentorPart, stylePart } from "../shared/campaign/parts.ts";
import { campaignSystem, campaignWorld, countedByGame, systemSetting } from "../shared/campaign/world.ts";
import { customOf, customWritten } from "./custom-levels.ts";
import type { PlayerSetting } from "./dashboard.ts";
import { styleSettingNames, wordsOf } from "./words.ts";

/**
 * What the master hears, at the head of their next call, of a setting the player changed on the dashboard (D-341): how it is now against how it was before the
 * player's first change since their last call, a value with what it means to the master; nothing for one that came back as it was.
 */
export function playerChangeNews(root: string, context: Context, before: PlayerSetting, after: PlayerSetting): string[]
{
    if (before.entries !== undefined || after.entries !== undefined) {
        return customNews(root, context, before, after);
    }

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

    const meaning = settingMeaning(after.name, after.value, countedByGame(campaignSystem(root, context)), customWritten(root, after.name))
        ?? (after.name === "between-sessions" ? betweenSessionsMeaning(after.value) : undefined)
        ?? systemSetting(root, context, after.name)?.values.find((one) => one.value === after.value)?.means;
    const value = after.most === undefined ? after.value : `"${after.value}"`;
    const author = after.name === "prose" && readSettings(root).author !== undefined ? " An author is written: theirs takes its place until the player takes it away." : "";
    // The mentor's new part comes with it, once in the chat (D-347); in play, a value of the system's with its own part (DAT-18).
    const own = systemSetting(root, context, after.name) === undefined || campaignMode(root, campaignWorld(root, context)) !== "play" ? undefined : valuePart(root, context, after.name, after.value);
    const part = after.name === "mentor" ? mentorPart(root, context, after.value) : (own ?? "");
    return [
        `The player set ${after.name} to ${value} on the dashboard${meaning === undefined ? "" : `: ${meaning}`}. Play by it from now on.${author}${part === "" ? "" : `\n\n${part}`}`,
        ...unofferedLines(root, context),
        ...(style === "" ? [] : [style]),
    ];
}

/** What the master hears of the items of a custom difficulty or rigor the player changed on the dashboard: those changed, then the whole as it plays now. */
function customNews(root: string, context: Context, before: PlayerSetting, after: PlayerSetting): string[]
{
    const setting = customOf(after.name);
    const changed = (after.entries ?? []).filter((entry) => before.entries?.find((one) => one.name === entry.name)?.value !== entry.value);

    if (setting === undefined || changed.length === 0) {
        return [];
    }

    // Each item changed with what it means now: the whole custom one is in status, and comes with the news when the player chose it.
    const counted = countedByGame(campaignSystem(root, context));
    const set = changed.map((entry) => `${entry.name} to ${entry.value} (${itemMeaning(setting, entry.name, entry.value, counted) ?? entry.value})`).join("; ");
    return [`The player set in the custom ${setting} on the dashboard ${set}. Play by it from now on.`];
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

/** What the game time between sessions means to the master (D-133): stopped, or a rate with what status asks of them after a pause; undefined for what does not read. */
function betweenSessionsMeaning(value: string): string | undefined
{
    const read = readBetweenSessions(value);

    if (read === "stops") {
        return "no game time passes between sessions: the next one opens at the moment this one ends";
    }

    return read === undefined
        ? undefined
        : `the game time runs ${formatDuration(read.game)} for each ${formatDuration(read.real)} of real time between sessions: after a pause, status says how much to let pass with advance `
            + "before you open the new session, and the opening tells what the world did meanwhile";
}
