# The dashboard's coins (D-522 (3), D-524 (1), D-526): one coin, its designs on its two faces, made by Blender from this script alone, as make-dice.py makes
# the dice. Every design is the same coin, as wide and as thick, with a reeded edge: heads its picture raised in the ink on a field of the body, tails its
# picture raised in the body on a field of the ink; the page makes body and ink of the look the player chooses. Run it again when a design changes, from
# the repository's folder, for all the designs or those named:
#   blender --background --factory-startup --python src/dashboard/dice/make-coin.py [-- sun crown ...]
# It writes, in src/dashboard/assets/dice, coin-<design>.glb, the coin's mesh with two materials, body and ink, which the page loads only for the design
# chosen; and coin.json, as dice.json has a die: the coin's shape for the physics, a prism of a few sides, with only its two faces, the only ones it lies on;
# and its values, 1 heads and 2 tails, each with the direction that looks up when it lands so and the direction of the top of its picture. Beside this
# script it writes coin-pictures.ts, every design's faces as the page draws them, on a grid of 24.
import json
import math
import os
import sys

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
# The reeding of the edge (D-526): grooves across it, between its bevels, few enough to be seen on a coin as small as the page's.
reeds = 72
reedDepth = 0.014
reedWidth = 0.024
bevelWidth = 0.014
# The sides of the prism the physics throws: its rim a little off the round, so that the coin does not roll as a wheel.
physicsSides = 24
# The page's grid: the coin's radius is 11 of its 24.
grid = 11 / drawnRadius


# Outlines, on the coin's drawing, y up: the field is 0.69 wide.

class Round(list):
    """A circle's outline, which the page draws as a circle."""

    def __init__(self, points, x, y, size):
        super().__init__(points)
        self.x, self.y, self.size = x, y, size


def circle(size, count=96, x=0.0, y=0.0):
    return Round([(x + size * math.cos(2 * math.pi * step / count), y + size * math.sin(2 * math.pi * step / count)) for step in range(count)], x, y, size)


def ellipse(across, high, turn, start, end, count=64):
    """Part of an ellipse, turned, from an angle to another, both ends included."""
    points = []

    for step in range(count):
        angle = start + (end - start) * step / (count - 1)
        x, y = across * math.cos(angle), high * math.sin(angle)
        points.append((x * math.cos(turn) - y * math.sin(turn), x * math.sin(turn) + y * math.cos(turn)))

    return points


def band(outer, inner, turn, start, end):
    """Part of an elliptic ring between two angles: its outer ellipse and its inner, each across and high."""
    return ellipse(*outer, turn, start, end) + list(reversed(ellipse(*inner, turn, start, end)))


