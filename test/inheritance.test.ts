import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { write } from "../src/commands/write.ts";
import type { Context } from "../src/core/context.ts";
import { baseChain, inheritedFields, type Page } from "../src/pages/index.ts";
import { fightGuidance, inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22", "--set", "ac=13", "--set", "tags=[mostri]");
    await ok("write", "Annegato capo", "--type", "creature", "--set", "creature=[[Annegato]]", "--set", "hp=40/40");
    await ok("write", "Vecchio annegato", "--type", "character", "--set", "role=npc", "--set", "creature=[[Annegato capo]]");
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

function stateFile(): string
{
    return readFileSync(join(folder, "state.yaml"), "utf8");
}

describe("pages that derive from a creature", () => {
    it("read what they do not hold from the nearest base, and hold only what changes", async () => {
        expect(await ok("change", "Vecchio annegato", "hp", "--by=-5")).toBe("Vecchio annegato: hp 40/40 → 35/40.");
        expect(readFileSync(join(folder, "world", "characters", "Vecchio annegato.md"), "utf8")).toBe('---\nrole: npc\ncreature: "[[Annegato capo]]"\nhp: 35/40\n---\n');
        expect(readFileSync(join(folder, "world", "creatures", "Annegato capo.md"), "utf8")).toContain("hp: 40/40");
        expect(await ok("show", "Vecchio annegato")).toBe(
            'Vecchio annegato (character) · world/characters/Vecchio annegato.md\nDerives from: Annegato capo › Annegato\n\n---\nrole: npc\ncreature: "[[Annegato capo]]"\nhp: 35/40\n---\n\nFields inherited from Annegato:\nac: 13',
        );
    });

    it("never inherit fixed fields and relations, and count inherited counters as their own", async () => {
        await ok("write", "Annegato", "--set", "status=dead");
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11");
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]");
        expect(JSON.parse(await ok("show", "Vecchio annegato", "--json")).inherited).toEqual([{ from: "Annegato capo", fields: { hp: "40/40" }, text: "", parts: [] }, { from: "Annegato", fields: { ac: 13 }, text: "", parts: [] }]);
        expect(await ok("status")).toContain("Companions: Zanna: hp 11/11");

        const write = await rpg("write", "Zanna", "--set", "hp=5/11");
        expect(write.exitCode).toBe(1);
        expect(write.output).toBe('hp is a counter that Zanna reads from Lupo: use change, page "Zanna", field hp, to 5/11 (or by an amount), which writes it on Zanna only. To make it something else, set a value that is not a counter.');
        expect(await ok("change", "Zanna", "hp", "--to", "5/11")).toBe("Zanna: hp 11/11 → 5/11.");
    });

    it("say how to add a counter that neither the page nor its bases hold", async () => {
        const result = await rpg("change", "Vecchio annegato", "mana", "--by=-1");
        expect(result.output).toBe(
            'Vecchio annegato has no field "mana". Its counters: hp 40/40. Vecchio annegato reads what it does not hold from Annegato capo: write the counter there, such as set mana=12/12, and everything that derives from Annegato capo takes it; or on Vecchio annegato alone.',
        );
    });

    it("give their copies in a scene what they inherit", async () => {
        expect(await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato capo")).toBe(`Scene opened: Ossario (combat). In it: Annegato capo 1: hp 40/40.\n${fightGuidance}`);
        expect(await ok("change", "Annegato capo 1", "hp", "--by=-3")).toBe("Annegato capo 1: hp 40/40 → 37/40.");
    });

    it("are checked by validate: a base must be a creature, and a chain must not come back", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion");
        expect((await rpg("write", "Bruna", "--type", "character", "--set", "creature=[[Lena]]")).output).toBe("creature must link to a creature, and Lena is a character. Nothing changed.");
        writeFileSync(join(folder, "world", "characters", "Bruna.md"), '---\ncreature: "[[Lena]]"\n---\n');
        writeFileSync(join(folder, "world", "creatures", "Annegato.md"), '---\ncreature: "[[Vecchio annegato]]"\nhp: 22/22\n---\n');
        writeFileSync(join(folder, "world", "creatures", "Fuoco.md"), '---\ncreature: "[[Fiamma]]"\n---\n');
        writeFileSync(join(folder, "world", "creatures", "Fiamma.md"), '---\ncreature: "[[Fuoco]]"\n---\n');
        const output = await ok("validate");
        expect(output).toContain("- world/characters/Bruna.md: Bruna derives from Lena, which is a character: creature must link to a creature. Fix: write Bruna, set creature to the creature it is a kind of, or unset it.");
        expect(output).toContain("- world/creatures/Annegato.md: Annegato derives from Vecchio annegato, which is a character: creature must link to a creature.");
        expect(output).toContain("- world/creatures/Fuoco.md: Fuoco derives from itself: Fuoco › Fiamma › Fuoco.");
        expect(await ok("show", "Fuoco")).toContain("Derives from: Fiamma");
    });
});

