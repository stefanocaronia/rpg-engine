// What the table writes to Claude Code, and the kinds of its tools.
import type { ToolKind } from "../chat.ts";
import { isObject, type Message } from "../lines.ts";

/**
 * The host's built-in tools the table may give the master, by kind; `--tools` lists those whose kind is allowed. WebFetch is the master's own only in an
 * older Claude Code: a newer one leaves it out and reads a page with a subagent.
 */
export const builtInTools: { name: string; kind: ToolKind; }[] = [
    { name: "Read", kind: "read" },
    { name: "Glob", kind: "read" },
    { name: "Grep", kind: "read" },
    { name: "WebSearch", kind: "web" },
    { name: "WebFetch", kind: "fetch" },
    { name: "Task", kind: "agent" },
    { name: "Bash", kind: "shell" },
    { name: "PowerShell", kind: "shell" },
    { name: "Write", kind: "write" },
    { name: "Edit", kind: "write" },
    { name: "NotebookEdit", kind: "write" },
];

/** The host's tools that only load the others, which it runs without asking: never a reason to stop a turn. */
export const toolLoaders = ["ToolSearch"];

// The rpg server's tools, and the subagents the master may start, by the subagent tool's names old and new: a character played apart, and the host's own
// reader of a page of the web (seen in Claude Code 2.1.332, which has no WebFetch of the master's own), of the kind of a page read.
const rpgPrefix = "mcp__rpg__";
const agentTools = ["Task", "Agent"];
const agentKinds: Record<string, ToolKind> = { "rpg-character": "agent", "web-fetch": "fetch" };

/** The kinds a subagent the master may start is of: the subagent tool is given where any is allowed. */
export const subagentKinds = Object.values(agentKinds);

/** The subagent tool as `--tools` names it. */
export const subagentTool = "Task";

/**
 * A tool's name for the table and its kind: a command of the rpg server by its own name; a subagent is the master's only when it plays a character or
 * reads a page of the web, and any other is of kind other.
 */
export function toolOf(name: string, input: unknown): { name: string; kind: ToolKind; }
{
    if (name.startsWith(rpgPrefix) && name.length > rpgPrefix.length) {
        return { name: name.slice(rpgPrefix.length), kind: "rpg" };
    }

    if (agentTools.includes(name)) {
        const type = isObject(input) && typeof input.subagent_type === "string" ? input.subagent_type : "";
        return { name, kind: Object.hasOwn(agentKinds, type) ? agentKinds[type] : "other" };
    }

    return { name, kind: builtInTools.find((tool) => tool.name === name)?.kind ?? "other" };
}

export function userMessage(text: string): Message
{
    return { type: "user", message: { role: "user", content: [{ type: "text", text }] } };
}

export function controlRequest(id: string, request: Message): Message
{
    return { type: "control_request", request_id: id, request };
}

export function controlAnswer(id: unknown, response: Message): Message
{
    return { type: "control_response", response: { subtype: "success", request_id: id, response } };
}

export function controlError(id: unknown, error: string): Message
{
    return { type: "control_response", response: { subtype: "error", request_id: id, error } };
}
