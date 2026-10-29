// Moving pages from one container to another (D-151, CON-4): everything is checked before anything is written.
import { join } from "node:path";
import { files } from "../core/store.ts";
import { comparableText, withArticle } from "../core/text.ts";
import { links } from "./markdown.ts";
import { changeFields, joinPageFile, readFields, splitPageFile } from "./page-file.ts";
import type { PageType } from "./page-types.ts";
import { countOf, doubledKinds, entryOfKind, stackEntry, withStackCount } from "./stacks/entry.ts";
import { notKindReason } from "./stacks/kinds.ts";
import { canHold, containerFieldOf, isEmptyField } from "./standard-fields.ts";
import { heldSystemPageMessage, systemLabel } from "./system-pages.ts";
import { linksIn, locate, type Page, readPage, withPage, type World } from "./world.ts";

/** A stack to set in a container's list (STK-3): the kind's name, its new count, 0 to take it away, and its label. */
export interface StackCount
{
    kind: string;
    count: number;
    label?: string;
}

/**
 * A planned move: the containers to write, in order, each with the entries it loses, as written, those it gains, the stacks it sets (STK-6) and the fields it sets, as a
 * purse paid from (STK-8); the destination comes last.
 */
export interface MovePlan
{
    edits: { holder: Page; field: string; remove: string[]; add: string[]; stacks?: StackCount[]; set?: Record<string, string>; }[];
    /** The pages that change place; the others were already only in the destination. */
    moving: Page[];
    /** Whether doing it again would hand things over twice, as a trade (STK-9): stopped halfway, it says what is left call by call. */
    once?: boolean;
}

/**
 * Plans moving pages into a container (CON-4): after it, each is only there. Every entry that points to one of them goes, however it is written and from
 * whichever container lists it; the destination keeps its one entry, or gains one at the end. Refused when the destination cannot hold one of them,
 * or would be inside itself, or when a list to change is not a list of links.
 */
export function planMove(world: World, pages: Page[], destination: Page): MovePlan
{
    for (const page of pages) {
        checkMove(world, page, destination);
    }

    // checkMove refuses a destination that holds nothing, so it has its field.
    const field = containerFieldOf(destination.type) ?? "contains";
    const listedOnce = (page: Page): boolean => entriesOf(destination, field).filter((entry) => pointsTo(entry, page)).length === 1;
    const edits: MovePlan["edits"] = [];

    for (const holder of world.pages.filter((page) => page !== destination)) {
        const own = containerFieldOf(holder.type);

        if (own === undefined) {
            continue;
        }

        const remove = pages.flatMap((page) => checkedEntries(holder, own, page));

        if (remove.length > 0) {
            edits.push({ holder, field: own, remove: distinctLinks(remove), add: [] });
        }
    }

    // A page only written twice in the destination does not move: its double goes in silence.
    const inDestination = (page: Page): boolean => entriesOf(destination, field).some((entry) => pointsTo(entry, page));
    const moving = pages.filter((page) => !inDestination(page) || edits.some((edit) => edit.remove.some((entry) => pointsTo(entry, page))));
    // Who had one of them equipped, or something inside one of them, as a sword in a pack, and holds it no more after the move has it no more (CON-12); who
    // moves keeps what goes with them, as a character their armor, or the passengers of a boat theirs.
    const around = new Set([destination, ...locate(world, destination).chain]);
    const carried = world.pages.filter((page) => moving.includes(page) || locate(world, page).chain.some((holder) => moving.includes(holder)));

    const staysWith = (item: Page, holder: Page): boolean => {
        const chain = locate(world, item).chain;
        const moved = chain.findIndex((container) => moving.includes(container));
        return around.has(holder) || (!moving.includes(item) && moved !== -1 && chain.slice(0, moved + 1).includes(holder));
    };

    for (const holder of world.pages.filter((page) => page.type === "character")) {
        const remove = entriesOf(holder, "equipped").filter((entry) => carried.some((page) => pointsTo(entry, page) && !staysWith(page, holder)));

        if (remove.length > 0) {
            edits.push({ holder, field: "equipped", remove: distinctLinks(remove), add: [] });
        }
    }

    const renewed = pages.filter((page) => !listedOnce(page));

    if (renewed.length > 0) {
        checkList(destination, field);
        // Written twice or more, it is written once again at the end; missing, it is added there.
        const remove = renewed.flatMap((page) => checkedEntries(destination, field, page));
        edits.push({ holder: destination, field, remove: distinctLinks(remove), add: renewed.map((page) => `[[${page.name}]]`) });
    }

    return { edits, moving };
}

/** Plans taking pages out of every container (TRV-12): in the open, between the places of the map, they are in none. What they carry goes with them. */
export function planLeave(world: World, pages: Page[]): MovePlan
{
    const edits: MovePlan["edits"] = [];

    for (const holder of world.pages) {
        const own = containerFieldOf(holder.type);
        const remove = own === undefined ? [] : pages.flatMap((page) => checkedEntries(holder, own, page));

        if (own !== undefined && remove.length > 0) {
            edits.push({ holder, field: own, remove: distinctLinks(remove), add: [] });
        }
    }

    return { edits, moving: pages.filter((page) => edits.some((edit) => edit.remove.some((entry) => pointsTo(entry, page)))) };
}

