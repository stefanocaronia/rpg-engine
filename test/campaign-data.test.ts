// What a campaign adds to its game system (D-223, CAM-1–CAM-3) and the rolls kept for later (D-213, KEP-1–KEP-4), through the commands on the 5e.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--system", "5e", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

/** A fighter of the party, its abilities at 14. */
async function fighter(name: string, ...fields: string[]): Promise<string>
{
    const base = ["role=pc", "creature=[[Human]]", "str=14", "dex=14", "con=14", "int=14", "wis=14", "cha=14", "hp-base=40"];
    return ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
}

function campaignFile(): string
{
    return readFileSync(join(folder, "campaign.yaml"), "utf8");
}

describe("what the campaign adds to its game system (CAM-1–CAM-3)", () => {
    it("adds a subclass's uses with their table, brings them back with the system's rest, and keeps them in campaign.yaml", async () => {
        await ok("config", "tables", "superiority-dice-by-level: {0: 0, 3: 4, 7: 5, 15: 6}");
        await ok("config", "counters", 'superiority-dice: {max: "has(subclasses, Battle Master) * table(superiority-dice-by-level, item(classes, Fighter))", refill: short rest}');
        expect(campaignFile()).toContain("superiority-dice:\n    max: has(subclasses, Battle Master) * table(superiority-dice-by-level, item(classes, Fighter))\n    refill: short rest");
        expect(await fighter("Gara", "classes=[[Fighter]] 7", "subclasses=[[Battle Master]]")).toContain("superiority-dice 5/5");
        await ok("change", "Gara", "superiority-dice", "--by=-3");
        expect(await ok("change", "--recipe", "short rest")).toContain("superiority-dice 2/5 → 5/5");
        expect(await ok("config", "counters")).toContain("counters: { superiority-dice: { max:");
    });

    it("puts a house rule's formula in place of the system's (D-200), and adds to the system's recipe instead of replacing it", async () => {
        await ok("config", "computed", '"passive-perception": "10 + perception + 5 * has(feats, Observant)"');
        await fighter("Gara", "classes=[[Fighter]] 1", "feats=[Observant]");
        expect(await ok("status")).toContain("passive-perception 17");
        await ok("config", "recipes", "long rest: {rules: [Superiority Dice]}");
        await ok("change", "Gara", "hp", "--by=-5");
        const rest = await ok("change", "--recipe", "long rest");
        expect(rest).toContain("hp 37/42 → 42/42");
        expect(rest).toContain('For the rest, read rules "Long Rest" and rules "Superiority Dice".');
    });

    it("adds fields to the line of the player character, and removes an entry by name", async () => {
        await ok("config", "status-line", "--add", "xp");
        await fighter("Gara", "classes=[[Fighter]] 1", "xp=10");
        expect(await ok("status")).toMatch(/PC: Gara.*· xp 10/);
        await ok("config", "tables", "uno: {1: 1}");
        await ok("config", "tables", "--remove", "uno");
        expect(campaignFile()).not.toContain("tables");
        expect(await refused("config", "tables", "--remove", "uno")).toContain('"tables" has no entry "uno", so nothing changed. It has: none.');
    });

    it("refuses what would not read, and plays with the system alone when campaign.yaml has it by hand, which validate reports", async () => {
        expect(await refused("config", "counters", 'broken: {max: "1 +"}')).toBe(
            'With this, the system 5e would not read: counters.broken.max: "1 +" is not a formula: a number, a field, a function or ( was expected at the end. Nothing changed.',
        );
        expect(await refused("config", "counters", "[1, 2]")).toContain("counters takes entries by name");
        expect(await refused("config", "counters", "--add", "x")).toContain('"counters" takes entries by name as the value');
        writeFileSync(join(folder, "campaign.yaml"), `${campaignFile()}computed:\n  level: "sum(classes) +"\n`);
        await fighter("Gara", "classes=[[Fighter]] 2");
        expect(await ok("status")).toContain("level 2");
        expect(await ok("validate")).toContain('What campaign.yaml adds to the system 5e does not read, so the campaign plays with the system alone: computed.level: "sum(classes) +" is not a formula');
    });
});

describe("rolls kept for later (KEP-1–KEP-4)", () => {
    beforeEach(async () => {
        await ok("config", "fields", "portent: rolls");
        await fighter("Elara", "classes=[[Wizard]] 2");
    });

    it("keeps the dice the player rolls, in place of those kept before, and shows them in the line", async () => {
        expect(await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=14,3")).toContain("Elara keeps in portent: 14, 3.");
        expect(await ok("status")).toContain("portent 14, 3");
        expect(await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=9,18")).toContain("Elara keeps in portent: 9, 18, in place of 14, 3.");
        expect(readLogFile(folder).at(-1)?.data).toMatchObject({ kept: { field: "portent", values: [9, 18] } });
    });

    it("uses a kept number in place of the die, takes it away and logs which roll it replaced", async () => {
        await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=14,3");
        const used = await ok("roll", "1d20+2", "--who", "Goblin", "--use", "portent=3", "--from", "Elara", "--why", "save against Hold Person");
        expect(used).toContain("Goblin, save against Hold Person: 1d20+2 = 5 [3] + 2");
        expect(used).toContain("3 from Elara's portent took the place of the die; left: 14.");
        expect(readLogFile(folder).at(-1)?.data).toMatchObject({ total: 5, used: { from: "Elara", field: "portent", value: 3 } });
        expect(await ok("roll", "1d20+5", "--who", "Elara", "--use", "portent=14")).toContain("none is left");
        expect(await ok("status")).not.toContain("portent");
    });

    it("refuses a number not kept, a notation with more than one die, and a field not declared as kept rolls", async () => {
        await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=14,3");
        expect(await refused("roll", "1d20", "--use", "portent=7", "--from", "Elara")).toBe("Elara keeps no 7 in portent: it keeps 14, 3. Nothing rolled.");
        expect(await refused("roll", "2d20kh1", "--use", "portent=3", "--from", "Elara")).toContain("A kept roll takes the place of one die: give a notation with one, such as 1d20+2");
        expect(await refused("roll", "2d20", "--who", "Elara", "--keep", "luck")).toBe('luck keeps no rolls: declare it so first, such as config, setting fields, value "luck: rolls". Nothing rolled.');
    });

    it("reminds the kept rolls at a rest, for the player to roll them again when it brings them back", async () => {
        await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=14,3");
        expect(await ok("change", "--recipe", "long rest")).toContain("Kept rolls: portent 14, 3; if this rest brings them back, the player rolls them again, with roll and keep.");
    });
});
