import { join } from "node:path";
import { type Document, isScalar, isSeq, type YAMLSeq } from "yaml";
import { z } from "zod";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { readYamlFile, readYamlValues, writeYamlFile } from "../core/yaml-file.ts";
import { campaignFileName } from "./find-campaign.ts";

const settingsHold = 'settings, such as "name: ..."';

/** How hard the world plays (D-13, D-141). */
export const difficulties = ["story", "easy", "normal", "hard", "brutal"] as const;

/** What a fall means (D-13, D-141): the character never dies, dies only when it matters, or as the dice say. */
export const lethalities = ["narrative", "epic", "dice"] as const;

/** The settings of a campaign, kept in campaign.yaml. Other keys are kept: systems and extensions will add their own. */
export const settingsSchema = z.object({
    name: z.string().min(1).describe("name of the campaign"),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "use a language code such as it, en or pt-BR").optional().describe("language of the game, as a code such as it or en"),
    system: z.string().min(1).optional().describe("game system of the campaign, such as 5e"),
    difficulty: z.enum(difficulties).optional().describe(`how hard the world plays: ${difficulties.join(", ")}`),
    lethality: z.enum(lethalities).optional().describe("what a fall means: narrative (the character never dies), epic (only when it matters) or dice (the dice decide)"),
    lines: z.array(z.string().min(1)).nullish().describe("what never appears in the game"),
    veils: z.array(z.string().min(1)).nullish().describe("what happens only off screen, without details"),
    table: z.array(z.string().min(1)).nullish().describe("the table's agreements: what the master promised about how the game is played, and the precedents declared"),
    // Checked by the money module (MON-1): coins written wrongly by hand must not stop the other settings from being read.
    coins: z.unknown().optional().describe("the coins, for a game with money: each with its value in the smallest coin, such as gp 100, sp 10, cp 1"),
}).loose();

export type CampaignSettings = z.infer<typeof settingsSchema>;
export type SettingName = keyof typeof settingsSchema.shape;

/** The settings that the config command shows and changes. */
export const settingNames = Object.keys(settingsSchema.shape) as SettingName[];

/** The settings that hold a list, changed one item at a time; none of them is ever missing. */
export const listSettingNames: SettingName[] = ["lines", "veils", "table"];

// Settings that only some games have: never asked for when missing.
const optionalSettingNames: SettingName[] = ["coins"];

export function readSettings(root: string): CampaignSettings
{
    return validateSettings(readYamlValues(join(root, campaignFileName), settingsHold));
}

/** The coins as campaign.yaml writes them, unchecked and read on their own, so that a mistake in another setting does not hide them; the money module checks them (MON-1). */
export function readCoinsSetting(root: string): unknown
{
    const values = readYamlValues(join(root, campaignFileName), settingsHold);
    return values !== null && typeof values === "object" ? (values as Record<string, unknown>).coins : undefined;
}

/**
 * Changes one setting and keeps the rest of campaign.yaml, comments included, as it is. Nothing is written if the setting already has that value, or if the settings would not be valid.
 * Returns whether it changed. The value is text, or for coins the list already read.
 */
export function changeSetting(root: string, name: string, value: unknown): boolean
{
    const setting = checkSettingName(name);

    if (listSettingNames.includes(setting)) {
        throw new Error(`"${setting}" is a list: change it one item at a time with add and remove.`);
    }

    const parsed = settingsSchema.shape[setting].safeParse(value);

    if (!parsed.success) {
        throw new Error(`"${String(value)}" is not a valid ${setting}:\n${z.prettifyError(parsed.error)}`);
    }

    const document = readSettingsDocument(root);

    if (JSON.stringify((document.toJS() as Record<string, unknown> | null)?.[setting]) === JSON.stringify(parsed.data)) {
        return false;
    }

    document.set(setting, parsed.data);
    saveSettings(root, document);
    return true;
}

