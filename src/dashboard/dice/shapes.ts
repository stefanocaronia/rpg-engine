// The shapes of the dice (D-278): corners and faces, outward, and the number on each face. The prototype has the d20; the dice of the step come from Blender.

/** A die's shape: its corners, and its faces as corners in order, counterclockwise seen from outside. */
export interface Shape
{
    vertices: [number, number, number][];
    faces: number[][];
}

/** A regular icosahedron with its corners at this distance from the centre: the d20. */
export function icosahedron(radius = 1): Shape
{
    const t = (1 + Math.sqrt(5)) / 2;
    const corners: [number, number, number][] = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const length = Math.hypot(1, t);
    return {
        vertices: corners.map(([x, y, z]) => [x / length * radius, y / length * radius, z / length * radius]),
        faces: [
            [0, 11, 5],
            [0, 5, 1],
            [0, 1, 7],
            [0, 7, 10],
            [0, 10, 11],
            [1, 5, 9],
            [5, 11, 4],
            [11, 10, 2],
            [10, 7, 6],
            [7, 1, 8],
            [3, 9, 4],
            [3, 4, 2],
            [3, 2, 6],
            [3, 6, 8],
            [3, 8, 9],
            [4, 9, 5],
            [2, 4, 11],
            [6, 2, 10],
            [8, 6, 7],
            [9, 8, 1],
        ],
    };
}

/** Each face's outward normal, of length 1. */
export function faceNormals(shape: Shape): [number, number, number][]
{
    return shape.faces.map((face) => {
        const [a, b, c] = face.map((index) => shape.vertices[index]);
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const normal: [number, number, number] = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const length = Math.hypot(...normal);
        return [normal[0] / length, normal[1] / length, normal[2] / length];
    });
}

/** The numbers on the faces, by face, as on a real die: opposite faces add up to one more than the faces, as 1 and 20 on a d20. */
export function faceNumbers(shape: Shape): number[]
{
    const normals = faceNormals(shape);
    const numbers: number[] = Array.from({ length: shape.faces.length }, () => 0);
    let next = 1;

    normals.forEach((normal, face) => {
        if (numbers[face] !== 0) {
            return;
        }

        const opposite = normals.findIndex((other, index) => index !== face && Math.abs(other[0] + normal[0]) + Math.abs(other[1] + normal[1]) + Math.abs(other[2] + normal[2]) < 1e-6);
        numbers[face] = next;
        numbers[opposite] = shape.faces.length + 1 - next;
        next++;
    });

    return numbers;
}

/** The numbers with `number` on `face`: the face that had it takes the face's number, so that a die lands on the number decided before it was thrown. */
export function landingOn(numbers: number[], face: number, number: number): number[]
{
    const holder = numbers.indexOf(number);
    return numbers.map((shown, index) => (index === face ? number : index === holder ? numbers[face] : shown));
}
