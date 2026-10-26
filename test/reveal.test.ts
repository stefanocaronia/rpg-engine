// What characters learn (MECCANICHE, REV-1–REV-3): the cases of the table through the commands, and laws on runs of reveals made at random.
import fc from "fast-check";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { reveal } from "../src/commands/reveal.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = await campaign();
});

afterEach(() => removeFolder(folder));

/** A campaign with characters, an item with a secret, a section and a secret without a name, and a wolf whose secret a character derived from it shows. */
async function campaign(): Promise<string>
{
    const created = makeTempFolder();
    context = testContext(created);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(created);
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc");
    await ok("write", "Rosa", "--type", "character", "--set", "role=npc", "--set", "aliases=[la figlia]");
    await ok("write", "Coppa", "--type", "item", "--text", "Una coppa d'argento.\n\n> [!secret] Veleno\n> Il veleno è nel fondo.\n\n## Aspetto\n\nAnnerita.\n\n> [!secret]\n> Un segno inciso.");
    await ok("write", "Lupo", "--type", "creature", "--text", "## Tracce\n\nOrme larghe.\n\n> [!secret] Debolezza\n> Teme l'argento.");
    await ok("write", "Bianco", "--type", "character", "--set", "role=npc", "--set", "creature=[[Lupo]]");
    return created;
}

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

