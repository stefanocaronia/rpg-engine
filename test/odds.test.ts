// The free rolls of the sheet with advantage or disadvantage (D-445): what exhaustion and the conditions as effects make worse.
import { mkdirSync, writeFileSync } from "node:fs";
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

    it("worsens what Str, Dex and Con roll when heavily encumbered, only under the rigor «simulation»", async () => {
        // Strength 14: past 140 lb one is heavily encumbered.
        await ok("write", "Ettore", "--add", "inventory=[[Iron Pot]] 15");
        expect(await dice("athletics")).toBe("1d20");
        await ok("config", "rigor", "simulation");
        expect(await dice("athletics")).toBe("2d20kl1");
        expect(await dice("dex-save")).toBe("2d20kl1");
        expect(await dice("wis-save")).toBe("1d20");
        expect(await dice("insight")).toBe("1d20");
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

describe("better and worse together (D-445)", () => {
    it("cancel out, in any system that declares them", async () => {
        const systems = join(folder, "..", `${folder.split(/[\\/]/).at(-1)}-systems`);
        mkdirSync(join(systems, "prova"), { recursive: true });
        writeFileSync(
            join(systems, "prova", "system.yaml"),
            [
                "title: a test system",
                "language: en",
                "fields: {mira: modifier}",
                "sheet:",
                "  Prove: [mira]",
                "sheet-dice: {1d20: [mira]}",
                "sheet-odds:",
                "  better: 2d20kh1",
                "  worse: 2d20kl1",
                "  when:",
                '    - {fields: [mira], better: "has(effects, Aiuto)", worse: "has(effects, Ostacolo)"}',
                "",
            ].join("\n"),
        );
        context = { ...context, systemFolders: [systems] };
        await ok("config", "system", "prova");
        await ok("write", "Ettore", "--set", "mira=2");

        const roll = async (): Promise<string | undefined> => {
            const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; roll?: { notation: string; }; }[]; }[];
            return sheet.flatMap((group) => group.values).find((value) => value.field === "mira")?.roll?.notation;
        };

        expect(await roll()).toBe("1d20+2");
        await ok("effect", "add", "Ettore", "Aiuto");
        expect(await roll()).toBe("2d20kh1+2");
        await ok("effect", "add", "Ettore", "Ostacolo");
        expect(await roll()).toBe("1d20+2");
        await ok("effect", "end", "Ettore", "Aiuto");
        expect(await roll()).toBe("2d20kl1+2");
        removeFolder(systems);
    });
});
