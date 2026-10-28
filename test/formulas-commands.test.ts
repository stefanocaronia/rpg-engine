// What a game system works out, through the commands (MECCANICHE, FOR-3–FOR-9): the sheet of a Warden of the fake system, a creature's, and the laws of
// the worked-out sheet against the fake's own counting. The sheet of a cleric of the 5e, counted as the SRD counts it,
// is in the 5e's repository; Ironsworn's momentum in Ironsworn's.
import fc from "fast-check";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { findSystem } from "../src/systems/index.ts";
import { madeSystem, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    await ok("write", "Locanda", "--type", "place");
    await ok(...warden());
    await ok("write", "Locanda", "--add", "contains=[[Ettore]]");
});

afterEach(() => removeFolder(folder));

/** Ettore, a Warden of rank 3: might 5, grace 3, wit 4 and skilled in wit, with 16 grit. */
function warden(): string[]
{
    return ["write", "Ettore", "--type", "character", ...["role=pc", "vocations=[[Warden]] 3", "might=5", "grace=3", "wit=4", "skilled=[wit]", "grit=16/16", "stride=8 m"].flatMap((field) => ["--set", field])];
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

/** The lines of what show says the system works out, each with the values it came from, as its result gives them. */
async function workedLines(page: string): Promise<string[]>
{
    const shown = JSON.parse(await ok("show", page, "--json")) as { worked: { line: string; }[]; };
    return shown.worked.map((worked) => worked.line);
}

/** The values show says the system works out, by field. */
async function worked(page: string): Promise<Record<string, number>>
{
    return Object.fromEntries((await workedLines(page)).map((line) => {
        const [, field, value] = /^(\S+) ([+-]?\d+)/.exec(line) ?? [];
        return [field, Number(value)];
    }));
}

/** The file of a page, a character unless its folder is given. */
function pageText(page: string, type = "characters"): string
{
    return readFileSync(join(folder, "world", type, `${page}.md`), "utf8");
}

describe("what show and status give of a sheet (FOR-8)", () => {
    it("works the sheet out, each value with only what changed it", async () => {
        expect(await workedLines("Ettore")).toEqual([
            "might-bonus +1: might 5, bonus-by-score 1",
            "grace-bonus +0: grace 3, bonus-by-score 0",
            "wit-bonus +0: wit 4, bonus-by-score 0",
            "level 3: 3 in vocations",
            "guard 8: grace-bonus +0, vocation-guard 2",
            "notice 5: wit 4, level 3, wit in skilled",
            "knack-count 2",
            "speed 8 m: stride 8",
            "lore bridges: Warden 3 in vocations",
            "knacks Steady Hand, Iron Lung: Warden 3 in vocations",
            "vocation-guard 2: might-bonus +1",
        ]);
        expect(await ok("status")).toContain("PC: Ettore, in Locanda: level 3 · grit 16/16 · guard 8 · stamina-d6 3/3");
    });

    it("works out nothing on a page without what a formula reads, and keeps the values written there (FOR-4)", async () => {
        await ok("write", "Bandito", "--type", "creature", "--set", "notice=11", "--set", "grace=5");
        expect(pageText("Bandito", "creatures")).toContain("notice: 11");
        expect(await workedLines("Bandito")).toEqual(["grace-bonus +1: grace 5, bonus-by-score 1", "guard 7: grace-bonus +1"]);
    });
});

describe("the order of layers (FOR-3) and the bonus fields (FOR-5)", () => {
    it("works out from a trait an effect gives, and back when it ends", async () => {
        expect(await ok("effect", "add", "Ettore", "Forza del bue", "--set", "might=7")).toContain("might 5 → 7, grit 16/16 → 16/17, might-bonus +1 → +2, guard 8 → 9");
        expect(await worked("Ettore")).toMatchObject({ "might-bonus": 2, "vocation-guard": 3, guard: 9 });
        await ok("effect", "end", "Ettore", "Forza del bue");
        expect(await worked("Ettore")).toMatchObject({ "might-bonus": 1, "vocation-guard": 2, guard: 8 });
    });

    it("adds up the bonuses of different effects, never twice the same one", async () => {
        await ok("effect", "add", "Ettore", "Anello", "--set", "guard-bonus=1");
        expect(await ok("effect", "add", "Ettore", "Mantello", "--set", "guard-bonus=1")).not.toContain("goes over");
        expect(await worked("Ettore")).toMatchObject({ guard: 10 });
        expect(await workedLines("Ettore")).toContain("guard 10: grace-bonus +0, vocation-guard 2, guard-bonus +2");
        await ok("effect", "add", "Ettore", "Anello", "--set", "guard-bonus=1");
        expect(await worked("Ettore")).toMatchObject({ guard: 10 });
    });
});

describe("the limits of counters (FOR-6)", () => {
    it("keeps the written maximum with what the system works out, and says it", async () => {
        expect(await ok("write", "Ettore", "--set", "might=7")).toContain("grit 17/17 (max 16 → 17: level 3, might-bonus +2): worked out by the system fake.");
        expect(pageText("Ettore")).toContain("grit: 17/17");
        expect(await refused("change", "Ettore", "grit", "--to", "20/30")).toBe(
            "The maximum of grit on Ettore is worked out by the game system: 17, from level 3, might-bonus +2. Give the current value alone, such as to 17; to raise the maximum, write might; to change it for a while, as a drain, give an effect that sets might. Nothing changed.",
        );
        expect(await ok("change", "Ettore", "grit", "--to", "10/17")).toBe("Ettore: grit 17/17 → 10/17.");
        expect(await ok("change", "Ettore", "grit", "--by=10")).toBe("Ettore: grit 10/17 → 17/17: at max, 3 beyond.");
        // What grit lost stays lost: 3 less of the maximum with it.
        await ok("write", "Ettore", "--set", "might=1");
        expect(pageText("Ettore")).toContain("grit: 14/14");
    });

    it("keeps a current above the written maximum while an effect allows it, and writes it as it reads when the effect ends (D-228)", async () => {
        await ok("effect", "add", "Ettore", "Forza del bue", "--set", "might=7");
        expect(await ok("change", "Ettore", "grit", "--by=5")).toBe("Ettore: grit 16/17 → 17/17: at max, 4 beyond.");
        expect(pageText("Ettore")).toContain("grit: 17/16");
        expect(await ok("effect", "end", "Ettore", "Forza del bue")).toContain("grit 17/17 → 16/16");
        expect(pageText("Ettore")).toContain("grit: 16/16");
        expect(readLogFile(folder).at(-2)?.data).toMatchObject({ page: "Ettore", field: "grit", before: "17/16", after: "16/16" });
    });

    it("goes down to a minimum below 0, and up to a maximum that a list lowers: nerve, -6 to 10 less the scars", async () => {
        await ok("write", "Kara", "--type", "character", "--set", "role=pc", "--set", "nerve=2/10", "--set", "scars=[burned, lamed]");
        expect(pageText("Kara")).toContain("nerve: 2/8");
        expect(await ok("change", "Kara", "nerve", "--by=-10")).toBe("Kara: nerve 2/8 → -6/8: at min, 2 beyond.");
        expect(await ok("change", "Kara", "nerve", "--by=20")).toBe("Kara: nerve -6/8 → 8/8: at max, 6 beyond.");
        await ok("write", "Kara", "--remove", "scars=lamed");
        expect(pageText("Kara")).toContain("nerve: 8/9");
    });

    it("works out the maximum of a counter the page writes without one", async () => {
        await ok("write", "Mira", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Scout]] 1", "--set", "might=5", "--set", "grit=10");
        expect(pageText("Mira")).toContain("grit: 10/10");
    });
});