describe("pages that derive from a creature, after the review", () => {
    it("are not stopped by a name two pages share along the chain", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11");
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]");
        writeFileSync(join(folder, "world", "Lupo.md"), "Un lupo scritto a mano.\n");
        expect(await ok("validate")).toContain("Two pages have the same name: world/Lupo.md and world/creatures/Lupo.md.");
        expect(await ok("status")).toContain("1 problem in the campaign");
        await ok("write", "Zanna", "--set", "nota=ciao");
    });

    it("take a field written in another case as the same field, and an empty one as missing", async () => {
        await ok("write", "Orso", "--type", "creature", "--set", "PF=30/30");
        await ok("write", "Bruno", "--type", "character", "--set", "role=companion", "--set", "creature=[[Orso]]", "--set", "pf=12/30");
        expect(await ok("status")).toContain("Companions: Bruno: pf 12/30");
        expect(await ok("change", "Bruno", "PF", "--by=-2")).toBe("Bruno: pf 12/30 → 10/30.");

        writeFileSync(join(folder, "world", "characters", "Vecchio annegato.md"), '---\nrole: npc\ncreature: "[[Annegato capo]]"\nhp:\n---\n');
        expect(await ok("change", "Vecchio annegato", "hp", "--by=-1")).toBe("Vecchio annegato: hp 40/40 → 39/40.");
    });

    it("never pass fixed fields and relations from creature to creature", async () => {
        await ok("write", "Tridente", "--type", "item");
        writeFileSync(join(folder, "world", "creatures", "Annegato.md"), '---\nhp: 22/22\nac: 13\nstatus: dead\nknows:\n  - "[[Annegato capo]]"\ninventory:\n  - "[[Tridente]]"\n---\n');
        expect(JSON.parse(await ok("show", "Annegato capo", "--json")).inherited).toEqual([{ from: "Annegato", fields: { ac: 13 }, text: "", parts: [] }]);
    });

    it("let the pages of a loop report it, not those that only lead into it", async () => {
        writeFileSync(join(folder, "world", "creatures", "Fuoco.md"), '---\ncreature: "[[Fiamma]]"\n---\n');
        writeFileSync(join(folder, "world", "creatures", "Fiamma.md"), '---\ncreature: "[[Fuoco]]"\n---\n');
        writeFileSync(join(folder, "world", "creatures", "Fuoco piccolo.md"), '---\ncreature: "[[Fuoco]]"\n---\n');
        writeFileSync(join(folder, "world", "creatures", "Scintilla.md"), '---\ncreature: "[[Fuoco piccolo]]"\n---\n');

        for (let index = 1; index <= 12; index++) {
            writeFileSync(join(folder, "world", "creatures", `Ombra ${index}.md`), `---\ncreature: "[[Ombra ${index === 12 ? 1 : index + 1}]]"\n---\n`);
        }

        const output = await ok("validate");
        expect(output).toContain("Fuoco derives from itself: Fuoco › Fiamma › Fuoco.");
        expect(output).toContain("Fiamma derives from itself: Fiamma › Fuoco › Fiamma.");
        expect(output).not.toContain("Scintilla derives");
        expect(output).not.toContain("Fuoco piccolo derives");
        expect(output).toContain("Ombra 1 derives from itself: Ombra 1 › Ombra 2");
    });

    it("change with the creature they read a counter from, and say so", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11");
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]");
        await ok("write", "Grigio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]", "--set", "hp=5/11");
        expect(await ok("change", "Lupo", "hp", "--to", "13/13")).toBe(
            "Lupo: hp 11/11 → 13/13: at max.\nChanged with it, since they read hp from Lupo: Zanna (hp 13/13). To change only one of them, change that page instead.\nNot changed, since they hold their own hp: Grigio (hp 5/11).",
        );
        const [base, zanna] = readLogFile(folder).slice(-2);
        expect(base).toMatchObject({ type: "counter-changed", visibility: "hidden", data: { page: "Lupo" } });
        expect(zanna).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Zanna", field: "hp", before: "11/11", after: "13/13" } });
        expect(JSON.stringify(zanna.data)).not.toContain("Lupo");
    });

    it("may hold something else in place of an inherited counter, but take a new counter only through change", async () => {
        await ok("write", "Annegato", "--set", "uses=1/1");
        await ok("write", "Annegato capo", "--set", "uses=illimitati");
        const counter = await rpg("write", "Vecchio annegato", "--set", "hp=30/40");
        expect(counter.exitCode).toBe(1);
        expect(counter.output).toContain("hp is a counter that Vecchio annegato reads from Annegato capo: use change");
    });

    it("keep the copies of a variant from being changed through any creature they read from", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato capo=2");
        const result = await rpg("change", "Annegato", "ac", "--by=-1");
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Annegato has copies in the open scene, which read from it what they do not change: Annegato capo 1 (hp 40/40), Annegato capo 2 (hp 40/40).");
    });

    it("tell a copy whose creature is gone what to do", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11");
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Lupo=2");
        renameSync(join(folder, "world", "creatures", "Lupo.md"), join(folder, "world", "creatures", "Lupo grigio.md"));
        expect((await rpg("change", "Lupo 2", "hp", "--by=-4")).output).toBe(
            `Lupo 2 has no field "hp". It has no counters. Lupo 2 copies [[Lupo]], which cannot be read: no creature has that name, two pages share it, or it is not a creature. To fix it, fix the creature's page, or let the copy leave the scene; validate shows why.`,
        );
    });
});

describe("what derives, and what it shows", () => {
    it("derives only characters and creatures: on other pages creature is a field like any other", async () => {
        await ok("write", "Trofeo", "--type", "item", "--set", "creature=[[Annegato]]");
        const shown = JSON.parse(await ok("show", "Trofeo", "--json"));
        expect(shown.derivesFrom).toEqual([]);
        expect(shown.inherited).toEqual([]);
        expect(await ok("validate")).toBe("No problems.");
    });

    it("shows all the counters a page holds, and of those it inherits only the current/max ones", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11", "--set", "difesa=13", "--set", "speed=12");
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]", "--set", "fiuto=3");
        expect(await ok("status")).toContain("Companions: Zanna: hp 11/11");
        expect(await ok("change", "Zanna", "difesa", "--by=-1")).toBe("Zanna: difesa 13 → 12.");
        expect(await ok("status")).toContain("Companions: Zanna: hp 11/11");
    });

    it("says where a field comes from when it cannot be removed from the page", async () => {
        const result = await rpg("write", "Vecchio annegato", "--unset", "hp");
        expect(result.exitCode).toBe(1);
        expect(result.output).toBe('Vecchio annegato has no field "hp" to remove. It reads hp from Annegato capo: remove it there, or set it on Vecchio annegato to hold a value of its own.');
    });
});

