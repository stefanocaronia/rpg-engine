// The game system's data for the engine (MECCANICHE, DAT-1–DAT-7), through the commands on the fake system: its coins, the line and the sheet, thresholds,
// recipes, conditions and rounds, and their laws on worlds at random; then systems of the test's own. The same on the 5e is in the 5e's repository.
import fc from "fast-check";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, madeSystem, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(campaign);

afterEach(() => removeFolder(folder));

/** A campaign in Italian with the fake system: Ennio, a Warden, and Lena, a companion derived from a Reed Cutter, both wounded at the inn. */
async function campaign(): Promise<void>
{
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("config", "harshness", "gentle");
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Locanda", "--type", "place");
    await ok("write", "Ennio", "--type", "character", ...["role=pc", "vocations=[[Warden]] 1", "might=3", "grace=3", "wit=3", "grit=5/9"].flatMap((field) => ["--set", field]));
    await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "creature=[[Reed Cutter]]", "--set", "grit=2/7");
    await ok("write", "Locanda", "--add", "contains=[[Ennio]]", "--add", "contains=[[Lena]]");
}

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

/** The page of a character, as written. */
function character(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8");
}

describe("the coins of the system (DAT-1)", () => {
    it("are the campaign's when it writes none, and config says where they come from; a payment gives change in them", async () => {
        expect(await ok("config")).toContain("coins: crown 240, mark 160 rare, shilling 12, penny 1 (from the system fake)");
        await ok("write", "Ennio", "--set", "money=3 crown 4 shilling");
        expect(await ok("change", "Ennio", "money", "--spend", "5 shilling")).toContain("Ennio: money 3 crown 4 shilling → 2 crown 19 shilling");
    });

    it("give way, whole, to the campaign's own", async () => {
        await ok("config", "coins", "corona 240, scellino 12, soldo 1");
        const shown = await ok("config");
        expect(shown).toContain("coins: corona 240, scellino 12, soldo 1");
        expect(shown).not.toContain("from the system");
    });
});

