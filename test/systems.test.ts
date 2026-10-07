// The pages of the game system (MECCANICHE, SYS-1–SYS-8): the cases of the table, through the commands, in a campaign played in Italian with the system 5e.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { getVersion } from "../src/core/version.ts";
import { makeTempFolder, readLogFile, removeFolder, systemPageCount, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    await ok("config", "advancement", "xp");
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "hp=12/12");
    await ok("write", "Ossario", "--type", "place", "--add", "contains=[[Ennio]]");
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

async function refused(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function handWrite(path: string, text: string): void
{
    writeFileSync(join(folder, path), text);
}

const installed = "Installed: 5e (the fifth edition from the SRD 5.1, the 2014 rules), ironsworn (a test system based on Ironsworn).";

describe("SYS-1: the campaign's system is one of those installed", () => {
    it("takes only an installed system in init and config, as it is installed, and lists them while it is missing", async () => {
        const other = makeTempFolder();

        try {
            const result = await runCommandLine(["init", "--system", "Quinta edizione"], testContext(other));
            expect(result.output).toBe(`"Quinta edizione" is not an installed system. ${installed} Give one of them, such as system 5e. Nothing changed.`);
            expect(existsSync(join(other, "campaign.yaml"))).toBe(false);
            expect((await runCommandLine(["init", "--system", "IRONSWORN"], testContext(other))).output).toContain("Still missing: language, difficulty, lethality.");
            expect(readFileSync(join(other, "campaign.yaml"), "utf8")).toContain("system: ironsworn");
        } finally {
            removeFolder(other);
        }

        expect(await refused("config", "system", "quinta")).toBe(`"quinta" is not an installed system. ${installed} Give one of them, such as setting system, value 5e. Nothing changed.`);
        expect(await ok("config", "system")).toBe(`system: 5e, the fifth edition from the SRD 5.1, the 2014 rules (rpg-engine ${getVersion()})`);
        expect(await ok("status")).toContain("Guadoscuro · it · 5e, the fifth edition from the SRD 5.1, the 2014 rules · difficulty normal");
    });

    it("reports a system written by hand that is not installed, and goes on without its pages", async () => {
        handWrite("campaign.yaml", "name: Guadoscuro\nlanguage: it\nsystem: Quinta edizione\ndifficulty: normal\nlethality: dice\n");
        expect(await ok("validate")).toBe(
            `1 problem:\n- campaign.yaml: The system Quinta edizione is not installed: no creatures, items or rules come from a system. ${installed} Fix: ask the player which game you play, then config, setting system, value 5e.`,
        );
        expect(await ok("config", "system")).toBe("system: Quinta edizione (not installed; installed: 5e, ironsworn)");
        expect(await ok("status")).toContain("1 problem in the campaign");
        expect(await refused("show", "Wolf")).toBe(
            "There is no page named Wolf. Look for it with the find command. The campaign's system, Quinta edizione, is not installed, so none of its pages can be found: validate says how to fix it.",
        );
        expect(await ok("show", "Ennio")).toContain("Ennio (character)");
        // Installed, the system goes unsaid.
        handWrite("campaign.yaml", "name: Guadoscuro\nlanguage: it\nsystem: 5e\ndifficulty: normal\nlethality: dice\n");
        expect(await refused("show", "Lupastro")).toBe("There is no page named Lupastro. Look for it with the find command.");
    });
});

describe("SYS-2, SYS-3: the system's pages, found after the campaign's", () => {
    it("shows a page of the system as read-only, and finds it by name, after the campaign's pages", async () => {
        const wolf = await ok("show", "Wolf");
        expect(wolf).toContain("Wolf (creature of the system 5e, read-only)\n\n---\nsize: Medium\ncategory: beast");
        expect(wolf).toContain("### Bite\n*Melee Weapon Attack:* +4 to hit");
        expect(wolf).not.toContain("world/creatures/Wolf.md");
        expect(await ok("find", "wolf")).toBe("Wolf (creature, system 5e)");
        await ok("write", "Lupo della valle", "--type", "creature", "--set", "creature=[[Wolf]]");
        expect(await ok("find", "wol")).toBe("Lupo della valle (creature): creature: [[Wolf]]\nWolf (creature, system 5e)");
        expect(await ok("find", "lupo")).toBe("Lupo della valle (creature)\n\nfind looks for the pages of the system 5e in their names and fields, in English.");
    });

    it("counts the system's pages when find has no text, and names the language they are in", async () => {
        const creatures = systemPageCount("5e", "creatures");
        expect(await ok("find", "--type", "creature")).toBe(`No page of the campaign matches.\n\nThe system 5e has ${creatures} creatures, named in English: give part of a name, in English, to find them.`);
        await ok("write", "Annegato", "--type", "creature", "--set", "creature=[[Zombie]]");
        expect(await ok("find", "--type", "creature")).toBe(`Annegato (creature)\n\nThe system 5e has ${creatures} more creatures, named in English: give part of a name, in English, to find them.`);
        expect(await ok("find", "basilisco")).toBe("No page matches.\n\nfind looks for the pages of the system 5e in their names and fields, in English.");
    });

    it("never puts a page of the system anywhere, nor teaches it: anyone may know it", async () => {
        expect(await refused("reveal", "Wolf")).toBe("Wolf is a creature of the system 5e: it holds no secrets, and anyone may know what it says. Nothing recorded.");
        handWrite("world/characters/Ennio.md", '---\nrole: pc\nhp: 12/12\nknows: ["[[Wolf]]"]\n---\n');
        expect(await ok("validate")).toContain(
            "world/characters/Ennio.md: Ennio knows [[Wolf]], a creature of the system 5e, which anyone may know: knows lists pages and secrets of the campaign. Fix: write Ennio, remove knows=[[Wolf]].",
        );
    });

    it("finds a page by its name before any alias, the campaign's aliases before the system's", async () => {
        await ok("write", "Spada nera", "--type", "item", "--set", "aliases=[Longsword, Lama]");
        expect(await ok("move", "Lama", "--to", "Ennio")).toBe("Moved Spada nera: now in Ennio › Ossario.");
        expect(await refused("move", "Longsword", "--to", "Ennio")).toContain("Longsword is an item of the system 5e, a kind: no one holds it.");
        expect(await refused("move", "Leather", "--to", "Ennio")).toContain("Leather Armor is an item of the system 5e, a kind: no one holds it.");
    });
});

describe("SYS-4: no page of the campaign takes the name of a page of the system", () => {
    it("refuses to create one, with a name of its own instead", async () => {
        expect(await refused("write", "Goblin", "--type", "creature", "--set", "hp=9/9")).toBe(
            'Goblin is a creature of the system 5e: a page of the campaign with that name would hide it. Give yours a name of its own, with creature=[[Goblin]]: write "<name>", type creature, set creature=[[Goblin]], hp=9/9. Nothing changed.',
        );
        expect(await refused("write", "Torch", "--type", "character")).toBe("Torch is an item of the system 5e: a page of the campaign with that name would hide it. Give this character another name. Nothing changed.");
        expect(existsSync(join(folder, "world", "creatures", "Goblin.md"))).toBe(false);
    });

    it("reports one written by hand, with what derives from it, and show says it hides the system's", async () => {
        handWrite("world/creatures/Goblin.md", "---\nhp: 3/3\n---\n");
        await ok("write", "Sgherro", "--type", "character", "--set", "role=npc", "--set", "creature=[[Goblin]]");
        expect(await ok("validate")).toBe(
            "1 problem:\n- world/creatures/Goblin.md: Goblin hides Goblin, a creature of the system 5e: links to that name lead to this page, and Sgherro derives from it instead. "
                + "Fix: if the file was made by mistake, such as by clicking a link in Obsidian, delete it; otherwise rename it by hand, with a name of its own.",
        );
        expect(await ok("show", "Goblin")).toContain("Goblin (creature) · world/creatures/Goblin.md\nThis page hides the system 5e's Goblin: links to that name lead here.");
        expect(await ok("show", "Sgherro")).toContain("Derives from: Goblin\n");
    });
});

describe("SYS-5: a curly apostrophe is a straight one", () => {
    it("finds Will-o'-Wisp written either way, and brings in its copies", async () => {
        expect(await ok("show", "Will-o’-Wisp")).toContain("Will-o'-Wisp (creature of the system 5e, read-only)");
        expect(await ok("scene", "open", "--title", "Palude", "--type", "combat", "--creatures", "Will-o’-Wisp=1")).toContain("In it: Ennio: hp 12/12; Will-o'-Wisp 1: hp 22/22.");
    });
});

describe("SYS-6: the system's pages are read-only, and in no place", () => {
    it("refuses to write one, with a page of the campaign that derives from it instead, and the fields given", async () => {
        expect(await refused("write", "Wolf", "--set", "hp=15/15")).toBe(
            'Wolf is a creature of the system 5e: read-only. For a kind of your own, create a creature that derives from it, under a name in the campaign\'s language: write "<name>", type creature, '
                + "set creature=[[Wolf]], hp=15/15; for one in particular, a character with creature=[[Wolf]]. Nothing changed.",
        );
        expect(await refused("write", "Longsword", "--set", "cost=10 gp")).toBe(
            'Longsword is an item of the system 5e: read-only. For one that someone has, create an item that derives from it, under a name in the campaign\'s language: write "<name>", type item, '
                + "set item=[[Longsword]], cost=10 gp, then move it to them. Nothing changed.",
        );
    });

    it("refuses to change or affect one: its copies change, or one enters the story", async () => {
        const kind = "Wolf is a creature of the system 5e, a kind and read-only: one in a fight is a copy, brought in with scene, creatures Wolf=1; one with a name of its own is a character with creature=[[Wolf]]. Nothing changed.";
        expect(await refused("change", "Wolf", "hp", "--by=-1")).toBe(kind);
        expect(await refused("effect", "add", "Wolf", "Prono")).toBe(kind);
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Wolf=2");
        const copies = 'Wolf is a creature of the system 5e, read-only: its copies in the open scene are Wolf 1, Wolf 2. Make the same call on the one you mean, such as page "Wolf 1". Nothing changed.';
        expect(await refused("change", "Wolf", "hp", "--by=-3")).toBe(copies);
        expect(await refused("effect", "add", "Wolf", "Prono")).toBe(copies);
        expect(await ok("change", "Wolf 1", "hp", "--by=-3")).toBe("Wolf 1: hp 11/11 → 8/11.");
        expect(await ok("status")).toContain("copies: Wolf 1: hp 8/11; Wolf 2: hp 11/11");
    });

    it("keeps an item of the system out of every inventory and container: one that matters is an item of the campaign, the rest is text", async () => {
        const kind = 'Longsword is an item of the system 5e, a kind: no one holds it. To give Ennio one, create it under a name in the campaign\'s language: write "<name>", type item, '
            + 'set item=[[Longsword]]; then move, page "<name>", to Ennio. An item that matters little can stay text in the inventory.';
        expect(await refused("write", "Ennio", "--add", "inventory=[[Longsword]]")).toBe(`${kind} Nothing changed.`);
        expect(await refused("move", "Longsword", "--to", "Ennio")).toBe(`${kind} Nothing moved.`);
        await ok("write", "Spada di Ennio", "--type", "item", "--set", "item=[[Longsword]]");
        expect(await refused("move", "Spada di Ennio", "--to", "Wolf")).toBe("Wolf is a creature of the system 5e, a kind, which holds nothing: Spada di Ennio goes into a page of the campaign. Nothing moved.");
        expect(await ok("move", "Spada di Ennio", "--to", "Ennio")).toBe("Moved Spada di Ennio: now in Ennio › Ossario.");
        expect(await ok("write", "Ennio", "--add", "inventory=corda di canapa")).toContain("added to inventory");
        expect(await ok("validate")).toBe("No problems.");

        handWrite("world/characters/Lena.md", '---\nrole: companion\ninventory: ["[[Torch]]"]\n---\n');
        expect(await ok("validate")).toContain(
            "world/characters/Lena.md: Lena lists Torch in inventory, but Torch is an item of the system 5e, a kind, which is nowhere; one that Lena has is an item of the campaign with item=[[Torch]], or text.",
        );
        expect(await ok("show", "Torch")).not.toContain("Is in:");
    });
});

describe("SYS-7: the campaign's pages derive from the system's", () => {
    it("reads what a creature of the campaign does not hold from the system's, and its copies too", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "creature=[[Wolf]]", "--text", "Lupi grigi della palude.");
        await ok("write", "Lupo capobranco", "--type", "creature", "--set", "creature=[[Lupo]]", "--set", "hp=20/20");
        const shown = await ok("show", "Lupo capobranco");
        expect(shown).toContain("Derives from: Lupo › Wolf (5e)");
        expect(shown).toContain("Fields inherited from Wolf (5e):\nsize: Medium");
        expect(shown).toContain("Text inherited from Wolf (5e):\n\n## Traits");
        expect(await ok("show", "Lupo capobranco#Bite")).toContain("*Melee Weapon Attack:* +4 to hit");
        expect(await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Lupo=2", "--creatures", "Lupo capobranco")).toContain(
            "In it: Ennio: hp 12/12; Lupo 1: hp 11/11; Lupo 2: hp 11/11; Lupo capobranco 1: hp 20/20.",
        );
        expect(await ok("validate")).toBe("No problems.");
    });

    it("lets an item derive from an item of the system, and an item of the campaign with a use counter count it", async () => {
        await ok("write", "Kit di Bruna", "--type", "item", "--set", "item=[[Healer's Kit]]");
        await ok("move", "Kit di Bruna", "--to", "Ennio");
        expect(await ok("change", "Kit di Bruna", "uses", "--spend", "1")).toBe("Kit di Bruna: uses 10/10 → 9/10.");
        expect(await ok("show", "Kit di Bruna")).toContain("Fields inherited from Healer's Kit (5e):\ncategory: adventuring gear\ncost: 5 gp\nweight: 3 lb\n");
        expect(await refused("write", "Kit di Bruna", "--set", "item=[[Wolf]]")).toBe("item must link to an item, and Wolf is a creature. Nothing changed.");
    });
});

