import { dirname, join, resolve } from "node:path";
import { files, isInside } from "../core/store.ts";

/** The file that marks a folder as a campaign and holds its settings. */
export const campaignFileName = "campaign.yaml";

/** The folder of a campaign with its house rules, a markdown file for each (D-178). */
export const houseRulesFolderName = "rules";

/** The folder of a campaign with its chats as text, copied from the AI hosts as they go on, kept out of the saves (T-225). */
export const sessionsFolderName = "sessions";

/** The folder of a campaign where the player drops pictures of their own, which the master gives to pages with image (D-572 (3)); kept out of the saves. */
export const inboxFolderName = "inbox";

/** The folder of a campaign with its story told as a book, a chapter for each closed scene, kept out of the saves (T-227). */
export const bookFolderName = "book";

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

    refuseCampaignLinks(root);
    // The session of the MCP server watches the campaign from the first call that finds it (D-193).
    files().track(root);
    return root;
}

// The campaign's layers over its game system, which lie a folder further down than its pages: layers/<system>/world/<type>.
const layersFolder = "layers";

// The folders the engine writes in: a link among them, a junction that came with a folder someone else made, would carry its writes outside the campaign. A file
// that is a link the store refuses as it writes it.
const writtenFolders = ["world", "images", "rules", sessionsFolderName, bookFolderName, ".saves", "exports", ".player", ".imports", layersFolder];

// The hosts' folders, where the engine writes only its own files, beside the player's: these alone are looked at, never what the player keeps in them.
const hostFolders = [".claude", join(".claude", "agents"), ".codex", ".agents", ".opencode", join(".opencode", "plugins"), join(".opencode", "agents")];

/**
 * Throws when a folder the engine writes in, or one in it two levels deep, three for the layers, is a link: a symbolic link or a junction; in the hosts' folders,
 * only those where it writes. Before the hosts' files are written, as by init, and at each command.
 */
export function refuseCampaignLinks(root: string): void
{
    const store = files();
    const folders = writtenFolders.map((name) => join(root, name));
    const inside = (folder: string): string[] => [
        ...store.links(folder).map((name) => join(folder, name)),
        ...store.entries(folder).filter((entry) => entry.isFolder).map((entry) => join(folder, entry.name)),
    ];
    const types = folders.flatMap(inside);
    const deeper = types.flatMap(inside);
    const layerTypes = deeper.filter((path) => isInside(join(root, layersFolder), path)).flatMap(inside);
    const linked = [...folders, ...types, ...deeper, ...layerTypes, ...hostFolders.map((name) => join(root, name))].find((path) => store.isLink(path));

    if (linked !== undefined) {
        throw new Error(`${linked} is a link to somewhere else, and what the engine writes there would leave the campaign: replace it with a real folder, with what it holds copied in.`);
    }
}
