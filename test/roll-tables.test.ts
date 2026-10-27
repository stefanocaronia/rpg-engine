// Random tables of the world's pages and the yes/no oracle, rolled with roll --table and roll --oracle (D-503).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { oracleResult, readRandomTable } from "../src/dice/index.ts";
import { firstTable } from "../src/pages/index.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
    // In view, to read the rolls as the player would; behind the screen has its own tests.
    writeFileSync(join(folder, "campaign.yaml"), "name: Test\nmaster-rolls: in view\n");
    mkdirSync(join(folder, "world", "places"), { recursive: true });
});

afterEach(() => removeFolder(folder));

/** A place whose text is the lines given. */
function place(name: string, lines: string[]): void
{
    writeFileSync(join(folder, "world", "places", `${name}.md`), `${lines.join("\n")}\n`);
}

/** The context with the dice showing these faces, in order. */
function faces(...values: number[]): Context
{
    let next = 0;
    return { ...context, random: () => values[next++] };
}

/** The lines of the log, none when nothing was logged. */
function logged(): ReturnType<typeof readLogFile>
{
    return existsSync(join(folder, "log.jsonl")) ? readLogFile(folder) : [];
}

async function roll(dice: Context, ...args: string[]): Promise<{ exitCode: number; output: string; }>
{
    return runCommandLine(["roll", ...args], dice);
}

const encounters = ["## Incontri", "", "| d8 | Incontro |", "|---|---|", "| 1–2 | Lupi |", "| 3–4 | Mercanti |", "| 5–6 | Un pastore |", "| 7–8 | Briganti |"];

