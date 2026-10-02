import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Document, parseDocument } from "yaml";
import { z } from "zod";
import { campaignFileName } from "./find-campaign.ts";

/** The settings of a campaign, kept in campaign.yaml. Other keys are kept: systems and extensions will add their own. */
export const settingsSchema = z.object({
    name: z.string().min(1).describe("name of the campaign"),
    language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "use a language code such as it, en or pt-BR").optional().describe("language of the game, as a code such as it or en"),
    system: z.string().min(1).optional().describe("game system of the campaign, such as 5e"),
}).loose();

export type CampaignSettings = z.infer<typeof settingsSchema>;
export type SettingName = keyof typeof settingsSchema.shape;

/** The settings that rpg config shows and changes. */
export const settingNames = Object.keys(settingsSchema.shape) as SettingName[];

export function readSettings(root: string): CampaignSettings
{
    const parsed = settingsSchema.safeParse(readSettingsDocument(root).toJS() ?? {});

    if (!parsed.success) {
        throw new Error(`${campaignFileName} is not valid:\n${z.prettifyError(parsed.error)}\nFix it with "rpg config <setting> <value>", or by hand.`);
    }

    return parsed.data;
}

/** Changes one setting and keeps the rest of campaign.yaml, comments included, as it is. */
export function changeSetting(root: string, name: string, value: string): CampaignSettings
{
    const setting = checkSettingName(name);
    const parsed = settingsSchema.shape[setting].safeParse(value);

    if (!parsed.success) {
        throw new Error(`"${value}" is not a valid ${setting}:\n${z.prettifyError(parsed.error)}`);
    }

    const document = readSettingsDocument(root);
    document.set(setting, parsed.data);
    writeFileSync(join(root, campaignFileName), String(document), "utf8");
    return readSettings(root);
}

/** The settings that are still missing: the AI asks the player for them. */
export function missingSettings(settings: CampaignSettings): SettingName[]
{
    return settingNames.filter((name) => settings[name] === undefined);
}

/** Says which settings are missing and how to set them; empty when none is. */
export function missingSettingsNote(missing: string[]): string
{
    if (missing.length === 0) {
        return "";
    }

    return `Still missing: ${missing.join(", ")}. Set ${missing.length === 1 ? "it" : "them"} with: rpg config <setting> <value>`;
}

export function checkSettingName(name: string): SettingName
{
    if (!(settingNames as string[]).includes(name)) {
        throw new Error(`There is no setting "${name}". The settings are: ${settingNames.join(", ")}.`);
    }

    return name as SettingName;
}

function readSettingsDocument(root: string): Document
{
    const document = parseDocument(readFileSync(join(root, campaignFileName), "utf8"));

    if (document.errors.length > 0) {
        throw new Error(`${campaignFileName} is not valid YAML: ${document.errors[0].message}`);
    }

    return document;
}
