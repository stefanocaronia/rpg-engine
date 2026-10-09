// The dashboard's dice (D-278): a die's shape and numbers, a throw simulated and recorded, and the number decided before the throw on the face it lands on.
import { describe, expect, it } from "vitest";
import { faceNormals, faceNumbers, icosahedron, landingOn } from "../src/dashboard/dice/shapes.ts";
import { throwDice, upFace } from "../src/dashboard/dice/throw.ts";

/** A random source that repeats, from a seed: the same throws at every run. */
function seeded(seed: number): () => number
{
    let state = seed;

    return () => {
        state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
        return state / 4_294_967_296;
    };
}

describe("the dice of the dashboard (D-278)", () => {
    it("gives the d20 twenty faces looking outwards, with opposite faces adding up to 21", () => {
        const d20 = icosahedron();
        const normals = faceNormals(d20);
        const numbers = faceNumbers(d20);
        expect(d20.faces).toHaveLength(20);
        // Each face's normal points the way of the face's centre: outwards.
        d20.faces.forEach((face, index) => {
            const centre = [0, 1, 2].map((axis) => face.reduce((sum, corner) => sum + d20.vertices[corner][axis], 0) / 3);
            expect(centre[0] * normals[index][0] + centre[1] * normals[index][1] + centre[2] * normals[index][2]).toBeGreaterThan(0);
        });
        expect([...numbers].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
        normals.forEach((normal, face) => {
            const opposite = normals.findIndex((other) => Math.abs(other[0] + normal[0]) + Math.abs(other[1] + normal[1]) + Math.abs(other[2] + normal[2]) < 1e-6);
            expect(numbers[face] + numbers[opposite]).toBe(21);
        });
    });

    it("throws a die until it stops, records its frames, and puts the number decided on the face that lands up", () => {
        const d20 = icosahedron();
        const random = seeded(7);
        const counts = Array.from({ length: 20 }, () => 0);

        for (let throwNumber = 0; throwNumber < 1000; throwNumber++) {
            const thrown = throwDice([d20], { width: 7, depth: 4.5 }, random);
            const last = thrown.frames.at(-1)?.[0];
            expect(last).toBeDefined();
            expect(thrown.frames.length).toBeLessThan(8 * 60);
            // The die lies on the floor, inside the walls.
            expect(Math.abs(last?.position[0] ?? 99)).toBeLessThan(7);
            expect(Math.abs(last?.position[2] ?? 99)).toBeLessThan(4.5);
            expect(upFace(d20, last?.quaternion ?? [0, 0, 0, 1])).toBe(thrown.faces[0]);
            const wanted = 1 + (throwNumber % 20);
            expect(landingOn(faceNumbers(d20), thrown.faces[0], wanted)[thrown.faces[0]]).toBe(wanted);
            counts[thrown.faces[0]]++;
        }

        // Every face comes up now and then: the throws are not stuck on a few.
        expect(Math.min(...counts)).toBeGreaterThan(15);
    });

    it("throws dice together, as two d20 with advantage: each in every frame, each landing apart from the other, inside the walls", () => {
        const d20 = icosahedron();
        const random = seeded(11);

        for (let throwNumber = 0; throwNumber < 200; throwNumber++) {
            const thrown = throwDice([d20, d20], { width: 7, depth: 4.5 }, random);
            const last = thrown.frames.at(-1) ?? [];
            expect(thrown.frames.every((frame) => frame.length === 2)).toBe(true);
            expect(thrown.faces).toHaveLength(2);
            last.forEach((die, index) => {
                expect(Math.abs(die.position[0])).toBeLessThan(7);
                expect(Math.abs(die.position[2])).toBeLessThan(4.5);
                expect(upFace(d20, die.quaternion)).toBe(thrown.faces[index]);
            });
            // Two dice never end inside each other: their centres stay a die apart.
            const [first, second] = last;
            expect(Math.hypot(first.position[0] - second.position[0], first.position[1] - second.position[1], first.position[2] - second.position[2])).toBeGreaterThan(1.2);
        }
    });
});