describe("roll --table", () => {
    it("rolls the die of the first header cell and gives the row, logged as a roll", async () => {
        place("Colli di Vallerana", ["I colli.", "", ...encounters]);
        const result = await roll(faces(6), "--table", "Colli di Vallerana#Incontri", "--why", "a night on the hills");
        expect(result).toEqual({ exitCode: 0, output: "id1 a night on the hills: [d8 = 6] 5–6: Un pastore" });
        expect(logged()).toEqual([
            expect.objectContaining({
                type: "roll",
                visibility: "public",
                data: {
                    notation: "d8",
                    total: 6,
                    result: "[d8 = 6] 5–6: Un pastore",
                    table: "Colli di Vallerana#Incontri",
                    row: "5–6",
                    why: "a night on the hills",
                    physical: false,
                    dice: [{ sides: 8, value: 6 }],
                },
            }),
        ]);
    });

    it("takes the die from the highest row when the header names none, and joins the row's other cells", async () => {
        place("Bosco", ["## Tesori", "", "| Tiro | Cosa | Quanto |", "| --- | --- | --- |", "| 1-3 | Monete | 2d6 |", "| 4 | Una gemma | 1 |", "| 5-6 | Niente | |"]);
        const result = await roll(faces(4), "--table", "[[Bosco#Tesori]]");
        expect(result.output).toBe("id1 [d6 = 4] 4: Una gemma · 1");
    });

    it("reads 00 as 100 on a d100, and ranges with an en dash or a hyphen", async () => {
        place("Palude", ["## Eventi", "", "| d100 | Evento |", "|:--|:--|", "| 01-50 | Nebbia |", "| 51–99 | Pioggia |", "| 00 | Una stella cade |"]);
        expect((await roll(faces(100), "--table", "Palude#Eventi")).output).toBe("id1 [d100 = 100] 00: Una stella cade");
        expect((await roll(faces(51), "--table", "Palude#Eventi")).output).toBe("id2 [d100 = 51] 51–99: Pioggia");
    });

    it("reads a sum of dice and a d66 as tens and units", async () => {
        place("Strada", ["## Viandanti", "", "| 2d6 | Chi |", "|---|---|", "| 2–6 | Nessuno |", "| 7 | Un frate |", "| 8–12 | Soldati |"]);
        expect((await roll(faces(3, 4), "--table", "Strada#Viandanti")).output).toBe("id1 [2d6 = 7] 7: Un frate");
        const d66 = ["## Nomi", "", "| d66 | Nome |", "|---|---|", "| 11–36 | Bruno |", "| 41–66 | Ada |"];
        place("Villaggio", d66);
        expect((await roll(faces(4, 2), "--table", "Villaggio#Nomi")).output).toBe("id2 [d66 = 42] 41–66: Ada");
    });

    it("refuses a table with a gap or an overlap, saying which results, and logs nothing", async () => {
        place("Colli", ["## Incontri", "", "| d8 | Incontro |", "|---|---|", "| 1–2 | Lupi |", "| 5–8 | Briganti |"]);
        const gap = await roll(faces(3), "--table", "Colli#Incontri");
        expect(gap.exitCode).toBe(1);
        expect(gap.output).toContain("The table of Colli#Incontri: The table's rows leave out 3–4 of the d8");
        place("Monti", ["## Incontri", "", "| Incontro |", "|---|", "| 1–3 |", "| 3–4 |"]);
        expect((await roll(faces(3), "--table", "Monti#Incontri")).output).toContain("rows give 3 of the d4 more than once");
        expect(logged()).toEqual([]);
    });

    it("refuses a section with no table, a missing section or page, and a reference with no section", async () => {
        place("Colli", ["## Incontri", "", "Lupi e fuochi fatui.", "", "## Storia", "", "Antica."]);
        expect((await roll(faces(1), "--table", "Colli#Incontri")).output).toContain("Colli#Incontri holds no table: write one under its heading");
        expect((await roll(faces(1), "--table", "Colli#Tesori")).output).toContain('Colli has no section "Tesori". Its sections are: Incontri, Storia.');
        expect((await roll(faces(1), "--table", "Paludi#Incontri")).output).toContain("There is no page named Paludi");
        expect((await roll(faces(1), "--table", "Colli")).output).toContain("Give the section that holds the table after #");
        expect((await roll(faces(1), "--table", "#Incontri")).output).toContain("Give the page before #, such as Colli di Vallerana#Incontri");
        place("Dieci", ["## Tiri", "", "| d10 | Cosa |", "|---|---|", "| 0 | Niente |", "| 1–10 | Qualcosa |"]);
        expect((await roll(faces(1), "--table", "Dieci#Tiri")).output).not.toContain("write the table's die");
        expect(logged()).toEqual([]);
    });

    it("hides a table's roll when asked, and behind the screen any but a party member's, as master-rolls says", async () => {
        place("Colli di Vallerana", encounters);
        const hidden = await roll(faces(8), "--table", "Colli di Vallerana#Incontri", "--hidden");
        expect(hidden.output).toContain("Hidden roll id1, only for the master: [d8 = 8] 7–8: Briganti");
        writeFileSync(join(folder, "campaign.yaml"), "name: Test\n");
        mkdirSync(join(folder, "world", "characters"), { recursive: true });
        writeFileSync(join(folder, "world", "characters", "Kira.md"), "---\nrole: pc\n---\n");
        expect((await roll(faces(1), "--table", "Colli di Vallerana#Incontri", "--who", "Brigante")).output).toContain("only for the master: [d8 = 1] 1–2: Lupi. Behind the screen");
        expect((await roll(faces(1), "--table", "Colli di Vallerana#Incontri")).output).toContain("Behind the screen");
        expect((await roll(faces(1), "--oracle", "likely", "--why", "a boat?")).output).toContain("Behind the screen");
        expect((await roll(faces(3), "--table", "Colli di Vallerana#Incontri", "--who", "Kira")).output).toBe("id5 Kira: [d8 = 3] 3–4: Mercanti");
        expect((await roll(faces(3), "--table", "Colli di Vallerana#Incontri", "--no-hidden", "--no-double")).output).toBe("id6 [d8 = 3] 3–4: Mercanti");
        expect(logged().map((entry) => entry.visibility)).toEqual(["hidden", "hidden", "hidden", "hidden", "public", "public"]);
    });

    it("never shows a table in a secret, nor one of a secret named after #, even in view (review of 25 October)", async () => {
        place("Colli", ["## Incontri", "", "> [!secret] Vero", "> | d2 | Chi |", "> |---|---|", "> | 1 | Il traditore è [[Varro]] |", "> | 2 | Nessuno |"]);
        expect((await roll(faces(1), "--table", "Colli#Incontri", "--no-hidden")).output).toContain("Hidden roll id1, only for the master: [d2 = 1] 1: Il traditore è [[Varro]]");
        expect((await roll(faces(2), "--table", "Colli#Vero")).output).toContain("Hidden roll id2");
        expect(logged().map((entry) => entry.visibility)).toEqual(["hidden", "hidden"]);
    });

    it("takes the first table of a section, in its subsections too, and skips tables in code", async () => {
        const cells = firstTable(["```", "| a | b |", "|---|---|", "```", "### Giorno", "> | d2 | Chi |", "> |---|---|", "> | 1 | [[Lupo\\|un lupo]] |", "> | 2 | Ada |", "", "| d4 | Altro |", "|---|---|"].join("\n"));
        expect(cells).toEqual({ rows: [["d2", "Chi"], ["1", "[[Lupo|un lupo]]"], ["2", "Ada"]], secret: false });
        expect(readRandomTable(cells?.rows ?? []).die).toBe("d2");
    });
});

