// The page in a language the package does not ship, translated on the fly (D-406): in the background, the phrases the page asks first first, a translation that
// loses a {name} dropped, kept in the player's data folder; then the game system's words, all at once; nothing where this computer has no writer.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { homeSystemWords, pageTranslator } from "../src/commands/shared/page-words.ts";
import type { TextWriter } from "../src/core/context.ts";
import { makeTempFolder, testContext } from "./support.ts";

/** A writer that translates each entry of a brief as VI: and its English, losing the {name} of one, and keeps what it was asked. */
function fakeWriter(ready = true): TextWriter & { asked: string[][]; }
{
    const asked: string[][] = [];
    return {
        asked,
        ready: () => ready,
        write: (brief) => {
            const entries = JSON.parse(brief.slice(brief.lastIndexOf("\n") + 1)) as { id: string; english: string; italian?: string; }[];
            asked.push(entries.map((entry) => entry.id));
            return Promise.resolve(JSON.stringify(Object.fromEntries(entries.map((entry) => [entry.id, entry.id === "Hello {name}" ? "Xin chào" : `VI:${entry.italian ?? entry.english}`]))));
        },
    };
}

/** A page folder whose Italian lists these phrases. */
function pageWith(phrases: string[]): string
{
    const page = makeTempFolder();
    mkdirSync(join(page, "i18n"));
    writeFileSync(join(page, "i18n", "it.json"), JSON.stringify(Object.fromEntries(phrases.map((phrase) => [phrase, `IT:${phrase}`]))));
    return page;
}

/** Waits until the language is no longer being translated. */
async function translated(read: () => { translating: boolean; }): Promise<void>
{
    for (let tries = 0; tries < 100 && read().translating; tries++) {
        await new Promise((done) => setTimeout(done, 10));
    }
}

describe("the page translated on the fly (D-406)", () => {
    it("translates in the background what a language lacks, the phrases asked first first, drops one that loses a {name}, and keeps them for every campaign", async () => {
        const home = makeTempFolder();
        const writer = fakeWriter();
        const phrases = [...Array.from({ length: 135 }, (_, index) => `phrase ${index}`), "Hello {name}", "Roll"];
        let notices = 0;
        const words = pageTranslator({ ...testContext(home), home, writer }, pageWith(phrases), () => notices++);

        expect(words.read("vi")).toEqual({ phrases: {}, translating: true, can: true, missing: 137 });
        words.ask("vi", ["Roll", "not a phrase of the page"]);
        await translated(() => words.read("vi"));
        // The first request was on its way; the second took Roll first; the phrase that lost its {name} is asked once more, then the work ends.
        expect(writer.asked.map((batch) => batch.length)).toEqual([130, 7, 1]);
        expect(writer.asked[1][0]).toBe("Roll");
        const read = words.read("vi");
        expect([read.phrases["phrase 3"], read.phrases.Roll, read.translating, read.missing]).toEqual(["VI:IT:phrase 3", "VI:IT:Roll", false, 1]);
        expect(read.phrases["Hello {name}"]).toBeUndefined();
        expect(notices).toBe(2);
        // Another campaign on this computer finds them already there.
        const again = pageTranslator({ ...testContext(home), home, writer: fakeWriter() }, pageWith(phrases), () => undefined);
        expect(again.read("vi").phrases.Roll).toBe("VI:IT:Roll");
    });

    it("translates the game system's words at once, after its Italian list, and view finds them in the player's folder", async () => {
        const home = makeTempFolder();
        const system = { name: "fivee", folder: makeTempFolder() };
        mkdirSync(join(system.folder, "words"));
        writeFileSync(join(system.folder, "words", "it.yaml"), 'groups: {Skills: Abilità}\nfields: {str: FOR}\nheadline: "{classes} di {level}° livello"\n');
        const writer = fakeWriter();
        const words = pageTranslator({ ...testContext(home), home, writer }, pageWith(["Roll"]), () => undefined);
        words.read("vi", system);
        await translated(() => words.read("vi", system));
        expect(homeSystemWords(home, system, "vi")).toEqual({ groups: { Skills: "VI:Abilità" }, fields: { str: "VI:FOR" }, words: {}, headline: "VI:{classes} di {level}° livello" });
    });

    it("translates nothing where this computer has no writer, and says so", () => {
        const home = makeTempFolder();
        const writer = fakeWriter(false);
        const words = pageTranslator({ ...testContext(home), home, writer }, pageWith(["Roll"]), () => undefined);
        expect(words.read("vi")).toEqual({ phrases: {}, translating: false, can: false, missing: 1 });
        expect(writer.asked).toEqual([]);
    });
});
