import { rememberedByText } from "../core/memo.ts";
import { comparableText, linkTargetName } from "../core/text.ts";

const headingPattern = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
// A callout may stand up to three spaces in, as under an item of a list, and Obsidian still draws it as one.
const secretPattern = /^[ \t]{0,3}>[ \t]*\[!secret\][+-]?[ \t]*(.*?)[ \t]*$/i;
const quotePattern = /^[ \t]{0,3}>[ \t]?/;
// Comments as Obsidian hides them in reading view: between %% marks, and HTML ones.
const htmlCommentPattern = /<!--[\s\S]*?(?:-->|$)/g;
const fencePattern = /^[ \t]*(`{3,}|~{3,})(.*)$/;
// Inline code, as `x` or ``x``: a run of backticks closed by a run just as long.
const inlineCodePattern = /(?<!`)(`+)(?!`)(.*?)(?<!`)\1(?!`)/g;
const linkPattern = /\[\[([^\]|#^]+)(?:#([^\]|^]*))?(?:\^[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
// A goal as a quest lists it, a checkbox: - [ ] to do, - [x] done; in a quote or a secret too.
const goalPattern = /^[ \t>]*[-*+][ \t]+\[([ xX])\]/;

/** Where a link points: a page, and a section or secret of it. */
export interface Link
{
    page: string;
    section?: string;
}

interface Heading
{
    line: number;
    level: number;
    title: string;
}

/** A line as links and titles read it: code, begun inside a comment, and what is left of it outside code and comments. */
interface LineView
{
    code: boolean;
    commented: boolean;
    prose: string;
}

/** A block of lines: from `start` up to, not including, `end`. */
interface Range
{
    start: number;
    end: number;
}

/** The titles of the sections in a markdown text. Read once for each text: rules looks through every page's (RUL-6). */
export function sectionTitles(text: string): string[]
{
    return rememberedTitles(text);
}

const rememberedTitles = rememberedByText((text: string): string[] => headingsOf(text.split("\n")).map((heading) => heading.title), 20_000);

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

/** The sections and secrets of a text, in order, each with its own text: a section's heading and lines up to the next heading, without the secrets in them, which are parts of their own. */
export function textParts(text: string): { name: string; text: string; }[]
{
    const lines = text.split("\n");
    const headings = headingsOf(lines);
    const secrets = secretsOf(lines);
    const inSecret = (index: number): boolean => secrets.some((secret) => index >= secret.start && index < secret.end);
    const sections = headings.map((heading, index) => {
        const own = lines.slice(heading.line, headings[index + 1]?.line ?? lines.length).filter((_, offset) => !inSecret(heading.line + offset));
        return { start: heading.line, name: heading.title, text: trimBlankLines(own.join("\n").replace(/\n{3,}/g, "\n\n")) };
    });
    const blocks = secrets.map((secret) => ({ start: secret.start, name: secret.title, text: lines.slice(secret.start, secret.end).join("\n") }));
    return [...sections, ...blocks].sort((first, second) => first.start - second.start).map(({ name, text: partText }) => ({ name, text: partText }));
}

/** The introduction of a text, before the first heading, without its secrets. */
export function introductionText(text: string): string
{
    const lines = text.split("\n");
    const end = headingsOf(lines)[0]?.line ?? lines.length;
    const secrets = secretsOf(lines);
    const own = lines.slice(0, end).filter((_, index) => !secrets.some((secret) => index >= secret.start && index < secret.end));
    return trimBlankLines(own.join("\n").replace(/\n{3,}/g, "\n\n"));
}

/** The own text of a section, without its heading, subsections and secrets, or of a secret, without its mark and quotes; undefined when the text has no part with that name. */
export function partContent(text: string, name: string): { secret: boolean; content: string; } | undefined
{
    const lines = text.split("\n");
    const section = findSection(lines, name, "own");

    if (section !== undefined) {
        const secrets = secretsWithin(lines, { start: section.start + 1, end: section.end });
        const own = lines.slice(section.start + 1, section.end).filter((_, offset) => !secrets.some((secret) => section.start + 1 + offset >= secret.start && section.start + 1 + offset < secret.end));
        return { secret: false, content: trimBlankLines(own.join("\n").replace(/\n{3,}/g, "\n\n")) };
    }

    const secret = findSecret(lines, name);
    return secret === undefined ? undefined : { secret: true, content: trimBlankLines(lines.slice(secret.start + 1, secret.end).map((line) => line.replace(quotePattern, "")).join("\n")) };
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

        const content = lines.slice(secret.start + 1, secret.end).map((line) => line.replace(quotePattern, "")).join("\n");
        const quoted = quoteLines(options.mode === "append" ? joinBlocks(content, newText) : newText);
        return [...lines.slice(0, secret.start + 1), ...quoted, ...lines.slice(secret.end)].join("\n");
    }

    if (options.mode === "remove") {
        throw new Error(`There is no section or secret "${title}" to remove: show the page to see their names, or give some text to create it.`);
    }

    const block = options.secret ? [`> [!secret] ${title}`, ...quoteLines(newText)].join("\n") : `${"#".repeat(topHeadingLevel(lines))} ${title}\n\n${newText}`;
    return joinBlocks(text, block);
}

/** The pages a text links to, as in [[Page]], [[Page#Section]], [[Page|label]] or [[folder/Page.md]]. Links in code and in %% comments %% do not count. */
export function linkedPages(text: string): string[]
{
    return links(text).map((link) => link.page);
}

/**
 * The links of a text, with the section or secret they point to, as in [[Page#Section]]. Links in code and in %% comments %%, and attachments as ![[map.png]],
 * do not count. Read once for each text.
 */
export function links(text: string): Link[]
{
    return rememberedLinks(text);
}

const rememberedLinks = rememberedByText((text: string): Link[] => {
    // A file of another kind, as ![[map.png]], is an attachment, not a page.
    const page = (target: string): boolean => !/\.(?!md$)[a-z0-9]+$/i.test(target.trim());
    return lineViews(text.split("\n")).flatMap((view) => [...view.prose.matchAll(linkPattern)].filter((match) => page(match[1])).map((match) => linkOf(match[1], match[2])));
}, 20_000);

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
    const views = lineViews(lines);
    const headings: Heading[] = [];

    lines.forEach((line, index) => {
        const match = isProse(views[index]) ? headingPattern.exec(line) : null;

        if (match) {
            headings.push({ line: index, level: match[1].length, title: match[2].trim() });
        }
    });
    return headings;
}

/** The secret blocks: a `> [!secret] Name` line and the quoted lines after it. */
function secretsOf(lines: string[]): (Range & { title: string; })[]
{
    const views = lineViews(lines);
    const secrets: (Range & { title: string; })[] = [];

    lines.forEach((line, index) => {
        const match = isProse(views[index]) ? secretPattern.exec(line) : null;

        if (match) {
            let end = index + 1;

            while (end < lines.length && quotePattern.test(lines[end]) && !secretPattern.test(lines[end])) {
                end++;
            }

            secrets.push({ start: index, end, title: match[1] });
        }
    });
    return secrets;
}

/** A text without its comments, as Obsidian shows it in reading view: what lies between %% marks, also across lines, and HTML comments; code stays as it is (LNK-2). */
export function withoutComments(text: string): string
{
    const lines = text.split("\n");
    const views = lineViews(lines);
    const shown = lines.map((line, index) => {
        const parts = line.split("%%");
        // A line that loses a comment loses the space before it too.
        return views[index].code || (parts.length === 1 && !views[index].commented) ? line : parts.filter((_, part) => (part % 2 === 0) === !views[index].commented).join("").trimEnd();
    });
    return trimBlankLines(shown.join("\n").replace(htmlCommentPattern, "").replace(/\n[ \t]*(?:\n[ \t]*){2,}/g, "\n\n"));
}

/** The lines, counted from 1, that mark a secret the engine does not read as one, as a callout four spaces in: written for a secret, read as public text. */
export function unreadSecretLines(text: string): number[]
{
    const lines = text.split("\n");
    const views = lineViews(lines);
    return lines.flatMap((line, index) => (isProse(views[index]) && /\[!secret\]/i.test(line) && !secretPattern.test(line) ? [index + 1] : []));
}

/** The goals a text lists as checkboxes, outside code blocks, each with whether it is ticked; and the text without them, for a quest's card (VIEW-8). */
export function goalsIn(text: string): { goals: { text: string; done: boolean; }[]; rest: string; }
{
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const views = lineViews(lines);
    const goals: { text: string; done: boolean; }[] = [];
    const rest = lines.filter((line, index) => {
        const match = isProse(views[index]) ? goalPattern.exec(line) : null;

        if (match !== null) {
            goals.push({ text: line.slice(match[0].length).trim(), done: match[1] !== " " });
        }

        return match === null;
    });
    return { goals, rest: trimBlankLines(rest.join("\n")) };
}

/** Whether a text lists goals as checkboxes, outside code blocks, and every one is ticked. */
export function everyGoalTicked(text: string): boolean
{
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const views = lineViews(lines);
    const marks = lines.flatMap((line, index) => (isProse(views[index]) ? (goalPattern.exec(line)?.slice(1) ?? []) : []));
    return marks.length > 0 && marks.every((mark) => mark !== " ");
}

/**
 * Each line as links and titles read it (LNK-2): whether it is code, a fence or a line of a block, which only a fence of the same character, at least as long and
 * with nothing after it, closes; whether it begins inside a %% comment, which may span lines; and its prose, without inline code and comments.
 */
function lineViews(lines: string[]): LineView[]
{
    let fence: string | undefined;
    let comment = false;

    return lines.map((line) => {
        const [, marks, rest] = fencePattern.exec(line) ?? [];
        const closes = fence !== undefined && marks?.[0] === fence[0] && marks.length >= fence.length && rest.trim() === "";

        if (marks !== undefined && !comment && (fence === undefined || closes)) {
            fence = fence === undefined ? marks : undefined;
            return { code: true, commented: false, prose: "" };
        }

        if (fence !== undefined) {
            return { code: true, commented: false, prose: "" };
        }

        const commented = comment;
        const parts = line.replace(inlineCodePattern, "").split("%%");
        comment = parts.length % 2 === 0 ? !comment : comment;
        return { code: false, commented, prose: parts.filter((_, index) => (index % 2 === 0) === !commented).join("") };
    });
}

/** Whether a line can hold a title, a secret or a goal: neither code nor begun inside a comment. */
function isProse(view: LineView): boolean
{
    return !view.code && !view.commented;
}

/** The page and section a link points to: [[folder/Page.md]], and [[Page\|label]] as written in tables, point to Page. */
function linkOf(target: string, section: string | undefined): Link
{
    const page = linkTargetName(target);
    const title = section?.replace(/\\$/, "").trim();
    return title === undefined || title === "" ? { page } : { page, section: title };
}
