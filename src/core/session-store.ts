// The files as the MCP server keeps them for a whole session (D-137, D-193): what a call read of a campaign stays for the next ones, until a watcher says
// that a file changed. At the start, at every instructions, and whenever a watcher fails or cannot start, a full check compares the text of every file kept
// of the campaigns with the disk. The game systems stay as they were read: they do not change while the server runs. Anything else is read at every call.
import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { filesIn, foldersIn } from "./files.ts";
import { FileStore, isInside, readText } from "./store.ts";

/** Tells which names change in one folder, not in the folders inside it, and when it can no longer tell: Node's fs.watch, or a fake one in the tests. */
export type WatchFolder = (folder: string, changed: (name: string | undefined) => void, failed: () => void) => { close(): void; };

// The folders of a campaign below its own that hold what is kept: its pages, its house rules and its pictures. The campaign's folder holds its settings, state
// and log.
const watchedTrees = ["world", "rules", "images"];

// More changes than this between two calls, and a watcher on Linux may have lost some without a word: inotify keeps 16384 by default, then drops the rest.
const tooManyChanges = 10_000;

/** A file of a campaign changed outside the session's own writes: by hand, by another chat or by the command line (OUT-1). */
export interface OutsideChange
{
    path: string;
    /** Its text as the session kept it; undefined for a new file. */
    before?: string;
    /** Its text now; undefined for a file gone. */
    after?: string;
}

/** The files of a session of the MCP server, kept between calls and watched (D-193). */
export class SessionStore extends FileStore
{
    private readonly watchers = new Map<string, { close(): void; }>();
    private readonly roots = new Set<string>();
    private readonly reported = new Set<string>();
    private readonly passing = new Set<string>();
    private readonly changeListeners = new Set<() => void>();
    private readonly systemFolders: string[];
    private readonly watchFolder: WatchFolder;
    private checking: Promise<void> | undefined;
    private checkAll = false;
    private unwatchable = false;
    private changes = 0;
    private wrote = false;
    // The files changed outside the session since they were last taken, each with its text before; and who reads the world before they are let in (OUT-1).
    private readonly outside = new Map<string, { before: string | undefined; after?: { text: string | undefined; }; }>();
    private beforeOutside: (() => void) | undefined;

    /** `systemFolders` hold the game systems, kept for the whole session; `watchFolder` is Node's watcher, unless a test gives its own. */
    constructor(options: { systemFolders?: string[]; watchFolder?: WatchFolder; } = {})
    {
        super();
        this.systemFolders = (options.systemFolders ?? []).map((folder) => resolve(folder));
        this.watchFolder = options.watchFolder ?? watchWithNode;
    }

    /** Starts watching a campaign, the first time a call finds it; what was kept of it before is read again. */
    override track(root: string): void
    {
        const key = resolve(root);

        if (this.roots.has(key)) {
            return;
        }

        this.roots.add(key);
        this.watchFolders(key);
        this.forgetUnder(key);
    }

    /** Calls `listener` whenever a watcher sees a file of a campaign change, or loses track of one (D-272), until the function it returns is called. */
    onChange(listener: () => void): () => void
    {
        this.changeListeners.add(listener);
        return () => this.changeListeners.delete(listener);
    }

    /** Calls `hook` before the session lets in changes made outside it, while what it kept is still as it was: the world before them can be read (OUT-3). */
    beforeOutsideChanges(hook: () => void): void
    {
        this.beforeOutside = hook;
    }

    /** The files of the campaigns changed outside the session since this was last asked, with their text before and now; those back as they were are left out. */
    takeOutsideChanges(): OutsideChange[]
    {
        const taken = [...this.outside].map(([path, change]) => ({ path, before: change.before, after: change.after === undefined ? this.text(path) : change.after.text }));
        this.outside.clear();
        return taken.filter((change) => change.before !== change.after);
    }

    /**
     * Makes the store right for a call: forgets what lasts only for a call, lets the watchers' last events in and reads again the files they named; first it
     * compares every file kept with the disk when `everything` is asked, as at instructions, when a watcher failed or could not start, or after too many
     * changes. One full check runs at a time: a call that comes while one is under way waits for it.
     */
    async ready(everything = false): Promise<void>
    {
        await new Promise((done) => setImmediate(done));
        this.wrote = false;
        this.forgetPassing();

        if (everything || this.checkAll || this.unwatchable || this.changes > tooManyChanges) {
            this.checking ??= this.checkEverything().finally(() => (this.checking = undefined));
        }

        await this.checking;
        const reported = [...this.reported].map((path) => ({ path, now: readNow(path) }));
        this.reported.clear();
        this.changes = 0;
        this.noteOutside(reported.filter(({ path, now }) => this.isOutside(path, now)).map(({ path }) => path));

        for (const { path, now } of reported) {
            this.recheck(path, now);
        }
    }