describe("SYS-8: the fields the system declares", () => {
    it("never counts a number, text or list, nor reads them as money", async () => {
        await ok("config", "coins", "gp 100, sp 10, cp 1");
        await ok("write", "Ennio", "--set", "str=16", "--set", "money=10 gp");
        await ok("write", "Spada di Ennio", "--type", "item", "--set", "item=[[Longsword]]");
        await ok("move", "Spada di Ennio", "--to", "Ennio");
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Wolf");
        expect(await ok("status")).toContain("PC: Ennio, in Ossario: hp 12/12 · money 10 gp\n");
        expect(await ok("status")).toContain("copies: Wolf 1: hp 11/11");
        expect(await refused("change", "Wolf 1", "cr", "--by=-1")).toBe('cr is text in the system 5e, never counted: write it instead, such as write "Wolf 1", set cr=<value>. Nothing changed.');
        expect(await refused("change", "Ennio", "str", "--by=1")).toBe(
            'str is a number in the system 5e, never counted: for a while, such as a spell, effect, action add, page "Ennio", set str=17; for good, write "Ennio", set str=17. Nothing changed.',
        );
        expect(await refused("change", "Ennio", "dex", "--to", "14")).toBe(
            'dex is a number in the system 5e, never counted: for a while, such as a spell, effect, action add, page "Ennio", set dex=14; for good, write "Ennio", set dex=14. Nothing changed.',
        );
        expect(await refused("change", "Spada di Ennio", "cost", "--spend", "1 gp")).toBe(
            'cost is text in the system 5e, never counted: write it instead, such as write "Spada di Ennio", set cost=<value>. Nothing changed.',
        );
    });

    it("gives an effect on a number a number, and takes a new value with write, logged as no counter", async () => {
        await ok("write", "Ennio", "--set", "str=16");
        expect(await refused("effect", "add", "Ennio", "Forza", "--set", "str=+2")).toBe(
            'str on Ennio is a number, 16: give the value it reads while the effect lasts, such as str=18, not "+2". Nothing changed.',
        );
        expect(await ok("effect", "add", "Ennio", "Forza del gigante", "--set", "str=21")).toBe("Ennio: Forza del gigante, until it is ended; str 16 → 21, str-mod +3 → +5.");
        expect(await ok("write", "Ennio", "--set", "str=17")).toContain("set str");
        expect(readLogFile(folder).some((entry) => entry.type === "counter-changed" && (entry.data as { field?: string; }).field === "str")).toBe(false);
    });
});

