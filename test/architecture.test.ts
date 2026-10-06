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

            for (const fileName of readdirSync(folder)) {
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
        // The store itself, and what reads the package rather than a campaign: its version, its instructions, its game systems; init looks for campaigns below.
        const allowed = ["core/files.ts", "core/store.ts", "core/version.ts", "instructions/index.ts", "systems/game-system.ts", "campaign/create-campaign.ts"];
        const sources = (readdirSync(sourceFolder, { recursive: true }) as string[]).map((path) => path.replaceAll("\\", "/")).filter((path) => path.endsWith(".ts"));
        const touching = sources.filter((path) => /from "node:fs(\/promises)?"/.test(readFileSync(new URL(path, sourceFolder), "utf8")));
        expect(touching.sort()).toEqual(allowed.sort());
    });
});
