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

    refuseLinksOut(root);
    // The session of the MCP server watches the campaign from the first call that finds it (D-193).
    files().track(root);
    return root;
}

// The folders the engine writes in: a link among them, a junction that came with a folder someone else made, would carry its writes outside the campaign. A file
// that is a link the store refuses as it writes it.
const writtenFolders = ["world", "images", "rules", "sessions", ".saves", "exports", ".player", ".imports", ".claude", ".codex"];

/** Throws when a folder the engine writes in, or one in it two levels deep, is a link: a symbolic link or a junction. */
function refuseLinksOut(root: string): void
{
    const store = files();
    const folders = writtenFolders.map((name) => join(root, name));
    const inside = (folder: string): string[] => [
        ...store.links(folder).map((name) => join(folder, name)),
        ...store.entries(folder).filter((entry) => entry.isFolder).map((entry) => join(folder, entry.name)),
    ];
    const types = folders.flatMap(inside);
    const linked = [...folders, ...types, ...types.flatMap(inside)].find((path) => store.isLink(path));

    if (linked !== undefined) {
        throw new Error(`${linked} is a link to somewhere else, and what the engine writes there would leave the campaign: replace it with a real folder, with what it holds copied in.`);
    }
}
