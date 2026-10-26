// The pages of the game system (MECCANICHE, SYS-1–SYS-8), on the fake system: found after the campaign's, read-only and in no place, derived from, never
// hidden by a page of the campaign, and the fields it declares never counted unless counters. The same with the 5e's pages is in systems.test.ts, which
// goes with the 5e (D-514, step 8).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { getVersion } from "../src/core/version.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, systemPageCount, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("config", "harshness", "gentle");
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "grit=12/12");
    await ok("write", "Ossario", "--type", "place", "--add", "contains=[[Ennio]]");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function handWrite(path: string, text: string): void
{
    writeFileSync(join(folder, path), text);
}

describe("SYS-1: the campaign's system is one of those installed", () => {
    it("shows the system as it is installed, and goes on without its pages when one written by hand is not", async () => {
        expect(await ok("config", "system")).toBe(`system: fake, the fake system of the core's tests (rpg-engine ${getVersion()})`);
        expect(await ok("status")).toContain("Guadoscuro · it · fake, the fake system of the core's tests · difficulty normal");
        handWrite("campaign.yaml", "name: Guadoscuro\nlanguage: it\nsystem: Quinta edizione\ndifficulty: normal\nlethality: dice\n");
        expect(await refused("show", "Bog Hound")).toBe(
            "There is no page named Bog Hound. Look for it with the find command. The campaign's system, Quinta edizione, is not installed, so none of its pages can be found: validate says how to fix it.",
        );
        handWrite("campaign.yaml", "name: Guadoscuro\nlanguage: it\nsystem: fake\ndifficulty: normal\nlethality: dice\n");
        expect(await refused("show", "Lupastro")).toBe("There is no page named Lupastro. Look for it with the find command.");
    });
});

describe("SYS-2, SYS-3: the system's pages, found after the campaign's", () => {
    it("names the pages that share a name with a note in parentheses, as the calling beside the creature Fen Witch", async () => {
        expect(await ok("show", "Fen Witch")).toContain("Fen Witch (creature of the system fake, read-only)\nThere is also Fen Witch (calling), a topic of the system fake: show it by that name.\n");
        expect(await ok("show", "Fen Witch (calling)")).not.toContain("There is also");
        expect(await ok("show", "Bog Hound")).not.toContain("There is also");
    });

    it("shows a page of the system as read-only, and finds it by name, after the campaign's pages", async () => {
        const hound = await ok("show", "Bog Hound");
        expect(hound).toContain("Bog Hound (creature of the system fake, read-only)\n\n---\ngrit: 9/9");
        expect(hound).toContain("## Bite\n\nTwo dice and three");
        expect(hound).not.toContain("world/creatures/Bog Hound.md");
        expect(await ok("find", "hound")).toBe("Bog Hound (creature, system fake)");
        await ok("write", "Cane della valle", "--type", "creature", "--set", "creature=[[Bog Hound]]");
        expect(await ok("find", "hou")).toBe("Cane della valle (creature): creature: [[Bog Hound]]\nBog Hound (creature, system fake)");
        expect(await ok("find", "cane")).toBe("Cane della valle (creature)\n\nfind looks for the pages of the system fake in their names and fields, in English.");
    });

    it("counts the system's pages when find has no text, and names the language they are in", async () => {
        const creatures = systemPageCount("fake", "creatures");
        expect(await ok("find", "--type", "creature")).toBe(`No page of the campaign matches.\n\nThe system fake has ${creatures} creatures, named in English: give part of a name, in English, to find them.`);
        await ok("write", "Cane", "--type", "creature", "--set", "creature=[[Bog Hound]]");
        expect(await ok("find", "--type", "creature")).toBe(`Cane (creature)\n\nThe system fake has ${creatures} more creatures, named in English: give part of a name, in English, to find them.`);
    });

    it("never puts a page of the system anywhere, nor teaches it: anyone may know it", async () => {
        expect(await refused("reveal", "Bog Hound")).toBe("Bog Hound is a creature of the system fake: it holds no secrets, and anyone may know what it says. Nothing recorded.");
        handWrite("world/characters/Ennio.md", '---\nrole: pc\ngrit: 12/12\nknows: ["[[Bog Hound]]"]\n---\n');
        expect(await ok("validate")).toContain("world/characters/Ennio.md: Ennio knows [[Bog Hound]], a creature of the system fake, whose numbers are the master's, never shown in the player's view");
    });

    it("finds a page by its name before any alias, the campaign's aliases before the system's", async () => {
        await ok("write", "Lanterna nera", "--type", "item", "--set", "aliases=[Lantern, Lume]");
        expect(await ok("move", "Lume", "--to", "Ennio")).toBe("Moved Lanterna nera: now in Ennio › Ossario.");
        expect(await refused("move", "Lantern", "--to", "Ennio")).toContain("Lantern is a kind, counted in stacks in many places: give from");
    });
});

