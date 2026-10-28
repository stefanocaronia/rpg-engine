// What a campaign adds to its game system (D-223, CAM-1–CAM-3) and the rolls kept for later (D-213, KEP-1–KEP-4), through the commands on the fake system.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--system", "fake", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
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

/** A Warden of the party, its might 5. */
async function warden(name: string, ...fields: string[]): Promise<string>
{
    const base = ["role=pc", "might=5", "grace=3", "wit=4"];
    return ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
}

function campaignFile(): string
{
    return readFileSync(join(folder, "campaign.yaml"), "utf8");
}

describe("what the campaign adds to its game system (CAM-1–CAM-3)", () => {
    it("adds a knack's uses with their table, brings them back with the system's rest, and keeps them in campaign.yaml", async () => {
        await ok("config", "tables", "bulwark-dice-by-rank: {0: 0, 3: 4, 7: 5, 15: 6}");
        await ok("config", "counters", 'bulwark-dice: {max: "has(knacks, Iron Lung) * table(bulwark-dice-by-rank, item(vocations, Warden))", refill: breather}');
        expect(campaignFile()).toContain("bulwark-dice:\n    max: has(knacks, Iron Lung) * table(bulwark-dice-by-rank, item(vocations, Warden))\n    refill: breather");
        expect(await warden("Gara", "vocations=[[Warden]] 7")).toContain("bulwark-dice 5/5");
        await ok("change", "Gara", "bulwark-dice", "--by=-3");
        expect(await ok("change", "--recipe", "breather")).toContain("bulwark-dice 2/5 → 5/5");
        expect(await ok("config", "counters")).toContain("counters: { bulwark-dice: { max:");
    });

    it("puts a house rule's formula in place of the system's (D-200), and adds to the system's recipe instead of replacing it", async () => {
        await ok("config", "computed", '"guard": "10 + grace-bonus + 5 * has(knacks, Steady Hand)"');
        await warden("Gara", "vocations=[[Warden]] 1");
        expect(await ok("status")).toContain("guard 15");
        await ok("config", "recipes", "night's sleep: {rules: [Bulwark Dice]}");
        await ok("change", "Gara", "grit", "--by=-5");
        const rest = await ok("change", "--recipe", "night's sleep");
        expect(rest).toContain("grit 5/10 → 10/10");
        expect(rest).toContain('For the rest, read rules "Rest" and rules "Bulwark Dice".');
    });

    it("adds fields to the line of the player character, and removes an entry by name", async () => {
        await ok("config", "status-line", "--add", "renown");
        await warden("Gara", "vocations=[[Warden]] 1", "renown=10");
        expect(await ok("status")).toMatch(/PC: Gara.*· renown 10/);
        await ok("config", "tables", "uno: {1: 1}");
        await ok("config", "tables", "--remove", "uno");
        expect(campaignFile()).not.toContain("tables");
        expect(await refused("config", "tables", "--remove", "uno")).toContain('"tables" has no entry "uno", so nothing changed. It has: none.');
    });

    it("refuses what would not read, and plays with the system alone when campaign.yaml has it by hand, which validate reports", async () => {
        expect(await refused("config", "counters", 'broken: {max: "1 +"}')).toBe(
            'With this, the system fake would not read: counters.broken.max: "1 +" is not a formula: a number, a field, a function or ( was expected at the end. Nothing changed.',
        );
        expect(await refused("config", "counters", "[1, 2]")).toContain("counters takes entries by name");
        expect(await refused("config", "counters", "--add", "x")).toContain('"counters" takes entries by name as the value');
        writeFileSync(join(folder, "campaign.yaml"), `${campaignFile()}computed:\n  level: "sum(vocations) +"\n`);
        await warden("Gara", "vocations=[[Warden]] 2");
        expect(await ok("status")).toContain("level 2");
        expect(await ok("validate")).toContain('What campaign.yaml adds to the system fake does not read, so the campaign plays without it: computed.level: "sum(vocations) +" is not a formula');
    });

    it("gives a use only to who keeps the sheet, a companion with vocations included, never to an item, a place, a non-player character or a copy (DAT-9, D-225)", async () => {
        await ok("config", "counters", "luck-points: {max: 3, refill: night's sleep}");
        expect(await warden("Gara", "vocations=[[Warden]] 1")).toContain("luck-points 3/3");
        const others = [
            ["Lanterna", "--type", "item", "--set", "heft=1 kg"],
            ["Pozzo", "--type", "place", "--text", "Un pozzo."],
            ["Bruno", "--type", "character", "--set", "role=npc", "--set", "vocations=[[Warden]] 3"],
        ];

        for (const args of others) {
            expect(await ok("write", ...args)).not.toContain("luck-points");
        }

        expect(readFileSync(join(folder, "world", "items", "Lanterna.md"), "utf8")).not.toContain("luck-points");
        expect(await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--creatures", "Bog Hound=1")).toContain("Bog Hound 1: grit 9/9.");
        const lena = await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Warden]] 3");
        expect(lena).toContain("luck-points 3/3");
        expect(await ok("show", "Lena#Knacks")).toContain("knacks Steady Hand, Iron Lung: Warden 3 in vocations");
        // The vocations a companion inherits from its creature count too.
        await ok("write", "Soldato", "--type", "creature", "--set", "vocations=[[Scout]] 2");
        expect(await ok("write", "Pia", "--type", "character", "--set", "role=companion", "--set", "creature=[[Soldato]]")).toContain("second-deed 1/1");
    });

    it("takes nothing off the pages while what campaign.yaml adds does not read (CAM-3)", async () => {
        await ok("config", "counters", 'luck-points: {max: "3 * has(knacks, Steady Hand)", refill: night\'s sleep}');
        await warden("Gara", "vocations=[[Warden]] 1");
        await ok("change", "Gara", "luck-points", "--by=-1");
        writeFileSync(
            join(folder, "campaign.yaml"),
            `${campaignFile()}computed:
  level: "sum(vocations) +"
`,
        );
        await ok("write", "Gara", "--set", "renown=6");
        expect(readFileSync(join(folder, "world", "characters", "Gara.md"), "utf8")).toContain("luck-points: 2/3");
    });

    it("says what an entry given in place of one of the system's leaves out (CAM-2), and lists only the additions the campaign makes", async () => {
        expect(await ok("config", "counters", "rallies: {refill: night's sleep}")).toContain(
            "counters rallies takes the place of the system fake's rallies, { refill: { night's sleep: max, breather: \"has(knacks, Iron Lung)\" } }: what this one leaves out of it is gone.",
        );
        const listed = await ok("config");
        expect(listed).toContain("counters: { rallies: { refill: night's sleep } }");
        expect(listed).not.toContain("tables:");
    });

    it("refuses a refill no recipe brings back, a recipe that sets kept rolls or names what it does not know, and says when a formula needs quotes (CAM-3, DAT-9, KEP-4)", async () => {
        expect(await refused("config", "counters", "bulwark-dice: {max: 4, refill: short-rest}")).toBe(
            "With this, the system fake would not read: counters.bulwark-dice.refill: short-rest is no occasion a recipe ends, so it would never come back; the occasions are night's sleep, breather. Nothing changed.",
        );
        expect(await refused("config", "counters", "bulwark-dice: {max: 4 * has(knacks, Iron Lung), refill: breather}")).toContain(
            'counters.bulwark-dice: unknown key "Iron Lung)": a formula with commas goes in quotes.',
        );
        expect(await refused("config", "recipes", "night's sleep: {sett: {grit: max}}")).toContain('recipes.night\'s sleep: unknown key "sett".');
        await ok("config", "fields", "omen: rolls");
        expect(await refused("config", "recipes", "night's sleep: {set: {omen: max}}")).toContain(
            "recipes.night's sleep.set.omen: omen keeps rolls, which come back as they are rolled again with roll and keep, not at a value.",
        );
    });

    it("refuses an effect on a value the system gives everyone, and a current above the maximum it works out (FOR-6, FOR-7)", async () => {
        await ok("config", "computed", "guard: 6");
        await warden("Gara", "vocations=[[Warden]] 1");
        expect(await refused("effect", "add", "Gara", "Scudo", "--for", "1m", "--set", "guard=9")).toBe(
            "guard on Gara is 6 for everyone, a fixed value of the game data (system fake or campaign.yaml): an effect cannot change it. Nothing changed.",
        );
        expect(await refused("effect", "add", "Gara", "Vigore", "--for", "8h", "--set", "grit=50")).toContain("grit=50 on Gara is above its maximum, 10, which the system fake works out from");
    });
});

