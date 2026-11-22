import { type Dirent, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { z } from "zod";
import { files } from "../core/store.ts";
import { campaignFileName, findCampaign, inboxFolderName, refuseCampaignLinks, sessionsFolderName } from "./find-campaign.ts";
import { hostFileChanges, type HostInstructions, rpgServer, writeHostFile } from "./host-files.ts";
import { type CampaignSettings, settingsSchema } from "./settings.ts";

/**
 * Creates a campaign in `folder`: campaign.yaml, state.yaml, the sessions folder, the inbox for the player's pictures, the .mcp.json through which AI hosts such as Claude Code find the rpg tools,
 * and the host files that send them to the start lines and give each AI app with subagents the character agent (D-97, D-242, D-490, D-580). `platform` is the operating system, as Node names it. Returns the campaign's full path.
 */
export function createCampaign(folder: string, settings: CampaignSettings, platform: string, instructions: HostInstructions): string
{
    const root = resolve(folder);
    checkNoOtherCampaign(root);
    const parsed = settingsSchema.safeParse(settings);

    if (!parsed.success) {
        throw new Error(`The campaign settings are not valid:\n${z.prettifyError(parsed.error)}`);
    }

    refuseCampaignLinks(root);
    const mcpConfig = mcpConfigWithRpg(root, platform, "create the campaign again");
    const hostFiles = hostFileChanges(root, instructions, platform);
    files().makeFolder(join(root, sessionsFolderName));
    files().makeFolder(join(root, inboxFolderName));
    files().write(join(root, campaignFileName), `# Campaign settings: change them with the config command.\n${stringify(parsed.data)}`);
    // A new campaign starts in setup (MOD-1).
    files().write(join(root, "state.yaml"), "# The present of the game, kept by rpg: mode, date and current scene.\nmode: setup\n");
    files().write(join(root, ".mcp.json"), JSON.stringify(mcpConfig, null, 2) + "\n");
    hostFiles.forEach(writeHostFile);
    return root;
}

/**
 * Brings the files through which the AI hosts find the game up to date in a campaign that exists, as init does when given its folder again: the rpg server
 * in .mcp.json when missing, and the host files. A broken settings file of a host, or a link among the folders written, stops it with how to fix it.
 */
export function updateHostFiles(root: string, platform: string, instructions: HostInstructions): void
{
    refuseCampaignLinks(root);
    const again = "run rpg init in this folder again";
    const before = mcpConfig(root, again);
    const hostFiles = hostFileChanges(root, instructions, platform);

    if (before.mcpServers?.rpg === undefined) {
        files().write(join(root, ".mcp.json"), JSON.stringify(mcpConfigWithRpg(root, platform, again), null, 2) + "\n");
    }

    hostFiles.forEach(writeHostFile);
}

/** The folder's .mcp.json with the rpg server added; other servers already listed stay. On Windows a host must start rpg through cmd. */
function mcpConfigWithRpg(root: string, platform: string, again: string): { mcpServers?: Record<string, unknown>; }
{
    const config = mcpConfig(root, again);
    return { ...config, mcpServers: { ...config.mcpServers, rpg: rpgServer(platform) } };
}

/** The folder's .mcp.json, empty when there is none; refused, with how to fix it and what to do `again` after, when it holds no JSON object of servers. */
function mcpConfig(root: string, again: string): { mcpServers?: Record<string, unknown>; }
{
    const path = join(root, ".mcp.json");

    if (!files().exists(path)) {
        return {};
    }

    let config: unknown;

    try {
        config = JSON.parse(files().text(path) ?? "");
    } catch {
        throw new Error(`${path} is not valid JSON, so the rpg server cannot be added to it. Fix it or remove it by hand, then ${again}.`);
    }

    const servers = isObject(config) ? config.mcpServers : undefined;

    if (!isObject(config) || (servers !== undefined && !isObject(servers))) {
        throw new Error(`${path} is not a JSON object with its servers under mcpServers, so the rpg server cannot be added to it. Fix it or remove it by hand, then ${again}.`);
    }

    return config as { mcpServers?: Record<string, unknown>; };
}

function isObject(value: unknown): value is Record<string, unknown>
{
    return value !== null && typeof value === "object" && !Array.isArray(value);
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

    for (const entry of readableEntries(folder)) {
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

/** The entries of a folder; none for one the system will not let be read, as System Volume Information at the root of a disk. */
function readableEntries(folder: string): Dirent[]
{
    try {
        return readdirSync(folder, { withFileTypes: true });
    } catch {
        return [];
    }
}
