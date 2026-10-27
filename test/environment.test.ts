// The environment of places (MECCANICHE, ENV-1–ENV-6): the cases of the table through the commands, and a law on places made at random, against a model.
import fc from "fast-check";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { changedEnvironment, environmentAt, formatEnvironmentEntry, loadWorld, type Page, readEnvironment, type World } from "../src/pages/index.ts";
import { explorationGuidance, inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc");
    await ok("write", "Lanterna", "--type", "item");
    await ok("write", "Ossario", "--type", "place", "--add", "contains=[[Ennio]]", "--add", "contains=[[Lanterna]]");
    await ok("write", "Cripta", "--type", "place", "--add", "contains=[[Ossario]]", "--add", "environment=light: dark");
    await ok("write", "Palude", "--type", "place", "--add", "contains=[[Cripta]]", "--add", "environment=light: grey", "--add", "environment=encounters: [[Palude#Incontri]]", "--text", "## Incontri\n\nLupi e fuochi fatui.");
    await ok("write", "Mulino", "--type", "place");
    await ok("write", "Palude", "--add", "contains=[[Mulino]]");
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

describe("the environment of a place (ENV-1–ENV-6)", () => {
    it("ENV-2, ENV-5: holds for all a place contains, entry by entry from the nearest place, shown with where each comes from", async () => {
        expect(await ok("show", "Ennio")).toContain("Is in: Ossario › Cripta › Palude\nAround: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude)");
        expect(await ok("show", "Ossario")).toContain("Around: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude)");
        expect(await ok("show", "Mulino")).toContain("Around: light: grey (Palude) · encounters: [[Palude#Incontri]] (Palude)");
        expect(await ok("show", "Lanterna")).not.toContain("Around");
        expect(await ok("status")).toContain("PC: Ennio, in Ossario › Cripta › Palude\nAround Ennio: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude)");
        expect(await ok("show", "Ennio")).not.toContain("environment:");
    });

    it("ENV-4: add puts an entry in or in place of the one with its name, remove takes it out by name, set gives them all", async () => {
        expect(await ok("write", "Cripta", "--add", "environment=terrain: mud")).toBe("Updated Cripta (place, world/places/Cripta.md): set environment.");
        expect(await ok("write", "Cripta", "--add", "environment=Light: dim")).toBe("Updated Cripta (place, world/places/Cripta.md): set environment.");
        expect(page("places/Cripta.md")).toContain('environment:\n  - "Light: dim"\n  - "terrain: mud"');
        await ok("write", "Cripta", "--remove", "environment=light");
        expect(page("places/Cripta.md")).toContain('environment:\n  - "terrain: mud"');
        await ok("write", "Cripta", "--remove", "environment=terrain");
        expect(page("places/Cripta.md")).not.toContain("environment");
        await ok("write", "Mulino", "--set", 'environment=["laws: no weapons", "terrain: wood"]');
        expect(await ok("show", "Mulino")).toContain("Around: laws: no weapons (Mulino) · terrain: wood (Mulino) · light: grey (Palude)");
    });

    it("ENV-4: refuses a line without a name or value, a name that could not be a field's, the same name twice, and a name it does not have", async () => {
        const how = "write a name as a field's, a colon and a value, such as light: dark.";
        expect(await refused("write", "Cripta", "--add", "environment=dark")).toBe(`"dark" is not an entry of environment: ${how}`);
        expect(await refused("write", "Cripta", "--add", "environment=light:")).toBe(`"light:" is not an entry of environment: ${how}`);
        expect(await refused("write", "Cripta", "--add", "environment=dark light: yes")).toBe(`"dark light: yes" is not an entry of environment: ${how}`);
        expect(await refused("write", "Mulino", "--set", 'environment=["light: dark", "LIGHT: dim"]')).toBe("The environment entry LIGHT is written twice: keep one.");
        expect(await refused("write", "Cripta", "--remove", "environment=terrain")).toBe("Cripta has no environment entry terrain. Its entries: light.");
    });

    it("ENV-1: a line written without quotes, which YAML reads as a map of one key, is the line it was", async () => {
        writeFileSync(join(folder, "world", "places", "Mulino.md"), "---\nenvironment:\n  - light: dim\n  - encounters: [[Mulino#Topi]]\n---\n\n## Topi\n\nTanti.\n");
        expect(await ok("show", "Mulino")).toContain("Around: light: dim (Mulino) · encounters: [[Mulino#Topi]] (Mulino)");
        expect(await ok("validate")).toBe("No problems.");
    });

    it("ENV-3: a place's effects hold for all it contains, with their end, until they end", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        await ok("effect", "add", "Palude", "Pioggia battente", "--for", "6h");
        expect(await ok("status")).toContain("Around Ennio: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude) · Pioggia battente until day 2, 00:00 (Palude)");
        expect(await ok("advance", "--by", "30m")).not.toContain("Around");
        const advanced = await ok("advance", "--by", "6h");
        expect(advanced).toContain("Ended: Pioggia battente on Palude.");
        expect(advanced).toContain("Around Ennio: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude).");
    });

    it("ENV-5: move says what changes around who moves, and scene open what holds in its place", async () => {
        expect(await ok("move", "Ennio", "--to", "Mulino")).toBe("Moved Ennio: now in Mulino › Palude.\nHere: light: grey (Palude).");
        await ok("write", "Mulino", "--add", "environment=terrain: wood");
        expect(await ok("move", "Ennio", "--to", "Palude")).toBe("Moved Ennio: now in Palude.\nNo longer: terrain: wood (Mulino).");
        expect(await ok("move", "Lanterna", "--to", "Ennio")).toBe("Moved Lanterna: now in Ennio › Palude.");
        expect(await ok("scene", "open", "--title", "Nella cripta", "--type", "exploration", "--place", "Cripta")).toBe(
            `Scene opened: Nella cripta (exploration) at Cripta. In it: Ennio.\nMoved into Cripta: Ennio.\nHere: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude).\n${explorationGuidance}`,
        );
    });

    it("ENV-2: a copy in the scene has the environment of the scene's place", async () => {
        await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--creatures", "Annegato=1");
        expect(await ok("show", "Annegato 1")).toContain("Around: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude)");
    });

    it("ENV-6: validate finds an environment that is no list, a line that does not read, a name written twice, and an environment on a page that is not a place", async () => {
        writeFileSync(join(folder, "world", "places", "Mulino.md"), '---\nenvironment: "light: dim"\n---\n');
        writeFileSync(join(folder, "world", "places", "Cripta.md"), '---\ncontains: ["[[Ossario]]"]\nenvironment: ["light: dark", "Light: dim"]\n---\n');
        writeFileSync(join(folder, "world", "places", "Ossario.md"), '---\ncontains: ["[[Ennio]]"]\nenvironment: ["buio"]\n---\n');
        writeFileSync(join(folder, "world", "characters", "Ennio.md"), '---\nrole: pc\nenvironment: ["light: dark"]\n---\n');
        const output = await ok("validate");
        expect(output).toContain('- world/places/Mulino.md: "environment" must be a list of lines, such as ["light: dark"]. Fix: write Mulino, set environment again with an allowed value.');
        expect(output).toContain('- world/places/Cripta.md: Cripta: The environment entry Light is written twice: keep one. Fix: write Cripta, set environment whole, such as ["light: dark"].');
        expect(output).toContain('- world/places/Ossario.md: Ossario: "buio" is not an entry of environment: write a name as a field\'s, a colon and a value, such as light: dark.');
        expect(output).toContain(
            "- world/characters/Ennio.md: Ennio has an environment, but only a place's holds, for all it contains. Fix: write Ennio, unset environment; what it does around itself, such as a lantern's light, is a field or an effect of its own.",
        );
    });
});

