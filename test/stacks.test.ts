// Stacks of goods (MECCANICHE, STK-1–STK-13): the cases of the table, through the commands, in a campaign played in Italian with the fake system and coins
// of its own, and one with Ironsworn, whose goods are the campaign's own kinds; the 5e's bundles and words are in the 5e's repository.
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { countedText, readEntry, withStackCount } from "../src/pages/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    // The campaign's own coins, decimal, over the fake system's.
    await ok("config", "coins", "gp 100, sp 10, cp 1");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "money=2 gp 3 cp", "--add", "inventory=[[Rushlight]] 7");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion");
    await ok("write", "Mulino", "--type", "place", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lena]]");
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

function file(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

describe("STK-1: how an entry of a container reads", () => {
    it("reads a link and a count as a stack, a link alone as a link, and anything else beside a link as no stack", () => {
        expect(readEntry("[[Rushlight]] 7")).toEqual({ shape: "stack", page: "Rushlight", count: 7 });
        expect(readEntry("[[Rushlight|torce]] 7")).toEqual({ shape: "stack", page: "Rushlight", label: "torce", count: 7 });
        expect(readEntry("[[items/Rushlight.md]] 2")).toEqual({ shape: "stack", page: "Rushlight", count: 2 });
        expect(readEntry("[[Rushlight]]")).toEqual({ shape: "link", page: "Rushlight" });
        expect(readEntry("[[Rushlight#Uso]]")).toEqual({ shape: "link", page: "Rushlight", section: "Uso" });

        for (const other of ["[[Rushlight]] 0", "7 [[Rushlight]]", "[[Rushlight]] 7 bagnate", "[[Rushlight#Uso]] 7", "[[Rushlight]] -2", "[[Rushlight]] 1.5", "[[Rushlight]] [[Coil of Rope]] 2", "[[Rushlight]]7"]) {
            expect(readEntry(other).shape, other).toBe("other");
        }

        expect(readEntry("corda di canapa")).toEqual({ shape: "text" });
    });

    it("finds a count inside a text at either end, never in the middle", () => {
        expect(countedText("torce 7")).toEqual({ name: "torce", count: 7 });
        expect(countedText("3 frecce")).toEqual({ name: "frecce", count: 3 });
        expect(countedText("Rushlight x7")).toEqual({ name: "Rushlight", count: 7 });
        expect(countedText("Anello dei 7 sigilli")).toBeUndefined();
        expect(countedText("Spada +1")).toBeUndefined();
    });

    it("writes one stack of a kind in the place of its first entry, takes it away at 0, and adds one at the end", () => {
        expect(withStackCount(["[[Coil of Rope]]", "[[Rushlight|torce]] 3", "x", "[[rushlight]] 4"], "Rushlight", 6)).toEqual(["[[Coil of Rope]]", "[[Rushlight|torce]] 6", "x"]);
        expect(withStackCount(["[[Rushlight]] 3", "x"], "Rushlight", 0)).toEqual(["x"]);
        expect(withStackCount(["x"], "Rushlight", 2, "torce")).toEqual(["x", "[[Rushlight|torce]] 2"]);
    });

    it("counts a link alone to a kind of the system as 1, and refuses a count that makes no stack", async () => {
        await ok("write", "Lena", "--add", "inventory=[[Hardtack]]");
        expect(await ok("change", "Lena", "Hardtack", "--spend", "1")).toBe("Lena: Hardtack 1 → 0: gone from Lena.");
        expect(await refused("write", "Lena", "--add", "inventory=[[Rushlight]] 0")).toBe('"[[Rushlight]] 0" is no stack: a stack is a link and a count from 1 up, such as write Lena, add inventory="[[Rushlight]] 3". Nothing changed.');
        expect(await refused("write", "Lena", "--add", "inventory=7 [[Rushlight]]")).toContain('"7 [[Rushlight]]" is no stack');
        expect(await refused("write", "Lena", "--add", "inventory=[[Mulino]] 2")).toBe("Mulino is no kind to count: Mulino is a place: only items are counted. Nothing changed.");
    });

    it("makes an item of the campaign that an entry counts a kind, in no place, however many count it", async () => {
        await ok("write", "Lembas", "--type", "item");
        await ok("write", "Ettore", "--add", "inventory=[[Lembas]] 3");
        await ok("write", "Lena", "--add", "inventory=[[Lembas]] 10");
        expect(await ok("validate")).toBe("No problems.");
        expect(await ok("show", "Lembas")).not.toContain("Is in");
        expect(await ok("change", "Lena", "Lembas", "--spend", "2")).toBe("Lena: Lembas 10 → 8.");
        // A link alone to a kind of the campaign is a stack of 1, which validate asks to write with its count.
        writeFileSync(join(folder, "world", "places", "Mulino.md"), '---\ncontains: ["[[Ettore]]", "[[Lena]]", "[[Lembas]]"]\n---\n');
        expect(await ok("validate")).toBe(
            "1 problem:\n- world/places/Mulino.md: Mulino lists Lembas in contains without a count, while other entries count it, so it is a kind, read here as 1. "
                + 'Fix: if Lembas is a kind, write Mulino, remove contains=[[Lembas]], add contains="[[Lembas]] 1"; if it is one thing with a story of its own, take its counts away where others count it.',
        );
        expect(await refused("write", "Lembas", "--type", "character")).toBe("Lembas is a kind, counted in stacks: as a character those stacks would count nothing. Give the stacks another kind first.");
    });

    it("keeps a count away from a thing with a story of its own in a place", async () => {
        await ok("write", "Mazza", "--type", "item");
        await ok("move", "Mazza", "--to", "Ettore");
        expect(await refused("write", "Lena", "--add", "inventory=[[Mazza]] 2")).toBe("Mazza is in Ettore as one thing with a story of its own: a count goes only beside a kind, as [[Name]] 7. Nothing changed.");
    });
});

describe("STK-2, STK-10: what write counts, and how", () => {
    it("refuses a second stack of a kind, a count changed by write, and a count beside a page that is not there", async () => {
        expect(await refused("write", "Ettore", "--add", "inventory=[[Rushlight]] 2")).toBe("Ettore has 7 Rushlight already: a stack's count changes with change, such as change Ettore, Rushlight, by +2. Nothing changed.");
        expect(await refused("write", "Ettore", "--add", "inventory=[[Rushlight]]")).toBe("Ettore has 7 Rushlight already: a stack's count changes with change, such as change Ettore, Rushlight, by +1. Nothing changed.");
        expect(await refused("write", "Ettore", "--set", "inventory=[[Rushlight]] 5")).toBe("Ettore has 7 Rushlight already: a stack's count changes with change, such as change Ettore, Rushlight, by -2. Nothing changed.");
        expect(await refused("write", "Lena", "--set", "inventory=[[Coil of Rope]] 1, [[Coil of Rope]] 2")).toContain("a container has one stack of each kind");
    });

    it("refuses a count inside a text that names a kind, with its stack, and tells how to count another", async () => {
        expect(await refused("write", "Lena", "--add", "inventory=Rushlight 3")).toBe('"Rushlight 3" is a count inside a text: write Lena, add inventory="[[Rushlight]] 3", a stack of Rushlight. Nothing changed.');
        expect(await ok("write", "Lena", "--add", "inventory=torce 3")).toContain('"torce 3" is a count inside a text, which nothing counts');
        expect(await ok("validate")).toContain('Lena lists "torce 3" in inventory: a count inside a text, which nothing counts.');
        expect(await ok("write", "Lena", "--add", "inventory=corda di canapa")).not.toContain("count inside a text");
    });

    it("takes a whole stack away by its link, or by its own count, never by another", async () => {
        expect(await refused("write", "Ettore", "--remove", "inventory=[[Rushlight]] 3")).toBe(
            "Ettore has 7 Rushlight: remove takes the whole stack, by its link [[Rushlight]]; to take 3, change Ettore, Rushlight, spend 3. Nothing changed.",
        );
        expect(file("characters/Ettore.md")).toContain("[[Rushlight]] 7");
        await ok("write", "Ettore", "--remove", "inventory=[[Rushlight]] 7");
        expect(file("characters/Ettore.md")).not.toContain("Rushlight");
        await ok("write", "Ettore", "--add", "inventory=[[Rushlight]] 2");
        await ok("write", "Ettore", "--remove", "inventory=[[Rushlight]]");
        expect(file("characters/Ettore.md")).not.toContain("Rushlight");
    });
});

describe("STK-3, STK-4: one stack of a kind in a container, and which one a holder means", () => {
    it("reads two entries of a kind as one, which validate reports and change writes as one", async () => {
        writeFileSync(join(folder, "world", "characters", "Lena.md"), '---\nrole: companion\ninventory: ["[[Rushlight]] 3", "[[Rushlight|torce]] 4"]\n---\n');
        expect(await ok("validate")).toContain("Lena lists Rushlight more than once in inventory: a container has one stack of each kind, read as 7.");
        expect(await ok("change", "Lena", "Rushlight", "--spend", "1")).toBe("Lena: Rushlight 7 → 6.");
        expect(file("characters/Lena.md")).toContain('"[[Rushlight]] 6"');
        expect(file("characters/Lena.md")).not.toContain("torce");
    });

    it("finds a stack inside what a holder carries, by its label too, and refuses when there are several", async () => {
        await ok("write", "Zaino", "--type", "item", "--add", "contains=[[Tallow|sego]] 20");
        await ok("move", "Zaino", "--to", "Lena");
        expect(await ok("change", "Lena", "sego", "--spend", "3")).toBe("Lena: sego 20 → 17: in Zaino.");
        await ok("write", "Faretra", "--type", "item", "--add", "contains=[[Tallow]] 5");
        await ok("move", "Faretra", "--to", "Lena");
        expect(await refused("change", "Lena", "Tallow", "--spend", "1")).toBe("Lena keeps Tallow in more than one place: Zaino (17), Faretra (5). Name the one, such as change Zaino, Tallow, spend 1. Nothing changed.");
        expect(await ok("change", "Faretra", "Tallow", "--spend", "1")).toBe("Faretra: Tallow 5 → 4.");
    });
});

describe("STK-5: change on a stack", () => {
    it("spends what there is, stops at 0, sets from 0 up, and takes the entry away at 0", async () => {
        expect(await refused("change", "Ettore", "Rushlight", "--spend", "8")).toBe("Ettore has 7 Rushlight: cannot spend 8. Nothing changed.");
        expect(await ok("change", "Ettore", "Rushlight", "--by=-9")).toBe("Ettore: Rushlight 7 → 0: stopped at 0, 2 short; gone from Ettore.");
        expect(file("characters/Ettore.md")).not.toContain("Rushlight");
        expect(await refused("change", "Ettore", "Rushlight", "--spend", "1")).toBe(
            'Ettore has no Rushlight, in inventory or inside what it holds. If the story gives some, write Ettore, add inventory="[[Rushlight]] 1". Nothing changed.',
        );
        await ok("write", "Ettore", "--add", "inventory=[[Rushlight]] 2");
        expect(await refused("change", "Ettore", "Rushlight", "--to=-1")).toContain("give to a whole number from 0 up");
        expect(await refused("change", "Ettore", "Rushlight", "--spend", "two")).toContain("give spend a whole number above 0");
        expect(await ok("change", "Ettore", "Rushlight", "--to", "2")).toBe("Nothing changed: Rushlight on Ettore is 2.");
        expect(await ok("change", "Ettore", "Rushlight", "--to", "0")).toBe("Ettore: Rushlight 2 → 0: gone from Ettore.");
    });

    it("leaves a stack's line in the log, public for the party, and in the story by the name its entry gives", async () => {
        await ok("change", "Ettore", "Rushlight", "--spend", "1", "--why", "accesa nella cripta");
        const line = readLogFile(folder).at(-1);
        expect(line).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Ettore", field: "Rushlight", kind: "Rushlight", stack: true, before: 7, after: 6, spend: 1, why: "accesa nella cripta" } });
    });

    it("refuses an effect on a kind, with the calls that make one thing of it", async () => {
        expect(await refused("effect", "add", "Rushlight", "Bagnata")).toContain("Rushlight is a kind, counted in stacks: an effect goes on one thing, an item of the campaign derived from it.");
    });
});

describe("STK-6: move by pieces", () => {
    it("moves pieces from a container, joining the destination's stack, and the whole stack without count", async () => {
        expect(await ok("move", "Rushlight", "--from", "Ettore", "--to", "Lena", "--count", "3")).toBe("Moved 3 Rushlight: now in Lena › Mulino.\nEttore: Rushlight 7 → 4; Lena: Rushlight 0 → 3.");
        expect(await ok("move", "Rushlight", "--from", "Ettore", "--to", "Lena")).toBe("Moved 4 Rushlight: now in Lena › Mulino.\nEttore: Rushlight 4 → 0, gone from Ettore; Lena: Rushlight 3 → 7.");
        expect(file("characters/Lena.md")).toContain("[[Rushlight]] 7");
        expect(file("characters/Ettore.md")).not.toContain("Rushlight");
    });

    it("keeps the label of the entry the pieces come from, and drops the pieces on the ground of a place", async () => {
        await ok("change", "Ettore", "Rushlight", "--spend", "7");
        await ok("write", "Ettore", "--add", "inventory=[[Rushlight|torce]] 5");
        expect(await ok("move", "torce", "--from", "Ettore", "--to", "Mulino", "--count", "2")).toBe("Moved 2 torce: now in Mulino.\nEttore: torce 5 → 3; Mulino: torce 0 → 2.");
        expect(file("places/Mulino.md")).toContain("[[Rushlight|torce]] 2");
    });

    it("refuses a kind without from, more pieces than there are, count with two kinds or a page, and nothing moves", async () => {
        await ok("write", "Ettore", "--add", "inventory=[[Coil of Rope]] 1");
        expect(await refused("move", "Rushlight", "--to", "Lena")).toBe("Rushlight is a kind, counted in stacks in many places: give from, the container it is taken from, such as page Rushlight, from <who has it>, to Lena. Nothing moved.");
        expect(await refused("move", "Rushlight", "--from", "Ettore", "--to", "Lena", "--count", "8")).toBe("Ettore has 7 Rushlight: cannot move 8. Nothing moved.");
        expect(await refused("move", "Rushlight", "Coil of Rope", "--from", "Ettore", "--to", "Lena", "--count", "1")).toContain("give one kind at a time with count");
        await ok("write", "Mazza", "--type", "item");
        await ok("move", "Mazza", "--to", "Lena");
        expect(await refused("move", "Mazza", "--from", "Ettore", "--to", "Mulino")).toBe("Mazza is not in Ettore: move it without from, or from where it is. Nothing moved.");
        await ok("write", "Cerca", "--type", "quest");
        expect(await refused("move", "Rushlight", "--from", "Ettore", "--to", "Cerca")).toContain("Cerca holds no items, so no stack goes there");
        expect(file("characters/Ettore.md")).toContain("[[Rushlight]] 7");
        expect(await ok("move", "Rushlight", "--from", "Ettore", "--to", "Ettore")).toBe("Nothing changed: Rushlight is already in Ettore.");
    });
});

describe("STK-7, STK-8, STK-9: trade", () => {
    beforeEach(async () => {
        await ok("write", "Bottega di Ugo", "--type", "place", "--add", "contains=[[Rushlight]] 20", "--add", "contains=[[Lantern]] 2");
        await ok("write", "Ugo", "--type", "character", "--set", "role=npc", "--set", "money=5 sp 9 cp", "--add", "inventory=[[Hardtack]] 4");
        await ok("move", "Ugo", "--to", "Bottega di Ugo");
    });

    it("buys from a shop that keeps no purse: goods and money one way each, in one go", async () => {
        expect(await ok("trade", "Ettore", "--with", "Bottega di Ugo", "--gives", "1 gp", "--gets", "Rushlight 5", "--gets", "Lantern")).toBe(
            "Ettore gave Bottega di Ugo 1 gp, and got 5 Rushlight, 1 Lantern.\nBottega di Ugo: Rushlight 20 → 15; Bottega di Ugo: Lantern 2 → 1; Ettore: Rushlight 7 → 12; Ettore: Lantern 0 → 1.\nEttore: money 2 gp 3 cp → 1 gp 3 cp (1 gp given).",
        );
        expect(file("places/Bottega di Ugo.md")).toContain("[[Lantern]] 1");
    });

    it("pays a merchant with a purse, who gives the change from it, or refuses when it has not the coins", async () => {
        // Ettore has no silver: he hands over a gold coin, and Ugo gives the change from his purse.
        expect(await ok("trade", "Ettore", "--with", "Ugo", "--gives", "5 sp", "--gets", "Hardtack 2")).toBe(
            "Ettore gave Ugo 5 sp, and got 2 Hardtack.\nUgo: Hardtack 4 → 2; Ettore: Hardtack 0 → 2.\nEttore: money 2 gp 3 cp → 1 gp 5 sp 3 cp (1 gp given, 5 sp back).\nUgo: money 5 sp 9 cp → 1 gp 9 cp.",
        );
        expect(await refused("trade", "Ettore", "--with", "Ugo", "--gives", "8 sp", "--gets", "Hardtack 1")).toBe(
            'Ugo has not the coins to give 7 sp of change for the 1 gp 5 sp Ettore hands over. If the master says Ugo has them, give them first, such as change Ugo, money, by "+7 sp"; '
                + "or pay with other coins. Nothing changed.",
        );
        expect(await ok("trade", "Ettore", "--with", "Ugo", "--gives", "Rushlight 2", "--gets", "9 cp")).toContain("Ugo: money 1 gp 9 cp → 1 gp (9 cp given).");
    });

    it("refuses money both ways, a character as goods, what a side lacks, and one of the party without money, writing nothing", async () => {
        expect(await refused("trade", "Ettore", "--with", "Ugo", "--gives", "1 gp", "--gets", "5 sp")).toContain("Money goes one way in a trade");
        expect(await refused("trade", "Ettore", "--with", "Ugo", "--gives", "1 gp", "--gets", "Lena")).toContain("Lena is a character, who is never traded");
        expect(await refused("trade", "Ettore", "--with", "Ugo", "--gives", "Rushlight 9", "--gets", "Hardtack 1")).toBe("Ettore has 7 Rushlight: cannot give 9. Nothing changed.");
        expect(await refused("trade", "Lena", "--with", "Ugo", "--gives", "1 sp", "--gets", "Hardtack 1")).toBe("Lena has no money to pay 1 sp. Nothing changed.");
        expect(file("characters/Ugo.md")).toContain("[[Hardtack]] 4");
        expect(file("characters/Ettore.md")).toContain("money: 2 gp 3 cp");
    });

    it("hands over an item with a story of its own as move does, and takes a kind out of equipped when none is left", async () => {
        await ok("write", "Mazza", "--type", "item", "--set", "item=[[Iron Ring]]");
        await ok("move", "Mazza", "--to", "Ettore");
        await ok("trade", "Ettore", "--with", "Bottega di Ugo", "--gives", "2 sp", "--gets", "Lantern");
        await ok("write", "Ettore", "--add", "equipped=[[Lantern]]");
        expect(await ok("show", "Ettore")).toContain("Lantern");
        const sold = await ok("trade", "Ettore", "--with", "Ugo", "--gives", "Mazza", "--gives", "Lantern", "--gets", "3 sp");
        expect(sold).toContain("Ettore gave Ugo 1 Lantern, Mazza, and got 3 sp.");
        expect(sold).toContain("Ettore has Lantern equipped no more.");
        expect(file("characters/Ugo.md")).toContain("[[Mazza]]");
        expect(file("characters/Ettore.md")).not.toContain("equipped");
    });
});

describe("STK-11, STK-13: a kind equipped, and validate", () => {
    it("equips a kind carried in a stack, whose formulas give the attacks", async () => {
        await ok("write", "Ettore", "--add", "inventory=[[Lantern]] 2", "--add", "equipped=[[Lantern]]");
        expect(await ok("validate")).toBe("No problems.");
        await ok("change", "Ettore", "Lantern", "--spend", "2");
        expect(file("characters/Ettore.md")).not.toContain("equipped");
    });

    it("reports a number named as goods, which should be a stack", async () => {
        await ok("write", "Lena", "--set", "rushlights=7", "--set", "hardtacks=20");
        const problems = await ok("validate");
        expect(problems).toContain('Lena counts rushlights: 7 as a number, which no command spends: goods are a stack of Rushlight in inventory. Fix: write Lena, unset rushlights, add inventory="[[Rushlight]] 7".');
        expect(problems).toContain('add inventory="[[Hardtack]] 20"');
    });

    it("says to quote a stack written by hand without quotes", async () => {
        writeFileSync(join(folder, "world", "characters", "Lena.md"), "---\nrole: companion\ninventory:\n  - [[Rushlight]] 7\n---\n");
        expect(await ok("validate")).toContain('A stack in a list goes in quotes, such as - "[[Name]] 7".');
    });

    it("refuses a condition of an event on a kind of the campaign, which can never hold", async () => {
        await ok("write", "Lembas", "--type", "item");
        await ok("write", "Ettore", "--add", "inventory=[[Lembas]] 3");
        expect(await refused("write", "Fame", "--type", "event", "--set", "when=[[Lembas]] in party")).toContain("[[Lembas]] is a kind, counted in stacks: never anywhere, so the condition on it can never hold.");
    });
});

describe("rename keeps the stacks and the links with a folder", () => {
    it("renames a kind in its stacks, with count and label, and a link written with its folder", async () => {
        await ok("write", "Lembas", "--type", "item");
        await ok("write", "Lena", "--add", "inventory=[[Lembas|pane]] 10");
        await ok("write", "Spada", "--type", "item");
        writeFileSync(join(folder, "world", "characters", "Ettore.md"), '---\nrole: pc\ninventory: ["[[items/Spada.md]]"]\n---\n');
        await ok("rename", "Lembas", "Pane elfico");
        await ok("rename", "Spada", "Lama");
        expect(file("characters/Lena.md")).toContain("[[Pane elfico|pane]] 10");
        expect(await ok("show", "Lama")).toContain("Is in: Ettore");
    });
});

describe("after the round on the code: what the master is told, and trade written whole", () => {
    beforeEach(async () => {
        await ok("write", "Bottega di Ugo", "--type", "place", "--add", "contains=[[Rushlight]] 10");
        await ok("write", "Ugo", "--type", "character", "--set", "role=npc", "--set", "money=5 gp");
        await ok("move", "Ugo", "--to", "Bottega di Ugo");
    });

    it("counts a kind written twice on a side of a trade once, with both counts, and refuses what is no count", async () => {
        await ok("write", "Ettore", "--set", "inventory=[[Rushlight|torce]] 7");
        expect(await refused("trade", "Ettore", "--with", "Ugo", "--gives", "Rushlight 5", "--gives", "torce 3", "--gets", "1 gp")).toBe("Ettore has 7 torce: cannot give 8. Nothing changed.");
        expect(await refused("trade", "Ettore", "--with", "Bottega di Ugo", "--gets", "[[Rushlight]] 0")).toContain('"[[Rushlight]] 0" is no count of goods');
        expect(file("characters/Ettore.md")).toContain("[[Rushlight|torce]] 7");
    });

    it("sends a trade with a merchant to the shop that has the goods, and a receiver keeps its own label", async () => {
        expect(await refused("trade", "Ettore", "--with", "Ugo", "--gives", "1 gp", "--gets", "Rushlight 5")).toBe(
            "Ugo has no Rushlight, but Bottega di Ugo, where Ugo is, has 10: trade with Bottega di Ugo. Nothing changed.",
        );
        await ok("write", "Lena", "--add", "inventory=[[Rushlight|torcia]] 2");
        await ok("move", "Rushlight", "--from", "Lena", "--to", "Ettore", "--count", "1");
        expect(file("characters/Ettore.md")).toContain('"[[Rushlight]] 8"');
    });

    it("names the stacks when change is given no field, and the kind a field named as goods means", async () => {
        expect(await refused("change", "Ettore", "rushlights", "--spend", "1")).toBe(
            'Ettore has no field "rushlights". Its stacks: Rushlight 7. Its counters and money: money 2 gp 3 cp. Goods are a stack, changed by its kind, such as change Ettore, Rushlight, spend 1.',
        );
        await ok("write", "Lembas", "--type", "item");
        expect(await refused("change", "Lena", "Lembas", "--spend", "1")).toBe('Lena has no Lembas, in inventory or inside what it holds. If the story gives some, write Lena, add inventory="[[Lembas]] 1". Nothing changed.');
    });

    it("tells write of a field named as goods in the plural, never of another number", async () => {
        expect(await ok("write", "Lena", "--set", "rushlights=3")).toContain(
            'Lena counts rushlights: 3 as a number, which no command spends: goods are a stack of Rushlight in inventory. Fix: write Lena, unset rushlights, add inventory="[[Rushlight]] 3".',
        );
        expect(await ok("write", "Ugo", "--set", "lock=15")).not.toContain("goods");
    });

    it("refuses to count a magic item with charges, which is one thing", async () => {
        expect(await refused("write", "Lena", "--add", "inventory=[[Ember Charm]] 1")).toContain("Ember Charm has charges 3/3 of its own");
    });

    it("stopped halfway, says what a trade wrote, logs it, and gives the calls that finish it, money too", async () => {
        const ettore = join(folder, "world", "characters", "Ettore.md");
        chmodSync(ettore, 0o444);
        const halfway = await refused("trade", "Ettore", "--with", "Bottega di Ugo", "--gives", "1 gp", "--gets", "Rushlight 3");
        chmodSync(ettore, 0o644);
        expect(halfway).toMatch(/^world\/characters\/Ettore\.md could not be written \(.+\)\. Written already: Bottega di Ugo: fix it, then finish with change Ettore, Rushlight, to 10; change Ettore, money, to "1 gp 3 cp"\.$/);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "counter-changed", data: { page: "Bottega di Ugo", kind: "Rushlight", before: 10, after: 7 } });
    });
});

describe("a campaign with Ironsworn, whose goods are its own kinds", () => {
    it("counts, moves and trades the campaign's kinds as the system's", async () => {
        const other = makeTempFolder();
        const run = (...args: string[]) => runCommandLine(args, testContext(other));

        try {
            await run("init", "--name", "Ferro", "--language", "it", "--system", "ironsworn");
            inPlay(other);
            await run("write", "Razione", "--type", "item");
            await run("write", "Kai", "--type", "character", "--set", "role=pc", "--add", "inventory=[[Razione]] 5");
            await run("write", "Asha", "--type", "character", "--set", "role=companion");
            expect((await run("move", "Razione", "--from", "Kai", "--to", "Asha", "--count", "2")).output).toBe("Moved 2 Razione: now in Asha.\nKai: Razione 5 → 3; Asha: Razione 0 → 2.");
            expect((await run("trade", "Kai", "--with", "Asha", "--gives", "Razione 1")).output).toContain("Kai: Razione 3 → 2; Asha: Razione 2 → 3.");
            expect((await run("validate")).output).toBe("No problems.");
        } finally {
            removeFolder(other);
        }
    });
});
