import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "grit=12/12", "--set", "arrows=2"], context);
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

// The table of cases of change (CNT-2–CNT-9): each kind of counter crossed with each way of changing it, on a character of the test system based on Ironsworn,
// whose momentum goes from -6 to a maximum the system works out, 10, above which it never goes (FOR-6). What the change gives, with its note; "same" when nothing changed; "refused" when nothing could.
const kinds = { frecce: "5", ferite: "5/12", "ferite a 0": "0/12", "ferite al massimo": "12/12", "ferite sotto": "-3/10", "ferite sopra": "15/12", momentum: "-6/10" };
const asks = ["--by=-7", "--by=7", "--by=0", "--spend=5", "--spend=6", "--to=3", "--to=max", "--to=4/8", "--to=13"];
const outcomes: Record<keyof typeof kinds, string[]> = {
    frecce: ["0: at 0, 2 beyond", "12", "same 5", "0: at 0", "refused", "3", "refused", "4/8", "13"],
    ferite: ["0/12: at 0, 2 beyond", "12/12: at max", "same 5/12", "0/12: at 0", "refused", "3/12", "12/12: at max", "4/8", "13/12: outside 0–12"],
    "ferite a 0": ["same 0/12: at 0, 7 beyond", "7/12", "same 0/12: at 0", "refused", "refused", "3/12", "12/12: at max", "4/8", "13/12: outside 0–12"],
    "ferite al massimo": ["5/12", "same 12/12: at max, 7 beyond", "same 12/12: at max", "7/12", "6/12", "3/12", "same 12/12: at max", "4/8", "13/12: outside 0–12"],
    "ferite sotto": ["same -3/10: outside 0–10, 7 beyond", "4/10", "same -3/10: outside 0–10", "refused", "refused", "3/10", "10/10: at max", "4/8", "13/10: outside 0–10"],
    "ferite sopra": ["8/12", "same 15/12: outside 0–12, 7 beyond", "same 15/12: outside 0–12", "10/12", "9/12", "3/12", "12/12: at max", "4/8", "13/12: outside 0–12"],
    momentum: ["same -6/10: at min, 7 beyond", "1/10", "same -6/10: at min", "refused", "refused", "3/10", "10/10: at max", "refused", "refused"],
};

describe("the table of cases of change", () => {
    it("CNT-2–CNT-9: gives each kind of counter what each change asks, says where it stands, and refuses what it cannot do without writing anything", async () => {
        const root = makeTempFolder();
        writeFileSync(join(root, "campaign.yaml"), "name: Prova\nsystem: ironsworn\nlanguage: it\n");
        mkdirSync(join(root, "world", "characters"), { recursive: true });
        const file = join(root, "world", "characters", "Bran.md");

        try {
            for (const [kind, start] of Object.entries(kinds)) {
                const field = kind.split(" ")[0];

                for (const [index, ask] of asks.entries()) {
                    writeFileSync(file, `---\nrole: npc\n${field}: ${start}\n---\n`);
                    const result = await runCommandLine(["change", "Bran", field, ask], testContext(root));
                    const expected = outcomes[kind as keyof typeof kinds][index];
                    const [after, note] = expected.replace(/^same /, "").split(": ");
                    const label = `${kind} ${ask}`;

                    if (expected === "refused") {
                        expect(result.exitCode, `${label}: ${result.output}`).toBe(1);
                        expect(readFileSync(file, "utf8"), label).toBe(`---\nrole: npc\n${field}: ${start}\n---\n`);
                    } else if (expected.startsWith("same ")) {
                        expect(result.output, label).toBe(`Nothing changed: ${field} on Bran is ${after}${note === undefined ? "" : `: ${note}`}.`);
                    } else {
                        expect(result.output, label).toBe(`Bran: ${field} ${start} → ${after}${note === undefined ? "" : `: ${note}`}.`);
                        expect(readFileSync(file, "utf8"), label).toBe(`---\nrole: npc\n${field}: ${after}\n---\n`);
                    }
                }
            }
        } finally {
            removeFolder(root);
        }
    });

    it("CNT-5: sets no value above a maximum the game system works out, which would read as the maximum", async () => {
        const root = makeTempFolder();
        writeFileSync(join(root, "campaign.yaml"), "name: Prova\nsystem: ironsworn\nlanguage: it\n");
        mkdirSync(join(root, "world", "characters"), { recursive: true });
        writeFileSync(join(root, "world", "characters", "Kira.md"), "---\nrole: npc\nmomentum: 0/9\ndebilities: [wounded]\n---\n");

        try {
            expect((await runCommandLine(["change", "Kira", "momentum", "--to", "10"], testContext(root))).output).toBe(
                "momentum on Kira goes no higher than its maximum, which the game system works out: 9. Give to 9 or less. Nothing changed.",
            );
        } finally {
            removeFolder(root);
        }
    });

    it("CNT-4: spends nothing below a minimum above 0, which a campaign may give", async () => {
        await rpg("config", "counters", "pazienza: {min: 2, max: 9}");
        await rpg("write", "Bruna", "--set", "pazienza=5/9");
        expect((await rpg("change", "Bruna", "pazienza", "--spend", "4")).output).toBe("Bruna has pazienza 5/9, which goes no lower than 2: cannot spend 4. Nothing changed.");
        expect((await rpg("change", "Bruna", "pazienza", "--spend", "3")).output).toBe("Bruna: pazienza 5/9 → 2/9: at min.");
        expect((await rpg("change", "Bruna", "pazienza", "--by=-3")).output).toBe("Nothing changed: pazienza on Bruna is 2/9: at min, 3 beyond.");
    });
});

