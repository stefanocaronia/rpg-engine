// The formulas of a game system (FOR-1–FOR-9, D-199): arithmetic on the fields of a page, read once and worked out on any page. They know no game: a system
// writes what a modifier or a bonus is, and the core only counts.
import { comparableText, linkTargetName } from "./text.ts";

/** A formula read from its text (FOR-2). */
export type Formula =
    | { kind: "number"; value: number; }
    | { kind: "field"; name: string; }
    | { kind: "negate"; operand: Formula; }
    | { kind: "operation"; operator: "+" | "-" | "*" | "/"; left: Formula; right: Formula; }
    | { kind: "math"; name: MathName; operands: Formula[]; }
    | { kind: "table"; table: string; key: Formula; }
    | { kind: "list"; name: ListName; list: string; item?: string; };

/** A table read by value: by number, the highest row not above the key; by name, the row with that name (FOR-2). */
export interface Table
{
    rows: [string, number][];
}

/** What a formula reads: the value of a field as a page holds it, undefined when it holds none; and the tables of its system. */
export interface FormulaScope
{
    field(name: string): unknown;
    table(name: string): Table | undefined;
}

/** A value a formula read to work out its result: a field and the number it read, a name looked for in a list, or a row of a table. */
export type FormulaRead =
    | { field: string; value: number; key?: true; }
    | { list: string; item: string; value: number; }
    | { list: string; value: number; }
    | { table: string; key: string; value: number; };

/** A formula worked out: its value, undefined when the page lacks something it needs (FOR-4), and what it read. */
export interface WorkedOut
{
    value: number | undefined;
    reads: FormulaRead[];
}

/** What a game system works out (FOR-1): its computed fields, in the order it gives them, its tables, and the limits of its counters. */
export interface SystemFormulas
{
    computed: [string, Formula][];
    tables: Record<string, Table>;
    counters: Record<string, { min?: Formula; max?: Formula; }>;
}

/** What a system.yaml writes of its formulas: computed fields, tables, and the limits of counters, each a formula or a number. */
export interface FormulaData
{
    computed?: Record<string, string>;
    tables?: Record<string, Record<string, number>>;
    counters?: Record<string, { min?: number | string; max?: number | string; }>;
}

/**
 * Reads the formulas of a system (FOR-1, FOR-9): each must read as a formula, name only tables the system has, and computed fields must not read each other
 * in a circle. Refused with the place of the first that does not.
 */
export function readFormulas(data: FormulaData): SystemFormulas
{
    const tables = Object.fromEntries(Object.entries(data.tables ?? {}).map(([name, rows]) => [name, tableOf(rows)]));
    const computed = Object.entries(data.computed ?? {}).map(([name, text]): [string, Formula] => [name, placed(`computed.${name}`, () => parseFormula(text))]);
    const counters = Object.fromEntries(
        Object.entries(data.counters ?? {}).map(([name, limits]) => [name, {
            ...(limits.min === undefined ? {} : { min: placed(`counters.${name}.min`, () => formulaOf(limits.min as number | string)) }),
            ...(limits.max === undefined ? {} : { max: placed(`counters.${name}.max`, () => formulaOf(limits.max as number | string)) }),
        }]),
    );
    const all: [string, Formula][] = [
        ...computed.map(([name, formula]): [string, Formula] => [`computed.${name}`, formula]),
        ...Object.entries(counters).flatMap(([name, limits]) => Object.entries(limits).map(([limit, formula]): [string, Formula] => [`counters.${name}.${limit}`, formula])),
    ];

    for (const [place, formula] of all) {
        const missing = tablesRead(formula).find((table) => !Object.keys(tables).some((name) => comparableText(name) === comparableText(table)));

        if (missing !== undefined) {
            throw new Error(`${place}: there is no table "${missing}" in tables.`);
        }
    }

    checkCircles(computed);
    return { computed, tables, counters };
}

type MathName = "floor" | "ceil" | "min" | "max";
type ListName = "has" | "count" | "item" | "sum";

const mathNames: MathName[] = ["floor", "ceil", "min", "max"];
const listNames: ListName[] = ["has", "count", "item", "sum"];
const namePattern = /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*/y;
const numberPattern = /\d+(?:\.\d+)?/y;
// "[[Cleric]] 3", "Perception +3": a name in a list, and the number after it.
const itemPattern = /^(.*?)\s+([+-]?\d+)$/;
// [[Page]], [[Page#Section]], [[Page|label]].
const linkPattern = /^\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|[^\]]*)?\]\]$/;

