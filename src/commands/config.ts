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
    diceWays,
    difficulties,
    lethalities,
    listSettingNames,
    mapSettingNames,
    missingSettings,
    pictureWays,
    readCampaignData,
    readSettings,
    readTextSetting,
    requireCampaign,
    rigors,
    saveModes,
    settingMeaning,
    type SettingName,
    settingNames,
    setupSettingNames,
    unitSystems,
} from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { getVersion } from "../core/version.ts";
import { readYamlValues } from "../core/yaml-file.ts";
import { coinList, readAmount, readCoins } from "../money/index.ts";
import { declaredKind } from "../pages/index.ts";
import { campaignDataNames, findCampaignSystem, findSystem, installedSystems, systemFileName, type SystemSetting } from "../systems/index.ts";
import { campaignNote } from "./game-mode.ts";
import { campaignCoins, coinsShown } from "./game-money.ts";
import { readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem, campaignWorld, installedSystemName, missingWithSystems, systemSetting, systemSettingValue, valuesText } from "./game-world.ts";
import { missingSettingsNote } from "./notes.ts";

// A use whose maximum reads what gives it, in quotes for its commas (CAM-1).
const counterExample = 'superiority-dice: {max: "4 * has(features, Combat Superiority)", refill: short rest}';

export const config = defineCommand({
    name: "config",
    description: "Show or change the campaign settings. "
        + "Without a setting it shows them all and says which are still missing; with a setting and a value it changes that one. "
        + "Use it at the start of a campaign, to learn what to ask the player, and whenever the player changes a setting. "
        + "system is one of the game systems installed: config lists them while it is missing. "
        + "difficulty (story, easy, normal, hard, brutal) is how hard the world plays; lethality what a fall means: narrative (the character never dies), epic (only when it matters) or dice (the dice decide); "
        + "saves when the game may go back: permadeath (never), checkpoint (to the last end of a scene, once the player character dies) or free (to any save, and saves when the player asks). "
        + "rigor is how closely travel, fatigue, food, spell components and the like follow the rules: smooth (you gloss over them), rules (as written) or simulation (beyond them); "
        + "dice who rolls the player character's dice: digital (rpg) or physical (the player, who tells you the values); units metric or imperial; "
        + "companions how they come: none, made with the player or made by you in session zero, or met in play. "
        + "premise (the genre, the tone and a few elements of the world, in the player's words) and preparation (on the fly or all at the start) are for a campaign without a written world. "
        + "lines (what never appears in the game) and veils (what happens only off screen) are lists, changed with add and remove, and value none when the player wants none: when the player signals stop, add that content to lines. "
        + "table is a list too: what you promise the player about how you play, in the words you said. "
        + "precedents too: each ruling you made without the text, starting with the name of the rule in the system's language, then what you said, such as 'Poisoned: …'. "
        + 'coins, for a game with money whose system does not give them, lists each coin with its value in the smallest coin, with other names after a slash and "rare" for a coin never given as change; the first is the one totals are counted in. '
        + "The game system may add settings of its own, such as advancement for 5e: config lists them with what each value means. "
        + "fields, tables, computed, counters and recipes add to the game system what it lacks, or change it as a house rule: the value gives entries by name, written as in system.yaml, "
        + "each taking the place of one with that name (a recipe adds to the system's); remove takes their names. status-line adds fields to the line of the player character. "
        + "A formula with commas goes in quotes; a use's max reads what gives it, so that only who has it has it. "
        + `Example: setting language, value it; or setting lines, add "spiders"; or setting counters, value '${counterExample}'.`,
    group: "campaign",
    positionals: ["setting", "value"],
    input: z.object({
        setting: z.string().optional().describe(`setting to show or change: ${settingNames.join(", ")}, or one the game system adds`),
        value: z.string().optional().describe("new value of the setting"),
        add: z.array(z.string()).optional().describe(`items to add to a list setting (${listSettingNames.join(", ")}), repeatable`),
        remove: z.array(z.string()).optional().describe(`items to remove from a list setting (${listSettingNames.join(", ")}), repeatable`),
    }),

    run(input, context)
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
        } else if (input.setting !== undefined && input.value !== undefined && changeSetting(root, input.setting, settingValue(root, input.setting, input.value, context))) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting: input.setting, value: input.value }));
        }

        const settings = readSettings(root);
        // Listed all together, what the campaign adds to its system only when it adds something.
        const added = (name: SettingName): boolean => (campaignDataNames as readonly string[]).includes(name);
        const listed = input.setting === undefined ? shown.filter((name) => !added(name) || settings[name] !== undefined) : shown;
        const system = input.setting === undefined ? (campaignSystem(root, context)?.settings ?? []) : [];
        return {
            settings: { ...Object.fromEntries(listed.map((name) => [name, shownValue(root, context, settings, name)])), ...Object.fromEntries(system.map((setting) => [setting.name, systemShownValue(root, setting)])) },
            note: campaignNote(root, context),
            replaced,
        };
    },

    format(result)
    {
        const lines = Object.entries(result.settings).map(([name, value]) => `${name}: ${formatValue(value)}`);
        return [[...lines, ...result.replaced].join("\n"), result.note].filter((block) => block !== "").join("\n\n");
    },
});

