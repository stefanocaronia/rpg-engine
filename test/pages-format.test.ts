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
        expect(result.output).toBe(`Varro already has a section or secret named "Il motivo", and names must be unique in a page. To change it, write Varro#Il motivo; for a new one, pick another name.`);
        expect((await rpg("write", "Teo", "--type", "character", "--text", "## Dup\n\nUno.\n\n## Dup\n\nDue.")).output).toBe(`The text names "Dup" twice: give each section or secret of Teo its own name.`);
    });

    it("keeps the secrets inside a text that is written again", async () => {
        await rpg("write", "Bruna", "--type", "character", "--text", "Traghettatrice.");
        await rpg("write", "Bruna#Il debito", "--secret", "--text", "Deve soldi a Varro.");
        await rpg("write", "Bruna", "--text", "Traghettatrice anziana.");
        expect(pageFile("world/characters/Bruna.md")).toBe("Traghettatrice anziana.\n\n> [!secret] Il debito\n> Deve soldi a Varro.\n");

        await rpg("write", "Corvo", "--type", "character", "--text", "## Cosa vuole\n\nOro.");
        await rpg("write", "Corvo#Il tradimento", "--secret", "--text", "Vende la città.");
        await rpg("write", "Corvo#Cosa vuole", "--text", "Oro e potere.");
        expect(pageFile("world/characters/Corvo.md")).toBe("## Cosa vuole\n\nOro e potere.\n\n> [!secret] Il tradimento\n> Vende la città.\n");

        await rpg("write", "Corvo#Cosa vuole", "--text", "Potere.\n\n> [!secret] Il tradimento\n> Vende il porto.");
        expect(pageFile("world/characters/Corvo.md")).toBe("## Cosa vuole\n\nPotere.\n\n> [!secret] Il tradimento\n> Vende il porto.\n");
    });

    it("refuses section names with the secret mark anywhere or with line breaks", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "Alchimista.");
        expect((await rpg("write", "Varro#> [!secret] Piano", "--text", "x")).output).toBe("Give only the secret's name, as Page#Name, and add secret to create it: the [!secret] mark is written for you.");
        expect((await rpg("write", "Varro", "--section", "Piano\nsegreto", "--text", "x")).output).toBe("A section or secret name must be one line: write the name without line breaks.");
    });

    it("tells two secrets apart when nothing separates them", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "> [!secret] Uno\n> Primo.\n> [!secret] Due\n> Secondo.");
        await rpg("write", "Varro#Uno", "--text=");
        expect(pageFile("world/characters/Varro.md")).toBe("> [!secret] Due\n> Secondo.\n");
    });

    it("creates a missing secret as a secret block, and refuses the mark in its name", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "Alchimista.\n\n## Cosa vuole\n\nLa figlia.");
        expect((await rpg("write", "Varro#La cripta", "--secret", "--text", "Si nasconde sotto il mulino.\n\nCon la lanterna.")).output).toBe(`Updated Varro (character, world/characters/Varro.md): wrote "La cripta".`);
        expect(pageFile("world/characters/Varro.md")).toBe("Alchimista.\n\n## Cosa vuole\n\nLa figlia.\n\n> [!secret] La cripta\n> Si nasconde sotto il mulino.\n>\n> Con la lanterna.\n");

        expect((await rpg("write", "Varro#Cosa vuole", "--secret", "--text", "Altro.")).output).toBe(`"Cosa vuole" is a section, not a secret: write it without secret, or give the secret another name.`);
        expect((await rpg("write", "Varro#[!secret] Il piano", "--text", "Altro.")).output).toBe("Give only the secret's name, as Page#Name, and add secret to create it: the [!secret] mark is written for you.");
        expect((await rpg("write", "Varro", "--secret", "--text", "Altro.")).output).toBe("Give the secret's name, as Page#Name, to write a secret.");
    });

    it("removes a section or a secret with empty text", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "Alchimista.\n\n## Cosa vuole\n\nLa figlia.\n\n> [!secret] La cripta\n> Sotto il mulino.\n\n## Il passato\n\nUn maestro.\n\n### Gli studi\n\nA Corvara.");
        expect((await rpg("write", "Varro#La cripta", "--text=")).output).toBe(`Updated Varro (character, world/characters/Varro.md): removed "La cripta".`);
        expect((await rpg("write", "Varro#Cosa vuole", "--text=")).output).toBe(`Updated Varro (character, world/characters/Varro.md): removed "Cosa vuole".`);
        expect(pageFile("world/characters/Varro.md")).toBe("Alchimista.\n\n## Il passato\n\nUn maestro.\n\n### Gli studi\n\nA Corvara.\n");

        expect((await rpg("write", "Varro#Il passato", "--text=")).output).toBe(`"Il passato" has subsections: remove them first, then the section.`);
        expect((await rpg("write", "Varro#Il tesoro", "--text=")).output).toBe(`There is no section or secret "Il tesoro" to remove: show the page to see their names, or give some text to create it.`);
        expect((await rpg("write", "Varro#Gli studi", "--append", "--text=")).output).toBe("Give the text to add. To remove a section or secret, write empty text without append.");
    });

    it("refuses to remove a section that holds a secret", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "## Cosa vuole\n\nLa figlia.\n\n> [!secret] La cripta\n> Sotto il mulino.");
        expect((await rpg("write", "Varro#Cosa vuole", "--text=")).output).toBe(`"Cosa vuole" holds the secret "La cripta": remove or move it first, then the section.`);
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
        expect((await rpg("write", "Elia", "--add", "nota=altro")).output).toBe('nota on Elia is "testo", not a list: items cannot be added to it or removed from it. To make it a list, set it whole, such as set nota=[a, b].');
    });

    it("keeps every item when the same list field comes more than once", async () => {
        await rpg("write", "Elia", "--type", "character", "--add", "knows=[[Varro]]", "--add", "knows=[[Varro#La figlia]]", "--add", "knows=[[Mirta]]");
        expect(await shownFields("Elia")).toEqual({ knows: ["[[Varro]]", "[[Varro#La figlia]]", "[[Mirta]]"] });

        await rpg("write", "Elia", "--remove", "knows=[[Varro]]", "--remove", "knows=[[Mirta]]");
        expect(await shownFields("Elia")).toEqual({ knows: ["[[Varro#La figlia]]"] });
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
        expect((await rpg("write", "Salvare i rapiti", "--type", "quest", "--set", "status=aperta")).output).toBe(`"status" must be one of: planned, open, done, failed.`);
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
