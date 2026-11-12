// The guide in every language the page ships (D-413): src/dashboard/guide/en.md, written by hand, and a file for each other language, translated from it by
// test/i18n/translate.ts, its lead and each of its ## parts, whose first line names the marks of the English paragraphs each part comes from: a change to
// the English translates again only the paragraphs it touched, with their part as context. The test checks each language against the English; translate.ts
// writes them.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { markdownBlocks } from "../../src/dashboard/help/blocks.ts";
import { pageFolder } from "./phrases.ts";

/** The folder of the guide's files. */
export const guideFolder = join(pageFolder, "guide");

/** The English guide, as written. */
export function englishGuide(): string
{
    return readFileSync(join(guideFolder, "en.md"), "utf8").replace(/\r\n/g, "\n");
}

/** The guide in a language, as translated; undefined when it has none yet. */
export function guideIn(language: string): string | undefined
{
    const file = join(guideFolder, `${language}.md`);
    return existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : undefined;
}

/** A guide's parts, its translation's first line aside: the lead, before its first ## heading, then each ## part with its heading. */
export function guideParts(text: string): string[]
{
    const lines = text.replace(/^<!-- Translated from[^\n]*\n/, "").split("\n");
    const starts = lines.flatMap((line, index) => (line.startsWith("## ") ? [index] : []));
    return [0, ...starts].map((start, index) => lines.slice(start, [...starts, lines.length][index]).join("\n").trim());
}

/** A part's paragraphs, split at its blank lines, a block of code whole. */
export function paragraphsOf(part: string): string[]
{
    const paragraphs: string[][] = [[]];
    let inCode = false;

    for (const line of part.split("\n")) {
        if (line.startsWith("```")) {
            inCode = !inCode;
        }

        if (line.trim() === "" && !inCode) {
            paragraphs.push([]);
        } else {
            paragraphs.at(-1)?.push(line);
        }
    }

    return paragraphs.filter((lines) => lines.length > 0).map((lines) => lines.join("\n"));
}

/** A short mark of a text of the English. */
export function markOf(text: string): string
{
    return createHash("sha256").update(text).digest("hex").slice(0, 8);
}

/** The marks of the English's paragraphs, part by part. */
export function guideMarks(english: string): string[][]
{
    return guideParts(english).map((part) => paragraphsOf(part).map(markOf));
}

/** The first line of a translated guide: the marks of the English each of its parts comes from, its paragraphs' or the whole part's, and how to make it again. */
export function translationHead(marks: string[][]): string
{
    return `<!-- Translated from en.md, paragraph by paragraph, by npm run translate: ${marks.map((part) => part.join(",")).join(" ")}. Change the English, then run it again. -->`;
}

/** The marks a translated guide's first line names, for each part; none when it names none. An older guide's marks are its parts', one each. */
export function marksOf(translation: string): string[][]
{
    const marks = /^<!-- Translated from en\.md, (?:part by part|paragraph by paragraph), by npm run translate: ([\w, ]+)\./.exec(translation)?.[1];
    return marks?.split(" ").map((part) => part.split(",")) ?? [];
}

/** Whether a translation comes from the English as it is now: each of its parts from the English part, paragraph by paragraph or whole. */
export function isUpToDate(translation: string, english: string): boolean
{
    const marks = marksOf(translation);
    const parts = guideParts(english);
    return marks.length === parts.length && guideMarks(english).every((own, index) => [own.join(), markOf(parts[index] ?? "")].includes(marks[index]?.join() ?? ""));
}

/** What a translation has of each part of the English: the part whole, some of its paragraphs (undefined where one is to translate), or nothing. */
export type GuidePlan = { kept: string; } | { paragraphs: (string | undefined)[]; context: string; } | { whole: true; };

/** For each part of the English, what of it a translation already has, by the marks of the English its parts come from. */
export function guidePlan(english: string, translation: string): GuidePlan[]
{
    const own = guideParts(translation);
    const marks = marksOf(translation);
    const englishParts = guideParts(english);
    const englishMarks = new Map(englishParts.map((part) => [markOf(part), paragraphsOf(part).map(markOf)]));
    const known = new Map<string, { text: string; part: string; }>();
    const wholes = new Map<string, string>();

    // An older guide, or a part translated whole, names its part's mark: its paragraphs come from the English's when it has as many.
    (marks.length === own.length ? own : []).forEach((part, index) => {
        const paragraphs = paragraphsOf(part);
        const partMarks = marks[index] ?? [];
        const ofParagraphs = partMarks.length === 1 && paragraphs.length > 1 ? englishMarks.get(partMarks[0] ?? "") : partMarks;

        if (partMarks.length === 1) {
            wholes.set(partMarks[0] ?? "", part);
        }

        if (ofParagraphs?.length === paragraphs.length) {
            // A part whose paragraphs all come from an English part stays whole, before a paragraph it shares with another part takes the other's words.
            wholes.set(ofParagraphs.join(), part);
            ofParagraphs.forEach((mark, at) => known.set(mark, { text: paragraphs[at] ?? "", part }));
        }
    });

    return englishParts.map((part) => {
        const englishParagraphs = paragraphsOf(part);
        const whole = wholes.get(markOf(part)) ?? wholes.get(englishParagraphs.map(markOf).join());

        if (whole !== undefined) {
            return { kept: whole };
        }

        const paragraphs = englishParagraphs.map((paragraph) => known.get(markOf(paragraph)));
        // Only a paragraph translated into other words tells which part a translation has: a rule or a block of code reads the same in every part.
        const found = paragraphs.find((paragraph, at) => paragraph !== undefined && paragraph.text !== englishParagraphs[at]);

        if (found === undefined) {
            return { whole: true };
        }

        const texts = paragraphs.map((paragraph) => paragraph?.text);
        return texts.every((text) => text !== undefined) ? { kept: texts.join("\n\n") } : { paragraphs: texts, context: found.part };
    });
}

