// Coins tossed in any game, one to three, each heads or tails (D-522, COIN-1–COIN-3): a d2 with the names of its faces, rolled with roll --toss.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { tossCoins } from "../src/dice/index.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
    writeFileSync(join(folder, "campaign.yaml"), "name: Test\nmaster-rolls: behind the screen\n");
    mkdirSync(join(folder, "world", "characters"), { recursive: true });
    writeFileSync(join(folder, "world", "characters", "Lena.md"), "---\nrole: pc\neffects:\n  - Wounded\n---\n");
});

afterEach(() => removeFolder(folder));

/** The context with the dice showing these faces, in order. */
function faces(...values: number[]): Context
{
    let next = 0;
    return { ...context, random: () => values[next++] };
}

async function roll(dice: Context, ...args: string[]): Promise<{ exitCode: number; output: string; }>
{
    return runCommandLine(["roll", ...args], dice);
}

describe("COIN-1: the toss", () => {
    it("tosses one to three coins, each heads or tails in the order they fell, 1 heads and 2 tails", () => {
        expect(tossCoins(1, { random: () => 1 })).toMatchObject({ sides: ["heads"], heads: 1, text: "Toss: heads" });
        expect(tossCoins(3, { values: [2, 1, 2] })).toMatchObject({ sides: ["tails", "heads", "tails"], heads: 1, text: "Toss of 3: tails, heads, tails" });
        expect(tossCoins(2, { values: [1, 2] }).roll.notation).toBe("2d2");

        for (const count of [0, 4, 1.5]) {
            expect(() => tossCoins(count, { random: () => 1 })).toThrow(`Toss one, two or three coins, not ${count}.`);
        }
    });

    it("says the faces with who and why, in a campaign of any game, and refuses more than three", async () => {
        const result = await roll(faces(1, 2), "--toss", "2", "--who", "Lena", "--why", "does the rope hold?");
        expect(result).toEqual({ exitCode: 0, output: "id1 Lena, does the rope hold?: Toss of 2: heads, tails" });
        expect((await roll(faces(1), "--toss", "4", "--who", "Lena")).output).toBe("Toss one, two or three coins, not 4. Nothing rolled.");
    });
});

describe("COIN-2: as any roll", () => {
    it("hides the master's toss behind the screen, and takes the player's own coins as values", async () => {
        expect((await roll(faces(2), "--toss", "1", "--why", "is the gate open?")).output).toMatch(/^Hidden roll id1, only for the master: Toss: tails\. Behind the screen/);
        expect((await roll(context, "--toss", "3", "--who", "Lena", "--values", "2,2,1")).output).toBe("id2 Lena: Toss of 3: tails, tails, heads (physical dice)");
        expect((await roll(context, "--toss", "1", "--who", "Lena", "--values", "3")).output).toContain("Impossible value 3 on a d2");
    });

    it("goes with no notation, table, oracle, keep, use or double, and gives no note of the sheet", async () => {
        expect((await roll(faces(1), "1d6", "--toss", "1")).output).toBe("Give one of the dice to roll, table, oracle or toss, not more: each is a roll of its own. Nothing rolled.");
        expect((await roll(faces(1), "--toss", "1", "--oracle", "likely", "--why", "x?")).output).toContain("Give one of the dice to roll, table, oracle or toss, not more");

        for (const extra of [["--keep", "omens"], ["--use", "omens=3"], ["--double"]]) {
            expect((await roll(faces(1), "--toss", "1", "--who", "Lena", ...extra)).output).toBe("keep, use and double go with dice to roll, not with a table, the oracle or coins. Nothing rolled.");
        }

        // A die of Lena's reminds her effects; her coins do not.
        expect((await roll(faces(3), "1d6", "--who", "Lena")).output).toContain("Wounded");
        expect((await roll(faces(1), "--toss", "1", "--who", "Lena")).output).not.toContain("Wounded");
    });
});

describe("COIN-3: the log and the dashboard", () => {
    it("logs the notation, the dice, the faces and the heads as the total, and shows the player the faces without the dice", async () => {
        await roll(faces(1, 2, 1), "--toss", "3", "--who", "Lena", "--check", "Fate");
        expect(readLogFile(folder).at(-1)).toMatchObject({
            type: "roll",
            visibility: "public",
            data: { notation: "3d2", total: 2, result: "Toss of 3: heads, tails, heads", toss: ["heads", "tails", "heads"], dice: [{ sides: 2, value: 1 }, { sides: 2, value: 2 }, { sides: 2, value: 1 }] },
        });
        const view = JSON.parse((await runCommandLine(["view", "--json"], context)).output) as { rolls: Record<string, unknown>[]; };
        expect(view.rolls.at(-1)).toMatchObject({ notation: "3d2", total: 2, toss: ["heads", "tails", "heads"], dice: [], check: "Fate" });
    });
});
