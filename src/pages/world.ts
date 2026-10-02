import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { linkedPages } from "./markdown.ts";
import { readFields, splitPageFile } from "./page-file.ts";
import { type PageType, pageTypes, typeOfFolder, worldFolderName } from "./page-types.ts";

const forbiddenCharacters = /[\\/:*?"<>|#^[\]]/;

/** A page of the world: one thing with a name. It describes only itself; who has it or knows it is written on their own pages. */
export interface Page
{
    /** The file name without .md: unique in the campaign, and the target of links such as [[Name]]. */
    name: string;
    /** Given by the page's folder; undefined for a free page outside the folders of the types. */
    type?: PageType;
    /** Path from the campaign folder, with forward slashes. */
    path: string;
    /** The frontmatter. */
    fields: Record<string, unknown>;
    /** The markdown text. */
    body: string;
}

/** Every page of a campaign, read from its world folder. */
export interface World
{
    /** The campaign folder. */
    root: string;
    pages: Page[];
}

export interface PageMatch
{
    page: Page;
    /** The line or the field where the text was found, if not in the name. */
    excerpt?: string;
}

export interface Backlink
{
    page: Page;
    /** The fields that link to the page, and "text" when the text does. */
    places: string[];
}

/** Creates the world folder with a folder for each type of page. */
export function createWorld(root: string): void
{
    for (const folder of Object.values(pageTypes)) {
        mkdirSync(join(root, worldFolderName, folder), { recursive: true });
    }
}

export function loadWorld(root: string): World
{
    const worldPath = join(root, worldFolderName);
    const entries = existsSync(worldPath) ? readdirSync(worldPath, { recursive: true, withFileTypes: true }) : [];
    const pages = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => readPage(root, join(entry.parentPath, entry.name)))
        .sort((first, second) => (first.path < second.path ? -1 : 1));
    checkUniqueNames(pages);
    return { root, pages };
}

/** The page with this name, ignoring case. */
export function findPage(world: World, name: string): Page | undefined
{
    const wanted = name.toLowerCase();
    return world.pages.find((page) => page.name.toLowerCase() === wanted);
}

/** Splits "Page", "Page#Section" or a link such as "[[Page#Section|label]]" into the page's name and the section. */
export function parsePageReference(reference: string): { name: string; section?: string; }
{
    const inner = reference.trim().replace(/^\[\[(.*)\]\]$/, "$1").replace(/\|.*$/, "");
    const hash = inner.indexOf("#");

    if (hash === -1) {
        return { name: inner.trim() };
    }

    const section = inner.slice(hash + 1).trim();
    return { name: inner.slice(0, hash).trim(), section: section === "" ? undefined : section };
}

/** Pages of a type, or with a text in their name, fields or text; ignores case. */
export function searchPages(world: World, query: { text?: string; type?: PageType; }): PageMatch[]
{
    const text = query.text?.trim().toLowerCase() ?? "";
    const matches: PageMatch[] = [];

    for (const page of world.pages.filter((candidate) => query.type === undefined || candidate.type === query.type)) {
        if (text === "" || page.name.toLowerCase().includes(text)) {
            matches.push({ page });
            continue;
        }

        const excerpt = fieldExcerpt(page, text) ?? textExcerpt(page, text);

        if (excerpt !== undefined) {
            matches.push({ page, excerpt });
        }
    }

    return matches;
}

/** The other pages that link to `page`, and where. */
export function backlinks(world: World, page: Page): Backlink[]
{
    const target = page.name.toLowerCase();
    const linksHere = (text: string): boolean => linkedPages(text).some((name) => name.toLowerCase() === target);
    const found: Backlink[] = [];

    for (const other of world.pages.filter((candidate) => candidate !== page)) {
        const places = Object.entries(other.fields).filter(([, value]) => textsIn(value).some(linksHere)).map(([name]) => name);

        if (linksHere(other.body)) {
            places.push("text");
        }

        if (places.length > 0) {
            found.push({ page: other, places });
        }
    }

    return found;
}

/** Page names become file names and link targets, so some characters are not allowed. */
export function checkPageName(name: string): void
{
    if (name === "" || name.trim() !== name || name.endsWith(".") || forbiddenCharacters.test(name)) {
        throw new Error(`"${name}" cannot be a page name. Names become file names and links: leave out \\ / : * ? " < > | # ^ [ ], spaces at the ends and a final dot.`);
    }
}

/** Reads one page file of the campaign in `root`. */
export function readPage(root: string, fullPath: string): Page
{
    const path = relative(root, fullPath).split(sep).join("/");
    const parts = path.split("/");
    const file = splitPageFile(readFileSync(fullPath, "utf8"));
    return {
        name: basename(fullPath, ".md"),
        type: parts.length > 2 ? typeOfFolder(parts[1]) : undefined,
        path,
        fields: readFields(file.frontmatter, path),
        body: file.body,
    };
}

function checkUniqueNames(pages: Page[]): void
{
    const seen = new Map<string, Page>();

    for (const page of pages) {
        const other = seen.get(page.name.toLowerCase());

        if (other !== undefined) {
            throw new Error(`Two pages have the same name: ${other.path} and ${page.path}. Rename one of them: names must be unique in the campaign.`);
        }

        seen.set(page.name.toLowerCase(), page);
    }
}

function fieldExcerpt(page: Page, text: string): string | undefined
{
    for (const [name, value] of Object.entries(page.fields)) {
        const shown = typeof value === "string" ? value : JSON.stringify(value);

        if (shown.toLowerCase().includes(text)) {
            return shorten(`${name}: ${shown}`);
        }
    }

    return undefined;
}

function textExcerpt(page: Page, text: string): string | undefined
{
    const line = page.body.split("\n").find((candidate) => candidate.toLowerCase().includes(text));
    return line === undefined ? undefined : shorten(line.trim());
}

function shorten(text: string): string
{
    return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}

function textsIn(value: unknown): string[]
{
    if (typeof value === "string") {
        return [value];
    }

    if (Array.isArray(value)) {
        return value.flatMap(textsIn);
    }

    if (value !== null && typeof value === "object") {
        return Object.values(value).flatMap(textsIn);
    }

    return [];
}
