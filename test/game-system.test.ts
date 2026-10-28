// The game systems installed beside the engine (SYS-1): which they are, nearest folder first, and what each declares.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { conditionMark } from "../src/commands/shared/effects.ts";
import { findSystem, installedSystems, rollName } from "../src/systems/index.ts";
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

    it("reads what a setting is to the player, its about, apart from its values; a value is never a bare text (D-370, DAT-10)", () => {
        const settings = "settings:\n  pace:\n    about: how fast the story runs\n    slow: {means: one scene a day}\n    fast: {means: a scene an hour}\n";
        system(near, "lenta", `title: one of our own\nlanguage: it\n${settings}`);
        expect(installedSystems([near])[0].settings).toEqual([
            {
                name: "pace",
                about: "how fast the story runs",
                values: [{ value: "slow", means: "one scene a day", without: [], engineSettings: {}, asks: [] }, { value: "fast", means: "a scene an hour", without: [], engineSettings: {}, asks: [] }],
            },
        ]);
        system(near, "lenta", "title: one of our own\nlanguage: it\nsettings:\n  pace:\n    slow: one scene a day\n    fast: {means: a scene an hour}\n");
        expect(() => installedSystems([near])).toThrow("give about as what the setting is to the player");
    });
});

describe("the names a game gives its rolls (D-399)", () => {
    it("names a roll in the language asked, else in the system's, however its dropping is written, and refuses dice it cannot name", () => {
        system(near, "nostro", "title: one of our own\nlanguage: en\nroll-names:\n  2d20kh1: {en: with advantage, it: con vantaggio}\n  3d6kl: in a bad way\n");
        const found = installedSystems([near])[0];
        expect([rollName(found, "2d20kh1", "it"), rollName(found, "2D20dl1", "it-CH"), rollName(found, "2d20kh1", "fr"), rollName(found, "3d6kl1", "it")]).toEqual([
            "con vantaggio",
            "con vantaggio",
            "with advantage",
            "in a bad way",
        ]);
        expect([rollName(found, "2d20kl1", "en"), rollName(found, "1d20", "en")]).toEqual([undefined, undefined]);
        system(near, "nostro", "title: one of our own\nlanguage: en\nroll-names:\n  1d20+5: with five\n");
        expect(() => installedSystems([near])).toThrow("write it as dice with the highest or the lowest kept or dropped");
    });
});

describe("what a fight follows on the dashboard (D-314)", () => {
    const base = "title: one of our own\nlanguage: it\nfields: { pf: counter, salvi: counter, persi: counter, forza: number }\nconditions: [Stordito, Prono]\n";

    it("reads the counter, the words a foe's is told in, who does not act, and when one of the party is down (D-516)", () => {
        system(near, "nostro", `${base}combat: {track: pf, in-words: [illeso, ferito, a terra], inactive: [Stordito]}\ndown: {at: pf 0}\n`);
        expect(installedSystems([near])[0]).toMatchObject({
            combat: { track: "pf", inWords: ["illeso", "ferito", "a terra"], inactive: ["Stordito"] },
            down: { field: "pf", value: 0 },
        });
        system(near, "nostro", `${base}combat: {track: pf}\n`);
        expect(installedSystems([near])[0].combat).toEqual({ track: "pf", inWords: [], inactive: [] });
    });

    it("refuses a track or a counter of the down point that is no counter, and a condition it does not have", () => {
        system(near, "nostro", `${base}combat: {track: forza}\n`);
        expect(() => installedSystems([near])).toThrow("combat.track: forza is not declared as a counter in fields");
        system(near, "nostro", `${base}combat: {track: pf, inactive: [Paralizzato]}\n`);
        expect(() => installedSystems([near])).toThrow("combat.inactive: Paralizzato is not one of its conditions");
        system(near, "nostro", `${base}down: {at: forza 0}\n`);
        expect(() => installedSystems([near])).toThrow("down.at: forza is not declared as a counter in fields");
        system(near, "nostro", `${base}down: {at: pf}\n`);
        expect(() => installedSystems([near])).toThrow("cannot be read");
        // The panel's counters and words are the system's code now (D-516).
        system(near, "nostro", `${base}down: {at: pf 0, show: {successes: salvi}}\n`);
        expect(() => installedSystems([near])).toThrow("cannot be read");
        system(near, "nostro", `${base}combat: {track: pf, in-words: true}\n`);
        expect(() => installedSystems([near])).toThrow("give the words a foe's counter is heard in");
    });

    it("reads the state checks, and refuses one that compares a field it does not declare, a comparison written wrong, or a line that names neither (CHK-2)", () => {
        system(near, "nostro", `${base}checks: [{when: Prono, needs: pf <= 0, say: "{page} prono con {pf}"}]\n`);
        expect(installedSystems([near])[0].checks).toEqual([{ when: { effect: "Prono" }, needs: { field: "pf", op: "<=", value: 0 }, say: "{page} prono con {pf}" }]);
        system(near, "nostro", `${base}checks: [{when: Prono, needs: vita <= 0, say: "{page}"}]\n`);
        expect(() => installedSystems([near])).toThrow("checks: vita is not declared in fields");
        system(near, "nostro", `${base}checks: [{when: Prono, needs: pf =< 0, say: "{page}"}]\n`);
        expect(() => installedSystems([near])).toThrow('checks: "pf =< 0" is no comparison');
        system(near, "nostro", `${base}checks: [{when: Prono, needs: pf <= 0, say: "{page} con {pff}"}]\n`);
        expect(() => installedSystems([near])).toThrow("checks: {pff} in say is neither {page} nor a field declared in fields");
    });

    it("reads the drawing of an effect, and marks an effect named as one of its conditions, whatever its case, with its drawing when it has one (D-419, D-516)", () => {
        system(near, "nostro", `${base}condition-icons: { stordito: "M4 4L20 20" }\n`);
        const read = installedSystems([near])[0];
        expect(read.conditionIcons).toEqual({ stordito: "M4 4L20 20" });
        expect([conditionMark(read, "STORDITO"), conditionMark(read, "Prono"), conditionMark(read, "Benedizione"), conditionMark(undefined, "Prono")]).toEqual([
            { condition: true, icon: "M4 4L20 20" },
            { condition: true },
            {},
            {},
        ]);
        // Any effect's name has its drawing too, a condition or not (D-516).
        system(near, "nostro", `${base}condition-icons: { Benedizione: "M12 3v18" }\n`);
        expect(conditionMark(installedSystems([near])[0], "benedizione")).toEqual({ icon: "M12 3v18" });
        system(near, "nostro", `${base}condition-icons: { Prono: "<path d='M4 4'/>" }\n`);
        expect(() => installedSystems([near])).toThrow("write it as the d of an SVG path on a grid of 24");
        system(far, "altro", base);
        expect(installedSystems([far])[0].conditionIcons).toEqual({});
    });
});

