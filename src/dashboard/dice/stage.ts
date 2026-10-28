// Where the dice are shown (D-278): a three.js scene over the page, with a light, the dice's shadows on an invisible floor, and the dice of make-dice.py in the
// set chosen in Settings, by default the theme's (D-279, D-348, D-352): resin, metal mirroring a room made on the spot, wood or stone with its grain. The coins
// of the same materials, or of the metal chosen (D-526 (1)).
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { shownTheme } from "../theme.ts";
import { burnAway, crack } from "./burn.ts";
import { celebrate, type Effect, embers, type Glow, lightInk, makePictures, type Pictures, type Showing } from "./celebration.ts";
import { floorCrackMaterial } from "./floor-cracks.ts";
import { frostPicture } from "./frost.ts";
import { coinKind, type RareFace, type Turn, type Vector } from "./models.ts";
import { coinOf, type DiceLook, diceLook, type Finish, texturePath } from "./sets.ts";
import type { Tray } from "./throw.ts";

// A die that does not count, as the lower of two d20 with advantage, goes out, whatever its set: its colour gone and darker, its body to a third of its
// light, its ink to some half, still read; never lighter, which on a dark die would look picked (D-348, D-414).
const dimmedBody = 0.35;
// How much of the window's foot the plate of the result covers, in pixels, until the plate of a throw is measured: from the window's edge to the plate's
// top, on a wide screen and on a phone, where it comes out of the bar of the sections.
const plateOnWide = 150;
// The window's height up to which the dice grow with it, in pixels: a laptop's or a desktop's; past it they keep their size.
const commonHeight = 900;
// The least depth of the floor, from wall to wall, when the dice keep under something on the page that leaves them less than a tray: a die's and a little more.
const leastTight = 2.8;
const plateOnPhone = 220;
const dimmedInk = 0.55;
// The fire the highest face's numbers light with, on every set and theme: a gold ink lights brighter, a dark one turns gold.
const branding = "#ffbf45";
// What draws a surface's depth alone, unseen: behind it nothing of the same thing is drawn.
const nearestOnly = new THREE.MeshBasicMaterial({ colorWrite: false });

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
    /** Puts dice of these kinds, by the meshes given for each kind, in the look given, by default the player's set; the coins as the player chose, or as the dice given. */
    place(kinds: string[], looks: Map<string, THREE.Object3D>, look?: DiceLook): void;
    /**
     * Leaves the window's foot, this many pixels tall, to the plate of the throw, and its head to the page's header: no die lies under them (D-366); `tight`,
     * the dice keep under the head even where that leaves them less room than a tray, at least a die's (D-461).
     */
    cover(foot: number, head: number, tight?: boolean): void;
    show(poses: (Pose | undefined)[]): void;
    /** Sets a die that does not count aside: gone out a moment, darker, then burnt away, or faded at once when shown instant (D-358). */
    dim(die: number, instant: boolean): void;
    celebrate(die: number, rare: RareFace, showing: Showing): void;
    hide(): void;
    resize(): void;
}

// Chrome on Windows makes the shaders through Direct3D, whose compiler notes that a sum of 1 and a tiny number is not exact (X4122): three.js says it as a
// warning for every die that mirrors the room, the coin and the metal and stone sets. Those notes alone stay out of the console; three.js says the rest.
THREE.setConsoleFunction((kind, message, ...more: unknown[]) => {
    const noted = kind === "warn" && message === "THREE.WebGLProgram: Program Info Log:"
        && more.every((part) => typeof part === "string" && part.split("\n").every((line) => line.trim() === "" || line.includes("warning X4122")));

    if (!noted) {
        (kind === "error" ? console.error : kind === "warn" ? console.warn : console.log)(message, ...more);
    }
});

