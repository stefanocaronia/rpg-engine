// Rules as text (MECCANICHE, RUL-1–RUL-7): the cases of the table, through the rules module and through the command, in a campaign played in Italian with the system 5e.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { commands } from "../src/commands/index.ts";
import type { Context } from "../src/core/context.ts";
import { bookTitles, findRules, hasAllWords, isTitled, readRuleBook, ruleFiles, ruleSections, shownRules } from "../src/rules/index.ts";
import { makeTempFolder, removeFolder, testContext, testSystemFolders } from "./support.ts";

const rulesOf5e = join(testSystemFolders[0], "5e", "rules");

function sectionsOf(text: string)
{
    return ruleSections(text, "Chapter", "test");
}

function pathsFound(text: string, search: string): string[]
{
    return findRules(sectionsOf(text), search).map((finding) => finding.section.path.join(" › "));
}

describe("the sections of a rules text (RUL-1)", () => {
    const text = "# Combat\n\nIntro.\n\n## Grappling\n\nWhen you want to grab a creature.\n\n***Escaping a Grapple.*** A grappled creature can use its action.\n\n"
        + "More on escaping.\n\n***Moving a Grappled Creature.*** You can drag it.\n\n**Size Categories**\n\n| Size | Space |\n|---|---|\n| Tiny | 2½ by 2½ ft. |\n\n"
        + "```\n# not a heading\n```\n\n## Cover\n\nWalls give cover.\n";

    it("cuts a text at its headings and at the titles in bold that open a paragraph, each down to the next of its level or above", () => {
        const sections = sectionsOf(text);
        expect(sections.map((section) => section.path.join(" › "))).toEqual([
            "Combat",
            "Combat › Grappling",
            "Combat › Grappling › Escaping a Grapple",
            "Combat › Grappling › Moving a Grappled Creature",
            "Combat › Grappling › Size Categories",
            "Combat › Cover",
        ]);
        expect(sections.map((section) => section.level)).toEqual([1, 2, 3, 3, 3, 2]);
        expect(sections[2].text).toBe("***Escaping a Grapple.*** A grappled creature can use its action.\n\nMore on escaping.");
        expect(sections[1].parts).toEqual(["Escaping a Grapple", "Moving a Grappled Creature", "Size Categories"]);
        expect(sections[1].ownText).toBe("## Grappling\n\nWhen you want to grab a creature.\n\n```\n# not a heading\n```");
    });

    it("makes a caption in bold a section with its table, which ends where the table does", () => {
        const sections = sectionsOf("## Armor\n\nArmor protects.\n\n**Armor table**\n\n| Armor | AC |\n|---|---|\n| Plate | 18 |\n\nAfter the table.\n\n**Not a caption**\n\nText.\n");
        expect(sections.map((section) => section.path.join(" › "))).toEqual(["Armor", "Armor › Armor table"]);
        expect(sections[1].text).toBe("**Armor table**\n\n| Armor | AC |\n|---|---|\n| Plate | 18 |");
        expect(sections[0].ownText).toBe("## Armor\n\nArmor protects.\n\nAfter the table.\n\n**Not a caption**\n\nText.");
    });

    it("leaves out a byte order mark and the properties at the top, and finds no title in code or in %% comments", () => {
        const text = "﻿---\ntags: [regole]\n---\n\n# Riposo\n\nUn'ora.\n\n%%\n## Nascosto\n%%\n\n````\n```\n## Nel codice\n```\n````\n\n%% ## commento %% resta testo.\n";
        const sections = sectionsOf(text);
        expect(sections.map((section) => section.path.join(" › "))).toEqual(["Riposo"]);
        expect(sections[0].text.startsWith("# Riposo")).toBe(true);
        expect(sections[0].text).not.toContain("tags");
    });

    it("keeps each section exactly as the file writes it, with its parts, captions, tables and code", () => {
        const [, grappling] = sectionsOf(text);
        expect(text).toContain(grappling.text);
        expect(grappling.text).toContain("**Size Categories**\n\n| Size | Space |");
        expect(grappling.text).toContain("# not a heading");
    });

    it("reads lines ending in CRLF, takes no blank start for a text of the file, and lists only the parts one level below", () => {
        const sections = sectionsOf("\r\n\r\n## A\r\n\r\nalpha\r\n\r\n### B\r\n\r\nbeta\r\n\r\n#### C\r\n\r\ngamma\r\n\r\n## D\r\n\r\ndelta\r\n");
        expect(sections.map((section) => section.path.join(" › "))).toEqual(["A", "A › B", "A › B › C", "D"]);
        expect(sections.some((section) => section.text.includes("\r"))).toBe(false);
        expect(sections[0].parts).toEqual(["B"]);
        expect(sections[3].ownText).toBe(sections[3].text);
        expect(sections[2].ownText).toBe("#### C\n\ngamma");
    });

    it("takes as titles only headings with a space after their marks and bold titles followed by their text, without their marks and final stop", () => {
        const text = "## *fly* spell\n\nRoll 1d20 # not a heading.\n\n#NoSpace\n\nSee ```this``` inline.\n\n**Glued**text\n\n**Colon**: text after.\n\n**Stop.** text after.\n";
        expect(sectionsOf(text).map((section) => section.path.at(-1))).toEqual(["fly spell", "Colon", "Stop"]);
    });

    it("lists the markdown files of a folder in order, without folders or other files, and none for a folder that is not there", () => {
        const folder = makeTempFolder();
        mkdirSync(join(folder, "Sub.md"));
        writeFileSync(join(folder, "b.md"), "# B\n");
        writeFileSync(join(folder, "A.MD"), "# A\n");
        writeFileSync(join(folder, "c.txt"), "# C\n");
        writeFileSync(join(folder, "d.md.bak"), "# D\n");
        mkdirSync(join(folder, "x", "y"), { recursive: true });
        writeFileSync(join(folder, "x", "y", "Z.md"), "No heading.\n");
        expect(ruleFiles(folder)).toEqual(["A", "b", "x/y/Z"]);
        expect(bookTitles(readRuleBook(folder, "test"))).toEqual(["A", "B", "Z"]);
        expect(ruleFiles(join(folder, "missing"))).toEqual([]);
        removeFolder(folder);
    });

    it("makes the text before the first heading a section named after the file, holding the whole file", () => {
        const sections = ruleSections("Una serratura si apre con Destrezza.\n\n## Serrature magiche\n\nNon si aprono.\n", "Scasso", "house rules");
        expect(sections.map((section) => section.path.join(" › "))).toEqual(["Scasso", "Scasso › Serrature magiche"]);
        expect(sections[0].level).toBe(0);
        expect(sections[0].text).toContain("Non si aprono.");
    });
});

