// The character sheet through the commands (D-204, D-206, D-207; DAT-2, DAT-8, SYS-8): show gives it in groups, write takes only the system's names in its
// lists and says once what it lacks, and roll takes a value from it by name.
import fc from "fast-check";
import { readFileSync, writeFileSync } from "node:fs";
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
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Locanda", "--type", "place");
    await ok(...ettore());
    await ok("write", "Locanda", "--add", "contains=[[Ettore]]");
});

afterEach(() => removeFolder(folder));

/** Ettore, a cleric of the third level, as the master writes him: only what the system does not work out. */
function ettore(): string[]
{
    const fields = [
        "role=pc",
        "level=3",
        "xp=900",
        "str=14",
        "dex=8",
        "con=15",
        "int=10",
        "wis=16",
        "cha=12",
        "hp-base=18",
        "hp=20/24",
        "ac=18",
        "speed=25 ft.",
        "hit-dice=3/3",
        "save-proficiencies=[wis, cha]",
        "skill-proficiencies=[Insight, Religion]",
        "languages=[Common, Dwarvish]",
        "traits=Cito le scritture, sempre.",
        "umore=sereno",
    ];
    return ["write", "Ettore", "--type", "character", ...fields.flatMap((field) => ["--set", field])];
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

function pageText(page: string): string
{
    return readFileSync(join(folder, "world", "characters", `${page}.md`), "utf8");
}

function lastLogged(): Record<string, unknown>
{
    return readLogFile(folder).at(-1)?.data ?? {};
}

describe("the sheet in show (DAT-2, D-207)", () => {
    it("gives a player character's sheet in the system's groups, a modifier beside its score, and the fields as written without what the sheet shows", async () => {
        const shown = await ok("show", "Ettore");
        expect(shown).toContain([
            "Character: level 3 · xp 900",
            "Personality: traits Cito le scritture, sempre.",
            "Abilities: str 14 (+2) · dex 8 (-1) · con 15 (+2) · int 10 (+0) · wis 16 (+3) · cha 12 (+1) · proficiency +2",
            "Saving Throws: str-save +2 · dex-save -1 · con-save +2 · int-save +0 · wis-save +5 · cha-save +3",
            "Skills: acrobatics -1 · animal-handling +3 · arcana +0 · athletics +2 · deception +1 · history +0 · insight +5 · intimidation +1 · investigation +0 · "
            + "medicine +3 · nature +0 · perception +3 · performance +1 · persuasion +1 · religion +2 · sleight-of-hand -1 · stealth -1 · survival +3",
            "Combat: ac 18 · initiative -1 · speed 25 ft. · hp-base 18 · hp 20/24 · hit-dice 3/3 · passive-perception 13",
            "Proficiencies: save-proficiencies wis; cha · skill-proficiencies Insight; Religion · languages Common; Dwarvish",
            "",
            "---\nrole: pc\numore: sereno\n---",
        ].join("\n"));
        expect(shown).not.toContain("Worked out by the system");
        // The result keeps every field as written and every value with what it came from, for whoever reads it as data.
        const data = JSON.parse(await ok("show", "Ettore", "--json")) as { fields: Record<string, unknown>; worked: { field: string; line: string; }[]; onSheet: string[]; };
        expect(data.fields).toMatchObject({ str: 14, hp: "20/24", umore: "sereno" });
        expect(data.worked).toContainEqual({ field: "insight", line: "insight +5: wis-mod +3, proficiency +2, Insight in skill-proficiencies" });
        expect(data.onSheet).toContain("str-mod");
    });

    it("reads the sheet with its effects, and says what they cover", async () => {
        await ok("effect", "add", "Ettore", "Gauntlets of Ogre Power", "--set", "str=19");
        const shown = await ok("show", "Ettore");
        expect(shown).toContain("While they last: str 19 (14 without)");
        expect(shown).toContain("Abilities: str 19 (+4) · dex 8 (-1)");
        expect(shown).toContain("athletics +4");
    });

    it("gives a group with how each value is made, by its name in any case; a section of that name comes first", async () => {
        expect(await ok("show", "Ettore#combat")).toBe([
            "Ettore#Combat (character) · world/characters/Ettore.md",
            "Is in: Locanda",
            "",
            "ac 18\ninitiative -1: dex-mod -1\nspeed 25 ft.\nhp-base 18\nhp 20/24: the maximum from hp-base 18, level 3, con-mod +2\nhit-dice 3/3\npassive-perception 13: perception +3",
            "",
            "Linked from:\n- Locanda: contains",
        ].join("\n"));
        expect(await ok("show", "Ettore#Abilities")).toContain("str 14 (+2)\ndex 8 (-1)\ncon 15 (+2)\nint 10 (+0)\nwis 16 (+3)\ncha 12 (+1)\nproficiency +2: level 3, proficiency-by-level 2");
        await ok("write", "Ettore#Combat", "--text", "Combatte con la mazza del padre.");
        expect(await ok("show", "Ettore#Combat")).toContain("Combatte con la mazza del padre.");
    });

    it("says what a group lacks, and names the groups when there is no section or group by that name", async () => {
        await ok("write", "Mira", "--type", "character", "--set", "role=companion", "--set", "wis=12");
        expect(await ok("show", "Mira#Skills")).toContain("Mira has nothing in Skills yet.");
        expect(await refused("show", "Ettore#Incantesimi")).toBe(
            'Ettore has no section or secret "Incantesimi". It has no sections or secrets. The groups of its sheet are: Character, Personality, Abilities, Saving Throws, Skills, Combat, Proficiencies.',
        );
    });

    it("leaves the other characters as they are written, with where each value comes from", async () => {
        await ok("write", "Gaspare", "--type", "character", "--set", "role=npc", "--set", "creature=[[Commoner]]", "--set", "hp=3/4");
        const shown = await ok("show", "Gaspare");
        expect(shown).toContain('---\nrole: npc\ncreature: "[[Commoner]]"\nhp: 3/4\n---');
        expect(shown).toContain("Fields inherited from Commoner (5e):");
        expect(shown).not.toContain("Abilities:");
        expect(await refused("show", "Gaspare#Skills")).toBe('Gaspare has no section or secret "Skills". It shows, from Commoner: Actions, Club.');
    });
});

describe("what is written on the sheet (DAT-2, D-206, SYS-8)", () => {
    it("says once, when a character joins the party, what the sheet lacks and the system's notes; what is written only when it applies is never reminded", async () => {
        const joined = await ok("write", "Mira", "--type", "character", "--set", "role=pc", "--set", "level=1");
        expect(joined).toContain("Mira's sheet of the system 5e still lacks, by these names: xp, str, dex, con, int, wis, cha, ac, speed, hp-base, hp, hit-dice, save-proficiencies, skill-proficiencies, languages.");
        expect(joined).toContain("Personality: traits, ideals, bonds and flaws are the player's, in their words, with links to what they name: propose some if they ask, never write one they did not choose.");
        expect(await ok("write", "Mira", "--set", "xp=0")).not.toContain("Personality");
        const status = await ok("status");
        expect(status).toContain("Mira's sheet still lacks, by these names: str, dex,");
        expect(status).not.toMatch(/traits|inspiration|temp-hp|exhaustion|expertise/);
        expect(await ok("write", "Rosa", "--type", "character", "--set", "role=npc")).toBe("Created Rosa (character, world/characters/Rosa.md): set role.");
    });

    it("takes in a list only the names the system gives, in any case and as links, and refuses the others with those names, changing nothing", async () => {
        await ok("write", "Ettore", "--set", "skill-proficiencies=[insight, Medicine]");
        await ok("write", "Ettore", "--add", "skill-proficiencies=[[Religion]]");
        await ok("write", "Ettore", "--add", "expertise=Thieves’ Tools");
        const before = pageText("Ettore");
        const skills = "Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, "
            + "Persuasion, Religion, Sleight of Hand, Stealth, Survival";
        expect(await refused("write", "Ettore", "--set", "skill-proficiencies=[Insight, Furtività]", "--set", "umore=teso")).toBe(
            `"Furtività" is not one of the names skill-proficiencies takes in the system 5e: ${skills}. Nothing changed.`,
        );
        expect(await refused("write", "Ettore", "--add", "expertise=Stealthh", "--add", "expertise=Arcanna")).toBe(
            `"Stealthh", "Arcanna" are not names expertise takes in the system 5e: ${skills}, Thieves' Tools. Nothing changed.`,
        );
        expect(await refused("write", "Ettore", "--set", "skill-proficiencies=Insight, Religion")).toContain("A list is written [a, b]. Nothing changed.");
        expect(pageText("Ettore")).toBe(before);
        await ok("write", "Ettore", "--set", "save-proficiencies=wis");
        expect(pageText("Ettore")).toContain("save-proficiencies:\n  - wis\n");
    });

    it("reports in validate a name written by hand that the system does not take, and lets write remove it", async () => {
        writeFileSync(join(folder, "world", "characters", "Nero.md"), "---\nrole: npc\nskill-proficiencies: [Atletica, Stealth]\n---\n");
        expect(await ok("validate")).toContain(
            '- world/characters/Nero.md: On Nero: "Atletica" is not one of the names skill-proficiencies takes in the system 5e: Acrobatics, Animal Handling,',
        );
        expect(await ok("validate")).toContain("Fix: write Nero, remove skill-proficiencies=Atletica, then add the right name.");
        await ok("write", "Nero", "--remove", "skill-proficiencies=Atletica");
        expect(await ok("validate")).not.toContain("Nero");
    });

    it("takes the names of another game system: the debilities of the test system based on Ironsworn", async () => {
        removeFolder(folder);
        folder = makeTempFolder();
        context = testContext(folder);
        await ok("init", "--name", "Ferro", "--system", "ironsworn");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "momentum=2/10", "--add", "debilities=Wounded");
        expect(await refused("write", "Kira", "--add", "debilities=hungry")).toBe(
            '"hungry" is not one of the names debilities takes in the system ironsworn: wounded, shaken, unprepared, encumbered, maimed, corrupted, cursed, tormented. Nothing changed.',
        );
        expect(await ok("show", "Kira")).toContain("momentum: 2/9");
    });
});

