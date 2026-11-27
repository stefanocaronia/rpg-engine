// The master in Antigravity: its program started with no terminal as `agy acp`, spoken to by the Agent Client Protocol, in the campaign's folder. The rpg
// server comes from the campaign's .agents/mcp_config.json or the player's own, which rpg init both write: the table passes none of its own.
import { join } from "node:path";
import { hosts } from "../../core/hosts.ts";
import { type AcpHost, acpModels, kindOfCall, openAcp, pathsOfCall } from "../acp/index.ts";
import type { Failure, MasterDriver, ToolKind } from "../chat.ts";
import { fileOnPath, type FoundProgram, lackingServerFile } from "../program.ts";

// What belongs to another chat or shell, never to the master's: the engine's own variables, which the table sets again, and the folders of a shell.
const dropped = /^(RPG_.*|PWD|OLDPWD|INIT_CWD)$/i;

// A tool of the rpg server, by the names a host gives one: mcp__rpg__status, rpg.status, rpg_status, rpg/status, or the title "rpg: status".
const rpgTool = /^(?:mcp__)?rpg(?:__|[._/]|:\s*)([a-z][\w-]*)$/i;

// The protocol's kinds that change something on the computer: what such a call is named or titled never makes it a command of rpg.
const actingKinds = ["execute", "edit", "delete", "move"];

// Antigravity's own tools, by the names the table saw it give; write_to_file is from its other modes, and of a kind never allowed. Any other is read by the
// protocol's kind. An MCP tool, a reading and the subagents are read from their input, by the name Antigravity gives, never by a title.
// read_url_content, a page of the web read, is so named by its fields, never seen in a recorded turn: to be confirmed.
const builtInKinds: Record<string, ToolKind> = { run_command: "shell", write_file: "write", write_to_file: "write", read_url_content: "fetch" };
const inputTools = ["call_mcp_tool", "invoke_subagent", "manage_subagents", "manage_task", "schedule", "read_file"];

// The subagents the master may start: a character played apart, and the painter of the pictures, Antigravity's way to make one; what it may do with them.
const allowedAgents = ["rpg-character", "image-generator"];
const agentActions = ["list", "kill"];
// How the master waits for a subagent it started, as agy 1.5.17 was seen to: a timer that wakes it once, its fields those alone (one that repeats would
// spend the player's quota by itself); and a look at a subagent's task, by the actions seen, which change nothing.
const timerFields = ["DurationSeconds", "Prompt"];
const taskActions = ["status"];

// The description of an rpg tool, which Antigravity keeps in its own folder and reads before it calls one: as its hook reads it (src/server/approver.ts).
const rpgDescription = /[\\/]antigravity-cli[\\/]mcp[\\/]rpg[\\/][\w-]+\.(?:json|md)$/i;

/** Antigravity as the protocol's client reads it: a tool by its own name where the table knows it, else by the protocol's kind; a command of rpg by its name. */
export const antigravityAcp: AcpHost = {
    name: hosts.antigravity.name,
    args: ["acp"],
    toolOf: (call, session) => toolOf(call, session),
    pathsOf: pathsOfCall,
    innerTools: () => [],
    login: "open Antigravity on this computer and sign in there, then try again",
    // Its own error for a player not signed in was never seen: words that say so are taken as it until it is.
    signInWords: /authenticat/i,
};

/** Antigravity as the table drives it: the model a new chat proposes is the first Antigravity lists. */
export const antigravity: MasterDriver = {
    open: (options) => openAcp(options, antigravityAcp),
    missing: (folder) => lacking(folder)?.why,
    lacking,
    program: antigravityProgram,
    environment: (environment) => Object.fromEntries(Object.entries(environment).filter(([name]) => !dropped.test(name))),
    models: (options) => acpModels(options, antigravityAcp),
    model: "",
    efforts: [],
    effortsOnceChosen: true,
};

/** What a campaign lacks for Antigravity: the file that names the game's server. */
function lacking(folder: string): Failure | undefined
{
    return lackingServerFile(folder, ".agents/mcp_config.json", hosts.antigravity.name);
}

