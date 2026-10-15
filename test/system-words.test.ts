// A game system's words in the languages it ships (D-403): read from words/<code>.yaml beside its system.yaml, by the language or its base language; a file
// that does not read says how to fix it; a language the system lacks gives none.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { systemWords } from "../src/systems/index.ts";
import { makeTempFolder } from "./support.ts";

const systemsFolder = fileURLToPath(new URL("../systems/", import.meta.url));

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

    it("reads every language the built-in systems ship, each with the Italian's words and its headline's names", () => {
        for (const system of readdirSync(systemsFolder).filter((name) => existsSync(join(systemsFolder, name, "words")))) {
            const folder = join(systemsFolder, system);
            const italian = systemWords(folder, "it");
            const languages = readdirSync(join(folder, "words")).map((file) => file.replace(/\.yaml$/, ""));

            // English, the system's own language, has only the whole names of short fields (D-431).
            for (const language of languages.filter((code) => code !== "en")) {
                const words = systemWords(folder, language);
                expect(Object.keys(words?.fields ?? {}).filter((field) => !(field in (italian?.fields ?? {}))), `${system} ${language}`).toEqual([]);
                expect([...(words?.headline ?? "").matchAll(/\{\w+\}/g)].map(String).sort(), `${system} ${language}`).toEqual([...(italian?.headline ?? "").matchAll(/\{\w+\}/g)].map(String).sort());
            }
        }
    });

    it("says how to fix a file that does not read", () => {
        const folder = makeTempFolder();
        mkdirSync(join(folder, "words"));
        writeFileSync(join(folder, "words", "de.yaml"), "group: {Skills: Fertigkeiten}\n");
        expect(() => systemWords(folder, "de")).toThrow(/cannot be read.*Fix the file/);
    });
});