async function refused(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

describe("rpg reveal (REV-1–REV-3)", () => {
    it("REV-2, REV-3: records secrets and whole pages in the player character's knows, in one line and without the text", async () => {
        const output = await ok("reveal", "Coppa#veleno", "Varro");
        expect(output).toBe("Ennio now knows Coppa#Veleno, Varro.");
        expect(output).not.toContain("fondo");
        expect(page("characters/Ennio.md")).toContain('knows:\n  - "[[Coppa#Veleno]]"\n  - "[[Varro]]"');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "learned", visibility: "public", data: { page: "Ennio", knows: ["[[Coppa#Veleno]]", "[[Varro]]"] } });
    });

    it("REV-2: for several characters, each knows what they knew already, compared as links however written, and a section everyone can read is skipped", async () => {
        writeFileSync(join(folder, "world", "characters", "Lena.md"), '---\nrole: companion\nknows: ["[[coppa#VELENO]]"]\n---\n');
        expect(await ok("reveal", "Coppa#Veleno", "Coppa#Aspetto", "--to", "Lena", "--to", "Varro")).toBe(
            "Varro now knows Coppa#Veleno. Already known: Lena: Coppa#Veleno. Not secrets, nothing to record: Coppa#Aspetto (whoever knows Coppa knows it).",
        );
        expect(page("characters/Lena.md")).toBe('---\nrole: companion\nknows: ["[[coppa#VELENO]]"]\n---\n');
        expect(readLogFile(folder).filter((entry) => entry.type === "learned").map((entry) => [entry.data.page, entry.visibility])).toEqual([["Varro", "hidden"]]);
        expect(await ok("reveal", "Coppa#Veleno", "--to", "Lena")).toBe("Nothing new to record. Already known: Lena: Coppa#Veleno.");
    });

    it("REV-2: a secret a page shows from its creature is recorded where it is written; pages are found by alias", async () => {
        expect(await ok("reveal", "Bianco#Debolezza", "la figlia")).toBe("Ennio now knows Lupo#Debolezza (as Bianco shows it), Rosa.");
        expect(page("characters/Ennio.md")).toContain('  - "[[Lupo#Debolezza]]"\n  - "[[Rosa]]"');
        expect(await ok("reveal", "Lupo#Debolezza")).toBe("Nothing new to record. Already known: Ennio: Lupo#Debolezza.");
        expect(await ok("reveal", "Bianco#Tracce")).toBe("Nothing new to record. Not secrets, nothing to record: Bianco#Tracce (whoever knows Bianco knows it).");
    });

    it("REV-2: refuses what does not exist, with the secrets there are and how to name one, and writes nothing", async () => {
        expect(await refused("reveal", "Nessuno")).toBe("There is no page named Nessuno: look for it with find. Nothing recorded.");
        expect(await refused("reveal", "Coppa#Antidoto")).toBe(
            'Coppa has no section or secret "Antidoto". Its secrets: Veleno. It has a secret without a name: give it one, as > [!secret] Name, to reveal it. To write a new one, write Coppa#Name with secret and its text. Nothing recorded.',
        );
        expect(await refused("reveal", "Bianco#Tana")).toBe('Bianco has no section or secret "Tana". Its secrets: Debolezza (from Lupo). To write a new one, write Bianco#Name with secret and its text. Nothing recorded.');
        expect(await refused("reveal", "Coppa#")).toBe("Give the secret's name after #, such as Coppa#Name: a secret without a name cannot be revealed until it has one. Nothing recorded.");
        expect(await refused("reveal", "Varro", "Coppa#Antidoto")).toContain('Coppa has no section or secret "Antidoto".');
        expect(page("characters/Ennio.md")).not.toContain("knows");
    });

    it("REV-2: sends the id of a hidden roll to roll", async () => {
        await ok("roll", "1d20", "--hidden");
        const id = readLogFile(folder).at(-1)?.id ?? "";
        expect(await refused("reveal", id)).toBe(`${id} is a hidden roll: show its result with roll, reveal ${id}. Nothing recorded.`);
        expect(await refused("reveal", "Nessuno")).toBe("There is no page named Nessuno: look for it with find. Nothing recorded.");
    });

    it("REV-1, REV-2: only characters learn: refuses a copy, a page of another type, and no player character or many when to is left out", async () => {
        await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--creatures", "Annegato=1");
        expect(await refused("reveal", "Varro", "--to", "Annegato 1")).toBe("Annegato 1 is a copy in the open scene, which keeps nothing of its own: only characters know things. Nothing recorded.");
        expect(await refused("reveal", "Varro", "--to", "Coppa")).toBe("Coppa is an item: only characters know things. Nothing recorded.");
        expect(await refused("reveal", "Varro", "--to", "Nessuno")).toBe("There is no character named Nessuno: look for them with find. Nothing recorded.");
        await ok("write", "Lena", "--set", "role=pc");
        expect(await refused("reveal", "Varro")).toBe("There are 2 player characters, Ennio and Lena: give who learns it with to.");
    });

    it("REV-2: knows written as text stops the reveal before anything is written, for everyone", async () => {
        writeFileSync(join(folder, "world", "characters", "Varro.md"), '---\nrole: npc\nknows: "[[Rosa]]"\n---\n');
        expect(await refused("reveal", "Coppa#Veleno", "--to", "Ennio", "--to", "Varro")).toBe(
            'knows on Varro is "[[Rosa]]", not a list: write it as one first, such as write Varro, set knows=[[A]], [[B]]. Nothing recorded.',
        );
        expect(page("characters/Ennio.md")).not.toContain("knows");
        writeFileSync(join(folder, "world", "characters", "Varro.md"), '---\nrole: npc\nknows: ["[[Rosa]] (forse)"]\n---\n');
        expect(await refused("reveal", "Coppa#Veleno", "--to", "Varro")).toBe(
            'knows on Varro holds "[[Rosa]] (forse)", which is not a link: write the list again first, such as write Varro, set knows=[[Rosa]]. Nothing recorded.',
        );
        writeFileSync(join(folder, "world", "characters", "Varro.md"), '---\nrole: npc\nknows: ["[[Rosa]]", "[[Coppa#Veleno]]"]\n---\n');
        expect(await ok("reveal", "Rosa", "Coppa#Veleno", "--to", "Varro")).toBe("Nothing new to record. Already known: Varro: Rosa, Coppa#Veleno.");
    });

    it("REV-2: takes one text or a list, as MCP sends them, skips blank items and the same character twice, and tells each secret of a page apart", async () => {
        const run = (input: { page: string | string[]; to?: string | string[]; }) => reveal.format(reveal.run(input, context) as never);
        expect(() => reveal.run({ page: [" "] }, context)).toThrow("Give what they learn, such as page Coppa#Veleno, or a whole page such as Varro.");
        expect(run({ page: "Varro", to: "Lena" })).toBe("Lena now knows Varro.");
        expect(run({ page: ["Coppa#Veleno", ""], to: ["Lena", "lena", "[[Lena]]"] })).toBe("Lena now knows Coppa#Veleno.");
        await ok("write", "Coppa#Antidoto", "--secret", "--text", "Latte di capra.");
        writeFileSync(join(folder, "world", "characters", "Varro.md"), '---\nrole: npc\nknows: [42, "[[Coppa#Veleno]]"]\n---\n');
        expect(() => run({ page: "Rosa", to: ["Lena", "Varro"] })).toThrow("knows on Varro holds 42, which is not a link: write the list again first, such as write Varro, set knows=[[Coppa#Veleno]]. Nothing recorded.");
        expect(page("characters/Lena.md")).not.toContain("Rosa");
        await ok("write", "Varro", "--remove", "knows=42");
        expect(run({ page: ["Coppa#Antidoto", "Coppa#Veleno", "Coppa#Aspetto", "Lupo#Tracce", "Rosa"], to: ["Lena", "Varro"] })).toBe(
            "Lena now knows Coppa#Antidoto, Rosa. Varro now knows Coppa#Antidoto, Rosa. Already known: Lena: Coppa#Veleno; Varro: Coppa#Veleno. "
                + "Not secrets, nothing to record: Coppa#Aspetto (whoever knows Coppa knows it), Lupo#Tracce (whoever knows Lupo knows it).",
        );
    });

    it("REV-2: tells a hidden roll from any other line of the log, a page without secrets, and a secret without a name only in a base", async () => {
        await ok("roll", "1d20");
        const shown = readLogFile(folder).at(-1)?.id ?? "";
        expect(await refused("reveal", shown)).toBe(`There is no page named ${shown}: look for it with find. Nothing recorded.`);
        const written = readLogFile(folder).find((entry) => entry.type === "page-created")?.id ?? "";
        expect(await refused("reveal", written)).toBe(`There is no page named ${written}: look for it with find. Nothing recorded.`);
        expect(await refused("reveal", "Varro#Passato")).toBe('Varro has no section or secret "Passato". It has no secrets. To write a new one, write Varro#Name with secret and its text. Nothing recorded.');
        await ok("write", "Lupo", "--append", "--text", "> [!secret]\n> Un branco lo segue.");
        await ok("write", "Lupo#Tana", "--secret", "--text", "Nella grotta.");
        expect(await refused("reveal", "Bianco#Pelo")).toBe(
            'Bianco has no section or secret "Pelo". Its secrets: Debolezza (from Lupo), Tana (from Lupo). It has a secret without a name: give it one, as > [!secret] Name, to reveal it. To write a new one, write Bianco#Name with secret and its text. Nothing recorded.',
        );
    });

    it("REV-2: the player character is the one character with role pc; a free page knows nothing", async () => {
        await ok("write", "Corona", "--type", "item", "--set", "role=pc");
        expect(await ok("reveal", "Varro")).toBe("Ennio now knows Varro.");
        writeFileSync(join(folder, "world", "Nota.md"), "Una nota libera.\n");
        expect(await refused("reveal", "Varro", "--to", "Nota")).toBe("Nota is a free page: only characters know things. Nothing recorded.");
        await ok("write", "Ennio", "--set", "role=npc");
        expect(await refused("reveal", "Varro")).toBe("There is no player's character: give who learns it with to.");
    });

    it("REV-2: on the command line each one who learns comes with its own --to; an empty to is the player character; names with commas ask for a list", async () => {
        expect(await refused("reveal", "Coppa", "--to", "Ennio", "Lena")).toBe(
            "Unexpected argument: Lena. Give the page before the options, and repeat an option for each of its values, such as --to A --to B.",
        );
        expect(page("characters/Ennio.md")).not.toContain("knows");
        expect(reveal.format(await reveal.run({ page: "Varro", to: "" }, context))).toBe("Ennio now knows Varro.");
        expect(reveal.format(await reveal.run({ page: "Rosa", to: [] }, context))).toBe("Ennio now knows Rosa.");
        expect(await refused("reveal", "Varro, Rosa")).toBe("There is no page named Varro, Rosa: for more than one, give a list, such as page [Varro, Rosa]. Nothing recorded.");
        expect(await refused("reveal", "Coppa", "--to", "Ennio, Lena")).toBe("There is no character named Ennio, Lena: for more than one, give a list, such as to [Ennio, Lena]. Nothing recorded.");
    });

    it("REV-3 (D-158): what a companion learns alone stays hidden in the log; what the player's character knows too is public", async () => {
        await ok("reveal", "Coppa#Veleno", "--to", "Lena");
        await ok("reveal", "Varro", "--to", "Ennio", "--to", "Lena");
        await ok("reveal", "Coppa#Veleno", "--to", "Ennio");
        expect(readLogFile(folder).filter((entry) => entry.type === "learned").map((entry) => [entry.data.page, entry.visibility, entry.data.knows])).toEqual([
            ["Lena", "hidden", ["[[Coppa#Veleno]]"]],
            ["Ennio", "public", ["[[Varro]]"]],
            ["Lena", "public", ["[[Varro]]"]],
            ["Ennio", "public", ["[[Coppa#Veleno]]"]],
        ]);
    });

    it("REV-1: validate finds a section everyone can read in knows, by the rule reveal follows", async () => {
        writeFileSync(join(folder, "world", "characters", "Varro.md"), '---\nrole: npc\nknows: ["[[Bianco#Tracce]]", "[[Bianco#Debolezza]]"]\n---\n');
        expect(await ok("validate")).toBe([
            "1 problem:",
            "- world/characters/Varro.md: Varro knows [[Bianco#Tracce]], a section everyone can read: knows lists pages and secrets. Fix: write Varro, remove knows=[[Bianco#Tracce]].",
        ].join("\n"));
    });
});