    /**
     * The text on the disk, before a write. A file kept with another text was changed by hand without the store knowing: what the command worked out from it no
     * longer holds, so it stops before writing, and the next call checks everything (D-196).
     */
    override fresh(path: string): string | undefined
    {
        const now = readText(resolve(path));

        if (now !== this.text(path)) {
            this.changed(path, { text: now }, now !== undefined);
            this.checkAll = true;
            const name = this.shownPath(resolve(path));
            throw new Error(
                this.wrote
                    ? `${name} was changed by hand since this call read it, so the command stopped before writing it, after other files: look at them again with status and validate, and finish by hand only what is missing.`
                    : `${name} was changed by hand since this call read it, so the command wrote nothing: look at it again, as with show or status, and repeat the command if it still fits.`,
            );
        }

        return now;
    }

    override write(path: string, text: string): void
    {
        this.freezeOutside(path);
        super.write(path, text);
        this.wrote = true;
    }

    override append(path: string, text: string): void
    {
        this.freezeOutside(path);
        super.append(path, text);
        this.wrote = true;
    }

    override writeBytes(path: string, bytes: Uint8Array): void
    {
        this.freezeOutside(path);
        super.writeBytes(path, bytes);
        this.wrote = true;
    }

    override remove(path: string): void
    {
        this.freezeOutside(path);
        super.remove(path);
        this.wrote = true;
    }

    /** Stops watching, as the server closes. */
    close(): void
    {
        for (const watcher of this.watchers.values()) {
            watcher.close();
        }

        this.watchers.clear();
    }

    /** What a call keeps outside the campaigns watched and the game systems lasts for that call only. */
    protected override onKept(path: string): void
    {
        if (!this.lasts(path)) {
            this.passing.add(path);
        }
    }

    /** Whether what is kept of a path lasts from a call to the next: a file of a campaign watched, or of a game system. */
    private lasts(path: string): boolean
    {
        return [...this.roots, ...this.systemFolders].some((folder) => path === folder || isInside(folder, path));
    }

    /** A path as messages give it: inside a campaign, from its folder. */
    private shownPath(path: string): string
    {
        const root = [...this.roots].find((folder) => isInside(folder, path));
        return root === undefined ? path : relative(root, path).replaceAll(sep, "/");
    }

    /** Forgets what lasts only for a call, such as a campaign.yaml not there yet, which another process may write: the next call reads it again. */
    private forgetPassing(): void
    {
        for (const path of [...this.passing].filter((passing) => !this.lasts(passing))) {
            this.kept.delete(path);
            this.listings.delete(path);
            this.forgetBuiltFrom(path);
        }

        this.passing.clear();
    }

    /** Watches each folder of the campaigns that holds what is kept, those that came into it too; one that cannot be watched makes every call check everything. */
    private watchFolders(root: string): void
    {
        const folders = [root, ...watchedTrees.flatMap((tree) => foldersIn(join(root, tree)))].filter((folder) => !this.watchers.has(folder));

        for (const folder of folders) {
            try {
                this.watchers.set(folder, this.watchFolder(folder, (name) => this.report(folder, name), () => this.lose(folder)));
            } catch {
                this.unwatchable = true;
            }
        }
    }

    /** A change a watcher saw: a name in its folder; without one, or with its own folder's path as Windows gives it when the folder goes, it has lost track. */
    private report(folder: string, name: string | undefined): void
    {
        this.changes++;
        this.changeListeners.forEach((listener) => listener());

        if (name === undefined || name === "" || isAbsolute(name)) {
            this.lose(folder);
            return;
        }

        this.reported.add(join(folder, name));
    }

    /** A watcher that failed: it is closed, and everything is checked at the next call. */
    private lose(folder: string): void
    {
        this.watchers.get(folder)?.close();
        this.watchers.delete(folder);
        this.checkAll = true;
        // The next call checks everything and watches the folder again: who listens calls again.
        this.changeListeners.forEach((listener) => listener());
    }

    /**
     * Whether what a watcher named changed outside the session (OUT-1): a file of a campaign kept with another text, or gone; or a new one, missing from the
     * listing of a folder that holds it. The session's own writes are kept as they are written, so they never differ.
     */
    private isOutside(path: string, now: { text: string | undefined; } | undefined): boolean
    {
        if (now === undefined || ![...this.roots].some((root) => isInside(root, path))) {
            return false;
        }

        const kept = this.kept.get(path);

        if (kept !== undefined) {
            return kept.text !== now.text;
        }

        return now.text !== undefined && [...this.listings].some(([folder, listing]) => isInside(folder, path) && !listing.includes(path));
    }

