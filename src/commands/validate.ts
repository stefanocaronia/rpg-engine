import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { loadWorld } from "../pages/index.ts";
import { campaignProblems } from "./problems.ts";

export const validate = defineCommand({
    name: "validate",
    description: "Check the whole campaign and say how to fix each problem. "
        + "It looks for files that cannot be read, standard fields, links to pages, sections or secrets that do not exist, things in two places, repeated names, the settings and the log. "
        + "Use it when status reports problems, or after pages were changed by hand. Read-only, no parameters.",
    group: "game",
    readOnly: true,
    input: z.object({}),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        return { problems: campaignProblems(root, loadWorld(root)) };
    },

    format(result)
    {
        if (result.problems.length === 0) {
            return "No problems.";
        }

        const lines = result.problems.map((problem) => `- ${problem.path === undefined ? "" : `${problem.path}: `}${problem.message}${problem.fix === undefined ? "" : ` Fix: ${problem.fix}.`}`);
        return `${result.problems.length} ${result.problems.length === 1 ? "problem" : "problems"}:\n${lines.join("\n")}`;
    },
});
