// What an AI host reads in a campaign besides .mcp.json: AGENTS.md, opening with the start lines (D-97); CLAUDE.md, which imports it; Claude Code's settings,
// with its auto memory off, so that the master keeps nothing outside the campaign (D-242).
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

/** The host files of a campaign that are missing or out of date, with the start lines given; a broken Claude Code settings file stops it with how to fix it. */
export function hostFileChanges(root: string, startLines: string): HostFile[]
{
    return [agentsFile(root, startLines), claudeFile(root), claudeSettingsFile(root)].filter((file) => file !== undefined);
}

/** Brings the host files of a campaign up to date, as the MCP server starts: a file that cannot be read or written stays as it is. */
export function refreshHostFiles(root: string, startLines: string): void
{
    for (const change of [() => agentsFile(root, startLines), () => claudeFile(root), () => claudeSettingsFile(root)]) {
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

    let settings: unknown;

    try {
        settings = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
        settings = undefined;
    }

    if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
        throw new Error(`${path} is not valid JSON, so Claude Code's auto memory cannot be turned off in it. Fix it or remove it by hand, then create the campaign again.`);
    }

    return "autoMemoryEnabled" in settings ? undefined : { path, text: settingsText({ ...settings, autoMemoryEnabled: false }) };
}

function settingsText(settings: object): string
{
    return `${JSON.stringify(settings, null, 2)}\n`;
}
