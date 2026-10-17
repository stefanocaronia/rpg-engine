// The dying (D-454, D-460; DIE-1–DIE-5): Unconscious at 0 hit points, a failure for damage there, instant death, the death saves, and all of it ended by hit points
// regained.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { ask } from "../src/commands/ask.ts";
import type { Context, Player } from "../src/core/context.ts";
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

    it("writes the death save the player rolls with a button: a success at 10, a failure under it, two on a 1, back to 1 hp on a 20 (DIE-4, D-460)", async () => {
        await ok("change", "Ettore", "hp", "--by=-10");

        const save = async (face: number): Promise<string> => {
            const clicking: Player = { choose: async () => 0 };
            const result = await ask.run(ask.input.parse({ question: "Ettore è a terra", options: "Tiro contro la morte 1d20", who: "Ettore" }), { ...context, player: clicking, random: () => face });
            return ask.format(result);
        };

        expect(await save(4)).toContain("\nEttore's death save: 4, a failure; death-failures 0 → 1.");
        expect(await save(12)).toContain("\nEttore's death save: 12, a success; death-successes 0 → 1.");
        expect(await save(1)).toContain("\nEttore's death save: 1, the lowest face, 2 failures; death-failures 1 → 3. Ettore dies: a moment of its own in the story.");
        // Dead, no more saves are written; the same at hp 0 again, with a 20 the counter comes back and the dying ends.
        expect(await save(15)).not.toContain("death save");
        await ok("change", "Ettore", "death-failures", "--to", "0");
        await ok("change", "Ettore", "death-successes", "--to", "0");
        expect(await save(20)).toContain("\nEttore's death save: 20, the highest face: hp 0/20 → 1/20.\nEttore is no longer dying: Unconscious ended.");
    });

    it("rolls a companion's death save as its turn starts, told as the mentor setting asks; three successes make it stable (DIE-5, D-460)", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "hp=3/12");
        await ok("change", "Lena", "hp", "--by=-5");
        await ok("scene", "open", "--title", "Il guado", "--type", "combat", "--with", "Ettore", "--with", "Lena");
        await ok("scene", "order", "--order", "Ettore", "--order", "Lena");
        expect(await ok("scene", "next")).toContain(
            "Lena is dying: the engine rolled its death save, 1d20 = 4 [4]. Lena's death save: 4, a failure; death-failures 0 → 1. Tell it in a sentence, the roll in brackets. "
                + "Read rules Death Saving Throws.",
        );
        await ok("config", "mentor", "off");
        await ok("change", "Lena", "death-successes", "--to", "2");
        await ok("scene", "next");
        const fifteen = await runCommandLine(["scene", "next"], { ...context, random: () => 15 });
        expect(fifteen.output).toContain(
            "Lena's death save: 15, a success; death-successes 2 → 3. Lena is stable: no more death saves, still Unconscious until it regains hp. "
                + "Tell it in the story alone: never name the save or its roll.",
        );
        await ok("scene", "next");
        expect(await ok("scene", "next")).not.toContain("death save");
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
