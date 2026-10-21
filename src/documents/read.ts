import { unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, posix, relative, resolve } from "node:path";
import { htmlText, openDocumentText, pictureMark, rtfText, wordText } from "./markup.ts";
import type { PageReader } from "./ocr.ts";
import { pngOf } from "./png.ts";

/** A piece of a document as its reader gives it: a page of a PDF, or a part of a text of a few hundred words, with how it is cited. */
export interface DocumentPart
{
    /** How a page cites it: "p. 12", "part 3", "notes.md, part 2". */
    label: string;
    text: string;
}

/** A picture a document holds, big enough to be a place's or a character's, and where it stands. */
export interface DocumentPicture
{
    /** Its file's name, unique in the document, such as p012-1.png. */
    name: string;
    /** The label of the part it stands in. */
    label: string;
    data: Uint8Array;
}

/** A document's text in parts, and its pictures (D-489 (2), (8)). */
export interface DocumentText
{
    parts: DocumentPart[];
    pictures: DocumentPicture[];
    /** The labels of the parts without readable text (LIB-4), whose text is left empty. */
    unreadable: string[];
    /** The labels of the parts the OCR read, whose numbers and tables may be wrong. */
    recognized: string[];
}

/**
 * How a document is read: the pages of a PDF without readable text read from their pictures, where an OCR is given (LIB-4), stopped by `signal`, `progress`
 * hearing how many of them are read; without its pictures, as a library does.
 */
export interface ReadOptions
{
    ocr?: PageReader;
    pictures?: boolean;
    signal?: AbortSignal;
    progress?: (read: number, of: number) => void;
}

/** The kinds of file a document may be, by their extension. */
export const documentKinds = [".pdf", ".docx", ".odt", ".epub", ".html", ".htm", ".xhtml", ".rtf", ".txt", ".md"];

/** The most pictures a document gives, and the longest side of each. */
const mostPictures = 300;
const longestSide = 1600;
// Smaller pictures are ornaments, letters or icons; a picture on more pages than this is a page's decoration.
const smallestSide = 160;
const decorationPages = 3;
// About as many words as a printed page, for documents that have no pages.
const partWords = 450;

/** What is at a path the player gave: a document's file, a folder, or nothing. */
export function documentAt(path: string): "file" | "folder" | undefined
{
    try {
        return statSync(path).isDirectory() ? "folder" : "file";
    } catch {
        return undefined;
    }
}

/**
 * A document's text and pictures, from a file or from a folder of them; refused, saying which kinds are read, when it is none of them, and saying why when it
 * is locked: a password to open it, or DRM (LIB-5).
 */
export async function readDocument(path: string, options: ReadOptions = {}): Promise<DocumentText>
{
    if (statSync(path).isDirectory()) {
        return readFolder(path, options);
    }

    const kind = extname(path).toLowerCase();

    if (!documentKinds.includes(kind)) {
        throw new Error(`${basename(path)} is no document the engine reads: give a ${documentKinds.join(", ")} file, or a folder of them.`);
    }

    return kind === ".pdf" ? readPdf(path, options) : withPictures(readText(kind, readFileSync(path), basename(path), ""), options);
}

/**
 * Whether a page has readable text (LIB-4): its words cut at spaces and punctuation, at least half of those with letters are true words, two letters or more,
 * or Chinese, Japanese or Korean script, written without spaces; a single letter, a number or a die counts neither way. A page of numbers alone is
 * readable; an empty one is not.
 */
export function isReadable(text: string): boolean
{
    const tokens = text.split(/[\s\p{P}]+/u).filter((token) => token !== "");
    const counted = tokens.filter((token) => /\p{L}/u.test(token) && !numberPattern.test(token) && !/^\p{L}\p{M}*$/u.test(token));

    if (counted.length === 0) {
        return tokens.some((token) => numberPattern.test(token));
    }

    return counted.filter((token) => wordPattern.test(token) || scriptPattern.test(token)).length >= counted.length / 2;
}

// A true word: letters alone, two or more.
const wordPattern = /^\p{L}[\p{L}\p{M}]*\p{L}\p{M}*$/u;
// Chinese, Japanese and Korean, which write no spaces between words.
const scriptPattern = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}ー]+$/u;
// A number as rules write it, its marks cut away: 15, +1, 2d6+3, 50%, 3×4.
const numberPattern = /^[+\-–−]?\d+(?:[dDxX×]\d+)?(?:[+\-–−]\d+)?%?$/u;