describe("a computed field is never written (FOR-7)", () => {
    it("is left out by write, refused by change and by effect, which say what to change instead", async () => {
        expect(await ok("write", "Ettore", "--set", "notice=9", "--set", "stride=9 m")).toBe(
            "Updated Ettore (character, world/characters/Ettore.md): set stride.\nNot written, the system fake works it out: notice 5 (you gave 9). They come from wit, vocations, skilled.",
        );
        expect(await refused("write", "Ettore", "--set", "level=3", "--set", "guard=7")).toBe(
            "Not written, the system fake works them out: level 3, as you gave it; guard 8 (you gave 7). They come from vocations, grace, parry, guard-bonus. "
                + "A bonus such as guard-bonus comes from an effect, for what gives one, such as a magic item. Nothing changed.",
        );
        expect(await refused("change", "Ettore", "notice", "--by=1")).toBe("notice on Ettore is 5, worked out by the system fake from wit, vocations, skilled: change one of those. Nothing changed.");
        expect(await refused("effect", "add", "Ettore", "Strano", "--set", "notice=9")).toBe(
            "notice on Ettore is worked out by the system fake from wit, vocations, skilled: give the effect one of the fields it comes from instead, such as wit. Nothing changed.",
        );
    });

    it("is said by validate when written by hand, with a maximum that does not match", async () => {
        writeFileSync(join(folder, "world", "characters", "Ettore.md"), pageText("Ettore").replace("grit: 16/16", "grit: 16/30").replace("wit: 4", "wit: 4\nnotice: 7"));
        const output = await ok("validate");
        expect(output).toContain("- world/characters/Ettore.md: notice is worked out by the system fake (5): the value written on Ettore is never read. Fix: write Ettore, unset notice.");
        expect(output).toContain("- world/characters/Ettore.md: grit on Ettore has the maximum 30 written, but the system fake works out 16. Fix: change Ettore, field grit, to 16/16.");
    });
});

