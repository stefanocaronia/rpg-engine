// The files as the MCP server keeps them for a whole session (D-137, D-193): what a call read stays for the next ones, until a watcher says that a file
// changed. At the start, at every instructions, and whenever a watcher fails or cannot start, a full check compares the text of every file kept with the disk.
import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { foldersIn } from "./files.ts";
import { FileStore, isInside, readText } from "./store.ts";

/** Tells which names change in one folder, not in the folders inside it, and when it can no longer tell: Node's fs.watch, or a fake one in the tests. */
export type WatchFolder = (folder: string, changed: (name: string | undefined) => void, failed: () => void) => { close(): void; };

// The folders of a campaign below its own that hold what is kept: its pages and its house rules. The campaign's folder holds its settings, state and log.
const watchedTrees = ["world", "rules"];

/** The files of a session of the MCP server, kept between calls and watched (D-193). */
export class SessionStore extends FileStore
{
    private readonly watchers = new Map<string, { close(): void; }>();
    private readonly roots = new Set<string>();
    private readonly reported = new Set<string>();
    private readonly watchFolder: WatchFolder;
    private checkAll = true;
    private unwatchable = false;

    constructor(watchFolder: WatchFolder = watchWithNode)
    {
        super();
        this.watchFolder = watchFolder;
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

    /**
     * Makes the store right for a call: lets the watchers' last events in, then reads again the files they named; or compares every file kept with the disk,
     * when `everything` is asked, as at instructions, or when a watcher failed or could not start.
     */
    async ready(everything = false): Promise<void>
    {
        await new Promise((done) => setImmediate(done));

        if (everything || this.checkAll || this.unwatchable) {
            await this.checkEverything();
            return;
        }

        const reported = [...this.reported];
        this.reported.clear();

        for (const path of reported) {
            this.recheck(path);
        }
    }

    /** The text on the disk, before a write: a store that kept another one missed a change, and checks everything at the next call. */
    override fresh(path: string): string | undefined
    {
        const now = readText(resolve(path));

        if (now !== this.text(path)) {
            this.changed(path, { text: now }, now !== undefined);
            this.checkAll = true;
        }

        return now;
    }

    /** Stops watching, as the server closes. */
    close(): void
    {
        for (const watcher of this.watchers.values()) {
            watcher.close();
        }

        this.watchers.clear();
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
    }

    /** What a watcher named: a file kept with another text, a new file or one gone; or a folder that came or went, read again and watched whole. */
    private recheck(path: string): void
    {
        let now: string | undefined;

        try {
            now = readText(path);
        } catch {
            // A folder, or a file being written: what is under it is read again, and a new folder is watched.
            this.forgetUnder(path);
            this.roots.forEach((root) => this.watchFolders(root));
            return;
        }

        const holdsKept = [...this.kept.keys(), ...this.listings.keys(), ...this.watchers.keys()].some((other) => isInside(path, other));

        if (now === undefined && holdsKept) {
            // A folder that went, renamed or removed, with all it held: only its name comes.
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
        const paths = [...this.kept.keys()].filter((path) => [...this.roots].some((root) => isInside(root, path)));
        const texts = await Promise.all(paths.map((path) => readFile(path, "utf8").catch(() => undefined)));

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
        for (const folder of [...this.watchers.keys()].filter((other) => other === path || isInside(path, other))) {
            this.watchers.get(folder)?.close();
            this.watchers.delete(folder);
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
