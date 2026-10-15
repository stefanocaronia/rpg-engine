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
