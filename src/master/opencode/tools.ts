// OpenCode's tools as the table reads them. Its agent calls the rpg server's commands inside `execute`, a tool that runs code over the MCP servers'
// tools, and names the commands it ran only at the end, in the update's metadata.
import { hosts } from "../../core/hosts.ts";
import { type AcpHost, pathsOfCall, patternOutside } from "../acp/index.ts";
import type { ToolKind } from "../chat.ts";
import { isObject } from "../lines.ts";
import { staysInside } from "../paths.ts";

// OpenCode's own tools, by kind, by their names old and new (bash and shell, apply_patch and patch); any other is of kind other.
const builtInKinds: Record<string, ToolKind> = {
    read: "read",
    glob: "read",
    grep: "read",
    list: "read",
    websearch: "web",
    webfetch: "fetch",
    bash: "shell",
    shell: "shell",
    edit: "write",
    write: "write",
    patch: "write",
    apply_patch: "write",
    multiedit: "write",
};

// The providers whose models cost the player nothing apart, in the order their models are kept and proposed before any other's: OpenCode's own, free
// on the network, then the programs that run a model on this computer. OpenCode says nothing of cost, so a paid model of its own (opencode/…) is not marked.
const unmetered = ["opencode", "ollama", "lmstudio", "llama.cpp"];

// The tools that read the folder they run in where their input names no path.
const folderTools = ["glob", "grep", "list"];

// The rpg server's commands as OpenCode names them, the tool that runs code over the servers' tools, and the one subagent the master may start, by the
// subagent tool's names old and new: task with subagent_type, subagent with agent.
const rpgPrefix = "rpg.";
const codeTool = "execute";
const characterAgent = "rpg-character";
const agentTools: Record<string, string> = { task: "subagent_type", subagent: "agent" };
// How OpenCode marks the update of a subagent's session; the search `execute` gives its code over the servers' tools, which reads only what they are.
const childMark = "opencode/child-session";
const toolLoaders = ["search"];

/** OpenCode as the protocol's client reads it. */
export const openCodeAcp: AcpHost = {
    name: hosts.openCode.name,
    args: ["acp"],
    toolOf: (call) => toolOf(nameOf(call), isObject(call.rawInput) ? call.rawInput : {}, ranTools(call)),
    pathsOf: (call) => {
        const input = isObject(call.rawInput) ? call.rawInput : {};
        const name = nameOf(call);
        // A pattern of files is held to the folder it is read from; one that leaves it is refused as a path outside.
        const patterns = [name === "glob" ? input.pattern : undefined, name === "grep" ? input.include : undefined].filter((pattern) => pattern !== undefined);
        const fromFolder = folderTools.includes(name) ? ["."] : [];
        return [...fromFolder, ...pathsOfCall(call), ...patterns.map((pattern) => (staysInside(pattern) ? "." : patternOutside(pattern)))];
    },
    login: "sign in from OpenCode itself, then try again",
    modelMarks: (id) => {
        const provider = providerOf(id);
        return provider === undefined ? {} : { group: provider, ...(unmetered.includes(provider.toLowerCase()) ? {} : { metered: true as const }) };
    },
    // Those of the providers not paid apart by their order, then any other not paid apart, then those paid apart.
    modelRank: (id) => {
        const provider = providerOf(id)?.toLowerCase();
        const free = provider === undefined ? -1 : unmetered.indexOf(provider);
        return free >= 0 ? free : unmetered.length + (provider === undefined ? 0 : 1);
    },
    innerTools: (call) => (ranTools(call) ?? []).filter((one) => !toolLoaders.includes(one.tool)).map((one) => ({ ...commandOf(one.tool), failed: one.failed })),
    // A subagent's work comes among the chat's updates, marked with its session; a mark with no id is a subagent all the same, never the master.
    childOf: (update) => {
        const child = isObject(update._meta) ? update._meta[childMark] : undefined;
        return child === undefined ? undefined : isObject(child) && typeof child.id === "string" ? child.id : "";
    },
    childStarted: (call) => {
        const metadata = isObject(call.rawOutput) && isObject(call.rawOutput.metadata) ? call.rawOutput.metadata : {};
        return typeof metadata.sessionID === "string" ? metadata.sessionID : undefined;
    },
};

/**
 * A tool's name and kind: a command of the rpg server by its own name; `execute` is the rpg server's when it ran, besides the search of the tools, that
 * server's tools alone, and until it ends when its code reaches that server's tools alone.
 */
function toolOf(name: string, input: Record<string, unknown>, ran: { tool: string; }[] | undefined): { name: string; kind: ToolKind; }
{
    if (name.startsWith(rpgPrefix)) {
        return commandOf(name);
    }

    if (name === codeTool && ran !== undefined) {
        return { name, kind: ran.every((one) => toolLoaders.includes(one.tool) || commandOf(one.tool).kind === "rpg") ? "rpg" : "other" };
    }

    if (name === codeTool) {
        const servers = serversOf(input.code);
        return { name, kind: servers.length > 0 && servers.every((server) => server === "rpg") ? "rpg" : "other" };
    }

    const agentKey = Object.hasOwn(agentTools, name) ? agentTools[name] : undefined;

    if (agentKey !== undefined) {
        return { name, kind: input[agentKey] === characterAgent ? "agent" : "other" };
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

/** The tools a call of `execute` ran, as its end names them; undefined until it says. */
function ranTools(call: Record<string, unknown>): { tool: string; failed: boolean; }[] | undefined
{
    const metadata = isObject(call.rawOutput) && isObject(call.rawOutput.metadata) ? call.rawOutput.metadata : {};
    const ran = Array.isArray(metadata.toolCalls) ? metadata.toolCalls.filter(isObject) : undefined;
    return ran?.map((one) => ({ tool: typeof one.tool === "string" ? one.tool : "", failed: one.status !== "completed" }));
}

/** A model's provider, as OpenCode names it before the first slash; undefined for a model named without one. */
function providerOf(id: string): string | undefined
{
    return id.includes("/") ? id.slice(0, id.indexOf("/")) : undefined;
}

/** A call's tool name: OpenCode's own field, else the title it gives. */
function nameOf(call: Record<string, unknown>): string
{
    return typeof call.name === "string" ? call.name : typeof call.title === "string" ? call.title : "";
}
