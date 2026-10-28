import { frozen } from "../core/frozen.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, withArticle } from "../core/text.ts";
import { readEnvironment } from "./environment.ts";
import { baseChain, baseFieldOf, baseProblem, derivedPages, shownPart } from "./inheritance.ts";
import { type Link, links, readSection, repeatedNames, unreadSecretLines } from "./markdown.ts";
import { readStops } from "./roads.ts";
import { countedText, entryOfKind, readEntry } from "./stacks/entry.ts";
import { carriesKind, entryPage, goodsNamed, isKind, notKindReason, pageNamedQuietly, stacksOf } from "./stacks/kinds.ts";
import { missingKindMessage } from "./stacks/writes.ts";
import { canHold, containerFieldOf, containerFields, heldTypesText, isEmptyField, isStandardField, misspelledStandardField, standardFieldProblem } from "./standard-fields.ts";
import { alwaysInList, alwaysInMessage, declaredKind, systemKnowsReason, systemLabel } from "./system-pages.ts";
import { isCountedItem, linksIn, locate, type Page, systemFirstFix, systemPageNamed, textsIn, validHoldersOf, type World } from "./world.ts";

/** A container listing a page: which container, in which field, with which entry as written. */
interface Listing
{
    holder: Page;
    field: string;
    entry: string;
}

/**
 * The exact checks on the world's pages (D-58, first level): files that cannot be read, repeated names, standard fields, links, containers, environments.
 * A world never changes: its problems are found once, and a session of the MCP server keeps the world while its files do not change (D-194).
 */
export function checkWorld(world: World): Problem[]
{
    let problems = checked.get(world);

    if (problems === undefined) {
        problems = frozen(worldProblems(world));
        checked.set(world, problems);
    }

    return problems;
}

const checked = new WeakMap<World, Problem[]>();

function worldProblems(world: World): Problem[]
{
    // Built once, so that the checks cost as much as reading the pages, however many there are.
    const pagesByName = groupBy(world.pages, (page) => [page.name]);
    const listingsByName = groupBy(world.pages.flatMap(listingsOf), (listing) => linksIn(listing.entry));
    return [
        ...world.problems.map((message) => ({ message })),
        ...[...pagesByName.values()].filter((pages) => pages.length > 1).map(repeatedPageProblem),
        ...world.pages.flatMap((page) => hidingProblems(world, page)),
        ...world.pages.flatMap((page) => [
            ...pageAlone.fields(page),
            ...linkProblems(world, pagesByName, page),
            ...publicKnowsProblems(world, pagesByName, page),
            ...containerProblems(world, pagesByName, listingsByName, page),
            ...equippedProblems(world, pagesByName, page),
            ...stackProblems(world, page),
            ...stopProblems(world, pagesByName, page),
            ...pageAlone.environment(page),
            ...pageAlone.sections(page),
            ...inheritanceProblems(world, page),
        ]),
    ];
}

/** A check that reads the page alone, made once for each page: a page never changes, and a session keeps those whose files do not (D-194). */
function onceForEachPage(check: (page: Page) => Problem[]): (page: Page) => Problem[]
{
    const done = new WeakMap<Page, Problem[]>();

    return (page) => {
        let problems = done.get(page);

        if (problems === undefined) {
            problems = frozen(check(page));
            done.set(page, problems);
        }

        return problems;
    };
}

const pageAlone = { fields: onceForEachPage(fieldProblems), environment: onceForEachPage(environmentProblems), sections: onceForEachPage(sectionProblems) };

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

/** A page of the campaign with the name of a page of the game system, which it hides (SYS-4): what derives from that name reads it instead. */
function hidingProblems(world: World, page: Page): Problem[]
{
    const hidden = systemPageNamed(world, page.name);

    if (hidden === undefined) {
        return [];
    }

    const readers = derivedPages(world, page).map((derived) => derived.name);
    const listed = `${readers.slice(0, 10).join(", ")}${readers.length > 10 ? `, and ${readers.length - 10} more,` : ""}`;
    const who = readers.length === 0 ? "" : `, and ${listed} ${readers.length === 1 ? "derives" : "derive"} from it instead`;
    return [{
        path: page.path,
        message: `${page.name} hides ${hidden.name}, ${systemLabel(hidden)}: links to that name lead to this page${who}.`,
        fix: `if the file was made by mistake, such as by clicking a link in Obsidian, delete it; otherwise rename it by hand, with a name of its own`,
    }];
}