async function readFolder(folder: string, options: ReadOptions): Promise<DocumentText>
{
    const found = filesUnder(folder).filter((file) => documentKinds.includes(extname(file).toLowerCase()));

    if (found.length === 0) {
        throw new Error(`The folder ${folder} holds no document the engine reads: ${documentKinds.join(", ")}.`);
    }

    const parts: DocumentPart[] = [];
    const pictures: DocumentPicture[] = [];
    const unreadable: string[] = [];
    const recognized: string[] = [];

    for (const file of found) {
        const name = relative(folder, file).replace(/\\/g, "/");
        const kind = extname(file).toLowerCase();
        const read = kind === ".pdf" ? await readPdf(file, options) : withPictures(readText(kind, readFileSync(file), name, name), options);
        const prefix = (label: string): string => (kind === ".pdf" ? `${name}, ${label}` : label);
        // Two files may both have an image1.png: the second's is renamed, and so are its marks.
        const taken = new Set(pictures.map((picture) => picture.name));
        const renamed = read.pictures.map((picture) => ({ ...picture, name: freeName(taken, picture.name), label: prefix(picture.label), was: picture.name }));
        // In one pass, so that a name given to one picture is never renamed again as another's.
        const names = new Map(renamed.map((picture) => [picture.was, picture.name]));
        const marked = (text: string): string => text.replace(/\[picture: ([^\]]+)\]/g, (mark, was: string) => (names.has(was) ? `[picture: ${names.get(was)}]` : mark));
        parts.push(...read.parts.map((part) => ({ label: prefix(part.label), text: marked(part.text) })));
        pictures.push(...renamed.map(({ was: _, ...picture }) => picture));
        unreadable.push(...read.unreadable.map(prefix));
        recognized.push(...read.recognized.map(prefix));
    }

    return { parts, pictures: pictures.slice(0, mostPictures), unreadable, recognized };
}

/**
 * A PDF: a part for each page, its text as the page lays it out, or as the OCR reads it when it has no readable text; its pictures without decorations, each
 * as a PNG. One that asks for a password to open is refused; one that only forbids copying is read, as a reader does (LIB-5).
 */
async function readPdf(path: string, options: ReadOptions): Promise<DocumentText>
{
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path))).catch((error: unknown) => {
        throw (error as Error | undefined)?.name === "PasswordException" ? new Error(`${basename(path)} asks for a password to open: the engine never opens a locked document.`) : error;
    });
    const { text } = await extractText(pdf, { mergePages: false });
    const parts = text.map((page, index) => ({ label: `p. ${index + 1}`, text: page.trim() }));
    const { unreadable, recognized } = await readUnreadable(path, parts, options);
    const pictures = options.pictures === false || options.signal?.aborted === true ? [] : await pdfPictures(pdf, parts);
    await pdf.cleanup();
    return { parts, pictures, unreadable, recognized };
}

/** The pages without readable text read again by the OCR, when there is one: the labels of those it read, and of those still without, their text left empty. */
async function readUnreadable(path: string, parts: DocumentPart[], options: ReadOptions): Promise<{ unreadable: string[]; recognized: string[]; }>
{
    const pages = parts.flatMap((part, index) => (isReadable(part.text) ? [] : [index + 1]));
    const ocr = options.ocr;
    const onPage = (done: number): void => options.progress?.(done, pages.length);
    const read = ocr === undefined || pages.length === 0 ? new Map<number, string>() : await ocr(resolve(path), pages, options.signal, onPage).catch(() => new Map<number, string>());
    const unreadable: string[] = [];
    const recognized: string[] = [];

    for (const page of pages) {
        const part = parts[page - 1];
        const text = read.get(page)?.trim() ?? "";
        part.text = isReadable(text) ? text : "";
        (part.text === "" ? unreadable : recognized).push(part.label);
    }

    return { unreadable, recognized };
}

type PdfProxy = Awaited<ReturnType<typeof import("unpdf").getDocumentProxy>>;

