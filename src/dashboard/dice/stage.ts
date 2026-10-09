// Where the dice are shown (D-278): a three.js scene over the page, with a light, the dice's shadows on an invisible floor, and the dice of make-dice.py in the
// theme's colours (D-279): yellow with navy numbers on the dark page, navy with yellow numbers on the light one.
import * as THREE from "three";
import { celebrate, type Effect, type Glow, makePictures, type Pictures, type Showing } from "./celebration.ts";
import type { RareFace, Turn, Vector } from "./models.ts";
import type { Tray } from "./throw.ts";

// How far a die that does not count fades toward the page, as the lower of two d20 with advantage: set aside, not made of glass.
const dimmed = 0.6;

/** Where a die is shown, and how it is turned. */
export interface Pose
{
    position: Vector;
    quaternion: Turn;
}

/** The dice on the page: put them, show them in their poses, dim one that does not count, celebrate one that shows a rare face; a tray the size of the window. */
export interface Stage
{
    tray: Tray;
    place(kinds: string[]): void;
    show(poses: (Pose | undefined)[]): void;
    dim(die: number): void;
    celebrate(die: number, rare: RareFace, showing: Showing): void;
    hide(): void;
    resize(): void;
}

/** Makes the stage on a canvas, for dice that look as given by their kinds; throws when the browser has no WebGL. */
export function makeStage(canvas: HTMLCanvasElement, looks: Map<string, THREE.Object3D>): Stage
{
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // From high above, a little tilted, with a narrow view: the face that lands up is the one the player reads, even at the window's edges.
    const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 200);
    camera.position.set(0, 45, 9);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();
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

    let dice: { object: THREE.Object3D; materials: THREE.MeshStandardMaterial[]; }[] = [];
    // The celebrations shown, drawn frame by frame while one of them moves.
    let effects: Effect[] = [];
    let pictures: Pictures | undefined;
    let moving = false;

    const draw = (now: number): void => {
        moving = effects.map((effect) => effect.update(now)).some((still) => still);
        renderer.render(scene, camera);

        if (moving) {
            requestAnimationFrame(draw);
        }
    };

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
        dice.forEach((die) => {
            scene.remove(die.object);
            die.materials.forEach((material) => material.dispose());
        });
        effects.forEach((effect) => effect.dispose());
        Object.values(pictures ?? {}).forEach((texture: THREE.Texture) => texture.dispose());
        pictures = undefined;
        dice = [];
        effects = [];
    };

    resize();
    return {
        tray,
        place(kinds)
        {
            clear();
            const colours = diceColours();
            dice = kinds.map((kind) => {
                const object = (looks.get(kind) ?? new THREE.Group()).clone();
                const materials: THREE.MeshStandardMaterial[] = [];
                object.traverse((part) => {
                    if (part instanceof THREE.Mesh) {
                        const ink = (part.material as THREE.Material).name === "ink";
                        const material = new THREE.MeshStandardMaterial({ color: ink ? colours.ink : colours.body, roughness: ink ? 0.6 : 0.35, metalness: 0.05 });
                        part.material = material;
                        part.castShadow = true;
                        materials.push(material);
                    }
                });
                object.visible = false;
                scene.add(object);
                return { object, materials };
            });
        },
        show(poses)
        {
            dice.forEach((die, index) => {
                const pose = poses[index];

                if (pose !== undefined) {
                    die.object.position.set(...pose.position);
                    die.object.quaternion.set(...pose.quaternion);
                    die.object.visible = true;
                }
            });
            renderer.render(scene, camera);
        },
        dim(die)
        {
            const page = new THREE.Color(diceColours().page);
            dice[die]?.materials.forEach((material) => material.color.lerp(page, dimmed));
            dice[die]?.object.traverse((part) => {
                part.castShadow = false;
            });
            renderer.render(scene, camera);
        },
        celebrate(die, rare, showing)
        {
            const object = dice[die]?.object;

            if (object !== undefined) {
                pictures ??= makePictures();
                effects.push(celebrate(scene, object.position.clone(), rare, diceColours().glow, pictures, showing));

                if (!moving) {
                    moving = true;
                    requestAnimationFrame(draw);
                }
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

/** The dice's colours by the theme (D-279, D-282), the colour of the page's panels beneath them, and the glow of the rare faces. */
function diceColours(): { body: string; ink: string; page: string; glow: Glow; }
{
    return matchMedia("(prefers-color-scheme: dark)").matches
        ? {
            body: "#f5c63e",
            ink: "#182c4c",
            page: "#131f38",
            glow: { lights: true, highest: { halo: "#f5c63e", resting: 0.6, sparks: ["#f5c63e", "#ffefcf"] }, lowest: { halo: "#ff9381", smoke: ["#ff9381", "#7f848f"] } },
        }
        : {
            body: "#182c4c",
            ink: "#f5c63e",
            page: "#fef9f2",
            glow: { lights: false, highest: { halo: "#d1a61b", resting: 0.85, sparks: ["#c29803", "#254b83"] }, lowest: { halo: "#a73929", smoke: ["#a73929", "#8c919c"] } },
        };
}
