import { basename, resolve } from "node:path";
import { z } from "zod";
import { createCampaign, difficulties, lethalities } from "../campaign/index.ts";
import { appendLogEntry, newLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { hostInstructions } from "../instructions/index.ts";
import { createWorld } from "../pages/index.ts";
import { campaignNote } from "./game-mode.ts";
import { installedSystemName } from "./game-world.ts";

export const init = defineCommand({
    name: "init",
    description: "Create a new campaign. "
        + "It writes the settings, the log, the world's folders, and the .mcp.json, AGENTS.md and CLAUDE.md through which an AI host finds these tools. "
        + "Use it once, when the player starts a new campaign; then ask the player for the missing settings and set them with config. "
        + 'Example: name "The Salt Isles", language en.',
    group: "campaign",
    positionals: ["folder"],
    input: z.object({
        folder: z.string().optional().describe("folder of the new campaign; the current folder if left out"),
        name: z.string().optional().describe("name of the campaign; the folder's name if left out"),
        language: z.string().optional().describe("language of the game, as a code such as it or en"),
        system: z.string().optional().describe("game system: one of those installed"),
        difficulty: z.enum(difficulties).optional().describe(`how hard the world plays: ${difficulties.join(", ")}`),
        lethality: z.enum(lethalities).optional().describe(`what a fall means: ${lethalities.join(", ")}`),
    }),

    run(input, context)
    {
        const folder = resolve(context.folder, input.folder ?? ".");
        // Only an installed system (D-167), as it is installed.
        const system = input.system === undefined ? undefined : installedSystemName(input.system, context, "init");
        const settings = { name: input.name ?? basename(folder), language: input.language, system, difficulty: input.difficulty, lethality: input.lethality };
        const root = createCampaign(folder, settings, context.platform, hostInstructions());
        createWorld(root);
        appendLogEntry(root, newLogEntry(context, "campaign-created", "public", settings));
        return { root, name: settings.name, note: campaignNote(root, context) };
    },

    // The player reads it first, who made the campaign in a terminal: what to do next; then what the master still agrees with them.
    format(result)
    {
        return [
            `Created the campaign "${result.name}" in ${result.root}.`,
            "To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.",
            ...(result.note === "" ? [] : ["", `For the master: ${result.note}`]),
        ].join("\n");
    },
});
