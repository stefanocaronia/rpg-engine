import { createHash } from "node:crypto";
import { basename, extname, join } from "node:path";
import { files } from "../core/store.ts";

/** The folder of a campaign or of a game system that holds the pictures of its pages. */
export const imagesFolderName = "images";

/** The largest picture a page takes, in bytes: a token or a portrait needs far less. */
export const largestImage = 5 * 1024 * 1024;

/** The formats a picture can have, by the extension its file gets. */
export const imageExtensions = ["png", "jpg", "webp", "svg"] as const;

export type ImageExtension = (typeof imageExtensions)[number];

/** A picture read from a file, or why it cannot be one. */
export type ReadImage = { bytes: Uint8Array; extension: ImageExtension; } | { problem: string; };

/** Reads the picture at `path`, by what its bytes are rather than by its extension: PNG, JPEG, WebP or SVG, up to largestImage. */
export function readImage(path: string): ReadImage
{
    const bytes = files().bytes(path);

    if (bytes === undefined) {
        return { problem: `There is no file at ${path}: give the full path of the picture.` };
    }

    const extension = imageExtensions.find((candidate) => isFormat[candidate](bytes));

    if (extension === undefined) {
        return { problem: `${basename(path)} is not a PNG, JPEG, WebP or SVG picture: convert it to one of those, or give another file.` };
    }

    if (bytes.length > largestImage) {
        return { problem: `${basename(path)} is ${megabytes(bytes.length)} MB, and a picture can be ${megabytes(largestImage)} MB at most: make it smaller (512 pixels a side are enough).` };
    }

    return { bytes, extension };
}

/** The file named `name` in the images folder of the first of `folders` that has one, looked for in the folders inside it too; undefined when none has it. */
export function findImage(folders: string[], name: string): string | undefined
{
    const wanted = name.toLowerCase();

    for (const folder of folders) {
        const found = files().files(join(folder, imagesFolderName), (fileName) => fileName.toLowerCase() === wanted)[0];

        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

/** The file name a page's image field links, such as ettore.webp for [[ettore.webp]]; undefined when the value is not a link. */
export function imageFileName(value: unknown): string | undefined
{
    const match = typeof value === "string" ? /^\s*\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]\s*$/.exec(value) : null;
    return match === null ? undefined : match[1].trim();
}

/** A name for a picture that tells nothing of its page, as the page asks for a stranger's (D-420): a hash of its bytes, with its extension. */
export function hiddenImageName(path: string): string | undefined
{
    const bytes = files().bytes(path);
    return bytes === undefined ? undefined : `${createHash("sha256").update(bytes).digest("hex").slice(0, 24)}${extname(path).toLowerCase()}`;
}

/** The picture a hidden name stands for, among the images folders of `folders`; undefined when the name is not one, or no picture has it. */
export function findHiddenImage(folders: string[], name: string): string | undefined
{
    if (!/^[0-9a-f]{24}\.[a-z]+$/.test(name)) {
        return undefined;
    }

    const extension = extname(name);
    return folders.flatMap((folder) => files().files(join(folder, imagesFolderName), (fileName) => extname(fileName).toLowerCase() === extension))
        .find((file) => hiddenImageName(file) === name);
}

/** The link an image field holds for a file name, such as [[ettore.webp]]. */
export function imageLink(fileName: string): string
{
    return `[[${fileName}]]`;
}

const isFormat: Record<ImageExtension, (bytes: Uint8Array) => boolean> = {
    png: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    jpg: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
    webp: (bytes) => ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP",
    // An SVG is text: its root element comes after an XML declaration, a doctype or comments, if any.
    svg: (bytes) => /^(?:\uFEFF)?\s*(?:<\?xml[^>]*>\s*)?(?:(?:<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)\s*)*<svg[\s>]/i.test(new TextDecoder().decode(bytes.subarray(0, 4096))),
};

function startsWith(bytes: Uint8Array, prefix: number[]): boolean
{
    return prefix.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, start: number, end: number): string
{
    return String.fromCharCode(...bytes.subarray(start, end));
}

function megabytes(size: number): string
{
    return (size / 1024 / 1024).toFixed(1).replace(/\.0$/, "");
}
