import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { packageFoldersIn } from "../core/files.ts";

/** A game system's folder and the name a campaign gives it. */
export interface SystemFolder
{
    name: string;
    folder: string;
}

/**
 * The folders of the game systems in these folders, nearest folder first, each with a system.yaml: those the engine ships, by their folder's name, and those
 * the player installed with npm (D-485), in a scope's folder too and linked from a folder, by their package's name without its scope and its "system-"
 * (@someone/system-pf2e is pf2e). A package npm brought as another's dependency is none.
 */
export function systemFolders(folders: string[]): SystemFolder[]
{
    return packageFoldersIn(folders).filter((folder) => existsSync(join(folder, "system.yaml"))).map((folder) => ({ name: basename(folder).replace(/^system-/, ""), folder }));
}
