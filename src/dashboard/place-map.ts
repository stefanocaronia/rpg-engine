// The map of the place where the party is (GRD-6, D-323, D-325): what the page works out to draw it, from the squares view gives.
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

/** A side of a square of the floor that faces a wall or the outside, in pixels: whether it is a door's side toward the outside, and whether rock lies past it. */
export interface Edge
{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    gap: boolean;
    rock: boolean;
}

/** Every kind the map draws its own way (D-325): the engine's list of squareKinds, which a test holds to it. */
export const drawnKinds = [
    "wall",
    "rock",
    "floor",
    "ground",
    "road",
    "door",
    "open-door",
    "secret-door",
    "opening",
    "window",
    "low-wall",
    "hedge",
    "stairs",
    "ladder",
    "trapdoor",
    "pit",
    "cliff",
    "bridge",
    "shallow-water",
    "deep-water",
    "mud",
    "rubble",
    "brush",
    "tree",
    "rocks",
    "pillar",
    "statue",
    "fire",
    "hearth",
    "well",
    "fountain",
    "table",
    "seat",
    "counter",
    "bed",
    "shelf",
    "barrel",
    "crate",
    "altar",
    "machine",
    "vehicle",
    "tent",
    "stall",
    "building",
    "hazard",
    "mark",
];

/** The kinds drawn on their own squares under the things, as ground: water, rubble, mud, brush, open ground, a road. */
export const groundKinds = ["shallow-water", "deep-water", "rubble", "mud", "brush", "ground", "road"];

/** The kinds drawn one a square, as a row of trees is trees and not a blob (D-325); the others as one thing over the squares that touch. */
export const squareDrawnKinds = ["tree", "rocks", "pillar", "seat", "barrel", "crate", "hazard", "ladder", "trapdoor"];

/** The kinds one cannot see past nor stand on, which the floor's outline goes round. */
const solidKinds = ["wall", "rock", "outside", "window"];

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

/** A square's name, as the player says it: C4. */
export function squareName(square: Square): string
{
    return `${columnName(square.column)}${square.row + 1}`;
}

/** The symbol at a square; a space outside the grid. */
export function symbolAt(map: ShownGrid, square: Square): string
{
    return map.lines[square.row]?.[square.column] ?? " ";
}

/** What a square is drawn as: its symbol's kind in the legend, outside for a space, thing for a symbol the legend does not give. */
export function kindAt(map: ShownGrid, square: Square): string
{
    const symbol = symbolAt(map, square);
    return symbol === " " ? "outside" : map.legend.find((feature) => feature.symbol === symbol)?.kind ?? "thing";
}

/** Whether a square is a wall, rock, a window or outside: what the floor's outline goes round. */
export function isSolid(map: ShownGrid, square: Square): boolean
{
    return solidKinds.includes(kindAt(map, square));
}

/** Whether one can stand on a square (GRD-3): inside the map, on what the legend names, neither a wall nor what blocks. */
export function isStandable(map: ShownGrid, square: Square): boolean
{
    const symbol = symbolAt(map, square);
    const feature = map.legend.find((one) => one.symbol === symbol);
    return symbol !== " " && feature !== undefined && feature.blocks !== true;
}

/** Whether the map has walls or rock: a building or a cave, which ends at its walls; without, an open map, which fades into the paper. */
export function isWalled(map: ShownGrid): boolean
{
    return map.lines.some((line) => [...line].some((symbol) => ["wall", "rock"].includes(map.legend.find((feature) => feature.symbol === symbol)?.kind ?? "")));
}

