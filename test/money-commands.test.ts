// Money through the commands (MECCANICHE, MON-1–MON-8): config, change, write, status and validate.
/// The campaign's own coins are those of the SRD 5.2.1 (CC-BY-4.0), over the fake system's; the other campaigns use invented coins, to keep the core generic.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { change } from "../src/commands/change.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("config", "harshness", "gentle");
    await ok("config", "coins", "gp/mo 100, pp 1000 rare, ep 50 rare, sp/ma 10, cp/mr 1");
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "grit=12/12", "--set", "money=34 gp 4 sp");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "borsa=3 sp");
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

function file(path: string): string
{
    return readFileSync(join(folder, path), "utf8");
}

describe("the coins of the campaign (MON-1, MON-8)", () => {
    it("are set and shown with config, with other names and rare coins, never asked for, and checked by validate", async () => {
        expect(file("campaign.yaml")).toContain("coins:\n  gp/mo: 100\n  pp: 1000 rare\n  ep: 50 rare\n  sp/ma: 10\n  cp/mr: 1\n");
        expect(await ok("config", "coins")).toBe("coins: gp/mo 100, pp 1000 rare, ep 50 rare, sp/ma 10, cp/mr 1");
        expect((await rpg("config", "coins", "gp 100, sp 10")).output).toBe("No coin is worth 1: the smallest coin is worth 1, and the others are worth so many of it.");
        expect(await ok("config")).not.toMatch(/Still missing: .*coins/);
        expect(readLogFile(folder).find((entry) => entry.type === "config-changed" && entry.data.setting === "coins")).toMatchObject({ visibility: "public" });

        writeFileSync(join(folder, "campaign.yaml"), file("campaign.yaml").replace("cp/mr: 1", "cp/mr: 2"));
        expect(await ok("validate")).toContain(
            "- campaign.yaml: coins: No coin is worth 1: the smallest coin is worth 1, and the others are worth so many of it. Fix: fix the coins in campaign.yaml by hand, or set them again with config, each with its value in the smallest coin, or remove them from campaign.yaml to have those of the system fake.",
        );
        expect(await ok("status")).toContain("Ennio: grit 12/12");
        expect((await rpg("change", "Ennio", "money", "--spend", "5 sp")).output).toContain("money on Ennio looks like money, but the campaign's coins cannot be read: coins: No coin is worth 1");
        expect(await ok("config", "coins")).toContain("coins: cannot be read: coins: No coin is worth 1");
    });

    it("never stop the other settings from being read, however they are written by hand", async () => {
        for (const written of ["coins:", "coins: ~", "coins: gp 100, sp 10, cp 1", "coins: [gp 100, cp 1]"]) {
            writeFileSync(join(folder, "campaign.yaml"), file("campaign.yaml").replace(/coins:[\s\S]*$/, `${written}\n`));
            expect((await rpg("status")).exitCode, written).toBe(0);
            expect((await rpg("config")).exitCode, written).toBe(0);
        }

        expect(await ok("validate")).toContain("coins: coins must list each coin with its value in the smallest coin");
    });

    it("refuse a new list that would leave money already written without its coins", async () => {
        expect((await rpg("config", "coins", "corona 240, scellino 12, soldo 1")).output).toBe(
            "With these coins, money already written would no longer be money: Ennio: money 34 gp 4 sp; Varro: borsa 3 sp. Keep their coins in the list (another name works too, such as gp/mo), or change those first. Nothing changed.",
        );
        await ok("config", "coins", "oro/gp 100, argento/sp 10, rame/cp 1");
        expect(await ok("change", "Ennio", "money", "--by", "+1 rame")).toBe("Ennio: money 34 oro 4 argento → 34 oro 4 argento 1 rame (34.41 oro).");
        // The example names the campaign's coins, never another game's.
        expect((await rpg("change", "Ennio", "money", "--by", "1 rame", "--spend", "1 rame")).output).toBe(
            'Give one of by (coins received, or paid with a minus), spend (what is paid) or to (what the purse holds), such as spend "5 argento".',
        );
    });
});

