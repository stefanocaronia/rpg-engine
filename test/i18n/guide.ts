// The guide in every language the page ships (D-413): src/dashboard/guide/en.md, written by hand, and a file for each other language, translated from it by
// test/i18n/translate.ts part by part, its lead and each of its ## parts, whose first line names the mark of the English each part comes from: a change to
// the English translates again only the parts it touched. The test checks each language against the English; translate.ts writes them.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { markdownBlocks } from "../../src/dashboard/guide-blocks.ts";
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

/** A short mark of each part of the English, in order. */
export function partMarks(english: string): string[]
{
    return guideParts(english).map((part) => createHash("sha256").update(part).digest("hex").slice(0, 8));
}

/** The first line of a translated guide: the mark of the English each of its parts comes from, and how to make it again. */
export function translationHead(marks: string[]): string
{
    return `<!-- Translated from en.md, part by part, by npm run translate: ${marks.join(" ")}. Change the English, then run it again. -->`;
}

/** The marks a translated guide's first line names, one for each part; none when it names none. */
export function marksOf(translation: string): string[]
{
    return /^<!-- Translated from en\.md, part by part, by npm run translate: ([\w ]+)\./.exec(translation)?.[1].split(" ") ?? [];
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
