import { z } from "zod";
import { changeStateAt, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { type Mood, moods } from "../core/mood.ts";
import { defineCommand } from "../core/registry.ts";
import { isPartyMember, ownField, type Page, pageNamed, type World, writePage } from "../pages/index.ts";
import { masterMood, masterMoodKey, moodChanged, moodMoment, pageMood } from "./shared/moods.ts";
import { readOpenScene } from "./shared/scene.ts";
import { newDatedLogEntry } from "./shared/time.ts";
import { campaignWorld } from "./shared/world.ts";

// What a character's new mood asks of the master, by their role.
const moodAdvice = {
    pc: "the dashboard shows it on their sheet. It mirrors what the player writes and plays, never what you narrate or what a spell or condition does to them: "
        + "when the player says they feel otherwise, follow the player.",
    companion: "the dashboard shows it on their sheet. Let it colour how they speak and act.",
    npc: "only you know it. Show it in how they speak and act, and the player reads it from that; a check your game has for reading someone only when they hide it.",
};

interface MoodResult
{
    /** The master, or the character's page. */
    who: string;
    master: boolean;
    /** The character's role: the party's moods show on their sheets (D-419). */
    role?: "pc" | "companion" | "npc";
    mood: Mood;
    /** The mood before; for a moment, the one the master goes back to. */
    from: Mood;
    moment: boolean;
    changed: boolean;
}

export const mood = defineCommand({
    name: "mood",
    description: "Set a mood: yours as the master, which the dashboard's robot shows, or a character's when it changes for a while: the party's show on their sheets, "
        + "anyone else's only you see, in status. Set yours when the story's tone turns as the player lives it, and let your voice follow it. "
        + "moment: a reaction to what the player has just seen happen, what a roll decides or a bold choice, a few times a session; the dashboard already reacts to the dice's highs and lows. "
        + "Your face never shows what the player does not know yet: no grin before the trap is sprung. "
        + "Mirror the player character's mood from how the player plays them, never decide it for them. neutral takes a mood away. "
        + "Example: master worried; master surprised, moment; Lena afraid.",
    group: "game",
    positionals: ["who", "mood"],
    input: z.object({
        who: z.string().describe("master for yours, or a character's page: the player character, a companion, anyone"),
        mood: z.enum(moods).describe(`the mood: ${moods.join(", ")}`),
        moment: z.boolean().optional().describe("yours only: show it for a few seconds, then go back to your mood, which stays as it is"),
    }),

    run(input, context): MoodResult
    {
        const root = requireCampaign(context.folder);

        if (input.who.trim().toLowerCase() === "master") {
            return setMasterMood(root, context, input.mood, input.moment === true);
        }

        const world = campaignWorld(root, context);
        const page = characterPage(root, world, input.who.trim());

        if (input.moment === true) {
            throw new Error(`Only your mood has moments, as the master. Give ${page.name} a mood that stays, without moment, and set it again when it passes. Nothing changed.`);
        }

        const from = pageMood(page);
        const role = page.fields.role === "pc" || page.fields.role === "companion" ? page.fields.role : "npc";
        const result: MoodResult = { who: page.name, master: false, role, mood: input.mood, from, moment: false, changed: from !== input.mood };

        if (!result.changed) {
            return result;
        }

        const field = ownField(page, "mood");
        writePage(world, page.name, undefined, input.mood === "neutral" ? { unset: [field ?? "mood"] } : { set: { [field ?? "mood"]: input.mood } });
        // What someone outside the party feels is the master's alone (MOOD-5, MOOD-6).
        appendLogEntry(root, newDatedLogEntry(root, context, moodChanged, isPartyMember(page) ? "public" : "hidden", { who: page.name, mood: input.mood, from }));
        return result;
    },

    format(result)
    {
        if (result.master) {
            return masterText(result);
        }

        if (!result.changed) {
            return `${result.who}'s mood is already ${result.mood}: nothing changed.`;
        }

        if (result.mood === "neutral") {
            return `${result.who} has no mood any more.`;
        }

        return `${result.who}'s mood is now ${result.mood}: ${moodAdvice[result.role ?? "npc"]}`;
    },
});

/** Sets the master's mood, or shows one for a moment without changing it (MOOD-4); either way a public line of the log. */
function setMasterMood(root: string, context: Context, wanted: Mood, moment: boolean): MoodResult
{
    const from = masterMood(root);
    const result = { who: "master", master: true, mood: wanted, from, moment, changed: moment || from !== wanted };

    if (moment) {
        appendLogEntry(root, newDatedLogEntry(root, context, moodMoment, "public", { who: "master", mood: wanted, back: from }));
        return result;
    }

    if (result.changed) {
        changeStateAt(root, [[[masterMoodKey], wanted === "neutral" ? undefined : wanted]]);
        appendLogEntry(root, newDatedLogEntry(root, context, moodChanged, "public", { who: "master", mood: wanted, from }));
    }

    return result;
}

function masterText(result: MoodResult): string
{
    if (result.moment) {
        return `The robot on the dashboard shows ${result.mood} for a moment, then goes back to ${result.from}.`;
    }

    if (!result.changed) {
        return `Your mood is already ${result.mood}: nothing changed.`;
    }

    return result.mood === "neutral"
        ? "Your mood is neutral again: the robot on the dashboard shows a calm face."
        : `Your mood is now ${result.mood}: the robot on the dashboard shows it. Let your voice follow it, until the story's tone turns again.`;
}

/** The character a mood is for, of the campaign; anything else is refused with what to do instead (MOOD-2). */
function characterPage(root: string, world: World, name: string): Page
{
    const page = pageNamed(world, name);

    if (page === undefined) {
        const copy = Object.keys(readOpenScene(root).scene?.copies ?? {}).find((copyName) => copyName.toLowerCase() === name.toLowerCase());
        throw new Error(
            copy !== undefined
                ? `${copy} is a copy of a creature in the open scene: moods are for characters. Tell how it feels in the story. Nothing changed.`
                : `There is no page ${name}: write the character first, or look for its name with find. Nothing changed.`,
        );
    }

    if (page.type === "character" && page.system === undefined) {
        return page;
    }

    if (page.type === "creature") {
        throw new Error(
            `${page.name} is a creature, a kind of being: moods are for characters. Make one from it, such as with write "Name", type character, set creature=[[${page.name}]]; `
                + "then give that one its mood. Nothing changed.",
        );
    }

    if (page.type === "character") {
        throw new Error(`${page.name} is a character of the game system, read-only: give the mood to one of the campaign. Nothing changed.`);
    }

    throw new Error(`${page.name} is ${page.type === undefined ? "a free page" : `a ${page.type}`}, not a character: only you and the characters have moods. Nothing changed.`);
}
