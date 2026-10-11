// A die that does not count burns away (D-358): turning grey in a blink, it stays a moment where it fell, then consumed as paper by a fire, holes opening through it with a glowing,
// charred edge, until nothing is left; with reduced motion it fades instead. A die that shows its lowest face cracks instead, embers glowing red in its cracks
// until the dice go (D-363). Its materials, body and ink, burn together, by its own shape.
import * as THREE from "three";
import type { Effect } from "./celebration.ts";

// How long a die set aside stays in sight before it burns, how long it burns, and how long it fades with reduced motion, in milliseconds.
const pause = 350;
const greying = 120;
const burning = 1300;
const fading = 400;
// The colour of the fire at the edge of the holes, and how wide that edge is, and the charred band behind it, in the noise's own measure.
const fire = new THREE.Color("#ff8a3d");
const edge = 0.06;
const charred = 0.16;
// How long the cracks take to open, in milliseconds; their embers, and how wide a crack and the soot around it are, in the noise's measure.
const cracking = 450;
const embers = new THREE.Color("#ff3d1f");
const crackWidth = 0.022;
const sootWidth = 0.09;

/** Burns a die away from now: its object and its materials, turned grey by the amount given first; its update says whether it still moves. */
export function burnAway(object: THREE.Object3D, materials: THREE.MeshStandardMaterial[], instant: boolean, grey: (amount: number) => void): Effect
{
    const started = performance.now();
    const progress = { value: 0 };
    // Each die catches fire in its own places.
    const offset = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(50);
    object.traverse((part) => {
        part.castShadow = false;
    });

    if (instant) {
        materials.forEach((material) => {
            material.transparent = true;
            material.needsUpdate = true;
        });
    } else {
        materials.forEach((material) => burnable(material, progress, offset));
    }

    return {
        update(now)
        {
            grey(Math.min(1, (now - started) / greying));
            const elapsed = now - started - pause;

            if (elapsed < 0) {
                return true;
            }

            const done = Math.min(1, elapsed / (instant ? fading : burning));

            if (instant) {
                materials.forEach((material) => {
                    material.opacity = 1 - done;
                });
            } else {
                // Slow at first, as a fire catching, then faster; from where the noise starts to past where it ends.
                progress.value = 0.2 + done ** 1.6 * 0.85;
            }

            object.visible = done < 1;
            return done < 1;
        },
        dispose()
        {
            object.visible = false;
        },
    };
}

/** Cracks a die from now, by the same noise as the fire: dark lines open across it with red embers in them, which flare, then glow low and breathe until
 * the dice go; at once, still, with reduced motion. */
export function crack(materials: THREE.MeshStandardMaterial[], instant: boolean): Effect
{
    const started = performance.now();
    const opened = { value: instant ? 1 : 0 };
    const glow = { value: instant ? 1.2 : 0 };
    const offset = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(50);
    materials.forEach((material) => {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.crackOpened = opened;
            shader.uniforms.crackGlow = glow;
            shader.uniforms.crackEmbers = { value: embers };
            shader.uniforms.burnOffset = { value: offset };
            shader.vertexShader = withPlace(shader.vertexShader);
            shader.fragmentShader = shader.fragmentShader
                .replace("#include <common>", `#include <common>\nvarying vec3 burnPlace;\nuniform float crackOpened;\nuniform float crackGlow;\nuniform vec3 crackEmbers;\nuniform vec3 burnOffset;\n${noise}`)
                .replace(
                    "#include <emissivemap_fragment>",
                    `#include <emissivemap_fragment>
                    float crackLine = abs(burnNoise(burnPlace * 2.0 + burnOffset) - 0.5);
                    float crackIn = (1.0 - smoothstep(0.0, ${crackWidth} * crackOpened, crackLine)) * step(0.001, crackOpened);
                    float crackSoot = (1.0 - smoothstep(0.0, ${sootWidth} * crackOpened, crackLine)) * step(0.001, crackOpened);
                    diffuseColor.rgb *= (1.0 - 0.45 * crackSoot) * (1.0 - 0.9 * crackIn);
                    totalEmissiveRadiance += crackEmbers * crackGlow * crackIn;`,
                );
        };

        material.needsUpdate = true;
    });

    return {
        update(now)
        {
            if (instant) {
                return false;
            }

            const elapsed = now - started;
            const done = Math.min(1, elapsed / cracking);
            opened.value = 1 - (1 - done) ** 3;
            // A flare as they open, then embers that breathe.
            glow.value = done < 1 ? 4 * done : 1.2 + 0.5 * Math.sin((elapsed - cracking) / 250);
            return true;
        },
        dispose()
        {
            // The die goes with its materials.
        },
    };
}

/** A vertex shader that hands each point's place on the die to the fragments. */
function withPlace(vertexShader: string): string
{
    return vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 burnPlace;").replace("#include <begin_vertex>", "#include <begin_vertex>\nburnPlace = position;");
}

/** Teaches a material to burn: each point of the die, by a noise of where it is on the die, goes when the fire's progress passes it. */
function burnable(material: THREE.MeshStandardMaterial, progress: { value: number; }, offset: THREE.Vector3): void
{
    material.onBeforeCompile = (shader) => {
        shader.uniforms.burnProgress = progress;
        shader.uniforms.burnFire = { value: fire };
        shader.uniforms.burnOffset = { value: offset };
        shader.vertexShader = withPlace(shader.vertexShader);
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", `#include <common>\nvarying vec3 burnPlace;\nuniform float burnProgress;\nuniform vec3 burnFire;\nuniform vec3 burnOffset;\n${noise}`)
            .replace(
                "#include <emissivemap_fragment>",
                `#include <emissivemap_fragment>
                float burnLeft = burnNoise(burnPlace * 2.2 + burnOffset) - burnProgress;
                float burnLit = step(0.001, burnProgress);
                if (burnLeft < 0.0) discard;
                diffuseColor.rgb *= mix(1.0, mix(0.08, 1.0, smoothstep(${edge.toFixed(2)}, ${charred.toFixed(2)}, burnLeft)), burnLit);
                totalEmissiveRadiance += burnFire * 4.0 * (1.0 - smoothstep(0.0, ${edge.toFixed(2)}, burnLeft)) * burnLit;`,
            );
    };

    material.needsUpdate = true;
}

// A smooth 3D value noise in three octaves, from 0 to 1: where the fire starts and how it spreads.
const noise = `
float burnHash(vec3 point) {
    return fract(sin(dot(point, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float burnValue(vec3 point) {
    vec3 cell = floor(point);
    vec3 inside = fract(point);
    vec3 eased = inside * inside * (3.0 - 2.0 * inside);
    return mix(
        mix(mix(burnHash(cell), burnHash(cell + vec3(1, 0, 0)), eased.x), mix(burnHash(cell + vec3(0, 1, 0)), burnHash(cell + vec3(1, 1, 0)), eased.x), eased.y),
        mix(mix(burnHash(cell + vec3(0, 0, 1)), burnHash(cell + vec3(1, 0, 1)), eased.x), mix(burnHash(cell + vec3(0, 1, 1)), burnHash(cell + vec3(1, 1, 1)), eased.x), eased.y),
        eased.z
    );
}

float burnNoise(vec3 point) {
    return 0.55 * burnValue(point) + 0.3 * burnValue(point * 2.1) + 0.15 * burnValue(point * 4.3);
}
`;
