// The parts of the master's instructions that the tools give when a situation opens, such as a fight or a new day (D-97, D-121).
import type { Context } from "../core/context.ts";
import { corePart, layeredPart } from "../instructions/index.ts";
import type { GameSystem } from "../systems/index.ts";

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
