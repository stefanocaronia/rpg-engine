// The log of a campaign's table: what `rpg table` says it does, a line at a time with its time, in a file beside its place in the player's data folder. A
// table started with no terminal, as from the launcher, leaves no other trace. It holds what the table says of itself, never a word of the chat; and it
// stays short: once the file is full it takes the place of the one before it, so a campaign keeps two at most.
import { appendFileSync, existsSync, renameSync, statSync } from "node:fs";
import { makeTablesFolder, tableFile } from "./place.ts";

// A file is full at about a thousand lines; a line is cut where an error with its stack would long have ended.
const fullAt = 128 * 1024;
const longestLine = 4000;

/** The file of the log of a campaign's table, in the engine's data folder on this computer. */
export function tableLogFile(home: string, root: string): string
{
    return tableFile(home, root, ".log");
}

/** The file of the log of a campaign's table once a table of it wrote one; undefined where none did. */
export function tableLogWritten(home: string, root: string): string | undefined
{
    const file = tableLogFile(home, root);
    return existsSync(file) ? file : undefined;
}

/**
 * What writes a line in the log of a campaign's table, the time before it where the line starts with none: the file full, `fullAt` bytes, becomes the one
 * before it first. It never throws: where the file cannot be written, as on a full disk, the table goes on without it.
 */
export function tableLog(home: string, root: string, now: () => number = Date.now, full = fullAt): (line: string) => void
{
    const file = tableLogFile(home, root);
    const before = tableFile(home, root, ".old.log");

    return (line) => {
        try {
            makeTablesFolder(home);

            if ((statSync(file, { throwIfNoEntry: false })?.size ?? 0) >= full) {
                renameSync(file, before);
            }

            const timed = /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(line) ? line : `${new Date(now()).toISOString()} ${line}`;
            appendFileSync(file, `${timed.slice(0, longestLine)}\n`, { mode: 0o600 });
        } catch {
            // A log that cannot be written is no reason to stop a table.
        }
    };
}
