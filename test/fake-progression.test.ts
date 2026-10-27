// What the vocations of a character give (D-201, D-219, PRO-1–PRO-4, PRO-7), through the commands on the fake system: the row of each vocation's table at its
// rank, the knacks up to it with an oath's, the rites an oath adds, and what validate says of a table that gives nothing. The same with the 5e's classes is
// in the 5e's repository.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--system", "fake", "--language", "en", "--difficulty", "normal", "--lethality", "dice");
    await ok("write", "Brann", "--type", "character", ...["role=pc", "vocations=[[Warden]] 2", "oaths=[[Oath of the Gate]]", "might=5"].flatMap((field) => ["--set", field]));
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

describe("what the vocations give, through the commands (PRO-1–PRO-4, PRO-7)", () => {
    it("gives the row of the vocation's table and the knacks up to the rank, with the oath's at the rank of its vocation, and the rites it adds apart", async () => {
        const shown = await ok("show", "Brann");
        expect(shown).toContain("Knacks: knacks Steady Hand, Iron Lung, Gatekeeper · knack-count 3 · oaths Oath of the Gate · rites always, from Oath of the Gate: Lock Words · rallies 2/2 · lore gates");
        expect(shown).toContain("show Brann#Steady Hand gives the text of a feature.");
        expect(await ok("show", "Brann#Knacks")).toContain(
            "knacks Steady Hand, Iron Lung, Gatekeeper: Warden 2 in vocations, Oath of the Gate in oaths\nknack-count 3\noaths Oath of the Gate\nrites always, from Oath of the Gate: Lock Words\n"
                + "rallies 2/2: the maximum from Warden 2 in vocations\nlore gates: Warden 2 in vocations",
        );
    });

    it("gives the text of a knack from the page that tells it", async () => {
        expect(await ok("show", "Brann#steady hand")).toContain("A feature of Brann, from Warden.");
        expect(await ok("show", "Brann#Gatekeeper")).toContain("A feature of Brann, from Oath of the Gate.\n\n## Gatekeeper\n\nNo one passes a gate");
        // A knack of a rank not reached yet is not Brann's.
        expect(await refused("show", "Brann#Keen Eye")).toContain('Brann has no section or secret "Keen Eye".');
    });

    it("says what a new rank gives: a knack again with a value in parentheses in place of the earlier, the rites of the oath, the columns that change", async () => {
        expect(await ok("write", "Brann", "--set", "vocations=[[Warden]] 4")).toContain("What Brann's vocations give: Steady Hand again; lore gates → roads.");
        const shown = await ok("show", "Brann");
        expect(shown).toContain("knacks Steady Hand (two), Iron Lung, Gatekeeper");
        expect(shown).toContain("rites always, from Oath of the Gate: Lock Words, Bar Words");
        expect(await ok("write", "Brann", "--set", "vocations=[[Warden]] 4")).toBe("Nothing changed on Brann: it already reads like that.");
    });

    it("gives the same column of two vocations for each, and their knacks together (PRO-2)", async () => {
        expect(await ok("write", "Brann", "--set", "vocations=[[Warden]] 2, [[Scout]] 1")).toContain("What Brann's vocations give: Keen Eye is new; lore gates → Warden gates, Scout tracks.");
        expect(await ok("show", "Brann")).toContain("knacks Steady Hand, Iron Lung, Gatekeeper, Keen Eye · knack-count 4");
    });

    it("says what a lower rank no longer gives, the uses too, and that a rite written by hand is already the oath's (DAT-9, PRO-7)", async () => {
        await ok("write", "Brann", "--set", "vocations=[[Warden]] 2, [[Scout]] 1");
        const lower = await ok("write", "Brann", "--set", "vocations=[[Warden]] 4", "--add", "rites=Lock Words");
        expect(lower).toContain("Brann no longer has stamina-d4: the system fake gives no uses of it now.");
        expect(lower).toContain("What Brann's vocations give: Steady Hand again; no longer Keen Eye; lore Warden gates, Scout tracks → roads.");
        expect(lower).toContain("Lock Words is always in rites, from Oath of the Gate, and not counted with the rest: write Brann, remove rites=Lock Words, to choose another in its place.");
        expect(readFileSync(join(folder, "world", "characters", "Brann.md"), "utf8")).not.toContain("stamina-d4");
        expect(await ok("write", "Brann", "--set", "vocations=[[Warden]] 1")).toContain("What Brann's vocations give: no longer Iron Lung, Gatekeeper; lore roads → gates.");
    });

    it("works the same with a vocation and an oath the campaign writes (D-216)", async () => {
        const table = "| Rank | Knacks | Lore |\n|---|---|---|\n| 1st | Reed Song | reeds |\n| 2nd | Mud Walk, Rank feature | mud |";
        await ok("write", "Fen Guide", "--type", "topic", "--set", "category=vocation", "--text", `${table}\n\n### Reed Song\nYou sing.\n\n### Mud Walk\nYou walk.`);
        await ok("write", "Oath of the Mire", "--type", "topic", "--set", "category=oath", "--set", "vocation=[[Fen Guide]]", "--set", "knacks=[Deep Breath 2]", "--text", "### Deep Breath\nYou hold it.");
        await ok("write", "Vex", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Fen Guide]] 2", "--set", "oaths=[[Oath of the Mire]]");
        expect(await ok("show", "Vex")).toContain("knacks Reed Song, Mud Walk, Deep Breath");
        expect(await ok("show", "Vex#Deep Breath")).toContain("You hold it.");
    });

    it("has validate report a vocation without a rank or without a page, without a table or a row, and an oath that gives nothing", async () => {
        await ok("write", "Brann", "--set", "vocations=[[Warden]]");
        expect(await ok("validate")).toContain("Warden in vocations on Brann has no level, so it gives nothing. Fix: write Brann, set vocations with each level, such as [[Warden]] 1.");
        await ok("write", "Brann", "--set", "vocations=Guardiano 3");
        expect(await ok("validate")).toContain("vocations on Brann names Guardiano, which has no page, so it gives nothing.");
        await ok("write", "Mendicante", "--type", "topic", "--set", "category=vocation", "--text", "No table here.");
        await ok("write", "Oath of Nothing", "--type", "topic", "--set", "category=oath", "--set", "knacks=[Empty Hands]");
        await ok("write", "Brann", "--set", "vocations=[[Warden]] 9, [[Mendicante]] 1", "--set", "oaths=[[Oath of the Gate]], [[Oath of Nothing]]");
        const problems = await ok("validate");
        expect(problems).toContain("Mendicante has no table with a Knacks column whose first column counts levels, so vocations on Brann gives nothing from it.");
        expect(problems).toContain("Oath of Nothing names no vocation, so it adds no knacks to Brann.");
        await ok("write", "Brann", "--set", "vocations=[[Scout]] 1");
        expect(await ok("validate")).toContain("Oath of the Gate is a part of Warden, which is not in vocations on Brann: it adds nothing.");
    });
});
