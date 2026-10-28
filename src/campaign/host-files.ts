// What an AI host reads in a campaign besides .mcp.json: AGENTS.md, opening with the start lines (D-97); CLAUDE.md, which imports it; Claude Code's settings,
// with its auto memory off, so that the master keeps nothing outside the campaign (D-242), the rpg server approved with its tools allowed (D-412) and no tasks in
// the background, so that the character agent answers within the master's turn (D-490), and the doorbell of the player's sentences (D-495); Codex's, with
// the rpg server and its memories off (D-362); Claude Code's character agent, the agent the master calls to voice a character (D-490). Gemini CLI is no
// longer set up (D-493): a campaign's .gemini/ stays as it is.
import { join } from "node:path";
import { files } from "../core/store.ts";
import { efforts, readTextSetting } from "./settings.ts";

/** The files of the AI hosts at the top of a campaign, which are not the game's: a save leaves them as they are (SAV-2), Gemini CLI's of an older campaign too. */
export const hostFileNames = ["AGENTS.md", "CLAUDE.md", "CLAUDE.local.md", "GEMINI.md"];

/** The engine's texts a campaign's host files carry: the start lines, and the character agent's instructions (D-490). */
export interface HostInstructions
{
    start: string;
    character: string;
}

/** A file to write, with its new text; without one, a file that goes, as the character agent's when the master voices every character (D-490). */
interface HostFile
{
    path: string;
    text?: string;
}

/** Writes a host file, or takes it away when it has no text. */
export function writeHostFile(file: HostFile): void
{
    if (file.text === undefined) {
        files().remove(file.path);
    } else {
        files().write(file.path, file.text);
    }
}

// The marks around the start lines in AGENTS.md: rpg rewrites what lies between them, and the player's own text stays around them.
const startMark = "<!-- rpg: rpg keeps the lines up to the end mark up to date; the player's own instructions go after it. -->";
const endMark = "<!-- rpg: end -->";
const markedBlock = /^<!-- rpg: (?!end)[^\n]*\n[\s\S]*?^<!-- rpg: end[^\n]*$/m;

/** How a host starts the rpg server: on Windows through cmd. */
export function rpgServer(platform: string): { command: string; args: string[]; }
{
    return platform === "win32" ? { command: "cmd", args: ["/c", "rpg", "mcp"] } : { command: "rpg", args: ["mcp"] };
}

/** The host files of a campaign that are missing or out of date, with the engine's texts given; a broken settings file of a host stops it with how to fix it. */
export function hostFileChanges(root: string, instructions: HostInstructions, platform: string): HostFile[]
{
    return hostFiles(root, instructions, platform).map((file) => file()).filter((file) => file !== undefined);
}

/** Brings the host files of a campaign up to date, as the MCP server starts: a file that cannot be read or written stays as it is. */
export function refreshHostFiles(root: string, instructions: HostInstructions, platform: string): void
{
    for (const change of hostFiles(root, instructions, platform)) {
        try {
            const file = change();

            if (file !== undefined) {
                writeHostFile(file);
            }
        } catch {
            // The game goes on with the file as it is.
        }
    }
}

/**
 * Writes the master's effort the player chose where each host reads it, as config sets it (D-462); with `cleared`, takes it away, and each app keeps its own.
 * What could not be written, by file.
 */
export function writeEffortFiles(root: string, platform: string, cleared = false): string[]
{
    const effort: Effort | undefined = cleared ? "app" : chosenEffort(root);
    return [() => claudeSettingsFile(root, effort), () => codexConfigFile(root, platform, effort)].flatMap((change) => {
        try {
            const file = change();

            if (file !== undefined) {
                writeHostFile(file);
            }

            return [];
        } catch (error) {
            return [error instanceof Error ? error.message : String(error)];
        }
    });
}

function hostFiles(root: string, instructions: HostInstructions, platform: string): (() => HostFile | undefined)[]
{
    return [
        () => agentsFile(root, instructions.start),
        () => claudeFile(root),
        () => claudeSettingsFile(root),
        () => characterAgentFile(root, instructions.character),
        () => codexConfigFile(root, platform),
    ];
}

/** An effort for the hosts' files (D-462): one the player chose, or app, the player's choice to take it away. */
type Effort = (typeof efforts)[number] | "app";

/** The master's effort the player chose (D-462), for each host's file; undefined when unset, and what the files hold stays. */
function chosenEffort(root: string): (typeof efforts)[number] | undefined
{
    const effort = readTextSetting(root, "effort");
    return efforts.find((one) => one === effort);
}

