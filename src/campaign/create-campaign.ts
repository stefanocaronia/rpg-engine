import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { z } from "zod";
import { campaignFileName, findCampaign } from "./find-campaign.ts";
import { type CampaignSettings, settingsSchema } from "./settings.ts";

/** Creates a campaign in `folder`: campaign.yaml, state.yaml and the sessions folder. Returns the campaign's full path. */
export function createCampaign(folder: string, settings: CampaignSettings): string
{
    const root = resolve(folder);
    checkNoOtherCampaign(root);
    const parsed = settingsSchema.safeParse(settings);

    if (!parsed.success) {
        throw new Error(`The campaign settings are not valid:\n${z.prettifyError(parsed.error)}`);
    }

    mkdirSync(join(root, "sessions"), { recursive: true });
    writeFileSync(join(root, campaignFileName), `# Campaign settings: change them with the config command.\n${stringify(parsed.data)}`, "utf8");
    writeFileSync(join(root, "state.yaml"), "# The present of the game, kept by rpg: date and current scene.\n", "utf8");
    return root;
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
