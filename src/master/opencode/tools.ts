// OpenCode's tools as the table reads them. Its agent calls the rpg server's commands inside `execute`, a tool that runs code over the MCP servers'
// tools, and names the commands it ran only at the end, in the update's metadata.
import { type AcpHost, pathsOfCall } from "../acp/index.ts";
import type { ToolKind } from "../chat.ts";
import { staysInside } from "../paths.ts";

// OpenCode's own tools, by kind; any other is of kind other.
const builtInKinds: Record<string, ToolKind> = {
    read: "read",
    glob: "read",
    grep: "read",
    list: "read",
    websearch: "web",
    webfetch: "fetch",
    bash: "shell",
    edit: "write",
    write: "write",
    patch: "write",
    multiedit: "write",
};

// The rpg server's commands as OpenCode names them, the tool that runs code over the servers' tools, and the one subagent the master may start.
const rpgPrefix = "rpg.";
const codeTool = "execute";
const characterAgent = "rpg-character";

/** OpenCode as the protocol's client reads it. */
export const openCodeAcp: AcpHost = {
    args: ["acp"],
    toolOf: (call) => toolOf(nameOf(call), isObject(call.rawInput) ? call.rawInput : {}),
    pathsOf: (call) => {
        const input = isObject(call.rawInput) ? call.rawInput : {};
        const name = nameOf(call);
        // A pattern of files is held to the folder it is read from; one that leaves it is refused as a path outside.
        const patterns = [name === "glob" ? input.pattern : undefined, name === "grep" ? input.include : undefined].filter((pattern) => pattern !== undefined);
        return [...pathsOfCall(call), ...patterns.map((pattern) => (staysInside(pattern) ? "." : String(pattern)))];
    },
    innerTools: (call) => {
        const metadata = isObject(call.rawOutput) && isObject(call.rawOutput.metadata) ? call.rawOutput.metadata : {};
        const ran = Array.isArray(metadata.toolCalls) ? metadata.toolCalls.filter(isObject) : [];
        return ran.flatMap((one) => (typeof one.tool === "string" ? [{ ...commandOf(one.tool), failed: one.status !== "completed" }] : []));
    },
};

/** A tool's name and kind: a command of the rpg server by its own name; `execute` is the rpg server's when its code reaches that server's tools alone. */
function toolOf(name: string, input: Record<string, unknown>): { name: string; kind: ToolKind; }
{
    if (name.startsWith(rpgPrefix)) {
        return commandOf(name);
    }

    if (name === codeTool) {
        const servers = serversOf(input.code);
        return { name, kind: servers.length > 0 && servers.every((server) => server === "rpg") ? "rpg" : "other" };
    }

    if (name === "task") {
        return { name, kind: input.subagent_type === characterAgent ? "agent" : "other" };
    }

    return { name, kind: builtInKinds[name] ?? "other" };
}

/** A tool as OpenCode names a command it ran: `rpg.status` is the command status of the rpg server. */
function commandOf(tool: string): { name: string; kind: ToolKind; }
{
    return tool.startsWith(rpgPrefix) && tool.length > rpgPrefix.length ? { name: tool.slice(rpgPrefix.length), kind: "rpg" } : { name: tool, kind: "other" };
}

/** The MCP servers a piece of code reaches, as `tools.rpg` or `tools["rpg"]`; none where it is no code. */
function serversOf(code: unknown): string[]
{
    if (typeof code !== "string") {
        return [];
    }

    // `tools` reached any other way, as through another name, is a server not known: never the rpg server's alone.
    return [...code.matchAll(/\btools\b\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*["'`]([^"'`]*)["'`]\s*\])?/g)].map(([, dotted, quoted]) => dotted ?? quoted ?? "");
}

/** A call's tool name: OpenCode's own field, else the title it gives. */
function nameOf(call: Record<string, unknown>): string
{
    return typeof call.name === "string" ? call.name : typeof call.title === "string" ? call.title : "";
}

function isObject(value: unknown): value is Record<string, unknown>
{
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
