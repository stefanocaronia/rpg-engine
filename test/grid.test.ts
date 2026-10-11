// The map of a place (GRD-1–GRD-6, D-324): the grid as the master writes it, who stands where, the doors, the copies of a scene, what the player sees of it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import type { ShownGrid } from "../src/dashboard/data.ts";
import { drawnKinds, floorLoops, isStandable } from "../src/dashboard/place-map.ts";
import { closedSquare, mapBlock, readGrid, readSquare, squareName, withoutMapBlock } from "../src/grid/index.ts";
import { squareKinds } from "../src/map/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

// The inn of Guado: a hall with a hearth and tables, a door to the kitchen and the door out to the village.
const inn = [
    "```map",
    "##########",
    "#CC.t..#.#",
    "#......+.#",
    "#.t.~~.#k#",
    "####+#####",
    "",
    "C camino: hearth, blocks",
    "t tavolo: table, difficult",
    "~ pozza: water, difficult",
    "k botte: barrel, blocks",
    "E5 → [[Guado]]",
    "```",
].join("\n");

describe("the grid as the master writes it (GRD-1, GRD-2)", () => {
    it("reads the rows, a symbol a square, then the legend with its kinds and flags and where squares lead", () => {
        const { grid, problems } = readGrid(mapBlock(`Una locanda.\n\n${inn}\n`) ?? "");
        expect(problems).toEqual([]);
        expect([grid.columns, grid.rows]).toEqual([10, 5]);
        expect(grid.features.find((feature) => feature.symbol === "t")).toEqual({ symbol: "t", name: "tavolo", kind: "table", blocks: false, difficult: true, hidden: false });
        expect(grid.exits).toEqual([{ square: { column: 4, row: 4 }, to: "Guado" }]);
        expect(withoutMapBlock(`Una locanda.\n\n${inn}\n\nCon le stanze sopra.`)).toBe("Una locanda.\n\nCon le stanze sopra.");
        // A section that held only the map goes with it.
        expect(withoutMapBlock(`Una locanda.\n\n## Pianta\n\n${inn}\n\n## Storia\n\nAntica.`)).toBe("Una locanda.\n\n## Storia\n\nAntica.");
    });

    it("draws a door's sides along the wall with the wall's line, leaving open only its side toward the outside (D-334)", () => {
        const map: ShownGrid = {
            columns: 3,
            rows: 3,
            lines: ["###", "#.#", "#+#"],
            legend: [{ symbol: "#", name: "wall", kind: "wall", blocks: true }, { symbol: ".", name: "floor", kind: "floor" }, { symbol: "+", name: "door", kind: "door" }],
            ground: "floor",
            exits: [],
            at: [],
        };
        const edges = floorLoops(map, (column) => column, (row) => row).flat();
        // The door's left and right sides face walls and are drawn; its bottom side faces the outside and is left open.
        expect(edges.filter((edge) => edge.gap).map((edge) => [edge.x1, edge.y1, edge.x2, edge.y2])).toEqual([[2, 3, 1, 3]]);
        expect(edges.filter((edge) => !edge.gap && edge.y1 >= 2 && edge.y2 >= 2 && edge.x1 === edge.x2)).toHaveLength(2);
    });

    it("lets the legend rename and redraw the symbols every map has, never unblock them; the page draws every kind the engine names (D-325)", () => {
        const { grid, problems } = readGrid(["#.+", "", "# parete di roccia: rock", "+ cunicolo: opening", ". terra battuta: ground"].join("\n"));
        expect(problems).toEqual([]);
        expect(grid.features.slice(0, 3)).toMatchObject([
            { symbol: "#", name: "parete di roccia", kind: "rock", blocks: true },
            { symbol: ".", name: "terra battuta", kind: "ground", blocks: false },
            { symbol: "+", name: "cunicolo", kind: "opening", blocks: false },
        ]);
        expect(drawnKinds).toEqual([...squareKinds]);
    });

    it("names the squares from A1 at the top left, AA after Z; says why one cannot stand on a square", () => {
        expect([squareName({ column: 2, row: 3 }), squareName({ column: 26, row: 0 })]).toEqual(["C4", "AA1"]);
        expect([readSquare("c4"), readSquare("AA1"), readSquare("4C"), readSquare("C0")]).toEqual([{ column: 2, row: 3 }, { column: 26, row: 0 }, undefined, undefined]);
        const { grid } = readGrid(mapBlock(inn) ?? "");
        expect([closedSquare(grid, readSquare("A1") ?? { column: 0, row: 0 }), closedSquare(grid, { column: 1, row: 1 }), closedSquare(grid, { column: 3, row: 1 }), closedSquare(grid, { column: 20, row: 1 })])
            .toEqual(["A1 is a wall", "B2 is camino, which blocks", undefined, "U2 is outside the map"]);
    });

    it("says what of the legend cannot be read: a symbol it does not name, a line that is neither, the floor made to block, a flag it does not know", () => {
        const { problems } = readGrid(["#z.#", "", ". fango: mud, blocks", "t tavolo: table, sticky", "Ettore E6", "Z9 → [[Guado]]"].join("\n"));
        expect(problems).toEqual([
            '. is the map\'s floor, which never blocks and is never hidden: change only its name and kind, such as ". fango: mud".',
            "t tavolo has sticky, which the map does not know: after the kind come only blocks, difficult and hidden.",
            'The legend\'s line "Ettore E6" is neither a symbol, such as t table: table, difficult, nor an exit, such as G8 → [[Place]].',
            "Z9 is not a square of the map, which goes from A1 to D1: write the exit on one of its squares.",
            'The map has z, which its legend does not name: add a line such as "z barrel: barrel, blocks".',
        ]);
    });

    it("says which written characters make no square, an emoji or a tab, reads an accent written apart as one, and keeps one off a square the legend does not name", () => {
        const { grid, problems } = readGrid(["#.🌲.#", "#.e\u0301.#", "#.\t.z", "", "🌲 quercia: tree, blocks", "é erba: grass"].join("\n"));
        expect(grid.columns).toBe(5);
        expect(problems).toEqual([
            "The map has 🌲, which is not one character a square: use a letter or a sign, such as T, and name it in the legend.",
            "The map has a tab, which is not a square: write a space for each square outside the map, and a symbol for each of its squares.",
            'The map has z, which its legend does not name: add a line such as "z barrel: barrel, blocks".',
        ]);
        expect([closedSquare(grid, { column: 2, row: 0 }), closedSquare(grid, { column: 2, row: 1 }), closedSquare(grid, { column: 4, row: 2 })])
            .toEqual(["C1 is a square the map cannot read", undefined, "E3 is z, which the legend does not name"]);
    });

    it("says when an exit is written on a wall, where one coming in would stand", () => {
        expect(readGrid(["#####", "#...#", "#####", "", "C1 → [[Guado]]"].join("\n")).problems)
            .toEqual(["C1 leads to Guado, but C1 is a wall: write the exit on the door, or on the square one comes in by."]);
    });
});

