# The dashboard's dice (D-278, D-279): the seven dice, made by Blender from this script alone, bevelled and with their numbers engraved. Run it again when their
# style changes, from the repository's folder:
#   blender --background --factory-startup --python src/dashboard/dice/make-dice.py
# It writes src/dashboard/assets/dice/dice.glb, a mesh for each die (d4, d6, d8, d10, d12, d20, and d100, the tens of a d%) with two materials, body and ink,
# whose colours the page gives by its theme; and dice.json, each die's shape without bevels for the physics and, for each of its values, the direction that
# looks up when it is rolled and the direction of the top of its number. Opposite faces add up as on real dice, and the numbers are spread so that each corner
# has about the same sum. The numbers are in Inter, the font Blender ships (SIL Open Font License 1.1).
import json
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

phi = (1 + 5 ** 0.5) / 2
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.normpath(os.path.join(here, "..", "assets", "dice"))

# How deep a number is engraved, and how much of an edge the bevel takes.
engraving = 0.035
bevelShare = 0.05
bevelMost = 0.07


def tetrahedron(radius):
    corners = [(1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1)]
    scaled = [Vector(corner).normalized() * radius for corner in corners]
    return scaled, [outward(scaled, face) for face in [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]]]


def cube(edge):
    half = edge / 2
    corners = [(x, y, z) for x in (-half, half) for y in (-half, half) for z in (-half, half)]
    return [Vector(corner) for corner in corners], hull(corners)


def octahedron(radius):
    corners = [(radius, 0, 0), (-radius, 0, 0), (0, radius, 0), (0, -radius, 0), (0, 0, radius), (0, 0, -radius)]
    return [Vector(corner) for corner in corners], hull(corners)


