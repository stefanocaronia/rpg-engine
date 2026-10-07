// What a character wears and wields on the 5e (D-231, D-232, PRO-5, CON-12): the armor class from armor, shield and what changes it, and the attacks of the
// weapons equipped, worked out from the formulas of their pages.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
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

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

/** A character of the party: str 16, dex 14, con 14, int 10, wis 14, cha 10 (+3, +2, +2, +0, +2, +0), unless the fields say otherwise. */
async function character(name: string, ...fields: string[]): Promise<void>
{
    const given = new Set(fields.map((field) => field.slice(0, field.indexOf("="))));
    const base = ["role=pc", "creature=[[Human]]", "str=16", "dex=14", "con=14", "int=10", "wis=14", "cha=10", "hp-base=20"].filter((field) => !given.has(field.slice(0, field.indexOf("="))));
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

describe("the pages of armor and weapons", () => {
    it("give every armor the SRD's text, and every armor, shield and weapon a magic bonus of 0, which a magic one writes", () => {
        const items = join(import.meta.dirname, "..", "systems", "5e", "world", "items");
        const pages = readdirSync(items).map((file) => readFileSync(join(items, file), "utf8").replaceAll("\r\n", "\n"));
        const armors = pages.filter((text) => /^category: (light|medium|heavy) armor$/m.test(text));
        expect(armors).toHaveLength(12);
        expect(armors.filter((text) => text.endsWith("---\n"))).toEqual([]);
        expect(pages.filter((text) => /^category: (light armor|medium armor|heavy armor|shield|(simple|martial) (melee|ranged) weapon)$/m.test(text) && !/^bonus: 0$/m.test(text))).toEqual([]);
    });
});

describe("the armor class (D-231)", () => {
    it("is the armor's with the shield, and Defense adds one while armor is worn", async () => {
        await character("Gara", "classes=[[Fighter]] 1", "fighting-styles=[Defense]");
        await carry("Gara", { Cotta: "Chain Mail", Scudo: "Shield", Cuoio: "Leather Armor" }, ["Cotta", "Scudo"]);
        expect(await ok("show", "Gara#Combat")).toContain("ac 19: armor-class 16, armor-class-bonus +2, Defense in fighting-styles");
        await ok("write", "Gara", "--set", "equipped=[[Cuoio]]");
        expect(await ok("show", "Gara")).toContain("Combat: ac 14 ·");
        await ok("write", "Gara", "--unset", "equipped");
        expect(await ok("show", "Gara#Combat")).toContain("ac 12: dex-mod +2");
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
        expect(await ok("effect", "add", "Ada", "Shield of Faith", "--set", "bonus-ac=2")).toContain("bonus-ac none → +2, ac 15 → 17");
        // What changes the armor class through a value the effect changes, as Dexterity, is said too.
        expect(await ok("effect", "add", "Ada", "Agility", "--set", "dex=18")).toBe("Ada: Agility, until it is ended; dex 14 → 18, dex-mod +2 → +4, ac 17 → 19.");
    });

    it("takes the first class's Unarmored Defense, as p. 57 wants, and says so when a second class gives one", async () => {
        await character("Brann", "classes=[[Barbarian]] 1", "con=16");
        expect(await ok("write", "Brann", "--add", "classes=[[Monk]] 1")).toContain("ac reads unarmored-ac from Barbarian, the first in Brann's classes that gives it, not from Monk.");
        expect(await ok("show", "Brann#Combat")).toContain("ac 15: unarmored-ac 15");
    });

    it("reads the first armor equipped, and says so when a second is added", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        await carry("Gara", { Cotta: "Chain Mail", Cuoio: "Leather Armor" }, ["Cotta"]);
        expect(await ok("write", "Gara", "--add", "equipped=[[Cuoio]]")).toContain("ac reads armor-class from Cotta, the first in Gara's equipped that gives it, not from Cuoio.");
        expect(await ok("show", "Gara")).toContain("Combat: ac 16 ·");
    });

    it("leaves a creature, and a character with a level but no classes, the armor class of its stat block", async () => {
        expect(await ok("show", "Wolf")).toContain("ac: 13");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--creatures", "Wolf=1");
        expect(await ok("show", "Wolf 1")).toContain("ac: 13");
        expect(await ok("effect", "add", "Wolf 1", "Shield of Faith", "--set", "bonus-ac=2")).toBe("Wolf 1: Shield of Faith, until it is ended; bonus-ac none → +2, which nothing of Wolf 1 reads.");
        await ok("write", "Sergente", "--type", "character", "--set", "role=npc", "--set", "creature=[[Guard]]", "--set", "level=3");
        expect(await ok("show", "Sergente")).toContain("ac: 16");
        await ok("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]", "--set", "level=2");
        expect(await ok("show", "Lupa")).toContain("Combat: ac 13 ·");
    });

    it("is changed by an effect through what it comes from, never directly, and validate says so of an effect written before", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        await carry("Gara", { Cotta: "Chain Mail", Scudo: "Shield" }, ["Cotta", "Scudo"]);
        expect(await refused("effect", "add", "Gara", "Barkskin", "--set", "ac=16")).toBe(
            "ac on Gara is worked out by the system 5e from equipped, fighting-styles, bonus-ac: give the effect one of the fields it comes from instead, such as bonus-ac. Nothing changed.",
        );
        expect(await refused("effect", "add", "Gara", "Scudo magico", "--set", "armor-class-bonus=4")).toBe(
            "armor-class-bonus on Gara is what Scudo in its equipped gives, by the formula of its page: an effect on Scudo changes it, through bonus, such as effect add, page Scudo, set bonus=1. Nothing changed.",
        );
        const page = join(folder, "world", "characters", "Gara.md");
        writeFileSync(page, readFileSync(page, "utf8").replace("---\n", '---\neffects:\n  - "Scudo della fede (ac: 20)"\n'));
        expect(await ok("validate")).toContain(
            'Scudo della fede on Gara gives ac, which the system 5e works out, so it does not count. Fix: effect end Gara "Scudo della fede", then add it again with what ac comes from, such as bonus-ac.',
        );
    });
});