describe("the character sheet (DAT-2)", () => {
    it("orders the status line as the system says, with its numbers, hides what is marked at zero, and keeps after it the other counters with a maximum", async () => {
        await ok("write", "Ennio", "--set", "ward=0", "--set", "fading=0", "--set", "frecce=18/20", "--set", "anni=30");
        expect(await ok("status")).toContain("PC: Ennio, in Locanda: level 1 · grit 5/9 · guard 7 · stamina-d6 1/1 · rallies 1/1 · frecce 18/20\n");
        await ok("change", "Ennio", "fading", "--by", "1");
        expect(await ok("status")).toContain("guard 7 · stamina-d6 1/1 · fading 1 · rallies 1/1 · frecce 18/20");
        // A number written without a maximum is not something spent: it stays out of the line (D-430).
        expect(await ok("status")).not.toContain("anni");
    });

    it("shows a value written by hand as it reads, never one written as a map", async () => {
        const path = join(folder, "world", "characters", "Ennio.md");
        writeFileSync(path, readFileSync(path, "utf8").replace("grit: 5/9\n", "grit: 5/9\nward:\n  base: 2\n  charm: 1\nresolve: molto\n"));
        expect(await ok("status")).toContain("PC: Ennio, in Locanda: level 1 · grit 5/9 · resolve molto · guard 7");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("\nEnnio: grit 5/9 → 9/9");
    });

    it("lists the sheet's fields before there is a player character, says which a new one lacks, and keeps saying it in status", async () => {
        const empty = makeTempFolder();
        const other = { ...context, folder: empty };
        await runCommandLine(["init", "--name", "Nuova", "--system", "fake"], other);
        expect((await runCommandLine(["status"], other)).output).toContain(
            "No player character yet. The system fake keeps on a character sheet, by these names: vocations, renown, might, grace, wit, skilled, grit, resolve, stride; and when they apply:",
        );
        // How a character is made: the system's part of session zero, after the core's (D-235, MOD-5).
        writeFileSync(join(empty, "state.yaml"), "mode: session zero\n");
        expect((await runCommandLine(["instructions"], other)).output).toContain("Choose the vocations first, with their ranks, and then might, grace and wit, from 1 to 7.");
        expect((await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "grit=8/8"], other)).output).toContain(
            "Bruna's sheet of the system fake still lacks, by these names: vocations, renown, might, grace, wit, skilled, resolve, stride.",
        );
        // In play status reminds what a sheet lacks (D-190).
        writeFileSync(join(empty, "state.yaml"), "mode: play\n");
        expect((await runCommandLine(["status"], other)).output).toContain("Bruna's sheet still lacks, by these names: vocations, renown, might, grace, wit, skilled, resolve, stride.");
        removeFolder(empty);
    });

    it("gives the same line to the player character and the companions in a scene, with their effects, and all their counters to the others", async () => {
        await ok("write", "Ennio", "--set", "ward=0", "--set", "frecce=18");
        await ok("effect", "add", "Ennio", "Dazed", "--for", "1h");
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "creature=[[Reed Cutter]]", "--set", "grit=3/4");
        await ok("write", "Rosa", "--type", "character", "--set", "role=npc");
        await ok("effect", "add", "Rosa", "Benedetta", "--for", "1h");
        await ok("write", "Locanda", "--add", "contains=[[Gaspare]]", "--add", "contains=[[Rosa]]");
        expect(await ok("scene", "open", "--title", "Rissa", "--type", "combat", "--with", "Ennio", "--with", "Lena", "--with", "Gaspare", "--with", "Rosa")).toContain(
            "In it: Ennio: level 1 · grit 5/9 · guard 7 · stamina-d6 1/1 · rallies 1/1 · Dazed until day 1, 19:00; Lena: grit 2/7 · guard 6; Gaspare: grit 3/4; Rosa: Benedetta until day 1, 19:00.",
        );
    });

    it("asks no sheet of a companion that derives from a creature, and stops asking for a dead one", async () => {
        expect(await ok("write", "Zanna", "--type", "character", "--set", "role=companion", "--set", "creature=[[Bog Hound]]")).not.toContain("still lacks");
        expect(await ok("status")).not.toContain("Lena's sheet");
        expect(await ok("write", "Bruno", "--type", "character", "--set", "role=companion")).toContain("Bruno's sheet of the system fake still lacks");
        expect(await ok("status")).toContain("Bruno's sheet still lacks");
        await ok("write", "Bruno", "--set", "status=dead");
        expect(await ok("status")).not.toContain("Bruno's sheet");
    });
});

