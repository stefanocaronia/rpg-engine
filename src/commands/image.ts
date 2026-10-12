import { join, relative, resolve } from "node:path";
import { z } from "zod";
import { readListSetting, readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { files, isInside } from "../core/store.ts";
import { imageFileName, imageLink, imagesFolderName, readImage } from "../images/index.ts";
import { baseChain, ownField, type Page, pageNamed, type World, writePage } from "../pages/index.ts";
import { imageFile, ownImage } from "./game-images.ts";
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
    /** The picture is being made, and comes by itself (D-308). */
    making?: boolean;
}

export const image = defineCommand({
    name: "image",
    description: "Give a page its picture: a portrait for a character, an image for a creature, an item or a place, as the dashboard will show it in a round token. "
        + "It copies the file (PNG, JPEG, WebP or SVG, up to 5 MB) into the campaign's images folder and links it in the page's image field; "
        + "a page without one shows the picture of the page it derives from, such as a goblin's icon. "
        + "Use it when the player gives you a picture, or after you made or downloaded one with your own tools. Without file it removes the page's own picture. "
        + "For a place or a quest, describe instead of file has the picture made on this computer, as the campaign's pictures setting allows: for a place what the party sees arriving, "
        + "for a quest what the character knows of it, never what they do not know. "
        + "Example: page Ettore, file C:\\Users\\me\\Pictures\\ettore.png.",
    group: "game",
    positionals: ["page", "file"],
    input: z.object({
        page: z.string().describe("the page that gets the picture"),
        file: z.string().optional().describe("the picture's file, its full path or one from the folder the command runs in; leave it out to remove the page's own picture"),
        describe: z.string().optional().describe(
            "instead of file, for a place: what the party sees arriving; for a quest: what the character knows of it; in a few lines, never a victim or wounds; the picture is made where it can be, and comes by itself",
        ),
    }),

    run(input, context): ImageResult | Promise<ImageResult>
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

        if (input.describe !== undefined && input.describe.trim() !== "") {
            if (input.file !== undefined && input.file.trim() !== "") {
                throw new Error("Give file or describe, not both: file is a picture you have, describe has one made. Nothing changed.");
            }

            return madePicture(root, context, page, input.describe.trim());
        }

        if (input.file === undefined || input.file.trim() === "") {
            return removeImage(root, context, world, page, imageFile(root, context, ownImage(page)));
        }

        return setImage(root, context, world, page, resolve(context.folder, input.file.trim()));
    },

    format(result)
    {
        if (result.making === true) {
            return `${result.page}'s picture is being made, in a minute or so: the player's dashboard shows it when it comes. Go on with the story.`;
        }

        if (result.image !== undefined) {
            return `${result.page}'s picture is now ${result.image}${result.from === undefined ? "" : `, copied from ${result.from}`}.`;
        }

        const shown = result.inheritedFrom === undefined ? "it has none now" : `it shows the picture of ${result.inheritedFrom}`;
        return result.changed ? `${result.page} has no picture of its own any more: ${shown}.` : `${result.page} has no picture of its own: ${shown}.`;
    },
});

/** Copies a picture into the campaign's images folder and links it in the page; the page's old picture goes when nothing else links it. */
function setImage(root: string, context: Context, world: World, page: Page, from: string): ImageResult
{
    const old = imageFile(root, context, ownImage(page));
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
}

/**
 * A place's picture made from what the party sees, or a quest's from what the character knows of it (D-308, D-388, PIC-1–PIC-3), where the campaign's setting allows it and this computer can: in the MCP server it comes
 * by itself while the story goes on; on the command line the command waits for it. A refusal is never tried again.
 */
function madePicture(root: string, context: Context, page: Page, seen: string): ImageResult | Promise<ImageResult>
{
    if (page.type !== "place" && page.type !== "quest") {
        throw new Error(`describe makes pictures of places and quests, and ${page.name} is a ${page.type ?? "page"}: give a picture of it with file. Nothing changed.`);
    }

    const setting = readSettings(root).pictures;

    if (setting === undefined || setting === "none") {
        throw new Error(
            `The campaign makes no pictures (pictures: ${setting ?? "not chosen"}): ask the player whether they want them, then config pictures: new places and quests, on request or none. Nothing changed.`,
        );
    }

    const ready = context.pictures?.ready(true) ?? { ready: false as const, why: "Nothing on this computer makes pictures" };

    if (!ready.ready || context.pictures === undefined) {
        throw new Error(`${ready.ready ? "Nothing on this computer makes pictures" : ready.why}. If your own tools make pictures, make one and give it with file; else go on without. Nothing changed.`);
    }

    const unseen = [...readListSetting(root, "lines"), ...readListSetting(root, "veils")];
    const making = context.pictures.make({ kind: page.type === "quest" ? "quest" : "place", name: page.name, seen, unseen }).then((made) => {
        if ("refused" in made) {
            appendLogEntry(root, newDatedLogEntry(root, context, "image-refused", "hidden", { page: page.name, why: made.refused }));
            throw new Error(`No picture of ${page.name}: ${made.refused}. Go on without, or give one with file.`);
        }

        try {
            const world = campaignWorld(root, context);
            const now = world.pages.find((candidate) => candidate.path === page.path) ?? page;
            // Codex's own copy goes once copied: the picture is the campaign's.
            return { ...setImage(root, context, world, now, made.file), from: undefined };
        } finally {
            made.done();
        }
    });

    if (context.files === undefined) {
        return making;
    }

    // The MCP server lives on: the picture comes by itself, and the dashboard shows it.
    making.catch(() => undefined);
    return { page: page.name, changed: false, making: true };
}

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

function shownPath(root: string, path: string): string
{
    return relative(root, path).replaceAll("\\", "/");
}