describe("rolls from the sheet (DAT-8)", () => {
    it("takes a field's value from the sheet of who rolls, as it reads with effects and formulas, and says it in the output and the log", async () => {
        expect(await ok("roll", "1d20+athletics", "--who", "Ettore", "--why", "scalare il muro")).toMatch(/^\S+ Ettore, scalare il muro: 1d20\+athletics = 6 \[4\] \+ 2 \(athletics \+2\)$/);
        expect(lastLogged()).toEqual({
            notation: "1d20+athletics",
            total: 6,
            result: "1d20+athletics = 6 [4] + 2 (athletics +2)",
            sheet: { athletics: 2 },
            why: "scalare il muro",
            who: "Ettore",
            physical: false,
        });
        await ok("effect", "add", "Ettore", "Gauntlets of Ogre Power", "--set", "str=19");
        expect(await ok("roll", "1d20+athletics", "--who", "ettore")).toContain("1d20+athletics = 8 [4] + 4 (athletics +4)");
        expect(await ok("roll", "1d20 + dex-mod - wis-mod", "--who", "Ettore")).toContain("1d20 + dex-mod - wis-mod = 0 [4] - 1 - 3 (dex-mod -1, wis-mod +3)");
        expect(await ok("roll", "wis-mod+1d4+level", "--who", "Ettore")).toContain("wis-mod+1d4+level = 10 3 + [4] + 3 (wis-mod +3, level 3)");
        expect(await ok("roll", "1d20+insight", "--who", "Ettore", "--values", "17")).toContain("1d20+insight = 22 [17] + 5 (insight +5) (physical dice)");
    });

    it("keeps the values in a hidden roll's proof, and takes them from a copy in the open scene", async () => {
        const hidden = await ok("roll", "1d20+wis-save", "--who", "Ettore", "--hidden");
        const id = /^Hidden roll (\S+), only for the master: 1d20\+wis-save = 9 \[4\] \+ 5 \(wis-save \+5\)$/m.exec(hidden)?.[1];
        expect(id).toBeDefined();
        expect(await ok("roll", "--reveal", id ?? "")).toContain(`Hidden roll ${id} revealed: 1d20+wis-save = 9 [4] + 5 (wis-save +5).`);
        await ok("scene", "open", "--title", "Imboscata", "--type", "combat", "--creatures", "Goblin=1");
        expect(await ok("roll", "1d20+dex-mod", "--who", "Goblin 1")).toContain("Goblin 1: 1d20+dex-mod = 6 [4] + 2 (dex-mod +2)");
    });

    it("refuses a name without who, with who that is no character, or a field the sheet does not hold as a whole number, logging nothing", async () => {
        const logged = readLogFile(folder).length;
        expect(await refused("roll", "1d20+athletics")).toBe('"athletics" is no die: to take it from a sheet, give who rolls, such as who Bruna; or give the number, such as 1d20+5.');
        expect(await refused("roll", "1d20+athletics", "--who", "Bruno")).toBe(
            "There is no page named Bruno, nor a copy of that name in the open scene, to take athletics from: give who as the name of a character, or the number in the notation.",
        );
        expect(await refused("roll", "1d20+str-1", "--who", "Ettore")).toBe(
            "Ettore has no str-1: show Ettore gives what its sheet has. A minus between two terms takes spaces around it, such as 1d20+str - 1.",
        );
        expect(await refused("roll", "1d20+speed", "--who", "Ettore")).toBe('speed on Ettore is "25 ft.", not a whole number: give the number in the notation.');
        expect(readLogFile(folder)).toHaveLength(logged);
        expect(await ok("roll", "1d20+3", "--who", "la guardia")).toMatch(/^\S+ la guardia: 1d20\+3 = 7 \[4\] \+ 3$/);
        expect(await ok("roll", "d20+2d6", "--who", "Ettore")).toContain("d20+2d6 = 12 [4] + [4, 4]");
    });

    it("reminds the effects on who rolls that are not in their numbers, the conditions, and the fields of their line not at zero", async () => {
        expect(await ok("roll", "1d20", "--who", "Ettore")).not.toContain("see whether");
        await ok("effect", "add", "Ettore", "Gauntlets of Ogre Power", "--set", "str=19");
        expect(await ok("roll", "1d20", "--who", "Ettore")).not.toContain("see whether");
        await ok("effect", "add", "Ettore", "Benedizione", "--for", "1m");
        await ok("effect", "add", "Ettore", "Poisoned", "--for", "1h", "--set", "speed=20 ft.");
        await ok("write", "Ettore", "--set", "exhaustion=1", "--set", "inspiration=0");
        expect(await ok("roll", "1d20", "--who", "Ettore")).toContain("\nEttore has Benedizione, Poisoned, exhaustion 1: see whether they change this roll.");
    });
});

