// Who voices the characters (D-490): the character agent, where the chat has it, or the master.
import { readSettings } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";

// The name Claude Code gives itself to the MCP server: the host whose campaign has the character agent as an agent (D-490).
const claudeCode = "claude-code";

/** Whether the character agent voices the characters (D-490): in Claude Code, in a chat that has it, unless the master voices every character. */
export function agentVoices(root: string, context: Context): boolean
{
    return context.host?.() === claudeCode && context.characterAgent === true && readSettings(root).voices !== "master";
}
