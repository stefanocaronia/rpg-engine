// A throw of dice (D-278): simulated with Rapier before it is shown, and recorded frame by frame, with the knocks of the dice, for their sound. The same
// frames, shown, are the physics: the dice land where they landed. A die stops only lying on the floor with a whole face; when one comes to rest leaning
// on a wall or on another die, or on top of one, or one inside another, as a thin coin sinks through the one it fell on, the throw goes back to a moment the
// dice still ran and goes on from there, their speeds a little changed, so that nobody sees the throw that leaned (D-400).
// Rapier by its default export: its declarations name their files without extension, which the tests' NodeNext cannot follow, so only there it is any;
// the page's own build reads them whole and checks its types.
import RAPIER from "@dimforge/rapier3d-compat";
import { faceNormals, rotate, type Shape, type Turn, type Vector } from "./models.ts";

/** Where a die is, and how it is turned, in one frame. */
export interface Frame
{
    position: Vector;
    quaternion: Turn;
}

/** A throw: its frames, sixty to a second, each with where every die is; and its knocks, by frame, each as hard as the die hit, and whether on another die. */
export interface Throw
{
    frames: Frame[][];
    knocks: { frame: number; strength: number; onDie: boolean; }[];
}

/** The floor the dice roll on, between walls this far from the centre, sideways and in depth. */
export interface Tray
{
    width: number;
    depth: number;
}

/** A die lying still before the throw, as one thrown before a reroll: the others hit it, and it does not move. */
export interface Lying
{
    shape: Shape;
    frame: Frame;
}

/** A die in a frame, with how it moves. */
interface Motion extends Frame
{
    velocity: Vector;
    spin: Vector;
}

/** A stretch of a throw, simulated from given motions: its frames and motions, its knocks, and whether it ended with a die at rest not lying flat, or inside another. */
interface Run
{
    frames: Frame[][];
    motions: Motion[][];
    knocks: Throw["knocks"];
    leaned: boolean;
    /** The thrown dice that ended inside another, by their place. */
    inside: number[];
}

const step = 1 / 60;
// A throw stops by itself well before this; past it, the dice are taken as they lie.
const longest = 8 / step;
// A knock softer than this makes no sound, as a die settling; a die knocks on the floor, and two dice on each other, at most once in so many frames, as one
// that rattles.
const softest = 1.5;
const knockGap = 3;
// More than the farthest corner of any die from its centre.
const startClearance = 1.3;
// How far left of the middle the dice leave the hand at most: in a common window's tray, three quarters of its half width; and that half width.
const farthestStart = 6.5;
const commonWidth = 7;
// Dice that went less than this in the last frames are at rest.
const restingMove = 0.02;
const restingFrames = 12;
// A die lies flat when a face looks down within this angle, and on the floor when its lowest corner is this near it; dice at rest with one that does not,
// this long, lean: before, it may still be tipping over.
const flatAngle = (3 * Math.PI) / 180;
const floorContact = 0.1;
// A die is inside another past this depth: lying on each other they touch, by a hair.
const insideDepth = 0.05;
const leaningFrames = 30;
// A throw that leaned goes back to the last frame the dice that leaned ran faster than so much, and so many frames more at each try, never before the
// dice have flown this long; it changes the speed of the dice still running by this much at most; past so many tries, the dice are thrown anew.
const runningSpeed = 3;
const rewind = 15;
const earliest = 20;
const nudge = 0.06;
const stillSpeed = 0.5;
const tries = 12;
// How long a throw may be simulated again, in milliseconds, while the page waits: past it, the throw that leaned least is taken. Ten dice fit on a
// computer's tray; on a phone's, past six they crowd, and one may lean at times.
const budget = 400;
// How the dice touch: friction and bounce are the average of the two bodies', so that a die slides on a die as resin on resin and grips the floor as felt.
const dieFriction = 0.2;
const floorFriction = 1.2;
const dieBounce = 0.35;
const floorBounce = 0.25;

let loading: Promise<void> | undefined;

/** Loads the physics, once: a throw needs it. */
export function loadPhysics(): Promise<void>
{
    const loaded: Promise<void> = loading ?? RAPIER.init();
    loading = loaded;
    return loaded;
}