describe("roll --oracle", () => {
    it("says yes up to the odds and no above them", async () => {
        expect((await roll(faces(75), "--oracle", "likely", "--why", "is the ferryman awake?")).output).toBe("id1 is the ferryman awake?: Likely (75%): [d100 = 75] Yes.");
        expect((await roll(faces(76), "--oracle", "Likely", "--why", "is he armed?")).output).toBe("id2 is he armed?: Likely (75%): [d100 = 76] No.");
        expect(logged()[0]).toEqual(expect.objectContaining({ visibility: "public", data: expect.objectContaining({ notation: "d100", total: 75, oracle: "likely", odds: 75, answer: "yes" }) }));
    });

    it("makes the answer extreme on a double, 100 as 00", async () => {
        expect((await roll(faces(44), "--oracle", "50/50", "--why", "a guard?")).output).toBe("id1 a guard?: 50/50 (50%): [d100 = 44] Yes, and more: something beyond what was asked.");
        expect((await roll(faces(33), "--oracle", "small-chance", "--why", "a boat?")).output).toBe("id2 a boat?: Small chance (10%): [d100 = 33] No, and worse.");
        expect((await roll(faces(100), "--oracle", "almost certain", "--why", "a bridge?")).output).toBe("id3 a bridge?: Almost certain (90%): [d100 = 100] No, and worse.");
        expect(oracleResult(90, 100)).toEqual({ yes: false, extreme: true });
        expect(oracleResult(25, 10)).toEqual({ yes: true, extreme: false });
    });

    it("refuses without the question, and with odds it does not know", async () => {
        const unasked = await roll(faces(10), "--oracle", "likely");
        expect(unasked.exitCode).toBe(1);
        expect(unasked.output).toContain("Give the question asked as why");
        expect((await roll(faces(10), "--oracle", "certain", "--why", "x?")).output).toContain('"certain" are no odds of the oracle: give one of almost certain, likely, 50/50, unlikely, small chance.');
        expect((await roll(faces(10), "--oracle", "constructor", "--why", "x?")).output).toContain("are no odds of the oracle");
        expect(logged()).toEqual([]);
    });
});

describe("roll with more than one of notation, table and oracle", () => {
    it("refuses them together", async () => {
        place("Colli", encounters);
        const refused = [["a notation and a table", ["1d8", "--table", "Colli#Incontri"]], ["a table and the oracle", ["--table", "Colli#Incontri", "--oracle", "likely", "--why", "x?"]], ["a notation and the oracle", [
            "1d100",
            "--oracle",
            "likely",
            "--why",
            "x?",
        ]]] as const;

        for (const [, args] of refused) {
            const result = await roll(faces(1), ...args);
            expect(result.exitCode).toBe(1);
            expect(result.output).toContain("Give one of the dice to roll, table, oracle or toss, not more");
        }

        expect(logged()).toEqual([]);
    });
});