describe("the map of a place (GRD-4)", () => {
    const base = "title: one of our own\nlanguage: it\nfields: { velocita: text, taglia: text }\n";

    it("reads the square in metres, the costs, the fields of the speed and the size, the footprints and the rule of leaving one's side", () => {
        system(near, "nostro", `${base}grid: {square: 2 m, diagonal: 1.5, difficult: 2, speed: velocita, size: taglia, footprints: {Grande: 2}, leaving: Attacchi di opportunità}\n`);
        expect(installedSystems([near])[0].grid).toEqual({ square: 2, diagonal: 1.5, difficult: 2, speed: "velocita", size: "taglia", footprints: { Grande: 2 }, leaving: "Attacchi di opportunità" });
    });

    it("refuses a field of the speed or the size it does not declare, and a square not in metric", () => {
        system(near, "nostro", `${base}grid: {square: 1.5 m, diagonal: 1, difficult: 2, speed: passo}\n`);
        expect(() => installedSystems([near])).toThrow("grid: passo is not declared in fields");
        system(near, "nostro", `${base}grid: {square: 5 ft, diagonal: 1, difficult: 2, speed: velocita}\n`);
        expect(() => installedSystems([near])).toThrow("grid.square");
    });
});

describe("the sheet of a system (DAT-2, SYS-8)", () => {
    const declared = "title: one of our own\nlanguage: it\nfields: { vigore: counter, forza: number, forza-mod: modifier, doti: list, motto: text }\n";

    it("reads the groups in order, each entry with what is beside it and whether it is written only when it applies, the notes of the groups and the names of lists", () => {
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza (forza-mod), vigore]\n  Animo: [motto?, doti?]\nsheet-notes: { animo: "del giocatore" }\nsheet-icons: { corpo: "M4 12h16 M12 4v16" }\nvalues: { Doti: [agile, forte] }\n`);
        const found = findSystem([near], "prova");
        expect(found?.sheet).toEqual([
            { name: "Corpo", entries: [{ field: "forza", optional: false, beside: "forza-mod" }, { field: "vigore", optional: false }], icon: "M4 12h16 M12 4v16" },
            { name: "Animo", entries: [{ field: "motto", optional: true }, { field: "doti", optional: true }], note: "del giocatore" },
        ]);
        expect(found?.values).toEqual({ Doti: ["agile", "forte"] });
    });

    it("reads the fields whose checks recall what a character knows, none when it declares none, and refuses a field it does not declare", () => {
        system(near, "prova", `${declared}sheet-knowledge: [forza-mod]\n`);
        expect(findSystem([near], "prova")?.sheetKnowledge).toEqual(["forza-mod"]);
        system(near, "prova", declared);
        expect(findSystem([near], "prova")?.sheetKnowledge).toEqual([]);
        system(near, "prova", `${declared}sheet-knowledge: [sapienza]\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-knowledge: sapienza is not declared in fields.");
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

    it("reads the fields the player acts with on the dashboard, with the engine's verbs, and refuses another verb or a field the sheet lacks (D-495)", () => {
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza, doti]\nsheet-actions: { doti: [use, equip] }\n`);
        expect(findSystem([near], "prova")?.sheetActions).toEqual({ doti: ["use", "equip"] });
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza, doti]\nsheet-actions: { doti: [cast] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-actions.doti: cast is no verb: give one of attack, use, equip, unequip, or declare it in sheet-verbs.");
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza]\nsheet-actions: { doti: [use] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-actions: the sheet has no field doti.");
        system(far, "altro", declared);
        expect(findSystem([far], "altro")?.sheetActions).toBeUndefined();
        expect(findSystem([far], "altro")?.sheetVerbs).toEqual({});
    });

    it("reads the system's own verbs with their sentences, on whom only with all three, and refuses one of the engine's, one without its names or without the others (D-514)", () => {
        const sheet = `${declared}sheet:\n  Corpo: [forza, doti]\n`;
        const throwing = '{label: Lancia, title: "Lancia {item}", says: "Lancio {item}.", says-on: "Lancio {item} a {target}.", says-at: "Lancio {item} verso {square}.", says-self: "Lancio {item} su di me."}';
        system(near, "prova", `${sheet}sheet-actions: { doti: [lanciare, use] }\nsheet-verbs: { lanciare: ${throwing}, legare: {label: Lega, title: "Lega {item}", says: "Lego {item}."} }\n`);
        expect(findSystem([near], "prova")?.sheetVerbs).toEqual({
            lanciare: { label: "Lancia", title: "Lancia {item}", says: "Lancio {item}.", on: "Lancio {item} a {target}.", at: "Lancio {item} verso {square}.", self: "Lancio {item} su di me." },
            legare: { label: "Lega", title: "Lega {item}", says: "Lego {item}." },
        });
        system(near, "prova", `${sheet}sheet-verbs: { use: {label: Usa, title: "Usa {item}", says: "Uso {item}."} }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-verbs: use is one of the engine's verbs, whose words the dashboard has; leave it out.");
        system(near, "prova", `${sheet}sheet-verbs: { legare: {label: Lega, title: "Lega", says: "Lego {item}."} }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-verbs.legare.title: write it with {item}, which the page fills");
        system(near, "prova", `${sheet}sheet-verbs: { legare: {label: Lega, title: "Lega {item}", says: "Lego {item}.", says-on: "Lego {item} a {target}."} }\n`);
        expect(() => findSystem([near], "prova")).toThrow("give says-on, says-at and says-self together");
    });

    it("reads the headline under a character's name, and refuses one that names a field it does not declare (D-288)", () => {
        system(near, "prova", `${declared}sheet-headline: "Vigore {vigore} {doti}"\n`);
        expect(findSystem([near], "prova")?.sheetHeadline).toBe("Vigore {vigore} {doti}");
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza]\nsheet-cards: { rail: [corpo], order: [] }\n`);
        expect(findSystem([near], "prova")?.sheetCards).toEqual({ rail: ["corpo"], order: [], atHand: [] });
        // At hand in a fight, a field of the sheet too (D-315).
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza]\nsheet-cards: { at-hand: [forza, Corpo] }\n`);
        expect(findSystem([near], "prova")?.sheetCards).toEqual({ rail: [], order: [], atHand: ["forza", "Corpo"] });
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza]\nsheet-cards: { at-hand: [Animo] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-cards.at-hand: the sheet has no group or field Animo; its groups are Corpo.");
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza]\nsheet-cards: { rail: [forza] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-cards.rail: the sheet has no group forza; its groups are Corpo.");
        system(near, "prova", `${declared}sheet:\n  Corpo: [forza]\nsheet-cards: { rail: [Animo] }\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-cards.rail: the sheet has no group Animo; its groups are Corpo.");
        system(near, "prova", `${declared}sheet-headline: "Livello {livello}"\n`);
        expect(() => findSystem([near], "prova")).toThrow("sheet-headline: livello is not declared in fields.");
        // The icon on a token of the party, by a declared field (D-414).
        system(near, "prova", `${declared}token-icons: { field: doti, icons: { Guerriero: "M4 4L20 20" } }\n`);
        expect(findSystem([near], "prova")?.tokenIcons).toEqual({ field: "doti", icons: { Guerriero: "M4 4L20 20" } });
        system(near, "prova", `${declared}token-icons: { field: mestiere, icons: {} }\n`);
        expect(() => findSystem([near], "prova")).toThrow("token-icons.field: mestiere is not declared in fields.");
        system(far, "altro", declared);
        expect(findSystem([far], "altro")?.sheetHeadline).toBeUndefined();
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
        ['sheet:\n  Corpo: [forza]\nsheet-icons: { Animo: "M4 12h16" }', "sheet-icons.Animo: the sheet has no group Animo; its groups are Corpo."],
        ['sheet:\n  Corpo: [forza]\nsheet-icons: { Corpo: "<script>" }', "sheet-icons.Corpo: write it as the d of an SVG path on a grid of 24, its letters and numbers alone, such as M4 12h16"],
        ["values: { forza: [breve] }", "values.forza: declare forza as a list or a text in fields, or give no values to it."],
        ["values: { talenti: [breve] }", "values.talenti: declare talenti as a list or a text in fields"],
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
