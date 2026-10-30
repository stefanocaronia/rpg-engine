// The files of a folder and of the folders inside it, listed one folder at a time: listing a whole tree at once looks at every file again on Windows (D-194).
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

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

    return files.sort(fileOrder);
}

/** The order of a folder's files, the same on every system: those nearer the folder first, then by path, as Windows lists them, case aside. */
export function fileOrder(first: string, second: string): number
{
    const depth = (path: string): number => path.split(sep).length;
    const [one, other] = [first.toUpperCase(), second.toUpperCase()];
    return depth(first) - depth(second) || (one < other ? -1 : one > other ? 1 : first < second ? -1 : first > second ? 1 : 0);
}

/** Where a game system keeps its text in a language, translations/it, by the language's code or its base one (D-542); undefined when it has none. */
export function translationFolder(folder: string, language: string | undefined): string | undefined
{
    const code = language?.trim().toLowerCase();
    const codes = code === undefined || code === "" ? [] : [...new Set([code, code.split("-")[0]])];
    return codes.map((one) => join(folder, "translations", one)).find((path) => existsSync(path) && statSync(path).isDirectory());
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
        const named = (child: string): string => relative(folder, child).split(sep).join("/");
        // Only the packages the player installed: one npm brought as another's dependency is never theirs to use (D-485). In npm's folder a package is
        // where its name puts it: one whose package.json names another, as an alias that says it is ours, is no package at all.
        const fits = (child: string): boolean => basename(folder) !== "node_modules" || [undefined, named(child)].includes(manifestName(child));
        return found.filter((child) => (chosen === undefined || chosen.has(named(child))) && fits(child));
    });
}

/**
 * A path by the folders it really is in, through any link on the way, as Node resolves a module; one not there yet by the real path of the folder it would be
 * in, as /var is /private/var on macOS.
 */
export function realPath(path: string): string
{
    try {
        return realpathSync(path);
    } catch {
        const folder = dirname(path);
        return folder === path ? path : join(realPath(folder), basename(path));
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

        if (at < 0) {
            return false;
        }

        const read = JSON.parse(readFileSync(join(parts.slice(0, at).join(sep), "package.json"), "utf8")) as { dependencies?: Record<string, unknown>; };
        const spec = read.dependencies?.[parts.slice(at + 1).join("/")];
        return typeof spec === "string" && /^(file|link):/.test(spec);
    } catch {
        return false;
    }
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

function isLinkedFolder(path: string): boolean
{
    try {
        return lstatSync(path).isSymbolicLink() && statSync(path).isDirectory();
    } catch {
        return false;
    }
}

/** The name a package's package.json gives itself; undefined when it gives none that reads. */
function manifestName(folder: string): string | undefined
{
    try {
        const read = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { name?: unknown; };
        return typeof read.name === "string" ? read.name : undefined;
    } catch {
        return undefined;
    }
}
