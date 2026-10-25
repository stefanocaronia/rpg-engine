// Random tables: the die a table is rolled with, from its first header cell or its rows, and the row a roll lands on. No game rule: the row is text.
import { DiceError, parseNotation } from "./notation.ts";
import { type DiceRoll, type FaceSource, rollDice } from "./roll-dice.ts";

/** A table to roll on: its die, as d8, 2d6, d100 or d66, the results that die can give, and its rows, each for a number or a range of them. */
export interface RandomTable
{
    die: string;
    possible: number[];
    rows: TableRow[];
}

/** A row of a table: its first cell as written, such as 1–2, the numbers it covers and the rest of its cells. */
export interface TableRow
{
    label: string;
    low: number;
    high: number;
    text: string;
}

/** A roll on a table: its die, the dice thrown, the result read from them and the row it lands on, as `[d8 = 6] 5–6: Un pastore`. */
export interface TableRoll
{
    die: string;
    roll: DiceRoll;
    result: number;
    row: TableRow;
    text: string;
}

const simpleDiePattern = /^(\d*)d(\d+|%)$/i;
const rangePattern = /^(\d+)(?:\s*[-–—]\s*(\d+))?$/;
const maxTableResults = 1000;

/**
 * A random table read from its cells, the header first: the die from the first header cell when it is one (d8, 1d8, 2d6, d100, d%, d66), else a single die as
 * big as the highest number of the first column; refused, saying how to fix it, when its rows leave a result out or give one twice.
 */
export function readRandomTable(cells: string[][]): RandomTable
{
    const [header = [], ...body] = cells;

    if (body.length === 0) {
        throw new DiceError("The table has no rows under its header: number each row in the first column, such as | 1–2 | Wolves |.");
    }

    const parsed = body.map((row, index) => readRow(row, index));
    const stated = headerDie(header[0] ?? "");
    const highest = Math.max(...parsed.map((row) => row.high));

    if (stated === undefined && highest > maxTableResults) {
        throw new DiceError(`The table's rows go up to ${highest}, more than a table is rolled with: write its die in the first header cell, such as d100.`);
    }

    const { die, possible } = stated ?? { die: `d${highest}`, possible: numbersFrom(1, highest) };
    checkCoverage(die, possible, parsed, stated !== undefined);
    return { die, possible, rows: parsed };
}

/** Rolls a table with the dice of its die, a d66 as two d6 read as tens and units, and gives the row the result lands on. */
export function rollOnTable(table: RandomTable, source: FaceSource): TableRoll
{
    const roll = rollDice(table.die === "d66" ? "2d6" : table.die, source);
    const result = table.die === "d66" ? roll.faces[0] * 10 + roll.faces[1] : roll.total;
    const row = table.rows.find((candidate) => result >= candidate.low && result <= candidate.high) as TableRow;
    return { die: table.die, roll, result, row, text: `[${table.die} = ${result}] ${row.label}${row.text === "" ? "" : `: ${row.text}`}` };
}

/** The die a first header cell names, with the results it gives; undefined when it names none, as Roll or Encounter; refused for a notation no table rolls. */
function headerDie(cell: string): { die: string; possible: number[]; } | undefined
{
    const written = plainCell(cell).replace(/\s+/g, "");
    const simple = simpleDiePattern.exec(written);

    if (simple === null) {
        if (isNotation(written)) {
            throw new DiceError(`The table's die "${cell.trim()}" is not a die alone: write one, such as d8, 2d6, d100 or d66, in the first header cell.`);
        }

        return undefined;
    }

    const count = simple[1] === "" ? 1 : Number(simple[1]);
    const sides = simple[2] === "%" ? 100 : Number(simple[2]);

    if (count === 1 && sides === 66) {
        return { die: "d66", possible: [1, 2, 3, 4, 5, 6].flatMap((tens) => numbersFrom(tens * 10 + 1, tens * 10 + 6)) };
    }

    if (count < 1 || sides < 2 || count * sides > maxTableResults) {
        throw new DiceError(`A table cannot be rolled with ${written}: write a die such as d8, 2d6 or d100 in the first header cell.`);
    }

    return { die: `${count === 1 ? "" : count}d${sides}`, possible: numbersFrom(count, count * sides) };
}

/** A row's numbers from its first cell, 3 or a range such as 1–2 or 01-05, with 00 as 100; the rest of its cells are its text. */
function readRow(row: string[], index: number): TableRow
{
    const label = (row[0] ?? "").trim();
    const match = rangePattern.exec(plainCell(label));

    if (match === null) {
        throw new DiceError(`The first cell of row ${index + 1}, "${label}", is no number nor range such as 3 or 1–2: number every row of the table in its first column.`);
    }

    const low = rowNumber(match[1]);
    const high = match[2] === undefined ? low : rowNumber(match[2]);

    if (high < low) {
        throw new DiceError(`Row "${label}" goes down: write the lower number first, such as 1–2.`);
    }

    const text = row.slice(1).map((cell) => cell.trim()).filter((cell) => cell !== "").join(" · ");
    return { label, low, high, text };
}

/** Refuses rows with a number the die cannot roll, a result no row gives, or one that two rows give. */
function checkCoverage(die: string, possible: number[], rows: TableRow[], stated: boolean): void
{
    const orDie = stated ? "" : ", or write the table's die in its first header cell, such as d10";

    const counts = new Map(possible.map((value) => [value, 0]));

    for (const row of rows) {
        const outside = [row.low, row.high].find((value) => !counts.has(value));

        if (outside !== undefined) {
            throw new DiceError(`Row "${row.label}" holds ${outside}, which a ${die} cannot roll: number the rows from ${possible[0]} to ${possible.at(-1)}${orDie}.`);
        }

        for (const value of possible.filter((candidate) => candidate >= row.low && candidate <= row.high)) {
            counts.set(value, (counts.get(value) ?? 0) + 1);
        }
    }

    const missing = possible.filter((value) => counts.get(value) === 0);
    const twice = possible.filter((value) => (counts.get(value) ?? 0) > 1);

    if (missing.length > 0) {
        throw new DiceError(`The table's rows leave out ${rangesText(possible, missing)} of the ${die}: give every result a row, such as | 3–4 | Merchants |.`);
    }

    if (twice.length > 0) {
        throw new DiceError(`The table's rows give ${rangesText(possible, twice)} of the ${die} more than once: give every result one row only.`);
    }
}

/** "3–4, 7": numbers that follow one another among the possible results, as ranges. */
function rangesText(possible: number[], values: number[]): string
{
    const ranges: number[][] = [];

    for (const value of values) {
        const last = ranges.at(-1);

        if (last !== undefined && possible.indexOf(value) === possible.indexOf(last[last.length - 1]) + 1) {
            last.push(value);
        } else {
            ranges.push([value]);
        }
    }

    return ranges.map((range) => (range.length === 1 ? String(range[0]) : `${range[0]}–${range[range.length - 1]}`)).join(", ");
}

/** A number of a row: 00 is 100, as on a d100. */
function rowNumber(digits: string): number
{
    return /^00$/.test(digits) ? 100 : Number(digits);
}

/** A cell without the marks of bold or italics, as **1–2**. */
function plainCell(cell: string): string
{
    return cell.replace(/[*_]/g, "").trim();
}

function isNotation(text: string): boolean
{
    try {
        parseNotation(text);
        return /d/i.test(text);
    } catch {
        return false;
    }
}

function numbersFrom(low: number, high: number): number[]
{
    return Array.from({ length: Math.max(0, high - low + 1) }, (_, index) => low + index);
}
