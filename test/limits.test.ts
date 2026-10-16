// The most a sheet holds (D-449; LIM-1, LIM-2): an ability score of 20 unless something raises it, and no more spells prepared than the class allows.
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
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "classes=[[Cleric]] 1", "--set", "wis=16", "--set", "hp-base=8");
});

afterEach(() => removeFolder(folder));

describe("the most of a sheet", () => {
    it("refuses an ability score above 20 before writing, and takes one a manual raises with an effect (LIM-1)", async () => {
        const over = await runCommandLine(["write", "Ettore", "--set", "wis=21"], context);
        expect(over.output).toBe(
            "Ettore would have wis 21, more than 20, the most 5e allows: write it as 20 at most; what an item or a feature raises above it is worked out, never written. Nothing changed.",
        );
        await ok("write", "Ettore", "--set", "wis=20");
        await ok("effect", "add", "Ettore", "Manual of Quickness of Action", "--set", "bonus-dex-max=2");
        await ok("write", "Ettore", "--set", "dex=22");
        expect((await runCommandLine(["write", "Ettore", "--set", "dex=23"], context)).output).toContain("more than 22, the most 5e allows");
        // A new player character too, before its page exists.
        expect((await runCommandLine(["write", "Nuovo", "--type", "character", "--set", "role=pc", "--set", "str=21"], context)).output).toContain("Nuovo would have str 21, more than 20");
    });

    it("refuses a spell prepared past the most the class allows, and none when the page keeps no sheet (LIM-1)", async () => {
        // A cleric of the first level with Wisdom 16 prepares 1 + 3 = 4.
        await ok("write", "Ettore", "--set", "prepared=[[Bless]], [[Cure Wounds]], [[Guiding Bolt]], [[Shield of Faith]]");
        const fifth = await runCommandLine(["write", "Ettore", "--add", "prepared=[[Sanctuary]]"], context);
        expect(fifth.output).toBe("Ettore would have 5 in prepared, more than 4, the most 5e allows: remove one first, such as remove prepared=[[Bless]]. Nothing changed.");
        await ok("write", "Ettore", "--remove", "prepared=[[Bless]]", "--add", "prepared=[[Sanctuary]]");
        await ok("write", "Gorgo", "--type", "character", "--set", "role=npc", "--set", "str=26");
        // Made a companion with classes, it keeps a sheet: the most holds.
        expect((await runCommandLine(["write", "Gorgo", "--set", "role=companion", "--set", "classes=[[Fighter]] 1", "--set", "hp-base=10"], context)).output).toContain("Gorgo would have str 26");
    });

    it("reports in validate a score written by hand over its most (LIM-2)", async () => {
        writeFileSync(join(folder, "world", "characters", "Nero.md"), '---\nrole: pc\nclasses: "[[Fighter]] 1"\nstr: 22\nhp-base: 10\n---\n');
        expect(await ok("validate")).toContain("Nero has str 22, more than 20, the most.");
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
