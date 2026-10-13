// The dice's models (D-278): their shapes and values from dice.json, loaded once, at the first throw; their meshes from dice.glb, or dice-sharp.glb for sharp
// edges (D-354), all made by make-dice.py, each loaded the first time it is shown.
// Each mesh gets the coordinates a grain's picture is laid by, as wood or stone (D-352), which make-dice.py does not make.
import { BufferAttribute, type BufferGeometry, type Material, Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { type DieModel, faceNormals, type Shape } from "./models.ts";

/** Each die by its kind, as d20: its shape and values, and how it looks, with its body and its ink, by its edges. */
export interface LoadedDice
{
    models: Map<string, DieModel>;
    looks(edges: string): Promise<Map<string, Object3D>>;
}

/** Loads the dice's shapes and values, and the meshes of the edges given at once, the others when first asked. */
export async function loadDice(edges: string): Promise<LoadedDice>
{
    const data = await fetch("/assets/dice/dice.json").then(async (response) => await response.json() as Record<string, DieModel>);
    const meshes = new Map<string, Promise<Map<string, Object3D>>>();

    const looks = (edges: string): Promise<Map<string, Object3D>> => {
        const file = edges === "sharp" ? "dice-sharp.glb" : "dice.glb";
        const loaded = meshes.get(file) ?? loadMeshes(file, data);
        meshes.set(file, loaded);
        return loaded;
    };

    await looks(edges);
    return { models: new Map(Object.entries(data)), looks };
}

async function loadMeshes(file: string, data: Record<string, DieModel>): Promise<Map<string, Object3D>>
{
    const scene = (await new GLTFLoader().loadAsync(`/assets/dice/${file}`)).scene;

    for (const die of scene.children) {
        const shape = data[die.name]?.shape;
        die.traverse((part) => {
            if (part instanceof Mesh) {
                part.geometry = withGrainCoordinates(part.geometry as BufferGeometry);

                if (shape !== undefined && (part.material as Material).name === "ink") {
                    part.geometry = withDieFaces(part.geometry as BufferGeometry, shape);
                }
            }
        });
    }

    return new Map(scene.children.map((child) => [child.name, child]));
}

// How much of a grain's picture a unit of the die covers: a die, some two units across, shows most of it.
const grainScale = 0.4;

/** The ink with, at each corner, the outward direction of the die's face its number is on: the face that reaches farthest towards it. A clear die shows
 * the numbers of the faces turned away only as engravings, each number whole (D-418). */
function withDieFaces(geometry: BufferGeometry, shape: Shape): BufferGeometry
{
    const normals = faceNormals(shape).map((normal) => normal.map((part) => part / (Math.hypot(...normal) || 1)));
    const position = geometry.getAttribute("position");
    const faces = new Float32Array(position.count * 3);

    for (let corner = 0; corner < position.count; corner++) {
        const point = [position.getX(corner), position.getY(corner), position.getZ(corner)];
        const reach = normals.map((normal) => normal[0] * point[0] + normal[1] * point[1] + normal[2] * point[2]);
        faces.set(normals[reach.indexOf(Math.max(...reach))] ?? [0, 0, 1], corner * 3);
    }

    geometry.setAttribute("dieFace", new BufferAttribute(faces, 3));
    return geometry;
}

/** The geometry with each triangle on its own corners, laid on the picture along the axis it faces most, as a block of wood or stone is cut. */
function withGrainCoordinates(geometry: BufferGeometry): BufferGeometry
{
    const apart = geometry.index === null ? geometry : geometry.toNonIndexed();
    const position = apart.getAttribute("position");
    const coordinates = new Float32Array(position.count * 2);

    for (let corner = 0; corner < position.count; corner += 3) {
        const points = [0, 1, 2].map((offset) => [position.getX(corner + offset), position.getY(corner + offset), position.getZ(corner + offset)]);
        const [a, b, c] = points;
        const normal = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])].map(Math.abs);
        const facing = normal.indexOf(Math.max(...normal));
        const [u, v] = [0, 1, 2].filter((axis) => axis !== facing);
        points.forEach((point, offset) => coordinates.set([point[u] * grainScale, point[v] * grainScale], (corner + offset) * 2));
    }

    apart.setAttribute("uv", new BufferAttribute(coordinates, 2));
    return apart;
}
