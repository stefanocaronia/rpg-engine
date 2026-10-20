// The code a game system brings (D-448): loaded once from its package.json of kind system, from its source where the engine runs from its own; a system
// without one has none, and code that cannot load says why.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findSystem, loadSystemCode, systemHasCode } from "../src/systems/index.ts";
import { makeTempFolder, testSystemFolders } from "./support.ts";

describe("the code of a game system (D-448)", () => {
    it("loads the 5e's hooks, and none for a system without a package of kind system, as Ironsworn", async () => {
        const loaded = await loadSystemCode(testSystemFolders);
        expect(Object.keys(loaded)).toEqual(["5e"]);
        expect(loaded["5e"]).toHaveProperty("hooks");
        expect(findSystem(testSystemFolders, "5e")?.code).toBe(true);
        expect(findSystem(testSystemFolders, "ironsworn")?.code).toBe(false);
    });

    it("says why code that gives no hooks cannot load, and leaves a package of another kind alone", async () => {
        const systems = makeTempFolder();
        const broken = join(systems, "broken");
        mkdirSync(join(broken, "dist"), { recursive: true });
        writeFileSync(join(broken, "package.json"), JSON.stringify({ type: "module", main: "dist/index.js", "rpg-engine": { kind: "system" } }));
        writeFileSync(join(broken, "dist", "index.js"), "export const nothing = 1;\n");
        // A system is a folder with a system.yaml: its code is loaded only then.
        writeFileSync(join(broken, "system.yaml"), "title: a broken system\nlanguage: en\n");
        const other = join(systems, "other");
        mkdirSync(other);
        writeFileSync(join(other, "package.json"), JSON.stringify({ main: "index.js", "rpg-engine": { kind: "extension" } }));
        const loaded = await loadSystemCode([systems]);
        expect(loaded.broken).toEqual({ problem: expect.stringContaining("has no default export that gives its hooks") });
        expect(loaded.other).toBeUndefined();
        expect(systemHasCode(other)).toBe(false);
    });

    it("loads only what the player installed, never a system npm brought as another package's dependency, nor a second of the same name (D-485)", async () => {
        const modules = join(makeTempFolder(), "node_modules");

        const system = (path: string, title: string): void => {
            mkdirSync(join(modules, path, "dist"), { recursive: true });
            writeFileSync(join(modules, path, "package.json"), JSON.stringify({ type: "module", main: "dist/index.js", "rpg-engine": { kind: "system" } }));
            writeFileSync(join(modules, path, "dist", "index.js"), "export default () => ({});\n");
            writeFileSync(join(modules, path, "system.yaml"), `title: ${title}\nlanguage: en\n`);
        };

        system("@test/system-evil", "brought along");
        system("@test/system-ironsworn", "another Ironsworn");
        system("@test/system-mine", "the player's own");
        writeFileSync(join(modules, "..", "package.json"), JSON.stringify({ dependencies: { "@test/system-mine": "1.0.0", "@test/system-ironsworn": "1.0.0" } }));
        const loaded = await loadSystemCode([...testSystemFolders, modules]);
        expect(Object.keys(loaded).sort()).toEqual(["5e", "mine"]);
    });
});
