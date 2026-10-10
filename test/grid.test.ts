// The map of a place (GRD-1–GRD-6, D-324): the grid as the master writes it, who stands where, the doors, the copies of a scene, what the player sees of it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { drawnKinds } from "../src/dashboard/place-map.ts";
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
        expect(await ok("move", "Kira", "--at", "D3")).toBe("Kira: now on D3 in Locanda.");
        expect(innPage()).toContain("[[Kira]] D3");
        expect(innPage()).not.toContain("[[Kira]] E5");
        expect(await refused("move", "Kira", "--at", "B2")).toContain("B2 is camino, which blocks: Kira cannot stand there.");
        expect(await refused("move", "Kira", "--at", "A1")).toContain("A1 is a wall");
        expect(await refused("move", "Kira", "Bran", "--at", "D3")).toContain("Put one at a time on the map");
        expect(await refused("move", "Bran", "--at", "D3")).toContain("Guado has no map");
        expect(await ok("move", "Oste", "--to", "Locanda", "--at", "H3")).toContain("Oste: now on H3 in Locanda.");
        expect(innPage()).toContain("[[Oste]] H3");
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
            { name: "creature 1", role: "other", stranger: true, square: "D2" },
        ]);
        await ok("write", "Kira", "--add", "knows=[[Oste]]");
        expect(JSON.parse(await ok("view", "--json")).place.map.at).toContainEqual({ name: "Oste", role: "other", square: "H3" });
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

    it("keeps from the player what is not found yet: a secret door looks like the wall, a trap like the floor, and neither is named (GRD-6)", async () => {
        await ok("write", "Locanda", "--text", ["Una locanda.", "", "```map", "####", "#.^S", "####", "", "^ trappola a spuntoni: hazard, hidden", "S porta segreta: secret-door, hidden", "```"].join("\n"));
        await ok("move", "Kira", "--to", "Locanda", "--at", "B2");
        const map = JSON.parse(await ok("view", "--json")).place.map;
        expect(map.lines).toEqual(["####", "#..#", "####"]);
        expect(map.legend.map((feature: { symbol: string; }) => feature.symbol)).toEqual(["#", "."]);
        expect(JSON.stringify(map)).not.toMatch(/trappola|segreta/);
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
});
