// The ways across a place's map (GRD-4): the shortest between two squares, a square at a time, round walls and what blocks and never across their corners;
// the squares one reaches with what is left to spend; who stands next to whom, and how far apart. Costs are in squares, as the game counts them.
import { closedSquare, featureAt, type Grid, type Square } from "./grid.ts";

/** What a step costs, as the game says (GRD-4): a diagonal one, in squares, and the factor of difficult ground. */
export interface StepCosts
{
    diagonal: number;
    difficult: number;
}

/** Where one stands on a map (GRD-4): the square at the top left of its footprint, and the footprint's side in squares. */
export interface Footprint
{
    square: Square;
    side: number;
}

/** The shortest way from one square to another (GRD-4): the squares it steps on, the goal last, and what it costs; none when no way leads there on foot. */
export function shortestWay(grid: Grid, from: Square, to: Square, costs: StepCosts): { squares: Square[]; cost: number; } | undefined
{
    if (!isInside(grid, from) || !isInside(grid, to)) {
        return undefined;
    }

    const [start, goal] = [indexOf(grid, from), indexOf(grid, to)];
    const { cost, previous } = spread(grid, start, costs, Infinity, goal);
    const total = cost.get(goal);

    if (total === undefined) {
        return undefined;
    }

    const squares: Square[] = [];

    for (let at: number | undefined = goal; at !== undefined && at !== start; at = previous.get(at)) {
        squares.unshift(squareAt(grid, at));
    }

    return { squares, cost: total };
}

/** The squares one reaches from a square spending at most `budget` (D-328), each with what reaching it costs; the start among them, at 0. */
export function reachable(grid: Grid, from: Square, budget: number, costs: StepCosts): { square: Square; cost: number; }[]
{
    return isInside(grid, from) ? [...spread(grid, indexOf(grid, from), costs, budget).cost].map(([index, cost]) => ({ square: squareAt(grid, index), cost })) : [];
}

/** Whether two footprints stand next to each other, or on a square they share (GRD-5). */
export function isNextTo(first: Footprint, second: Footprint): boolean
{
    const [columns, rows] = apart(first, second);
    return Math.max(columns, rows) <= 1;
}

/** How far apart two footprints stand, in squares as the game counts them (D-328): 1 next to each other, 0 on a square they share. */
export function squaresApart(first: Footprint, second: Footprint, costs: StepCosts): number
{
    const [columns, rows] = apart(first, second);
    return Math.abs(columns - rows) + costs.diagonal * Math.min(columns, rows);
}

/** The squares a footprint covers, row by row from its top left. */
export function coveredSquares(footprint: Footprint): Square[]
{
    return Array.from({ length: footprint.side * footprint.side }, (_, index) => ({ column: footprint.square.column + (index % footprint.side), row: footprint.square.row + Math.floor(index / footprint.side) }));
}

// The eight steps around a square: the four sides first, then the corners.
const directions = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]] as const;

/**
 * Dijkstra from a square: what reaching each square costs, and the square it is reached from. A step goes to an open square around, never across the corner
 * of a closed one; it costs 1, or the diagonal's cost, times the factor of difficult ground it enters. It stops past the budget, or at the goal.
 */
function spread(grid: Grid, start: number, costs: StepCosts, budget: number, goal?: number): { cost: Map<number, number>; previous: Map<number, number>; }
{
    const open = Array.from({ length: grid.columns * grid.rows }, (_, index) => closedSquare(grid, squareAt(grid, index)) === undefined);
    const factor = Array.from({ length: grid.columns * grid.rows }, (_, index) => (featureAt(grid, squareAt(grid, index))?.difficult ? costs.difficult : 1));
    const isOpen = (column: number, row: number): boolean => column >= 0 && row >= 0 && column < grid.columns && row < grid.rows && open[row * grid.columns + column];
    const cost = new Map([[start, 0]]);
    const previous = new Map<number, number>();
    const settled = new Set<number>();
    const queue = new CostQueue();
    queue.push(start, 0);

    for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
        const [at, spent] = next;

        if (settled.has(at)) {
            continue;
        }

        settled.add(at);

        if (at === goal) {
            break;
        }

        const { column, row } = squareAt(grid, at);

        for (const [across, down] of directions) {
            const [toColumn, toRow] = [column + across, row + down];
            const diagonal = across !== 0 && down !== 0;

            if (!isOpen(toColumn, toRow) || (diagonal && (!isOpen(toColumn, row) || !isOpen(column, toRow)))) {
                continue;
            }

            const onto = toRow * grid.columns + toColumn;
            const total = spent + (diagonal ? costs.diagonal : 1) * factor[onto];

            if (total <= budget && total < (cost.get(onto) ?? Infinity)) {
                cost.set(onto, total);
                previous.set(onto, at);
                queue.push(onto, total);
            }
        }
    }

    return { cost: new Map([...cost].filter(([index]) => settled.has(index) || index === goal)), previous };
}

/** The squares between two footprints, across and down: 0 where they overlap, 1 where they touch. */
function apart(first: Footprint, second: Footprint): [number, number]
{
    const gap = (start: number, side: number, otherStart: number, otherSide: number): number => Math.max(0, otherStart - (start + side - 1), start - (otherStart + otherSide - 1));
    return [gap(first.square.column, first.side, second.square.column, second.side), gap(first.square.row, first.side, second.square.row, second.side)];
}

function isInside(grid: Grid, square: Square): boolean
{
    return square.column >= 0 && square.row >= 0 && square.column < grid.columns && square.row < grid.rows;
}

function indexOf(grid: Grid, square: Square): number
{
    return square.row * grid.columns + square.column;
}

function squareAt(grid: Grid, index: number): Square
{
    return { column: index % grid.columns, row: Math.floor(index / grid.columns) };
}

/** Squares by what reaching them costs, the cheapest first, and between equals the first by row and column: a binary heap. */
class CostQueue
{
    private readonly items: [number, number][] = [];

    push(index: number, cost: number): void
    {
        this.items.push([index, cost]);

        for (let at = this.items.length - 1; at > 0 && this.before(at, (at - 1) >> 1); at = (at - 1) >> 1) {
            this.swap(at, (at - 1) >> 1);
        }
    }

    pop(): [number, number] | undefined
    {
        const first = this.items[0];
        const last = this.items.pop();

        if (first === undefined || last === undefined || this.items.length === 0) {
            return first;
        }

        this.items[0] = last;

        for (let at = 0;;) {
            const [left, right] = [at * 2 + 1, at * 2 + 2];
            const least = [left, right].filter((child) => child < this.items.length).reduce((best, child) => (this.before(child, best) ? child : best), at);

            if (least === at) {
                return first;
            }

            this.swap(at, least);
            at = least;
        }
    }

    private before(first: number, second: number): boolean
    {
        const [[firstIndex, firstCost], [secondIndex, secondCost]] = [this.items[first], this.items[second]];
        return firstCost < secondCost || (firstCost === secondCost && firstIndex < secondIndex);
    }

    private swap(first: number, second: number): void
    {
        [this.items[first], this.items[second]] = [this.items[second], this.items[first]];
    }
}
