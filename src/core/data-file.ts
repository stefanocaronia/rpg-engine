// The small JSON files of the player's data folder on this computer, apart from any campaign: places, lists and notes. Each is written whole beside itself,
// then moved over, so that a reader never finds it half written; for the player alone to read where the system has modes, as a place with its token.
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// How often a file another process is moving over at the same moment is tried again, and how long apart, before this write is let go.
const tries = 20;
const pause = new Int32Array(new SharedArrayBuffer(4));
const tryAgainAfter = 10;

/** A data file's JSON; undefined where it is missing or does not read. A mark of order at its start, as some editors write, is no part of it. */
export function readDataFile(file: string): unknown
{
    try {
        return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as unknown;
    } catch {
        return undefined;
    }
}

/**
 * Writes a data file as JSON, its folder made where missing. Several processes may write it at once: the last one's stays, and a write that still finds it
 * held after a few tries is let go, never thrown. A folder or a disk that cannot be written throws, with the system's error.
 */
export function writeDataFile(file: string, content: unknown): void
{
    mkdirSync(dirname(file), { recursive: true });
    // A name of this write's own, and a new file each time, so that its mode is the one given.
    const written = `${file}.${process.pid}-${randomBytes(4).toString("hex")}.new`;
    writeFileSync(written, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 });

    for (let attempt = 1; attempt <= tries; attempt++) {
        try {
            renameSync(written, file);
            return;
        } catch (error) {
            if (!["EPERM", "EBUSY", "EACCES", "ENOENT"].includes((error as NodeJS.ErrnoException).code ?? "")) {
                rmSync(written, { force: true });
                throw error;
            }

            Atomics.wait(pause, 0, 0, tryAgainAfter);
        }
    }

    rmSync(written, { force: true });
}

/** Takes a data file away; nothing where it is gone already. */
export function removeDataFile(file: string): void
{
    rmSync(file, { force: true });
}
