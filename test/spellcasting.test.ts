// A character's spellcasting on the 5e (D-227, PRO-5): slots by caster level, a warlock's Pact Magic and Mystic Arcanum, and the save DC, attack and prepared
// spells of each class, worked out from the formulas of its page.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

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

/** A character of the party with these classes: str 10, dex 14, con 14, int 16, wis 16, cha 14 (+0, +2, +2, +3, +3, +2). */
async function caster(name: string, classes: string): Promise<string>
{
    const fields = ["role=pc", "creature=[[Human]]", `classes=${classes}`, "str=10", "dex=14", "con=14", "int=16", "wis=16", "cha=14", "hp-base=30"];
    await ok("write", name, "--type", "character", ...fields.flatMap((field) => ["--set", field]));
    return ok("show", `${name}#Spells`);
}

describe("spell slots by caster level (D-227, p. 57)", () => {
    it("gives a single class the slots of its own table", async () => {
        expect(await caster("Ada", "[[Wizard]] 5")).toContain("slots-1 4/4: the maximum from");
        const wizard = await ok("show", "Ada");
        expect(wizard).toContain("Spells: caster-level 5 · spell-save-dc 14 · spell-attack +6 · slots-1 4/4 · slots-2 3/3 · slots-3 2/2 · max-prepared 8");
    });

    it("gives a paladin or ranger slots from 2nd level, as its own table does", async () => {
        // A paladin's first level gives no spellcasting: a caster level of 0, no save DC, no slots.
        const first = await caster("Pia", "[[Paladin]] 1");
        expect(first).toContain("caster-level 0");
        expect(first).not.toMatch(/spell-save-dc|slots-1/);
        await ok("write", "Pia", "--set", "classes=[[Paladin]] 2");
        expect(await ok("show", "Pia")).toContain("Spells: caster-level 1 · spell-save-dc 12 · spell-attack +4 · slots-1 2/2 · max-prepared 3");
        await ok("write", "Pia", "--set", "classes=[[Paladin]] 5");
        expect(await ok("show", "Pia")).toContain("caster-level 3 · spell-save-dc 13 · spell-attack +5 · slots-1 4/4 · slots-2 2/2");
    });

    it("adds up the levels of two spellcasting classes, half of a paladin's, and gives the save DC and attack of each class", async () => {
        const shown = await caster("Elara", "[[Cleric]] 3, [[Wizard]] 2");
        expect(shown).toContain("caster-level 5: 5 in classes");
        const sheet = await ok("show", "Elara");
        expect(sheet).toContain("spell-save-dc Cleric 14, Wizard 14 · spell-attack Cleric +6, Wizard +6 · slots-1 4/4 · slots-2 3/3 · slots-3 2/2 · max-prepared Cleric 6, Wizard 5");
        await ok("write", "Elara", "--set", "classes=[[Paladin]] 4, [[Wizard]] 1");
        expect(await ok("show", "Elara")).toContain("caster-level 3 · spell-save-dc Paladin 13, Wizard 14 · spell-attack Paladin +5, Wizard +6 · slots-1 4/4 · slots-2 2/2");
    });

    it("gives a fighter no spells, and never writes a spellcasting number by hand", async () => {
        await caster("Gara", "[[Fighter]] 5");
        expect(await ok("show", "Gara")).not.toContain("Spells:");
        await ok("write", "Ada", "--type", "character", "--set", "role=companion", "--set", "creature=[[Human]]", "--set", "classes=[[Wizard]] 1", "--set", "int=16");
        expect(await ok("write", "Ada", "--set", "spell-save-dc=15", "--set", "xp=10")).toContain("Not written, the system 5e works it out: spell-save-dc 13 (you gave 15).");
    });
});

describe("a warlock's Pact Magic and Mystic Arcanum (pp. 47, 49)", () => {
    it("keeps its pact slots apart, of the level its table gives, back with a short rest, and Mystic Arcanum back with a long rest", async () => {
        await caster("Vex", "[[Warlock]] 3");
        const shown = await ok("show", "Vex");
        expect(shown).toContain("slot-level 2nd");
        expect(shown).toContain("spell-slots 2/2");
        expect(shown).not.toContain("slots-1");
        await ok("change", "Vex", "spell-slots", "--by=-2");
        expect(await ok("change", "Vex", "--recipe", "short rest")).toContain("spell-slots 0/2 → 2/2");
        await ok("write", "Vex", "--set", "classes=[[Warlock]] 11");
        expect(await ok("show", "Vex#Spells")).toContain("mystic-arcanum 1/1");
    });
});

describe("the spells a character knows and prepares (D-227)", () => {
    it("lists them as links to the system's spells, which show gives and validate checks", async () => {
        await caster("Ada", "[[Wizard]] 5");
        await ok("write", "Ada", "--set", "spells=[[Fire Bolt]], [[Magic Missile]], [[Shield (spell)]], [[Fireball]]", "--set", "prepared=[[Magic Missile]], [[Fireball]]");
        expect(await ok("show", "Ada#Spells")).toContain("spells Fire Bolt, Magic Missile, Shield (spell), Fireball\nprepared Magic Missile, Fireball");
        expect(await ok("show", "Fireball")).toContain("spell-level: 3");
        expect(await ok("validate")).toBe("No problems.");
        await ok("write", "Ada", "--add", "spells=[[Palla di neve]]");
        expect(await ok("validate")).toContain("Palla di neve");
    });
});

describe("the formulas of a class's page (PRO-5)", () => {
    it("has validate report one that does not read", async () => {
        await ok("write", "Arcanista", "--type", "topic", "--set", "category=class", "--set", 'spell-save-dc="8 + proficiency +"', "--text", "| Level | Features |\n|---|---|\n| 1st | — |");
        await caster("Ugo", "[[Arcanista]] 1");
        expect(await ok("validate")).toContain("spell-save-dc on Arcanista does not read, so Ugo has none from it:");
    });
});
