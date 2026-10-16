// The speed the sheet works out (D-445; SPD-1, SPD-2, SPD-3): the written one from the race or the creature, then what adds, the factors, the cap of a load
// under the rigor rules and the conditions that stop one, in every mode.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("config", "units", "imperial");
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "creature=[[Human]]", "--set", "str=10");
    await ok("write", "Cotta di Ettore", "--type", "item", "--set", "item=[[Chain Mail]]");
});

afterEach(() => removeFolder(folder));

describe("the speed a sheet works out", () => {
    it("starts from the race, and shows the written one beside it (SPD-1)", async () => {
        expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
        await ok("write", "Brom", "--type", "character", "--set", "role=companion", "--set", "creature=[[Hill Dwarf]]", "--set", "level=1", "--set", "str=10");
        expect(await walking("Brom")).toBe("walking 25 ft (25 ft)");
    });

    it("takes 10 ft for a heavy armor without its Strength, but not from a dwarf, nor under the rigor «simulation» (SPD-3)", async () => {
        await wear("Ettore");
        expect(await walking("Ettore")).toBe("walking 20 ft (30 ft)");
        await ok("write", "Ettore", "--set", "str=13");
        expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
        await ok("write", "Ettore", "--set", "str=10", "--set", "creature=[[Hill Dwarf]]");
        expect(await walking("Ettore")).toBe("walking 25 ft (25 ft)");
    });

    it("weighs the load by rigor: under «rules» 5 ft past the limit; under «simulation» −10 past Str×5, −20 past Str×10 (SPD-3)", async () => {
        await ok("write", "Ettore", "--add", "inventory=[[Iron Pot]] 14");
        await ok("config", "rigor", "rules");
        expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
        await ok("change", "Ettore", "Iron Pot", "--by", "2");
        expect(await walking("Ettore")).toBe("walking 5 ft (30 ft)");
        await ok("config", "rigor", "simulation");
        expect(await walking("Ettore")).toBe("walking 10 ft (30 ft)");
        await ok("config", "rigor", "smooth");
        expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
    });

    it("tells the same speed in an effect's output and on the sheet, for an overloaded character too (SPD-1)", async () => {
        await ok("config", "rigor", "rules");
        await ok("write", "Ettore", "--add", "inventory=[[Iron Pot]] 20");
        expect(await walking("Ettore")).toBe("walking 5 ft (30 ft)");
        expect(await ok("effect", "add", "Ettore", "Passo veloce", "--set", "bonus-speed=10")).not.toContain("walking 5 ft →");
        expect(await walking("Ettore")).toBe("walking 5 ft (30 ft)");
    });

    it("adds what effects add, multiplies their factors, halves with exhaustion 2, and stops at 5 or with a condition that stops one (SPD-2)", async () => {
        await ok("effect", "add", "Ettore", "Longstrider", "--set", "bonus-speed=10");
        expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
        await ok("effect", "add", "Ettore", "Haste", "--set", "speed-factor=2");
        expect(await walking("Ettore")).toBe("walking 80 ft (30 ft)");
        await ok("effect", "add", "Ettore", "Slow", "--set", "speed-factor=1/2");
        expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
        const half = await runCommandLine(["effect", "add", "Ettore", "Mezzo", "--set", "speed-factor=half"], context);
        expect(half.output).toBe('speed-factor on Ettore is a factor: give what the effect multiplies by, such as speed-factor=2 or speed-factor=1/2, not "half". Nothing changed.');
        await ok("effect", "end", "Ettore", "Haste");
        await ok("effect", "end", "Ettore", "Slow");
        await ok("write", "Ettore", "--set", "exhaustion=2");
        expect(await walking("Ettore")).toBe("walking 20 ft (30 ft)");
        await ok("change", "Ettore", "exhaustion", "--to", "0");
        await ok("effect", "add", "Ettore", "Grappled");
        expect(await walking("Ettore")).toBe("walking 0 ft (30 ft)");
    });

    it("adds Fast Movement without heavy armor and Unarmored Movement without armor or shield; a thief with Second-Story Work climbs at walking speed (SPD-3)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Barbarian]] 5");
        expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
        await wear("Ettore");
        expect(await walking("Ettore")).toBe("walking 20 ft (30 ft)");
        await ok("write", "Ettore", "--remove", "equipped=[[Cotta di Ettore]]");
        await ok("write", "Ettore", "--set", "classes=[[Monk]] 2");
        expect(await walking("Ettore")).toBe("walking 40 ft (30 ft)");
        await ok("write", "Ettore", "--add", "inventory=[[Shield]]", "--add", "equipped=[[Shield]]");
        expect(await walking("Ettore")).toBe("walking 30 ft (30 ft)");
        await ok("write", "Ettore", "--remove", "equipped=[[Shield]]", "--set", "classes=[[Rogue]] 3", "--set", "subclasses=[[Thief]]");
        expect(await ok("show", "Ettore")).toContain("walking 30 ft (30 ft) · climbing 30 ft");
    });

    it("rolls Stealth from the sheet with two d20, the lower kept, in an armor whose Stealth column says so (D-445)", async () => {
        await ok("write", "Ettore", "--set", "dex=12");

        const stealth = async (): Promise<string | undefined> => {
            const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; roll?: { notation: string; }; }[]; }[];
            return sheet.flatMap((group) => group.values).find((value) => value.field === "stealth")?.roll?.notation;
        };

        expect(await stealth()).toBe("1d20+1");
        await wear("Ettore");
        expect(await stealth()).toBe("2d20kl1+1");
    });

    it("tells the speed worked out in metres to a player who counts in metric (SPD-1)", async () => {
        await ok("config", "units", "metric");
        await wear("Ettore");
        const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; text: string; }[]; }[];
        expect(sheet.flatMap((group) => group.values).find((value) => value.field === "walking")?.text).toBe("6 m");
    });

    it("works out every mode the page has, the same way (SPD-1, SPD-2)", async () => {
        await ok("effect", "add", "Ettore", "Fly", "--set", "fly=60 ft");
        await ok("effect", "add", "Ettore", "Haste", "--set", "speed-factor=2");
        const shown = await ok("show", "Ettore");
        expect(shown).toContain("walking 60 ft (30 ft) · flying 120 ft");
    });

    it("reads a speed with a note in brackets after it, as a ghost's fly 40 ft (hover) (FOR-2, SPD-1)", async () => {
        await ok("write", "Fantasma", "--type", "character", "--set", "role=npc", "--set", "creature=[[Ghost]]");
        expect(await ok("show", "Fantasma")).toContain("flying 40 ft");
    });
});

/** The walking speed on a character's sheet, with the written one beside it. */
async function walking(name: string): Promise<string>
{
    return /walking [^(·\n]*\([^)]*\)/.exec(await ok("show", name))?.[0] ?? "";
}

async function wear(name: string): Promise<void>
{
    await ok("write", name, "--add", "inventory=[[Cotta di Ettore]]");
    await ok("write", name, "--add", "equipped=[[Cotta di Ettore]]");
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("jumping, pushing and holding one's breath (D-449)", () => {
    it("works them out for a character with classes, from Strength, size and Constitution", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "str=15", "--set", "con=14");
        const shown = await ok("show", "Ettore");
        expect(shown).toContain("long-jump 15 ft · high-jump 5 ft · push-drag 450 · hold-breath 3");
    });
});
