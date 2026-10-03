import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry, type LogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName } from "../core/text.ts";
import { canSpend, changeCounter, type Counter, type CounterChange, counterLimit, formatCounter, isSafeCounter, readCounter, readCounterText } from "../counters/index.ts";
import { concernsPlayer, findPage, isStandardField, loadWorld, parsePageReference, type World, writePage } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import { copyCounters, readOpenScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { skippedPagesNote } from "./notes.ts";
import { countersText } from "./page-counters.ts";

/** What holds a counter: a page, or a copy of a creature in the open scene (D-110). */
interface CounterHolder
{
    name: string;
    kind: "page" | "copy";
    fields: Record<string, unknown>;
    /** Fields with a fixed meaning, which are never counters. */
    isFixed(field: string): boolean;
    write(field: string, value: number | string): void;
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
        const field = fieldName(holder, input.field);
        const before = readCounter(holder.fields[field]);

        if (before === undefined) {
            throw new Error(notCounterMessage(holder, field));
        }

        const counterChange = readChange(input, before, holder.name, field);
        const { counter: after, beyond } = changeCounter(before, counterChange);

        if (!isSafeCounter(after)) {
            throw new Error(`${field} on ${holder.name} would be too large to count exactly. Nothing changed.`);
        }

        const changed = formatCounter(after) !== formatCounter(before);

        if (changed) {
            holder.write(field, formatCounter(after));
            const why = input.why?.trim() === "" ? undefined : input.why;
            const data = { page: holder.name, copy: holder.kind === "copy" ? true : undefined, field, before: formatCounter(before), after: formatCounter(after), ...amountOf(counterChange), beyond: beyond === 0 ? undefined : beyond, why };
            appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", holder.visibility, data));
        }

        return { page: holder.name, field, before: String(formatCounter(before)), after: String(formatCounter(after)), note: limitNote(after, beyond), changed, problems: world.problems };
    },

    format(result)
    {
        const note = result.note === "" ? "" : `: ${result.note}`;
        const summary = result.changed ? `${result.page}: ${result.field} ${result.before} → ${result.after}${note}.` : `Nothing changed: ${result.field} on ${result.page} is ${result.after}${note}.`;
        return [summary, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
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
    const { scene, problem } = readOpenScene(root);
    const copy = scene === undefined ? undefined : sameName(Object.keys(scene.copies), reference.name);

    const page = findPage(world, reference.name);

    if (scene !== undefined && copy !== undefined) {
        if (page !== undefined) {
            throw new Error(`${copy} is both a copy in the open scene and a page, so it is not clear which one to change. Close the scene, which removes the copy, or rename the page. Nothing changed.`);
        }

        return copyHolder(root, scene, copy);
    }

    if (page === undefined) {
        const copies = scene === undefined ? "" : ", nor a copy of that name in the open scene";
        const unreadable = problem === undefined ? "" : " The open scene in state.yaml cannot be read: validate shows how to fix it.";
        throw new Error(`There is no page named ${reference.name}${copies}. Look for it with the find command.${unreadable}`);
    }

    if (problem !== undefined && page.type === "creature") {
        throw new Error(`${page.name} is a creature, and the open scene, which may hold its copies, cannot be read: ${problem.message} To fix it, ${problem.fix}. Nothing changed.`);
    }

    checkNotCopied(scene, page.name);

    return {
        name: page.name,
        kind: "page",
        fields: page.fields,
        isFixed: (field) => isStandardField(page.type, field),
        write: (field, value) => writePage(world, page.name, undefined, { set: { [field]: value } }),
        visibility: concernsPlayer(world, page) ? "public" : "hidden",
    };
}

/** A creature with copies in the open scene keeps the counters each new copy starts with: a hit meant for a copy must not land on it. */
function checkNotCopied(scene: Scene | undefined, name: string): void
{
    const copies = Object.entries(scene?.copies ?? {}).filter(([, copy]) => comparableText(parsePageReference(copy.creature).name) === comparableText(name));

    if (copies.length > 0) {
        const listed = copies.map(([copy, fields]) => {
            const counters = countersText(copyCounters(fields));
            return counters === "" ? copy : `${copy} (${counters})`;
        });
        throw new Error(`${name} has copies in the open scene: ${listed.join(", ")}. Change a copy; ${name}'s page holds the counters each new copy starts with. Nothing changed.`);
    }
}

/** A copy of a creature in the open scene: its counters live in state.yaml, and only the master sees them change. */
function copyHolder(root: string, scene: Scene, copy: string): CounterHolder
{
    return {
        name: copy,
        kind: "copy",
        fields: scene.copies[copy],
        isFixed: (field) => field === "creature",
        write: (field, value) => updateScene(root, [[["copies", copy, field], value]]),
        visibility: "hidden",
    };
}

/** The holder's field with this name, ignoring case and how accents are written; a missing or fixed one fails with the counters it holds. */
function fieldName(holder: CounterHolder, name: string): string
{
    const keys = Object.keys(holder.fields);
    const found = keys.find((key) => key === name) ?? keys.find((key) => comparableText(key) === comparableText(name.trim()));

    if (found !== undefined && holder.isFixed(found)) {
        throw new Error(holder.kind === "copy" ? `${found} is the creature ${holder.name} copies, not a counter.` : `${found} is a fixed field of ${holder.name}, not a counter: change it with write.`);
    }

    if (found !== undefined) {
        return found;
    }

    const counters = keys.flatMap((key) => {
        const counter = holder.isFixed(key) ? undefined : readCounter(holder.fields[key]);
        return counter === undefined ? [] : [`${key} ${formatCounter(counter)}`];
    });
    const held = counters.length > 0 ? `Its counters: ${counters.join(", ")}.` : "It has no counters.";
    const add = holder.kind === "copy"
        ? "A copy takes the counters written on its creature when it enters the scene: write the counter on the creature, then bring copies in again with scene add."
        : `To add one, use write, such as set ${name}=12/12.`;
    throw new Error(`${holder.name} has no field "${name}". ${held} ${add}`);
}

function notCounterMessage(holder: CounterHolder, field: string): string
{
    const value = holder.fields[field];

    if (typeof value === "string" && readCounterText(value) !== undefined) {
        return `${field} on ${holder.name} is the text "${value}": write it without quotes, such as ${field}: ${value}, to make it a counter.`;
    }

    return `${field} on ${holder.name} is ${JSON.stringify(value)}, not a counter: write a counter as a number (20) or as current/max (12/12).`;
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