describe("the lines of an environment (ENV-1, ENV-4)", () => {
    it("ENV-1: reads lines, and the map of one key YAML makes of a line without quotes; anything else is no line", () => {
        const notLine = (item: unknown): string => `${JSON.stringify(item)} is not a line of environment: write it as name: value, in quotes, such as "light: dark".`;
        expect(readEnvironment(undefined)).toEqual({ entries: [] });
        expect(readEnvironment(["light: dark: deep", " Light2 :  dim ", { terrain: "mud" }, { laws: 3 }, { encounters: [["Palude#Incontri"]] }])).toEqual({
            entries: [{ name: "light", value: "dark: deep" }, { name: "Light2", value: "dim" }, { name: "terrain", value: "mud" }, { name: "laws", value: "3" }, { name: "encounters", value: "[[Palude#Incontri]]" }],
        });
        expect(readEnvironment("light: dark")).toEqual({ problem: 'environment must be a list of lines, one for each entry, such as ["light: dark"].' });

        for (const item of [42, null, ["light: dark"], { light: "dark", terrain: "mud" }, { light: null }, { light: { deep: true } }, { link: [["A", "B"]] }, { link: [[1]] }, { link: [["A"], ["B"]] }, { link: [] }]) {
            expect(readEnvironment([item]), JSON.stringify(item)).toEqual({ problem: notLine(item) });
        }

        for (const line of ["dark", ": dark", "light:", "dark light: yes", "9light: on"]) {
            expect(readEnvironment([line]), line).toEqual({ problem: `"${line}" is not an entry of environment: write a name as a field's, a colon and a value, such as light: dark.` });
        }
    });

    it("ENV-4: changes lines by name, and says what it cannot", () => {
        expect(changedEnvironment(["light: dark", "terrain: mud"], [], [" light : any"], "Cripta")).toEqual(["terrain: mud"]);
        expect(() => changedEnvironment("light: dark", [], [], "Cripta")).toThrow(
            'environment must be a list of lines, one for each entry, such as ["light: dark"]. Set it whole on Cripta, such as set environment=["light: dark"], or unset it.',
        );
        expect(() => changedEnvironment(undefined, [], ["light"], "Cripta")).toThrow("Cripta has no environment entry light. It has none.");
        expect(() => changedEnvironment(["light: dark", "terrain: mud"], [], ["laws"], "Cripta")).toThrow("Cripta has no environment entry laws. Its entries: light, terrain.");
        expect(() => changedEnvironment([], [{ a: 1, b: 2 }], [], "Cripta")).toThrow('{"a":1,"b":2} is not a line of environment');
    });
});

