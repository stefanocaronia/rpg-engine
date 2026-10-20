// The importer's folder in the campaign (D-489): the player's document as text in pieces with its pictures, the mark of how far it is, and what the helper
// writes there, notes and the adventure. Another process writes in it, so it is read and written here, never through the campaign's store.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse, stringify } from "yaml";

/** A document as the importer takes it: its parts, each with how it is cited, and its pictures. */
export interface ImportedText
{
    parts: { label: string; text: string; }[];
    pictures: { name: string; data: Uint8Array; }[];
}

/** The folder of the campaign where imports are worked on, apart from its world. */
export const importsFolderName = ".imports";

/** Where an import stands (D-489): reading the pieces, waiting for the player's start, setting the world there, or done. */
export interface ImportState
{
    title: string;
    /** The document as the player gave it. */
    document: string;
    pieces: number;
    phase: "reading" | "choosing" | "writing" | "done";
    /** The steps done in this phase: pieces read, or folders set. */
    done: number;
    /** The steps of the writing: the folders of pages, then the opening. */
    steps?: string[];
    start?: number;
    /** Why the last run stopped; the next call of import tries it again. */
    failed?: string;
}

/** A starting point the reading proposed, as notes/starts.md writes it. */
export interface ImportStart
{
    number: number;
    title: string;
    text: string;
}

// About sixteen printed pages a piece, what Elena's probe read well in one run (D-489).
const pieceWords = 7000;

/** The folder of an import, by the name its title gives a folder. */
export function importFolder(root: string, name: string): string
{
    return join(root, importsFolderName, name);
}

/** The import not yet done, if any: one at a time. */
export function openImport(root: string): { folder: string; state: ImportState; } | undefined
{
    const imports = join(root, importsFolderName);

    if (!existsSync(imports)) {
        return undefined;
    }

    return readdirSync(imports, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({ folder: join(imports, entry.name), state: readImportState(join(imports, entry.name)) }))
        .flatMap((found) => (found.state === undefined || found.state.phase === "done" ? [] : [{ folder: found.folder, state: found.state }]))[0];
}

/** The titles of the imports done, which package install may add. */
export function doneImports(root: string): string[]
{
    const imports = join(root, importsFolderName);
    return existsSync(imports)
        ? readdirSync(imports, { withFileTypes: true }).filter((entry) => entry.isDirectory()).flatMap((entry) => {
            const state = readImportState(join(imports, entry.name));
            return state?.phase === "done" ? [state.title] : [];
        })
        : [];
}

export function readImportState(folder: string): ImportState | undefined
{
    const file = join(folder, "import.yaml");
    return existsSync(file) ? (parse(readFileSync(file, "utf8")) as ImportState) : undefined;
}

export function writeImportState(folder: string, state: ImportState): void
{
    writeFileSync(join(folder, "import.yaml"), stringify(state));
}

/** The import's folder made from a document: its text in pieces, each part headed by its label, its pictures, and the mark at the start of the reading. */
export function prepareImport(folder: string, title: string, document: string, text: ImportedText): ImportState
{
    const pieces: string[] = [];
    let words = 0;

    for (const part of text.parts) {
        const block = `[${part.label}]\n\n${part.text}`;
        const count = part.text.split(/\s+/).length;

        if (pieces.length === 0 || words + count > pieceWords) {
            pieces.push(block);
            words = count;
        } else {
            pieces[pieces.length - 1] = `${pieces.at(-1)}\n\n${block}`;
            words += count;
        }
    }

    for (const name of ["document/pictures", "notes", "adventure/world"]) {
        mkdirSync(join(folder, name), { recursive: true });
    }

    pieces.forEach((piece, index) => writeFileSync(join(folder, "document", pieceName(index)), `${piece}\n`));
    text.pictures.forEach((picture) => writeFileSync(join(folder, "document", "pictures", picture.name), picture.data));
    const state: ImportState = { title, document, pieces: pieces.length, phase: "reading", done: 0 };
    writeImportState(folder, state);
    return state;
}

/** The starting points the reading proposed, in their order. */
export function importStarts(folder: string): ImportStart[]
{
    const file = join(folder, "notes", "starts.md");

    if (!existsSync(file)) {
        return [];
    }

    return readFileSync(file, "utf8").replace(/\r\n/g, "\n").split(/^## /m).slice(1).flatMap((block) => {
        const [heading = "", ...rest] = block.split("\n");
        const match = /^(\d+)\.?\s*(.*)$/.exec(heading.trim());
        return match === null ? [] : [{ number: Number(match[1]), title: (match[2] ?? "").trim(), text: rest.join("\n").trim() }];
    });
}

