// What tells a campaign apart in the launcher's list (D-528): the strong colour of its game system's theme with its text, in each look of the page, the
// colours of the dice the theme gives; and its player character, with their portrait, served by the launcher at an address of its own, only that file. Read
// as the campaign's page reads them; loaded with the commands at the first list, so that the launcher starts without them.
import { createHash } from "node:crypto";
import type { Context } from "../../core/context.ts";
import { findImage } from "../../images/index.ts";
import { loadWorld } from "../../pages/index.ts";
import { type CampaignFace, portraitsAddress } from "./campaigns.ts";

/**
 * What reads a campaign's face in the list: its theme's colours, its player character's name and the address of their portrait, which `portraits` keeps by its name
 * for the launcher to serve. Nothing of what does not read: the list never stops for it.
 */
export async function faceReader(context: Context, portraits: Map<string, string>): Promise<(root: string) => CampaignFace>
{
    const read = await commandsRead();
    return (root) => ({ ...themeColours(read, root, context), ...character(read, root, context, portraits) });
}

/** What the faces read with, from the commands: loaded here, at the first list, never by a static import from the launcher. */
async function commandsRead()
{
    const [images, theme, knowledge] = await Promise.all([
        import("../../commands/shared/campaign/images.ts"),
        import("../../commands/shared/campaign/theme.ts"),
        import("../../commands/shared/characters/knowledge.ts"),
    ]);
    return { imageFolders: images.imageFolders, shownImage: images.shownImage, campaignTheme: theme.campaignTheme, playerCharacter: knowledge.playerCharacter };
}

type CommandsRead = Awaited<ReturnType<typeof commandsRead>>;

function themeColours(read: CommandsRead, root: string, context: Context): CampaignFace
{
    try {
        const theme = read.campaignTheme(root, context)?.theme;

        const die = (mode: "light" | "dark"): { body: string; ink: string; } | undefined => {
            const colours = theme?.modes[mode].colours;
            return colours === undefined ? undefined : { body: colours.gold, ink: colours["on-gold"] };
        };

        const [light, dark] = [die("light"), die("dark")];
        return light === undefined || dark === undefined ? {} : { colours: { light, dark } };
    } catch {
        return {};
    }
}

// The player character, the first living one, as the campaign's page puts them first; their portrait as their page shows it. Among the campaign's own pages
// alone: the game system's, thousands for some, would hold up the list for seconds, and a player character and their picture are the campaign's.
function character(read: CommandsRead, root: string, context: Context, portraits: Map<string, string>): CampaignFace
{
    try {
        const world = loadWorld(root, {});
        const pc = read.playerCharacter(world);

        if (pc === undefined) {
            return {};
        }

        const shown = read.shownImage(root, context, world, pc);
        const file = shown === undefined ? undefined : findImage(read.imageFolders(root, context), shown.file);

        if (shown === undefined || file === undefined) {
            return { character: { name: pc.name } };
        }

        const name = createHash("sha256").update(file).digest("hex").slice(0, 24);
        portraits.set(name, file);
        return { character: { name: pc.name, portrait: `${portraitsAddress}${name}?v=${shown.version}` } };
    } catch {
        return {};
    }
}
