// The laws of rules as text (MECCANICHE, RUL-n), checked on rules texts generated at random (D-118).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { findRules, hasAllWords, isTitled, type RuleSection, ruleSections, shownRules } from "../src/rules/index.ts";

const titles = ["Combat", "Grappling", "Grappled", "Cover", "Long Rest", "Escaping a Grapple", "Speed", "Hiding"];
const words = ["grapple", "creature", "rest", "speed", "cover", "attack", "the", "hiding", "restrained", "concentration"];
const runs = { numRuns: 500 };

// A block of a rules text: a heading, a title in bold that opens a paragraph, a paragraph, a caption, a table or a block of code.
const block = fc.oneof(
    fc.tuple(fc.integer({ min: 1, max: 4 }), fc.constantFrom(...titles)).map(([level, title]) => `${"#".repeat(level)} ${title}`),
    fc.tuple(fc.constantFrom(...titles), fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 6 })).map(([title, text]) => `***${title}.*** ${text.join(" ")}.`),
    fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 12 }).map((text) => `${text.join(" ")}.`),
    fc.constantFrom(...titles).map((title) => `**${title}**`),
    fc.constant("| Size | Space |\n|---|---|\n| Tiny | 2½ by 2½ ft. |"),
    fc.constantFrom(...titles).map((title) => `\`\`\`\n# ${title}\n\`\`\``),
);
const texts = fc.array(block, { minLength: 1, maxLength: 14 }).map((blocks) => `${blocks.join("\n\n")}\n`);
const searches = fc.oneof(fc.constantFrom(...titles), fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 3 }).map((chosen) => chosen.join(" ")));

function sectionsOf(text: string): RuleSection[]
{
    return ruleSections(text, "Chapter", "test");
}

describe("the laws of rules as text", () => {
    it("RUL-1: each section is the file's own text, holds its parts and not in its own text, and its path ends with its title below the path of the section that holds it", () => {
        fc.assert(
            fc.property(texts, (text) => {
                const sections = sectionsOf(text);

                for (const [index, section] of sections.entries()) {
                    expect(text).toContain(section.text);
                    // Its parts come before the next section of its level or above, or the first that its text does not hold: two sections may have the same title
                    // and the same parts (# Cover, ## Hiding twice), and a caption after a heading of a lower level is that heading's (seed -333507324).
                    const after = sections.slice(index + 1);
                    const next = after.findIndex((other) => other.level <= section.level || !section.text.includes(other.text));
                    const within = next === -1 ? after : after.slice(0, next);
                    const parts = within.filter((other) => other.path.length === section.path.length + 1 && other.path.slice(0, -1).join("\n") === section.path.join("\n") && section.text.includes(other.text));
                    expect(parts.map((part) => part.path.at(-1))).toEqual(section.parts);
                    // Its own text leaves its parts out: it is shorter than its text by at least theirs (the same words may be written twice, so they are not looked for).
                    expect(section.ownText.length).toBeLessThanOrEqual(section.text.length - parts.reduce((sum, part) => sum + part.text.length, 0));
                    const outer = sections.slice(0, index).reverse().find((previous) => previous.level < section.level && previous.text.includes(section.text));
                    expect(section.path.slice(0, -1)).toEqual(outer?.path ?? []);
                }
            }),
            runs,
        );
    });

    it("RUL-1: two sections with the same title each hold their own parts (found by the law on CI)", () => {
        const sections = sectionsOf("# Cover\n\n## Hiding\n\n# Cover\n\n## Hiding\n");
        expect(sections.map((section) => [section.path.join(" › "), section.parts])).toEqual([["Cover", ["Hiding"]], ["Cover › Hiding", []], ["Cover", ["Hiding"]], ["Cover › Hiding", []]]);
    });

    it("RUL-1: a title in a block of code is never a section, and a section never begins inside one", () => {
        fc.assert(
            fc.property(texts, (text) => {
                const fenced = [...text.matchAll(/```\n# ([^\n]+)\n```/g)].length;
                const headings = text.split("\n").filter((line) => /^#{1,6} /.test(line)).length - fenced;
                const sections = sectionsOf(text);
                expect(sections.filter((section) => section.level > 0 && section.text.startsWith("#")).length).toBe(headings);
            }),
            runs,
        );
    });

    it("RUL-3: a section named by its whole path is found among the first, after which come only sections that are not named", () => {
        fc.assert(
            fc.property(texts, (text) => {
                const sections = sectionsOf(text);

                for (const section of sections) {
                    const search = section.path.join(" › ");
                    const found = findRules(sections, search);
                    const named = found.filter((finding) => finding.titled);
                    expect(named.map((finding) => finding.section)).toContain(section);
                    expect(found.slice(0, named.length).every((finding) => finding.titled && isTitled(finding.section, search))).toBe(true);
                }
            }),
            runs,
        );
    });

    it("RUL-5: a search finds only sections with a form of its words, the better first", () => {
        fc.assert(
            fc.property(texts, searches, (text, search) => {
                const found = findRules(sectionsOf(text), search).filter((finding) => !finding.titled);
                expect(found.every((finding, index) => index === 0 || found[index - 1].score >= finding.score)).toBe(true);
                const words = search.split(" ");
                expect(found.every((finding) => words.some((word) => hasAllWords([...finding.section.path, finding.section.ownText].join(" "), word)))).toBe(true);
                expect(findRules(sectionsOf(text), "zzzz")).toEqual([]);
            }),
            runs,
        );
    });

    it("RUL-6: an answer shows the first section found, never a text twice, and stays within its words unless one section alone is longer", () => {
        fc.assert(
            fc.property(texts, searches, fc.integer({ min: 0, max: 60 }), (text, search, budget) => {
                const found = findRules(sectionsOf(text), search);
                const { shown, others } = shownRules(found, budget);

                if (found.length > 0) {
                    expect(shown[0].section).toBe(found[0].section);
                }

                for (const first of shown) {
                    for (const second of shown) {
                        expect(first === second || !(first.parts.length === 0 && first.section.text.includes(second.section.text) && second.section.path.join("\n").startsWith(first.section.path.join("\n")))).toBe(true);
                    }
                }

                const used = shown.reduce((sum, entry) => sum + entry.text.split(/\s+/).filter((word) => word !== "").length, 0);
                expect(shown.length <= 1 || used <= budget).toBe(true);
                expect(shown.length + others.length).toBeLessThanOrEqual(found.length);
            }),
            runs,
        );
    });
});
