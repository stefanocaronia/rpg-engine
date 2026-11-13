import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { isPlayerCharacter, type Page, pageNamed, type World } from "../pages/index.ts";
import { campaignWorld } from "./shared/campaign/world.ts";
import { thoughtsLength, thoughtsType } from "./shared/characters/thoughts.ts";
import { newDatedLogEntry } from "./shared/time/time.ts";

interface ThoughtsResult
{
    who: string;
    date?: string;
    text: string;
    hidden: boolean;
}

export const thoughts = defineCommand({
    name: "thoughts",
    description: "Write a few lines in a character's diary, in their voice: a companion's when an output says it is due, or any character's of the campaign after a moment that changed them. "
        + "How they took what happened, whom they trust or fear now, what they mean to do; never what happened, which the log keeps. "
        + "A companion's the player reads on the dashboard: nothing they hide from the others. Another's only you read: what they hide too, never a secret or a plan their page already holds. "
        + "A plan the story must keep goes on their page, as a secret: the diary gives back only its last lines. "
        + "From their agent, its Writes line as it is. view as gives them their last lines back, and show gives them to you. "
        + 'Example: Mira "I no longer trust Corrado, since he lied to Agata. I will watch him."',
    group: "game",
    positionals: ["page", "text"],
    input: z.object({
        page: z.string().describe("the character's page: a companion, or another character of the campaign, never the player's"),
        text: z.string().describe(`their lines, at most ${thoughtsLength} characters`),
    }),

    run(input, context): ThoughtsResult
    {
        const root = requireCampaign(context.folder);
        const page = diaryPage(campaignWorld(root, context), input.page.trim());
        const text = input.text.trim().replace(/\s*\n\s*/g, " ").normalize("NFC");
        // Characters as a reader counts them: an emoji is one.
        const length = [...text].length;

        if (text === "") {
            throw new Error(`Give the lines ${page.name} writes. Nothing written.`);
        }

        if (length > thoughtsLength) {
            throw new Error(`These lines are ${length} characters, the diary takes ${thoughtsLength}: keep how ${page.name} feels and what they mean to do, leave out what happened. Nothing written.`);
        }

        // A companion's diary the player reads; another character's only the master (DIA-1, DIA-4).
        const hidden = page.fields.role !== "companion";
        const entry = newDatedLogEntry(root, context, thoughtsType, hidden ? "hidden" : "public", { page: page.name, text });
        appendLogEntry(root, entry);
        return { who: page.name, ...(entry.date === undefined ? {} : { date: entry.date }), text, hidden };
    },

    format(result)
    {
        const when = [result.date ?? "", result.hidden ? "hidden from the player" : ""].filter((part) => part !== "").join(", ");
        return `${result.who}'s diary${when === "" ? "" : `, ${when}`}: ${result.text}`;
    },
});

/** The character whose diary it is (DIA-1): a living character of the campaign, not the player's; stops the command for any other page. */
function diaryPage(world: World, name: string): Page
{
    const page = pageNamed(world, name);

    if (page === undefined) {
        throw new Error(`There is no page ${name}: give a character's name, or look for it with find. Nothing written.`);
    }

    if (page.type !== "character" || page.system !== undefined) {
        throw new Error(`${page.name} is not a character of the campaign: only they keep a diary. Nothing written.`);
    }

    if (isPlayerCharacter(page)) {
        throw new Error(`${page.name} is the player's character: their thoughts are the player's to tell. Nothing written.`);
    }

    if (page.fields.status === "dead") {
        throw new Error(`${page.name} is dead: the dead keep no diary. Nothing written.`);
    }

    return page;
}
