// The map of the place where the party is (GRD-6, D-323): what the page works out to draw it, from the squares view gives.
import type { ShownGrid } from "./data.ts";

/** A square of the grid, from the top left. */
export interface Square
{
    column: number;
    row: number;
}

/** A thing of the legend's squares joined where they touch, with the box around them. */
export interface Piece
{
    squares: Square[];
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** The square a name such as C4 says, from A1 at the top left, AA after Z; none for anything else. */
export function squareOf(name: string): Square | undefined
{
    const match = /^([A-Z]+)(\d+)$/.exec(name.trim().toUpperCase());
    return match === null ? undefined : { column: [...match[1]].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1, row: Number(match[2]) - 1 };
}

/** A column's letters, as the map's edge writes them: A, B… Z, AA. */
export function columnName(column: number): string
{
    let letters = "";

    for (let number = column + 1; number > 0; number = Math.floor((number - 1) / 26)) {
        letters = String.fromCharCode(65 + ((number - 1) % 26)) + letters;
    }

    return letters;
}

/** The symbol at a square; a space outside the grid. */
export function symbolAt(map: ShownGrid, square: Square): string
{
    return map.lines[square.row]?.[square.column] ?? " ";
}

/** The pieces of a thing of the legend: its squares joined where they touch, each with the box around them. */
export function piecesOf(map: ShownGrid, symbol: string): Piece[]
{
    const seen = new Set<string>();
    const pieces: Piece[] = [];

    for (let row = 0; row < map.rows; row++) {
        for (let column = 0; column < map.columns; column++) {
            if (symbolAt(map, { column, row }) !== symbol || seen.has(`${column},${row}`)) {
                continue;
            }

            const squares: Square[] = [];
            const open: Square[] = [{ column, row }];
            seen.add(`${column},${row}`);

            while (open.length > 0) {
                const next = open.pop() as Square;
                squares.push(next);

                for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const near = { column: next.column + dc, row: next.row + dr };

                    if (symbolAt(map, near) === symbol && !seen.has(`${near.column},${near.row}`)) {
                        seen.add(`${near.column},${near.row}`);
                        open.push(near);
                    }
                }
            }

            const columns = squares.map((square) => square.column);
            const rows = squares.map((square) => square.row);
            pieces.push({ squares, left: Math.min(...columns), top: Math.min(...rows), right: Math.max(...columns) + 1, bottom: Math.max(...rows) + 1 });
        }
    }

    return pieces;
}

/** The sides of the squares inside that face a wall or the outside: the rooms' outline, a door's own sides left open. */
export function outlineOf(map: ShownGrid): [Square, Square][]
{
    const inside = (square: Square): boolean => !["#", " "].includes(symbolAt(map, square));
    const sides: [Square, Square][] = [];

    for (let row = 0; row < map.rows; row++) {
        for (let column = 0; column < map.columns; column++) {
            if (!inside({ column, row }) || symbolAt(map, { column, row }) === "+") {
                continue;
            }

            for (const [dc, dr, from, to] of [[0, -1, [0, 0], [1, 0]], [1, 0, [1, 0], [1, 1]], [0, 1, [0, 1], [1, 1]], [-1, 0, [0, 0], [0, 1]]] as const) {
                if (!inside({ column: column + dc, row: row + dr })) {
                    sides.push([{ column: column + from[0], row: row + from[1] }, { column: column + to[0], row: row + to[1] }]);
                }
            }
        }
    }

    return sides;
}