/** Makes the stage on a canvas; throws when the browser has no WebGL. */
export function makeStage(canvas: HTMLCanvasElement): Stage
{
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // From high above, a little tilted, with a narrow view: the face that lands up is the one the player reads, even at the window's edges.
    const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 200);
    const above = new THREE.Vector3(0, 45, 9);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-6, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.35 }));
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

        // Dice shown at once, with reduced motion, are drawn again when their grain comes: the master's set, loaded only then, would stay black.
        const loaded = new THREE.TextureLoader().load(texturePath(name), () => renderer.render(scene, camera));
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
        const kind = { name: "body", color: colour, roughness: finish.roughness, metalness: finish.metalness };
        // A crystal: a varnish that mirrors on its faces, the page and its far faces seen through it.
        const material = finish.clarity === undefined
            ? new THREE.MeshStandardMaterial(kind)
            : new THREE.MeshPhysicalMaterial({ ...kind, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 1 - finish.clarity, side: THREE.DoubleSide });

        if (finish.glassy === true) {
            glassy(material, finish.prism ?? 0);
        }

        if (finish.frosted === true) {
            const frost = frostPicture();
            material.bumpMap = frost;
            material.bumpScale = 6;
            material.roughnessMap = frost;
        }

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
    let covering: number | undefined;
    let heading = 0;
    let tight = false;
    // The dice lie on a table that moves up the window as the tray ends above the plate.
    const table = new THREE.Group();
    scene.add(table);

    const resize = (): void => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height, false);
        // The dice keep their size on the page in a taller window: past a common height the camera goes back, seeing more of the floor (D-375).
        const back = Math.max(1, height / commonHeight);
        camera.position.copy(above).multiplyScalar(back);
        camera.lookAt(0, 0, 0);
        camera.far = 200 * back;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        // The sun's shadows cover all that is seen.
        Object.assign(sun.shadow.camera, { left: -12 * back, right: 12 * back, top: 12 * back, bottom: -12 * back });
        sun.shadow.camera.updateProjectionMatrix();
        // The tray fills what the camera sees on the floor, but for the window's foot the plate covers: no die lies under it (D-366).
        const seen = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length();
        const edge = seen / 2 - 1.2;
        const below = edge - heading / height * seen;
        const far = tight ? below : Math.max(3, below);
        const covered = (covering ?? (matchMedia("(max-width: 600px)").matches ? plateOnPhone : plateOnWide)) / height * seen;
        const front = Math.max((tight ? leastTight : 6) - far, edge - covered);
        tray.depth = (front + far) / 2;
        tray.width = Math.max(3, far * camera.aspect);
        table.position.z = (front - far) / 2;
    };

    // The crack of a natural 1 and the burn of a die set aside change the dice's shaders, and a rare face's halo and sparks have their own: made at the chosen
    // set's first throw, while the dice fly, they cost no pause when a die cracks, burns or shines. The materials that keep them made, for that set's finish;
    // the halo's and the sparks', and their pictures, for the page's life.
    let primed: { finish: string; materials: THREE.Material[]; } | undefined;

    const prime = (die: THREE.Object3D, finish: Finish): void => {
        const key = `${finish.texture ?? ""} ${finish.shine > 0} ${finish.clarity ?? ""} ${finish.engraved === true} ${finish.glassy === true} ${finish.frosted === true} ${finish.prism ?? ""}`;

        if (primed?.finish === key) {
            return;
        }

        primed?.materials.forEach((material) => material.dispose());
        const copies = new THREE.Group();

        // A copy of the die with materials of its own, its grain the set's picture.
        const copy = (): THREE.MeshStandardMaterial[] => {
            const object = die.clone();
            const materials: THREE.MeshStandardMaterial[] = [];
            object.traverse((part) => {
                if (part instanceof THREE.Mesh) {
                    const material = (part.material as THREE.MeshStandardMaterial).clone();
                    material.map = material.map === null || finish.texture === undefined ? null : grain(finish.texture);

                    if (material.userData.engraved === true) {
                        engrave(material);
                    }

                    if (material.userData.glassy === true) {
                        glassy(material, Number(material.userData.prism ?? 0));
                    }

                    part.material = material;
                    materials.push(material);
                }
            });
            copies.add(object);
            return materials;
        };

        const cracked = copy();
        crack(cracked, true);
        const burnt = copy();
        burnAway(new THREE.Group(), burnt, false, () => undefined);
        primed = { finish: key, materials: [...cracked, ...burnt] };

        if (pictures === undefined) {
            pictures = makePictures();
            Object.values(pictures).forEach((texture: THREE.Texture) => renderer.initTexture(texture));
            copies.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ map: pictures.halo, transparent: true, depthWrite: false })));
            copies.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: pictures.star, transparent: true, depthWrite: false })));
            copies.add(new THREE.Mesh(new THREE.PlaneGeometry(), floorCrackMaterial()));
            copies.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })));
        }

        void renderer.compileAsync(copies, camera, scene);
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
        dice = [];
        effects = [];
    };

    resize();
    return {
        tray,
        place(kinds, looks, given)
        {
            clear();
            const diceOf = given ?? diceLook();
            // The master's coins of their dice's material, the player's as chosen (D-526 (3)).
            const coins = coinOf(given).look;
            dice = kinds.map((kind) => {
                const object = (looks.get(kind) ?? new THREE.Group()).clone();
                const materials: THREE.MeshStandardMaterial[] = [];
                const look = kind === coinKind ? coins : diceOf;
                object.traverse((part) => {
                    if (part instanceof THREE.Mesh) {
                        // A coin's parts are a die's (D-526 (1)): its body, the field of heads and the picture of tails; its ink, the picture of heads and
                        // the field of tails.
                        const ink = (part.material as THREE.Material).name === "ink";
                        const material = ink ? new THREE.MeshStandardMaterial({ name: "ink", color: look.ink, roughness: 0.6, metalness: 0.05 }) : bodyOf(look.finish, look.body);

                        if (ink && look.finish.engraved === true) {
                            engrave(material);
                        }

                        // Through a crystal, its numbers before its body, which veils the far ones.
                        part.renderOrder = ink ? 0 : 1;
                        part.material = material;
                        part.castShadow = true;
                        materials.push(material);
                    }
                });

                // A clear coin, thin as it is, would show its other face's picture over this one's: only its nearest surface is drawn, the page seen
                // through it (D-526 (1)).
                if (kind === coinKind && look.finish.clarity !== undefined) {
                    object.children.filter((part) => part instanceof THREE.Mesh).forEach((part) => {
                        const nearest = new THREE.Mesh(part.geometry, nearestOnly);
                        nearest.renderOrder = -1;
                        part.add(nearest);
                    });
                }

                object.visible = false;
                table.add(object);
                return { object, materials };
            });
            // A coin is no die of the set: it never cracks nor burns.
            const first = dice.find((_, index) => kinds[index] !== coinKind);

            if (first !== undefined) {
                prime(first.object, diceOf.finish);
            }
        },
        cover(foot, head, under = false)
        {
            covering = foot;
            heading = head;
            tight = under;
            resize();
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
            const turning = (dice[die]?.materials ?? []).map((material) => ({
                material,
                from: material.color.clone(),
                to: goneOut(material.color, material.name === "ink" ? dimmedInk : dimmedBody),
                shine: material.envMapIntensity,
            }));

            // Out in a blink, not at a stroke (D-358): a metal set aside mirrors little; a wood or a stone keeps its grain, darker, as its colour tints it.
            const goingOut = (amount: number): void => {
                turning.forEach(({ material, from, to, shine }) => {
                    material.color.lerpColors(from, to, amount);
                    material.envMapIntensity = shine * (1 - 0.7 * amount);
                });
            };

            const dropped = dice[die];

            if (dropped !== undefined) {
                effects.push(burnAway(dropped.object, dropped.materials, instant, goingOut));

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
                effects.push(celebrate(scene, seenUnder(shown.object.getWorldPosition(new THREE.Vector3()), camera.position), rare, glow, pictures, showing));

                // The highest face's numbers lit with fire, a few embers flying off them as from a brand (D-363, D-410); the lowest's die cracked.
                if (rare === "highest") {
                    const middle = shown.object.getWorldPosition(new THREE.Vector3());
                    effects.push(lightInk(shown.materials.filter((material) => material.name === "ink"), branding, showing.instant));
                    effects.push(embers(scene, middle, pictures, showing));
                } else {
                    effects.push(crack(shown.materials, showing.instant));
                }

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

/** The point of the floor seen behind a die's middle, from the camera a little aslant: what goes around the die on the floor is centred there, not under it. */
function seenUnder(middle: THREE.Vector3, eye: THREE.Vector3): THREE.Vector3
{
    const along = eye.y / Math.max(1e-6, eye.y - middle.y);
    return eye.clone().lerp(middle, along).setY(0);
}

/** Shows a die's numbers on its far half, seen through a clear die, only as engravings: faint and colourless; the near ones as they are. */
function engrave(material: THREE.MeshStandardMaterial): void
{
    material.transparent = true;
    material.userData.engraved = true;
    // Its shaders known apart from a plain ink's, even with a crack or a burn wrapped around this.
    material.customProgramCacheKey = (): string => `engraved ${material.onBeforeCompile.toString()}`;

    material.onBeforeCompile = (shader) => {
        // How much the face a number is on is turned away from the camera: 0 facing it or aside, 1 turned away; a number goes from one to the other whole.
        shader.vertexShader = shader.vertexShader
            .replace(
                "#include <common>",
                `#include <common>
attribute vec3 dieFace;
varying float engraving;`,
            )
            .replace(
                "#include <project_vertex>",
                `#include <project_vertex>
engraving = smoothstep(0.05, -0.3, dot(normalize(normalMatrix * dieFace), normalize(-mvPosition.xyz)));`,
            );
        shader.fragmentShader = shader.fragmentShader
            .replace(
                "#include <common>",
                `#include <common>
varying float engraving;`,
            )
            .replace(
                "#include <color_fragment>",
                `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), engraving);
diffuseColor.a *= mix(1.0, 0.2, engraving);`,
            );
    };

    material.needsUpdate = true;
}

/**
 * Makes a die all its reflections, as a glass: they add to what is behind it in full, which shows through it but at its edges, where it is seen aslant and
 * mirrors more; there its light splits into the colours of the rainbow by the share given, as through a prism.
 */
function glassy(material: THREE.MeshStandardMaterial, prism: number): void
{
    material.blending = THREE.CustomBlending;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor;
    material.userData.glassy = true;
    material.userData.prism = prism;
    material.customProgramCacheKey = (): string => `glassy ${prism} ${material.onBeforeCompile.toString()}`;

    material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <opaque_fragment>",
            `float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
float edge = pow(1.0 - facing, 3.0);
outgoingLight += (0.5 + 0.5 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + facing * 2.5))) * edge * ${prism.toFixed(2)};
diffuseColor.a = clamp(diffuseColor.a + 0.8 * edge, 0.0, 1.0);
#include <opaque_fragment>`,
        );
    };

    material.needsUpdate = true;
}

/** A colour gone out: its grey, as light as it was, then darker by the share given. */
function goneOut(colour: THREE.Color, share: number): THREE.Color
{
    const light = 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
    return new THREE.Color(light * share, light * share, light * share);
}

/** By the theme (D-279, D-282): the glow of the rare faces. */
function themeColours(): { glow: Glow; }
{
    return shownTheme() === "dark"
        ? {
            glow: { lights: true, highest: { halo: "#f5c63e", resting: 0.6, sparks: ["#f5c63e", "#ffefcf"] }, lowest: { crack: "#c2503f", hot: "#ffd2c6", ring: "#ff7a66" } },
        }
        : {
            glow: { lights: false, highest: { halo: "#d1a61b", resting: 0.85, sparks: ["#c29803", "#254b83"] }, lowest: { crack: "#5e1f17", hot: "#e0442c", ring: "#a73929" } },
        };
}
