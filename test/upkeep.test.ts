// What the party uses up (D-435, D-447; UPK-1–UPK-4), on the fake system: a day's hardtack outside a settlement under the rigor «rules», the days hungry and the
// resolve lost past them, a night's lodging in a settlement, what burns spent as it is lit, one night's sleep in 20 hours and the stamina dice of a breather.
// The 5e's exhaustion goes with it (D-514, step 8).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { change } from "../src/commands/change.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext, useSystem } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("config", "rigor", "rules");
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Guadoscuro", "--type", "place", "--set", "kind=village");
    await ok("write", "Locanda", "--type", "place");
    await ok("write", "Guadoscuro", "--add", "contains=[[Locanda]]");
    await ok("write", "Bosco", "--type", "place");
    // Might 5 gives +1: two days and one more hungry before resolve is lost.
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "might=5", "--add", "inventory=[[Hardtack]] 2", "--add", "inventory=[[Rushlight]] 3");
    await ok("write", "Bosco", "--add", "contains=[[Ettore]]");
});

afterEach(() => removeFolder(folder));

describe("the day's food", () => {
    it("spends a day's hardtack at each midnight outside a settlement, and says no water where the system names none (UPK-1)", async () => {
        const passed = await ok("advance", "--by", "1d");
        expect(passed).toContain("Ettore eats a day's food:");
        expect(passed).not.toContain("Water:");
        expect(page("characters/Ettore.md")).toContain('"[[Hardtack]] 1"');
    });

    it("says when the last of it is eaten, for the player to hear (UPK-2, playtest 05)", async () => {
        expect(await ok("advance", "--by", "1d")).not.toContain("That was the last");
        expect(await ok("advance", "--by", "1d")).toContain("That was the last Hardtack: tell the player before tomorrow.");
    });

    it("counts a kind of the campaign that derives from the system's, as Gallette from Hardtack, and Giunco as a Rushlight (UPK-1, UPK-3)", async () => {
        await ok("write", "Gallette", "--type", "item", "--set", "item=[[Hardtack]]");
        await ok("write", "Giunco", "--type", "item", "--set", "item=[[Rushlight]]");
        await ok("write", "Ettore", "--remove", "inventory=[[Hardtack]] 2", "--remove", "inventory=[[Rushlight]] 3", "--add", "inventory=[[Gallette]] 2", "--add", "inventory=[[Giunco]] 3");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore eats a day's food:");
        expect(page("characters/Ettore.md")).toContain('"[[Gallette]] 1"');
        expect(await ok("effect", "add", "Ettore", "Giunco")).toContain("until day 2, 20:00");
        expect(page("characters/Ettore.md")).toContain('"[[Giunco]] 2"');
    });

    it("spends nothing in a settlement, or in a place inside one (UPK-1)", async () => {
        await ok("move", "Ettore", "--to", "Locanda");
        const passed = await ok("advance", "--by", "2d");
        expect(passed).not.toContain("eats");
        expect(page("characters/Ettore.md")).toContain('"[[Hardtack]] 2"');
    });

    it("counts the days hungry, and past the grace raises what it worsens each midnight; eating sets them back (UPK-2)", async () => {
        await ok("advance", "--by", "2d");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore has no Hardtack: days-hungry 1, of 3 before resolve-loss. Read Hunger.");
        await ok("advance", "--by", "2d");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore has no Hardtack: days-hungry 4, past 3: resolve-loss 0 → 1. Read Hunger.");
        await ok("write", "Ettore", "--add", "inventory=[[Hardtack]] 1");
        expect(await ok("advance", "--by", "1d")).toContain("days-hungry back to 0.");
        expect(page("characters/Ettore.md")).not.toContain("days-hungry");
    });

    it("counts nothing under the rigor «smooth» (UPK-1)", async () => {
        await ok("config", "rigor", "smooth");
        expect(await ok("advance", "--by", "3d")).not.toContain("Hardtack");
        expect(page("characters/Ettore.md")).toContain('"[[Hardtack]] 2"');
    });
});

