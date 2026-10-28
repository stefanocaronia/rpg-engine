// What the sheet gives the dashboard past its text, for the numbers of 15 October to be drawn, on the fake system: why a roll is better or worse, the load
// and its stage, how many bonds a list may hold, the written stride beside the speed, what a lit rushlight has left, and the facts the day's upkeep wrote.
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
    await ok("advance", "--to", "day 1, 18:00");
    const fields = ["role=pc", "vocations=[[Scout]] 1", "might=1", "grace=3", "wit=4", "stride=8 m"];
    await ok("write", "Ettore", "--type", "character", ...fields.flatMap((field) => ["--set", field]), "--add", "inventory=[[Rushlight]] 3", "--add", "inventory=[[Hardtack]] 2");
    await ok("write", "Bosco", "--type", "place", "--add", "contains=[[Ettore]]");
});

afterEach(() => removeFolder(folder));

describe("what the sheet gives the dashboard", () => {
    it("says why a roll is better or worse, in the system's words", async () => {
        expect((await value("grace")).roll.odds).toBeUndefined();
        expect((await value("notice")).roll).toMatchObject({ notation: "3d6kh2", odds: { better: ["Keen Eye"], worse: [] } });
        await ok("effect", "add", "Ettore", "Dazed");
        expect((await value("notice")).roll).toMatchObject({ notation: "2d6", odds: { better: ["Keen Eye"], worse: ["Dazed"] } });
        expect((await value("grace")).roll).toMatchObject({ notation: "3d6kl2", odds: { better: [], worse: ["Dazed"] } });
    });

    it("gives the load with its limit, and the stage it reaches", async () => {
        // Might 1: the limit is 15; the rushlights 0.3 and the hardtack 1, then twenty tallow 10 more, then twenty more.
        expect((await value("load")).load).toEqual({ value: 1.3, limit: 15 });
        await ok("write", "Ettore", "--add", "inventory=[[Tallow]] 20");
        expect((await value("load")).load).toEqual({ value: 11.3, limit: 15 });
        await ok("change", "Ettore", "Tallow", "--by", "+20");
        expect((await value("load")).load).toEqual({ value: 21.3, limit: 15, stage: "Laden" });
    });

    it("gives the most a list of bonds may hold, and marks the things carried that are in it", async () => {
        await ok("write", "Ettore", "--add", "inventory=[[Iron Ring|anello]] 1", "--add", "bound=[[Iron Ring]]");
        expect(await value("bound")).toMatchObject({ items: ["Iron Ring"], most: 2 });
        const items = (await groups()).flatMap((group) => group.items ?? []);
        expect(items.find((item) => item.item === "anello")).toMatchObject({ bonds: ["bound"] });
        expect(items.find((item) => item.item.toLowerCase().includes("rushlight"))?.bonds).toBeUndefined();
    });

    it("shows the written stride beside the speed worked out, with its note", async () => {
        await ok("write", "Ettore", "--set", "stride=8 m (on dry ground)");
        expect(await value("speed")).toMatchObject({ text: "8 m", beside: "8 m (on dry ground)", besideField: "stride" });
    });

    it("gives a lit rushlight what it spends and how many are left", async () => {
        await ok("effect", "add", "Ettore", "Rushlight");
        const party = JSON.parse(await ok("view", "--json")).party as { effects: { name: string; burns?: unknown; }[]; }[];
        expect(party[0].effects.find((effect) => effect.name === "Rushlight")?.burns).toEqual({ fuel: "Rushlight", left: 2 });
    });

    it("marks the facts the day's upkeep wrote", async () => {
        await ok("config", "rigor", "rules");
        await ok("advance", "--by", "1d");
        const { chapters } = JSON.parse(await ok("view", "--journal", "--json")) as { chapters: { facts: Record<string, unknown>[]; }[]; };
        expect(chapters.flatMap((chapter) => chapter.facts)).toContainEqual(expect.objectContaining({ kind: "counter", who: "Ettore", field: "Hardtack", before: "2", after: "1", upkeep: true }));
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

async function groups(): Promise<{ name: string; values: Shown[]; items?: { item: string; bonds?: string[]; }[]; }[]>
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
