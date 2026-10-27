// The character sheet on the fake system (DAT-2, DAT-8, D-206, D-207, D-280, D-445, SYS-8): its groups in show, how each value is made, what is written on
// it, the names a list takes, Ironsworn's too, the rolls that read it, and better and worse that cancel out. The same on the 5e is in the 5e's repository.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { write } from "../src/commands/write.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext, useSystem } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("config", "harshness", "gentle");
    const fields = ["role=pc", "calling=ferryman", "vocations=[[Warden]] 3", "might=5", "grace=3", "wit=4", "skilled=[wit]", "grit=14/16", "stride=8 m", "umore=sereno", "tongues=[Lowland]"];
    await ok("write", "Ettore", "--type", "character", ...fields.flatMap((field) => ["--set", field]));
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

function pageText(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8");
}

describe("the free roll of the sheet (D-280)", () => {
    it("gives each number the system rolls its dice and the number, or the number beside it, for the dashboard; none to the others", async () => {
        const page = JSON.parse(await ok("view", "Ettore", "--json")) as { sheet: { values: { field: string; roll?: unknown; }[]; }[]; };
        const rollOf = (field: string): unknown => page.sheet.flatMap((group) => group.values).find((value) => value.field === field)?.roll;
        // A trait rolls the bonus beside it; a bonus of 0 adds nothing; a Warden's notice has no edge.
        expect(rollOf("might")).toEqual({ notation: "2d6+1", dice: [6, 6], modifier: 1 });
        expect(rollOf("wit")).toEqual({ notation: "2d6", dice: [6, 6], modifier: 0 });
        expect(rollOf("notice")).toEqual({ notation: "2d6+5", dice: [6, 6], modifier: 5 });
        expect(rollOf("guard")).toBeUndefined();
        expect(rollOf("grit")).toBeUndefined();
    });
});

describe("the sheet in show (DAT-2, D-207)", () => {
    it("gives a player character's sheet in the system's groups, a bonus beside its trait, and the fields as written without what the sheet shows", async () => {
        const shown = await ok("show", "Ettore");
        expect(shown).toContain([
            "Person: calling ferryman · vocations Warden 3 · level 3",
            "Traits: might 5 (+1) · grace 3 (+0) · wit 4 (+0) · skilled wit",
            // A number the character is skilled in has a mark (D-217).
            "Struggle: grit 14/16 · stamina-d6 3/3 · guard 8 · notice 5 ● · speed 8 m (8 m)",
            // The vocation's table gives its knacks and its other columns (D-219).
            "Knacks: knacks Steady Hand, Iron Lung · knack-count 2 · tongues Lowland · rallies 2/2 · lore bridges",
            "show Ettore#Steady Hand gives the text of a feature.",
            "",
            "---\nrole: pc\numore: sereno\n---",
        ].join("\n"));
        expect(shown).not.toContain("Worked out by the system");
        // The result keeps every field as written and every value with what it came from, for whoever reads it as data.
        const data = JSON.parse(await ok("show", "Ettore", "--json")) as { fields: Record<string, unknown>; worked: { field: string; line: string; repeats: boolean; }[]; onSheet: string[]; };
        expect(data.fields).toMatchObject({ might: 5, grit: "14/16", umore: "sereno" });
        expect(data.worked).toContainEqual({ field: "notice", line: "notice 5: wit 4, level 3, wit in skilled", repeats: false });
        expect(data.onSheet).toContain("might-bonus");
    });

    it("reads the sheet with its effects, and says what they cover", async () => {
        await ok("effect", "add", "Ettore", "Forza del bue", "--set", "might=7");
        const shown = await ok("show", "Ettore");
        expect(shown).toContain("While they last: might 7 (5 without)");
        expect(shown).toContain("Traits: might 7 (+2) · grace 3 (+0)");
        expect(shown).toContain("guard 9");
    });

    it("gives a group with how each value is made, by its name in any case; a section of that name comes first", async () => {
        // A group is its values: no place, links or inherited text.
        expect(await ok("show", "Ettore#struggle")).toBe([
            "Ettore#Struggle (character) · world/characters/Ettore.md",
            "",
            "grit 14/16: the maximum from level 3, might-bonus +1\nstamina-d6 3/3: the maximum from 3 in vocations, stamina-die d6\nguard 8: grace-bonus +0, vocation-guard 2\nnotice 5: wit 4, level 3, wit in skilled\nspeed 8 m: stride 8",
        ].join("\n"));
        await ok("write", "Ettore#Struggle", "--text", "Rema contro corrente.");
        expect(await ok("show", "Ettore#Struggle")).toContain("Rema contro corrente.");
    });

    it("says what a group lacks, and names the groups when there is no section or group by that name", async () => {
        await ok("write", "Mira", "--type", "character", "--set", "role=companion");
        expect(await ok("show", "Mira#Knacks")).toContain("Mira has nothing in Knacks yet.");
        expect(await refused("show", "Ettore#Incantesimi")).toBe(
            'Ettore has no section or secret "Incantesimi". It has no sections or secrets. The groups of its sheet are: Person, Traits, Struggle, Knacks, Gear.',
        );
    });

    it("leaves the other characters as they are written, with where each value comes from", async () => {
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "creature=[[Reed Cutter]]", "--set", "grit=3/7");
        const shown = await ok("show", "Gaspare");
        expect(shown).toContain('---\nrole: npc\ncreature: "[[Reed Cutter]]"\ngrit: 3/7\n---');
        expect(shown).toContain("Fields inherited from Reed Cutter (fake):");
        expect(shown).not.toContain("Traits:");
        expect(await refused("show", "Gaspare#Knacks")).toBe('Gaspare has no section or secret "Knacks". It has no sections or secrets.');
    });
});