describe("thresholds (DAT-3)", () => {
    it("name the rule when a counter of the party reaches the value, takes more at it, or leaves it", async () => {
        expect(await ok("change", "Ennio", "grit", "--by=-9")).toContain('grit is at 0, 4 beyond: read rules "Falling".');
        expect(await ok("change", "Ennio", "grit", "--by=-2")).toContain('grit is at 0 and took 2 more: read rules "Falling".');
        expect(await ok("change", "Ennio", "grit", "--by", "3")).toContain('grit is no longer at 0: read rules "Falling".');
        expect(await ok("change", "Lena", "grit", "--by=-2")).toContain('grit is at 0: read rules "Falling".');
    });

    it("name the rule when a change goes past the value without stopping on it", async () => {
        await ok("write", "Ennio", "--set", "resolve=1/3");
        expect(await ok("change", "Ennio", "resolve", "--by=-9")).toContain('resolve is at -3, 5 beyond: read rules "Breaking".');
        await ok("change", "Ennio", "resolve", "--to=-2");
        expect(await ok("change", "Ennio", "resolve", "--to", "0/3")).toBe("Ennio: resolve -2/3 → 0/3.");
        await ok("write", "Ennio", "--set", "fading=2");
        expect(await ok("change", "Ennio", "fading", "--by", "2")).toContain('fading went past 3, from 2 to 4: read rules "Gone".');
    });

    it("give the text of the rule at every change of a field without a value, with the precedents on it, and a house rule first", async () => {
        await ok("write", "Ennio", "--set", "resolve-loss=0/5");
        expect(await ok("change", "Ennio", "resolve-loss", "--by", "1")).not.toContain("Precedents");
        await ok("config", "precedents", "--add", "Hunger: chi dorme all'aperto d'inverno perde anche lui.", "--add", "Hunger: anche chi non beve.", "--add", "Wards: ai lati.");
        const output = await ok("change", "Ennio", "resolve-loss", "--by", "1");
        expect(output).toContain("resolve-loss changed: Hunger, from the rules of fake:\n## Hunger");
        expect(output).toContain("Precedents of the table: Hunger: chi dorme all'aperto d'inverno perde anche lui. · Hunger: anche chi non beve.\nWhen the text and a precedent disagree, tell the player");
        expect(output).not.toContain("Wards: ai lati");
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Fame.md"), "# Hunger\n\nOgni giorno senza pane toglie 1 ai tiri.\n");
        const house = await ok("change", "Ennio", "resolve-loss", "--by", "1");
        expect(house).toContain("resolve-loss changed: Hunger, from the house rules:\n# Hunger\n\nOgni giorno senza pane toglie 1 ai tiri.\n\nPrecedents of the table: Hunger:");
        expect(house).not.toContain("When the text and a precedent disagree");
    });

    it("say nothing for a page outside the party or a copy in a scene", async () => {
        await ok("write", "Cane", "--type", "creature", "--set", "creature=[[Bog Hound]]");
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "grit=4/4");
        expect(await ok("change", "Gaspare", "grit", "--by=-9")).not.toContain("read rules");
        await ok("scene", "open", "--title", "Cani", "--type", "combat", "--creatures", "Cane=1");
        expect(await ok("change", "Cane 1", "grit", "--by=-20")).not.toContain("read rules");
    });

    it("say when the value is an effect's", async () => {
        // On a companion whose maximum is her creature's, which an effect may give.
        await ok("effect", "add", "Lena", "Forma di cinghiale", "--set", "grit=10/34");
        expect(await ok("change", "Lena", "grit", "--by=-12")).toContain('grit is at 0 in Forma di cinghiale, 2 beyond: read rules "Falling".');
    });
});

