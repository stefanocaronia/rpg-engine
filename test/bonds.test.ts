// The items a character binds (D-435; BND-1–BND-4), on the fake system's charms: at most two, each one that asks for it, what one asks said, and what the
// bound ones give while in the kit. The 5e's attunement and its SRD pages are in the 5e's repository.
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