describe("the names of the system's pages, in a campaign in another language (D-165)", () => {
    it("says a name not found may be the system's in its language, and that a new creature or item may be a kind of one", async () => {
        expect(await refused("scene", "open", "--title", "Palude", "--type", "combat", "--creatures", "Lupo")).toBe(
            `There is no creature named Lupo. The campaign has no creature pages yet. The system 5e has ${systemPageCount("5e", "creatures")} creatures, named in English: `
                + "find one with find, type creature and part of its name in English, then give its name here.",
        );
        expect(await ok("write", "Lupo", "--type", "creature", "--text", "Lupi grigi.")).toBe(
            "Created Lupo (creature, world/creatures/Lupo.md): wrote the introduction.\nLupo derives from no creature: if it is a kind of one of the system 5e "
                + "(named in English: find, type creature, with part of its name in English), set creature to it, and its numbers come from there.",
        );
        expect(await ok("write", "Spada", "--type", "item", "--set", "base=[[Longsword]]")).toBe(
            'Created Spada (item, world/items/Spada.md): set base.\nSpada links to Longsword, an item of the system 5e, in base: if it is a kind of it, the field is item, such as write "Spada", set item=[[Longsword]], unset base.',
        );
        expect(await refused("write", "Spadone", "--set", "x=1")).toContain("find looks for the pages of the system 5e in their names and fields, in English.");
    });
});

