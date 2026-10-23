import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { isInParty, type Page, pageNamed, type World } from "../pages/index.ts";
import { thoughtsLength, thoughtsType } from "./game-thoughts.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

interface ThoughtsResult
{
    who: string;
    date?: string;
    text: string;
}

export const thoughts = defineCommand({
    name: "thoughts",
    description: "Write a few lines in a companion's diary, when an output says it is due or after a moment that changed them, in their voice: "
        + "how they took what happened, whom they trust or fear now, what they mean to do; never what happened, which the log keeps, and nothing they hide from the others. "
        + "From their agent, its Writes line as it is. The player reads it on the dashboard, and view as gives them their last lines back. "
        + 'Example: Mira "I no longer trust Corrado, since he lied to Agata. I will watch him."',
    group: "game",
    positionals: ["page", "text"],
    input: z.object({
        page: z.string().describe("the companion's page"),
        text: z.string().describe(`their lines, at most ${thoughtsLength} characters`),
    }),

    run(input, context): ThoughtsResult
    {
        const root = requireCampaign(context.folder);
        const page = companionPage(campaignWorld(root, context), input.page.trim());
        const text = input.text.trim().replace(/\s*\n\s*/g, " ").normalize("NFC");
        // Characters as a reader counts them: an emoji is one.
        const length = [...text].length;

        if (text === "") {
            throw new Error(`Give the lines ${page.name} writes. Nothing written.`);
        }

        if (length > thoughtsLength) {
            throw new Error(`These lines are ${length} characters, the diary takes ${thoughtsLength}: keep how ${page.name} feels and what they mean to do, leave out what happened. Nothing written.`);
        }

        const entry = newDatedLogEntry(root, context, thoughtsType, "public", { page: page.name, text });
        appendLogEntry(root, entry);
        return { who: page.name, ...(entry.date === undefined ? {} : { date: entry.date }), text };
    },

    format(result)
    {
        return `${result.who}'s diary${result.date === undefined ? "" : `, ${result.date}`}: ${result.text}`;
    },
});

/** The companion whose diary it is (DIA-1); stops the command for any other page. */
function companionPage(world: World, name: string): Page
{
    const page = pageNamed(world, name);

    if (page === undefined) {
        throw new Error(`There is no page ${name}: give a companion's name, or look for it with find. Nothing written.`);
    }

    if (page.type !== "character" || page.fields.role !== "companion" || page.system !== undefined) {
        throw new Error(`${page.name} is not a companion of the party: only companions keep a diary. Nothing written.`);
    }

    if (!isInParty(page)) {
        throw new Error(`${page.name} is dead: the dead keep no diary. Nothing written.`);
    }

    return page;
}
