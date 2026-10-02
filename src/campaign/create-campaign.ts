import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { z } from "zod";
import { campaignFileName, findCampaign } from "./find-campaign.ts";
import { type CampaignSettings, settingsSchema } from "./settings.ts";

/** Creates a campaign in `folder`: campaign.yaml, state.yaml and the sessions folder. Returns the campaign's full path. */
export function createCampaign(folder: string, settings: CampaignSettings): string
{
    const root = resolve(folder);
    const existing = findCampaign(root);

    if (existing !== undefined) {
        throw new Error(existing === root ? `${root} is already a campaign.` : `${root} is inside the campaign in ${existing}, and a campaign cannot hold another one: pick a folder outside it.`);
    }

    const parsed = settingsSchema.safeParse(settings);

    if (!parsed.success) {
        throw new Error(`The campaign settings are not valid:\n${z.prettifyError(parsed.error)}`);
    }

    mkdirSync(join(root, "sessions"), { recursive: true });
    writeFileSync(join(root, campaignFileName), `# Campaign settings: change them with "rpg config <setting> <value>".\n${stringify(parsed.data)}`, "utf8");
    writeFileSync(join(root, "state.yaml"), "# The present of the game, kept by rpg: date and current scene.\n", "utf8");
    return root;
}
