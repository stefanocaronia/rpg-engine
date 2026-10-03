import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

// The page format decided with the maintainer: introduction, sections and secrets, lists, standard fields, containers.
let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e"], context);
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

async function shownFields(page: string): Promise<Record<string, unknown>>
{
    return JSON.parse((await rpg("show", page, "--json")).output).fields;
}

describe("introduction, sections and secrets", () => {
    it("writes only the introduction when no section is given", async () => {
        await rpg("write", "Madre Ilde", "--type", "character", "--text", "Badessa.\n\n## Cosa sa\n\nHa visto Varro.");
        await rpg("write", "Madre Ilde", "--text", "Badessa severa ma giusta.");
        await rpg("write", "Madre Ilde", "--append", "--text", "Custodisce la cappella.");
        expect(pageFile("world/characters/Madre Ilde.md")).toBe("Badessa severa ma giusta.\n\nCustodisce la cappella.\n\n## Cosa sa\n\nHa visto Varro.\n");
    });

    it("reads and writes a secret by its name", async () => {
        await rpg("write", "Madre Ilde", "--type", "character", "--text", "Badessa.\n\n> [!secret] Il rogo\n> Ha denunciato Sabina.");
        expect((await rpg("show", "Madre Ilde#il rogo")).output).toBe("Madre Ilde#il rogo (character) · world/characters/Madre Ilde.md\n\n> [!secret] Il rogo\n> Ha denunciato Sabina.");

        await rpg("write", "Madre Ilde#Il rogo", "--text", "Da giovane ha denunciato Sabina.\n\nSe ne pente.");
        await rpg("write", "Madre Ilde#Il rogo", "--append", "--text", "Nessuno lo sa.");
        expect(pageFile("world/characters/Madre Ilde.md")).toBe("Badessa.\n\n> [!secret] Il rogo\n> Da giovane ha denunciato Sabina.\n>\n> Se ne pente.\n>\n> Nessuno lo sa.\n");
        expect((await rpg("show", "Madre Ilde#Il patto")).output).toBe(`Madre Ilde has no section or secret "Il patto". Its secrets are: Il rogo.`);
    });

    it("keeps the names of sections and secrets unique in a page", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "## Il motivo\n\nLa figlia.");
        const result = await rpg("write", "Varro", "--append", "--text", "> [!secret] Il motivo\n> Altro.");
        expect(result.output).toBe(`Varro would have two sections or secrets named "Il motivo": names must be unique in a page. To change that section, write Varro#Il motivo.`);
    });
});

describe("lists", () => {
    it("adds items to a list and removes them, one at a time", async () => {
        await rpg("write", "Elia", "--type", "character", "--add", "knows=[[Mirta]]");
        await rpg("write", "Elia", "--add", "knows=[[Varro]], [[Mirta]]");
        expect(await shownFields("Elia")).toEqual({ knows: ["[[Mirta]]", "[[Varro]]"] });

        await rpg("write", "Elia", "--remove", "knows=[[Mirta]]");
        expect(await shownFields("Elia")).toEqual({ knows: ["[[Varro]]"] });
        expect((await rpg("write", "Elia", "--remove", "knows=[[Rosa]]")).output).toBe(`"knows" does not hold [[Rosa]].`);

        await rpg("write", "Elia", "--set", "nota=testo");
        expect((await rpg("write", "Elia", "--add", "nota=altro")).output).toBe(`"nota" is not a list, so nothing can be added to it.`);
    });

    it("refuses a list inside a list, and says how to write it", async () => {
        const result = await rpg("write", "Elia", "--type", "character", "--set", "knows=[[[Pietro]], [[Rosa]]]");
        expect(result.output).toContain("would be a list inside a list, which a field cannot hold. For a list of links write [[A]], [[B]]");
    });
});

describe("standard fields", () => {
    it("checks the standard fields and leaves the others free", async () => {
        expect((await rpg("write", "Varro", "--type", "character", "--set", "role=boss")).output).toBe(`"role" must be one of: pc, companion, npc.`);
        expect((await rpg("write", "Varro", "--type", "character", "--set", "knows=Mirta")).output).toBe(`"knows" must be a list of links, such as [[A]], [[B]].`);
        expect((await rpg("write", "Salvare i rapiti", "--type", "quest", "--set", "status=aperta")).output).toBe(`"status" must be one of: open, done, failed.`);
        expect((await rpg("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "umore=cupo", "--set", "status=dead")).exitCode).toBe(0);
    });
});

describe("where things are", () => {
    it("climbs the places and inventories that hold a thing", async () => {
        await rpg("write", "Lanterna", "--type", "item");
        await rpg("write", "Laboratorio", "--type", "place", "--add", "contains=[[Lanterna]]");
        await rpg("write", "La cripta", "--type", "place", "--add", "contains=[[Laboratorio]]");
        await rpg("write", "La palude", "--type", "place", "--add", "contains=[[La cripta]]");
        expect((await rpg("show", "Lanterna")).output).toContain("Lanterna (item) · world/items/Lanterna.md\nIs in: Laboratorio › La cripta › La palude");

        await rpg("write", "Diario", "--type", "item");
        await rpg("write", "Elia", "--type", "character", "--add", "inventory=[[Diario]]");
        await rpg("write", "Piazza", "--type", "place", "--add", "contains=[[Elia]]");
        expect((await rpg("show", "Diario")).output).toContain("Is in: Elia › Piazza");
    });

    it("refuses to put a thing in two places", async () => {
        await rpg("write", "Lanterna", "--type", "item");
        await rpg("write", "Laboratorio", "--type", "place", "--add", "contains=[[Lanterna]]");
        expect((await rpg("write", "Elia", "--type", "character", "--add", "inventory=[[Lanterna]]")).output).toBe("Lanterna is already in Laboratorio: a thing can be in one place only. Remove it from Laboratorio first.");

        await rpg("write", "Laboratorio", "--remove", "contains=[[Lanterna]]");
        expect((await rpg("write", "Elia", "--type", "character", "--add", "inventory=[[Lanterna]]")).exitCode).toBe(0);
    });

    it("points out a thing listed in two places by hand", async () => {
        await rpg("write", "Lanterna", "--type", "item");
        writeFileSync(join(folder, "world", "places", "Laboratorio.md"), '---\ncontains: ["[[Lanterna]]"]\n---\n');
        writeFileSync(join(folder, "world", "places", "Cappella.md"), '---\ncontains: ["[[Lanterna]]"]\n---\n');
        expect((await rpg("show", "Lanterna")).output).toContain("Is in: Cappella\nAlso listed in: Laboratorio. A thing can be in one place only: remove it from all but one.");
    });
});
