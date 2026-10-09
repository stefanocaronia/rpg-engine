// The game systems installed beside the engine (SYS-1): which they are, nearest folder first, and what each declares.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findSystem, installedSystems } from "../src/systems/index.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

let near: string;
let far: string;

beforeEach(() => {
    near = makeTempFolder();
    far = makeTempFolder();
});

afterEach(() => {
    removeFolder(near);
    removeFolder(far);
});

function system(folder: string, name: string, yaml: string): void
{
    mkdirSync(join(folder, name), { recursive: true });
    writeFileSync(join(folder, name, "system.yaml"), yaml);
}

describe("installed systems", () => {
    it("reads each folder with a system.yaml, in order, the nearest folder winning a name, and skips files, folders without one and folders that are not there", () => {
        system(far, "zeta", "title: the last\nlanguage: en\n");
        system(far, "Alfa", "title: the far alfa\nlanguage: it\n");
        system(near, "alfa", "title: the near alfa\nlanguage: en-GB\nfields:\n  hp: counter\n  cr: text\n");
        mkdirSync(join(near, "empty"));
        writeFileSync(join(near, "notes.txt"), "not a system");

        const systems = installedSystems([near, join(near, "missing"), far]);
        expect(systems.map((found) => found.name)).toEqual(["alfa", "zeta"]);
        expect(systems[0]).toMatchObject({ name: "alfa", folder: join(near, "alfa"), title: "the near alfa", language: "en-GB", fields: { hp: "counter", cr: "text" }, sheet: [], values: {}, thresholds: [], recipes: [] });
        expect(systems[0].attribution).toBeUndefined();
        expect(systems[1].fields).toEqual({});
    });

    it("finds a system by its name in any case, with spaces around it, past a folder that does not exist, and reads no other", () => {
        system(near, "5e", "title: the fifth edition\nlanguage: en\nattribution: From the SRD.\n");
        system(near, "rotto", "title: a broken one\nlanguage: Italiano\n");
        expect(findSystem([join(far, "missing"), near], " 5E ")?.attribution).toBe("From the SRD.");
        expect(findSystem([near], "4e")).toBeUndefined();
    });

    it("refuses a system.yaml that does not say what the system is, with the file and why", () => {
        system(near, "rotto", "title: a broken one\nlanguage: Italiano\n");
        expect(() => installedSystems([near])).toThrow(`The game system rotto cannot be read, because ${join(near, "rotto", "system.yaml")} is not valid`);
        system(near, "rotto", "title: a broken one\nlanguage: it\nfields:\n  hp: dice\n");
        expect(() => installedSystems([near])).toThrow("fields.hp");
        system(near, "rotto", "title: a broken one\nlanguage: it-\n");
        expect(() => installedSystems([near])).toThrow("cannot be read");
    });
});