/** The pieces of a thing of the legend: its squares joined where they touch, each with the box around them; one a square for the kinds drawn so. */
export function piecesOf(map: ShownGrid, symbol: string, kind: string): Piece[]
{
    const seen = new Set<string>();
    const pieces: Piece[] = [];
    const single = squareDrawnKinds.includes(kind);

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

                for (const [dc, dr] of single ? [] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
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

/** The floor's outline as loops of the sides that face a wall, rock or the outside, each side going round the floor the same way. */
export function floorLoops(map: ShownGrid, X: (column: number) => number, Y: (row: number) => number): Edge[][]
{
    const rockLike = map.legend.find((feature) => feature.symbol === "#")?.kind === "rock";
    const edges: Edge[] = [];

    for (let row = 0; row < map.rows; row++) {
        for (let column = 0; column < map.columns; column++) {
            if (isSolid(map, { column, row })) {
                continue;
            }

            for (const [dc, dr, x1, y1, x2, y2] of [[0, -1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1], [-1, 0, 0, 1, 0, 0]] as const) {
                const near = { column: column + dc, row: row + dr };

                if (isSolid(map, near)) {
                    const beyond = kindAt(map, near);
                    edges.push({
                        x1: X(column + x1),
                        y1: Y(row + y1),
                        x2: X(column + x2),
                        y2: Y(row + y2),
                        // A door's sides along the wall are the wall's ends, drawn; only its side toward the outside is left open, as the way goes on there.
                        gap: beyond === "outside" && ["door", "open-door", "secret-door", "opening"].includes(kindAt(map, { column, row })),
                        rock: beyond === "rock" || (beyond === "outside" && rockLike),
                    });
                }
            }
        }
    }

    const loops: Edge[][] = [];
    const unused = new Set(edges);

    while (unused.size > 0) {
        const first = unused.values().next().value as Edge;
        const loop = [first];
        unused.delete(first);
        let last = first;

        for (;;) {
            const next = [...unused].find((edge) => edge.x1 === last.x2 && edge.y1 === last.y2);

            if (next === undefined) {
                break;
            }

            loop.push(next);
            unused.delete(next);
            last = next;
        }

        loops.push(loop);
    }

    return loops;
}

/**
 * A loop of the floor's outline as a path: rounded at the corners where rock lies on both sides, as a cave's, at most half a square; with gaps, the doors'
 * sides toward the outside left out and the loop left open, as the ink draws it; without, closed, as the floor's fill.
 */
export function tracedLoop(loop: Edge[], withGaps: boolean, rounding: number): string
{
    const turns = (first: Edge, second: Edge): boolean => Math.sign(first.x2 - first.x1) !== Math.sign(second.x2 - second.x1) || Math.sign(first.y2 - first.y1) !== Math.sign(second.y2 - second.y1);
    const radius = (first: Edge, second: Edge): number => (first.rock && second.rock && turns(first, second) ? rounding : 0);
    let path = "";

    loop.forEach((edge, index) => {
        const before = loop[(index - 1 + loop.length) % loop.length];
        const after = loop[(index + 1) % loop.length];
        const [ux, uy] = [Math.sign(edge.x2 - edge.x1), Math.sign(edge.y2 - edge.y1)];
        const [r1, r2] = [radius(before, edge), radius(edge, after)];

        if (withGaps && edge.gap) {
            return;
        }

        const start = path === "" || (withGaps && before.gap) ? `M${edge.x1 + ux * r1} ${edge.y1 + uy * r1}` : "";
        path += `${start}L${edge.x2 - ux * r2} ${edge.y2 - uy * r2}`;

        if (r2 > 0 && !(withGaps && after.gap)) {
            path += `Q${edge.x2} ${edge.y2} ${after.x1 + Math.sign(after.x2 - after.x1) * r2} ${after.y1 + Math.sign(after.y2 - after.y1) * r2}`;
        }
    });

    return withGaps ? path : `${path}Z`;
}

/** The side of the map a square that leads elsewhere is on, for its arrow; inside for a door in the map, into a building that is a place of its own. */
export function exitSide(map: ShownGrid, square: Square): "top" | "bottom" | "left" | "right" | "inside"
{
    return square.row === map.rows - 1 ? "bottom" : square.row === 0 ? "top" : square.column === 0 ? "left" : square.column === map.columns - 1 ? "right" : "inside";
}

/** Whether two squares touch, sides or corners. */
export function nextTo(first: Square, second: Square): boolean
{
    return Math.max(Math.abs(first.column - second.column), Math.abs(first.row - second.row)) === 1;
}
