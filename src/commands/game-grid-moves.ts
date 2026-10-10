// What a move on the map of a place tells the master (GRD-4, GRD-5): how far it went by the shortest way, whose side it left on the way and who stands next to
// it now; in a fight, on its turn, how far it has moved and what is left of its speed, which the open scene keeps for the turn.
import { formatStep, readFirstLength } from "../core/length.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { closedSquare, coveredSquares, type Footprint, type Grid, isNextTo, shortestWay, type Square, squareName } from "../grid/index.ts";
import { isEmptyField, type Page, type World } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import type { GameSystem, GridRules } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import type { Standing } from "./game-grids.ts";
import type { Measures } from "./game-roads.ts";
import { copyPage } from "./game-scene.ts";

/** A move on a place's map: who moves, as the place's `at` names them, from where to where, and the others on it as they stood before. */
export interface MapMove
{
    grid: Grid;
    who: Standing;
    from: Square;
    to: Square;
    others: Standing[];
}

/** What a move on a map says (GRD-5): how far it went, the words for the master, and the scene's new count of the turn when it changes. */
export interface MoveFacts
{
    distance?: string;
    notes: string[];
    moved?: Scene["moved"];
}

/** The facts of a move on a place's map (GRD-5), as the game's grid counts them; nothing to tell when the game has no grid. */
export function moveFacts(world: World, system: GameSystem | undefined, measures: Measures, scene: Scene | undefined, move: MapMove): MoveFacts
{
    const rules = system?.grid;

    if (rules === undefined) {
        return { notes: [] };
    }

    const way = shortestWay(move.grid, move.from, move.to, { diagonal: rules.diagonal, difficult: rules.difficult });
    const name = move.who.name;

    if (way === undefined) {
        return { notes: [`No way on foot leads from ${squareName(move.from)} to ${squareName(move.to)}: ${name} stands there all the same, and how is yours to tell.`] };
    }

    const step = (squares: number): string => formatStep(squares * rules.square, measures.units, measures.imperial);
    const side = sideOf(world, rules, scene, move.who);
    const footprint = (square: Square): Footprint => ({ square, side });
    const others = move.others.filter(isAlive).flatMap((one) => (one.square === undefined ? [] : [{ name: one.name, footprint: { square: one.square, side: sideOf(world, rules, scene, one) } }]));
    const besideAny = (squares: Square[]): string[] => others.filter((one) => squares.some((square) => isNextTo(footprint(square), one.footprint))).map((one) => one.name);
    const now = besideAny([move.to]);
    const left = besideAny([move.from, ...way.squares.slice(0, -1)]).filter((one) => !now.includes(one));
    const covered = coveredSquares(footprint(move.to));
    const shut = covered.map((square) => closedSquare(move.grid, square)).find((closed) => closed !== undefined);
    const turn = turnFacts(world, rules, measures, scene, move.who, way.cost, step);
    return {
        distance: step(way.cost),
        notes: [
            ...(now.length === 0 ? [] : [`Next to ${name} now: ${now.join(", ")}.`]),
            ...(left.length === 0 ? [] : [`Along the shortest way ${name} leaves the side of ${left.join(", ")}${rules.leaving === undefined ? "" : `: read ${rules.leaving}`}.`]),
            ...(shut === undefined ? [] : [`${name} fills ${squareName(move.to)} to ${squareName(covered.at(-1) ?? move.to)}, but ${shut}.`]),
            ...turn.notes,
        ],
        ...(turn.moved === undefined ? {} : { moved: turn.moved }),
    };
}

/** The side in squares of what one fills on the map (GRD-4): from the size of its page, or of its copy's creature; 1 when the game says nothing of it. */
export function sideOf(world: World, rules: GridRules, scene: Scene | undefined, one: Standing): number
{
    const page = standingPage(scene, one);
    const size = page === undefined || rules.size === undefined ? undefined : valueNamed(effectiveFields(world, page), rules.size);
    return (typeof size === "string" ? Object.entries(rules.footprints).find(([name]) => comparableText(name) === comparableText(size))?.[1] : undefined) ?? 1;
}

/** On the turn of who moves, in a scene with turns: how far they have moved in it and what is left of their speed, and the scene's new count (GRD-5). */
function turnFacts(world: World, rules: GridRules, measures: Measures, scene: Scene | undefined, who: Standing, cost: number, step: (squares: number) => string): { notes: string[]; moved?: Scene["moved"]; }
{
    if (scene?.order === undefined || scene.turn === undefined || comparableText(scene.turn) !== comparableText(who.name)) {
        return { notes: [] };
    }

    const round = scene.round ?? 1;
    const counted = scene.moved !== undefined && scene.moved.round === round && comparableText(scene.moved.turn) === comparableText(scene.turn);
    const moved = { round, turn: scene.turn, squares: (counted ? (scene.moved?.squares ?? 0) : 0) + cost };
    const page = standingPage(scene, who);
    const written = page === undefined ? undefined : valueNamed(effectiveFields(world, page), rules.speed);
    const speed = readFirstLength(written, measures.imperial);

    if (speed === undefined) {
        const how = `write ${rules.speed} as 30 ft or 9 m`;
        return { notes: [isEmptyField(written) ? `${who.name} has no ${rules.speed} to count this turn with: ${how}.` : `${who.name}'s ${rules.speed}, ${String(written)}, does not read as a walking speed: ${how}.`], moved };
    }

    const metres = (value: number): string => formatStep(value, measures.units, measures.imperial);
    const left = Math.round((speed - moved.squares * rules.square) * 100) / 100;
    const note = left >= 0
        ? `This turn ${who.name} has moved ${step(moved.squares)} of ${metres(speed)}: ${metres(left)} left.`
        : `This turn ${who.name} has moved ${step(moved.squares)}, ${metres(-left)} beyond the ${metres(speed)} of ${who.name}'s speed: yours to judge, with what lets one go farther.`;
    return { notes: [note], moved };
}

/** The page of one on the map: a copy's as a page of its creature. */
function standingPage(scene: Scene | undefined, one: Standing): Page | undefined
{
    const copy = one.copy === undefined ? undefined : scene?.copies[one.copy];
    return copy === undefined || one.copy === undefined ? one.page : copyPage(one.copy, copy);
}

/** Whether one on the map is someone whose side counts: a copy of the scene, or a living character; never a thing, nor the dead. */
function isAlive(one: Standing): boolean
{
    return one.copy !== undefined || (one.page?.type === "character" && one.page.fields.status !== "dead");
}
