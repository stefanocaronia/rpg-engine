// The paths of an archive or a folder someone else made (D-452, ADV-1): refused when one is absolute, climbs out, or has a part Windows reads otherwise, and
// when a file comes twice, so that what was read is what is written.
import { resolve, sep } from "node:path";

// Names Windows keeps for its devices, whatever their extension.
const reserved = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
// What a file name on Windows cannot hold.
const unwritable = /[<>:"|?*\u0000-\u001f]/;

/** Whether a name is one Windows keeps for a device, as CON or nul.txt. */
export function isReservedName(name: string): boolean
{
    return reserved.test(name);
}

/** The parts of a path of `archive`, split at either slash; it throws when the path is absolute, climbs out, or has a part this computer reads otherwise. */
export function archivePathParts(archive: string, name: string, what: string): string[]
{
    const parts = name.replace(/\\/g, "/").split("/").filter((part) => part !== "" && part !== ".");
    const unsafe = (part: string): boolean => part === ".." || unwritable.test(part) || /[. ]$/.test(part) || reserved.test(part);

    if (/^[\\/]/.test(name) || parts.some(unsafe)) {
        throw new Error(`${archive} holds ${name}, a path outside ${what} or one this computer cannot write (<>:"|?* are not allowed): it is refused whole. Rename it.`);
    }

    return parts;
}

/** Where a path of an archive goes in the folder, never outside it. */
export function insideFolder(root: string, path: string, what: string): string
{
    const target = resolve(root, path);

    if (!target.startsWith(root + sep)) {
        throw new Error(`${path} would be written outside ${root}: ${what} is refused.`);
    }

    return target;
}

/** Throws when a file comes twice in `archive`, in any case, as Windows reads names. */
export function refuseTwice(archive: string, paths: string[]): void
{
    const seen = new Set<string>();

    for (const path of paths) {
        const key = path.toLowerCase();

        if (seen.has(key)) {
            throw new Error(`${archive} holds ${path} twice: it is refused whole.`);
        }

        seen.add(key);
    }
}