describe("rpg change", () => {
    it("changes a counter on its page and logs it, public for the player's character", async () => {
        expect((await rpg("change", "bruna", "GRIT", "--by=-7", "--why", "morso del lupo")).output).toBe("Bruna: grit 12/12 → 5/12.");
        expect(brunaFile()).toBe("---\nrole: pc\ngrit: 5/12\narrows: 2\n---\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Bruna", field: "grit", before: "12/12", after: "5/12", by: -7, why: "morso del lupo" } });
    });

    it("stops at a limit with by, and says how far it went beyond", async () => {
        // The threshold's rule, what the fall means with the campaign's lethality (D-530), then what the system's code says at the down point.
        expect((await rpg("change", "Bruna", "grit", "--by=-15")).output).toBe(
            'Bruna: grit 12/12 → 0/12: at 0, 3 beyond.\ngrit is at 0, 3 beyond: read rules "Falling".\n'
                + "Bruna is down: with lethality dice, the dice decide, as the rules say. If they die, write status=dead: it says what the saves allow.\nBruna falls: one fading at the start of each of their turns, 3 and they are gone. Read rules Falling.",
        );
        expect((await rpg("change", "Bruna", "grit", "--by=20")).output).toBe('Bruna: grit 0/12 → 12/12: at max, 8 beyond.\ngrit is no longer at 0: read rules "Falling".\nBruna rises: Down ended, fading 0.');
        expect((await rpg("change", "Bruna", "grit", "--by=1")).output).toBe("Nothing changed: grit on Bruna is 12/12: at max, 1 beyond.");
    });

    it("spends only what is there", async () => {
        expect((await rpg("change", "Bruna", "arrows", "--spend", "2")).output).toBe("Bruna: arrows 2 → 0: at 0.");
        expect(await rpg("change", "Bruna", "arrows", "--spend", "1")).toEqual({ exitCode: 1, output: "Bruna has arrows 0: cannot spend 1. Nothing changed." });
    });

    it("sets a value, the maximum, or a new maximum, outside the limits too", async () => {
        expect((await rpg("change", "Bruna", "grit", "--to", "3")).output).toBe("Bruna: grit 12/12 → 3/12.");
        expect((await rpg("change", "Bruna", "grit", "--to", "max")).output).toBe("Bruna: grit 3/12 → 12/12: at max.");
        expect((await rpg("change", "Bruna", "grit", "--to", "15/15")).output).toBe("Bruna: grit 12/12 → 15/15: at max.");
        expect((await rpg("change", "Bruna", "arrows", "--to", "max")).output).toBe("arrows on Bruna has no maximum: give to a number, or write the field as current/max with write.");
    });

    it("keeps Ironsworn's momentum below 0 when set there (Ironsworn by Shawn Tomkin, CC-BY 4.0)", async () => {
        await rpg("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "momentum=2/10", "--set", "supply=5/5");
        expect((await rpg("change", "Kira", "momentum", "--to=-3")).output).toBe("Kira: momentum 2/10 → -3/10: outside 0–10.");
        expect((await rpg("change", "Kira", "momentum", "--by=2")).output).toBe("Kira: momentum -3/10 → -1/10: outside 0–10.");
        expect((await rpg("change", "Kira", "supply", "--spend", "1", "--why", "a day on the road")).output).toBe("Kira: supply 5/5 → 4/5.");
    });

    it("hides the changes of a non-player character, and shows those of what the player carries", async () => {
        await rpg("write", "Annegato 2", "--type", "character", "--set", "role=npc", "--set", "grit=22/22");
        await rpg("change", "Annegato 2", "grit", "--by=-9");
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
        expect((await rpg("write", "Bruna", "--set", "grit=5/12")).output).toBe('grit is a counter: use change, page "Bruna", field grit, to 5/12 (or by an amount). To make it something else, unset it, then set it.');
        expect((await rpg("write", "Bruna", "--set", "GRIT=5/12")).output).toBe('grit is a counter: use change, page "Bruna", field grit, to 5/12 (or by an amount). To make it something else, unset it, then set it.');
        expect((await rpg("write", "Bruna", "--set", "grit=12/12")).output).toBe("Nothing changed on Bruna: it already reads like that.");
        expect((await rpg("write", "Bruna", "--set", "kit=10/10")).exitCode).toBe(0);
    });

    it("never takes a fixed field for a counter", async () => {
        await rpg("write", "Festa", "--type", "event", "--set", "date=12/05", "--set", "status=happened");
        expect((await rpg("write", "Festa", "--set", "date=13/05")).exitCode).toBe(0);
        expect((await rpg("change", "Festa", "date", "--to", "14/05")).output).toBe("date is a fixed field of Festa, not a counter: change it with write.");
    });

    it("accepts a link as the page, max in any case, and says how to fix a quoted number", async () => {
        await rpg("change", "Bruna", "grit", "--by=-2");
        expect((await rpg("change", "[[Bruna]]", "grit", "--to", "MAX")).output).toBe("Bruna: grit 10/12 → 12/12: at max.");
        expect((await rpg("change", "Bruna#Storia", "grit", "--by=1")).output).toBe("Give the page without #Storia: a counter is a field of the page, such as page Bruna, field grit.");

        await rpg("write", "Bruna", "--set", 'frecce="20"');
        expect((await rpg("change", "Bruna", "frecce", "--by=1")).output).toBe('frecce on Bruna is the text "20": write it without quotes, such as frecce: 20, to make it a counter.');
        expect((await rpg("change", "Bruna", "arrows", "--by=9007199254740991")).output).toBe("arrows on Bruna would be too large to count exactly. Nothing changed.");
    });

    it("explains what is missing or wrong", async () => {
        expect((await rpg("change", "Bruna", "mana", "--by=1")).output).toBe('Bruna has no field "mana". Its counters: grit 12/12, arrows 2. To add one, use write, such as set mana=12/12.');
        expect((await rpg("change", "Bruna", "role", "--by=1")).output).toBe("role is a fixed field of Bruna, not a counter: change it with write.");
        expect((await rpg("change", "Bruna", "grit")).output).toBe("Give one of by (damage, healing), spend (what is paid or used up) or to (a value, max, or current/max).");
        expect((await rpg("change", "Bruna", "grit", "--by=1", "--to", "max")).exitCode).toBe(1);
        expect((await rpg("change", "Bruna", "grit", "--to", "molti")).output).toBe('"molti" is not a value for to: give a whole number, max, or current/max such as 15/15.');
        expect((await rpg("change", "Varro", "grit", "--by=1")).output).toBe("There is no page named Varro. Look for it with the find command.");
    });
});
