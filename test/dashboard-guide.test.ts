import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { anchorOf, markdownBlocks, plainText } from "../src/dashboard/guide-blocks.ts";
import { shippedLanguages } from "../src/dashboard/text.ts";
import { englishGuide, guideIn, guideParts, guideShape, marksOf, partMarks } from "./i18n/guide.ts";

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
});

describe("the guide in every language (D-413)", () => {
    const english = englishGuide();
    const blocks = markdownBlocks(english);
    const headings = blocks.filter((block) => block.kind === "heading");

    it("gives each part an icon the page has, and links only to its own headings", () => {
        const parts = headings.filter((heading) => heading.level === 2);
        expect(parts.length).toBeGreaterThan(5);
        // The page's pictures, by their names in icons.tsx, which the tests cannot import.
        const icons = readFileSync(new URL("../src/dashboard/icons.tsx", import.meta.url), "utf8");
        expect(parts.filter((part) => part.icon === undefined || !icons.includes(`\n    ${part.icon}: `)).map((part) => part.text)).toEqual([]);
        const anchors = new Set(headings.map((heading) => anchorOf(heading.text)));
        expect([...english.matchAll(/\]\(#([^)\s]+)\)/g)].map((match) => match[1]).filter((anchor) => !anchors.has(anchor))).toEqual([]);
    });

    it("has every shipped language translated from the English as it is now, part by part, with its headings, links and code: npm run translate makes it", () => {
        const stale = shippedLanguages.filter((language) => marksOf(guideIn(language) ?? "").join() !== partMarks(english).join());
        expect(stale).toEqual([]);
        const unlike = shippedLanguages.filter((language) => guideShape(guideIn(language) ?? "") !== guideShape(english));
        expect(unlike).toEqual([]);
    });

    it("reads a translation's parts as the English's: its lead, then each part with its heading", () => {
        const parts = guideParts(english);
        expect(parts[0]).toMatch(/^# /);
        expect(parts.slice(1).every((part) => part.startsWith("## "))).toBe(true);
        expect(parts.join("\n\n")).toBe(english.trim());
    });
});
