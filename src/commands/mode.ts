import { z } from "zod";
import { changeState, requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { blockingMode, campaignMode, missingText, type Mode, modePart, modes } from "./game-mode.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";

export const mode = defineCommand({
    name: "mode",
    description: "Move the campaign to another mode, the main state of the game: setup (the settings, out of the game), session zero (the player character and the companions, "
        + "made in play) or play. It goes on only when the checklist before that mode is complete, and otherwise says what is still missing; then it gives the instructions "
        + "of the mode it enters. Call it when status says nothing is missing and the player confirms; back to session zero to make a new player character. "
        + 'Example: to "session zero".',
    group: "game",
    positionals: ["to"],
    input: z.object({
        to: z.enum(modes).describe(`the mode to enter: ${modes.join(", ")}`),
    }),

    run(input, context): { to: Mode; changed: boolean; dateless: boolean; part: string; }
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
        return { to: input.to, changed: true, dateless: readPresent(root).date === undefined, part: modePart(input.to, campaignSystem(root, context)) ?? "" };
    },

    format(result)
    {
        if (!result.changed) {
            return `The campaign is already in ${result.to}.`;
        }

        // The game starts with its first scene, and its date when it has none (D-103).
        const start = result.to !== "play" ? "" : ` Open the first scene${result.dateless ? ", and set the game date with advance to, at its hour, such as day 1, 18:00" : ""}.`;
        return [`The campaign is now in ${result.to}.${start}`, result.part].filter((block) => block !== "").join("\n\n");
    },
});
