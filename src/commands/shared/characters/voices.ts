// Who voices the characters (D-490): the character agent, where the chat has it, or the master.
import { readSettings } from "../../../campaign/index.ts";
import type { Context } from "../../../core/context.ts";
import { hostOfClient } from "../../../core/hosts.ts";
import { voicesInstructions } from "../../../instructions/index.ts";

/** Whether the character agent voices the characters (D-490, D-580): in a host that has agents, in a chat that has it, unless the master voices every character. */
export function agentVoices(root: string, context: Context): boolean
{
    const host = hostOfClient(context.host?.());
    return host !== undefined && context.characterAgents?.[host] === true && readSettings(root).voices !== "master";
}

/** The part Voices, when and how to call the character agent, for a campaign in play, with the host's own way of calling it; none where the agent does not voice the characters. */
export function voicesPart(root: string, context: Context): string
{
    const host = hostOfClient(context.host?.());
    return host !== undefined && agentVoices(root, context) ? voicesInstructions(readSettings(root).voices ?? "auto", host) : "";
}