describe("the attacks (D-231, D-232)", () => {
    it("works out each weapon equipped: its ability, proficiency, magic bonus, and Dueling on every one-handed melee weapon, as on a sheet", async () => {
        await character("Gara", "classes=[[Fighter]] 1", "weapon-proficiencies=[simple weapons, martial weapons]", "fighting-styles=[Dueling]");
        await carry("Gara", { Spada: "Longsword", Balestra: "Light Crossbow", Pugnale: "Dagger" }, ["Spada"]);
        await ok("write", "Spada", "--set", "magic=[[Weapon, +1, +2, or +3]]", "--set", "bonus=+1");
        expect(await ok("show", "Gara")).toContain("Attacks: Spada +6, 1d8+6 slashing");
        expect(await ok("show", "Gara#Attacks")).toContain("Spada: attack +6: str-mod +3, proficiency +2, martial weapons in weapon-proficiencies, bonus +1; damage-roll 1d8+6 slashing");
        await ok("write", "Gara", "--add", "equipped=[[Balestra]]", "--add", "equipped=[[Pugnale]]");
        expect(await ok("show", "Gara")).toContain("Attacks: Spada +6, 1d8+6 slashing · Balestra +4, 1d8+2 piercing · Pugnale +5, 1d4+5 piercing");
    });

    it("adds no proficiency the character lacks, Archery to a ranged weapon, and the better of Strength and Dexterity to a finesse one", async () => {
        await character("Ada", "classes=[[Wizard]] 1", "weapon-proficiencies=[daggers, light crossbows]", "str=8");
        await carry("Ada", { Spada: "Longsword", Balestra: "Light Crossbow", Dardo: "Dart" }, ["Spada", "Balestra", "Dardo"]);
        expect(await ok("show", "Ada")).toContain("Attacks: Spada -1, 1d8-1 slashing · Balestra +4, 1d8+2 piercing · Dardo +2, 1d4+2 piercing");
        expect(await ok("show", "Ada#Attacks")).toContain("Dardo: attack +2: dex-mod +2; damage-roll 1d4+2 piercing: dex-mod +2");
        await character("Lyra", "classes=[[Ranger]] 2", "weapon-proficiencies=[simple weapons, martial weapons]", "fighting-styles=[Archery]");
        await carry("Lyra", { Arco: "Longbow" }, ["Arco"]);
        expect(await ok("show", "Lyra")).toContain("Attacks: Arco +6, 1d8+2 piercing");
    });

    it("gives a monk's weapons Dexterity with Martial Arts (p. 26)", async () => {
        await character("Kai", "classes=[[Monk]] 1", "str=12", "dex=18", "weapon-proficiencies=[simple weapons, shortswords]");
        await carry("Kai", { Bastone: "Quarterstaff", Ascia: "Greataxe" }, ["Bastone", "Ascia"]);
        expect(await ok("show", "Kai")).toContain("Attacks: Bastone +6, 1d6+4 bludgeoning · Ascia +1, 1d12+1 slashing");
        expect(await ok("show", "Kai#Attacks")).toContain("Bastone: attack +6: dex-mod +4, Martial Arts in features, proficiency +2, simple weapons in weapon-proficiencies;");
    });

    it("reads the effects on a weapon, as Magic Weapon, and never a bonus of who wields it", async () => {
        await character("Gara", "classes=[[Fighter]] 1", "weapon-proficiencies=[martial weapons]");
        await carry("Gara", { Spada: "Longsword", Cotta: "Chain Mail" }, ["Spada", "Cotta"]);
        await ok("effect", "add", "Spada", "Magic Weapon", "--set", "bonus=1");
        expect(await ok("show", "Gara")).toContain("Attacks: Spada +6, 1d8+4 slashing");
        expect(await ok("effect", "add", "Gara", "Benedizione sbagliata", "--set", "bonus=1")).toBe("Gara: Benedizione sbagliata, until it is ended; bonus none → +1, which nothing of Gara reads.");
        expect(await ok("show", "Gara")).toContain("Combat: ac 16 ·");
    });

    it("says where they come from while there are none, and validate reports words after a number another formula reads", async () => {
        await character("Mira", "classes=[[Ranger]] 1");
        expect(await ok("show", "Mira#Attacks")).toContain("Mira has nothing in Attacks yet: the pages of the items in its equipped give it, as attack and damage-roll.");
        await ok("write", "Strana", "--type", "item", "--set", "item=[[Leather Armor]]", "--set", "armor-class=12 + Dex modifier");
        await ok("move", "Strana", "--to", "Mira");
        await ok("write", "Mira", "--set", "equipped=[[Strana]]");
        expect(await ok("validate")).toContain(
            'armor-class on Strana ends with "modifier", words no formula counts, so Mira has it only as text. Fix: write Strana, set armor-class as a formula alone, without "modifier".',
        );
        await ok("write", "Strana", "--set", "armor-class=12 + dex-mod + bonus");
        expect(await ok("validate")).toBe("No problems.");
    });
});

