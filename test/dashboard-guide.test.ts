import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { anchorOf, markdownBlocks, plainText, previewOf } from "../src/dashboard/help/blocks.ts";
import { shippedLanguages } from "../src/dashboard/text.ts";
import { englishGuide, guideIn, guideMarks, guideParts, guidePlan, guideShape, isUpToDate, markOf, marksOf, paragraphsOf, planNamesAgain, settingNames, translationHead, unlikeSettingNames } from "./i18n/guide.ts";

describe("the guide's markdown (D-413)", () => {
    it("reads headings with their icon, paragraphs, lists, tables, quotes and code, and leaves comments out", () => {
        const text = [
            "<!-- a note for the authors -->",
            "## 2. Getting started <!-- icon: path -->",
            "",
            "A paragraph",
            "on two lines.",
            "",
            "1. First",
            "2. Second,",
            "   still second",
            "- One",
            "",
            "| Who | What |",
            "|---|---|",
            "| **You** | play |",
            "",
            "> I open the door.",
            ">",
            "> I look inside.",
            "",
            "```text",
            'rpg init "The Salt Isles"',
            "```",
            "---",
        ].join("\n");
        expect(markdownBlocks(text)).toEqual([
            { kind: "heading", level: 2, text: "2. Getting started", icon: "path" },
            { kind: "paragraph", text: "A paragraph on two lines." },
            { kind: "list", ordered: true, items: ["First", "Second, still second"] },
            { kind: "list", ordered: false, items: ["One"] },
            { kind: "table", head: ["Who", "What"], rows: [["**You**", "play"]] },
            { kind: "quote", blocks: [{ kind: "paragraph", text: "I open the door." }, { kind: "paragraph", text: "I look inside." }] },
            { kind: "code", text: 'rpg init "The Salt Isles"' },
            { kind: "rule" },
        ]);
    });

    it("makes a heading's anchor as GitHub does, and a line's plain words", () => {
        expect(anchorOf("2.4 Connect your AI")).toBe("24-connect-your-ai");
        expect(anchorOf("8. For the curious: the campaign folder")).toBe("8-for-the-curious-the-campaign-folder");
        expect(plainText("Install **Node.js** from [nodejs.org](https://nodejs.org), then `rpg --version`.")).toBe("Install Node.js from nodejs.org, then rpg --version.");
    });

    it("previews a part by its first words, going on past a colon, and from a list when it starts with one", () => {
        expect(previewOf(markdownBlocks("Say it in your own words:\n\n- *I open the door.*\n- I wait."))).toBe("Say it in your own words: I open the door.");
        expect(previewOf(markdownBlocks("- Maps drawn by hand.\n- More voices."))).toBe("Maps drawn by hand.");
        expect(previewOf(markdownBlocks("| a |\n|---|\n| b |"))).toBe("");
    });
});