describe("write on derived pages, bases and copies (INH-5, INH-7, INH-11, INH-14)", () => {
    it("writes a copy's own fields into the scene, and never its text, creature, fixed fields or a new current/max", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=2");
        expect(await ok("write", "annegato 1", "--set", "spaventato=true", "--add", "condizioni=prono")).toBe("Updated Annegato 1 (copy of [[Annegato]] in the open scene): set spaventato; added to condizioni.");
        expect(stateFile()).toContain('    Annegato 1:\n      creature: "[[Annegato]]"\n      spaventato: true\n      condizioni:\n        - prono\n    Annegato 2:\n');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "page-updated", visibility: "hidden", data: { page: "Annegato 1", copy: true } });
        expect(await ok("write", "Annegato 1", "--unset", "spaventato")).toBe("Updated Annegato 1 (copy of [[Annegato]] in the open scene): removed spaventato.");
        expect(await ok("write", "Annegato 1", "--set", "hp=morto")).toBe("Updated Annegato 1 (copy of [[Annegato]] in the open scene): set hp.");

        const refusals: [string[], string][] = [
            [
                ["write", "Annegato 2", "--text", "Fradicio."],
                "Annegato 2 is a copy of [[Annegato]] in the open scene: it has no text of its own, only fields that differ from its creature, such as set frightened=true. To give it text of its own, make it a character: show it to read its values, let it leave with scene leave, write Annegato 2 as a character with creature=[[Annegato]] and those values, then bring it back with scene add.",
            ],
            [["write", "Annegato 2", "--set", "creature=[[Lupo]]"], "creature is what Annegato 2 copies, and it does not change: to bring in another creature, add a copy of it with scene add."],
            [
                ["write", "Annegato 2", "--add", "tags=bagnato"],
                "tags is not a field a copy holds: a copy holds only what differs from its creature, [[Annegato]], such as a counter (conditions and forms go with effect). To give it tags of its own, make it a character: show it to read its values, let it leave with scene leave, write Annegato 2 as a character with creature=[[Annegato]] and those values, then bring it back with scene add.",
            ],
            [
                ["write", "Annegato 2", "--set", "hp=5/22"],
                'hp is a counter that Annegato 2 reads from Annegato: use change, page "Annegato 2", field hp, to 5/22 (or by an amount), which writes it on Annegato 2 only. To make it something else, set a value that is not a counter.',
            ],
            [["write", "Annegato 2", "--unset", "ac"], 'Annegato 2 has no field "ac" to remove: it reads ac from Annegato, and holds no value of its own.'],
            [["write", "Annegato 2"], "Nothing to write on Annegato 2: give fields to set, unset, add or remove."],
        ];

        for (const [args, message] of refusals) {
            expect((await rpg(...args)).output).toBe(message);
        }

        await ok("change", "Annegato 2", "hp", "--by=-2");
        expect((await rpg("write", "Annegato 2", "--unset", "hp")).output).toBe(
            'hp on Annegato 2 is a counter: without it, Annegato 2 would read 22/22 from Annegato, with no line in the log. Use change, page "Annegato 2", field hp, to 22/22: it takes the field off, and Annegato 2 follows Annegato again.',
        );
    });

    it("refuses to remove a counter a base also holds, and change brings it back to the base", async () => {
        await ok("change", "Vecchio annegato", "hp", "--by=-5");
        const refusal =
            'hp on Vecchio annegato is a counter: without it, Vecchio annegato would read 40/40 from Annegato capo, with no line in the log. Use change, page "Vecchio annegato", field hp, to 40/40: it takes the field off, and Vecchio annegato follows Annegato capo again.';
        expect((await rpg("write", "Vecchio annegato", "--unset", "HP")).output).toBe(refusal);
        expect(() => write.run(write.input.parse({ page: "Vecchio annegato", set: { hp: "" } }), context)).toThrow("Give hp a value. To remove a field, use unset.");
        expect(await ok("change", "Vecchio annegato", "hp", "--to", "40/40")).toBe("Vecchio annegato: hp 35/40 → 40/40: at max; again as Annegato capo.");
        expect(readFileSync(join(folder, "world", "characters", "Vecchio annegato.md"), "utf8")).not.toContain("hp:");
    });

    it("takes a new counter only through change, and something else in its place when a base holds it", async () => {
        await ok("change", "Vecchio annegato", "hp", "--by=-5");
        expect((await rpg("write", "Vecchio annegato", "--set", "hp=30/40")).output).toBe(
            'hp is a counter: use change, page "Vecchio annegato", field hp, to 30/40 (or by an amount). To make it something else, set a value that is not a counter.',
        );
        expect((await rpg("write", "Annegato", "--set", "hp=morto")).output).toBe('hp is a counter: use change, page "Annegato", field hp, to a value (or by an amount). To make it something else, unset it, then set it.');
        await ok("write", "Vecchio annegato", "--set", "hp=morto");
        expect(await ok("write", "Vecchio annegato", "--set", "ac=13")).toBe("Nothing changed on Vecchio annegato: it already reads like that.");
        expect(readFileSync(join(folder, "world", "characters", "Vecchio annegato.md"), "utf8")).toBe('---\nrole: npc\ncreature: "[[Annegato capo]]"\nhp: morto\n---\n');
    });

    it("starts adding to or removing from a list from the one it inherits, and gives the page its own", async () => {
        await ok("write", "Annegato", "--set", "attacchi=[morso, artigli]");
        expect(await ok("write", "Vecchio annegato", "--add", "attacchi=tridente")).toBe("Updated Vecchio annegato (character, world/characters/Vecchio annegato.md): added to attacchi.");
        expect(await ok("write", "Annegato capo", "--remove", "Attacchi=morso")).toBe(
            "Updated Annegato capo (creature, world/creatures/Annegato capo.md): removed from attacchi.\nNot changed, since they hold their own attacchi: Vecchio annegato (attacchi morso, artigli, tridente).",
        );
        expect(JSON.parse(await ok("show", "Vecchio annegato", "--json")).fields.attacchi).toEqual(["morso", "artigli", "tridente"]);
        expect(JSON.parse(await ok("show", "Annegato capo", "--json")).fields.attacchi).toEqual(["artigli"]);
        expect((await rpg("write", "Vecchio annegato", "--remove", "attacchi=coda")).output).toBe('"attacchi" does not hold coda.');

        await ok("write", "Vecchio annegato", "--add", "tags=antico");
        expect(JSON.parse(await ok("show", "Vecchio annegato", "--json")).fields.tags).toEqual(["antico"]);
        writeFileSync(join(folder, "world", "creatures", "Annegato.md"), "---\nhp: 22/22\nac: 13\nattacchi:\n---\n");
        await ok("write", "Annegato", "--add", "attacchi=morso");
        expect((await rpg("write", "Annegato", "--remove", "coda=punta")).output).toBe('There is no "coda" to remove from.');
    });

    it("writes a field under the name the page gives it, or inherits, and takes each field once", async () => {
        expect(await ok("write", "Annegato", "--set", "AC=14")).toBe(
            "Updated Annegato (creature, world/creatures/Annegato.md): set ac.\nChanged with it, since they read ac from Annegato: Vecchio annegato, Annegato capo. To change only one of them, write that page instead.",
        );
        expect(await ok("write", "Vecchio annegato", "--set", "Ac=12")).toBe("Updated Vecchio annegato (character, world/characters/Vecchio annegato.md): set ac.");
        expect(readFileSync(join(folder, "world", "characters", "Vecchio annegato.md"), "utf8")).toContain("\nac: 12\n");
        expect((await rpg("write", "Annegato", "--set", "ac=1", "--set", "AC=2")).output).toBe("The field AC is given twice: give each field once.");
        expect((await rpg("write", "Annegato", "--set", "ac=1", "--set", "ac=2")).output).toBe("The field ac is given twice: give each field once.");
        expect((await rpg("write", "Annegato", "--set", "ac=1", "--unset", "AC")).output).toBe("The field AC is given in two ways (set, unset, or add and remove): give it in one.");
        await ok("write", "Annegato", "--add", "attacchi=morso", "--add", "attacchi=coda");
        await ok("write", "Annegato", "--add", "attacchi=artigli", "--remove", "attacchi=coda");
        expect(JSON.parse(await ok("show", "Annegato", "--json")).fields.attacchi).toEqual(["morso", "artigli"]);
    });

    it("refuses a creature that is not a creature, is the page itself, or would close a loop", async () => {
        const refusals: [string[], string][] = [
            [["write", "Vecchio annegato", "--set", "creature=[[vecchio annegato]]"], "Vecchio annegato cannot derive from itself: creature must link to another creature. Nothing changed."],
            [["write", "Ombra", "--type", "creature", "--set", "creature=[[Ombra]]"], "Ombra cannot derive from itself: creature must link to another creature. Nothing changed."],
            [["write", "Annegato", "--set", "creature=[[Vecchio annegato]]"], "creature must link to a creature, and Vecchio annegato is a character. Nothing changed."],
            [["write", "Annegato", "--set", "creature=[[Annegato capo]]"], "Annegato cannot derive from Annegato capo: the chain would come back to it (Annegato › Annegato capo › Annegato). Nothing changed."],
        ];

        for (const [args, message] of refusals) {
            expect((await rpg(...args)).output).toBe(message);
        }

        await ok("write", "Trofeo", "--type", "item", "--set", "creature=[[Trofeo]]");
        await ok("write", "Ombra", "--type", "creature", "--set", "creature=[[Spettro]]");
    });

    it("lists the pages that change with a base, for each field or section that changed, ten at most", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11");
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]");
        await ok("write", "Grigio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]", "--set", "fiuto=2");
        expect(await ok("write", "Lupo", "--set", "fiuto=3", "--set", "hp=11/11")).toBe(
            "Updated Lupo (creature, world/creatures/Lupo.md): set fiuto.\nChanged with it, since they read fiuto from Lupo: Zanna. To change only one of them, write that page instead.\nNot changed, since they hold their own fiuto: Grigio (fiuto 2).",
        );
        expect(await ok("write", "Lupo#Tattiche", "--text", "In branco.")).toBe(
            'Updated Lupo (creature, world/creatures/Lupo.md): wrote "Tattiche".\nChanged with it, since they read #Tattiche from Lupo: Grigio, Zanna. To change only one of them, write that page instead.',
        );
        expect(await ok("write", "Lupo", "--text", "Un lupo grigio.")).toBe(
            "Updated Lupo (creature, world/creatures/Lupo.md): wrote the introduction.\nChanged with it, since they read the introduction from Lupo: Grigio, Zanna. To change only one of them, write that page instead.",
        );
        expect(await ok("write", "Lupo", "--set", "creature=[[Annegato]]")).toBe(
            "Updated Lupo (creature, world/creatures/Lupo.md): set creature.\nChanged with it, since they derive from Lupo: Grigio, Zanna. To change only one of them, write that page instead.\nLupo keeps its own hp 11/11 (Annegato gives 22/22). If they came from its old creature: change hp to 22/22.",
        );
        expect(await ok("write", "Lupo", "--add", "tags=bosco")).toBe("Updated Lupo (creature, world/creatures/Lupo.md): added to tags.");

        await ok("write", "Orso", "--type", "character", "--set", "role=npc", "--set", "creature=[[Grande orso]]");
        expect(await ok("write", "Grande orso", "--type", "creature", "--set", "hp=30/30")).toBe(
            "Created Grande orso (creature, world/creatures/Grande orso.md): set hp.\nChanged with it, since they derive from Grande orso: Orso. To change only one of them, write that page instead.\n"
                + "Grande orso derives from no creature: if it is a kind of one of the system 5e (named in English: find, type creature, with part of its name in English), set creature to it, and its numbers come from there.",
        );

        for (let index = 1; index <= 12; index++) {
            await ok("write", `Cucciolo ${String(index).padStart(2, "0")}`, "--type", "character", "--set", "role=npc", "--set", "creature=[[Grande orso]]");
        }

        expect(await ok("write", "Grande orso", "--set", "ac=11")).toContain(
            "Changed with it, since they read ac from Grande orso: Cucciolo 01, Cucciolo 02, Cucciolo 03, Cucciolo 04, Cucciolo 05, Cucciolo 06, Cucciolo 07, Cucciolo 08, Cucciolo 09, Cucciolo 10, and 3 more.",
        );
    });

    it("refuses to change what the copies of a creature read while they are in the open scene", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato capo");
        const refusal = "has copies in the open scene, which read from it what they do not change: Annegato capo 1 (hp 40/40). Change a copy; to change";
        expect((await rpg("write", "Annegato", "--set", "ac=14")).output).toContain(`Annegato ${refusal}`);
        expect((await rpg("write", "Annegato capo", "--set", "creature=[[Lupo]]")).output).toContain(`Annegato capo ${refusal}`);
        expect((await rpg("write", "Annegato", "--add", "attacchi=morso")).exitCode).toBe(1);
        await ok("write", "Annegato", "--add", "tags=acqua");
        await ok("write", "Annegato", "--text", "Un corpo gonfio d'acqua.");
        await ok("write", "Vecchio annegato", "--set", "ac=12");

        writeFileSync(join(folder, "state.yaml"), "scene:\n  title: Ossario\n");
        expect((await rpg("write", "Annegato", "--set", "ac=14")).output).toBe(
            'Annegato is a creature, and the open scene, which may hold its copies, cannot be read: The open scene in state.yaml is not valid: type: Invalid option: expected one of "combat"|"social"|"exploration"|"travel"|"rest"|"challenge"|"other". To fix it, close it with scene close and a summary, then open it again. Nothing changed.',
        );
        expect((await rpg("write", "Annegato capo 1", "--set", "spaventato=true")).output).toBe(
            "There is no page named Annegato capo 1. To create it, give its type: character, place, faction, quest, item, event, topic, creature. The open scene in state.yaml cannot be read, so a copy in it cannot be written: validate shows how to fix it. find looks for the pages of the system 5e in their names and fields, in English.",
        );
    });
});

