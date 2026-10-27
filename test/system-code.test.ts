// The code a game system brings (D-448, D-514): loaded once from its package.json of kind system, from its source where the engine runs from its own, made
// for the API this engine reads; a system without one has none, and code that cannot load says why.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { recordConsent } from "../src/core/consents.ts";
import { findSystem, loadSystemCode, systemApiProblem, systemHasCode } from "../src/systems/index.ts";
import { makeTempFolder, testSystemFolders } from "./support.ts";

describe("the code of a game system (D-448)", () => {
    it("loads the code of a system with a package of kind system, as the fake one, and none for one without, as free", async () => {
        const loaded = await loadSystemCode(testSystemFolders);
        expect(Object.keys(loaded)).toEqual(["fake"]);
        expect(loaded.fake).toHaveProperty("code");
        expect(findSystem(testSystemFolders, "fake")?.code).toBe(true);
        expect(findSystem(testSystemFolders, "free")?.code).toBe(false);
    });

    it("says why code that gives nothing cannot load, and leaves a package of another kind alone", async () => {
        const systems = makeTempFolder();
        const broken = join(systems, "broken");
        mkdirSync(join(broken, "dist"), { recursive: true });
        writeFileSync(join(broken, "package.json"), JSON.stringify({ type: "module", main: "dist/index.js", "rpg-engine": { kind: "system", api: 5 } }));
        writeFileSync(join(broken, "dist", "index.js"), "export const nothing = 1;\n");
        // A system is a folder with a system.yaml: its code is loaded only then.
        writeFileSync(join(broken, "system.yaml"), "title: a broken system\nlanguage: en\n");
        const other = join(systems, "other");
        mkdirSync(other);
        writeFileSync(join(other, "package.json"), JSON.stringify({ main: "index.js", "rpg-engine": { kind: "extension" } }));
        const loaded = await loadSystemCode([systems]);
        expect(loaded.broken).toEqual({ problem: expect.stringContaining("has no default export that gives its code"), version: "0.0.0" });
        expect(loaded.other).toBeUndefined();
        expect(systemHasCode(other)).toBe(false);
    });

    it("loads only what the player installed, never a system npm brought as another package's dependency, nor a second of the same name (D-485)", async () => {
        const modules = join(makeTempFolder(), "node_modules");

        const system = (path: string, title: string): void => {
            mkdirSync(join(modules, path, "dist"), { recursive: true });
            writeFileSync(join(modules, path, "package.json"), JSON.stringify({ type: "module", main: "dist/index.js", "rpg-engine": { kind: "system", api: 5 } }));
            writeFileSync(join(modules, path, "dist", "index.js"), "export default () => ({});\n");
            writeFileSync(join(modules, path, "system.yaml"), `title: ${title}\nlanguage: en\n`);
        };

        system("@test/system-evil", "brought along");
        system("@test/system-free", "another free");
        system("@test/system-mine", "the player's own");
        writeFileSync(join(modules, "..", "package.json"), JSON.stringify({ dependencies: { "@test/system-mine": "1.0.0", "@test/system-free": "1.0.0" } }));
        const loaded = await loadSystemCode([...testSystemFolders, modules]);
        expect(Object.keys(loaded).sort()).toEqual(["fake", "mine"]);
    });

    it("runs another's code only after the player's yes, for its version and its files: a file changed since stops it again (D-478, D-511)", async () => {
        const modules = join(makeTempFolder(), "node_modules");
        const folder = join(modules, "@test", "system-odd");
        mkdirSync(join(folder, "dist"), { recursive: true });
        writeFileSync(join(folder, "package.json"), JSON.stringify({ name: "@test/system-odd", version: "1.0.0", type: "module", main: "dist/index.js", "rpg-engine": { kind: "system", api: 5 } }));
        writeFileSync(join(folder, "dist", "index.js"), "export default () => ({});\n");
        writeFileSync(join(folder, "system.yaml"), "title: another's system\nlanguage: en\n");
        writeFileSync(join(modules, "..", "package.json"), JSON.stringify({ dependencies: { "@test/system-odd": "1.0.0" } }));

        expect((await loadSystemCode([modules])).odd).toEqual({ refused: expect.stringContaining("the player has not said yes to it"), version: "1.0.0" });
        recordConsent(folder, "@test/system-odd", "1.0.0");
        expect((await loadSystemCode([modules])).odd).toHaveProperty("code");
        writeFileSync(join(folder, "system.yaml"), "title: another's system, changed\nlanguage: en\n");
        expect((await loadSystemCode([modules])).odd).toHaveProperty("refused");
    });

    it("reads a system made for the API 5, the first of a system, up to its own: a newer one asks to update rpg-engine, an older one or none a newer version of it (D-515)", async () => {
        const systems = makeTempFolder();

        const system = (name: string, api: number | undefined, extra = ""): string => {
            const folder = join(systems, name);
            mkdirSync(join(folder, "dist"), { recursive: true });
            writeFileSync(join(folder, "package.json"), JSON.stringify({ name: `@rpgengine/system-${name}`, version: "1.0.0", type: "module", main: "dist/index.js", "rpg-engine": { kind: "system", api } }));
            writeFileSync(join(folder, "dist", "index.js"), "export default () => ({});\n");
            writeFileSync(join(folder, "system.yaml"), `title: a system for the API ${api ?? "none"}\nlanguage: en\n${extra}`);
            return folder;
        };

        system("newer", 6, "shiny: a key of a newer engine\n");
        system("older", 1);
        system("unsaid", undefined);
        const now = system("now", 5);
        const loaded = await loadSystemCode([systems]);
        expect(loaded.newer).toEqual({
            refused:
                "is made for the API 6, and this rpg-engine reads the API 5 for a game system: rpg-engine must be updated first: ask the player to update it on the Packages page of their dashboard, or as they installed it, then open a new chat",
            version: "1.0.0",
        });
        expect(loaded.older).toEqual({ refused: "is made for the API 1, and this rpg-engine reads the API 5 for a game system: install a newer version of it", version: "1.0.0" });
        expect(loaded.unsaid).toHaveProperty("refused", expect.stringContaining("no API, as its package.json does not name one in rpg-engine.api"));
        expect(loaded.now).toHaveProperty("code");
        expect(systemApiProblem(now)).toBeUndefined();
        // Its system.yaml with a key this engine does not know says to update it, beside what zod says.
        expect(() => findSystem([systems], "newer")).toThrow(/unknown key "shiny"\. Besides, it is made for the API 6, .*: rpg-engine must be updated first: .*, then open a new chat\.$/);
        // A folder without a package.json is data alone, read whatever API: free.
        expect(systemApiProblem(findSystem(testSystemFolders, "free")?.folder ?? "")).toBeUndefined();
    });
});