describe("what is written on the sheet (DAT-2, D-206, SYS-8)", () => {
    it("takes the names of another game system: the debilities of the test system based on Ironsworn", async () => {
        removeFolder(folder);
        folder = makeTempFolder();
        context = testContext(folder);
        await ok("init", "--name", "Ferro", "--system", "ironsworn");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "momentum=2/10", "--add", "debilities=Wounded");
        expect(await refused("write", "Kira", "--add", "debilities=hungry")).toBe(
            '"hungry" is not one of the names debilities takes in the system ironsworn: wounded, shaken, unprepared, encumbered, maimed, corrupted, cursed, tormented. Nothing changed.',
        );
        expect(await ok("show", "Kira")).toContain("momentum: 2/9");
    });

    it("refuses a map where the system wants a list, as an MCP client may send vocations, and says how to write it (D-246)", async () => {
        await ok("write", "Mira", "--type", "character", "--set", "role=pc");
        const input = write.input.parse({ page: "Mira", set: { vocations: { "[[Warden]]": 1 } } });
        expect(() => write.run(input, context)).toThrow("vocations is a list in the system fake: give it as one, such as vocations=[[[Warden]] 1]. Nothing changed.");
    });

    it("says once, when a character joins the party, what the sheet lacks and the system's notes", async () => {
        const joined = await ok("write", "Mira", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Scout]] 1");
        expect(joined).toContain("Mira's sheet of the system fake still lacks, by these names: renown, might, grace, wit, skilled, grit, resolve, stride.");
        expect(joined).toContain("Knacks: knacks are the person's few tricks: their vocations give some by rank, and the story may give one more, written by hand;");
        expect(await ok("write", "Mira", "--set", "might=3")).not.toContain("Knacks: knacks are");
        expect(await ok("status")).toContain("Mira's sheet still lacks, by these names: renown, grace, wit, skilled, resolve, stride.");
        expect(await ok("write", "Rosa", "--type", "character", "--set", "role=npc")).toBe("Created Rosa (character, world/characters/Rosa.md): set role.");
    });

    it("takes in a list only the names the system gives, in any case and never as links, and refuses the others with those names, changing nothing", async () => {
        expect(await refused("write", "Ettore", "--add", "skilled=[[Might]]")).toBe("skilled takes the system's names, not links: Might. Nothing changed.");
        await ok("write", "Ettore", "--add", "skilled=MIGHT");
        const before = pageText("Ettore");
        expect(await refused("write", "Ettore", "--set", "skilled=[wit, forza]", "--set", "umore=teso")).toBe('"forza" is not one of the names skilled takes in the system fake: might, grace, wit. Nothing changed.');
        expect(await refused("write", "Ettore", "--add", "skilled=gracee", "--add", "skilled=witt")).toBe('"gracee", "witt" are not names skilled takes in the system fake: might, grace, wit. Nothing changed.');
        expect(await refused("write", "Ettore", "--set", "skilled=might, wit")).toContain("A list is written [a, b]. Nothing changed.");
        expect(pageText("Ettore")).toBe(before);
    });

    it("takes on a sheet only the system's tongues, and those the campaign adds", async () => {
        expect(await refused("write", "Ettore", "--add", "tongues=Elfico")).toBe(
            '"Elfico" is not one of the names tongues takes in the system fake: Lowland, Marsh Cant. A name of the campaign\'s own world joins them with config values "tongues: [Elfico]". Nothing changed.',
        );
        await ok("config", "values", "tongues: [Lingua dei Guadi]");
        await ok("write", "Ettore", "--add", "tongues=Lingua dei Guadi");
        expect(pageText("Ettore")).toContain("- Lingua dei Guadi\n");
    });

    it("reports in validate a name written by hand that the system does not take, and text with commas for a list", async () => {
        writeFileSync(join(folder, "world", "characters", "Nero.md"), "---\nrole: npc\nskilled: [forza, wit]\ntongues: Lowland, Marsh Cant\n---\n");
        const problems = await ok("validate");
        expect(problems).toContain('- world/characters/Nero.md: On Nero: "forza" is not one of the names skilled takes in the system fake: might, grace, wit. Fix: write Nero, remove skilled=forza, then add the right name.');
        expect(problems).toContain("- world/characters/Nero.md: tongues on Nero is text with commas, read as one name: a list is written [a, b]. Fix: write Nero, set tongues=[Lowland, Marsh Cant].");
        await ok("write", "Nero", "--remove", "skilled=forza", "--set", "tongues=[Lowland, Marsh Cant]");
        expect(await ok("validate")).not.toContain("Nero");
    });
});

