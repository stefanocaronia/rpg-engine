// A language package's phrases (D-485 (3)): a phrases.json that does not read gives none to the page, and a problem that names it.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { languagePackProblems, packPhrases } from "../src/languages/index.ts";
import { makeTempFolder } from "./support.ts";

describe("a language package's phrases", () => {
    it("gives none when phrases.json does not read, and names it among the problems", () => {
        const folder = makeTempFolder();
        writeFileSync(join(folder, "phrases.json"), "{ Settings: 'Einstellungen' }");
        const pack = { package: "@someone/rpg-de", version: "1.0.0", folder, code: "de", name: "Deutsch" };
        expect(packPhrases(pack)).toEqual({});
        expect(languagePackProblems(pack, ["Settings"]).problems[0]).toMatch(/^phrases\.json does not read as JSON: /);
    });
});
