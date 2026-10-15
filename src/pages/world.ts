import { basename, join, relative, resolve, sep } from "node:path";
import type { FieldKind } from "../core/field-kind.ts";
import type { Formula, SystemFormulas } from "../core/formula.ts";
import { frozen } from "../core/frozen.ts";
import type { ProgressionRule } from "../core/progression-rule.ts";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { linkedPages } from "./markdown.ts";
import { readFields, splitPageFile } from "./page-file.ts";
import { type PageType, pageTypes, typeOfFolder, worldFolderName } from "./page-types.ts";
import { readEntry } from "./stack-entry.ts";
import { canHold, containerFieldOf } from "./standard-fields.ts";

const forbiddenCharacters = /[\\/:*?"<>|#^[\]\u0000-\u001f]/;
const longestName = 120;

// Built once for each world, which is never changed in place: who lists each name in their contents or inventory, so that locating a page costs as much as its chain.
const holderIndexes = new WeakMap<World, Map<string, Page[]>>();

// The pages of a game system by comparable name, built once for each world read: a name costs a lookup, however many pages the system has (SYS-3).
const systemNames = new WeakMap<SystemPages, Map<string, Page>>();

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
    /** The game system the page comes from, such as 5e: read-only, and nowhere (SYS-2). Undefined for the campaign's own pages. */
    system?: string;
}

/** Every page of a campaign, read from its world folder, and the pages of its game system. */
export interface World
{
    /** The campaign folder. */
    root: string;
    pages: Page[];
    /** Why some files could not be read as pages: the other pages still work. */
    problems: string[];
    /** The campaign's game system, when one is installed (SYS-1): its pages are found after the campaign's own. */
    system?: SystemPages;
    /** The language the campaign is played in, as a code such as it, when campaign.yaml says it. */
    language?: string;
    /** The game system campaign.yaml names when it is not installed: none of its pages can be found (SYS-1). */
    missingSystem?: string;
    /** Whether campaign.yaml names no game system yet (D-167): a link may be to a page of the one it will name. */
    noSystem?: boolean;
    /** The campaign's rigor, which formulas read as rigor (FOR-2, SPD-3). */
    rigor?: string;
}

/** What a game system says of itself, as the world reads it (SYS-1, SYS-8). */
export interface SystemInfo
{
    /** The name the campaign gives it, such as 5e. */
    name: string;
    /** What it is, for messages: "the fifth edition, from the SRD 5.1". */
    title: string;
    /** The language it names its pages in, such as en. */
    language: string;
    /** The kind of each field it declares, by the name it gives (SYS-8). */
    fields: Record<string, FieldKind>;
    /** What it works out from the fields of a page (D-199, FOR-1). */
    formulas?: SystemFormulas;
    /** How the classes of a character give the rows of their tables and their features (D-219, PRO-1–PRO-3). */
    progression?: ProgressionRule;
    /** By list, the fields whose value on each item's page is a formula worked out on who lists it (PRO-5). */
    itemFormulas?: Record<string, string[]>;
    /** By list, the pages every character who keeps the sheet has in it without writing them, as the unarmed strike in equipped (DAT-13, D-235). */
    alwaysIn?: Record<string, string[]>;
    /** The counters that come back with a rest, by name or by a name ending in *: a page has them full until it spends them (DAT-9). */
    uses?: string[];
    /** The fields the line of the player character and the companions shows, in order (DAT-2). */
    statusLine?: { field: string; whenSet: boolean; }[];
    /** How it weighs what a character carries, which its formulas read as load (LOAD-1). */
    load?: { field: string; limit: Formula; coins?: number; };
    /** The unit its computed lengths are in, as ft (SPD-1). */
    lengthUnit?: string;
    /** The lists whose pages give their bonus fields to who lists them, as attuned items and feats (D-449). */
    bonusLists?: string[];
}

/** The pages of the campaign's game system, read-only (SYS-2). */
export interface SystemPages extends SystemInfo
{
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
        files().makeFolder(join(root, worldFolderName, folder));
    }
}

/**
 * The pages of the campaign in `root`, and those of its game system, if one is installed: `system` says where it is and what it declares (SYS-1).
 * `language` is the campaign's; `missingSystem` the system it names that is not installed, and `noSystem` whether it names none yet, for messages.
 */