describe("recipes (DAT-4, DAT-5)", () => {
    it("bring back the party where the player character is, end the effects until the rest first, and say which counters are left away from their usual value", async () => {
        await ok("write", "Ennio", "--set", "ward=4", "--set", "resolve-loss=1/5");
        await ok("change", "Ennio", "rallies", "--to", "0");
        await ok("effect", "add", "Ennio", "Prosciugato", "--for", "night's sleep", "--set", "grit=4");
        await ok("effect", "add", "Ennio", "Ombra", "--for", "breather");
        await ok("effect", "add", "Ennio", "Benedetto", "--for", "1h");
        const rested = await ok("change", "--recipe", "night's sleep", "--why", " ");
        expect(rested.split("\n\nresolve-loss changed")[0]).toBe([
            "Night's sleep (a recipe of the system fake):",
            "Ennio: Prosciugato ended; Ombra ended; grit 5/9 → 9/9; ward 4 → 0; rallies 0/1 → 1/1; resolve-loss 1/5 → 0/5.",
            // The shield that goes is named with its rule, after whose it was (DAT-3, D-268).
            'ward is at 0: read rules "Wards".',
            "Lena: grit 2/7 → 7/7 (again as Reed Cutter).",
            'For the rest, read rules "Rest".',
            "The game date did not move: apply a rest once its hours (7h) have passed; if they have not yet, advance them now.",
        ].join("\n"));
        expect(character("Ennio")).toContain("Benedetto until day 1, 19:00");
        expect(character("Lena")).not.toContain("grit:");
        const lines = readLogFile(folder).filter((entry) => entry.data.why === "night's sleep").map((entry) => [entry.type, entry.data.page, entry.data.field ?? entry.data.effect, entry.visibility]);
        expect(lines).toEqual([
            ["effect-ended", "Ennio", "Prosciugato", "public"],
            ["effect-ended", "Ennio", "Ombra", "public"],
            ["counter-changed", "Ennio", "grit", "public"],
            ["counter-changed", "Ennio", "ward", "public"],
            ["counter-changed", "Ennio", "rallies", "public"],
            ["counter-changed", "Ennio", "resolve-loss", "public"],
            ["counter-changed", "Lena", "grit", "public"],
        ]);
    });

    it("change a value an effect gives on the effect, give the notes of change, and leave the dead out and who began at 0", async () => {
        await ok("effect", "add", "Lena", "Forma di cinghiale", "--set", "grit=20/34");
        await ok("change", "Ennio", "grit", "--to", "0");
        await ok("write", "Bruno", "--type", "character", "--set", "role=companion", "--set", "grit=0/9", "--set", "status=dead");
        await ok("write", "Locanda", "--add", "contains=[[Bruno]]");
        const output = await ok("change", "--recipe", "night's sleep", "--why", "una notte alla locanda");
        expect(output).toContain(
            "Lena: grit 20/34 → 34/34 (in Forma di cinghiale). Still on Lena, with no end: Forma di cinghiale. Read in their text whether a rest asks for something.\n",
        );
        expect(output).toContain("At 0 grit when it began, Ennio gains nothing from it.");
        expect(output).not.toContain("Bruno");
        expect(character("Lena")).toContain("grit: 2/7\n");
        expect(character("Lena")).toContain("Forma di cinghiale (grit: 34/34)");
        expect(readLogFile(folder).filter((entry) => entry.data.why === "una notte alla locanda")).toHaveLength(1);
        await ok("write", "Ennio", "--set", "status=dead");
        expect(await refused("change", "--recipe", "night's sleep")).toBe("There is no living player character, so a recipe without a page goes to no one: give the page. Nothing changed.");
    });

    it("check every page before writing any", async () => {
        writeFileSync(join(folder, "world", "Lena.md"), "Un'altra Lena.\n");
        expect(await refused("change", "--recipe", "night's sleep")).toContain("Two pages have the same name");
        expect(character("Ennio")).toContain("grit: 5/9\n");
        removeFolder(join(folder, "world", "Lena.md"));
        const path = join(folder, "world", "characters", "Lena.md");
        writeFileSync(path, readFileSync(path, "utf8").replace("---\n", '---\neffects:\n  - "Maledetta until night\'s sleep"\n  - "Maledetta until breather"\n'));
        expect(await refused("change", "--recipe", "night's sleep")).toContain("Lena's effects do not read");
        expect(character("Ennio")).toContain("grit: 5/9\n");
    });

    it("go to the page given, never to a copy, and are refused when the system has none by that name, with how to quote one", async () => {
        await ok("write", "Ennio", "--set", "ward=4");
        expect(await ok("change", "Ennio", "--recipe", "breather")).toContain(
            'Breather (a recipe of the system fake):\nEnnio: nothing changed. Ask the player how many of stamina-d6 1/1 they spend, then change with spend and recipe "breather". Not brought back: grit 5/9.',
        );
        expect(await refused("change", "Ennio", "--recipe", "riposo")).toBe('The system fake has no recipe "riposo". Its recipes: night\'s sleep, breather. Nothing changed.');

        for (const [parameter, value] of [["--by", "1"], ["--spend", "1"], ["--to", "3"]]) {
            expect(await refused("change", "Ennio", "--recipe", "night's sleep", parameter, value)).toContain("A recipe changes by itself the fields it names");
        }

        expect(await refused("change", "Ennio", "grit", "--recipe", "night's sleep")).toContain('alone for the player character and the companions with them, such as recipe "night\'s sleep".');
        // The examples with the system's own counter, rest and pool of dice, never the 5e's (D-514).
        expect(await refused("change", "Ennio")).toBe('Give the page and the field, such as page Ennio, field grit, by -3; or a recipe of the game system, such as recipe "night\'s sleep".');
        expect(await refused("change", "Ennio", "grit", "--values", "4")).toBe(
            'Give values with the dice of a recipe: page, field, spend and recipe, such as page Ennio, field stamina-d6, spend 2, recipe "breather", values 6,1. Nothing changed.',
        );
        expect(await refused("change", "--recipe", "night's", "sleep")).toBe("Put the recipe's name in quotes, such as recipe \"night's sleep\". Nothing changed.");
        await ok("change", "Ennio", "grit", "--to", "0");
        expect(await ok("change", "Ennio", "--recipe", "breather")).toContain(
            'Ennio: nothing changed. Ask the player how many of stamina-d6 1/1 they spend, then change with spend and recipe "breather". Not brought back: grit 0/9 (rules "Falling").',
        );
        await ok("write", "Mira", "--type", "character", "--set", "role=pc", "--set", "grit=1/6");
        expect(await ok("change", "--recipe", "night's sleep")).toContain("Mira: grit 1/6 → 6/6.");
        await ok("write", "Cane", "--type", "creature", "--set", "creature=[[Bog Hound]]");
        await ok("scene", "open", "--title", "Cani", "--type", "combat", "--creatures", "Cane=1");
        expect(await refused("change", "Cane 1", "--recipe", "night's sleep")).toContain("Cane 1 is a copy in the scene: a recipe goes to pages");
    });

    it("leave an effect until an occasion to the recipe alone, and validate reports one the system does not know", async () => {
        await ok("effect", "add", "Ennio", "Prosciugato", "--for", "night's sleep");
        await ok("advance", "--by", "2d");
        expect(await ok("status")).toContain("Prosciugato until night's sleep");
        writeFileSync(join(folder, "world", "characters", "Lena.md"), '---\nrole: companion\ncreature: "[[Reed Cutter]]"\neffects:\n  - "Stanca until dawn"\n---\n');
        const problems = await ok("validate");
        expect(problems).toContain('Stanca on Lena ends "dawn", which is not a game date nor an occasion of the system fake (night\'s sleep, breather).');
        expect(problems).not.toContain("Prosciugato");
    });
});