describe("show on derived pages and copies (INH-13, INH-14)", () => {
    beforeEach(async () => {
        await ok("write", "Annegato", "--text", "Un corpo gonfio d'acqua.");
        await ok("write", "Annegato#Tattiche", "--text", "Afferra e trascina sott'acqua.");
        await ok("write", "Annegato#Debolezza", "--secret", "--text", "Teme il fuoco.");
        await ok("write", "Annegato capo#Tattiche", "--text", "Comanda gli altri.");
    });

    it("adds the sections and secrets of the bases that the page has none of by name, and the nearest introduction when it has none", async () => {
        expect(await ok("show", "Vecchio annegato")).toBe([
            "Vecchio annegato (character) · world/characters/Vecchio annegato.md",
            "Derives from: Annegato capo › Annegato",
            "",
            "---",
            "role: npc",
            'creature: "[[Annegato capo]]"',
            "---",
            "",
            "Fields inherited from Annegato capo:",
            "hp: 40/40",
            "",
            "Fields inherited from Annegato:",
            "ac: 13",
            "",
            "Text inherited from Annegato capo:",
            "",
            "## Tattiche",
            "",
            "Comanda gli altri.",
            "",
            "Text inherited from Annegato:",
            "",
            "Un corpo gonfio d'acqua.",
            "",
            "> [!secret] Debolezza",
            "> Teme il fuoco.",
        ].join("\n"));
        await ok("write", "Vecchio annegato", "--text", "Il più vecchio della palude.");
        expect(await ok("show", "Vecchio annegato")).not.toContain("Un corpo gonfio d'acqua.");
    });

    it("finds a section or secret in the nearest base that has it", async () => {
        expect(await ok("show", "Vecchio annegato#tattiche")).toBe(
            "Vecchio annegato#tattiche (character) · world/characters/Vecchio annegato.md\nDerives from: Annegato capo › Annegato\nInherited from Annegato capo: Vecchio annegato has no section or secret of its own by this name.\n\n## Tattiche\n\nComanda gli altri.",
        );
        await ok("write", "Vecchio annegato#Tattiche", "--text", "Aspetta.");
        expect(await ok("show", "Vecchio annegato#Tattiche")).toBe("Vecchio annegato#Tattiche (character) · world/characters/Vecchio annegato.md\nDerives from: Annegato capo › Annegato\n\n## Tattiche\n\nAspetta.");
        expect((await rpg("show", "Vecchio annegato#Nulla")).output).toBe('Vecchio annegato has no section or secret "Nulla". Its sections are: Tattiche. It shows, from Annegato: Debolezza.');
        // A list longer than eight shows its first eight, and Page#field shows it whole (D-468).
        const places = Array.from({ length: 10 }, (_, index) => `[[Luogo ${index + 1}]]`).join(", ");
        await ok("write", "Vecchio annegato", "--set", `knows=${places}`);
        const shown = await ok("show", "Vecchio annegato");
        expect(shown).toContain('  - "[[Luogo 8]]"\n  - "and 2 more: show Vecchio annegato#knows"');
        expect(shown).not.toContain("Luogo 9");
        expect(await ok("show", "Vecchio annegato#knows")).toContain('  - "[[Luogo 9]]"\n  - "[[Luogo 10]]"\n---');
    });

    it("shows a copy with what it changed, and its creature's introduction, sections and secrets", async () => {
        await ok("scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato");
        await ok("change", "Annegato 1", "hp", "--by=-4");
        expect(await ok("show", "annegato 1")).toBe([
            'Annegato 1 (copy of [[Annegato]] in the open scene "Ossario") · state.yaml',
            "Derives from: Annegato",
            "",
            "---",
            'creature: "[[Annegato]]"',
            "hp: 18/22",
            "---",
            "",
            "Fields inherited from Annegato:",
            "ac: 13",
            "",
            "Text inherited from Annegato:",
            "",
            "Un corpo gonfio d'acqua.",
            "",
            "## Tattiche",
            "",
            "Afferra e trascina sott'acqua.",
            "",
            "> [!secret] Debolezza",
            "> Teme il fuoco.",
        ].join("\n"));
        expect(await ok("show", "Annegato 1#Debolezza")).toBe(
            'Annegato 1#Debolezza (copy of [[Annegato]] in the open scene "Ossario") · state.yaml\nDerives from: Annegato\nInherited from Annegato: Annegato 1 has no section or secret of its own by this name.\n\n> [!secret] Debolezza\n> Teme il fuoco.',
        );
        expect((await rpg("show", "Annegato 9")).output).toBe("There is no page named Annegato 9, nor a copy of that name in the open scene. Look for it with the find command.");
    });

    it("reports a field written twice in different cases", async () => {
        writeFileSync(join(folder, "world", "creatures", "Annegato.md"), "---\nhp: 22/22\nHP: 20/22\n---\n");
        expect(await ok("validate")).toContain("- world/creatures/Annegato.md: Annegato writes the field hp 2 times: hp, HP. Only the last one, HP, is read. Fix: write Annegato, unset hp.");
        await ok("write", "Annegato", "--unset", "hp");
        expect(JSON.parse(await ok("show", "Annegato", "--json")).fields).toEqual({ HP: "20/22" });
    });
});

