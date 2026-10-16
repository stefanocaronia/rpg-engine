// The dying (D-454; DIE-1, DIE-2, DIE-3): Unconscious at 0 hit points, a failure for damage there, instant death, and all of it ended by hit points regained.
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
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "hp=10/20");
});

afterEach(() => removeFolder(folder));

describe("the dying", () => {
    it("falls Unconscious at 0, counts a failure for damage there, and ends it all with hit points regained (DIE-1, DIE-2, DIE-3)", async () => {
        expect(await ok("change", "Ettore", "hp", "--by=-12")).toContain("Ettore is Unconscious while hp is 0.");
        await ok("change", "Ettore", "death-successes", "--by=1");
        expect(await ok("change", "Ettore", "hp", "--by=-3")).toContain("death-failures 0 → 1: damage at 0 hp; a critical hit counts two, so add one more with change.");
        expect(await ok("change", "Ettore", "hp", "--by=4")).toContain("Ettore is no longer dying: death-successes 1 → 0, death-failures 1 → 0, Unconscious ended.");
        expect(await ok("show", "Ettore")).not.toContain("Unconscious");
    });

    it("dies at once when what goes past 0 is as large as the maximum (DIE-2)", async () => {
        expect(await ok("change", "Ettore", "hp", "--by=-30", "--damage", "fire")).toContain(
            "Ettore dies at once: 20 past 0 is at least the maximum, 20; death-failures 0 → 3. Read rules Instant Death.",
        );
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