/** Antigravity's own program, never a shim that needs a shell: the first found in a folder of the PATH, then where its installer puts it in the player's home. */
function antigravityProgram(environment: NodeJS.ProcessEnv, platform: string, home: string): FoundProgram | undefined
{
    const installed = platform === "win32" ? join(home, "AppData", "Local", "agy", "bin") : join(home, ".local", "bin");
    const found = fileOnPath(platform === "win32" ? "agy.exe" : "agy", environment, platform, [installed]);
    return found === undefined ? undefined : { command: found, args: [] };
}

/**
 * A call's name for the table and its kind: a tool of Antigravity's read from its input, by the name it gives; else a call that changes something by
 * the protocol's kind, whatever its name or title; then a tool of Antigravity's own by its name; then a command of the rpg server by its own name,
 * whether the host names it or titles it so.
 */
function toolOf(call: Record<string, unknown>, session: string | undefined): { name: string; kind: ToolKind; }
{
    const names = [call.name, call.title].filter((one) => typeof one === "string") as string[];
    const first = names[0] ?? "";

    if (typeof call.name === "string" && inputTools.includes(call.name)) {
        return toolOfInput(call.name, call, session);
    }

    if (typeof call.kind === "string" && actingKinds.includes(call.kind)) {
        return { name: first, kind: kindOfCall(call) };
    }

    const own = names.find((name) => Object.hasOwn(builtInKinds, name));

    if (own !== undefined) {
        return { name: own, kind: builtInKinds[own] };
    }

    for (const name of names) {
        const command = rpgTool.exec(name.trim())?.[1];

        if (command !== undefined) {
            return { name: command, kind: "rpg" };
        }
    }

    return { name: first, kind: kindOfCall(call) };
}

/**
 * A call of Antigravity's own read from its input, by the fields agy 1.5.17 gives: a tool of the rpg server is rpg's, any other server's of kind other;
 * reading a tool's description, or what a tool of this chat answered, which Antigravity keeps in its own folder, is rpg's; the subagents the table
 * allows, listing or stopping them, a timer that wakes the master once and a look at a subagent's task, are the agent's. Where its input names them
 * otherwise, the call is of kind other, never allowed.
 */
function toolOfInput(name: string, call: Record<string, unknown>, session: string | undefined): { name: string; kind: ToolKind; }
{
    const input = typeof call.rawInput === "object" && call.rawInput !== null ? call.rawInput as Record<string, unknown> : {};

    if (name === "call_mcp_tool") {
        return input.ServerName === "rpg" ? { name: typeof input.ToolName === "string" ? input.ToolName : name, kind: "rpg" } : { name, kind: "other" };
    }

    if (name === "read_file") {
        const own = typeof input.Path === "string" && (rpgDescription.test(input.Path) || isAnswerOf(input.Path, session));
        return { name, kind: own ? "rpg" : "read" };
    }

    if (name === "invoke_subagent") {
        return { name, kind: typeof input.TypeName === "string" && allowedAgents.includes(input.TypeName) ? "agent" : "other" };
    }

    if (name === "schedule") {
        const once = Object.keys(input).every((field) => timerFields.includes(field)) && typeof input.DurationSeconds === "number" && typeof input.Prompt === "string";
        return { name, kind: once ? "agent" : "other" };
    }

    const actions = name === "manage_task" ? taskActions : agentActions;
    return { name, kind: typeof input.Action === "string" && actions.includes(input.Action) ? "agent" : "other" };
}

/** Whether a path is where Antigravity keeps what a tool of the chat's session answered: .gemini/antigravity-cli/brain/<session>/.system_generated/steps/<n>/output.txt. */
function isAnswerOf(path: string, session: string | undefined): boolean
{
    const parts = path.split(/[\\/]/);
    const at = parts.length - 8;
    const expected = [".gemini", "antigravity-cli", "brain", session, ".system_generated", "steps"];
    return session !== undefined && at >= 0 && expected.every((part, index) => parts[at + index] === part) && /^\d+$/.test(parts[at + 6]) && parts[at + 7] === "output.txt";
}