describe("pages that derive from a creature, after the second review (D-124)", () => {
    beforeEach(async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11", "--text", "Un lupo grigio.");
        await ok("write", "Lupo#Tattiche", "--text", "Caccia in branco.");
        await ok("write", "Lupo#Debolezza", "--secret", "--text", "Teme il fuoco.");
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]");
    });

    it("writes a section or secret the page shows from a base as its own, of the same kind, adding to the base's text", async () => {
        expect(await ok("write", "Zanna#Debolezza", "--append", "--text", "Anche l'argento.")).toBe('Updated Zanna (character, world/characters/Zanna.md): added to "Debolezza".');
        expect(await ok("show", "Zanna#Debolezza")).toBe("Zanna#Debolezza (character) · world/characters/Zanna.md\nDerives from: Lupo\n\n> [!secret] Debolezza\n> Teme il fuoco.\n>\n> Anche l'argento.");
        expect(await ok("write", "Zanna#Tattiche", "--append", "--text", "Ma Zanna segue Ennio.")).toBe('Updated Zanna (character, world/characters/Zanna.md): added to "Tattiche".');
        expect(readFileSync(join(folder, "world", "characters", "Zanna.md"), "utf8")).toContain("## Tattiche\n\nCaccia in branco.\n\nMa Zanna segue Ennio.\n");
        expect(await ok("show", "Lupo#Debolezza")).toBe("Lupo#Debolezza (creature) · world/creatures/Lupo.md\n\n> [!secret] Debolezza\n> Teme il fuoco.\n\nLinked from:\n- Zanna: creature");

        await ok("write", "Grigio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]");
        await ok("write", "Grigio#Debolezza", "--text", "Nessuna.");
        expect(await ok("show", "Grigio#Debolezza")).toContain("> [!secret] Debolezza\n> Nessuna.");
        expect((await rpg("write", "Grigio#Tattiche", "--text", "")).output).toBe('Grigio has no section or secret "Tattiche" of its own: it shows the one of Lupo. To remove it for everything that derives from Lupo, remove it there.');
    });

    it("finds a section of a base without the parts the page has of its own", async () => {
        await ok("write", "Lupo#Tattiche", "--text", "Caccia in branco.\n\n### Di notte\n\nUlula.");
        await ok("write", "Zanna#Di notte", "--text", "Dorme vicino al fuoco.");
        expect(await ok("show", "Zanna#Tattiche")).toBe(
            "Zanna#Tattiche (character) · world/characters/Zanna.md\nDerives from: Lupo\nInherited from Lupo: Zanna has no section or secret of its own by this name.\n\n## Tattiche\n\nCaccia in branco.\n\n> [!secret] Debolezza\n> Teme il fuoco.",
        );
        expect(await ok("show", "Zanna")).toContain("Dorme vicino al fuoco.");
        expect(await ok("show", "Zanna")).not.toContain("Ulula.");
    });

    it("shows no heading of a base left with nothing to show, once the page writes all its subsections (D-169)", async () => {
        writeFileSync(join(folder, "world", "creatures", "Lupo.md"), "---\nhp: 11/11\n---\n\n## Tratti\n\n### Fiuto\n\nSente il sangue.\n\n## Azioni\n\n### Morso\n\nMorde.\n");
        await ok("write", "Zanna#Morso", "--text", "Morde e non molla.");
        const shown = await ok("show", "Zanna");
        expect(shown).toContain("Text inherited from Lupo:\n\n## Tratti\n\n### Fiuto\n\nSente il sangue.");
        expect(shown).not.toContain("## Azioni");
        expect(shown).toContain("## Morso\n\nMorde e non molla.");
    });

    it("keeps a base's heading with text of its own, and looks for kept subsections only down to the next heading of its level (D-169)", async () => {
        writeFileSync(join(folder, "world", "creatures", "Lupo.md"), "---\nhp: 11/11\n---\n\n## Azioni\n\nIn branco.\n\n### Morso\n\nMorde.\n\n## Reazioni\n\n### Schivata\n\nSchiva.\n");
        await ok("write", "Zanna#Morso", "--text", "Morde e non molla.");
        expect(await ok("show", "Zanna")).toContain("## Azioni\n\nIn branco.");
        writeFileSync(join(folder, "world", "creatures", "Lupo.md"), "---\nhp: 11/11\n---\n\n## Azioni\n\n### Morso\n\nMorde.\n\n## Reazioni\n\n### Schivata\n\nSchiva.\n");
        const shown = await ok("show", "Zanna");
        expect(shown).not.toContain("## Azioni");
        expect(shown).toContain("## Reazioni\n\n### Schivata\n\nSchiva.");
    });

    it("shows a base's secret without a name even when the page has one of its own", async () => {
        writeFileSync(join(folder, "world", "creatures", "Lupo.md"), "---\nhp: 11/11\n---\n\nUn lupo grigio.\n\n> [!secret]\n> Il branco è del Re dei Lupi.\n");
        writeFileSync(join(folder, "world", "characters", "Zanna.md"), '---\nrole: companion\ncreature: "[[Lupo]]"\n---\n\n> [!secret]\n> Zanna ricorda il Re.\n');
        const shown = await ok("show", "Zanna");
        expect(shown).toContain("> Zanna ricorda il Re.");
        expect(shown).toContain("Text inherited from Lupo:\n\nUn lupo grigio.\n\n> [!secret]\n> Il branco è del Re dei Lupi.");
    });

    it("lists the pages that change with a base when a write changes a section or secret, wherever it is written", async () => {
        expect(await ok("write", "Lupo", "--text", "Un lupo grigio.\n\n> [!secret] Tana\n> Sotto la quercia.")).toBe(
            "Updated Lupo (creature, world/creatures/Lupo.md): wrote the introduction.\nChanged with it, since they read #Tana from Lupo: Zanna. To change only one of them, write that page instead.",
        );
        expect(await ok("write", "Lupo", "--set", "fiuto=3", "--add", "tags=bosco")).toBe(
            "Updated Lupo (creature, world/creatures/Lupo.md): set fiuto; added to tags.\nChanged with it, since they read fiuto from Lupo: Zanna. To change only one of them, write that page instead.",
        );
    });

    it("keeps the why of a base out of the public lines of the pages that change with it", async () => {
        await ok("change", "Lupo", "hp", "--to", "13/13", "--why", "nutriti dal Re dei Lupi");
        const [base, zanna] = readLogFile(folder).slice(-2);
        expect(base).toMatchObject({ visibility: "hidden", data: { page: "Lupo", why: "nutriti dal Re dei Lupi" } });
        expect(zanna).toMatchObject({ visibility: "public", data: { page: "Zanna", field: "hp", before: "11/11", after: "13/13" } });
        expect(JSON.stringify(zanna.data)).not.toContain("Re dei Lupi");
    });

    it("lets validate find a section through the bases, as show does", async () => {
        await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--add", "knows=[[Zanna#Debolezza]]");
        expect(await ok("validate")).toBe("No problems.");
        await ok("write", "Ennio", "--add", "knows=[[Zanna#Nulla]]");
        expect(await ok("validate")).toContain('knows links to [[Zanna#Nulla]], but Zanna has no section or secret "Nulla", nor do the pages it derives from.');
    });

    it("refuses a creature whose chain would come back through a page not written yet, and a base that is a free page", async () => {
        await ok("write", "Spettro", "--type", "creature", "--set", "creature=[[Ombra]]");
        expect((await rpg("write", "Ombra", "--type", "creature", "--set", "creature=[[spettro]]")).output).toBe(
            "Ombra cannot derive from Spettro: the chain would come back to it (Ombra › Spettro › Ombra). Nothing changed.",
        );
        await ok("write", "Annegato", "--set", "creature=[[Spettro]]");
        expect((await rpg("write", "Annegato", "--set", "creature=[[Annegato capo]]")).output).toBe(
            "Annegato cannot derive from Annegato capo: the chain would come back to it (Annegato › Annegato capo › Annegato). Nothing changed.",
        );

        writeFileSync(join(folder, "world", "Nebbia.md"), "Una nebbia scritta a mano.\n");
        expect((await rpg("write", "Lupo", "--set", "creature=[[Nebbia]]")).output).toBe("creature must link to a creature, and Nebbia is a free page. Nothing changed.");
        writeFileSync(join(folder, "world", "creatures", "Lupo.md"), '---\ncreature: "[[Nebbia]]"\nhp: 11/11\n---\n');
        expect(await ok("validate")).toContain("Lupo derives from Nebbia, which is a free page: creature must link to a creature.");
    });

    it("writes a value equal to the base's where the page reads it, when the page writes the field twice", async () => {
        await ok("write", "Lupo", "--set", "fiuto=forte");
        writeFileSync(join(folder, "world", "characters", "Zanna.md"), '---\nrole: companion\ncreature: "[[Lupo]]"\nfiuto: buono\nFiuto: ottimo\n---\n');
        await ok("write", "Zanna", "--set", "fiuto=forte");
        expect(JSON.parse(await ok("show", "Zanna", "--json")).fields).toMatchObject({ fiuto: "buono", Fiuto: "forte" });
    });

    it("brings change back to the base in every spelling, and validate takes an empty one as missing", async () => {
        writeFileSync(join(folder, "world", "characters", "Zanna.md"), '---\nrole: companion\ncreature: "[[Lupo]]"\nhp: 5/11\nHP: 7/11\n---\n');
        expect(await ok("change", "Zanna", "hp", "--by=2")).toBe("Zanna: HP 7/11 → 9/11.");
        expect(JSON.parse(await ok("show", "Zanna", "--json")).fields).toMatchObject({ hp: "5/11", HP: "9/11" });

        writeFileSync(join(folder, "world", "characters", "Zanna.md"), '---\nrole: companion\ncreature: "[[Lupo]]"\nhp: 5/11\nHP:\n---\n');
        expect(await ok("validate")).toBe("No problems.");
        expect(await ok("change", "Zanna", "hp", "--by=6")).toBe("Zanna: hp 5/11 → 11/11: at max; again as Lupo.");
    });

    it("writes a fixed field only as written, never on one written in another case", async () => {
        writeFileSync(join(folder, "world", "characters", "Varro.md"), "---\nrole: npc\nStatus: dead\nstatus: alive\n---\n");
        expect((await rpg("write", "Varro", "--unset", "STATUS")).output).toBe('Varro has no field "STATUS" to remove.');
        writeFileSync(join(folder, "world", "characters", "Varro.md"), "---\nrole: npc\nStatus: dead\n---\n");
        await ok("write", "Varro", "--set", "status=alive");
        expect(readFileSync(join(folder, "world", "characters", "Varro.md"), "utf8")).toBe("---\nrole: npc\nStatus: dead\nstatus: alive\n---\n");
        await ok("write", "Varro", "--unset", "Status");
        expect(readFileSync(join(folder, "world", "characters", "Varro.md"), "utf8")).toBe("---\nrole: npc\nstatus: alive\n---\n");
    });

    it("keeps on a copy only what differs from its creature, and reads a creature written without brackets", async () => {
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Lupo");
        expect(await ok("write", "Lupo 1", "--set", "fiuto=3")).toBe("Updated Lupo 1 (copy of [[Lupo]] in the open scene): set fiuto.");
        await ok("write", "Lupo", "--text", "Un lupo grigio, magro.");
        expect(await ok("write", "Lupo 1", "--set", "hp=11/11")).toBe("Nothing changed on Lupo 1: it already reads like that.");
        expect((await rpg("write", "Lupo 1", "--add", "fiuto=forte")).output).toBe("fiuto on Lupo 1 is 3, not a list: items cannot be added to it or removed from it. To make it a list, set it whole, such as set fiuto=[a, b].");

        writeFileSync(join(folder, "state.yaml"), readFileSync(join(folder, "state.yaml"), "utf8").replace('creature: "[[Lupo]]"', "creature: Lupo"));
        expect((await rpg("change", "Lupo", "hp", "--by=-1")).output).toContain("Lupo has copies in the open scene");
        expect(await ok("change", "Lupo 1", "hp", "--by=-1")).toBe("Lupo 1: hp 11/11 → 10/11.");
    });

    it("says where a value that is not a list comes from", async () => {
        await ok("write", "Lupo", "--set", "attacchi=morso");
        expect((await rpg("write", "Zanna", "--add", "attacchi=coda")).output).toBe(
            'attacchi on Zanna is "morso", which Zanna reads from Lupo, not a list: items cannot be added to it or removed from it. To make it a list, set it whole, such as set attacchi=[a, b].',
        );
    });

    it("follows a chain of thousands of pages at the cost of its length (INH-16)", () => {
        const pages: Page[] = Array.from({ length: 6000 }, (_, index) => ({
            name: `Bestia ${index}`,
            type: "creature",
            path: `world/creatures/Bestia ${index}.md`,
            fields: { hp: `${index}/${index}`, ...(index % 3 === 0 ? {} : { creature: `[[Bestia ${index - 1}]]` }) },
            body: "",
        }));
        const world = { root: folder, pages, problems: [] };
        const start = performance.now();
        const read = pages.map((page) => inheritedFields(world, page));
        expect(performance.now() - start).toBeLessThan(1500);
        expect(read[5]).toEqual({ hp: "5/5", creature: "[[Bestia 4]]" });
        expect(baseChain(world, pages[5]).map((page) => page.name)).toEqual(["Bestia 4", "Bestia 3"]);
    });
});

