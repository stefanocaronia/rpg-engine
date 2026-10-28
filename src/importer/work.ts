// The importer's folder in the campaign (D-489): the player's document as text in pieces with its pictures, the mark of how far it is, and what the helper
// writes there, notes and the adventure. Another process writes in it, so it is read and written here, never through the campaign's store.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse, stringify } from "yaml";
import { claimMark, isAlive, markHolder, releaseMark } from "../core/process-mark.ts";
import { textSize } from "../core/text.ts";

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
    /** The character of the document the player plays, when they chose one. */
    character?: string;
    /** Why the last run stopped; the next call of import tries it again. */
    failed?: string;
    /** What the engine's check found wrong in the adventure, for the helper's one more try. */
    fix?: string;
    /** Read by the master in the chat, a piece at each call, where no helper is on this computer: its pages go straight into the world. */
    inChat?: boolean;
    /** How the book is told, which the narration follows (Stefano, 21 October): set when the player had chosen nothing, else asked. */
    followed?: { author: string; story?: string; set: boolean; };
    /** The day of the world's calendar the story starts on, as the book gives it (Stefano, 21 October): set when the campaign had none, else asked. */
    dated?: { date: string; set: boolean; };
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
            return state?.phase === "done" && state.inChat !== true ? [state.title] : [];
        })
        : [];
}

/** How far an import is; one whose import.yaml does not read is stopped, under its folder's name, for the master to drop it. */
export function readImportState(folder: string): ImportState | undefined
{
    const file = join(folder, "import.yaml");

    if (!existsSync(file)) {
        return undefined;
    }

    try {
        const state = parse(readFileSync(file, "utf8")) as ImportState | null;

        if (typeof state?.title === "string" && typeof state.phase === "string" && typeof state.done === "number") {
            return state;
        }
    } catch {
        // Told below as a stopped import.
    }

    return { title: basename(folder), document: "", pieces: 0, phase: "reading", done: 0, failed: "its import.yaml was changed by hand and does not read: drop it with cancel" };
}

/** How long ago the import's mark was last written, in milliseconds; undefined without one. */
export function importAge(folder: string): number | undefined
{
    try {
        return Date.now() - statSync(join(folder, "import.yaml")).mtimeMs;
    } catch {
        return undefined;
    }
}

/** The mark written; never once the import was dropped, so that a run ending late does not bring its folder back. */
export function writeImportState(folder: string, state: ImportState): void
{
    if (existsSync(folder)) {
        writeFileSync(join(folder, "import.yaml"), stringify(state));
    }
}

/**
 * Takes the import for this process, so that a second one, a command line beside the MCP server, never reads the same piece at the same time: false while
 * another live process holds it.
 */
export function claimImport(folder: string): boolean
{
    return claimMark(join(folder, ".running"));
}

/** The live process that runs the import now, other than this one, as the runner the MCP server started apart; undefined when none does. */
export function runElsewhere(folder: string): number | undefined
{
    const holder = markHolder(join(folder, ".running"));
    return holder === process.pid ? undefined : holder;
}

/** Lets the import go, once this process stops running it. */
export function releaseImport(folder: string): void
{
    releaseMark(join(folder, ".running"));
}

