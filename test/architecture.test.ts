import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";
import { hostIds, hosts } from "../src/core/hosts.ts";

const sourceFolder = new URL("../src/", import.meta.url);

// A module is a folder of src/ other than core (the shared utilities), commands (the glue between modules), server and cli, the processes that serve them,
// and testing, the kit that plays the commands for packages' tests.
const modules = readdirSync(sourceFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !["core", "commands", "server", "cli", "testing"].includes(entry.name))
    .map((entry) => entry.name);

describe("architecture", () => {
    it("finds the modules", () => {
        expect(modules).toEqual(expect.arrayContaining(["campaign", "dice", "pages", "counters"]));
    });

    it("keeps every module independent: it imports only its own files, in any of its folders, the core utilities, Node and packages", () => {
        const checked: string[] = [];

        for (const module of modules) {
            // Its code in every subfolder, not the pictures and style sheets a module such as the dashboard holds.
            const sources = (readdirSync(new URL(`${module}/`, sourceFolder), { recursive: true }) as string[]).map((path) => `${module}/${path.replaceAll("\\", "/")}`).filter((path) => /\.tsx?$/.test(path));

            for (const path of sources) {
                const source = readFileSync(new URL(path, sourceFolder), "utf8");
                checked.push(path);

                // from "x", import "x" and import("x"); a relative one must land inside the module's folder or in core/.
                for (const [, imported] of source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
                    const target = posix.join(posix.dirname(path), imported);
                    const allowed = !imported.startsWith(".") || target.startsWith(`${module}/`) || target.startsWith("core/");
                    expect(allowed, `${path} imports ${imported}`).toBe(true);
                }
            }
        }

        expect(checked).toEqual(expect.arrayContaining(["dashboard/dice/roller.ts", "pages/stacks/entry.ts"]));
    });

    it("reads and writes the campaign only through the store of the call, so that the MCP server can keep it (D-137, D-194)", () => {
        // The store itself, and what reads the package rather than a campaign: its version, its instructions, its game systems; init looks for campaigns below;
        // the installed extensions and a package's .tgz (D-436, D-452); Codex's own folders, outside the campaign, where a picture is made (D-308); the player's data folder, where the page's words translated on the fly are (D-406); the engine's own folder of programs, Codex and Claude Code (D-425); the player's documents, and the import's folder, which the importer's helper writes in from another process (D-489); the player's books and their index in the data folder (D-491).
        const allowed = [
            "core/files.ts",
            "core/session-store.ts",
            "core/store.ts",
            "core/version.ts",
            "instructions/index.ts",
            "systems/code.ts",
            "systems/folders.ts",
            "extensions/extension.ts",
            // npm for every package, and a package's .tgz unpacked (D-452).
            "packages/npm.ts",
            "packages/tarball.ts",
            // How rpg-engine itself is installed, by npm's global folder (D-515).
            "packages/engine.ts",
            // The player's yes to another's code, for its files as installed (D-478, D-510, D-511).
            "core/consents.ts",
            "systems/words.ts",
            // A game system's theme of the dashboard, read in its package's folder (D-528).
            "themes/theme.ts",
            "campaign/create-campaign.ts",
            // OpenCode's plugin, read from the package, and whether Antigravity is installed (D-578).
            "campaign/host-files.ts",
            // Antigravity's own history and log, outside the campaign, which tell the doorbell the player wrote in the chat (D-578).
            "server/bell/antigravity.ts",
            // The fence of Antigravity's importer, a file of the engine's outside the campaign (D-579 (1)).
            "server/fence.ts",
            // Which campaign each conversation of Antigravity's app plays, in the player's data folder, for the router (D-578).
            "server/route/notes.ts",
            // Where each campaign's table is found, in the player's data folder (D-582).
            "server/table/place.ts",
            // Whether the folder of each campaign the launcher lists answers, asked without blocking, as a network share may not.
            "server/launcher/campaigns.ts",
            // The engine's own files in the player's data folder, written whole or not at all: the places of the tables and the launcher, the campaigns it
            // remembers, a campaign's last chat, the icon's notes.
            "core/data-file.ts",
            // The browsers installed, looked for by their files, for the launcher's window.
            "desktop/browser.ts",
            // The icon on the desktop and in the menu.
            "desktop/icon/index.ts",
            "desktop/icon/linux.ts",
            "desktop/icon/macos.ts",
            // Why rpg open could not reach the launcher, in the player's data folder, for the icon that has no console.
            "cli/open.ts",
            // Claude Code's own program, looked for in the folders of the PATH and the player's home, for the table's chat with the master.
            "master/claude-code/program.ts",
            // The player's last choices, in their data folder: what a new campaign's setup suggests (T-134).
            "campaign/last-choices.ts",
            // Codex's own folders where a picture is made, and the engine's folder of programs (D-308, D-425).
            // Antigravity's writer in a folder of its own, with its settings beside it (D-579 (1)).
            "helpers/antigravity.ts",
            "helpers/claude.ts",
            "helpers/codex.ts",
            // OpenCode's writer in a folder of its own, and the player's model read from OpenCode's state folder (D-578 (3)).
            "helpers/opencode.ts",
            "helpers/programs.ts",
            // The page's words translated on the fly, in the player's data folder (D-406).
            "commands/shared/books/words.ts",
            // What npm said of the campaign's packages today, in the player's data folder, apart from any campaign (D-569).
            "commands/shared/packages/updates.ts",
            "documents/read.ts",
            "importer/work.ts",
            "library/books.ts",
            "library/folders.ts",
            // The mark of the one process that reads the books or runs an import, beside their folders (LIB-3).
            "core/process-mark.ts",
            // The chats the AI hosts keep in their own folders, outside the campaign (T-225).
            "chats/read.ts",
            // The .git above a campaign, and the index of its own each commit is made on, in the temporary folder (D-576).
            "git/git.ts",
            // The test kit for extensions makes its campaigns in temporary folders, its extensions linked into them (D-506).
            "testing/index.ts",
            // And its checks of a game system's own folder, read as it is, never a campaign (D-514).
            "testing/system-checks.ts",
        ];
        const sources = (readdirSync(sourceFolder, { recursive: true }) as string[]).map((path) => path.replaceAll("\\", "/")).filter((path) => path.endsWith(".ts"));
        const touching = sources.filter((path) => /from "node:fs(\/promises)?"/.test(readFileSync(new URL(path, sourceFolder), "utf8")));
        expect(touching.sort()).toEqual(allowed.sort());
    });

    it("stops a process tree and reads lines in one place", () => {
        const holding = codeFiles().filter((path) => /taskkill|from "node:readline"/.test(readFileSync(new URL(path, sourceFolder), "utf8")));
        expect(holding).toEqual(["core/process.ts"]);
    });

    it("starts processes only where the list says", () => {
        const allowed = [
            // The engine's own: a process that speaks by lines, and stopping what any of these started.
            "core/process.ts",
            // git, for the campaign's commits and pushes.
            "git/git.ts",
            // npm, to read and install packages.
            "packages/npm.ts",
            // The AI programs that work outside the chat: Antigravity's agy, Claude Code, Codex and OpenCode.
            "helpers/antigravity.ts",
            "helpers/claude.ts",
            "helpers/codex.ts",
            "helpers/opencode.ts",
            // Finding, installing and signing in Codex and Claude Code, and queueing a message in Codex.
            "helpers/programs.ts",
            // The system's own window that asks the player.
            "confirm/confirm.ts",
            // Windows' own reader of text in pictures, through PowerShell.
            "documents/ocr.ts",
            // The engine itself, apart, to read the player's library.
            "commands/shared/books/library-reader.ts",
            // The engine itself, apart, to run an import.
            "server/context.ts",
            // The player's browser, asked which it is and started apart, for the launcher's window.
            "desktop/browser.ts",
            // PowerShell, which makes the icon's shortcuts on Windows; gio, which marks it trusted on a Linux desktop.
            "desktop/icon/windows.ts",
            "desktop/icon/linux.ts",
        ];
        const starting = codeFiles().filter((path) => /from "node:child_process"/.test(readFileSync(new URL(path, sourceFolder), "utf8")));
        expect(starting.sort()).toEqual(allowed.sort());
    });

    it("names an AI host only in the registry and in the files named after a host, or in a folder named after one", () => {
        const names = new Set<string>(hostIds.flatMap((id) => [id, hosts[id].client, hosts[id].hook]));
        // The files that still name a host by hand, each for its reason: a list meant to shrink.
        const exceptions = [
            // The hook's answers, by host.
            "server/bell/listener.ts",
            // The programs the engine runs outside the chat, named codex and claude: another vocabulary, until the registry joins the code that starts the hosts.
            "core/context.ts",
            "helpers/programs.ts",
            "commands/install.ts",
            "server/dashboard/index.ts",
            // The values of the campaign's setting of who makes the pictures, kept in campaigns' files.
            "campaign/settings.ts",
            "helpers/chosen.ts",
            "commands/config/dashboard.ts",
            // Each host's own folders and files, in a campaign and on the computer.
            "campaign/host-files.ts",
        ];
        const found = codeFiles().filter((path) => {
            const parts = path.replace(/\.tsx?$/, "").split("/");

            if (path === "core/hosts.ts" || parts.some((part) => names.has(part))) {
                return false;
            }

            // A whole literal in double or single quotes, or in backticks with nothing put in it; each looked for apart, as an apostrophe opens no literal.
            const source = readFileSync(new URL(path, sourceFolder), "utf8");
            return [/"([^"\n]*)"/g, /'([^'\n]*)'/g, /`([^`]*)`/g].some((literal) => [...source.matchAll(literal)].some(([, text]) => names.has(text)));
        });
        expect(found.sort()).toEqual(exceptions.sort());
    });

    it("keeps the servers of the page, the table, the launcher and the dashboard in one direction, each reached through its index", () => {
        // Who may import whom: the launcher the table and the page; the table the dashboard and the page; the dashboard the page; the page none of them.
        const mayImport: Record<string, string[]> = {
            "server/page": [],
            "server/dashboard": ["server/page"],
            "server/table": ["server/dashboard", "server/page"],
            "server/launcher": ["server/table", "server/page"],
        };
        const checked: string[] = [];

        for (const [folder, allowed] of Object.entries(mayImport)) {
            for (const path of codeFiles().filter((one) => one.startsWith(`${folder}/`))) {
                checked.push(path);

                for (const imported of importsOf(path)) {
                    const other = Object.keys(mayImport).find((one) => imported.startsWith(`${one}/`) && one !== folder);

                    if (other !== undefined) {
                        expect(allowed.includes(other), `${path} imports ${imported}`).toBe(true);
                        expect(imported, `${path} imports ${imported}, not its index`).toBe(`${other}/index.ts`);
                    }
                }
            }
        }

        expect(checked).toEqual(expect.arrayContaining(["server/launcher/serve.ts", "server/table/serve.ts", "server/page/index.ts"]));
    });

    it("starts the launcher without the commands: none is reached from it by a static import", () => {
        const reached = new Set<string>();
        const waiting = codeFiles().filter((path) => path.startsWith("server/launcher/"));

        while (waiting.length > 0) {
            const path = waiting.pop() ?? "";

            if (!reached.has(path)) {
                reached.add(path);
                waiting.push(...importsOf(path, "static").filter((imported) => codeFiles().includes(imported)));
            }
        }

        expect([...reached].filter((path) => path.startsWith("commands/"))).toEqual([]);
        expect(reached).toContain("server/table/index.ts");
    });
});

/** The files of src/ a file imports, by their path from src/: every import, or only those loaded with it, not types alone nor those loaded when asked. */
function importsOf(path: string, which: "all" | "static" = "all"): string[]
{
    const source = readFileSync(new URL(path, sourceFolder), "utf8");
    const imported = which === "all"
        ? [...source.matchAll(/(?:from|import)\s*\(?\s*"(\.[^"]+)"/g)].map(([, one]) => one)
        : [...source.matchAll(/^(?:import|export)(\s+type)?\b[^;]*?(?:from\s+)?"(\.[^"]+)";/gms)].filter(([, typesAlone]) => typesAlone === undefined).map(([, , one]) => one);
    return imported.map((one) => posix.join(posix.dirname(path), one ?? ""));
}

/** Every file of code under src/, the dashboard's page included, by its path from src/. */
function codeFiles(): string[]
{
    return (readdirSync(sourceFolder, { recursive: true }) as string[]).map((path) => path.replaceAll("\\", "/")).filter((path) => /\.tsx?$/.test(path));
}
