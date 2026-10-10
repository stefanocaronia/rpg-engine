// The map of a place as the master writes it (GRD-1, GRD-2, D-324): squares in rows, a symbol each, then a legend that names the symbols and says where a
// square leads; and the names of the squares, from A1 at the top left.

/** A square of the grid, from the top left. */
export interface Square
{
    column: number;
    row: number;
}

/** A symbol of the legend: its name, its kind for the drawing, whether it keeps one out or costs more to cross. */
export interface Feature
{
    symbol: string;
    name: string;
    kind: string;
    blocks: boolean;
    difficult: boolean;
    /** Not found yet (GRD-6): the player sees what lies under it. */
    hidden: boolean;
}

export interface Grid
{
    columns: number;
    rows: number;
    /** The rows as written, each as long as the widest, a space outside. */
    lines: string[];
    /** The legend, the symbols every map has first. */
    features: Feature[];
    /** Where squares lead, as written: a place's name. */
    exits: { square: Square; to: string; }[];
}

/** The symbols every map has (GRD-1): a wall, the floor and a door; a space is outside. */
export const builtIn: readonly Feature[] = [
    { symbol: "#", name: "wall", kind: "wall", blocks: true, difficult: false, hidden: false },
    { symbol: ".", name: "floor", kind: "floor", blocks: false, difficult: false, hidden: false },
    { symbol: "+", name: "door", kind: "door", blocks: false, difficult: false, hidden: false },
];

/** The flags a symbol of the legend may have, after its kind. */
export const flags = ["blocks", "difficult", "hidden"] as const;

/** The first map block of a text: what stands between ```map and ```; none when it has none. */
export function mapBlock(text: string): string | undefined
{
    return /^```map[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/m.exec(text)?.[1].replace(/\r/g, "").replace(/\n$/, "");
}

/** A text without its map block, which the dashboard draws instead, nor the heading of a section the block was all of. */
export function withoutMapBlock(text: string): string
{
    const lines = text.replace(/^```map[ \t]*\r?\n[\s\S]*?^```[ \t]*(?:\r?\n|$)/m, "").split(/\r?\n/);
    const level = (line: string | undefined): number => /^(#{1,6})\s/.exec(line ?? "")?.[1].length ?? 0;
    const kept = lines.filter((line, index) => {
        const next = lines.slice(index + 1).find((other) => other.trim() !== "");
        return level(line) === 0 || (next !== undefined && (level(next) === 0 || level(next) > level(line)));
    });
    return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** The grid of a map block (GRD-1, GRD-2), and what of it cannot be read, each as a sentence that says how to fix it. */
export function readGrid(block: string): { grid: Grid; problems: string[]; }
{
    const lines = block.split("\n");
    const blank = lines.findIndex((line) => line.trim() === "");
    const rows = (blank === -1 ? lines : lines.slice(0, blank)).map((line) => line.replace(/\s+$/, ""));
    const columns = Math.max(0, ...rows.map((line) => line.length));
    const features: Feature[] = [...builtIn];
    const exits: Grid["exits"] = [];
    const problems: string[] = [];
    const legendSymbols = new Set<string>();

    for (const line of blank === -1 ? [] : lines.slice(blank + 1).map((each) => each.trim()).filter((each) => each !== "")) {
        const exit = /^([A-Za-z]+\d+)\s*(?:→|->)\s*(.+)$/.exec(line);
        const named = /^(\S)\s+([^:]+?)\s*(?::\s*(.*))?$/.exec(line);

        if (exit !== null) {
            const square = readSquare(exit[1]);
            const to = exit[2].replace(/^\[\[|\]\]$/g, "").split("|")[0].trim();

            if (square === undefined || square.row >= rows.length || square.column >= columns) {
                problems.push(`${exit[1].toUpperCase()} is not a square of the map, which goes from A1 to ${squareName({ column: columns - 1, row: rows.length - 1 })}: write the exit on one of its squares.`);
            } else {
                exits.push({ square, to });
            }
        } else if (named !== null) {
            const [symbol, name] = [named[1], named[2]];
            const words = (named[3] ?? "").split(",").map((word) => word.trim().toLowerCase()).filter((word) => word !== "");
            const unknown = words.slice(1).filter((word) => !(flags as readonly string[]).includes(word));

            const own = builtIn.find((feature) => feature.symbol === symbol);

            if (legendSymbols.has(symbol)) {
                problems.push(`The legend names ${symbol} twice: keep one line for it.`);
            } else if (own !== undefined) {
                // A symbol every map has takes another name and drawing, as rock for the walls of a cave; it never stops or starts blocking.
                const index = features.findIndex((feature) => feature.symbol === symbol);
                features[index] = { ...own, name, kind: words[0] ?? own.kind, difficult: words.includes("difficult") };

                if ((words.includes("blocks") && !own.blocks) || words.includes("hidden")) {
                    problems.push(`${symbol} is the map's ${own.name}, which ${own.blocks ? "always blocks" : "never blocks"} and is never hidden: change only its name and kind, such as "${symbol} ${name}: ${words[0] ?? own.kind}".`);
                }
            } else {
                features.push({ symbol, name, kind: words[0] ?? "", blocks: words.includes("blocks"), difficult: words.includes("difficult"), hidden: words.includes("hidden") });
            }

            legendSymbols.add(symbol);

            if (unknown.length > 0) {
                problems.push(`${symbol} ${name} has ${unknown.join(", ")}, which the map does not know: after the kind come only ${flags.slice(0, -1).join(", ")} and ${flags.at(-1)}.`);
            }
        } else {
            problems.push(`The legend's line "${line}" is neither a symbol, such as t table: table, difficult, nor an exit, such as G8 → [[Place]].`);
        }
    }

    const grid = { columns, rows: rows.length, lines: rows.map((line) => line.padEnd(columns, " ")), features, exits };
    const unnamed = [...new Set(grid.lines.join(""))].filter((symbol) => symbol !== " " && !features.some((feature) => feature.symbol === symbol));
    return { grid, problems: [...problems, ...unnamed.map((symbol) => `The map has ${symbol}, which its legend does not name: add a line such as "${symbol} barrel: barrel, blocks".`)] };
}

