// Who voices the characters (D-490): the character agent, where the chat has it, or the master.
import { readSettings } from "../../../campaign/index.ts";
import type { Context } from "../../../core/context.ts";
import { antigravityClient, codexClient, openCodeClient } from "../../../helpers/index.ts";
import { type VoicesHost, voicesInstructions } from "../../../instructions/index.ts";

// The hosts whose campaign has the character agent as an agent (D-490, D-580), by the names they give themselves to the MCP server.
const agentHosts: Record<string, VoicesHost> = { "claude-code": "claudeCode", [openCodeClient]: "openCode", [codexClient]: "codex", [antigravityClient]: "antigravity" };

/** Whether the character agent voices the characters (D-490, D-580): in a host that has agents, in a chat that has it, unless the master voices every character. */
export function agentVoices(root: string, context: Context): boolean
{
    const host = agentHosts[context.host?.() ?? ""];
    return host !== undefined && context.characterAgents?.[host] === true && readSettings(root).voices !== "master";
}

/** The part Voices, when and how to call the character agent, for a campaign in play, with the host's own way of calling it; none where the agent does not voice the characters. */
export function voicesPart(root: string, context: Context): string
{
    const host = agentHosts[context.host?.() ?? ""];
    return host !== undefined && agentVoices(root, context) ? voicesInstructions(readSettings(root).voices ?? "auto", host) : "";
}
