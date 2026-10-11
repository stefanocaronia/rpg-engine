// Where the dice are shown (D-278): a three.js scene over the page, with a light, the dice's shadows on an invisible floor, and the dice of make-dice.py in the
// set chosen in Settings, by default the theme's (D-279, D-348, D-352): resin, metal mirroring a room made on the spot, wood or stone with its grain.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { shownTheme } from "../theme.ts";
import { burnAway, crack } from "./burn.ts";
import { celebrate, type Effect, type Glow, lightInk, makePictures, type Pictures, type Showing } from "./celebration.ts";
import type { RareFace, Turn, Vector } from "./models.ts";
import { diceLook, type Finish, texturePath } from "./sets.ts";
import type { Tray } from "./throw.ts";

// A die that does not count, as the lower of two d20 with advantage, turns grey as its chip in the plate, whatever its set: its body mostly, its ink half way;
// set aside, not made of glass (D-348).
const dimmedBody = 0.8;
// How much of the window's foot the plate of the result covers, in pixels: from the window's edge to the plate's top, on a wide screen and on a phone,
// where it comes out of the bar of the sections.
const plateOnWide = 150;
const plateOnPhone = 220;
const dimmedInk = 0.5;

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
    /** Puts dice of these kinds, by the meshes given for each kind. */
    place(kinds: string[], looks: Map<string, THREE.Object3D>): void;
    show(poses: (Pose | undefined)[]): void;
    /** Sets a die that does not count aside: grey a moment, then burnt away, or faded at once when shown instant (D-358). */
    dim(die: number, instant: boolean): void;
    celebrate(die: number, rare: RareFace, showing: Showing): void;
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
    // The room the metals and the polished stones mirror, and the grains' pictures, each made or loaded once, the chosen set's at once.
    let room: THREE.Texture | undefined;
    const grains = new Map<string, THREE.Texture>();

    const grain = (name: string): THREE.Texture => {
        const known = grains.get(name);

        if (known !== undefined) {
            return known;
        }

        const loaded = new THREE.TextureLoader().load(texturePath(name));
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.wrapS = THREE.RepeatWrapping;
        loaded.wrapT = THREE.RepeatWrapping;
        grains.set(name, loaded);
        return loaded;
    };

    const chosenTexture = diceLook().finish.texture;

    if (chosenTexture !== undefined) {
        grain(chosenTexture);
    }

    // A body of the set's material; the grain laid from a different place on each die, once its picture is there, so that no two dice look alike.
    const bodyOf = (finish: Finish, colour: string): THREE.MeshStandardMaterial => {
        const material = new THREE.MeshStandardMaterial({ name: "body", color: colour, roughness: finish.roughness, metalness: finish.metalness });

        if (finish.shine > 0) {
            room ??= new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
            material.envMap = room;
            material.envMapIntensity = finish.shine;
        }

        const picture = finish.texture === undefined ? undefined : grain(finish.texture);

        if (picture !== undefined) {
            const laid = picture.image === null || picture.image === undefined ? picture : picture.clone();
            laid.offset.set(Math.random(), Math.random());
            laid.needsUpdate = laid !== picture;
            material.map = laid;
        }

        return material;
    };

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
    // The dice lie on a table that moves up the window as the tray ends above the plate.
    const table = new THREE.Group();
    scene.add(table);

    const resize = (): void => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        // The tray fills what the camera sees on the floor, but for the window's foot the plate covers: no die lies under it (D-366).
        const seen = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length();
        const back = Math.max(3, seen / 2 - 1.2);
        const covered = (matchMedia("(max-width: 600px)").matches ? plateOnPhone : plateOnWide) / height * seen;
        const front = Math.max(6 - back, back - covered);
        tray.depth = (front + back) / 2;
        tray.width = Math.max(3, back * camera.aspect);
        table.position.z = (front - back) / 2;
    };

    const clear = (): void => {
        dice.forEach((die) => {
            table.remove(die.object);
            die.materials.forEach((material) => {
                // A grain's picture laid for this die alone goes with it.
                if (material.map !== null && ![...grains.values()].includes(material.map)) {
                    material.map.dispose();
                }

                material.dispose();
            });
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
        place(kinds, looks)
        {
            clear();
            const look = diceLook();
            dice = kinds.map((kind) => {
                const object = (looks.get(kind) ?? new THREE.Group()).clone();
                const materials: THREE.MeshStandardMaterial[] = [];
                object.traverse((part) => {
                    if (part instanceof THREE.Mesh) {
                        const ink = (part.material as THREE.Material).name === "ink";
                        const material = ink ? new THREE.MeshStandardMaterial({ name: "ink", color: look.ink, roughness: 0.6, metalness: 0.05 }) : bodyOf(look.finish, look.body);
                        part.material = material;
                        part.castShadow = true;
                        materials.push(material);
                    }
                });
                object.visible = false;
                table.add(object);
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
        dim(die, instant)
        {
            const grey = new THREE.Color(themeColours().dropped);
            const turning = (dice[die]?.materials ?? []).map((material) => ({
                material,
                from: material.color.clone(),
                to: material.color.clone().lerp(grey, material.name === "ink" ? dimmedInk : dimmedBody),
                shine: material.envMapIntensity,
            }));

            // Grey in a blink, not at a stroke (D-358): a metal set aside mirrors little, grey and not silver; a wood or a stone loses its grain, which its colour
            // only tinted, once grey.
            const greying = (amount: number): void => {
                turning.forEach(({ material, from, to, shine }) => {
                    material.color.lerpColors(from, to, amount);
                    material.envMapIntensity = shine * (1 - 0.7 * amount);

                    if (amount === 1 && material.map !== null) {
                        if (![...grains.values()].includes(material.map)) {
                            material.map.dispose();
                        }

                        material.map = null;
                        material.needsUpdate = true;
                    }
                });
            };

            const dropped = dice[die];

            if (dropped !== undefined) {
                effects.push(burnAway(dropped.object, dropped.materials, instant, greying));

                if (!moving) {
                    moving = true;
                    requestAnimationFrame(draw);
                }
            }

            renderer.render(scene, camera);
        },
        celebrate(die, rare, showing)
        {
            const shown = dice[die];

            if (shown !== undefined) {
                pictures ??= makePictures();
                const glow = themeColours().glow;
                effects.push(celebrate(scene, shown.object.getWorldPosition(new THREE.Vector3()), rare, glow, pictures, showing));
                // The highest face's numbers lit gold; the lowest's die cracked, embers in its cracks (D-363).
                effects.push(
                    rare === "highest"
                        ? lightInk(shown.materials.filter((material) => material.name === "ink"), glow.highest.sparks[0], showing.instant)
                        : crack(shown.materials, showing.instant),
                );

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

/** By the theme (D-279, D-282): the grey of a die that does not count, and the glow of the rare faces. */
function themeColours(): { dropped: string; glow: Glow; }
{
    return shownTheme() === "dark"
        ? {
            dropped: "#59606f",
            glow: { lights: true, highest: { halo: "#f5c63e", resting: 0.6, sparks: ["#f5c63e", "#ffefcf"] }, lowest: { halo: "#ff9381", smoke: ["#ff9381", "#7f848f"] } },
        }
        : {
            dropped: "#b4b8c0",
            glow: { lights: false, highest: { halo: "#d1a61b", resting: 0.85, sparks: ["#c29803", "#254b83"] }, lowest: { halo: "#a73929", smoke: ["#a73929", "#8c919c"] } },
        };
}