function repeatedPageProblem(pages: Page[]): Problem
{
    return {
        path: pages[1].path,
        message: `Two pages have the same name: ${pages.map((page) => page.path).join(" and ")}.`,
        fix: `rename one of them by its path, such as rename "${pages[1].path}" "a new name": names must be unique in the campaign`,
    };
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

    const stackOfAlias = (entry: string | undefined, field: string | undefined): boolean =>
        entry !== undefined && field === containerFieldOf(page.type) && readEntry(entry).shape === "stack" && entryPage(world, links(entry)[0]?.page ?? "") === undefined
        && goodsNamed(world, links(entry)[0]?.page ?? "") !== undefined;

    return [...inFields.filter((found) => !stackOfAlias(found.entry, found.field)), ...inText].flatMap((found) => {
        const broken = brokenLink(world, pagesByName, found.link);
        // While the campaign's system is missing, the link may be to one of its pages: removing it would break what derives from it.
        const missing = broken === "which does not exist";
        const first = missing ? systemFirstFix(world) : undefined;
        const own = missing ? missingFix(world, page, found.link.page, found.field, found.entry, found.inList) : linkFix(page, found.field, found.entry, found.inList);
        const fix = first === undefined ? own : `${first}; otherwise ${own}`;
        return broken === undefined ? [] : [{ path: page.path, message: `${found.field ?? "The text"} links to ${written(found.link)}, ${broken}.`, fix }];
    });
}

function brokenLink(world: World, pagesByName: Map<string, Page[]>, link: Link): string | undefined
{
    const target = pagesByName.get(comparableText(link.page))?.[0] ?? systemPageNamed(world, link.page);

    if (target === undefined) {
        return "which does not exist";
    }

    const section = link.section;
    const bases = baseChain(world, target);

    if (section === undefined || [target, ...bases].some((holder) => readSection(holder.body, section) !== undefined)) {
        return undefined;
    }

    return `but ${target.name} has no section or secret "${section}"${bases.length > 0 ? ", nor do the pages it derives from" : ""}`;
}

/**
 * Sections everyone can read, listed in knows: knows lists pages and secrets (D-61, REV-1), so such an entry says nothing. Secret or not, as reveal reads it.
 * Nor does a page of the game system, which anyone may know (SYS-2).
 */