/**
 * Throws dice of these shapes into the tray together, from its left side, spinning, with the randomness given, until they all lie flat; past lying dice, if
 * any; within a budget of time, by the clock given.
 */
export function throwDice(shapes: Shape[], tray: Tray, random: () => number = Math.random, lying: Lying[] = [], clock: () => number = () => performance.now()): Throw
{
    const normals = shapes.map(faceNormals);
    const started = clock();
    let best: { thrown: Throw; leaning: number; } | undefined;

    for (;;) {
        let frames: Frame[][] = [];
        let motions: Motion[][] = [];
        let knocks: Throw["knocks"] = [];
        let from = 0;
        let start = leavingHand(shapes, tray, random);

        for (let attempt = 1; attempt <= tries; attempt++) {
            const run = simulate(shapes, normals, tray, lying, start, from);
            frames = [...frames.slice(0, from), ...run.frames];
            motions = [...motions.slice(0, from), ...run.motions];
            knocks = [...knocks.filter((knock) => knock.frame < from), ...run.knocks];

            if (!run.leaned) {
                return { frames, knocks };
            }

            const leaning = [...new Set([...leaningDice(shapes, normals, motions), ...run.inside])];

            if (best === undefined || leaning.length < best.leaning) {
                best = { thrown: { frames, knocks }, leaning: leaning.length };
            }

            if (clock() - started > budget) {
                return best.thrown;
            }

            const running = leaning.map((index) => motions.findLastIndex((frame) => Math.hypot(...(frame[index]?.velocity ?? [0, 0, 0])) > runningSpeed));
            from = Math.min(motions.length, Math.max(earliest, Math.min(...running) - rewind * (attempt - 1)));
            start = nudged(motions[from - 1] ?? [], random);
        }
    }
}

/** The dice that rest at the end not lying flat on the floor. */
function leaningDice(shapes: Shape[], normals: Vector[][], motions: Motion[][]): number[]
{
    return (motions.at(-1) ?? []).flatMap((motion, index) => (onTheFloor(shapes[index], normals[index] ?? [], motion) ? [] : [index]));
}

/** How the dice leave the hand: one beside the other across the tray's depth, from its left, spinning. */
function leavingHand(shapes: Shape[], tray: Tray, random: () => number): Motion[]
{
    return shapes.map((_, index): Motion => {
        const spin = (): number => (random() - 0.5) * 40;
        const across = shapes.length === 1 ? (random() - 0.5) * tray.depth : ((index + 0.5) / shapes.length - 0.5) * tray.depth * 0.8;
        // From the tray's left, as far as a common window's, so that in a wide one the dice still come to its middle; clear of the left wall, where a die
        // would be pushed out with a knock, in the air, before it ever falls.
        const position: Vector = [Math.max(-Math.min(tray.width * 0.75, farthestStart) - random(), -tray.width + startClearance), 2.5 + random() + index * 0.3, across];
        // In a narrow tray, as a phone's, more gently: the dice would all end against its far wall.
        const strength = Math.min(1, tray.width / commonWidth);
        return { position, quaternion: randomTurn(random), velocity: [(11 + random() * 6) * strength, 2 + random() * 4, (random() - 0.5) * 10], spin: [spin(), spin(), spin()] };
    });
}

/** The dice as they move, the speed of those still running changed a little, as unseen as a breath. */
function nudged(motions: Motion[], random: () => number): Motion[]
{
    const change = (vector: Vector): Vector => vector.map((part) => part * (1 + (random() - 0.5) * 2 * nudge)) as Vector;
    return motions.map((motion) => (Math.hypot(...motion.velocity) < stillSpeed ? motion : { ...motion, velocity: change(motion.velocity), spin: change(motion.spin) }));
}