export function loadWorld(root: string, options: { system?: SystemInfo & { folder: string; }; language?: string; missingSystem?: string; noSystem?: boolean; rigor?: string; } = {}): World
{
    const campaign = readPages(root);
    const { system, language, missingSystem, noSystem, rigor } = options;

    if (system === undefined) {
        return frozen({ root, ...campaign, language, missingSystem, noSystem, ...(rigor === undefined ? {} : { rigor }) });
    }

    const systemPages = packagePages(system.folder, system.name);
    const { name, title, fields, formulas, progression, itemFormulas, alwaysIn, uses, statusLine, load, lengthUnit, bonusLists } = system;
    const problems = [...campaign.problems, ...systemPages.problems];
    return frozen({
        root,
        pages: campaign.pages,
        problems,
        system: { name, title, language: system.language, fields, formulas, progression, itemFormulas, alwaysIn, uses, statusLine, load, lengthUnit, bonusLists, pages: systemPages.pages },
        language,
        ...(rigor === undefined ? {} : { rigor }),
    });
}

/**
 * The page with this name, ignoring case and Unicode normalization: the campaign's, else the game system's (SYS-3). Two pages of the campaign with that name stop the command:
 * no write may pick one of them.
 */
export function findPage(world: World, name: string): Page | undefined
{
    const found = pagesWithName(world, name);

    if (found.length > 1) {
        throw new Error(`Two pages have the same name: ${found.map((page) => page.path).join(" and ")}. Rename one of them by its path, such as rename "${found[1].path}" "a new name": names must be unique in the campaign.`);
    }

    return found[0] ?? systemPageNamed(world, name);
}

/**
 * What to do first about a name that is not found, when it may be one of the campaign's game system, such as a page: install the system the campaign names,
 * or name one (SYS-1, D-167); undefined when the campaign's system is there.
 */
export function systemFirstFix(world: World, what = "a page"): string | undefined
{
    if (world.missingSystem !== undefined) {
        return `if it is ${what} of the system ${world.missingSystem}, which is not installed, fix the system first, as the problem on campaign.yaml says`;
    }

    return world.noSystem === true ? `if it is ${what} of a game system, choose the campaign's system first, with config` : undefined;
}

/**
 * The pages of the campaign with this name, ignoring case and Unicode normalization, in the world's order: from an index built once for each world, which never
 * changes, so that following a chain costs a lookup however many pages there are (INH-16, D-194).
 */
export function pagesWithName(world: World, name: string): Page[]
{
    let names = namesByWorld.get(world);

    if (names === undefined) {
        names = new Map();

        for (const page of world.pages) {
            const key = comparableText(page.name);
            names.set(key, [...(names.get(key) ?? []), page]);
        }

        namesByWorld.set(world, names);
    }

    return names.get(comparableText(name)) ?? [];
}

const namesByWorld = new WeakMap<World, Map<string, Page[]>>();

/** The pages of the campaign with this name, else the one page with it among its aliases, as a renamed page under its old name (D-417); none when two pages share the alias. */
export function pagesWithNameOrAlias(world: World, name: string): Page[]
{
    const named = pagesWithName(world, name);
    const aliased = named.length > 0 ? [] : withAlias(world.pages, name);
    return named.length > 0 ? named : aliased.length === 1 ? aliased : [];
}

/** The pages of the campaign, but `page`, that have `name` among their aliases. */
export function otherPagesWithAlias(world: World, page: Page, name: string): Page[]
{
    return withAlias(world.pages, name).filter((other) => other !== page);
}

/** The page of the campaign at this path, from an index built once for each world (D-194). */
export function pageWithPath(world: World, path: string): Page | undefined
{
    let paths = pathsByWorld.get(world);

    if (paths === undefined) {
        paths = new Map(world.pages.map((page) => [page.path, page]));
        pathsByWorld.set(world, paths);
    }

    return paths.get(path);
}

const pathsByWorld = new WeakMap<World, Map<string, Page>>();

/** The pages, of the campaign or of its game system, named as this one with a note in parentheses, such as Acolyte (background) beside Acolyte (SYS-2). */
export function namesakes(world: World, page: Page): Page[]
{
    const prefix = `${comparableText(page.name)} (`;
    return [...world.pages, ...(world.system?.pages ?? [])].filter((other) => comparableText(other.name).startsWith(prefix));
}

