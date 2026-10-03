import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { backlinks, findPage, formatFields, loadWorld, locate, parsePageReference, readSection, secretNames, sectionTitles } from "../pages/index.ts";
import { skippedPagesNote } from "./notes.ts";

export const show = defineCommand({
    name: "show",
    description: "Show a page of the world, or one of its sections or secrets. "
        + "It also says where the thing is and which pages link to it. "
        + "Use it before describing anything that already exists, so that what you say matches what is written. "
        + 'Example: page "Old lighthouse"; or page "Old lighthouse#Cellar" for one section.',
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("name of the page; Page#Name shows one section or one secret"),
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
            throw new Error(`There is no page named ${reference.name}. Look for it with the find command.`);
        }

        const text = reference.section === undefined ? page.body : readSection(page.body, reference.section);

        if (text === undefined) {
            throw new Error(`${page.name} has no section or secret "${reference.section}". ${partsOf(page.body)}`);
        }

        const { chain, alsoIn } = locate(world, page);
        return {
            page: page.name,
            type: page.type,
            path: page.path,
            section: reference.section,
            isIn: chain.map((holder) => holder.name),
            alsoIn: alsoIn.map((holder) => holder.name),
            fields: reference.section === undefined ? page.fields : undefined,
            text,
            linkedFrom: backlinks(world, page).map((link) => ({ page: link.page.name, places: link.places })),
            problems: world.problems,
        };
    },

    format(result)
    {
        const header = [
            `${result.page}${result.section === undefined ? "" : `#${result.section}`} (${result.type ?? "free page"}) · ${result.path}`,
            result.isIn.length > 0 ? `Is in: ${result.isIn.join(" › ")}` : "",
            result.alsoIn.length > 0 ? `Also listed in: ${result.alsoIn.join(", ")}. A thing can be in one place only: remove it from all but one.` : "",
        ].filter((line) => line !== "").join("\n");
        const fields = result.fields !== undefined && Object.keys(result.fields).length > 0 ? `---\n${formatFields(result.fields)}\n---` : "";
        const links = result.linkedFrom.length > 0 ? `Linked from:\n${result.linkedFrom.map((link) => `- ${link.page}: ${link.places.join(", ")}`).join("\n")}` : "";
        return [header, fields, result.text, links, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** Lists a page's sections and secrets, for an error message. */
function partsOf(text: string): string
{
    const sections = sectionTitles(text);
    const secrets = secretNames(text);

    if (sections.length === 0 && secrets.length === 0) {
        return "It has no sections or secrets.";
    }

    return [sections.length > 0 ? `Its sections are: ${sections.join(", ")}.` : "", secrets.length > 0 ? `Its secrets are: ${secrets.join(", ")}.` : ""].filter((part) => part !== "").join(" ");
}
