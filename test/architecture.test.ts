import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceFolder = new URL("../src/", import.meta.url);

// A module is a folder of src/ other than core (the shared utilities) and commands (the glue between modules).
const modules = readdirSync(sourceFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "core" && entry.name !== "commands")
    .map((entry) => entry.name);

describe("architecture", () => {
    it("finds the modules", () => {
        expect(modules).toEqual(expect.arrayContaining(["campaign", "dice", "pages", "counters"]));
    });

    it("keeps every module independent: it imports only its own files, the core utilities, Node and packages", () => {
        for (const module of modules) {
            const folder = new URL(`${module}/`, sourceFolder);
            // Its code, not the pictures and style sheets a module such as the dashboard holds.
            const sources = readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name));

            for (const { name: fileName } of sources) {
                const source = readFileSync(new URL(fileName, folder), "utf8");

                // from "x", import "x" and import("x")
                for (const [, imported] of source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
                    const allowed = imported.startsWith("./") || imported.startsWith("../core/") || !imported.startsWith(".");
                    expect(allowed, `${module}/${fileName} imports ${imported}`).toBe(true);
                }
            }
        }
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
            "extensions/packages.ts",
            // How rpg-engine itself is installed, by npm's global folder (D-515).
            "extensions/engine.ts",
            "extensions/tarball.ts",
            // The player's yes to another's code, for its files as installed (D-478, D-510, D-511).
            "core/consents.ts",
            "systems/words.ts",
            "campaign/create-campaign.ts",
            "pictures/claude.ts",
            "pictures/codex.ts",
            "pictures/helpers.ts",
            "page-words.ts",
            "documents/read.ts",
            "importer/work.ts",
            "library/books.ts",
            "library/folders.ts",
            // The test kit for extensions makes its campaigns in temporary folders, its extensions linked into them (D-506).
            "testing.ts",
        ];
        const sources = (readdirSync(sourceFolder, { recursive: true }) as string[]).map((path) => path.replaceAll("\\", "/")).filter((path) => path.endsWith(".ts"));
        const touching = sources.filter((path) => /from "node:fs(\/promises)?"/.test(readFileSync(new URL(path, sourceFolder), "utf8")));
        expect(touching.sort()).toEqual(allowed.sort());
    });
});