describe("laws of rolls from the sheet", () => {
    it("total what the same roll totals with the numbers the sheet gives (DAT-8)", async () => {
        const skills = ["acrobatics", "athletics", "insight", "religion", "stealth", "survival", "wis-save", "initiative", "passive-perception"];
        const sheet = fc.record({
            scores: fc.array(fc.integer({ min: 3, max: 20 }), { minLength: 6, maxLength: 6 }),
            level: fc.integer({ min: 1, max: 20 }),
            proficient: fc.subarray(["Athletics", "Insight", "Religion", "Stealth"]),
            field: fc.constantFrom(...skills),
            face: fc.integer({ min: 1, max: 20 }),
        });
        await fc.assert(
            fc.asyncProperty(sheet, async ({ scores, level, proficient, field, face }) => {
                const abilities = ["str", "dex", "con", "int", "wis", "cha"].map((ability, index) => `${ability}=${scores[index]}`);
                await ok("write", "Ettore", ...[...abilities, `level=${level}`, `skill-proficiencies=[${proficient.join(", ")}]`].flatMap((assignment) => ["--set", assignment]));
                const shown = JSON.parse(await ok("show", "Ettore", "--json")) as { worked: { field: string; line: string; }[]; };
                const line = shown.worked.find((worked) => worked.field === field)?.line ?? "";
                const value = Number(/^\S+ ([+-]?\d+)/.exec(line)?.[1]);
                const rolled = await ok("roll", `1d20+${field}`, "--who", "Ettore", "--values", String(face));
                expect(rolled).toContain(`1d20+${field} = ${face + value} [${face}]`);
            }),
            { numRuns: 12 },
        );
    }, 120000);
});
