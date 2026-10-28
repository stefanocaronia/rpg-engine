// The player's books and their index (D-491, LIB-2, LIB-3): the documents in the folders of the library, and the text of each kept in a file of its own in
// the index's folder, once for all their campaigns. The engine reads the books' folders and never writes in them.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, type Stats, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { claimMark, markHolder, releaseMark } from "../core/process-mark.ts";
import { bookLanguage } from "./language.ts";

/** A book as the index holds it, read (LIB-3). */
export interface LibraryBook
{
    /** Its file's name without the extension; with it, then with its folder's, when two books share it (LIB-2). */
    name: string;
    path: string;
    /** Whether its parts are a PDF's pages, cited as PDF p. N. */
    pdf: boolean;
    /** Its language as a code, such as it, when its words tell it. */
    language?: string;
    parts: BookPart[];
    /** The labels of its parts without readable text (LIB-4). */
    unreadable: string[];
    /** The labels of its parts read by the OCR, whose numbers may be wrong. */
    recognized: string[];
}

/** A page of a book, or a part of a document without pages: how it is cited, and its text. */
export interface BookPart
{
    label: string;
    text: string;
}

/**
 * What a library is now (LIB-3): its books read, the files still to read, those skipped and why, and the entries of its list that are not there. A book's
 * name counts the books still to read too, so that it keeps it while another is read.
 */
export interface LibraryState
{
    books: LibraryBook[];
    waiting: string[];
    skipped: { path: string; why: string; }[];
    missing: string[];
    /** The entries with more documents than a library takes, of which only the first are books. */
    crowded: string[];
}

/** The most documents an entry of the library gives: a folder with more is no shelf of books but a disk or a folder of everything (LIB-1). */
export const mostBooks = 300;

/** What a library takes from its folders: the kinds of document, by extension; it leaves out a folder holding a file of this name, as a campaign's. */
export interface LibraryScope
{
    kinds: string[];
    skipFoldersWith: string;
}

/** What reading a book gives: its parts, those without readable text, and those the OCR read. */
export interface BookText
{
    parts: BookPart[];
    unreadable: string[];
    recognized: string[];
}

/** What a reader stopped half way left of a book: the pages the OCR read, by number, to go on from; and what hears each page it reads now. */
export interface BookResume
{
    known: Map<number, string>;
    keep(read: Map<number, string>): void;
}

/** The library of these entries, folders or documents, as the index in `folder` has it now (LIB-2, LIB-3). */
export function libraryState(folder: string, entries: string[], scope: LibraryScope): LibraryState
{
    const { found, missing, crowded } = libraryFiles(entries, scope);
    const names = bookNames(found.map((file) => file.path));
    const books: LibraryBook[] = [];
    const waiting: string[] = [];
    const skipped: { path: string; why: string; }[] = [];

    found.forEach((file, at) => {
        const index = loadIndex(folder, file.path);
        const why = index === undefined || !isCurrent(index, file) ? undefined : skippedWhy(index);

        if (index === undefined || !isCurrent(index, file) || (index.parts === undefined && why === undefined)) {
            waiting.push(file.path);
        } else if (why !== undefined) {
            skipped.push({ path: file.path, why });
        } else {
            books.push({
                name: names[at],
                path: file.path,
                pdf: extname(file.path).toLowerCase() === ".pdf",
                ...(index.language === undefined ? {} : { language: index.language }),
                parts: index.parts ?? [],
                unreadable: index.unreadable ?? [],
                recognized: index.recognized ?? [],
            });
        }
    });

    return { books, waiting, skipped, missing, crowded };
}

/**
 * Reads the library's files still to read, one at a time, and writes the index of each in `folder`: its text, or why it was skipped (LIB-3, LIB-5); then drops
 * the index of a file that is gone from a folder still there. The entries, and their folders, are looked at again once all were read, so that a book added or
 * changed meanwhile is read too. A book is marked before it is read, and the pages the OCR reads are kept as it goes: the next reader goes on from them, and
 * one that stopped two readers with no page read between is skipped. Stops when `signal` does.
 */
