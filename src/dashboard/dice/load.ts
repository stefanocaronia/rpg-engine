// The dice's models (D-278): their shapes and values from dice.json, loaded once, at the first throw; their meshes from dice.glb, or dice-sharp.glb for sharp
// edges (D-354), all made by make-dice.py, each loaded the first time it is shown.
// Each mesh gets the coordinates a grain's picture is laid by, as wood or stone (D-352), which make-dice.py does not make.
import { BufferAttribute, type BufferGeometry, Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { DieModel } from "./models.ts";

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
        const loaded = meshes.get(file) ?? loadMeshes(file);
        meshes.set(file, loaded);
        return loaded;
    };

    await looks(edges);
    return { models: new Map(Object.entries(data)), looks };
}

async function loadMeshes(file: string): Promise<Map<string, Object3D>>
{
    const scene = (await new GLTFLoader().loadAsync(`/assets/dice/${file}`)).scene;
    scene.traverse((part) => {
        if (part instanceof Mesh) {
            part.geometry = withGrainCoordinates(part.geometry as BufferGeometry);
        }
    });
    return new Map(scene.children.map((child) => [child.name, child]));
}

// How much of a grain's picture a unit of the die covers: a die, some two units across, shows most of it.
const grainScale = 0.4;

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
