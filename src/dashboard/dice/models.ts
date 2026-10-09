// The dice as the page throws them (D-278): each die's shape for the physics and its values, from dice.json, which make-dice.py writes with the dice; and the
// turn that makes a die land on the number decided before the throw. A die lands as the physics wants; the page then shows it turned by one of its symmetries,
// a turn that leaves its shape where it is and brings the wanted face where the landed one is, so that the dice are real dice, with their numbers in place.
import type { ThrownDie } from "../data.ts";

/** A direction, or a point: x, y, z, with y up. */
export type Vector = [number, number, number];

/** A turn, as a quaternion: x, y, z, w. */
export type Turn = [number, number, number, number];

/** A die's shape without bevels: its corners, and its faces as corners in order, counterclockwise seen from outside. */
export interface Shape
{
    vertices: Vector[];
    faces: number[][];
}

/** A value of a die: the direction that looks up when it is rolled, a face's or, on the d4, a corner's, and the direction of the top of its number. */
export interface DieValue
{
    value: number;
    up: Vector;
    /** None on the d4, whose number is on three faces. */
    top?: Vector;
}

/** A die: its shape and its values. */
export interface DieModel
{
    shape: Shape;
    values: DieValue[];
}

/**
 * A die to throw: which of the models; the values it lands on, throw after throw, as before and after a reroll, or each face of an explosion; and whether it
 * does not count, as the lower of two d20 with advantage.
 */
export interface DieThrow
{
    kind: string;
    values: number[];
    dropped: boolean;
}

// The direction that is up on the screen, on the floor: away from the camera, which looks from the near side.
const screenUp: Vector = [0, 0, -1];

/** The dice to throw for the dice of a roll: a d% as its tens and its units, a d10's 10 as its 0; dice with no model, as a d3 or dF, are left out. */
export function diceToThrow(dice: ThrownDie[], kinds: ReadonlySet<string>): DieThrow[]
{
    return dice.flatMap((die): DieThrow[] => {
        // The face before a reroll, then the faces it showed after, more than one when it exploded.
        const values = [...(die.rerolledFrom === undefined ? [] : [die.rerolledFrom]), ...(die.faces ?? [die.value])];
        const dropped = die.dropped === true;

        if (die.sides === 100) {
            return [{ kind: "d100", values: values.map((value) => Math.floor((value % 100) / 10) * 10), dropped }, { kind: "d10", values: values.map((value) => value % 10), dropped }];
        }

        const kind = `d${die.sides}`;
        return kinds.has(kind) ? [{ kind, values: die.sides === 10 ? values.map((value) => value % 10) : values, dropped }] : [];
    });
}

/** The turns that leave a shape where it is: its symmetries, the identity among them. */
export function symmetries(shape: Shape): Turn[]
{
    const points = shape.vertices;
    const size = Math.max(...points.map(length));
    const sameLength = (one: Vector, other: Vector): boolean => Math.abs(length(one) - length(other)) < size * 1e-4;
    const [first] = points;
    const second = points.find((point) => length(cross(first, point)) > size * size * 1e-2);

    if (first === undefined || second === undefined) {
        return [[0, 0, 0, 1]];
    }

    const source = frame(first, second);
    const turns: Turn[] = [];

    for (const to of points) {
        for (const other of points) {
            if (!sameLength(to, first) || !sameLength(other, second) || Math.abs(dot(to, other) - dot(first, second)) > size * size * 1e-4) {
                continue;
            }

            const target = frame(to, other);
            const turn = combine(target, conjugate(source));

            if (points.every((point) => points.some((onto) => distance(rotate(turn, point), onto) < size * 1e-3))) {
                turns.push(turn);
            }
        }
    }

    return turns;
}

/** The value a die shows, turned so: the one whose up direction points highest. */
export function landedValue(model: DieModel, turn: Turn): DieValue
{
    return model.values.reduce((best, value) => (rotate(turn, value.up)[1] > rotate(turn, best.up)[1] ? value : best));
}

/**
 * The symmetry to show a die with, so that it shows the wanted value where it landed: of those that bring the wanted value's up direction onto the landed one's,
 * the one that leaves its number most upright on the screen. The die is then shown as its turn, then this one.
 */
