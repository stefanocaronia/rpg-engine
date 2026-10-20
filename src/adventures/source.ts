import { unzipSync, zipSync } from "fflate";
import { relative, sep } from "node:path";
import { archivePathParts, refuseTwice } from "../core/archive-paths.ts";
import { filesIn } from "../core/files.ts";
import { files } from "../core/store.ts";
import { type AdventureManifest, manifestFileName, readManifest, writeManifest } from "./manifest.ts";

/** The folders an adventure has, as a campaign has them (D-372). */
export const adventureFolders = ["world", "images", "rules"] as const;

/** An adventure as a package gives it (ADV-1): its manifest, its files by their path, and what was left out at its top. */
export interface AdventureFiles
{
    manifest: AdventureManifest;
    /** By their path in the package, with forward slashes, such as world/places/Pozzo.md. */
    files: Record<string, Uint8Array>;
    /** The files and folders at its top that are no part of it, such as a README. */
    ignored: string[];
}

/** The most an adventure may unpack to, as a package's .tgz (D-452). */
export const largestAdventure = 512 * 1024 * 1024;

// What each folder may hold: pages and rules are markdown, pictures as the engine shows them.
const allowed: Record<(typeof adventureFolders)[number], RegExp> = { world: /\.md$/i, images: /\.(png|jpg|webp|svg)$/i, rules: /\.md$/i };
// What a computer leaves beside files, which no one put in the adventure.
const litter = /^(\..*|__macosx|thumbs\.db|desktop\.ini)$/i;
// The time every file of an exported zip carries, so that the same adventure gives the same bytes.
const fixedTime = new Date(1980, 0, 1);

/** Whether a folder of this computer is an adventure: it has a manifest. */
export function isAdventureFolder(folder: string): boolean
{
    return files().exists(`${folder}${sep}${manifestFileName}`);
}

/** The adventure a .zip holds (ADV-1), at its top or inside one folder there, as GitHub zips a repository; it throws, saying why, when it is refused. */
export function readAdventureZip(bytes: Uint8Array, label: string): AdventureFiles
{
    let declared = 0;
    let read: Record<string, Uint8Array>;

    try {
        read = unzipSync(bytes, {
            filter: (file) => {
                declared += file.originalSize;

                if (declared > largestAdventure) {
                    throw new Error(`it unpacks to more than ${largestAdventure / 1024 / 1024} MB, more than an adventure may`);
                }

                return true;
            },
        });
    } catch (error) {
        throw new Error(`${label} is not a .zip that reads: ${error instanceof Error ? error.message : String(error)}. Nothing changed.`);
    }

    const named = Object.entries(read).filter(([name]) => !/[\\/]$/.test(name)).map(([name, data]): [string, Uint8Array] => [utf8Name(label, name), data]);
    return adventureOf(label, named);
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
        throw new Error(`${label} names a file with accents not written in UTF-8 (${name}): make the zip again with 7-Zip, or Compress-Archive in PowerShell. Nothing changed.`);
    }

    return name.normalize("NFC");
}

/** The adventure a folder of this computer holds (ADV-1); it throws, saying why, when it is refused. */
export function readAdventureFolder(folder: string): AdventureFiles
{
    const found = filesIn(folder, () => true).map((path): [string, Uint8Array] => [relative(folder, path).split(sep).join("/"), files().bytes(path) ?? new Uint8Array()]);
    return adventureOf(folder, found);
}

/** The .zip of an adventure, its manifest first and its files in order of path: the same adventure gives the same bytes (ADV-7). */
export function packAdventure(manifest: AdventureManifest, held: Record<string, Uint8Array>): Uint8Array
{
    const ordered: Record<string, Uint8Array> = { [manifestFileName]: new TextEncoder().encode(writeManifest(manifest)) };

    for (const path of Object.keys(held).sort()) {
        ordered[path] = held[path];
    }

    return zipSync(ordered, { level: 6, mtime: fixedTime });
}

/** The adventure from a package's files: its paths checked, the one folder at its top that holds it all taken away, and what it may hold kept. */
function adventureOf(label: string, entries: [string, Uint8Array][]): AdventureFiles
{
    // What a computer leaves beside the files, as macOS's __MACOSX, goes before the folder at the top is looked for.
    const checked = entries.map(([name, data]): [string[], Uint8Array] => [archivePathParts(label, name, "the adventure"), data])
        .filter(([parts]) => parts.length > 0 && !parts.some((part) => litter.test(part)));
    const atTop = checked.some(([parts]) => parts.length === 1 && parts[0].toLowerCase() === manifestFileName);
    const tops = new Set(checked.map(([parts]) => parts[0]));
    const inner = !atTop && tops.size === 1 ? checked.map(([parts, data]): [string[], Uint8Array] => [parts.slice(1), data]).filter(([parts]) => parts.length > 0) : checked;
    const manifest = inner.find(([parts]) => parts.length === 1 && parts[0].toLowerCase() === manifestFileName);

    if (manifest === undefined) {
        throw new Error(`${label} has no ${manifestFileName} at its top: it is not an adventure. A document or a folder of notes is imported by the master, who writes its pages. Nothing changed.`);
    }

    const held: Record<string, Uint8Array> = {};
    const ignored = new Set<string>();

    for (const [parts, data] of inner) {
        const path = parts.join("/");
        const folder = adventureFolders.find((one) => one === parts[0].toLowerCase());

        if (parts.length === 1 && parts[0].toLowerCase() === manifestFileName) {
            continue;
        }

        if (folder === undefined || parts.length === 1) {
            ignored.add(parts[0]);
            continue;
        }

        if (!allowed[folder].test(path)) {
            throw new Error(
                `${label} holds ${path}, and ${folder}/ holds only ${folder === "images" ? "pictures in .png, .jpg, .webp or .svg" : "markdown files"}: it is refused whole. `
                    + "Take it out, or convert it, and give it again.",
            );
        }

        held[[folder, ...parts.slice(1)].join("/")] = data;
    }

    refuseTwice(label, Object.keys(held));
    return { manifest: readManifest(new TextDecoder().decode(manifest[1]), `${label}, ${manifestFileName}`), files: held, ignored: [...ignored].sort() };
}
