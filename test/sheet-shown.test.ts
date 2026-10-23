// What the sheet gives the dashboard past its text, for the numbers of 15 October to be drawn: why a roll is better or worse, the load and its stage, how many
// bonds a list may hold, the written speed beside each mode, what a lit torch has left, and the facts the day's upkeep wrote.
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
    await ok("config", "units", "imperial");
    await ok("advance", "--to", "day 1, 18:00");
    const fields = ["role=pc", "creature=[[Human]]", "classes=[[Fighter]] 1", "str=10", "dex=12", "con=12", "int=10", "wis=10", "cha=10", "hp-base=10"];
    await ok("write", "Ettore", "--type", "character", ...fields.flatMap((field) => ["--set", field]), "--add", "inventory=[[Torch]] 3", "--add", "inventory=[[Rations]] 2");
    await ok("write", "Bosco", "--type", "place", "--add", "contains=[[Ettore]]");
});

afterEach(() => removeFolder(folder));

describe("what the sheet gives the dashboard", () => {
    it("says why a roll is better or worse, in the system's words", async () => {
        expect((await value("perception")).roll.odds).toBeUndefined();
        await ok("effect", "add", "Ettore", "Poisoned");
        await ok("change", "Ettore", "exhaustion", "--to", "3");
        expect((await value("perception")).roll).toMatchObject({ notation: "2d20kl1", odds: { better: [], worse: ["Exhaustion", "Poisoned"] } });
        await ok("effect", "end", "Ettore", "Poisoned");
        expect((await value("wis-save")).roll).toMatchObject({ notation: "2d20kl1", odds: { better: [], worse: ["Exhaustion"] } });
    });

    it("gives the load with its limit, and the heaviest stage it reaches by rigor", async () => {
        // Strength 10: past 50 lb encumbered, past 100 heavily, past 150 over the limit.
        await ok("write", "Ettore", "--add", "inventory=[[Iron Pot]] 6");
        expect((await value("load")).load).toEqual({ value: 67, limit: 150 });
        await ok("config", "rigor", "simulation");
        expect((await value("load")).load).toEqual({ value: 67, limit: 150, stage: "Encumbered" });
        expect((await value("athletics")).roll.odds).toBeUndefined();
        await ok("change", "Ettore", "Iron Pot", "--by", "+6");
        expect((await value("load")).load?.stage).toBe("Heavily encumbered");
        expect((await value("athletics")).roll.odds).toEqual({ better: [], worse: ["Heavily encumbered"] });
        await ok("change", "Ettore", "Iron Pot", "--by", "+6");
        await ok("config", "rigor", "rules");
        expect((await value("load")).load?.stage).toBe("Over the limit");
    });

    it("gives the most a list of bonds may hold", async () => {
        await ok("write", "Ettore", "--add", "attuned=[[Ring of Protection]]");
        expect(await value("attuned")).toMatchObject({ items: ["Ring of Protection"], most: 3 });
    });

    it("shows the written speed of a mode beside the one worked out, with its note", async () => {
        await ok("write", "Ettore", "--set", "fly=40 ft (hover)");
        expect(await value("flying")).toMatchObject({ text: "40 ft", beside: "40 ft (hover)", besideField: "fly" });
    });

    it("gives a lit torch what it spends and how many are left", async () => {
        await ok("effect", "add", "Ettore", "Torch");
        const party = JSON.parse(await ok("view", "--json")).party as { effects: { name: string; burns?: unknown; }[]; }[];
        expect(party[0].effects.find((effect) => effect.name === "Torch")?.burns).toEqual({ fuel: "Torch", left: 2 });
    });

    it("marks the facts the day's upkeep wrote", async () => {
        await ok("config", "rigor", "rules");
        await ok("advance", "--by", "1d");
        const { chapters } = JSON.parse(await ok("view", "--journal", "--json")) as { chapters: { facts: Record<string, unknown>[]; }[]; };
        expect(chapters.flatMap((chapter) => chapter.facts)).toContainEqual(expect.objectContaining({ kind: "counter", who: "Ettore", field: "Rations", before: "2", after: "1", upkeep: true }));
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

interface Shown
{
    field: string;
    text: string;
    items?: string[];
    beside?: string;
    roll: { notation: string; odds?: unknown; };
    load?: { value: number; limit?: number; stage?: string; };
}

async function groups(): Promise<{ name: string; values: Shown[]; }[]>
{
    return JSON.parse(await ok("view", "Ettore", "--json")).sheet;
}

/** A value of Ettore's sheet, its free roll's notation without its number. */
async function value(field: string): Promise<Shown>
{
    const found = (await groups()).flatMap((group) => group.values).find((one) => one.field === field);
    expect(found, field).toBeDefined();
    return { ...found!, ...(found?.roll === undefined ? {} : { roll: { ...found.roll, notation: found.roll.notation.replace(/[+-]\d+$/, "") } }) };
}