/** The import's folder made from a document: its text in pieces, each part headed by its label, its pictures, and the mark at the start of the reading. */
export function prepareImport(folder: string, title: string, document: string, text: ImportedText): ImportState
{
    const pieces: string[] = [];
    let words = 0;

    for (const part of text.parts) {
        const block = `[${part.label}]\n\n${part.text}`;
        const count = textSize(part.text);

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

/** How a novel or a story is told, as the reading wrote it in notes/style.yaml: its author, and how it is built; nothing for a module or notes. */
export function importStyle(folder: string): { author?: string; story?: string; }
{
    const style = yamlOf(join(folder, "notes", "style.yaml"));
    const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" && !/^unknown$/i.test(value.trim()) ? value.trim() : undefined);
    const author = text(style.author);
    const story = text(style.story);
    return { ...(author === undefined ? {} : { author }), ...(story === undefined ? {} : { story }) };
}

/** The day of the world's calendar the chosen start falls on, as notes/start.yaml writes it; undefined when the document gives none. */
export function importDate(folder: string): string | undefined
{
    const date = yamlOf(join(folder, "notes", "start.yaml")).date;
    return typeof date === "string" && date.trim() !== "" && !/^(unknown|none)$/i.test(date.trim()) ? date.trim() : undefined;
}

/** A piece of the document as it was written in the import's folder. */
export function importPiece(folder: string, index: number): string
{
    return readFileSync(join(folder, "document", pieceName(index)), "utf8").trim();
}

/** Whether the campaign has an import in this folder, done or not. */
export function hasImport(folder: string): boolean
{
    return existsSync(folder);
}

/** A document being opened for an import, before its folder is made (D-491 (11)): its title, the process that reads it, and how far the OCR is. */
export interface OpeningImport
{
    title: string;
    pid: number;
    /** Its pages read from their pictures so far, of those that have no readable text. */
    ocr?: { done: number; of: number; };
}

/** Marks a document being opened for an import by this process, as the dashboard tells it while the master waits: false while another live process opens one. */
export function beginOpening(root: string, title: string): boolean
{
    if (openingImport(root) !== undefined) {
        return false;
    }

    mkdirSync(join(root, importsFolderName), { recursive: true });
    writeFileSync(openingFile(root), stringify({ title, pid: process.pid }));
    return true;
}

/** Marks again how far the OCR is, while the mark is still this process's: one dropped by cancel stays dropped. */
export function markOpening(root: string, opening: OpeningImport): void
{
    if (isOwnOpening(root)) {
        writeFileSync(openingFile(root), stringify(opening));
    }
}

/** The document being opened for an import now, if a live process is opening one; a mark left by a process that is gone is taken away. */
export function openingImport(root: string): OpeningImport | undefined
{
    let opening: OpeningImport | null;

    try {
        opening = parse(readFileSync(openingFile(root), "utf8")) as OpeningImport | null;
    } catch {
        return undefined;
    }

    if (typeof opening?.title === "string" && typeof opening.pid === "number" && isAlive(opening.pid)) {
        return opening;
    }

    rmSync(openingFile(root), { force: true });
    return undefined;
}

/** Whether the document being opened is still this process's: false once cancel dropped it. */
export function isOwnOpening(root: string): boolean
{
    return openingImport(root)?.pid === process.pid;
}

/** The mark taken away: this process's once its document is open or failed to open, or any, as cancel drops it. */
export function clearOpening(root: string, own = true): void
{
    if (!own || isOwnOpening(root)) {
        rmSync(openingFile(root), { force: true });
    }
}

/** The import's folder gone, the player's document untouched. */
export function dropImport(folder: string): void
{
    // Windows holds a folder a little after the helper that ran in it stops.
    rmSync(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

/**
 * The document's text taken out of the import's folder once the import is done (LIB-8); its pictures too when the adventure has copied those its pages show,
 * else they stay for the master writing them in the chat.
 */
export function dropDocumentText(folder: string, pictures = false): void
{
    const document = join(folder, "document");

    for (const name of existsSync(document) ? readdirSync(document).filter((file) => /^\d+\.md$/.test(file)) : []) {
        rmSync(join(document, name), { force: true });
    }

    if (pictures) {
        rmSync(join(document, "pictures"), { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    }
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

            // A picture's name alone, never a path the helper wrote out of the pictures, as the document's own text (LIB-8).
            if (image !== undefined && basename(image) === image && /\.(?:png|jpe?g|webp|svg)$/i.test(image) && existsSync(join(pictures, image))) {
                mkdirSync(join(folder, "adventure", "images"), { recursive: true });
                copyFileSync(join(pictures, image), join(folder, "adventure", "images", image));
            }
        }
    }

    const manifestFile = join(folder, "adventure", "adventure.yaml");
    const manifest = yamlOf(manifestFile);
    const source = yamlOf(join(folder, "notes", "source.yaml"));
    const license = openLicense(String(source.license ?? ""));
    // A Creative Commons work is credited by its title, author, license and link, and says it was changed (CC BY 4.0 §3(a)(1)).
    const credited = license?.startsWith("CC BY") === true
        ? {
            attribution: [`"${String(source.title ?? title)}"`, source.author === undefined ? "" : ` by ${String(source.author)}`, `, ${license}`, source.link === undefined ? "" : `, ${String(source.link)}`, "; adapted as an adventure."]
                .join(""),
        }
        : {};
    // The import's own title, which status and the log know it by, over the one the helper wrote.
    writeFileSync(manifestFile, stringify({ version: "1.0.0", ...manifest, ...credited, title, language, license: license ?? "personal use only" }));
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

/** The file of a piece of the document, from the first. */
export function pieceName(index: number): string
{
    return `${String(index + 1).padStart(2, "0")}.md`;
}

function openingFile(root: string): string
{
    return join(root, importsFolderName, "opening.yaml");
}

// A page's frontmatter as YAML; nothing when it has none or it does not read.
function frontmatterOf(path: string): Record<string, unknown>
{
    const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path, "utf8"));

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
