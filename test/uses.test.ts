// The uses of what a character has and the rests that bring them back (D-204, D-220; DAT-3, DAT-4, DAT-9), through the commands on the fake system: the
// rallies of a Warden's table, a people's own use, a second deed from a knack. The 5e's classes and features are in the 5e's repository.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--system", "fake", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

function pageText(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8");
}

describe("the uses a character has (DAT-9)", () => {
    it("writes the uses its vocations give full, with the grit and the stamina dice, and says so", async () => {
        const written = await ok("write", "Gara", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 2", "--set", "might=5");
        expect(written).toContain("Gara has grit 13/13, stamina-d6 2/2, rallies 2/2, full: uses of the system fake that come back with a rest.");
        expect(pageText("Gara")).toContain("rallies: 2/2");
        expect(await ok("status")).toContain("PC: Gara: level 2 · grit 13/13 · stamina-d6 2/2 · rallies 2/2");
        expect(await ok("show", "Gara")).toContain("Knacks: knacks Steady Hand, Iron Lung · knack-count 2 · rallies 2/2");
    });

    it("reads full a use the page does not write, as a page written by hand, with the maximum from the vocation's row", async () => {
        const hand = '---\nrole: pc\nvocations: ["[[Warden]] 2"]\n---\n';
        writeFileSync(join(folder, "world", "characters", "Ishi.md"), hand);
        expect(await ok("status")).toContain("rallies 2/2");
        expect(pageText("Ishi")).toBe(hand);
        expect(await ok("show", "Ishi#Knacks")).toContain("rallies 2/2: the maximum from Warden 2 in vocations");
    });

    it("gives a new rank's uses, and grows those it has without filling what was spent", async () => {
        await ok("write", "Rho", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Warden]] 1");
        expect(pageText("Rho")).not.toContain("second-deed");
        await ok("change", "Rho", "rallies", "--by=-1");
        const written = await ok("write", "Rho", "--set", "vocations=[[Warden]] 3, [[Scout]] 2");
        expect(written).toContain("rallies 1/2 (max 1 → 2: Warden 3 in vocations)");
        expect(written).toContain("second-deed 1/1");
        // The one spent stays spent.
        expect(pageText("Rho")).toContain("rallies: 1/2");
    });

    it("reads a people's use from its page, and brings it back as the people's", async () => {
        await ok("write", "Zarn", "--type", "character", "--set", "role=companion", "--set", "creature=[[Fenfolk]]", "--set", "vocations=[[Scout]] 1");
        expect(await ok("status")).toContain("marsh-breath 1/1");
        await ok("change", "Zarn", "marsh-breath", "--by=-1");
        expect(await ok("change", "Zarn", "--recipe", "breather")).toContain("marsh-breath 0/1 → 1/1 (again as Fenfolk)");
    });
});

describe("the rests (DAT-4, DAT-9)", () => {
    beforeEach(async () => {
        await ok("write", "Gara", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 2", "--set", "might=5");
    });

    it("brings back with a breather what its formula gives, and with a night's sleep every one", async () => {
        await ok("change", "Gara", "rallies", "--by=-2");
        expect(await ok("change", "--recipe", "breather")).toContain("Gara: rallies 0/2 → 1/2. Not brought back: rallies 1/2.");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("Gara: rallies 1/2 → 2/2.");
    });

    it("brings back half the stamina dice with a night's sleep, at least one, and leaves the choice to the player among dice of different kinds", async () => {
        await ok("change", "Gara", "stamina-d6", "--by=-2");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("stamina-d6 0/2 → 1/2");
        await ok("write", "Gara", "--set", "vocations=[[Warden]] 3, [[Scout]] 2");
        await ok("change", "Gara", "stamina-d6", "--by=-1");
        await ok("change", "Gara", "stamina-d4", "--by=-2");
        expect(await ok("change", "--recipe", "night's sleep")).toContain(
            "Ask the player: which stamina come back, up to 2 of stamina-d6 1/3, stamina-d4 0/2: change each one by what they take.",
        );
        await ok("change", "Gara", "stamina-d6", "--by=2");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("stamina-d4 0/2 → 2/2");
    });
});

describe("a threshold given with write (DAT-3)", () => {
    it("shows the rule of what it touches when write gives it to the player character", async () => {
        await ok("write", "Gara", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1");
        expect(await ok("write", "Gara", "--set", "resolve-loss=1/5")).toContain("resolve-loss changed: Hunger, from the rules of fake:");
    });
});
