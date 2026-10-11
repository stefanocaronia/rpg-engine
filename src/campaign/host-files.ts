// What an AI host reads in a campaign besides .mcp.json: AGENTS.md, opening with the start lines (D-97); CLAUDE.md, which imports it; Claude Code's settings,
// with its auto memory off, so that the master keeps nothing outside the campaign (D-242); Codex's, with its memories off, and Gemini CLI's, with the rpg server,
// AGENTS.md and no writing of files by itself, where a memory would go (D-362).
import { join } from "node:path";
import { files } from "../core/store.ts";

/** The files of the AI hosts at the top of a campaign, which are not the game's: a save leaves them as they are (SAV-2). */
export const hostFileNames = ["AGENTS.md", "CLAUDE.md", "CLAUDE.local.md", "GEMINI.md"];

/** A file to write, with its new text. */
export interface HostFile
{
    path: string;
    text: string;
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

/** The host files of a campaign that are missing or out of date, with the start lines given; a broken settings file of a host stops it with how to fix it. */
export function hostFileChanges(root: string, startLines: string, platform: string): HostFile[]
{
    return hostFiles(root, startLines, platform).map((file) => file()).filter((file) => file !== undefined);
}

/** Brings the host files of a campaign up to date, as the MCP server starts: a file that cannot be read or written stays as it is. */
export function refreshHostFiles(root: string, startLines: string, platform: string): void
{
    for (const change of hostFiles(root, startLines, platform)) {
        try {
            const file = change();

            if (file !== undefined) {
                files().write(file.path, file.text);
            }
        } catch {
            // The game goes on with the file as it is.
        }
    }
}

function hostFiles(root: string, startLines: string, platform: string): (() => HostFile | undefined)[]
{
    return [() => agentsFile(root, startLines), () => claudeFile(root), () => claudeSettingsFile(root), () => codexConfigFile(root), () => geminiSettingsFile(root, platform)];
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

/** Claude Code's settings for the campaign, with its auto memory off; a value already written there is the player's, and stays. */
function claudeSettingsFile(root: string): HostFile | undefined
{
    const path = join(root, ".claude", "settings.json");
    const text = files().fresh(path);

    if (text === undefined) {
        return { path, text: settingsText({ autoMemoryEnabled: false }) };
    }

    const settings = jsonObject(path, text, "Claude Code's auto memory cannot be turned off in it");
    return "autoMemoryEnabled" in settings ? undefined : { path, text: settingsText({ ...settings, autoMemoryEnabled: false }) };
}

/** Codex's settings for the campaign, with its memories off, read when the player trusts the folder; a [memories] table already written is the player's, and stays. */
function codexConfigFile(root: string): HostFile | undefined
{
    const path = join(root, ".codex", "config.toml");
    const text = files().fresh(path);
    const table = "[memories]\ngenerate_memories = false\nuse_memories = false\n";

    if (text === undefined || text.trim() === "") {
        return { path, text: table };
    }

    return /^\s*\[memories\]\s*$/m.test(text) ? undefined : { path, text: `${text.trimEnd()}\n\n${table}` };
}

/**
 * Gemini CLI's settings for the campaign, read when the player trusts the folder: the rpg server, AGENTS.md as the file it reads, and write_file and replace
 * excluded, so that the master writes only through rpg's tools and keeps no memory in files; what the player already wrote there stays.
 */
function geminiSettingsFile(root: string, platform: string): HostFile | undefined
{
    const path = join(root, ".gemini", "settings.json");
    const text = files().fresh(path);
    const settings = text === undefined ? {} : jsonObject(path, text, "Gemini CLI cannot be set to find the rpg server in it");

    // Each value the player already wrote stays where it is: the file is written again only for what is missing.
    const withDefault = (name: string, key: string, value: unknown): Record<string, unknown> => {
        const part = isObject(settings[name]) ? settings[name] : {};
        return key in part ? part : { ...part, [key]: value };
    };

    const wanted = {
        ...settings,
        mcpServers: withDefault("mcpServers", "rpg", rpgServer(platform)),
        context: withDefault("context", "fileName", ["AGENTS.md"]),
        tools: withDefault("tools", "exclude", ["write_file", "replace"]),
    };
    return text !== undefined && JSON.stringify(wanted) === JSON.stringify(settings) ? undefined : { path, text: settingsText(wanted) };
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
        throw new Error(`${path} is not valid JSON, so ${cannot}. Fix it or remove it by hand, then create the campaign again.`);
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
