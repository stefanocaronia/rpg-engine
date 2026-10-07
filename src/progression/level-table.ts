// The table of a page that counts levels, such as a class's (D-201, D-219, PRO-1–PRO-3): the row at a level gives its columns, and the rows up to it the
// features gained so far. It reads markdown and knows no game: the system says which column holds the features and which columns give nothing.
import { comparableText } from "../core/text.ts";

/** A table whose first column counts levels: the names of its columns, and the cells of each row by its level. */
export interface LevelTable
{
    columns: string[];
    rows: Map<number, string[]>;
}

/** A feature gained at a level, as a name and, when the table gives one, its value in parentheses: Bardic Inspiration (d8). */
export interface GainedFeature
{
    level: number;
    name: string;
}

/**
 * The first table of a markdown text that has a column by this name, such as Features, and whose first column counts levels, 1st, 2nd… or 1, 2… (PRO-1): a table
 * of a die that comes before it, such as d6 and Personality Trait, is not one. Undefined when it has none.
 */
export function levelTable(text: string, column: string): LevelTable | undefined
{
    const lines = text.split(/\r?\n/);

    for (let index = 0; index < lines.length - 1; index++) {
        if (!isTableLine(lines[index]) || !isSeparatorLine(lines[index + 1])) {
            continue;
        }

        const body: string[][] = [];
        let next = index + 2;

        for (; next < lines.length && isTableLine(lines[next]); next++) {
            body.push(cellsOf(lines[next]));
        }

        const columns = cellsOf(lines[index]);
        const levels = body.map((cells) => levelOf(cells[0] ?? ""));

        if (body.length > 0 && levels.every((level) => level !== undefined) && columns.slice(1).some((name) => comparableText(name) === comparableText(column))) {
            return { columns, rows: new Map(body.map((cells, position) => [levels[position] as number, cells])) };
        }

        index = next - 1;
    }

    return undefined;
}

/**
 * The fields the row at a level gives (PRO-2): each column but the first, the features column and those skipped, named in lowercase with hyphens (Rage Damage
 * gives rage-damage), with its cell; an empty cell or a dash gives nothing. None when the table has no row at that level.
 */
export function rowFields(table: LevelTable, level: number, skip: string[]): [string, string][]
{
    const row = table.rows.get(level);
    const skipped = new Set(skip.map(comparableText));
    return row === undefined ? [] : table.columns.flatMap((column, index): [string, string][] => {
        const cell = (row[index] ?? "").trim();
        return index === 0 || skipped.has(comparableText(column)) || isEmptyCell(cell) ? [] : [[fieldName(column), cell]];
    });
}

/**
 * The features the rows give up to a level, in order (PRO-3): those of the column named so, split at commas, each with its level. Only a name that `title`
 * recognizes counts, as `title` gives it, with its value in parentheses: "Path feature" or "Wild Shape improvement" are no features.
 */
export function gainedFeatures(table: LevelTable, column: string, upTo: number, title: (name: string) => string | undefined): GainedFeature[]
{
    const index = table.columns.findIndex((name) => comparableText(name) === comparableText(column));

    if (index <= 0) {
        return [];
    }

    return [...table.rows.entries()].filter(([level]) => level <= upTo).sort(([first], [second]) => first - second).flatMap(([level, row]) =>
        splitOutsideParentheses(row[index] ?? "").flatMap((entry): GainedFeature[] => {
            const { name, value } = featureParts(entry);
            const titled = isEmptyCell(entry) ? undefined : title(name);
            return titled === undefined ? [] : [{ level, name: value === undefined ? titled : `${titled} ${value}` }];
        })
    );
}

/** The features a list gives with their levels, written "Improved Critical 3" (PRO-3): each with its level; undefined for an item without one. */
export function levelledFeatures(items: string[]): (GainedFeature | undefined)[]
{
    return items.map((item) => {
        const match = /^(.*?)\s+(\d+)$/.exec(item.trim());
        return match === null || match[1].trim() === "" ? undefined : { level: Number(match[2]), name: match[1].trim() };
    });
}

/**
 * Features in the order they come, each name once (PRO-3): one written again with another value in parentheses takes the place of the one before, as Bardic
 * Inspiration (d8) does Bardic Inspiration (d6).
 */
export function mergedFeatures<Feature extends { name: string; }>(features: Feature[]): Feature[]
{
    const merged: Feature[] = [];

    for (const feature of features) {
        const position = merged.findIndex((other) => comparableText(featureParts(other.name).name) === comparableText(featureParts(feature.name).name));

        if (position === -1) {
            merged.push(feature);
        } else if (featureParts(feature.name).value !== undefined) {
            merged[position] = feature;
        }
    }

    return merged;
}

/** A feature's name without its value in parentheses, and the value: "Channel Divinity (2/rest)" gives "Channel Divinity" and "(2/rest)". */
export function featureParts(entry: string): { name: string; value?: string; }
{
    const match = /^(.*?)\s*(\([^()]*\))$/.exec(entry.trim());
    return match === null || match[1] === "" ? { name: entry.trim() } : { name: match[1], value: match[2] };
}

/** The name of the field a column gives: in lowercase, words joined by hyphens, as Rage Damage gives rage-damage. */
export function fieldName(column: string): string
{
    return column.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function isTableLine(line: string): boolean
{
    return line.trim().startsWith("|");
}

function isSeparatorLine(line: string): boolean
{
    return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
}

/** The cells of a table line, without the bars at its ends; a bar written \| belongs to its cell. */
function cellsOf(line: string): string[]
{
    const cells = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/);
    return cells.map((cell) => cell.replace(/\\\|/g, "|").trim());
}

/** The level a first cell counts: 3 for "3rd" or "3". */
function levelOf(cell: string): number | undefined
{
    const match = /^(\d+)(?:st|nd|rd|th)?$/i.exec(cell.trim());
    return match === null ? undefined : Number(match[1]);
}

function isEmptyCell(cell: string): boolean
{
    return /^[\s—–-]*$/.test(cell);
}

/** "Rage, Unarmored Defense": the entries of a cell, split at commas outside parentheses. */
function splitOutsideParentheses(cell: string): string[]
{
    const entries: string[] = [];
    let depth = 0;
    let current = "";

    for (const character of cell) {
        depth += character === "(" ? 1 : character === ")" ? -1 : 0;

        if (character === "," && depth === 0) {
            entries.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    return [...entries, current.trim()].filter((entry) => entry !== "");
}
