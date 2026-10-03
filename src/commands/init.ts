import { basename, resolve } from "node:path";
import { z } from "zod";
import { createCampaign, missingSettings } from "../campaign/index.ts";
import { appendLogEntry, newLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { createWorld } from "../pages/index.ts";
import { missingSettingsNote } from "./notes.ts";

export const init = defineCommand({
    name: "init",
    description: "Create a campaign: its settings, the present, the event log, the sessions and the world's folders.",
    positionals: ["folder"],
    input: z.object({
        folder: z.string().optional().describe("folder of the new campaign; the current folder if left out"),
        name: z.string().optional().describe("name of the campaign; the folder's name if left out"),
        language: z.string().optional().describe("language of the game, as a code such as it or en"),
        system: z.string().optional().describe("game system, such as 5e"),
    }),

    run(input, context)
    {
        const folder = resolve(context.folder, input.folder ?? ".");
        const settings = { name: input.name ?? basename(folder), language: input.language, system: input.system };
        const root = createCampaign(folder, settings);
        createWorld(root);
        appendLogEntry(root, newLogEntry(context, "campaign-created", "public", settings));
        return { root, name: settings.name, missing: missingSettings(settings) };
    },

    format(result)
    {
        return [`Created the campaign "${result.name}" in ${result.root}.`, missingSettingsNote(result.missing)].filter((line) => line !== "").join("\n");
    },
});