/** Reads a formula; refused, with where and why, when it does not read as one (FOR-9). */
export function parseFormula(text: string): Formula
{
    const reader = new FormulaReader(text);
    const formula = reader.expression();
    reader.end();
    return formula;
}

/** A formula given as a number or as text, as system.yaml writes it. */
export function formulaOf(value: number | string): Formula
{
    return typeof value === "number" ? { kind: "number", value } : parseFormula(value);
}

/** Works a formula out on what a page holds (FOR-4): no value when a field it needs is missing, a table has no row for the key, or it divides by zero. */
export function workOut(formula: Formula, scope: FormulaScope): WorkedOut
{
    const reads: FormulaRead[] = [];
    const value = evaluate(formula, scope, reads);
    // Never -0, which a sheet would show as such.
    return { value: value === undefined || !Number.isFinite(value) ? undefined : value === 0 ? 0 : value, reads };
}

/**
 * What a result came from (FOR-8): the values it read that change it, a number tried higher, lower and at 0, and a list tried empty; a value multiplied by 0,
 * as a proficiency without the skill, did not count. The rows of tables, and what gives their keys, always count.
 */
export function contributingReads(formula: Formula, scope: FormulaScope, worked: WorkedOut): FormulaRead[]
{
    return worked.reads.filter((read) => {
        if ("table" in read || ("field" in read && read.key === true)) {
            return true;
        }

        const name = "field" in read ? read.field : read.list;
        // Tried in several ways: a value halved and rounded down moves only on one side of it.
        const probes: unknown[] = "field" in read ? [read.value + 1, read.value - 1, 0, read.value + 10] : [[]];
        return probes.some((probe) => workOut(formula, { field: (field) => (comparableText(field) === comparableText(name) ? probe : scope.field(field)), table: scope.table }).value !== worked.value);
    });
}

/** The fields a formula reads, lists included, each once and in order: what it comes from. */
export function fieldsRead(formula: Formula): string[]
{
    switch (formula.kind) {
        case "number":
            return [];
        case "field":
            return [formula.name];
        case "negate":
            return fieldsRead(formula.operand);
        case "operation":
            return unique([...fieldsRead(formula.left), ...fieldsRead(formula.right)]);
        case "math":
            return unique(formula.operands.flatMap(fieldsRead));
        case "table":
            return fieldsRead(formula.key);
        case "list":
            return [formula.list];
    }
}

/** The tables a formula reads. */
export function tablesRead(formula: Formula): string[]
{
    switch (formula.kind) {
        case "negate":
            return tablesRead(formula.operand);
        case "operation":
            return unique([...tablesRead(formula.left), ...tablesRead(formula.right)]);
        case "math":
            return unique(formula.operands.flatMap(tablesRead));
        case "table":
            return unique([formula.table, ...tablesRead(formula.key)]);
        default:
            return [];
    }
}

/** A table from its rows as system.yaml writes them, `{1: 2, 5: 3}` or `{troublesome: 12}`. */
export function tableOf(rows: Record<string, number>): Table
{
    return { rows: Object.entries(rows) };
}

/** The names of the items of a list field, as has, count and item read them (FOR-2): a link as the page or the section it names, without the number after a name. */
export function listItemNames(value: unknown): string[]
{
    return itemsOf(value).map((item) => item.name);
}

/** A field's value read as a number (FOR-2): a number, a counter's current value, or text such as +2. Undefined for anything else. */
export function numberOf(value: unknown): number | undefined
{
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value !== "string") {
        return undefined;
    }

    const match = /^\s*([+-]?\d+(?:\.\d+)?)\s*(?:\/\s*\d+\s*)?$/.exec(value);
    return match === null ? undefined : Number(match[1]);
}

function evaluate(formula: Formula, scope: FormulaScope, reads: FormulaRead[]): number | undefined
{
    switch (formula.kind) {
        case "number":
            return formula.value;
        case "field":
            return fieldNumber(formula.name, scope, reads);

        case "negate": {
            const operand = evaluate(formula.operand, scope, reads);
            return operand === undefined ? undefined : -operand;
        }

        case "operation":
            return operate(formula.operator, evaluate(formula.left, scope, reads), evaluate(formula.right, scope, reads));
        case "math":
            return mathOf(formula.name, formula.operands.map((operand) => evaluate(operand, scope, reads)));

        case "table": {
            const before = reads.length;
            const key = evaluate(formula.key, scope, reads);

            // What gives the key always counts: a level one higher may stay in the same row (FOR-8).
            for (const read of reads.slice(before)) {
                if ("field" in read) {
                    read.key = true;
                }
            }

            return tableValue(formula.table, key, formula.key, scope, reads);
        }

        case "list":
            return listValue(formula, scope, reads);
    }
}

