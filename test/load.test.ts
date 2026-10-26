// What a character carries weighs (D-432; LOAD-1–LOAD-3), on the fake system: the sheet sums it against the limit, status says when it goes over it under the
// rigor «rules», and write asks a weight for an item that has none. The 5e's sizes and its pound go with it (D-514, step 8).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext, useSystem } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Locanda", "--type", "place");
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "might=5", "--set", "money=50 shilling, 10 penny");
    await ok("write", "Locanda", "--add", "contains=[[Ettore]]");
    await ok("write", "Lanterna di Ettore", "--type", "item", "--set", "item=[[Lantern]]");
    await ok("write", "Sacca di Ettore", "--type", "item", "--set", "heft=0,5 kg", "--add", "contains=[[Rushlight]] 3", "--add", "contains=[[Hardtack]] 2");
    await ok("write", "Lettera", "--type", "item");

    for (const entry of ["[[Lanterna di Ettore]]", "[[Sacca di Ettore]]", "[[Tallow]] 4", "[[Lettera]]", "un sasso liscio"]) {
        await ok("write", "Ettore", "--add", `inventory=${entry}`);
    }
});

afterEach(() => removeFolder(folder));

describe("the load a character carries", () => {
    it("sums items with their bases, what they hold, stacks and coins, against the system's limit (LOAD-1, LOAD-2)", async () => {
        // The lantern 1, the bag 0,5 with the decimal comma of its language, three rushlights 0.3, two hardtack 1, four tallow 2, sixty coins 0.5; the letter and the text weigh nothing. Might 5: 35.
        expect(await ok("show", "Ettore")).toContain("load 5.3 / 35 kg");
    });

    it("says under the rigor «rules» or «simulation» that a character carries more than the limit, and only then (LOAD-3)", async () => {
        await ok("write", "Ettore", "--set", "might=1");
        await ok("change", "Ettore", "Tallow", "--by", "20");
        expect(await ok("status")).not.toContain("over the limit");
        await ok("config", "rigor", "simulation");
        expect(await ok("status")).toContain("load 15.3 / 15 kg, over the limit");
        await ok("config", "rigor", "rules");
        expect(await ok("status")).toContain("load 15.3 / 15 kg, over the limit");
        await ok("write", "Ettore", "--set", "might=5");
        expect(await ok("status")).not.toContain("over the limit");
    });

    it("weighs a container whose weightless field is true without what it holds (LOAD-1)", async () => {
        await ok("write", "Sacco di Ettore", "--type", "item", "--set", "item=[[Hollow Sack]]", "--add", "contains=[[Tallow]] 10");
        await ok("write", "Ettore", "--add", "inventory=[[Sacco di Ettore]]");
        await ok("move", "Lanterna di Ettore", "--to", "Sacco di Ettore");
        // The lantern moved into the sack: 5.3 - 1 for it, + 1 for the sack, and nothing for the ten tallow.
        expect(await ok("show", "Ettore")).toContain("load 5.3 / 35 kg");
    });

    it("weighs a kind sold by the bundle by the field the system declares for it, never by a field of that name the system does not (LOAD-1, D-514)", async () => {
        // Twenty reed darts, two sheaves of 1 kg: 5.3 + 2.
        await ok("write", "Ettore", "--add", "inventory=[[Reed Darts]] 20");
        expect(await ok("show", "Ettore")).toContain("load 7.3 / 35 kg");
        // A kind of the campaign with bundle written, which the fake system does not declare: five pegs of 1 kg weigh 5.
        await ok("write", "Pioli", "--type", "item", "--set", "heft=1 kg", "--set", "bundle=5");
        await ok("write", "Ettore", "--add", "inventory=[[Pioli]] 5");
        expect(await ok("show", "Ettore")).toContain("load 12.3 / 35 kg");
    });

    it("counts a name of a kind sold by the bundle in pieces, by the field the system declares (STK-10, D-514)", async () => {
        const refused = await runCommandLine(["write", "Ettore", "--add", "inventory=[[Reed Darts (10)]] 2"], context);
        expect(refused.output).toBe(
            'There is no page named Reed Darts (10), but it is a name of Reed Darts, counted in pieces, 10 for each bought: write Ettore, add inventory="[[Reed Darts]] 20". Nothing changed.',
        );
    });

    it("asks a weight for an item written without one, its own or its base's", async () => {
        expect(await ok("write", "Sacco di farina", "--type", "item")).toContain('Sacco di farina has no heft, so it adds nothing to a load: if it weighs, estimate it from things like it, such as set heft="2 kg".');
        expect(await ok("write", "Lanterna di Bruna", "--type", "item", "--set", "item=[[Lantern]]")).not.toContain("has no heft");
        expect(await ok("write", "Pietra", "--type", "item", "--set", "heft=3 kg")).not.toContain("has no heft");
    });
});

// The 5e's: its sizes, its pound and its gear go with it (D-514, step 8).
describe("the 5e's load", () => {
    beforeEach(async () => {
        useSystem(folder, "5e");
        await ok("write", "Ettore", "--unset", "might", "--set", "str=14");
    });

    it("shows the load in kilograms to a player who counts in metric, at the system's pound (LOAD-2)", async () => {
        await ok("write", "Bruna", "--type", "character", "--set", "role=companion", "--set", "level=1", "--set", "str=10", "--set", "money=1,000 gp", "--add", "inventory=[[Waterskin]]");
        expect(await ok("show", "Bruna")).toContain("load 25 / 150 lb");
        const view = JSON.parse(await ok("view", "Bruna", "--json"));
        expect(JSON.stringify(view).match(/"field":"load","text":"([^"]+)"/)?.[1]).toBe("12.5 / 75 kg");
    });

    it("multiplies the limit by the factor of the size, written or from the race, and takes only the system's sizes (LOAD-4)", async () => {
        await ok("write", "Bruna", "--type", "character", "--set", "role=companion", "--set", "level=1", "--set", "str=10", "--add", "inventory=[[Waterskin]]");
        await ok("write", "Bruna", "--set", "size=Large");
        expect(await ok("show", "Bruna")).toContain("load 5 / 300 lb");
        await ok("write", "Bruna", "--set", "size=Tiny");
        expect(await ok("show", "Bruna")).toContain("load 5 / 75 lb");
        await ok("write", "Bruna", "--unset", "size");
        // A race of the campaign, larger than the SRD's: the character takes its size.
        await ok("write", "Mezzogigante", "--type", "creature", "--set", "category=race", "--set", "size=Large");
        await ok("write", "Bruna", "--set", "creature=[[Mezzogigante]]");
        expect(await ok("show", "Bruna")).toContain("load 5 / 300 lb");
        const refused = await runCommandLine(["write", "Bruna", "--set", "size=Grande"], context);
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toMatch(/^"Grande" is not one of the names size takes in the system 5e: Tiny, Small, Medium, Large, Huge, Gargantuan/);
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
