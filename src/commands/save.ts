import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import type { Save } from "../saves/index.ts";
import { campaignSaves, interruptedLoad, isPlayerDead, loadSave, makeSave, type SaveMode, saveMode, saveText } from "./game-saves.ts";
import { campaignWorld } from "./game-world.ts";

const actions = ["list", "make", "load"] as const;

type SaveResult =
    | { action: "list"; mode: SaveMode; saves: Save[]; }
    | { action: "make"; save: Save; }
    | { action: "load"; save: Save; removed: Save[]; finished: boolean; };

export const save = defineCommand({
    name: "save",
    description: "The saves of the campaign: a zip of its files in .saves, made by itself at the end of each scene. "
        + "list gives them, with what loading may do under the campaign's saves setting; make saves when the player asks, only with saves free; "
        + "load goes back to a save, by its number or last: with free to any, with checkpoint only to the last and only once the player character is dead, with permadeath never. "
        + "Going back removes what happened since, the later saves too: load only when the player has said so. A load that stopped halfway is finished by save load. "
        + "Example: action load, save last.",
    group: "game",
    positionals: ["action", "save"],
    input: z.object({
        action: z.enum(actions).default("list").describe("list, make or load"),
        label: z.string().optional().describe("make: a few words that name the save, such as before the duel"),
        save: z.string().optional().describe("load: the number of a save, or last"),
    }),

    run(input, context): SaveResult
    {
        const root = requireCampaign(context.folder);
        const mode = saveMode(root);
        const saves = campaignSaves(root);
        checkParameters(input);

        if (input.action === "list") {
            return { action: "list", mode, saves };
        }

        if (input.action === "make") {
            if (mode !== "free") {
                throw new Error(`With saves ${mode}, a save is made by itself at the end of each scene; on request only with saves free, which the player may choose with config. Nothing changed.`);
            }

            return { action: "make", save: makeSave(root, context, input.label?.trim() === "" ? undefined : input.label?.trim(), "asked") };
        }

        // A load that stopped halfway is finished first, whatever the mode: it was allowed when it began (SAV-5).
        const interrupted = interruptedLoad(root);

        if (interrupted !== undefined) {
            return { action: "load", save: interrupted, removed: loadSave(root, context, interrupted), finished: true };
        }

        const chosen = chosenSave(saves, input.save);
        checkLoad(mode, saves, chosen, isPlayerDead(campaignWorld(root, context)));
        return { action: "load", save: chosen, removed: loadSave(root, context, chosen), finished: false };
    },

    format(result)
    {
        if (result.action === "make") {
            return `Saved: ${saveText(result.save)}.`;
        }

        if (result.action === "load") {
            const removed = result.removed.length === 0 ? "" : ` The later saves are gone: ${result.removed.map((removed) => removed.number).join(", ")}.`;
            const finished = result.finished ? "The load that had stopped halfway is finished. " : "";
            return `${finished}Back to ${saveText(result.save)}: the campaign's files are as they were then, and what happened since is gone from the game.${removed} Call status, and go on from there.`;
        }

        const listed = result.saves.length === 0 ? "No saves yet: one is made at the end of each scene." : `Saves: ${result.saves.map(saveText).join(" · ")}.`;
        return `${listed}\n${loadRule(result.mode)}`;
    },
});

/** What loading may do under each mode of saves (D-55). */
function loadRule(mode: SaveMode): string
{
    switch (mode) {
        case "free":
            return "With saves free, load goes back to any of them when the player asks, and make saves when they ask.";
        case "checkpoint":
            return "With saves checkpoint, load goes back to the last one, and only once the player character is dead, if the player wants.";
        default:
            return "With saves permadeath, the game never goes back. If something broke outside the story, the player may unzip a save from .saves by hand.";
    }
}

/** The save asked for, by its number or last. */
function chosenSave(saves: Save[], asked: string | undefined): Save
{
    if (saves.length === 0) {
        throw new Error("There are no saves yet: one is made at the end of each scene. Nothing changed.");
    }

    const wanted = asked === undefined || asked.trim().toLowerCase() === "last" ? saves.at(-1) : saves.find((candidate) => candidate.number === Number(asked.trim()));
    const twins = wanted === undefined ? [] : saves.filter((candidate) => candidate.number === wanted.number);

    if (twins.length > 1) {
        throw new Error(`Two saves have the number ${wanted?.number}: ${twins.map((twin) => twin.file).join(" and ")}. Rename or remove the one that is a copy, in .saves. Nothing changed.`);
    }

    if (wanted === undefined) {
        throw new Error(`There is no save "${asked}": give its number or last. Saves: ${saves.map(saveText).join(" · ")}.`);
    }

    return wanted;
}

/** Refuses what the mode of saves does not allow (D-55): permadeath never goes back, checkpoint only to the last and only once the player character is dead. */
function checkLoad(mode: SaveMode, saves: Save[], chosen: Save, dead: boolean): void
{
    if (mode === "permadeath") {
        throw new Error(`${loadRule(mode)} Nothing changed.`);
    }

    if (mode === "checkpoint" && !dead) {
        throw new Error(`With saves checkpoint, the game goes back only once the player character is dead, and they are alive: go on with the story. Nothing changed.`);
    }

    if (mode === "checkpoint" && chosen !== saves.at(-1)) {
        throw new Error(`With saves checkpoint, the game goes back only to the last save, ${saveText(saves.at(-1) as Save)}. Nothing changed.`);
    }
}

function checkParameters(input: { action: (typeof actions)[number]; label?: string; save?: string; }): void
{
    if (input.label !== undefined && input.action !== "make") {
        throw new Error(`save ${input.action} does not take label: only make does.`);
    }

    if (input.save !== undefined && input.action !== "load") {
        throw new Error(`save ${input.action} does not take save: only load does.`);
    }
}
