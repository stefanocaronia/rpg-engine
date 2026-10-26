import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { stateCheckProblems } from "./game-checks.ts";
import { packageCodeProblems } from "./game-package-code.ts";
import { campaignWorld } from "./game-world.ts";
import { campaignProblems } from "./problems.ts";

export const validate = defineCommand({
    name: "validate",
    description: "Check the whole campaign and say how to fix each problem. "
        + "It checks unreadable files, standard fields, links to missing pages, sections or secrets, missing pictures, things in two places, repeated names, the settings and the log. "
        + "Use it when status reports problems, or after pages were changed by hand. Read-only, no parameters.",
    group: "game",
    readOnly: true,
    input: z.object({}),

    async run(input, context)
    {
        const root = requireCampaign(context.folder);
        // And what keeps an extension's code from being used, which only loading it tells (D-441).
        return { problems: [...campaignProblems(root, campaignWorld(root, context), context), ...await packageCodeProblems(root, context, []), ...stateCheckProblems(root, context)] };
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