describe("SYS-4: no page of the campaign takes the name of a page of the system", () => {
    it("refuses to create one, with a name of its own instead", async () => {
        expect(await refused("write", "Bog Hound", "--type", "creature", "--set", "grit=9/9")).toBe(
            'Bog Hound is a creature of the system fake: a page of the campaign with that name would hide it. Give yours a name of its own, with creature=[[Bog Hound]]: write "<name>", type creature, set creature=[[Bog Hound]], grit=9/9. Nothing changed.',
        );
        expect(await refused("write", "Rushlight", "--type", "character")).toBe("Rushlight is an item of the system fake: a page of the campaign with that name would hide it. Give this character another name. Nothing changed.");
        expect(existsSync(join(folder, "world", "creatures", "Bog Hound.md"))).toBe(false);
    });

    it("reports one written by hand, with what derives from it, and show says it hides the system's", async () => {
        handWrite("world/creatures/Bog Hound.md", "---\ngrit: 3/3\n---\n");
        await ok("write", "Sgherro", "--type", "character", "--set", "role=npc", "--set", "creature=[[Bog Hound]]");
        expect(await ok("validate")).toBe(
            "1 problem:\n- world/creatures/Bog Hound.md: Bog Hound hides Bog Hound, a creature of the system fake: links to that name lead to this page, and Sgherro derives from it instead. "
                + "Fix: if the file was made by mistake, such as by clicking a link in Obsidian, delete it; otherwise rename it by hand, with a name of its own.",
        );
        expect(await ok("show", "Bog Hound")).toContain("Bog Hound (creature) · world/creatures/Bog Hound.md\nThis page hides the system fake's Bog Hound: links to that name lead here.");
        expect(await ok("show", "Sgherro")).toContain("Derives from: Bog Hound\n");
    });
});

describe("SYS-5: a curly apostrophe is a straight one", () => {
    it("finds Will-o'-the-Fen written either way, and brings in its copies", async () => {
        expect(await ok("show", "Will-o’-the-Fen")).toContain("Will-o'-the-Fen (creature of the system fake, read-only)");
        expect(await ok("scene", "open", "--title", "Palude", "--type", "combat", "--creatures", "Will-o’-the-Fen=1")).toContain("In it: Ennio: grit 12/12; Will-o'-the-Fen 1: grit 4/4.");
    });
});

describe("SYS-6: the system's pages are read-only, and in no place", () => {
    it("refuses to write one, with a page of the campaign that derives from it instead, and the fields given", async () => {
        expect(await refused("write", "Bog Hound", "--set", "grit=15/15")).toBe(
            'Bog Hound is a creature of the system fake: read-only. For a kind of your own, create a creature that derives from it, under a name in the campaign\'s language: write "<name>", type creature, '
                + "set creature=[[Bog Hound]], grit=15/15; for one in particular, a character with creature=[[Bog Hound]]. Nothing changed.",
        );
        expect(await refused("write", "Lantern", "--set", "heft=2 kg")).toBe(
            'Lantern is an item of the system fake: read-only. For one that someone has, create an item that derives from it, under a name in the campaign\'s language: write "<name>", type item, '
                + "set item=[[Lantern]], heft=2 kg, then move it to them. Nothing changed.",
        );
    });

    it("refuses to change or affect one: its copies change, or one enters the story", async () => {
        const kind =
            "Bog Hound is a creature of the system fake, a kind and read-only: one in a fight is a copy, brought in with scene, creatures Bog Hound=1; one with a name of its own is a character with creature=[[Bog Hound]]. Nothing changed.";
        expect(await refused("change", "Bog Hound", "grit", "--by=-1")).toBe(kind);
        expect(await refused("effect", "add", "Bog Hound", "Prono")).toBe(kind);
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Bog Hound=2");
        const copies = 'Bog Hound is a creature of the system fake, read-only: its copies in the open scene are Bog Hound 1, Bog Hound 2. Make the same call on the one you mean, such as page "Bog Hound 1". Nothing changed.';
        expect(await refused("change", "Bog Hound", "grit", "--by=-3")).toBe(copies);
        expect(await ok("change", "Bog Hound 1", "grit", "--by=-3")).toBe("Bog Hound 1: grit 9/9 → 6/9.\nBog Hound 1 has tough-against cold: if this damage has a type, give it with damage, as rolled.");
        expect(await ok("status")).toContain("copies: Bog Hound 1: grit 6/9; Bog Hound 2: grit 9/9");
    });

    it("counts an item of the system only in stacks: one with a story or uses of its own is an item of the campaign (STK-1)", async () => {
        const uses = "Herb Pouch has uses 5/5 of its own, which goes with one thing: such a thing is an item of the campaign derived from it";
        expect(await refused("write", "Ennio", "--add", "inventory=[[Herb Pouch]]")).toBe(
            `Herb Pouch is an item of the system fake, and ${uses}. To give Ennio one, create it under a name in the campaign's language: write "<name>", type item, `
                + `set item=[[Herb Pouch]]; then move, page "<name>", to Ennio. Nothing changed.`,
        );
        expect(await refused("write", "Ennio", "--add", "inventory=[[Herb Pouch]] 2")).toBe(`Herb Pouch is no kind to count: ${uses}. Nothing changed.`);
        await ok("write", "Kit di Bruna", "--type", "item", "--set", "item=[[Herb Pouch]]");
        expect(await refused("move", "Kit di Bruna", "--to", "Bog Hound")).toBe("Bog Hound is a creature of the system fake, a kind, which holds nothing: Kit di Bruna goes into a page of the campaign. Nothing moved.");
        expect(await ok("move", "Kit di Bruna", "--to", "Ennio")).toBe("Moved Kit di Bruna: now in Ennio › Ossario.");
        expect(await ok("validate")).toBe("No problems.");
    });
});

