// What the party uses up (D-435, D-447; UPK-1, UPK-2, UPK-3): a ration a day outside a settlement under the rigor «rules», the days without food and the exhaustion
// past them, water as a word, and what burns spent as it is lit.
import { readFileSync } from "node:fs";
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
    await ok("config", "rigor", "rules");
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Guadoscuro", "--type", "place", "--set", "kind=village");
    await ok("write", "Locanda", "--type", "place");
    await ok("write", "Guadoscuro", "--add", "contains=[[Locanda]]");
    await ok("write", "Bosco", "--type", "place");
    // Constitution 14: three days and two more without food before exhaustion.
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "con=14", "--add", "inventory=[[Rations]] 2", "--add", "inventory=[[Torch]] 3");
    await ok("write", "Bosco", "--add", "contains=[[Ettore]]");
});

afterEach(() => removeFolder(folder));

describe("the day's food", () => {
    it("spends a ration at each midnight outside a settlement, and says water (UPK-1)", async () => {
        const passed = await ok("advance", "--by", "1d");
        expect(passed).toContain("Ettore eats a day's food:");
        expect(passed).toContain("Water: a gallon each, two if the weather is hot. Read Food and Water.");
        expect(page("characters/Ettore.md")).toContain('"[[Rations]] 1"');
    });

    it("counts a kind of the campaign that derives from the system's, as Razioni from Rations, and Torcia as a Torch (UPK-1, UPK-3)", async () => {
        await ok("write", "Razioni", "--type", "item", "--set", "item=[[Rations]]");
        await ok("write", "Torcia", "--type", "item", "--set", "item=[[Torch]]");
        await ok("write", "Ettore", "--remove", "inventory=[[Rations]] 2", "--remove", "inventory=[[Torch]] 3", "--add", "inventory=[[Razioni]] 2", "--add", "inventory=[[Torcia]] 3");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore eats a day's food:");
        expect(page("characters/Ettore.md")).toContain('"[[Razioni]] 1"');
        expect(await ok("effect", "add", "Ettore", "Torcia")).toContain("until day 2, 19:00");
        expect(page("characters/Ettore.md")).toContain('"[[Torcia]] 2"');
    });

    it("spends nothing in a settlement, or in a place inside one (UPK-1)", async () => {
        await ok("move", "Ettore", "--to", "Locanda");
        const passed = await ok("advance", "--by", "2d");
        expect(passed).not.toContain("eats");
        expect(passed).not.toContain("Water:");
        expect(page("characters/Ettore.md")).toContain('"[[Rations]] 2"');
    });

    it("counts the days without food, and past the grace raises exhaustion each midnight; eating sets them back (UPK-2)", async () => {
        await ok("advance", "--by", "2d");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore has no Rations: days-without-food 1, of 5 before exhaustion. Read Food and Water.");
        await ok("advance", "--by", "4d");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore has no Rations: days-without-food 6, past 5: exhaustion 0 → 1. Read Food and Water.");
        await ok("write", "Ettore", "--add", "inventory=[[Rations]] 1");
        expect(await ok("advance", "--by", "1d")).toContain("days-without-food back to 0.");
        expect(page("characters/Ettore.md")).not.toContain("days-without-food");
    });

    it("counts nothing under the rigor «smooth» (UPK-1)", async () => {
        await ok("config", "rigor", "smooth");
        expect(await ok("advance", "--by", "3d")).not.toContain("Rations");
        expect(page("characters/Ettore.md")).toContain('"[[Rations]] 2"');
    });
});

describe("exhaustion", () => {
    it("halves the hit point maximum from level 4 (p. 358)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "hp-base=10", "--set", "hp=12/12");
        await ok("change", "Ettore", "exhaustion", "--to", "4");
        expect(await ok("show", "Ettore")).toContain("hp 6/6");
    });

    it("goes down a level with a long rest, never below 0 (D-449)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "hp-base=10", "--set", "hp=12/12");
        await ok("change", "Ettore", "exhaustion", "--to", "2");
        expect(await ok("change", "Ettore", "--recipe", "long rest")).toContain("Ettore: exhaustion 2 → 1.");
        // Without food the day before, the rest takes none away; at 0 hit points it gives nothing at all (pp. 87, 358). A day later, so that only the food bars it.
        await ok("advance", "--by", "24h");
        await ok("write", "Ettore", "--set", "days-without-food=2");
        expect(await ok("change", "Ettore", "--recipe", "long rest")).not.toContain("exhaustion 1 → 0");
        await ok("write", "Ettore", "--unset", "days-without-food");
        await ok("change", "Ettore", "hp", "--to", "0");
        expect(await ok("change", "Ettore", "--recipe", "long rest")).toContain("At 0 hp when it began, Ettore gains nothing from it.");
    });
});