describe("a campaign of another system: the test system based on Ironsworn", () => {
    it("brings in its foes and counts only what it declares a counter", async () => {
        await ok("config", "system", "ironsworn");
        expect(await ok("show", "Marsh Stalker")).toContain("Marsh Stalker (creature of the system ironsworn, read-only)");
        expect(await ok("scene", "open", "--title", "Fens", "--type", "combat", "--creatures", "Marsh Stalker")).toContain("Marsh Stalker 1: progress 0/40.");
        expect(await ok("change", "Marsh Stalker 1", "progress", "--by=8")).toBe("Marsh Stalker 1: progress 0/40 → 8/40.");
        expect(await refused("change", "Marsh Stalker 1", "rank", "--by=1")).toContain("rank is text in the system ironsworn, never counted");
        expect(await refused("show", "Wolf")).toBe("There is no page named Wolf, nor a copy of that name in the open scene. Look for it with the find command.");
    });
});

describe("after the round on the code: the system missing, and the remedies (SYS-1–SYS-8)", () => {
    it("reads the system even when another setting breaks campaign.yaml", async () => {
        handWrite("campaign.yaml", "name: Guadoscuro\nlanguage: it\nsystem: 5e\nlines: [ragni\n");
        expect(await ok("show", "Wolf")).toContain("Wolf (creature of the system 5e, read-only)");
        expect(await ok("validate")).not.toContain("Wolf");
    });

    it("says the system is missing wherever a name is not found, and fixes the system before any link", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "creature=[[Wolf]]");
        handWrite("campaign.yaml", "name: Guadoscuro\nlanguage: it\nsystem: Quinta edizione\ndifficulty: normal\nlethality: dice\n");
        const missing = "The campaign's system, Quinta edizione, is not installed, so none of its pages can be found: validate says how to fix it.";
        expect(await refused("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Wolf")).toContain(missing);
        expect(await refused("write", "Wolf", "--set", "hp=9/9")).toContain(missing);
        expect(await ok("validate")).toContain(
            "world/creatures/Lupo.md: creature links to [[Wolf]], which does not exist. Fix: if it is a page of the system Quinta edizione, which is not installed, fix the system first, "
                + "as the problem on campaign.yaml says; otherwise create Wolf with write if it belongs to this world, or write Lupo, set creature to a page that exists.",
        );
        expect(await ok("status")).toContain("Guadoscuro · it · Quinta edizione (not installed: ask the player, then config, setting system, value 5e) · difficulty normal");
    });

    it("points the remedies of change at the campaign's pages, and refuses a field the system never counts even when it is missing", async () => {
        await ok("write", "Lupo", "--type", "creature", "--set", "creature=[[Wolf]]");
        await ok("write", "Lupo capobranco", "--type", "creature", "--set", "creature=[[Lupo]]");
        expect(await refused("change", "Lupo capobranco", "mana", "--by=-1")).toContain("Lupo capobranco reads what it does not hold from Lupo: write the counter there");
        await ok("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Wolf");
        expect(await refused("change", "Wolf 1", "mana", "--by=-1")).toContain("To add one, use write, such as set mana=");
        expect(await refused("change", "Ennio", "str", "--by=1")).toBe(
            'str is a number in the system 5e, never counted: for a while, such as a spell, effect, action add, page "Ennio", set str=<value>; for good, write "Ennio", set str=<value>. Nothing changed.',
        );
    });

    it("gives the remedies of write without a field twice, and sends an alias of the system to its page", async () => {
        expect(await refused("write", "Wolf", "--type", "creature", "--set", "creature=[[Goblin]]", "--set", "hp=9/9")).toContain('write "<name>", type creature, set creature=[[Wolf]], hp=9/9.');
        expect(await refused("write", "Leather", "--set", "x=1")).toContain(
            "Leather is an alias of Leather Armor. Leather Armor is an item of the system 5e: read-only. For one that someone has, create an item that derives from it",
        );
    });

    it("keeps the system's pages out of knows, and names the field an item would stay text in", async () => {
        expect(await refused("write", "Ennio", "--add", "knows=[[Wolf]]")).toBe(
            "Wolf is a creature of the system 5e, which anyone may know: knows lists pages and secrets of the campaign. Nothing changed.",
        );
        expect(await refused("write", "Ossario", "--add", "contains=[[Torch]]")).toContain("An item that matters little can stay text in the contents. Nothing changed.");
    });

    it("never takes a field the system declares for money when the coins change", async () => {
        await ok("config", "coins", "gp 100, sp 10, cp 1");
        await ok("write", "Spada di Ennio", "--type", "item", "--set", "item=[[Longsword]]", "--set", "cost=20 gp");
        expect(await ok("config", "coins", "mo 100, ma 10, mr 1")).toBe("coins: mo 100, ma 10, mr 1");
    });

    it("refuses a condition on a page of the system, which can never hold, and validate reports one written by hand", async () => {
        const never = "[[Wolf]] is a creature of the system 5e, a kind: never anywhere, never dead, so the condition on it can never hold.";
        expect(await refused("write", "Agguato", "--type", "event", "--set", "when=[[Wolf]] dead")).toContain(never);
        handWrite("world/events/Agguato.md", '---\nstatus: planned\nwhen: "[[Wolf]] dead"\n---\n');
        expect(await ok("validate")).toContain(never);
    });

    it("names an item as the base that others derive from, when its type would change", async () => {
        await ok("write", "Spada lunga", "--type", "item");
        await ok("write", "Spada di Bruna", "--type", "item", "--set", "item=[[Spada lunga]]");
        expect(await refused("write", "Spada lunga", "--type", "creature")).toBe(
            "Spada lunga is the item that Spada di Bruna derives from: as a creature it would leave them deriving from nothing. Give them another item first.",
        );
    });

    it("finds the system's pages by their fields too, with the field that matched", async () => {
        const found = await ok("find", "undead");
        expect(found).toContain("Zombie (creature, system 5e): category: undead");
        expect(found).toContain("Skeleton (creature, system 5e): category: undead");
    });

    it("says a new item may be a kind of one of the system only when it writes a field of the system, and never sends magic to item", async () => {
        expect(await ok("write", "Diario di Varro", "--type", "item", "--text", "Pagine fitte di formule.")).toBe("Created Diario di Varro (item, world/items/Diario di Varro.md): wrote the introduction.");
        expect(await ok("write", "Lama fiammeggiante", "--type", "item", "--set", "magic=[[Weapon, +1, +2, or +3]]", "--set", "bonus=1")).toContain(
            "Lama fiammeggiante derives from no item: if it is a kind of one of the system 5e",
        );
        // How a magic weapon of the campaign is written is the system's note on the attacks, said when a character joins the party (D-206), not the item's page (D-170).
        expect(await ok("write", "Bruna", "--type", "character", "--set", "role=companion", "--set", "level=1")).toContain("item=[[Longsword]], magic=[[Weapon, +1, +2, or +3]], bonus=1");
        expect(await ok("show", "Weapon, +1, +2, or +3")).not.toContain("In the campaign");
    });

    it("shows in status the values an effect gives that no counter shows", async () => {
        await ok("write", "Ennio", "--set", "str=16");
        await ok("effect", "add", "Ennio", "Forza del gigante", "--set", "str=21");
        expect(await ok("status")).toContain("PC: Ennio, in Ossario: hp 12/12 · Forza del gigante (str 21)");
    });
});

