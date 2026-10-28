import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

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
            "systems/system-code.ts",
            "systems/system-folders.ts",
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
            // Codex's own folders where a picture is made, and the engine's folder of programs (D-308, D-425).
            "helpers/claude.ts",
            "helpers/codex.ts",
            "helpers/programs.ts",
            // The page's words translated on the fly, in the player's data folder (D-406).
            "commands/shared/page-words.ts",
            "documents/read.ts",
            "importer/work.ts",
            "library/books.ts",
            "library/folders.ts",
            // The mark of the one process that reads the books or runs an import, beside their folders (LIB-3).
            "core/process-mark.ts",
            // The test kit for extensions makes its campaigns in temporary folders, its extensions linked into them (D-506).
            "testing/index.ts",
            // And its checks of a game system's own folder, read as it is, never a campaign (D-514).
            "testing/system-checks.ts",
        ];
        const sources = (readdirSync(sourceFolder, { recursive: true }) as string[]).map((path) => path.replaceAll("\\", "/")).filter((path) => path.endsWith(".ts"));
        const touching = sources.filter((path) => /from "node:fs(\/promises)?"/.test(readFileSync(new URL(path, sourceFolder), "utf8")));
        expect(touching.sort()).toEqual(allowed.sort());
    });
});