// A PDF's pictures without decorations, each marked at the end of the text of its page.
async function pdfPictures(pdf: PdfProxy, parts: DocumentPart[]): Promise<DocumentPicture[]>
{
    const { extractImages } = await import("unpdf");

    // Each page's pictures are looked at and let go, then those kept are taken again one page at a time: a book's raw pixels never sit in memory together.
    const big = async (page: number) => {
        const images = await extractImages(pdf, page).catch(() => []);
        // pdf.js keeps a page's decoded pictures until the page is cleaned up.
        await pdf.getPage(page).then((proxy) => proxy.cleanup(), () => undefined);
        return images.filter((image) => Math.min(image.width, image.height) >= smallestSide);
    };

    const keyOf = (data: Uint8ClampedArray): string => createHash("sha1").update(data).digest("hex");
    const found: { page: number; key: string; }[] = [];

    for (let page = 1; page <= pdf.numPages; page++) {
        found.push(...(await big(page)).map((image) => ({ page, key: keyOf(image.data) })));
    }

    const pagesOf = new Map<string, Set<number>>();

    for (const { page, key } of found) {
        pagesOf.set(key, (pagesOf.get(key) ?? new Set()).add(page));
    }

    const kept = found.filter(({ key }, index) => (pagesOf.get(key)?.size ?? 0) <= decorationPages && found.findIndex((other) => other.key === key) === index).slice(0, mostPictures);
    const pictures: DocumentPicture[] = [];

    for (const page of [...new Set(kept.map((one) => one.page))]) {
        const images = await big(page);
        const here = kept.filter((one) => one.page === page);
        here.forEach(({ key }, index) => {
            const image = images.find((candidate) => keyOf(candidate.data) === key);

            if (image !== undefined) {
                pictures.push({ name: `p${String(page).padStart(3, "0")}-${index + 1}.png`, label: `p. ${page}`, data: pngOf(image, longestSide) });
            }
        });
    }

    for (const picture of pictures) {
        const part = parts.find((candidate) => candidate.label === picture.label);

        if (part !== undefined) {
            part.text = `${part.text}\n\n[picture: ${picture.name}]`.trim();
        }
    }

    return pictures;
}

/** A document of text as it was asked for: for a library, without its pictures and their marks. */
function withPictures(text: Omit<DocumentText, "unreadable" | "recognized">, options: ReadOptions): DocumentText
{
    if (options.pictures !== false) {
        return { ...text, unreadable: [], recognized: [] };
    }

    return { parts: text.parts.map((part) => ({ ...part, text: part.text.replace(/\n*\[picture: [^\]]+\]/g, "").trim() })), pictures: [], unreadable: [], recognized: [] };
}

// A document of text: its paragraphs, in parts of about a page labelled with `name`, its pictures where they stand. Locked, it says why, by its `file`.
function readText(kind: string, bytes: Uint8Array, file: string, name: string): Omit<DocumentText, "unreadable" | "recognized">
{
    const locked = lockOf(kind, bytes);

    if (locked !== undefined) {
        throw new Error(`${file} ${locked}: the engine never opens a locked document.`);
    }

    const { text, files } = kind === ".docx" ? fromWord(bytes) : kind === ".odt" ? fromOpenDocument(bytes) : kind === ".epub" ? fromEpub(bytes) : fromPlain(kind, bytes);
    const pictures: DocumentPicture[] = [];
    const taken = new Set<string>();
    let blocks = text.split("\n\n");

    blocks = blocks.map((block) =>
        block.replace(/\u0000([^\u0000]*)\u0000/g, (_, source: string) => {
            const data = files[source];
            const extension = extname(source).toLowerCase().replace(".jpeg", ".jpg");

            if (data === undefined || ![".png", ".jpg", ".webp", ".svg"].includes(extension) || data.length < 4096 || pictures.length >= mostPictures) {
                return "";
            }

            const picture = { name: freeName(taken, `${basename(source, extname(source)).replace(/[^\w-]+/g, "-")}${extension}`), label: "", data };
            taken.add(picture.name);
            pictures.push(picture);
            return `[picture: ${picture.name}]`;
        })
    );

    const parts: DocumentPart[] = [];
    let words = 0;

    for (const block of blocks.filter((one) => one.trim() !== "").flatMap(pageSized)) {
        const count = sizeOf(block);

        if (parts.length === 0 || words + count > partWords) {
            parts.push({ label: "", text: block });
            words = count;
        } else {
            const last = parts.at(-1)!;
            last.text = `${last.text}\n\n${block}`;
            words += count;
        }
    }

    const label = (index: number): string => (name === "" ? `part ${index + 1}` : parts.length === 1 ? name : `${name}, part ${index + 1}`);
    parts.forEach((part, index) => (part.label = label(index)));

    for (const picture of pictures) {
        picture.label = parts.find((part) => part.text.includes(`[picture: ${picture.name}]`))?.label ?? label(0);
    }

    return { parts, pictures };
}

