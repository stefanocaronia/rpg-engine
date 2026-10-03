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
    const keys = names.map((name) => name.toLowerCase());
    return names.filter((name, index) => keys.indexOf(keys[index]) === index && keys.lastIndexOf(keys[index]) !== index);
}

/** A section with its subsections, down to the next heading of the same or a higher level, or a secret block. Names ignore case. */
export function readSection(text: string, title: string): string | undefined
{
    const lines = text.split("\n");
    const range = findSection(lines, title, "whole") ?? findSecret(lines, title);
    return range === undefined ? undefined : trimBlankLines(lines.slice(range.start, range.end).join("\n"));
}

/**
 * Replaces, or adds to, the introduction (the text before the first heading), a section's own text (its subsections stay) or a secret block.
 * A missing section is added at the end, at the page's top heading level.
 */
export function writeText(text: string, newText: string, options: { section?: string; append?: boolean; }): string
{
    const lines = text.split("\n");
    const combine = (oldText: string): string => (options.append ? joinBlocks(oldText, newText) : newText);

    if (options.section === undefined) {
        const end = headingsOf(lines)[0]?.line ?? lines.length;
        return joinBlocks(combine(lines.slice(0, end).join("\n")), lines.slice(end).join("\n"));
    }

    const section = findSection(lines, options.section, "own");

    if (section !== undefined) {
        const content = lines.slice(section.start + 1, section.end).join("\n");
        return joinBlocks(lines.slice(0, section.start).join("\n"), lines[section.start], combine(content), lines.slice(section.end).join("\n"));
    }

    const secret = findSecret(lines, options.section);

    if (secret !== undefined) {
        const content = lines.slice(secret.start + 1, secret.end).map((line) => line.replace(/^>[ \t]?/, "")).join("\n");
        const quoted = trimBlankLines(combine(content)).split("\n").map((line) => (line === "" ? ">" : `> ${line}`));
        return [...lines.slice(0, secret.start + 1), ...quoted, ...lines.slice(secret.end)].join("\n");
    }

    return joinBlocks(text, `${"#".repeat(topHeadingLevel(lines))} ${options.section.trim()}`, newText);
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
function findSection(lines: string[], title: string, scope: "whole" | "own"): Range | undefined
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

function findSecret(lines: string[], title: string): Range | undefined
{
    return secretsOf(lines).find((secret) => secret.title.toLowerCase() === title.trim().toLowerCase());
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

            while (end < lines.length && lines[end].startsWith(">")) {
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
