// A theme linked for its author: its folder among the installed ones holds only the path of the author's own folder, which is read where it is, never copied.
import { createHash } from "node:crypto";
import { join } from "node:path";
import { files } from "../core/store.ts";

/** The file of a linked theme's folder among the installed ones: the absolute path of the author's folder, a line. */
export const linkFileName = ".link";

// The folders a print skips: what a repository and its tools keep, never the theme's.
const skipped = new Set([".git", "node_modules"]);

/** The author's folder a theme's folder among the installed ones links to, as it reads now; undefined when it links none. */
export function linkedFolder(entry: string): string | undefined
{
    const bytes = files().bytes(join(entry, linkFileName));
    const path = bytes === undefined ? "" : new TextDecoder().decode(bytes).trim();
    return path === "" ? undefined : path;
}

/** The authors' folders of the linked themes among those installed in this folder; none when no theme is linked. */
export function linkedThemeFolders(themes: string): string[]
{
    return files().entries(themes).filter((entry) => entry.isFolder && !entry.name.startsWith(".")).flatMap((entry) => linkedFolder(join(themes, entry.name)) ?? []);
}

/** A short print of these folders' files, which changes when one is written, added or taken away: the newest change and how many there are, in each. */
export function folderPrint(folders: string[]): string
{
    const lines = folders.map((folder) => {
        const seen = { newest: 0, count: 0 };
        lookAt(folder, seen);
        return `${folder}:${seen.newest}:${seen.count}`;
    });
    return lines.length === 0 ? "" : createHash("sha1").update(lines.join("\n")).digest("base64url").slice(0, 10);
}

/** Counts the files under a folder, and keeps the newest time one of them or a folder changed. */
function lookAt(folder: string, seen: { newest: number; count: number; }): void
{
    seen.newest = Math.max(seen.newest, files().modified(folder) ?? 0);

    for (const entry of files().entries(folder)) {
        const path = join(folder, entry.name);

        if (entry.isFolder && !skipped.has(entry.name)) {
            lookAt(path, seen);
        } else if (!entry.isFolder) {
            seen.count++;
            seen.newest = Math.max(seen.newest, files().modified(path) ?? 0);
        }
    }
}