describe("what a night's sleep takes away (D-449)", () => {
    it("lowers resolve lost by one, never below 0, and nothing after a day hungry; at 0 grit it gives nothing at all", async () => {
        await ok("write", "Ettore", "--set", "vocations=[[Warden]] 1", "--set", "grit=9/9");
        await ok("write", "Ettore", "--set", "resolve-loss=2/5");
        expect(await ok("change", "Ettore", "--recipe", "night's sleep")).toContain("Ettore: resolve-loss 2/5 → 1/5.\nFor the rest");
        // A day later, so that only the hunger bars it.
        await ok("advance", "--by", "24h");
        await ok("write", "Ettore", "--set", "days-hungry=2");
        expect(await ok("change", "Ettore", "--recipe", "night's sleep")).not.toContain("resolve-loss 1/5 → 0/5");
        await ok("write", "Ettore", "--unset", "days-hungry");
        await ok("change", "Ettore", "grit", "--to", "0");
        expect(await ok("change", "Ettore", "--recipe", "night's sleep")).toContain("At 0 grit when it began, Ettore gains nothing from it.");
    });
});

describe("the lodging in a settlement (D-449, UPK-4)", () => {
    it("pays a night of the lodging chosen at each midnight there, says what to do without one or without money, and pays nothing outside", async () => {
        await ok("move", "Ettore", "--to", "Locanda");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore has no lodging to pay a day in a settlement: ask the player, then set lodging=Inn, one of Hayloft, Inn, Manor;");
        await ok("write", "Ettore", "--set", "lodging=Inn", "--set", "money=3 shilling");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore pays an Inn day: money 3 shilling → 1 shilling.");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore cannot pay an Inn day, 2 shilling, with money 1 shilling: a poorer lifestyle, work or a debt, as you judge. Read Lodging.");
        await ok("write", "Ettore", "--set", "lodging=Hayloft");
        expect(await ok("advance", "--by", "1d")).not.toContain("Ettore pays");
        await ok("write", "Ettore", "--set", "lodging=Manor");
        await ok("move", "Ettore", "--to", "Bosco");
        expect(await ok("advance", "--by", "1d")).not.toContain("Ettore pays");
        expect(page("characters/Ettore.md")).toContain("money: 1 shilling");
    });

    it("says each line once however many midnights pass, and lets the master charge a lodging of the campaign's (UPK-4)", async () => {
        await ok("move", "Ettore", "--to", "Locanda");
        const passed = await ok("advance", "--by", "3d");
        expect(passed.split("Ettore has no lodging").length).toBe(2);
        await ok("config", "values", "lodging: [Stalla]");
        await ok("write", "Ettore", "--set", "lodging=Stalla");
        expect(await ok("advance", "--by", "1d")).toContain(
            "Ettore's lodging Stalla has no price here: charge the day with change Ettore money, or set one of Hayloft, Inn, Manor. Read Lodging.",
        );
    });
});

describe("one night's sleep in 20 hours (D-449, RST-1)", () => {
    it("gives nothing from a second one called within 20 hours of the last that gave something, its hours advanced first, and says from when (D-500)", async () => {
        await ok("write", "Ettore", "--set", "grit=3/12");
        await ok("advance", "--by", "7h");
        expect(await ok("change", "Ettore", "--recipe", "night's sleep")).toContain("grit 3/12 → 12/12");
        await ok("change", "Ettore", "grit", "--to", "4");
        await ok("advance", "--by", "7h");
        const again = await ok("change", "Ettore", "--recipe", "night's sleep");
        expect(again).toContain("Ettore had a night's sleep at day 2, 01:00, and gains nothing from another before day 2, 21:00: one in 20h.");
        expect(again).not.toContain("grit 4/12 →");
        // 19 hours after the last are too few; 20 are enough.
        await ok("advance", "--to", "day 2, 20:00");
        expect(await ok("change", "Ettore", "--recipe", "night's sleep")).not.toContain("grit 4/12 →");
        await ok("advance", "--to", "day 2, 21:00");
        expect(await ok("change", "Ettore", "--recipe", "night's sleep")).toContain("grit 4/12 → 12/12");
    });
});