/**
 * Writes a planned move, the destination last, so that a move stopped halfway is finished by doing it again (CON-4). Every file is worked out first, so that
 * one that cannot be read stops the move before anything is written. Returns the world after it.
 */
export function applyMove(world: World, plan: MovePlan): World
{
    // A page with more than one field to change, as a character's inventory and what it has equipped, is written once, with all of them.
    const holders = plan.edits.map((edit) => edit.holder).filter((holder, index, all) => all.indexOf(holder) === index);
    const changed = holders.map((holder) => {
        const fullPath = join(world.root, holder.path);
        const file = splitPageFile(files().fresh(fullPath) ?? "");
        const frontmatter = plan.edits.filter((edit) => edit.holder === holder).reduce((text, { field, remove, add, stacks, set }) => {
            const removed = remove.length === 0 ? text : changeFields(text, { remove: { [field]: remove } }, holder.path);
            const added = add.length === 0 ? removed : changeFields(removed, { add: { [field]: add } }, holder.path);
            const stacked = stacks === undefined || stacks.length === 0 ? added : withStacks(added, field, stacks, holder.path);
            const counted = set === undefined ? stacked : changeFields(stacked, { set }, holder.path);
            // A container left with nothing loses the field, as if it had never held anything.
            return isEmptyList(readFields(counted, holder.path)[field]) ? changeFields(counted, { unset: [field] }, holder.path) : counted;
        }, file.frontmatter);
        return { holder, fullPath, text: joinPageFile({ frontmatter, body: file.body }) };
    });
    let after = world;

    for (const [index, { holder, fullPath, text }] of changed.entries()) {
        try {
            files().write(fullPath, text);
        } catch (error) {
            const written = changed.slice(0, index).map((file) => file.holder);
            const done = written.length === 0 ? "Nothing moved" : `Written already: ${written.map((page) => page.name).join(", ")}`;
            const why = `${holder.path} could not be written (${error instanceof Error ? error.message : String(error)}). ${done}`;
            const left = plan.edits.filter((edit) => changed.slice(index).some((file) => file.holder === edit.holder));
            const paths = written.map((page) => page.path);

            // Doing a move of stacks or a trade again would hand things over twice (STK-9): what is left to write is said call by call.
            if (written.length > 0 && (plan.once === true || plan.edits.some((edit) => (edit.stacks ?? []).length > 0))) {
                throw new MoveStopped(`${why}: fix it, then finish with ${finishingCalls(left).join("; ")}.`, paths);
            }

            throw new MoveStopped(`${why}: fix it, then run the same move again, which finishes it.`, paths);
        }

        after = withPage(after, after.pages.find((page) => page.path === holder.path), readPage(world.root, fullPath));
    }

    return after;
}

/** A move stopped by a file that could not be written: the paths of the pages written before it, whose lines in the log the caller still writes (STK-9). */
export class MoveStopped extends Error
{
    readonly written: string[];

    constructor(message: string, written: string[])
    {
        super(message);
        this.written = written;
    }
}

/** Why a container cannot hold a page (CON-1), with the way out: where the page goes instead. */
export function holdRefusal(holder: { name: string; type?: PageType; }, held: { name: string; type?: PageType; }): string
{
    if (held.type === "creature") {
        return `${held.name} is a creature, a kind: its copies enter a scene with scene, creatures; one in particular is a character with creature [[${held.name}]].`;
    }

    if (held.type !== "place" && held.type !== "character" && held.type !== "item") {
        return `${held.name} is ${withArticle(held.type ?? "free page")}, which is nowhere: only places, characters and items are inside something.`;
    }

    if (containerFieldOf(holder.type) === undefined) {
        const where = held.type === "item" ? "a place, a character or an item" : held.type === "character" ? "a place or an item" : "a place";
        return `${holder.name} is ${withArticle(holder.type ?? "free page")}, which holds nothing: ${held.name} goes into ${where}.`;
    }

    if (held.type === "place") {
        const inside = holder.type === "item" ? ` For a world inside a thing, such as a lamp's, write a place with a link to ${holder.name}.` : "";
        return `${holder.name} is ${withArticle(holder.type ?? "free page")}: a place goes only into a place.${inside}`;
    }

    return `${holder.name} is a character, who carries only items: to be with them, ${held.name} goes where ${holder.name} is.`;
}

