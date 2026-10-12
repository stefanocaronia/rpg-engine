// The page's words in the campaign's language (D-394): every phrase of the page has its translation in each language the package ships, none is left over,
// each keeps the names it fills; the page reads a language's file once, by its code or its base language, and falls back to English.
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { pageLanguageOf, setLanguage, shippedLanguages, t, tParts } from "../src/dashboard/text.ts";
import { pageFolder, pagePhrases, phraseNames } from "./i18n/phrases.ts";
import { makeTempFolder, testContext } from "./support.ts";

const i18nFolder = join(pageFolder, "i18n");

/** A shipped language's phrases, from its file. */
function phrasesOf(language: string): Record<string, string>
{
    return JSON.parse(readFileSync(join(i18nFolder, `${language}.json`), "utf8")) as Record<string, string>;
}

describe("the page's words (D-394)", () => {
    let phrases: Set<string>;
    // The overview the page reads first, before there is a player character.
    let overview: unknown;

    beforeAll(async () => {
        phrases = await pagePhrases();
        const campaign = join(makeTempFolder(), "campaign");
        mkdirSync(campaign);
        const context = { ...testContext(campaign), folder: campaign };
        await runCommandLine(["init", "--language", "it", "--system", "5e"], context);
        overview = JSON.parse((await runCommandLine(["view", "--json"], context)).output);
    });

    it("gives the page the campaign's language, even before there is a player character", () => {
        expect(overview).toEqual({ kind: "none", language: "it" });
    });

    it("ships a file for each language it names, and names each file it ships", () => {
        const files = readdirSync(i18nFolder).filter((file) => file.endsWith(".json")).map((file) => file.replace(/\.json$/, "")).sort();
        expect(files).toEqual([...shippedLanguages].sort());
    });

    it.each(shippedLanguages)("has in %s a phrase for every phrase of the page, and no other", (language) => {
        const own = phrasesOf(language);
        expect([...phrases].filter((phrase) => !(phrase in own)), `phrases with no translation: npm run translate -- --only ${language}`).toEqual([]);
        expect(Object.keys(own).filter((phrase) => !phrases.has(phrase)), `phrases the page no longer has: npm run translate -- --only ${language}`).toEqual([]);
    });

    it.each(shippedLanguages)("keeps in every %s phrase the names it fills, and leaves none empty", (language) => {
        const own = Object.entries(phrasesOf(language));
        expect(own.filter(([english, translated]) => phraseNames(english).join() !== phraseNames(translated).join() || translated.trim() === "").map(([english]) => english)).toEqual([]);
    });

    it("writes a phrase in the language set, by its code or its base language, fills its names, and keeps English where a language has none", async () => {
        const read = (language: string): Promise<Record<string, string>> => Promise.resolve(phrasesOf(language));
        await setLanguage("it", read);
        expect(t("Your turn")).toBe("Tocca a te");
        expect(t("Round {round}", { round: 3 })).toBe("Round 3");
        expect(tParts("Roll {checks} yourself, on {sheet} or with the dice.", { checks: 1, sheet: 2 })).toEqual(["Tira tu ", 1, ", dalla ", 2, " o con i dadi."]);
        expect(pageLanguageOf("it-CH")).toBe("it");
        expect(pageLanguageOf("no")).toBe("nb");
        expect(pageLanguageOf("tlh")).toBe("en");
        await setLanguage("tlh", read);
        expect(t("Your turn")).toBe("Your turn");
        // A file that arrives after another language was asked is not shown.
        const slow = setLanguage("de", (language) => new Promise((done) => setTimeout(() => done(phrasesOf(language)), 20)));
        await setLanguage("it", read);
        await slow;
        expect(t("Your turn")).toBe("Tocca a te");
        expect(t("A phrase no language has, {name}", { name: "Ada" })).toBe("A phrase no language has, Ada");
    });
});