export async function readLibrary(
    folder: string,
    entries: () => string[],
    scope: LibraryScope,
    read: (path: string, resume: BookResume) => Promise<BookText>,
    signal?: AbortSignal,
): Promise<void>
{
    const tried = new Map<string, string>();
    const stopped = (): boolean => signal?.aborted === true;

    for (;;) {
        // A file that changes while it is read is read again once it stays as it is, never twice as it was.
        const next = libraryFiles(entries(), scope).found.filter((file) => isWaiting(folder, file) && tried.get(file.path) !== stampOf(file));

        if (next.length === 0 || stopped()) {
            break;
        }

        for (const file of next) {
            // A folder taken off the computer meanwhile is read no further.
            if (!entries().some((entry) => isWithin(entry, file.path))) {
                continue;
            }

            // Another reader took the library meanwhile, as one that found this one's mark too old: it goes on alone.
            const holder = libraryReader(folder);

            if (holder !== undefined && holder !== process.pid) {
                return;
            }

            if (stopped()) {
                break;
            }

            tried.set(file.path, stampOf(file));
            const stamp = { format: 1 as const, path: file.path, size: file.size, modified: file.modified };
            // A file another program keeps busy keeps its mark, to be read the next time: twice, and it is skipped as one that stops the reader.
            const index = await indexOf(stamp, (path) => read(path, resumeOf(folder, file, stamp)));

            if (index !== undefined) {
                writeIndex(folder, index);
            }
        }
    }

    dropGone(folder);
}

/** The folders right inside a folder, by name, without those whose name starts with a dot: where one too big for a library may keep a game's books. */
export function foldersIn(folder: string): string[]
{
    try {
        return readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort((one, other) => one.localeCompare(other));
    } catch {
        return [];
    }
}

/** Takes the reading of the library for this process, at once or not at all: false while another live process reads it, one at a time on a computer. */
export function claimLibrary(folder: string): boolean
{
    return claimMark(lockFile(folder));
}

/** Lets the reading go, once this process stops. */
export function releaseLibrary(folder: string): void
{
    releaseMark(lockFile(folder));
}

/** The live process that reads the library now, if one does. */
export function libraryReader(folder: string): number | undefined
{
    return markHolder(lockFile(folder));
}

/**
 * The index of a book as its file keeps it (LIB-3): the file it is of, as it was when read, and its text, or why it was skipped; or, while it is read, how many
 * readers began it.
 */
interface BookIndex
{
    format: 1;
    path: string;
    size: number;
    modified: number;
    language?: string;
    parts?: BookPart[];
    unreadable?: string[];
    recognized?: string[];
    skipped?: string;
    reading?: number;
    /** While it is read: the pages the OCR read so far, by number, and how many there were when the last reader began. */
    ocrPages?: Record<string, string>;
    startedWith?: number;
}

interface FoundFile
{
    path: string;
    size: number;
    modified: number;
}

// The indexes read in this process, kept while their file stays the same: the MCP server reads a book's index once.
const loaded = new Map<string, { stamp: string; index: BookIndex | undefined; }>();

// Readers that stopped on a book before it is skipped: a book too big or broken for them.
const mostReaders = 2;

/** The documents of the entries, each once however its path is written, in order of path; the entries that are not there, and those with too many. */
function libraryFiles(entries: string[], scope: LibraryScope): { found: FoundFile[]; missing: string[]; crowded: string[]; }
{
    const paths = new Map<string, string>();
    const missing: string[] = [];
    const crowded: string[] = [];

    const add = (path: string): void => {
        if (!paths.has(pathKey(path))) {
            paths.set(pathKey(path), path);
        }
    };

    for (const entry of entries) {
        const kind = kindOf(entry);

        if (kind === undefined) {
            missing.push(entry);
        } else if (kind === "folder") {
            const documents = documentsIn(resolve(entry), scope);

            if (documents.length > mostBooks) {
                crowded.push(entry);
            }

            documents.slice(0, mostBooks).forEach(add);
        } else if (scope.kinds.includes(extname(entry).toLowerCase())) {
            // A document of a kind the engine does not read is no book.
            add(resolve(entry));
        }
    }

    const found = [...paths.values()].sort().flatMap((path) => {
        const stat = statOf(path);
        return stat === undefined ? [] : [{ path, size: stat.size, modified: Math.round(stat.mtimeMs) }];
    });
    return { found, missing, crowded };
}

