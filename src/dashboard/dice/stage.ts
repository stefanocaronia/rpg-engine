// Where a die is shown (D-278): a three.js scene over the page, with a light, the die's shadow on an invisible floor, and the die with its numbers drawn on its
// faces. The prototype draws its d20 in code; the dice of the step come from Blender.
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

/** A die on the page: show it lying in a frame, with these numbers on its faces; a tray the size of the window. */
export interface Stage
{
    tray: Tray;
    show(frame: Frame, numbers: number[]): void;
    hide(): void;
    resize(): void;
}

/** Makes the stage on a canvas, for a die of this shape and these colours; throws when the browser has no WebGL. */
export function makeStage(canvas: HTMLCanvasElement, shape: Shape, colours: { die: string; numbers: string; }): Stage
{
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 20, 9);
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

    const picture = document.createElement("canvas");
    picture.width = columns * cell;
    picture.height = rows * cell;
    const texture = new THREE.CanvasTexture(picture);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const geometry = faceGeometry(shape);
    const die = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.35, metalness: 0.05, flatShading: true }));
    die.castShadow = true;
    die.visible = false;
    scene.add(die);

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

    resize();
    return {
        tray,
        show(frame, numbers)
        {
            drawNumbers(picture, numbers, colours);
            texture.needsUpdate = true;
            die.position.set(...frame.position);
            die.quaternion.set(...frame.quaternion);
            die.visible = true;
            renderer.render(scene, camera);
        },
        hide()
        {
            die.visible = false;
            renderer.render(scene, camera);
        },
        resize,
    };
}

/** The die's faces as triangles, each with the place of its cell in the picture of the numbers, by its index. */
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

/** Draws each face's number in its cell: the die's colour, the number in the middle, a line under 6 and 9 so that they read the right way up. */
function drawNumbers(picture: HTMLCanvasElement, numbers: number[], colours: { die: string; numbers: string; }): void
{
    const context = picture.getContext("2d");

    if (context === null) {
        return;
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
}