export function landingTurn(model: DieModel, turns: Turn[], turn: Turn, wanted: number): Turn
{
    const landed = landedValue(model, turn);
    const goal = model.values.find((value) => value.value === wanted);

    if (goal === undefined) {
        return [0, 0, 0, 1];
    }

    const fitting = turns.filter((symmetry) => distance(rotate(symmetry, goal.up), landed.up) < 1e-3 * length(landed.up));
    const top = goal.top;
    const upright = (symmetry: Turn): number => (top === undefined ? 0 : dot(rotate(turn, rotate(symmetry, top)), screenUp));
    return fitting.reduce<Turn | undefined>((best, symmetry) => (best === undefined || upright(symmetry) > upright(best) ? symmetry : best), undefined) ?? [0, 0, 0, 1];
}

/**
 * The angle about the vertical that brings the number of a die lying so upright on the screen, its top away from the player: the die turns on its face as it
 * stops, as real dice do. None for a die whose number has no one top, as the d4.
 */
export function uprightAngle(model: DieModel, turn: Turn, value: number): number
{
    const top = model.values.find((candidate) => candidate.value === value)?.top;

    if (top === undefined) {
        return 0;
    }

    const [x, , z] = rotate(turn, top);
    // A top that points mostly up or down has no way across the floor to turn.
    return Math.hypot(x, z) < 0.2 ? 0 : Math.atan2(x, -z);
}

/** A turn of this angle about the vertical. */
export function aboutVertical(angle: number): Turn
{
    return [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
}

/** A vector turned. */
export function rotate(turn: Turn, vector: Vector): Vector
{
    const [x, y, z, w] = turn;
    const [vx, vy, vz] = vector;
    const tx = 2 * (y * vz - z * vy);
    const ty = 2 * (z * vx - x * vz);
    const tz = 2 * (x * vy - y * vx);
    return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}

/** The turn `second`, then `first`. */
export function combine(first: Turn, second: Turn): Turn
{
    const [ax, ay, az, aw] = first;
    const [bx, by, bz, bw] = second;
    return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}

function conjugate(turn: Turn): Turn
{
    return [-turn[0], -turn[1], -turn[2], turn[3]];
}

/** The turn that brings the axes onto the frame of two directions: x along the first, y toward the second, z across them. */
function frame(first: Vector, second: Vector): Turn
{
    const x = scale(first, 1 / length(first));
    const along = dot(second, x);
    const sideways: Vector = [second[0] - x[0] * along, second[1] - x[1] * along, second[2] - x[2] * along];
    const y = scale(sideways, 1 / length(sideways));
    const z = cross(x, y);
    return fromAxes(x, y, z);
}

/** A turn from the directions the axes go to: the columns of its matrix. */
function fromAxes(x: Vector, y: Vector, z: Vector): Turn
{
    const trace = x[0] + y[1] + z[2];

    if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        return [(y[2] - z[1]) * s, (z[0] - x[2]) * s, (x[1] - y[0]) * s, 0.25 / s];
    }

    if (x[0] > y[1] && x[0] > z[2]) {
        const s = 2 * Math.sqrt(1 + x[0] - y[1] - z[2]);
        return [0.25 * s, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s];
    }

    if (y[1] > z[2]) {
        const s = 2 * Math.sqrt(1 + y[1] - x[0] - z[2]);
        return [(y[0] + x[1]) / s, 0.25 * s, (z[1] + y[2]) / s, (z[0] - x[2]) / s];
    }

    const s = 2 * Math.sqrt(1 + z[2] - x[0] - y[1]);
    return [(z[0] + x[2]) / s, (z[1] + y[2]) / s, 0.25 * s, (x[1] - y[0]) / s];
}

function dot(first: Vector, second: Vector): number
{
    return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

function cross(first: Vector, second: Vector): Vector
{
    return [first[1] * second[2] - first[2] * second[1], first[2] * second[0] - first[0] * second[2], first[0] * second[1] - first[1] * second[0]];
}

function length(vector: Vector): number
{
    return Math.hypot(...vector);
}

function scale(vector: Vector, by: number): Vector
{
    return [vector[0] * by, vector[1] * by, vector[2] * by];
}

function distance(first: Vector, second: Vector): number
{
    return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}
