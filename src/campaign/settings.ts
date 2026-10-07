import { join } from "node:path";
import { type Document, isMap, isScalar, isSeq, parseDocument, type YAMLSeq } from "yaml";
import { z } from "zod";
import type { Problem } from "../core/problem.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { readYamlFile, readYamlValues, writeYamlFile } from "../core/yaml-file.ts";
import { campaignFileName } from "./find-campaign.ts";

const settingsHold = 'settings, such as "name: ..."';

/** How hard the world plays (D-13, D-141). */
export const difficulties = ["story", "easy", "normal", "hard", "brutal"] as const;

/** What a fall means (D-13, D-141): the character never dies, dies only when it matters, or as the dice say. */
export const lethalities = ["narrative", "epic", "dice"] as const;

/** An item of a list setting. Written by hand without quotes, "Poisoned: la benda…" is YAML for a pair: it is read as the text it was meant to be (D-179). */
const listItem = z.preprocess((item) => pairText(item) ?? item, z.string().min(1));

/** The settings of a campaign, kept in campaign.yaml. Other keys are kept: systems and extensions will add their own. */
export const settingsSchema = z.object({
    name: z.string().min(1).describe("name of the campaign"),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "use a language code such as it, en or pt-BR").optional().describe("language of the game, as a code such as it or en"),
    system: z.string().min(1).optional().describe("game system of the campaign: one of those installed, such as 5e"),
    difficulty: z.enum(difficulties).optional().describe(`how hard the world plays: ${difficulties.join(", ")}`),
    lethality: z.enum(lethalities).optional().describe("what a fall means: narrative (the character never dies), epic (only when it matters) or dice (the dice decide)"),
    lines: z.array(listItem).nullish().describe("what never appears in the game"),
    veils: z.array(listItem).nullish().describe("what happens only off screen, without details"),
    table: z.array(listItem).nullish().describe("the table's agreements: what the master promised about how the game is played"),
    precedents: z.array(listItem).nullish().describe("the rulings made without the text, each starting with the name of the rule in the system's language: Poisoned: …"),
    // Checked by the money module (MON-1): coins written wrongly by hand must not stop the other settings from being read.
    coins: z.unknown().optional().describe("the coins, for a game with money: each with its value in the smallest coin, such as gp 100, sp 10, cp 1"),
    // What the campaign adds to its game system (CAM-1): checked by the systems module when it reads the system with them, so that a mistake there never hides the
    // other settings.
    fields: z.unknown().optional().describe("fields the campaign adds to its game system, by name with their kind, such as portent: rolls"),
    tables: z.unknown().optional().describe("tables the campaign adds to its game system, by name, such as superiority-dice-by-level: {3: 4, 7: 5, 15: 6}"),
    computed: z.unknown().optional().describe("formulas the campaign adds to its game system or puts in place of its own, as a house rule, by field"),
    counters: z.unknown().optional().describe("counters the campaign adds to its game system or changes: their limits and what comes back with a rest, by name"),
    recipes: z.unknown().optional().describe("what the campaign adds to the rests of its game system, by recipe, such as short rest: {set: {superiority-dice: max}}"),
    "status-line": z.unknown().optional().describe("fields the campaign adds to the line of the player character and the companions, such as portent?"),
}).loose();

export type CampaignSettings = z.infer<typeof settingsSchema>;
export type SettingName = keyof typeof settingsSchema.shape;

/** The settings that the config command shows and changes. */
export const settingNames = Object.keys(settingsSchema.shape) as SettingName[];

/** The settings that hold a list, changed one item at a time; none of them is ever missing. */
export const listSettingNames: SettingName[] = ["lines", "veils", "table", "precedents", "status-line"];

/** The settings that hold entries by name, what the campaign adds to its game system (CAM-1): given or removed one entry at a time. */
export const mapSettingNames: SettingName[] = ["fields", "tables", "computed", "counters", "recipes"];

// Settings that only some games have: never asked for when missing.
const optionalSettingNames: SettingName[] = ["coins", ...mapSettingNames];

export function readSettings(root: string): CampaignSettings
{
    return validateSettings(readYamlValues(join(root, campaignFileName), settingsHold));
}

/** The coins as campaign.yaml writes them, unchecked and read on their own, so that a mistake in another setting does not hide them; the money module checks them (MON-1). */
export function readCoinsSetting(root: string): unknown
{
    return readOneSetting(root, "coins");
}

/**
 * A text setting as campaign.yaml writes it, such as the system or the language, read even when another setting breaks the file: YAML still gives the keys it can (SYS-1).
 * Undefined when it is missing, not text, or the file cannot be read.
 */
export function readTextSetting(root: string, name: string): string | undefined
{
    try {
        const value: unknown = parseDocument(files().text(join(root, campaignFileName)) ?? "").get(name);
        return typeof value === "string" ? value : undefined;
    } catch {
        return undefined;
    }
}