def dodecahedron(radius):
    corners = [(x, y, z) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    corners += [(0, y / phi, z * phi) for y in (-1, 1) for z in (-1, 1)]
    corners += [(x / phi, y * phi, 0) for x in (-1, 1) for y in (-1, 1)]
    corners += [(x * phi, 0, z / phi) for x in (-1, 1) for z in (-1, 1)]
    scaled = [Vector(corner) * (radius / 3 ** 0.5) for corner in corners]
    return scaled, hull([tuple(corner) for corner in scaled])


def icosahedron(radius):
    corners = [(0, y, z * phi) for y in (-1, 1) for z in (-1, 1)]
    corners += [(x, y * phi, 0) for x in (-1, 1) for y in (-1, 1)]
    corners += [(x * phi, 0, z) for x in (-1, 1) for z in (-1, 1)]
    scaled = [Vector(corner) * (radius / (1 + phi * phi) ** 0.5) for corner in corners]
    return scaled, hull([tuple(corner) for corner in scaled])


def trapezohedron(radius, height):
    """The d10: two poles, and ten corners around the middle, a little above and below it in turn, so that each face is a flat kite."""
    lift = height * (1 - math.cos(math.radians(36))) / (1 + math.cos(math.radians(36)))
    around = [Vector((radius * math.cos(math.radians(36 * k)), radius * math.sin(math.radians(36 * k)), lift if k % 2 == 0 else -lift)) for k in range(10)]
    top = Vector((0, 0, height))
    bottom = Vector((0, 0, -height))
    corners = around + [top, bottom]
    faces = [[10, 2 * i, (2 * i + 1) % 10, (2 * i + 2) % 10] for i in range(5)]
    faces += [[11, (2 * i + 1) % 10, (2 * i) % 10, (2 * i - 1) % 10] for i in range(5)]
    return corners, [outward(corners, face) for face in faces]


def hull(points):
    """The faces of a convex shape whose corners are these points: each set of corners that lie on one plane with all the others behind it."""
    corners = [Vector(point) for point in points]
    faces = []
    found = set()

    for a in range(len(corners)):
        for b in range(a + 1, len(corners)):
            for c in range(b + 1, len(corners)):
                normal = (corners[b] - corners[a]).cross(corners[c] - corners[a])

                if normal.length < 1e-9:
                    continue

                normal.normalize()
                distance = normal.dot(corners[a])

                if distance < 0:
                    normal, distance = -normal, -distance

                if any(normal.dot(corner) > distance + 1e-6 for corner in corners):
                    continue

                on = tuple(sorted(index for index, corner in enumerate(corners) if abs(normal.dot(corner) - distance) < 1e-6))

                if on not in found:
                    found.add(on)
                    faces.append(around_normal(corners, list(on), normal))

    return faces


def around_normal(corners, indexes, normal):
    """A face's corners in order, counterclockwise seen from outside."""
    centre = sum((corners[index] for index in indexes), Vector()) / len(indexes)
    first = (corners[indexes[0]] - centre).normalized()
    side = normal.cross(first)
    return sorted(indexes, key=lambda index: math.atan2((corners[index] - centre).dot(side), (corners[index] - centre).dot(first)))


def outward(corners, face):
    return face if face_normal(corners, face).dot(face_centre(corners, face)) > 0 else list(reversed(face))


def face_normal(corners, face):
    a, b, c = (corners[index] for index in face[:3])
    return (b - a).cross(c - a).normalized()


def face_centre(corners, face):
    return sum((corners[index] for index in face), Vector()) / len(face)


def opposite(normals, face):
    return min(range(len(normals)), key=lambda other: (normals[other] + normals[face]).length)


def spread(corners, faces, values, total, fixed=None):
    """The values on the faces: opposite faces add up to total, and each corner's faces add up to about the same; the same at every run."""
    normals = [face_normal(corners, face) for face in faces]
    pairs = []

    for face in range(len(faces)):
        other = opposite(normals, face)

        if all(face not in pair for pair in pairs):
            pairs.append((face, other))

    around = [[index for index, face in enumerate(faces) if corner in face] for corner in range(len(corners))]
    generator = random.Random(20261009)
    best = None

    for _ in range(4000):
        lows = list(values)
        generator.shuffle(lows)
        chosen = [0] * len(faces)

        for (first, second), low in zip(pairs, lows):
            if generator.random() < 0.5:
                first, second = second, first

            if fixed is not None and not fixed(first, low):
                first, second = second, first

            chosen[first] = low
            chosen[second] = total - low

        if fixed is not None and not all(fixed(face, chosen[face]) for face in range(len(faces)) if chosen[face] in values):
            continue

        sums = [sum(chosen[face] for face in faces_around) / len(faces_around) for faces_around in around]
        score = max(sums) - min(sums)

        if best is None or score < best[0]:
            best = (score, chosen)

    return best[1]


def highest(vectors):
    """The index of the highest of these directions; the farthest back among equals."""
    return max(range(len(vectors)), key=lambda index: (round(vectors[index].z, 6), round(vectors[index].y, 6), round(vectors[index].x, 6)))


def text_mesh(text, height, name):
    """A number as a closed mesh, centred, its height as given, in the plane z = 0, reading along x, its top along y, as deep as the engraving each way."""
    curve = bpy.data.curves.new(name, type="FONT")
    curve.body = text
    curve.extrude = engraving
    curve.resolution_u = 4
    curve.offset = 0.03
    holder = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(holder)
    mesh = bpy.data.meshes.new_from_object(holder)
    bpy.data.objects.remove(holder)
    bpy.data.curves.remove(curve)
    low = Vector((min(vertex.co.x for vertex in mesh.vertices), min(vertex.co.y for vertex in mesh.vertices), 0))
    high = Vector((max(vertex.co.x for vertex in mesh.vertices), max(vertex.co.y for vertex in mesh.vertices), 0))
    scale = height / (high.y - low.y)
    mesh.transform(Matrix.Diagonal((scale, scale, 1, 1)) @ Matrix.Translation(-(low + high) / 2))
    return mesh, (high.x - low.x) * scale


def bar_mesh(width, height, below, name):
    """The line under a 6 or a 9: a flat bar below the number."""
    mesh = bpy.data.meshes.new(name)
    shape = bmesh.new()
    bmesh.ops.create_cube(shape, size=1)
    bmesh.ops.scale(shape, vec=(width, height, engraving * 2), verts=shape.verts)
    bmesh.ops.translate(shape, vec=(0, -below, 0), verts=shape.verts)
    shape.to_mesh(mesh)
    shape.free()
    return mesh


def placed(mesh, centre, normal, top):
    """The mesh moved from the plane z = 0 onto a face: its z along the face's normal, its top along top, its centre at centre."""
    side = top.cross(normal).normalized()
    turn = Matrix((side, top, normal)).transposed().to_4x4()
    mesh.transform(Matrix.Translation(centre) @ turn)
    return mesh


def material(name, colour):
    made = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    made.diffuse_color = colour
    return made


def make_die(name, corners, faces, labels):
    """The die: its shape bevelled, the numbers engraved, the faces cut by them in ink, smooth on the bevels and sharp elsewhere."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(corner) for corner in corners], [], faces)
    mesh.materials.append(material("body", (0.96, 0.78, 0.30, 1)))
    die = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(die)
    edge = min((corners[face[0]] - corners[face[1]]).length for face in faces)
    bevel = die.modifiers.new("bevel", "BEVEL")
    bevel.width = min(edge * bevelShare, bevelMost)
    bevel.segments = 3
    bevel.limit_method = "NONE"

    cutters = bpy.data.meshes.new(f"{name}-numbers")
    joined = bmesh.new()

    for index, (text, height, centre, normal, top, underline) in enumerate(labels):
        number, width = text_mesh(text, height, f"{name}-{index}")
        joined.from_mesh(placed(number, centre, normal, top))
        bpy.data.meshes.remove(number)

        if underline:
            bar = bar_mesh(width * 0.7, height * 0.09, height * 0.62, f"{name}-bar-{index}")
            joined.from_mesh(placed(bar, centre, normal, top))
            bpy.data.meshes.remove(bar)

    joined.to_mesh(cutters)
    joined.free()
    cutters.materials.append(material("ink", (0.1, 0.18, 0.3, 1)))
    cutter = bpy.data.objects.new(f"{name}-numbers", cutters)
    bpy.context.scene.collection.objects.link(cutter)
    engrave = die.modifiers.new("engrave", "BOOLEAN")
    engrave.operation = "DIFFERENCE"
    engrave.solver = "EXACT"
    engrave.object = cutter
    engrave.material_mode = "TRANSFER"
    # The font's outlines cross themselves, as in a 4: without these, a cap of ink is left above the face.
    engrave.use_self = True
    engrave.use_hole_tolerant = True

    bpy.context.view_layer.objects.active = die
    die.select_set(True)
    bpy.ops.object.modifier_apply(modifier="bevel")
    bpy.ops.object.modifier_apply(modifier="engrave")
    die.select_set(False)
    bpy.data.objects.remove(cutter)
    bpy.data.meshes.remove(cutters)
    die.data.shade_smooth()
    die.data.set_sharp_from_angle(angle=math.radians(32))
    check_inside(die, corners, faces)
    return die


def check_inside(die, corners, faces):
    """Stops the script when a part of the die stands out of its shape, as a cap of ink above a face: the engraving went wrong."""
    planes = [(face_normal(corners, face), face_normal(corners, face).dot(corners[face[0]])) for face in faces]
    out = [vertex.co for vertex in die.data.vertices if any(normal.dot(vertex.co) > distance + 1e-4 for normal, distance in planes)]

    if out:
        raise RuntimeError(f"{die.name}: {len(out)} corners stand out of the die, as {tuple(round(value, 3) for value in out[0])}: the engraving left something above a face.")


def gltf(vector):
    """A direction of Blender's, z up, as glTF has it, y up."""
    return [round(vector.x, 6), round(vector.z, 6), round(-vector.y, 6)]


def face_dice(name, corners, faces, values, height, top_of, underlined=False, shown=str, worth=lambda value: value, fixed=None, total=None):
    """A die read on the face that looks up: a number on each face, at its centre, its top toward top_of; worth is what a face counts for, as 70 for the 7 of the tens."""
    normals = [face_normal(corners, face) for face in faces]
    chosen = spread(corners, faces, values, total, fixed)
    labels = []
    entries = []

    for index, face in enumerate(faces):
        normal = normals[index]
        top = top_of(corners, face, normal)
        centre, size = text_place(corners, face, normal, top, height)
        value = chosen[index]
        labels.append((shown(value), size, centre, normal, top, underlined and value in (6, 9)))
        entries.append({"value": worth(value), "up": gltf(normal), "top": gltf(top)})

    return make_die(name, corners, faces, labels), sorted(entries, key=lambda entry: entry["value"])


def text_place(corners, face, normal, top, height):
    """Where a face's number goes, on the face's plane: at its centre, or, on a kite, toward its wide end."""
    centre = face_centre(corners, face)

    if len(face) == 4 and abs((corners[face[0]] - corners[face[2]]).length - (corners[face[1]] - corners[face[3]]).length) > 1e-3:
        apex = max((corners[index] for index in face), key=lambda corner: (corner - centre).dot(top))
        tip = min((corners[index] for index in face), key=lambda corner: (corner - centre).dot(top))
        centre = apex.lerp(tip, 0.62)

    return centre, height


def toward_corner(corners, face, normal):
    centre = face_centre(corners, face)
    directions = [(corners[index] - centre).normalized() for index in face]
    return directions[highest(directions)]


def toward_edge(corners, face, normal):
    centre = face_centre(corners, face)
    middles = [((corners[face[index]] + corners[face[(index + 1) % len(face)]]) / 2 - centre).normalized() for index in range(len(face))]
    return middles[highest(middles)]


def toward_pole(corners, face, normal):
    """On a kite of the d10, toward its pole: the corner farthest from the face's centre."""
    centre = face_centre(corners, face)
    pole = max((corners[index] for index in face), key=lambda corner: (corner - centre).length)
    direction = pole - centre
    return (direction - normal * direction.dot(normal)).normalized()


def d4():
    """The d4, read at the corner that looks up: each face shows, near each of its corners, that corner's number, its top toward it."""
    corners, faces = tetrahedron(1.15)
    values = [1, 2, 3, 4]
    labels = []

    for face in faces:
        normal = face_normal(corners, face)
        centre = face_centre(corners, face)

        for corner in face:
            top = (corners[corner] - centre).normalized()
            labels.append((str(values[corner]), 0.3, centre.lerp(corners[corner], 0.52), normal, top, False))

    die = make_die("d4", corners, faces, labels)
    # Each corner's number is on three faces, its top toward it: there is no one top to turn upright.
    return die, [{"value": values[corner], "up": gltf(corners[corner].normalized())} for corner in range(4)]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(out, exist_ok=True)
    made = {}

    made["d4"] = d4()
    corners, faces = cube(1.35)
    made["d6"] = face_dice("d6", corners, faces, [1, 2, 3], 0.62, toward_edge, total=7)
    corners, faces = octahedron(1.08)
    made["d8"] = face_dice("d8", corners, faces, [1, 2, 3, 4], 0.46, toward_corner, total=9)
    corners, faces = trapezohedron(1.0, 1.0)
    upper = [index for index, face in enumerate(faces) if 10 in face]
    odd = lambda face, value: (face in upper) == (value % 2 == 1)
    made["d10"] = face_dice("d10", corners, faces, [1, 3, 5, 7, 9], 0.4, toward_pole, underlined=True, fixed=odd, total=9)
    made["d100"] = face_dice("d100", corners, faces, [1, 3, 5, 7, 9], 0.33, toward_pole, shown=lambda value: f"{value}0", worth=lambda value: value * 10, fixed=odd, total=9)
    # The d20 the biggest, as in a set of real dice.
    corners, faces = dodecahedron(1.0)
    made["d12"] = face_dice("d12", corners, faces, [1, 2, 3, 4, 5, 6], 0.38, toward_corner, underlined=True, total=13)
    corners, faces = icosahedron(1.15)
    made["d20"] = face_dice("d20", corners, faces, list(range(1, 11)), 0.3, toward_corner, underlined=True, total=21)

    shapes = {"d4": tetrahedron(1.15), "d6": cube(1.35), "d8": octahedron(1.08), "d10": trapezohedron(1.0, 1.0), "d100": trapezohedron(1.0, 1.0), "d12": dodecahedron(1.0), "d20": icosahedron(1.15)}
    data = {}

    for name, (die, values) in made.items():
        corners, faces = shapes[name]
        die.select_set(True)
        data[name] = {"shape": {"vertices": [gltf(corner) for corner in corners], "faces": faces}, "values": values}

    bpy.ops.export_scene.gltf(
        filepath=os.path.join(out, "dice.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=False,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )

    with open(os.path.join(out, "dice.json"), "w", encoding="utf-8", newline="\n") as written:
        json.dump(data, written, separators=(",", ":"))
        written.write("\n")

    print(f"Dice written to {out}")


main()
