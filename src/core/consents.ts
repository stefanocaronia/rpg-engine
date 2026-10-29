// The player's yes to the code of a package not ours, an extension's or a game system's (D-478, D-510, D-511): kept on this computer beside the packages npm
// installed, never in a campaign, for the package, its version and the fingerprint of its files; any other version, or a file changed since, has no yes.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { installedFromFolder } from "./files.ts";
import { files } from "./store.ts";

/** The file of the yeses, beside the folder of the packages npm installed. */
const consentsFile = "consents.json";

// An npm package's name, as a dependency is listed: never a path.
const npmName = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

/** The npm scope of the packages RPG Engine publishes, verified: their code runs without a yes (D-441). */
export const ourScope = "@rpgengine/";

/**
 * Whether the code of the package in this folder may run (D-478, D-511): one the engine ships, outside npm's folders; one of ours from npm; one installed from
 * a folder or a file of the player's; or another's the player said yes to, at this version and with these files.
 */
export function packageCodeMayRun(folder: string): boolean
{
    let manifest: { name?: unknown; version?: unknown; };

    try {
        manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { name?: unknown; version?: unknown; };
    } catch {
        return false;
    }

    const name = typeof manifest.name === "string" ? manifest.name : "";
    const linked = installedFromFolder(folder);
    return consentsPath(folder) === undefined || linked || name.startsWith(ourScope) || hasConsent(folder, name, typeof manifest.version === "string" ? manifest.version : "");
}

type Consents = Record<string, { version: string; fingerprint: string; }>;

/**
 * The fingerprint of a package's files as installed, and of its dependencies' as npm resolved them: every file but those npm or git keep beside them, by its
 * path and its bytes, so that a dependency another install changed asks the yes again. Worked out again only when a file's size or time changed: it is asked
 * at each load of the package's code.
 */
export function packageFingerprint(folder: string): string
{
    const paths = withDependencies(folder).flatMap(packageFiles);
    const signature = paths.map((path) => {
        const stat = statSync(path);
        return `${path}|${stat.size}|${stat.mtimeMs}`;
    }).join("\n");
    const known = fingerprints.get(folder);

    if (known?.signature === signature) {
        return known.fingerprint;
    }

    const hash = createHash("sha256");

    for (const path of paths) {
        hash.update(`${relative(folder, path).split(sep).join("/")}\0`).update(readFileSync(path)).update("\0");
    }

    const fingerprint = hash.digest("hex");
    fingerprints.set(folder, { signature, fingerprint });
    return fingerprint;
}

const fingerprints = new Map<string, { signature: string; fingerprint: string; }>();

/** Records the player's yes to a package installed in a folder of npm's packages: its version and its files as they are now. */
export function recordConsent(folder: string, name: string, version: string): void
{
    const file = consentsPath(folder);

    if (file !== undefined) {
        files().write(file, `${JSON.stringify({ ...readConsents(file), [name]: { version, fingerprint: packageFingerprint(folder) } }, null, 2)}\n`);
    }
}

/** Takes the player's yes to a package away, as when it leaves this computer. */
export function dropConsent(folder: string, name: string): void
{
    const file = consentsPath(folder);
    const kept = file === undefined ? {} : readConsents(file);

    if (file !== undefined && Object.hasOwn(kept, name)) {
        files().write(file, `${JSON.stringify(Object.fromEntries(Object.entries(kept).filter(([one]) => one !== name)), null, 2)}\n`);
    }
}

/** Whether the player said yes to this package's code as it is installed now: its name, its version and its files. */
export function hasConsent(folder: string, name: string, version: string): boolean
{
    const file = consentsPath(folder);
    const given = file === undefined ? undefined : readConsents(file)[name];
    return given !== undefined && given.version === version && given.fingerprint === packageFingerprint(folder);
}

/** The file of the yeses for a package in a folder of npm's packages, as node_modules/@scope/name; undefined for one elsewhere. */
function consentsPath(folder: string): string | undefined
{
    const parts = folder.split(/[\\/]/);
    const at = parts.lastIndexOf("node_modules");
    return at < 0 ? undefined : join(dirname(parts.slice(0, at + 1).join(sep)), consentsFile);
}

function readConsents(file: string): Consents
{
    try {
        const read = JSON.parse(files().text(file) ?? "{}") as unknown;
        return typeof read === "object" && read !== null && !Array.isArray(read) ? (read as Consents) : {};
    } catch {
        return {};
    }
}

/** A package's folder and those of its dependencies, and theirs in turn, each found as Node finds it: in a node_modules here or in a folder above. */
function withDependencies(folder: string): string[]
{
    const found = [folder];

    for (let at = 0; at < found.length; at++) {
        for (const name of dependencyNames(found[at])) {
            const dependency = dependencyFolder(found[at], name);

            if (dependency !== undefined && !found.includes(dependency)) {
                found.push(dependency);
            }
        }
    }

    return found;
}

/** The names of a package's dependencies, as its package.json lists them to run; none that is not an npm name. */
function dependencyNames(folder: string): string[]
{
    try {
        const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { dependencies?: unknown; optionalDependencies?: unknown; };
        const listed = [manifest.dependencies, manifest.optionalDependencies].flatMap((list) => (typeof list === "object" && list !== null ? Object.keys(list) : []));
        return listed.filter((name) => npmName.test(name)).sort();
    } catch {
        return [];
    }
}

/** Where Node finds a dependency of a package: the nearest node_modules that holds it, from the package's own folder up; undefined when none does. */
function dependencyFolder(from: string, name: string): string | undefined
{
    for (let folder = from;; folder = dirname(folder)) {
        const candidate = join(folder, "node_modules", ...name.split("/"));

        if (existsSync(join(candidate, "package.json"))) {
            return candidate;
        }

        if (dirname(folder) === folder) {
            return undefined;
        }
    }
}

/** A package's own files, in a fixed order: not those npm or git keep beside them. */
function packageFiles(folder: string): string[]
{
    return readdirSync(folder, { withFileTypes: true })
        .filter((entry) => !["node_modules", ".git"].includes(entry.name))
        .sort((first, second) => (first.name < second.name ? -1 : first.name > second.name ? 1 : 0))
        .flatMap((entry) => (entry.isDirectory() ? packageFiles(join(folder, entry.name)) : entry.isFile() ? [join(folder, entry.name)] : []));
}