function fieldNumber(name: string, scope: FormulaScope, reads: FormulaRead[]): number | undefined
{
    const value = numberOf(scope.field(name));

    if (value !== undefined) {
        reads.push({ field: name, value });
    }

    return value;
}

function operate(operator: "+" | "-" | "*" | "/", left: number | undefined, right: number | undefined): number | undefined
{
    if (left === undefined || right === undefined) {
        return undefined;
    }

    switch (operator) {
        case "+":
            return left + right;
        case "-":
            return left - right;
        case "*":
            return left * right;
        case "/":
            return right === 0 ? undefined : left / right;
    }
}

function mathOf(name: MathName, operands: (number | undefined)[]): number | undefined
{
    if (operands.some((operand) => operand === undefined)) {
        return undefined;
    }

    const values = operands as number[];

    switch (name) {
        case "floor":
            return Math.floor(values[0]);
        case "ceil":
            return Math.ceil(values[0]);
        case "min":
            return Math.min(...values);
        case "max":
            return Math.max(...values);
    }
}

function tableValue(name: string, key: number | undefined, keyFormula: Formula, scope: FormulaScope, reads: FormulaRead[]): number | undefined
{
    const table = scope.table(name);
    const text = key === undefined && keyFormula.kind === "field" ? scope.field(keyFormula.name) : key;

    if (table === undefined || text === undefined) {
        return undefined;
    }

    const row = typeof text === "number" ? numberRow(table, text) : table.rows.find(([candidate]) => comparableText(candidate) === comparableText(String(text)));

    if (row !== undefined) {
        reads.push({ table: name, key: String(text), value: row[1] });
    }

    return row?.[1];
}

function numberRow(table: Table, key: number): [string, number] | undefined
{
    return table.rows.filter(([row]) => numberOf(row) !== undefined && Number(row) <= key).sort(([first], [second]) => Number(second) - Number(first))[0];
}

function listValue(formula: Extract<Formula, { kind: "list"; }>, scope: FormulaScope, reads: FormulaRead[]): number | undefined
{
    const raw = scope.field(formula.list);

    // Only sum needs the list: has, count and item read a missing one as empty (FOR-4).
    if (formula.name === "sum" && raw === undefined) {
        return undefined;
    }

    const items = itemsOf(raw);
    const named = (item: { name: string; }): boolean => comparableText(item.name) === comparableText(formula.item ?? "");
    const value = formula.name === "has"
        ? (items.some(named) ? 1 : 0)
        : formula.name === "count"
        ? items.length
        : formula.name === "item"
        ? (items.find(named)?.number ?? 0)
        : items.reduce((total, item) => total + (item.number ?? 0), 0);
    reads.push(formula.item === undefined ? { list: formula.list, value } : { list: formula.list, item: formula.item, value });
    return value;
}

/**
 * The items of a list field, each with its name and the number after it, if any. A link reads as the page it names, or as its section, as a feature
 * [[Cleric#Channel Divinity]] does. A single value is a list of one.
 */
function itemsOf(value: unknown): { name: string; number?: number; }[]
{
    const values = value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
    return values.map((item) => {
        const text = String(item).trim();
        const match = itemPattern.exec(text);
        const written = (match === null ? text : match[1]).trim();
        const link = linkPattern.exec(written);
        const name = link === null ? written : (link[2] ?? linkTargetName(link[1])).trim();
        return { name, number: match === null ? undefined : Number(match[2]) };
    });
}

function unique(names: string[]): string[]
{
    return names.filter((name, index) => names.findIndex((other) => comparableText(other) === comparableText(name)) === index);
}