describe("stamina dice in a breather (D-449)", () => {
    beforeEach(async () => {
        // Warden 3: three stamina-d6, each with might +1; grit 6 + 9 + 1.
        await ok("write", "Ettore", "--set", "vocations=[[Warden]] 3", "--set", "grit=5/16");
    });

    it("spends them in one step: each die with the might bonus, the grit back, the dice taken; never more than one has", async () => {
        const spent = await ok("change", "Ettore", "stamina-d6", "--spend", "2", "--recipe", "breather");
        expect(spent).toMatch(/^Ettore spends 2 stamina-d6: 2d6\+2 = \[\d+, \d+\] \+ 2, \d+; grit 5\/16 → \d+\/16; stamina-d6 3\/3 → 1\/3\.$/);
        const refused = await runCommandLine(["change", "Ettore", "stamina-d6", "--spend", "2", "--recipe", "breather"], context);
        expect(refused.output).toBe("Ettore has 1 stamina-d6: spend a whole number of them, from 1 up to that. Nothing changed.");
        const night = await runCommandLine(["change", "Ettore", "stamina-d6", "--spend", "1", "--recipe", "night's sleep"], context);
        expect(night.output).toBe("night's sleep spends no dice, not stamina-d6. Nothing changed.");
    });

    it("says who chooses the dice the rest lets one spend: the player for the player character, with ask where its buttons are, the master for a companion (DAT-4, ASK-14)", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Scout]] 2", "--set", "grit=3/12");
        await ok("write", "Bosco", "--add", "contains=[[Lena]]");
        const rested = await ok("change", "--recipe", "breather");
        expect(rested).toContain('Ettore: nothing changed. Ask the player how many of stamina-d6 3/3 they spend, then change with spend and recipe "breather".');
        expect(rested).toContain('Lena: nothing changed. Choose whether Lena spends stamina-d4 2/2: change with spend and recipe "breather".');
        const page = { choose: async () => undefined, spendDice: async () => 0 as const };
        const asking = change.format(await change.run(change.input.parse({ recipe: "breather" }), { ...context, page }));
        expect(asking).toContain('The player spends stamina-d6 3/3 on the page, one die at a time: ask with recipe "breather", even when they already said how many.');
        // A form alone spends no dice: the player chooses them in words.
        const form = change.format(await change.run(change.input.parse({ recipe: "breather" }), { ...context, player: { choose: async () => undefined } }));
        expect(form).toContain("Ask the player how many of stamina-d6 3/3 they spend, then change with spend and recipe");
    });

    it("takes the faces of physical dice, one for each die, and logs the roll as physical (ASK-8, ASK-14)", async () => {
        await ok("config", "dice", "physical");
        expect(await ok("change", "--recipe", "breather")).toContain(
            'Ettore: nothing changed. Ask the player how many of stamina-d6 3/3 they spend and roll with their own dice, then change with spend and recipe "breather" and values, the faces they tell.',
        );
        expect(await ok("change", "Ettore", "stamina-d6", "--spend", "2", "--recipe", "breather", "--values", "6,1")).toBe(
            "Ettore spends 2 stamina-d6: 2d6+2 = [6, 1] + 2, 9; grit 5/16 → 14/16; stamina-d6 3/3 → 1/3.",
        );
        const logged = readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as { type: string; data: { physical?: boolean; }; });
        expect(logged.filter((entry) => entry.type === "roll").at(-1)?.data.physical).toBe(true);
        const refused = await runCommandLine(["change", "Ettore", "stamina-d6", "--spend", "1", "--recipe", "breather", "--values", "6,1"], context);
        expect(refused.output).toBe("Give one face for each die spent: 1 stamina-d6, 2 faces. Nothing changed.");
        const alone = await runCommandLine(["change", "Ettore", "grit", "--by", "3", "--values", "3"], context);
        expect(alone.output).toContain("Give values with the dice of a recipe");
    });

    it("gives back on the effect that gives the grit, under which the page keeps its own (EFF-7)", async () => {
        await ok("effect", "add", "Ettore", "Forma di cinghiale", "--set", "grit=10");
        const spent = await ok("change", "Ettore", "stamina-d6", "--spend", "1", "--recipe", "breather");
        expect(spent).toMatch(/^Ettore spends 1 stamina-d6: 1d6\+1 = \[\d+\] \+ 1, \d+; grit 10\/16 → \d+\/16 in Forma di cinghiale; stamina-d6 3\/3 → 2\/3\.$/);
        const page = readFileSync(join(folder, "world", "characters", "Ettore.md"), "utf8");
        expect(page).toContain("grit: 5/16");
        expect(page).not.toMatch(/Forma di cinghiale[^\n]*grit=10\b/);
    });

    it("says the rules the grit touches, as change does, when it leaves 0 (DAT-3)", async () => {
        await ok("change", "Ettore", "grit", "--to", "0");
        const spent = await ok("change", "Ettore", "stamina-d6", "--spend", "1", "--recipe", "breather");
        expect(spent).toContain('\ngrit is no longer at 0: read rules "');
    });
});