    /** Notes the files changed outside the session, with their text as it kept them; first who reads the world as it was, once for those that come together. */
    private noteOutside(paths: string[]): void
    {
        if (paths.length > 0) {
            this.beforeOutside?.();
        }

        for (const path of paths.filter((one) => !this.outside.has(one))) {
            this.outside.set(path, { before: this.kept.get(path)?.text });
        }
    }

    /** A file changed outside that the session now writes: what changed outside is what the disk had before this write, never what the session writes. */
    private freezeOutside(path: string): void
    {
        const change = this.outside.get(resolve(path));

        if (change !== undefined && change.after === undefined) {
            change.after = { text: readNow(resolve(path))?.text };
        }
    }

    /** What a watcher named: a file kept with another text, a new file or one gone; or a folder that came or went, read again and watched whole. */
    private recheck(path: string, read: { text: string | undefined; } | undefined): void
    {
        if (read === undefined) {
            // A folder, or a file being written: what is under it is read again, and a new folder is watched.
            this.forgetUnder(path);
            this.roots.forEach((root) => this.watchFolders(root));
            return;
        }

        const now = read.text;

        // Only a name that is gone may be a folder watched, or one that held what is kept: looked for only then.
        const under = `${path}${sep}`;

        if (now === undefined && (this.watchers.has(path) || [...this.kept.keys(), ...this.listings.keys(), ...this.watchers.keys()].some((other) => other.startsWith(under)))) {
            // A folder that went, renamed or removed, with all it held: only its name comes, and on Linux nothing more from its own watcher.
            this.forgetUnder(path);
            this.closeWatchersUnder(path);
            return;
        }

        const kept = this.kept.get(path);

        if (kept === undefined || kept.text !== now) {
            this.changed(path, kept === undefined ? undefined : { text: now }, now !== undefined);
        }
    }

    /** Compares every file kept of the campaigns with the disk, lists their folders again, and watches the folders that came. */
    private async checkEverything(): Promise<void>
    {
        this.reported.clear();
        this.checkAll = false;
        this.changes = 0;
        const paths = [...this.kept.keys()].filter((path) => [...this.roots].some((root) => isInside(root, path)));
        const texts = await Promise.all(paths.map((path) => readFile(path, "utf8").catch(() => undefined)));
        // The files that came into a folder listed, which the session did not write: new, outside it (OUT-1).
        const listed = [...this.listings].filter(([folder]) => [...this.roots].some((root) => folder === root || isInside(root, folder)));
        const added = listed.flatMap(([folder, listing]) => {
            const known = new Set(listing);
            return filesIn(folder, () => true).filter((path) => !known.has(path) && !this.kept.has(path));
        });
        this.noteOutside([...paths.filter((path, index) => this.kept.get(path)?.text !== texts[index]), ...new Set(added)]);

        paths.forEach((path, index) => {
            if (this.kept.get(path)?.text !== texts[index]) {
                this.changed(path, { text: texts[index] }, texts[index] !== undefined);
            }
        });

        this.roots.forEach((root) => {
            this.forgetUnder(root, false);
            this.watchFolders(root);
        });
    }

    /** Forgets what is kept under a path, the listings that may have held it, and what was built from it. `files` false keeps the files' texts. */
    private forgetUnder(path: string, files = true): void
    {
        for (const kept of [...this.kept.keys()].filter((other) => files && (other === path || isInside(path, other)))) {
            this.kept.delete(kept);
        }

        for (const listed of [...this.listings.keys()].filter((folder) => folder === path || isInside(folder, path) || isInside(path, folder))) {
            this.listings.delete(listed);
        }

        this.forgetBuiltFrom(path);
    }

    private closeWatchersUnder(path: string): void
    {
        for (const [folder, watcher] of this.watchers) {
            if (folder === path || isInside(path, folder)) {
                watcher.close();
                this.watchers.delete(folder);
            }
        }
    }
}

/** Node's watcher for one folder, which never keeps the process alive by itself. */
function watchWithNode(folder: string, changed: (name: string | undefined) => void, failed: () => void): { close(): void; }
{
    const watcher = watch(folder, { persistent: false }, (_event, name) => changed(name === null ? undefined : String(name)));
    watcher.on("error", failed);
    return watcher;
}

/** A file's text as it is now, none for a file gone; undefined for a folder, or a file being written, which cannot be read. */
function readNow(path: string): { text: string | undefined; } | undefined
{
    try {
        return { text: readText(path) };
    } catch {
        return undefined;
    }
}