describe("searching the rules (RUL-3–RUL-5)", () => {
    const text = "# Combat\n\n## Grappling\n\nYou grab a creature.\n\n## Cover\n\nThe grappled creature has no cover.\n\n## Concentration\n\nYou keep a spell going.\n\n"
        + "## Hiding\n\nYou conceal yourself.\n\n## Resting\n\nYou rest for an hour.\n\n## Restrained\n\nA restrained creature can't move.\n\n# Spells\n\n## Grappling\n\nA spell that grabs.\n";

    it("finds first the sections the text names, all of those with the same title, by title or by titles of their path (RUL-3)", () => {
        expect(pathsFound(text, "grappling").slice(0, 2)).toEqual(["Combat › Grappling", "Spells › Grappling"]);
        expect(pathsFound(text, "Spells › Grappling")[0]).toBe("Spells › Grappling");
        expect(findRules(sectionsOf(text), "Combat > Grappling")[0]).toMatchObject({ titled: true, section: { path: ["Combat", "Grappling"] } });
    });

    it("finds the forms of a word, and not the words that only begin like it (RUL-4)", () => {
        expect(pathsFound(text, "grapple")).toContain("Combat › Cover");
        expect(pathsFound(text, "resting")).toEqual(["Combat › Resting"]);
        expect(pathsFound(text, "rest")).not.toContain("Combat › Restrained");
        expect(pathsFound(text, "concentration")).toEqual(["Combat › Concentration"]);
        expect(pathsFound(text, "HIDING")).toEqual(["Combat › Hiding"]);
    });

    it("puts the sections with the rarest words first, in the title before the text, then the shorter title (RUL-5)", () => {
        expect(pathsFound(text, "grapple cover")[0]).toBe("Combat › Cover");
        expect(pathsFound(text, "creature grappled").slice(0, 2)).toEqual(["Combat › Grappling", "Combat › Cover"]);
        expect(pathsFound(text, "spell")[0]).toBe("Spells");
    });

    it("reads titles joined by ›, > or /, in their order, each above the next, and the last the section's own (RUL-3)", () => {
        const [grappling] = sectionsOf(text).filter((section) => section.path.join(" › ") === "Combat › Grappling");
        expect(["Combat/Grappling", "Combat>Grappling", "combat › grappling.", "Grappling"].map((search) => isTitled(grappling, search))).toEqual([true, true, true, true]);
        expect(["Spells › Grappling", "Grappling › Grappling", "Grappling › Combat", "Combat", " › "].map((search) => isTitled(grappling, search))).toEqual([false, false, false, false, false]);
    });

    it("after the sections a text names, finds the others by the words of its last title alone", () => {
        expect(pathsFound(text, "Combat › Concentration")).toEqual(["Combat › Concentration"]);
    });

    it("finds a word of two letters only as itself (RUL-4)", () => {
        const sections = sectionsOf("# Armor\n\n## Plate\n\nAC 18.\n\n## Actions\n\nAn action.\n\n## Acid\n\nAcid burns.\n\n## Other\n\nNothing.\n");
        expect(findRules(sections, "ac").map((finding) => finding.section.path.at(-1))).toEqual(["Plate"]);
    });

    it("weighs a rare word more than one that many sections have, and searches with every word when the text names no section", () => {
        const sections = sectionsOf("# Book\n\n## One\n\nrare\n\n## Two\n\ncommon\n\n## Three\n\ncommon\n\n## Four\n\nfiller\n\n## Five\n\nfiller\n\n## Six\n\nfiller\n\n## Seven\n\nfiller\n");
        expect(findRules(sections, "common rare")[0].section.path.at(-1)).toBe("One");
        expect(pathsFound("# Combat\n\n## Hiding\n\nhide\n\n# Spells\n\n## Light\n\nlight\n\n# Other\n\n## Rest\n\nrest\n", "Spells › Hiding")).toEqual(["Combat › Hiding", "Spells", "Spells › Light"]);
    });

    it("takes no title from bold words inside a paragraph, and keeps a rule of dashes that is not at the top", () => {
        const sections = sectionsOf("# Moving\n\nUse **Dash** to move.\n\n---\n\nMore text.\n\n---\n");
        expect(sections.map((section) => section.path.join(" › "))).toEqual(["Moving"]);
        expect(sections[0].text).toContain("---\n\nMore text.");
    });

    it("puts the rarest word first, then the shorter title, then the order of the text (RUL-5)", () => {
        const sections = sectionsOf("# Book\n\n## Grappling\n\ngrab common\n\n## Grappled\n\ngrab common\n\n## Other\n\ncommon common\n\n## Third\n\ncommon\n\n## Fourth\n\nnone\n\n## Fifth\n\nnone\n\n## Sixth\n\nnone\n");
        expect(findRules(sections, "grab").map((finding) => finding.section.path.at(-1))).toEqual(["Grappled", "Grappling"]);
        expect(findRules(sections, "common grab").map((finding) => finding.section.path.at(-1)).slice(0, 2)).toEqual(["Grappled", "Grappling"]);
        expect(findRules(sections, "common").map((finding) => finding.section.path.at(-1))).toEqual(["Other", "Third", "Grappled", "Grappling"]);
    });

    it("weighs a word again in the title, and half again in a title above, at any depth (RUL-5)", () => {
        const sections = sectionsOf("# Creatures\n\n## Venom of spiders\n\nRare.\n\n### Widow\n\nA bite.\n\n## Snake\n\nIts venom kills.\n\n## Wolf\n\nIt bites.\n\n## Bear\n\nIt claws.\n\n## Boar\n\nIt charges.\n\n## Hawk\n\nIt flies.\n");
        const scores = new Map(findRules(sections, "venom").map((finding) => [finding.section.path.at(-1), finding.score]));
        expect([...scores.keys()]).toEqual(["Venom of spiders", "Widow", "Snake"]);
        expect(scores.get("Venom of spiders")! / scores.get("Snake")!).toBeCloseTo(2);
        expect(scores.get("Widow")! / scores.get("Snake")!).toBeCloseTo(1.5);
    });

    it("finds nothing by a word that more than half of the sections have, such as in (RUL-5)", () => {
        const sections = sectionsOf("# Book\n\n## Falling\n\nfall in a pit\n\n## Swimming\n\nswim in water\n\n## Cover\n\ncover in combat\n");
        expect(findRules(sections, "in")).toEqual([]);
        expect(findRules(sections, "cadere in un pozzo")).toEqual([]);
        expect(findRules(sections, "swim in").map((finding) => finding.section.path.at(-1))).toEqual(["Swimming"]);
        expect(findRules(sections, "swim").map((finding) => finding.section.path.at(-1))).toEqual(["Swimming"]);
        expect(findRules(sections, "swimming fall").map((finding) => finding.section.path.at(-1))).toEqual(["Falling", "Swimming"]);
    });

    it("finds a precedent only with every word of the search", () => {
        expect(hasAllWords("Poisoned: la benda bagnata", "poisoned benda")).toBe(true);
        expect(hasAllWords("Poisoned: la benda bagnata", "poisoned gas")).toBe(false);
    });

    it("finds nothing for a text with no word that the rules have", () => {
        expect(findRules(sectionsOf(text), "flanking")).toEqual([]);
        expect(findRules(sectionsOf(text), " ? ")).toEqual([]);
    });
});