/** A square's name, as the player says it: its column's letters and its row's number, from A1 at the top left; after Z, AA. */
export function squareName(square: Square): string
{
    let letters = "";

    for (let column = square.column + 1; column > 0; column = Math.floor((column - 1) / 26)) {
        letters = String.fromCharCode(65 + ((column - 1) % 26)) + letters;
    }

    return `${letters}${square.row + 1}`;
}

/** The square a name such as C4 or c4 says; none for anything else. */
export function readSquare(name: string): Square | undefined
{
    const match = /^([A-Za-z]+)(\d+)$/.exec(name.trim());

    if (match === null || Number(match[2]) < 1) {
        return undefined;
    }

    const column = [...match[1].toUpperCase()].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
    return { column, row: Number(match[2]) - 1 };
}

/** The symbol at a square; a space outside the grid. */
export function symbolAt(grid: Grid, square: Square): string
{
    return grid.lines[square.row]?.[square.column] ?? " ";
}

/** What stands at a square, from the legend; none outside, or for a symbol the legend does not name. */
export function featureAt(grid: Grid, square: Square): Feature | undefined
{
    const symbol = symbolAt(grid, square);
    return grid.features.find((feature) => feature.symbol === symbol);
}

/** The first square one can stand on, row by row from the top left, for examples; A1 when there is none. */
export function firstOpenSquare(grid: Grid): Square
{
    for (let row = 0; row < grid.rows; row++) {
        for (let column = 0; column < grid.columns; column++) {
            if (closedSquare(grid, { column, row }) === undefined) {
                return { column, row };
            }
        }
    }

    return { column: 0, row: 0 };
}

/** Why one cannot stand at a square (GRD-3): outside the map, a wall, or what blocks; none when one can. */
export function closedSquare(grid: Grid, square: Square): string | undefined
{
    const feature = featureAt(grid, square);

    if (square.column < 0 || square.row < 0 || square.column >= grid.columns || square.row >= grid.rows || symbolAt(grid, square) === " ") {
        return `${squareName(square)} is outside the map`;
    }

    return feature?.blocks ? `${squareName(square)} is ${feature.symbol === "#" ? "a wall" : `${feature.name}, which blocks`}` : undefined;
}
