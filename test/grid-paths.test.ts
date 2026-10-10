// The ways across a place's map (GRD-4): the shortest round walls and never across their corners, difficult ground, the squares within reach, who stands
// next to whom; laws on maps made at random, against a search that relaxes every step until nothing changes.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { closedSquare, featureAt, type Grid, isNextTo, reachable, readGrid, readSquare, shortestWay, type Square, squareName, squaresApart, type StepCosts } from "../src/grid/index.ts";

const fifth: StepCosts = { diagonal: 1, difficult: 2 };

const map = (...rows: string[]): Grid => readGrid([...rows, "", "t tavolo: table, difficult", "k botte: barrel, blocks"].join("\n")).grid;
const at = (name: string): Square => readSquare(name) ?? { column: -1, row: -1 };
const names = (squares: Square[]): string[] => squares.map(squareName);

describe("the shortest way (GRD-4)", () => {
    it("goes round a wall a square at a time and never across its corner", () => {
        const room = map("#####", "#...#", "#.#.#", "#...#", "#####");
        expect(shortestWay(room, at("B2"), at("D4"), fifth)).toEqual({ squares: [at("C2"), at("D2"), at("D3"), at("D4")], cost: 4 });
        expect(shortestWay(room, at("B2"), at("B2"), fifth)).toEqual({ squares: [], cost: 0 });
    });

    it("pays double to enter difficult ground, and goes round it when that is cheaper", () => {
        expect(shortestWay(map("#####", "#.t.#", "#####"), at("B2"), at("D2"), fifth)?.cost).toBe(3);
        expect(shortestWay(map("#####", "#.t.#", "#...#", "#####"), at("B2"), at("D2"), fifth)).toEqual({ squares: [at("C3"), at("D2")], cost: 2 });
    });

    it("counts a diagonal as the game says, and finds no way into a closed room or onto what blocks", () => {
        expect(shortestWay(map("....", "....", "...."), at("A1"), at("C3"), { diagonal: 1.5, difficult: 2 })?.cost).toBe(3);
        expect(shortestWay(map("#####", "#.#.#", "#####"), at("B2"), at("D2"), fifth)).toBeUndefined();
        expect(shortestWay(map("#####", "#.k.#", "#####"), at("B2"), at("C2"), fifth)).toBeUndefined();
    });

    it("gives the squares within reach of what is left to spend, the start among them (D-328)", () => {
        const hall = map("#######", "#.....#", "#.t...#", "#######");
        expect(names(reachable(hall, at("B2"), 1, fifth).map((one) => one.square)).sort()).toEqual(["B2", "B3", "C2"]);
        expect(reachable(hall, at("B2"), 2, fifth).find((one) => squareName(one.square) === "C3")?.cost).toBe(2);
    });

    it("says who stands next to whom, footprints and all, and how far apart they are", () => {
        const kira = { square: at("C3"), side: 1 };
        expect([isNextTo(kira, { square: at("D4"), side: 1 }), isNextTo(kira, { square: at("E3"), side: 1 }), isNextTo(kira, { square: at("D1"), side: 2 })]).toEqual([true, false, true]);
        expect([squaresApart(kira, { square: at("F5"), side: 1 }, fifth), squaresApart(kira, { square: at("F5"), side: 1 }, { diagonal: 1.5, difficult: 2 }), squaresApart(kira, kira, fifth)]).toEqual([3, 4, 0]);
    });
});

// Maps of up to 6 by 6, each square floor, wall, a table (difficult) or a barrel (blocks); two of their squares; a diagonal of 1 or 1.5.
const randomMap = fc.record({ columns: fc.integer({ min: 2, max: 6 }), rows: fc.integer({ min: 2, max: 6 }) }).chain(({ columns, rows }) =>
    fc.array(fc.array(fc.constantFrom(".", ".", ".", "#", "t", "k"), { minLength: columns, maxLength: columns }), { minLength: rows, maxLength: rows }).map((cells) => map(...cells.map((row) => row.join(""))))
);
const twoSquares = (grid: Grid): fc.Arbitrary<[Square, Square]> =>
    fc.tuple(fc.integer({ min: 0, max: grid.columns * grid.rows - 1 }), fc.integer({ min: 0, max: grid.columns * grid.rows - 1 })).map(([first, second]) => [
        { column: first % grid.columns, row: Math.floor(first / grid.columns) },
        { column: second % grid.columns, row: Math.floor(second / grid.columns) },
    ]);
