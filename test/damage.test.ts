// Damage of a type (D-449; DMG-1, DMG-2, DMG-3): what the lists of who takes it ignore, halve or double, before temporary hit points and hit points lose it.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
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
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "hp=20/20");
});

afterEach(() => removeFolder(folder));

describe("damage of a type", () => {
    it("halves it rounded down for a resistance, takes none for an immunity, and doubles it after halving for a vulnerability (DMG-1)", async () => {
        await ok("write", "Ettore", "--add", "damage-resistances=fire", "--add", "damage-immunities=poison", "--add", "damage-vulnerabilities=fire");
        expect(await ok("change", "Ettore", "hp", "--by=-13", "--damage", "fire")).toBe("Ettore: hp 20/20 → 8/20: fire 13 halved, in damage-resistances, then doubled, in damage-vulnerabilities: 12.");
        expect(await ok("change", "Ettore", "hp", "--by=-5", "--damage", "poison")).toBe("Nothing changed: hp on Ettore is 8/20: poison ignored, in damage-immunities.");
        expect(await ok("change", "Ettore", "hp", "--by=-3", "--damage", "cold")).toBe("Ettore: hp 8/20 → 5/20.");
    });

    it("adds what an attuned item and an effect give to the page's own lists, never covering them (DMG-1)", async () => {
        await ok("write", "Ettore", "--add", "damage-resistances=poison");
        await ok("effect", "add", "Ettore", "Rage", "--set", "damage-resistances=bludgeoning, piercing, slashing");
        expect(await ok("change", "Ettore", "hp", "--by=-9", "--damage", "slashing")).toBe("Ettore: hp 20/20 → 16/20: slashing 9 halved, in damage-resistances: 4.");
        expect(await ok("change", "Ettore", "hp", "--by=-4", "--damage", "poison")).toBe("Ettore: hp 16/20 → 14/20: poison 4 halved, in damage-resistances: 2.");
        await ok("write", "Ettore", "--add", "attuned=[[Staff of Fire]]");
        expect(await ok("change", "Ettore", "hp", "--by=-6", "--damage", "fire")).toBe("Ettore: hp 14/20 → 11/20: fire 6 halved, in damage-resistances: 3.");
    });

    it("reminds the type when damage without one reaches a page with lists, and what goes past 0 in a form (D-454)", async () => {
        await ok("write", "Ettore", "--add", "damage-resistances=fire");
        expect(await ok("change", "Ettore", "hp", "--by=-4")).toContain("Ettore has damage-resistances fire: if this damage has a type, give it with damage, as rolled.");
        await ok("effect", "add", "Ettore", "Forma d'orso", "--set", "hp=10/10");
        expect(await ok("change", "Ettore", "hp", "--by=-14")).toContain("4 went past 0 in Forma d'orso: when it ends so, what goes past may carry over to Ettore's own hp, as its text says.");
    });

    it("takes the temporary hit points first, from what is left after halving (DMG-1)", async () => {
        await ok("write", "Ettore", "--add", "damage-resistances=slashing", "--set", "temp-hp=4");
        const hit = await ok("change", "Ettore", "hp", "--by=-10", "--damage", "slashing");
        expect(hit.split("\n")[0]).toBe("Ettore: hp 20/20 → 19/20: slashing 10 halved, in damage-resistances: 5; temp-hp 4 → 0 first.");
        expect(hit).not.toContain("which goes first");
        // All of it on the temporary hit points, the hit points untouched.
        await ok("change", "Ettore", "temp-hp", "--to", "8");
        expect((await ok("change", "Ettore", "hp", "--by=-6", "--damage", "slashing")).split("\n")[0]).toBe("Ettore: temp-hp 8 → 5: slashing 6 halved, in damage-resistances: 3.");
    });

    it("waits for the master on a resistance that holds only for some damage, then follows what they say (DMG-3)", async () => {
        writeFileSync(
            join(folder, "world", "characters", "Lupo.md"),
            '---\nrole: npc\nhp: 30/30\ndamage-resistances: ["bludgeoning, piercing, and slashing from nonmagical attacks"]\n---\n',
        );
        const asked = await runCommandLine(["change", "Lupo", "hp", "--by=-9", "--damage", "piercing"], context);
        expect(asked.output).toBe(
            'Lupo has "bludgeoning, piercing, and slashing from nonmagical attacks" in damage-resistances, which hold only for some damage: give damage "piercing (applies)" when it holds for this one, '
                + 'or "piercing (does not apply)" (read rules "Damage Resistance and Vulnerability"). Nothing changed.',
        );
        expect(await ok("change", "Lupo", "hp", "--by=-9", "--damage", "piercing (applies)")).toBe("Lupo: hp 30/30 → 26/30: piercing 9 halved, in damage-resistances: 4.");
        expect(await ok("change", "Lupo", "hp", "--by=-9", "--damage", "piercing (does not apply)")).toBe("Lupo: hp 26/30 → 17/30.");
        expect(await ok("change", "Lupo", "hp", "--by=-2", "--damage", "fire")).toBe("Lupo: hp 17/30 → 15/30.");
    });

    it("reads the lists of a creature's page on its copies in the scene, as a skeleton's vulnerability (DMG-1)", async () => {
        await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore", "--creatures", "Skeleton=1");
        expect(await ok("change", "Skeleton 1", "hp", "--by=-4", "--damage", "bludgeoning")).toBe("Skeleton 1: hp 13/13 → 5/13: bludgeoning 4 doubled, in damage-vulnerabilities: 8.");
        expect(await ok("change", "Skeleton 1", "hp", "--by=-4", "--damage", "poison")).toBe("Nothing changed: hp on Skeleton 1 is 5/13: poison ignored, in damage-immunities.");
    });

    it("tells what someone keeps the whole damage, the temporary hit points' part too (DMG-1, EFF-14)", async () => {
        await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore");
        await ok("scene", "order", "--order", "Ettore");
        await ok("effect", "add", "Ettore", "Bless", "--for", "10 rounds", "--by", "[[Ettore]]");
        await ok("change", "Ettore", "temp-hp", "--to", "10");
        const hit = await ok("change", "Ettore", "hp", "--by=-15", "--damage", "slashing");
        expect(hit).toContain("Ettore: hp 20/20 → 15/20: temp-hp 10 → 0 first.");
        expect(hit).toContain("Ettore keeps Bless (Ettore): lost 15 hp. Read rules Concentration.");
    });

    it("asks of an item that names no type, as damage from spells, says what to do when conditions in several lists do not all hold, and refuses a list written as text (DMG-3)", async () => {
        const npc = (name: string, lines: string[]): void => writeFileSync(join(folder, "world", "characters", `${name}.md`), ["---", "role: npc", "hp: 30/30", ...lines, "---", ""].join("\n"));
        npc("Mago", ['damage-resistances: ["damage from spells"]']);
        expect((await runCommandLine(["change", "Mago", "hp", "--by=-8", "--damage", "fire"], context)).output).toContain('Mago has "damage from spells" in damage-resistances, which hold only for some damage');
        expect(await ok("change", "Mago", "hp", "--by=-8", "--damage", "fire (applies)")).toBe("Mago: hp 30/30 → 26/30: fire 8 halved, in damage-resistances: 4.");
        npc("Raksha", ['damage-vulnerabilities: ["piercing from magic weapons wielded by good creatures"]', 'damage-immunities: ["bludgeoning, piercing, and slashing from nonmagical attacks"]']);
        expect((await runCommandLine(["change", "Raksha", "hp", "--by=-8", "--damage", "piercing"], context)).output).toContain("; when they do not all hold, give the damage worked out, without damage");
        npc("Scritto", ["damage-resistances: fire, cold"]);
        expect((await runCommandLine(["change", "Scritto", "hp", "--by=-8", "--damage", "fire"], context)).output).toBe(
            'Scritto\'s damage-resistances is text, "fire, cold": write it as a list, such as damage-resistances: [acid, bludgeoning]. Nothing changed.',
        );
    });

    it("refuses a type the system does not name, damage without by negative, and another counter (DMG-2)", async () => {
        expect((await runCommandLine(["change", "Ettore", "hp", "--by=-5", "--damage", "fuoco"], context)).output).toMatch(/^"fuoco" is no damage type of 5e: give one of acid, bludgeoning, .*\. Nothing changed\.$/);
        expect((await runCommandLine(["change", "Ettore", "hp", "--by=5", "--damage", "fire"], context)).output).toBe(
            "A damage type goes with by, negative, the damage before Ettore's lists change it, such as by -12, damage fire. Nothing changed.",
        );
        await ok("write", "Ettore", "--set", "temp-hp=3");
        expect((await runCommandLine(["change", "Ettore", "temp-hp", "--by=-1", "--damage", "fire"], context)).output).toBe(
            "A damage type goes with hp, not temp-hp: change Ettore hp --by=-12 --damage fire. Nothing changed.",
        );
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
