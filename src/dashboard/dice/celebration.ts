// The celebration of a rare face (D-281, D-282), all on the floor, since the camera far above sees no rise: for the highest face a gold halo close around the
// die that grows and breathes once, sparks that fly out from it and twinkle out, and its numbers lit gold a moment (D-363); for the lowest the floor cracked
// around the die, as the die is (D-410). With reduced motion, or a throw cut short, the halo or the cracks alone in their last form. Everything moves for about
// a second, then stays until the dice go.
import * as THREE from "three";
import { type CrackColours, floorCracks } from "./floor-cracks.ts";
import type { RareFace } from "./models.ts";

/** Something drawn over a while: what it shows at a moment, and whether it still moves; and what it lets go, once the dice go. */
export interface Effect
{
    update(now: number): boolean;
    dispose(): void;
}

/** The colours of the celebrations, as the theme has them; and whether they light the page, as on a dark one, or are laid over it, as on a light one. */
export interface Glow
{
    lights: boolean;
    highest: { halo: string; resting: number; sparks: [string, string]; };
    lowest: CrackColours;
}

/** The pictures the celebrations are drawn with: a soft halo, a four-pointed star. */
export interface Pictures
{
    halo: THREE.Texture;
    star: THREE.Texture;
}

/** How a celebration is shown: at once and still, and how many sparks at most. */
export interface Showing
{
    instant: boolean;
    particles: number;
}

// The halo's radius on the floor, half as wide around the die as it was, so that the eye goes to the numbers lit (D-410); how long it grows and breathes, and how
// long a still halo takes to appear, in seconds.
const haloRadius = 1.9;
const growth = 0.25;
const breathEnd = 1.2;
const appear = 0.15;

/** Celebrates a rare face of the die lying at this place. */
export function celebrate(scene: THREE.Scene, at: THREE.Vector3, rare: RareFace, glow: Glow, pictures: Pictures, showing: Showing): Effect
{
    if (rare === "lowest") {
        return floorCracks(scene, at, glow.lowest, glow.lights, showing.instant);
    }

    const blending = glow.lights ? THREE.AdditiveBlending : THREE.NormalBlending;
    const resting = glow.highest.resting;
    const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(haloRadius * 2, haloRadius * 2),
        new THREE.MeshBasicMaterial({ map: pictures.halo, color: glow.highest.halo, transparent: true, depthWrite: false, blending, opacity: 0 }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(at.x, 0.03, at.z);
    scene.add(halo);

    const particles = showing.instant
        ? []
        : flyOut(scene, at, Math.min(40, showing.particles), pictures.star, glow.highest.sparks, blending, { speed: [3.5, 6], friction: 3, life: [0.7, 1], size: [0.18, 0.32], growTo: 1, opacity: 1 });

    let started: number | undefined;
    let before: number | undefined;
    return {
        update(now)
        {
            started ??= now;
            const seconds = (now - started) / 1000;
            const step = before === undefined ? 0 : Math.min(0.05, (now - before) / 1000);
            before = now;

            if (showing.instant) {
                halo.scale.setScalar(1);
                halo.material.opacity = resting * Math.min(1, seconds / appear);
                return seconds < appear;
            }

            // It grows from half its size, then breathes once, out and back, and settles.
            const grown = Math.min(1, seconds / growth);
            const breath = seconds <= growth ? 0 : Math.sin(Math.min(1, (seconds - growth) / (breathEnd - growth)) * Math.PI) * 0.12;
            halo.scale.setScalar(0.5 + 0.5 * (1 - (1 - grown) ** 3) + breath);
            halo.material.opacity = seconds < growth ? grown : resting + (1 - resting) * Math.max(0, 1 - (seconds - growth) / (breathEnd - growth));
            const flying = particles.filter((particle) => particle.move(step));
            return flying.length > 0 || seconds < breathEnd;
        },
        dispose()
        {
            scene.remove(halo);
            halo.geometry.dispose();
            halo.material.dispose();
            particles.forEach((particle) => particle.dispose());
        },
    };
}

// How long the numbers of a highest face take to light, stay lit and go out, in milliseconds; and how bright they shine.
const inkRise = 150;
const inkHold = 450;
const inkFall = 700;
const inkShine = 2.2;
// The embers off a branded face: how many at most, and their colours, from glowing orange to white-hot.
const emberCount = 16;
const emberColours = ["#ff7a1a", "#ffa236", "#ffd27a"];

/** Lights a die's numbers in this colour a moment, as its highest face lands: they flare, hold and go out; lit low and still with reduced motion. */
export function lightInk(inks: THREE.MeshStandardMaterial[], colour: string, instant: boolean): Effect
{
    const started = performance.now();
    inks.forEach((ink) => {
        ink.emissive.set(colour);
        ink.emissiveIntensity = instant ? inkShine / 3 : 0;
    });

    return {
        update(now)
        {
            if (instant) {
                return false;
            }

            const elapsed = now - started;
            const shine = elapsed < inkRise ? elapsed / inkRise : elapsed < inkRise + inkHold ? 1 : Math.max(0, 1 - (elapsed - inkRise - inkHold) / inkFall);
            inks.forEach((ink) => {
                ink.emissiveIntensity = inkShine * shine;
            });
            return shine > 0;
        },
        dispose()
        {
            // The numbers go with their die.
        },
    };
}

/** A few embers that fly off the numbers of a die lit as a brand: small round glows, orange, flickering, gone within a second; none with reduced motion. */
export function embers(scene: THREE.Scene, middle: THREE.Vector3, pictures: Pictures, showing: Showing): Effect
{
    const count = showing.instant ? 0 : Math.min(emberCount, showing.particles);
    const sparks = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const from = Math.random() * 0.55;
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: pictures.halo, color: emberColours[Math.floor(Math.random() * emberColours.length)], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
        );
        sprite.position.set(middle.x + Math.cos(angle) * from, middle.y + 0.95, middle.z + Math.sin(angle) * from);
        scene.add(sprite);
        return { sprite, angle, born: Math.random() * 0.45, life: 0.35 + Math.random() * 0.45, speed: 0.4 + Math.random() * 0.7, size: 0.07 + Math.random() * 0.06, phase: Math.random() * 6 };
    });
    let started: number | undefined;
    let before: number | undefined;

    return {
        update(now)
        {
            started ??= now;
            const seconds = (now - started) / 1000;
            const step = before === undefined ? 0 : Math.min(0.05, (now - before) / 1000);
            before = now;
            sparks.forEach((spark) => {
                const age = (seconds - spark.born) / spark.life;
                spark.sprite.visible = age > 0 && age < 1;

                if (age > 0 && age < 1) {
                    spark.sprite.position.x += Math.cos(spark.angle) * spark.speed * step;
                    spark.sprite.position.z += Math.sin(spark.angle) * spark.speed * step;
                    spark.sprite.scale.setScalar(spark.size * (1 - 0.6 * age) * (0.75 + 0.25 * Math.sin(40 * seconds + spark.phase)));
                    spark.sprite.material.opacity = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
                }
            });
            return sparks.some((spark) => seconds < spark.born + spark.life);
        },
        dispose()
        {
            sparks.forEach((spark) => {
                scene.remove(spark.sprite);
                spark.sprite.material.dispose();
            });
        },
    };
}

