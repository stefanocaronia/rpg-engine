import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { filesIn } from "../core/files.ts";
import { frozen } from "../core/frozen.ts";

/**
 * A section of a rules text (RUL-1): a heading; a title in bold that opens a paragraph ("***Escaping a Grapple.*** A grappled creature…"), one level below the heading it is under;
 * or the caption of a table in bold, with its table.
 */
export interface RuleSection
{
    /** Where the rules come from, as the caller names them: the campaign's house rules, a game system. */
    source: string;
    /** The file it is in, without .md: a chapter, or a house rule, with its folder when it is in one. */
    file: string;
    /** The titles from the top of the file down to the section's own, which is the last. */
    path: string[];
    /** How deep it is: 1 for a top heading; 0 for the text of a file before its first heading. */
    level: number;
    /** The section as the file writes it, with its parts: the exact text. */
    text: string;
    /** The section without its parts: what a search reads. */
    ownText: string;
    /** The titles of its parts, one level below. */
    parts: string[];
}

/** The sections of the markdown files in a folder and its folders, file by file in order of path; none when there is no such folder. */
export function readRuleBook(folder: string, source: string): RuleSection[]
{
    return frozen(markdownFiles(folder).flatMap((path) => ruleSections(readFileSync(path, "utf8"), relative(folder, path).replace(/\\/g, "/").replace(/\.md$/i, ""), source)));
}

/** The files of rules in a folder and its folders, without .md, in order of path: the chapters of a game system, or the campaign's house rules. */
export function ruleFiles(folder: string): string[]
{
    return markdownFiles(folder).map((path) => relative(folder, path).replace(/\\/g, "/").replace(/\.md$/i, ""));
}

/** The title each file of a book opens with, in order: the house rules as status names them (D-178). */
export function bookTitles(sections: RuleSection[]): string[]
{
    const files = [...new Set(sections.map((section) => section.file))];
    return files.map((file) => sections.find((section) => section.file === file)?.path[0] ?? file);
}

/**
 * The sections of one rules text (RUL-1). A text before the first heading is a section named after the file, holding the whole file.
 * A byte order mark and the properties at the top (---) are not text; code blocks and %% comments hold no titles.
 */
export function ruleSections(text: string, file: string, source: string): RuleSection[]
{
    const content = withoutProperties(text.replace(/^﻿/, "").replace(/\r\n/g, "\n"));
    const markers = markersOf(content);
    const firstStart = markers[0]?.start ?? content.length;

    if (content.slice(0, firstStart).trim() !== "") {
        markers.unshift({ title: file.split("/").at(-1) ?? file, level: 0, start: 0, end: undefined });
    }

    const parents = parentsOf(markers);
    const ends = endsOf(markers, content.length);
    const children = markers.map((): number[] => []);
    parents.forEach((parent, index) => parent === undefined || children[parent].push(index));
    const paths: string[][] = [];

    return markers.map((marker, index) => {
        const parent = parents[index];
        paths.push([...(parent === undefined ? [] : paths[parent]), marker.title]);
        const parts = children[index];
        let ownText = "";
        let from = marker.start;

        for (const part of parts) {
            ownText += content.slice(from, markers[part].start);
            from = ends[part];
        }

        ownText += content.slice(from, ends[index]);
        return {
            source,
            file,
            path: paths[index],
            level: marker.level,
            text: content.slice(marker.start, ends[index]).trimEnd(),
            ownText: ownText.replace(/\n{3,}/g, "\n\n").trimEnd(),
            parts: parts.map((part) => markers[part].title),
        };
    });
}

interface Marker
{
    title: string;
    level: number;
    /** Where its line starts in the text. */
    start: number;
    /** Where it ends, for a caption with its table; otherwise at the next marker of its level or above. */
    end: number | undefined;
}

const headingPattern = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
// A title in bold that opens a paragraph and is followed by its text: ***Finesse.*** When making an attack…, **Dim light**, also called…
const boldTitlePattern = /^(\*{2,3})([^*\n]+?)\1[ \t]*[.:,]?[ \t]+\S/;
// A line all in bold: the caption of a table when one follows.
const captionPattern = /^(\*{2,3})([^*\n]+?)\1[ \t]*$/;