/** A formula read at its place in system.yaml, such as computed.insight, which a refusal names first. */
function placed(place: string, read: () => Formula): Formula
{
    try {
        return read();
    } catch (error) {
        throw new Error(`${place}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/** Refuses computed fields that read each other in a circle, such as a → b → a: none of them could be worked out. */
function checkCircles(computed: [string, Formula][]): void
{
    const named = (name: string): [string, Formula] | undefined => computed.find(([candidate]) => comparableText(candidate) === comparableText(name));

    const visit = (name: string, path: string[]): void => {
        if (path.some((step) => comparableText(step) === comparableText(name))) {
            throw new Error(`computed fields read each other in a circle: ${[...path, name].join(" → ")}. Give one of them a formula that does not.`);
        }

        const entry = named(name);

        for (const next of entry === undefined ? [] : fieldsRead(entry[1]).filter((field) => named(field) !== undefined)) {
            visit(next, [...path, name]);
        }
    };

    for (const [name] of computed) {
        visit(name, []);
    }
}

/** Reads the text of a formula from left to right: an expression is terms added or subtracted, a term factors multiplied or divided. */
class FormulaReader
{
    private position = 0;
    private readonly text: string;

    constructor(text: string)
    {
        this.text = text;
    }

    expression(): Formula
    {
        let formula = this.term();

        for (let operator = this.operator("+-"); operator !== undefined; operator = this.operator("+-")) {
            formula = { kind: "operation", operator, left: formula, right: this.term() };
        }

        return formula;
    }

    end(): void
    {
        this.skipSpaces();

        if (this.position < this.text.length) {
            this.fail("an operator, or the end of the formula");
        }
    }

    private term(): Formula
    {
        let formula = this.factor();

        for (let operator = this.operator("*/"); operator !== undefined; operator = this.operator("*/")) {
            formula = { kind: "operation", operator, left: formula, right: this.factor() };
        }

        return formula;
    }

    private factor(): Formula
    {
        this.skipSpaces();

        if (this.take("-")) {
            return { kind: "negate", operand: this.factor() };
        }

        if (this.take("(")) {
            const inner = this.expression();
            this.expect(")");
            return inner;
        }

        const number = this.match(numberPattern);

        if (number !== undefined) {
            return { kind: "number", value: Number(number) };
        }

        const name = this.match(namePattern);

        if (name === undefined) {
            this.fail("a number, a field, a function or (");
        }

        this.skipSpaces();
        return this.take("(") ? this.call(name) : { kind: "field", name };
    }

    private call(name: string): Formula
    {
        const lower = name.toLowerCase();

        if (mathNames.includes(lower as MathName)) {
            const operands = [this.expression()];

            while (this.take(",")) {
                operands.push(this.expression());
            }

            this.expect(")");

            if ((lower === "floor" || lower === "ceil") !== (operands.length === 1)) {
                this.fail(lower === "floor" || lower === "ceil" ? `one value in ${lower}()` : `at least two values in ${lower}()`);
            }

            return { kind: "math", name: lower as MathName, operands };
        }

        if (lower === "table") {
            const table = this.name("the name of a table");
            this.expect(",");
            const key = this.expression();
            this.expect(")");
            return { kind: "table", table, key };
        }

        if (listNames.includes(lower as ListName)) {
            const list = this.name("the name of a list");

            if (lower === "count" || lower === "sum") {
                this.expect(")");
                return { kind: "list", name: lower as ListName, list };
            }

            this.expect(",");
            const item = this.rawUntilClose();
            return { kind: "list", name: lower as ListName, list, item };
        }

        this.fail(`a function: ${[...mathNames, "table", ...listNames].join(", ")}`);
    }

    /** The name of an item in has() or item(), as it is written: it may hold spaces, as in Dwarven Toughness. */
    private rawUntilClose(): string
    {
        const close = this.text.indexOf(")", this.position);
        const item = close === -1 ? "" : this.text.slice(this.position, close).trim();

        if (item === "") {
            this.fail("the name of an item, then )");
        }

        this.position = close + 1;
        return item;
    }

    private name(what: string): string
    {
        this.skipSpaces();
        const name = this.match(namePattern);

        if (name === undefined) {
            this.fail(what);
        }

        return name;
    }

    private operator(operators: string): "+" | "-" | "*" | "/" | undefined
    {
        this.skipSpaces();
        const next = this.text[this.position];

        if (next !== undefined && operators.includes(next)) {
            this.position++;
            return next as "+" | "-" | "*" | "/";
        }

        return undefined;
    }

    private match(pattern: RegExp): string | undefined
    {
        pattern.lastIndex = this.position;
        const match = pattern.exec(this.text);

        if (match === null) {
            return undefined;
        }

        this.position += match[0].length;
        return match[0];
    }

    private take(text: string): boolean
    {
        this.skipSpaces();

        if (this.text.startsWith(text, this.position)) {
            this.position += text.length;
            return true;
        }

        return false;
    }

    private expect(text: string): void
    {
        if (!this.take(text)) {
            this.fail(`"${text}"`);
        }
    }

    private skipSpaces(): void
    {
        while (this.text[this.position] === " " || this.text[this.position] === "\t") {
            this.position++;
        }
    }

    private fail(expected: string): never
    {
        const rest = this.text.slice(this.position);
        throw new Error(`"${this.text}" is not a formula: ${expected} was expected ${rest === "" ? "at the end" : `at "${rest}"`}.`);
    }
}
