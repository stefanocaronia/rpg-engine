// The items a character binds (D-435; BND-1–BND-4), on the fake system's charms: at most two, each one that asks for it, what one asks said, and what the
// bound ones give while in the kit; then the 5e's attunement and its SRD pages, which go with it (D-514, step 8).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext, useSystem } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1", "--set", "might=3", "--set", "grace=3");
});

afterEach(() => removeFolder(folder));

describe("what one binds", () => {
    it("binds up to two items that ask for it, says how many and what one asks, and refuses a third before writing (BND-1, BND-3)", async () => {
        expect(await ok("write", "Ettore", "--add", "bound=[[Iron Ring]]")).toContain("Ettore: bound Iron Ring, 1 of 2. Read Bindings.");
        expect(await ok("write", "Ettore", "--add", "bound=[[Hare's Foot]]")).toContain("Ettore: bound Hare's Foot, 2 of 2; it asks: by a scout, which you check. Read Bindings.");
        const third = await runCommandLine(["write", "Ettore", "--add", "bound=[[Ox Band]]"], context);
        expect(third.exitCode).toBe(1);
        expect(third.output).toBe("Ettore would have 3 items in bound, more than 2, the most (read Bindings): remove one first, such as remove bound=[[Iron Ring]]. Nothing changed.");
        // One removed and another added in the same write is two again.
        await ok("write", "Ettore", "--remove", "bound=[[Iron Ring]]", "--add", "bound=[[Ox Band]]");
        expect(await ok("show", "Ettore")).toContain("bound Hare's Foot, Ox Band");
    });

    it("refuses an item that asks for no binding, with how to write one that does (BND-2)", async () => {
        const rope = await runCommandLine(["write", "Ettore", "--add", "bound=[[Coil of Rope]]"], context);
        expect(rope.output).toBe("Coil of Rope asks for no binding, so it goes in no bound: if it does, write Coil of Rope, set binding=true. Nothing changed.");
        const text = await runCommandLine(["write", "Ettore", "--add", "bound=anello strano"], context);
        expect(text.output).toBe(`bound takes links to items, not "anello strano": write the item's page first, then add bound=[[anello strano]]. Nothing changed.`);
        await ok("write", "Anello del guado", "--type", "item", "--set", "binding=true");
        await ok("write", "Ettore", "--add", "bound=[[Anello del guado]]");
    });

    it("reports in validate a list written by hand over the most (BND-1)", async () => {
        writeFileSync(join(folder, "world", "characters", "Nero.md"), '---\nrole: npc\nbound: ["[[Iron Ring]]", "[[Hare\'s Foot]]", "[[Ox Band]]"]\n---\n');
        expect(await ok("validate")).toContain("Nero has 3 items in bound, more than 2, the most.");
    });
});