describe("pages that hold only their differences (D-125)", () => {
    beforeEach(async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11", "--set", "ac=13", "--set", "fiuto=2", "--text", "Un lupo grigio.");
        await ok("write", "Gufo", "--type", "creature", "--set", "hp=1/1", "--set", "ac=11");
    });

    it("does not write a value equal to the base's, even when the page is created, and takes off one that becomes equal", async () => {
        expect(await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]", "--set", "ac=13", "--set", "fiuto=3")).toBe(
            "Created Zanna (character, world/characters/Zanna.md): set role, creature, fiuto; ac as Lupo.",
        );
        expect(readFileSync(join(folder, "world", "characters", "Zanna.md"), "utf8")).toBe('---\nrole: companion\ncreature: "[[Lupo]]"\nfiuto: 3\n---\n');
        expect(await ok("write", "Zanna", "--set", "fiuto=2", "--set", "ac=12")).toBe("Updated Zanna (character, world/characters/Zanna.md): set ac; fiuto again as Lupo.");
        expect(readFileSync(join(folder, "world", "characters", "Zanna.md"), "utf8")).toBe('---\nrole: companion\ncreature: "[[Lupo]]"\nac: 12\n---\n');
    });

    it("names the values a page keeps when its creature changes, and the public lines of a companion whose counter a base changes", async () => {
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]", "--set", "ac=12");
        await ok("change", "Zanna", "hp", "--by=-10");
        expect(await ok("write", "Zanna", "--set", "creature=[[Gufo]]")).toBe(
            "Updated Zanna (character, world/characters/Zanna.md): set creature.\nZanna keeps its own ac 12 (Gufo gives 11), hp 1/11 (Gufo gives 1/1). If they came from its old creature: unset ac, change hp to 1/1.",
        );

        await ok("write", "Lupo alfa", "--type", "creature", "--set", "creature=[[Lupo]]");
        await ok("write", "Ombra", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo alfa]]");
        expect(await ok("write", "Lupo alfa", "--set", "creature=[[Gufo]]")).toBe(
            "Updated Lupo alfa (creature, world/creatures/Lupo alfa.md): set creature.\nChanged with it, since they derive from Lupo alfa: Ombra. To change only one of them, write that page instead.",
        );
        const [hp] = readLogFile(folder).slice(-1);
        expect(hp).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Ombra", field: "hp", before: "11/11", after: "1/1" } });
        // ac is a number of the system 5e, never counted (SYS-8): no line for it.
        expect(readLogFile(folder).some((entry) => entry.type === "counter-changed" && (entry.data as { field?: string; }).field === "ac")).toBe(false);
    });

    it("keeps on a copy only what differs from its creature", async () => {
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Lupo");
        await ok("write", "Lupo 1", "--set", "fiuto=4");
        expect(await ok("write", "Lupo 1", "--set", "fiuto=2")).toBe("Updated Lupo 1 (copy of [[Lupo]] in the open scene): fiuto again as Lupo.");
        expect(stateFile()).toContain('  with: []\n  copies:\n    Lupo 1:\n      creature: "[[Lupo]]"\n');
        expect(stateFile()).not.toContain("fiuto");
    });
});