describe("what an answer shows (RUL-6)", () => {
    const long = "word ".repeat(50);
    const others = "\n\n## Epsilon\n\nother\n\n## Zeta\n\nother\n\n## Eta\n\nother\n\n## Theta\n\nother\n";
    const text = `# Chapter\n\n## Alpha\n\nalpha ${long}\n\n### Alpha One\n\nalpha one ${long}\n\n## Beta\n\nalpha beta\n\n## Gamma\n\nalpha gamma\n\n## Delta\n\nalpha delta${others}`;

    it("shows whole the sections a text names, never the same text twice, and names the others", () => {
        const { shown, others } = shownRules(findRules(sectionsOf(text), "alpha"), 800);
        expect(shown.map((entry) => entry.section.path.at(-1))).toEqual(["Alpha"]);
        expect(shown[0].text).toContain("### Alpha One");
        expect(others.map((section) => section.path.at(-1))).toEqual(["Beta", "Gamma", "Delta"]);
    });

    it("shows whole up to three of the best sections found by their words, at least half as good as the first", () => {
        const found = findRules(sectionsOf(text), "gamma delta beta");
        expect(shownRules(found, 800).shown.map((entry) => entry.section.path.at(-1))).toEqual(["Beta", "Gamma", "Delta"]);
        expect(shownRules(findRules(sectionsOf(text), "beta one"), 800).shown.map((entry) => entry.section.path.at(-1))).toEqual(["Beta", "Alpha One"]);
    });

    it("shows whole a section half as good as the first, while the words fit, and names one that does not fit", () => {
        const sections = sectionsOf("# Book\n\n## One\n\nalpha beta\n\n## Two\n\nalpha\n\n## Three\n\nbeta gamma delta epsilon\n");
        const found = findRules(sections, "alpha beta");
        expect(shownRules(found, 100).shown.map((entry) => entry.section.path.at(-1))).toEqual(["One", "Two", "Three"]);
        const fits = shownRules(found, 7);
        expect(fits.shown.map((entry) => entry.section.path.at(-1))).toEqual(["One", "Two"]);
        expect(fits.others.map((section) => section.path.at(-1))).toEqual(["Three"]);
    });

    it("shows a section of the same path in another file, or from another source", () => {
        const sections = [
            ...ruleSections("# Combat\n\n## Grappling\n\ngrab\n", "Combat", "5e"),
            ...ruleSections("# Combat\n\n## Grappling\n\ngrab\n", "Other", "5e"),
            ...ruleSections("# Combat\n\n## Grappling\n\ngrab\n", "Combat", "house rules"),
        ];
        expect(shownRules(findRules(sections, "grappling"), 100).shown).toHaveLength(3);
    });

    it("always shows the first, cut to its own text with the titles of its parts when it is too long alone", () => {
        const { shown } = shownRules(findRules(sectionsOf(text), "Alpha"), 20);
        expect(shown).toHaveLength(1);
        expect(shown[0].text).not.toContain("Alpha One");
        expect(shown[0].parts).toEqual(["Alpha One"]);
    });
});

