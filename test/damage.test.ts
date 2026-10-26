// Damage of a type (D-449; DMG-1, DMG-2, DMG-3): what the lists of who takes it ignore, halve or double, before temporary hit points and hit points lose it.
import { writeFileSync } from "node:fs";
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
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "grit=20/20");
});

afterEach(() => removeFolder(folder));

describe("damage of a type", () => {
    it("halves it rounded down for a resistance, takes none for an immunity, and doubles it after halving for a vulnerability (DMG-1)", async () => {
        await ok("write", "Ettore", "--add", "tough-against=fire", "--add", "immune-against=poison", "--add", "weak-against=fire");
        expect(await ok("change", "Ettore", "grit", "--by=-13", "--damage", "fire")).toBe("Ettore: grit 20/20 → 8/20: fire 13 halved, in tough-against, then doubled, in weak-against: 12.");
        expect(await ok("change", "Ettore", "grit", "--by=-5", "--damage", "poison")).toBe("Nothing changed: grit on Ettore is 8/20: poison ignored, in immune-against.");
        expect(await ok("change", "Ettore", "grit", "--by=-3", "--damage", "cold")).toBe("Ettore: grit 8/20 → 5/20.");
    });

    it("adds what an attuned item and an effect give to the page's own lists, never covering them (DMG-1)", async () => {
        await ok("write", "Ettore", "--add", "tough-against=poison");
        await ok("effect", "add", "Ettore", "Rage", "--set", "tough-against=bludgeoning, piercing, slashing");
        expect(await ok("change", "Ettore", "grit", "--by=-9", "--damage", "slashing")).toBe("Ettore: grit 20/20 → 16/20: slashing 9 halved, in tough-against: 4.");
        expect(await ok("change", "Ettore", "grit", "--by=-4", "--damage", "poison")).toBe("Ettore: grit 16/20 → 14/20: poison 4 halved, in tough-against: 2.");
        // A charm with charges is one thing: an item of the campaign derived from the system's, held and bound.
        await ok("write", "Bastone di Ettore", "--type", "item", "--set", "item=[[Ember Charm]]");
        await ok("write", "Ettore", "--add", "inventory=[[Bastone di Ettore]]", "--add", "kit=[[Bastone di Ettore]]", "--add", "bound=[[Bastone di Ettore]]");
        expect(await ok("change", "Ettore", "grit", "--by=-6", "--damage", "fire")).toBe("Ettore: grit 14/20 → 11/20: fire 6 halved, in tough-against: 3.");
    });

    it("reminds the type when damage without one reaches a page with lists, and what goes past 0 in a form (D-454)", async () => {
        await ok("write", "Ettore", "--add", "tough-against=fire");
        expect(await ok("change", "Ettore", "grit", "--by=-4")).toContain("Ettore has tough-against fire: if this damage has a type, give it with damage, as rolled.");
        await ok("effect", "add", "Ettore", "Forma d'orso", "--set", "grit=10/10");
        expect(await ok("change", "Ettore", "grit", "--by=-14")).toContain("4 went past 0 in Forma d'orso: when it ends so, what goes past may carry over to Ettore's own grit, as its text says.");
    });

    it("takes the temporary hit points first, from what is left after halving (DMG-1)", async () => {
        await ok("write", "Ettore", "--add", "tough-against=slashing", "--set", "ward=4");
        const hit = await ok("change", "Ettore", "grit", "--by=-10", "--damage", "slashing");
        expect(hit.split("\n")[0]).toBe("Ettore: grit 20/20 → 19/20: slashing 10 halved, in tough-against: 5; ward 4 → 0 first.");
        expect(hit).not.toContain("which goes first");
        // All of it on the temporary hit points, the hit points untouched.
        await ok("change", "Ettore", "ward", "--to", "8");
        expect((await ok("change", "Ettore", "grit", "--by=-6", "--damage", "slashing")).split("\n")[0]).toBe("Ettore: ward 8 → 5: slashing 6 halved, in tough-against: 3.");
    });

    it("waits for the master on a resistance that holds only for some damage, then follows what they say (DMG-3)", async () => {
        writeFileSync(
            join(folder, "world", "characters", "Lupo.md"),
            '---\nrole: npc\ngrit: 30/30\ntough-against: ["bludgeoning, piercing, and slashing from nonmagical attacks"]\n---\n',
        );
        const asked = await runCommandLine(["change", "Lupo", "grit", "--by=-9", "--damage", "piercing"], context);
        expect(asked.output).toBe(
            'Lupo has "bludgeoning, piercing, and slashing from nonmagical attacks" in tough-against, which hold only for some damage: give damage "piercing (applies)" when it holds for this one, '
                + 'or "piercing (does not apply)" (read rules "Harm"). Nothing changed.',
        );
        expect(await ok("change", "Lupo", "grit", "--by=-9", "--damage", "piercing (applies)")).toBe("Lupo: grit 30/30 → 26/30: piercing 9 halved, in tough-against: 4.");
        expect(await ok("change", "Lupo", "grit", "--by=-9", "--damage", "piercing (does not apply)")).toBe("Lupo: grit 26/30 → 17/30.");
        expect(await ok("change", "Lupo", "grit", "--by=-2", "--damage", "fire")).toBe("Lupo: grit 17/30 → 15/30.");
    });

    it("reads the lists of a creature's page on its copies in the scene, as old bones' weakness (DMG-1)", async () => {
        await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore", "--creatures", "Bone Walker=1");
        expect(await ok("change", "Bone Walker 1", "grit", "--by=-4", "--damage", "bludgeoning")).toBe("Bone Walker 1: grit 13/13 → 5/13: bludgeoning 4 doubled, in weak-against: 8.");
        expect(await ok("change", "Bone Walker 1", "grit", "--by=-4", "--damage", "poison")).toBe("Nothing changed: grit on Bone Walker 1 is 5/13: poison ignored, in immune-against.");
    });

    it("tells what someone keeps the whole damage, the temporary hit points' part too (DMG-1, EFF-14)", async () => {
        await ok("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore");
        await ok("scene", "order", "--order", "Ettore");
        await ok("effect", "add", "Ettore", "Bless", "--for", "10 rounds", "--by", "[[Ettore]]");
        await ok("change", "Ettore", "ward", "--to", "10");
        const hit = await ok("change", "Ettore", "grit", "--by=-15", "--damage", "slashing");
        expect(hit).toContain("Ettore: grit 20/20 → 15/20: ward 10 → 0 first.");
        expect(hit).toContain("Ettore keeps Bless (Ettore): lost 15 grit. Read rules Holding.");
    });

    it("asks of an item that names no type, as damage from spells, says what to do when conditions in several lists do not all hold, and refuses a list written as text (DMG-3)", async () => {
        const npc = (name: string, lines: string[]): void => writeFileSync(join(folder, "world", "characters", `${name}.md`), ["---", "role: npc", "grit: 30/30", ...lines, "---", ""].join("\n"));
        npc("Mago", ['tough-against: ["damage from spells"]']);
        expect((await runCommandLine(["change", "Mago", "grit", "--by=-8", "--damage", "fire"], context)).output).toContain('Mago has "damage from spells" in tough-against, which hold only for some damage');
        expect(await ok("change", "Mago", "grit", "--by=-8", "--damage", "fire (applies)")).toBe("Mago: grit 30/30 → 26/30: fire 8 halved, in tough-against: 4.");
        npc("Raksha", ['weak-against: ["piercing from magic weapons wielded by good creatures"]', 'immune-against: ["bludgeoning, piercing, and slashing from nonmagical attacks"]']);
        expect((await runCommandLine(["change", "Raksha", "grit", "--by=-8", "--damage", "piercing"], context)).output).toContain("; when they do not all hold, give the damage worked out, without damage");
        npc("Scritto", ["tough-against: fire, cold"]);
        expect((await runCommandLine(["change", "Scritto", "grit", "--by=-8", "--damage", "fire"], context)).output).toBe(
            'Scritto\'s tough-against is text, "fire, cold": write it as a list, such as tough-against: [bludgeoning, cold]. Nothing changed.',
        );
    });

    it("rolls dice given as by, its sign in front, and logs the roll for the player once the change is made (D-459)", async () => {
        // In view, the dice on the player character are shown as any roll (D-287).
        await ok("config", "master-rolls", "in view");
        await ok("write", "Ettore", "--add", "tough-against=slashing");
        // A minus before more than one term reads two ways: brackets say which (playtest 08).
        expect((await runCommandLine(["change", "Ettore", "grit", "--by=-1d8-2", "--damage", "slashing"], context)).output).toBe(
            "by -1d8-2 reads two ways: put the roll in brackets after the minus, such as by -(1d8+2), which takes away 1d8+2. Nothing changed.",
        );
        expect((await runCommandLine(["change", "Ettore", "grit", "--by=-(2d6)+3", "--damage", "slashing"], context)).output).toBe(
            "by -(2d6)+3 does not read as a roll: put the whole roll in brackets after the sign, such as by -(2d6+3), which takes away 2d6+3. Nothing changed.",
        );
        const hit = await ok("change", "Ettore", "grit", "--by=-(2d6+3)", "--damage", "slashing", "--why", "il morso del lupo");
        const total = Number(/^Rolled 2d6\+3 = (\d+) \[\d+, \d+\] \+ 3\.\n/.exec(hit)?.[1]);
        expect(hit).toContain(`Ettore: grit 20/20 → ${20 - Math.floor(total / 2)}/20: slashing ${total} halved, in tough-against: ${Math.floor(total / 2)}.`);
        expect(readLogFile(folder).filter((entry) => entry.type === "roll").at(-1)).toMatchObject({ visibility: "public", data: { notation: "2d6+3", total, why: "il morso del lupo", physical: false } });
        expect(await ok("change", "Ettore", "grit", "--by", "1d4+1")).toMatch(/^Rolled 1d4\+1 = \d+ \[\d\] \+ 1\.\nEttore: grit \d+\/20 → \d+\/20(: at max)?\.$/);
        // A change refused rolls nothing the log keeps; coins are no dice.
        const rolls = readLogFile(folder).filter((entry) => entry.type === "roll").length;
        expect((await runCommandLine(["change", "Ettore", "grit", "--by=-1d6", "--damage", "fuoco"], context)).exitCode).toBe(1);
        expect(readLogFile(folder).filter((entry) => entry.type === "roll").length).toBe(rolls);
        await ok("write", "Ettore", "--set", "money=10 crown");
        expect(await ok("change", "Ettore", "money", "--by", "+2 crown")).toBe("Ettore: money 10 crown → 12 crown.");
    });

    it("refuses a type the system does not name, damage without by negative, and another counter (DMG-2)", async () => {
        expect((await runCommandLine(["change", "Ettore", "grit", "--by=-5", "--damage", "fuoco"], context)).output).toMatch(/^"fuoco" is no damage type of fake: give one of bludgeoning, cold, .*\. Nothing changed\.$/);
        expect((await runCommandLine(["change", "Ettore", "grit", "--by=5", "--damage", "fire"], context)).output).toBe(
            "A damage type goes with by, negative, the damage before Ettore's lists change it, such as by -12, damage fire. Nothing changed.",
        );
        await ok("write", "Ettore", "--set", "ward=3");
        expect((await runCommandLine(["change", "Ettore", "ward", "--by=-1", "--damage", "fire"], context)).output).toBe(
            "A damage type goes with grit, not ward: change Ettore grit --by=-12 --damage fire. Nothing changed.",
        );
    });
});

