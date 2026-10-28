// A roll the master shows thrown in the dashboard's tray, or kept in its list of rolls alone (VIEW-13, D-525 (2)).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = { ...testContext(folder), random: () => 1 };
    writeFileSync(join(folder, "campaign.yaml"), "name: Test\nmaster-rolls: in view\n");
    mkdirSync(join(folder, "world", "characters"), { recursive: true });
    writeFileSync(join(folder, "world", "characters", "Lena.md"), "---\nrole: pc\n---\n");
});

afterEach(() => removeFolder(folder));

async function shownRolls(): Promise<Record<string, unknown>[]>
{
    return (JSON.parse((await runCommandLine(["view", "--json"], context)).output) as { rolls: Record<string, unknown>[]; }).rolls;
}

describe("VIEW-13: the roll in the tray", () => {
    it("keeps tray in the log and gives it to the page only when the master says it, for dice and coins alike", async () => {
        await runCommandLine(["roll", "1d6", "--who", "Lena", "--tray"], context);
        await runCommandLine(["roll", "--toss", "1", "--who", "Lena", "--no-tray"], context);
        await runCommandLine(["roll", "1d8", "--who", "Lena"], context);
        expect(readLogFile(folder).filter((entry) => entry.type === "roll").map((entry) => (entry.data as { tray?: boolean; }).tray)).toEqual([true, false, undefined]);
        const rolls = await shownRolls();
        expect(rolls.map((roll) => roll.tray)).toEqual([true, false, undefined]);
    });

    it("never shows a hidden roll, tray or not", async () => {
        await runCommandLine(["roll", "1d20", "--why", "an ambush?", "--hidden", "--tray"], context);
        expect(await shownRolls()).toEqual([]);
    });
});