describe("change on money (MON-4, MON-5, MON-7)", () => {
    it("pays as at an inn, receives coins as they are, and sets the purse", async () => {
        expect(await ok("change", "Ennio", "money", "--spend", "5 ma", "--why", "stanza")).toBe("Ennio: money 34 gp 4 sp → 33 gp 9 sp (33.9 gp): 1 gp given, 9 sp back.");
        expect(file("world/characters/Ennio.md")).toContain("money: 33 gp 9 sp\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({
            type: "counter-changed",
            visibility: "public",
            data: { page: "Ennio", field: "money", before: "34 gp 4 sp", after: "33 gp 9 sp", spend: "5 sp", given: "1 gp", back: "9 sp", why: "stanza" },
        });
        expect(await ok("change", "Ennio", "money", "--spend", "4 cp")).toBe("Ennio: money 33 gp 9 sp → 33 gp 8 sp 6 cp (33.86 gp): 1 sp given, 6 cp back.");
        expect(await ok("change", "Ennio", "money", "--by", "+5 SP 20 mo")).toBe("Ennio: money 33 gp 8 sp 6 cp → 53 gp 13 sp 6 cp (54.36 gp).");
        expect(await ok("change", "Ennio", "money", "--by=-60 cp")).toBe("Ennio: money 53 gp 13 sp 6 cp → 53 gp 7 sp 6 cp (53.76 gp): paid with 6 sp.");
        expect(await ok("change", "Ennio", "money", "--to", "50 mo")).toBe("Ennio: money 53 gp 7 sp 6 cp → 50 gp.");
        expect(await ok("change", "Varro", "borsa", "--spend", "3 sp")).toBe("Varro: borsa 3 sp → 0 gp.");
        expect(readLogFile(folder).at(-1)).toMatchObject({ visibility: "hidden", data: { page: "Varro" } });
        expect(await ok("status")).toContain("Ennio: grit 12/12 · money 50 gp");
    });

    it("refuses what cannot be paid, and says what is not money", async () => {
        const refusals: [string[], string][] = [
            [["change", "Varro", "borsa", "--spend", "5 sp"], "Varro has borsa 3 sp (0.3 gp): cannot pay 5 sp (0.5 gp). Nothing changed."],
            [["change", "Ennio", "money", "--spend", "5"], '"5" is not coins for money on Ennio: give coins of the campaign (gp/mo, pp, ep, sp/ma, cp/mr), such as spend "5 gp".'],
            [["change", "Ennio", "money", "--spend", "5 zecchini"], '"5 zecchini" is not coins for money on Ennio: give coins of the campaign (gp/mo, pp, ep, sp/ma, cp/mr), such as spend "5 gp".'],
            [["change", "Ennio", "money", "--spend=-5 sp"], '"-5 sp" is not coins for money on Ennio: give coins of the campaign (gp/mo, pp, ep, sp/ma, cp/mr), such as spend "5 gp".'],
            [["change", "Ennio", "money", "--spend", "0 gp"], 'Give spend the coins paid, such as spend "5 gp".'],
            [["change", "Ennio", "money", "--to=-3"], '"-3" is not coins for money on Ennio: give coins of the campaign (gp/mo, pp, ep, sp/ma, cp/mr), such as to "3 gp".'],
            [["change", "Ennio", "money", "--by", "5 sp", "--spend", "1 sp"], 'Give one of by (coins received, or paid with a minus), spend (what is paid) or to (what the purse holds), such as spend "5 sp".'],
            [["change", "Ennio", "grit", "--by", "5 sp"], "grit on Ennio is a counter: give by a whole number, such as by -7."],
            [
                ["change", "Ennio", "oro", "--spend", "5 gp"],
                'Ennio has no field "oro". Its counters and money: grit 12/12, money 34 gp 4 sp. If you meant a counter of the system fake, give its name, such as grit; only one it lacks is added, with write, such as set oro=10 gp (what it holds, not the price).',
            ],
            [
                ["change", "Ennio", "pf", "--to", "max"],
                'Ennio has no field "pf". Its counters and money: grit 12/12, money 34 gp 4 sp. If you meant a counter of the system fake, give its name, such as grit; only one it lacks is added, with write, such as set pf=12/12.',
            ],
        ];

        for (const [args, message] of refusals) {
            expect((await rpg(...args)).output, args.join(" ")).toBe(message);
        }

        await ok("write", "Varro", "--set", "debito=5 zecchini", "--set", "scorte=3 razioni", "--set", "oro=15");
        expect((await rpg("change", "Varro", "debito", "--by", "1 gp")).output).toBe(
            'debito on Varro is "5 zecchini", not a counter: write a counter as a number (20) or as current/max (12/12). If it is money, zecchini is not a coin of the campaign (gp/mo, pp, ep, sp/ma, cp/mr): write it with those, or give a coin that name too with config, such as gp/zecchini.',
        );
        expect((await rpg("change", "Varro", "oro", "--spend", "5 sp")).output).toBe("oro on Varro is a number, not money: to count it in coins, set it with its coins, such as set oro=15 gp; or give spend a whole number.");
    });

    it("takes coins as text in an object, as MCP sends them", async () => {
        const result = await change.run(change.input.parse({ page: "Ennio", field: "money", spend: "1 gp 2 sp" }), context);
        expect(change.format(result)).toBe("Ennio: money 34 gp 4 sp → 33 gp 2 sp (33.2 gp).");
    });

    it("reads money that a page inherits, writes only what differs, and pays from a copy", async () => {
        await ok("write", "Bandito", "--type", "creature", "--set", "grit=11/11", "--set", "money=2 sp");
        await ok("write", "Lucio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Bandito]]");
        expect(await ok("change", "Lucio", "money", "--by", "+1 sp")).toBe("Lucio: money 2 sp → 3 sp (0.3 gp).");
        expect(file("world/characters/Lucio.md")).toContain("money: 3 sp\n");
        expect(await ok("change", "Lucio", "money", "--spend", "1 sp")).toBe("Lucio: money 3 sp → 2 sp (0.2 gp): again as Bandito.");
        expect(file("world/characters/Lucio.md")).not.toContain("money");

        await ok("scene", "open", "--title", "Strada", "--type", "combat", "--creatures", "Bandito");
        expect(await ok("change", "Bandito 1", "money", "--spend", "2 sp")).toBe("Bandito 1: money 2 sp → 0 gp.");
        expect(file("state.yaml")).toContain("money: 0 gp");
    });

    it("logs the money of a companion whose creature changes, as it does for counters", async () => {
        await ok("write", "Bandito", "--type", "creature", "--set", "grit=11/11", "--set", "money=3 sp");
        await ok("write", "Mercante", "--type", "creature", "--set", "grit=9/9", "--set", "money=5 gp");
        await ok("write", "Lucio", "--type", "character", "--set", "role=companion", "--set", "creature=[[Bandito]]");
        await ok("write", "Lucio", "--set", "creature=[[Mercante]]");
        const lines = readLogFile(folder).filter((entry) => entry.type === "counter-changed" && entry.visibility === "public");
        expect(lines.map((entry) => entry.data)).toEqual([{ page: "Lucio", field: "grit", before: "11/11", after: "9/9" }, { page: "Lucio", field: "money", before: "3 sp", after: "5 gp" }]);
    });
});

