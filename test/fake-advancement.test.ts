// How characters rise on the fake system (D-205, D-212, D-233, D-234): the setting the setup asks and what a value leaves out (DAT-10), the renown and the
// rank it reaches (PRO-6), what the creatures overcome in a scene give the party (DAT-11), and what a quest that ends rewards. The same on the 5e is in its
// repository.
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

function campaignFile(): string
{
    return readFileSync(join(folder, "campaign.yaml"), "utf8");
}

describe("a setting of the system (DAT-10, D-212)", () => {
    it("is asked with the campaign's, says what each value means, takes only those, and validate reports one written by hand", async () => {
        expect(await ok("status")).toContain("Still missing: ruleset (first or second), harshness (gentle or bitter). Ask the player, then set each one with the config command (setting and value).");
        expect(await ok("config", "harshness")).toBe(
            "harshness: (missing; gentle: a day without food costs nothing until the third; bitter: every day without food costs at once, and no renown is kept)\n\n"
                + "Still missing: ruleset (first or second), harshness (gentle or bitter). Ask the player, then set each one with the config command (setting and value).",
        );
        expect(await refused("config", "harshness", "soft")).toContain('"soft" is not a value of harshness, which takes gentle (a day without food costs nothing until the third)');
        expect(await ok("config", "harshness", "Bitter")).toBe(
            "harshness: bitter: every day without food costs at once, and no renown is kept\n\nStill missing: ruleset (first or second). Ask the player, then set it with the config command (setting and value).",
        );
        expect(campaignFile()).toContain("harshness: bitter\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed", visibility: "public", data: { setting: "harshness", value: "bitter" } });
        // The campaign's line says it at every session.
        expect(await ok("status")).toContain(
            "Prova · en · fake, the fake system of the core's tests, the version of its rules still to ask · difficulty normal · lethality dice · saves checkpoint · rigor smooth · dice digital · units metric · harshness bitter · mode play\n",
        );
        writeFileSync(join(folder, "campaign.yaml"), campaignFile().replace("harshness: bitter", "harshness: dura"));
        expect(await ok("validate")).toContain(
            'harshness is "dura", which the system fake does not take: gentle or bitter. Fix: ask the player, then config, setting harshness, with value gentle or value bitter.',
        );
    });

    it("leaves out of the sheet, the line and what the sheet still lacks what a value keeps none of, and says so when it is written", async () => {
        await ok("config", "harshness", "bitter");
        await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1", "--set", "might=5");
        expect(await ok("status")).toContain("Ennio's sheet still lacks, by these names: grace, wit, skilled, resolve, stride.");
        expect(await ok("write", "Ennio", "--set", "renown=5")).toContain("renown is not kept with harshness bitter: config says what it means.");
        expect(await ok("status")).toContain("PC: Ennio: level 1 · grit 10/10 · stamina-d6 1/1 · rallies 1/1\n");
    });
});

describe("the renown (PRO-6, D-205, D-234)", () => {
    beforeEach(async () => {
        await ok("config", "harshness", "gentle");
    });

    it("says how much the next rank needs, then the rank reached, until the vocations rise", async () => {
        await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1", "--set", "might=5", "--set", "renown=0");
        // The line shows the renown once there is some; the sheet always.
        expect(await ok("show", "Ennio")).toContain("level 1 · renown 0 (10 to level 2)");
        const due = 'Ennio has the renown for level 2: level up with the player, out of the story, now or at the next rest as they prefer; they choose what the new level asks: read rules "Rising".';
        expect(await ok("change", "Ennio", "renown", "--by", "5")).not.toContain("has the renown");
        expect(await ok("change", "Ennio", "renown", "--by", "5")).toBe(`Ennio: renown 5 → 10.\n${due}`);
        expect(await ok("status")).toContain("renown 10 (level 2 due)");
        expect(await ok("status")).toContain(due);
        // Points that reach a rank already due say nothing new.
        expect(await ok("change", "Ennio", "renown", "--by", "6")).not.toContain("has the renown");
        await ok("write", "Ennio", "--set", "vocations=[[Warden]] 2");
        expect(await ok("status")).toContain("renown 16 (14 to level 3)");
        expect(await ok("status")).not.toContain("has the renown");
    });

    it("leaves a companion's choices to the master, and says the highest rank reached", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Scout]] 1", "--set", "renown=40");
        expect(await ok("show", "Lena")).toContain("renown 40 (level 3 due)");
        expect(await ok("status")).toContain(
            "Lena has the renown for level 3: level up the companion: what the new level asks is yours to choose, as the story has shaped the companion, or the player's if they made it: "
                + 'read rules "Rising".',
        );
    });

    it("is at least what the rank needs: write says it, and change sets it right", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Scout]] 1", "--set", "renown=40");
        expect(await ok("write", "Lena", "--set", "vocations=[[Scout]] 4")).toContain("Lena is level 4: a character of that level has at least 60 renown: change Lena, field renown, to 60.");
        expect(await ok("change", "Lena", "renown", "--to", "80")).toBe("Lena: renown 40 → 80.");
        expect(await ok("show", "Lena")).toContain("level 4 · renown 80\n");
    });

    it("of the creatures overcome in a scene, those that left too, is shared among the party there, said and never given (DAT-11)", async () => {
        await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 2", "--set", "renown=16");
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Scout]] 1");
        await ok("write", "Rasco", "--type", "character", "--set", "role=npc", "--set", "creature=[[Reed Cutter]]");
        await ok("write", "Bosco", "--type", "place", "--set", "contains=[[Ennio]], [[Lena]], [[Rasco]]");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Ennio", "--with", "Lena", "--with", "Rasco", "--creatures", "Bog Hound=2", "--creatures", "Fen Witch=2");
        await ok("change", "Bog Hound 1", "grit", "--to", "0");
        await ok("scene", "leave", "--who", "Bog Hound 1", "--who", "Fen Witch 1");
        await ok("change", "Bog Hound 2", "grit", "--by=-20");
        await ok("change", "Rasco", "grit", "--to", "0");
        expect(await ok("scene", "close", "--summary", "I cani cadono.")).toContain(
            "renown of those overcome: Bog Hound 2 4, Bog Hound 1 4, Rasco 2, 10 in all; 5 each to Ennio, Lena: change Ennio, field renown, by 5; change Lena, field renown, by 5. "
                + "Rasco is a character: leave out any who fought on your side, and share again. Fled: Fen Witch 1 6, to count if the party overcame them. "
                + "Leave out what the party summoned; count those overcome another way and what the story rewards, as you judge, and tell the player only what each gained.",
        );
        expect(readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8")).toContain("renown: 16\n");
    });

    it("of the story comes when a quest ends, as the system says", async () => {
        await ok("write", "Il pozzo", "--type", "quest");
        expect(await ok("write", "Il pozzo", "--set", "status=done")).toContain("Il pozzo is done. What the story rewards: renown, given with change, as you judge, to one character or to all.");
        expect(await ok("write", "Il pozzo", "--set", "status=done", "--set", "goal=trovato")).not.toContain("What the story rewards");
    });
});
