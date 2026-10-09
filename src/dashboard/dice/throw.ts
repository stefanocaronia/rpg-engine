// A throw of dice (D-278): simulated with cannon-es before it is shown, and recorded frame by frame, with the knocks of the dice, for their sound. The same
// frames, shown, are the physics: the dice land where they landed.
import { Body, ContactMaterial, ConvexPolyhedron, GSSolver, Material, Plane, Vec3, World } from "cannon-es";
import type { Shape, Turn, Vector } from "./models.ts";

/** Where a die is, and how it is turned, in one frame. */
export interface Frame
{
    position: Vector;
    quaternion: Turn;
}

/** A throw: its frames, sixty to a second, each with where every die is; and its knocks, by frame, each as hard as the die hit. */
export interface Throw
{
    frames: Frame[][];
    knocks: { frame: number; strength: number; }[];
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

const step = 1 / 60;
// A throw stops by itself well before this; past it, the dice are taken as they lie.
const longest = 8 / step;
// A knock softer than this makes no sound, as a die settling.
const softest = 1.5;
// Dice that move less than this in a frame, for this many frames, are at rest: some, as a d12 on a face, tremble forever for the physics.
const restingMove = 1e-3;
const restingFrames = 12;

/** Throws dice of these shapes into the tray together, from its left side, spinning, with the randomness given, until they all stop; past lying dice, if any. */
export function throwDice(shapes: Shape[], tray: Tray, random: () => number = Math.random, lying: Lying[] = []): Throw
{
    // More passes of the solver than its ten: with fewer, a d12 on a face trembles and never stops.
    const solver = new GSSolver();
    solver.iterations = 30;
    const world = new World({ gravity: new Vec3(0, -60, 0), allowSleep: true, solver });
    const dieMaterial = new Material("die");
    const floorMaterial = new Material("floor");
    world.addContactMaterial(new ContactMaterial(dieMaterial, floorMaterial, { friction: 0.3, restitution: 0.45 }));
    world.addContactMaterial(new ContactMaterial(dieMaterial, dieMaterial, { friction: 0.2, restitution: 0.35 }));

    // The floor faces up; the four walls face the centre.
    const walls: [Vec3, Vec3, number][] = [
        [new Vec3(0, 0, 0), new Vec3(1, 0, 0), -Math.PI / 2],
        [new Vec3(-tray.width, 0, 0), new Vec3(0, 1, 0), Math.PI / 2],
        [new Vec3(tray.width, 0, 0), new Vec3(0, 1, 0), -Math.PI / 2],
        [new Vec3(0, 0, -tray.depth), new Vec3(0, 1, 0), 0],
        [new Vec3(0, 0, tray.depth), new Vec3(0, 1, 0), Math.PI],
    ];

    for (const [position, axis, angle] of walls) {
        const wall = new Body({ mass: 0, material: floorMaterial, shape: new Plane() });
        wall.position.copy(position);
        wall.quaternion.setFromAxisAngle(axis, angle);
        world.addBody(wall);
    }

    for (const die of lying) {
        const body = new Body({ mass: 0, material: dieMaterial, shape: polyhedron(die.shape) });
        body.position.set(...die.frame.position);
        body.quaternion.set(...die.frame.quaternion);
        world.addBody(body);
    }

    const frames: Frame[][] = [];
    const knocks: Throw["knocks"] = [];

    // The dice leave the hand one beside the other, across the tray's depth.
    const dice = shapes.map((shape, index) => {
        const die = new Body({
            mass: 1,
            material: dieMaterial,
            shape: polyhedron(shape),
            allowSleep: true,
            sleepSpeedLimit: 0.2,
            sleepTimeLimit: 0.2,
            linearDamping: 0.1,
            angularDamping: 0.1,
        });
        const spin = (): number => (random() - 0.5) * 40;
        const across = shapes.length === 1 ? (random() - 0.5) * tray.depth : ((index + 0.5) / shapes.length - 0.5) * tray.depth * 0.8;
        die.position.set(-tray.width * 0.75 - random(), 2.5 + random() + index * 0.3, across);
        die.quaternion.setFromEuler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);
        die.velocity.set(14 + random() * 8, 2 + random() * 4, (random() - 0.5) * 10);
        die.angularVelocity.set(spin(), spin(), spin());
        die.addEventListener("collide", (event: { contact: { getImpactVelocityAlongNormal(): number; }; }) => {
            const strength = Math.abs(event.contact.getImpactVelocityAlongNormal());

            if (strength > softest) {
                knocks.push({ frame: frames.length, strength });
            }
        });
        world.addBody(die);
        return die;
    });

    let resting = 0;

    while (frames.length < longest && resting < restingFrames && dice.some((die) => die.sleepState !== Body.SLEEPING)) {
        world.step(step);
        const frame = dice.map((die): Frame => ({ position: [die.position.x, die.position.y, die.position.z], quaternion: [die.quaternion.x, die.quaternion.y, die.quaternion.z, die.quaternion.w] }));
        const before = frames.at(-1);
        resting = before !== undefined && frame.every((die, index) => moved(before[index], die) < restingMove) ? resting + 1 : 0;
        frames.push(frame);
    }

    return { frames, knocks };
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