// The documents in a folder and its folders, without those whose name starts with a dot and the folders the scope leaves out; one more than a library takes
// at most, so that a disk is never looked through whole.
function documentsIn(folder: string, scope: LibraryScope): string[]
{
    const documents: string[] = [];
    const folders = [folder];

    for (let index = 0; index < folders.length && documents.length <= mostBooks; index++) {
        if (existsSync(join(folders[index], scope.skipFoldersWith))) {
            continue;
        }

        let entries;

        try {
            entries = readdirSync(folders[index], { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries.filter((one) => !one.name.startsWith("."))) {
            const path = join(folders[index], entry.name);

            if (entry.isDirectory()) {
                folders.push(path);
            } else if (entry.isFile() && scope.kinds.includes(extname(entry.name).toLowerCase())) {
                documents.push(path);
            }
        }
    }

    return documents;
}

/** A book read into its index, or skipped with why; undefined when the system failed for a while, as a file open elsewhere, to try again the next time. */
async function indexOf(stamp: Omit<BookIndex, "parts">, read: (path: string) => Promise<BookText>): Promise<BookIndex | undefined>
{
    try {
        const text = await read(stamp.path);
        const language = bookLanguage(text.parts.map((part) => part.text).join("\n"));
        return { ...stamp, ...(language === undefined ? {} : { language }), parts: text.parts, unreadable: text.unreadable, recognized: text.recognized };
    } catch (error) {
        // Kept busy by another program, or its OCR stopped half way, as by the app closed: read the next time, from the pages read.
        if (["EBUSY", "EMFILE", "EAGAIN", "EINTR"].includes((error as NodeJS.ErrnoException).code ?? "")) {
            return undefined;
        }

        return { ...stamp, skipped: (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "" };
    }
}

/** Why a book is skipped: locked or broken, or it stopped the reader too many times; undefined for one read, or still to read. */
function skippedWhy(index: BookIndex): string | undefined
{
    if (index.skipped !== undefined) {
        return index.skipped;
    }

    return index.parts === undefined && (index.reading ?? 0) >= mostReaders && !hasMoved(index)
        ? `${basename(index.path)} could not be read ${mostReaders} times, too big or broken for the reader, or kept busy by another program: close that program, `
            + "or save the file again, which has it read again"
        : undefined;
}

/**
 * A book marked as read by one more reader, from the pages a reader before it left (LIB-3): a reader stopped after the reading moved on, as by the app closed,
 * is no reader the book stopped. The pages read are kept every few, so that the next goes on from there.
 */
function resumeOf(folder: string, file: FoundFile, stamp: Omit<BookIndex, "parts">): BookResume
{
    const before = loadIndex(folder, file.path);
    const left = before !== undefined && isCurrent(before, file) ? before : undefined;
    const known = new Map(Object.entries(left?.ocrPages ?? {}).map(([page, text]) => [Number(page), text]));
    const reading = left !== undefined && !hasMoved(left) ? (left.reading ?? 0) + 1 : 1;
    const mark = (pages: Map<number, string>): void => writeIndex(folder, { ...stamp, reading, startedWith: known.size, ocrPages: Object.fromEntries(pages) });
    let kept = 0;
    mark(known);
    return {
        known,
        keep: (read) => {
            if (read.size - kept >= savedEvery) {
                kept = read.size;
                mark(new Map([...known, ...read]));
            }
        },
    };
}

// How many pages the OCR reads between two saves of what it has read: a few seconds of its work.
const savedEvery = 10;

/** Whether the last reader of a book read some pages before it stopped. */
function hasMoved(index: BookIndex): boolean
{
    return Object.keys(index.ocrPages ?? {}).length > (index.startedWith ?? 0);
}

function isWaiting(folder: string, file: FoundFile): boolean
{
    const index = loadIndex(folder, file.path);
    return index === undefined || !isCurrent(index, file) || (index.parts === undefined && skippedWhy(index) === undefined);
}

function isCurrent(index: BookIndex, file: FoundFile): boolean
{
    return index.size === file.size && index.modified === file.modified;
}

/** The index of a file, if one was written and reads. */
function loadIndex(folder: string, path: string): BookIndex | undefined
{
    return loadIndexFile(indexFile(folder, path));
}

function loadIndexFile(file: string): BookIndex | undefined
{
    const stat = statOf(file);

    if (stat === undefined) {
        return undefined;
    }

    const stamp = `${stat.size} ${stat.mtimeMs}`;
    const kept = loaded.get(file);

    if (kept?.stamp === stamp) {
        return kept.index;
    }

    let index: BookIndex | undefined;

    try {
        const value = JSON.parse(readFileSync(file, "utf8")) as BookIndex;
        index = value?.format === 1 && typeof value.path === "string" ? value : undefined;
    } catch {
        index = undefined;
    }

    loaded.set(file, { stamp, index });
    return index;
}

// Written whole or not at all: a search reading at the same time never sees half of it.
function writeIndex(folder: string, index: BookIndex): void
{
    const file = indexFile(folder, index.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.part`, JSON.stringify(index));
    replaceFile(`${file}.part`, file);
}

/** Moves a file written whole into its place; again for a moment while another process reads the old one, which Windows refuses. */
export function replaceFile(written: string, file: string): void
{
    for (let attempt = 1;; attempt++) {
        try {
            renameSync(written, file);
            return;
        } catch (error) {
            if (attempt >= 20 || !["EPERM", "EBUSY", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) {
                throw error;
            }

            Atomics.wait(pause, 0, 0, 10);
        }
    }
}

const pause = new Int32Array(new SharedArrayBuffer(4));

/**
 * Drops the index of each file that is gone from a folder still there, whichever campaign had it, and what a reader stopped half way left; the books of a
 * folder that is not there now, as a disk taken out, stay.
 */
function dropGone(folder: string): void
{
    for (const name of existsSync(folder) ? readdirSync(folder) : []) {
        const index = name.endsWith(".json") ? loadIndexFile(join(folder, name)) : undefined;

        if (name.endsWith(".part") || (index !== undefined && statOf(index.path) === undefined && statOf(dirname(index.path)) !== undefined)) {
            rmSync(join(folder, name), { force: true });
        }
    }
}

// One file for each book, named after its path.
function indexFile(folder: string, path: string): string
{
    return join(folder, `${createHash("sha1").update(pathKey(path)).digest("hex").slice(0, 16)}.json`);
}

/** A path as the same file, however it is written: in any case on Windows, where a path is the same in any case. */
export function pathKey(path: string): string
{
    return process.platform === "win32" ? resolve(path).toLowerCase() : resolve(path);
}

/** Whether a path is the entry or lies inside it. */
export function isWithin(entry: string, path: string): boolean
{
    const inside = relative(pathKey(entry), pathKey(path));
    return inside === "" || (inside.split(sep)[0] !== ".." && !isAbsolute(inside));
}

function lockFile(folder: string): string
{
    return join(folder, ".reading");
}

function stampOf(file: FoundFile): string
{
    return `${file.size} ${file.modified}`;
}

/** Each book's name (LIB-2): its file's without the extension; two alike, with it; two still alike, with their folder's too. */
function bookNames(paths: string[]): string[]
{
    const plain = paths.map((path) => basename(path, extname(path)));
    const typed = paths.map((path, at) => (isShared(plain, plain[at]) ? basename(path) : plain[at]));
    return paths.map((path, at) => (isShared(typed, typed[at]) ? `${typed[at]} (${basename(dirname(path))})` : typed[at]));
}

function isShared(names: string[], name: string): boolean
{
    return names.filter((other) => other.toLowerCase() === name.toLowerCase()).length > 1;
}

function kindOf(path: string): "file" | "folder" | undefined
{
    const stat = statOf(path);
    return stat === undefined ? undefined : stat.isDirectory() ? "folder" : "file";
}

function statOf(path: string): Stats | undefined
{
    try {
        return statSync(path);
    } catch {
        return undefined;
    }
}
