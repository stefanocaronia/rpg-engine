// The stacks of goods (D-429, STK-1–STK-4): which items are kinds, what a container counts of each, and which stack a holder means.
import { comparableText, withArticle } from "../core/text.ts";
import { baseChain, inheritedFields } from "./inheritance.ts";
import { readEntry } from "./stack-entry.ts";
import { containerFieldOf } from "./standard-fields.ts";
import { alwaysInList, isDeclaredUncounted } from "./system-pages.ts";
import { heldNames, isCountedItem, type Page, pageNamed, pagesWithName, systemPageNamed, textsIn, validHoldersOf, type World } from "./world.ts";

// A counter with a maximum, as uses: 10/10: what a thing of its own spends, which a stack cannot keep (STK-1).
const usesPattern = /^\s*-?\d+\s*\/\s*\d+\s*$/;

/** A stack in a container (STK-1, STK-3): its kind, its count summed over the entries that name it, and the label of the first. */
export interface Stack
{
    kind: Page;
    count: number;
    label?: string;
}

/** A stack and the container whose list holds it. */
export interface HeldStack
{
    container: Page;
    stack: Stack;
}

/**
 * Why a page cannot be a kind (STK-1): it is not an item, the system gives it to everyone, it has uses of its own, or it holds something; undefined when it can be one.
 */
export function notKindReason(world: World, page: Page): string | undefined
{
    if (page.type !== "item") {
        return `${page.name} is ${withArticle(page.type ?? "free page")}: only items are counted`;
    }

    const always = alwaysInList(world, page);

    if (always !== undefined) {
        return `the system puts ${page.name} in the ${always} of every character with a sheet`;
    }

    const uses = Object.entries(inheritedFields(world, page)).find(([field, value]) => typeof value === "string" && usesPattern.test(value) && !isDeclaredUncounted(world, field));

    if (uses !== undefined) {
        return `${page.name} has ${uses[0]} ${String(uses[1])} of its own, which goes with one thing: such a thing is an item of the campaign derived from it`;
    }

    return page.system === undefined && heldNames(page).length > 0 ? `${page.name} holds something, which would be in many places at once` : undefined;
}

/** Whether a page is a kind (STK-1): an item of the game system that can be one, or one of the campaign that an entry counts. */
export function isKind(world: World, page: Page): boolean
{
    return (page.system !== undefined || isCountedItem(world, page)) && notKindReason(world, page) === undefined;
}

/** Whether a stack of this page may be written (STK-10): a kind, or an item that could be one and is in no place as a thing with a story of its own. */
export function canCount(world: World, page: Page): boolean
{
    return notKindReason(world, page) === undefined && (page.system !== undefined || validHoldersOf(world, page).length === 0);
}

/** The page an entry's link leads to: the campaign's, if only one has the name, else the game system's (SYS-3). */
export function entryPage(world: World, name: string): Page | undefined
{
    const found = pagesWithName(world, name);
    return found.length > 1 ? undefined : found[0] ?? systemPageNamed(world, name);
}

/** The stacks a container lists in its own field, one for each kind, in the order of their first entries; a link alone to a kind is a stack of 1 (STK-1, STK-3). */
export function stacksOf(world: World, holder: Page): Stack[]
{
    const field = containerFieldOf(holder.type);
    const stacks: Stack[] = [];

    for (const entry of field === undefined ? [] : textsIn(holder.fields[field])) {
        const counted = entryKind(world, entry);
        const known = counted === undefined ? undefined : stacks.find((stack) => stack.kind === counted.kind);

        if (counted !== undefined && known === undefined) {
            stacks.push(counted);
        } else if (counted !== undefined && known !== undefined) {
            known.count += counted.count;
        }
    }

    return stacks;
}

/** The kind an entry counts, with its count and label: a link and a count, or a link alone to a kind, which is 1 (STK-1); undefined for any other entry. */
export function entryKind(world: World, entry: string): Stack | undefined
{
    const read = readEntry(entry);

    if (read.shape !== "stack" && (read.shape !== "link" || read.section !== undefined)) {
        return undefined;
    }

    const page = entryPage(world, read.page);
    return page === undefined || !isKind(world, page) ? undefined : { kind: page, count: read.shape === "stack" ? read.count : 1, ...(read.label === undefined ? {} : { label: read.label }) };
}

