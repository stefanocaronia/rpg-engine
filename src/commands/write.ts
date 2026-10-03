import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry, newLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { loadWorld, pageTypeNames, parsePageReference, readFieldValue, writePage } from "../pages/index.ts";
import { skippedPagesNote } from "./notes.ts";

// Fields arrive as field=value strings from a command line, or as an object through MCP.
const fieldValues = z.union([z.array(z.string()), z.record(z.string(), z.unknown())]);

export const write = defineCommand({
    name: "write",
    description: "Create or change a page of the world. "
        + "The world's pages are written only with this command: use it as soon as something becomes true in the story, such as a new character, place or item, a change, something a character learns. "
        + "Without a section it writes the introduction, the text before the first heading; with Page#Name it writes one section, or one secret written > [!secret] Name. "
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
        section: z.string().optional().describe("section or secret to write; a missing section is added at the end"),
        append: z.boolean().optional().describe("add the text at the end instead of replacing"),
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
        const mode = input.text === undefined ? undefined : input.append ? "append" : "replace";
        const world = loadWorld(root);
        const { page, created, changed } = writePage(world, reference.name, input.type, { set, unset: input.unset, add, remove, text: input.text, section, append: input.append });

        if (changed) {
            const data = { page: page.name, type: page.type, set, unset: input.unset, add, remove, section, text: input.text, mode };
            appendLogEntry(root, newLogEntry(context, created ? "page-created" : "page-updated", "hidden", data));
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
            result.mode === "replace" ? `wrote ${where}` : result.mode === "append" ? `added to ${where}` : "",
        ].filter((change) => change !== "");
        const summary = !result.changed
            ? `Nothing changed on ${result.page}: it already reads like that.`
            : `${result.created ? "Created" : "Updated"} ${result.page} (${result.type ?? "free page"}, ${result.path})${changes.length > 0 ? `: ${changes.join("; ")}` : ""}.`;
        return [summary, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

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