describe("the guide in every language (D-413)", () => {
    const english = englishGuide();
    const blocks = markdownBlocks(english);
    const headings = blocks.filter((block) => block.kind === "heading");

    it("gives each part an icon the page has, and links only to its own headings", () => {
        const parts = headings.filter((heading) => heading.level === 2);
        expect(parts.length).toBeGreaterThan(5);
        // The page's pictures, by their names in icons.tsx, which the tests cannot import.
        const icons = readFileSync(new URL("../src/dashboard/parts/icons.tsx", import.meta.url), "utf8");
        expect(parts.filter((part) => part.icon === undefined || !icons.includes(`\n    ${part.icon}: `)).map((part) => part.text)).toEqual([]);
        const anchors = new Set(headings.map((heading) => anchorOf(heading.text)));
        expect([...english.matchAll(/\]\(#([^)\s]+)\)/g)].map((match) => match[1]).filter((anchor) => !anchors.has(anchor))).toEqual([]);
    });

    it("has every shipped language translated from the English as it is now, with its headings, links and code: npm run translate makes it", () => {
        const stale = shippedLanguages.filter((language) => !isUpToDate(guideIn(language) ?? "", english));
        expect(stale).toEqual([]);
        const unlike = shippedLanguages.filter((language) => guideShape(guideIn(language) ?? "") !== guideShape(english));
        expect(unlike).toEqual([]);
    });

    it("names each setting in bold as the page does in every language, bent only by its grammar (T-195): npm run translate asks again what does not", () => {
        expect(settingNames()).toEqual(expect.arrayContaining(["Difficulty", "Premise", "Write like", "Standing orders", "The master's style"]));
        const unlike = shippedLanguages.flatMap((language) => {
            const phrases = JSON.parse(readFileSync(new URL(`../src/dashboard/i18n/${language}.json`, import.meta.url), "utf8")) as Record<string, string>;
            return unlikeSettingNames(language, english, guideIn(language) ?? "", phrases).map((one) => `${language}: ${one.name} is ${one.page} on the page, not in [${one.guide.join(", ")}]`);
        });
        expect(unlike).toEqual([]);
    });

    it("tells a setting's name bent by grammar from another word, and asks again only the paragraph that names it otherwise", () => {
        const english = "# Guide\n\n## One\n\nThe **premise** and the **length**.\n\nThe **Dice**.";
        const own = `${translationHead(guideMarks(english))}\n# Guida\n\n## Uno\n\nLa **premisy** e la **pituus**.\n\nI **Dadi**.\n`;
        const unlike = unlikeSettingNames("pl", english, own, { Premise: "Premisa", Length: "Długość", Dice: "Dadi" });
        expect(unlike.map((one) => [one.name, one.part, one.paragraph])).toEqual([["Length", 1, 1]]);
        expect(unlikeSettingNames("ar", english, own.replace("**Dadi**", "**الرفاق**"), { Dice: "رفاق", Premise: "premisy", Length: "pituus" })).toEqual([]);
        expect(planNamesAgain(guidePlan(english, own), unlike)[1]).toEqual({ paragraphs: ["## Uno", undefined, "I **Dadi**."], context: guideParts(own)[1] });
    });

    it("reads a translation's parts as the English's: its lead, then each part with its heading", () => {
        const parts = guideParts(english);
        expect(parts[0]).toMatch(/^# /);
        expect(parts.slice(1).every((part) => part.startsWith("## "))).toBe(true);
        expect(parts.join("\n\n")).toBe(english.trim());
    });
});

describe("the guide translated paragraph by paragraph (T-183)", () => {
    const english = "# Guide\n\nThe lead.\n\n---\n\n## One\n\nFirst.\n\n```\nrpg init\n\nrpg play\n```\n\nThird.";
    const translated = (marks: string[][]): string => `${translationHead(marks)}\n# Guida\n\nL'inizio.\n\n---\n\n## Uno\n\nPrimo.\n\n\`\`\`\nrpg init\n\nrpg play\n\`\`\`\n\nTerzo.\n`;

    it("splits a part at its blank lines, a block of code whole", () => {
        expect(paragraphsOf(guideParts(english)[1] ?? "")).toEqual(["## One", "First.", "```\nrpg init\n\nrpg play\n```", "Third."]);
    });

    it("reads its marks back, and an older guide's one for each part", () => {
        expect(marksOf(translated(guideMarks(english)))).toEqual(guideMarks(english));
        expect(marksOf("<!-- Translated from en.md, part by part, by npm run translate: aaaa bbbb. Change the English, then run it again. -->")).toEqual([["aaaa"], ["bbbb"]]);
    });

    it("is up to date with the marks of its paragraphs or of its whole parts", () => {
        expect(isUpToDate(translated(guideMarks(english)), english)).toBe(true);
        expect(isUpToDate(translated(guideParts(english).map((part) => [markOf(part)])), english)).toBe(true);
        expect(isUpToDate(translated(guideMarks(english)), english.replace("Third.", "Third, changed."))).toBe(false);
    });

    it("keeps what did not change and asks again only the paragraph that did, with its part as translated now", () => {
        const plan = guidePlan(english.replace("First.", "First, changed."), translated(guideMarks(english)));
        expect(plan[0]).toEqual({ kept: "# Guida\n\nL'inizio.\n\n---" });
        expect(plan[1]).toEqual({ paragraphs: ["## Uno", undefined, "```\nrpg init\n\nrpg play\n```", "Terzo."], context: guideParts(translated([]))[1] });
    });

    it("finds the paragraphs of an older guide, marked by its parts, while its English is the same", () => {
        const older = translated(guideParts(english).map((part) => [markOf(part)]));
        expect(guidePlan(english.replace("Third.", "Third, changed."), older)[1]).toEqual({ whole: true });
        expect(guidePlan(english, older)[1]).toEqual({ kept: guideParts(older)[1] });
    });

    it("asks a part whole when it is new, though its rule or its code reads as another part's", () => {
        expect(guidePlan(`${english}\n\n## Two\n\nNew.\n\n---`, translated(guideMarks(english)))[2]).toEqual({ whole: true });
        expect(guidePlan(`${english}\n\n## Two\n\n\`\`\`\nrpg init\n\nrpg play\n\`\`\``, translated(guideMarks(english)))[2]).toEqual({ whole: true });
    });

    it("keeps a part as it is when another part shares one of its paragraphs", () => {
        const twice = "# Guide\n\nSee below.\n\n## One\n\nSee below.\n\nFirst.";
        const own = `${translationHead(guideMarks(twice))}\n# Guida\n\nVedi sotto.\n\n## Uno\n\nVedi più avanti.\n\nPrimo.\n`;
        expect(guidePlan(twice, own)[0]).toEqual({ kept: "# Guida\n\nVedi sotto." });
    });
});
