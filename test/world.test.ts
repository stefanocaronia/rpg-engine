import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { readFieldValue } from "../src/pages/index.ts";
import { makeTempFolder, readLogFile, removeFolder, systemPageCount, testContext } from "./support.ts";

// The pages come from the test adventure, "La nebbia di Guadoscuro".
let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

function pageFile(path: string): string
{
    return readFileSync(join(folder, path), "utf8");
}

describe("rpg write", () => {
    it("creates a page in the folder of its type, with fields and text", async () => {
        const result = await rpg("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "location=[[La cripta]]", "--text", "Un alchimista che vuole riavere la figlia.");
        expect(result.output).toBe("Created Varro (character, world/characters/Varro.md): set role, location; wrote the introduction.");
        expect(pageFile("world/characters/Varro.md")).toBe(`---\nrole: npc\nlocation: "[[La cripta]]"\n---\n\nUn alchimista che vuole riavere la figlia.\n`);
    });

    it("adds to the text, and writes, replaces and extends one section", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "Un alchimista.");
        await rpg("write", "Varro", "--append", "--text", "Vive nella cripta.");
        await rpg("write", "Varro#Il motivo", "--text", "Vuole riavere la figlia.");
        await rpg("write", "Varro", "--section", "il motivo", "--text", "Ha perso la figlia per la febbre.");
        await rpg("write", "Varro#Il motivo", "--append", "--text", "Non si fermerà.");
        await rpg("write", "Varro#I piani", "--text", "Il rituale alla luna nuova.");
        await rpg("write", "Varro#Il motivo", "--text", "La febbre.");
        expect(pageFile("world/characters/Varro.md")).toBe("Un alchimista.\n\nVive nella cripta.\n\n## Il motivo\n\nLa febbre.\n\n## I piani\n\nIl rituale alla luna nuova.\n");
        expect((await rpg("show", "Varro#Il motivo")).output).toBe("Varro#Il motivo (character) · world/characters/Varro.md\n\n## Il motivo\n\nLa febbre.");
        expect((await rpg("show", "Varro#Il nome")).output).toBe(`Varro has no section or secret "Il nome". Its sections are: Il motivo, I piani.`);
    });

    it("keeps what was written by hand when it changes a field", async () => {
        writeFileSync(join(folder, "world", "places", "Il mulino.md"), "---\n# aperta o chiusa, da sinistra\nchiuse: [chiusa, chiusa, chiusa]\nstato: abbandonato\n---\nUn mulino sul fiume.\n\n```\n# non è un titolo\n```\n");
        await rpg("write", "Il mulino", "--set", "stato=in rovina");
        expect(pageFile("world/places/Il mulino.md")).toBe("---\n# aperta o chiusa, da sinistra\nchiuse: [chiusa, chiusa, chiusa]\nstato: in rovina\n---\n\nUn mulino sul fiume.\n\n```\n# non è un titolo\n```\n");
        expect((await rpg("show", "Il mulino#non è un titolo")).output).toBe(`Il mulino has no section or secret "non è un titolo". It has no sections or secrets.`);
    });

    it("links pages, and shows who links to a page", async () => {
        await rpg("write", "Varro", "--type", "character", "--set", "role=npc");
        await rpg("write", "Lena", "--type", "character", "--set", "knows=[[Varro]], [[Il mulino#Le chiuse]]");
        await rpg("write", "Il mulino", "--type", "place", "--text", "Di notte ci passa [[Varro|l'alchimista]].");
        expect((await rpg("show", "Lena")).output).toBe(`Lena (character) · world/characters/Lena.md\n\n---\nknows:\n  - "[[Varro]]"\n  - "[[Il mulino#Le chiuse]]"\n---`);
        expect((await rpg("show", "Varro")).output).toBe("Varro (character) · world/characters/Varro.md\n\n---\nrole: npc\n---\n\nLinked from:\n- Lena: knows\n- Il mulino: text");
        expect((await rpg("show", "[[il mulino]]")).output).toContain("Linked from:\n- Lena: knows");
    });

    it("keeps whatever fields a game needs", async () => {
        await rpg("write", "Kira", "--type", "character", "--set", "edge=1", "--set", "iron=3", "--set", "momentum=2", "--set", "health=5", "--set", "vows=[Trovare la cripta, Salvare i rapiti]");
        const shown = JSON.parse((await rpg("show", "Kira", "--json")).output);
        expect(shown.fields).toEqual({ edge: 1, iron: 3, momentum: 2, health: 5, vows: ["Trovare la cripta", "Salvare i rapiti"] });
    });

    it("removes fields, and says why it cannot write", async () => {
        await rpg("write", "Varro", "--type", "character", "--set", "role=npc");
        expect((await rpg("write", "Varro", "--unset", "role")).output).toBe("Updated Varro (character, world/characters/Varro.md): removed role.");

        const refusals: [string[], string][] = [
            [["write", "Varro", "--unset", "role"], `Varro has no field "role" to remove.`],
            [["write", "Nessuno", "--set", "role=npc"], "There is no page named Nessuno. To create it, give its type: character, place, faction, quest, item, event, topic, creature."],
            [["write", "Va/rro", "--type", "character"], `"Va/rro" cannot be a page name.`],
            [["write", "Varro"], "Nothing to write on Varro: give fields to set, add or remove, or text."],
            [["write", "Varro", "--set", "role"], `Write a field as field=value, not "role". To remove a field, use unset.`],
            [["write", "Varro", "--set", "1st=x"], `"1st" cannot be a field name`],
            [["write", "Varro", "--section", "I piani"], "Give the text to write."],
            [["write", "Varro#I piani", "--section", "I piani", "--text", "x"], "Give the section either in the page name (Page#Section) or as section, not both."],
            [["show", "Nessuno"], "There is no page named Nessuno. Look for it with the find command."],
        ];

        for (const [args, message] of refusals) {
            const result = await rpg(...args);
            expect(result.exitCode, args.join(" ")).toBe(1);
            expect(result.output, args.join(" ")).toContain(message);
        }
    });

    it("logs everything a write changes, text included, as hidden lines", async () => {
        await rpg("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Un alchimista.");
        await rpg("write", "Varro#Il motivo", "--append", "--text", "La figlia.");
        expect(readLogFile(folder).slice(1)).toEqual([
            { id: "id2", at: "2026-10-02T10:00:00.000Z", type: "page-created", by: "master", visibility: "hidden", data: { page: "Varro", type: "character", set: { role: "npc" }, text: "Un alchimista.", mode: "replace" } },
            { id: "id3", at: "2026-10-02T10:00:00.000Z", type: "page-updated", by: "master", visibility: "hidden", data: { page: "Varro", type: "character", section: "Il motivo", text: "La figlia.", mode: "append" } },
        ]);
    });

    it("writes nothing, and logs nothing, when the page already reads like that", async () => {
        await rpg("write", "Varro", "--type", "character", "--set", "role=npc");
        expect((await rpg("write", "Varro", "--set", "role=npc")).output).toBe("Nothing changed on Varro: it already reads like that.");
        expect(readLogFile(folder).map((entry) => entry.type)).toEqual(["campaign-created", "page-created"]);
    });

    it("explains its options", async () => {
        expect((await rpg("write", "--help")).output).toContain("--set <value>...");
    });
});