/** The throw from these motions, its frames counted from the one given, until the dice lie flat on the floor, or rest with one that does not. */
function simulate(shapes: Shape[], normals: Vector[][], tray: Tray, lying: Lying[], start: Motion[], from: number): Run
{
    const world = new RAPIER.World({ x: 0, y: -60, z: 0 });
    world.timestep = step;
    const events = new RAPIER.EventQueue(true);

    try {
        const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
        const thickness = 1;
        // The floor, under y = 0, and the four walls around it, reaching high.
        const sides: [number, number, number, number, number, number][] = [
            [0, -thickness, 0, 100, thickness, 100],
            [-tray.width - thickness, 50, 0, thickness, 50, 100],
            [tray.width + thickness, 50, 0, thickness, 50, 100],
            [0, 50, -tray.depth - thickness, 100, 50, thickness],
            [0, 50, tray.depth + thickness, 100, 50, thickness],
        ];

        for (const [x, y, z, halfWidth, halfHeight, halfDepth] of sides) {
            world.createCollider(RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfDepth).setTranslation(x, y, z).setFriction(floorFriction).setRestitution(floorBounce), fixed);
        }

        // The colliders of the dice, lying and thrown; and of each thrown die, its place among them.
        const dice = new Set<number>();
        const thrownIndex = new Map<number, number>();

        for (const die of lying) {
            const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...die.frame.position).setRotation(rotation(die.frame.quaternion)));
            dice.add(world.createCollider(dieCollider(die.shape), body).handle);
        }

        const bodies = shapes.map((shape, index) => {
            const motion = start[index];
            const description = RAPIER.RigidBodyDesc.dynamic().setLinearDamping(0.5).setAngularDamping(0.8).setCcdEnabled(true);

            if (motion !== undefined) {
                description.setTranslation(...motion.position).setRotation(rotation(motion.quaternion)).setLinvel(...motion.velocity).setAngvel(vector(motion.spin));
            }

            const body = world.createRigidBody(description);
            const handle = world.createCollider(dieCollider(shape).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), body).handle;
            dice.add(handle);
            thrownIndex.set(handle, index);
            return body;
        });

        const frames: Frame[][] = [];
        const motions: Motion[][] = [];
        const knocks: Throw["knocks"] = [];
        const now = (): number => from + frames.length;
        // When a die last knocked the floor or a wall, and two dice each other, by the pair: a rattle knocks once in a few frames.
        const lastKnock = new Map<string, number>();
        // Since when the dice rest with one not lying flat on the floor.
        let leaningSince: number | undefined;

        while (now() < longest) {
            const before = motions.at(-1) ?? start;
            world.step(events);
            events.drainCollisionEvents((first: number, second: number, started: boolean) => {
                // In the first frames of a throw taken again, the dice's contacts begin anew though they went on: no knock.
                const resumed = from > 0 && frames.length < knockGap;
                const onDie = dice.has(first) && dice.has(second);
                // A die on the floor or a wall knocks once for both; two dice, once for the pair.
                const key = onDie ? [first, second].sort((one, other) => one - other).join(" ") : String(dice.has(first) ? first : second);
                const strength = started && !resumed ? impact(world, first, second, before, thrownIndex) : 0;

                if (strength > softest && now() - (lastKnock.get(key) ?? -knockGap) >= knockGap) {
                    knocks.push({ frame: now(), strength, onDie });
                    lastKnock.set(key, now());
                }
            });
            const motion = bodies.map((body): Motion => {
                const { x, y, z } = body.translation();
                const turn = body.rotation();
                const velocity = body.linvel();
                const spin = body.angvel();
                return { position: [x, y, z], quaternion: [turn.x, turn.y, turn.z, turn.w], velocity: [velocity.x, velocity.y, velocity.z], spin: [spin.x, spin.y, spin.z] };
            });
            const frame = motion.map(({ position, quaternion }): Frame => ({ position, quaternion }));
            const earlier = frames.at(-restingFrames);
            frames.push(frame);
            motions.push(motion);

            if (earlier === undefined || !frame.every((die, index) => moved(earlier[index], die) < restingMove)) {
                leaningSince = undefined;
                continue;
            }

            if (frame.every((die, index) => onTheFloor(shapes[index], normals[index] ?? [], die))) {
                const inside = insideAnother(world, dice, thrownIndex);
                return { frames, motions, knocks, leaned: inside.length > 0, inside };
            }

            leaningSince ??= now();

            if (now() - leaningSince >= leaningFrames) {
                return { frames, motions, knocks, leaned: true, inside: [] };
            }
        }

        const inside = insideAnother(world, dice, thrownIndex);
        return { frames, motions, knocks, leaned: leaningDice(shapes, normals, motions).length > 0 || inside.length > 0, inside };
    } finally {
        events.free();
        world.free();
    }
}