/** Makes the pictures of the celebrations, once for a stage; dispose them with it. */
export function makePictures(): Pictures
{
    return {
        halo: picture(128, (context, size) => softSpot(context, size, [[0, 0.9], [0.35, 0.45], [1, 0]])),
        star: picture(64, (context, size) => {
            softSpot(context, size, [[0, 1], [0.2, 0.5], [0.5, 0]]);

            // Four points: two thin rays across.
            for (const [width, height] of [[size, size * 0.08], [size * 0.08, size]]) {
                const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
                gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
                gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
                context.fillStyle = gradient;
                context.fillRect((size - width) / 2, (size - height) / 2, width, height);
            }
        }),
    };
}

/** Particles that fly out from the die along the floor, slowing, growing or twinkling, and fading over the second half of their life. */
function flyOut(
    scene: THREE.Scene,
    at: THREE.Vector3,
    count: number,
    map: THREE.Texture,
    colours: [string, string],
    blending: THREE.Blending,
    kind: { speed: [number, number]; friction: number; life: [number, number]; size: [number, number]; growTo: number; opacity: number; },
): { move(step: number): boolean; dispose(): void; }[]
{
    const [first, second] = colours.map((colour) => new THREE.Color(colour));
    const between = (range: [number, number]): number => range[0] + Math.random() * (range[1] - range[0]);
    const twinkles = kind.growTo === 1;
    return Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = between(kind.speed);
        const velocity = new THREE.Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
        const life = between(kind.life);
        const size = between(kind.size);
        const phase = Math.random() * Math.PI * 2;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: first.clone().lerp(second, Math.random()), transparent: true, depthWrite: false, blending, opacity: kind.opacity }));
        sprite.position.set(at.x, 1, at.z);
        sprite.scale.setScalar(size);
        scene.add(sprite);
        let age = 0;
        return {
            move(step)
            {
                age += step;
                velocity.multiplyScalar(Math.exp(-kind.friction * step));
                sprite.position.x += velocity.x * step;
                sprite.position.z += velocity.y * step;
                const share = Math.min(1, age / life);
                sprite.scale.setScalar(twinkles ? size * (0.7 + 0.3 * Math.sin(30 * age + phase)) : size * (1 + (kind.growTo - 1) * share));
                sprite.material.opacity = kind.opacity * (share < 0.5 ? 1 : (1 - share) * 2);
                sprite.visible = share < 1;
                return share < 1;
            },
            dispose()
            {
                scene.remove(sprite);
                sprite.material.dispose();
            },
        };
    });
}

/** A square picture drawn on a canvas, as a texture. */
function picture(size: number, draw: (context: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture
{
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    if (context !== null) {
        draw(context, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** A round spot, white, as bright at each distance from its middle as the stops say. */
function softSpot(context: CanvasRenderingContext2D, size: number, stops: [number, number][]): void
{
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([at, alpha]) => gradient.addColorStop(at, `rgba(255, 255, 255, ${alpha})`));
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
}