/**
 * Why a document of text is locked (LIB-5): a Word document with a password is no zip but an encrypted container, an OpenDocument's manifest says it is
 * encrypted, an EPUB's text is encrypted by DRM (its fonts may be, harmlessly); undefined when it is not.
 */
function lockOf(kind: string, bytes: Uint8Array): string | undefined
{
    if (kind === ".docx" && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
        return "asks for a password to open (or is an old .doc saved as .docx)";
    }

    if (kind !== ".odt" && kind !== ".epub") {
        return undefined;
    }

    let zip: Record<string, Uint8Array>;

    try {
        zip = unzipSync(bytes, { filter: (file) => file.name.startsWith("META-INF/") });
    } catch {
        return undefined;
    }

    if (kind === ".odt") {
        return (textOf(zip, "META-INF/manifest.xml") ?? "").includes("encryption-data") ? "asks for a password to open" : undefined;
    }

    const encrypted = [...(textOf(zip, "META-INF/encryption.xml") ?? "").matchAll(/<(?:\w+:)?CipherReference\b[^>]*URI="([^"]+)"/g)].map(([, uri]) => uri ?? "");
    return encrypted.some((uri) => !/\.(otf|ttf|woff2?)$/i.test(uri)) || zip["META-INF/rights.xml"] !== undefined || zip["META-INF/license.lcpl"] !== undefined
        ? "is locked by DRM"
        : undefined;
}

/** How long a text is, in words: a Chinese, Japanese or Korean letter counts as one, as a model reads it; else about six letters a word. */
function sizeOf(text: string): number
{
    const letters = text.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/gu)?.length ?? 0;
    return Math.max(text.split(/\s+/).filter((word) => word !== "").length + letters, Math.ceil(text.length / 6));
}

// A block longer than a page, as a text with a line for each paragraph or with no spaces, cut by its lines, then by its length.
function pageSized(block: string): string[]
{
    if (sizeOf(block) <= partWords) {
        return [block];
    }

    const lines = block.split("\n");

    if (lines.length > 1) {
        const cut: string[] = [];

        for (const line of lines) {
            const last = cut.at(-1);

            if (last !== undefined && sizeOf(`${last}\n${line}`) <= partWords) {
                cut[cut.length - 1] = `${last}\n${line}`;
            } else {
                cut.push(line);
            }
        }

        return cut.flatMap(pageSized);
    }

    // A block of one line is cut by its length: as many letters as make a page by sizeOf.
    const letters = Math.max(1, Math.floor((block.length * partWords) / sizeOf(block)));
    return Array.from({ length: Math.ceil(block.length / letters) }, (_, index) => block.slice(index * letters, (index + 1) * letters));
}

// A text file in UTF-8, or in UTF-16 by its mark, or else in the Windows encoding older editors wrote.
function decoded(bytes: Uint8Array): string
{
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder("utf-16le").decode(bytes);
    }

    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder("utf-16be").decode(bytes);
    }

    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        return new TextDecoder("windows-1252").decode(bytes);
    }
}

interface Unpacked
{
    text: string;
    /** The document's own files by the names its text marks them with. */
    files: Record<string, Uint8Array>;
}

function fromPlain(kind: string, bytes: Uint8Array): Unpacked
{
    const text = decoded(bytes).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    return { text: kind === ".rtf" ? rtfText(text) : kind === ".txt" || kind === ".md" ? text.trim() : htmlText(text), files: {} };
}