/** AGENTS.md with the start lines between rpg's marks: rewritten when they changed, put first when the file has none, as in a folder that already had one. */
function agentsFile(root: string, startLines: string): HostFile | undefined
{
    const path = join(root, "AGENTS.md");
    const text = files().fresh(path);
    const block = [startMark, startLines, endMark].join("\n");

    if (text === undefined) {
        return { path, text: `${block}\n` };
    }

    const lines = text.replace(/\r\n/g, "\n");
    const updated = markedBlock.test(lines) ? lines.replace(markedBlock, () => block) : `${block}\n\n${lines}`;
    return updated === lines ? undefined : { path, text: text.includes("\r\n") ? updated.replace(/\n/g, "\r\n") : updated };
}

/**
 * Whether the campaign has the character agent as a Claude Code agent (D-490): looked at as the MCP server starts, before it writes its host files, it says whether
 * the chat found the agent, as Claude Code reads its agents only when a chat starts.
 */
export function hasCharacterAgent(root: string): boolean
{
    return files().fresh(characterAgentPath(root)) !== undefined;
}

function characterAgentPath(root: string): string
{
    return join(root, ".claude", "agents", "rpg-character.md");
}

/**
 * The character agent as a Claude Code agent (D-490): the engine's, rewritten when it changed. It reads only its character's view, and not the campaign's CLAUDE.md,
 * the master's instructions.
 */
function characterAgentFile(root: string, instructions: string): HostFile | undefined
{
    const path = characterAgentPath(root);

    // The player wants the master to voice every character.
    if (readTextSetting(root, "voices") === "master") {
        return files().fresh(path) === undefined ? undefined : { path };
    }

    const text = [
        "---",
        "# Written by rpg, which writes it again as the game starts: a change made here does not last.",
        "name: rpg-character",
        "description: Voices one character of the campaign at a key moment, knowing only what they know. Begin with their name, then the moment, as Voices says.",
        "tools: mcp__rpg__view",
        "model: inherit",
        "omitClaudeMd: true",
        "---",
        "",
        instructions,
        "",
    ].join("\n");
    return files().fresh(path)?.replace(/\r\n/g, "\n") === text ? undefined : { path, text };
}

/** CLAUDE.md, which Claude Code reads, importing AGENTS.md: added first to one that does not. */
function claudeFile(root: string): HostFile | undefined
{
    const path = join(root, "CLAUDE.md");
    const text = files().fresh(path);

    if (text === undefined) {
        return { path, text: "@AGENTS.md\n" };
    }

    return text.split(/\r?\n/).some((line) => line.trim() === "@AGENTS.md") ? undefined : { path, text: `@AGENTS.md\n${text}` };
}

/**
 * Claude Code's settings for the campaign: its auto memory off, and the rpg server of .mcp.json approved with its tools allowed, so that the first chat neither
 * asks whether to use it, with "continue without" chosen, nor asks for each tool (D-412); a value already written there is the player's, and stays, but the
 * effort the player chose in the campaign (D-462).
 */
function claudeSettingsFile(root: string, effort = chosenEffort(root) as Effort | undefined): HostFile | undefined
{
    const path = join(root, ".claude", "settings.json");
    const text = files().fresh(path);
    const settings = text === undefined ? {} : jsonObject(path, text, "Claude Code cannot be set up for the game in it");
    const permissions = isObject(settings.permissions) ? settings.permissions : {};
    const environment = isObject(settings.env) ? settings.env : {};
    const hooks = isObject(settings.hooks) ? settings.hooks : {};
    const stops = Array.isArray(hooks.Stop) ? hooks.Stop as unknown[] : [];
    const belled = stops.some((entry) => isObject(entry) && Array.isArray(entry.hooks) && entry.hooks.some((hook) => isObject(hook) && hook.command === bellHook.command));
    const wanted: Record<string, unknown> = {
        ...settings,
        autoMemoryEnabled: settings.autoMemoryEnabled ?? false,
        enabledMcpjsonServers: settings.enabledMcpjsonServers ?? ["rpg"],
        permissions: { ...permissions, allow: permissions.allow ?? ["mcp__rpg"] },
        // The character agent answers within the master's turn, never after it (D-490): no task of the chat runs in the background.
        env: { ...environment, CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: environment.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS ?? "1" },
        // The doorbell of the player's sentences on the dashboard (D-495), put back beside the player's own hooks whenever it is missing; a Stop of theirs
        // that is no list stays theirs.
        hooks: hooks.Stop !== undefined && !Array.isArray(hooks.Stop) ? hooks : { ...hooks, Stop: belled ? stops : [...stops, { hooks: [bellHook] }] },
        ...(effort === undefined || effort === "app" ? {} : { effortLevel: effort }),
    };

    if (effort === "app") {
        delete wanted.effortLevel;
    }

    return text !== undefined && JSON.stringify(wanted) === JSON.stringify(settings) ? undefined : { path, text: settingsText(wanted) };
}

