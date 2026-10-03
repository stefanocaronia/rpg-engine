import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { findPage, isStandardField, loadWorld, misspelledFieldProblem, newPageFields, type Page, type PageType, pageTypeNames, parsePageReference, readFieldValue, writePage } from "../pages/index.ts";
import { newDatedLogEntry, plannedEventDateProblem } from "./game-time.ts";
import { skippedPagesNote } from "./notes.ts";

// How the output names each way of writing text.
const textChanges = { replace: "wrote", append: "added to", remove: "removed" };

// Fields arrive as field=value strings from a command line, or as an object through MCP.
const fieldValues = z.union([z.array(z.string()), z.record(z.string(), z.unknown())]);

export const write = defineCommand({
    name: "write",
    description: "Create or change a page of the world. "
        + "The world's pages are written only with this command: use it as soon as something becomes true in the story, such as a new character, place or item, a change, something a character learns. "
        + "Without a section it writes the introduction, the text before the first heading; with Page#Name it writes one section, or one secret written > [!secret] Name. "
        + "Add secret to create a missing one as a secret; empty text removes the section or secret. "
        + "A list field changes one item at a time with add and remove. "
        + 'Example: page Bruna, type character, set role=npc, text "A ferry keeper who knows every current of the river."',
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page; Page#Name writes one section or one secret"),
        type: z.enum(pageTypeNames).optional().describe(`type of a new page: ${pageTypeNames.join(", ")}`),
        set: fieldValues.optional().describe('fields to set: field=value, repeatable, or an object such as {"role": "npc"}. A link is [[Page]], links are [[A]], [[B]], a list is [a, b]'),
        unset: z.array(z.string()).optional().describe("fields to remove, repeatable"),
        add: fieldValues.optional().describe("items to add to list fields: field=value, repeatable, such as knows=[[Bruna]], or an object"),
        remove: fieldValues.optional().describe("items to remove from list fields: field=value, repeatable, or an object"),
        text: z.string().optional().describe("text of the introduction, the part before the first heading; or of the section or secret given"),
        section: z.string().optional().describe("section or secret to write; a missing one is added at the end of the page, as a secret if secret is given; empty text removes it"),
        append: z.boolean().optional().describe("add the text at the end instead of replacing"),
        secret: z.boolean().optional().describe("with a section: create it, if missing, as a secret block > [!secret] Name"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const reference = parsePageReference(input.page);

        if (input.section !== undefined && reference.section !== undefined) {
            throw new Error("Give the section either in the page name (Page#Section) or as section, not both.");
        }

        const section = input.section ?? reference.section;

        if ((section !== undefined || input.append) && input.text === undefined) {
            throw new Error("Give the text to write.");
        }

        const set = input.set === undefined ? undefined : readFields(input.set);
        const add = input.add === undefined ? undefined : readListItems(input.add);
        const remove = input.remove === undefined ? undefined : readListItems(input.remove);
        const world = loadWorld(root);
        const existing = findPage(world, reference.name);
        checkFieldNames(existing?.type ?? input.type, [set, add, remove]);
        checkCounters(existing, set);
        checkPlannedEventDate(existing, input.type, set, input.unset);
        const { page, created, changed, mode } = writePage(world, reference.name, input.type, { set, unset: input.unset, add, remove, text: input.text, section, append: input.append, secret: input.secret });

        if (changed) {
            const data = { page: page.name, type: page.type, set, unset: input.unset, add, remove, section, secret: input.secret, text: input.text, mode };
            appendLogEntry(root, newDatedLogEntry(root, context, created ? "page-created" : "page-updated", "hidden", data));
        }

        const fieldChanges = { set: Object.keys(set ?? {}), unset: input.unset ?? [], add: Object.keys(add ?? {}), remove: Object.keys(remove ?? {}) };
        return { page: page.name, type: page.type, path: page.path, created, changed, ...fieldChanges, section, mode, problems: world.problems };
    },

    format(result)
    {
        const where = result.section === undefined ? "the introduction" : `"${result.section}"`;
        const changes = [
            result.set.length > 0 ? `set ${result.set.join(", ")}` : "",
            result.unset.length > 0 ? `removed ${result.unset.join(", ")}` : "",
            result.add.length > 0 ? `added to ${result.add.join(", ")}` : "",
            result.remove.length > 0 ? `removed from ${result.remove.join(", ")}` : "",
            result.mode === undefined ? "" : `${textChanges[result.mode]} ${where}`,
        ].filter((change) => change !== "");
        const summary = result.changed ? changeSummary(result, changes) : `Nothing changed on ${result.page}: it already reads like that.`;
        return [summary, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** A standard field written in another case, such as Status, would be a field the engine does not read: refused before any other check. */
function checkFieldNames(type: PageType | undefined, changes: (Record<string, unknown> | undefined)[]): void
{
    const problem = changes.flatMap((change) => Object.keys(change ?? {})).map((name) => misspelledFieldProblem(type, name)).find((found) => found !== undefined);

    if (problem !== undefined) {
        throw new Error(problem);
    }
}

/** A counter written as current/max changes only with change, which keeps its limits and logs why (D-92). */
function checkCounters(page: Page | undefined, set: Record<string, unknown> | undefined): void
{
    if (page === undefined || set === undefined) {
        return;
    }

    for (const [field, value] of Object.entries(set)) {
        const existing = Object.keys(page.fields).find((key) => comparableText(key) === comparableText(field));
        const counter = existing === undefined || isStandardField(page.type, existing) ? undefined : readCounter(page.fields[existing]);
        const newCounter = readCounter(value);

        if (counter?.max === undefined || (existing === field && newCounter !== undefined && formatCounter(newCounter) === formatCounter(counter))) {
            continue;
        }

        const target = newCounter === undefined ? "a value" : formatCounter(newCounter);
        throw new Error(`${existing} is a counter: use change, page "${page.name}", field ${existing}, to ${target} (or by an amount). To make it something else, unset it, then set it.`);
    }
}

/** A planned event comes due at its date, so a write that sets its date or status cannot leave a date the engine does not read (D-100). */
function checkPlannedEventDate(page: Page | undefined, type: PageType | undefined, set: Record<string, unknown> | undefined, unset: string[] | undefined): void
{
    const changed = [...Object.keys(set ?? {}), ...(unset ?? [])];

    if (!changed.includes("date") && !changed.includes("status")) {
        return;
    }

    const before = page?.fields ?? (type === undefined ? {} : newPageFields(type));
    const fields = Object.fromEntries(Object.entries({ ...before, ...set }).filter(([name]) => !unset?.includes(name)));
    const problem = plannedEventDateProblem(page?.type ?? type, fields);

    if (problem !== undefined) {
        throw new Error(problem);
    }
}

function changeSummary(result: { page: string; type?: string; path: string; created: boolean; }, changes: string[]): string
{
    const what = `${result.created ? "Created" : "Updated"} ${result.page} (${result.type ?? "free page"}, ${result.path})`;
    return changes.length > 0 ? `${what}: ${changes.join("; ")}.` : `${what}.`;
}

/** Fields from field=value pairs, each value read as a link, links, a number, true or false, a list or text; or from an object, as they are. */
function readFields(fields: string[] | Record<string, unknown>): Record<string, unknown>
{
    return Array.isArray(fields) ? Object.fromEntries(fields.map(readAssignment)) : fields;
}

/** Items for list fields: each value gives one item, or several when it is a list; the same field may come more than once. */
function readListItems(fields: string[] | Record<string, unknown>): Record<string, unknown[]>
{
    const items: Record<string, unknown[]> = {};

    for (const [name, value] of Array.isArray(fields) ? fields.map(readAssignment) : Object.entries(fields)) {
        items[name] = [...(items[name] ?? []), ...(Array.isArray(value) ? value : [value])];
    }

    return items;
}

function readAssignment(assignment: string): [string, unknown]
{
    const separator = assignment.indexOf("=");
    const value = assignment.slice(separator + 1).trim();

    if (separator <= 0 || value === "") {
        throw new Error(`Write a field as field=value, not "${assignment}". To remove a field, use unset.`);
    }

    return [assignment.slice(0, separator).trim(), readFieldValue(value)];
}
