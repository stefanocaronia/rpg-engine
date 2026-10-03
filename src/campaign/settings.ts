import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Document, isMap, parseDocument } from "yaml";
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

/** The settings that the config command shows and changes. */
export const settingNames = Object.keys(settingsSchema.shape) as SettingName[];

export function readSettings(root: string): CampaignSettings
{
    return validateSettings(readSettingsDocument(root).toJS() ?? {});
}

/** Changes one setting and keeps the rest of campaign.yaml, comments included, as it is. Nothing is written if the setting already has that value, or if the settings would not be valid. Returns whether it changed. */
export function changeSetting(root: string, name: string, value: string): boolean
{
    const setting = checkSettingName(name);
    const parsed = settingsSchema.shape[setting].safeParse(value);

    if (!parsed.success) {
        throw new Error(`"${value}" is not a valid ${setting}:\n${z.prettifyError(parsed.error)}`);
    }

    const document = readSettingsDocument(root);

    if (document.get(setting) === parsed.data) {
        return false;
    }

    document.set(setting, parsed.data);
    validateSettings(document.toJS());
    writeFileSync(join(root, campaignFileName), String(document), "utf8");
    return true;
}

/** The settings that are still missing: the AI asks the player for them. */
export function missingSettings(settings: CampaignSettings): SettingName[]
{
    return settingNames.filter((name) => settings[name] === undefined);
}

export function checkSettingName(name: string): SettingName
{
    if (!(settingNames as string[]).includes(name)) {
        throw new Error(`There is no setting "${name}". The settings are: ${settingNames.join(", ")}.`);
    }

    return name as SettingName;
}

function validateSettings(values: unknown): CampaignSettings
{
    const parsed = settingsSchema.safeParse(values);

    if (!parsed.success) {
        throw new Error(`${campaignFileName} is not valid:\n${z.prettifyError(parsed.error)}\nFix it with the config command, or by hand.`);
    }

    return parsed.data;
}

function readSettingsDocument(root: string): Document
{
    const document = parseDocument(readFileSync(join(root, campaignFileName), "utf8"));

    if (document.errors.length > 0) {
        throw new Error(`${campaignFileName} is not valid YAML; fix it by hand: ${document.errors[0].message}`);
    }

    if (document.contents !== null && !isMap(document.contents)) {
        throw new Error(`${campaignFileName} must hold settings, such as "name: ..."; fix it by hand.`);
    }

    return document;
}
