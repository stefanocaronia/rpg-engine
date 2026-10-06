import { comparableText, withArticle } from "../core/text.ts";
import { introductionText, secretNames, sectionTitles, textParts } from "./markdown.ts";
import type { FieldChange } from "./page-file.ts";
import type { PageType } from "./page-types.ts";
import { isEmptyField, isStandardField, misspelledStandardField } from "./standard-fields.ts";
import { linksIn, type Page, systemPageNamed, type World } from "./world.ts";

// The field in which a page of a type names what it derives from, named after the type of its base: for a character or a creature, the creature it is a kind of;
// for an item, the item (INH-1, D-164). On other types a field with that name means something else, such as the wolf of a trophy, and passes nothing on.
const baseFields: Partial<Record<PageType, "creature" | "item">> = { character: "creature", creature: "creature", item: "item" };

// INH-8: never inherited, a closed list of the core: who a page is, what it holds or knows, and what holds it for a while. Fields a system declares are inherited.
const neverInherited = new Set(["role", "status", "creature", "item", "inventory", "knows", "factions", "contains", "date", "place", "tags", "aliases", "effects"]);

// Pages by comparable name, built once for each loaded world: following a chain costs a lookup, however many pages there are (INH-16).
const namesCache = new WeakMap<World, Map<string, Page[]>>();

/** A field and its value as a page writes it. */
export interface FieldValue
{
    name: string;
    value: unknown;
}

/** What a page reads from one of its bases: fields, the introduction when the page has none, and sections and secrets with their text (INH-4, INH-13). */
export interface Inherited
{
    base: Page;
    fields: Record<string, unknown>;
    introduction: string;
    parts: { name: string; text: string; }[];
}

/** The pages a page derives from, nearest first (INH-3): its creature, that creature's own, and so on. */
export function baseChain(world: World, page: Page): Page[]
{
    const chain: Page[] = [];

    for (let base = nextBase(world, page); base !== undefined && base !== page && !chain.includes(base); base = nextBase(world, base)) {
        chain.push(base);
    }

    return chain;
}

/** A page's fields with what it inherits (INH-4–INH-8): what it holds wins, then the nearest base; a name in another case is the same field, an empty value is missing. */
export function inheritedFields(world: World, page: Page): Record<string, unknown>
{
    const bases = baseChain(world, page).reverse().map((base) => Object.entries(base.fields).filter(([field]) => !isNeverInherited(field)));
    // From the farthest base to the page: a nearer value takes the place of a farther one, with its name; fields keep the order in which they first appear.
    const fields = new Map<string, [string, unknown]>();

    for (const layer of [...bases, Object.entries(page.fields)]) {
        for (const [field, value] of layer.filter(([, candidate]) => !isEmptyField(candidate))) {
            fields.set(comparableText(field), [field, value]);
        }
    }

    return Object.fromEntries(fields.values());
}

/**
 * What a page reads from each base, nearest first, as show gives it (INH-13): the fields it does not hold, the introduction of the nearest base that has one
 * when the page has none, and the sections and secrets it has none of by name. A secret without a name matches no other, so a base's is always shown.
 */
export function inheritedByBase(world: World, page: Page): Inherited[]
{
    const chain = baseChain(world, page);
    const fields = Object.entries(inheritedFields(world, page)).filter(([field]) => !holdsField(page, field));
    const shown = new Set(textParts(page.body).map((part) => comparableText(part.name)));
    const introducer = introductionText(page.body) === "" ? chain.find((base) => introductionText(base.body) !== "") : undefined;

    return chain.flatMap((base) => {
        const all = textParts(base.body);
        const kept = new Set(all.filter((part) => part.name === "" || !shown.has(comparableText(part.name))));
        const parts = all.filter((part, index) => kept.has(part) && !emptyHeading(all, index, kept));
        kept.forEach((part) => shown.add(comparableText(part.name)));
        const own = Object.fromEntries(fields.filter(([field]) => baseValue(world, page, field)?.base === base));
        const introduction = base === introducer ? introductionText(base.body) : "";
        return Object.keys(own).length > 0 || parts.length > 0 || introduction !== "" ? [{ base, fields: own, introduction, parts }] : [];
    });
}

