// The files as a command sees them (D-137, D-194): each read at most once in a call, kept as its text and as what it reads as, frozen; what the command writes
// updates what is kept. A command runs inside its store, and the modules reach it with files(): the MCP server will keep one for a whole session.
import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { filesIn } from "./files.ts";
import { frozen } from "./frozen.ts";

/** What a store keeps of a file: its text, undefined when there is no file, and what it read as, by kind of reading. */
interface Kept
{
    text: string | undefined;
    readings: Map<string, { value: unknown; } | { error: unknown; }>;
}

/** The files of a call, read once and kept: a module asks for them through files(). */
export class FileStore
{
    private readonly kept = new Map<string, Kept>();
    private readonly listings = new Map<string, string[]>();

    /** The text of a file; undefined when there is none. */
    text(path: string): string | undefined
    {
        return this.entry(path).text;
    }

    /** Whether there is a file at `path`. */
    exists(path: string): boolean
    {
        return this.text(path) !== undefined;
    }

    /**
     * What a file reads as, through `parse`, by a kind of reading such as "page": kept frozen until the file changes, and a reading that failed fails again
     * the same way. Undefined when there is no file.
     */
    read<T>(path: string, kind: string, parse: (text: string) => T): T | undefined
    {
        const entry = this.entry(path);

        if (entry.text === undefined) {
            return undefined;
        }

        let reading = entry.readings.get(kind);

        if (reading === undefined) {
            try {
                reading = { value: frozen(parse(entry.text)) };
            } catch (error) {
                reading = { error };
            }

            entry.readings.set(kind, reading);
        }

        if ("error" in reading) {
            throw reading.error;
        }

        return reading.value as T;
    }

    /** The files in `folder` and in the folders inside it whose names `keep` takes, listed once. */
    files(folder: string, keep: (name: string) => boolean): string[]
    {
        const key = resolve(folder);
        let listing = this.listings.get(key);

        if (listing === undefined) {
            listing = filesIn(key, () => true);
            this.listings.set(key, listing);
        }

        return listing.filter((path) => keep(basename(path)));
    }

    /** Writes a file, with the folders it needs. */
    write(path: string, text: string): void
    {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text, "utf8");
        this.wrote(path, { text }, true);
    }

    /** Adds text at the end of a file, as the log grows. */
    append(path: string, text: string): void
    {
        const before = this.kept.get(resolve(path));
        appendFileSync(path, text, "utf8");
        // A file never read stays to be read: what is kept of it would be only its end.
        this.wrote(path, before === undefined ? undefined : { text: `${before.text ?? ""}${text}` }, true);
    }

    /** Makes a folder, with those it needs, if it is not there. */
    makeFolder(path: string): void
    {
        mkdirSync(path, { recursive: true });
    }

    /** Removes a file. */
    remove(path: string): void
    {
        rmSync(path);
        this.wrote(path, { text: undefined }, false);
    }

    private entry(path: string): Kept
    {
        const key = resolve(path);
        let entry = this.kept.get(key);

        if (entry === undefined) {
            entry = { text: readText(key), readings: new Map() };
            this.kept.set(key, entry);
        }

        return entry;
    }

    /**
     * What is kept of a file after a change: its new text and no readings, or nothing, to read it again, when its text is not known; and whether it is in the
     * listings of the folders that hold it.
     */
    private wrote(path: string, now: { text: string | undefined; } | undefined, exists: boolean): void
    {
        const key = resolve(path);

        if (now === undefined) {
            this.kept.delete(key);
        } else {
            this.kept.set(key, { text: now.text, readings: new Map() });
        }

        for (const [folder, listing] of this.listings) {
            const inside = isInside(folder, key);
            const listed = listing.includes(key);

            if (inside && exists && !listed) {
                listing.push(key);
            } else if (inside && !exists && listed) {
                listing.splice(listing.indexOf(key), 1);
            }
        }
    }
}

const running = new AsyncLocalStorage<FileStore>();

/** The store of the running command; outside one, a new store for each use, which reads the files as they are. */
export function files(): FileStore
{
    return running.getStore() ?? new FileStore();
}

/** Runs `work` with `store` as the store its modules read and write through; a command run inside another keeps that one's. */
export function withFiles<T>(store: FileStore, work: () => T): T
{
    return running.getStore() === undefined ? running.run(store, work) : work();
}

/** Whether a path is inside a folder, below it. */
function isInside(folder: string, path: string): boolean
{
    const below = relative(folder, path);
    return below !== "" && !below.startsWith("..") && !isAbsolute(below);
}

/** The text of a file, or undefined when there is none: a folder or a file that cannot be read fails as before. */
function readText(path: string): string | undefined
{
    try {
        return readFileSync(path, "utf8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return undefined;
        }

        throw error;
    }
}
