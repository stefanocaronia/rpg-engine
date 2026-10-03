import { comparableText } from "../core/text.ts";

const headingPattern = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const secretPattern = /^>[ \t]*\[!secret\][+-]?[ \t]*(.*?)[ \t]*$/i;
const fencePattern = /^[ \t]*(```|~~~)/;
const linkPattern = /\[\[([^\]|#^]+)(?:[#^][^\]|]*)?(?:\|[^\]]*)?\]\]/g;

interface Heading
{
    line: number;
    level: number;
    title: string;
}

/** A block of lines: from `start` up to, not including, `end`. */
interface Range
{
    start: number;
    end: number;
}

/** The titles of the sections in a markdown text. */
export function sectionTitles(text: string): string[]
{
    return headingsOf(text.split("\n")).map((heading) => heading.title);
}

/** The names of the secret blocks, written `> [!secret] Name`, in a markdown text. */
export function secretNames(text: string): string[]
{
    return secretsOf(text.split("\n")).map((secret) => secret.title);
}

/** Names that a text gives to more than one section or secret, ignoring case; each is listed once, as first written. */
export function repeatedNames(text: string): string[]
{
    const names = [...sectionTitles(text), ...secretNames(text)];
    const keys = names.map(comparableText);
    return names.filter((name, index) => keys.indexOf(keys[index]) === index && keys.lastIndexOf(keys[index]) !== index);
}

/** A section with its subsections, down to the next heading of the same or a higher level, or a secret block. Names ignore case. */
export function readSection(text: string, title: string): string | undefined
{
    const lines = text.split("\n");
    const range = findSection(lines, title, "whole") ?? findSecret(lines, title);
    return range === undefined ? undefined : trimBlankLines(lines.slice(range.start, range.end).join("\n"));
}

/** How text is written: in place of the old text, added at its end, or, empty, removing a section or secret. */
export type TextMode = "replace" | "append" | "remove";

/**
 * Writes the introduction (the text before the first heading), a section's own text (its subsections stay) or a secret block.
 * Secret blocks inside a rewritten text stay, after the new text. A missing section is added at the end: at the page's top heading level, or as a secret block.
 */
export function writeText(text: string, newText: string, options: { section?: string; mode: TextMode; secret?: boolean; }): string
{
    const lines = text.split("\n");

    if (options.section === undefined) {
        const introduction = { start: 0, end: headingsOf(lines)[0]?.line ?? lines.length };
        return joinBlocks(newContent(lines, introduction, newText, options.mode), lines.slice(introduction.end).join("\n"));
    }

    const title = options.section.trim();
    const section = findSection(lines, title, "own");

    if (section !== undefined) {
        if (options.secret) {
            throw new Error(`"${title}" is a section, not a secret: write it without secret, or give the secret another name.`);
        }

        if (options.mode === "remove") {
            return removeSection(lines, title, section);
        }

        const content = newContent(lines, { start: section.start + 1, end: section.end }, newText, options.mode);
        return joinBlocks(lines.slice(0, section.start).join("\n"), lines[section.start], content, lines.slice(section.end).join("\n"));
    }

    const secret = findSecret(lines, title);

    if (secret !== undefined) {
        if (options.mode === "remove") {
            return joinBlocks(lines.slice(0, secret.start).join("\n"), lines.slice(secret.end).join("\n"));
        }

        const content = lines.slice(secret.start + 1, secret.end).map((line) => line.replace(/^>[ \t]?/, "")).join("\n");
        const quoted = quoteLines(options.mode === "append" ? joinBlocks(content, newText) : newText);
        return [...lines.slice(0, secret.start + 1), ...quoted, ...lines.slice(secret.end)].join("\n");
    }

    if (options.mode === "remove") {
        throw new Error(`There is no section or secret "${title}" to remove: show the page to see their names, or give some text to create it.`);
    }

    const block = options.secret ? [`> [!secret] ${title}`, ...quoteLines(newText)].join("\n") : `${"#".repeat(topHeadingLevel(lines))} ${title}\n\n${newText}`;
    return joinBlocks(text, block);
}

/** The pages a text links to, as in [[Page]], [[Page#Section]], [[Page|label]] or [[folder/Page.md]]. Links in code blocks do not count. */
export function linkedPages(text: string): string[]
{
    const lines = text.split("\n");
    const code = codeLines(lines);
    return lines.flatMap((line, index) => (code[index] ? [] : [...line.matchAll(linkPattern)].map((match) => linkTarget(match[1]))));
}

/** Removes the blank lines at the start and the white space at the end. */
export function trimBlankLines(text: string): string
{
    return text.replace(/^(?:[ \t]*\n)+/, "").trimEnd();
}

/** The new text of a range: added to the old one, or in its place, keeping the secret blocks that the new text does not write again. */
function newContent(lines: string[], range: Range, newText: string, mode: TextMode): string
{
    if (mode === "append") {
        return joinBlocks(lines.slice(range.start, range.end).join("\n"), newText);
    }

    const rewritten = secretNames(newText).map(comparableText);
    const kept = secretsWithin(lines, range).filter((secret) => !rewritten.includes(comparableText(secret.title)));
    return joinBlocks(newText, ...kept.map((secret) => lines.slice(secret.start, secret.end).join("\n")));
}

/** Removes a section with its own text; one with subsections or secrets is refused, so that nothing ends up elsewhere or is lost. */
function removeSection(lines: string[], title: string, own: Range): string
{
    if (findSection(lines, title, "whole")?.end !== own.end) {
        throw new Error(`"${title}" has subsections: remove them first, then the section.`);
    }

    const [secret] = secretsWithin(lines, { start: own.start + 1, end: own.end });

    if (secret !== undefined) {
        throw new Error(`"${title}" holds the secret "${secret.title}": remove or move it first, then the section.`);
    }

    return joinBlocks(lines.slice(0, own.start).join("\n"), lines.slice(own.end).join("\n"));
}

/** Text as the quoted lines of a secret block. */
function quoteLines(text: string): string[]
{
    return trimBlankLines(text).split("\n").map((line) => (line === "" ? ">" : `> ${line}`));
}

function joinBlocks(...blocks: string[]): string
{
    return blocks.map(trimBlankLines).filter((block) => block !== "").join("\n\n");
}

/** The lines of a section: the whole of it, or only its own text, up to its first subsection. */
function findSection(lines: string[], title: string, scope: "whole" | "own"): Range | undefined
{
    const headings = headingsOf(lines);
    const index = headings.findIndex((heading) => comparableText(heading.title) === comparableText(title.trim()));

    if (index === -1) {
        return undefined;
    }

    const heading = headings[index];
    const next = headings.slice(index + 1).find((other) => scope === "own" || other.level <= heading.level);
    return { start: heading.line, end: next?.line ?? lines.length };
}

function secretsWithin(lines: string[], range: Range): (Range & { title: string; })[]
{
    return secretsOf(lines).filter((secret) => secret.start >= range.start && secret.start < range.end);
}

function findSecret(lines: string[], title: string): Range | undefined
{
    return secretsOf(lines).find((secret) => comparableText(secret.title) === comparableText(title.trim()));
}

function topHeadingLevel(lines: string[]): number
{
    const levels = headingsOf(lines).map((heading) => heading.level);
    return levels.length > 0 ? Math.min(...levels) : 2;
}

function headingsOf(lines: string[]): Heading[]
{
    const code = codeLines(lines);
    const headings: Heading[] = [];

    lines.forEach((line, index) => {
        const match = code[index] ? null : headingPattern.exec(line);

        if (match) {
            headings.push({ line: index, level: match[1].length, title: match[2].trim() });
        }
    });
    return headings;
}

/** The secret blocks: a `> [!secret] Name` line and the quoted lines after it. */
function secretsOf(lines: string[]): (Range & { title: string; })[]
{
    const code = codeLines(lines);
    const secrets: (Range & { title: string; })[] = [];

    lines.forEach((line, index) => {
        const match = code[index] ? null : secretPattern.exec(line);

        if (match) {
            let end = index + 1;

            while (end < lines.length && lines[end].startsWith(">") && !secretPattern.test(lines[end])) {
                end++;
            }

            secrets.push({ start: index, end, title: match[1] });
        }
    });
    return secrets;
}

/** Which lines belong to fenced code blocks, the fences included. */
function codeLines(lines: string[]): boolean[]
{
    let inFence = false;
    return lines.map((line) => {
        if (fencePattern.test(line)) {
            inFence = !inFence;
            return true;
        }

        return inFence;
    });
}

/** The page a link points to: [[folder/Page.md]], and [[Page\|label]] as written in tables, point to Page. */
function linkTarget(target: string): string
{
    return (target.replace(/\\$/, "").split("/").at(-1) ?? "").replace(/\.md$/i, "").trim();
}
