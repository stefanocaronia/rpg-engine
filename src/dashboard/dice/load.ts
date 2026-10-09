// The dice's models (D-278): their meshes from dice.glb, their shapes and values from dice.json, both made by make-dice.py; loaded once, at the first throw.
import type { Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { DieModel } from "./models.ts";

/** Each die by its kind, as d20: its shape and values, and how it looks, with its body and its ink. */
export interface LoadedDice
{
    models: Map<string, DieModel>;
    looks: Map<string, Object3D>;
}

export async function loadDice(): Promise<LoadedDice>
{
    const [data, scene] = await Promise.all([
        fetch("/assets/dice/dice.json").then(async (response) => await response.json() as Record<string, DieModel>),
        new GLTFLoader().loadAsync("/assets/dice/dice.glb").then((loaded) => loaded.scene),
    ]);
    return { models: new Map(Object.entries(data)), looks: new Map(scene.children.map((child) => [child.name, child])) };
}
