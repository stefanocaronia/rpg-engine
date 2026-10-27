import { appendFileSync, cpSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { testCampaign } from "../src/testing.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

// The 5e's repository, beside this one (D-506, D-514).
const fifthEdition = fileURLToPath(new URL("../../rpg-engine-5e/", import.meta.url));

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

function writeByHand(path: string, text: string): void
{
    writeFileSync(join(folder, path), text);
}

describe("rpg validate", () => {
    it("finds nothing wrong in a clean campaign", async () => {
        expect((await rpg("validate")).output).toBe("No problems.");
    });

    // The playtest scenarios are of this repository and of the 5e, which the engine no longer brings (D-513 (1)): they are read with the 5e's repository beside
    // this one, through the test kit, and wait for it where it is not, as in CI.
    it.skipIf(!existsSync(join(fifthEdition, "system.yaml"))).each(["01-guadoscuro", "02-cripta-del-culto", "04-tre-settimane"])(
        "finds nothing wrong in the playtest scenario %s of the 5e, prepared with its characters",
        async (scenario) => {
            const campaign = await testCampaign({ system: "5e", systems: [fifthEdition], language: "it" });

            try {
                cpSync(new URL(`../playtests/${scenario}/world`, import.meta.url), join(campaign.folder, "world"), { recursive: true });
                expect((await campaign.run("validate")).output).toBe("No problems.");
            } finally {
                await campaign.close();
            }
        },
    );

    it("finds knows that points to a section everyone can read (D-61)", async () => {
        await rpg("write", "Annegato", "--type", "creature", "--text", "Un corpo gonfio.");
        await rpg("write", "Annegato#La melma", "--text", "Lascia una melma verde.");
        await rpg("write", "Annegato#Da dove vengono", "--secret", "--text", "Dal lago.");
        await rpg("write", "Ennio", "--type", "character", "--add", "knows=[[Annegato#La melma]]", "--add", "knows=[[Annegato#Da dove vengono]]");
        expect((await rpg("validate")).output).toBe([
            "1 problem:",
            "- world/characters/Ennio.md: Ennio knows [[Annegato#La melma]], a section everyone can read: knows lists pages and secrets. Fix: write Ennio, remove knows=[[Annegato#La melma]].",
        ].join("\n"));
    });

    it("finds links to pages, sections or secrets that do not exist, and says how to fix them", async () => {
        await rpg("write", "Rosa", "--type", "character", "--text", "La figlia del mugnaio.");
        await rpg("write", "Lena", "--type", "character", "--add", "knows=[[Rosa#La fuga]]", "--text", "Conosce [[Varro]].");
        expect((await rpg("validate")).output).toBe([
            "2 problems:",
            '- world/characters/Lena.md: knows links to [[Rosa#La fuga]], but Rosa has no section or secret "La fuga". Fix: write Lena, remove knows=[[Rosa#La fuga]].',
            "- world/characters/Lena.md: The text links to [[Varro]], which does not exist. Fix: correct the link in the text of Lena, or create what it points to.",
        ].join("\n"));
    });

    it("finds what was written by hand against the rules", async () => {
        writeByHand("world/quests/Voto.md", "---\nstatus: aperta\n---\n");
        writeByHand("world/items/Lanterna.md", "");
        writeByHand("world/places/Cripta.md", '---\ncontains:\n  - "[[Lanterna]]"\n---\n');
        writeByHand("world/characters/Ennio.md", '---\ninventory:\n  - "[[Lanterna]]"\n---\n\n## Note\n\nUno.\n\n## Note\n\nDue.\n');
        writeByHand("world/characters/Rotto.md", "---\nnome: [aperto\n---\n");
        writeByHand("world/items/ennio.md", "");
        appendFileSync(join(folder, "log.jsonl"), "scritto a mano\n");

        const output = (await rpg("validate")).output;
        expect(output).toContain("6 problems:");
        expect(output).toContain('- world/quests/Voto.md: "status" must be one of: planned, open, done, failed. Fix: write Voto, set status again with an allowed value.');
        expect(output).toContain("- world/items/Lanterna.md: Lanterna is in Ennio and in Cripta; a thing is in one place only. Fix: move Lanterna, to Ennio or wherever it is: it stays there only.");
        expect(output).toContain('- world/characters/Ennio.md: Ennio has two sections or secrets named "Note". Fix: rename one of them by hand, so that Ennio#Note finds one place.');
        expect(output).toContain("- The frontmatter of world/characters/Rotto.md is not valid YAML");
        expect(output).toContain(
            '- world/items/ennio.md: Two pages have the same name: world/characters/Ennio.md and world/items/ennio.md. Fix: rename one of them by its path, such as rename "world/items/ennio.md" "a new name": names must be unique in the campaign.',
        );
        expect(output).toContain("- log.jsonl: line 2 is not valid JSON. Fix: repair or remove that line by hand.");
        expect((await rpg("show", "Ennio")).output).toBe(
            'Two pages have the same name: world/characters/Ennio.md and world/items/ennio.md. Rename one of them by its path, such as rename "world/items/ennio.md" "a new name": names must be unique in the campaign.',
        );
        expect((await rpg("show", "Voto")).exitCode).toBe(0);
    });

    it("gives a fix that works when the entry has a label or a path", async () => {
        writeByHand("world/characters/Lena.md", '---\nknows:\n  - "[[Rosa|la ragazza]]"\n---\n');
        const fix = /write Lena, remove (knows=\[\[[^\]]*\]\])/.exec((await rpg("validate")).output)?.[1];
        expect(fix).toBe("knows=[[Rosa|la ragazza]]");
        expect((await rpg("write", "Lena", "--remove", fix!)).exitCode).toBe(0);
        expect((await rpg("validate")).output).toBe("No problems.");
    });

    it("refuses a list where a standard field holds one value, and an unresolved YAML alias", async () => {
        writeByHand("world/quests/Voto.md", "---\nstatus: [open]\n---\n");
        writeByHand("world/characters/Alias.md", "---\nrole: *nessuno\n---\n");
        const output = (await rpg("validate")).output;
        expect(output).toContain('- world/quests/Voto.md: "status" must be one of: planned, open, done, failed.');
        expect(output).toContain("- The frontmatter of world/characters/Alias.md is not valid YAML; fix it by hand:");
    });

    it("reports each problem of campaign.yaml on its own line, and status counts the problems", async () => {
        writeByHand("world/items/Diario.md", "Vedi [[Lidia]].");
        expect((await rpg("status")).output).toContain("1 problem in the campaign: validate lists them, with how to fix each.");

        writeByHand("campaign.yaml", "name: Guadoscuro\nlanguage: Italiano\nlines: ragni\n");
        const output = (await rpg("validate")).output;
        expect(output).toContain("3 problems:\n- campaign.yaml: language: use a language code such as it, en or pt-BR. Fix: fix campaign.yaml by hand");
        expect(output).toContain("- campaign.yaml: lines: Invalid input: expected array, received string.");
    });
});
