// The parts of the master's instructions that the tools give when a situation opens, such as a fight or a new day (D-97, D-121).
import { readSettings } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { corePart, layeredPart } from "../../instructions/index.ts";
import { playerCharacters, type World } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { campaignSystem } from "./world.ts";

/** A part of the instructions as the core and the system give it, with no regard to what was told; undefined when neither has it. */
export function partText(name: string, system: GameSystem | undefined): string | undefined
{
    const core = corePart(name);
    return layeredPart([core === undefined ? undefined : { text: core, replace: false }, system?.parts[name]]);
}

/** A part of the instructions for a situation that opens: once in a chat where the MCP server keeps what it told, until instructions; every time elsewhere. Empty when there is none, or it was told. */
export function situationPart(name: string, context: Context, system: GameSystem | undefined): string
{
    const text = partText(name, system);

    if (text === undefined || context.told?.has(name)) {
        return "";
    }

    context.told?.add(name);
    return text;
}

/** Whether a note is due: the first time in a chat where the MCP server keeps what it told, until instructions; never on the command line, where no master plays. */
export function firstInChat(context: Context, key: string): boolean
{
    if (context.told === undefined || context.told.has(key)) {
        return false;
    }

    context.told.add(key);
    return true;
}

/** How to build an adventure as a designer (D-530 (8)): the line that says why it comes now, then the part adventure once in a chat; after that the line alone. */
export function adventurePart(lead: string, context: Context, system: GameSystem | undefined): string
{
    return [lead, situationPart("adventure", context, system)].filter((text) => text !== "").join("\n\n");
}

/** How to run the table for more than one living player character (D-450, D-480), once in a chat as a situation's part; none with fewer. */
export function partyPart(context: Context, system: GameSystem | undefined, world: World): string
{
    return playerCharacters(world).filter((page) => page.fields.status !== "dead").length > 1 ? situationPart("party", context, system) : "";
}

/**
 * The mentor's part for the way the player wants the game taught (D-347), once in a chat as a situation's part: none when off; with the tutorial, the
 * mechanics already explained.
 */
export function mentorPart(root: string, context: Context, mentor: string | undefined): string
{
    if (mentor !== "hints" && mentor !== "tutorial") {
        return "";
    }

    const part = situationPart(`mentor-${mentor}`, context, campaignSystem(root, context));
    const learned = mentor === "tutorial" ? (readSettings(root).learned ?? []) : [];
    return part === "" || learned.length === 0 ? part : `${part}\n\nAlready explained: ${learned.join(", ")}.`;
}

/**
 * How the master writes, as the player chose it (D-395): the author's part in place of the prose's, the story's, and the player's own words, each with what
 * was written in it; none for the core's own ways. Every time it is asked, as a change of them must reach the chat.
 */
export function stylePart(root: string, context: Context): string
{
    const settings = readSettings(root);
    const system = campaignSystem(root, context);

    const part = (name: string, value: string | undefined, placeholder?: string): string => {
        const text = value === undefined ? undefined : partText(name, system);
        // The player's words as they are: replaceAll would read a $ in them.
        return text === undefined ? "" : placeholder === undefined || value === undefined ? text : text.split(placeholder).join(value);
    };

    return [
        part("author", settings.author, "{author}"),
        settings.author !== undefined || settings.prose === "plain" ? "" : part(`prose-${settings.prose}`, settings.prose),
        settings.story === "situations" ? "" : part(`story-${settings.story}`, settings.story),
        part("style", settings.style, "{style}"),
    ].filter((text) => text !== "").join("\n\n");
}