/** The thrown dice inside another die, by their place: two thin coins, one fallen on the other, may end one through the other. */
function insideAnother(world: InstanceType<typeof RAPIER.World>, dice: Set<number>, thrownIndex: Map<number, number>): number[]
{
    const handles = [...dice];
    const inside = new Set<number>();

    handles.forEach((first, at) => {
        for (const second of handles.slice(at + 1)) {
            world.contactPair(world.getCollider(first), world.getCollider(second), (manifold: { numContacts(): number; contactDist(index: number): number; }) => {
                const deep = Array.from({ length: manifold.numContacts() }, (_, index) => manifold.contactDist(index)).some((distance) => distance < -insideDepth);

                if (deep) {
                    [first, second].forEach((handle) => thrownIndex.has(handle) && inside.add(thrownIndex.get(handle) as number));
                }
            });
        }
    });

    return [...inside];
}

/** How hard two colliders that began to touch met: how fast they came together along their contact, the frame before; at least one of them a thrown die. */
function impact(world: InstanceType<typeof RAPIER.World>, first: number, second: number, before: Motion[], thrownIndex: Map<number, number>): number
{
    const velocity = (handle: number): Vector => before[thrownIndex.get(handle) ?? -1]?.velocity ?? [0, 0, 0];
    const [one, other] = [velocity(first), velocity(second)];
    const closing: Vector = [one[0] - other[0], one[1] - other[1], one[2] - other[2]];
    let normal: Vector | undefined;
    world.contactPair(world.getCollider(first), world.getCollider(second), (manifold: { normal(): { x: number; y: number; z: number; }; }) => {
        const { x, y, z } = manifold.normal();
        normal ??= [x, y, z];
    });

    return normal === undefined ? Math.hypot(...closing) : Math.abs(closing[0] * normal[0] + closing[1] * normal[1] + closing[2] * normal[2]);
}

/** A die's body for the physics: its shape's hull. */
function dieCollider(shape: Shape)
{
    const hull = RAPIER.ColliderDesc.convexHull(new Float32Array(shape.vertices.flat()));

    if (hull === null) {
        throw new Error("A die's shape has no hull: its corners in dice.json are fewer than four or lie in a plane. Write the dice again with make-dice.py.");
    }

    return hull.setFriction(dieFriction).setRestitution(dieBounce);
}

/** Whether a die lies on the floor with a whole face: not on an edge, leaning, nor on another die. */
function onTheFloor(shape: Shape | undefined, normals: Vector[], frame: Frame): boolean
{
    const lowest = Math.min(...(shape?.vertices ?? []).map((corner) => rotate(frame.quaternion, corner)[1] + frame.position[1]));
    return lowest < floorContact && normals.some((normal) => -rotate(frame.quaternion, normal)[1] > Math.cos(flatAngle) * Math.hypot(...normal));
}

/** A turn at random, every turn as likely. */
function randomTurn(random: () => number): Turn
{
    const [first, second, third] = [random(), random(), random()];
    const [one, other] = [Math.sqrt(1 - first), Math.sqrt(first)];
    return [one * Math.sin(2 * Math.PI * second), one * Math.cos(2 * Math.PI * second), other * Math.sin(2 * Math.PI * third), other * Math.cos(2 * Math.PI * third)];
}

function rotation([x, y, z, w]: Turn): { x: number; y: number; z: number; w: number; }
{
    return { x, y, z, w };
}

function vector([x, y, z]: Vector): { x: number; y: number; z: number; }
{
    return { x, y, z };
}

/** How far a die went between two frames, in its place and in its turn. */
function moved(before: Frame, after: Frame): number
{
    const place = Math.hypot(after.position[0] - before.position[0], after.position[1] - before.position[1], after.position[2] - before.position[2]);
    const turn = Math.hypot(...after.quaternion.map((part, index) => part - before.quaternion[index]));
    return Math.max(place, turn);
}
