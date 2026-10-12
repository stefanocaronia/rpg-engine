// A throw of dice (D-278): simulated with cannon-es before it is shown, and recorded frame by frame, with the knocks of the dice, for their sound. The same
// frames, shown, are the physics: the dice land where they landed. A die stops only lying on the floor with a whole face; when one comes to rest leaning
// on a wall or on another die, or on top of one, the throw goes back to a moment the dice still ran and goes on from there, their speeds a little changed,
// so that nobody sees the throw that leaned (D-400).
import { Body, ContactMaterial, ConvexPolyhedron, GSSolver, Material, Plane, Quaternion, Vec3, World } from "cannon-es";
import { rotate, type Shape, type Turn, type Vector } from "./models.ts";

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

/** A stretch of a throw, simulated from given motions: its frames and motions, its knocks, and the frame from which a die rests not lying flat, if one does. */
interface Run
{
    frames: Frame[][];
    motions: Motion[][];
    knocks: Throw["knocks"];
    leaningSince?: number;
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
// How far left of the middle the dice leave the hand at most: in a common window's tray, three quarters of its half width.
const farthestStart = 6.5;
// Dice that went less than this in the last frames are at rest: some, as a d12 on a face or two dice leaning on each other, tremble forever for the physics.
const restingMove = 0.02;
const restingFrames = 12;
// A die lies flat when a face looks down within this angle, and on the floor when its lowest corner is this near it; dice at rest with one that does not,
// this long, lean.
const flatAngle = (3 * Math.PI) / 180;
const floorContact = 0.1;
const leaningFrames = 30;
// A throw that leaned goes back to the last frame the dice that leaned ran faster than so much, and so many frames more at each try, never before the
// dice have flown this long; it changes the speed of the dice still running, faster than so much, by this much at most; past so many tries, the dice are
// thrown anew.
const rewind = 6;
const runningSpeed = 3;
const earliest = 20;
const nudge = 0.06;
const stillSpeed = 0.5;
const tries = 12;
// A die slower than this, not on the floor, slides off what it rests on, pushed so hard.
const slideSpeed = 1;
const slideTurn = 2;
const sliding = 20;
// The most a throw may simulate, in frames times dice, about a second on a phone: past it, the throw that leaned least is taken.
const budget = 15000;

/** Throws dice of these shapes into the tray together, from its left side, spinning, with the randomness given, until they all lie flat; past lying dice, if any. */
export function throwDice(shapes: Shape[], tray: Tray, random: () => number = Math.random, lying: Lying[] = []): Throw
{
    const normals = shapes.map(faceNormals);
    let spent = 0;
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
            spent += run.frames.length * shapes.length;

            if (run.leaningSince === undefined) {
                return { frames, knocks };
            }

            const leaning = leaningDice(shapes, normals, motions).length;

            if (best === undefined || leaning < best.leaning) {
                best = { thrown: { frames, knocks }, leaning };
            }

            if (spent > budget) {
                return best.thrown;
            }

            from = Math.max(earliest, lastRunning(shapes, normals, motions) - rewind * (attempt - 1));
            start = nudged(motions[from - 1] ?? [], random);
        }
    }
}

/** The dice that rest at the end not lying flat on the floor. */
function leaningDice(shapes: Shape[], normals: Vector[][], motions: Motion[][]): number[]
{
    return (motions.at(-1) ?? []).flatMap((motion, index) => (onTheFloor(shapes[index], normals[index] ?? [], motion) ? [] : [index]));
}

