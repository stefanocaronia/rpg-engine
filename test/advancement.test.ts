// How characters gain levels on the 5e (D-205, D-212, D-233): the setting the setup asks (DAT-10), the experience points and the level they reach (PRO-6),
// and what the creatures overcome in a scene give the party (DAT-11).
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

/** A character of the party, with what its sheet needs. */
async function character(name: string, role: string, ...fields: string[]): Promise<void>
{
    const base = [`role=${role}`, "creature=[[Human]]", "str=12", "dex=14", "con=14", "int=10", "wis=12", "cha=10", "hp-base=10"];
    await ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
}

describe("the setting of advancement (DAT-10, D-212)", () => {
    it("is asked with the campaign's, says what each value means, takes only those, and validate reports one written by hand", async () => {
        expect(await ok("status")).toContain("Still missing: advancement (xp or milestones). Ask the player, then set it with the config command (setting and value).");
        expect(await ok("config", "advancement")).toBe(
            "advancement: (missing; xp: experience points, as the SRD: scene close says those of the creatures overcome, and you give more with change, as you judge, for what the story rewards, "
                + "to one character or to all; milestones: the characters rise when the story reaches a milestone, such as the end of an adventure or a great goal: you say when)\n\n"
                + "Still missing: advancement (xp or milestones). Ask the player, then set it with the config command (setting and value).",
        );
        expect(await refused("config", "advancement", "levels")).toContain('"levels" is not a value of advancement, which takes xp (experience points, as the SRD:');
        expect(await ok("config", "advancement", "Milestones")).toBe(
            "advancement: milestones: the characters rise when the story reaches a milestone, such as the end of an adventure or a great goal: you say when",
        );
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("advancement: milestones\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed", visibility: "public", data: { setting: "advancement", value: "milestones" } });
        expect(await ok("config")).toContain("\nadvancement: milestones: the characters rise");
        expect(await refused("config", "advancment", "xp")).toContain('There is no setting "advancment". The settings are: name, language, system,');
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("advancement: milestones", "advancement: livelli"));
        expect(await ok("validate")).toContain('advancement is "livelli", which the system 5e does not take: xp or milestones. Fix: config, setting advancement, value xp.');
    });

    it("with milestones leaves xp out of the sheet, the line and what the sheet still lacks", async () => {
        await ok("config", "advancement", "milestones");
        await character("Ennio", "pc", "classes=[[Fighter]] 1");
        expect(await ok("show", "Ennio")).toContain("Character: creature Human · size Medium · classes Fighter 1 · level 1\n");
        await ok("write", "Ennio", "--set", "xp=500");
        expect(await ok("status")).toContain("PC: Ennio: level 1 · hp 12/12");
        expect(await ok("status")).not.toMatch(/xp|level 2/);
    });
});

describe("the experience points (PRO-6, D-205)", () => {
    beforeEach(async () => {
        await ok("config", "advancement", "xp");
    });

    it("say how many the next level needs, then the level they reach, until the classes rise", async () => {
        await character("Ennio", "pc", "classes=[[Fighter]] 1", "xp=0");
        expect(await ok("status")).toContain("PC: Ennio: level 1 · xp 0 (300 to level 2) · hp 12/12");
        expect(await ok("show", "Ennio")).toContain("classes Fighter 1 · level 1 · xp 0 (300 to level 2)");
        const due = 'Ennio has the xp for level 2: level up with the player, who chooses the class and what the new level asks: read rules "Beyond 1st Level".';
        expect(await ok("change", "Ennio", "xp", "--by", "200", "--why", "i lupi")).not.toContain("has the xp");
        expect(await ok("change", "Ennio", "xp", "--by", "150", "--why", "la missione")).toContain(due);
        expect(await ok("status")).toContain("PC: Ennio: level 1 · xp 350 (level 2 due) · hp 12/12");
        expect(await ok("status")).toContain(due);
        // Points that reach a level already due say nothing new.
        expect(await ok("change", "Ennio", "xp", "--by", "10")).not.toContain("has the xp");
        expect(await ok("write", "Ennio", "--set", "classes=[[Fighter]] 2")).toContain('A first level in another class follows rules "Multiclassing"');
        expect(await ok("status")).toContain("PC: Ennio: level 2 · xp 360 (540 to level 3)");
        expect(await ok("status")).not.toContain("has the xp");
    });

    it("say the highest level they reach, and nothing at the last level of the table", async () => {
        await character("Lena", "companion", "classes=[[Wizard]] 1", "xp=2800");
        expect(await ok("show", "Lena")).toContain("xp 2800 (level 4 due)");
        expect(await ok("status")).toContain("Lena has the xp for level 4:");
        await ok("write", "Lena", "--set", "classes=[[Wizard]] 20");
        expect(await ok("show", "Lena")).toContain("level 20 · xp 2800\n");
    });

    it("of the creatures overcome in a scene are shared among the party there, said and never given; none with milestones", async () => {
        await character("Ennio", "pc", "classes=[[Fighter]] 1", "xp=0");
        await character("Lena", "companion", "classes=[[Wizard]] 1", "xp=0");
        await ok("write", "Bosco", "--type", "place", "--set", "contains=[[Ennio]], [[Lena]]");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--creatures", "Wolf=2", "--creatures", "Goblin=1");
        await ok("change", "Wolf 1", "hp", "--to", "0");
        await ok("change", "Goblin 1", "hp", "--by=-20");
        const closed = await ok("scene", "close", "--summary", "I lupi cadono.");
        expect(closed).toContain(
            "xp of those overcome: Wolf 1 50, Goblin 1 50, 100 in all; 50 each to Ennio, Lena: change Ennio, field xp, by 50; change Lena, field xp, by 50. Those overcome another way count too, as you judge.",
        );
        expect(readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8")).toContain("xp: 0\n");
        await ok("config", "advancement", "milestones");
        await ok("scene", "open", "--title", "Altro agguato", "--type", "combat", "--creatures", "Wolf=1");
        await ok("change", "Wolf 1", "hp", "--to", "0");
        expect(await ok("scene", "close", "--summary", "Un altro lupo.")).not.toContain("overcome");
    });
});

describe("the rules of advancement", () => {
    it("are the SRD's text: Beyond 1st Level and Multiclassing (pp. 56–58)", async () => {
        expect(await ok("rules", "Multiclassing Prerequisites")).toContain("| Monk | Dexterity 13 and Wisdom 13 |");
        expect(await ok("rules", "Character Advancement")).toContain("| 900 | 3 | +2 |");
    });
});
