import { z } from "zod";
import { findCampaign, readSettings } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { defineCommand } from "../core/registry.ts";
import { buttonsInstructions, dashboardInstructions, masterInstructions, voicesInstructions } from "../instructions/index.ts";
import { campaignMode, modePart } from "./game-mode.ts";
import { readOpenScene } from "./game-scene.ts";
import { agentVoices } from "./game-voices.ts";
import { campaignSystem, campaignWorld } from "./game-world.ts";
import { mentorPart, situationPart, stylePart } from "./parts.ts";

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
        // Where the host shows the player forms, or the dashboard shows its buttons, they take the place of the stop in words (D-148, D-279).
        const buttons = context.player !== undefined || context.page !== undefined;
        const parts = [
            masterInstructions(),
            modeText(context.folder, context),
            voicesText(context.folder, context),
            mentorText(context.folder, context),
            styleText(context.folder, context),
            sceneText(context.folder, context),
            buttons ? buttonsInstructions(physicalDice(context.folder)) : "",
            // The dashboard, where the MCP server serves one, so that the master can tell the player how to use it (D-404).
            context.dashboard === undefined ? "" : dashboardInstructions(context.dashboard),
            // The opening of an evening, said to the player while the master read the game, reached them (playtest 15).
            "Now read where the game stands, writing nothing: your first words to the player are the opening itself.",
        ];
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

/** When and how to call the character agent (D-490): in play, in Claude Code, when the chat has it as an agent of the campaign; none elsewhere. */
function voicesText(folder: string, context: Context): string
{
    const root = findCampaign(folder);

    try {
        const way = root === undefined ? undefined : (readSettings(root).voices ?? "auto");
        return root === undefined || way === undefined || !agentVoices(root, context) || campaignMode(root, campaignWorld(root, context)) !== "play" ? "" : voicesInstructions(way);
    } catch {
        return "";
    }
}

/** The mentor's part, for the way the player wants the game taught (D-347); none when off, outside a campaign, or in one that does not read. */
function mentorText(folder: string, context: Context): string
{
    const root = findCampaign(folder);

    try {
        return root === undefined ? "" : mentorPart(root, context, readSettings(root).mentor);
    } catch {
        return "";
    }
}

/** How the master writes, as the player chose it (D-395), in session zero and in play; none in the setup, outside a campaign, or in one that does not read. */
function styleText(folder: string, context: Context): string
{
    const root = findCampaign(folder);

    try {
        return root === undefined || campaignMode(root, campaignWorld(root, context)) === "setup" ? "" : stylePart(root, context);
    } catch {
        return "";
    }
}

/** Whether the player rolls their own dice (ASK-8): then the buttons are for choices alone. */
function physicalDice(folder: string): boolean
{
    const root = findCampaign(folder);

    try {
        return root !== undefined && readSettings(root).dice === "physical";
    } catch {
        return false;
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
