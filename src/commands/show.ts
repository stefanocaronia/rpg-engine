import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { backlinks, findPage, formatFields, loadWorld, parsePageReference, readSection, sectionTitles } from "../pages/index.ts";
import { skippedPagesNote } from "./notes.ts";

export const show = defineCommand({
    name: "show",
    description: "Show a page of the world, or one of its sections, and the pages that link to it.",
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page; Page#Section shows one section"),
    }),

    run(input, context)
    {
        const world = loadWorld(requireCampaign(context.folder));
        const reference = parsePageReference(input.page);

        if (reference.section === "") {
            throw new Error("Give the title of the section after #, or leave out the # to see the whole page.");
        }

        const page = findPage(world, reference.name);

        if (page === undefined) {
            throw new Error(`There is no page named ${reference.name}. Look for it with: rpg find <text>`);
        }

        const text = reference.section === undefined ? page.body : readSection(page.body, reference.section);

        if (text === undefined) {
            const titles = sectionTitles(page.body);
            throw new Error(`${page.name} has no section "${reference.section}". ${titles.length > 0 ? `Its sections are: ${titles.join(", ")}.` : "It has no sections."}`);
        }

        return {
            page: page.name,
            type: page.type,
            path: page.path,
            section: reference.section,
            fields: reference.section === undefined ? page.fields : undefined,
            text,
            linkedFrom: backlinks(world, page).map((link) => ({ page: link.page.name, places: link.places })),
            problems: world.problems,
        };
    },

    format(result)
    {
        const title = `${result.page}${result.section === undefined ? "" : `#${result.section}`} (${result.type ?? "free page"}) · ${result.path}`;
        const fields = result.fields !== undefined && Object.keys(result.fields).length > 0 ? `---\n${formatFields(result.fields)}\n---` : "";
        const links = result.linkedFrom.length > 0 ? `Linked from:\n${result.linkedFrom.map((link) => `- ${link.page}: ${link.places.join(", ")}`).join("\n")}` : "";
        return [title, fields, result.text, links, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});
