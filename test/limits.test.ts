// The most a sheet holds (D-449; LIM-1, LIM-2), on the fake system: might 9 unless something raises it, and no more than three knacks.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 2", "--set", "might=5");
});

afterEach(() => removeFolder(folder));

describe("the most of a sheet", () => {
    it("refuses a trait above its most before writing, and takes one an effect raises (LIM-1)", async () => {
        const over = await runCommandLine(["write", "Ettore", "--set", "might=10"], context);
        expect(over.output).toBe(
            "Ettore would have might 10, more than 9, the most fake allows: write it as 9 at most; what an item or a feature raises above it is worked out, never written. Nothing changed.",
        );
        await ok("write", "Ettore", "--set", "might=9");
        await ok("effect", "add", "Ettore", "Forza del bue", "--set", "bonus-might-max=2");
        await ok("write", "Ettore", "--set", "might=11");
        expect((await runCommandLine(["write", "Ettore", "--set", "might=12"], context)).output).toContain("more than 11, the most fake allows");
        // A new player character too, before its page exists.
        expect((await runCommandLine(["write", "Nuovo", "--type", "character", "--set", "role=pc", "--set", "might=10"], context)).output).toContain("Nuovo would have might 10, more than 9");
    });

    it("refuses a knack past the most, those of the vocations counted, and none when the page keeps no sheet (LIM-1)", async () => {
        // A Warden of rank 2 has two knacks from the table: one more by hand is three.
        await ok("write", "Ettore", "--add", "knacks=Keen Eye");
        const fourth = await runCommandLine(["write", "Ettore", "--add", "knacks=Quiet Step"], context);
        expect(fourth.output).toMatch(/^Ettore would have 4 in knacks, more than 3, the most fake allows: remove one first, such as remove knacks=.+\. Nothing changed\.$/);
        await ok("write", "Gorgo", "--type", "character", "--set", "role=npc", "--set", "might=12");
        // Made a companion with vocations, it keeps a sheet: the most holds.
        expect((await runCommandLine(["write", "Gorgo", "--set", "role=companion", "--set", "vocations=[[Warden]] 1"], context)).output).toContain("Gorgo would have might 12");
    });

    it("reports in validate a trait written by hand over its most (LIM-2)", async () => {
        writeFileSync(join(folder, "world", "characters", "Nero.md"), '---\nrole: pc\nvocations: "[[Warden]] 1"\nmight: 12\n---\n');
        expect(await ok("validate")).toContain("Nero has might 12, more than 9, the most.");
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
