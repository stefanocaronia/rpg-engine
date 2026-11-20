import { join, relative, resolve } from "node:path";
import { z } from "zod";
import { readListSetting, readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context, PictureFallback, PictureSubject } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { files, isInside } from "../core/store.ts";
import { comparableText, withArticle } from "../core/text.ts";
import { imageFileName, imageLink, imageOfBytes, imagesFolderName, largestImage, type ReadImage, readImage } from "../images/index.ts";
import { baseChain, findPage, isPartyMember, ownField, type Page, pageNamed, parsePageReference, type World, writePage } from "../pages/index.ts";
import { imageFile, ownImage } from "./shared/campaign/images.ts";
import { campaignSystem, campaignWorld } from "./shared/campaign/world.ts";
import { knowsPage, playerKnowledge } from "./shared/characters/knowledge.ts";
import { readOpenScene } from "./shared/scene/scene.ts";
import { sheetHeadline } from "./shared/sheet/sheet.ts";
import { newDatedLogEntry } from "./shared/time/time.ts";

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
    /** The brief of the picture the chat makes itself with its own tool, as Antigravity (D-390). */
    paint?: string;
    /** The master's own image tool that makes it from the brief, as ElevenLabs (D-572); none for the chat's own. */
    tool?: string;
    /** The player chose another image tool and has not named it yet: the master asks which (D-572). */
    askTool?: true;
    /** Why the chat in use made it, or makes it, in place of the maker the player chose (D-572). */
    instead?: string;
}

export const image = defineCommand({
    name: "image",
    description: "Give a page its picture: a portrait for a character, an image for a creature, an item or a place, as the dashboard will show it in a round token. "
        + "It copies the file into the campaign and links it in the page's image field; a page without one shows the picture of the page it derives from, such as a wolf's icon. "
        + "Use it when the player gives you a picture, or after you made one with your own tools: its file, or url with the https address your tool gives, which the engine downloads. "
        + "The player may drop pictures in the campaign's inbox folder: ask what each is for, give it, then delete it from the inbox. "
        + "For a place, a quest, a character or a creature of the campaign, describe instead of file has the picture made on this computer, as the campaign's pictures setting allows: "
        + "for the player character or a companion only when the player asks; for a creature once for each kind, whose copies show it. "
        + "Example: page Ettore, file C:\\Users\\me\\Pictures\\ettore.png.",
    group: "game",
    positionals: ["page", "file"],
    input: z.object({
        page: z.string().describe("the page that gets the picture"),
        file: z.string().optional().describe("the picture's file, PNG, JPEG, WebP or SVG up to 5 MB: its full path or one from the folder the command runs in; leave it and url out to remove the page's own picture"),
        url: z.string().optional().describe("instead of file, the picture's https address, as an image tool gives it: the engine downloads it, the same formats up to 5 MB"),
        describe: z.string().optional().describe(
            "instead of file, in a few lines, never a victim or wounds: for a place, what the party sees arriving; for a quest, what the character knows of it; "
                + "for one of the party, their look, their people as this world has them and the rest as the player described it; for a character or a creature met, what the character sees of them, "
                + "a disguise as the disguise; never what the character does not know. The picture is made where it can be, and comes by itself",
        ),
    }),

    run(input, context): ImageResult | Promise<ImageResult>
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const page = pageNamed(world, input.page);

        if (page === undefined) {
            throw new Error(`${copyRefusal(root, world, input.page) ?? `There is no page ${input.page}: write it first, or look for its name with find.`} Nothing changed.`);
        }

        if (page.system !== undefined) {
            throw new Error(`${systemRefusal(page)} Nothing changed.`);
        }

        const url = input.url?.trim() ?? "";
        const file = input.file?.trim() ?? "";

        if (input.describe !== undefined && input.describe.trim() !== "") {
            if (file !== "" || url !== "") {
                throw new Error("Give file, url or describe, one of them: file and url are a picture you have, describe has one made. Nothing changed.");
            }

            return madePicture(root, context, world, page, input.describe.trim());
        }

        if (url !== "") {
            if (file !== "") {
                throw new Error("Give file or url, not both: file is a picture on this computer, url one on the web. Nothing changed.");
            }

            return downloadedImage(root, context, world, page, url);
        }

        if (file === "") {
            return removeImage(root, context, world, page, imageFile(root, context, ownImage(page)));
        }

        return setImage(root, context, world, page, resolve(context.folder, file));
    },

    format(result)
    {
        if (result.paint !== undefined) {
            const how = result.askTool === true ? askToolText(result.page) : paintText(result.page, result.tool);
            return `${result.instead === undefined ? "" : `${result.instead} `}${how}\n\n${result.paint}`;
        }

        if (result.making === true) {
            return `${result.page}'s picture is being made, in a minute or so: the player's dashboard shows it when it comes. Go on with the story.`;
        }

        if (result.image !== undefined) {
            const now = `${result.page}'s picture is now ${result.image}${result.from === undefined ? "" : `, copied from ${result.from}`}.`;
            return result.instead === undefined ? now : `${now} ${result.instead}`;
        }

        const shown = result.inheritedFrom === undefined ? "it has none now" : `it shows the picture of ${result.inheritedFrom}`;
        return result.changed ? `${result.page} has no picture of its own any more: ${shown}.` : `${result.page} has no picture of its own: ${shown}.`;
    },
});