describe("the laws of reveal, on runs made at random", () => {
    const learnable = ["Coppa#Veleno", "coppa#veleno", "Coppa#Aspetto", "Bianco#Debolezza", "Lupo#Debolezza", "Varro", "la figlia", "Lupo"];
    const learners = ["Ennio", "Lena", "Varro", "Bianco"];
    const reveals = fc.array(fc.record({ what: fc.subarray(learnable, { minLength: 1 }), who: fc.subarray(learners) }), { minLength: 1, maxLength: 4 });

    it("REV-2: knows only grows, holds each link once, and a reveal done again changes nothing", async () => {
        await fc.assert(
            fc.asyncProperty(reveals, async (run) => {
                removeFolder(folder);
                folder = await campaign();

                for (const { what, who } of run) {
                    const before = learners.map((name) => knowsOf(name));
                    const args = ["reveal", ...what, ...who.flatMap((name) => ["--to", name])];
                    await ok(...args);
                    const after = learners.map((name) => knowsOf(name));
                    const files = learners.map((name) => page(`characters/${name}.md`));

                    after.forEach((links, index) => {
                        expect(links.slice(0, before[index].length)).toEqual(before[index]);
                        expect(new Set(links.map((link) => link.toLowerCase())).size).toBe(links.length);
                    });

                    expect(await ok(...args)).toMatch(/^Nothing new to record\./);
                    expect(learners.map((name) => page(`characters/${name}.md`))).toEqual(files);
                }
            }),
            { numRuns: 25 },
        );
    }, 120000);
});

/** The links a character's knows holds, as written. */
function knowsOf(name: string): string[]
{
    const match = /knows:\n((?: {2}- .*\n)+)/.exec(page(`characters/${name}.md`));
    return match === null ? [] : match[1].trim().split("\n").map((line) => line.replace(/^\s*- /, "").replaceAll('"', ""));
}
