import { basename } from "node:path";
import type { Context } from "../core/context.ts";
import type { Problem } from "../core/problem.ts";
import { findImage, imageFileName } from "../images/index.ts";
import { baseChain, ownField, type Page, type World } from "../pages/index.ts";
import { campaignSystem } from "./game-world.ts";

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

/** The picture a page shows, as the name of its file: its own, or that of the first page it derives from that has one (D-267); undefined when no images folder has it. */
export function shownImage(root: string, context: Context, world: World, page: Page): string | undefined
{
    const holder = [page, ...baseChain(world, page)].find((source) => imageFileName(ownImage(source)) !== undefined);
    const file = holder === undefined ? undefined : imageFile(root, context, ownImage(holder));
    return file === undefined ? undefined : basename(file);
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