/**
 * Whether the part at `index` is a heading with no text of its own whose subsections are none of them `kept`, as when the page writes them all itself: it has nothing
 * left to show (INH-13, D-169), such as the Actions of a creature whose one action the page rewrote.
 */
function emptyHeading(parts: { name: string; text: string; }[], index: number, kept: Set<{ name: string; text: string; }>): boolean
{
    const level = headingLevel(parts[index].text);

    if (level === undefined || parts[index].text.split("\n").slice(1).some((line) => line.trim() !== "")) {
        return false;
    }

    for (const next of parts.slice(index + 1)) {
        // A secret has no level: it belongs to the section it is in.
        if ((headingLevel(next.text) ?? Number.POSITIVE_INFINITY) <= level) {
            break;
        }

        if (kept.has(next)) {
            return false;
        }
    }

    return true;
}

/** The level of the heading a part starts with, 2 for "## Actions"; undefined for a secret. */
function headingLevel(text: string): number | undefined
{
    return /^(#{1,6})[ \t]/.exec(text)?.[1].length;
}

/** Whether a page writes a field with the very value it would read from its bases, and in no other case: that is no difference, and the page does not keep it (INH-9, D-125). */
export function sameAsBase(world: World, page: Page, field: string): boolean
{
    const base = baseValue(world, page, field);
    const held = Object.keys(page.fields).filter((name) => comparableText(name) === comparableText(field) && !isEmptyField(page.fields[name]));
    return base !== undefined && held.length === 1 && JSON.stringify(page.fields[field]) === JSON.stringify(base.value);
}

/** The pages deriving from a page that hold a field themselves, with no base between holding it: a change to it there does not reach them, though it would without their value. */
export function keepersOf(world: World, page: Page, field: string): Page[]
{
    if (isNeverInherited(field)) {
        return [];
    }

    return derivedPages(world, page).filter((derived) => {
        const chain = baseChain(world, derived);
        return holdsField(derived, field) && !chain.slice(0, chain.indexOf(page)).some((between) => holdsField(between, field));
    });
}

/** The section or secret `name` that a page shows, its own or the nearest base's (INH-13): where it is written, its title there, and whether it is a secret (REV-1). */
export function shownPart(world: World, page: Page, name: string): { holder: Page; title: string; secret: boolean; } | undefined
{
    const wanted = comparableText(name.trim());

    for (const holder of [page, ...baseChain(world, page)]) {
        const secret = secretNames(holder.body).find((title) => title !== "" && comparableText(title) === wanted);
        const section = sectionTitles(holder.body).find((title) => comparableText(title) === wanted);

        if (secret !== undefined || section !== undefined) {
            return { holder, title: secret ?? section ?? name, secret: secret !== undefined };
        }
    }

    return undefined;
}

/** Whether a field is one that no page ever inherits (INH-8), however it is written. */
export function isNeverInherited(field: string): boolean
{
    return neverInherited.has(comparableText(field));
}

/** Whether a page holds a field with a value, written in any case (INH-5, INH-6). */
export function holdsField(page: Page, field: string): boolean
{
    return heldName(page, field) !== undefined;
}

/** The field as a page itself writes it, empty or not: written exactly so, else in another case; undefined when the page does not write it. */
export function ownField(page: Page, field: string): string | undefined
{
    if (Object.hasOwn(page.fields, field)) {
        return field;
    }

    return heldName(page, field) ?? Object.keys(page.fields).find((name) => comparableText(name) === comparableText(field));
}

/**
 * The name under which a write gives a field a value on a page (INH-5): the one the page reads it from; else the one it writes empty; else the one it inherits; else the name given.
 * A fixed field keeps the name given, so that a write never lands on one written in another case.
 */
export function writtenFieldName(world: World, page: Page, field: string): string
{
    if (isFixedName(page, field)) {
        return field;
    }

    return heldName(page, field) ?? ownField(page, field) ?? baseValue(world, page, field)?.name ?? field;
}

/** The name under which a write removes a field from a page: as written, else in another case (INH-5); a fixed field only as written. */
export function removedFieldName(page: Page, field: string): string
{
    return isFixedName(page, field) ? field : (ownField(page, field) ?? field);
}

/** A field change as a page takes it (INH-5, INH-7): each field under the name the page gives it, and a list it only inherits handed to it before items are added or removed. */
export function ownFieldChange(world: World, page: Page, change: FieldChange): FieldChange
{
    const renamed = <Value>(values: Record<string, Value> | undefined): Record<string, Value> | undefined => {
        return values === undefined ? undefined : Object.fromEntries(Object.entries(values).map(([field, value]) => [writtenFieldName(world, page, field), value]));
    };

    const set = renamed(change.set);
    const add = renamed(change.add);
    const remove = renamed(change.remove);
    const lists = [...new Set([...Object.keys(add ?? {}), ...Object.keys(remove ?? {})])].filter((field) => !Object.hasOwn(set ?? {}, field) && !holdsField(page, field));
    const inherited = lists.flatMap((field) => {
        const base = baseValue(world, page, field);
        return base === undefined ? [] : [[field, structuredClone(base.value)]];
    });
    return { set: { ...Object.fromEntries(inherited), ...set }, unset: change.unset?.map((field) => removedFieldName(page, field)), add, remove };
}

/** What a page would read for a field without its own value: the nearest base that holds it, with the field as that base writes it. */
export function baseValue(world: World, page: Page, field: string): (FieldValue & { base: Page; }) | undefined
{
    if (isNeverInherited(field)) {
        return undefined;
    }

    for (const base of baseChain(world, page)) {
        const name = heldName(base, field);

        if (name !== undefined) {
            return { name, value: base.fields[name], base };
        }
    }

    return undefined;
}

/** The pages that derive from a page, directly or through others. */
export function derivedPages(world: World, page: Page): Page[]
{
    return world.pages.filter((candidate) => baseChain(world, candidate).includes(page));
}

/** The pages that read a field from a page, or would once it holds it: those deriving from it that hold the field neither themselves nor on a base between them and it (INH-10). */
export function followersOf(world: World, page: Page, field: string): Page[]
{
    return isNeverInherited(field) ? [] : followers(world, page, (candidate) => holdsField(candidate, field));
}

/** The pages that show a section or secret of a page, or would once it has one by that name: those deriving from it that have none, themselves or on a base between (INH-13). */
export function sectionFollowersOf(world: World, page: Page, name: string): Page[]
{
    return followers(world, page, (candidate) => textParts(candidate.body).some((part) => comparableText(part.name) === comparableText(name)));
}

/** The pages that show the introduction of a page, or would once it has one: those deriving from it with none of their own, nor on a base between (INH-13). */
export function introductionFollowersOf(world: World, page: Page): Page[]
{
    return followers(world, page, (candidate) => introductionText(candidate.body) !== "");
}

/**
 * The page with this name, when exactly one page of the campaign has it, or else the game system's (SYS-3); undefined when none has it, or two of the campaign do (INH-3).
 */
export function uniquePage(world: World, name: string): Page | undefined
{
    const found = pagesNamed(world).get(comparableText(name));
    return found === undefined ? systemPageNamed(world, name) : found.length === 1 ? found[0] : undefined;
}

/** The field in which a page of this type names what it derives from (INH-1): creature for characters and creatures, item for items; undefined for the other types. */
export function baseFieldOf(type: PageType | undefined): "creature" | "item" | undefined
{
    return type === undefined ? undefined : baseFields[type];
}

/** Why a page's base cannot be followed (INH-15): it is not of the type its field names, or the chain comes back to the page. Undefined when it can. */
export function baseProblem(world: World, page: Page): string | undefined
{
    const field = baseFieldOf(page.type);
    const [name] = field === undefined ? [] : linksIn(page.fields[field]);
    const linked = name === undefined ? undefined : uniquePage(world, name);

    if (field === undefined || linked === undefined) {
        return undefined;
    }

    if (linked.type !== field) {
        return `${page.name} derives from ${linked.name}, which is ${withArticle(linked.type ?? "free page")}: ${field} must link to ${withArticle(field)}.`;
    }

    const seen = [page];

    // Only a chain that comes back to this page is its own problem: one that loops further on is reported on the pages of the loop.
    for (let current: Page | undefined = linked; current !== undefined && !seen.includes(current); current = nextBase(world, current)) {
        seen.push(current);
    }

    return nextBase(world, seen[seen.length - 1]) === page ? `${page.name} derives from itself: ${[...seen, page].map((link) => link.name).join(" › ")}.` : undefined;
}

/**
 * Why a page of this type and name cannot derive from the page `link` points to (INH-2, INH-3): it is not of the type the field names, it is the page itself, or the chain would come back.
 * Undefined when it can, or when that page does not exist yet.
 */
export function newBaseProblem(world: World, page: { name: string; type?: PageType; }, link: string): string | undefined
{
    const field = baseFieldOf(page.type);
    const [name] = field === undefined ? [] : linksIn(link);

    if (field === undefined || name === undefined) {
        return undefined;
    }

    if (comparableText(name) === comparableText(page.name)) {
        return `${page.name} cannot derive from itself: ${field} must link to another ${field}.`;
    }

    const target = uniquePage(world, name);

    if (target === undefined) {
        return undefined;
    }

    if (target.type !== field) {
        return `${field} must link to ${withArticle(field)}, and ${target.name} is ${withArticle(target.type ?? "free page")}.`;
    }

    // The chain, and the page its last base links to, where the chain stops: it may be this one, a page of the same type about to be created.
    const chain = [target, ...baseChain(world, target)];
    const last = chain[chain.length - 1];
    const [next] = linksIn(last.fields[baseFieldOf(last.type) ?? field]);
    const names = [...chain.map((linked) => linked.name), ...(page.type === field && next !== undefined ? [next] : [])];
    const back = names.findIndex((linked) => comparableText(linked) === comparableText(page.name));
    return back === -1 ? undefined : `${page.name} cannot derive from ${target.name}: the chain would come back to it (${[page.name, ...names.slice(0, back), page.name].join(" › ")}).`;
}

/** The pages deriving from a page for which nothing nearer holds what `holds` looks for: neither they nor a base between them and the page. */
function followers(world: World, page: Page, holds: (candidate: Page) => boolean): Page[]
{
    return derivedPages(world, page).filter((derived) => {
        const chain = baseChain(world, derived);
        return ![derived, ...chain.slice(0, chain.indexOf(page))].some(holds);
    });
}

/** The page a page derives from (INH-2): the page of the type its base field names that the field links to, when exactly one page has that name. */
function nextBase(world: World, page: Page): Page | undefined
{
    const field = baseFieldOf(page.type);
    const [name] = field === undefined ? [] : linksIn(page.fields[field]);
    const base = name === undefined ? undefined : uniquePage(world, name);
    return base !== undefined && base.type === field ? base : undefined;
}

/** Whether a name is a fixed field of the page's type, or one written in another case, which is another field. */
function isFixedName(page: Page, field: string): boolean
{
    return isStandardField(page.type, field) || misspelledStandardField(page.type, field) !== undefined;
}

/** The name under which a page holds a field with a value, as reading takes it: the last one written in any case; undefined when it holds none. */
function heldName(page: Page, field: string): string | undefined
{
    return Object.keys(page.fields).findLast((name) => comparableText(name) === comparableText(field) && !isEmptyField(page.fields[name]));
}

function pagesNamed(world: World): Map<string, Page[]>
{
    let names = namesCache.get(world);

    if (names === undefined) {
        names = new Map();

        for (const page of world.pages) {
            const key = comparableText(page.name);
            names.set(key, [...(names.get(key) ?? []), page]);
        }

        namesCache.set(world, names);
    }

    return names;
}
