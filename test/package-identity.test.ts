// What a package on this computer is (D-537, hostile inputs): in npm's folder a package is where its name puts it, never an alias whose package.json says it is
// ours; a game system whose system.yaml does not read leaves the others listed.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { packageFoldersIn } from "../src/core/files.ts";
import { findSystem, readableSystems } from "../src/systems/index.ts";
import { madeSystem, makeTempFolder } from "./support.ts";

describe("a package in npm's folder", () => {
    it("is where its name puts it: an alias whose package.json names one of ours is no package", () => {
        const root = makeTempFolder();
        writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { "0skies": "npm:0skies@1.0.0", "@rpgengine/skies": "1.0.0" } }));

        for (const [folder, name] of [["0skies", "@rpgengine/skies"], ["@rpgengine/skies", "@rpgengine/skies"]]) {
            mkdirSync(join(root, "node_modules", ...folder.split("/")), { recursive: true });
            writeFileSync(join(root, "node_modules", ...folder.split("/"), "package.json"), JSON.stringify({ name, version: "1.0.0" }));
        }

        expect(packageFoldersIn([join(root, "node_modules")])).toEqual([join(root, "node_modules", "@rpgengine", "skies")]);
    });
});

describe("a game system that does not read", () => {
    it("leaves the others listed, and says why to the campaign that plays it", () => {
        const broken = madeSystem("broken", { "system.yaml": "title: [unclosed\n" });
        const fine = madeSystem("fine", { "system.yaml": "title: a fine system\nlanguage: en\n" });
        expect(readableSystems([broken, fine]).map((system) => system.name)).toEqual(["fine"]);
        expect(() => findSystem([broken], "broken")).toThrow();
    });
});
