import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sourceFolder = new URL("../src/", import.meta.url);

// A module is a folder of src/ other than core (the shared utilities) and commands (the glue between modules).
const modules = readdirSync(sourceFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "core" && entry.name !== "commands")
    .map((entry) => entry.name);

describe("architecture", () => {
    it("finds the modules", () => {
        expect(modules).toEqual(expect.arrayContaining(["campaign", "dice", "pages"]));
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
});
