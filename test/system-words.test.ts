// A game system's words in the languages it ships (D-403): read from words/<code>.yaml beside its system.yaml, by the language or its base language; a file
// that does not read says how to fix it; a language the system lacks gives none.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { systemWords } from "../src/systems/index.ts";
import { makeTempFolder } from "./support.ts";

describe("a game system's words (D-403)", () => {
    it("reads the words of a language, or of its base language, and none for a language the system lacks", () => {
        const folder = makeTempFolder();
        mkdirSync(join(folder, "words"));
        writeFileSync(join(folder, "words", "it.yaml"), 'groups: {Skills: Abilità}\nfields: {str: FOR}\nwords: {Cleric: Chierico}\nheadline: "{classes} di livello {level}"\n');
        const italian = { groups: { Skills: "Abilità" }, fields: { str: "FOR" }, words: { Cleric: "Chierico" }, headline: "{classes} di livello {level}" };
        expect(systemWords(folder, "it")).toEqual(italian);
        expect(systemWords(folder, "it-CH")).toEqual(italian);
        expect(systemWords(folder, "ja")).toBeUndefined();
    });

    it("says how to fix a file that does not read", () => {
        const folder = makeTempFolder();
        mkdirSync(join(folder, "words"));
        writeFileSync(join(folder, "words", "de.yaml"), "group: {Skills: Fertigkeiten}\n");
        expect(() => systemWords(folder, "de")).toThrow(/cannot be read.*Fix the file/);
    });
});
