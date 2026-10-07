import { join } from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import {
    type CampaignSettings,
    changeListSetting,
    changeMapSetting,
    changeSetting,
    checkSettingName,
    listSettingNames,
    mapSettingNames,
    missingSettings,
    readCampaignData,
    readSettings,
    readTextSetting,
    requireCampaign,
    type SettingName,
    settingNames,
} from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { getVersion } from "../core/version.ts";
import { readYamlValues } from "../core/yaml-file.ts";
import { coinList, readAmount, readCoins } from "../money/index.ts";
import { declaredKind } from "../pages/index.ts";
import { campaignDataNames, findCampaignSystem, findSystem, installedSystems, systemFileName } from "../systems/index.ts";
import { campaignCoins, coinsShown } from "./game-money.ts";
import { readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld, installedSystemName, missingWithSystems } from "./game-world.ts";
import { missingSettingsNote } from "./notes.ts";

// A use whose maximum reads what gives it, in quotes for its commas (CAM-1).
const counterExample = 'superiority-dice: {max: "4 * has(features, Combat Superiority)", refill: short rest}';

export const config = defineCommand({
    name: "config",
    description: "Show or change the campaign settings. "
        + "Without a setting it shows them all and says which are still missing; with a setting and a value it changes that one. "
        + "Use it at the start of a campaign, to learn what to ask the player, and whenever the player changes a setting. "
        + "system is one of the game systems installed: config lists them while it is missing. "
        + "difficulty (story, easy, normal, hard, brutal) is how hard the world plays; lethality what a fall means: narrative (the character never dies), epic (only when it matters) or dice (the dice decide). "
        + "lines (what never appears in the game) and veils (what happens only off screen) are lists, changed with add and remove: when the player signals stop, add that content to lines. "
        + "table is a list too: what you promise the player about how you play, in the words you said. "
        + "precedents too: each ruling you made without the text, starting with the name of the rule in the system's language, then what you said, such as 'Poisoned: …'. "
        + 'coins, for a game with money whose system does not give them, lists each coin with its value in the smallest coin, with other names after a slash and "rare" for a coin never given as change; the first is the one totals are counted in. '
        + "fields, tables, computed, counters and recipes add to the game system what it lacks, or change it as a house rule: the value gives entries by name, written as in system.yaml, "
        + "each taking the place of one with that name (a recipe adds to the system's); remove takes their names. status-line adds fields to the line of the player character. "
        + "A formula with commas goes in quotes; a use's max reads what gives it, so that only who has it has it. "
        + `Example: setting language, value it; or setting lines, add "spiders"; or setting counters, value '${counterExample}'.`,
    group: "campaign",
    positionals: ["setting", "value"],
    input: z.object({
        setting: z.string().optional().describe(`setting to show or change: ${settingNames.join(", ")}`),
        value: z.string().optional().describe("new value of the setting"),
        add: z.array(z.string()).optional().describe(`items to add to a list setting (${listSettingNames.join(", ")}), repeatable`),
        remove: z.array(z.string()).optional().describe(`items to remove from a list setting (${listSettingNames.join(", ")}), repeatable`),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const listChange = input.add !== undefined || input.remove !== undefined;

        if (input.add !== undefined && input.setting !== undefined && mapSettingNames.includes(checkSettingName(input.setting))) {
            throw new Error(`"${input.setting}" takes entries by name as the value, such as setting counters, value '${counterExample}'; remove takes their names.`);
        }

        if (listChange && (input.setting === undefined || (input.value !== undefined && !mapSettingNames.includes(checkSettingName(input.setting))))) {
            throw new Error('Give add or remove with a list setting and no value, such as setting lines, add "spiders".');
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
        } else if (input.setting !== undefined && input.value !== undefined && changeSetting(root, input.setting, settingValue(root, input.setting, input.value, context))) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, value: input.value }));
        }

        const settings = readSettings(root);
        // Listed all together, what the campaign adds to its system only when it adds something.
        const added = (name: SettingName): boolean => (campaignDataNames as readonly string[]).includes(name);
        const listed = input.setting === undefined ? shown.filter((name) => !added(name) || settings[name] !== undefined) : shown;
        return {
            settings: Object.fromEntries(listed.map((name) => [name, shownValue(root, context, settings, name)])),
            missing: missingWithSystems(missingSettings(settings), context),
            replaced,
        };
    },

    format(result)
    {
        const lines = Object.entries(result.settings).map(([name, value]) => `${name}: ${formatValue(value)}`);
        return [[...lines, ...result.replaced].join("\n"), missingSettingsNote(result.missing)].filter((block) => block !== "").join("\n\n");
    },
});

/** A setting as config shows it: a list or entries by name, none when missing; the coins and the system as they read (MON-7, D-173). */
function shownValue(root: string, context: Context, settings: CampaignSettings, name: SettingName): unknown
{
    if (listSettingNames.includes(name)) {
        return settings[name] ?? [];
    }

    if (mapSettingNames.includes(name)) {
        return settings[name] ?? {};
    }

    return name === "coins" ? coinsShown(root, context) : name === "system" ? systemShown(settings.system, context) : settings[name];
}

/** A setting's value as config writes it: an installed system by the name it is installed under (D-167), the coins read and checked (MON-1), anything else as given. */
function settingValue(root: string, setting: string, value: string, context: Context): unknown
{
    return setting === "coins" ? newCoins(root, value, context) : setting === "system" ? installedSystemName(value, context, "config") : value;
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

/** The entries given to a setting that holds them, read as YAML, such as "superiority-dice: {max: 4, refill: short rest}" (CAM-1). */
function entriesOf(setting: string, text: string): Record<string, unknown>
{
    let value: unknown;

    try {
        value = parse(text);
    } catch (error) {
        throw new Error(`"${text}" does not read: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}. Write the entries as in system.yaml, such as name: value. Nothing changed.`);
    }

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${setting} takes entries by name, written as in system.yaml, such as ${setting === "counters" ? `'${counterExample}'` : '"name: value"'}. Nothing changed.`);
    }

    return value as Record<string, unknown>;
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