describe("what a character has equipped (CON-12)", () => {
    it("is only what it carries: write refuses a page of the system, says what it no longer carries, and moving an item away takes it off", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        await carry("Gara", { Spada: "Longsword", Cotta: "Chain Mail" }, ["Spada", "Cotta"]);
        expect(await refused("write", "Gara", "--add", "equipped=[[Longsword]]")).toBe(
            "Longsword is an item of the system 5e, a kind: no one wears or wields it. To equip Gara with one, create it under a name in the campaign's language: "
                + 'write "<name>", type item, set item=[[Longsword]]; then move, page "<name>", to Gara, and add it to equipped. Nothing changed.',
        );
        expect(await ok("write", "Gara", "--remove", "inventory=[[Cotta]]")).toContain(
            "Gara has Cotta in equipped, but does not carry it: a character wears or wields only what it holds. Fix: move Cotta, to Gara; or write Gara, remove equipped=[[Cotta]].",
        );
        await ok("write", "Gara", "--remove", "equipped=[[Cotta]]");
        await ok("write", "Sentiero", "--type", "place");
        expect(await ok("move", "Spada", "--to", "Sentiero")).toContain("Gara has Spada equipped no more.");
        expect(readFileSync(join(folder, "world", "characters", "Gara.md"), "utf8")).not.toContain("equipped");
        expect(await ok("validate")).toBe("No problems.");
        await ok("write", "Gara", "--set", "equipped=[[Spada]]");
        expect(await ok("validate")).toContain("Gara has Spada in equipped, but does not carry it: a character wears or wields only what it holds. Fix: move Spada, to Gara; or write Gara, remove equipped=[[Spada]].");
    });

    it("loses what was inside a container that goes elsewhere, and nothing when nothing moves", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        await carry("Gara", { Zaino: "Backpack" }, []);
        await ok("write", "Spada", "--type", "item", "--set", "item=[[Longsword]]");
        await ok("move", "Spada", "--to", "Zaino");
        await ok("write", "Gara", "--set", "equipped=[[Spada]]");
        expect(await ok("show", "Gara")).toContain("Attacks: Spada");
        // Moved where it already is, the sword stays equipped.
        expect(await ok("move", "Spada", "--to", "Zaino")).toBe("Nothing changed: Spada is already in Zaino.");
        await ok("write", "Bosco", "--type", "place");
        expect(await ok("move", "Zaino", "--to", "Bosco")).toBe("Moved Zaino: now in Bosco.\nGara has Spada equipped no more.");
        expect(await ok("show", "Gara")).not.toContain("Attacks:");
    });

    it("tells the system's name of an item the campaign names in its own language", async () => {
        await ok("config", "language", "it");
        expect(await ok("write", "Lama", "--type", "item", "--set", "item=[[Spada lunga]]")).toContain(
            "No page for [[Spada lunga]] yet: create it with write if it belongs to this world, or link a page that exists. The system 5e names its pages in English: find looks them up.",
        );
    });
});