/** The names the page gives the campaign's settings and their groups, in English: read from the page's code, which the tests cannot import. */
export function settingNames(): string[]
{
    const labels = readFileSync(join(pageFolder, "parts", "labels.ts"), "utf8");
    const settings = readFileSync(join(pageFolder, "settings", "settings.tsx"), "utf8");
    const body = (code: string, start: string): string => code.slice(code.indexOf(start), code.indexOf("\n}\n", code.indexOf(start)));
    return [body(labels, "export function settingLabel("), body(settings, "function groupTitle(")].flatMap((code) => [...code.matchAll(/\bt\("([^"]+)"\)/g)].map((match) => match[1] ?? ""));
}

/** The words in bold in a text, without the colon or the stop after them. */
export function boldWords(text: string): string[]
{
    return [...text.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => (match[1] ?? "").replace(/[.:,：。]$/, "").trim());
}

/** A setting a translated guide names in bold otherwise than its page: its English name, the page's in the language, the guide's bold words there, and where. */
export interface UnlikeName
{
    name: string;
    page: string;
    guide: string[];
    part: number;
    /** The paragraph of the part, when the translation's paragraphs match the English's; else the part as a whole. */
    paragraph?: number;
}

/** Where a translated guide names a setting in bold otherwise than its page, paragraph by paragraph: the page is right, as the player looks for the name there. */
export function unlikeSettingNames(language: string, english: string, translation: string, phrases: Record<string, string>): UnlikeName[]
{
    const names = new Map(settingNames().map((name) => [name.toLowerCase(), name]));
    const own = guideParts(translation);
    return guideParts(english).flatMap((part, index) => {
        const englishParagraphs = paragraphsOf(part);
        const ownParagraphs = paragraphsOf(own[index] ?? "");
        const aligned = englishParagraphs.length === ownParagraphs.length;
        const pairs = aligned ? englishParagraphs.map((paragraph, at) => [paragraph, ownParagraphs[at] ?? ""]) : [[part, own[index] ?? ""]];
        return pairs.flatMap(([englishText = "", ownText = ""], at) =>
            boldWords(englishText).flatMap((bold) => {
                const name = names.get(bold.toLowerCase());
                const page = name === undefined ? undefined : phrases[name];
                const guide = boldWords(ownText);
                return name === undefined || page === undefined || guide.some((words) => sameName(words, page, language))
                    ? []
                    : [{ name, page, guide, part: index, ...(aligned ? { paragraph: at } : {}) }];
            })
        );
    });
}

/** A plan that asks again the paragraphs naming a setting otherwise than the page, with their part as translated now as context. */
export function planNamesAgain(plan: GuidePlan[], unlike: UnlikeName[]): GuidePlan[]
{
    return plan.map((planned, part) => {
        const again = new Set(unlike.flatMap((one) => (one.part === part && one.paragraph !== undefined ? [one.paragraph] : [])));

        if (again.size === 0 || "whole" in planned) {
            return planned;
        }

        const context = "kept" in planned ? planned.kept : planned.context;
        const paragraphs = "kept" in planned ? paragraphsOf(planned.kept) : planned.paragraphs;
        return { paragraphs: paragraphs.map((paragraph, at) => (again.has(at) ? undefined : paragraph)), context };
    });
}

/** Whether the guide's words name what the page does: the same words, in any case, each bent as the language's grammar wants it (its ending, an article). */
function sameName(guide: string, page: string, language: string): boolean
{
    // Accents aside: a Greek word's accent moves with its case.
    const words = (text: string): string[] => text.toLocaleLowerCase(language).normalize("NFD").replace(/\p{Mn}/gu, "").split(/\s+/);
    const article = { ar: /^ال/, he: /^ה/ }[language];
    const bare = (word: string): string => (article === undefined ? word : word.replace(article, ""));
    const own = words(guide);
    const pageWords = words(page);
    return own.length === pageWords.length && pageWords.every((word, index) => {
        const ownWord = own[index] ?? "";
        return [ownWord, bare(ownWord)].some((one) => one === word || one === bare(word) || (word.length > 4 && one.startsWith(word.slice(0, -2))));
    });
}

/** What a translation keeps of the English as it is: its headings' levels and icons, the anchors it links to, and its blocks of code, commands and output. */
export function guideShape(text: string): string
{
    const blocks = markdownBlocks(text);
    const all = blocks.flatMap((block) => (block.kind === "quote" ? block.blocks : [block]));
    return JSON.stringify({
        headings: all.flatMap((block) => (block.kind === "heading" ? [`${block.level} ${block.icon ?? ""}`] : [])),
        anchors: [...text.matchAll(/\]\((#[^)\s]+)\)/g)].map((match) => match[1]),
        code: all.flatMap((block) => (block.kind === "code" ? [block.text] : [])),
    });
}
