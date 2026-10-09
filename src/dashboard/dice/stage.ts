// Where the dice are shown (D-278): a three.js scene over the page, with a light, the dice's shadows on an invisible floor, and the dice of make-dice.py in the
// theme's colours (D-279): yellow with navy numbers on the dark page, navy with yellow numbers on the light one.
import * as THREE from "three";
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

/** The dice on the page: put them, show them in their poses, dim one that does not count, ring one that shows a rare face; a tray the size of the window. */
export interface Stage
{
    tray: Tray;
    place(kinds: string[]): void;
    show(poses: (Pose | undefined)[]): void;
    dim(die: number): void;
    ring(die: number, rare: RareFace, instant: boolean): void;
    hide(): void;
    resize(): void;
}

// How long a ring takes to grow around a die, in milliseconds.
const ringGrowth = 300;

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
    let rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
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
        rings.forEach((ring) => {
            scene.remove(ring);
            ring.geometry.dispose();
            ring.material.dispose();
        });
        dice = [];
        rings = [];
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
        ring(die, rare, instant)
        {
            const object = dice[die]?.object;

            if (object === undefined) {
                return;
            }

            // A ring on the floor around the die, gold for the highest face, red for the lowest, growing into place.
            const colours = diceColours();
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(1.45, 1.75, 64),
                new THREE.MeshBasicMaterial({ color: rare === "highest" ? colours.highest : colours.lowest, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(object.position.x, 0.02, object.position.z);
            scene.add(ring);
            rings.push(ring);
            const started = performance.now();

            const grow = (now: number): void => {
                const share = instant ? 1 : Math.min(1, Math.max(0, (now - started) / ringGrowth));
                ring.scale.setScalar(0.6 + 0.4 * (1 - (1 - share) ** 3));
                renderer.render(scene, camera);

                if (share < 1 && rings.includes(ring)) {
                    requestAnimationFrame(grow);
                }
            };

            requestAnimationFrame(grow);
        },
        hide()
        {
            clear();
            renderer.render(scene, camera);
        },
        resize,
    };
}

/** The dice's colours by the theme (D-279), the colour of the page's panels beneath them, and the rings of the rare faces. */
function diceColours(): { body: string; ink: string; page: string; highest: string; lowest: string; }
{
    return matchMedia("(prefers-color-scheme: dark)").matches
        ? { body: "#f4c84c", ink: "#192d4d", page: "#162037", highest: "#f4c84c", lowest: "#ff8a73" }
        : { body: "#192d4d", ink: "#f4c84c", page: "#fffdf8", highest: "#dcaa32", lowest: "#a33a2b" };
}
