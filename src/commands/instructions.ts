import { z } from "zod";
import { findCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { defineCommand } from "../core/registry.ts";
import { buttonsInstructions, masterInstructions } from "../instructions/index.ts";
import { campaignMode, modePart } from "./game-mode.ts";
import { readOpenScene } from "./game-scene.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";
import { situationPart } from "./parts.ts";

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
        const parts = [masterInstructions(), modeText(context.folder, context), sceneText(context.folder, context), context.player === undefined ? "" : buttonsInstructions()];
        return { text: parts.filter((part) => part !== "").join("\n\n") };
    },

    format(result)
    {
        return result.text;
    },
});

/**
 * The part of the open scene's type, such as combat, for a chat that starts in the middle of a scene, where scene open will not give it (MOD-5, D-266); then it
 * counts as told. None without a scene, or with one that does not read.
 */
function sceneText(folder: string, context: Context): string
{
    const root = findCampaign(folder);
    const scene = root === undefined ? undefined : readOpenScene(root).scene;

    if (root === undefined || scene === undefined) {
        return "";
    }

    try {
        return situationPart(scene.type, context, campaignSystem(root, context));
    } catch {
        return "";
    }
}

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
