import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { loadWorld, pageTypeNames, searchPages } from "../pages/index.ts";

export const find = defineCommand({
    name: "find",
    description: "Find pages of the world by a text in their name, fields or text, or by type.",
    positionals: ["text"],
    input: z.object({
        text: z.string().optional().describe("text to look for, ignoring case; every page if left out"),
        type: z.enum(pageTypeNames).optional().describe(`only pages of this type: ${pageTypeNames.join(", ")}`),
    }),

    run(input, context)
    {
        const world = loadWorld(requireCampaign(context.folder));
        const matches = searchPages(world, input).map(({ page, excerpt }) => ({ page: page.name, type: page.type, path: page.path, excerpt }));
        return { matches };
    },

    format(result)
    {
        if (result.matches.length === 0) {
            return "No page matches.";
        }

        return result.matches.map((match) => `${match.page} (${match.type ?? "free page"})${match.excerpt === undefined ? "" : `: ${match.excerpt}`}`).join("\n");
    },
});