describe("the sheet of a system (DAT-2, SYS-8)", () => {
    const declared = "title: one of our own\nlanguage: it\nfields: { vigore: counter, forza: number, forza-mod: modifier, doti: list, motto: text }\n";

    it("reads the groups in order, each entry with what is beside it and whether it is written only when it applies, the notes of the groups and the names of lists", () => {
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza (forza-mod), vigore]\n  Animo: [motto?, doti?]\nsheet-notes: { animo: "del giocatore" }\nvalues: { Doti: [agile, forte] }\n`);
        const found = findSystem([near], "prova");
        expect(found?.sheet).toEqual([
            { name: "Corpo", entries: [{ field: "forza", optional: false, beside: "forza-mod" }, { field: "vigore", optional: false }] },
            { name: "Animo", entries: [{ field: "motto", optional: true }, { field: "doti", optional: true }], note: "del giocatore" },
        ]);
        expect(found?.values).toEqual({ Doti: ["agile", "forte"] });
    });

    it("reads the dice each number of the sheet is rolled with, and refuses a field it does not declare, one listed twice, and more than dice (D-280)", () => {
        system(near, "prova", `${declared}sheet-dice:\n  1d20: [forza-mod]\n  2d6+1d4: [vigore]\n`);
        expect(findSystem([near], "prova")?.sheetDice).toEqual({ "forza-mod": "1d20", "vigore": "2d6+1d4" });
        system(near, "prova", `${declared}sheet-dice: { 1d20: [agilita] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-dice.1d20: agilita is not declared in fields.");
        system(near, "prova", `${declared}sheet-dice: { 1d20: [forza], 1d6: [Forza] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-dice: Forza is listed twice; give each field one set of dice.");
        system(near, "prova", `${declared}sheet-dice: { 1d20+5: [forza] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-dice.1d20+5: write it as dice alone, as 1d20 or 2d6+1d4, and the fields of the sheet rolled with them");
        system(far, "altro", declared);
        expect(findSystem([far], "altro")?.sheetDice).toEqual({});
    });

    it("reads the pages every character with a sheet has in a list", () => {
        system(near, "prova", `${declared}always-in: { equipped: [Pugno] }\n`);
        expect(findSystem([near], "prova")).toMatchObject({ alwaysIn: { equipped: ["Pugno"] } });
        system(far, "altro", declared);
        expect(findSystem([far], "altro")).toMatchObject({ alwaysIn: {} });
    });

    it("reads its parts of the master's instructions, each adding to the core's or, when it says so, taking its place (D-121)", () => {
        system(near, "prova", declared);
        mkdirSync(join(near, "prova", "instructions"));
        writeFileSync(join(near, "prova", "instructions", "creation.md"), "Con il giocatore, un passo alla volta.\r\n");
        writeFileSync(join(near, "prova", "instructions", "combat.md"), "---\nreplace: true\n---\nNessun turno: si gioca la finzione.\n");
        expect(findSystem([near], "prova")?.parts).toEqual({
            creation: { text: "Con il giocatore, un passo alla volta.", replace: false },
            combat: { text: "Nessun turno: si gioca la finzione.", replace: true },
        });
        system(far, "altro", declared);
        expect(findSystem([far], "altro")?.parts).toEqual({});

        writeFileSync(join(near, "prova", "instructions", "combat.md"), "---\nreplaces: true\n---\nNessun turno.\n");
        expect(() => findSystem([near], "prova")).toThrow("combat.md is not valid: a part's frontmatter says only replace: true, for a part that takes the place of the core's.");
    });

    it.each([
        ["sheet: [forza, vigore]", "write the sheet as groups, each with its fields"],
        ["sheet:\n  Corpo: [forza(forza-mod)]", 'write it as "str", "str (str-mod)" for a field shown beside it, or "flaw?" for one written only when it applies'],
        ["sheet:\n  Corpo: []", "sheet.Corpo"],
        ["sheet:\n  Corpo: [forza]\nsheet-notes: { Animo: del giocatore }", "sheet-notes.Animo: the sheet has no group Animo; its groups are Corpo."],
        ["values: { motto: [breve] }", "values.motto: declare motto as a list in fields, or give no values to it."],
        ["values: { talenti: [breve] }", "values.talenti: declare talenti as a list in fields"],
        ["marks: [motto]", "motto is not declared as a list in fields, as marks and progression need."],
        ["always-in: [Pugno]", "always-in: write it as lists, each with the names of the pages in it, such as equipped: [Unarmed Strike]."],
        ["always-in: { equipped: [] }", "always-in.equipped"],
        // A note that is now a part of the instructions (D-121), and a misspelled key, are no key the system has (SYS-1).
        ['creation: "con il giocatore"', 'unknown key "creation"'],
        ["sheet-note: { Corpo: del giocatore }", 'unknown key "sheet-note"'],
    ])("refuses %j, saying where and how to write it", (yaml, message) => {
        system(near, "prova", `${declared}${yaml}\n`);
        expect(() => findSystem([near], "prova")).toThrow(message);
    });
});