function markersOf(content: string): Marker[]
{
    const markers: Marker[] = [];
    const lines = content.split("\n");
    const starts: number[] = [];
    lines.reduce((start, line) => (starts.push(start), start + line.length + 1), 0);
    let heading = 0;
    let fence: string | undefined;
    let comment = false;

    for (const [index, line] of lines.entries()) {
        const fenceMark = /^(`{3,}|~{3,})/.exec(line)?.[1];

        if (fenceMark !== undefined && !comment && (fence === undefined || (fenceMark[0] === fence[0] && fenceMark.length >= fence.length))) {
            fence = fence === undefined ? fenceMark : undefined;
            continue;
        }

        if (fence === undefined && (line.match(/%%/g)?.length ?? 0) % 2 === 1) {
            comment = !comment;
            continue;
        }

        if (fence !== undefined || comment) {
            continue;
        }

        const headingMatch = headingPattern.exec(line);
        const captionMatch = headingMatch === null ? captionPattern.exec(line) : null;
        const boldMatch = headingMatch === null && captionMatch === null ? boldTitlePattern.exec(line) : null;

        if (headingMatch !== null) {
            heading = headingMatch[1].length;
            markers.push({ title: plainTitle(headingMatch[2]), level: heading, start: starts[index], end: undefined });
        } else if (boldMatch !== null) {
            markers.push({ title: plainTitle(boldMatch[2]), level: heading + 1, start: starts[index], end: undefined });
        } else if (captionMatch !== null) {
            const table = tableAfter(lines, index);

            if (table !== undefined) {
                const last = table.at(-1) ?? index;
                markers.push({ title: plainTitle(captionMatch[2]), level: heading + 1, start: starts[index], end: starts[last] + lines[last].length });
            }
        }
    }

    return markers;
}

/** The lines of the table right after a caption, blank lines between them allowed; undefined when no table follows. */
function tableAfter(lines: string[], caption: number): number[] | undefined
{
    let index = caption + 1;

    while (index < lines.length && lines[index].trim() === "") {
        index++;
    }

    const rows: number[] = [];

    while (index < lines.length && lines[index].trimStart().startsWith("|")) {
        rows.push(index);
        index++;
    }

    return rows.length > 0 ? rows : undefined;
}

/** For each marker, the one it is part of: the nearest before it of a lower level, unless that one has ended. */
function parentsOf(markers: Marker[]): (number | undefined)[]
{
    const open: number[] = [];
    return markers.map((marker, index) => {
        while (open.length > 0) {
            const top = markers[open[open.length - 1]];

            if (top.level < marker.level && (top.end === undefined || top.end > marker.start)) {
                break;
            }

            open.pop();
        }

        const parent = open.at(-1);
        open.push(index);
        return parent;
    });
}

/** Where each section ends: a caption where its table does, the others at the next marker of their level or above, or at the end of the text. */
function endsOf(markers: Marker[], length: number): number[]
{
    const ends = markers.map((marker) => marker.end ?? length);
    const open: number[] = [];

    for (const [index, marker] of markers.entries()) {
        while (open.length > 0 && markers[open[open.length - 1]].level >= marker.level) {
            ends[open.pop() ?? index] = marker.start;
        }

        if (marker.end === undefined) {
            open.push(index);
        }
    }

    return ends;
}

/** The text without the properties at its top: Obsidian writes them between two lines of three dashes. */
function withoutProperties(content: string): string
{
    const match = /^---\n[\s\S]*?\n(---|\.\.\.)(\n|$)/.exec(content);
    return match === null ? content : content.slice(match[0].length).replace(/^\n+/, "");
}

/** A title without its markdown marks and the stop that ends a title in bold: "*fly*" is fly, "Finesse." is Finesse. */
function plainTitle(title: string): string
{
    return title.replace(/[*_`]/g, "").replace(/[.:,]$/, "").trim();
}

function markdownFiles(folder: string): string[]
{
    return filesIn(folder, (name) => /\.md$/i.test(name)).sort((first, second) => (first < second ? -1 : first > second ? 1 : 0));
}
