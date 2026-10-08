import { z } from "zod";
import { findCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { defineCommand } from "../core/registry.ts";
import { buttonsInstructions, masterInstructions } from "../instructions/index.ts";
import { campaignMode, modePart } from "./game-mode.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";

export const instructions = defineCommand({
    name: "instructions",
    description: "Your instructions as game master, in full: how to run this campaign and use these tools. They end with the part of the mode the campaign is in. "
        + "Call it before your first reply in every chat, and again after the conversation has been summarized; then call status. Read-only, no parameters.",
    group: "game",
    readOnly: true,
    alwaysLoad: true,
    input: z.object({}),

    run(_input, context)
    {
        // A chat that starts, or follows a summary, gets every part of the instructions again when its situation opens (D-97).
        context.told?.clear();
        // Where the host shows the player forms, the buttons take the place of the stop in words (D-148).
        return { text: [masterInstructions(), modeText(context.folder, context), context.player === undefined ? "" : buttonsInstructions()].filter((part) => part !== "").join("\n\n") };
    },

    format(result)
    {
        return result.text;
    },
});

/** The part of the mode the campaign is in, with its layers (MOD-5); none outside a campaign, or in one that does not read, where status says why. */
function modeText(folder: string, context: Context): string
{
    const root = findCampaign(folder);

    if (root === undefined) {
        return "";
    }

    try {
        return modePart(campaignMode(root, campaignWorld(root, context)), campaignSystem(root, context)) ?? "";
    } catch {
        return "";
    }
}
