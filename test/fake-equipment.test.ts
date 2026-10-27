// What a character holds ready (CON-12, PRO-5), on the fake system: a buckler in equipped gives its parry to the guard, only what one carries is equipped,
// and what moves away is taken off. The same with the 5e's armor and weapons is in the 5e's repository.
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
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Gara", "--type", "character", ...["role=pc", "vocations=[[Warden]] 1", "might=3", "grace=5"].flatMap((field) => ["--set", field]));
    await ok("write", "Scudo", "--type", "item", "--set", "item=[[Buckler]]");
    await ok("write", "Lanterna", "--type", "item", "--set", "item=[[Lantern]]");
    await ok("move", "Scudo", "--to", "Gara");
    await ok("move", "Lanterna", "--to", "Gara");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("what an item held gives (PRO-5)", () => {
    it("works out the formula of an equipped item's page on who holds it, and takes it away when it is no longer held", async () => {
        // 6, grace +1, the Warden's 1 + might bonus 0.
        expect(await ok("show", "Gara")).toContain("guard 8");
        await ok("write", "Gara", "--add", "equipped=[[Scudo]]");
        expect(await ok("show", "Gara")).toContain("guard 10");
        expect(await ok("show", "Gara#Struggle")).toContain("guard 10: grace-bonus +1, vocation-guard 1, parry 2");
        await ok("write", "Gara", "--remove", "equipped=[[Scudo]]");
        expect(await ok("show", "Gara")).toContain("guard 8");
    });
});

describe("what a character has equipped (CON-12)", () => {
    it("is only what it carries: write says what it no longer carries, a kind too, and moving an item away takes it off", async () => {
        // A kind is equipped while a stack of it is carried (STK-11).
        expect(await ok("write", "Gara", "--add", "equipped=[[Buckler]]")).toContain("Gara has Buckler in equipped, but carries none: a character wears or wields only what it holds.");
        await ok("write", "Gara", "--remove", "equipped=[[Buckler]]");
        await ok("write", "Gara", "--add", "equipped=[[Scudo]]", "--add", "equipped=[[Lanterna]]");
        expect(await ok("write", "Gara", "--remove", "inventory=[[Lanterna]]")).toContain(
            "Gara has Lanterna in equipped, but does not carry it: a character wears or wields only what it holds. Fix: move Lanterna, to Gara; or write Gara, remove equipped=[[Lanterna]].",
        );
        await ok("write", "Gara", "--remove", "equipped=[[Lanterna]]");
        await ok("write", "Sentiero", "--type", "place");
        expect(await ok("move", "Scudo", "--to", "Sentiero")).toContain("Gara has Scudo equipped no more.");
        expect(readFileSync(join(folder, "world", "characters", "Gara.md"), "utf8")).not.toContain("equipped");
        expect(await ok("validate")).toBe("No problems.");
    });

    it("loses what was inside a container that goes elsewhere, and nothing when nothing moves", async () => {
        await ok("write", "Sacca", "--type", "item", "--set", "heft=0.5 kg");
        await ok("move", "Sacca", "--to", "Gara");
        await ok("move", "Scudo", "--to", "Sacca");
        await ok("write", "Gara", "--set", "equipped=[[Scudo]]");
        expect(await ok("show", "Gara")).toContain("guard 10");
        // Moved where it already is, the buckler stays equipped.
        expect(await ok("move", "Scudo", "--to", "Sacca")).toBe("Nothing changed: Scudo is already in Sacca.");
        await ok("write", "Bosco", "--type", "place");
        expect(await ok("move", "Sacca", "--to", "Bosco")).toBe("Moved Sacca: now in Bosco.\nGara has Scudo equipped no more.");
        expect(await ok("show", "Gara")).toContain("guard 8");
    });

    it("keeps what goes with whoever moves, the passengers' on a barge too, but not an item moved away from them", async () => {
        await ok("write", "Gara", "--add", "equipped=[[Scudo]]", "--add", "equipped=[[Lanterna]]");
        await ok("write", "Molo", "--type", "place");
        await ok("write", "Isola", "--type", "place");
        expect(await ok("move", "Gara", "--to", "Molo")).not.toContain("equipped no more");
        expect(await ok("show", "Gara")).toContain("guard 10");
        await ok("write", "Chiatta", "--type", "item", "--set", "item=[[Barge]]");
        await ok("move", "Gara", "--to", "Chiatta");
        expect(await ok("move", "Chiatta", "--to", "Isola")).not.toContain("equipped no more");
        expect(await ok("show", "Gara")).toContain("equipped Scudo, Lanterna");
        expect(await ok("move", "Lanterna", "--to", "Isola")).toContain("Gara has Lanterna equipped no more.");
    });
});
