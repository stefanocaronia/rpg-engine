// The game master's instructions, read from this package wherever it is installed (D-97). Depends on nothing else in rpg-engine.
import { readFileSync } from "node:fs";

/** A part of the instructions as a layer gives it: its text, and whether it takes the place of the layers below instead of adding to them (D-121). */
export interface PartLayer
{
    text: string;
    replace: boolean;
}

/** The few lines that send a host to `instructions` and `status`: the MCP server's instructions, and the start of the campaign's AGENTS.md. */
export function startInstructions(): string
{
    return readInstructions("start.md");
}

/** What a campaign's host files carry of the instructions: the start lines, and the character agent's, which a host that has agents gives the one that voices a character (D-490). */
export function hostInstructions(): { start: string; character: string; }
{
    return { start: startInstructions(), character: readInstructions("character.md") };
}

/** When and how the master calls the character agent, in play, where the host has it (D-490). */
export function voicesInstructions(way: string): string
{
    // Always for the main characters, or for everyone, as the player chose, on top of the key moments (D-490).
    const more = way === "important" || way === "always" ? `\n\n${readInstructions(`voices-${way}.md`)}` : "";
    return `${readInstructions("voices.md")}${more}`;
}

/** The line that sends the master to the buttons, where the player sees them (D-148, D-279); for choices alone when the player rolls their own dice (ASK-8). */
export function buttonsInstructions(physicalDice: boolean): string
{
    return readInstructions(physicalDice ? "buttons-physical-dice.md" : "buttons.md");
}

/** The dashboard at its link, which the game is played with, and how the player uses it, for the master to offer it and help them (D-404). */
export function dashboardInstructions(link: string): string
{
    return readInstructions("dashboard.md").replace("{link}", link);
}

/** The game master's full instructions, as the `instructions` command gives them. */
export function masterInstructions(): string
{
    return readInstructions("core.md");
}

/** The core's text of a part of the instructions that a situation opens, such as combat (D-121); undefined when the core has none. */
export function corePart(name: string): string | undefined
{
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        return undefined;
    }

    try {
        return readInstructions(`${name}.md`);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return undefined;
        }

        throw error;
    }
}

/** A part through its layers, from the core up: each adds its text to those below, or takes their place when it says so (D-121); undefined when none has it. */
export function layeredPart(layers: (PartLayer | undefined)[]): string | undefined
{
    let text: string | undefined;

    for (const layer of layers) {
        if (layer !== undefined) {
            // A blank line between layers, so that a system's text never reads as the last item of the core's list.
            text = layer.replace || text === undefined ? layer.text : `${text}\n\n${layer.text}`;
        }
    }

    return text;
}

function readInstructions(name: string): string
{
    // From src/instructions/ and from dist/instructions/ alike, the package's instructions/ folder is two levels up.
    return readFileSync(new URL(`../../instructions/${name}`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();
}
