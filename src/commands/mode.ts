import { z } from "zod";
import { changeState, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { blockingMode, campaignMode, missingText, type Mode, modePart, modes } from "./game-mode.ts";
import { valueParts } from "./game-offers.ts";
import { campaignSaves, makeSave, type ResetPoint, savesWhy, saveText } from "./game-saves.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { voicesPart } from "./game-voices.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";

export const mode = defineCommand({
    name: "mode",
    description: "Move the campaign to another mode: setup (the settings, out of the game), session zero (the player character and the companions, made in play) or play. "
        + "It refuses while that mode's checklist is incomplete, saying what is missing; otherwise it gives the new mode's instructions. "
        + "Call it when status says nothing is missing and the player confirms; back to session zero to make a new player character. "
        + 'Example: to "session zero".',
    group: "game",
    positionals: ["to"],
    input: z.object({
        to: z.enum(modes).describe(`the mode to enter: ${modes.join(", ")}`),
    }),

    run(input, context): { to: Mode; changed: boolean; dateless: boolean; part: string; start?: StartSave; }
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const from = campaignMode(root, world);

        if (from === input.to) {
            return { to: input.to, changed: false, dateless: false, part: "" };
        }

        // Into the setup always; into session zero and play, even back from play, only with the checklists before them complete (MOD-2).
        const blocked = blockingMode(input.to, root, context, world);

        if (blocked !== undefined) {
            throw new Error(`The campaign cannot enter ${input.to} yet: ${missingText(blocked)}. Then call mode again. Nothing changed.`);
        }

        changeState(root, { mode: input.to });
        appendLogEntry(root, newDatedLogEntry(root, context, "mode-changed", "public", { from, to: input.to }));
        const start = startSave(root, context, input.to);
        return {
            to: input.to,
            changed: true,
            dateless: readPresent(root).date === undefined,
            // Play's part with Voices, as instructions gives it, for a campaign that reaches play in the chat that made it (playtest 01).
            part: [modePart(input.to, campaignSystem(root, context)) ?? "", input.to === "play" ? valueParts(root, context) : "", input.to === "play" ? voicesPart(root, context) : ""].filter((part) => part !== "").join("\n\n"),
            ...(start === undefined ? {} : { start }),
        };
    },

    format(result)
    {
        if (!result.changed) {
            return `The campaign is already in ${result.to}.`;
        }

        // The game starts with its first scene, and its date when it has none (D-103).
        const start = result.to !== "play" ? "" : ` Open the first scene${result.dateless ? ", and set the game date with advance to, at its hour, such as day 1, 18:00" : ""}.`;
        const saved = result.start === undefined ? "" : ` ${startText(result.start)}`;
        return [`The campaign is now in ${result.to}.${saved}${start}`, result.part].filter((block) => block !== "").join("\n\n");
    },
});

/** The save of a start, made or not, and which. */
type StartSave = { point: ResetPoint; saved?: string; unsaved?: string; };

/**
 * The saves the campaign starts over from (SAV-3, D-361): the first time it enters session zero with no save, the one before it; the first time it enters play,
 * with none made since, the start of play. A save that cannot be written never stops the mode, which is already changed: it says why.
 */
function startSave(root: string, context: Context, to: Mode): StartSave | undefined
{
    const saves = campaignSaves(root);
    const why = savesWhy(root);
    const point: ResetPoint | undefined = to === "session zero" && saves.length === 0
        ? "session zero"
        : to === "play" && saves.every((save) => why.get(save.number) === "session zero")
        ? "start"
        : undefined;

    if (point === undefined) {
        return undefined;
    }

    try {
        return { point, saved: saveText(makeSave(root, context, point, point)) };
    } catch (error) {
        return { point, unsaved: error instanceof Error ? error.message : String(error) };
    }
}

function startText(start: StartSave): string
{
    const which = start.point === "start" ? "Its start" : "Its state before session zero";
    const back = start.point === "start"
        ? "the save reset goes back to, if the player wants to start over"
        : "the save reset to session zero goes back to, if the player wants to start over with a new character";

    if (start.saved === undefined) {
        return `${which} could not be saved (${start.unsaved ?? ""}): make .saves a folder that can be written, then save make with saves free, if the player wants a point to start over from.`;
    }

    return `${which} is saved, ${start.saved}: ${back}.`;
}