describe("laws of the worked-out sheet", () => {
    const step = fc.oneof(
        fc.record({ kind: fc.constant("trait"), field: fc.constantFrom("might", "grace", "wit"), value: fc.integer({ min: 1, max: 9 }) }),
        fc.record({ kind: fc.constant("rank"), value: fc.integer({ min: 1, max: 9 }) }),
        fc.record({ kind: fc.constant("skilled"), trait: fc.constantFrom("might", "wit") }),
        fc.record({ kind: fc.constant("effect"), name: fc.constantFrom("Anello", "Mantello", "Pietra"), bonus: fc.integer({ min: 1, max: 3 }) }),
        fc.record({ kind: fc.constant("band"), value: fc.option(fc.integer({ min: 1, max: 9 })) }),
    );

    it("works every value out as the fake system counts it, and keeps the written maximum in pair, after any writes and effects (FOR-3–FOR-6)", async () => {
        await fc.assert(
            fc.asyncProperty(fc.array(step, { minLength: 1, maxLength: 6 }), async (steps) => {
                removeFolder(folder);
                folder = makeTempFolder();
                context = testContext(folder);
                await ok("init", "--name", "Prova", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
                await ok(...warden());
                const traits: Record<string, number> = { might: 5, grace: 3, wit: 4 };
                let rank = 3;
                const skilled = new Set(["wit"]);
                const bonuses = new Map<string, number>();
                let band: number | undefined;

                for (const action of steps) {
                    if (action.kind === "trait") {
                        await ok("write", "Ettore", "--set", `${action.field}=${action.value}`);
                        traits[action.field] = action.value;
                    } else if (action.kind === "rank") {
                        await ok("write", "Ettore", "--set", `vocations=[[Warden]] ${action.value}`);
                        rank = action.value;
                    } else if (action.kind === "skilled") {
                        // Added when it is not there, removed when it is.
                        const add = !skilled.has(action.trait);
                        await ok("write", "Ettore", add ? "--add" : "--remove", `skilled=${action.trait}`);
                        add ? skilled.add(action.trait) : skilled.delete(action.trait);
                    } else if (action.kind === "effect") {
                        await ok("effect", "add", "Ettore", action.name, "--set", `guard-bonus=${action.bonus}`);
                        bonuses.set(action.name, action.bonus);
                    } else if (action.value === null) {
                        if (band !== undefined) {
                            await ok("effect", "end", "Ettore", "Fascia");
                        }

                        band = undefined;
                    } else {
                        await ok("effect", "add", "Ettore", "Fascia", "--set", `might=${action.value}`);
                        band = action.value;
                    }

                    // The fake system's own counting: the bonus by its table, a Warden's guard from it, notice from wit and rank, grit from rank and might.
                    const might = band ?? traits.might;
                    const bonusOf = (score: number): number => (score >= 7 ? 2 : score >= 5 ? 1 : score >= 3 ? 0 : -1);
                    const guardBonus = [...bonuses.values()].reduce((total, value) => total + value, 0);
                    expect(await worked("Ettore")).toMatchObject({
                        "might-bonus": bonusOf(might),
                        level: rank,
                        "vocation-guard": 1 + bonusOf(might),
                        guard: 6 + bonusOf(traits.grace) + 1 + bonusOf(might) + guardBonus,
                        notice: Math.floor((traits.wit + rank) / 2) + (skilled.has("wit") ? 2 : 0),
                    });
                    // Written without the effects, which here change only the might.
                    expect(pageText("Ettore")).toMatch(new RegExp(`grit: \\d+/${6 + 3 * rank + bonusOf(traits.might)}\\n`));
                }
            }),
            { numRuns: 12 },
        );
    }, 120000);

    it("adds up the bonuses of effects in any order (FOR-5)", async () => {
        const effects = fc.uniqueArray(fc.record({ name: fc.constantFrom("Anello", "Mantello", "Pietra", "Benedizione"), bonus: fc.integer({ min: 1, max: 4 }) }), { selector: (effect) => effect.name, minLength: 1 });
        await fc.assert(
            fc.asyncProperty(effects, async (given) => {
                for (const effect of ["Anello", "Mantello", "Pietra", "Benedizione"]) {
                    await runCommandLine(["effect", "end", "Ettore", effect], context);
                }

                for (const effect of given) {
                    await ok("effect", "add", "Ettore", effect.name, "--set", `guard-bonus=${effect.bonus}`);
                }

                const total = given.reduce((sum, effect) => sum + effect.bonus, 0);
                expect((await worked("Ettore")).guard).toBe(8 + total);
            }),
            { numRuns: 15 },
        );
    }, 60000);
});

describe("a system whose formulas do not read (FOR-9)", () => {
    it("cannot be read, and says which formula and where", async () => {
        const systems = join(folder, "..", `${folder.split(/[\\/]/).at(-1)}-systems`);
        mkdirSync(join(systems, "broken"), { recursive: true });
        writeFileSync(join(systems, "broken", "system.yaml"), "title: a broken system\nlanguage: en\ncomputed:\n  str-mod: floor((str - 10) /\n");
        const broken = { ...context, systemFolders: [systems] };
        const output = (await runCommandLine(["config", "system", "broken"], broken)).output;
        removeFolder(systems);
        expect(output).toContain("The game system broken cannot be read, because");
        expect(output).toContain('is not valid: computed.str-mod: "floor((str - 10) /" is not a formula');
    });

    it("says where a formula stands outside computed too, as the limit of the load and the most of a turn's use", () => {
        const read = (yaml: string): string => {
            try {
                findSystem([madeSystem("broken", { "system.yaml": `title: a broken system\nlanguage: en\n${yaml}` })], "broken");
                return "";
            } catch (error) {
                return error instanceof Error ? error.message : String(error);
            }
        };

        expect(read('load:\n  field: inventory\n  limit: "10 + * might"\n')).toMatch(/^The game system broken cannot be read, because .* is not valid: load\.limit: "10 \+ \* might" is not a formula/);
        expect(read('turn-uses:\n  dash:\n    most: "1 +"\n')).toContain('is not valid: turn-uses.dash.most: "1 +" is not a formula');
    });
});
