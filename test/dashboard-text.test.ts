// The page's words in the campaign's language (D-394): every phrase of the page has its translation in each language the package ships, none is left over,
// each keeps the names it fills; the page reads a language's file once, by its code or its base language, and falls back to English.
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { readSettings, readView } from "../src/dashboard/api.ts";
import { effectEndLabel, effectName, factLabel, fromLabel, gameDateLabel, levelNeedLabel, notationLabel } from "../src/dashboard/game-words.ts";
import { itemLabel, settingLabel, shownText } from "../src/dashboard/labels.ts";
import { refusalText } from "../src/dashboard/refusals.ts";
import { arrowStep, browserLanguage, pageDirection, pageLanguageOf, pageTranslation, setLanguage, setSystemWords, shippedLanguages, t, tParts } from "../src/dashboard/text.ts";
import { lengthText } from "../src/dashboard/world/map.ts";
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
        await runCommandLine(["init", "--language", "it", "--system", "fake"], context);
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

        // Before the setup sets the campaign's language, the browser's, where it is shipped (D-500).
        try {
            vi.stubGlobal("navigator", { language: "it-IT" });
            expect(browserLanguage()).toBe("it");
            vi.stubGlobal("navigator", { language: "tlh" });
            expect(browserLanguage()).toBeUndefined();
        } finally {
            vi.unstubAllGlobals();
        }

        await setLanguage("tlh", read);
        expect(t("Your turn")).toBe("Your turn");
        // A file that arrives after another language was asked is not shown.
        const slow = setLanguage("de", (language) => new Promise((done) => setTimeout(() => done(phrasesOf(language)), 20)));
        await setLanguage("it", read);
        await slow;
        expect(t("Your turn")).toBe("Tocca a te");
        expect(t("A phrase no language has, {name}", { name: "Ada" })).toBe("A phrase no language has, Ada");
    });

    it("says the engine's refusals by their codes in the language set, and the engine's words for a code it does not know (T-162)", async () => {
        await setLanguage("it", (language) => Promise.resolve(phrasesOf(language)));
        const other = { error: "lockpicking is installed on this computer, but it is for the game system 5e…", code: "other-system", values: { name: "lockpicking", system: "5e", plays: "free" } };
        expect(refusalText(other, "")).toBe("lockpicking è per 5e, e questa campagna gioca free: non lo usa.");
        expect(refusalText({ ...other, values: { ...other.values, plays: "" } }, "")).toBe("lockpicking è per 5e, e questa campagna non ha ancora un sistema di gioco.");
        expect(refusalText({ error: "Something new.", code: "tomorrow's", values: {} }, "")).toBe("Something new.");
        expect(refusalText({ code: "constructor" }, "Non è arrivato al gioco.")).toBe("Non è arrivato al gioco.");
    });

    it("writes the engine's data in the language set: game dates, ends, where a place is with the language's numbers, the levels, dice in words (D-403)", async () => {
        await setLanguage("it", (language) => Promise.resolve(phrasesOf(language)));
        expect([gameDateLabel("day 3, 06:00"), gameDateLabel("day 12"), gameDateLabel("tomorrow")]).toEqual(["giorno 3, 06:00", "giorno 12", "tomorrow"]);
        expect(effectEndLabel({ date: "day 1, 18:01" })).toBe("fino al giorno 1, 18:01");
        expect(fromLabel({ km: 12.4, direction: "north-east" }, (km) => lengthText(km, { name: "km", km: 1 }))).toBe("12,4 km a nord-est");
        expect(levelNeedLabel({ needs: 1200, level: 4 })).toBe("mancano 1200 al livello 4");
        expect(notationLabel([{ dice: "2d20", keep: { which: "highest", count: 1 } }, { add: "+5" }])).toBe("2d20, tieni il più alto, +5");
        // The sheet's measures: a decimal with the language's comma, a duration field in words, a length written by hand as 9m never read as minutes; dice and versions untouched.
        const duration = (text: string): string => shownText(text, "duration");
        expect([shownText("4.2 m"), duration("3m"), duration("1h 30m"), duration("30s"), shownText("9m", "length"), shownText("1d6+2"), shownText("SRD 5.1.2")]).toEqual([
            "4,2 m",
            "3 minuti",
            "1 ora 30 minuti",
            "30 secondi",
            "9m",
            "1d6+2",
            "SRD 5.1.2",
        ]);
        // A thousand written by hand stays a thousand, and a decimal keeps its digits.
        expect([shownText("1.000 mo"), shownText("2.50 mo")]).toEqual(["1.000 mo", "2,50 mo"]);
        await setLanguage("en");
        expect([shownText("4.2 m"), duration("3m"), duration("1h 30m"), duration("30 m"), duration("2m 1h")]).toEqual(["4.2 m", "3 minutes", "1 hour 30 minutes", "30 m", "2m 1h"]);
    });

    it("writes Arabic and Hebrew from right to left, each value of a phrase isolated in its own order, as +2 or 1d20+5 (D-394)", async () => {
        const read = (language: string): Promise<Record<string, string>> => Promise.resolve(phrasesOf(language));
        await setLanguage("ar", read);
        expect(pageDirection()).toBe("rtl");
        expect(t("{points} to level {level}", { points: 1200, level: 4 })).toContain("⁨1200⁩");
        await setLanguage("he", read);
        expect(pageDirection()).toBe("rtl");
        expect([arrowStep("ArrowLeft"), arrowStep("ArrowRight"), arrowStep("ArrowDown"), arrowStep("ArrowDown", true)]).toEqual([1, -1, 1, 0]);
        // One translated on the fly, written with its region, as Persian of Iran.
        await setLanguage("fa-IR", () => Promise.resolve({}), () => Promise.resolve({ phrases: { "Your turn": "نوبت شما" }, translating: false, can: true, missing: 0 }));
        expect(pageDirection()).toBe("rtl");
        await setLanguage("it", read);
        expect([pageDirection(), t("{points} to level {level}", { points: 1200, level: 4 })]).toEqual(["ltr", "mancano 1200 al livello 4"]);
        // An effect that ends at the turn of a copy the character does not know by name, as the scene names it.
        expect(effectEndLabel({ round: 3, turn: "creature B2" })).toBe("fino al turno di Creatura B2 nel round 3");
        expect([arrowStep("ArrowLeft"), arrowStep("ArrowRight")]).toEqual([-1, 1]);
        await setLanguage("en");
    });

    it("writes a language the package does not ship as this computer has translated it so far, English where it lacks a phrase (D-406)", async () => {
        const words = { phrases: { "Your turn": "Đến lượt bạn" }, translating: true, can: true, missing: 600 };
        await setLanguage("vi", () => Promise.resolve({}), () => Promise.resolve(words));
        expect([t("Your turn"), t("Settings"), pageTranslation()]).toEqual(["Đến lượt bạn", "Settings", { language: "vi", state: "translating" }]);
        await setLanguage("vi", () => Promise.resolve({}), () => Promise.resolve({ ...words, translating: false, missing: 0 }));
        expect(pageTranslation()).toEqual({ language: "vi", state: "ready" });
        await setLanguage("vi", () => Promise.resolve({}), () => Promise.resolve({ phrases: {}, translating: false, can: false, missing: 600 }));
        expect([t("Your turn"), pageTranslation()]).toEqual(["Your turn", { language: "vi", state: "unable" }]);
        await setLanguage("en");
        expect(pageTranslation()).toBeUndefined();
    });

    it("writes a game system's words where it has them, as they are, and in capitals only the short names of fields it lacks (D-403)", () => {
        setSystemWords({ groups: {}, fields: { wis: "SAG" }, words: { insight: "Intuizione", advancement: "Avanzamento", "until long rest": "fino al riposo lungo" }, names: { cha: "Carisma" } });
        expect([itemLabel("insight"), itemLabel("wis", new Set(["wis"])), itemLabel("cha", new Set(["cha"])), itemLabel("light hammer")]).toEqual(["Intuizione", "SAG", "CHA", "Light hammer"]);
        expect([settingLabel("advancement"), effectEndLabel({ occasion: "long rest" })]).toEqual(["Avanzamento", "fino al riposo lungo"]);
        setSystemWords(undefined);
    });

    it("writes an effect in the system's words whatever its capitals, when it is put on and when it ends", () => {
        setSystemWords({ groups: {}, fields: {}, words: { Unconscious: "Privo di sensi", Prone: "Prono" } });
        expect([effectName("Unconscious"), effectName("prone"), effectName("Benedizione")]).toEqual(["Privo di sensi", "Prono", "Benedizione"]);
        expect([factLabel({ kind: "effect", who: "Ettore", name: "Unconscious", text: "Unconscious" }), factLabel({ kind: "effect-ended", who: "Ettore", effect: "Unconscious" })]).toEqual([
            "Ettore: Privo di sensi",
            "Ettore: Privo di sensi ended",
        ]);
        setSystemWords(undefined);
    });

    it("says the game could not be reached in the page's words, never the browser's, and what the server said went wrong as it said it", async () => {
        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
        await expect(readView()).rejects.toThrow("It did not reach the game: try again.");
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({ error: "No campaign here." }))));
        await expect(readSettings()).rejects.toThrow("No campaign here.");
        vi.unstubAllGlobals();
    });
});
