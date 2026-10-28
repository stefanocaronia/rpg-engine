// rename (D-417): a page takes a new name, its file moves and every link to it follows, the open scene too; the old name stays among its aliases.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { FileStore } from "../src/core/store.ts";
import { renamedLinks } from "../src/pages/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--add", "knows=[[Lupa]]", "--text", "Una cacciatrice, sempre con [[lupa|la sua lupa]].");
    await ok("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Bog Hound]]", "--text", "Una lupa grigia.");
    await ok("write", "Lupa#Morso", "--text", "Morde alle caviglie.");
    await ok("write", "Guado", "--type", "place", "--add", "contains=[[Kira]]", "--add", "contains=[[Lupa]]", "--text", "Qui [[Lupa#Morso]] ha fermato un ladro.");
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

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

describe("rename (D-417)", () => {
    it("moves the page and renames every link to it, with its section and its words, keeping the old name among its aliases", async () => {
        expect(await ok("rename", "Lupa", "Neve")).toBe(
            "Renamed Lupa to Neve (world/characters/Neve.md). Links renamed in Kira, Guado. Lupa stays among its aliases, so that what keeps the old name still finds it.",
        );
        expect(existsSync(join(folder, "world", "characters", "Lupa.md"))).toBe(false);
        expect(page("characters/Neve.md")).toContain("aliases:\n  - Lupa");
        expect(page("characters/Neve.md")).toContain("Una lupa grigia.");
        expect(page("characters/Kira.md")).toContain("[[Neve]]");
        expect(page("characters/Kira.md")).toContain("[[Neve|la sua lupa]]");
        expect(page("places/Guado.md")).toContain("[[Neve#Morso]]");
        expect(page("places/Guado.md")).not.toContain("Lupa");
        // The old name still finds the page, as the log keeps it.
        expect(JSON.parse(await ok("view", "Lupa", "--json")).title).toBe("Neve (character)");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "page-renamed", visibility: "public", data: { from: "Lupa", to: "Neve" } });
    });

    it("renames in the open scene too: who is in it, the order and the turn, who is hostile, what the character sees", async () => {
        await ok("write", "Brigante", "--type", "character", "--text", "Un brigante.");
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--place", "Guado", "--with", "Kira", "--with", "Lupa", "--with", "Brigante", "--seen", "Brigante=uomo col coltello");
        await ok("scene", "order", "--order", "Lupa", "--order", "Kira", "--order", "Brigante");
        await ok("scene", "hostile", "--who", "Brigante");
        await ok("rename", "Brigante", "Sandro");
        await ok("rename", "Lupa", "Neve");
        const state = readFileSync(join(folder, "state.yaml"), "utf8");
        expect(state).toContain("[[Neve]]");
        expect(state).toContain("[[Sandro]]");
        expect(state).not.toMatch(/Lupa|Brigante/);
        expect(await ok("scene", "next")).toContain("now Kira");
        expect(await ok("scene", "calm", "--who", "Sandro")).toBe("Calm: Sandro. No one is hostile now.");
    });

    it("refuses a name another page has, a page of the game system, a copy of the open scene and a name that cannot be a file, changing nothing", async () => {
        await ok("write", "Neve", "--type", "character", "--text", "Una bambina.");
        expect((await rpg("rename", "Lupa", "neve")).output).toBe("Neve is already a page: give Lupa a name no page has. Nothing changed.");
        expect((await rpg("rename", "Lupa", "Bog Hound")).output).toBe("Bog Hound is already a page of the game system fake: give Lupa a name no page has. Nothing changed.");
        expect((await rpg("rename", "Bog Hound", "Lupo")).output).toBe("Bog Hound is a page of the game system fake: read-only, it keeps its name. Nothing changed.");
        expect((await rpg("rename", "Lupa", "Lupa: la grigia")).output).toContain('"Lupa: la grigia" cannot be a page name.');
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--place", "Guado", "--creatures", "Bog Hound=1");
        expect((await rpg("rename", "Lupa", "Bog Hound 1")).output).toBe("Bog Hound 1 is a copy in the open scene: give Lupa another name, or close the scene first. Nothing changed.");
        expect(readdirSync(join(folder, "world", "characters")).sort()).toEqual(["Kira.md", "Lupa.md", "Neve.md"]);
    });

    it("changes the case of a name alone, on any disk", async () => {
        await ok("write", "neve", "--type", "character", "--text", "Una bambina.");
        await ok("write", "Kira", "--add", "knows=[[neve]]");
        expect(await ok("rename", "neve", "Neve")).toContain("Renamed neve to Neve (world/characters/Neve.md).");
        expect(readdirSync(join(folder, "world", "characters"))).toContain("Neve.md");
        expect(page("characters/Neve.md")).toContain("Una bambina.");
        expect(page("characters/Neve.md")).not.toContain("aliases");
    });

    it("says nothing of aliases when only the case changes", async () => {
        expect(await ok("rename", "Lupa", "LUPA")).toBe("Renamed Lupa to LUPA (world/characters/LUPA.md). Links renamed in Kira, Guado.");
    });

    it("keeps what the player character lived under the old names: someone met, the places of its scenes, its diary", async () => {
        await ok("write", "Varro", "--type", "character", "--text", "Un mugnaio.");
        await ok("write", "Guado", "--add", "contains=[[Varro]]");
        await ok("scene", "open", "--title", "Al guado", "--type", "social", "--place", "Guado", "--with", "Kira", "--with", "Varro");
        await ok("scene", "close", "--summary", "Kira incontra il mugnaio.");
        await ok("rename", "Varro", "Sandro");
        expect(await ok("view", "Sandro")).toContain("Sandro (character)");
        await ok("rename", "Kira", "Kiara");
        expect(await ok("view", "Sandro")).toContain("Sandro (character)");
        await ok("rename", "Guado", "Guado Vecchio");
        expect(await ok("view", "Guado Vecchio")).toContain("Guado Vecchio (place)");
    });

    it("refuses a name that is an alias of another page, whose links would lead to the renamed one", async () => {
        await ok("write", "Bianca", "--type", "character", "--add", "aliases=Neve", "--text", "Una bambina detta Neve.");
        expect((await rpg("rename", "Lupa", "Neve")).output).toBe(
            "Neve is an alias of Bianca, whose links would lead to Lupa: give Lupa another name, or first take Neve out of the aliases of Bianca with write Bianca --remove aliases=Neve. Nothing changed.",
        );
        expect(readdirSync(join(folder, "world", "characters")).sort()).toEqual(["Bianca.md", "Kira.md", "Lupa.md"]);
    });

    it("refuses a name that would leave a frontmatter written by hand unreadable, writing nothing", async () => {
        writeFileSync(join(folder, "world", "places", "Bosco.md"), "---\nnotes: '[[Lupa]] corre'\n---\nUn bosco.\n");
        expect((await rpg("rename", "Lupa", "L'Aquila")).output).toBe(
            "Renaming Lupa to L'Aquila would leave the frontmatter of world/places/Bosco.md unreadable, as a ' in a link written between '…' quotes: choose a name without ', or rewrite that field of world/places/Bosco.md by hand between \"…\" quotes, then rename again. Nothing changed.",
        );
        expect(existsSync(join(folder, "world", "characters", "Lupa.md"))).toBe(true);
        expect(page("characters/Kira.md")).toContain("[[Lupa]]");
        expect(await ok("rename", "Lupa", "L’Aquila")).toContain("Renamed Lupa to L’Aquila");
    });

    it("adds the old name to aliases written by hand as one text", async () => {
        writeFileSync(join(folder, "world", "characters", "Lupa.md"), "---\n# la lupa di Kira\naliases: Lupetta\n---\nUna lupa grigia.\n");
        await ok("rename", "Lupa", "Neve");
        expect(page("characters/Neve.md")).toBe("---\n# la lupa di Kira\naliases:\n  - Lupetta\n  - Lupa\n---\n\nUna lupa grigia.\n");
        expect(existsSync(join(folder, "world", "characters", "Lupa.md"))).toBe(false);
        expect(await ok("show", "Lupetta")).toContain("Neve (character)");
    });

    it("writes the new page first and removes the old one last: a rename stopped half way is finished by calling it again", async () => {
        class FailingStore extends FileStore
        {
            override write(path: string, text: string): void
            {
                if (path.endsWith("Guado.md")) {
                    throw new Error("EPERM: operation not permitted");
                }

                super.write(path, text);
            }
        }

        const failing = await runCommandLine(["rename", "Lupa", "Neve"], { ...context, files: new FailingStore(context.systemFolders) });
        expect(failing.output).toBe(
            "Lupa was renamed only in part (EPERM: operation not permitted). Fix what stopped it, such as a file read-only or open in another program, then call rename Lupa Neve again to finish.",
        );
        expect(readdirSync(join(folder, "world", "characters")).sort()).toEqual(["Kira.md", "Lupa.md", "Neve.md"]);
        expect(await ok("rename", "Lupa", "Neve")).toContain("Renamed Lupa to Neve");
        expect(readdirSync(join(folder, "world", "characters")).sort()).toEqual(["Kira.md", "Neve.md"]);
        expect(page("places/Guado.md")).toContain("[[Neve#Morso]]");
        expect(page("characters/Neve.md")).toContain("aliases:\n  - Lupa\n");
    });

    it("renames one of two pages with the same name by its path, leaving the links to that name to the other", async () => {
        await ok("write", "Varro", "--type", "character", "--text", "Il mugnaio.");
        await ok("write", "Kira", "--add", "knows=[[Varro]]");
        writeFileSync(join(folder, "world", "places", "Varro.md"), "Il mulino di Varro.\n");
        expect((await rpg("validate")).output).toContain('Fix: rename one of them by its path, such as rename "world/places/Varro.md" "a new name"');
        expect(await ok("rename", "world/places/Varro.md", "Mulino di Varro")).toBe(
            "Renamed Varro to Mulino di Varro (world/places/Mulino di Varro.md). Varro stays among its aliases, so that what keeps the old name still finds it. "
                + "The links to Varro, in the pages and in the open scene, stay as they are and lead to world/characters/Varro.md, which keeps that name: write [[Mulino di Varro]] by hand in those meant for this page.",
        );
        expect(page("characters/Kira.md")).toContain("[[Varro]]");
        expect(await ok("show", "Varro")).toContain("Varro (character)");
        expect((await rpg("rename", "world/places/Nessuno", "X")).output).toBe(
            "There is no page at world/places/Nessuno: give the path as validate shows it, such as world/characters/Varro.md, or the page's name. Nothing changed.",
        );
    });

    it("finds a renamed page by its old name in show and in the scene, and reads who is hostile written by hand as one text", async () => {
        await ok("rename", "Lupa", "Neve");
        expect(await ok("show", "Lupa")).toContain("Neve (character)");
        expect(await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--place", "Guado", "--with", "Kira", "--with", "Lupa", "--creatures", "Bog Hound=1")).toContain("In it: Kira");
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).toContain("[[Neve]]");
        const state = readFileSync(join(folder, "state.yaml"), "utf8");
        writeFileSync(join(folder, "state.yaml"), state.replace("  title: Al guado", "  title: Al guado\n  hostile: Bog Hound 1"));
        expect(await ok("scene", "calm", "--who", "Bog Hound 1")).toBe("Calm: Bog Hound 1. No one is hostile now.");
    });
});

describe("the links rename renames (LNK-2)", () => {
    it("renames them in the prose alone, never in code, fenced or inline, nor in a comment", () => {
        const text = ["[[Lupa]] in chiaro", "```", "[[Lupa]]", "```", "%% [[Lupa]] %% e `[[Lupa]]`, poi [[lupa|la lupa]]"].join("\n");
        const { renamed, count } = renamedLinks(text, "Lupa", "Zanna");
        expect(count).toBe(2);
        expect(renamed).toBe(["[[Zanna]] in chiaro", "```", "[[Lupa]]", "```", "%% [[Lupa]] %% e `[[Lupa]]`, poi [[Zanna|la lupa]]"].join("\n"));
    });
});
