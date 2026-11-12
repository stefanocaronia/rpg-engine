// Settings given as YAML entries by name: read, checked against the system, and what they replace (CAM-1 to CAM-3)
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { readCampaignData, readTextSetting } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { files } from "../../core/store.ts";
import { comparableText } from "../../core/text.ts";
import { readYamlValues } from "../../core/yaml-file.ts";
import { findCampaignSystem, findSystem, rulesetSetting, systemFileName } from "../../systems/index.ts";
import { campaignSystem, systemLayers } from "../shared/campaign/world.ts";

// The same in a message, which no system's names fill: its maximum alone.
export const counterShape = 'bulwark-dice: {max: "4 * has(features, Bulwark)"}';

/** The entries given to a setting that holds them, read as YAML, such as "bulwark-dice: {max: 4, refill: short rest}" (CAM-1). */
export function entriesOf(setting: string, text: string): Record<string, unknown>
{
    const value = yamlValue(text, "the entries", "name: value");

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${setting} takes entries by name, written as in system.yaml, such as ${setting === "counters" ? `'${counterShape}'` : '"name: value"'}. Nothing changed.`);
    }

    return value as Record<string, unknown>;
}

/** A value given as YAML text, read; what does not read says how to write it. */
export function yamlValue(text: string, what: string, example: string): unknown
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
export function replacedEntries(root: string, context: Context, setting: string, names: string[]): string[]
{
    const system = findSystem(context.systemFolders, readTextSetting(root, "system") ?? "");

    if (system === undefined || setting === "recipes") {
        return [];
    }

    // Its version's entries over its own (VER-3).
    const version = campaignSystem(root, context)?.version?.folder;
    const entries = [system.folder, ...(version === undefined ? [] : [version])].flatMap((folder) => {
        const data = files().exists(join(folder, systemFileName)) ? readYamlValues(join(folder, systemFileName), "what the system is") : undefined;
        const own = data !== null && typeof data === "object" ? (data as Record<string, unknown>)[setting] : undefined;
        return own !== null && typeof own === "object" && !Array.isArray(own) ? Object.entries(own) : [];
    }).reverse();
    return names.flatMap((name) => {
        const [found, value] = entries.find(([other]) => comparableText(other) === comparableText(name)) ?? [];
        return found === undefined ? [] : [`${setting} ${name} takes the place of the system ${system.name}'s ${found}, ${formatValue(value)}: what this one leaves out of it is gone.`];
    });
}

/** Refuses what the campaign would add to its game system when the system would not read with it (CAM-3), saying where and why; and when it has no system yet. */
export function checkAdditions(root: string, context: Context, setting: string, change: { set?: Record<string, unknown>; remove?: string[]; }): void
{
    const system = readTextSetting(root, "system");

    if (system === undefined || findSystem(context.systemFolders, system) === undefined) {
        throw new Error(`The campaign has no installed game system to add ${setting} to: set its system first. Nothing changed.`);
    }

    const data = readCampaignData(root);
    const held = data[setting] !== null && typeof data[setting] === "object" && !Array.isArray(data[setting]) ? (data[setting] as Record<string, unknown>) : {};
    const dropped = [...(change.remove ?? []), ...Object.keys(change.set ?? {})];
    const entries = { ...Object.fromEntries(Object.entries(held).filter(([name]) => !dropped.some((other) => comparableText(other) === comparableText(name)))), ...change.set };
    // Over what the campaign's extensions add, as the campaign plays it (CAM-2).
    const layers = systemLayers(root, context, { ...data, [setting]: entries });
    const problem = findCampaignSystem(context.systemFolders, system, layers, readTextSetting(root, rulesetSetting)).refused.find((layer) => layer.from === layers.at(-1)?.from)?.problem;

    if (problem !== undefined) {
        throw new Error(`With this, the system ${system} would not read: ${problem} Nothing changed.`);
    }
}

export function formatValue(value: unknown): string
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