def star(points, outer, inner, x=0.0, y=0.0, longer=None):
    """A star of so many points, the first upward; with longer, every other point that long."""
    shape = []

    for step in range(points * 2):
        angle = math.pi / 2 + math.pi * step / points
        size = inner if step % 2 else (outer if longer is None or (step // 2) % 2 == 0 else longer)
        shape.append((x + size * math.cos(angle), y + size * math.sin(angle)))

    return shape


def rectangle(left, bottom, right, top):
    return [(left, bottom), (right, bottom), (right, top), (left, top)]


def wedge(start, end, width):
    """A thin triangle from a base this wide at the start to a point at the end."""
    across, along = end[0] - start[0], end[1] - start[1]
    length = math.hypot(across, along)
    x, y = -along / length * width / 2, across / length * width / 2
    return [(start[0] + x, start[1] + y), end, (start[0] - x, start[1] - y)]


def ray(inner, outer, angle, half):
    """A ray from a circle this wide to a point that far, at this angle, this many radians wide each side at its base."""
    return [(inner * math.cos(angle - half), inner * math.sin(angle - half)), (outer * math.cos(angle), outer * math.sin(angle)), (inner * math.cos(angle + half), inner * math.sin(angle + half))]


def smooth(points, steps=6):
    """A closed outline through these points, rounded with Catmull-Rom."""
    shape = []

    for index in range(len(points)):
        before, start, end, after = (points[(index + offset) % len(points)] for offset in (-1, 0, 1, 2))

        for step in range(steps):
            t = step / steps
            shape.append(tuple(0.5 * (2 * start[axis] + (-before[axis] + end[axis]) * t + (2 * before[axis] - 5 * start[axis] + 4 * end[axis] - after[axis]) * t * t
                                      + (-before[axis] + 3 * start[axis] - 3 * end[axis] + after[axis]) * t ** 3) for axis in (0, 1)))

    return shape


# The designs: each face its parts in order, each added to its picture ("add") or cut back from it ("cut"). The first face of each name is heads.

def sun():
    """A disc and sixteen rays, long and short in turn, the first upward."""
    rays = [ray(0.3, 0.58 if step % 2 == 0 else 0.47, math.pi / 2 + 2 * math.pi * step / 16, math.radians(7 if step % 2 == 0 else 6)) for step in range(16)]
    return [("add", circle(0.25, 64))] + [("add", one) for one in rays]


def moon():
    """A crescent, its horns to the right, and two stars between them."""
    return [("add", circle(0.46, 96, -0.1, 0.0)), ("cut", circle(0.4, 96, 0.08, 0.07)), ("add", star(5, 0.12, 0.05, 0.33, 0.2)), ("add", star(5, 0.08, 0.032, 0.25, -0.26))]


def crown():
    """A crown of three points, each with its pearl, over a band with three gems."""
    points = [(-0.42, -0.16), (0.42, -0.16), (0.47, 0.28), (0.22, 0.06), (0.0, 0.38), (-0.22, 0.06), (-0.47, 0.28)]
    pearls = [circle(0.065, 32, -0.47, 0.33), circle(0.075, 32, 0.0, 0.45), circle(0.065, 32, 0.47, 0.33)]
    gems = [circle(0.045, 24, x, -0.295) for x in (-0.22, 0.0, 0.22)]
    return [("add", points), ("add", rectangle(-0.45, -0.38, 0.45, -0.21))] + [("add", pearl) for pearl in pearls] + [("cut", gem) for gem in gems]


def tower():
    """A tower on its step, three merlons, an arched door and a window."""
    parts = [rectangle(-0.22, -0.4, 0.22, 0.16), rectangle(-0.3, 0.14, 0.3, 0.25), rectangle(-0.42, -0.52, 0.42, -0.4)]
    parts += [rectangle(-0.3, 0.24, -0.17, 0.42), rectangle(-0.065, 0.24, 0.065, 0.42), rectangle(0.17, 0.24, 0.3, 0.42)]
    door = [(-0.085, -0.42), (0.085, -0.42)] + [(0.085 * math.cos(math.pi * step / 12), -0.2 + 0.085 * math.sin(math.pi * step / 12)) for step in range(13)]
    return [("add", part) for part in parts] + [("cut", door), ("cut", rectangle(-0.03, -0.02, 0.03, 0.09))]


def rose():
    """A rose in bloom on its stem, with its sepals, two leaves and a thorn, as a tattoo's flash draws it, not as a coat of arms."""
    bloom = smooth([(-0.24, 0.12), (-0.3, 0.3), (-0.17, 0.46), (-0.04, 0.38), (0.0, 0.5), (0.1, 0.4), (0.22, 0.47), (0.31, 0.3), (0.24, 0.12), (0.1, 0.02), (-0.1, 0.02)], 8)
    petals = [[(-0.16, 0.38), (-0.03, 0.2), (0.06, 0.06), (0.0, 0.2), (-0.12, 0.38)], [(0.17, 0.4), (0.1, 0.24), (0.14, 0.08), (0.17, 0.24), (0.21, 0.39)],
              [(-0.22, 0.24), (-0.1, 0.14), (0.02, 0.08), (-0.1, 0.18), (-0.21, 0.29)]]
    stem = [(-0.005, 0.04), (0.045, 0.04), (0.035, -0.3), (0.0, -0.58), (-0.03, -0.58), (-0.01, -0.3)]
    leaves = [smooth([(0.02, -0.2), (0.16, -0.1), (0.34, -0.1), (0.24, -0.22), (0.1, -0.26)]), smooth([(0.0, -0.34), (-0.14, -0.26), (-0.32, -0.28), (-0.22, -0.4), (-0.08, -0.42)])]
    veins = [[(0.06, -0.19), (0.26, -0.13), (0.25, -0.15), (0.07, -0.21)], [(-0.04, -0.34), (-0.25, -0.31), (-0.24, -0.33), (-0.05, -0.36)]]
    thorns = [[(-0.02, 0.06), (-0.17, -0.03), (0.01, -0.01)], [(0.05, 0.06), (0.2, -0.02), (0.03, -0.01)], [(0.04, -0.03), (0.1, -0.06), (0.035, -0.1)],
              [(-0.012, -0.44), (-0.075, -0.47), (-0.02, -0.5)]]
    return ([("add", stem)] + [("add", leaf) for leaf in leaves] + [("add", thorn) for thorn in thorns] + [("add", bloom)] + [("cut", edge) for edge in petals]
            + [("cut", vein) for vein in veins])


def skull():
    """A skull: its eyes and nose cut out, its teeth apart."""
    cranium = smooth([(0.0, 0.5), (0.3, 0.42), (0.4, 0.18), (0.34, -0.06), (0.24, -0.16), (0.24, -0.3), (0.0, -0.3), (-0.24, -0.3), (-0.24, -0.16), (-0.34, -0.06), (-0.4, 0.18), (-0.3, 0.42)])
    jaw = smooth([(-0.2, -0.26), (0.2, -0.26), (0.19, -0.46), (0.0, -0.52), (-0.19, -0.46)])
    eyes = [smooth([(-0.26, 0.08), (-0.06, 0.1), (-0.07, -0.06), (-0.2, -0.1), (-0.28, -0.02)]), smooth([(0.26, 0.08), (0.06, 0.1), (0.07, -0.06), (0.2, -0.1), (0.28, -0.02)])]
    nose = [(0.0, -0.08), (0.06, -0.2), (-0.06, -0.2)]
    teeth = [rectangle(x - 0.012, -0.44, x + 0.012, -0.29) for x in (-0.1, 0.0, 0.1)]
    return [("add", cranium), ("add", jaw), ("cut", rectangle(-0.25, -0.3, 0.25, -0.275))] + [("cut", hole) for hole in eyes + [nose] + teeth]


def planet():
    """A planet with its ring, behind it above and before it below, a star and a moon."""
    turn = math.radians(-18)
    ring = ((0.6, 0.19), (0.48, 0.12))
    return [("add", circle(0.31, 96)), ("add", band(*ring, turn, 0, math.pi)), ("cut", band((0.64, 0.225), (0.44, 0.09), turn, math.pi, 2 * math.pi)),
            ("add", band(*ring, turn, math.pi, 2 * math.pi)), ("add", star(4, 0.08, 0.025, 0.42, 0.4)), ("add", circle(0.03, 16, -0.42, -0.4))]


def comet():
    """A comet: its head ringed apart from its tail, two streaks beside it, two stars."""
    head = (0.24, 0.24)
    tail = [(head[0] + 0.15 * math.cos(math.radians(135)), head[1] + 0.15 * math.sin(math.radians(135))), (-0.5, -0.36),
            (head[0] + 0.15 * math.cos(math.radians(-45)), head[1] + 0.15 * math.sin(math.radians(-45)))]
    streaks = [wedge((0.04, 0.4), (-0.42, -0.02), 0.04), wedge((0.4, 0.04), (0.02, -0.46), 0.04)]
    return ([("add", tail)] + [("add", streak) for streak in streaks] + [("cut", circle(0.2, 64, *head)), ("add", circle(0.155, 64, *head)),
            ("add", star(4, 0.07, 0.02, -0.3, 0.38)), ("add", star(4, 0.05, 0.016, 0.44, -0.3))])


def gear():
    """A gear of twelve teeth, its rim apart from its hub, six windows and an axle."""
    teeth = 12
    outline = []

    for tooth in range(teeth):
        start = 2 * math.pi * tooth / teeth

        for share, size in ((0.0, 0.43), (0.12, 0.54), (0.42, 0.54), (0.54, 0.43)):
            outline.append((size * math.cos(start + 2 * math.pi / teeth * share), size * math.sin(start + 2 * math.pi / teeth * share)))

    windows = [circle(0.075, 32, 0.27 * math.cos(math.pi / 2 + 2 * math.pi * step / 6), 0.27 * math.sin(math.pi / 2 + 2 * math.pi * step / 6)) for step in range(6)]
    return [("add", outline), ("cut", circle(0.37, 96)), ("add", circle(0.33, 96))] + [("cut", window) for window in windows] + [("cut", circle(0.11, 48))]


def bolt():
    """A bolt of lightning."""
    return [("add", [(0.16, 0.56), (-0.3, -0.02), (-0.03, -0.02), (-0.2, -0.56), (0.32, 0.1), (0.05, 0.1), (0.24, 0.56)])]


def eye():
    """An eye, open, its lashes as rays above it."""
    upper = [(x, 0.3 * (1 - (x / 0.56) ** 2) ** 0.9) for x in [0.56 - 1.12 * step / 40 for step in range(41)]]
    lower = [(x, -0.3 * (1 - (x / 0.56) ** 2) ** 0.9) for x in [-0.56 + 1.12 * step / 40 for step in range(1, 40)]]
    lid = upper + lower
    lashes = [ray(0.36, 0.56, math.radians(50 + 20 * step), 0.06) for step in range(5)]
    return ([("add", lid)] + [("add", lash) for lash in lashes] + [("cut", [(x * 0.84, y * 0.74) for x, y in lid]), ("add", circle(0.17, 64)), ("cut", circle(0.065, 32)),
            ("add", circle(0.03, 16, 0.035, 0.035))])


def compass():
    """A star of eight points, the four of the winds longer, its middle ringed."""
    return [("add", star(8, 0.58, 0.13, longer=0.36)), ("cut", circle(0.07, 32)), ("add", circle(0.035, 24))]


designs = {
    "sun": (sun, moon),
    "crown": (crown, tower),
    "rose": (rose, skull),
    "planet": (planet, comet),
    "gear": (gear, bolt),
    "eye": (eye, compass),
}


# The coin's mesh.

def counterclockwise(points):
    area = sum(points[index][0] * points[(index + 1) % len(points)][1] - points[(index + 1) % len(points)][0] * points[index][1] for index in range(len(points)))
    return points if area > 0 else list(reversed(points))


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


def face(coin, side, parts, field, picture):
    """One face: its field sunk inside the rim, in its colour, and its picture raised on it, in the other, part by part. Tails is drawn turned over, upright
    when the coin is."""
    sign = 1 if side == "heads" else -1
    top = sign * thickness / 2
    floor = top - sign * recess
    area = [circle(drawnRadius - rimWidth, 128)]
    boolean(coin, prism(f"field-{side}", area, floor, top + 1, field) if sign > 0 else prism(f"field-{side}", area, top - 1, floor, field), "DIFFERENCE")
    turned = (lambda points: points) if sign > 0 else (lambda points: [(x, -y) for x, y in points])
    low, high = (floor - 0.004, floor + relief) if sign > 0 else (floor - relief, floor + 0.004)
    raised = None

    for index, (step, outline) in enumerate(parts):
        if step == "cut":
            boolean(raised, prism(f"cut-{side}-{index}", [turned(outline)], low - 0.1, high + 0.1, picture), "DIFFERENCE")
            continue

        # Parts that overlap in a plane would leave the boolean unsure: each a breath higher than the last.
        lift = 0 if raised is None else (0.004 if index % 2 == 0 else 0.002) * sign
        part = prism(f"part-{side}-{index}", [turned(outline)], low if sign > 0 else low + lift, high + lift if sign > 0 else high, picture)

        if raised is None:
            raised = part
        else:
            boolean(raised, part, "UNION")

    boolean(coin, raised, "UNION")


def reeding(made):
    """The grooves across the edge, each a box from inside the edge to beyond it, between the bevels of the two faces."""
    grooves = []

    for step in range(reeds):
        angle = 2 * math.pi * step / reeds
        outward, across = (math.cos(angle), math.sin(angle)), (-math.sin(angle) * reedWidth / 2, math.cos(angle) * reedWidth / 2)
        inner, outer = drawnRadius - reedDepth, drawnRadius + 0.05
        grooves.append([(outward[0] * size + across[0] * side, outward[1] * size + across[1] * side) for size, side in ((inner, -1), (outer, -1), (outer, 1), (inner, 1))])

    margin = bevelWidth + 0.006
    return prism("reeds", grooves, -thickness / 2 + margin, thickness / 2 - margin, made)


def make_coin(design, body, ink):
    coin = prism("coin", [circle(drawnRadius, 160)], -thickness / 2, thickness / 2, body, weighted=True)
    bevel = coin.modifiers.new("bevel", "BEVEL")
    bevel.width = bevelWidth
    bevel.segments = 3
    bevel.limit_method = "WEIGHT"
    bpy.context.view_layer.objects.active = coin
    coin.select_set(True)
    bpy.ops.object.modifier_apply(modifier="bevel")
    coin.select_set(False)
    boolean(coin, reeding(body), "DIFFERENCE")
    heads, tails = designs[design]
    face(coin, "heads", heads(), body, ink)
    face(coin, "tails", tails(), ink, body)
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
    # Heads looks up when the coin's +z does, its picture's top along +y; tails when -z does, its top along -y, as it is drawn turned over.
    values = [{"value": 1, "up": gltf((0, 0, 1)), "top": gltf((0, 1, 0))}, {"value": 2, "up": gltf((0, 0, -1)), "top": gltf((0, -1, 0))}]
    return {"shape": {"vertices": vertices, "faces": [heads, tails]}, "values": values}


# The page's pictures.

def number(value):
    written = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if written in ("-0", "") else written


def path(outline):
    """An outline as an SVG path on the page's grid of 24, y down: a circle as two arcs, any other as its corners."""
    if isinstance(outline, Round):
        x, y, size = 12 + outline.x * grid, 12 - outline.y * grid, outline.size * grid
        return f"M{number(x - size)} {number(y)}a{number(size)} {number(size)} 0 1 0 {number(2 * size)} 0a{number(size)} {number(size)} 0 1 0 {number(-2 * size)} 0Z"

    corners = []

    for x, y in outline:
        corner = f"{number(12 + x * grid)} {number(12 - y * grid)}"

        if not corners or corners[-1] != corner:
            corners.append(corner)

    return "M" + "L".join(corners) + "Z"


def entry(step, outline):
    """A part as the code's formatting writes it: on one line, or on three past its width."""
    line = f"            [\"{step}\", \"{outline}\"],"
    return line if len(line) <= 240 else f"            [\n                \"{step}\",\n                \"{outline}\",\n            ],"


def pictures():
    """coin-pictures.ts: each design's faces, their parts in order, each added in the picture's colour or cut back in the field's."""
    lines = [
        "// Written by make-coin.py from its designs (D-526): change them there and run it again. Each design's faces as the page draws them, on a grid of 24, the",
        "// coin's radius 11: each part, in order, added to the picture or cut back from it, as the coin's relief is made.",
        "",
        "/** A part of a face's picture: added in the picture's colour, or cut back in the field's; and its outline, as an SVG path. */",
        "export type CoinPart = [\"add\" | \"cut\", string];",
        "",
        "/** The designs by name, in the order the page offers them, each its heads and its tails. */",
        "export const coinPictures: Record<string, { heads: CoinPart[]; tails: CoinPart[]; }> = {",
    ]

    for name, (heads, tails) in designs.items():
        lines.append(f"    {name}: {{")

        for side, parts in (("heads", heads()), ("tails", tails())):
            lines.append(f"        {side}: [")
            lines += [entry(step, path(outline)) for step, outline in parts]
            lines.append("        ],")

        lines.append("    },")

    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    chosen = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(designs)
    os.makedirs(out, exist_ok=True)

    for design in chosen:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        coin = make_coin(design, material("body", (0.69, 0.4, 0.05, 1)), material("ink", (0.01, 0.006, 0.002, 1)))
        coin.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=os.path.join(out, f"coin-{design}.glb"),
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
        print(f"Coin {design} written to {out}: {len(coin.data.polygons)} faces")

    with open(os.path.join(out, "coin.json"), "w", encoding="utf-8", newline="\n") as written:
        json.dump(physics(), written, separators=(",", ":"))
        written.write("\n")

    with open(os.path.join(here, "coin-pictures.ts"), "w", encoding="utf-8", newline="\n") as written:
        written.write(pictures())


main()