const scenario = randomMap.chain((grid) => fc.tuple(fc.constant(grid), twoSquares(grid), fc.constantFrom(1, 1.5)));

describe("laws of the ways on maps made at random (GRD-4)", () => {
    it("the cost is the least of every way, as a search that relaxes every step until nothing changes finds it", () => {
        fc.assert(fc.property(scenario, ([grid, [from, to], diagonal]) => {
            const costs = { diagonal, difficult: 2 };
            const least = relaxed(grid, from, costs).get(squareName(to));
            expect(shortestWay(grid, from, to, costs)?.cost).toBe(least);
        }));
    });

    it("the way steps from square to square around, never on a closed one nor across the corner of one, and its steps add up to its cost", () => {
        fc.assert(fc.property(scenario, ([grid, [from, to], diagonal]) => {
            const costs = { diagonal, difficult: 2 };
            const way = shortestWay(grid, from, to, costs);
            const steps = way === undefined ? [] : [from, ...way.squares].slice(0, -1).map((square, index) => [square, way.squares[index]] as const);
            expect(steps.every(([one, other]) => stepCost(grid, one, other, costs) !== undefined)).toBe(true);
            expect(steps.reduce((total, [one, other]) => total + (stepCost(grid, one, other, costs) ?? 0), 0)).toBe(way?.cost ?? 0);
        }));
    });

    it("with diagonals of one square, going and coming back differ only by the ground of the two ends: what one enters is paid", () => {
        fc.assert(fc.property(scenario, ([grid, [from, to]]) => {
            const enter = (square: Square): number => (featureAt(grid, square)?.difficult ? 2 : 1);
            const [going, coming] = [shortestWay(grid, from, to, fifth), shortestWay(grid, to, from, fifth)];
            // From a closed square one may step out, never in: the law is for two open ones.
            const open = closedSquare(grid, from) === undefined && closedSquare(grid, to) === undefined;

            if (open) {
                expect(going === undefined).toBe(coming === undefined);
                expect(going === undefined || coming === undefined || going.cost + enter(from) === coming.cost + enter(to)).toBe(true);
            }
        }));
    });

    it("the squares within reach are those the search reaches spending no more", () => {
        fc.assert(fc.property(scenario, fc.integer({ min: 0, max: 8 }), ([grid, [from], diagonal], budget) => {
            const costs = { diagonal, difficult: 2 };
            const expected = [...relaxed(grid, from, costs)].filter(([, cost]) => cost <= budget).map(([name]) => name).sort();
            expect(names(reachable(grid, from, budget, costs).map((one) => one.square)).sort()).toEqual(expected);
        }));
    });
});

/** What a step from a square to one around it costs, or none when it cannot be taken: onto a closed square, or across the corner of one. */
function stepCost(grid: Grid, from: Square, to: Square, costs: StepCosts): number | undefined
{
    const [across, down] = [to.column - from.column, to.row - from.row];
    const open = (square: Square): boolean => closedSquare(grid, square) === undefined;
    const corners = across !== 0 && down !== 0 ? [{ column: to.column, row: from.row }, { column: from.column, row: to.row }] : [];

    if (Math.max(Math.abs(across), Math.abs(down)) !== 1 || !open(to) || !corners.every(open)) {
        return undefined;
    }

    return (corners.length > 0 ? costs.diagonal : 1) * (featureAt(grid, to)?.difficult ? costs.difficult : 1);
}

/** The least cost to every square from one, by relaxing every step of the map until nothing changes. */
function relaxed(grid: Grid, from: Square, costs: StepCosts): Map<string, number>
{
    const squares = Array.from({ length: grid.columns * grid.rows }, (_, index) => ({ column: index % grid.columns, row: Math.floor(index / grid.columns) }));
    const least = new Map([[squareName(from), 0]]);

    for (let changed = true; changed;) {
        changed = false;

        for (const one of squares) {
            for (const other of squares.filter((square) => Math.max(Math.abs(square.column - one.column), Math.abs(square.row - one.row)) === 1)) {
                const step = least.has(squareName(one)) ? stepCost(grid, one, other, costs) : undefined;
                const total = step === undefined ? Infinity : (least.get(squareName(one)) ?? Infinity) + step;

                if (total < (least.get(squareName(other)) ?? Infinity)) {
                    least.set(squareName(other), total);
                    changed = true;
                }
            }
        }
    }

    return least;
}
