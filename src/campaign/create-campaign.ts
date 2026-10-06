import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { z } from "zod";
import { files } from "../core/store.ts";
import { campaignFileName, findCampaign } from "./find-campaign.ts";
import { type CampaignSettings, settingsSchema } from "./settings.ts";

/**
 * Creates a campaign in `folder`: campaign.yaml, state.yaml, the sessions folder, and the .mcp.json through which AI hosts such as Claude Code find the rpg tools.
 * `platform` is the operating system, as Node names it. Returns the campaign's full path.
 */
export function createCampaign(folder: string, settings: CampaignSettings, platform: string): string
{
    const root = resolve(folder);
    checkNoOtherCampaign(root);
    const parsed = settingsSchema.safeParse(settings);

    if (!parsed.success) {
        throw new Error(`The campaign settings are not valid:\n${z.prettifyError(parsed.error)}`);
    }

    const mcpConfig = mcpConfigWithRpg(root, platform);
    files().makeFolder(join(root, "sessions"));
    files().write(join(root, campaignFileName), `# Campaign settings: change them with the config command.\n${stringify(parsed.data)}`);
    files().write(join(root, "state.yaml"), "# The present of the game, kept by rpg: date and current scene.\n");
    files().write(join(root, ".mcp.json"), JSON.stringify(mcpConfig, null, 2) + "\n");
    return root;
}

/** The folder's .mcp.json with the rpg server added; other servers already listed stay. On Windows a host must start rpg through cmd. */
function mcpConfigWithRpg(root: string, platform: string): { mcpServers?: Record<string, unknown>; }
{
    const path = join(root, ".mcp.json");
    let config: { mcpServers?: Record<string, unknown>; } = {};

    if (files().exists(path)) {
        try {
            config = JSON.parse(files().text(path) ?? "");
        } catch {
            throw new Error(`${path} is not valid JSON, so the rpg server cannot be added to it. Fix it or remove it by hand, then create the campaign again.`);
        }
    }

    const rpg = platform === "win32" ? { command: "cmd", args: ["/c", "rpg", "mcp"] } : { command: "rpg", args: ["mcp"] };
    return { ...config, mcpServers: { ...config.mcpServers, rpg } };
}

/** A campaign cannot sit inside another one, nor hold one. */
function checkNoOtherCampaign(root: string): void
{
    const outer = findCampaign(root);

    if (outer !== undefined) {
        throw new Error(outer === root ? `${root} is already a campaign.` : `${root} is inside the campaign in ${outer}, and a campaign cannot hold another one: pick a folder outside it.`);
    }

    const inner = campaignBelow(root, 3);

    if (inner !== undefined) {
        throw new Error(`${root} holds the campaign in ${inner}, and a campaign cannot hold another one: pick another folder.`);
    }
}

/** The first campaign in the folders below `folder`, down to `depth` levels; hidden folders and node_modules are skipped. */
function campaignBelow(folder: string, depth: number): string | undefined
{
    if (depth === 0 || !existsSync(folder)) {
        return undefined;
    }

    for (const entry of readdirSync(folder, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") {
            continue;
        }

        const child = join(folder, entry.name);
        const found = existsSync(join(child, campaignFileName)) ? child : campaignBelow(child, depth - 1);

        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}