describe("the rules command (RUL-2, RUL-6, RUL-7)", () => {
    let folder: string;
    let context: Context;

    beforeEach(async () => {
        folder = makeTempFolder();
        context = testContext(folder);
        await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    });

    afterEach(() => removeFolder(folder));

    async function ok(...args: string[]): Promise<string>
    {
        const result = await runCommandLine(args, context);
        expect(result.exitCode, result.output).toBe(0);
        return result.output;
    }

    function sectionOf(file: string, heading: string, next: string): string
    {
        const text = readFileSync(join(rulesOf5e, `${file}.md`), "utf8");
        return text.slice(text.indexOf(heading), text.indexOf(next)).trimEnd();
    }

    it("reads only, so that hosts never ask before a search", () => {
        expect(commands.find((command) => command.name === "rules")?.readOnly).toBe(true);
    });

    it("gives the exact text of the system's rule, with its path, and names the other sections found", async () => {
        const output = await ok("rules", "grappled");
        expect(output).toContain("Appendix PH-A: Conditions › Grappled (5e):\n" + sectionOf("Conditions", "## Grappled", "## Incapacitated"));
        expect(output).toContain("Also: Combat › Making an Attack › Melee Attacks › Grappling");
        expect(output).not.toMatch(/Precedents|House rules|not installed|more\)|Its parts|No rule matches|disagree|also a page/);
    });

    it("cuts a section too long to its own text and names its parts", async () => {
        const output = await ok("rules", "Combat");
        expect(output.startsWith("Combat (5e):\n# Combat\n(Its parts: The Order of Combat; Movement and Position; Actions in Combat;")).toBe(true);
    });

    it("gives the system's rules the words the house rules leave, and always shows the first of them", async () => {
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Lotta.md"), `# Lotta\n\nGrappling al nostro tavolo. ${"parola ".repeat(790)}\n`);
        const output = await ok("rules", "grappling");
        expect(output.startsWith("Lotta (house rule):\n# Lotta")).toBe(true);
        expect(output).toContain("Combat › Making an Attack › Melee Attacks › Grappling (5e):\n#### Grappling");
        expect(output).toContain("(Its parts: Escaping a Grapple; Moving a Grappled Creature. Read one by its heading.)");
    });

    it("says first when a page of the system or of the campaign has the name searched, by its name or an alias, and adds little of the rules (D-195)", async () => {
        const potion = await ok("rules", "Potion of Healing");
        expect(potion.startsWith("Potion of Healing is a page of the system 5e (item): show Potion of Healing reads it. What the rules say of it:")).toBe(true);
        expect(potion.length).toBeLessThan(2500);
        await ok("write", "Lanterna", "--type", "item", "--text", "Fa luce.");
        expect(await ok("rules", "lanterna")).toContain("Lanterna is a page of the campaign (item): show Lanterna reads it.");
        expect(await ok("rules", "Shield spell")).toContain("Shield (spell) is a page of the system 5e (topic): show Shield (spell) reads it.");
        expect(await ok("rules", "grappled")).not.toContain("is a page");
    });

    it("reads a section named by its headings, with its parts", async () => {
        const output = await ok("rules", "Combat › Grappling");
        expect(output).toContain("***Escaping a Grapple.***");
        expect(output.startsWith("Combat › Making an Attack › Melee Attacks › Grappling (5e):\n#### Grappling")).toBe(true);
    });

    it("says when nothing matches: the language of the book, its chapters and how to record a precedent", async () => {
        const output = await ok("rules", "flanking");
        expect(output).toContain('No rule matches "flanking". The system 5e writes its rules in English');
        expect(output).toContain(
            "The chapters of 5e: Adventuring, Beyond 1st Level, Combat, Conditions, Diseases, Equipment, Fantasy-Historical Pantheons, Madness, Magic Items, Monsters, "
                + "Nonplayer Characters, Objects, Poisons, Races, Spellcasting, The Planes of Existence, Traps, Using Ability Scores.",
        );
        expect(output).toContain('config, setting precedents, add "<the rule\'s name in English>: what you said"');
    });

    it("says how to give a text of more words on the command line", async () => {
        const result = await runCommandLine(["rules", "long", "rest"], context);
        expect(result.output).toBe('Unexpected argument: rest. Put a value with spaces in quotes, such as "long rest".');
    });

    it("reads a precedent or an agreement written by hand without quotes as text, and keeps reading when another setting breaks campaign.yaml", async () => {
        const settings = readFileSync(join(folder, "campaign.yaml"), "utf8");
        // An empty item written by hand is left out, never a reason to stop: the master could not fix it.
        writeFileSync(join(folder, "campaign.yaml"), `${settings}precedents:\n  - Poisoned: la benda bagnata dà vantaggio contro il gas.\n  - ""\ntable: [Prima dei tiri: dico la posta]\n`);
        expect(await ok("rules", "poisoned")).toContain("Precedents: Poisoned: la benda bagnata dà vantaggio contro il gas.");
        expect(await ok("status")).toContain("Table: Prima dei tiri: dico la posta");
        await ok("config", "precedents", "--add", "Flanking: due alleati ai lati.");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain('- "Poisoned: la benda bagnata dà vantaggio contro il gas."');
        writeFileSync(join(folder, "campaign.yaml"), `${readFileSync(join(folder, "campaign.yaml"), "utf8")}lines: [ragni\n`);
        expect(await ok("rules", "flanking")).toContain("Precedents: Flanking: due alleati ai lati.");
    });

    it("names the house rules by the title each file opens with, reads them in folders, and takes a file named rules for none", async () => {
        mkdirSync(join(folder, "rules", "combattimento"), { recursive: true });
        writeFileSync(join(folder, "rules", "Varianti.MD"), "# Colpi critici\n\nUn 20 naturale raddoppia tutti i dadi.\n");
        writeFileSync(join(folder, "rules", "combattimento", "Lotta.md"), "La lotta si fa con Atletica.\n");
        expect(await ok("status")).toContain("House rules (rules): Colpi critici, Lotta");
        expect(await ok("rules", "Colpi critici")).toContain("Colpi critici (house rule):\n# Colpi critici");
        expect(await ok("rules", "lotta")).toContain("Lotta (house rule):\nLa lotta si fa con Atletica.");
        removeFolder(join(folder, "rules"));
        writeFileSync(join(folder, "rules"), "not a folder");
        expect(await ok("status")).not.toContain("House rules");
        expect(await ok("rules", "grappled")).toContain("Appendix PH-A: Conditions › Grappled (5e)");
    });

    it("finds the tables of the system by their caption, with their rows", async () => {
        const output = await ok("rules", "Weapons");
        expect(output).toContain("Equipment › Weapons › Weapon Properties › Special Weapons › Weapons (5e):\n**Weapons**\n\n| Name | Cost | Damage | Weight | Properties |");
        expect(output).toContain("| Dagger | 2 gp | 1d4 piercing | 1 lb. | Finesse, light, thrown (range 20/60) |");
        expect(await ok("rules", "dagger")).toContain("Dagger is a page of the system 5e (item): show Dagger reads it.");
    });

    it("names no language when the campaign plays in the system's own", async () => {
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("language: it", "language: en-GB"));
        expect(await ok("rules", "flanking")).toContain('No rule matches "flanking". Search with the book\'s words, such as a condition, an action or a heading. The chapters of 5e:');
        expect(await ok("rules")).toContain("The rules of the system 5e, by chapter:");
        expect(await ok("find", "zzz")).toContain("find looks for the pages of the system 5e in their names and fields.");
    });

    it("lists the chapters with their sections without a text", async () => {
        const output = await ok("rules");
        expect(output).toContain("The rules of the system 5e, in English, by chapter:");
        expect(output).toContain("Adventuring: Time, Movement, The Environment, Resting, Between Adventures");
    });

    it("finds a precedent written in Italian by the name of its rule, beside that rule, and status shows it at every session (RUL-7)", async () => {
        await ok("config", "precedents", "--add", "Poisoned: la benda bagnata sulla bocca dà vantaggio contro il gas.");
        const beside = await ok("rules", "poisoned");
        expect(beside).toContain("Appendix PH-A: Conditions › Poisoned (5e)");
        expect(beside).toContain("Precedents: Poisoned: la benda bagnata sulla bocca dà vantaggio contro il gas.");
        expect(beside).toContain("When the text and a precedent disagree, tell the player and ask whether to keep the precedent: if so, write it again saying it is a house rule, against the book; if not, remove it. Both with config.");
        expect(await ok("rules", "poison gas")).toContain("Precedents: Poisoned: la benda");
        expect(await ok("rules", "grappled")).not.toContain("Precedents:");
        expect(await ok("status")).toContain("Precedents: Poisoned: la benda bagnata sulla bocca dà vantaggio contro il gas.");
    });

    it("shows a precedent whose rule the search names, or that names a section shown, and holds it when no text matches (RUL-7)", async () => {
        await ok("config", "precedents", "--add", "Flanking: due alleati ai lati danno vantaggio.", "--add", "Grappling: si afferra fino a due taglie in più.", "--add", "Senza nome di regola.");
        const flanking = await ok("rules", "flanking");
        expect(flanking).toContain('No text of the rules matches "flanking": the table\'s precedent below holds.');
        expect(flanking).toContain("Precedents: Flanking: due alleati ai lati danno vantaggio.");
        expect(flanking).not.toContain("config, setting precedents");
        expect(await ok("rules", "flanking rules")).toContain("Precedents: Flanking:");
        expect(await ok("rules", "Combat › Grappling")).toContain("Precedents: Grappling: si afferra fino a due taglie in più.");
        expect(await ok("rules", "senza")).toContain("Precedents: Senza nome di regola.");
    });

    it("says only what can be read in a campaign without a game system", async () => {
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: 5e\n", ""));
        expect(await ok("rules")).toBe("The campaign has no game system: only its own rules can be read.");
        expect(await ok("rules", "flanking")).toBe('No rule matches "flanking".');
    });

    it("reads the campaign's house rules first, and always names them, also in status (RUL-2)", async () => {
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Scasso.md"), "# Scasso\n\nUna serratura semplice si apre con una prova di Destrezza CD 12, come a Grappling.\n");
        const both = await ok("rules", "grappling");
        expect(both.indexOf("Scasso (house rule)")).toBe(0);
        expect(both).toContain("Combat › Making an Attack › Melee Attacks › Grappling (5e)");
        expect(await ok("rules", "lockpicking")).toContain("House rules of the campaign: Scasso.");
        expect(await ok("status")).toContain("House rules (rules): Scasso");
    });

    it("says when the campaign's system is not installed, and still reads the house rules", async () => {
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: 5e", "system: 4e"));
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Meteo.md"), "Ogni mattina si tira il tempo.\n");
        const output = await ok("rules", "tempo");
        expect(output.startsWith("The campaign's system, 4e, is not installed")).toBe(true);
        expect(output).toContain("Meteo (house rule):\nOgni mattina si tira il tempo.");
        expect(await ok("rules")).toBe("The campaign's system, 4e, is not installed, so its rules cannot be read: validate says how to fix it.\nHouse rules of the campaign: Meteo.");
        expect(await ok("rules", "flanking")).not.toContain("config, setting precedents");
    });

    it("reads the rules of the campaign's own system only: Ironsworn's moves in a campaign of Ironsworn", async () => {
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: 5e", "system: ironsworn"));
        expect(await ok("rules", "face danger")).toContain("Moves › Adventure Moves › Face Danger (ironsworn)");
        expect(await ok("rules", "grappled")).toContain('No rule matches "grappled"');
    });
});
