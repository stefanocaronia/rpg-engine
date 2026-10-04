import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { baseChain, baseProblem } from "./inheritance.ts";
import { type Link, links, readSection, repeatedNames } from "./markdown.ts";
import { containerFields, isEmptyField, isStandardField, misspelledStandardField, standardFieldProblem } from "./standard-fields.ts";
import { linksIn, type Page, textsIn, type World } from "./world.ts";

/** A container listing a page: which container, in which field, with which entry as written. */
interface Listing
{
    holder: Page;
    field: string;
    entry: string;
}

/** The exact checks on the world's pages (D-58, first level): files that cannot be read, repeated names, standard fields, links, things in two places. */
export function checkWorld(world: World): Problem[]
{
    // Built once, so that the checks cost as much as reading the pages, however many there are.
    const pagesByName = groupBy(world.pages, (page) => [page.name]);
    const listingsByName = groupBy(world.pages.flatMap(listingsOf), (listing) => linksIn(listing.entry));
    return [
        ...world.problems.map((message) => ({ message })),
        ...[...pagesByName.values()].filter((pages) => pages.length > 1).map(repeatedPageProblem),
        ...world.pages.flatMap((page) => [...fieldProblems(page), ...linkProblems(world, pagesByName, page), ...placeProblems(listingsByName, page), ...sectionProblems(page), ...inheritanceProblems(world, page)]),
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

function listingsOf(holder: Page): Listing[]
{
    return containerFields.flatMap((field) => textsIn(holder.fields[field]).map((entry) => ({ holder, field, entry })));
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

/** A thing listed by more than one container: it can be in one place only. */
function placeProblems(listingsByName: Map<string, Listing[]>, page: Page): Problem[]
{
    const listings = (listingsByName.get(comparableText(page.name)) ?? []).filter((listing, index, all) => all.findIndex((other) => other.holder === listing.holder) === index);

    if (listings.length < 2) {
        return [];
    }

    const other = listings[1];
    const where = listings.map((listing) => listing.holder.name).join(" and in ");
    return [{ path: page.path, message: `${page.name} is in ${where}; a thing is in one place only.`, fix: `remove it from all but one, such as write ${other.holder.name}, remove ${other.field}=${other.entry}` }];
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