describe("a game system that is not installed, or not chosen yet (SYS-1, D-167)", () => {
    it("comes first in the fixes of an occasion and of a link that may be its own, and in the message of a duration that does not read", async () => {
        await ok("effect", "add", "Ennio", "Prosciugato", "--for", "night's sleep");
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: fake", "system: faux"));
        expect(await ok("validate")).toContain(
            'Fix: if it is an occasion of the system faux, which is not installed, fix the system first, as the problem on campaign.yaml says; otherwise effect end Ennio "Prosciugato"',
        );
        expect(await refused("effect", "add", "Ennio", "Ombra", "--for", "breather")).toContain("The campaign's system, faux, is not installed");
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: faux\n", ""));
        expect(await refused("show", "Bog Hound")).toContain("The campaign has no game system yet, so none of its pages can be found: choose it with config.");
        expect(await refused("change", "--recipe", "night's sleep")).toBe('The campaign has no game system, so it has no recipe "night\'s sleep". Nothing changed.');
        expect(await ok("change", "Ennio", "grit", "--by=-5")).toBe("Ennio: grit 5/9 → 0/9: at 0.");
    });
});

describe("conditions and rounds (DAT-6, DAT-7)", () => {
    it("show the text of a condition of the system when an effect bears its name, and nothing for another name", async () => {
        expect(await ok("effect", "add", "Ennio", "Dazed", "--for", "1h")).toBe(
            "Ennio: Dazed until day 1, 19:00.\n\nDazed is a condition of the system fake:\n## Dazed\n\nA dazed person rolls against the odds what needs a steady eye or a quick step.",
        );
        expect(await ok("effect", "add", "Ennio", "Stordito", "--for", "1h")).not.toContain("condition");
    });

    it("show a house rule on a condition first, with the precedents on it", async () => {
        mkdirSync(join(folder, "rules"));
        writeFileSync(join(folder, "rules", "Colpi.md"), "# Dazed\n\nChi è stordito perde anche la parata.\n");
        await ok("config", "precedents", "--add", "Dazed: l'acqua fredda lo toglie.");
        expect(await ok("effect", "add", "Ennio", "Dazed", "--for", "1h")).toBe(
            "Ennio: Dazed until day 1, 19:00.\n\nDazed is a condition of the system fake, by a house rule of the campaign:\n# Dazed\n\nChi è stordito perde anche la parata.\n\nPrecedents of the table: Dazed: l'acqua fredda lo toglie.",
        );
    });

    it("refuse an effect named as a counter of the system", async () => {
        expect(await refused("effect", "add", "Ennio", "Fading")).toBe("fading is a counter of the system fake, kept on the page: change it, such as page Ennio, field fading, by 1. Nothing changed.");
        // A counter the system declares with no maximum starts at 0 (CNT-8, D-266).
        expect(await ok("change", "Ennio", "fading", "--by", "1")).toMatch(/^Ennio: fading 0 → 1\./);
    });

    it("turn a duration of up to a minute into rounds for who is in a scene with turns, and leave a longer one, or one elsewhere, in time", async () => {
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--with", "Ennio", "--with", "Lena");
        expect(await ok("effect", "add", "Lena", "Lampo", "--for", "1m")).toBe("Lena: Lampo until day 1, 18:01.");
        await ok("scene", "order", "--order", "Ennio", "--order", "Lena");
        expect(await ok("effect", "add", "Ennio", "Benedetto", "--for", "1m")).toBe("Ennio: Benedetto until round 7, Ennio. 1m is 6 rounds of 10 seconds.");
        expect(await ok("effect", "add", "Lena", "Veleno", "--for", "1h")).toBe("Lena: Veleno until day 1, 19:00.");
        expect(await ok("effect", "add", "Gaspare", "Benedetto", "--for", "1m")).toBe("Gaspare: Benedetto until day 1, 18:01.");
        const closed = await ok("scene", "close", "--summary", "Finito.");
        expect(closed).toContain("Ended with the scene: Benedetto on Ennio.");
        expect(closed).not.toContain("Veleno");
        expect(await ok("status")).toContain("Veleno until day 1, 19:00");
    });
});

