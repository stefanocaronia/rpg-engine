import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry, type LogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { canSpend, changeCounter, type Counter, type CounterChange, counterLimit, formatCounter, isSafeCounter, readCounter, readCounterText } from "../counters/index.ts";
import { baseChain, baseValue, concernsPlayer, findPage, followersOf, inheritedFields, isStandardField, keepersOf, loadWorld, ownField, type Page, parsePageReference, playerConcerns, type World, writePage } from "../pages/index.ts";
import { checkNotCopied, copyName, copyPage, readOpenScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { followersNote, keepersNote, skippedPagesNote } from "./notes.ts";

/** What holds a counter: a page, or a copy in the open scene, seen as a page that derives from its creature (INH-14). */
interface CounterHolder
{
    page: Page;
    kind: "page" | "copy";
    /** Writes fields as the page names them; undefined removes one, and the page reads it from its base again (INH-9). */
    write(fields: Record<string, number | string | undefined>): void;
    visibility: LogEntry["visibility"];
}

// Whole numbers arrive as text from a command line and as numbers through MCP; other text stays an error instead of becoming a number.
const wholeNumber = z.preprocess((value) => (typeof value === "string" && /^[+-]?\d+$/.test(value.trim()) ? Number(value) : value), z.number().int());

export const change = defineCommand({
    name: "change",
    description: "Change a counter on a page: hit points, uses, ammunition, supply, a progress track. "
        + "A counter is a field written as a number (20, from 0 up) or as current/max (12/12, from 0 to the maximum); create it with write, then change it only with this command. "
        + "by adds or takes away and stops at a limit (damage, healing); spend takes what is paid or used up, and is refused when there is not enough; "
        + "to sets a value, max, or current/max (15/15 changes the maximum too), even outside the limits. "
        + 'Example: page Bruna, field hp, by -7, why "bitten by the wolf".',
    group: "game",
    positionals: ["page", "field"],
    input: z.object({
        page: z.string().describe("page that holds the counter"),
        field: z.string().describe("the counter, such as hp"),
        by: wholeNumber.optional().describe("how much to add, or to take away when negative; on the command line write --by=-7"),
        spend: wholeNumber.optional().describe("how much is paid or used up"),
        to: z.union([z.number().int(), z.string()]).optional().describe("the new value: a number, max, or current/max such as 15/15; on the command line write --to=-3"),
        why: z.string().optional().describe("what the change is for"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const world = loadWorld(root);
        const holder = holderNamed(root, world, input.page);
        const fields = inheritedFields(world, holder.page);
        const field = fieldName(world, holder, fields, input.field);
        const before = readCounter(fields[field]);

        if (before === undefined) {
            throw new Error(notCounterMessage(holder.page.name, field, fields[field]));
        }

        const counterChange = readChange(input, before, holder.page.name, field);
        const { counter: after, beyond } = changeCounter(before, counterChange);

        if (!isSafeCounter(after)) {
            throw new Error(`${field} on ${holder.page.name} would be too large to count exactly. Nothing changed.`);
        }

        const changed = formatCounter(after) !== formatCounter(before);
        const written = ownField(holder.page, field) ?? field;
        const base = baseValue(world, holder.page, field);
        const baseCounter = base === undefined ? undefined : readCounter(base.value);
        const backToBase = changed && base !== undefined && baseCounter !== undefined && formatCounter(baseCounter) === formatCounter(after);
        const followers = changed && holder.kind === "page" ? followersOf(world, holder.page, field) : [];
        const keepers = changed && holder.kind === "page" ? keepersOf(world, holder.page, field).map((keeper) => `${keeper.name} (${field} ${String(counterOf(world, keeper, field))})`) : [];

        if (changed) {
            // Back to the base's value, the field goes in every spelling the page wrote it, so that the page reads the base's (INH-5, INH-9).
            const spellings = Object.keys(holder.page.fields).filter((name) => comparableText(name) === comparableText(field));
            holder.write(backToBase ? Object.fromEntries(spellings.map((name) => [name, undefined])) : { [written]: formatCounter(after) });
            const why = input.why?.trim() === "" ? undefined : input.why;
            const data = {
                page: holder.page.name,
                copy: holder.kind === "copy" ? true : undefined,
                field,
                before: formatCounter(before),
                after: formatCounter(after),
                ...amountOf(counterChange),
                beyond: beyond === 0 ? undefined : beyond,
                why,
            };
            appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", holder.visibility, data));
            logFollowers(root, world, context, followers, { field, before: formatCounter(before), after: formatCounter(after) });
        }

        const note = [limitNote(after, beyond), backToBase && base !== undefined ? `again as ${base.base.name}` : ""].filter((part) => part !== "").join("; ");
        const result = { page: holder.page.name, field, before: String(formatCounter(before)), after: String(formatCounter(after)), note, changed, problems: world.problems };
        return { ...result, followers: followers.map((page) => page.name), keepers };
    },

    format(result)
    {
        const note = result.note === "" ? "" : `: ${result.note}`;
        const summary = result.changed ? `${result.page}: ${result.field} ${result.before} → ${result.after}${note}.` : `Nothing changed: ${result.field} on ${result.page} is ${result.after}${note}.`;
        const followers = followersNote(result.followers, `since they read ${result.field} from ${result.page}`, "change", `${result.field} ${result.after}`);
        const lines = [summary, followers, keepersNote(result.keepers, result.field)].filter((line) => line !== "");
        return [lines.join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** What holds the counter, given by name or as a link: a copy in the open scene first, then a page. */
function holderNamed(root: string, world: World, name: string): CounterHolder
{
    const reference = parsePageReference(name);

    if (reference.section !== undefined) {
        throw new Error(`Give the page without #${reference.section}: a counter is a field of the page, such as page ${reference.name}, field hp.`);
    }

    // A scene that cannot be read holds no copies here; validate reports it.
    const open = readOpenScene(root);
    const copy = copyName(world, open.scene, reference.name);

    if (open.scene !== undefined && copy !== undefined) {
        const copies = open.scene.copies;
        const write = (fields: Record<string, number | string | undefined>): void => updateScene(root, Object.entries(fields).map(([field, value]) => [["copies", copy, field], value]));
        return { page: copyPage(copy, copies[copy]), kind: "copy", write, visibility: "hidden" };
    }

    const page = findPage(world, reference.name);

    if (page === undefined) {
        const copies = open.scene === undefined ? "" : ", nor a copy of that name in the open scene";
        const unreadable = open.problem === undefined ? "" : " The open scene in state.yaml cannot be read: validate shows how to fix it.";
        throw new Error(`There is no page named ${reference.name}${copies}. Look for it with the find command.${unreadable}`);
    }

    checkNotCopied(world, open, page);
    return {
        page,
        kind: "page",
        write: (fields) => {
            const set = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
            const unset = Object.keys(fields).filter((field) => fields[field] === undefined);
            writePage(world, page.name, undefined, { set: Object.keys(set).length === 0 ? undefined : set, unset: unset.length === 0 ? undefined : unset });
        },
        visibility: concernsPlayer(world, page) ? "public" : "hidden",
    };
}

/** One public line for each page that changed with a base and concerns the player, with its own name only and no why: the base and the other pages may be secret (INH-10, D-93). */
function logFollowers(root: string, world: World, context: Context, followers: Page[], change: { field: string; before: number | string; after: number | string; }): void
{
    const concerns = playerConcerns(world);

    for (const follower of followers.filter(concerns)) {
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: follower.name, ...change }));
    }
}

/** The holder's field with this name, ignoring case and how accents are written; a missing or fixed one fails with the counters it holds and how to add one. */
function fieldName(world: World, holder: CounterHolder, fields: Record<string, unknown>, name: string): string
{
    const keys = Object.keys(fields);
    const found = keys.find((key) => key === name) ?? keys.find((key) => comparableText(key) === comparableText(name.trim()));
    const page = holder.page;

    if (found !== undefined && isStandardField(page.type, found)) {
        const what = holder.kind === "copy" && found === "creature" ? `${found} is the creature ${page.name} copies` : `${found} is a fixed field of ${page.name}`;
        throw new Error(`${what}, not a counter${holder.kind === "page" ? ": change it with write" : ""}.`);
    }

    if (found !== undefined) {
        return found;
    }

    const counters = keys.flatMap((key) => {
        const counter = isStandardField(page.type, key) ? undefined : readCounter(fields[key]);
        return counter === undefined ? [] : [`${key} ${formatCounter(counter)}`];
    });
    const held = counters.length > 0 ? `Its counters: ${counters.join(", ")}.` : "It has no counters.";
    throw new Error(`${page.name} has no field "${name}". ${held} ${howToAdd(world, holder, name)}`);
}

/** The value a page reads for a field, written in any case. */
function counterOf(world: World, page: Page, field: string): unknown
{
    return Object.entries(inheritedFields(world, page)).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}

/** How to add a counter that neither the page nor its bases hold; or why its base cannot be read. */
function howToAdd(world: World, holder: CounterHolder, name: string): string
{
    const page = holder.page;
    const link = typeof page.fields.creature === "string" ? page.fields.creature : undefined;
    const base = baseChain(world, page)[0];

    if (link !== undefined && base === undefined && (page.type === "character" || page.type === "creature")) {
        const fix = holder.kind === "copy" ? "fix the creature's page, or let the copy leave the scene" : "fix the link with write";
        return `${page.name} ${holder.kind === "copy" ? "copies" : "derives from"} ${link}, which cannot be read: no creature has that name, two pages share it, or it is not a creature. To fix it, ${fix}; validate shows why.`;
    }

    if (base === undefined) {
        return `To add one, use write, such as set ${name}=12/12.`;
    }

    if (holder.kind === "copy") {
        return `To add one to ${page.name} alone, use write, such as set ${name}=12/12. To give it to every ${base.name}, write it on ${base.name} once the scene is closed.`;
    }

    return `${page.name} reads what it does not hold from ${base.name}: write the counter there, such as set ${name}=12/12, and everything that derives from ${base.name} takes it; or on ${page.name} alone.`;
}

function notCounterMessage(page: string, field: string, value: unknown): string
{
    if (typeof value === "string" && readCounterText(value) !== undefined) {
        return `${field} on ${page} is the text "${value}": write it without quotes, such as ${field}: ${value}, to make it a counter.`;
    }

    return `${field} on ${page} is ${JSON.stringify(value)}, not a counter: write a counter as a number (20) or as current/max (12/12).`;
}

function readChange(input: { by?: number; spend?: number; to?: number | string; }, counter: Counter, page: string, field: string): CounterChange
{
    const given = [input.by, input.spend, input.to].filter((part) => part !== undefined);

    if (given.length !== 1) {
        throw new Error("Give one of by (damage, healing), spend (what is paid or used up) or to (a value, max, or current/max).");
    }

    if (input.by !== undefined) {
        return { by: input.by };
    }

    if (input.spend !== undefined) {
        if (!canSpend(counter, input.spend)) {
            throw new Error(input.spend > 0 ? `${page} has ${field} ${formatCounter(counter)}: cannot spend ${input.spend}. Nothing changed.` : "Give spend a number above 0.");
        }

        return { spend: input.spend };
    }

    return { to: readTarget(String(input.to).trim(), counter, page, field) };
}

/** The value given to `to`: max, a whole number, or current/max. */
function readTarget(target: string, counter: Counter, page: string, field: string): Counter
{
    if (target.toLowerCase() === "max") {
        if (counter.max === undefined) {
            throw new Error(`${field} on ${page} has no maximum: give to a number, or write the field as current/max with write.`);
        }

        return { ...counter, value: counter.max };
    }

    const given = readCounterText(target);

    if (given === undefined) {
        throw new Error(`"${target}" is not a value for to: give a whole number, max, or current/max such as 15/15.`);
    }

    return given.max === undefined ? { ...counter, value: given.value } : given;
}

function amountOf(change: CounterChange): Record<string, unknown>
{
    return "to" in change ? { to: formatCounter(change.to) } : change;
}

/** Where the counter stands, when it matters: at 0 or at its maximum, how far a change went beyond, or outside the limits. */
function limitNote(counter: Counter, beyond: number): string
{
    const limit = counterLimit(counter);
    const where = limit === "outside" ? (counter.max === undefined ? "below 0" : `outside 0–${counter.max}`) : limit ?? "";
    return [where, beyond === 0 ? "" : `${Math.abs(beyond)} beyond`].filter((part) => part !== "").join(", ");
}
