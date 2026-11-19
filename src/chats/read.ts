// The chats the AI hosts keep in their own folders, outside every campaign (T-225): the only files of this module read straight from the disk.
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { filesIn } from "../core/files.ts";

/** The chat files in a host's folder, `.jsonl`, right inside it or in the folders below with `deep`; none when there is no such folder. */
export function chatFiles(folder: string, deep: boolean): string[]
{
    return existsSync(folder) ? filesIn(folder, (name) => name.endsWith(".jsonl")).filter((path) => deep || resolve(dirname(path)) === resolve(folder)) : [];
}

/** Each line of a chat file read as JSON; a line that does not read, as one being written, is left out. */
export function jsonLines(path: string): unknown[]
{
    return readFileSync(path, "utf8").split("\n").flatMap((line) => {
        try {
            return line.trim() === "" ? [] : [JSON.parse(line) as unknown];
        } catch {
            return [];
        }
    });
}

/** The first line of a chat file read as JSON, without reading the rest; undefined when it does not read. */
export function firstJsonLine(path: string): unknown
{
    const handle = openSync(path, "r");

    try {
        let text = "";
        const buffer = Buffer.alloc(65_536);

        // The first line of a long chat can hold the host's whole instructions: read until it ends, a megabyte at most.
        while (!text.includes("\n") && text.length < 1_048_576) {
            const read = readSync(handle, buffer, 0, buffer.length, null);

            if (read === 0) {
                break;
            }

            text += buffer.toString("utf8", 0, read);
        }

        return JSON.parse(text.split("\n")[0] ?? "") as unknown;
    } catch {
        return undefined;
    } finally {
        closeSync(handle);
    }
}

/** When a chat file last changed, in milliseconds. */
export function modifiedAt(path: string): number
{
    return statSync(path).mtimeMs;
}