/** Copies a picture into the campaign's images folder and links it in the page; the page's old picture goes when nothing else links it. */
function setImage(root: string, context: Context, world: World, page: Page, from: string): ImageResult
{
    return placeImage(root, context, world, page, readImage(from), from);
}

/**
 * The picture at an https address, as an image tool gives it (T-222), downloaded by the engine where the master has no shell, then taken as a file is.
 * The address itself is neither logged nor kept: a signed one is a key.
 */
async function downloadedImage(root: string, context: Context, world: World, page: Page, url: string): Promise<ImageResult>
{
    if (!/^https:\/\/[^\s/]+/i.test(url)) {
        throw new Error("url takes the https address of the picture, as your image tool gives it, and that is not one: give the full https address, or the picture's file. Nothing changed.");
    }

    if (context.download === undefined) {
        throw new Error("Here the engine cannot download: download the picture yourself and give it with file and its full path. Nothing changed.");
    }

    const signal = context.signal === undefined ? AbortSignal.timeout(longestDownload) : AbortSignal.any([context.signal, AbortSignal.timeout(longestDownload)]);
    const bytes = await context.download(url, largestImage, signal).catch((error: unknown) => {
        const why = error instanceof Error ? error.message : String(error);
        throw new Error(`No picture came from the address: ${why} If it expired, as signed addresses do, ask your image tool for a new one. Nothing changed.`);
    });

    return placeImage(root, context, world, page, imageOfBytes(bytes, "What the address gave"));
}

/** Writes a picture into the campaign's images folder and links it in the page, logging it; `from` is the file it was read from, if any. */
export function placeImage(root: string, context: Context, world: World, page: Page, picture: ReadImage, from?: string): ImageResult
{
    if ("problem" in picture) {
        throw new Error(`${picture.problem} Nothing changed.`);
    }

    const old = imageFile(root, context, ownImage(page));
    const target = join(root, imagesFolderName, `${page.name}.${picture.extension}`);
    const copied = from !== undefined && resolve(target) !== from;

    if (from === undefined || copied) {
        files().writeBytes(target, picture.bytes);
    }

    writePage(world, page.name, undefined, { set: { image: imageLink(`${page.name}.${picture.extension}`) } });
    removeUnused(root, world, page, old, target);
    appendLogEntry(root, newDatedLogEntry(root, context, "image-set", "public", { page: page.name, image: shownPath(root, target) }));
    return { page: page.name, image: shownPath(root, target), from: copied ? from : undefined, changed: true };
}

// Where nothing makes the picture, the player may give one of their own (D-572 (3)).
const playerGives = "ask the player for one of their own, given on the page in their dashboard or dropped in the campaign's inbox folder";

// How long a picture's download may take: a few megabytes come in seconds.
const longestDownload = 60 * 1000;