describe("systems of the test's own (DAT-6, DAT-7)", () => {
    it("round up to a whole round when the system's round does not divide the duration", async () => {
        const systems = makeTempFolder();
        mkdirSync(join(systems, "clessidra"));
        writeFileSync(join(systems, "clessidra", "system.yaml"), "title: a test system whose round lasts 7 seconds\nlanguage: en\nround: 7 seconds\n");
        removeFolder(folder);
        folder = makeTempFolder();
        context = { ...testContext(folder), systemFolders: [systems] };
        await ok("init", "--name", "Clessidra", "--system", "clessidra");
        inPlay(folder);
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "Ennio", "--type", "character", "--set", "role=pc");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--with", "Ennio");
        await ok("scene", "order", "--order", "Ennio");
        expect(await ok("effect", "add", "Ennio", "Benedetto", "--for", "1m")).toBe("Ennio: Benedetto until round 10, Ennio. 1m is 9 rounds of 7 seconds.");
        removeFolder(systems);
    });
});

describe("other game systems", () => {
    it("work with what a system of our own declares: its sheet, thresholds, recipes, conditions and round", async () => {
        const systems = makeTempFolder();
        mkdirSync(join(systems, "prova", "rules"), { recursive: true });
        writeFileSync(
            join(systems, "prova", "system.yaml"),
            [
                "title: a test system of our own",
                "language: it",
                "round: 60 seconds",
                "fields: { vigore: counter, fatica: counter, punti-a: counter, punti-b: counter, pozioni: counter }",
                "sheet: { Stato: [vigore, fatica] }",
                "status-line: [vigore, fatica?]",
                "thresholds: { vigore 0: Sfinimento, fatica: Fatica }",
                "recipes:",
                "  riposo: { set: { vigore: max, fatica: 2, punti-*: max }, rules: [Riposo, Recupero] }",
                "  sosta: { set: { vigore: max } }",
                "conditions: [Stordito, Confuso]",
                "",
            ].join("\n"),
        );
        writeFileSync(join(systems, "prova", "rules", "Regole.md"), "# Fatica\n\nLa fatica toglie un dado.\n\n# Sfinimento\n\nA zero vigore si sviene.\n\n# Stordito\n\nChi è stordito perde il turno.\n");
        removeFolder(folder);
        folder = makeTempFolder();
        context = { ...testContext(folder), systemFolders: [systems] };
        await ok("init", "--name", "Prova", "--system", "prova");
        inPlay(folder);
        expect(await ok("status")).toMatch(/The system prova keeps on a character sheet, by these names: vigore, fatica\.(\n|$)/);
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "Bea", "--type", "character", "--set", "role=pc", "--set", "vigore=1/5", "--set", "fatica=0/5", "--set", "punti-a=0/2", "--set", "punti-b=1/2", "--set", "pozioni=0/3");
        expect(await ok("change", "Bea", "vigore", "--by=-1")).toBe('Bea: vigore 1/5 → 0/5: at 0.\nvigore is at 0: read rules "Sfinimento".');
        expect(await ok("change", "--recipe", "riposo")).toBe([
            "Riposo (a recipe of the system prova):",
            "Bea: vigore 0/5 → 5/5; fatica 0/5 → 2/5; punti-a 0/2 → 2/2; punti-b 1/2 → 2/2. Not brought back: pozioni 0/3.",
            'vigore is no longer at 0: read rules "Sfinimento".',
            'For the rest, read rules "Riposo" and rules "Recupero".',
            "The game date did not move: apply a rest once its hours have passed; if they have not yet, advance them now.",
            "",
            "fatica changed: Fatica, from the rules of prova:\n# Fatica\n\nLa fatica toglie un dado.",
        ].join("\n"));
        expect(await ok("change", "Bea", "--recipe", "sosta")).toBe(
            'Sosta (a recipe of the system prova):\nBea: nothing changed. Not brought back: fatica 2/5 (rules "Fatica"), pozioni 0/3.\nThe game date did not move: apply a rest once its hours have passed; if they have not yet, advance them now.',
        );
        expect(await ok("effect", "add", "Bea", "Stordito", "--for", "1h")).toBe("Bea: Stordito until day 1, 19:00.\n\nStordito is a condition of the system prova:\n# Stordito\n\nChi è stordito perde il turno.");
        expect(await ok("effect", "add", "Bea", "Confuso", "--for", "1h")).toBe("Bea: Confuso until day 1, 19:00.");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--with", "Bea");
        await ok("scene", "order", "--order", "Bea");
        expect(await ok("effect", "add", "Bea", "Lento", "--for", "1m")).toBe("Bea: Lento until round 2, Bea. 1m is 1 round of 60 seconds.");
        removeFolder(systems);
    });

    it("leave a system without a sheet, recipes or round as it was, and say what it lacks", async () => {
        // A system of its fields alone.
        const systems = madeSystem("spoglio", { "system.yaml": "title: a test system of its fields alone\nlanguage: en\nfields:\n  health: counter\n" });
        removeFolder(folder);
        folder = makeTempFolder();
        context = { ...testContext(folder), systemFolders: [systems] };
        await ok("init", "--name", "Ferro", "--system", "spoglio");
        inPlay(folder);
        expect(await ok("status")).not.toContain("keeps on a character sheet");
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "health=5/5");
        expect(await ok("effect", "add", "Kira", "Ferita", "--for", "10m")).toBe("Kira: Ferita until day 1, 18:10.");
        expect(await refused("change", "--recipe", "riposo")).toBe('The system spoglio has no recipe "riposo". Nothing changed.');
        writeFileSync(join(folder, "world", "characters", "Kira.md"), '---\nrole: pc\nhealth: 5/5\neffects:\n  - "Stanca until long rest"\n---\n');
        expect(await ok("validate")).toContain('Stanca on Kira ends "long rest", which is not a game date.');
        removeFolder(systems);
    });
});

