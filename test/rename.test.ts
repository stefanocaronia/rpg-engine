// rename (D-417): a page takes a new name, its file moves and every link to it follows, the open scene too; the old name stays among its aliases.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--add", "knows=[[Lupa]]", "--text", "Una cacciatrice, sempre con [[lupa|la sua lupa]].");
    await ok("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]", "--text", "Una lupa grigia.");
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
        expect((await rpg("rename", "Lupa", "Wolf")).output).toBe("Wolf is already a page of the game system 5e: give Lupa a name no page has. Nothing changed.");
        expect((await rpg("rename", "Wolf", "Lupo")).output).toBe("Wolf is a page of the game system 5e: read-only, it keeps its name. Nothing changed.");
        expect((await rpg("rename", "Lupa", "Lupa: la grigia")).output).toContain('"Lupa: la grigia" cannot be a page name.');
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--place", "Guado", "--creatures", "Wolf=1");
        expect((await rpg("rename", "Lupa", "Wolf 1")).output).toBe("Wolf 1 is a copy in the open scene: give Lupa another name, or close the scene first. Nothing changed.");
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
});
