import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import type { Save } from "../saves/index.ts";
import {
    campaignSaves,
    interruptedLoad,
    isPlayerDead,
    loadRefusal,
    loadRule,
    loadSave,
    makeSave,
    newChatBegun,
    newChatText,
    type ResetPoint,
    resetPoints,
    resetSave,
    type SaveMode,
    saveMode,
    savesWhy,
    saveText,
    wentBackTo,
} from "./game-saves.ts";
import { campaignWorld } from "./game-world.ts";

const actions = ["list", "make", "load", "reset", "new chat"] as const;

/** What save did: the list, a save made, or the game gone back to a save or to its start. */
export type SaveResult =
    | { action: "list"; mode: SaveMode; saves: Save[]; }
    | { action: "make"; save: Save; }
    | { action: "load"; save: Save; removed: Save[]; copy?: string; finished: boolean; }
    | { action: "reset"; to: ResetPoint; save: Save; removed: Save[]; copy?: string; finished: boolean; }
    | { action: "new chat"; save: string; };

export const save = defineCommand({
    name: "save",
    description: "The saves of the campaign, made by themselves at the end of each scene. "
        + "list gives them, with what loading may do under the campaign's saves setting; make saves when the player asks, only with saves free; "
        + "load goes back to a save: with free to any, with checkpoint only to the last and only once the player character is dead, with permadeath never. "
        + "reset starts the campaign over, in every mode, permadeath too. Going back removes what happened since, the later saves too: load or reset only when the player has said so. "
        + "A load that stopped halfway is finished by save load. "
        + "After going back the game goes on only in a new chat: new chat, once the player confirms this chat began after it, never in one that went on before. "
        + "Example: action load, save last.",
    group: "game",
    positionals: ["action", "save"],
    input: z.object({
        action: z.enum(actions).default("list").describe("list, make, load, reset or new chat"),
        label: z.string().optional().describe("make: a few words that name the save, such as before the duel"),
        save: z.string().optional().describe("load: the number of a save, or last"),
        to: z.enum(resetPoints).optional().describe("reset: start, the start of play with the same character (if left out), or session zero, to make the character again"),
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

        // The player confirms the chat began after going back: the game goes on in it (D-362).
        if (input.action === "new chat") {
            const back = wentBackTo(root);

            if (back === undefined) {
                throw new Error("The game did not go back since the last chat began: there is nothing to confirm. Go on with the story.");
            }

            newChatBegun(root);
            return { action: "new chat", save: back };
        }

        if (input.action === "make") {
            if (mode !== "free") {
                throw new Error(`With saves ${mode}, a save is made by itself at the end of each scene; on request only with saves free, which the player may choose with config. Nothing changed.`);
            }

            return { action: "make", save: makeSave(root, context, input.label?.trim() === "" ? undefined : input.label?.trim(), "asked") };
        }

        // A load that stopped halfway is finished first, whatever the mode: it was allowed when it began (SAV-5); never in the place of a reset.
        const interrupted = interruptedLoad(root);

        if (interrupted !== undefined && input.action === "reset") {
            throw new Error(`A load to ${saveText(interrupted)} stopped halfway: save load finishes it first, then reset. Nothing changed.`);
        }

        if (interrupted !== undefined) {
            return { action: "load", save: interrupted, ...loadSave(root, context, interrupted), finished: true };
        }

        // The campaign starting over, from the start of play or from before session zero (SAV-5, D-359, D-361).
        if (input.action === "reset") {
            const to = input.to ?? "start";
            const start = resetSave(saves, savesWhy(root), to);

            if (start === undefined) {
                throw new Error(
                    to === "start"
                        ? "There are no saves yet: the start is saved when the campaign enters play, and the end of each scene makes one. Nothing changed."
                        : "There is no save before session zero: this campaign was first saved after it. Start over with reset, to start. Nothing changed.",
                );
            }

            return { action: "reset", to, save: start, ...loadSave(root, context, start), finished: false };
        }

        const chosen = chosenSave(saves, input.save);
        const refusal = loadRefusal(mode, saves, chosen, isPlayerDead(campaignWorld(root, context)));

        if (refusal !== undefined) {
            throw new Error(`${refusal} Nothing changed.`);
        }

        return { action: "load", save: chosen, ...loadSave(root, context, chosen), finished: false };
    },

    format(result)
    {
        if (result.action === "new chat") {
            return `The game goes on in this chat, from save ${result.save}, as status gives it: tell nothing of what came after.`;
        }

        if (result.action === "make") {
            return `Saved: ${saveText(result.save)}.`;
        }

        if (result.action === "reset") {
            const copy = result.copy === undefined ? "" : ` What the reset replaced is in .saves/${result.copy}, to undo it by hand.`;
            return `${resetText(result.to, result.save)}, what happened since gone from the game, every later save too.${copy} ${newChatText}`;
        }

        if (result.action === "load") {
            const removed = result.removed.length === 0 ? "" : ` The later saves are gone: ${result.removed.map((removed) => removed.number).join(", ")}.`;
            const finished = result.finished ? "The load that had stopped halfway is finished. " : "";
            const copy = result.copy === undefined ? "" : ` What the load replaced is in .saves/${result.copy}, to undo it by hand.`;
            return `${finished}Back to ${saveText(result.save)}: the campaign's files are as they were then, and what happened since is gone from the game.${removed}${copy} ${newChatText}`;
        }

        const listed = result.saves.length === 0 ? "No saves yet: one is made at the end of each scene." : `Saves: ${result.saves.map(saveText).join(" · ")}.`;
        return `${listed}\n${loadRule(result.mode)}`;
    },
});

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

function checkParameters(input: { action: (typeof actions)[number]; label?: string; save?: string; to?: ResetPoint; }): void
{
    if (input.label !== undefined && input.action !== "make") {
        throw new Error(`save ${input.action} does not take label: only make does.`);
    }

    if (input.save !== undefined && input.action !== "load") {
        throw new Error(`save ${input.action} does not take save: only load does.`);
    }

    if (input.to !== undefined && input.action !== "reset") {
        throw new Error(`save ${input.action} does not take to: only reset does.`);
    }
}

/** What the master hears of what the player did with the saves on the dashboard, at the head of their next call (D-359). */
export function playerSaveNews(result: SaveResult): string
{
    switch (result.action) {
        case "make":
            return `The player saved on the dashboard: ${saveText(result.save)}.`;
        case "load":
            return `The player went back on the dashboard to save ${saveText(result.save)}: the campaign's files are as they were then, and what happened since is gone from the game, `
                + `the later saves too. ${newChatText}`;
        case "reset":
            return `The player started the campaign over on the dashboard. ${resetText(result.to, result.save)}, what happened since gone from the game, every later save too. ${newChatText}`;
        case "new chat":
            return `The player opened a new chat after going back to save ${result.save}, and confirmed it on the dashboard: the game goes on in it, from that save.`;
        default:
            return "";
    }
}

/** "Back to the start, 1 - start: the campaign starts over from there with the same character": where a reset went. */
function resetText(to: ResetPoint, save: Save): string
{
    return to === "start"
        ? `Back to the start, ${saveText(save)}: the campaign starts over from there with the same character`
        : `Back to before session zero, ${saveText(save)}: the campaign starts over, the player character to make again in session zero`;
}