describe("rolls kept for later (KEP-1–KEP-4)", () => {
    beforeEach(async () => {
        await ok("config", "fields", "omen: rolls");
        await warden("Elara", "vocations=[[Scout]] 2");
    });

    it("keeps the dice the player rolls, in place of those kept before, and shows them in the line", async () => {
        expect(await ok("roll", "2d6", "--who", "Elara", "--keep", "omen", "--values=5,2")).toContain("Elara keeps in omen: 5, 2.");
        expect(await ok("status")).toContain("omen 5, 2");
        expect(await ok("roll", "2d6", "--who", "Elara", "--keep", "omen", "--values=4,6")).toContain("Elara keeps in omen: 4, 6, in place of 5, 2.");
        expect(readLogFile(folder).at(-1)?.data).toMatchObject({ kept: { field: "omen", values: [4, 6] } });
    });

    it("uses a kept number in place of the die, takes it away and logs which roll it replaced", async () => {
        await ok("roll", "2d6", "--who", "Elara", "--keep", "omen", "--values=5,2");
        const used = await ok("roll", "1d6+2", "--who", "Bog Hound", "--use", "omen=2", "--from", "Elara", "--why", "a bite");
        expect(used).toContain("Bog Hound, a bite: 1d6+2 = 4 [2] + 2");
        expect(used).toContain("2 from Elara's omen took the place of the die; left: 5.");
        expect(readLogFile(folder).at(-1)?.data).toMatchObject({ total: 4, used: { from: "Elara", field: "omen", value: 2 } });
        expect(await ok("roll", "1d6+5", "--who", "Elara", "--use", "omen=5")).toContain("none is left");
        expect(await ok("status")).not.toContain("omen");
    });

    it("says who keeps the number use asks for, and refuses kept rolls in a counter or a field of no number", async () => {
        await ok("roll", "2d6", "--who", "Elara", "--keep", "omen", "--values=5,2");
        await warden("Lio", "vocations=[[Warden]] 1");
        expect(await refused("roll", "1d6", "--who", "Lio", "--use", "omen=2")).toBe("Lio keeps no 2 in omen: it keeps none. Elara keeps 5, 2 in omen: give from Elara. Nothing rolled.");
        expect(await refused("roll", "2d6", "--who", "Elara", "--keep", "grit")).toBe("grit is a counter, not kept rolls: keep and use take a field declared as rolls, such as omen. Nothing rolled.");
        writeFileSync(join(folder, "world", "characters", "Elara.md"), readFileSync(join(folder, "world", "characters", "Elara.md"), "utf8").replace(/omen:.*\n(?:\s+- .*\n)*/, "omen: [abc, 5]\n"));
        expect(await refused("roll", "1d6", "--use", "omen=5", "--from", "Elara")).toBe('omen on Elara holds "abc", which is no roll: write its numbers only, such as omen=[14, 3]. Nothing rolled.');
    });

    it("refuses a number not kept, a notation with more than one die, and a field not declared as kept rolls", async () => {
        await ok("roll", "2d6", "--who", "Elara", "--keep", "omen", "--values=5,2");
        expect(await refused("roll", "1d6", "--use", "omen=3", "--from", "Elara")).toBe("Elara keeps no 3 in omen: it keeps 5, 2. Nothing rolled.");
        // The example names the notation's own die.
        expect(await refused("roll", "2d6", "--use", "omen=2", "--from", "Elara")).toBe(
            "A kept roll takes the place of one die, of the kind it was rolled with: give a notation with that one die, such as 1d6+2 (This roll needs at least 2 values (2 d6), but 1 was given.). Nothing rolled.",
        );
        expect(await refused("roll", "2d6", "--who", "Elara", "--keep", "luck")).toBe('luck keeps no rolls: declare it so first, such as config, setting fields, value "luck: rolls". Nothing rolled.');
    });

    it("reminds the kept rolls at a rest, for the player to roll them again when it brings them back, and the master for a companion", async () => {
        await ok("roll", "2d6", "--who", "Elara", "--keep", "omen", "--values=5,2");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("Elara keeps omen 5, 2: if this rest brings them back, the player rolls them again, with roll and keep.");
        await ok("write", "Elara", "--set", "role=companion");
        expect(await ok("change", "Elara", "--recipe", "night's sleep")).toContain("Elara keeps omen 5, 2: if this rest brings them back, roll them again, with roll and keep.");
    });
});
