import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** A game system's folder and the name a campaign gives it. */
export interface SystemFolder
{
    name: string;
    folder: string;
}

/**
 * The folders of the game systems in these folders, nearest folder first, each with a system.yaml: those the engine ships, by their folder's name, and those
 * npm installed (D-485), in a scope's folder too and linked from a folder, by their package's name without its scope and its "system-" (@someone/system-pf2e
 * is pf2e).
 */
export function systemFolders(folders: string[]): SystemFolder[]
{
    const found: SystemFolder[] = [];

    for (const folder of folders.filter((candidate) => existsSync(candidate))) {
        for (const entry of children(folder)) {
            const inScope = entry.startsWith("@") ? children(join(folder, entry)).map((child) => join(entry, child)) : [entry];

            for (const path of inScope) {
                const name = path.split(/[\\/]/).at(-1)?.replace(/^system-/, "") ?? path;

                if (existsSync(join(folder, path, "system.yaml"))) {
                    found.push({ name, folder: join(folder, path) });
                }
            }
        }
    }

    return found;
}

/** The folders and the links to folders inside a folder, in order of name. */
function children(folder: string): string[]
{
    return readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory() || entry.isSymbolicLink()).map((entry) => entry.name).sort((first, second) => (first < second ? -1 : 1));
}