/** Why a page of the game system takes no picture, and how to give one: to a page of the campaign that derives from it, which a creature's scenes then bring in. */
function systemRefusal(page: Page): string
{
    const readOnly = `${page.name} is ${withArticle(page.type ?? "page")} of the game system ${page.system}: read-only.`;

    if (page.type === "creature") {
        return `${readOnly} Write a creature of the campaign that derives from it: write "<name>", type creature, set creature=[[${page.name}]]; `
            + `give that its picture with image, and bring it into scenes in place of ${page.name}, as creatures "<name>"=2.`;
    }

    const [type, base] = page.type === "item" ? ["item", "item"] : ["character", "creature"];
    return `${readOnly} Give the picture to a page of the campaign that derives from it, such as one made with write "Grak", type ${type}, set ${base}=[[${page.name}]]; then image Grak with the file.`;
}

/** Why a copy in the open scene takes no picture of its own: it shows its creature's, one for all its copies (D-420); undefined when no copy has the name. */
function copyRefusal(root: string, world: World, name: string): string | undefined
{
    const copy = Object.entries(readOpenScene(root).scene?.copies ?? {}).find(([copyName]) => comparableText(copyName) === comparableText(parsePageReference(name).name));

    if (copy === undefined) {
        return undefined;
    }

    const creature = findPage(world, parsePageReference(copy[1].creature).name);
    const kind = creature?.name ?? parsePageReference(copy[1].creature).name;
    const own = `${copy[0]} is a copy of ${kind} in the scene, and shows its creature's picture, one for all its copies.`;
    return creature?.system === undefined ? `${own} Give it to ${kind}: image ${kind}, with file or describe.` : `${own} ${systemRefusal(creature)}`;
}

/**
 * A place's picture made from what the party sees, a quest's from what the character knows of it, the portrait of one of the party as the player described
 * them, or the token of a character or a kind of creature met, from what the character sees (D-308, D-388, D-408, D-420, PIC-1–PIC-3), where the campaign's
 * setting allows it and this computer can: in the MCP server it comes by itself while the story goes on, and the master's next call says whether another
 * maker drew it or none came (D-572); on the command line the command waits for it. A refusal is never tried again.
 */
function madePicture(root: string, context: Context, world: World, page: Page, seen: string): ImageResult | Promise<ImageResult>
{
    const kind = page.type === "place" || page.type === "quest" || page.type === "creature" ? page.type : page.type === "character" ? "portrait" : undefined;

    if (kind === undefined) {
        throw new Error(`describe makes pictures of places, quests, characters and creatures, and ${page.name} is ${withArticle(page.type ?? "free page")}: give a picture of it with file. Nothing changed.`);
    }

    const setting = readSettings(root).pictures;

    if (setting === undefined || setting === "none") {
        throw new Error(
            `The campaign makes no pictures (pictures: ${setting ?? "not chosen"}): ask the player whether they want them, then config pictures: new elements, on request or none. Nothing changed.`,
        );
    }

    const ready = context.pictures?.ready(true) ?? { ready: false as const, why: "Nothing on this computer makes pictures" };

    if (!ready.ready || context.pictures === undefined) {
        throw new Error(`${ready.ready ? "Nothing on this computer makes pictures" : ready.why}. If your own tools make pictures, make one and give it with file; else ${playerGives}, or go on without. Nothing changed.`);
    }

    const unseen = [...readListSetting(root, "lines"), ...readListSetting(root, "veils")];
    const { name, who } = kind === "place" || kind === "quest" ? { name: page.name } : isPartyMember(page) ? { name: page.name, who: portraitWho(root, context, world, page) } : metWho(root, world, page);
    const subject: PictureSubject = { kind, name, ...(who === undefined ? {} : { who }), seen, unseen };
    const paint = context.pictures.brief?.(subject);

    // The chat paints it itself, with its own tool or one it names.
    if (paint !== undefined) {
        const instead = ready.instead === undefined ? {} : { instead: insteadText(page.name, ready.instead, false) };
        const tool = ready.askTool === true ? { askTool: true as const } : ready.tool === undefined ? {} : { tool: ready.tool };
        return { page: page.name, changed: false, paint, ...tool, ...instead };
    }

    const making = context.pictures.make(subject).then((made) => {
        if ("refused" in made) {
            appendLogEntry(root, newDatedLogEntry(root, context, "image-refused", "hidden", { page: page.name, why: made.refused }));
            throw new Error(`No picture of ${page.name}: ${made.refused}. Give one with file, or ${playerGives}, or go on without.`);
        }

        try {
            const world = campaignWorld(root, context);
            const now = world.pages.find((candidate) => candidate.path === page.path) ?? page;
            // Codex's own copy goes once copied: the picture is the campaign's.
            return { ...setImage(root, context, world, now, made.file), from: undefined, ...(made.instead === undefined ? {} : { instead: insteadText(page.name, made.instead, true) }) };
        } finally {
            made.done();
        }
    });

    if (context.files === undefined) {
        return making;
    }

    // The MCP server lives on: the picture comes by itself, the dashboard shows it, and the master's next call hears what went otherwise.
    void making.then(
        (made) => {
            if (made.instead !== undefined) {
                context.later?.add(made.instead);
            }
        },
        (error: unknown) => context.later?.add(error instanceof Error ? error.message : String(error)),
    );
    return { page: page.name, changed: false, making: true };
}

