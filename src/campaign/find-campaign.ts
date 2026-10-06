import { dirname, join, resolve } from "node:path";
import { files } from "../core/store.ts";

/** The file that marks a folder as a campaign and holds its settings. */
export const campaignFileName = "campaign.yaml";

/** The folder of a campaign with its house rules, a markdown file for each (D-178). */
export const houseRulesFolderName = "rules";

/** The campaign that holds `folder`: the nearest folder, from `folder` upwards, with a campaign.yaml. */
export function findCampaign(folder: string): string | undefined
{
    let current = resolve(folder);

    while (!files().exists(join(current, campaignFileName))) {
        const parent = dirname(current);

        if (parent === current) {
            return undefined;
        }

        current = parent;
    }

    return current;
}

/** Like findCampaign, but fails with a message that says how to get into a campaign. */
export function requireCampaign(folder: string): string
{
    const root = findCampaign(folder);

    if (root === undefined) {
        throw new Error(`There is no campaign here: no ${campaignFileName} in ${resolve(folder)} or in the folders above it. Create one with the init command, or work from inside a campaign folder.`);
    }

    // The session of the MCP server watches the campaign from the first call that finds it (D-193).
    files().track(root);
    return root;
}
