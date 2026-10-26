// The uses of what a character has and the rests that bring them back (D-204, D-220; DAT-3, DAT-4, DAT-9), through the commands on the fake system: the
// rallies of a Warden's table, a people's own use, a second deed from a knack. The 5e's classes and features go with it (D-514, step 8).
import { readFileSync, writeFileSync } from "node:fs";
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
    await ok("init", "--name", "Prova", "--system", "fake", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

function pageText(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8");
}

describe("the uses a character has (DAT-9)", () => {
    it("writes the uses its vocations give full, with the grit and the stamina dice, and says so", async () => {
        const written = await ok("write", "Gara", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 2", "--set", "might=5");
        expect(written).toContain("Gara has grit 13/13, stamina-d6 2/2, rallies 2/2, full: uses of the system fake that come back with a rest.");
        expect(pageText("Gara")).toContain("rallies: 2/2");
        expect(await ok("status")).toContain("PC: Gara: level 2 · grit 13/13 · stamina-d6 2/2 · rallies 2/2");
        expect(await ok("show", "Gara")).toContain("Knacks: knacks Steady Hand, Iron Lung · knack-count 2 · rallies 2/2");
    });

    it("reads full a use the page does not write, as a page written by hand, with the maximum from the vocation's row", async () => {
        const hand = '---\nrole: pc\nvocations: ["[[Warden]] 2"]\n---\n';
        writeFileSync(join(folder, "world", "characters", "Ishi.md"), hand);
        expect(await ok("status")).toContain("rallies 2/2");
        expect(pageText("Ishi")).toBe(hand);
        expect(await ok("show", "Ishi#Knacks")).toContain("rallies 2/2: the maximum from Warden 2 in vocations");
    });

    it("gives a new rank's uses, and grows those it has without filling what was spent", async () => {
        await ok("write", "Rho", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Warden]] 1");
        expect(pageText("Rho")).not.toContain("second-deed");
        await ok("change", "Rho", "rallies", "--by=-1");
        const written = await ok("write", "Rho", "--set", "vocations=[[Warden]] 3, [[Scout]] 2");
        expect(written).toContain("rallies 1/2 (max 1 → 2: Warden 3 in vocations)");
        expect(written).toContain("second-deed 1/1");
        // The one spent stays spent.
        expect(pageText("Rho")).toContain("rallies: 1/2");
    });

    it("reads a people's use from its page, and brings it back as the people's", async () => {
        await ok("write", "Zarn", "--type", "character", "--set", "role=companion", "--set", "creature=[[Fenfolk]]", "--set", "vocations=[[Scout]] 1");
        expect(await ok("status")).toContain("marsh-breath 1/1");
        await ok("change", "Zarn", "marsh-breath", "--by=-1");
        expect(await ok("change", "Zarn", "--recipe", "breather")).toContain("marsh-breath 0/1 → 1/1 (again as Fenfolk)");
    });
});

describe("the rests (DAT-4, DAT-9)", () => {
    beforeEach(async () => {
        await ok("write", "Gara", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 2", "--set", "might=5");
    });

    it("brings back with a breather what its formula gives, and with a night's sleep every one", async () => {
        await ok("change", "Gara", "rallies", "--by=-2");
        expect(await ok("change", "--recipe", "breather")).toContain("Gara: rallies 0/2 → 1/2. Not brought back: rallies 1/2.");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("Gara: rallies 1/2 → 2/2.");
    });

    it("brings back half the stamina dice with a night's sleep, at least one, and leaves the choice to the player among dice of different kinds", async () => {
        await ok("change", "Gara", "stamina-d6", "--by=-2");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("stamina-d6 0/2 → 1/2");
        await ok("write", "Gara", "--set", "vocations=[[Warden]] 3, [[Scout]] 2");
        await ok("change", "Gara", "stamina-d6", "--by=-1");
        await ok("change", "Gara", "stamina-d4", "--by=-2");
        expect(await ok("change", "--recipe", "night's sleep")).toContain(
            "Ask the player: which stamina come back, up to 2 of stamina-d6 1/3, stamina-d4 0/2: change each one by what they take.",
        );
        await ok("change", "Gara", "stamina-d6", "--by=2");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("stamina-d4 0/2 → 2/2");
    });
});

describe("a threshold given with write (DAT-3)", () => {
    it("shows the rule of what it touches when write gives it to the player character", async () => {
        await ok("write", "Gara", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1");
        expect(await ok("write", "Gara", "--set", "resolve-loss=1/5")).toContain("resolve-loss changed: Hunger, from the rules of fake:");
    });
});

// The 5e's: the uses its classes, features and abilities give, and the features that change its numbers, go with it (D-514, step 8).
describe("the 5e's uses", () => {
    beforeEach(async () => {
        await ok("config", "system", "5e");
    });

    /** A character of the party with these classes, its abilities at 14 and its race human unless given. */
    async function character(name: string, ...fields: string[]): Promise<string>
    {
        const given = new Set(fields.map((field) => field.split("=")[0]));
        const base = ["role=pc", "creature=[[Human]]", "str=14", "dex=14", "con=14", "int=14", "wis=14", "cha=14", "hp-base=20"].filter((field) => !given.has(field.split("=")[0]));
        return ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
    }

    it("writes the uses its classes give full, with the hit points and the hit dice, and says so", async () => {
        const written = await character("Gara", "classes=[[Fighter]] 2");
        expect(written).toContain("Gara has hp 24/24, hit-dice-d10 2/2, action-surge 1/1, second-wind 1/1, full: uses of the system 5e that come back with a rest.");
        expect(await ok("show", "Gara")).toContain("Features: features Fighting Style, Second Wind, Action Surge (one use) · action-surge 1/1 · second-wind 1/1");
    });

    it("takes the maximum of a use from the class's row, and from the features and the abilities", async () => {
        await character("Bruk", "classes=[[Barbarian]] 6, [[Cleric]] 6", "cha=16");
        const shown = await ok("show", "Bruk");
        expect(shown).toContain("rages 4/4");
        expect(shown).toContain("channel-divinity 2/2");
        await character("Lirà", "classes=[[Bard]] 1, [[Paladin]] 3", "subclasses=[[Oath of Devotion]]", "cha=16");
        const bard = await ok("show", "Lirà");
        // Paladin's Channel Divinity from its oath, Bardic Inspiration as many as the Charisma modifier, Divine Sense one more, Lay on Hands 5 per level.
        expect(bard).toContain("channel-divinity 1/1");
        expect(bard).toContain("bardic-inspiration 3/3");
        expect(bard).toContain("divine-sense 4/4");
        expect(bard).toContain("lay-on-hands 15/15");
    });

    it("brings back a bard's inspiration with a short rest only from Font of Inspiration, and 4 sorcery points from Sorcerous Restoration", async () => {
        await character("Lirà", "classes=[[Bard]] 4");
        await ok("change", "Lirà", "bardic-inspiration", "--by=-1");
        expect(await ok("change", "--recipe", "short rest")).toContain("Not brought back: bardic-inspiration 1/2.");
        await ok("write", "Lirà", "--set", "classes=[[Bard]] 5");
        expect(await ok("change", "--recipe", "short rest")).toContain("bardic-inspiration 1/2 → 2/2");
        await character("Sef", "classes=[[Sorcerer]] 20");
        await ok("change", "Sef", "sorcery-points", "--by=-10");
        expect(await ok("change", "Sef", "--recipe", "short rest")).toContain("sorcery-points 10/20 → 14/20");
    });

    it("shows the rule of exhaustion when write gives it to the player character (DAT-3)", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        expect(await ok("write", "Gara", "--set", "exhaustion=1/6")).toContain("exhaustion changed: Exhaustion, from the rules of 5e:");
    });

    it("adds half the proficiency bonus to a check without it: Jack of All Trades rounded down, Remarkable Athlete rounded up on Strength, Dexterity and Constitution (D-222)", async () => {
        await character("Lirà", "classes=[[Bard]] 2", "skill-proficiencies=[Performance]");
        const bard = await ok("show", "Lirà");
        // Proficiency +2: half is +1, on every check without the proficiency, initiative too; none on a skill it is proficient in.
        expect(bard).toContain("athletics +3 · deception +3");
        expect(bard).toContain("performance +4 ●");
        expect(bard).toContain("initiative +3");
        expect(await ok("show", "Lirà#Skills")).toContain("athletics +3: str-mod +2, proficiency +2, Jack of All Trades in features");
        await character("Gara", "classes=[[Fighter]] 7", "subclasses=[[Champion]]");
        const champion = await ok("show", "Gara");
        // Proficiency +3: half rounded up is +2, on Strength and Dexterity checks only.
        expect(champion).toContain("acrobatics +4 · animal-handling +2 · arcana +2 · athletics +4");
        expect(champion).toContain("initiative +4");
    });

    it("adds Aura of Protection to a paladin's own saves, at least 1 (D-222)", async () => {
        await character("Ser", "classes=[[Paladin]] 6", "cha=8", "save-proficiencies=[wis, cha]");
        expect(await ok("show", "Ser")).toContain("Saving Throws: str-save +3 · dex-save +3 · con-save +3 · int-save +3 · wis-save +6 ● · cha-save +3 ●");
    });
});
