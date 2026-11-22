// Who voices the characters (D-490): the character agent, where the chat has it, or the master.
import { readSettings } from "../../../campaign/index.ts";
import type { Context } from "../../../core/context.ts";
import { voicesInstructions } from "../../../instructions/index.ts";

// The names Claude Code and OpenCode give themselves to the MCP server: the hosts whose campaign has the character agent as an agent (D-490).
const claudeCode = "claude-code";
const openCode = "opencode";

/** Whether the character agent voices the characters (D-490): in Claude Code or OpenCode, in a chat that has it, unless the master voices every character. */
export function agentVoices(root: string, context: Context): boolean
{
    const host = context.host?.();
    const has = host === claudeCode ? context.characterAgents?.claudeCode : host === openCode ? context.characterAgents?.openCode : false;
    return has === true && readSettings(root).voices !== "master";
}

/** The part Voices, when and how to call the character agent, for a campaign in play, with OpenCode's way of calling it there; none where the agent does not voice the characters. */
export function voicesPart(root: string, context: Context): string
{
    return agentVoices(root, context) ? voicesInstructions(readSettings(root).voices ?? "auto", context.host?.() === openCode) : "";
}