/** The last frame the dice that came to rest not lying flat still ran fast, before they stopped. */
function lastRunning(shapes: Shape[], normals: Vector[][], motions: Motion[][]): number
{
    const running = leaningDice(shapes, normals, motions).map((index) => motions.findLastIndex((frame) => Math.hypot(...(frame[index]?.velocity ?? [0, 0, 0])) > runningSpeed));
    return Math.min(...running, motions.length);
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
        const turn = new Quaternion().setFromEuler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);
        return { position, quaternion: [turn.x, turn.y, turn.z, turn.w], velocity: [11 + random() * 6, 2 + random() * 4, (random() - 0.5) * 10], spin: [spin(), spin(), spin()] };
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
    // More passes of the solver than its ten: with fewer, a d12 on a face trembles and never stops.
    const solver = new GSSolver();
    solver.iterations = 30;
    const world = new World({ gravity: new Vec3(0, -60, 0), solver });
    const dieMaterial = new Material("die");
    const floorMaterial = new Material("floor");
    world.addContactMaterial(new ContactMaterial(dieMaterial, floorMaterial, { friction: 0.7, restitution: 0.3 }));
    world.addContactMaterial(new ContactMaterial(dieMaterial, dieMaterial, { friction: 0.2, restitution: 0.35 }));

    // The floor faces up; the four walls face the centre.
    const walls: [Vec3, Vec3, number][] = [
        [new Vec3(0, 0, 0), new Vec3(1, 0, 0), -Math.PI / 2],
        [new Vec3(-tray.width, 0, 0), new Vec3(0, 1, 0), Math.PI / 2],
        [new Vec3(tray.width, 0, 0), new Vec3(0, 1, 0), -Math.PI / 2],
        [new Vec3(0, 0, -tray.depth), new Vec3(0, 1, 0), 0],
        [new Vec3(0, 0, tray.depth), new Vec3(0, 1, 0), Math.PI],
    ];

    const [floor] = walls.map(([position, axis, angle]) => {
        const wall = new Body({ mass: 0, material: floorMaterial, shape: new Plane() });
        wall.position.copy(position);
        wall.quaternion.setFromAxisAngle(axis, angle);
        world.addBody(wall);
        return wall;
    });

    for (const die of lying) {
        const body = new Body({ mass: 0, material: dieMaterial, shape: polyhedron(die.shape) });
        body.position.set(...die.frame.position);
        body.quaternion.set(...die.frame.quaternion);
        world.addBody(body);
    }

    const frames: Frame[][] = [];
    const motions: Motion[][] = [];
    const knocks: Throw["knocks"] = [];
    const now = (): number => from + frames.length;
    // When two dice last knocked each other, by the pair: they knock once for both, and their knocks on the floor do not hush them.
    const pairs = new Map<string, number>();

    const dice = shapes.map((shape, index) => {
        const die = new Body({ mass: 1, material: dieMaterial, shape: polyhedron(shape), linearDamping: 0.5, angularDamping: 0.8 });
        const motion = start[index];

        if (motion !== undefined) {
            die.position.set(...motion.position);
            die.quaternion.set(...motion.quaternion);
            die.velocity.set(...motion.velocity);
            die.angularVelocity.set(...motion.spin);
        }

        let lastOnFloor = -knockGap;
        die.addEventListener("collide", (event: { body: Body; contact: { getImpactVelocityAlongNormal(): number; }; }) => {
            const strength = Math.abs(event.contact.getImpactVelocityAlongNormal());
            const onDie = event.body.material === dieMaterial;

            if (strength <= softest) {
                return;
            }

            if (!onDie && now() - lastOnFloor >= knockGap) {
                knocks.push({ frame: now(), strength, onDie });
                lastOnFloor = now();
            } else if (onDie) {
                const pair = [die.id, event.body.id].sort((first, second) => first - second).join(" ");

                if (now() - (pairs.get(pair) ?? -knockGap) >= knockGap) {
                    knocks.push({ frame: now(), strength, onDie });
                    pairs.set(pair, now());
                }
            }
        });
        world.addBody(die);
        return die;
    });

    // Since when the dice rest with one not lying flat on the floor.
    let leaningSince: number | undefined;

    while (now() < longest) {
        dice.forEach((die, index) => slideOff(die, world, shapes[index], normals[index] ?? [], floor));

        world.step(step);
        const motion = dice.map((die): Motion => ({
            position: [die.position.x, die.position.y, die.position.z],
            quaternion: [die.quaternion.x, die.quaternion.y, die.quaternion.z, die.quaternion.w],
            velocity: [die.velocity.x, die.velocity.y, die.velocity.z],
            spin: [die.angularVelocity.x, die.angularVelocity.y, die.angularVelocity.z],
        }));
        const frame = motion.map(({ position, quaternion }): Frame => ({ position, quaternion }));
        const before = frames.at(-restingFrames);
        frames.push(frame);
        motions.push(motion);

        if (before === undefined || !frame.every((die, index) => moved(before[index], die) < restingMove)) {
            leaningSince = undefined;
            continue;
        }

        if (frame.every((die, index) => onTheFloor(shapes[index], normals[index] ?? [], die))) {
            return { frames, motions, knocks };
        }

        leaningSince ??= now();

        if (now() - leaningSince >= leaningFrames) {
            return { frames, motions, knocks, leaningSince };
        }
    }

    return { frames, motions, knocks, leaningSince: leaningSince ?? now() };
}