/** Adds items to a list setting, or removes them, keeping the rest of campaign.yaml as it is. Returns whether it changed. */
export function changeListSetting(root: string, name: string, change: { add?: string[]; remove?: string[]; }): boolean
{
    const setting = checkSettingName(name);

    if (!listSettingNames.includes(setting)) {
        throw new Error(`"${setting}" holds one value: give the new value instead of add or remove.`);
    }

    if ([...(change.add ?? []), ...(change.remove ?? [])].some((item) => item.trim() === "")) {
        throw new Error("Give the text of each item to add or remove.");
    }

    const document = readSettingsDocument(root);
    const list = listNode(document, setting);
    const before = JSON.stringify(list.toJSON());
    const items = (): string[] => list.items.map((node) => String(isScalar(node) ? node.value : node));

    for (const item of change.remove ?? []) {
        const index = items().findIndex((other) => sameText(other, item));

        if (index === -1) {
            throw new Error(`"${setting}" does not hold "${item}". It holds: ${items().length > 0 ? items().join("; ") : "nothing"}.`);
        }

        list.items.splice(index, 1);
    }

    for (const item of change.add ?? []) {
        if (!items().some((other) => sameText(other, item))) {
            list.add(document.createNode(item.trim().normalize("NFC")));
        }
    }

    if (JSON.stringify(list.toJSON()) === before) {
        return false;
    }

    if (list.items.length === 0) {
        document.delete(setting);
    }

    saveSettings(root, document);
    return true;
}

/** What is wrong in campaign.yaml, one problem for each setting, with how to fix it. */
export function checkSettings(root: string): Problem[]
{
    const fix = "fix campaign.yaml by hand (a list is written as [item, item]), or set a single value with the config command";
    let values: unknown;

    try {
        values = readYamlValues(join(root, campaignFileName), settingsHold);
    } catch (error) {
        return [{ path: campaignFileName, message: error instanceof Error ? error.message : String(error) }];
    }

    const parsed = settingsSchema.safeParse(values);
    return parsed.success ? [] : parsed.error.issues.map((issue) => ({ path: campaignFileName, message: `${issue.path.join(".") || "the settings"}: ${issue.message}.`, fix }));
}

/** The settings that are still missing: the AI asks the player for them. */
export function missingSettings(settings: CampaignSettings): SettingName[]
{
    return settingNames.filter((name) => !listSettingNames.includes(name) && !optionalSettingNames.includes(name) && settings[name] === undefined);
}

export function checkSettingName(name: string): SettingName
{
    if (!(settingNames as string[]).includes(name)) {
        throw new Error(`There is no setting "${name}". The settings are: ${settingNames.join(", ")}.`);
    }

    return name as SettingName;
}

/** The YAML list of a list setting, edited in place so that its comments stay; created when missing. */
function listNode(document: Document, setting: SettingName): YAMLSeq
{
    const node = document.get(setting, true);

    if (node === undefined || node === null || (isScalar(node) && node.value === null)) {
        const list = document.createNode([]) as YAMLSeq;
        document.set(setting, list);
        return list;
    }

    if (!isSeq(node) || !node.items.every((item) => isScalar(item) && typeof item.value === "string")) {
        throw new Error(`"${setting}" in ${campaignFileName} is not a list of text; write it by hand as ${setting}: [item, item].`);
    }

    return node;
}

/** Writes campaign.yaml, if the settings are still valid; long values stay on one line. */
function saveSettings(root: string, document: Document): void
{
    validateSettings(document.toJS());
    writeYamlFile(join(root, campaignFileName), document);
}

/** The same item of a list setting, ignoring case, accents written either way and the spaces around it. */
function sameText(one: string, other: string): boolean
{
    return comparableText(one.trim()) === comparableText(other.trim());
}

function validateSettings(values: unknown): CampaignSettings
{
    const parsed = settingsSchema.safeParse(values);

    if (!parsed.success) {
        throw new Error(`${campaignFileName} is not valid:\n${z.prettifyError(parsed.error)}\nFix it by hand (a list is written as [item, item]); a single value can also be set with the config command.`);
    }

    return parsed.data;
}

function readSettingsDocument(root: string): Document
{
    return readYamlFile(join(root, campaignFileName), settingsHold);
}