describe("the lifestyle in a settlement (D-449, UPK-4)", () => {
    it("pays a day of the lifestyle chosen at each midnight there, says what to do without one or without money, and pays nothing outside", async () => {
        await ok("move", "Ettore", "--to", "Locanda");
        expect(await ok("advance", "--by", "1d")).toContain(
            "Ettore has no lifestyle to pay a day in a settlement: ask the player, then set lifestyle=Modest, one of Wretched, Squalid, Poor, Modest, Comfortable, Wealthy, Aristocratic. Read Lifestyle Expenses.",
        );
        await ok("write", "Ettore", "--set", "lifestyle=Modest", "--set", "money=1 gp 5 sp");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore pays a Modest day: money 1 gp 5 sp → 5 sp.");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore cannot pay a Modest day, 1 gp, with money 5 sp: a poorer lifestyle, work or a debt, as you judge. Read Lifestyle Expenses.");
        await ok("write", "Ettore", "--set", "lifestyle=Wretched");
        expect(await ok("advance", "--by", "1d")).not.toContain("Ettore pays");
        await ok("write", "Ettore", "--set", "lifestyle=Squalid");
        await ok("move", "Ettore", "--to", "Bosco");
        expect(await ok("advance", "--by", "1d")).not.toContain("Ettore pays");
        expect(page("characters/Ettore.md")).toContain("money: 5 sp");
    });

    it("says each line once however many midnights pass, and lets the master charge a lifestyle of the campaign's (UPK-4)", async () => {
        await ok("move", "Ettore", "--to", "Locanda");
        const passed = await ok("advance", "--by", "3d");
        expect(passed.split("Ettore has no lifestyle").length).toBe(2);
        await ok("config", "values", "lifestyle: [Mendicante]");
        await ok("write", "Ettore", "--set", "lifestyle=Mendicante");
        expect(await ok("advance", "--by", "1d")).toContain(
            "Ettore's lifestyle Mendicante has no price here: charge the day with change Ettore money, or set one of Wretched, Squalid, Poor, Modest, Comfortable, Wealthy, Aristocratic. Read Lifestyle Expenses.",
        );
    });
});

describe("one long rest in 24 hours (D-449, RST-1)", () => {
    it("gives nothing from a second one within 24 hours of the last that gave something, and says from when", async () => {
        await ok("write", "Ettore", "--set", "hp=3/12");
        await ok("advance", "--by", "8h");
        expect(await ok("change", "Ettore", "--recipe", "long rest")).toContain("hp 3/12 → 12/12");
        await ok("change", "Ettore", "hp", "--to", "4");
        await ok("advance", "--by", "8h");
        const again = await ok("change", "Ettore", "--recipe", "long rest");
        expect(again).toContain("Ettore had a long rest at day 2, 02:00, and gains nothing from another before day 2, 18:00: one in 24h.");
        expect(again).not.toContain("hp 4/12 →");
        // The next night, called before its hours are advanced: 16 hours after the last call, as the master may call it either way.
        await ok("advance", "--to", "day 2, 18:00");
        expect(await ok("change", "Ettore", "--recipe", "long rest")).toContain("hp 4/12 → 12/12");
    });
});

describe("hit dice in a short rest (D-449)", () => {
    it("spends them in one step: each die with the Constitution modifier, the hit points healed, the dice taken; never more than one has", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 3", "--set", "hp-base=20", "--set", "hp=5/26");
        const spent = await ok("change", "Ettore", "hit-dice-d10", "--spend", "2", "--recipe", "short rest");
        expect(spent).toMatch(/^Ettore spends 2 hit-dice-d10: 2d10 = \[\d+, \d+\] \+ 2 each, \d+; hp 5\/26 → \d+\/26; hit-dice-d10 3\/3 → 1\/3\.$/);
        const refused = await runCommandLine(["change", "Ettore", "hit-dice-d10", "--spend", "2", "--recipe", "short rest"], context);
        expect(refused.output).toBe("Ettore has 1 hit-dice-d10: spend a whole number of them, from 1 up to that. Nothing changed.");
        const long = await runCommandLine(["change", "Ettore", "hit-dice-d10", "--spend", "1", "--recipe", "long rest"], context);
        expect(long.output).toBe("long rest spends no dice, not hit-dice-d10. Nothing changed.");
    });

    it("says the rules the hit points touch, as change does, when they leave 0 (DAT-3)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 3", "--set", "hp-base=20", "--set", "hp=0/26");
        const spent = await ok("change", "Ettore", "hit-dice-d10", "--spend", "1", "--recipe", "short rest");
        expect(spent).toContain('\nhp is no longer at 0: read rules "');
    });
});

describe("what burns", () => {
    it("spends a torch as it is lit, and ends it after an hour (UPK-3)", async () => {
        const lit = await ok("effect", "add", "Ettore", "Torch");
        expect(lit).toContain("until day 1, 19:00");
        expect(page("characters/Ettore.md")).toContain('"[[Torch]] 2"');
        expect(await ok("advance", "--by", "1h")).toContain("Ended:");
    });

    it("spends oil for a lantern, and refuses what has nothing to light (UPK-3)", async () => {
        const none = await runCommandLine(["effect", "add", "Ettore", "Hooded Lantern"], context);
        expect(none.exitCode).toBe(1);
        expect(none.output).toBe("Ettore carries no Oil, in what it holds, to light Hooded Lantern. If the story gives some, add it to what Ettore carries first. Nothing changed.");
        await ok("write", "Ettore", "--add", "inventory=[[Oil]] 1");
        expect(await ok("effect", "add", "Ettore", "Hooded Lantern")).toContain("until day 2, 00:00");
        expect(page("characters/Ettore.md")).not.toContain("[[Oil]]");
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
