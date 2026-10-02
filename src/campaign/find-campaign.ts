import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The file that marks a folder as a campaign and holds its settings. */
export const campaignFileName = "campaign.yaml";

/** The campaign that holds `folder`: the nearest folder, from `folder` upwards, with a campaign.yaml. */
export function findCampaign(folder: string): string | undefined
{
    let current = resolve(folder);

    while (!existsSync(join(current, campaignFileName))) {
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
        throw new Error(`There is no campaign here: no ${campaignFileName} in ${resolve(folder)} or in the folders above it. Create one with "rpg init", or run rpg from inside a campaign folder.`);
    }

    return root;
}
