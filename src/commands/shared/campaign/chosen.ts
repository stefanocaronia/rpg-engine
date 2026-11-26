// What the engine reads outside the campaign only as the player chose it (D-589 (2)): the master's path alone is never enough.
import { basename } from "node:path";
import { readTextSetting } from "../../../campaign/index.ts";
import type { Context } from "../../../core/context.ts";
import { realPath } from "../../../core/files.ts";
import { samePath } from "../../../core/paths.ts";
import { isInside } from "../../../core/store.ts";
import { windowYes } from "../../package/consent.ts";

/** What the window asks the player, and what the master hears where none can be shown: how the player gives it instead. */
export interface OutsideRead
{
    title: string;
    /** What the engine does with it, after "RPG Engine asks to read <path>, ". */
    purpose: string;
    /** What the player can do instead, after "they can ". */
    instead: string;
}

/**
 * Lets the engine read `path`, a file or a folder, where the player chose it: inside the campaign (`root`), its inbox too, as the path really is through any
 * link; typed by the player in their own terminal; or allowed in a window of their computer. It throws, saying what the player can do, otherwise.
 */
export async function readChosen(root: string | undefined, context: Context, path: string, read: OutsideRead): Promise<void>
{
    const real = realPath(path);
    const campaign = root === undefined ? undefined : realPath(root);

    if (context.terminal === true || (campaign !== undefined && (samePath(campaign, real) || isInside(campaign, real)))) {
        return;
    }

    const name = root === undefined ? undefined : readTextSetting(root, "name") ?? basename(root);
    const question = `RPG Engine asks to read ${path}, ${read.purpose}${name === undefined ? "" : `, for the game master of ${name}`}. Nothing there is ever changed. Allow it?`;
    await windowYes(
        context,
        read.title,
        question,
        `The player did not allow reading ${path}. Nothing changed: ask again only if they bring it up.`,
        `Only the player can let the engine read ${path}, outside the campaign, in a window of their computer, and none can be shown here: they can ${read.instead}. Nothing changed.`,
    );
}
