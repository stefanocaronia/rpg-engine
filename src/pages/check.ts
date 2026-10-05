import type { Problem } from "../core/problem.ts";
import { comparableText, withArticle } from "../core/text.ts";
import { readEnvironment } from "./environment.ts";
import { baseChain, baseProblem, shownPart } from "./inheritance.ts";
import { type Link, links, readSection, repeatedNames } from "./markdown.ts";
import { canHold, containerFieldOf, containerFields, heldTypesText, isEmptyField, isStandardField, misspelledStandardField, standardFieldProblem } from "./standard-fields.ts";
import { linksIn, type Page, textsIn, validHoldersOf, type World } from "./world.ts";

/** A container listing a page: which container, in which field, with which entry as written. */
interface Listing
{
    holder: Page;
    field: string;
    entry: string;
}

/** The exact checks on the world's pages (D-58, first level): files that cannot be read, repeated names, standard fields, links, containers, environments. */
export function checkWorld(world: World): Problem[]
{
    // Built once, so that the checks cost as much as reading the pages, however many there are.
    const pagesByName = groupBy(world.pages, (page) => [page.name]);
    const listingsByName = groupBy(world.pages.flatMap(listingsOf), (listing) => linksIn(listing.entry));
    return [
        ...world.problems.map((message) => ({ message })),
        ...[...pagesByName.values()].filter((pages) => pages.length > 1).map(repeatedPageProblem),
        ...world.pages.flatMap((page) => [
            ...fieldProblems(page),
            ...linkProblems(world, pagesByName, page),
            ...publicKnowsProblems(world, pagesByName, page),
            ...containerProblems(world, pagesByName, listingsByName, page),
            ...environmentProblems(page),
            ...sectionProblems(page),
            ...inheritanceProblems(world, page),
        ]),
    ];
}

function groupBy<Item>(items: Item[], namesOf: (item: Item) => string[]): Map<string, Item[]>
{
    const groups = new Map<string, Item[]>();

    for (const item of items) {
        for (const key of new Set(namesOf(item).map(comparableText))) {
            groups.set(key, [...(groups.get(key) ?? []), item]);
        }
    }

    return groups;
}

/** The entries of a page's container field, by its type (CON-1). */
function listingsOf(holder: Page): Listing[]
{
    const field = containerFieldOf(holder.type);
    return field === undefined ? [] : textsIn(holder.fields[field]).map((entry) => ({ holder, field, entry }));
}

function repeatedPageProblem(pages: Page[]): Problem
{
    return { path: pages[1].path, message: `Two pages have the same name: ${pages.map((page) => page.path).join(" and ")}.`, fix: "rename one of them by hand: names must be unique in the campaign" };
}

function fieldProblems(page: Page): Problem[]
{
    const standard = Object.keys(page.fields).flatMap((field) => {
        const problem = standardFieldProblem(page.type, page.fields, field);
        const name = misspelledStandardField(page.type, field);
        const fix = name === undefined ? `write ${page.name}, set ${field} again with an allowed value` : `write ${page.name}, unset ${field} and write its value again as ${name}`;
        return problem === undefined ? [] : [{ path: page.path, message: problem, fix }];
    });
    return [...standard, ...repeatedFieldProblems(page)];
}

/** A free field written twice with a value in different cases, such as hp and HP: the engine reads only the last one (INH-5). Empty ones count as missing; standard fields written another way are reported above. */
function repeatedFieldProblems(page: Page): Problem[]
{
    const free = Object.keys(page.fields).filter((field) => !isEmptyField(page.fields[field]) && misspelledStandardField(page.type, field) === undefined && !isStandardField(page.type, field));
    return [...groupBy(free, (field) => [field]).values()].filter((names) => names.length > 1).map((names) => ({
        path: page.path,
        message: `${page.name} writes the field ${names[0]} ${names.length} times: ${names.join(", ")}. Only the last one, ${names.at(-1)}, is read.`,
        fix: `write ${page.name}, unset ${names.slice(0, -1).join(", unset ")}`,
    }));
}