/** The pages written so far, by their folder, each with its other names. */
export function importedPages(folder: string): Record<string, string[]>
{
    const world = join(folder, "adventure", "world");
    const pages: Record<string, string[]> = {};

    for (const type of existsSync(world) ? readdirSync(world, { withFileTypes: true }).filter((entry) => entry.isDirectory()) : []) {
        pages[type.name] = readdirSync(join(world, type.name)).filter((file) => file.endsWith(".md")).sort().map((file) => {
            const fields = frontmatterOf(join(world, type.name, file));
            const aliases = Array.isArray(fields.aliases) ? fields.aliases.map(String) : [];
            return `${basename(file, ".md")}${aliases.length === 0 ? "" : ` (${aliases.join(", ")})`}`;
        });
    }

    return pages;
}

/** Whether the campaign has an import in this folder, done or not. */
export function hasImport(folder: string): boolean
{
    return existsSync(folder);
}

/** The import's folder gone, the player's document untouched. */
export function dropImport(folder: string): void
{
    rmSync(folder, { recursive: true, force: true });
}

/** A file the helper wrote in the import's folder, such as notes/invented.md; undefined when it wrote none. */
export function importFile(folder: string, path: string): string | undefined
{
    const file = join(folder, path);
    return existsSync(file) ? readFileSync(file, "utf8").trim() : undefined;
}

/**
 * The adventure finished: the pictures its pages show copied into it, its manifest given the campaign's language and the document's license, as an open one
 * allows sharing and anything else keeps it to the player (D-489 (6)).
 */
export function finishAdventure(folder: string, title: string, language: string): void
{
    const pictures = join(folder, "document", "pictures");
    const world = join(folder, "adventure", "world");

    for (const type of readdirSync(world, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
        for (const file of readdirSync(join(world, type.name)).filter((name) => name.endsWith(".md"))) {
            const image = /^\[\[([^\]|#]+)\]\]$/.exec(String(frontmatterOf(join(world, type.name, file)).image ?? "").trim())?.[1];

            if (image !== undefined && existsSync(join(pictures, image))) {
                mkdirSync(join(folder, "adventure", "images"), { recursive: true });
                copyFileSync(join(pictures, image), join(folder, "adventure", "images", image));
            }
        }
    }

    const manifestFile = join(folder, "adventure", "adventure.yaml");
    const manifest = yamlOf(manifestFile);
    const license = openLicense(String(yamlOf(join(folder, "notes", "source.yaml")).license ?? ""));
    // The import's own title, which status and the log know it by, over the one the helper wrote.
    writeFileSync(manifestFile, stringify({ version: "1.0.0", ...manifest, title, language, license: license ?? "personal use only" }));
}

/** The license as a shared adventure may carry it: public domain or a Creative Commons one that allows adapting; undefined for any other or none. */
export function openLicense(license: string): string | undefined
{
    if (/public domain|pubblico dominio|\bcc0\b/i.test(license)) {
        return "public domain";
    }

    // No-derivatives licenses allow no adventure made from the work to be shared (D-489 (6)).
    const creative = /\bCC[ -]BY(?:[ -](NC[ -]SA|SA|NC))?(?:[ -](\d\.\d))?\b/i.exec(license);
    return creative === null || /\bND\b/i.test(license) ? undefined : `CC BY${creative[1] === undefined ? "" : `-${creative[1].toUpperCase().replace(" ", "-")}`} ${creative[2] ?? "4.0"}`;
}

function pieceName(index: number): string
{
    return `${String(index + 1).padStart(2, "0")}.md`;
}

// A page's frontmatter as YAML; nothing when it has none or it does not read.
function frontmatterOf(path: string): Record<string, unknown>
{
    const match = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, "utf8"));

    try {
        const fields: unknown = match === null ? {} : parse(match[1] ?? "");
        return typeof fields === "object" && fields !== null ? (fields as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}

function yamlOf(path: string): Record<string, unknown>
{
    try {
        const value: unknown = existsSync(path) ? parse(readFileSync(path, "utf8")) : {};
        return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}
