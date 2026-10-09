import { join, relative, resolve } from "node:path";
import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { files, isInside } from "../core/store.ts";
import { imageFileName, imageLink, imagesFolderName, readImage } from "../images/index.ts";
import { baseChain, ownField, type Page, pageNamed, type World, writePage } from "../pages/index.ts";
import { imageFile } from "./game-images.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

interface ImageResult
{
    page: string;
    /** The picture now in the campaign, from its folder; undefined when the page's own was removed. */
    image?: string;
    /** Where it came from, when it was copied. */
    from?: string;
    /** The page whose picture it shows now that its own is gone, if any. */
    inheritedFrom?: string;
    changed: boolean;
}

export const image = defineCommand({
    name: "image",
    description: "Give a page its picture: a portrait for a character, an image for a creature, an item or a place, as the dashboard will show it in a round token. "
        + "It copies the file (PNG, JPEG, WebP or SVG, up to 5 MB) into the campaign's images folder and links it in the page's image field; "
        + "a page without one shows the picture of the page it derives from, such as a goblin's icon. "
        + "Use it when the player gives you a picture, or after you made or downloaded one with your own tools. Without file it removes the page's own picture. "
        + "Example: page Ettore, file C:\\Users\\me\\Pictures\\ettore.png.",
    group: "game",
    positionals: ["page", "file"],
    input: z.object({
        page: z.string().describe("the page that gets the picture"),
        file: z.string().optional().describe("the picture's file, its full path or one from the folder the command runs in; leave it out to remove the page's own picture"),
    }),

    run(input, context): ImageResult
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const page = pageNamed(world, input.page);

        if (page === undefined) {
            throw new Error(`There is no page ${input.page}: write it first, or look for its name with find.`);
        }

        if (page.system !== undefined) {
            const [type, base] = page.type === "item" ? ["item", "item"] : ["character", "creature"];
            throw new Error(
                `${page.name} is a ${page.type ?? "page"} of the game system ${page.system}: read-only. Give the picture to a page of the campaign that derives from it, `
                    + `such as one made with write "Grak", type ${type}, set ${base}=[[${page.name}]]; then image Grak with the file. Nothing changed.`,
            );
        }

        const old = imageFile(root, context, ownImage(page));

        if (input.file === undefined || input.file.trim() === "") {
            return removeImage(root, context, world, page, old);
        }

        const from = resolve(context.folder, input.file.trim());
        const picture = readImage(from);

        if ("problem" in picture) {
            throw new Error(`${picture.problem} Nothing changed.`);
        }

        const target = join(root, imagesFolderName, `${page.name}.${picture.extension}`);

        if (resolve(target) !== from) {
            files().writeBytes(target, picture.bytes);
        }

        writePage(world, page.name, undefined, { set: { image: imageLink(`${page.name}.${picture.extension}`) } });
        removeUnused(root, world, page, old, target);
        appendLogEntry(root, newDatedLogEntry(root, context, "image-set", "public", { page: page.name, image: shownPath(root, target) }));
        return { page: page.name, image: shownPath(root, target), from: resolve(target) === from ? undefined : from, changed: true };
    },

    format(result)
    {
        if (result.image !== undefined) {
            return `${result.page}'s picture is now ${result.image}${result.from === undefined ? "" : `, copied from ${result.from}`}.`;
        }

        const shown = result.inheritedFrom === undefined ? "it has none now" : `it shows the picture of ${result.inheritedFrom}`;
        return result.changed ? `${result.page} has no picture of its own any more: ${shown}.` : `${result.page} has no picture of its own: ${shown}.`;
    },
});

function removeImage(root: string, context: Context, world: World, page: Page, old: string | undefined): ImageResult
{
    const field = ownField(page, "image");
    const inheritedFrom = baseChain(world, page).find((base) => imageFileName(ownImage(base)) !== undefined)?.name;

    if (field === undefined) {
        return { page: page.name, inheritedFrom, changed: false };
    }

    writePage(world, page.name, undefined, { unset: [field] });
    removeUnused(root, world, page, old, undefined);
    appendLogEntry(root, newDatedLogEntry(root, context, "image-removed", "public", { page: page.name }));
    return { page: page.name, inheritedFrom, changed: true };
}

/** Removes the campaign's picture that the page linked before, when it is not the new one and no other page links it. */
function removeUnused(root: string, world: World, page: Page, old: string | undefined, kept: string | undefined): void
{
    if (old === undefined || !isInside(join(root, imagesFolderName), old) || (kept !== undefined && resolve(old) === resolve(kept))) {
        return;
    }

    const name = imageFileName(ownImage(page))?.toLowerCase();
    const linkedElsewhere = world.pages.some((other) => other !== page && other.system === undefined && imageFileName(ownImage(other))?.toLowerCase() === name);

    if (!linkedElsewhere) {
        files().remove(old);
    }
}

/** The page's own image field, as written; undefined when it has none. */
function ownImage(page: Page): unknown
{
    const field = ownField(page, "image");
    return field === undefined ? undefined : page.fields[field];
}

function shownPath(root: string, path: string): string
{
    return relative(root, path).replaceAll("\\", "/");
}