/** A holder's stack of a kind in its own list; undefined when it has none. */
export function ownStack(world: World, holder: Page, kind: Page): Stack | undefined
{
    return stacksOf(world, holder).find((stack) => stack.kind === kind);
}

/**
 * Where a holder keeps a kind (STK-4): its own stack; else those inside the items it holds, down through the items, nearest first, never inside a character or a place it holds.
 * More than one is for the command to refuse.
 */
export function heldStacks(world: World, holder: Page, kind: Page): HeldStack[]
{
    const own = ownStack(world, holder, kind);

    if (own !== undefined) {
        return [{ container: holder, stack: own }];
    }

    return itemsWithin(world, holder).flatMap((item) => {
        const stack = ownStack(world, item, kind);
        return stack === undefined ? [] : [{ container: item, stack }];
    });
}

/**
 * The stacks a holder keeps of a kind or of a kind that derives from it, as the campaign's Razioni from the system's Rations (UPK-1): its own first, then
 * those inside the items it holds, nearest first.
 */
export function heldStacksOfKind(world: World, holder: Page, kind: Page): HeldStack[]
{
    const derives = (candidate: Page): boolean => candidate === kind || baseChain(world, candidate).includes(kind);
    return [holder, ...itemsWithin(world, holder)].flatMap((container) => stacksOf(world, container).filter((stack) => derives(stack.kind)).map((stack) => ({ container, stack })));
}

/** Whether a character carries some of a kind, in its own list or inside what it carries (STK-11). */
export function carriesKind(world: World, character: Page, kind: Page): boolean
{
    return heldStacks(world, character, kind).length > 0;
}

/**
 * The kind a name means for a holder (STK-4): a kind by its name or alias, or the label of an entry of the holder or of the items it holds, as torce for [[Torch|torce]] 7;
 * undefined when it means none.
 */
export function kindNamed(world: World, holder: Page | undefined, name: string): Page | undefined
{
    const page = pageNamed(world, name.trim());

    if (page !== undefined) {
        return isKind(world, page) ? page : undefined;
    }

    const containers = holder === undefined ? [] : [holder, ...itemsWithin(world, holder)];
    return containers.flatMap((container) => stacksOf(world, container)).find((stack) => stack.label !== undefined && comparableText(stack.label) === comparableText(name.trim()))?.kind;
}

/**
 * The goods a name means, as a field named after them would, such as torches or crossbow-bolts: a kind, or an item that may become one, by the name, its singular or its
 * words without hyphens; undefined for any other name.
 */
export function goodsNamed(world: World, name: string): Page | undefined
{
    const spoken = name.trim().replace(/[-_]/g, " ");
    const names = [...new Set([spoken, spoken.replace(/es$/i, ""), spoken.replace(/s$/i, "")])];
    return names.map((candidate) => pageNamedQuietly(world, candidate)).find((page) => page !== undefined && (isKind(world, page) || canCount(world, page)));
}

/** The name a kind goes by in a stack: its label, else its own name (STK-12). */
export function stackName(stack: Stack): string
{
    return stack.label ?? stack.kind.name;
}

/** The page a name means, or undefined when it means none or two pages share it. */
export function pageNamedQuietly(world: World, name: string): Page | undefined
{
    try {
        return pageNamed(world, name);
    } catch {
        return undefined;
    }
}

/** The items a container holds as pages, those whose first container it is (CON-3). */
function itemsHeldBy(world: World, container: Page): Page[]
{
    return heldNames(container).flatMap((name) => pagesWithName(world, name).slice(0, 1)).filter((page) => page.type === "item" && validHoldersOf(world, page)[0] === container);
}

/** The items inside a container, down through the items, each once. */
function itemsWithin(world: World, container: Page): Page[]
{
    const found: Page[] = [];
    let level = itemsHeldBy(world, container);

    while (level.length > 0) {
        const fresh = level.filter((page, index) => page !== container && !found.includes(page) && level.indexOf(page) === index);
        found.push(...fresh);
        level = fresh.flatMap((page) => itemsHeldBy(world, page));
    }

    return found;
}