// Claude Code's Stop hook for the doorbell (D-495): it waits in the background from the end of each turn, and wakes the chat only for a sentence the player
// said on the dashboard; a day at most, until the next turn starts another.
const bellHook = { type: "command", command: "rpg --listen", asyncRewake: true, timeout: 86_400 };

/**
 * Codex's settings for the campaign, read when the player trusts the folder: the rpg server, its tools approved and its calls waiting for the player's click
 * as long as the server does (D-412), with Codex's own home, where its queue takes the player's sentences (D-495), and its memories off; a table already
 * written is the player's, and stays. The effort the player chose (D-462) is a key
 * of the top, before the first table, where Codex reads it; under a table it would belong to that table, and be ignored.
 */
function codexConfigFile(root: string, platform: string, effort = chosenEffort(root) as Effort | undefined): HostFile | undefined
{
    const path = join(root, ".codex", "config.toml");
    const before = files().fresh(path) ?? "";
    const text = effort === undefined ? before : withTopKey(before, "model_reasoning_effort", effort === "app" ? undefined : effort);
    const server = rpgServer(platform);
    const tables: [string, string][] = [
        ["mcp_servers.rpg", `command = ${JSON.stringify(server.command)}\nargs = [${server.args.map((arg) => JSON.stringify(arg)).join(", ")}]\ntool_timeout_sec = 1800\ndefault_tools_approval_mode = "approve"\nenv_vars = ["CODEX_HOME"]`],
        ["memories", "generate_memories = false\nuse_memories = false"],
    ];
    // A table's header with a comment after it is that table all the same.
    const missing = tables.filter(([name]) => !text.split(/\r?\n/).some((line) => line.replace(/#.*$/, "").trim() === `[${name}]`));
    const parts = [text.trimEnd(), ...missing.map(([name, body]) => `[${name}]\n${body}`)].filter((part) => part !== "");
    return missing.length === 0 && text === before ? undefined : { path, text: `${parts.join("\n\n")}\n` };
}

/**
 * A TOML text with a key of its top set to a value, before the first table, in place of the one there, quoted or not; without a value, the key taken away.
 * As it is when nothing changes.
 */
function withTopKey(text: string, key: string, value: string | undefined): string
{
    const plain = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    const lines = plain.split("\n");
    // A table's header, its keys bare or quoted as [profiles."deep think"], not a line of an array that begins with a bracket.
    const firstTable = lines.findIndex((line) => /^\s*\[\[?\s*(?:[\w-]+|"[^"]*"|'[^']*')(?:\s*\.\s*(?:[\w-]+|"[^"]*"|'[^']*'))*\s*\]\]?\s*(#.*)?$/.test(line));
    const keyLine = new RegExp(`^\\s*"?${key}"?\\s*=`);
    const top = (firstTable === -1 ? lines : lines.slice(0, firstTable)).filter((line) => !keyLine.test(line));
    const rest = firstTable === -1 ? [] : lines.slice(firstTable);
    const head = [...(value === undefined ? [] : [`${key} = ${JSON.stringify(value)}`]), ...top].join("\n").trimEnd();
    const joined = [head, rest.join("\n")].filter((part) => part.trim() !== "").join("\n\n");
    return joined.trimEnd() === plain.trimEnd() ? text : joined;
}

/** A host's settings file read as a JSON object; refused, with how to fix it, when it is not one. */
function jsonObject(path: string, text: string, cannot: string): Record<string, unknown>
{
    let settings: unknown;

    try {
        settings = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
        settings = undefined;
    }

    if (!isObject(settings)) {
        throw new Error(`${path} is not valid JSON, so ${cannot}. Fix it or remove it by hand, then try again.`);
    }

    return settings;
}

function isObject(value: unknown): value is Record<string, unknown>
{
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function settingsText(settings: object): string
{
    return `${JSON.stringify(settings, null, 2)}\n`;
}
