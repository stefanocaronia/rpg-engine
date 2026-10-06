import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "hp=12/12", "--set", "arrows=2"], context);
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

function brunaFile(): string
{
    return readFileSync(join(folder, "world", "characters", "Bruna.md"), "utf8");
}

describe("rpg change", () => {
    it("changes a counter on its page and logs it, public for the player's character", async () => {
        expect((await rpg("change", "bruna", "HP", "--by=-7", "--why", "morso del lupo")).output).toBe("Bruna: hp 12/12 → 5/12.");
        expect(brunaFile()).toBe("---\nrole: pc\nhp: 5/12\narrows: 2\n---\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Bruna", field: "hp", before: "12/12", after: "5/12", by: -7, why: "morso del lupo" } });
    });

    it("stops at a limit with by, and says how far it went beyond", async () => {
        expect((await rpg("change", "Bruna", "hp", "--by=-15")).output).toBe('Bruna: hp 12/12 → 0/12: at 0, 3 beyond.\nhp is at 0, 3 beyond: read rules "Dropping to 0 Hit Points".');
        expect((await rpg("change", "Bruna", "hp", "--by=20")).output).toBe('Bruna: hp 0/12 → 12/12: at max, 8 beyond.\nhp is no longer at 0: read rules "Dropping to 0 Hit Points".');
        expect((await rpg("change", "Bruna", "hp", "--by=1")).output).toBe("Nothing changed: hp on Bruna is 12/12: at max, 1 beyond.");
    });

    it("spends only what is there", async () => {
        expect((await rpg("change", "Bruna", "arrows", "--spend", "2")).output).toBe("Bruna: arrows 2 → 0: at 0.");
        expect(await rpg("change", "Bruna", "arrows", "--spend", "1")).toEqual({ exitCode: 1, output: "Bruna has arrows 0: cannot spend 1. Nothing changed." });
    });

    it("sets a value, the maximum, or a new maximum, outside the limits too", async () => {
        expect((await rpg("change", "Bruna", "hp", "--to", "3")).output).toBe("Bruna: hp 12/12 → 3/12.");
        expect((await rpg("change", "Bruna", "hp", "--to", "max")).output).toBe("Bruna: hp 3/12 → 12/12: at max.");
        expect((await rpg("change", "Bruna", "hp", "--to", "15/15")).output).toBe("Bruna: hp 12/12 → 15/15: at max.");
        expect((await rpg("change", "Bruna", "arrows", "--to", "max")).output).toBe("arrows on Bruna has no maximum: give to a number, or write the field as current/max with write.");
    });

    it("keeps Ironsworn's momentum below 0 when set there (Ironsworn by Shawn Tomkin, CC-BY 4.0)", async () => {
        await rpg("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "momentum=2/10", "--set", "supply=5/5");
        expect((await rpg("change", "Kira", "momentum", "--to=-3")).output).toBe("Kira: momentum 2/10 → -3/10: outside 0–10.");
        expect((await rpg("change", "Kira", "momentum", "--by=2")).output).toBe("Kira: momentum -3/10 → -1/10: outside 0–10.");
        expect((await rpg("change", "Kira", "supply", "--spend", "1", "--why", "a day on the road")).output).toBe("Kira: supply 5/5 → 4/5.");
    });

    it("hides the changes of a non-player character, and shows those of what the player carries", async () => {
        await rpg("write", "Annegato 2", "--type", "character", "--set", "role=npc", "--set", "hp=22/22");
        await rpg("change", "Annegato 2", "hp", "--by=-9");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "counter-changed", visibility: "hidden" });

        await rpg("write", "Borsa del guaritore", "--type", "item", "--set", "uses=10/10");
        await rpg("write", "Bruna", "--add", "inventory=[[Borsa del guaritore]]");
        await rpg("change", "Borsa del guaritore", "uses", "--spend", "1");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "counter-changed", visibility: "public", data: { spend: 1 } });

        await rpg("write", "Pozione", "--type", "item", "--set", "doses=2/2");
        await rpg("write", "Zaino", "--type", "item", "--add", "contains=[[Pozione]]");
        await rpg("write", "Bruna", "--add", "inventory=[[Zaino]]");
        await rpg("change", "Pozione", "doses", "--spend", "1");
        expect(readLogFile(folder).at(-1)).toMatchObject({ visibility: "public" });
    });

    it("shows the open quests and hides the others; a new quest starts planned", async () => {
        await rpg("write", "La lanterna", "--type", "quest", "--set", "progress=0/10");
        expect(readFileSync(join(folder, "world", "quests", "La lanterna.md"), "utf8")).toBe("---\nstatus: planned\nprogress: 0/10\n---\n");
        await rpg("change", "La lanterna", "progress", "--by=1");
        expect(readLogFile(folder).at(-1)).toMatchObject({ visibility: "hidden" });

        await rpg("write", "Il voto", "--type", "quest", "--set", "status=open", "--set", "progress=0/40");
        await rpg("change", "Il voto", "progress", "--by=8");
        expect(readLogFile(folder).at(-1)).toMatchObject({ visibility: "public" });

        await rpg("write", "Il voto", "--set", "status=done");
        await rpg("change", "Il voto", "progress", "--by=8");
        expect(readLogFile(folder).at(-1)).toMatchObject({ visibility: "hidden" });
    });

    it("lets write create a counter but not change it", async () => {
        expect((await rpg("write", "Bruna", "--set", "hp=5/12")).output).toBe('hp is a counter: use change, page "Bruna", field hp, to 5/12 (or by an amount). To make it something else, unset it, then set it.');
        expect((await rpg("write", "Bruna", "--set", "HP=5/12")).output).toBe('hp is a counter: use change, page "Bruna", field hp, to 5/12 (or by an amount). To make it something else, unset it, then set it.');
        expect((await rpg("write", "Bruna", "--set", "hp=12/12")).output).toBe("Nothing changed on Bruna: it already reads like that.");
        expect((await rpg("write", "Bruna", "--set", "kit=10/10")).exitCode).toBe(0);
    });

    it("never takes a fixed field for a counter", async () => {
        await rpg("write", "Festa", "--type", "event", "--set", "date=12/05", "--set", "status=happened");
        expect((await rpg("write", "Festa", "--set", "date=13/05")).exitCode).toBe(0);
        expect((await rpg("change", "Festa", "date", "--to", "14/05")).output).toBe("date is a fixed field of Festa, not a counter: change it with write.");
    });

    it("accepts a link as the page, max in any case, and says how to fix a quoted number", async () => {
        await rpg("change", "Bruna", "hp", "--by=-2");
        expect((await rpg("change", "[[Bruna]]", "hp", "--to", "MAX")).output).toBe("Bruna: hp 10/12 → 12/12: at max.");
        expect((await rpg("change", "Bruna#Storia", "hp", "--by=1")).output).toBe("Give the page without #Storia: a counter is a field of the page, such as page Bruna, field hp.");

        await rpg("write", "Bruna", "--set", 'frecce="20"');
        expect((await rpg("change", "Bruna", "frecce", "--by=1")).output).toBe('frecce on Bruna is the text "20": write it without quotes, such as frecce: 20, to make it a counter.');
        expect((await rpg("change", "Bruna", "arrows", "--by=9007199254740991")).output).toBe("arrows on Bruna would be too large to count exactly. Nothing changed.");
    });

    it("explains what is missing or wrong", async () => {
        expect((await rpg("change", "Bruna", "mana", "--by=1")).output).toBe('Bruna has no field "mana". Its counters: hp 12/12, arrows 2. To add one, use write, such as set mana=12/12.');
        expect((await rpg("change", "Bruna", "role", "--by=1")).output).toBe("role is a fixed field of Bruna, not a counter: change it with write.");
        expect((await rpg("change", "Bruna", "hp")).output).toBe("Give one of by (damage, healing), spend (what is paid or used up) or to (a value, max, or current/max).");
        expect((await rpg("change", "Bruna", "hp", "--by=1", "--to", "max")).exitCode).toBe(1);
        expect((await rpg("change", "Bruna", "hp", "--to", "molti")).output).toBe('"molti" is not a value for to: give a whole number, max, or current/max such as 15/15.');
        expect((await rpg("change", "Varro", "hp", "--by=1")).output).toBe("There is no page named Varro. Look for it with the find command.");
    });
});