/** Links, in the fields and in the text, to pages, sections or secrets that do not exist. */
function linkProblems(world: World, pagesByName: Map<string, Page[]>, page: Page): Problem[]
{
    const inFields = Object.entries(page.fields).flatMap(([field, value]) => textsIn(value).flatMap((entry) => links(entry).map((link) => ({ link, field, entry, inList: Array.isArray(value) }))));
    const inText = links(page.body).map((link) => ({ link, field: undefined, entry: undefined, inList: false }));

    return [...inFields, ...inText].flatMap((found) => {
        const broken = brokenLink(world, pagesByName, found.link);
        return broken === undefined ? [] : [{ path: page.path, message: `${found.field ?? "The text"} links to ${written(found.link)}, ${broken}.`, fix: linkFix(page, found.field, found.entry, found.inList) }];
    });
}

function brokenLink(world: World, pagesByName: Map<string, Page[]>, link: Link): string | undefined
{
    const target = pagesByName.get(comparableText(link.page))?.[0];

    if (target === undefined) {
        return "which does not exist";
    }

    const section = link.section;
    const bases = baseChain(world, target);

    if (section === undefined || [target, ...bases].some((holder) => readSection(holder.body, section) !== undefined)) {
        return undefined;
    }

    return `but ${target.name} has no section or secret "${section}"${bases.length > 0 ? ", nor do the creatures it derives from" : ""}`;
}

/** Sections everyone can read, listed in knows: knows lists pages and secrets (D-61, REV-1), so such an entry says nothing. Secret or not, as reveal reads it. */
function publicKnowsProblems(world: World, pagesByName: Map<string, Page[]>, page: Page): Problem[]
{
    return textsIn(page.fields.knows).flatMap((entry) =>
        links(entry).flatMap((link) => {
            const section = link.section;
            const target = pagesByName.get(comparableText(link.page))?.[0];
            const part = section === undefined || target === undefined ? undefined : shownPart(world, target, section);
            return part !== undefined && !part.secret
                ? [{ path: page.path, message: `${page.name} knows ${written(link)}, a section everyone can read: knows lists pages and secrets.`, fix: `write ${page.name}, remove knows=${entry}` }]
                : [];
        })
    );
}

function written(link: Link): string
{
    return link.section === undefined ? `[[${link.page}]]` : `[[${link.page}#${link.section}]]`;
}

/** How to fix a broken link: remove the list entry as it is written, set the field again, or correct the text. */
function linkFix(page: Page, field: string | undefined, entry: string | undefined, inList: boolean): string
{
    if (field === undefined) {
        return `correct the link in the text of ${page.name}, or create what it points to`;
    }

    if (field === "effects") {
        return `end that effect with effect end, or create the page it links to`;
    }

    return inList ? `write ${page.name}, remove ${field}=${entry}` : `write ${page.name}, set ${field} to a page that exists`;
}

/**
 * What is wrong with a page as a container or as a thing held (CON-10): listed by more than one container, listing itself, inside itself through others,
 * listing what it cannot hold, or listing things in a field its type does not use.
 */
function containerProblems(world: World, pagesByName: Map<string, Page[]>, listingsByName: Map<string, Listing[]>, page: Page): Problem[]
{
    const listings = (listingsByName.get(comparableText(page.name)) ?? []).filter((listing, index, all) => all.findIndex((other) => other.holder === listing.holder) === index);
    const holders = listings.filter((listing) => listing.holder !== page && canHold(listing.holder.type, page.type));
    const self = listings.find((listing) => listing.holder === page);
    const problems: Problem[] = [];

    if (holders.length > 1) {
        const where = holders.map((listing) => listing.holder.name).join(" and in ");
        problems.push({ path: page.path, message: `${page.name} is in ${where}; a thing is in one place only.`, fix: `move ${page.name}, to ${holders[0].holder.name} or wherever it is: it stays there only` });
    }

    if (self !== undefined) {
        problems.push({ path: page.path, message: `${page.name} lists itself in ${self.field}: a thing is never inside itself.`, fix: `write ${page.name}, remove ${self.field}=${self.entry}` });
    }

    const ring = ringOf(world, page);

    if (ring !== undefined) {
        problems.push({
            path: page.path,
            message: `${page.name} is inside itself: ${[page, ...ring, page].map((holder) => holder.name).join(" › ")}.`,
            fix: `move one of them out of the others, such as move ${page.name}, to a place outside`,
        });
    }

    return [...problems, ...heldProblems(pagesByName, page), ...wrongFieldProblems(page)];
}

