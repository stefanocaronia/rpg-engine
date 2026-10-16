// A package's .tgz as npm pack makes it (D-452): a gzipped tar with its files under package/. Read with Node alone and checked whole before anything is
// written: a path that would leave the folder or that Windows reads otherwise, a link, a device, a duplicate or an archive cut short refuse it.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";

// The most an archive may unpack to: a package is never this big, a malicious archive could be.
const largest = 512 * 1024 * 1024;
const block = 512;
// Names Windows keeps for its devices, whatever their extension.
const reserved = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;

interface Entry
{
    /** Its path inside the package, without the package/ npm puts first. */
    path: string;
    directory: boolean;
    data: Buffer;
}

/** Whether a package is given as a .tgz file. */
export function isTarball(spec: string): boolean
{
    return /\.(tgz|tar\.gz)$/i.test(spec);
}

/** The text of one file of the package, such as package.json; undefined when it has none. It throws, saying why, when the archive is refused. */
export function tarballText(archive: string, path: string): string | undefined
{
    return entries(archive).find((entry) => !entry.directory && entry.path === path)?.data.toString("utf8");
}

/** Unpacks the package into this folder, which must not exist yet; every path is checked before the first is written. */
export function unpackTarball(archive: string, folder: string): void
{
    const root = resolve(folder);
    const placed = entries(archive).map((entry) => ({ ...entry, target: inside(root, entry.path) }));
    mkdirSync(root, { recursive: true });

    for (const entry of placed) {
        if (entry.directory) {
            mkdirSync(entry.target, { recursive: true });
        } else {
            mkdirSync(resolve(entry.target, ".."), { recursive: true });
            writeFileSync(entry.target, entry.data);
        }
    }
}

/** The files and folders of the archive, refused whole when one is not a plain file or folder, its path is not a safe one, or the archive does not read to its end. */
function entries(archive: string): Entry[]
{
    let tar: Buffer;

    try {
        tar = gunzipSync(readFileSync(archive), { maxOutputLength: largest });
    } catch (error) {
        const big = error instanceof RangeError || (error instanceof Error && /larger than|maxOutputLength/i.test(error.message));
        throw new Error(big ? `${archive} unpacks to more than ${largest / 1024 / 1024} MB, more than a package may.` : `${archive} is not a package's .tgz that reads: ${error instanceof Error ? error.message : String(error)}`);
    }

    const found: Entry[] = [];
    let longName: string | undefined;

    for (let at = 0; at + block <= tar.length;) {
        const header = tar.subarray(at, at + block);

        if (header.every((byte) => byte === 0)) {
            return unique(archive, found.filter((entry) => entry.path !== ""));
        }

        const sizeField = text(header, 124, 12).trim();
        const size = /^[0-7]*$/.test(sizeField) ? Number.parseInt(sizeField || "0", 8) : Number.NaN;

        if (!Number.isSafeInteger(size) || at + block + size > tar.length) {
            throw new Error(`${archive} is cut short, or is not a .tgz npm pack made: it is refused whole.`);
        }

        const type = String.fromCharCode(header[156] || 48);
        const data = tar.subarray(at + block, at + block + size);
        const prefix = text(header, 345, 155);
        const name = longName ?? (prefix === "" ? text(header, 0, 100) : `${prefix}/${text(header, 0, 100)}`);
        at += block + Math.ceil(size / block) * block;
        longName = undefined;

        // A pax or GNU header may give the next entry's long path; a global one, and npm's other metadata, change nothing here.
        if (type === "x" || type === "L") {
            longName = type === "L" ? data.toString("utf8").replace(/\0+$/, "") : /(?:^|\n)\d+ path=([^\n]*)\n/.exec(data.toString("utf8"))?.[1];
            continue;
        }

        if (type === "g") {
            continue;
        }

        if (type !== "0" && type !== "5") {
            throw new Error(`${archive} holds ${name}, which is not a plain file or folder (a link or a device): it is refused whole.`);
        }

        found.push({ path: packagePath(archive, name), directory: type === "5", data });
    }

    throw new Error(`${archive} is cut short, or is not a .tgz npm pack made: it is refused whole.`);
}

/** The entries, refused when a file comes twice: what was read would not be what is written. */
function unique(archive: string, found: Entry[]): Entry[]
{
    const seen = new Set<string>();

    for (const entry of found.filter((one) => !one.directory)) {
        const key = entry.path.toLowerCase();

        if (seen.has(key)) {
            throw new Error(`${archive} holds ${entry.path} twice: it is refused whole.`);
        }

        seen.add(key);
    }

    return found;
}

/** A path inside the package, without its first folder (package/), refused when it is absolute, climbs out, or has a part Windows reads otherwise. */
function packagePath(archive: string, name: string): string
{
    const parts = name.replace(/\\/g, "/").split("/").filter((part) => part !== "" && part !== ".");
    const unsafe = (part: string): boolean => part === ".." || part.includes(":") || /[. ]$/.test(part) || reserved.test(part);

    if (name.startsWith("/") || parts.some(unsafe)) {
        throw new Error(`${archive} holds ${name}, a path outside the package or one this computer reads otherwise: it is refused whole.`);
    }

    return parts.slice(1).join("/");
}

/** Where a path of the package goes in the folder, never outside it. */
function inside(root: string, path: string): string
{
    const target = resolve(root, path);

    if (!target.startsWith(root + sep)) {
        throw new Error(`${path} would be written outside ${root}: the package is refused.`);
    }

    return target;
}

function text(header: Buffer, start: number, length: number): string
{
    return header.subarray(start, start + length).toString("utf8").replace(/\0.*$/s, "");
}