/** Why the chat in use made a picture, or makes it, in place of the maker the player chose, for the master (D-572). */
function insteadText(name: string, instead: PictureFallback, made: boolean): string
{
    const why = `${instead.maker} ${instead.refused === true ? "refused" : "could not make"} ${name}'s picture: ${instead.why.replace(/\.$/, "")}.`;
    return made ? `${why} ${instead.by} made it instead.` : why;
}

/** How the master makes a picture from its brief: with their own image tool, with ElevenLabs's, or with the one the player named (D-390, D-572). */
function paintText(page: string, tool: string | undefined): string
{
    const give = giveText(page);

    if (tool === undefined) {
        return `Make ${page}'s picture yourself with your own image tool, from this brief, then ${give}; if your tool makes none, go on without.`;
    }

    if (tool === "ElevenLabs") {
        return `Make ${page}'s picture with your ElevenLabs image tool, from this brief: one picture (generations_count 1). Its view shows the player the progress, but the game needs the finished file: `
            + `ask for the generation again every 15 seconds or so until it is completed, then give its full-resolution address with image, page ${page}, url, or download it and give file. `
            + `If your ElevenLabs tools make no pictures, tell the player to add the full ElevenLabs connector, a custom connector at https://api.elevenlabs.io/v1/mcp; if it fails, tell them why and go on without.`;
    }

    return `Make ${page}'s picture with ${tool}, from this brief, then ${give}; if it makes none, tell the player why and go on without.`;
}

/** What the master does where the player chose another image tool without naming it (D-572): asks which, writes it, then makes the picture with it. */
function askToolText(page: string): string
{
    return `The player chose another image tool for the pictures and has not named it: ask them which, set its name with config pictures-by, then make ${page}'s picture with it from this brief `
        + `and ${giveText(page)}; if they have none, go on without.`;
}

/** How the master gives the picture its tool made: its file, or the address the tool gives where they cannot download it (T-222). */
function giveText(page: string): string
{
    return `give it with image, page ${page}, file and its full path, or url and its https address where the tool gives one you cannot download`;
}

/** What the game says one of the party is, for their portrait (D-408): what their page derives from, as their people, and the line under their name. */
function portraitWho(root: string, context: Context, world: World, page: Page): string | undefined
{
    const said = [baseChain(world, page).map((base) => base.name).join(", "), sheetHeadline(world, campaignSystem(root, context), page) ?? ""].filter((part) => part !== "");
    return said.length === 0 ? undefined : said.join("; ");
}

/**
 * How the brief names one met (D-420): by their name and what they derive from only as far as the player character knows them, so that the picture never tells
 * what it does not know; else as someone, or a creature, with only what is seen.
 */
function metWho(root: string, world: World, page: Page): { name: string; who?: string; }
{
    const knowledge = playerKnowledge(root, world);
    const known = (one: Page): boolean => knowledge !== undefined && knowsPage(knowledge, one);
    const bases = baseChain(world, page).filter(known).map((base) => base.name).join(", ");
    return { name: known(page) ? page.name : page.type === "creature" ? "a creature" : "someone", ...(bases === "" ? {} : { who: bases }) };
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