/** The containers above a page, nearest first, when climbing them leads back to it; undefined when it does not. */
function ringOf(world: World, page: Page): Page[] | undefined
{
    const chain: Page[] = [];

    for (let holder = validHoldersOf(world, page)[0]; holder !== undefined && !chain.includes(holder); holder = validHoldersOf(world, holder)[0]) {
        if (holder === page) {
            return chain;
        }

        chain.push(holder);
    }

    return undefined;
}

/** Entries of a container's field that point to pages it cannot hold (CON-1): they put nothing anywhere. */
function heldProblems(pagesByName: Map<string, Page[]>, holder: Page): Problem[]
{
    return listingsOf(holder).flatMap((listing) =>
        linksIn(listing.entry).flatMap((name) => {
            const held = pagesByName.get(comparableText(name));
            const page = held?.length === 1 ? held[0] : undefined;

            if (page === undefined || page === holder || canHold(holder.type, page.type)) {
                return [];
            }

            const message = `${holder.name} lists ${page.name} in ${listing.field}, but ${withArticle(holder.type ?? "free page")} holds ${heldTypesText(holder.type)}, and ${page.name} is ${withArticle(page.type ?? "free page")}.`;
            return [{ path: holder.path, message, fix: `move ${page.name}, to a container that holds it, such as a place; or write ${holder.name}, remove ${listing.field}=${listing.entry}` }];
        })
    );
}

/** Container fields on a page whose type does not list things there (CON-1): they put nothing anywhere. */
function wrongFieldProblems(page: Page): Problem[]
{
    const own = containerFieldOf(page.type);
    return containerFields.filter((field) => field !== own && !isEmptyField(page.fields[field])).map((field) => {
        const message = own === undefined
            ? `${page.name} is ${withArticle(page.type ?? "free page")}, which holds nothing, so its ${field} puts nothing anywhere.`
            : `${page.name} lists things in ${field}, but ${withArticle(page.type ?? "free page")} holds them in ${own}.`;
        return { path: page.path, message, fix: `move each thing it lists into ${own === undefined ? "a place, a character or an item" : page.name}, then write ${page.name}, unset ${field}` };
    });
}

/** A place's environment that cannot be read, or an environment on a page that is not a place, where it holds for nothing (ENV-6). */
function environmentProblems(page: Page): Problem[]
{
    const value = page.fields.environment;

    if (isEmptyField(value)) {
        return [];
    }

    // On other types, such as a creature, environment is a free field: a game may use it for where they live.
    if (page.type === "character" || page.type === "item") {
        return [{
            path: page.path,
            message: `${page.name} has an environment, but only a place's holds, for all it contains.`,
            fix: `write ${page.name}, unset environment; what it does around itself, such as a lantern's light, is a field or an effect of its own`,
        }];
    }

    if (page.type !== "place") {
        return [];
    }

    // An environment that is not a list of lines is reported with the standard fields.
    const read = standardFieldProblem(page.type, page.fields, "environment") === undefined ? readEnvironment(value) : { entries: [] };
    return "problem" in read ? [{ path: page.path, message: `${page.name}: ${read.problem}`, fix: `write ${page.name}, set environment whole, such as ["light: dark"]` }] : [];
}

function inheritanceProblems(world: World, page: Page): Problem[]
{
    const problem = baseProblem(world, page);
    return problem === undefined ? [] : [{ path: page.path, message: problem, fix: `write ${page.name}, set creature to the creature it is a kind of, or unset it` }];
}

function sectionProblems(page: Page): Problem[]
{
    return repeatedNames(page.body).map((name) => ({ path: page.path, message: `${page.name} has two sections or secrets named "${name}".`, fix: `rename one of them by hand, so that ${page.name}#${name} finds one place` }));
}
