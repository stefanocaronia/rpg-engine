// The library's folders on this computer (D-491 (1), LIB-1): those the player allowed, once for all their campaigns, kept beside the books' index; each
// campaign turns on those it uses. A folder taken off the computer takes its books' text with it.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isWithin, pathKey, replaceFile } from "./books.ts";

/**
 * The folders and books on this computer's library, as the player added them; none when there is no list yet. Refused when the list does not read, as one
 * changed by hand: never taken for an empty one, which would drop every book's text.
 */
export function libraryFolders(folder: string): string[]
{
    const file = foldersFile(folder);
    let text: string;

    try {
        text = readFileSync(file, "utf8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return [];
        }

        throw error;
    }

    const folders = listedFolders(text);

    if (folders === undefined) {
        throw new Error(`The list of the library's folders on this computer, ${file}, does not read: fix it, or delete it and add the folders again. Nothing changed.`);
    }

    return folders;
}

/** Writes the computer's library, whole or not at all. */
export function saveLibraryFolders(folder: string, entries: string[]): void
{
    const file = foldersFile(folder);
    mkdirSync(folder, { recursive: true });
    writeFileSync(`${file}.${process.pid}.tmp`, JSON.stringify({ folders: entries }, undefined, 2));
    replaceFile(`${file}.${process.pid}.tmp`, file);
}

/** Drops the index of each book that is in none of these entries: the text of a folder taken off the computer goes with it. */
export function dropUnlisted(folder: string, entries: string[]): void
{
    for (const name of existsSync(folder) ? readdirSync(folder) : []) {
        const path = name.endsWith(".json") && name !== foldersName ? indexedPath(join(folder, name)) : undefined;

        if (path !== undefined && !entries.some((entry) => isWithin(entry, path))) {
            rmSync(join(folder, name), { force: true });
        }
    }
}

/** Whether two paths are the same, however written: in any case on Windows. */
export function samePath(one: string, other: string): boolean
{
    return pathKey(one) === pathKey(other);
}

const foldersName = "folders.json";

function foldersFile(folder: string): string
{
    return join(folder, foldersName);
}

/** The path of the book an index file is of; none for a file that is no index. */
function indexedPath(file: string): string | undefined
{
    try {
        const value = JSON.parse(readFileSync(file, "utf8")) as { format?: unknown; path?: unknown; };
        return value.format === 1 && typeof value.path === "string" ? value.path : undefined;
    } catch {
        return undefined;
    }
}

function listedFolders(text: string): string[] | undefined
{
    try {
        const value = JSON.parse(text) as { folders?: unknown; };
        return Array.isArray(value.folders) && value.folders.every((entry) => typeof entry === "string") ? value.folders as string[] : undefined;
    } catch {
        return undefined;
    }
}
