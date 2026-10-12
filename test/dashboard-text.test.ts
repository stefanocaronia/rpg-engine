// The page's words in the campaign's language (D-394): every phrase of the page has its translation in each language the package ships, none is left over,
// each keeps the names it fills; the page reads a language's file once, by its code or its base language, and falls back to English.
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { effectEndLabel, fromLabel, gameDateLabel, levelNeedLabel, notationLabel } from "../src/dashboard/game-words.ts";
import { pageDirection, pageLanguageOf, setLanguage, shippedLanguages, t, tParts } from "../src/dashboard/text.ts";
import { lengthText } from "../src/dashboard/world-map.ts";
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

    it("writes the engine's data in the language set: game dates, ends, where a place is with the language's numbers, the levels, dice in words (D-403)", async () => {
        await setLanguage("it", (language) => Promise.resolve(phrasesOf(language)));
        expect([gameDateLabel("day 3, 06:00"), gameDateLabel("day 12"), gameDateLabel("tomorrow")]).toEqual(["giorno 3, 06:00", "giorno 12", "tomorrow"]);
        expect(effectEndLabel({ date: "day 1, 18:01" })).toBe("fino al giorno 1, 18:01");
        expect(fromLabel({ km: 12.4, direction: "north-east" }, (km) => lengthText(km, { name: "km", km: 1 }))).toBe("12,4 km a nord-est");
        expect(levelNeedLabel({ needs: 1200, level: 4 })).toBe("1200 al livello 4");
        expect(notationLabel([{ dice: "2d20", keep: { which: "highest", count: 1 } }, { add: "+5" }])).toBe("2d20, tieni il più alto, +5");
        await setLanguage("en");
    });

    it("writes Arabic and Hebrew from right to left, each value of a phrase isolated in its own order, as +2 or 1d20+5 (D-394)", async () => {
        const read = (language: string): Promise<Record<string, string>> => Promise.resolve(phrasesOf(language));
        await setLanguage("ar", read);
        expect(pageDirection()).toBe("rtl");
        expect(t("{points} to level {level}", { points: 1200, level: 4 })).toContain("⁨1200⁩");
        await setLanguage("he", read);
        expect(pageDirection()).toBe("rtl");
        await setLanguage("it", read);
        expect([pageDirection(), t("{points} to level {level}", { points: 1200, level: 4 })]).toEqual(["ltr", "1200 al livello 4"]);
        await setLanguage("en");
    });
});