describe("who stands where, in play (GRD-3, GRD-6)", () => {
    let folder: string;
    let context: Context;

    const ok = async (...args: string[]): Promise<string> => {
        const result = await runCommandLine(args, context);
        expect(result.exitCode, result.output).toBe(0);
        return result.output;
    };

    const refused = async (...args: string[]): Promise<string> => {
        const result = await runCommandLine(args, context);
        expect(result.exitCode, result.output).not.toBe(0);
        return result.output;
    };

    const innPage = (): string => readFileSync(join(folder, "world", "places", "Locanda.md"), "utf8");

    beforeEach(async () => {
        folder = makeTempFolder();
        context = testContext(folder);
        await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
        inPlay(folder);
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("write", "Bran", "--type", "character", "--set", "role=companion");
        await ok("write", "Oste", "--type", "character", "--set", "role=npc");
        await ok("write", "Locanda", "--type", "place", "--text", `Una locanda.\n\n${inn}`);
        await ok("write", "Guado", "--type", "place", "--add", "contains=[[Kira]]", "--add", "contains=[[Bran]]", "--add", "contains=[[Locanda]]");
    });

    afterEach(() => removeFolder(folder));

    it("puts whoever comes in from where a square leads on that square, and takes the squares away from who leaves", async () => {
        const output = await ok("move", "Kira", "Bran", "--to", "Locanda");
        expect(output).toContain("They stand where they came in: Kira on E5, Bran on E5.");
        expect(innPage()).toContain('- "[[Kira]] E5"');
        await ok("move", "Kira", "--to", "Guado");
        expect(innPage()).not.toContain("[[Kira]]");
        expect(innPage()).toContain("[[Bran]] E5");
    });

    it("moves one on the map of the place they are in, or into a place and onto its map; refuses walls, what blocks, places without a map, more than one", async () => {
        await ok("move", "Kira", "--to", "Locanda");
        // Through the pool, never across the corner of the wall by the door: three squares.
        expect(await ok("move", "Kira", "--at", "D3")).toBe("Kira: now on D3 in Locanda, 4.5 m from E5.");
        expect(innPage()).toContain("[[Kira]] D3");
        expect(innPage()).not.toContain("[[Kira]] E5");
        expect(await refused("move", "Kira", "--at", "B2")).toContain("B2 is camino, which blocks: Kira cannot stand there.");
        expect(await refused("move", "Kira", "--at", "A1")).toContain("A1 is a wall");
        expect(await refused("move", "Kira", "Bran", "--at", "D3")).toContain("Put one at a time on the map");
        expect(await refused("move", "Bran", "--at", "D3")).toContain("Guado has no map");
        // Into a place and onto a wall: refused before anything moves.
        expect(await refused("move", "Oste", "--to", "Locanda", "--at", "A1")).toContain("A1 is a wall");
        expect(innPage()).not.toContain("Oste");
        expect(await ok("move", "Oste", "--to", "Locanda", "--at", "H3")).toContain("Oste: now on H3 in Locanda.");
        expect(innPage()).toContain("[[Oste]] H3");
        expect(await ok("move", "Kira", "--at", "E2")).toBe("Kira: now on E2 in Locanda, 3 m from D3.\nE2 is tavolo, difficult ground.");
    });

    it("says how far one went by the shortest way, whose side they left on it and who stands next to them now; on their turn, what is left of their speed (GRD-5)", async () => {
        await ok("write", "Kira", "--set", "speed=30 ft");
        expect(await ok("move", "Kira", "--to", "Locanda", "--at", "B3")).toContain("Kira: now on B3 in Locanda, 7.5 m from E5, where Kira came in.");
        await ok("move", "Bran", "--to", "Locanda", "--at", "E2");
        await ok("scene", "open", "--title", "Rissa", "--type", "combat", "--place", "Locanda", "--with", "Kira", "--with", "Bran", "--creatures", "Bandit=1");
        expect(await ok("move", "Bandit 1", "--at", "C4")).toBe("Bandit 1: now on C4 in Locanda.\nC4 is tavolo, difficult ground.");
        await ok("scene", "order", "--order", "Kira", "--order", "Bandit 1", "--order", "Bran");
        expect(await ok("move", "Kira", "--at", "F3")).toBe([
            "Kira: now on F3 in Locanda, 6 m from B3.",
            "Next to Kira now: Bran.",
            "Along the shortest way Kira leaves the side of Bandit 1: read Opportunity Attacks.",
            "This turn Kira has moved 6 m of 9 m: 3 m left.",
        ].join("\n"));
        // Away from Bran, of her own side: no rule to read.
        const away = await ok("move", "Kira", "--at", "G4");
        expect(away).toContain("This turn Kira has moved 7.5 m of 9 m: 1.5 m left.");
        expect(away).not.toContain("leaves the side");
        expect(await ok("move", "Kira", "--at", "I3")).toContain("This turn Kira has moved 12 m, 3 m beyond the 9 m of Kira's speed: yours to judge, with what lets one go farther.");
        // Bran moves out of turn: only the way. On the bandit's turn, its speed is its creature's.
        expect(await ok("move", "Bran", "--at", "D2")).toBe("Bran: now on D2 in Locanda, 1.5 m from E2.");
        await ok("scene", "next");
        expect(await ok("move", "Bandit 1", "--at", "D3")).toContain("This turn Bandit 1 has moved 1.5 m of 9 m: 7.5 m left.");
    });

    it("puts one where no way on foot leads, and says so; says what of a large creature's squares it cannot fill (GRD-4, GRD-5)", async () => {
        await ok("write", "Cella", "--type", "place", "--text", "```map\n######\n#.#..#\n#....#\n######\n```", "--add", "contains=[[Oste]]");
        await ok("move", "Oste", "--at", "B2");
        await ok("write", "Cella", "--text", "```map\n######\n#.#..#\n###..#\n######\n```");
        expect(await ok("move", "Oste", "--at", "D2")).toBe("Oste: now on D2 in Cella.\nNo way on foot leads from B2 to D2: Oste stands there all the same, and how is yours to tell.");
        await ok("move", "Kira", "--to", "Locanda", "--at", "D3");
        await ok("scene", "open", "--title", "Orco", "--type", "combat", "--place", "Locanda", "--with", "Kira", "--creatures", "Ogre=1");
        await ok("move", "Ogre 1", "--at", "F2");
        expect(await ok("move", "Ogre 1", "--at", "G2")).toContain("Ogre 1 fills G2 to H3, but H2 is a wall.");
    });

    it("puts on a door only who comes in through it: not a thing put down by one who is there, nor one up from a place inside, nor on a wall (GRD-3)", async () => {
        await ok("move", "Kira", "--to", "Locanda", "--at", "D3");
        await ok("write", "Spada", "--type", "item");
        await ok("move", "Spada", "--to", "Kira");
        await ok("move", "Spada", "--to", "Locanda");
        expect(innPage()).not.toMatch(/\[\[Spada\]\] [A-Z]+\d/);
        await ok("write", "Cantina", "--type", "place");
        await ok("write", "Locanda", "--add", "contains=[[Cantina]]");
        await ok("move", "Bran", "--to", "Cantina");
        expect(await ok("move", "Bran", "--to", "Locanda")).toContain("Locanda has a map: put Bran on it");
        expect(innPage()).not.toContain("[[Bran]] E5");
        await ok("write", "Torre", "--type", "place", "--text", "```map\n#####\n#...#\n#####\n\nC1 → [[Locanda]]\n```");
        expect(await ok("move", "Kira", "--to", "Torre")).toContain("Torre has a map: put Kira on it");
    });

    it("puts the copies of the open scene on the map of its place, and takes them off when they leave or the scene closes", async () => {
        await ok("move", "Kira", "Bran", "--to", "Locanda");
        const opened = await ok("scene", "open", "--title", "Rissa", "--type", "combat", "--place", "Locanda", "--with", "Kira", "--with", "Bran", "--creatures", "Bandit=2");
        expect(opened).toContain("Locanda has a map: put Bandit 1, Bandit 2 on it, one at a time, such as page Bandit 1, at D2.");
        await ok("move", "Bandit 1", "--at", "I2");
        await ok("move", "Bandit 2", "--at", "I3");
        expect(innPage()).toContain("Bandit 1 I2");
        expect(await refused("move", "Bandit 1", "--to", "Guado", "--at", "D3")).toContain("Bandit 1 is a copy in the open scene");
        await ok("scene", "leave", "--who", "Bandit 1");
        expect(innPage()).not.toContain("Bandit 1");
        await ok("scene", "close", "--summary", "La rissa finisce.");
        expect(innPage()).not.toContain("Bandit 2");
    });

    it("asks for the copies on the map of the place the scene follows the party to (GRD-3)", async () => {
        await ok("write", "Grotta", "--type", "place", "--text", "```map\n#####\n#...#\n##+##\n\nC3 → [[Guado]]\n```");
        await ok("scene", "open", "--title", "Fuga", "--type", "combat", "--place", "Guado", "--with", "Kira", "--with", "Bran", "--creatures", "Bandit=1");
        const output = await ok("move", "Kira", "Bran", "--to", "Grotta");
        expect(output).toContain("They stand where they came in: Kira on C3, Bran on C3.");
        expect(output).toContain("Grotta has a map: put Bandit 1 on it");
    });

    it("gives the dashboard the map of the place where the party is, the text without it, who stands where as the character knows them (GRD-6)", async () => {
        await ok("move", "Kira", "Bran", "--to", "Locanda");
        await ok("move", "Oste", "--to", "Locanda", "--at", "H3");
        await ok("scene", "open", "--title", "Rissa", "--type", "combat", "--place", "Locanda", "--with", "Kira", "--with", "Bran", "--creatures", "Bandit=1");
        await ok("move", "Bandit 1", "--at", "D2");
        const place = JSON.parse(await ok("view", "--json")).place;
        expect(place.text).toBe("Una locanda.");
        expect(place.map).toMatchObject({ columns: 10, rows: 5, exits: [{ square: "E5", to: "Guado" }] });
        expect(place.map.legend.map((feature: { symbol: string; }) => feature.symbol)).toEqual(["#", ".", "+", "C", "t", "~", "k"]);
        // Kira and Bran by name; the innkeeper she does not know, out of the scene, not at all; the bandit as a creature.
        expect(place.map.at).toEqual([
            { name: "Kira", role: "pc", square: "E5" },
            { name: "Bran", role: "companion", square: "E5" },
            { name: "creature 1", role: "other", stranger: true, square: "D2", distance: "4.5 m" },
        ]);
        await ok("write", "Kira", "--add", "knows=[[Oste]]");
        expect(JSON.parse(await ok("view", "--json")).place.map.at).toContainEqual({ name: "Oste", role: "other", square: "H3", distance: "4.5 m" });
    });

    it("lets the page offer the player exactly the squares the engine lets one stand on (ASK-11)", async () => {
        await ok("move", "Kira", "--to", "Locanda");
        const map: ShownGrid = JSON.parse(await ok("view", "--json")).place.map;
        const { grid } = readGrid(mapBlock(inn) ?? "");
        // The map and a square beyond it each way, which is outside.
        const squares = Array.from({ length: (grid.rows + 1) * (grid.columns + 1) }, (_, index) => ({ column: index % (grid.columns + 1), row: Math.floor(index / (grid.columns + 1)) }));
        const offered = squares.filter((square) => isStandable(map, square)).map((square) => squareName(square));
        expect(offered).toEqual(squares.filter((square) => closedSquare(grid, square) === undefined).map((square) => squareName(square)));
        expect(offered).toContain("E5");
        expect(offered).not.toContain("B2");
    });

    it("gives the dashboard how far each one stands from the player character and how big, and on its turn the squares it can still reach, a hidden pit taken for the floor (D-328)", async () => {
        await ok("write", "Kira", "--set", "speed=10 ft");
        await ok("write", "Sala", "--type", "place", "--text", "```map\n#######\n#.....#\n#..^..#\n#.....#\n#######\n\n^ fossa: pit, blocks, hidden\n```");
        await ok("move", "Kira", "--to", "Sala", "--at", "B3");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--place", "Sala", "--with", "Kira", "--creatures", "Bandit=1", "--creatures", "Ogre=1");
        await ok("move", "Bandit 1", "--at", "D4");
        await ok("move", "Ogre 1", "--at", "E2");
        await ok("scene", "order", "--order", "Kira", "--order", "Bandit 1", "--order", "Ogre 1");
        const map = JSON.parse(await ok("view", "--json")).place.map;
        // Two kinds the character does not know: a letter for each, by their names (D-331).
        expect(map.at).toContainEqual(expect.objectContaining({ name: "creature A1", square: "D4", distance: "3 m" }));
        expect(map.at).toContainEqual(expect.objectContaining({ name: "creature B1", square: "E2", side: 2, distance: "4.5 m" }));
        expect(map.at.find((one: { role: string; }) => one.role === "pc")).not.toHaveProperty("distance");
        // Two squares of speed: the pit, which the player does not know, is a square like the others.
        expect(map.reach).toEqual(expect.arrayContaining(["B2", "C3", "D2", "D3"]));
        expect(map.reach).not.toContain("E3");
        await ok("scene", "next");
        expect(JSON.parse(await ok("view", "--json")).place.map.reach).toBeUndefined();
        // When the bandit leaves, the ogre keeps its letter: those who left are counted too.
        await ok("scene", "leave", "--who", "Bandit 1");
        expect(JSON.parse(await ok("view", "--json")).place.map.at).toContainEqual(expect.objectContaining({ name: "creature B1", square: "E2" }));
        const sheet = JSON.parse(await ok("view", "Kira", "--json")).sheet as { values: { field: string; text: string; }[]; }[];
        expect(sheet.flatMap((group) => group.values).find((value) => value.field === "speed")?.text).toBe("3 m");
    });

    it("draws the ground by the place: a building's floor, a cave's rock and its walls round, a village's paving, the forest it is in (D-325)", async () => {
        await ok("move", "Kira", "Bran", "--to", "Locanda");
        expect(JSON.parse(await ok("view", "--json")).place.map.ground).toBe("floor");
        await ok("write", "Locanda", "--set", "kind=cave");
        const cave = JSON.parse(await ok("view", "--json")).place.map;
        expect([cave.ground, cave.legend.find((feature: { symbol: string; }) => feature.symbol === "#").kind]).toEqual(["cave", "rock"]);
        await ok("write", "Radura", "--type", "place", "--text", "```map\n..T.\n....\n\nT quercia: tree, blocks\n```");
        await ok("write", "Bosco", "--type", "place", "--add", "environment=biome: forest", "--add", "contains=[[Radura]]");
        await ok("move", "Kira", "--to", "Radura");
        expect(JSON.parse(await ok("view", "--json")).place.map.ground).toBe("forest");
        await ok("write", "Guado", "--set", "kind=village", "--add", "contains=[[Bosco]]");
        await ok("write", "Bosco", "--unset", "environment");
        expect(JSON.parse(await ok("view", "--json")).place.map.ground).toBe("paving");
    });

    it("keeps from the player what is not found yet: a secret door looks like the wall, a trap like the floor, and neither is named nor where it leads (GRD-6)", async () => {
        const text = ["Una locanda.", "", "```map", "####", "#.^S", "####", "", "^ trappola a spuntoni: hazard, hidden", "S porta segreta: secret-door, hidden", "D2 → [[Cantina]]", "```"];
        await ok("write", "Locanda", "--text", text.join("\n"));
        await ok("move", "Kira", "--to", "Locanda", "--at", "B2");
        const map = JSON.parse(await ok("view", "--json")).place.map;
        expect(map.lines).toEqual(["####", "#..#", "####"]);
        expect(map.legend.map((feature: { symbol: string; }) => feature.symbol)).toEqual(["#", "."]);
        expect(map.exits).toEqual([]);
        expect(JSON.stringify(map)).not.toMatch(/trappola|segreta|Cantina/);
        expect(await ok("move", "Kira", "--at", "C2")).toContain("C2 is trappola a spuntoni, hidden: the player does not know it is there.");
    });

    it("tells the master which kinds of a map just written the dashboard draws neutral, and what of it does not read (GRD-2)", async () => {
        const output = await ok("write", "Torre", "--type", "place", "--text", "```map\n#c.\n\nc catapulta: siege-engine, blocks\n```");
        expect(output).toContain("The map draws c siege-engine neutral: its kinds are wall, rock, floor");
    });

    it("validate says what is wrong with a map and with who stands where (GRD-2, GRD-3)", async () => {
        await ok("write", "Locanda", "--text", `Una locanda.\n\n${inn.replace("k botte: barrel, blocks", "k botte: barrel, blocks\nE5 → [[Fiume]]")}`);
        await ok("write", "Locanda", "--add", "at=[[Bran]] D3", "--add", "at=[[Kira]] A1");
        const output = (await runCommandLine(["validate"], context)).output;
        expect(output).toContain("Locanda's map leads from E5 to Fiume, which is no page.");
        expect(output).toContain("Bran stands on D3 in Locanda, but is not in it.");
        expect(output).toContain("Kira stands on A1 in Locanda, but is not in it.");
    });

    it("validate says who stands on more than one square of a place (GRD-3)", async () => {
        await ok("move", "Kira", "--to", "Locanda", "--at", "D3");
        await ok("write", "Locanda", "--add", "at=[[kira]] C2");
        expect((await runCommandLine(["validate"], context)).output).toContain("Kira stands on more than one square in Locanda: D3, C2.");
    });
});