describe("rolls from the sheet (DAT-8)", () => {
    it("takes a field's value from the sheet of who rolls, as it reads with effects and formulas, and says it in the output and the log", async () => {
        expect(await ok("roll", "2d6+notice", "--who", "Ettore", "--why", "scorgere")).toMatch(/^\S+ Ettore, scorgere: 2d6\+notice = 13 \[4, 4\] \+ 5 \(notice 5\)$/);
        expect(readLogFile(folder).at(-1)?.data).toMatchObject({ notation: "2d6+notice", total: 13, sheet: { notice: 5 }, why: "scorgere", who: "Ettore" });
        await ok("effect", "add", "Ettore", "Forza del bue", "--set", "might=7");
        expect(await ok("roll", "2d6+might-bonus", "--who", "ettore")).toContain("2d6+might-bonus = 10 [4, 4] + 2 (might-bonus +2)");
        expect(await ok("roll", "2d6 + might-bonus - wit-bonus", "--who", "Ettore")).toContain("2d6 + might-bonus - wit-bonus = 10 [4, 4] + 2 - 0 (might-bonus +2, wit-bonus +0)");
    });

    it("keeps the values in a hidden roll's proof, and takes them from a copy in the open scene", async () => {
        const hidden = await ok("roll", "2d6+notice", "--who", "Ettore", "--hidden");
        const id = /^Hidden roll (\S+), only for the master: 2d6\+notice = 13 \[4, 4\] \+ 5 \(notice 5\)$/m.exec(hidden)?.[1];
        expect(id).toBeDefined();
        expect(await ok("roll", "--reveal", id ?? "")).toContain(`Hidden roll ${id} revealed: 2d6+notice = 13 [4, 4] + 5 (notice 5).`);
        await ok("scene", "open", "--title", "Imboscata", "--type", "combat", "--creatures", "Fen Witch=1");
        expect(await ok("roll", "2d6+guard", "--who", "Fen Witch 1")).toContain("only for the master: 2d6+guard = 15 [4, 4] + 7 (guard 7)");
    });

    it("refuses a name without who, with who that is no character, or a field the sheet does not hold as a whole number, logging nothing", async () => {
        const logged = readLogFile(folder).length;
        // The examples with the system's own dice and the master's own field, never a d20 (D-514).
        expect(await refused("roll", "2d6+notice")).toBe('"notice" is no die: to take it from a sheet, give who rolls, such as who Bruna; or give the number, such as 2d6+2.');
        expect(await refused("roll", "2d6+notice", "--who", "Bruno")).toBe(
            "There is no page named Bruno, nor a copy of that name in the open scene, to take notice from: give who as the name of a character, or the number in the notation.",
        );
        const subtraction = await refused("roll", "2d6+notice-1", "--who", "Ettore");
        expect(subtraction).toMatch(/^Ettore has no notice-1\. Its numbers: might-bonus \+1, grace-bonus \+0, wit-bonus \+0, level 3, guard 8, notice 5/);
        expect(subtraction).toContain("Give one of them, or the number, such as 2d6+2. To subtract, put spaces around the minus, such as 2d6+notice - 1.");
        expect(await refused("roll", "2d6+might", "--who", "Ettore")).toBe("might 5 is a score: the system fake works out might-bonus +1 from it, which is what a roll adds, such as 2d6+might-bonus. Nothing rolled.");
        expect(await refused("roll")).toContain("Give the dice to roll, for example 2d6+2;");
        expect(await refused("roll", "2d6+umore", "--who", "Ettore")).toBe('umore on Ettore is "sereno", not a whole number: give the number in the notation.');
        expect(readLogFile(folder)).toHaveLength(logged);
    });

    it("reminds the effects on who rolls that are not in their numbers, the conditions, and the fields of their line not at zero", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        expect(await ok("roll", "2d6", "--who", "Ettore")).not.toContain("complete it");
        await ok("effect", "add", "Ettore", "Benedizione", "--for", "1m");
        await ok("effect", "add", "Ettore", "Dazed", "--for", "1h");
        await ok("write", "Ettore", "--set", "ward=2");
        expect(await ok("roll", "2d6", "--who", "Ettore")).toContain("\nEttore has Benedizione, Dazed, ward 2: if they change this roll, complete it:");
    });
});

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

        try {
            context = { ...context, systemFolders: [systems] };
            useSystem(folder, "prova");
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
        } finally {
            // The test system goes even when the test fails.
            removeFolder(systems);
        }
    });
});
