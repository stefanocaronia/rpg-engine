const headingPattern = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const fencePattern = /^[ \t]*(```|~~~)/;
const linkPattern = /\[\[([^\]|#^]+)(?:[#^][^\]|]*)?(?:\|[^\]]*)?\]\]/g;

interface Heading
{
    line: number;
    level: number;
    title: string;
}

/** The titles of the sections in a markdown text. */
export function sectionTitles(text: string): string[]
{
    return headingsOf(text.split("\n")).map((heading) => heading.title);
}

/** A section: its heading and everything under it, subsections included, down to the next heading of the same or a higher level. Titles ignore case. */
export function readSection(text: string, title: string): string | undefined
{
    const lines = text.split("\n");
    const range = findSection(lines, title, "whole");
    return range === undefined ? undefined : trimBlankLines(lines.slice(range.start, range.end).join("\n"));
}

/** Replaces the whole text or a section's own text (its subsections stay), or adds to it. A missing section is added at the end, at the page's top heading level. */
export function writeText(text: string, newText: string, options: { section?: string; append?: boolean; }): string
{
    if (options.section === undefined) {
        return options.append ? joinBlocks(text, newText) : trimBlankLines(newText);
    }

    const lines = text.split("\n");
    const range = findSection(lines, options.section, "own");

    if (range === undefined) {
        return joinBlocks(text, `${"#".repeat(topHeadingLevel(lines))} ${options.section.trim()}`, newText);
    }

    const content = lines.slice(range.start + 1, range.end).join("\n");
    const before = lines.slice(0, range.start).join("\n");
    const after = lines.slice(range.end).join("\n");
    return joinBlocks(before, lines[range.start], options.append ? joinBlocks(content, newText) : newText, after);
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

function joinBlocks(...blocks: string[]): string
{
    return blocks.map(trimBlankLines).filter((block) => block !== "").join("\n\n");
}

/** The lines of a section: the whole of it, or only its own text, up to its first subsection. */
function findSection(lines: string[], title: string, scope: "whole" | "own"): { start: number; end: number; } | undefined
{
    const headings = headingsOf(lines);
    const index = headings.findIndex((heading) => heading.title.toLowerCase() === title.trim().toLowerCase());

    if (index === -1) {
        return undefined;
    }

    const heading = headings[index];
    const next = headings.slice(index + 1).find((other) => scope === "own" || other.level <= heading.level);
    return { start: heading.line, end: next?.line ?? lines.length };
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
