import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { loadWorld, pageTypeNames, searchPages } from "../pages/index.ts";
import { skippedPagesNote } from "./notes.ts";

export const find = defineCommand({
    name: "find",
    description: "Find pages of the world. "
        + "It looks for a text in their names, fields and text, ignoring case, or lists the pages of a type. "
        + "Use it when you do not know a page's exact name, and before creating a page, to check that it does not exist under another name. "
        + 'Example: text "lanterna"; or type place.',
    group: "game",
    readOnly: true,
    positionals: ["text"],
    input: z.object({
        text: z.string().optional().describe("text to look for, ignoring case; every page if left out"),
        type: z.enum(pageTypeNames).optional().describe(`only pages of this type: ${pageTypeNames.join(", ")}`),
    }),

    run(input, context)
    {
        const world = loadWorld(requireCampaign(context.folder));
        const matches = searchPages(world, input).map(({ page, excerpt }) => ({ page: page.name, type: page.type, path: page.path, excerpt }));
        return { matches, problems: world.problems };
    },

    format(result)
    {
        const lines = result.matches.map((match) => `${match.page} (${match.type ?? "free page"})${match.excerpt === undefined ? "" : `: ${match.excerpt}`}`);
        return [lines.length > 0 ? lines.join("\n") : "No page matches.", skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});
