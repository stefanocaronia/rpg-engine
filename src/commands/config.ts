import { z } from "zod";
import { changeSetting, checkSettingName, missingSettings, readSettings, requireCampaign, settingNames } from "../campaign/index.ts";
import { appendLogEntry, newLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { missingSettingsNote } from "./notes.ts";

export const config = defineCommand({
    name: "config",
    description: "Show or change the campaign settings. "
        + "Without a setting it shows them all and says which are still missing; with a setting and a value it changes that one. "
        + "Use it at the start of a campaign, to learn what to ask the player, and whenever the player changes a setting. "
        + "Example: setting language, value it.",
    group: "campaign",
    positionals: ["setting", "value"],
    input: z.object({
        setting: z.string().optional().describe(`setting to show or change: ${settingNames.join(", ")}`),
        value: z.string().optional().describe("new value of the setting"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const shown = input.setting === undefined ? settingNames : [checkSettingName(input.setting)];

        if (input.setting !== undefined && input.value !== undefined && changeSetting(root, input.setting, input.value)) {
            appendLogEntry(root, newLogEntry(context, "config-changed", "public", { setting: input.setting, value: input.value }));
        }

        const settings = readSettings(root);
        return { settings: Object.fromEntries(shown.map((name) => [name, settings[name]])), missing: missingSettings(settings) };
    },

    format(result)
    {
        const lines = Object.entries(result.settings).map(([name, value]) => `${name}: ${value ?? "(missing)"}`);
        return [lines.join("\n"), missingSettingsNote(result.missing)].filter((block) => block !== "").join("\n\n");
    },
});
