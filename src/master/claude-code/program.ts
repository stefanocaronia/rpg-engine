// Claude Code on this computer, as the table starts it: its own program where it was installed by itself, and the environment it runs in.
import { statSync } from "node:fs";
import { join } from "node:path";

/** Claude Code's own program: the first found in a folder of the PATH, then in its own folder of the player's home; never a shim that needs a shell. */
export function claudeProgram(environment: NodeJS.ProcessEnv, platform: string, home: string): { command: string; args: string[]; } | undefined
{
    const file = platform === "win32" ? "claude.exe" : "claude";
    const folders = (valueOf(environment, "PATH") ?? "").split(platform === "win32" ? ";" : ":").filter((folder) => folder.trim() !== "");
    const found = [...folders, join(home, ".local", "bin")].map((folder) => join(folder, file)).find(isFile);
    return found === undefined ? undefined : { command: found, args: [] };
}

/**
 * The environment of Claude Code started by the table: the table's own, which is the player's and holds what they set for Claude Code. Only a table started
 * from inside a Claude Code session loses that session's variables, Anthropic's and an MCP server's, which are the session's own, but for where the settings are.
 */
export function claudeEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv
{
    const inSession = Object.keys(environment).some((name) => name.toUpperCase() === "CLAUDECODE");

    if (!inSession) {
        return { ...environment };
    }

    const dropped = (name: string): boolean => {
        const upper = name.toUpperCase();
        return (upper.startsWith("CLAUDE") && upper !== "CLAUDE_CONFIG_DIR") || upper.startsWith("MCP_") || upper.startsWith("ANTHROPIC_");
    };

    return Object.fromEntries(Object.entries(environment).filter(([name]) => !dropped(name)));
}

/** A variable's value whatever the case of its name, as Windows writes Path. */
function valueOf(environment: NodeJS.ProcessEnv, name: string): string | undefined
{
    return Object.entries(environment).find(([key]) => key.toUpperCase() === name)?.[1];
}

/** Whether a path is a file, as the campaign's .mcp.json must be. */
export function isFile(path: string): boolean
{
    try {
        return statSync(path).isFile();
    } catch {
        return false;
    }
}