describe("what bound items give (D-449, D-456, BND-4)", () => {
    const guard = async (): Promise<string> => /(?<![-\w])guard \d+/.exec(await ok("show", "Ettore"))?.[0] ?? "";

    it("adds up the bonuses of every bound item in the kit, with a feat's and the effects'", async () => {
        // 6 and the Warden's 1 + might bonus 0.
        expect(await guard()).toBe("guard 7");
        await ok("write", "Ettore", "--add", "inventory=[[Iron Ring]]", "--add", "kit=[[Iron Ring]]", "--add", "inventory=[[Hare's Foot]]", "--add", "kit=[[Hare's Foot]]");
        await ok("write", "Ettore", "--add", "bound=[[Iron Ring]]", "--add", "bound=[[Hare's Foot]]");
        expect(await guard()).toBe("guard 9");
        await ok("effect", "add", "Ettore", "Scudo di giunchi", "--set", "guard-bonus=2");
        expect(await guard()).toBe("guard 11");
    });

    it("gives its bonuses only while in the kit too, and says so when bound", async () => {
        await ok("write", "Ettore", "--add", "inventory=[[Iron Ring]]");
        expect(await ok("write", "Ettore", "--add", "bound=[[Iron Ring]]")).toContain("Its bonuses count while it is in kit too: add kit=[[Iron Ring]] when worn or held.");
        expect(await guard()).toBe("guard 7");
        await ok("write", "Ettore", "--add", "kit=[[Iron Ring]]");
        expect(await guard()).toBe("guard 8");
    });

    it("raises a trait to what a bound item sets, and keeps it when higher (FOR-5)", async () => {
        await ok("write", "Ettore", "--add", "inventory=[[Ox Band]]", "--add", "kit=[[Ox Band]]", "--add", "bound=[[Ox Band]]");
        expect(await ok("show", "Ettore")).toContain("might 7 (+2)");
        await ok("write", "Ettore", "--set", "might=9");
        expect(await ok("show", "Ettore")).toContain("might 9 (+2)");
        // An effect sets the trait, whatever the band gives.
        await ok("effect", "add", "Ettore", "Debolezza", "--set", "might=1");
        expect(await ok("show", "Ettore")).toContain("might 1 (-1)");
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

// The 5e's: its attunement and the SRD pages that give bonuses when attuned go with it (D-514, step 8).
describe("the 5e's attunement", () => {
    beforeEach(async () => {
        useSystem(folder, "5e");
        await ok("write", "Ettore", "--unset", "vocations", "--unset", "might", "--unset", "grace", "--set", "str=14");
        // A sword of the campaign, whose magic is the SRD's Holy Avenger: it asks what that item asks.
        await ok("write", "Spada di Ettore", "--type", "item", "--set", "item=[[Longsword]]", "--set", "magic=[[Holy Avenger]]");
    });

    describe("attunement", () => {
        it("binds up to three items that ask for it, says how many and what one asks, and refuses a fourth before writing (BND-1, BND-3)", async () => {
            expect(await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]")).toContain("Ettore: attuned Ring of Protection, 1 of 3. Read Attunement.");
            expect(await ok("write", "Ettore", "--add", "attuned=[[Spada di Ettore]]")).toContain(
                "Ettore: attuned Spada di Ettore, 2 of 3; it asks: by a paladin, which you check. Read Attunement.",
            );
            await ok("write", "Ettore", "--add", "attuned=[[Cloak of Protection]]");
            const fourth = await runCommandLine(["write", "Ettore", "--add", "attuned=[[Amulet of Health]]"], context);
            expect(fourth.exitCode).toBe(1);
            expect(fourth.output).toBe(
                "Ettore would have 4 items in attuned, more than 3, the most (read Attunement): remove one first, such as remove attuned=[[Ring of Protection]]. Nothing changed.",
            );
            // One removed and another added in the same write is three again.
            await ok("write", "Ettore", "--remove", "attuned=[[Ring of Protection]]", "--add", "attuned=[[Amulet of Health]]");
            expect(await ok("show", "Ettore")).toContain("attuned Spada di Ettore, Cloak of Protection, Amulet of Health");
        });

        it("refuses an item that asks for no attunement, with how to write one that does (BND-2)", async () => {
            const bag = await runCommandLine(["write", "Ettore", "--add", "attuned=[[Bag of Holding]]"], context);
            expect(bag.output).toBe("Bag of Holding asks for no attunement, so it goes in no attuned: if it does, write Bag of Holding, set attunement=true. Nothing changed.");
            const text = await runCommandLine(["write", "Ettore", "--add", "attuned=anello strano"], context);
            expect(text.output).toBe(`attuned takes links to items, not "anello strano": write the item's page first, then add attuned=[[anello strano]]. Nothing changed.`);
            await ok("write", "Anello del guado", "--type", "item", "--set", "attunement=true");
            await ok("write", "Ettore", "--add", "attuned=[[Anello del guado]]");
        });

        it("reports in validate a list written by hand over the most (BND-1)", async () => {
            writeFileSync(
                join(folder, "world", "characters", "Nero.md"),
                '---\nrole: npc\nattuned: ["[[Ring of Protection]]", "[[Cloak of Protection]]", "[[Amulet of Health]]", "[[Flame Tongue]]"]\n---\n',
            );
            expect(await ok("validate")).toContain("Nero has 4 items in attuned, more than 3, the most.");
        });
    });

    describe("what attuned items and feats give (D-449)", () => {
        it("adds up the bonuses of every item one is attuned to and every feat, with the effects", async () => {
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "dex=10", "--set", "wis=10", "--set", "hp-base=10");
            const ac = async (): Promise<string> => /(?<![-\w])ac \d+/.exec(await ok("show", "Ettore"))?.[0] ?? "";
            expect(await ac()).toBe("ac 10");
            await ok("write", "Ettore", "--add", "inventory=[[Ring of Protection]]", "--add", "equipped=[[Ring of Protection]]", "--add", "inventory=[[Cloak of Protection]]", "--add", "equipped=[[Cloak of Protection]]");
            await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]", "--add", "attuned=[[Cloak of Protection]]");
            expect(await ac()).toBe("ac 12");
            await ok("write", "Fortunato", "--type", "topic", "--set", "category=feat", "--set", "bonus-ac=1");
            await ok("write", "Ettore", "--add", "feats=[[Fortunato]]");
            expect(await ac()).toBe("ac 13");
            await ok("effect", "add", "Ettore", "Shield of Faith", "--set", "bonus-ac=2");
            expect(await ac()).toBe("ac 15");
            expect(await ok("show", "Ettore")).toContain("wis-save +2");
        });

        it("adds the proficiency bonus of an item of the campaign one is attuned to, as an Ioun Stone of Mastery (D-449)", async () => {
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "hp-base=10");
            expect(await ok("show", "Ettore")).toContain("proficiency +2");
            await ok("write", "Pietra della maestria", "--type", "item", "--set", "attunement=true", "--set", "bonus-proficiency=1");
            await ok("write", "Ettore", "--add", "inventory=[[Pietra della maestria]]", "--add", "equipped=[[Pietra della maestria]]", "--add", "attuned=[[Pietra della maestria]]");
            expect(await ok("show", "Ettore")).toContain("proficiency +3");
        });

        it("raises an ability score to what an attuned item sets, and keeps it when higher (FOR-5)", async () => {
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "str=8", "--set", "hp-base=10");
            await ok("write", "Ettore", "--add", "inventory=[[Gauntlets of Ogre Power]]", "--add", "equipped=[[Gauntlets of Ogre Power]]", "--add", "attuned=[[Gauntlets of Ogre Power]]");
            expect(await ok("show", "Ettore")).toContain("str 19 (+4)");
            await ok("write", "Ettore", "--set", "str=20");
            expect(await ok("show", "Ettore")).toContain("str 20 (+5)");
            // An effect sets the score, whatever the gauntlets give.
            await ok("effect", "add", "Ettore", "Feeblemind", "--set", "str=1");
            expect(await ok("show", "Ettore")).toContain("str 1 (-5)");
        });
    });

    describe("the SRD pages that give bonuses when attuned (D-449)", () => {
        it("adds the Stone of Good Luck's 1 to saves, skills and initiative, and a Remarkable Athlete's Strength modifier to the long jump", async () => {
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "dex=10", "--set", "wis=10", "--set", "hp-base=10");
            const read = async (name: string): Promise<string> => new RegExp(`(?<![-\\w])${name} [+-]?\\d+`).exec(await ok("show", "Ettore"))?.[0] ?? "";
            expect(await read("wis-save")).toBe("wis-save +0");
            await ok("write", "Ettore", "--add", "inventory=[[Stone of Good Luck]]", "--add", "equipped=[[Stone of Good Luck]]", "--add", "attuned=[[Stone of Good Luck]]");
            expect(await read("wis-save")).toBe("wis-save +1");
            expect(await read("initiative")).toBe("initiative +1");
            expect(await read("passive-perception")).toBe("passive-perception 11");
            expect(await ok("show", "Ettore")).toContain("long-jump 14 ft");
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 7", "--set", "subclasses=[[Champion]]", "--set", "hp-base=58");
            expect(await ok("show", "Ettore")).toContain("long-jump 16 ft");
        });
    });

    describe("an attuned item worn or held (D-456, BND-4)", () => {
        it("gives its bonuses only while in equipped too, and says so when bound", async () => {
            await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "dex=10", "--set", "hp-base=10", "--add", "inventory=[[Ring of Protection]]");
            const ac = async (): Promise<string> => /(?<![-\w])ac \d+/.exec(await ok("show", "Ettore"))?.[0] ?? "";
            expect(await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]")).toContain(
                "Its bonuses count while it is in equipped too: add equipped=[[Ring of Protection]] when worn or held.",
            );
            expect(await ac()).toBe("ac 10");
            await ok("write", "Ettore", "--add", "equipped=[[Ring of Protection]]");
            expect(await ac()).toBe("ac 11");
        });
    });
});
