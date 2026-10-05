import { z } from "zod";
import { defineCommand } from "../core/registry.ts";
import { buttonsInstructions, masterInstructions } from "../instructions/index.ts";

export const instructions = defineCommand({
    name: "instructions",
    description: "Your instructions as game master, in full: how to run this campaign and use these tools. "
        + "Call it before your first reply in every chat, and again after the conversation has been summarized; then call status. Read-only, no parameters.",
    group: "game",
    readOnly: true,
    alwaysLoad: true,
    input: z.object({}),

    run(_input, context)
    {
        // Where the host shows the player forms, the buttons take the place of the stop in words (D-148).
        return { text: context.player === undefined ? masterInstructions() : `${masterInstructions()}\n\n${buttonsInstructions()}` };
    },

    format(result)
    {
        return result.text;
    },
});
