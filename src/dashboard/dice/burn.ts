// A die that does not count burns away (D-358): turning grey in a blink, it stays a moment where it fell, then consumed as paper by a fire, holes opening through it with a glowing,
// charred edge, until nothing is left; with reduced motion it fades instead. A die that shows its lowest face cracks, dark lines spreading from a point, no
// fire (D-363, D-382). Its materials, body and ink, burn or crack together, by its own shape.
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
// How long the cracks take to spread, in milliseconds, and how far from where they start, in the die's measure; how big the cells between them are, how much
// their edges zigzag, how many of them crack, and how wide a crack is at most, tapering, in the cells' measure.
const cracking = 260;
const crackReach = 2.6;
const crackCellScale = "1.1";
const crackJagging = "0.12";
const crackSparseness = "0.42";
const crackWidth = "0.024";

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

/** Cracks a die from now, as resin breaks, not as paper burns: a few long dark fractures, zigzag and tapering, with a lighter chipped rim, spread from a point
 * of the die until the dice go; no fire, which says a die goes away (D-382). At once with reduced motion. */
export function crack(materials: THREE.MeshStandardMaterial[], instant: boolean): Effect
{
    const started = performance.now();
    const reach = { value: instant ? crackReach : 0 };
    const offset = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(50);
    const origin = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    materials.forEach((material) => {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.crackReach = reach;
            shader.uniforms.crackOrigin = { value: origin };
            shader.uniforms.burnOffset = { value: offset };
            shader.vertexShader = withPlace(shader.vertexShader);
            shader.fragmentShader = shader.fragmentShader
                .replace(
                    "#include <common>",
                    `#include <common>
varying vec3 burnPlace;
uniform float crackReach;
uniform vec3 crackOrigin;
uniform vec3 burnOffset;
${noise}${cells}`,
                )
                .replace(
                    "#include <emissivemap_fragment>",
                    `#include <emissivemap_fragment>
                    vec3 crackJag = vec3(burnNoise(burnPlace * 11.0), burnNoise(burnPlace * 11.0 + 17.0), burnNoise(burnPlace * 11.0 + 31.0)) - 0.5;
                    float crackEdge = crackCells(burnPlace * ${crackCellScale} + burnOffset + crackJag * ${crackJagging});
                    float crackHere = step(distance(burnPlace, crackOrigin), crackReach) * step(${crackSparseness}, burnNoise(burnPlace * 1.1 + burnOffset));
                    float crackWide = ${crackWidth} * (0.35 + 1.1 * burnNoise(burnPlace * 2.5 + burnOffset + 5.0));
                    float crackLine = (1.0 - smoothstep(crackWide, crackWide * 1.5, crackEdge)) * crackHere;
                    float crackChip = (smoothstep(crackWide * 1.5, crackWide * 2.0, crackEdge) - smoothstep(crackWide * 2.0, crackWide * 3.0, crackEdge)) * crackHere;
                    diffuseColor.rgb *= (1.0 - 0.9 * crackLine) * (1.0 + 0.35 * crackChip);`,
                );
        };

        material.needsUpdate = true;
    });

    return {
        update(now)
        {
            const done = instant ? 1 : Math.min(1, (now - started) / cracking);
            reach.value = crackReach * (1 - (1 - done) ** 3);
            return done < 1;
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

// The cells of a crack, as resin breaks into: how far a point is from the edge between the cell it is in and the nearest other one, 0 on the edge, the same
// along an edge and where edges meet.
const cells = `
vec3 crackPoint(vec3 cell) {
    return cell + fract(sin(vec3(dot(cell, vec3(127.1, 311.7, 74.7)), dot(cell, vec3(269.5, 183.3, 246.1)), dot(cell, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}

float crackCells(vec3 point) {
    vec3 home = floor(point);
    vec3 nearest = vec3(0.0);
    float least = 8.0;

    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
                vec3 seed = crackPoint(home + vec3(x, y, z));
                float away = distance(point, seed);

                if (away < least) {
                    least = away;
                    nearest = seed;
                }
            }
        }
    }

    float edge = 8.0;

    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            for (int z = -2; z <= 2; z++) {
                vec3 seed = crackPoint(home + vec3(x, y, z));
                vec3 between = seed - nearest;

                if (dot(between, between) > 1e-5) {
                    edge = min(edge, dot(0.5 * (nearest + seed) - point, normalize(between)));
                }
            }
        }
    }

    return edge;
}
`;