function publicKnowsProblems(world: World, pagesByName: Map<string, Page[]>, page: Page): Problem[]
{
    return textsIn(page.fields.knows).flatMap((entry) =>
        links(entry).flatMap((link) => {
            const section = link.section;
            const target = pagesByName.get(comparableText(link.page))?.[0] ?? systemPageNamed(world, link.page);

            if (target?.system !== undefined) {
                return [{
                    path: page.path,
                    message: `${page.name} knows ${written(link)}, ${systemLabel(target)}, ${systemKnowsReason(target)}: knows lists pages and secrets of the campaign.`,
                    fix: `write ${page.name}, remove knows=${entry}`,
                }];
            }

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

/**
 * How to fix a link in a field to a page that does not exist: what the world lacks gets its page, as a spell the system does not have (D-216); a wrong link goes. A
 * campaign played in another language than its system's is told the system's.
 */
function missingFix(world: World, page: Page, target: string, field: string | undefined, entry: string | undefined, inList: boolean): string
{
    if (field === undefined || field === "effects") {
        return linkFix(page, field, entry, inList);
    }

    const system = world.system;
    const language = system !== undefined && world.language !== undefined && comparableText(world.language) !== comparableText(system.language)
        ? ` (the system ${system.name} names its pages in ${system.language}: find looks them up)`
        : "";
    return `create ${target} with write if it belongs to this world, or ${linkFix(page, field, entry, inList)}${inList ? " if the link is wrong" : ""}${language}`;
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

    // A kind counted in stacks is in no place, however many count it (STK-3).
    if (holders.length > 1 && !isCountedItem(world, page)) {
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

    return [...problems, ...heldProblems(world, pagesByName, page), ...wrongFieldProblems(page)];
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

/** Entries of a container's field that point to pages it cannot hold (CON-1), or to pages of the game system, which are nowhere (SYS-6): they put nothing anywhere. */
function heldProblems(world: World, pagesByName: Map<string, Page[]>, holder: Page): Problem[]
{
    return listingsOf(holder).flatMap((listing) =>
        linksIn(listing.entry).flatMap((name) => {
            const held = pagesByName.get(comparableText(name));
            const system = held === undefined ? systemPageNamed(world, name) : undefined;

            if (system !== undefined && alwaysInList(world, system) !== undefined) {
                return [{
                    path: holder.path,
                    message: `${holder.name} lists ${system.name} in ${listing.field}: ${alwaysInMessage(system, alwaysInList(world, system) ?? "")}`,
                    fix: `write ${holder.name}, remove ${listing.field}=${listing.entry}`,
                }];
            }

            // A kind of the system is counted in stacks, a link alone being 1 (STK-1).
            if (system !== undefined && isKind(world, system)) {
                return [];
            }

            if (system !== undefined) {
                const reason = notKindReason(world, system);
                const instead = system.type === "item" ? `; ${reason ?? "it is no kind to count"}: one that ${holder.name} has is an item of the campaign with item=[[${system.name}]]` : "";
                return [{
                    path: holder.path,
                    message: `${holder.name} lists ${system.name} in ${listing.field}, but ${system.name} is ${systemLabel(system)}, a kind, which is nowhere${instead}.`,
                    fix: `write ${holder.name}, remove ${listing.field}=${listing.entry}${system.type === "item" ? `, then write "<name>", type item, set item=[[${system.name}]] and move it to ${holder.name}` : ""}`,
                }];
            }

            const page = held?.length === 1 ? held[0] : undefined;

            if (page === undefined || page === holder || canHold(holder.type, page.type)) {
                return [];
            }

            const message = `${holder.name} lists ${page.name} in ${listing.field}, but ${withArticle(holder.type ?? "free page")} holds ${heldTypesText(holder.type)}, and ${page.name} is ${withArticle(page.type ?? "free page")}.`;
            return [{ path: holder.path, message, fix: `move ${page.name}, to a container that holds it, such as a place; or write ${holder.name}, remove ${listing.field}=${listing.entry}` }];
        })
    );
}

/**
 * The stacks a container lists, as validate checks them (STK-13): a count inside a text, an entry beside a kind that is no stack, a count beside what is no kind, a kind of the
 * campaign without its count, a kind listed twice, and a number named as goods, as torches: 7, that should be a stack.
 */
function stackProblems(world: World, holder: Page): Problem[]
{
    const field = containerFieldOf(holder.type);

    if (field === undefined) {
        return [];
    }

    const entries = textsIn(holder.fields[field]);
    const remove = (entry: string): string => `write ${holder.name}, remove ${field}=${entry.includes(" ") ? `"${entry}"` : entry}`;
    const problems = entries.flatMap((entry): Problem[] => {
        const read = readEntry(entry);
        const page = read.shape === "text" ? undefined : entryPage(world, read.page);

        if (read.shape === "text") {
            const counted = countedText(entry);
            const kind = counted === undefined ? undefined : pageNamedQuietly(world, counted.name);
            const stack = counted !== undefined && kind !== undefined && isKind(world, kind) ? `"[[${kind.name}]] ${counted.count}"` : `"[[<kind>]] ${counted?.count ?? 1}"`;
            return counted === undefined ? [] : [{
                path: holder.path,
                message: `${holder.name} lists "${entry}" in ${field}: a count inside a text, which nothing counts.`,
                fix: `${remove(entry)}, add ${field}=${stack}, with a kind of the system or of the campaign`,
            }];
        }

        if (read.shape === "other" && page !== undefined && isKind(world, page)) {
            return [{ path: holder.path, message: `${holder.name} lists "${entry}" in ${field}: no stack, so it counts nothing.`, fix: `${remove(entry)}, add ${field}="[[${page.name}]] <how many>"` }];
        }

        if (read.shape === "stack" && page === undefined && goodsNamed(world, read.page) !== undefined) {
            return [{ path: holder.path, message: `${holder.name} counts [[${read.page}]] in ${field}, which counts nothing: ${missingKindMessage(world, holder, field, read)}`, fix: remove(entry) + ", then the stack above" }];
        }

        if (read.shape === "stack" && page !== undefined && !isKind(world, page)) {
            const reason = notKindReason(world, page) ?? `${page.name} is one thing with a story of its own`;
            return [{ path: holder.path, message: `${holder.name} counts ${page.name} in ${field}, but it is no kind to count: ${reason}.`, fix: `${remove(entry)}, and give ${holder.name} the thing itself with move` }];
        }

        if (read.shape === "link" && read.section === undefined && page !== undefined && page.system === undefined && isKind(world, page)) {
            return [{
                path: holder.path,
                message: `${holder.name} lists ${page.name} in ${field} without a count, while other entries count it, so it is a kind, read here as 1.`,
                fix: `if ${page.name} is a kind, ${remove(entry)}, add ${field}="[[${page.name}]] 1"; if it is one thing with a story of its own, take its counts away where others count it`,
            }];
        }

        return [];
    });

    const twice = stacksOf(world, holder).filter((stack) => entries.filter((entry) => entryOfKind(entry, stack.kind.name)).length > 1);
    return [
        ...problems,
        ...twice.map((stack) => ({
            path: holder.path,
            message: `${holder.name} lists ${stack.kind.name} more than once in ${field}: a container has one stack of each kind, read as ${stack.count}.`,
            fix: `${remove(`[[${stack.kind.name}]]`)}, add ${field}="[[${stack.kind.name}]] ${stack.count}"`,
        })),
        ...goodsFieldProblems(world, holder),
    ];
}

/**
 * A number without a maximum named as goods in the plural, as torches: 7 or crossbow-bolts: 20: what a stack counts, written as a field nothing spends (STK-13); `names` are
 * the fields to look at, all of them when left out. A name in the singular, as lock: 15, is some other number.
 */
export function goodsFieldProblems(world: World, page: Page, names?: string[]): Problem[]
{
    const field = containerFieldOf(page.type);

    if (field === undefined) {
        return [];
    }

    return Object.entries(page.fields).filter(([name]) => names === undefined || names.some((wanted) => comparableText(wanted) === comparableText(name))).flatMap(([name, value]): Problem[] => {
        const count = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value) : undefined;

        if (count === undefined || !Number.isSafeInteger(count) || !/s$/i.test(name) || isStandardField(page.type, name) || declaredKind(world, name) !== undefined) {
            return [];
        }

        const kind = goodsNamed(world, name);
        return kind === undefined ? [] : [{
            path: page.path,
            message: `${page.name} counts ${name}: ${count} as a number, which no command spends: goods are a stack of ${kind.name} in ${field}.`,
            fix: `write ${page.name}, unset ${name}, add ${field}="[[${kind.name}]] ${count}"`,
        }];
    });
}

/** What a character has equipped and does not hold (CON-12), as write says it after a change of its inventory or of what it has equipped. */
export function equippedNotes(world: World, character: Page): string[]
{
    return equippedProblems(world, groupBy(world.pages, (page) => [page.name]), character).map((problem) => `${problem.message} Fix: ${problem.fix}.`);
}

/** A road's stop that is a page but not a place of the campaign (ROA-4, ROA-7): its stretches lead nowhere. A stop that does not exist is a broken link, said above. */
function stopProblems(world: World, pagesByName: Map<string, Page[]>, road: Page): Problem[]
{
    const read = road.type === "place" ? readStops(road.fields.stops) : undefined;

    if (read === undefined || "problem" in read) {
        return [];
    }

    return [...new Set(read.stops)].flatMap((name) => {
        const page = pagesByName.get(comparableText(name))?.[0] ?? systemPageNamed(world, name);
        const what = page === undefined || (page.type === "place" && page.system === undefined) ? undefined : page.system === undefined ? withArticle(page.type ?? "free page") : systemLabel(page);
        return what === undefined
            ? []
            : [{ path: road.path, message: `${road.name} has ${page?.name} among its stops, but it is ${what}, not a place of the campaign: the stretches to it lead nowhere.`, fix: `write ${road.name}, set stops again with places` }];
    });
}

/**
 * What a character has equipped and does not hold, directly or inside what it holds (CON-12): an item that went elsewhere, or a page of the game system, a kind,
 * which is nowhere.
 */
function equippedProblems(world: World, pagesByName: Map<string, Page[]>, character: Page): Problem[]
{
    const value = character.fields.equipped;

    if (character.type !== "character" || isEmptyField(value)) {
        return [];
    }

    return (Array.isArray(value) ? value : [value]).map(String).flatMap((entry) =>
        linksIn(entry).flatMap((name): Problem[] => {
            const held = pagesByName.get(comparableText(name));
            const system = held === undefined ? systemPageNamed(world, name) : undefined;

            if (system !== undefined && alwaysInList(world, system) !== undefined) {
                return [{ path: character.path, message: `${character.name} has ${system.name} in equipped: ${alwaysInMessage(system, alwaysInList(world, system) ?? "")}`, fix: `write ${character.name}, remove equipped=${entry}` }];
            }

            const counted = system ?? (held?.length === 1 ? held[0] : undefined);

            // A kind is equipped while the character carries a stack of it (STK-11).
            if (counted !== undefined && isKind(world, counted)) {
                return carriesKind(world, character, counted) ? [] : [{
                    path: character.path,
                    message: `${character.name} has ${counted.name} in equipped, but carries none: a character wears or wields only what it holds.`,
                    fix: `move ${counted.name}, from where some is, to ${character.name}, count 1; or write ${character.name}, remove equipped=${entry}`,
                }];
            }

            if (system !== undefined) {
                return [{
                    path: character.path,
                    message: `${character.name} has ${system.name} in equipped, but it is ${systemLabel(system)}, a kind: what a character wears or wields is an item of the campaign with item=[[${system.name}]], in its inventory.`,
                    fix: `write "<name>", type item, set item=[[${system.name}]], move it to ${character.name}, then write ${character.name}, remove equipped=${entry} and add the new one`,
                }];
            }

            const page = held?.length === 1 ? held[0] : undefined;
            return page === undefined || locate(world, page).chain.includes(character)
                ? []
                : [{
                    path: character.path,
                    message: `${character.name} has ${page.name} in equipped, but does not carry it: a character wears or wields only what it holds.`,
                    fix: `move ${page.name}, to ${character.name}; or write ${character.name}, remove equipped=${entry}`,
                }];
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
    const field = baseFieldOf(page.type) ?? "creature";
    return problem === undefined ? [] : [{ path: page.path, message: problem, fix: `write ${page.name}, set ${field} to the ${field} it is a kind of, or unset it` }];
}

function sectionProblems(page: Page): Problem[]
{
    const repeated = repeatedNames(page.body).map((name) => ({ path: page.path, message: `${page.name} has two sections or secrets named "${name}".`, fix: `rename one of them by hand, so that ${page.name}#${name} finds one place` }));
    // A secret the engine reads as public text would reach the player's view (VIEW-3).
    const unread = unreadSecretLines(page.body).map((line) => ({
        path: page.path,
        message: `${page.name} marks a secret that is read as public text: "${page.body.split("\n")[line - 1].trim()}".`,
        fix: "start its line with > [!secret] Name, at most three spaces in, by hand",
    }));
    return [...repeated, ...unread];
}