describe("what holds around (ENV-2, ENV-3)", () => {
    it("ENV-1, ENV-2: only places give an environment, read line by line: a line that does not read is left out, one without a value is missing, the last of a name holds", async () => {
        writeFileSync(join(folder, "world", "characters", "Ennio.md"), '---\nrole: pc\ninventory: ["[[Lanterna]]"]\nenvironment: ["light: bright"]\n---\n');
        writeFileSync(join(folder, "world", "places", "Ossario.md"), '---\ncontains: ["[[Ennio]]"]\nenvironment: ["buio", "terrain: mud", "laws:", "light: dim", "LIGHT: grey"]\n---\n');
        writeFileSync(join(folder, "world", "places", "Mulino.md"), '---\nenvironment: "terrain: wood"\n---\n');
        const world = loadWorld(folder);
        const around = (name: string): string[] => environmentAt(world, world.pages.find((page) => page.name === name) as Page).map(({ entry, place }) => `${formatEnvironmentEntry(entry)} (${place.name})`);
        const inOssario = ["terrain: mud (Ossario)", "LIGHT: grey (Ossario)", "encounters: [[Palude#Incontri]] (Palude)"];
        expect(around("Lanterna")).toEqual(inOssario);
        expect(around("Ennio")).toEqual(inOssario);
        expect(around("Ossario")).toEqual(inOssario);
        expect(around("Mulino")).toEqual(["terrain: wood (Mulino)", "light: grey (Palude)", "encounters: [[Palude#Incontri]] (Palude)"]);
    });

    it("ENV-5, CON-8: who goes inside a place that moves, as on a boat, hears what changes around them and who is there", async () => {
        await ok("write", "Varro", "--type", "character", "--set", "role=npc");
        await ok("move", "Varro", "--to", "Mulino");
        await ok("write", "Barca", "--type", "place");
        await ok("move", "Barca", "--to", "Ossario");
        await ok("move", "Ennio", "--to", "Barca");
        expect(await ok("move", "Barca", "--to", "Mulino")).toBe("Moved Barca: now in Mulino › Palude. There: Varro.\nHere: light: grey (Palude).");
        expect(await ok("show", "Ennio")).toContain("Is in: Barca › Mulino › Palude");
    });

    it("ENV-4, ENV-6: write gives an environment only to a place, says where an entry comes from, and writes lines; validate leaves a creature's alone", async () => {
        const own = "an environment holds only on a place, for all it contains. What a thing does around itself, such as a lantern's light, is a field or an effect of its own.";
        expect(await refused("write", "Lanterna", "--add", "environment=light: bright")).toBe(`Lanterna is an item: ${own}`);
        expect(await refused("write", "Ennio", "--set", 'environment=["light: bright"]')).toBe(`Ennio is a character: ${own}`);
        expect(await refused("write", "Ossario", "--remove", "environment=light")).toBe(
            'light holds in Ossario from Cripta: to change it in Ossario only, add environment="light: …" on Ossario; to remove it everywhere Cripta holds, write Cripta, remove environment=light.',
        );
        await ok("write", "Mulino", "--set", "environment=[light: dim, terrain: wood]");
        expect(page("places/Mulino.md")).toContain('environment:\n  - "light: dim"\n  - "terrain: wood"');
        await ok("write", "Lupo", "--type", "creature", "--set", "environment=boschi");
        writeFileSync(join(folder, "world", "items", "Lanterna.md"), '---\nenvironment: ["light: bright"]\n---\n');
        expect(await ok("validate")).toBe([
            "1 problem:",
            "- world/items/Lanterna.md: Lanterna has an environment, but only a place's holds, for all it contains. Fix: write Lanterna, unset environment; what it does around itself, such as a lantern's light, is a field or an effect of its own.",
        ].join("\n"));
        expect(await ok("write", "Lanterna", "--unset", "environment")).toBe("Updated Lanterna (item, world/items/Lanterna.md): removed environment.");
    });

    it("ENV-3 (D-157): an effect on a place holds by its name; a value named as an entry of the environment there is refused", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        expect(await refused("effect", "add", "Ossario", "Oscurità magica", "--for", "10m", "--set", "LIGHT=dark")).toBe(
            "LIGHT is in the environment of Cripta: an effect on a place holds for all inside by its name and end, and its values are the place's own. Leave LIGHT out and let the name say it, such as Magical darkness.",
        );
        expect(await ok("effect", "add", "Ossario", "Oscurità magica", "--for", "10m")).toBe("Ossario: Oscurità magica until day 1, 18:10.");
        // On a character, a value nothing of the page or the system reads changes nothing: refused, whatever the environment says (D-518).
        expect(await refused("effect", "add", "Ennio", "Scudo", "--for", "10m", "--set", "light=dark")).toContain("light is no field of Ennio nor of the system");
        expect(await ok("status")).toContain("Around Ennio: light: dark (Cripta) · encounters: [[Palude#Incontri]] (Palude) · Oscurità magica until day 1, 18:10 (Ossario)");
    });

    it("ENV-3: what a place's effects hold changes with the place too, and a scene without a place has no surroundings", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        await ok("effect", "add", "Palude", "Nebbia", "--for", "6h");
        await ok("effect", "add", "Mulino", "Fuoco nel camino", "--for", "2h");
        expect(await ok("move", "Ennio", "--to", "Mulino")).toBe(
            "Moved Ennio: now in Mulino › Palude.\nHere: light: grey (Palude) · Fuoco nel camino until day 1, 20:00 (Mulino).",
        );
        expect(await ok("move", "Ennio", "--to", "Cripta")).toBe("Moved Ennio: now in Cripta › Palude.\nHere: light: dark (Cripta). No longer: Fuoco nel camino until day 1, 20:00 (Mulino).");
        await ok("write", "Errante", "--type", "character", "--set", "role=pc");
        await ok("write", "Ennio", "--set", "role=npc");
        await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22");
        await ok("scene", "open", "--title", "Nel nulla", "--type", "other", "--creatures", "Annegato=1");
        expect(await ok("show", "Annegato 1")).not.toContain("Around");
    });
});