/**
 * Pushes a slow die that does not lie on the floor away from the dice and walls it rests on, along the floor, as a real die slides off them: the physics
 * alone holds it leaning or on top.
 */
function slideOff(die: Body, world: World, shape: Shape | undefined, normals: Vector[], floor: Body | undefined): void
{
    const frame: Frame = { position: [die.position.x, die.position.y, die.position.z], quaternion: [die.quaternion.x, die.quaternion.y, die.quaternion.z, die.quaternion.w] };

    if (die.velocity.length() > slideSpeed || die.angularVelocity.length() > slideTurn || onTheFloor(shape, normals, frame)) {
        return;
    }

    const away = new Vec3(0, 0, 0);

    for (const contact of world.contacts) {
        const other = contact.bi === die ? contact.bj : contact.bj === die ? contact.bi : undefined;

        if (other === undefined || other === floor) {
            continue;
        }

        // The normal points out of the first body.
        const push = contact.bi === die ? contact.ni.scale(-1) : contact.ni.clone();
        const sideways = new Vec3(push.x, 0, push.z);
        away.vadd(sideways.length() > 0.2 ? sideways.unit() : new Vec3(die.position.x - other.position.x, 0, die.position.z - other.position.z).unit(), away);
    }

    if (away.length() < 1e-3) {
        return;
    }

    die.force.vadd(away.unit().scale(sliding), die.force);
}

/** Whether a die lies on the floor with a whole face: not on an edge, leaning, nor on another die. */
function onTheFloor(shape: Shape | undefined, normals: Vector[], frame: Frame): boolean
{
    const lowest = Math.min(...(shape?.vertices ?? []).map((corner) => rotate(frame.quaternion, corner)[1] + frame.position[1]));
    return lowest < floorContact && normals.some((normal) => -rotate(frame.quaternion, normal)[1] > Math.cos(flatAngle) * Math.hypot(...normal));
}

/** The outward directions of a shape's faces, by Newell's sum, right for a face whose corners are not quite in a plane. */
function faceNormals(shape: Shape): Vector[]
{
    return shape.faces.map((face) =>
        face.reduce<Vector>((sum, corner, index) => {
            const here = shape.vertices[corner] ?? [0, 0, 0];
            const next = shape.vertices[face[(index + 1) % face.length] ?? 0] ?? [0, 0, 0];
            return [sum[0] + (here[1] - next[1]) * (here[2] + next[2]), sum[1] + (here[2] - next[2]) * (here[0] + next[0]), sum[2] + (here[0] - next[0]) * (here[1] + next[1])];
        }, [0, 0, 0])
    );
}

/** How far a die went between two frames, in its place and in its turn. */
function moved(before: Frame, after: Frame): number
{
    const place = Math.hypot(after.position[0] - before.position[0], after.position[1] - before.position[1], after.position[2] - before.position[2]);
    const turn = Math.hypot(...after.quaternion.map((part, index) => part - before.quaternion[index]));
    return Math.max(place, turn);
}

function polyhedron(shape: Shape): ConvexPolyhedron
{
    return new ConvexPolyhedron({ vertices: shape.vertices.map(([x, y, z]) => new Vec3(x, y, z)), faces: shape.faces });
}
