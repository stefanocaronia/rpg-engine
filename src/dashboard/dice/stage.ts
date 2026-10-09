// Where the dice are shown (D-278): a three.js scene over the page, with a light, the dice's shadows on an invisible floor, and the dice with their numbers drawn
// on their faces, in the theme's colours (D-279). The prototype draws its d20 in code; the dice of the step come from Blender.
import * as THREE from "three";
import type { Shape } from "./shapes.ts";
import type { Frame, Tray } from "./throw.ts";

// The faces' cells in the picture of the numbers: columns and rows.
const columns = 5;
const rows = 4;
const cell = 256;

// Where a triangular face sits in its cell, and where its number goes, as fractions of the cell from its bottom left.
const corners: [number, number][] = [[0.5, 0.95], [0.04, 0.16], [0.96, 0.16]];
const numberAt: [number, number] = [0.5, 0.42];

// How much of a die that does not count still shows, as the lower of two d20 with advantage.
const dimmed = 0.35;

/** A die to put on the stage: its shape, and the number on each face. */
export interface PlacedDie
{
    shape: Shape;
    numbers: number[];
}

/** The dice on the page: put them, show them lying as in a frame of their throw, dim one that does not count; a tray the size of the window. */
export interface Stage
{
    tray: Tray;
    place(dice: PlacedDie[]): void;
    show(frame: Frame[]): void;
    dim(die: number): void;
    hide(): void;
    resize(): void;
}

/** Makes the stage on a canvas; throws when the browser has no WebGL. */
export function makeStage(canvas: HTMLCanvasElement): Stage
{
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    // From high above, a little tilted, with a narrow view: the face that lands up is the one the player reads, even at the window's edges.
    const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 200);
    camera.position.set(0, 45, 9);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-6, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
    scene.add(sun);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const geometries = new Map<Shape, THREE.BufferGeometry>();
    let meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
    const tray: Tray = { width: 7, depth: 4.5 };

    const resize = (): void => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        // The tray fills what the camera sees on the floor.
        const seen = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length();
        tray.depth = Math.max(3, seen / 2 - 1.2);
        tray.width = Math.max(3, tray.depth * camera.aspect);
    };

    const clear = (): void => {
        meshes.forEach((mesh) => {
            scene.remove(mesh);
            mesh.material.map?.dispose();
            mesh.material.dispose();
        });
        meshes = [];
    };

    resize();
    return {
        tray,
        place(dice)
        {
            clear();
            const colours = diceColours();
            meshes = dice.map((die) => {
                let geometry = geometries.get(die.shape);

                if (geometry === undefined) {
                    geometry = faceGeometry(die.shape);
                    geometries.set(die.shape, geometry);
                }

                const texture = new THREE.CanvasTexture(numbersPicture(die.numbers, colours));
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = 4;
                const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.35, metalness: 0.05, flatShading: true }));
                mesh.castShadow = true;
                mesh.visible = false;
                scene.add(mesh);
                return mesh;
            });
        },
        show(frame)
        {
            meshes.forEach((mesh, index) => {
                const where = frame[index];

                if (where !== undefined) {
                    mesh.position.set(...where.position);
                    mesh.quaternion.set(...where.quaternion);
                    mesh.visible = true;
                }
            });
            renderer.render(scene, camera);
        },
        dim(die)
        {
            const material = meshes[die]?.material;

            if (material !== undefined) {
                material.transparent = true;
                material.opacity = dimmed;
                material.needsUpdate = true;
                renderer.render(scene, camera);
            }
        },
        hide()
        {
            clear();
            renderer.render(scene, camera);
        },
        resize,
    };
}

/** The dice's colours by the theme (D-279): yellow with navy numbers on the dark page, navy with yellow numbers on the light one. */
function diceColours(): { die: string; numbers: string; }
{
    return matchMedia("(prefers-color-scheme: dark)").matches ? { die: "#f4c84c", numbers: "#192d4d" } : { die: "#192d4d", numbers: "#f4c84c" };
}

/** A die's faces as triangles, each with the place of its cell in the picture of the numbers, by its index. */
function faceGeometry(shape: Shape): THREE.BufferGeometry
{
    const positions: number[] = [];
    const places: number[] = [];

    shape.faces.forEach((face, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        face.forEach((corner, at) => {
            positions.push(...shape.vertices[corner]);
            places.push((column + corners[at][0]) / columns, 1 - (row + 1 - corners[at][1]) / rows);
        });
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(places, 2));
    geometry.computeVertexNormals();
    return geometry;
}

/** The picture of a die's numbers, a cell for each face: the die's colour, the number in the middle, a line under 6 and 9 so that they read the right way up. */
function numbersPicture(numbers: number[], colours: { die: string; numbers: string; }): HTMLCanvasElement
{
    const picture = document.createElement("canvas");
    picture.width = columns * cell;
    picture.height = rows * cell;
    const context = picture.getContext("2d");

    if (context === null) {
        return picture;
    }

    context.fillStyle = colours.die;
    context.fillRect(0, 0, picture.width, picture.height);
    context.fillStyle = colours.numbers;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `700 ${cell * 0.3}px "Palatino Linotype", Palatino, Georgia, serif`;

    numbers.forEach((number, index) => {
        const x = (index % columns + numberAt[0]) * cell;
        const y = (Math.floor(index / columns) + 1 - numberAt[1]) * cell;
        context.fillText(String(number), x, y);

        if (number === 6 || number === 9) {
            context.fillRect(x - cell * 0.07, y + cell * 0.13, cell * 0.14, cell * 0.022);
        }
    });

    return picture;
}
