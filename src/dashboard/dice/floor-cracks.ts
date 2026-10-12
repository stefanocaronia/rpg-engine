// The lowest face's mark on the floor (D-410): cracks that run out from under the die, hot at their tips, with a dull ring as it lands; they cool and stay
// until the dice go, the floor broken as the die is. With reduced motion, or a throw cut short, they appear whole and cool.
import * as THREE from "three";
import type { Effect } from "./celebration.ts";

/** The colours of the cracks: cooled, at their hot tips, and of the ring as the die lands. */
export interface CrackColours
{
    crack: string;
    hot: string;
    ring: string;
}

const tau = Math.PI * 2;
// How many cracks run out, how long each is at most beyond its least, and its branches, in the floor's measure.
const count = 7;
const shortest = 0.55;
const longer = 0.6;
const branchShortest = 0.2;
const branchLonger = 0.25;
// How long the cracks take to run and to cool, and the ring to spread, in seconds; how long still cracks take to appear.
const running = 0.35;
const coolFrom = 0.3;
const cooling = 0.8;
const ringing = 0.35;
const appear = 0.15;
const moves = 1.2;

/** Cracks the floor around the die lying at this place. */
export function floorCracks(scene: THREE.Scene, at: THREE.Vector3, colours: CrackColours, lights: boolean, instant: boolean): Effect
{
    const { material, uniforms } = crackMaterial();
    material.blending = lights ? THREE.AdditiveBlending : THREE.NormalBlending;
    uniforms.colour.value.set(colours.crack);
    uniforms.hot.value.set(colours.hot);
    uniforms.rest.value = lights ? 0.75 : 0.9;
    const geometry = crackGeometry();
    const longest = Math.max(...(geometry.getAttribute("along").array as Float32Array));
    const cracks = onFloor(new THREE.Mesh(geometry, material), at);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: colours.ring, transparent: true, depthWrite: false, opacity: 0, blending: material.blending });
    const ring = onFloor(new THREE.Mesh(new THREE.RingGeometry(1.0, 1.06, 96), ringMaterial), at);
    scene.add(cracks, ring);
    let started: number | undefined;

    return {
        update(now)
        {
            started ??= now;
            const seconds = (now - started) / 1000;
            const shown = instant ? 3 : seconds;
            uniforms.reach.value = longest * (1 - (1 - Math.min(1, shown / running)) ** 2);
            uniforms.heat.value = 1 - Math.max(0, Math.min(1, (shown - coolFrom) / cooling));
            uniforms.fade.value = instant ? Math.min(1, seconds / appear) : 1;
            const spread = Math.min(1, shown / ringing);
            ring.scale.setScalar(1 + 0.5 * (1 - (1 - spread) ** 3));
            ringMaterial.opacity = instant ? 0 : 0.8 * (1 - spread);
            return seconds < (instant ? appear : moves);
        },
        dispose()
        {
            scene.remove(cracks, ring);
            geometry.dispose();
            material.dispose();
            ring.geometry.dispose();
            ringMaterial.dispose();
        },
    };
}

/** The cracks' material, to make its shader before a die lands. */
export function floorCrackMaterial(): THREE.ShaderMaterial
{
    return crackMaterial().material;
}

/** The cracks' material and its values: each point shown once the cracks have run as far, hot near their running tips and while the floor is still hot. */
function crackMaterial()
{
    const uniforms = { reach: { value: 0 }, heat: { value: 1 }, fade: { value: 1 }, rest: { value: 1 }, colour: { value: new THREE.Color() }, hot: { value: new THREE.Color() } };
    const material = new THREE.ShaderMaterial({
        vertexShader: `
attribute float along;
varying float travelled;
void main() {
    travelled = along;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
        fragmentShader: `
varying float travelled;
uniform float reach;
uniform float heat;
uniform float fade;
uniform float rest;
uniform vec3 colour;
uniform vec3 hot;
void main() {
    float edge = fwidth(travelled);
    float shown = 1.0 - smoothstep(reach - edge, reach + edge, travelled);
    float tip = 1.0 - smoothstep(0.0, 0.6, reach - travelled);
    gl_FragColor = vec4(mix(colour, hot, clamp(max(tip * heat, heat * 0.7), 0.0, 1.0)), shown * mix(rest, 1.0, heat) * fade);
    #include <colorspace_fragment>
}`,
        uniforms,
        transparent: true,
        depthWrite: false,
    });
    return { material, uniforms };
}

interface Step
{
    point: THREE.Vector2;
    heading: number;
    along: number;
}

/** The cracks as strips of triangles, each point with how far along its crack it lies from the die. */
function crackGeometry(): THREE.BufferGeometry
{
    const positions: number[] = [];
    const along: number[] = [];
    const indices: number[] = [];

    for (let crack = 0; crack < count; crack++) {
        const angle = (crack + 0.2 + Math.random() * 0.6) / count * tau;
        const path = walk(new THREE.Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(0.95), angle, shortest + Math.random() * longer, 0);
        strip(path, 0.07, positions, along, indices);

        // One branch from the middle of a crack, sometimes two.
        for (let branch = 0; branch < 1 + Math.round(Math.random() * 0.6); branch++) {
            const from = path[Math.floor(path.length * (0.35 + Math.random() * 0.35))] ?? path[0];

            if (from !== undefined) {
                const side = Math.random() < 0.5 ? -1 : 1;
                strip(walk(from.point, from.heading + side * (0.5 + Math.random() * 0.4), branchShortest + Math.random() * branchLonger, from.along), 0.04, positions, along, indices);
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("along", new THREE.Float32BufferAttribute(along, 1));
    geometry.setIndex(indices);
    return geometry;
}

/** A jagged path on the floor: short straight steps, each turned a little from the way out. */
function walk(start: THREE.Vector2, heading: number, length: number, along: number): Step[]
{
    const steps: Step[] = [{ point: start.clone(), heading, along }];
    let travelled = 0;

    while (travelled < length) {
        const last = steps[steps.length - 1] ?? steps[0];
        const turn = (last?.heading ?? heading) + (Math.random() - 0.5) * 0.9;
        const step = 0.1 + Math.random() * 0.12;
        const point = (last?.point ?? start).clone().add(new THREE.Vector2(Math.cos(turn), Math.sin(turn)).multiplyScalar(step));
        travelled += step;
        steps.push({ point, heading: heading * 0.6 + turn * 0.4, along: along + travelled });
    }

    return steps;
}

/** A path as a strip of triangles, as wide as given at its start and thinning to a point. */
function strip(path: Step[], width: number, positions: number[], along: number[], indices: number[]): void
{
    const first = positions.length / 3;
    path.forEach((step, index) => {
        const next = (path[Math.min(index + 1, path.length - 1)] ?? step).point;
        const previous = (path[Math.max(index - 1, 0)] ?? step).point;
        const direction = next.clone().sub(previous).normalize();
        const half = width / 2 * (1 - index / Math.max(1, path.length - 1)) + 0.004;
        positions.push(step.point.x - direction.y * half, step.point.y + direction.x * half, 0, step.point.x + direction.y * half, step.point.y - direction.x * half, 0);
        along.push(step.along, step.along);

        if (index > 0) {
            const at = first + index * 2;
            indices.push(at - 2, at - 1, at, at - 1, at + 1, at);
        }
    });
}

/** Lays a flat thing on the floor under the die. */
function onFloor<T extends THREE.Object3D>(object: T, at: THREE.Vector3): T
{
    object.rotation.x = -Math.PI / 2;
    object.position.set(at.x, 0.03, at.z);
    return object;
}
