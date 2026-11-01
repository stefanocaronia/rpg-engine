import { isReservedName } from "../core/archive-paths.ts";

/** The adventure's title as the name of its folders in the campaign (ADV-3): without what a file name cannot hold; it throws when nothing is left. */
export function adventureFolderName(title: string): string
{
    const name = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/[. ]+$/, "").trim();

    if (name === "" || isReservedName(name)) {
        throw new Error(`The title ${title} gives no name a folder can have: give the adventure another title. Nothing changed.`);
    }

    // As a page's name, so that the paths of its pages stay within what Windows writes.
    if (name.length > 120) {
        throw new Error(`The title ${title.slice(0, 40)}… is longer than 120 characters, too long for a folder's name: give the adventure a shorter title, as the title of its adventure.yaml. Nothing changed.`);
    }

    return name;
}

/** Where a file of the adventure goes in the campaign (ADV-3): pages under their type's folder, the rest under a folder of the adventure's own. */
export function adventureTarget(path: string, folder: string): string
{
    const parts = path.split("/");
    return parts[0] === "world" && parts.length > 2 ? [parts[0], parts[1], folder, ...parts.slice(2)].join("/") : [parts[0], folder, ...parts.slice(1)].join("/");
}