describe("pages that derive from a creature, after the third review", () => {
    beforeEach(async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "hp=11/11", "--set", "fiuto=debole", "--text", "Un lupo grigio.");
        await ok("write", "Lupo#Debolezza", "--secret", "--text", "Teme il fuoco.");
        await ok("write", "Orso", "--type", "creature", "--set", "hp=30/30", "--set", "fiuto=forte");
        await ok("write", "Orso#Debolezza", "--secret", "--text", "Ama il miele.");
    });

    it("writes a part the page will show from the creature given in the same write, and adds to an inherited introduction", async () => {
        await ok("write", "Pallido#Debolezza", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]", "--text", "Teme il sole.");
        expect(readFileSync(join(folder, "world", "characters", "Pallido.md"), "utf8")).toContain("> [!secret] Debolezza\n> Teme il sole.\n");
        await ok("write", "Bianco", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]");
        await ok("write", "Bianco#Debolezza", "--set", "creature=[[Orso]]", "--append", "--text", "E le api.");
        expect(readFileSync(join(folder, "world", "characters", "Bianco.md"), "utf8")).toContain("> [!secret] Debolezza\n> Ama il miele.\n>\n> E le api.\n");

        expect(await ok("write", "Bianco", "--append", "--text", "Ha una cicatrice.")).toBe("Updated Bianco (character, world/characters/Bianco.md): added to the introduction.");
        expect(readFileSync(join(folder, "world", "characters", "Bianco.md"), "utf8")).toContain("> E le api.\n\nHa una cicatrice.\n");
        await ok("write", "Nero", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]");
        await ok("write", "Nero", "--append", "--text", "Ha una cicatrice.");
        expect(readFileSync(join(folder, "world", "characters", "Nero.md"), "utf8")).toBe('---\nrole: npc\ncreature: "[[Lupo]]"\n---\n\nUn lupo grigio.\n\nHa una cicatrice.\n');
    });

    it("logs the counters of a companion whose creature changes, and takes off the values the new creature gives all the same", async () => {
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]", "--set", "fiuto=forte");
        expect(await ok("write", "Zanna", "--set", "creature=[[Orso]]")).toBe("Updated Zanna (character, world/characters/Zanna.md): set creature; fiuto again as Orso.");
        expect(readFileSync(join(folder, "world", "characters", "Zanna.md"), "utf8")).toBe('---\nrole: companion\ncreature: "[[Orso]]"\n---\n');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Zanna", field: "hp", before: "11/11", after: "30/30" } });
    });

    it("takes every spelling of a counter off when change brings it back to the base's value", async () => {
        writeFileSync(join(folder, "world", "characters", "Bruno.md"), '---\nrole: npc\ncreature: "[[Lupo]]"\nhp: 5/11\nHP: 7/11\n---\n');
        expect(await ok("change", "Bruno", "hp", "--by=4")).toBe("Bruno: HP 7/11 → 11/11: at max; again as Lupo.");
        expect(readFileSync(join(folder, "world", "characters", "Bruno.md"), "utf8")).toBe('---\nrole: npc\ncreature: "[[Lupo]]"\n---\n');
        expect(await ok("validate")).toBe("No problems.");
    });

    it("says when a page is created with a name that creatures give as their creature, though it is not one", async () => {
        await ok("write", "Spettro", "--type", "creature", "--set", "creature=[[Ombra]]");
        expect(await ok("write", "Ombra", "--type", "item")).toBe(
            "Created Ombra (item, world/items/Ombra.md).\nSpettro name Ombra as their creature, but it is an item: they derive from nothing until creature links to a creature.",
        );
    });

    it("lists the pages that show the introduction of a base, not those with one of their own", async () => {
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo]]");
        await ok("write", "Grigio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]", "--text", "Un lupo vecchio.");
        expect(await ok("write", "Lupo", "--text", "Un lupo nero.")).toBe(
            "Updated Lupo (creature, world/creatures/Lupo.md): wrote the introduction.\nChanged with it, since they read the introduction from Lupo: Zanna. To change only one of them, write that page instead.",
        );
    });

    it("names only the pages that keep their own value where the change would reach them", async () => {
        await ok("write", "Lupo alfa", "--type", "creature", "--set", "creature=[[Lupo]]", "--set", "fiuto=fine");
        await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo alfa]]", "--set", "fiuto=ottimo");
        await ok("write", "Grigio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]", "--set", "fiuto=nessuno");
        expect(await ok("write", "Lupo", "--set", "fiuto=medio")).toBe(
            "Updated Lupo (creature, world/creatures/Lupo.md): set fiuto.\nNot changed, since they hold their own fiuto: Grigio (fiuto nessuno), Lupo alfa (fiuto fine).",
        );
    });

    it("gives the creature of a copy written by hand without brackets as a link", async () => {
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Lupo");
        writeFileSync(join(folder, "state.yaml"), readFileSync(join(folder, "state.yaml"), "utf8").replace('creature: "[[Lupo]]"', "creature: Lupo"));
        expect((await rpg("write", "Lupo 1#Nota", "--text", "Zoppica.")).output).toContain("write Lupo 1 as a character with creature=[[Lupo]] and those values");
        expect(await ok("write", "Lupo 1", "--set", "zoppo=true")).toBe("Updated Lupo 1 (copy of [[Lupo]] in the open scene): set zoppo.");
        expect(await ok("show", "Lupo 1")).toContain('Lupo 1 (copy of [[Lupo]] in the open scene "Bosco") · state.yaml');
    });
});