describe("write on money (MON-2, MON-6)", () => {
    it("changes money that is there only through change, and something else only once it is removed", async () => {
        expect((await rpg("write", "Ennio", "--set", "money=40 gp")).output).toBe(
            `Ennio's money changes only with change, page "Ennio", field money: spend pays, by adds coins, to "40 gp" sets the purse. To make it something else, unset it, then set it.`,
        );
        expect((await rpg("write", "Ennio", "--set", "money=nessuna")).exitCode).toBe(1);
        await ok("write", "Ennio", "--set", "money=4 SP 34 mo");
        await ok("write", "Ennio", "--unset", "money");
        await ok("write", "Ennio", "--set", "money=nessuna");

        await ok("write", "Bandito", "--type", "creature", "--set", "money=2 sp");
        await ok("write", "Lucio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Bandito]]");
        await ok("change", "Lucio", "money", "--by", "+3 sp");
        expect((await rpg("write", "Lucio", "--unset", "money")).output).toBe(
            'Without money, Lucio would read 2 sp from Bandito, with no line in the log. Use change, page "Lucio", field money, to "2 sp": it takes the field off, and Lucio follows Bandito again.',
        );
    });

    it("writes money as the engine does, with first names from the coin worth most, and says when a value is not money", async () => {
        expect(await ok("write", "Bruna", "--type", "character", "--set", "role=npc", "--set", "money=3 MA 2 mo", "--set", "debito=12 mo e 3 ma")).toBe(
            'Created Bruna (character, world/characters/Bruna.md): set role, money, debito.\ndebito on Bruna is "12 mo e 3 ma", which is not money: write the coins one after the other, such as debito=12 gp, to count them.',
        );
        expect(file("world/characters/Bruna.md")).toContain("money: 2 gp 3 sp\n");

        await ok("write", "Bandito", "--type", "creature", "--set", "money=3 sp");
        expect(await ok("write", "Lucio", "--type", "character", "--set", "role=npc", "--set", "creature=[[Bandito]]", "--set", "money=3 SP")).toBe(
            "Created Lucio (character, world/characters/Lucio.md): set role, creature; money as Bandito.",
        );
    });
});

