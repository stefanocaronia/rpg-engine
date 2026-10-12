// The page's words in the campaign's language (D-394): every phrase the code gives t() has its curated translation, none is left over, and each keeps the
// names it fills; t() itself falls back to English.
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { playerSettingNames } from "../src/commands/config.ts";
import type { PlayerSetting } from "../src/dashboard/data.ts";
import { italian } from "../src/dashboard/i18n/it.ts";
import { setLanguage, t, tParts } from "../src/dashboard/text.ts";
import { makeTempFolder, testContext } from "./support.ts";

const pageFolder = fileURLToPath(new URL("../src/dashboard/", import.meta.url));

describe("the page's words (D-394)", () => {
    // The words of the player's settings the engine gives the page, which it writes through t(): what each is, what its values mean, the setup's questions.
    let settingWords: Set<string>;
    // The overview the page reads first, before there is a player character.
    let overview: unknown;

    beforeAll(async () => {
        const campaign = join(makeTempFolder(), "campaign");
        mkdirSync(campaign);
        const context = { ...testContext(campaign), folder: campaign };
        await runCommandLine(["init", "--language", "it", "--system", "5e"], context);
        overview = JSON.parse((await runCommandLine(["view", "--json"], context)).output);

        const read = async (...args: string[]): Promise<PlayerSetting[]> => {
            const view = JSON.parse((await runCommandLine(["view", ...args, "--json"], context)).output) as { settings?: PlayerSetting[]; questions?: PlayerSetting[]; };
            return view.settings ?? view.questions ?? [];
        };

        // The game system's own settings come with its words, as the rest of its words (D-394, 3).
        const own = new Set<string>([...playerSettingNames, "companions", "preparation", "name"]);
        const settings = [...await read("--settings"), ...await read("--setup")].filter((setting) => own.has(setting.name));
        settingWords = new Set(settings.flatMap((setting) => [setting.about, setting.question, ...(setting.choices ?? []).flatMap((choice) => [choice.means, choice.label])]).filter((word) => word !== undefined));
    });

    it("has an Italian phrase for every phrase of the page, and no other", () => {
        const phrases = new Set([...pagePhrases(), ...settingWords]);
        expect([...phrases].filter((phrase) => !(phrase in italian)), "phrases with no Italian: add them to src/dashboard/i18n/it.ts").toEqual([]);
        expect(Object.keys(italian).filter((phrase) => !phrases.has(phrase)), "Italian phrases the page no longer has: take them out").toEqual([]);
    });

    it("gives the page the campaign's language, even before there is a player character", () => {
        expect(overview).toEqual({ kind: "none", language: "it" });
    });

    it("keeps in every translation the names a phrase fills", () => {
        const names = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((found) => found[1]).sort();
        expect(Object.entries(italian).filter(([english, own]) => names(english).join() !== names(own).join()).map(([english]) => english)).toEqual([]);
    });

    it("writes a phrase in the language set, fills its names, and keeps English where a language has none", () => {
        setLanguage("it");
        expect(t("Your turn")).toBe("Tocca a te");
        expect(t("Round {round}", { round: 3 })).toBe("Round 3");
        expect(tParts("Roll {checks} yourself, on {sheet} or with the dice.", { checks: 1, sheet: 2 })).toEqual(["Tira tu ", 1, ", dalla ", 2, " o con i dadi."]);
        setLanguage("it-CH");
        expect(t("Your turn")).toBe("Tocca a te");
        setLanguage("ja");
        expect(t("Your turn")).toBe("Your turn");
        setLanguage(undefined);
        expect(t("A phrase no language has, {name}", { name: "Ada" })).toBe("A phrase no language has, Ada");
    });
});

/** Every phrase the page's code gives t() or tParts() as a string of its own. */
function pagePhrases(): Set<string>
{
    const files = readdirSync(pageFolder, { recursive: true, encoding: "utf8" }).filter((file) => /\.tsx?$/.test(file) && !file.startsWith("i18n"));
    const calls = files.flatMap((file) => [...readFileSync(join(pageFolder, file), "utf8").matchAll(/\bt(?:Parts)?\(\s*("(?:[^"\\]|\\.)*")/g)]);
    return new Set(calls.map((call) => JSON.parse(call[1]) as string));
}
