// What a campaign adds to its game system (D-223, CAM-1–CAM-3) and the rolls kept for later (D-213, KEP-1–KEP-4), through the commands on the 5e.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--system", "5e", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
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
        await ok("config", "tables", "bulwark-dice-by-level: {0: 0, 3: 4, 7: 5, 15: 6}");
        await ok("config", "counters", 'bulwark-dice: {max: "has(subclasses, Shield Oath) * table(bulwark-dice-by-level, item(classes, Fighter))", refill: short rest}');
        expect(campaignFile()).toContain("bulwark-dice:\n    max: has(subclasses, Shield Oath) * table(bulwark-dice-by-level, item(classes, Fighter))\n    refill: short rest");
        expect(await fighter("Gara", "classes=[[Fighter]] 7", "subclasses=[[Shield Oath]]")).toContain("bulwark-dice 5/5");
        await ok("change", "Gara", "bulwark-dice", "--by=-3");
        expect(await ok("change", "--recipe", "short rest")).toContain("bulwark-dice 2/5 → 5/5");
        expect(await ok("config", "counters")).toContain("counters: { bulwark-dice: { max:");
    });

    it("puts a house rule's formula in place of the system's (D-200), and adds to the system's recipe instead of replacing it", async () => {
        await ok("config", "computed", '"passive-perception": "10 + perception + 5 * has(feats, Observant)"');
        await fighter("Gara", "classes=[[Fighter]] 1", "feats=[Observant]");
        expect(await ok("status")).toContain("passive-perception 17");
        await ok("config", "recipes", "long rest: {rules: [Bulwark Dice]}");
        await ok("change", "Gara", "hp", "--by=-5");
        const rest = await ok("change", "--recipe", "long rest");
        expect(rest).toContain("hp 37/42 → 42/42");
        expect(rest).toContain('For the rest, read rules "Long Rest" and rules "Bulwark Dice".');
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

    it("gives a use only to who keeps the sheet, a companion with classes included, never to an item, a place, a non-player character or a copy (DAT-9, D-225)", async () => {
        await ok("config", "counters", "luck-points: {max: 3, refill: long rest}");
        expect(await fighter("Gara", "classes=[[Fighter]] 1")).toContain("luck-points 3/3");
        const others = [
            ["Lanterna", "--type", "item", "--set", "cost=5 sp"],
            ["Pozzo", "--type", "place", "--text", "Un pozzo."],
            ["Bruno", "--type", "character", "--set", "role=npc", "--set", "classes=[[Wizard]] 3"],
        ];

        for (const args of others) {
            expect(await ok("write", ...args)).not.toContain("luck-points");
        }

        expect(readFileSync(join(folder, "world", "items", "Lanterna.md"), "utf8")).not.toContain("luck-points");
        expect(await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--creatures", "Wolf=1")).toContain("Wolf 1: hp 11/11.");
        const lena = await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "creature=[[Human]]", "--set", "classes=[[Fighter]] 3");
        expect(lena).toContain("luck-points 3/3");
        expect(await ok("show", "Lena#Features")).toContain("features Fighting Style, Second Wind, Action Surge (one use), Martial Archetype: Fighter 3 in classes");
        // The classes a companion inherits from its creature count too.
        await ok("write", "Soldato", "--type", "creature", "--set", "creature=[[Human]]", "--set", "classes=[[Fighter]] 2");
        expect(await ok("write", "Pia", "--type", "character", "--set", "role=companion", "--set", "creature=[[Soldato]]")).toContain("action-surge 1/1");
    });

    it("takes nothing off the pages while what campaign.yaml adds does not read (CAM-3)", async () => {
        await ok("config", "counters", 'luck-points: {max: "3 * has(features, Second Wind)", refill: long rest}');
        await fighter("Gara", "classes=[[Fighter]] 1");
        await ok("change", "Gara", "luck-points", "--by=-1");
        writeFileSync(
            join(folder, "campaign.yaml"),
            `${campaignFile()}computed:
  level: "sum(classes) +"
`,
        );
        await ok("write", "Gara", "--set", "xp=6");
        expect(readFileSync(join(folder, "world", "characters", "Gara.md"), "utf8")).toContain("luck-points: 2/3");
    });

    it("says what an entry given in place of one of the system's leaves out (CAM-2), and lists only the additions the campaign makes", async () => {
        expect(await ok("config", "counters", "channel-divinity: {refill: long rest}")).toContain(
            'counters channel-divinity takes the place of the system 5e\'s channel-divinity, { max: "max(item(features, Channel Divinity), has(features, Channel Divinity), has(features, Sacred Oath))", refill: short rest }: what this one leaves out of it is gone.',
        );
        const listed = await ok("config");
        expect(listed).toContain("counters: { channel-divinity: { refill: long rest } }");
        expect(listed).not.toContain("tables:");
    });

    it("refuses a refill no recipe brings back, a recipe that sets kept rolls or names what it does not know, and says when a formula needs quotes (CAM-3, DAT-9, KEP-4)", async () => {
        expect(await refused("config", "counters", "bulwark-dice: {max: 4, refill: short-rest}")).toBe(
            "With this, the system 5e would not read: counters.bulwark-dice.refill: short-rest is no occasion a recipe ends, so it would never come back; the occasions are long rest, short rest. Nothing changed.",
        );
        expect(await refused("config", "counters", "bulwark-dice: {max: 4 * has(features, Bulwark), refill: short rest}")).toContain(
            'counters.bulwark-dice: unknown key "Bulwark)": a formula with commas goes in quotes.',
        );
        expect(await refused("config", "recipes", "long rest: {sett: {hp: max}}")).toContain('recipes.long rest: unknown key "sett".');
        await ok("config", "fields", "portent: rolls");
        expect(await refused("config", "recipes", "long rest: {set: {portent: max}}")).toContain("recipes.long rest.set.portent: portent keeps rolls, which come back as they are rolled again with roll and keep, not at a value.");
    });

    it("refuses an effect on a value the system gives everyone, and a current above the maximum it works out (FOR-6, FOR-7)", async () => {
        await ok("config", "computed", "speed: 30");
        await fighter("Gara", "classes=[[Fighter]] 1");
        expect(await refused("effect", "add", "Gara", "Haste", "--for", "1m", "--set", "speed=60")).toBe(
            "speed on Gara is 30 for everyone, a fixed value of the game data (system 5e or campaign.yaml): an effect cannot change it. Nothing changed.",
        );
        expect(await refused("effect", "add", "Gara", "Aid", "--for", "8h", "--set", "hp=50")).toContain("hp=50 on Gara is above its maximum, 42, which the system 5e works out from");
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

    it("says who keeps the number use asks for, and refuses kept rolls in a counter or a field of no number", async () => {
        await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=14,3");
        await fighter("Lio", "classes=[[Fighter]] 1");
        expect(await refused("roll", "1d20", "--who", "Lio", "--use", "portent=3")).toBe("Lio keeps no 3 in portent: it keeps none. Elara keeps 14, 3 in portent: give from Elara. Nothing rolled.");
        expect(await refused("roll", "2d20", "--who", "Elara", "--keep", "hp")).toBe("hp is a counter, not kept rolls: keep and use take a field declared as rolls, such as portent. Nothing rolled.");
        writeFileSync(join(folder, "world", "characters", "Elara.md"), readFileSync(join(folder, "world", "characters", "Elara.md"), "utf8").replace(/portent:.*\n(?:\s+- .*\n)*/, "portent: [abc, 5]\n"));
        expect(await refused("roll", "1d20", "--use", "portent=5", "--from", "Elara")).toBe('portent on Elara holds "abc", which is no roll: write its numbers only, such as portent=[14, 3]. Nothing rolled.');
    });

    it("refuses a number not kept, a notation with more than one die, and a field not declared as kept rolls", async () => {
        await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=14,3");
        expect(await refused("roll", "1d20", "--use", "portent=7", "--from", "Elara")).toBe("Elara keeps no 7 in portent: it keeps 14, 3. Nothing rolled.");
        expect(await refused("roll", "2d20kh1", "--use", "portent=3", "--from", "Elara")).toContain("A kept roll takes the place of one die, of the kind it was rolled with: give a notation with that one die, such as 1d20+2");
        expect(await refused("roll", "2d20", "--who", "Elara", "--keep", "luck")).toBe('luck keeps no rolls: declare it so first, such as config, setting fields, value "luck: rolls". Nothing rolled.');
    });

    it("reminds the kept rolls at a rest, for the player to roll them again when it brings them back, and the master for a companion", async () => {
        await ok("roll", "2d20", "--who", "Elara", "--keep", "portent", "--values=14,3");
        expect(await ok("change", "--recipe", "long rest")).toContain("Elara keeps portent 14, 3: if this rest brings them back, the player rolls them again, with roll and keep.");
        await ok("write", "Elara", "--set", "role=companion");
        expect(await ok("change", "Elara", "--recipe", "long rest")).toContain("Elara keeps portent 14, 3: if this rest brings them back, roll them again, with roll and keep.");
    });
});