// A Word document: its text from word/document.xml, its pictures by the ids its relations give them.
function fromWord(bytes: Uint8Array): Unpacked
{
    const zip = unzipSync(bytes);
    const xml = textOf(zip, "word/document.xml");

    if (xml === undefined) {
        throw new Error("This .docx has no word/document.xml: it is no Word document, or it is damaged. Save it again from the program that made it.");
    }

    const relations = textOf(zip, "word/_rels/document.xml.rels") ?? "";
    const files: Record<string, Uint8Array> = {};
    const named = new Map<string, string>();

    for (const [tag] of relations.matchAll(/<Relationship\b[^>]*>/g)) {
        const id = /\bId="([^"]+)"/.exec(tag)?.[1];
        const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];
        const file = target === undefined ? undefined : zip[posix.normalize(posix.join("word", target))];

        if (id !== undefined && target !== undefined && file !== undefined) {
            files[target] = file;
            named.set(id, target);
        }
    }

    // The mark carries the relation's id; the file is known by its path.
    const text = wordText(xml).replace(/\u0000([^\u0000]+)\u0000/g, (_, id: string) => {
        const target = named.get(id);
        return target === undefined ? "" : pictureMark(target);
    });
    return { text, files };
}

function fromOpenDocument(bytes: Uint8Array): Unpacked
{
    const zip = unzipSync(bytes);
    const xml = textOf(zip, "content.xml");

    if (xml === undefined) {
        throw new Error("This .odt has no content.xml: it is no OpenDocument text, or it is damaged. Save it again from the program that made it.");
    }

    return { text: openDocumentText(xml), files: zip };
}

// An EPUB: its chapters in the order of its spine, its pictures by their path in the book.
function fromEpub(bytes: Uint8Array): Unpacked
{
    const zip = unzipSync(bytes);
    const root = /full-path="([^"]+)"/.exec(textOf(zip, "META-INF/container.xml") ?? "")?.[1];
    const opf = root === undefined ? undefined : textOf(zip, root);

    if (root === undefined || opf === undefined) {
        throw new Error("This .epub has no table of its contents (META-INF/container.xml): it is damaged. Save it again from the program that made it.");
    }

    const folder = posix.dirname(root);
    const items = new Map([...opf.matchAll(/<item\b[^>]*>/g)].map(([tag]) => [/\bid="([^"]+)"/.exec(tag)?.[1] ?? "", /\bhref="([^"]+)"/.exec(tag)?.[1] ?? ""]));
    const chapters = [...opf.matchAll(/<itemref\b[^>]*?idref="([^"]+)"/g)].map(([, id]) => posix.normalize(posix.join(folder, uriDecoded(items.get(id ?? "") ?? ""))));
    const text = chapters
        .map((path) => {
            const html = textOf(zip, path) ?? "";
            const here = posix.dirname(path);
            // A picture's path is made the book's own, so that the mark finds its file.
            return htmlText(html).replace(/\u0000([^\u0000]+)\u0000/g, (_, source: string) => pictureMark(posix.normalize(posix.join(here, uriDecoded(source)))));
        })
        .filter((chapter) => chapter !== "")
        .join("\n\n");
    return { text, files: zip };
}

// A path an EPUB writes encoded, as it is when it is not: a % in a file's name.
function uriDecoded(path: string): string
{
    try {
        return decodeURIComponent(path);
    } catch {
        return path;
    }
}

function textOf(zip: Record<string, Uint8Array>, path: string): string | undefined
{
    const file = zip[path];
    return file === undefined ? undefined : new TextDecoder().decode(file);
}

function filesUnder(folder: string): string[]
{
    return readdirSync(folder, { withFileTypes: true })
        .filter((entry) => !entry.name.startsWith("."))
        .sort((one, other) => one.name.localeCompare(other.name, "en", { numeric: true }))
        .flatMap((entry) => (entry.isDirectory() ? filesUnder(join(folder, entry.name)) : entry.isFile() ? [join(folder, entry.name)] : []));
}

function freeName(taken: Set<string>, name: string): string
{
    const extension = extname(name);
    const stem = name.slice(0, name.length - extension.length);
    let candidate = name;

    for (let index = 2; taken.has(candidate); index++) {
        candidate = `${stem}-${index}${extension}`;
    }

    taken.add(candidate);
    return candidate;
}