/** A list setting as campaign.yaml writes it, read even when another setting breaks the file, as the system is (SYS-1): what rules reads. Empty when it cannot be read. */
export function readListSetting(root: string, name: SettingName): string[]
{
    try {
        const value: unknown = parseDocument(files().text(join(root, campaignFileName)) ?? "").toJS()?.[name];
        return Array.isArray(value) ? value.map((item: unknown) => pairText(item) ?? item).filter((item): item is string => typeof item === "string" && item.trim() !== "") : [];
    } catch {
        return [];
    }
}

export function readOneSetting(root: string, name: string): unknown
{
    const values = readYamlValues(join(root, campaignFileName), settingsHold);
    return values !== null && typeof values === "object" ? (values as Record<string, unknown>)[name] : undefined;
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

/**
 * Writes a setting that is not the campaign's own but one a game system adds (DAT-10), as text, keeping the rest of campaign.yaml as it is; its value is checked by
 * who knows the system. Returns whether it changed.
 */
export function changeOtherSetting(root: string, name: string, value: string): boolean
{
    if ((settingNames as string[]).some((setting) => comparableText(setting) === comparableText(name))) {
        throw new Error(`${name} is a setting of the campaign: change it as one.`);
    }

    const document = readSettingsDocument(root);

    if ((document.toJS() as Record<string, unknown> | null)?.[name] === value) {
        return false;
    }

    document.set(name, value);
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

    const held = items();
    const missing = (change.remove ?? []).find((item) => !held.some((other) => sameText(other, item)));

    if (missing !== undefined) {
        throw new Error(`"${setting}" does not hold "${missing}", so nothing changed. It holds: ${held.length > 0 ? held.join("; ") : "nothing"}.`);
    }

    list.items = list.items.filter((_, index) => !(change.remove ?? []).some((item) => sameText(held[index], item)));

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

/** What campaign.yaml adds to the game system, as it writes it, read even when another setting breaks the file (CAM-1); empty when it cannot be read. */
export function readCampaignData(root: string): Record<string, unknown>
{
    try {
        const values: unknown = parseDocument(files().text(join(root, campaignFileName)) ?? "").toJS();
        const names: string[] = [...mapSettingNames, "status-line"];
        return values !== null && typeof values === "object" ? Object.fromEntries(Object.entries(values).filter(([name]) => names.includes(name))) : {};
    } catch {
        return {};
    }
}

/**
 * Gives entries by name to a setting that holds them, such as counters, each in place of one with that name, or removes entries by name (CAM-1); keeps the
 * rest of campaign.yaml as it is. Returns whether it changed.
 */
export function changeMapSetting(root: string, name: string, change: { set?: Record<string, unknown>; remove?: string[]; }): boolean
{
    const setting = checkSettingName(name);

    if (!mapSettingNames.includes(setting)) {
        throw new Error(`"${setting}" holds no entries by name: ${listSettingNames.includes(setting) ? "change it with add and remove" : "give the new value"}.`);
    }

    const document = readSettingsDocument(root);
    const held = document.get(setting);
    const before = (held !== null && typeof held === "object" && "toJSON" in held ? (held as { toJSON(): unknown; }).toJSON() : held) ?? {};

    if (typeof before !== "object" || Array.isArray(before)) {
        throw new Error(`"${setting}" in ${campaignFileName} is not entries by name; write it by hand as ${setting}: {name: value}.`);
    }

    const entries = { ...(before as Record<string, unknown>) };
    const named = (wanted: string): string | undefined => Object.keys(entries).find((key) => sameText(key, wanted));
    const missing = (change.remove ?? []).find((item) => named(item) === undefined);

    if (missing !== undefined) {
        const keys = Object.keys(entries);
        throw new Error(`"${setting}" has no entry "${missing}", so nothing changed. It has: ${keys.length > 0 ? keys.join(", ") : "none"}.`);
    }

    for (const item of change.remove ?? []) {
        delete entries[named(item) as string];
    }

    for (const [key, value] of Object.entries(change.set ?? {})) {
        delete entries[named(key) ?? key];
        entries[key] = value;
    }

    if (JSON.stringify(entries) === JSON.stringify(before)) {
        return false;
    }

    if (Object.keys(entries).length === 0) {
        document.delete(setting);
    } else {
        document.set(setting, document.createNode(entries, { flow: false }));
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

    if (isSeq(node)) {
        // Items written by hand as pairs become the text they were meant to be, and are written back in quotes.
        node.items = node.items.map((item) => (isMap(item) && pairText(item.toJSON()) !== undefined ? document.createNode(pairText(item.toJSON())) : item));
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

/** "Poisoned: la benda…" for the YAML pair { Poisoned: "la benda…" } that a list item written without quotes becomes; undefined for anything else. */
function pairText(item: unknown): string | undefined
{
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
        return undefined;
    }

    const entries = Object.entries(item);
    return entries.length === 1 && ["string", "number", "boolean"].includes(typeof entries[0][1]) ? `${entries[0][0]}: ${String(entries[0][1])}` : undefined;
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
