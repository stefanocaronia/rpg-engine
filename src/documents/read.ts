import { unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, posix, relative } from "node:path";
import { htmlText, openDocumentText, pictureMark, rtfText, wordText } from "./markup.ts";
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

/** A document's text and pictures, from a file or from a folder of them; refused, saying which kinds are read, when it is none of them. */
export async function readDocument(path: string): Promise<DocumentText>
{
    if (statSync(path).isDirectory()) {
        return readFolder(path);
    }

    const kind = extname(path).toLowerCase();

    if (!documentKinds.includes(kind)) {
        throw new Error(`${basename(path)} is no document the engine reads: give a ${documentKinds.join(", ")} file, or a folder of them.`);
    }

    return kind === ".pdf" ? readPdf(readFileSync(path)) : readText(kind, readFileSync(path), "");
}

async function readFolder(folder: string): Promise<DocumentText>
{
    const found = filesUnder(folder).filter((file) => documentKinds.includes(extname(file).toLowerCase()));

    if (found.length === 0) {
        throw new Error(`The folder ${folder} holds no document the engine reads: ${documentKinds.join(", ")}.`);
    }

    const parts: DocumentPart[] = [];
    const pictures: DocumentPicture[] = [];

    for (const file of found) {
        const name = relative(folder, file).replace(/\\/g, "/");
        const kind = extname(file).toLowerCase();
        const read = kind === ".pdf" ? await readPdf(readFileSync(file)) : readText(kind, readFileSync(file), name);
        const prefix = (label: string): string => (kind === ".pdf" ? `${name}, ${label}` : label);
        parts.push(...read.parts.map((part) => ({ ...part, label: prefix(part.label) })));
        const taken = new Set(pictures.map((picture) => picture.name));
        pictures.push(...read.pictures.map((picture) => ({ ...picture, name: freeName(taken, picture.name), label: prefix(picture.label) })));
    }

    return { parts, pictures: pictures.slice(0, mostPictures) };
}

// A PDF: a part for each page, its text as the page lays it out; its pictures without decorations, each as a PNG.
async function readPdf(bytes: Uint8Array): Promise<DocumentText>
{
    const { extractImages, extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: false });
    const parts = text.map((page, index) => ({ label: `p. ${index + 1}`, text: page.trim() }));
    const found: { page: number; key: string; image: Awaited<ReturnType<typeof extractImages>>[number]; }[] = [];

    for (let page = 1; page <= pdf.numPages; page++) {
        const images = await extractImages(pdf, page).catch(() => []);
        found.push(...images.filter((image) => Math.min(image.width, image.height) >= smallestSide).map((image) => ({ page, key: createHash("sha1").update(image.data).digest("hex"), image })));
    }

    const pagesOf = new Map<string, Set<number>>();

    for (const { page, key } of found) {
        pagesOf.set(key, (pagesOf.get(key) ?? new Set()).add(page));
    }

    const kept = found.filter(({ key }, index) => (pagesOf.get(key)?.size ?? 0) <= decorationPages && found.findIndex((other) => other.key === key) === index).slice(0, mostPictures);
    const pictures = kept.map(({ page, image }, index) => {
        const onPage = kept.slice(0, index).filter((other) => other.page === page).length + 1;
        return { name: `p${String(page).padStart(3, "0")}-${onPage}.png`, label: `p. ${page}`, data: pngOf(image, longestSide) };
    });

    for (const picture of pictures) {
        const part = parts.find((candidate) => candidate.label === picture.label);

        if (part !== undefined) {
            part.text = `${part.text}\n\n[picture: ${picture.name}]`.trim();
        }
    }

    await pdf.cleanup();
    return { parts, pictures };
}

// A document of text: its paragraphs, in parts of about a page, its pictures where they stand.
function readText(kind: string, bytes: Uint8Array, name: string): DocumentText
{
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

    for (const block of blocks.filter((one) => one.trim() !== "")) {
        const count = block.split(/\s+/).length;

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

interface Unpacked
{
    text: string;
    /** The document's own files by the names its text marks them with. */
    files: Record<string, Uint8Array>;
}

function fromPlain(kind: string, bytes: Uint8Array): Unpacked
{
    const text = new TextDecoder().decode(bytes).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
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
    const chapters = [...opf.matchAll(/<itemref\b[^>]*?idref="([^"]+)"/g)].map(([, id]) => posix.normalize(posix.join(folder, decodeURIComponent(items.get(id ?? "") ?? ""))));
    const text = chapters
        .map((path) => {
            const html = textOf(zip, path) ?? "";
            const here = posix.dirname(path);
            // A picture's path is made the book's own, so that the mark finds its file.
            return htmlText(html).replace(/\u0000([^\u0000]+)\u0000/g, (_, source: string) => pictureMark(posix.normalize(posix.join(here, decodeURIComponent(source)))));
        })
        .filter((chapter) => chapter !== "")
        .join("\n\n");
    return { text, files: zip };
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
