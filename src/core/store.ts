// The files as a command sees them (D-137, D-194): each read at most once in a call, kept as its text and as what it reads as, frozen; what the command writes
// updates what is kept. A command runs inside its store, and the modules reach it with files(): the MCP server will keep one for a whole session.
import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileOrder, filesIn } from "./files.ts";
import { frozen } from "./frozen.ts";

/** What a store keeps of a file: its text, undefined when there is no file, and what it read as, by kind of reading. */
interface Kept
{
    text: string | undefined;
    readings: Map<string, { value: unknown; } | { error: unknown; }>;
}

/**
 * The files of the installed game systems, kept for the whole process while none changes after it was read: a process that runs many calls, as the tests do,
 * reads and parses a system's pages once (D-194). Only a store given the systems' folders uses them.
 */
const packageFiles = new Map<string, { readAt: number; entry: Kept; }>();

// A file changed this close to its reading may change again within the same tick of the disk's clock: it is read again until it is older, as git does.
const racyMilliseconds = 2000;

/** The files of a call, read once and kept: a module asks for them through files(). */
export class FileStore
{
    protected readonly kept = new Map<string, Kept>();
    private readonly packages: string[];
    protected readonly listings = new Map<string, string[]>();
    private readonly remembered = new Map<string, { value: unknown; dependsOn: (path: string) => boolean; }>();

    /** `packages` are the folders of the installed game systems, whose files the process keeps from one call to the next while they do not change. */
    constructor(packages: string[] = [])
    {
        this.packages = packages.map((folder) => resolve(folder));
    }

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
            this.onKept(key);
        }

        return listing.filter((path) => keep(basename(path)));
    }

    /** The files and folders right inside `folder`, as they are now, by name; none when there is no such folder. */
    entries(folder: string): { name: string; isFolder: boolean; }[]
    {
        return existsSync(folder) && statSync(folder).isDirectory()
            ? readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile() || entry.isDirectory()).map((entry) => ({ name: entry.name, isFolder: entry.isDirectory() }))
            : [];
    }

    /** A file's bytes as they are now, as a save holds them; undefined when there is no file. */
    bytes(path: string): Uint8Array | undefined
    {
        return existsSync(path) ? new Uint8Array(readFileSync(path)) : undefined;
    }

    /** The text of a file as it is now, for a command about to write it: in a call, the text the call reads; a session checks the disk (D-193). */
    fresh(path: string): string | undefined
    {
        return this.text(path);
    }

    /** Keeps the files of a campaign up to date for later calls: only the store of a session does (D-193). */
    track(_root: string): void
    {
    }

    /** A file, or the listing of a folder, that the store keeps from now on: a session tells what lasts from a call to the next (D-193). */
    protected onKept(_path: string): void
    {
    }

    /**
     * A value built from the files, such as the world, kept until something changes that `dependsOn` takes: a file, or a folder that may hold one. A build
     * that fails is not kept.
     */
    remember<T>(key: string, dependsOn: (path: string) => boolean, build: () => T): T
    {
        const kept = this.remembered.get(key);

        if (kept !== undefined) {
            return kept.value as T;
        }

        const value = build();
        this.remembered.set(key, { value, dependsOn });
        return value;
    }

    /** Writes a file, with the folders it needs. */
    write(path: string, text: string): void
    {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text, "utf8");
        this.changed(path, { text }, true);
        markWritten();
    }

    /** Writes a file's bytes as they are, with the folders it needs, as a save gives them back: what the store kept of it is read again. */
    writeBytes(path: string, bytes: Uint8Array): void
    {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, bytes);
        this.changed(path, undefined, true);
        markWritten();
    }

    /** Adds text at the end of a file, as the log grows. */
    append(path: string, text: string): void
    {
        const before = this.kept.get(resolve(path));
        appendFileSync(path, text, "utf8");
        // A file never read stays to be read: what is kept of it would be only its end.
        this.changed(path, before === undefined ? undefined : { text: `${before.text ?? ""}${text}` }, true);
        markWritten();
    }

    /** Makes a folder, with those it needs, if it is not there. */
    makeFolder(path: string): void
    {
        mkdirSync(path, { recursive: true });
    }

    /** How many bytes a file has, as the disk says now, without reading it; undefined when there is none. */
    size(path: string): number | undefined
    {
        return existsSync(path) && statSync(path).isFile() ? statSync(path).size : undefined;
    }

    /** When a file last changed, in milliseconds, as the disk says now; undefined when there is none. */
    modified(path: string): number | undefined
    {
        return existsSync(path) ? statSync(path).mtimeMs : undefined;
    }

    /** Removes a file. */
    remove(path: string): void
    {
        rmSync(path);
        this.changed(path, { text: undefined }, false);
        markWritten();
    }

    protected entry(path: string): Kept
    {
        const key = resolve(path);
        let entry = this.kept.get(key);

        if (entry === undefined) {
            entry = this.packageEntry(key) ?? { text: readText(key), readings: new Map() };
            this.kept.set(key, entry);
            this.onKept(key);
        }

        return entry;
    }

    /**
     * A file of an installed game system as the process last read it, while it has not changed since, nor in the two seconds before; undefined for any other
     * file. The first reading asks the disk nothing more: a call from the command line, the only one of its process, pays nothing for it.
     */
    private packageEntry(path: string): Kept | undefined
    {
        if (!this.packages.some((folder) => isInside(folder, path))) {
            return undefined;
        }

        const known = packageFiles.get(path);

        if (known !== undefined && !changedSince(path, known.readAt - racyMilliseconds)) {
            return known.entry;
        }

        const readAt = Date.now();
        const entry: Kept = { text: readText(path), readings: new Map() };
        packageFiles.set(path, { readAt, entry });
        return entry;
    }

    /**
     * What is kept of a file after a change: its new text and no readings, or nothing, to read it again, when its text is not known; whether it is in the
     * listings of the folders that hold it; and no value remembered from it.
     */
    protected changed(path: string, now: { text: string | undefined; } | undefined, exists: boolean): void
    {
        const key = resolve(path);

        if (now === undefined) {
            this.kept.delete(key);
        } else {
            this.kept.set(key, { text: now.text, readings: new Map() });
            this.onKept(key);
        }

        this.forgetBuiltFrom(key);

        for (const [folder, listing] of this.listings) {
            const inside = isInside(folder, key);
            const listed = listing.includes(key);

            if (inside && exists && !listed) {
                listing.push(key);
                listing.sort(fileOrder);
            } else if (inside && !exists && listed) {
                listing.splice(listing.indexOf(key), 1);
            }
        }
    }

    /** Forgets what it keeps of a folder's files and listings, and the values remembered from them, as after another program wrote there, npm installing a package (D-436). */
    refresh(folder: string): void
    {
        const root = resolve(folder);
        const within = (path: string): boolean => path === root || isInside(root, path);
        [...this.kept.keys()].filter(within).forEach((path) => this.kept.delete(path));
        [...this.listings.keys()].filter((path) => within(path) || isInside(path, root)).forEach((path) => this.listings.delete(path));
        this.forgetBuiltFrom(root);
    }

    /** Forgets the values remembered from a file. */
    protected forgetBuiltFrom(path: string): void
    {
        for (const [key, value] of this.remembered) {
            if (value.dependsOn(path)) {
                this.remembered.delete(key);
            }
        }
    }
}

