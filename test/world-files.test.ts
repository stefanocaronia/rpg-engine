import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

// Pages written by hand or by other tools, and texts that are easy to get wrong.
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

function handWrite(path: string, text: string): void
{
    writeFileSync(join(folder, path), text);
}

function pageFile(path: string): string
{
    return readFileSync(join(folder, path), "utf8");
}

async function shownFields(page: string): Promise<Record<string, unknown>>
{
    return JSON.parse((await rpg("show", page, "--json")).output).fields;
}

describe("page files", () => {
    it("keeps a text that starts with --- as text", async () => {
        // On a command line, a value that starts with a dash goes after =.
        expect((await rpg("write", "Diario", "--type", "topic", "--text=---\n\nA\n\n---\n\nB")).exitCode).toBe(0);
        expect(pageFile("world/topics/Diario.md")).toBe("---\n---\n\n---\n\nA\n\n---\n\nB\n");
        expect((await rpg("show", "Diario")).output).toBe("Diario (topic) · world/topics/Diario.md\n\n---\n\nA\n\n---\n\nB");
        expect((await rpg("write", "Diario", "--set", "stato=aperta")).exitCode).toBe(0);
        expect(pageFile("world/topics/Diario.md")).toBe("---\nstato: aperta\n---\n\n---\n\nA\n\n---\n\nB\n");
    });

    it("reads .MD files, a BOM, CRLF line ends and names with decomposed accents", async () => {
        handWrite("world/characters/Mercante.MD", "Vende spezie.\n");
        handWrite("world/places/Torre.md", "﻿---\r\naltezza: 30\r\n---\r\nUna torre.\r\nAlta.\r\n");
        handWrite("world/places/Città.md", "Una città.\n");

        expect((await rpg("write", "Mercante", "--type", "character", "--set", "eta=40")).output).toContain("Updated Mercante");
        expect(await shownFields("Torre")).toEqual({ altezza: 30 });
        expect((await rpg("show", "Torre")).output).toContain("Una torre.\nAlta.");
        expect((await rpg("write", "Città", "--set", "abitanti=200")).output).toContain("Updated Città");
    });

    it("keeps long values on one line, and drops the frontmatter with its last field", async () => {
        const note = "Un alchimista che ha perso la figlia per la febbre e che da allora non dorme più, studia e prepara il rituale.";
        await rpg("write", "Varro", "--type", "character", "--set", `nota=${note}`, "--set", "ruolo=png");
        expect(pageFile("world/characters/Varro.md")).toBe(`---\nnota: ${note}\nruolo: png\n---\n`);

        handWrite("world/characters/Lena.md", "---\n# da rivedere\nruolo: compagna\n---\nApprendista.\n");
        await rpg("write", "Lena", "--unset", "ruolo");
        expect(pageFile("world/characters/Lena.md")).toBe("Apprendista.\n");
    });

    it("takes field names in any language", async () => {
        await rpg("write", "Varro", "--type", "character", "--set", "età=52");
        expect(await shownFields("Varro")).toEqual({ età: 52 });
    });

    it("leaves out a broken page, says why, and keeps working with the others", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "Un alchimista.");
        handWrite("world/items/Rotto.md", "---\nchiave: [aperta\n---\nTesto.\n");

        const found = await rpg("find");
        expect(found.output).toContain("Varro (character)\n\nThese files could not be read as pages and were left out:\n- The frontmatter of world/items/Rotto.md is not valid YAML; fix it by hand:");
        expect((await rpg("write", "Rotto", "--type", "item", "--text", "x")).output).toContain("world/items/Rotto.md already exists, but it cannot be read as a page");
    });
});

describe("sections", () => {
    it("writes a section's own text and keeps its subsections", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "## Il motivo\n\nLa figlia.\n\n### Dettagli\n\nLa febbre.");
        await rpg("write", "Varro#Il motivo", "--append", "--text", "Non si fermerà.");
        expect(pageFile("world/characters/Varro.md")).toBe("## Il motivo\n\nLa figlia.\n\nNon si fermerà.\n\n### Dettagli\n\nLa febbre.\n");

        await rpg("write", "Varro#Il motivo", "--text", "Il lutto.");
        expect((await rpg("show", "Varro#Il motivo")).output).toContain("## Il motivo\n\nIl lutto.\n\n### Dettagli\n\nLa febbre.");
    });

    it("adds a new section at the page's top heading level", async () => {
        await rpg("write", "Torre", "--type", "place", "--text", "# Storia\n\nAntica.");
        await rpg("write", "Torre#Oggi", "--text", "Rovine.");
        expect(pageFile("world/places/Torre.md")).toBe("# Storia\n\nAntica.\n\n# Oggi\n\nRovine.\n");
    });

    it("ignores headings in code blocks fenced with ~~~", async () => {
        await rpg("write", "Torre", "--type", "place", "--text", "~~~\n# non è un titolo\n~~~");
        expect((await rpg("show", "Torre#non è un titolo")).output).toBe(`Torre has no section or secret "non è un titolo". It has no sections or secrets.`);
    });

    it("asks for a section title when it is empty", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "Un alchimista.");
        expect((await rpg("write", "Varro#", "--text", "x")).output).toBe("Give the title of the section, or leave the section out to write the introduction.");
        expect((await rpg("write", "Varro", "--section", "", "--text", "x")).output).toBe("Give the title of the section, or leave the section out to write the introduction.");
        expect((await rpg("show", "Varro#")).output).toBe("Give the title of the section after #, or leave out the # to see the whole page.");
    });
});

describe("links", () => {
    it("finds links written as paths, with .md or with an escaped label, but not those in code blocks", async () => {
        await rpg("write", "Varro", "--type", "character", "--text", "Un alchimista.");
        await rpg("write", "Lena", "--type", "character", "--set", "fonte=[[world/characters/Varro.md]]", "--text", "| chi | link |\n|---|---|\n| lui | [[Varro\\|l'alchimista]] |");
        await rpg("write", "Codice", "--type", "item", "--text", "```\n[[Varro]]\n```");
        expect((await rpg("show", "Varro")).output).toContain("Linked from:\n- Lena: fonte, text");
        expect((await rpg("show", "Varro")).output).not.toContain("Codice");
    });
});

describe("names and options", () => {
    it("refuses names with line breaks or too long, with a reason", async () => {
        expect((await rpg("write", "Va\nrro", "--type", "character")).output).toContain("cannot be a page name");
        expect((await rpg("write", "x".repeat(121), "--type", "character")).output).toContain("at most 120 characters");
    });

    it("shows the usage when an argument is missing, and refuses an option given twice", async () => {
        expect((await rpg("show")).output).toContain("Usage: rpg show <page> [options]");
        expect((await rpg("write", "Varro", "--type", "character", "--text", "a", "--text", "b")).output).toBe("Give --text only once.");
    });
});