describe("rpg find", () => {
    beforeEach(async () => {
        await rpg("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Un alchimista che vuole riavere la figlia.");
        await rpg("write", "Lena", "--type", "character", "--set", "role=companion");
        await rpg("write", "La cripta", "--type", "place", "--text", "Sotto il mulino.\n\n## Ossario\n\nI servitori di Varro dormono qui.");
    });

    it("finds pages by name, fields and text, ignoring case", async () => {
        expect((await rpg("find", "FIGLIA")).output).toBe("Varro (character): Un alchimista che vuole riavere la figlia.\n\nfind looks for the pages of the system 5e in their names and fields, in English.");
        expect((await rpg("find", "companion")).output).toBe("Lena (character): role: companion\n\nfind looks for the pages of the system 5e in their names and fields, in English.");
        expect((await rpg("find", "varro")).output).toBe("Varro (character)\nLa cripta (place): I servitori di Varro dormono qui.\n\nfind looks for the pages of the system 5e in their names and fields, in English.");
        expect((await rpg("find", "drago")).output).toBe("No page matches.\n\nfind looks for the pages of the system 5e in their names and fields, in English.");
    });

    it("lists the pages of a type, or all of them", async () => {
        expect((await rpg("find", "--type", "place")).output).toBe("La cripta (place)");
        expect((await rpg("find")).output).toBe(`Lena (character)\nVarro (character)\nLa cripta (place)\n\nThe system 5e has ${systemPageCount("5e")} more pages, named in English: give part of a name, in English, to find them.`);
    });
});

describe("pages written by hand", () => {
    it("reads free pages, and stops at a name that two pages share", async () => {
        writeFileSync(join(folder, "world", "La nebbia.md"), "Non si alza da giorni.\n");
        expect((await rpg("show", "la nebbia")).output).toBe("La nebbia (free page) · world/La nebbia.md\n\nNon si alza da giorni.");

        writeFileSync(join(folder, "world", "items", "La nebbia.md"), "");
        expect((await rpg("find")).output).toBe(`La nebbia (free page)\nLa nebbia (item)\n\nThe system 5e has ${systemPageCount("5e")} more pages, named in English: give part of a name, in English, to find them.`);
        expect((await rpg("show", "la nebbia")).output).toBe("Two pages have the same name: world/La nebbia.md and world/items/La nebbia.md. Rename one of them by hand: names must be unique in the campaign.");
        expect((await rpg("write", "La nebbia", "--set", "fitta=true")).exitCode).toBe(1);
    });
});

describe("field values", () => {
    it("reads links, numbers, true and false, lists, maps and text", () => {
        expect(readFieldValue("[[Varro]]")).toBe("[[Varro]]");
        expect(readFieldValue("[[Varro]], [[Lena]]")).toEqual(["[[Varro]]", "[[Lena]]"]);
        expect(readFieldValue("-3")).toBe(-3);
        expect(readFieldValue("2.5")).toBe(2.5);
        expect(readFieldValue("false")).toBe(false);
        expect(readFieldValue("[a, b]")).toEqual(["a", "b"]);
        expect(readFieldValue("{ value: 7, max: 12 }")).toEqual({ value: 7, max: 12 });
        expect(readFieldValue("nella cripta: #2")).toBe("nella cripta: #2");
        expect(readFieldValue("[[Rossi, Mario]], [[Varro]]")).toEqual(["[[Rossi, Mario]]", "[[Varro]]"]);
    });

    it("keeps as plain text what does not read as YAML", () => {
        expect(readFieldValue("[[La cripta]], piano inferiore")).toBe("[[La cripta]], piano inferiore");
        expect(readFieldValue(`"Il Vecchio" disse`)).toBe(`"Il Vecchio" disse`);
        expect(readFieldValue("[a, b")).toBe("[a, b");
    });
});
