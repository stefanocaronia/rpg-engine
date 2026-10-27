# The dashboard's coin (D-522 (3), D-524 (1)): "Sun and moon", made by Blender from this script alone, as make-dice.py makes the dice. Heads a sun of sixteen
# rays, dark on the gold; tails a crescent moon with two stars, gold on a dark field; a plain edge; gold in every theme and set. Run it again when its style
# changes, from the repository's folder:
#   blender --background --factory-startup --python src/dashboard/dice/make-coin.py
# It writes src/dashboard/assets/dice/coin.glb, the coin's mesh with two materials, coin-gold and coin-dark; and coin.json, as dice.json has a die: the coin's
# shape for the physics, a prism of a few sides, with only its two faces, the only ones it lies on; and its values, 1 heads and 2 tails, each with the direction
# that looks up when it lands so and the direction of the top of its picture.
import json
import math
import os

import bmesh
import bpy
from mathutils import Matrix

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.normpath(os.path.join(here, "..", "assets", "dice"))

# The coin as drawn, at a radius of 0.8, then made the size it is thrown at: a little wider than a d6, as a real coin beside a die, so that its picture is read
# on a phone.
drawnRadius = 0.8
radius = 0.85
scale = radius / drawnRadius
thickness = 0.16
rimWidth = 0.11
recess = 0.03
relief = 0.024
# The sides of the prism the physics throws: its rim a little off the round, so that the coin does not roll as a wheel.
physicsSides = 24


def counterclockwise(points):
    area = sum(points[index][0] * points[(index + 1) % len(points)][1] - points[(index + 1) % len(points)][0] * points[index][1] for index in range(len(points)))
    return points if area > 0 else list(reversed(points))


def circle(size, count=96, x=0.0, y=0.0):
    return [(x + size * math.cos(2 * math.pi * step / count), y + size * math.sin(2 * math.pi * step / count)) for step in range(count)]


def star(points, outer, inner, x, y):
    return [(x + (inner if step % 2 else outer) * math.cos(math.pi / 2 + math.pi * step / points), y + (inner if step % 2 else outer) * math.sin(math.pi / 2 + math.pi * step / points)) for step in range(points * 2)]


def prism(name, polygons, low, high, made, weighted=False):
    """Each polygon raised between the heights low and high, as one closed mesh; weighted, its two faces' edges bevelled."""
    shape = bmesh.new()
    layer = shape.edges.layers.float.new("bevel_weight_edge") if weighted else None

    for polygon in polygons:
        polygon = counterclockwise(polygon)
        below = [shape.verts.new((x, y, low)) for x, y in polygon]
        above = [shape.verts.new((x, y, high)) for x, y in polygon]
        caps = [shape.faces.new(list(reversed(below))), shape.faces.new(above)]

        for index in range(len(polygon)):
            following = (index + 1) % len(polygon)
            shape.faces.new([below[index], below[following], above[following], above[index]])

        if layer is not None:
            for cap in caps:
                for edge in cap.edges:
                    edge[layer] = 1.0

    mesh = bpy.data.meshes.new(name)
    shape.to_mesh(mesh)
    shape.free()
    mesh.materials.append(made)
    holder = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(holder)
    return holder


def boolean(target, tool, operation):
    """The tool added to the target or cut from it, its material kept where it shows; then the tool goes."""
    modifier = target.modifiers.new(tool.name, "BOOLEAN")
    modifier.operation = operation
    modifier.solver = "EXACT"
    modifier.object = tool
    modifier.material_mode = "TRANSFER"
    modifier.use_self = True
    modifier.use_hole_tolerant = True
    bpy.context.view_layer.objects.active = target
    target.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    target.select_set(False)
    bpy.data.objects.remove(tool)


def material(name, colour):
    made = bpy.data.materials.new(name)
    made.diffuse_color = colour
    return made


def sun():
    """Heads: a disc and sixteen rays, long and short in turn, the first upward."""
    rays = []

    for step in range(16):
        angle = math.pi / 2 + 2 * math.pi * step / 16
        length = 0.58 if step % 2 == 0 else 0.47
        half = math.radians(7 if step % 2 == 0 else 6)
        rays.append([(0.3 * math.cos(angle - half), 0.3 * math.sin(angle - half)), (length * math.cos(angle), length * math.sin(angle)), (0.3 * math.cos(angle + half), 0.3 * math.sin(angle + half))])

    return {"shapes": [circle(0.25, 64)] + rays}


