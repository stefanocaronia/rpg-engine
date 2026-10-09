// A die's throw (D-278): simulated with cannon-es before it is shown, and recorded frame by frame; the face it lands on is read, so that the page can put on that
// face the number decided before the throw. The same frames, shown, are the physics: the die lands where it landed.
import { Body, ContactMaterial, ConvexPolyhedron, Material, Plane, Quaternion, Vec3, World } from "cannon-es";
import { faceNormals, type Shape } from "./shapes.ts";

/** Where the die is, and how it is turned, in one frame. */
export interface Frame
{
    position: [number, number, number];
    quaternion: [number, number, number, number];
}

/** A throw: its frames, sixty to a second, and the face the die lands on, by its index in the shape. */
export interface Throw
{
    frames: Frame[];
    face: number;
}

/** The floor the die rolls on, between walls this far from the centre, sideways and in depth. */
export interface Tray
{
    width: number;
    depth: number;
}

const step = 1 / 60;
// A throw stops by itself well before this; past it, the die is taken as it lies.
const longest = 8 / step;

/** Throws a die of this shape into the tray, from its left side, spinning, with the randomness given, until it stops. */
export function throwDie(shape: Shape, tray: Tray, random: () => number = Math.random): Throw
{
    const world = new World({ gravity: new Vec3(0, -60, 0), allowSleep: true });
    const dieMaterial = new Material("die");
    const floorMaterial = new Material("floor");
    world.addContactMaterial(new ContactMaterial(dieMaterial, floorMaterial, { friction: 0.3, restitution: 0.45 }));

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

    const die = new Body({
        mass: 1,
        material: dieMaterial,
        shape: new ConvexPolyhedron({ vertices: shape.vertices.map(([x, y, z]) => new Vec3(x, y, z)), faces: shape.faces }),
        allowSleep: true,
        sleepSpeedLimit: 0.2,
        sleepTimeLimit: 0.2,
        linearDamping: 0.1,
        angularDamping: 0.1,
    });
    const spin = (): number => (random() - 0.5) * 40;
    die.position.set(-tray.width * 0.75, 2.5 + random(), (random() - 0.5) * tray.depth);
    die.quaternion.setFromEuler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2);
    die.velocity.set(14 + random() * 8, 2 + random() * 4, (random() - 0.5) * 10);
    die.angularVelocity.set(spin(), spin(), spin());
    world.addBody(die);

    const frames: Frame[] = [];

    while (frames.length < longest && die.sleepState !== Body.SLEEPING) {
        world.step(step);
        frames.push({ position: [die.position.x, die.position.y, die.position.z], quaternion: [die.quaternion.x, die.quaternion.y, die.quaternion.z, die.quaternion.w] });
    }

    return { frames, face: upFace(shape, die.quaternion) };
}

/** The face that looks up when the die is turned so: the one whose normal points highest. */
export function upFace(shape: Shape, turn: Quaternion | Frame["quaternion"]): number
{
    const quaternion = Array.isArray(turn) ? new Quaternion(...turn) : turn;
    const heights = faceNormals(shape).map(([x, y, z]) => quaternion.vmult(new Vec3(x, y, z)).y);
    return heights.indexOf(Math.max(...heights));
}
