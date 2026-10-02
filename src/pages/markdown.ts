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

/** A section: its heading and everything under it, down to the next heading of the same or a higher level. Titles ignore case. */
export function readSection(text: string, title: string): string | undefined
{
    const lines = text.split("\n");
    const range = findSection(lines, title);
    return range === undefined ? undefined : trimBlankLines(lines.slice(range.start, range.end).join("\n"));
}

/** Replaces the whole text or one section's text, or adds to it. A missing section is added at the end. */
export function writeText(text: string, newText: string, options: { section?: string; append?: boolean; }): string
{
    if (options.section === undefined) {
        return options.append ? joinBlocks(text, newText) : trimBlankLines(newText);
    }

    const lines = text.split("\n");
    const range = findSection(lines, options.section);

    if (range === undefined) {
        return joinBlocks(text, `## ${options.section.trim()}`, newText);
    }

    const content = lines.slice(range.start + 1, range.end).join("\n");
    const before = lines.slice(0, range.start).join("\n");
    const after = lines.slice(range.end).join("\n");
    return joinBlocks(before, lines[range.start], options.append ? joinBlocks(content, newText) : newText, after);
}

/** The pages a text links to, as in [[Page]], [[Page#Section]] or [[Page|label]]. */
export function linkedPages(text: string): string[]
{
    return [...text.matchAll(linkPattern)].map((match) => match[1].trim());
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

function findSection(lines: string[], title: string): { start: number; end: number; } | undefined
{
    const headings = headingsOf(lines);
    const index = headings.findIndex((heading) => heading.title.toLowerCase() === title.trim().toLowerCase());

    if (index === -1) {
        return undefined;
    }

    const heading = headings[index];
    const next = headings.slice(index + 1).find((other) => other.level <= heading.level);
    return { start: heading.line, end: next?.line ?? lines.length };
}

function headingsOf(lines: string[]): Heading[]
{
    const headings: Heading[] = [];
    let inFence = false;

    lines.forEach((line, index) => {
        if (fencePattern.test(line)) {
            inFence = !inFence;
            return;
        }

        const match = inFence ? null : headingPattern.exec(line);

        if (match) {
            headings.push({ line: index, level: match[1].length, title: match[2].trim() });
        }
    });
    return headings;
}