def moon():
    """Tails: a crescent, its horns to the right, and two stars between them."""
    return {"shapes": [circle(0.46, 96, -0.1, 0.0)], "holes": [circle(0.4, 96, 0.08, 0.07)], "extra": [star(5, 0.12, 0.05, 0.33, 0.2), star(5, 0.08, 0.032, 0.25, -0.26)]}


def face(coin, side, picture, field, motif):
    """One face: its field sunk inside the rim, in its colour, and the picture raised on it, in the other. Tails is drawn turned over, upright when the coin is."""
    sign = 1 if side == "heads" else -1
    top = sign * thickness / 2
    floor = top - sign * recess
    area = [circle(drawnRadius - rimWidth, 128)]
    boolean(coin, prism(f"field-{side}", area, floor, top + 1, field) if sign > 0 else prism(f"field-{side}", area, top - 1, floor, field), "DIFFERENCE")
    turned = (lambda points: points) if sign > 0 else (lambda points: [(x, -y) for x, y in points])
    low, high = (floor - 0.004, floor + relief) if sign > 0 else (floor - relief, floor + 0.004)
    raised = prism(f"picture-{side}", [turned(picture["shapes"][0])], low, high, motif)

    # Parts that overlap in a plane would leave the boolean unsure: each a breath higher than the last.
    for index, part in enumerate(picture["shapes"][1:]):
        lift = (0.004 if index % 2 == 0 else 0.002) * sign
        boolean(raised, prism(f"part-{side}-{index}", [turned(part)], low if sign > 0 else low + lift, high + lift if sign > 0 else high, motif), "UNION")

    for index, hole in enumerate(picture.get("holes", [])):
        boolean(raised, prism(f"hole-{side}-{index}", [turned(hole)], low - 0.1, high + 0.1, motif), "DIFFERENCE")

    if picture.get("extra"):
        boolean(raised, prism(f"extra-{side}", [turned(part) for part in picture["extra"]], low, high, motif), "UNION")

    boolean(coin, raised, "UNION")


def make_coin(gold, dark):
    coin = prism("coin", [circle(drawnRadius, 160)], -thickness / 2, thickness / 2, gold, weighted=True)
    bevel = coin.modifiers.new("bevel", "BEVEL")
    bevel.width = 0.014
    bevel.segments = 3
    bevel.limit_method = "WEIGHT"
    bpy.context.view_layer.objects.active = coin
    coin.select_set(True)
    bpy.ops.object.modifier_apply(modifier="bevel")
    coin.select_set(False)
    face(coin, "heads", sun(), gold, dark)
    face(coin, "tails", moon(), dark, gold)
    coin.data.transform(Matrix.Scale(scale, 4))
    coin.data.shade_smooth()
    coin.data.set_sharp_from_angle(angle=math.radians(35))
    return coin


def gltf(vector):
    """A direction of Blender's, z up, as glTF has it, y up."""
    return [round(vector[0], 6) + 0.0, round(vector[2], 6) + 0.0, round(-vector[1], 6) + 0.0]


def physics():
    """The prism the physics throws, as wide and as thick as the coin; its faces only the two it lies on, counterclockwise seen from outside."""
    half = thickness * scale / 2
    corners = [(radius * math.cos(2 * math.pi * step / physicsSides), radius * math.sin(2 * math.pi * step / physicsSides)) for step in range(physicsSides)]
    vertices = [gltf((x, y, half)) for x, y in corners] + [gltf((x, y, -half)) for x, y in corners]
    heads = list(range(physicsSides))
    tails = list(reversed(range(physicsSides, 2 * physicsSides)))
    # Heads looks up when the coin's +z does, the sun's top along +y; tails when -z does, the moon's top along -y, as it is drawn turned over.
    values = [{"value": 1, "up": gltf((0, 0, 1)), "top": gltf((0, 1, 0))}, {"value": 2, "up": gltf((0, 0, -1)), "top": gltf((0, -1, 0))}]
    return {"shape": {"vertices": vertices, "faces": [heads, tails]}, "values": values}


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(out, exist_ok=True)
    coin = make_coin(material("coin-gold", (0.69, 0.4, 0.05, 1)), material("coin-dark", (0.01, 0.006, 0.002, 1)))
    coin.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(out, "coin.glb"),
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

    with open(os.path.join(out, "coin.json"), "w", encoding="utf-8", newline="\n") as written:
        json.dump(physics(), written, separators=(",", ":"))
        written.write("\n")

    print(f"Coin written to {out}: {len(coin.data.polygons)} faces")


main()