// The running call: its store, and whether it wrote a file yet, its own even when a session's store serves several calls at once (D-196).
const running = new AsyncLocalStorage<{ store: FileStore; wrote: boolean; }>();

/** The store of the running command; outside one, a new store for each use, which reads the files as they are. */
export function files(): FileStore
{
    return running.getStore()?.store ?? new FileStore();
}

/** Runs `work` with `store` as the store its modules read and write through; a command run inside another keeps that one's. */
export function withFiles<T>(store: FileStore, work: () => T): T
{
    return running.getStore() === undefined ? running.run({ store, wrote: false }, work) : work();
}

/** Whether the running call has written a file yet; false outside a call. */
export function wroteInCall(): boolean
{
    return running.getStore()?.wrote === true;
}

/** Whether a path is inside a folder, below it: a folder named like "..notes" is inside too. */
export function isInside(folder: string, path: string): boolean
{
    const below = relative(folder, path);
    return below !== "" && below !== ".." && !below.startsWith(`..${sep}`) && !isAbsolute(below);
}

/** Whether a file changed after a time, or is gone. */
function changedSince(path: string, time: number): boolean
{
    const stats = statSync(path, { throwIfNoEntry: false });
    return stats === undefined || stats.mtimeMs >= time;
}

/** The text of a file, or undefined when there is none: a folder or a file that cannot be read fails as before. */
export function readText(path: string): string | undefined
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

/** Notes that the running call wrote a file, which a stop before its next write says (D-196). */
function markWritten(): void
{
    const call = running.getStore();

    if (call !== undefined) {
        call.wrote = true;
    }
}
