import { basename, resolve } from "node:path";
import { z } from "zod";
import { createCampaign, difficulties, findCampaign, lethalities, refreshUserHostFiles, rememberChoice, updateHostFiles } from "../campaign/index.ts";
import { type Context } from "../core/context.ts";
import { appendLogEntry, newLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { hostInstructions } from "../instructions/index.ts";
import { createWorld } from "../pages/index.ts";
import { campaignNote } from "./shared/campaign/mode.ts";
import { installedSystemName } from "./shared/campaign/world.ts";

export const init = defineCommand({
    name: "init",
    description: "Create a new campaign. "
        + "It writes the settings, the log, the world's folders, and the .mcp.json, AGENTS.md and CLAUDE.md through which an AI host finds these tools. "
        + "Given the folder of a campaign that exists, it only brings those files up to date. "
        + "Use it once, when the player starts a new campaign, with master true when you, the AI, create it: the answer then says what is still to agree with the player, to set with config. "
        + 'Example: name "The Salt Isles", language en.',
    group: "campaign",
    positionals: ["folder"],
    input: z.object({
        folder: z.string().optional().describe("folder of the new campaign; the current folder if left out"),
        name: z.string().trim().min(1, "give the campaign a name, or leave name out for the folder's").optional().describe("name of the campaign; the folder's name if left out"),
        language: z.string().optional().describe("language of the game, as a code such as it or en"),
        system: z.string().optional().describe("game system: one of those installed"),
        difficulty: z.enum(difficulties).optional().describe(`how hard the world plays: ${difficulties.join(", ")}`),
        lethality: z.enum(lethalities).optional().describe(`what a fall means: ${lethalities.join(", ")}`),
        master: z.boolean().optional().describe("true when you, the AI, create the campaign: the answer adds what is still to agree with the player"),
    }),

    run(input, context)
    {
        const folder = resolve(context.folder, input.folder ?? ".");

        // A campaign that exists keeps its settings: only the files through which the hosts find it are brought up to date.
        if (findCampaign(folder) === folder) {
            updateHostFiles(folder, context.platform, hostInstructions());
            return { root: folder, name: "", note: "", already: true, app: refreshUserFiles(context) };
        }

        // Only an installed system (D-167), as it is installed.
        const system = input.system === undefined ? undefined : installedSystemName(input.system, context, "init");
        const settings = { name: input.name ?? basename(folder), language: input.language, system, difficulty: input.difficulty, lethality: input.lethality };
        const root = createCampaign(folder, settings, context.platform, hostInstructions());
        createWorld(root);
        appendLogEntry(root, newLogEntry(context, "campaign-created", "public", settings));
        const app = refreshUserFiles(context);
        // What the next campaign's setup suggests (T-134).
        rememberChoice(context.home, root, "difficulty", settings.difficulty);
        rememberChoice(context.home, root, "lethality", settings.lethality);
        return { root, name: settings.name, note: input.master === true ? campaignNote(root, context) : "", already: false, app };
    },

    // The player reads it, who made the campaign in a terminal: what to do next. What the master still agrees with them only when the master made it (T-185).
    format(result)
    {
        // Antigravity's own settings, outside the campaign, said apart when they could not be written.
        const app = result.app === undefined ? [] : [result.app];

        if (result.already) {
            // What could not be written is outside the folder: the line says only what is true.
            return [`${result.root} is already a campaign: its files for Claude Code, Codex, Antigravity and OpenCode${app.length > 0 ? " in this folder" : ""} are up to date.`, ...app].join("\n");
        }

        return [
            `Created the campaign "${result.name}" in ${result.root}.`,
            "To play, open Claude Code, Codex, Antigravity or OpenCode in this folder and say hello: the master asks you the rest.",
            ...app,
            ...(result.note === "" ? [] : ["", `For the master: ${result.note}`]),
        ].join("\n");
    },
});

/** The engine's files in the player's home, as Antigravity's app reads them (D-578), and what could not be written; none where the context has no home, as in the tests. */
function refreshUserFiles(context: Context): string | undefined
{
    return context.userHome === undefined ? undefined : refreshUserHostFiles(context.userHome, context.platform);
}
