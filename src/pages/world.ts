import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { comparableText } from "../core/text.ts";
import { linkedPages } from "./markdown.ts";
import { readFields, splitPageFile } from "./page-file.ts";
import { type PageType, pageTypes, typeOfFolder, worldFolderName } from "./page-types.ts";
import { containerFields } from "./standard-fields.ts";

const forbiddenCharacters = /[\\/:*?"<>|#^[\]\u0000-\u001f]/;
const longestName = 120;

// Built once for each world, which is never changed in place: who lists each name in their contents or inventory, so that locating a page costs as much as its chain.
const holderIndexes = new WeakMap<World, Map<string, Page[]>>();

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
    /** Why some files could not be read as pages: the other pages still work. */
    problems: string[];
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
    const pages: Page[] = [];
    const problems: string[] = [];

    for (const entry of entries.filter((candidate) => candidate.isFile() && /\.md$/i.test(candidate.name))) {
        try {
            pages.push(readPage(root, join(entry.parentPath, entry.name)));
        } catch (error) {
            problems.push(error instanceof Error ? error.message : String(error));
        }
    }

    pages.sort((first, second) => (first.path < second.path ? -1 : 1));
    return { root, pages, problems };
}

/** The page with this name, ignoring case and Unicode normalization. Two pages with that name stop the command: no write may pick one of them. */
export function findPage(world: World, name: string): Page | undefined
{
    const wanted = comparableText(name);
    const found = world.pages.filter((page) => comparableText(page.name) === wanted);

    if (found.length > 1) {
        throw new Error(`Two pages have the same name: ${found.map((page) => page.path).join(" and ")}. Rename one of them by hand: names must be unique in the campaign.`);
    }

    return found[0];
}

/** The world with a page as it is now written, in its place or added: for what depends on it, without reading every page again. */
export function withPage(world: World, before: Page | undefined, after: Page): World
{
    return { ...world, pages: [...world.pages.filter((page) => page !== before), after] };
}

/** Splits "Page", "Page#Section" or a link such as "[[Page#Section|label]]" into the page's name and the section; "Page#" gives an empty section. */
export function parsePageReference(reference: string): { name: string; section?: string; }
{
    const inner = reference.trim().replace(/^\[\[(.*)\]\]$/, "$1").replace(/\|.*$/, "");
    const hash = inner.indexOf("#");
    return hash === -1 ? { name: inner.trim() } : { name: inner.slice(0, hash).trim(), section: inner.slice(hash + 1).trim() };
}