/** The settings the player changes on the dashboard (D-341): how the game plays for them; the master's own, as house rules, coins and precedents, stay in the chat. */
export const playerSettingNames = ["difficulty", "lethality", "saves", "rigor", "dice", "units", "pictures", "lines", "veils", "language"] as const;

/** A setting of the player's as the dashboard shows it (D-341): what it is, its value or a list's items, and its values with what each means to the player. */
export interface PlayerSetting
{
    name: string;
    about: string;
    value?: string;
    items?: string[];
    choices?: { value: string; means?: string; }[];
    /** What the player should know of it on this computer, as whether pictures can be made here; fix when it says how to have what is missing. */
    note?: { text: string; fix?: true; };
}

// What each of the player's settings is, and what its values mean to the player, in their words rather than the master's.
const playerWords: Record<(typeof playerSettingNames)[number], { about: string; means?: Record<string, string>; values?: readonly string[]; }> = {
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
        means: { permadeath: "never: what happens stays", checkpoint: "if your character dies: back to the end of the last scene", free: "back to any save, and a save whenever you ask" },
    },
    rigor: {
        about: "how closely food, light, fatigue, spell components and the like follow the rules",
        values: rigors,
        means: {
            smooth: "only when the story turns on them",
            rules: "as written: food and water each day, light as it burns, fatigue and encumbrance",
            simulation: "as written, and beyond: wear, spoilage, weather",
        },
    },
    dice: { about: "who rolls your character's dice", values: diceWays, means: { digital: "the engine rolls them", physical: "you roll your own and tell the values" } },
    units: { about: "the units of the story", values: unitSystems, means: { metric: "metres and kilometres", imperial: "feet and miles" } },
    pictures: { about: "the pictures of places, made on this computer", values: pictureWays, means: { none: "no pictures", "on request": "those you ask for", "new places": "one for each new place" } },
    lines: { about: "what never appears in the game" },
    veils: { about: "what happens only off screen, without details" },
    language: { about: "the game's language, as a code such as it or en" },
};

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
        return { name: setting.name, about: "a setting of the game system", ...(value === undefined ? {} : { value }), choices };
    });
    return [
        ...playerSettingNames.map((name): PlayerSetting => {
            const words = playerWords[name];
            const value = settings[name];
            const choices = words.values?.map((one) => ({ value: one, ...(words.means?.[one] === undefined ? {} : { means: words.means[one] }) }));
            return {
                name,
                about: words.about,
                ...(Array.isArray(value) ? { items: value.map(String) } : value === undefined || value === null ? {} : { value: String(value) }),
                ...(choices === undefined ? {} : { choices }),
            };
        }),
        ...own,
    ];
}

/** Whether this computer makes pictures, in the player's words (D-308): Codex logged in, or why not and how to have them; nothing where no maker is asked. */
function picturesReadyNote(context: Context): Pick<PlayerSetting, "note">
{
    const ready = context.pictures?.ready(true);
    return ready === undefined
        ? {}
        : { note: ready.ready ? { text: "Codex makes them on this computer, from your ChatGPT plan." } : { text: ready.fix ?? `${ready.why}.`, fix: true } };
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
            ...(added.length === 0 ? [] : [`The player added ${quotedItems(added)} to ${after.name} on the dashboard: ${after.about}.`]),
            ...(removed.length === 0 ? [] : [`The player took ${quotedItems(removed)} off ${after.name} on the dashboard.`]),
        ];
    }

    if (after.value === before.value || after.value === undefined) {
        return [];
    }

    const meaning = settingMeaning(after.name, after.value) ?? systemSetting(root, context, after.name)?.values.find((one) => one.value === after.value)?.means;
    return [`The player set ${after.name} to ${after.value} on the dashboard${meaning === undefined ? "" : `: ${meaning}`}. Play by it from now on.`];
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
): { settings: Record<string, unknown>; note: string; replaced: string[]; }
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
    const meaning = settingMeaning(name, settings[name]);

    if (meaning !== undefined) {
        return `${String(settings[name])}: ${meaning}`;
    }

    // Lines and veils not yet answered are missing: [] is the answer none (MOD-3).
    if (listSettingNames.includes(name)) {
        return settings[name] ?? (setupSettingNames.includes(name) ? undefined : []);
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
