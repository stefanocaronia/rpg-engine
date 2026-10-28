// The mark of the process that does a piece of work alone, as reading the library or running an import (LIB-3): one process takes it at a time, and a mark
// left by a process that is gone is taken over.
import { linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Takes the mark for this process: true once it holds it, as it may already; false while another live process does. */
export function claimMark(file: string): boolean
{
    mkdirSync(dirname(file), { recursive: true });
    // The mark is written whole beside it, then linked in place at once: never seen empty, and only one process links it.
    const own = `${file}.${process.pid}`;
    writeFileSync(own, String(process.pid));

    try {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                linkSync(own, file);
                return true;
            } catch (error) {
                if (!["EEXIST", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) {
                    throw error;
                }
            }

            const holder = markHolder(file);

            if (holder !== undefined) {
                return holder === process.pid;
            }

            // A mark left by a process that is gone, taken away once, and only while it is still that one: another process may have just put its own.
            dropStaleMark(file);
        }

        return false;
    } finally {
        rmSync(own, { force: true });
    }
}

/** The live process that holds the mark, this one included; undefined when none does. */
export function markHolder(file: string): number | undefined
{
    let holder: number;

    try {
        holder = Number(readFileSync(file, "utf8"));
    } catch {
        return undefined;
    }

    return Number.isInteger(holder) && holder > 0 && isAlive(holder) ? holder : undefined;
}

/** Lets the mark go, when this process holds it. */
export function releaseMark(file: string): void
{
    if (markHolder(file) === process.pid) {
        rmSync(file, { force: true });
    }
}

/** Whether a process of this computer is still running. */
export function isAlive(pid: number): boolean
{
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM";
    }
}

function dropStaleMark(file: string): void
{
    try {
        const stale = readFileSync(file, "utf8");

        if (!isAlive(Number(stale)) && readFileSync(file, "utf8") === stale) {
            rmSync(file, { force: true });
        }
    } catch {
        // Gone already, or taken away by another process at the same time.
    }
}
