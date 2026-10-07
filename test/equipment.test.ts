// What a character wears and wields on the 5e (D-231, PRO-5, CON-12): the armor class from armor, shield and what changes it, and the attacks of the weapons
// equipped, worked out from the formulas of their pages.
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/** A character of the party: str 16, dex 14, con 14, int 10, wis 14, cha 10 (+3, +2, +2, +0, +2, +0). */
async function character(name: string, ...fields: string[]): Promise<void>
{
    const base = ["role=pc", "creature=[[Human]]", "str=16", "dex=14", "con=14", "int=10", "wis=14", "cha=10", "hp-base=20"];
    await ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
}

/** Items of the campaign derived from the system's, carried by a character, and those it has equipped. */
async function carry(name: string, items: Record<string, string>, equipped: string[]): Promise<void>
{
    for (const [item, base] of Object.entries(items)) {
        await ok("write", item, "--type", "item", "--set", `item=[[${base}]]`);
    }

    const links = (names: string[]): string => names.map((item) => `[[${item}]]`).join(", ");
    await ok("write", name, "--set", `inventory=${links(Object.keys(items))}`, ...(equipped.length === 0 ? [] : ["--set", `equipped=${links(equipped)}`]));
}

describe("the armor class (D-231)", () => {
    it("is the armor's with the shield, and Defense adds one while armor is worn", async () => {
        await character("Gara", "classes=[[Fighter]] 1", "fighting-styles=[Defense]");
        await carry("Gara", { Cotta: "Chain Mail", Scudo: "Shield", Cuoio: "Leather Armor" }, ["Cotta", "Scudo"]);
        expect(await ok("show", "Gara#Combat")).toContain("ac 19: armor-class 16, armor-class-bonus +2, Defense in fighting-styles");
        await ok("write", "Gara", "--set", "equipped=[[Cuoio]]");
        expect(await ok("show", "Gara")).toContain("Combat: ac 14 ·");
        await ok("write", "Gara", "--unset", "equipped");
        expect(await ok("show", "Gara")).toContain("Combat: ac 12 ·");
    });

    it("takes without armor the best of 10 + Dex, Unarmored Defense, Draconic Resilience and Mage Armor, and says what an effect changes", async () => {
        await character("Brann", "classes=[[Barbarian]] 1");
        expect(await ok("show", "Brann")).toContain("Combat: ac 14 ·");
        await character("Kai", "classes=[[Monk]] 1");
        expect(await ok("show", "Kai")).toContain("Combat: ac 14 ·");
        // A monk's Unarmored Defense holds without a shield (p. 26).
        await carry("Kai", { Scudo: "Shield" }, ["Scudo"]);
        expect(await ok("show", "Kai")).toContain("Combat: ac 14 ·");
        await character("Sera", "classes=[[Sorcerer]] 1", "subclasses=[[Draconic Bloodline]]");
        expect(await ok("show", "Sera")).toContain("Combat: ac 15 ·");
        await character("Ada", "classes=[[Wizard]] 1");
        expect(await ok("effect", "add", "Ada", "Mage Armor", "--set", "unarmored-base=13")).toBe("Ada: Mage Armor, until it is ended; unarmored-base none → 13, ac 12 → 15.");
        expect(await ok("effect", "add", "Ada", "Shield of Faith", "--set", "bonus-ac=2")).toContain("ac 15 → 17");
    });

    it("leaves a creature the armor class of its stat block", async () => {
        expect(await ok("show", "Wolf")).toContain("ac: 13");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--creatures", "Wolf=1");
        expect(await ok("show", "Wolf 1")).toContain("ac: 13");
    });
});

describe("the attacks (D-231)", () => {
    it("works out each weapon equipped: its ability, proficiency, magic bonus, and Dueling with one weapon only", async () => {
        await character("Gara", "classes=[[Fighter]] 1", "weapon-proficiencies=[simple weapons, martial weapons]", "fighting-styles=[Dueling]");
        await carry("Gara", { Spada: "Longsword", Balestra: "Light Crossbow", Pugnale: "Dagger" }, ["Spada"]);
        await ok("write", "Spada", "--set", "magic=[[Weapon, +1, +2, or +3]]", "--set", "bonus=1");
        expect(await ok("show", "Gara")).toContain("Attacks: Spada +6, 1d8+6 slashing");
        expect(await ok("show", "Gara#Attacks")).toContain("Spada: attack +6: str-mod +3, proficiency +2, martial weapons in weapon-proficiencies, bonus +1; damage-roll 1d8+6 slashing");
        await ok("write", "Gara", "--add", "equipped=[[Balestra]]", "--add", "equipped=[[Pugnale]]");
        expect(await ok("show", "Gara")).toContain("Attacks: Spada +6, 1d8+4 slashing · Balestra +4, 1d8+2 piercing · Pugnale +5, 1d4+3 piercing");
    });

    it("adds no proficiency the character lacks, and Archery to a ranged weapon", async () => {
        await character("Ada", "classes=[[Wizard]] 1", "weapon-proficiencies=[daggers, light crossbows]");
        await carry("Ada", { Spada: "Longsword", Balestra: "Light Crossbow" }, ["Spada", "Balestra"]);
        expect(await ok("show", "Ada")).toContain("Attacks: Spada +3, 1d8+3 slashing · Balestra +4, 1d8+2 piercing");
        await character("Lyra", "classes=[[Ranger]] 2", "weapon-proficiencies=[simple weapons, martial weapons]", "fighting-styles=[Archery]");
        await carry("Lyra", { Arco: "Longbow" }, ["Arco"]);
        expect(await ok("show", "Lyra")).toContain("Attacks: Arco +6, 1d8+2 piercing");
    });
});

describe("what a character has equipped (CON-12)", () => {
    it("is only what it carries: validate says so, and moving an item away takes it off", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        await carry("Gara", { Spada: "Longsword" }, ["Spada"]);
        await ok("write", "Gara", "--add", "equipped=[[Longsword]]");
        expect(await ok("validate")).toContain("Gara has Longsword in equipped, but it is an item of the system 5e, a kind: what a character wears or wields is an item of the campaign with item=[[Longsword]], in its inventory.");
        await ok("write", "Gara", "--remove", "equipped=[[Longsword]]");
        await ok("write", "Sentiero", "--type", "place");
        await ok("move", "Spada", "--to", "Sentiero");
        expect(readFileSync(join(folder, "world", "characters", "Gara.md"), "utf8")).not.toContain("equipped");
        expect(await ok("validate")).toBe("No problems.");
        await ok("write", "Gara", "--set", "equipped=[[Spada]]");
        expect(await ok("validate")).toContain("Gara has Spada in equipped, but does not carry it: a character wears or wields only what it holds. Fix: move Spada, to Gara; or write Gara, remove equipped=[[Spada]].");
    });
});