describe("the dice of change behind the screen (D-287)", () => {
    const rolls = () => readLogFile(folder).filter((entry) => entry.type === "roll");
    const shownRolls = async () => (JSON.parse(await ok("view", "--json")) as { rolls: unknown[]; }).rolls;

    it("hide the dice on the player character or a companion, as the master's roll, sealed for a reveal, while the setting is unset or behind the screen", async () => {
        await ok("write", "Bruna", "--type", "character", "--set", "role=companion", "--set", "grit=12/12");
        const hit = await ok("change", "Ettore", "grit", "--by=-(2d6+3)", "--why", "il morso del lupo");
        expect(hit).toMatch(
            /^Hidden roll (\S+), only for the master: 2d6\+3 = 11 \[4, 4\] \+ 3\. Behind the screen, as master-rolls says: tell only the outcome, in the story\.\nIts fingerprint, only if the player asks for it: [0-9a-f]{16}\nEttore: grit 20\/20 → 9\/20\.$/,
        );
        await ok("config", "master-rolls", "behind the screen");
        expect(await ok("change", "Bruna", "grit", "--by=-(1d6)")).toMatch(/^Hidden roll \S+, only for the master: 1d6 = 4 \[4\]\. Behind the screen/);
        expect(rolls().map((entry) => [entry.visibility, typeof entry.data.proof])).toEqual([["hidden", "string"], ["hidden", "string"]]);
        // What the player sees is the change, never the dice: no roll in the view; the roll is revealed as any hidden one.
        expect(readLogFile(folder).find((entry) => entry.type === "counter-changed" && entry.data.page === "Ettore")).toMatchObject({ visibility: "public", data: { by: -11 } });
        expect(await shownRolls()).toEqual([]);
        const id = /^Hidden roll (\S+),/.exec(hit)?.[1] ?? "";
        expect(await ok("roll", "--reveal", id)).toContain(`Hidden roll ${id} revealed: 2d6+3 = 11 [4, 4] + 3.`);
    });

    it("show the dice of healing on the party, and of damage on a foe's copy in the scene, as the party's rolls", async () => {
        await ok("change", "Ettore", "grit", "--to", "5");
        expect(await ok("change", "Ettore", "grit", "--by=+(2d4+2)", "--why", "pozione")).toBe("Rolled 2d4+2 = 10 [4, 4] + 2.\nEttore: grit 5/20 → 15/20.");
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--creatures", "Bog Hound=1");
        expect(await ok("change", "Bog Hound 1", "grit", "--by=-(1d8+2)")).toMatch(/^Rolled 1d8\+2 = 6 \[4\] \+ 2\.\nBog Hound 1: grit /);
        expect(rolls().map((entry) => entry.visibility)).toEqual(["public", "public"]);
        expect(await shownRolls()).toHaveLength(2);
    });

    it("hide the dice on a page that does not concern the player, as its change, in view too", async () => {
        await ok("config", "master-rolls", "in view");
        await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "grit=15/15");
        expect(await ok("change", "Varro", "grit", "--by=-(1d4)")).toMatch(/^Hidden roll \S+, only for the master: 1d4 = 4 \[4\]\nIts fingerprint, only if the player asks for it: [0-9a-f]{16}\nVarro: grit 15\/15 → 11\/15\.$/);
        expect(readLogFile(folder).filter((entry) => ["roll", "counter-changed"].includes(entry.type)).map((entry) => [entry.type, entry.visibility, typeof entry.data.proof])).toEqual([
            ["counter-changed", "hidden", "undefined"],
            ["roll", "hidden", "string"],
        ]);
        expect(await shownRolls()).toEqual([]);
    });

    it("show the dice on the party too in view", async () => {
        await ok("config", "master-rolls", "in view");
        expect(await ok("change", "Ettore", "grit", "--by=-(2d6+3)")).toBe("Rolled 2d6+3 = 11 [4, 4] + 3.\nEttore: grit 20/20 → 9/20.");
        expect(rolls().map((entry) => [entry.visibility, entry.data.proof])).toEqual([["public", undefined]]);
        expect(await shownRolls()).toHaveLength(1);
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
