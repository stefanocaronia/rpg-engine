// What a character carries weighs (D-432; LOAD-1, LOAD-2, LOAD-3): the sheet sums it against the limit, status says when it goes over it under the rigor
// «rules», and write asks a weight for an item that has none.
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
    await ok("write", "Locanda", "--type", "place");
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "str=14", "--set", "money=50 gp, 25 sp");
    await ok("write", "Locanda", "--add", "contains=[[Ettore]]");
    await ok("write", "Cotta di Ettore", "--type", "item", "--set", "item=[[Chain Mail]]");
    await ok("write", "Zaino di Ettore", "--type", "item", "--set", "item=[[Backpack]]", "--add", "contains=[[Torch]] 3", "--add", "contains=[[Rations]] 2");
    await ok("write", "Lettera", "--type", "item");

    for (const entry of ["[[Cotta di Ettore]]", "[[Zaino di Ettore]]", "[[Arrows]] 40", "[[Lettera]]", "un sasso liscio"]) {
        await ok("write", "Ettore", "--add", `inventory=${entry}`);
    }
});

afterEach(() => removeFolder(folder));

describe("the load a character carries", () => {
    it("sums items with their bases, what they hold, stacks by their bundle and coins, against Strength times 15 (LOAD-1, LOAD-2)", async () => {
        // Chain mail 55, backpack 5, three torches 3, two rations 4, forty arrows 2, seventy-five coins 1.5; the letter and the text weigh nothing.
        expect(await ok("show", "Ettore")).toContain("load 70.5 / 210 lb");
    });

    it("shows the load in kilograms to a player who counts in metric, at the system's pound (LOAD-2)", async () => {
        const view = JSON.parse(await ok("view", "Ettore", "--json"));
        const values = JSON.stringify(view).match(/"field":"load","text":"([^"]+)"/)?.[1];
        expect(values).toBe("35.3 / 105 kg");
    });

    it("says under the rigor «rules» that a character carries more than the limit, and only then (LOAD-3)", async () => {
        await ok("write", "Ettore", "--set", "str=3");
        expect(await ok("status")).not.toContain("over the limit");
        await ok("config", "rigor", "rules");
        expect(await ok("status")).toContain("load 70.5 / 45 lb, over the limit");
        await ok("write", "Ettore", "--set", "str=14");
        expect(await ok("status")).not.toContain("over the limit");
    });

    it("multiplies the limit by the factor of the size, written or from the race, and takes only the system's sizes (LOAD-4)", async () => {
        await ok("write", "Ettore", "--set", "size=Large");
        expect(await ok("show", "Ettore")).toContain("load 70.5 / 420 lb");
        await ok("write", "Ettore", "--set", "size=Tiny");
        expect(await ok("show", "Ettore")).toContain("load 70.5 / 105 lb");
        await ok("write", "Ettore", "--unset", "size");
        // A race of the campaign, larger than the SRD's: the character takes its size.
        await ok("write", "Mezzogigante", "--type", "creature", "--set", "category=race", "--set", "size=Large");
        await ok("write", "Ettore", "--set", "creature=[[Mezzogigante]]");
        expect(await ok("show", "Ettore")).toContain("load 70.5 / 420 lb");
        const refused = await runCommandLine(["write", "Ettore", "--set", "size=Grande"], context);
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toMatch(/^"Grande" is not one of the names size takes in the system 5e: Tiny, Small, Medium, Large, Huge, Gargantuan/);
    });

    it("weighs a container whose weightless field is true without what it holds, as a Bag of Holding (LOAD-1)", async () => {
        await ok("write", "Borsa di Ettore", "--type", "item", "--set", "item=[[Bag of Holding]]", "--add", "contains=[[Torch]] 10");
        await ok("write", "Ettore", "--add", "inventory=[[Borsa di Ettore]]");
        await ok("move", "Cotta di Ettore", "--to", "Borsa di Ettore");
        // The chain mail moved into the bag: 70.5 - 55 for it, + 15 for the bag, and nothing for the ten torches.
        expect(await ok("show", "Ettore")).toContain("load 30.5 / 210 lb");
    });

    it("weighs a waterskin's 5 lb (full) and a thousand coins written with a comma (LOAD-1)", async () => {
        await ok("write", "Bruna", "--type", "character", "--set", "role=companion", "--set", "level=1", "--set", "str=10", "--set", "money=1,000 gp", "--add", "inventory=[[Waterskin]]");
        expect(await ok("show", "Bruna")).toContain("load 25 / 150 lb");
    });

    it("asks a weight for an item written without one, its own or its base's", async () => {
        expect(await ok("write", "Sacco di farina", "--type", "item")).toContain('Sacco di farina has no weight, so it adds nothing to a load: if it weighs, estimate it from things like it, such as set weight="2 lb".');
        expect(await ok("write", "Spada di Ettore", "--type", "item", "--set", "item=[[Longsword]]")).not.toContain("has no weight");
        expect(await ok("write", "Pietra", "--type", "item", "--set", "weight=3 lb")).not.toContain("has no weight");
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