/** The page of the campaign's game system with this name, ignoring case; undefined when there is none (SYS-3). */
export function systemPageNamed(world: World, name: string): Page | undefined
{
    if (world.system === undefined) {
        return undefined;
    }

    let names = systemNames.get(world.system);

    if (names === undefined) {
        names = new Map();

        // A package names each page once (SYS-2): were it to repeat one, the first would be read.
        for (const page of [...world.system.pages].reverse()) {
            names.set(comparableText(page.name), page);
        }

        systemNames.set(world.system, names);
    }

    return names.get(comparableText(name));
}

/**
 * The pages of the campaign's game system with a text in their name or fields, of a type if given, with the field it is in; with no text, all those of that type (SYS-3).
 * Their text is the rules', which are read on their own.
 */
export function searchSystemPages(world: World, query: { text?: string; type?: PageType; }): PageMatch[]
{
    const text = comparableText(query.text?.trim() ?? "");
    const found = (world.system?.pages ?? []).filter((page) => query.type === undefined || page.type === query.type).flatMap((page): PageMatch[] => {
        if (text === "" || comparableText(page.name).includes(text)) {
            return [{ page }];
        }

        const excerpt = fieldExcerpt(page, text);
        return excerpt === undefined ? [] : [{ page, excerpt }];
    });

    // The name itself first, then its twins, as Shield (spell) beside the item, names that begin with the text, names that hold it, and last pages whose
    // fields do: Shield before Shield (spell) and Shield Guardian (D-195).
    const rank = (match: PageMatch): number => {
        const name = comparableText(match.page.name);
        return match.excerpt !== undefined ? 4 : name === text ? 0 : name.startsWith(`${text} (`) ? 1 : name.startsWith(text) ? 2 : 3;
    };

    return text === "" ? found : found.map((match, index) => ({ match, index })).sort((first, second) => rank(first.match) - rank(second.match) || first.index - second.index).map(({ match }) => match);
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

/**
 * Where a page is: the page that holds it, the one that holds that, and so on, climbing the containers that can hold each (CON-1, CON-3), up to a page already seen.
 * `alsoIn` lists other holders, which should not exist.
 */
export function locate(world: World, page: Page): { chain: Page[]; alsoIn: Page[]; }
{
    const chain: Page[] = [];
    let holders = validHoldersOf(world, page);
    const alsoIn = holders.slice(1);

    while (holders.length > 0 && holders[0] !== page && !chain.includes(holders[0])) {
        chain.push(holders[0]);
        holders = validHoldersOf(world, holders[0]);
    }

    return { chain, alsoIn };
}

/**
 * The containers that list a page and can hold it, itself left out, in the order of the world's pages. A page of the game system is in none (SYS-6), nor an item of the campaign
 * that an entry counts, a kind (STK-3).
 */
export function validHoldersOf(world: World, page: Page): Page[]
{
    return page.system !== undefined || isCountedItem(world, page) ? [] : holdersOf(world, page.name).filter((holder) => holder !== page && canHold(holder.type, page.type));
}

/** Whether an item of the campaign is counted by some entry of a container, as [[Lembas]] 3: a kind, which is nowhere (STK-1, STK-3). */
export function isCountedItem(world: World, page: Page): boolean
{
    let counted = countedByWorld.get(world);

    if (counted === undefined) {
        const names = world.pages.flatMap((holder) => {
            const field = containerFieldOf(holder.type);
            return field === undefined ? [] : textsIn(holder.fields[field]).flatMap((entry) => {
                const read = readEntry(entry);
                return read.shape === "stack" ? [comparableText(read.page)] : [];
            });
        });
        counted = new Set(names);
        countedByWorld.set(world, counted);
    }

    return page.system === undefined && page.type === "item" && counted.has(comparableText(page.name));
}

const countedByWorld = new WeakMap<World, Set<string>>();

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

/** The pages whose container field, by their type, lists the page named `name`, in the order of the world's pages (CON-1). */
export function holdersOf(world: World, name: string): Page[]
{
    let index = holderIndexes.get(world);

    if (index === undefined) {
        index = new Map();

        for (const page of world.pages) {
            for (const listed of new Set(heldNames(page).map(comparableText))) {
                const holders = index.get(listed) ?? [];
                holders.push(page);
                index.set(listed, holders);
            }
        }

        holderIndexes.set(world, index);
    }

    return index.get(comparableText(name)) ?? [];
}

/** The names a page lists in its container field, by its type (CON-1), but those it counts in a stack, which holds no page (STK-3): none for a type that holds nothing. */
export function heldNames(page: Page): string[]
{
    const field = containerFieldOf(page.type);
    return field === undefined ? [] : textsIn(page.fields[field]).filter((entry) => readEntry(entry).shape !== "stack").flatMap(linkedPages);
}

/**
 * The page named `name`, or else the one page with `name` among its aliases; undefined when there is none. A name wins over an alias, and the campaign over its game system (SYS-3).
 * Two pages of the campaign with that name or alias stop the command.
 */
export function pageNamed(world: World, name: string): Page | undefined
{
    const page = findPage(world, name);

    if (page !== undefined) {
        return page;
    }

    const aliased = withAlias(world.pages, name);

    if (aliased.length > 1) {
        throw new Error(`${name} is an alias of ${aliased.map((other) => other.name).join(" and ")}: give the page's own name.`);
    }

    return aliased[0] ?? withAlias(world.system?.pages ?? [], name)[0];
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

/** Reads one page file of the campaign in `root`, once in a call (D-194). */
export function readPage(root: string, fullPath: string): Page
{
    const page = files().read(fullPath, `page ${resolve(root)}`, (text) => pageOf(root, fullPath, text));

    if (page === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${fullPath}'`);
    }

    return page;
}

/** The page that the text of a file in `root` writes. */
function pageOf(root: string, fullPath: string, text: string): Page
{
    const path = relative(root, fullPath).split(sep).join("/");
    const parts = path.split("/");
    const file = splitPageFile(text);
    return {
        name: basename(fullPath).replace(/\.md$/i, "").normalize("NFC"),
        type: parts.length > 2 ? typeOfFolder(parts[1]) : undefined,
        path,
        fields: readFields(file.frontmatter, path),
        body: file.body,
    };
}

/** The page whose file in a folder's world/ is named `name`, with the type its folder gives, found by the file's name alone without reading the pages: enough to say that a page is there. */
export function pageFileNamed(root: string, name: string): { name: string; type?: PageType; } | undefined
{
    const worldPath = join(root, worldFolderName);
    const wanted = comparableText(name.trim());
    const file = files().files(worldPath, (candidate) => /\.md$/i.test(candidate) && comparableText(candidate.slice(0, -3)) === wanted)[0];
    return file === undefined ? undefined : { name: basename(file).slice(0, -3), type: typeOfFolder(relative(worldPath, file).split(sep)[0]) };
}

/** The pages of a folder's world/, each marked with the game system it comes from, if any; a file that cannot be read is a problem, and the others still work. */
/**
 * The pages of a game system, read once in a process: they ship with the package and are read-only, so a running server keeps those it started with, as a
 * change to a system asks for a reconnection (D-194).
 */
function packagePages(folder: string, system: string): { pages: Page[]; problems: string[]; }
{
    const key = `${folder}|${system}`;
    const known = packages.get(key) ?? readPages(folder, system);
    packages.set(key, known);
    return known;
}

const packages = new Map<string, { pages: Page[]; problems: string[]; }>();

function readPages(root: string, system?: string): { pages: Page[]; problems: string[]; }
{
    const pages: Page[] = [];
    const problems: string[] = [];

    for (const file of files().files(join(root, worldFolderName), (name) => /\.md$/i.test(name))) {
        try {
            const page = readPage(root, file);
            pages.push(system === undefined ? page : frozen({ ...page, system }));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            problems.push(system === undefined ? message : `The system ${system}: ${message}`);
        }
    }

    pages.sort((first, second) => (first.path < second.path ? -1 : 1));
    return { pages, problems };
}

/** The pages that have `name` among their aliases. */
function withAlias(pages: Page[], name: string): Page[]
{
    return pages.filter((candidate) => textsIn(candidate.fields.aliases).some((alias) => comparableText(alias.trim()) === comparableText(name.trim())));
}

function fieldExcerpt(page: Page, text: string): string | undefined
{
    // A picture's file name says nothing the page does not: the Worg's direwolf.svg is no wolf to look for.
    for (const [name, value] of Object.entries(page.fields).filter(([field]) => comparableText(field) !== "image")) {
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