/** Pages of a type, or with a text in their name, fields or text; ignores case and the way accents are encoded. */
export function searchPages(world: World, query: { text?: string; type?: PageType; }): PageMatch[]
{
    const text = comparableText(query.text?.trim() ?? "");
    const matches: PageMatch[] = [];

    for (const page of world.pages.filter((candidate) => query.type === undefined || candidate.type === query.type)) {
        if (text === "" || comparableText(page.name).includes(text)) {
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
    const target = comparableText(page.name);
    const pointsHere = (name: string): boolean => comparableText(name) === target;
    const found: Backlink[] = [];

    for (const other of world.pages.filter((candidate) => candidate !== page)) {
        const places = Object.entries(other.fields).filter(([, value]) => linksIn(value).some(pointsHere)).map(([name]) => name);

        if (linkedPages(other.body).some(pointsHere)) {
            places.push("text");
        }

        if (places.length > 0) {
            found.push({ page: other, places });
        }
    }

    return found;
}

/** Where a page is: the page that holds it, the one that holds that, and so on, climbing places' contents and characters' inventories. `alsoIn` lists other holders, which should not exist. */
export function locate(world: World, page: Page): { chain: Page[]; alsoIn: Page[]; }
{
    const chain: Page[] = [];
    let holders = holdersOf(world, page.name);
    const alsoIn = holders.slice(1);

    while (holders.length > 0 && holders[0] !== page && !chain.includes(holders[0])) {
        chain.push(holders[0]);
        holders = holdersOf(world, holders[0].name);
    }

    return { chain, alsoIn };
}

/** Whether a page is one of the player's party: their character or a companion. */
export function isPartyMember(page: Page): boolean
{
    return page.fields.role === "pc" || page.fields.role === "companion";
}

/** Whether a page is a living member of the party: a character who is the player's or a companion, and not dead. */
export function isInParty(page: Page): boolean
{
    return page.type === "character" && isPartyMember(page) && page.fields.status !== "dead";
}

/** Whether the player may see what happens to a page: their character, the companions, what they carry, the open quests (D-93). */
export function concernsPlayer(world: World, page: Page): boolean
{
    return isPartyMember(page) || (page.type === "quest" && page.fields.status === "open") || locate(world, page).chain.some(isPartyMember);
}

/** Whether the player may see what happens to a page, worked out once for many pages: the same answer as concernsPlayer (D-93). */
export function playerConcerns(world: World): (page: Page) => boolean
{
    const held = new Set<Page>(world.pages.filter(isPartyMember));
    const queue = [...held];

    for (let holder = queue.shift(); holder !== undefined; holder = queue.shift()) {
        for (const name of containerFields.flatMap((field) => linksIn(holder.fields[field]))) {
            const page = world.pages.find((candidate) => comparableText(candidate.name) === comparableText(name));

            if (page !== undefined && !held.has(page)) {
                held.add(page);
                queue.push(page);
            }
        }
    }

    return (page) => held.has(page) || (page.type === "quest" && page.fields.status === "open");
}

/** The pages whose contents or inventory list the page named `name`, in the order of the world's pages. */
export function holdersOf(world: World, name: string): Page[]
{
    let index = holderIndexes.get(world);

    if (index === undefined) {
        index = new Map();

        for (const page of world.pages) {
            for (const listed of new Set(containerFields.flatMap((field) => linksIn(page.fields[field])).map(comparableText))) {
                const holders = index.get(listed) ?? [];
                holders.push(page);
                index.set(listed, holders);
            }
        }

        holderIndexes.set(world, index);
    }

    return index.get(comparableText(name)) ?? [];
}

/** The pages that a field's value links to. */
export function linksIn(value: unknown): string[]
{
    return textsIn(value).flatMap(linkedPages);
}

/** Every text in a field value: the value itself, or the texts in a list or a map. */
export function textsIn(value: unknown): string[]
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

/** Page names become file names and link targets, so some characters are not allowed. */
export function checkPageName(name: string): void
{
    if (name === "" || name.length > longestName || name.trim() !== name || name.endsWith(".") || forbiddenCharacters.test(name)) {
        throw new Error(`"${name}" cannot be a page name. Names become file names and links: at most ${longestName} characters, without \\ / : * ? " < > | # ^ [ ], line breaks, spaces at the ends or a final dot.`);
    }
}

/** Reads one page file of the campaign in `root`. */
export function readPage(root: string, fullPath: string): Page
{
    const path = relative(root, fullPath).split(sep).join("/");
    const parts = path.split("/");
    const file = splitPageFile(readFileSync(fullPath, "utf8"));
    return {
        name: basename(fullPath).replace(/\.md$/i, "").normalize("NFC"),
        type: parts.length > 2 ? typeOfFolder(parts[1]) : undefined,
        path,
        fields: readFields(file.frontmatter, path),
        body: file.body,
    };
}

function fieldExcerpt(page: Page, text: string): string | undefined
{
    for (const [name, value] of Object.entries(page.fields)) {
        const shown = typeof value === "string" ? value : JSON.stringify(value);

        if (comparableText(shown).includes(text)) {
            return shorten(`${name}: ${shown}`);
        }
    }

    return undefined;
}

function textExcerpt(page: Page, text: string): string | undefined
{
    const line = page.body.split("\n").find((candidate) => comparableText(candidate).includes(text));
    return line === undefined ? undefined : shorten(line.trim());
}

function shorten(text: string): string
{
    return text.length > 120 ? `${text.slice(0, 119)}…` : text;
}