describe("the messages, case by case (SYS-1, SYS-3, SYS-4, SYS-6)", () => {
    it("names no language in a campaign that speaks the system's", async () => {
        await ok("config", "language", "en");
        expect(await ok("find", "basilisco")).toBe("No page matches.\n\nfind looks for the pages of the system 5e in their names and fields.");
        expect(await ok("find", "--type", "creature")).toBe(`No page of the campaign matches.\n\nThe system 5e has ${systemPageCount("5e", "creatures")} creatures: give part of a name to find them.`);
        expect(await ok("write", "Wolfhound", "--type", "creature")).toContain("Wolfhound derives from no creature: if it is a kind of one of the system 5e, set creature to it");
        expect(await refused("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Hound")).toContain(
            `The system 5e has ${systemPageCount("5e", "creatures")} creatures: find one with find, type creature and part of its name, then give its name here.`,
        );
    });

    it("gives the item of the system a name of its own, and another name to a page of another type", async () => {
        expect(await refused("write", "Torch", "--type", "item")).toBe(
            'Torch is an item of the system 5e: a page of the campaign with that name would hide it. Give yours a name of its own, with item=[[Torch]]: write "<name>", type item, set item=[[Torch]]. Nothing changed.',
        );
        expect(await refused("write", "Wolf", "--type", "place")).toBe("Wolf is a creature of the system 5e: a page of the campaign with that name would hide it. Give this place another name. Nothing changed.");
    });

    it("reports a creature of the system written in a container, and every page that derives from a hidden one", async () => {
        handWrite("world/places/Bosco.md", '---\ncontains: ["[[Wolf]]"]\n---\n');
        expect(await ok("validate")).toContain(
            "world/places/Bosco.md: Bosco lists Wolf in contains, but Wolf is a creature of the system 5e, a kind, which is nowhere. Fix: write Bosco, remove contains=[[Wolf]].",
        );
        handWrite("world/places/Bosco.md", "---\n---\n");
        handWrite("world/creatures/Goblin.md", "---\nhp: 3/3\n---\n");
        await ok("write", "Sgherro", "--type", "character", "--set", "creature=[[Goblin]]");
        await ok("write", "Ladro", "--type", "character", "--set", "creature=[[Goblin]]");
        expect(await ok("validate")).toContain("links to that name lead to this page, and Ladro, Sgherro derive from it instead.");
    });

    it("works with no system installed, and says so", async () => {
        const other = makeTempFolder();

        try {
            const none = { ...testContext(other), systemFolders: [] };
            expect((await runCommandLine(["init", "--name", "Nuda", "--language", "it"], none)).output).toContain("Still missing: system, difficulty, lethality.");
            expect((await runCommandLine(["config", "system", "5e"], none)).output).toBe('"5e" is not an installed system. No system is installed. Nothing changed.');
            writeFileSync(join(other, "campaign.yaml"), "name: Nuda\nlanguage: it\nsystem: 5e\n");
            expect((await runCommandLine(["validate"], none)).output).toContain("Fix: install the game system.");
        } finally {
            removeFolder(other);
        }
    });
});
