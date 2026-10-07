// The uses of features and the rests that bring them back (D-204, D-220; DAT-3, DAT-4, DAT-9), through the commands on the 5e.
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
    await ok("init", "--name", "Prova", "--system", "5e", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** A character of the party with these classes, its abilities at 14 and its race human unless given. */
async function character(name: string, ...fields: string[]): Promise<string>
{
    const given = new Set(fields.map((field) => field.split("=")[0]));
    const base = ["role=pc", "creature=[[Human]]", "str=14", "dex=14", "con=14", "int=14", "wis=14", "cha=14", "hp-base=20"].filter((field) => !given.has(field.split("=")[0]));
    return ok("write", name, "--type", "character", ...[...base, ...fields].flatMap((field) => ["--set", field]));
}

function pageText(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8");
}

describe("the uses a character has (DAT-9)", () => {
    it("writes the uses its classes give full, with the hit points and the hit dice, and says so", async () => {
        const written = await character("Gara", "classes=[[Fighter]] 2");
        expect(written).toContain("Gara has hp 24/24, hit-dice-d10 2/2, action-surge 1/1, second-wind 1/1, full: uses of the system 5e that come back with a rest.");
        expect(pageText("Gara")).toContain("action-surge: 1/1");
        expect(await ok("status")).toContain("hit-dice-d10 2/2 · action-surge 1/1 · second-wind 1/1");
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

    it("reads full a use the page does not write, as a page written by hand, with the maximum from the class's row", async () => {
        const hand = '---\nrole: pc\nclasses: ["[[Monk]] 5", "[[Sorcerer]] 3"]\ncon: 12\nhp-base: 30\n---\n';
        writeFileSync(join(folder, "world", "characters", "Ishi.md"), hand);
        const status = await ok("status");
        expect(status).toContain("ki-points 5/5");
        expect(status).toContain("sorcery-points 3/3");
        expect(pageText("Ishi")).toBe(hand);
        expect(await ok("show", "Ishi#Features")).toContain("ki-points 5/5: the maximum from Monk 5 in classes");
    });

    it("gives a new level's uses, and grows those it has without filling what was spent", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        expect(pageText("Gara")).not.toContain("action-surge");
        await ok("change", "Gara", "second-wind", "--by=-1");
        const written = await ok("write", "Gara", "--set", "classes=[[Fighter]] 17");
        expect(written).toContain("action-surge 2/2");
        expect(written).toContain("indomitable 3/3");
        expect(pageText("Gara")).toContain("second-wind: 0/1");
    });

    it("reads a race's use from its page, and brings it back as the race's", async () => {
        await character("Zarn", "creature=[[Dragonborn]]", "classes=[[Wizard]] 1");
        expect(await ok("status")).toContain("breath-weapon 1/1");
        await ok("change", "Zarn", "breath-weapon", "--by=-1");
        expect(await ok("change", "--recipe", "short rest")).toContain("breath-weapon 0/1 → 1/1 (again as Dragonborn)");
    });
});

describe("the rests (DAT-4, DAT-9)", () => {
    it("brings back with a short rest the uses that come back with it, and with a long rest every one", async () => {
        await character("Gara", "classes=[[Fighter]] 9");
        await ok("change", "Gara", "action-surge", "--by=-1");
        await ok("change", "Gara", "indomitable", "--by=-1");
        const short = await ok("change", "--recipe", "short rest");
        expect(short).toContain("Gara: action-surge 0/1 → 1/1. Not brought back: indomitable 0/1.");
        expect(await ok("change", "--recipe", "long rest")).toContain("indomitable 0/1 → 1/1");
    });

    it("brings back half the hit dice with a long rest, at least one, and leaves the choice to the player among dice of different kinds (p. 87)", async () => {
        await character("Gara", "classes=[[Fighter]] 3");
        await ok("change", "Gara", "hit-dice-d10", "--by=-3");
        expect(await ok("change", "--recipe", "long rest")).toContain("hit-dice-d10 0/3 → 1/3");
        await ok("write", "Gara", "--set", "classes=[[Fighter]] 3, [[Wizard]] 2");
        await ok("change", "Gara", "hit-dice-d6", "--by=-2");
        expect(await ok("change", "--recipe", "long rest")).toContain(
            "Ask the player: which hit-dice come back, up to 2 of hit-dice-d10 1/3, hit-dice-d6 0/2: change each one by what they take.",
        );
        await ok("change", "Gara", "hit-dice-d10", "--by=2");
        expect(await ok("change", "--recipe", "long rest")).toContain("hit-dice-d6 0/2 → 2/2");
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
});

describe("a threshold given with write (DAT-3)", () => {
    it("shows the rule of exhaustion when write gives it to the player character", async () => {
        await character("Gara", "classes=[[Fighter]] 1");
        expect(await ok("write", "Gara", "--set", "exhaustion=1/6")).toContain("exhaustion changed: Exhaustion, from the rules of 5e:");
    });
});

describe("features that change the numbers (D-222)", () => {
    it("adds half the proficiency bonus to a check without it: Jack of All Trades rounded down, Remarkable Athlete rounded up on Strength, Dexterity and Constitution", async () => {
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

    it("adds Aura of Protection to a paladin's own saves, at least 1", async () => {
        await character("Ser", "classes=[[Paladin]] 6", "cha=8", "save-proficiencies=[wis, cha]");
        expect(await ok("show", "Ser")).toContain("Saving Throws: str-save +3 · dex-save +3 · con-save +3 · int-save +3 · wis-save +6 ● · cha-save +3 ●");
    });
});
