// The items a character binds, as the 5e's attunement (D-435; BND-1, BND-2, BND-3): at most three, each one that asks for it, and what an item asks said.
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
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "str=14");
    // A sword of the campaign, whose magic is the SRD's Holy Avenger: it asks what that item asks.
    await ok("write", "Spada di Ettore", "--type", "item", "--set", "item=[[Longsword]]", "--set", "magic=[[Holy Avenger]]");
});

afterEach(() => removeFolder(folder));

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

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("what attuned items and feats give (D-449)", () => {
    it("adds up the bonuses of every item one is attuned to and every feat, with the effects", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "dex=10", "--set", "wis=10", "--set", "hp-base=10");
        const ac = async (): Promise<string> => /(?<![-\w])ac \d+/.exec(await ok("show", "Ettore"))?.[0] ?? "";
        expect(await ac()).toBe("ac 10");
        await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]", "--add", "attuned=[[Cloak of Protection]]");
        expect(await ac()).toBe("ac 12");
        await ok("write", "Fortunato", "--type", "topic", "--set", "category=feat", "--set", "bonus-ac=1");
        await ok("write", "Ettore", "--add", "feats=[[Fortunato]]");
        expect(await ac()).toBe("ac 13");
        await ok("effect", "add", "Ettore", "Shield of Faith", "--set", "bonus-ac=2");
        expect(await ac()).toBe("ac 15");
        expect(await ok("show", "Ettore")).toContain("wis-save +2");
    });

    it("raises an ability score to what an attuned item sets, and keeps it when higher (FOR-5)", async () => {
        await ok("write", "Ettore", "--set", "classes=[[Fighter]] 1", "--set", "str=8", "--set", "hp-base=10");
        await ok("write", "Ettore", "--add", "attuned=[[Gauntlets of Ogre Power]]");
        expect(await ok("show", "Ettore")).toContain("str 19 (+4)");
        await ok("write", "Ettore", "--set", "str=20");
        expect(await ok("show", "Ettore")).toContain("str 20 (+5)");
        // An effect sets the score, whatever the gauntlets give.
        await ok("effect", "add", "Ettore", "Feeblemind", "--set", "str=1");
        expect(await ok("show", "Ettore")).toContain("str 1 (-5)");
    });
});
