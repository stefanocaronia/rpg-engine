// The files of a folder and of the folders inside it, listed one folder at a time: listing a whole tree at once looks at every file again on Windows (D-194).
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";

/** The full paths of `folder` and of the folders inside it, however deep; none when there is no such folder. */
export function foldersIn(folder: string): string[]
{
    const folders = existsSync(folder) && statSync(folder).isDirectory() ? [folder] : [];

    for (let index = 0; index < folders.length; index++) {
        for (const entry of readdirSync(folders[index], { withFileTypes: true }).filter((candidate) => candidate.isDirectory())) {
            folders.push(join(folders[index], entry.name));
        }
    }

    return folders;
}

/** The full paths of the files in `folder` and in the folders inside it whose names `keep` takes; none when there is no such folder. */
export function filesIn(folder: string, keep: (name: string) => boolean): string[]
{
    const files: string[] = [];
    const folders = existsSync(folder) && statSync(folder).isDirectory() ? [folder] : [];

    for (let index = 0; index < folders.length; index++) {
        for (const entry of readdirSync(folders[index], { withFileTypes: true })) {
            const path = join(folders[index], entry.name);

            if (entry.isDirectory()) {
                folders.push(path);
            } else if (entry.isFile() && keep(entry.name)) {
                files.push(path);
            }
        }
    }

    return files;
}

/**
 * The folders of the packages in these folders of npm's, in their scopes' folders too (@rpgengine/weather), links to folders included, as npm links a package
 * installed from a folder (D-441); never followed further.
 */
export function packageFoldersIn(folders: string[]): string[]
{
    const children = (folder: string): string[] => readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory() || isLinkedFolder(join(folder, entry.name))).map((entry) => join(folder, entry.name)).sort();
    return folders.filter((folder) => existsSync(folder)).flatMap((folder) => {
        const chosen = chosenPackages(folder);
        const found = children(folder).flatMap((child) => (basename(child).startsWith("@") ? children(child) : [child]));
        // Only the packages the player installed: one npm brought as another's dependency is never theirs to use (D-485).
        return chosen === undefined ? found : found.filter((child) => chosen.has(relative(folder, child).split(sep).join("/")));
    });
}

/**
 * The packages the player installed in a folder of npm's, as the package.json beside it lists them; undefined where there is none, as for the engine's own
 * systems or a test's folder.
 */
function chosenPackages(folder: string): Set<string> | undefined
{
    if (basename(folder) !== "node_modules") {
        return undefined;
    }

    try {
        const read = JSON.parse(readFileSync(join(folder, "..", "package.json"), "utf8")) as { dependencies?: Record<string, unknown>; };
        return read.dependencies === undefined ? undefined : new Set(Object.keys(read.dependencies));
    } catch {
        return undefined;
    }
}

/** A path by the folders it really is in, through any link on the way, as Node resolves a module; as given when it is not there. */
export function realPath(path: string): string
{
    try {
        return realpathSync(path);
    } catch {
        return path;
    }
}

/**
 * Whether a package of npm's folder came from a folder or a file of this computer, never from npm (D-441, D-452): npm's package.json names it as file:, or it
 * is a link to the folder. Such a package is never verified, whatever its name.
 */
export function installedFromFolder(folder: string): boolean
{
    const parts = resolve(folder).split(sep);
    const at = parts.lastIndexOf("node_modules");

    try {
        if (lstatSync(folder).isSymbolicLink()) {
            return true;
        }

        const read = JSON.parse(readFileSync(join(parts.slice(0, at).join(sep), "package.json"), "utf8")) as { dependencies?: Record<string, unknown>; };
        const spec = at < 0 ? undefined : read.dependencies?.[parts.slice(at + 1).join("/")];
        return typeof spec === "string" && /^(file|link):/.test(spec);
    } catch {
        return false;
    }
}

function isLinkedFolder(path: string): boolean
{
    try {
        return lstatSync(path).isSymbolicLink() && statSync(path).isDirectory();
    } catch {
        return false;
    }
}
