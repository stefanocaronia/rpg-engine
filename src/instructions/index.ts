// The game master's instructions, read from this package wherever it is installed (D-97). Depends on nothing else in rpg-engine.
import { readFileSync } from "node:fs";

/** The few lines that send a host to `instructions` and `status`: the MCP server's instructions and, later, the campaign's AGENTS.md. */
export function startInstructions(): string
{
    return readInstructions("start.md");
}

/** The line that sends the master to the buttons, where the host shows the player forms (D-148). */
export function buttonsInstructions(): string
{
    return readInstructions("buttons.md");
}

/** The game master's full instructions, as the `instructions` command gives them. */
export function masterInstructions(): string
{
    return readInstructions("core.md");
}

function readInstructions(name: string): string
{
    // From src/instructions/ and from dist/instructions/ alike, the package's instructions/ folder is two levels up.
    return readFileSync(new URL(`../../instructions/${name}`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();
}
