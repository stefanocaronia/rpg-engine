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
        const other = join(systems, "other");
        mkdirSync(other);
        writeFileSync(join(other, "package.json"), JSON.stringify({ main: "index.js", "rpg-engine": { kind: "extension" } }));
        const loaded = await loadSystemCode([systems]);
        expect(loaded.broken).toEqual({ problem: expect.stringContaining("has no default export that gives its hooks") });
        expect(loaded.other).toBeUndefined();
        expect(systemHasCode(other)).toBe(false);
    });
});