// Places made at random as a forest, each in at most one place that comes before it, with entries of a few names; a character in some of them.
const placeNames = ["Regione", "Palude", "Mulino", "Cripta", "Ossario", "Pozzo"];
const entryNames = ["light", "terrain", "laws"];
const forests = fc.record({
    parents: fc.tuple(...placeNames.map((_, index) => fc.option(fc.nat({ max: Math.max(0, index - 1) }), { nil: undefined }))),
    entries: fc.tuple(...placeNames.map(() => fc.subarray(entryNames).chain((names) => fc.tuple(...names.map((name) => fc.constantFrom(`${name}: a`, `${name}: b`, `${name.toUpperCase()}: c`)))))),
    where: fc.nat({ max: placeNames.length - 1 }),
});

describe("the law of the environment, on places made at random", () => {
    it("ENV-2: what holds at a page is, entry by entry, the value of the nearest place that has it, as a model gathering them from the top down says", () => {
        fc.assert(
            fc.property(forests, ({ parents, entries, where }) => {
                const parentOf = (index: number): number | undefined => (index === 0 || parents[index] === undefined || (parents[index] ?? 0) >= index ? undefined : parents[index]);
                const children = (index: number): string[] => placeNames.filter((_, other) => parentOf(other) === index).map((name) => `[[${name}]]`);
                const pages: Page[] = placeNames.map((name, index) => ({
                    name,
                    type: "place",
                    path: `world/places/${name}.md`,
                    fields: { contains: [...children(index), ...(index === where ? ["[[Ennio]]"] : [])], environment: entries[index] },
                    body: "",
                }));
                pages.push({ name: "Ennio", type: "character", path: "world/characters/Ennio.md", fields: { role: "pc" }, body: "" });
                const world: World = { root: "", pages, problems: [] };

                for (const [index, page] of [...pages.entries()]) {
                    const found = environmentAt(world, page).map(({ entry, place }) => `${entry.name.toLowerCase()}=${entry.value}@${place.name}`).sort();
                    expect(found, page.name).toEqual(modelAt(index === placeNames.length ? where : index, parentOf, entries).sort());
                }
            }),
            { numRuns: 1000 },
        );
    });
});

/** The model: from the top place down to the page, each place's entries take the place of those with the same name above it. */
function modelAt(index: number, parentOf: (index: number) => number | undefined, entries: string[][]): string[]
{
    const chain: number[] = [];

    for (let current: number | undefined = index; current !== undefined; current = parentOf(current)) {
        chain.unshift(current);
    }

    const holding = new Map<string, string>();

    for (const place of chain) {
        for (const line of entries[place]) {
            const [name, value] = line.split(": ");
            holding.set(name.toLowerCase(), `${name.toLowerCase()}=${value}@${placeNames[place]}`);
        }
    }

    return [...holding.values()];
}