describe("SYS-7: the campaign's pages derive from the system's", () => {
    it("reads what a creature of the campaign does not hold from the system's, and its copies too", async () => {
        await ok("write", "Cane", "--type", "creature", "--set", "creature=[[Bog Hound]]", "--text", "Cani grigi.");
        await ok("write", "Cane capobranco", "--type", "creature", "--set", "creature=[[Cane]]", "--set", "grit=20/20");
        const shown = await ok("show", "Cane capobranco");
        expect(shown).toContain("Derives from: Cane › Bog Hound (fake)");
        expect(shown).toContain("Fields inherited from Bog Hound (fake):\nguard: 7");
        expect(shown).toContain("Text inherited from Bog Hound (fake):\n\n## Bite");
        expect(await ok("show", "Cane capobranco#Bite")).toContain("Two dice and three");
        expect(await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Cane=2", "--creatures", "Cane capobranco")).toContain(
            "In it: Ennio: grit 12/12; Cane 1: grit 9/9; Cane 2: grit 9/9; Cane capobranco 1: grit 20/20.",
        );
        expect(await ok("validate")).toBe("No problems.");
    });

    it("lets an item derive from an item of the system, and an item of the campaign with a use counter count it", async () => {
        await ok("write", "Kit di Bruna", "--type", "item", "--set", "item=[[Herb Pouch]]");
        await ok("move", "Kit di Bruna", "--to", "Ennio");
        expect(await ok("change", "Kit di Bruna", "uses", "--spend", "1")).toBe("Kit di Bruna: uses 5/5 → 4/5.");
        expect(await ok("show", "Kit di Bruna")).toContain("Fields inherited from Herb Pouch (fake):\nheft: 0.5 kg\n");
        expect(await refused("write", "Kit di Bruna", "--set", "item=[[Bog Hound]]")).toBe("item must link to an item, and Bog Hound is a creature. Nothing changed.");
    });
});

describe("SYS-8: the fields the system declares", () => {
    it("never counts a number, text or list, nor reads them as money", async () => {
        await ok("config", "coins", "gp 100, sp 10, cp 1");
        await ok("write", "Ennio", "--set", "might=5", "--set", "money=10 gp");
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Bog Hound");
        expect(await ok("status")).toContain("PC: Ennio, in Ossario: grit 12/12 · money 10 gp\n");
        expect(await refused("change", "Bog Hound 1", "calling", "--by=-1")).toBe('calling is text in the system fake, never counted: write it instead, such as write "Bog Hound 1", set calling=<value>. Nothing changed.');
        expect(await refused("change", "Ennio", "wit", "--to", "4")).toBe(
            'wit is a number in the system fake, never counted: for a while, such as a spell, effect, action add, page "Ennio", set wit=4; for good, write "Ennio", set wit=4. Nothing changed.',
        );
    });

    it("gives an effect on a number a number, and takes a new value with write, logged as no counter", async () => {
        await ok("write", "Ennio", "--set", "wit=4");
        expect(await refused("effect", "add", "Ennio", "Acume", "--set", "wit=+2")).toBe('wit on Ennio is a number, 4: give the value it reads while the effect lasts, such as wit=6, not "+2". Nothing changed.');
        expect(await ok("effect", "add", "Ennio", "Acume del gufo", "--set", "wit=7")).toBe("Ennio: Acume del gufo, until it is ended; wit 4 → 7, wit-bonus +0 → +2.");
        expect(await ok("write", "Ennio", "--set", "wit=5")).toContain("set wit");
        expect(readLogFile(folder).some((entry) => entry.type === "counter-changed" && (entry.data as { field?: string; }).field === "wit")).toBe(false);
        expect(readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8")).toContain("wit: 5");
    });
});