describe("a game with other coins, and one without money", () => {
    it("counts coins that are not decimal, by any of their names", async () => {
        await ok("write", "Varro", "--unset", "borsa");
        await ok("write", "Ennio", "--unset", "money");
        await ok("config", "coins", "corona/corone 240, scellino/scellini 12, soldo/soldi 1");
        await ok("write", "Ennio", "--set", "borsa=2 corone 5 scellini");
        expect(file("world/characters/Ennio.md")).toContain("borsa: 2 corona 5 scellino\n");
        expect(await ok("change", "Ennio", "borsa", "--spend", "7 scellini")).toBe("Ennio: borsa 2 corona 5 scellino → 1 corona 18 scellino (1.9 corona): 1 corona given, 18 scellino back.");
        expect(await ok("change", "Ennio", "borsa", "--spend", "1 soldo")).toBe("Ennio: borsa 1 corona 18 scellino → 1 corona 17 scellino 11 soldo (455 soldo): 1 scellino given, 11 soldo back.");
    });

    it("leaves money as text without coins, and says how to count it", async () => {
        const other = makeTempFolder();

        try {
            const without = testContext(other);
            await runCommandLine(["init", "--name", "Senza", "--language", "it"], without);
            await runCommandLine(["write", "Ada", "--type", "character", "--set", "role=pc", "--set", "money=5 mo", "--set", "scorte=3 razioni"], without);
            expect((await runCommandLine(["change", "Ada", "money", "--spend", "1 mo"], without)).output).toBe(
                'money on Ada is "5 mo", not a counter: write a counter as a number (20) or as current/max (12/12). If it is money, the campaign needs its coins: set them with config, naming them as written here (mo), each with its value in the smallest.',
            );
            expect((await runCommandLine(["write", "Ada", "--set", "money=6 mo"], without)).exitCode).toBe(0);
            expect((await runCommandLine(["config"], without)).output).toContain("coins: (none: neither the campaign nor its game system gives coins)");
        } finally {
            removeFolder(other);
        }
    });
});
