import { basename } from "node:path";
import { readSettings } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import type { Problem } from "../core/problem.ts";
import { files } from "../core/store.ts";
import { findImage, imageFileName } from "../images/index.ts";
import { baseChain, isPartyMember, ownField, type Page, type World } from "../pages/index.ts";
import { campaignSystem } from "./game-world.ts";

/**
 * What the master hears of the places' pictures (D-308, PIC-4): where pictures can be made and the player has not chosen, to ask them once; with new elements, that
 * the place the party is in, still without a picture, should get one. Nothing otherwise.
 */
export function picturesNote(root: string, context: Context, world: World, place: Page | undefined): string | undefined
{
    const setting = readSettings(root).pictures;

    if (setting === undefined) {
        const ready = context.pictures?.ready();
        return ready?.ready === true
            ? `Pictures: this computer can make the pictures of places, quests and those met with the player's ${
                ready.maker === "Claude" ? "Claude Code" : "Codex"
            }, which spends their plan: ask them once whether they want one for each new place, quest and one met, only those they ask for, or none; then config pictures (new elements, on request or none).`
            : undefined;
    }

    if (setting !== "new elements" || place === undefined || place.type !== "place" || shownImage(root, context, world, place) !== undefined) {
        return undefined;
    }

    return `${place.name} has no picture: once you have told it, have one made with image, page ${place.name}, describe what the party sees arriving, never what they cannot see.`;
}

/** What the master hears as a quest opens without a picture, where the campaign wants one for each new quest (D-388); undefined otherwise. */
export function questPictureNote(root: string, context: Context, world: World, quest: Page): string | undefined
{
    return readSettings(root).pictures === "new elements" && shownImage(root, context, world, quest) === undefined
        ? `${quest.name} has no picture: have one made with image, page ${quest.name}, describe the quest as the character knows it, never what they do not know.`
        : undefined;
}

/**
 * What the master hears as characters and creatures enter a scene without a picture of their own, where the campaign wants one for each one met (D-420, PIC-4):
 * one line, with the advice to write a creature of the campaign for one of the game system, which is read-only; undefined when all have one, or otherwise.
 */
export function metPictureNote(root: string, context: Context, entering: Page[]): string | undefined
{
    if (readSettings(root).pictures !== "new elements") {
        return undefined;
    }

    const met = entering.filter((page) => !isPartyMember(page));
    const own = met.filter((page) => page.system === undefined && imageFile(root, context, ownImage(page)) === undefined).map((page) => page.name);
    // A creature of the game system has at most its system's icon: the campaign's own creature takes the picture.
    const system = met.filter((page) => page.system !== undefined).map((page) => page.name);
    const make = own.length === 0 ? [] : [`No picture yet of ${own.join(", ")}: have each made with image, page and describe, what the character sees, never what it does not know.`];
    const write = system.length === 0
        ? []
        : [`${system.join(", ")} ${system.length === 1 ? "is" : "are"} of the game system: for a picture, write a creature of the campaign from it, as write "<name>", type creature, set creature=[[${system[0]}]], and bring that in.`];
    return make.length + write.length === 0 ? undefined : [...make, ...write].join(" ");
}

/** The folders whose images folder holds the pictures pages link: the campaign's first, then its game system's (D-267). */
export function imageFolders(root: string, context: Context): string[]
{
    const system = campaignSystem(root, context);
    return system === undefined ? [root] : [root, system.folder];
}

/** The picture an image field links, as a file; undefined when the field is not a link or no images folder has the file. */
export function imageFile(root: string, context: Context, value: unknown): string | undefined
{
    const name = imageFileName(value);
    return name === undefined ? undefined : findImage(imageFolders(root, context), name);
}

/**
 * The picture a page shows, as the name of its file and when it last changed: its own, or that of the first page it derives from that has one (D-267), among
 * the bases `known` takes (D-277); undefined when no images folder has it.
 */
export function shownImage(root: string, context: Context, world: World, page: Page, known: (base: Page) => boolean = () => true): { file: string; version: number; } | undefined
{
    const holder = [page, ...baseChain(world, page).filter(known)].find((source) => imageFileName(ownImage(source)) !== undefined);
    const file = holder === undefined ? undefined : imageFile(root, context, ownImage(holder));
    return file === undefined ? undefined : { file: basename(file), version: Math.trunc(files().modified(file) ?? 0) };
}

/** The page's own image field, as written; undefined when it has none. */
export function ownImage(page: Page): unknown
{
    const field = ownField(page, "image");
    return field === undefined ? undefined : page.fields[field];
}

/** The pages of the campaign whose own image field links a file that no images folder has. */
export function imageProblems(root: string, context: Context, world: World): Problem[]
{
    const folders = imageFolders(root, context);
    return world.pages.filter((page) => page.system === undefined).flatMap((page) => {
        const field = ownField(page, "image");
        const name = field === undefined ? undefined : imageFileName(page.fields[field]);

        if (name === undefined || findImage(folders, name) !== undefined) {
            return [];
        }

        return [{
            path: page.path,
            message: `image links ${name}, which is in no images folder, of the campaign or of its game system.`,
            fix: `give ${page.name} its picture again with image, or write the name of a file in images/`,
        }];
    });
}
