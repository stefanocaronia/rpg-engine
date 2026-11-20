// A package of data someone else made, read whole into memory (ADV-1): a .zip unpacked with its size capped and its names read as UTF-8, then each path
// checked, what a computer leaves beside files dropped, and the one folder GitHub zips a repository in taken away.
import { unzipSync } from "fflate";
import { archivePathParts } from "./archive-paths.ts";
import { Refusal } from "./refusal.ts";

/** A file of a package: its path in parts, from the package's top, and its bytes. */
export type PackageEntry = [string[], Uint8Array];

// What a computer leaves beside files, which no one put in the package.
const litter = /^(\..*|__macosx|thumbs\.db|desktop\.ini)$/i;

/** The files a .zip holds, by their names as written, unpacking to at most `most` bytes; it throws, saying why, when it does not read. `what` names the package: an adventure. */
export function unzipFiles(bytes: Uint8Array, label: string, most: number, what: string): [string, Uint8Array][]
{
    let declared = 0;
    let read: Record<string, Uint8Array>;

    try {
        read = unzipSync(bytes, {
            filter: (file) => {
                declared += file.originalSize;

                if (declared > most) {
                    throw new Error(`it unpacks to more than ${most / 1024 / 1024} MB, more than ${what} may`);
                }

                return true;
            },
        });
    } catch (error) {
        throw new Refusal(`${label} is not a .zip that reads: ${error instanceof Error ? error.message : String(error)}. Nothing changed.`, "archive-unread", { name: label });
    }

    return Object.entries(read).filter(([name]) => !/[\\/]$/.test(name)).map(([name, data]): [string, Uint8Array] => [utf8Name(label, name), data]);
}

/** The files a .zip holds, by their names as written, with what each unpacks to, none of them unpacked: to tell what it is before reading it. */
export function zipListing(bytes: Uint8Array, label: string): [string, number][]
{
    const listed: [string, number][] = [];

    try {
        unzipSync(bytes, {
            filter: (file) => {
                listed.push([file.name, file.originalSize]);
                return false;
            },
        });
    } catch (error) {
        throw new Refusal(`${label} is not a .zip that reads: ${error instanceof Error ? error.message : String(error)}. Nothing changed.`, "archive-unread", { name: label });
    }

    return listed.filter(([name]) => !/[\\/]$/.test(name)).map(([name, size]): [string, number] => [utf8Name(label, name), size]);
}

/**
 * A package's files: each path checked, what a computer leaves beside them dropped, and the one folder at its top that holds them all taken away while none of
 * `tops`, the files that tell what it is, lies at its top. `what` names it in a refusal: the adventure.
 */
export function packageEntries(label: string, entries: [string, Uint8Array][], what: string, tops: readonly string[]): PackageEntry[]
{
    // What a computer leaves beside the files, as macOS's __MACOSX, goes before the folder at the top is looked for.
    const checked = entries.map(([name, data]): PackageEntry => [archivePathParts(label, name, what), data]).filter(([parts]) => parts.length > 0 && !parts.some((part) => litter.test(part)));
    const atTop = checked.some(([parts]) => parts.length === 1 && tops.includes(parts[0].toLowerCase()));
    const folders = new Set(checked.map(([parts]) => parts[0]));
    return !atTop && folders.size === 1 ? checked.map(([parts, data]): PackageEntry => [parts.slice(1), data]).filter(([parts]) => parts.length > 0) : checked;
}

/** The file at a package's top named so, in any case; undefined when there is none. */
export function topFile(entries: PackageEntry[], name: string): PackageEntry | undefined
{
    return entries.find(([parts]) => parts.length === 1 && parts[0].toLowerCase() === name);
}

/**
 * A file's name in a .zip as it was written: one without the zip's UTF-8 mark reads byte by byte, so its UTF-8 is read again, as macOS writes it; one in an old
 * code page, as Windows' own tar writes it, is refused with what to do.
 */
function utf8Name(label: string, name: string): string
{
    if (/^[\u0000-ÿ]*$/.test(name) && /[\u0080-ÿ]/.test(name)) {
        try {
            return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(name, (character) => character.charCodeAt(0))).normalize("NFC");
        } catch {
            // Not UTF-8 byte by byte: a name the zip marked as UTF-8 already, or one in an old code page.
        }
    }

    if (/[\u0080-\u009f]/.test(name)) {
        throw new Refusal(
            `${label} names a file with accents not written in UTF-8 (${name}): make the zip again with 7-Zip, or Compress-Archive in PowerShell. Nothing changed.`,
            "archive-accents",
            { name: label },
        );
    }

    return name.normalize("NFC");
}