describe("what burns", () => {
    it("spends a rushlight as it is lit, and ends it after two hours (UPK-3)", async () => {
        const lit = await ok("effect", "add", "Ettore", "Rushlight");
        expect(lit).toContain("until day 1, 20:00");
        expect(page("characters/Ettore.md")).toContain('"[[Rushlight]] 2"');
        expect(await ok("advance", "--by", "2h")).toContain("Ended:");
    });

    it("spends tallow for a lantern, and refuses what has nothing to light (UPK-3)", async () => {
        const none = await runCommandLine(["effect", "add", "Ettore", "Lantern"], context);
        expect(none.exitCode).toBe(1);
        expect(none.output).toBe("Ettore carries no Tallow, in what it holds, to light Lantern. If the story gives some, add it to what Ettore carries first. Nothing changed.");
        await ok("write", "Ettore", "--add", "inventory=[[Tallow]] 1");
        expect(await ok("effect", "add", "Ettore", "Lantern")).toContain("until day 1, 23:00");
        expect(page("characters/Ettore.md")).not.toContain("[[Tallow]]");
    });

    it("shows the party with an effect named as two pages are, which burns nothing", async () => {
        await ok("effect", "add", "Ettore", "Lume");
        writeFileSync(join(folder, "world", "Lanterna.md"), "---\naliases: [Lume]\n---\n");
        writeFileSync(join(folder, "world", "Fiaccola.md"), "---\naliases: [Lume]\n---\n");
        const party = JSON.parse(await ok("view", "--json")).party as { effects: { name: string; burns?: unknown; }[]; }[];
        expect(party[0].effects.find((effect) => effect.name === "Lume")).not.toHaveProperty("burns");
    });
});

// The 5e's: its exhaustion goes with it (D-514, step 8).
describe("the 5e's exhaustion", () => {
    it("halves the hit point maximum from level 4 (p. 358)", async () => {
        useSystem(folder, "5e");
        await ok("write", "Ettore", "--unset", "might", "--set", "con=14", "--set", "classes=[[Fighter]] 1", "--set", "hp-base=10", "--set", "hp=12/12");
        await ok("change", "Ettore", "exhaustion", "--to", "4");
        expect(await ok("show", "Ettore")).toContain("hp 6/6");
    });
});

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
