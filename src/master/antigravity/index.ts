// The master in Antigravity: its program started with no terminal as `agy acp`, spoken to by the Agent Client Protocol, in the campaign's folder. The rpg
// server comes from the campaign's .agents/mcp_config.json or the player's own, which rpg init both write: the table passes none of its own.
import { join } from "node:path";
import { type AcpHost, acpModels, kindOfCall, openAcp, pathsOfCall } from "../acp/index.ts";
import type { MasterDriver, ToolKind } from "../chat.ts";
import { fileOnPath, type FoundProgram, isFile } from "../program.ts";

// What belongs to another chat or shell, never to the master's: the engine's own variables, which the table sets again, and the folders of a shell.
const dropped = /^(RPG_.*|PWD|OLDPWD|INIT_CWD)$/i;

// A tool of the rpg server, by the names a host gives one: mcp__rpg__status, rpg.status, rpg_status, rpg/status, or the title "rpg: status".
const rpgTool = /^(?:mcp__)?rpg(?:__|[._/]|:\s*)([a-z][\w-]*)$/i;

/** Antigravity as the protocol's client reads it: its own names of tools are not known, so a tool is read by the protocol's kinds, a command of rpg by its name. */
export const antigravityAcp: AcpHost = {
    args: ["acp"],
    toolOf: (call) => toolOf(call),
    pathsOf: pathsOfCall,
    innerTools: () => [],
};

/** Antigravity as the table drives it: the model a new chat proposes is the first Antigravity lists. */
export const antigravity: MasterDriver = {
    open: (options) => openAcp(options, antigravityAcp),
    missing: (folder) =>
        isFile(join(folder, ".agents", "mcp_config.json"))
            ? undefined
            : "This campaign has no .agents/mcp_config.json, which tells Antigravity how to start the game's server: run rpg init in the campaign's folder, then try again.",
    program: antigravityProgram,
    environment: (environment) => Object.fromEntries(Object.entries(environment).filter(([name]) => !dropped.test(name))),
    models: (options) => acpModels(options, antigravityAcp),
    model: "",
    efforts: [],
};

/** Antigravity's own program, never a shim that needs a shell: the first found in a folder of the PATH, then where its installer puts it in the player's home. */
function antigravityProgram(environment: NodeJS.ProcessEnv, platform: string, home: string): FoundProgram | undefined
{
    const installed = platform === "win32" ? join(home, "AppData", "Local", "agy", "bin") : join(home, ".local", "bin");
    const found = fileOnPath(platform === "win32" ? "agy.exe" : "agy", environment, platform, [installed]);
    return found === undefined ? undefined : { command: found, args: [] };
}

/** A call's name for the table and its kind: a command of the rpg server by its own name, whether the host names it or titles it so. */
function toolOf(call: Record<string, unknown>): { name: string; kind: ToolKind; }
{
    const names = [call.name, call.title].filter((one) => typeof one === "string") as string[];

    for (const name of names) {
        const command = rpgTool.exec(name.trim())?.[1];

        if (command !== undefined) {
            return { name: command, kind: "rpg" };
        }
    }

    return { name: names[0] ?? "", kind: kindOfCall(call) };
}
