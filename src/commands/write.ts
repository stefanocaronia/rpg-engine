import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry, newLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { loadWorld, pageTypeNames, parsePageReference, readFieldValue, writePage } from "../pages/index.ts";
import { skippedPagesNote } from "./notes.ts";

export const write = defineCommand({
    name: "write",
    description: "Create or change a page of the world: its fields and its text. The world's pages are written only with this command.",
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page; Page#Name writes one section or one secret"),
        type: z.enum(pageTypeNames).optional().describe(`type of a new page: ${pageTypeNames.join(", ")}`),
        set: z.array(z.string()).optional().describe("field=value to set, repeatable: a link is [[Page]], links are [[A]], [[B]], a list is [a, b]"),
        unset: z.array(z.string()).optional().describe("field to remove, repeatable"),
        add: z.array(z.string()).optional().describe("field=value to add to a list, repeatable, such as knows=[[Varro]]"),
        remove: z.array(z.string()).optional().describe("field=value to remove from a list, repeatable"),
        text: z.string().optional().describe("text of the introduction, the part before the first heading; or of the section or secret given"),
        section: z.string().optional().describe("section or secret to write; a missing section is added at the end"),
        append: z.boolean().optional().describe("add the text at the end instead of replacing"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const reference = parsePageReference(input.page);

        if (input.section !== undefined && reference.section !== undefined) {
            throw new Error("Give the section either in the page name (Page#Section) or with --section, not both.");
        }

        const section = input.section ?? reference.section;

        if ((section !== undefined || input.append) && input.text === undefined) {
            throw new Error("Give the text to write with --text.");
        }

        const set = input.set === undefined ? undefined : readAssignments(input.set);
        const add = input.add === undefined ? undefined : readListAssignments(input.add);
        const remove = input.remove === undefined ? undefined : readListAssignments(input.remove);
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

/** Reads field=value pairs; the value is read as a link, links, a number, true or false, a list, or text. */
function readAssignments(assignments: string[]): Record<string, unknown>
{
    const fields: Record<string, unknown> = {};

    for (const assignment of assignments) {
        const separator = assignment.indexOf("=");
        const value = assignment.slice(separator + 1).trim();

        if (separator <= 0 || value === "") {
            throw new Error(`Write a field as field=value, not "${assignment}". To remove a field, use --unset.`);
        }

        fields[assignment.slice(0, separator).trim()] = readFieldValue(value);
    }

    return fields;
}

/** Reads field=value pairs for lists: each value gives one item, or several when it is a list of links or a list. */
function readListAssignments(assignments: string[]): Record<string, unknown[]>
{
    const lists: Record<string, unknown[]> = {};

    for (const [name, value] of Object.entries(readAssignments(assignments))) {
        lists[name] = Array.isArray(value) ? value : [value];
    }

    return lists;
}
