// The frost of an ice die (D-418): a picture made on the spot, rough noise of many sizes with a few bright grains, that bumps its surface and roughens its
// shine, so that the light breaks on it as on ice.
import * as THREE from "three";

const size = 256;
// The noise's cells across the picture, coarse to fine, and how much each counts.
const octaves: [number, number][] = [[4, 0.35], [8, 0.25], [16, 0.18], [32, 0.12], [64, 0.1]];
// How many grains of frost, brighter, are scattered over it.
const grains = 900;

let made: THREE.CanvasTexture | undefined;

/** The picture of frost, made once: grey, lighter where the surface stands up and is rougher. */
export function frostPicture(): THREE.CanvasTexture
{
    if (made !== undefined) {
        return made;
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    if (context !== null) {
        const image = context.createImageData(size, size);
        const layers = octaves.map(([cells, weight]) => ({ cells, weight, values: Array.from({ length: cells * cells }, () => Math.random()) }));

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const value = layers.reduce((sum, layer) => sum + layer.weight * noiseAt(layer.values, layer.cells, (x / size) * layer.cells, (y / size) * layer.cells), 0);
                const at = (y * size + x) * 4;
                image.data.set([value * 255, value * 255, value * 255, 255], at);
            }
        }

        context.putImageData(image, 0, 0);
        context.fillStyle = "rgba(255, 255, 255, 0.8)";

        for (let grain = 0; grain < grains; grain++) {
            context.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random(), 1 + Math.random());
        }
    }

    made = new THREE.CanvasTexture(canvas);
    made.wrapS = THREE.RepeatWrapping;
    made.wrapT = THREE.RepeatWrapping;
    return made;
}

/** Smooth noise at a point of a grid of random values that wraps around, so that the picture tiles. */
function noiseAt(values: number[], cells: number, x: number, y: number): number
{
    const [left, top] = [Math.floor(x), Math.floor(y)];
    const [across, down] = [ease(x - left), ease(y - top)];
    const value = (column: number, row: number): number => values[((row % cells) * cells) + (column % cells)] ?? 0;
    const upper = value(left, top) + (value(left + 1, top) - value(left, top)) * across;
    const lower = value(left, top + 1) + (value(left + 1, top + 1) - value(left, top + 1)) * across;
    return upper + (lower - upper) * down;
}

function ease(share: number): number
{
    return share * share * (3 - 2 * share);
}