describe("laws on worlds at random", () => {
    it("name the rule of grit 0 exactly when a change touches 0: reaches it, takes more at it, leaves it or goes past it (DAT-3)", async () => {
        const step = fc.oneof(
            fc.integer({ min: -15, max: 15 }).filter((by) => by !== 0).map((by) => `--by=${by}`),
            fc.integer({ min: -5, max: 25 }).map((to) => `--to=${to}`),
        );
        const runs = fc.record({ start: fc.nat(9), steps: fc.array(step, { minLength: 1, maxLength: 6 }) });
        await fc.assert(
            fc.asyncProperty(runs, async ({ start, steps }) => {
                await ok("change", "Lena", "grit", "--to", `${start}`);

                for (const given of steps) {
                    const [summary, ...rest] = (await ok("change", "Lena", "grit", given)).split("\n");
                    const moved = /grit (-?\d+)\/\d+ → (-?\d+)\//.exec(summary);
                    const kept = /is (-?\d+)\//.exec(summary);
                    const before = Number(moved?.[1] ?? kept?.[1]);
                    const after = Number(moved?.[2] ?? kept?.[1]);
                    const beyond = Number(/(\d+) beyond/.exec(summary)?.[1] ?? 0);
                    // 0 lies between the value before and the one after, and something happened: a change, or what went beyond a limit.
                    const touches = Math.min(before, after) <= 0 && Math.max(before, after) >= 0 && (before !== after || beyond > 0);
                    const notes = rest.filter((line) => line.includes("read rules"));
                    expect(notes, summary).toHaveLength(touches ? 1 : 0);
                    expect(notes.every((note) => note.startsWith("grit ") && note.endsWith('read rules "Falling".'))).toBe(true);
                }
            }),
            { numRuns: 25 },
        );
    }, 120000);

    it("bring back with a recipe the fields it names, end the effects until its occasions and no other, and find nothing to do a second time (DAT-4, DAT-5)", async () => {
        const runs = fc.record({
            // Above 0 grit: at 0 a night's sleep gives nothing.
            grit: fc.integer({ min: 1, max: 9 }),
            ward: fc.integer({ min: 0, max: 5 }),
            rallies: fc.integer({ min: 0, max: 1 }),
            lenaGrit: fc.integer({ min: 1, max: 7 }),
            effects: fc.subarray(["night's sleep", "breather", "1h"]),
            recipe: fc.constantFrom("night's sleep", "breather"),
        });
        await fc.assert(
            fc.asyncProperty(runs, async ({ grit, ward, rallies, lenaGrit, effects, recipe }) => {
                removeFolder(folder);
                await campaign();
                await ok("change", "Ennio", "grit", "--to", `${grit}`);
                await ok("change", "Lena", "grit", "--to", `${lenaGrit}`);
                await ok("write", "Ennio", "--set", `ward=${ward}`);
                await ok("change", "Ennio", "rallies", "--to", `${rallies}`);

                for (const duration of effects) {
                    await ok("effect", "add", "Ennio", `Effetto ${duration}`, "--for", duration);
                }

                await ok("change", "--recipe", recipe);
                const ennio = character("Ennio");
                const ended = recipe === "night's sleep" ? ["night's sleep", "breather"] : ["breather"];
                expect(effects.filter((duration) => ennio.includes(`Effetto ${duration}`))).toEqual(effects.filter((duration) => !ended.includes(duration)));

                if (recipe === "night's sleep") {
                    expect(ennio).toContain("grit: 9/9\n");
                    expect(ennio).toContain("ward: 0\n");
                    expect(ennio).toContain("rallies: 1/1\n");
                    expect(character("Lena")).not.toContain("grit:");
                }

                const pages = [ennio, character("Lena")];
                const again = (await ok("change", "--recipe", recipe)).split("\n").slice(1, 3);
                // A second night's sleep at once gives nothing, and says from when another may (RST-1).
                expect(again.filter((line) => !/^(Ennio|Lena): nothing changed\.( Not brought back: .+\.)?( Choose whether .+\.| Ask the player .+\.)?( (Ennio|Lena) had a night's sleep at .+: one in 20h\.)?$/.test(line))).toEqual([]);
                expect([character("Ennio"), character("Lena")]).toEqual(pages);
            }),
            { numRuns: 20 },
        );
    }, 120000);
});
