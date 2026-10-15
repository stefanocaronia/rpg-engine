// The free rolls of the sheet with advantage or disadvantage (D-445): what exhaustion and the conditions as effects make worse.
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
    const fields = ["role=pc", "creature=[[Human]]", "classes=[[Fighter]] 1", "str=14", "dex=12", "con=12", "int=10", "wis=10", "cha=10", "hp-base=10"];
    await ok("write", "Ettore", "--type", "character", ...fields.flatMap((field) => ["--set", field]));
});

afterEach(() => removeFolder(folder));

describe("advantage and disadvantage on the sheet's rolls", () => {
    it("worsens checks from exhaustion 1, and saves from 3", async () => {
        expect(await dice("athletics")).toBe("1d20");
        await ok("change", "Ettore", "exhaustion", "--to", "1");
        expect(await dice("athletics")).toBe("2d20kl1");
        expect(await dice("wis-save")).toBe("1d20");
        await ok("change", "Ettore", "exhaustion", "--to", "3");
        expect(await dice("wis-save")).toBe("2d20kl1");
    });

    it("reads the conditions on the character: Poisoned worsens checks, Restrained Dexterity saves", async () => {
        await ok("effect", "add", "Ettore", "Poisoned");
        expect(await dice("perception")).toBe("2d20kl1");
        await ok("effect", "end", "Ettore", "Poisoned");
        expect(await dice("perception")).toBe("1d20");
        await ok("effect", "add", "Ettore", "Restrained");
        expect(await dice("dex-save")).toBe("2d20kl1");
        expect(await dice("str-save")).toBe("1d20");
    });
});

/** The dice of a value's free roll on the sheet, without its number. */
async function dice(field: string): Promise<string | undefined>
{
    const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; roll?: { notation: string; }; }[]; }[];
    return sheet.flatMap((group) => group.values).find((value) => value.field === field)?.roll?.notation.replace(/[+-]\d+$/, "");
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
