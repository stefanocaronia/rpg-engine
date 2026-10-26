// What write may do to the stacks of a container's list (STK-10): count only kinds, one stack of each, whose counts change only with change.
import { comparableText } from "../core/text.ts";
import { countedText, countOf, readEntry } from "./stack-entry.ts";
import { canCount, entryKind, entryPage, goodsNamed, isKind, notKindReason, stacksOf } from "./stacks.ts";
import { containerFieldOf } from "./standard-fields.ts";
import { type Page, pageNamed, searchSystemPages, textsIn, validHoldersOf, type World } from "./world.ts";
import type { PageChange } from "./write-page.ts";

/**
 * A stack's count changes with change, never with write (STK-10): adding a kind the container counts already is refused, and so is taking away a stack by another count
 * than its own, each with the change that does it.
 */
export function checkStackEdits(world: World, existing: Page | undefined, requested: PageChange): void
{
    const field = containerFieldOf(existing?.type);

    if (field === undefined || existing === undefined) {
        return;
    }

    for (const value of requested.add?.[field] ?? []) {
        const counted = typeof value === "string" ? entryKind(world, value) : undefined;
        const held = counted === undefined ? undefined : stacksOf(world, existing).find((stack) => stack.kind === counted.kind);

        if (held !== undefined) {
            const by = counted?.count ?? 1;
            throw new Error(`${existing.name} has ${held.count} ${held.kind.name} already: a stack's count changes with change, such as change ${existing.name}, ${held.kind.name}, by +${by}. Nothing changed.`);
        }
    }

    for (const value of requested.remove?.[field] ?? []) {
        const read = typeof value === "string" ? readEntry(value) : undefined;
        const held = read?.shape === "stack" ? textsIn(existing.fields[field]).map(readEntry).find((entry) => entry.shape === "stack" && comparableText(entry.page) === comparableText(read.page)) : undefined;

        if (read?.shape === "stack" && held?.shape === "stack" && held.count !== read.count) {
            throw new Error(`${existing.name} has ${held.count} ${read.page}: remove takes the whole stack, by its link [[${read.page}]]; to take ${read.count}, change ${existing.name}, ${read.page}, spend ${read.count}. Nothing changed.`);
        }
    }
}

/**
 * The stacks a write adds to a container's list (STK-10): only where a kind is counted, one for each kind, and with a count changed only by change. The entries it does not
 * add are validate's.
 */
export function checkStacks(world: World, holder: Page, field: string, before: unknown, after: unknown): void
{
    const was = textsIn(before).map((entry) => entry.trim());
    const now = textsIn(after).map((entry) => entry.trim());
    const added = now.filter((entry) => !was.includes(entry));

    for (const entry of added) {
        const read = readEntry(entry);
        const page = read.shape === "text" ? undefined : entryPage(world, read.page);

        if (read.shape === "text") {
            checkCountedText(world, holder, field, entry);
        } else if (read.shape === "other" && page !== undefined && isKind(world, page)) {
            throw new Error(`"${entry}" is no stack: a stack is a link and a count from 1 up, such as write ${holder.name}, add ${field}="[[${page.name}]] 3". Nothing changed.`);
        } else if (read.shape === "stack") {
            checkCounted(world, holder, field, read, page);
        }
    }

    const kindOf = kindOfEntry(world);

    for (const kind of new Set(added.flatMap(kindOf))) {
        const counts = (entries: string[]): number[] => entries.filter((entry) => kindOf(entry).includes(kind)).map(countOf);
        const total = (values: number[]): number => values.reduce((sum, value) => sum + value, 0);
        const [old, fresh] = [counts(was), counts(now)];

        if (old.length > 0 && total(old) !== total(fresh)) {
            const by = total(fresh) - total(old);
            throw new Error(`${holder.name} has ${total(old)} ${kind} already: a stack's count changes with change, such as change ${holder.name}, ${kind}, by ${by > 0 ? "+" : ""}${by}. Nothing changed.`);
        }

        if (fresh.length > 1) {
            throw new Error(`${holder.name} would list ${kind} ${fresh.length} times: a container has one stack of each kind, such as ${field}="[[${kind}]] ${total(fresh)}". Nothing changed.`);
        }
    }
}