/** A frontmatter with stacks set in a container's list, each written once in the place of its first entry (STK-3). */
function withStacks(frontmatter: string | undefined, field: string, stacks: StackCount[], path: string): string
{
    const value = readFields(frontmatter, path)[field];
    const set = stacks.reduce<unknown[]>((entries, stack) => withStackCount(entries, stack.kind, stack.count, stack.label), Array.isArray(value) ? value : []);
    // A list the engine writes holds one stack of each kind: the doubles written by hand become one, with their sum (STK-3).
    const list = doubledKinds(set).reduce((entries, kind) => withStackCount(entries, kind, entries.filter((entry) => entryOfKind(entry, kind)).reduce<number>((sum, entry) => sum + countOf(entry), 0)), set);
    return changeFields(frontmatter, list.length === 0 ? { unset: [field] } : { set: { [field]: list } }, path);
}

/** The calls that finish the edits of a move stopped halfway, without doing again what is written (STK-9). */
function finishingCalls(edits: MovePlan["edits"]): string[]
{
    return edits.flatMap((edit) => [
        ...(edit.stacks ?? []).map((stack) => {
            const had = entriesOf(edit.holder, edit.field).some((entry) => entryOfKind(entry, stack.kind));
            return stack.count === 0
                ? `write ${edit.holder.name}, remove ${edit.field}=[[${stack.kind}]]`
                : had
                ? `change ${edit.holder.name}, ${stack.kind}, to ${stack.count}`
                : `write ${edit.holder.name}, add ${edit.field}="${stackEntry(stack.kind, stack.count, stack.label)}"`;
        }),
        ...edit.remove.map((entry) => `write ${edit.holder.name}, remove ${edit.field}=${entry}`),
        ...edit.add.map((entry) => `write ${edit.holder.name}, add ${edit.field}=${entry}`),
        ...Object.entries(edit.set ?? {}).map(([field, value]) => `change ${edit.holder.name}, ${field}, to "${value}"`),
    ]);
}

/** A page goes only into a container that can hold it (CON-1), never into itself or into what it holds (CON-3); the pages of the game system go nowhere (SYS-6). */
function checkMove(world: World, page: Page, destination: Page): void
{
    if (page.system !== undefined) {
        throw new Error(`${heldSystemPageMessage(page, destination, world, notKindReason(world, page))} Nothing moved.`);
    }

    if (destination.system !== undefined) {
        throw new Error(`${destination.name} is ${systemLabel(destination)}, a kind, which holds nothing: ${page.name} goes into a page of the campaign. Nothing moved.`);
    }

    if (!canHold(destination.type, page.type)) {
        throw new Error(`${holdRefusal(destination, page)} Nothing moved.`);
    }

    if (page === destination || locate(world, destination).chain.includes(page)) {
        const why = page === destination ? "into itself" : `into ${destination.name}, which is inside it`;
        throw new Error(`${page.name} cannot go ${why}: a thing is never inside itself. Nothing moved.`);
    }
}

/** A container's list must be a list to change it: one written as text is refused, with how to write it. */
function checkList(holder: Page, field: string): void
{
    const value = holder.fields[field];

    if (!isEmptyField(value) && !Array.isArray(value)) {
        throw new Error(`${field} on ${holder.name} is ${JSON.stringify(value)}, not a list: write it as one first, such as write ${holder.name}, set ${field}=[[A]], [[B]]. Nothing moved.`);
    }
}

/**
 * The entries of a container that point to a page, to take out. Refused when the container lists it in text, where no entry can be taken out alone,
 * or in an entry that links to more than it, which would go too.
 */
function checkedEntries(holder: Page, field: string, page: Page): string[]
{
    if (listsAsText(holder, field, page)) {
        checkList(holder, field);
    }

    const entries = entriesOf(holder, field).filter((entry) => pointsTo(entry, page));
    const shared = entries.find((entry) => links(entry).length > 1);

    if (shared !== undefined) {
        throw new Error(`${field} on ${holder.name} has an entry with more than one link, "${shared}": write one link for each entry first. Nothing moved.`);
    }

    return entries;
}

function isEmptyList(value: unknown): boolean
{
    return Array.isArray(value) && value.length === 0;
}

/** The texts a container's list holds, as written. */
function entriesOf(holder: Page, field: string): string[]
{
    const value = holder.fields[field];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Whether a container lists the page in a field that is not a list, where no entry can be taken out alone. */
function listsAsText(holder: Page, field: string, page: Page): boolean
{
    const value = holder.fields[field];
    return !Array.isArray(value) && linksIn(value).some((name) => comparableText(name) === comparableText(page.name));
}

/** One entry for each link, the first written: removing it takes away every entry that is the same link, however written (CON-7). Other text stays as it is. */
function distinctLinks(entries: string[]): string[]
{
    const key = (entry: string): string => (/^\[\[[^\]]+\]\]$/.test(entry.trim()) ? links(entry).map((link) => comparableText(`${link.page}#${link.section ?? ""}`)).join("|") : `text ${entry}`);
    return entries.filter((entry, index) => entries.findIndex((other) => key(other) === key(entry)) === index);
}

/** Whether an entry is a link to the page, however written: [[bruna]], [[characters/Bruna.md|the ferry keeper]] (CON-2). */
function pointsTo(entry: string, page: Page): boolean
{
    return links(entry).some((link) => comparableText(link.page) === comparableText(page.name));
}