/** A count beside a link counts only a kind (STK-1, STK-10): never a page with a story of its own, nor one that is not there, which the message tells how to find or make. */
function checkCounted(world: World, holder: Page, field: string, read: { page: string; count: number; }, page: Page | undefined): void
{
    if (page === undefined) {
        throw new Error(`${missingKindMessage(world, holder, field, read)} Nothing changed.`);
    }

    const reason = notKindReason(world, page);
    const elsewhere = validHoldersOf(world, page).filter((other) => other.path !== holder.path);

    if (reason !== undefined) {
        throw new Error(`${page.name} is no kind to count: ${reason}. Nothing changed.`);
    }

    if (!isKind(world, page) && elsewhere.length > 0) {
        throw new Error(`${page.name} is in ${elsewhere[0].name} as one thing with a story of its own: a count goes only beside a kind, as [[Name]] 7. Nothing changed.`);
    }
}

/** Text with a count at one end, as Torch 7, is a count inside a text (STK-10): refused when the rest names a kind, with its stack. */
function checkCountedText(world: World, holder: Page, field: string, entry: string): void
{
    const counted = countedText(entry);
    const page = counted === undefined ? undefined : pageNamed(world, counted.name);

    if (counted !== undefined && page !== undefined && isKind(world, page)) {
        throw new Error(`"${entry}" is a count inside a text: write ${holder.name}, add ${field}="[[${page.name}]] ${counted.count}", a stack of ${page.name}. Nothing changed.`);
    }
}

/**
 * What a count beside a link to no page means (STK-10): a name of a kind, as Arrows (20), in its units; else the system's kinds go by their English names, and a word
 * of the campaign's language is their label, as [[Torch|torcia]] 3; only what the system lacks becomes a kind of the campaign. Said by write and validate.
 */
export function missingKindMessage(world: World, holder: Page, field: string, read: { page: string; count: number; }): string
{
    const named = goodsNamed(world, read.page);

    if (named !== undefined) {
        const bundle = Number(named.fields.bundle);
        const pieces = Number.isSafeInteger(bundle) && bundle > 1 ? read.count * bundle : read.count;
        const unit = Number.isSafeInteger(bundle) && bundle > 1 ? `counted in pieces, ${bundle} for each bought` : "counted in the units the system sells it in";
        return `There is no page named ${read.page}, but it is a name of ${named.name}, ${unit}: write ${holder.name}, add ${field}="[[${named.name}]] ${pieces}".`;
    }

    const campaignKind = `Only what the system lacks becomes a kind of the campaign, written first: write "${read.page}", type item.`;
    const near = goodsLike(world, read.page);

    if (near.length > 0) {
        return `There is no page named ${read.page}, so [[${read.page}]] ${read.count} counts nothing. The system has ${near.map((page) => page.name).join(", ")}: if it is one of them, `
            + `write ${holder.name}, add ${field}="[[${near[0].name}]] ${read.count}". ${campaignKind}`;
    }

    return `There is no page named ${read.page}, so [[${read.page}]] ${read.count} counts nothing. The system's kinds go by their English names, as find shows them: write the one it has `
        + `with your word as its label, such as write ${holder.name}, add ${field}="[[Torch|${read.page.toLowerCase()}]] ${read.count}". ${campaignKind}`;
}

/** The system's goods whose names hold a word, the shortest first, as Arrows for Arrow: for a refusal to name them, which saves a find (STK-10). */
function goodsLike(world: World, word: string): Page[]
{
    const named = searchSystemPages(world, { text: word, type: "item" }).filter((match) => match.excerpt === undefined && canCount(world, match.page)).map((match) => match.page);
    return named.sort((one, other) => one.name.length - other.name.length).slice(0, 3);
}

/** The kind an entry counts, alone or with a count, as a list of one; none for any other entry. */
function kindOfEntry(world: World): (entry: string) => string[]
{
    return (entry) => {
        const read = readEntry(entry);
        const page = read.shape === "stack" || (read.shape === "link" && read.section === undefined) ? entryPage(world, read.page) : undefined;
        const counted = page !== undefined && (isKind(world, page) || (read.shape === "stack" && notKindReason(world, page) === undefined));
        return counted && page !== undefined ? [page.name] : [];
    };
}

/** Whether a name leads to a kind, counted as a stack of 1 when its link stands alone (STK-1). */
export function isKindNamed(world: World, name: string): boolean
{
    const page = entryPage(world, name);
    return page !== undefined && isKind(world, page);
}
