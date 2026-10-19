// The state checks (D-467, D-473, CHK-1–CHK-4): what cannot be true together, said once in a chat while it lasts and again when it comes back; every one in
// status and validate; never a change; silent after any run of legal commands.
import fc from "fast-check";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { allStateChecks } from "../src/commands/game-checks.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    // A chat, which keeps what it was told (D-97).
    context = { ...testContext(folder), told: new Set() };
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "hp=20/20");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "hp=12/12");
    await ok("advance", "--to", "day 1, 10:00");
});

afterEach(() => removeFolder(folder));

describe("the core's checks (CHK-2)", () => {
    it("say once in a chat who keeps an effect while a condition breaks it, until it is ended, and again when it comes back", async () => {
        await ok("effect", "add", "Lena", "Benedizione", "--by", "[[Ettore]]");
        await ok("effect", "add", "Ettore", "Paralyzed");
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--with", "Lena");
        const line = "Ettore keeps Benedizione (Lena) but is Paralyzed, which breaks it: effect end, by [[Ettore]]. Read rules Concentration.";
        // The first turn, as the order starts it, says it; the turns after it no more.
        expect(await ok("scene", "order", "--order", "Lena", "--order", "Ettore")).toContain(line);
        expect(await ok("scene", "next")).not.toContain("which breaks it");
        await ok("effect", "end", "Ettore", "Paralyzed");
        expect(await ok("scene", "next")).not.toContain("which breaks it");
        await ok("effect", "add", "Ettore", "Paralyzed");
        expect(await ok("scene", "next")).toContain(line);
    });

    it("say one of the party at 0 with no condition that keeps from acting, ended by hand, and stay silent for the dead, the knocked out and anyone else", async () => {
        await ok("change", "Lena", "hp", "--by=-12");
        expect(await ok("status")).not.toContain("Lena is at");
        await ok("effect", "end", "Lena", "Unconscious");
        expect(await ok("advance", "--by", "10m")).toContain(
            "Lena is at hp 0/12, not marked dead, with none of Incapacitated, Paralyzed, Petrified, Stunned, Unconscious: raise its hp as its rules say, give it one of them back, "
                + "or write status=dead. Read rules Dropping to 0 Hit Points.",
        );
        await ok("write", "Lena", "--set", "status=dead");
        expect(await ok("status")).not.toContain("Lena is at");
        // A foe at 0 is dead in the game's rules: no line, in the scene or out of it (review of 19 October).
        await ok("write", "Bandito", "--type", "character", "--set", "hp=0/11");
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Bandito");
        expect(allStateChecks(folder, context)).toEqual([]);
    });

    it("tell again in the turns what status told once it held no more and came back (CHK-3)", async () => {
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--with", "Lena");
        await ok("scene", "order", "--order", "Ettore", "--order", "Lena");
        await ok("change", "Ettore", "death-failures", "--to", "2");
        expect(await ok("status")).toContain("Ettore has death-failures 2");
        await ok("change", "Ettore", "death-failures", "--to", "0");
        expect(await ok("status")).not.toContain("Ettore has death-failures");
        await ok("change", "Ettore", "death-failures", "--to", "1");
        expect(await ok("scene", "next")).toContain("Ettore has death-failures 1");
    });
});

describe("the system's checks (CHK-2)", () => {
    it("say what its data finds, in status every time and in validate on the page", async () => {
        await ok("change", "Ettore", "death-failures", "--to", "2");
        const line = "Ettore has death-failures 2 with hp 20/20: the death saves count only at 0 hit points; change Ettore death-failures to 0.";
        expect(await ok("status")).toContain(line);
        expect(await ok("status")).toContain(line);
        expect((await runCommandLine(["validate"], context)).output).toContain(`world/characters/Ettore.md: ${line}`);
        await ok("change", "Ettore", "death-failures", "--to", "0");
        expect(await ok("status")).not.toContain("death saves count only");
    });

    it("count an effect with an end or a keeper as no state", async () => {
        await ok("effect", "add", "Ettore", "Stable", "--for", "1m");
        expect(allStateChecks(folder, context)).toEqual([]);
        await ok("effect", "end", "Ettore", "Stable");
        await ok("effect", "add", "Ettore", "Stable");
        expect(allStateChecks(folder, context).map((found) => found.line)).toEqual(["Ettore is Stable with hp 20/20: Stable holds only at 0 hit points; effect end Ettore Stable."]);
    });
});

describe("the laws of the checks (CHK-1, CHK-4)", () => {
    it("change nothing: the campaign's files are the same before and after", async () => {
        await ok("change", "Ettore", "death-failures", "--to", "2");
        const before = snapshot(folder);
        expect(allStateChecks(folder, context)).toHaveLength(1);
        expect(snapshot(folder)).toEqual(before);
    });

    it("are silent after any run of legal commands on the party: damage, healing, the turns, the death saves and time", async () => {
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--with", "Lena");
        await ok("scene", "order", "--order", "Ettore", "--order", "Lena");
        const step = fc.oneof(
            fc.record({ kind: fc.constant("damage"), who: fc.constantFrom("Ettore", "Lena"), amount: fc.integer({ min: 1, max: 40 }) }),
            fc.record({ kind: fc.constant("heal"), who: fc.constantFrom("Ettore", "Lena"), amount: fc.integer({ min: 1, max: 30 }) }),
            fc.record({ kind: fc.constant("next"), face: fc.integer({ min: 1, max: 20 }) }),
            // The player's roll for their character, a death save while dying (DIE-4), and time passing.
            fc.record({ kind: fc.constant("save"), face: fc.integer({ min: 1, max: 20 }) }),
            fc.record({ kind: fc.constant("time") }),
        );
        await fc.assert(
            fc.asyncProperty(fc.array(step, { minLength: 1, maxLength: 12 }), async (steps) => {
                for (const who of ["Ettore", "Lena"]) {
                    await ok("change", who, "death-failures", "--to", "0");
                    await ok("change", who, "death-successes", "--to", "0");
                    await ok("change", who, "hp", "--to", "max");
                }

                for (const one of steps) {
                    if (one.kind === "next") {
                        await ok("scene", "next", { ...context, random: () => one.face });
                    } else if (one.kind === "save") {
                        await ok("roll", "1d20", "--who", "Ettore", "--why", "Tiro contro la morte", { ...context, random: () => one.face });
                    } else if (one.kind === "time") {
                        await ok("advance", "--by", "10m");
                    } else {
                        await ok("change", one.who, "hp", one.kind === "damage" ? `--by=-${one.amount}` : `--by=${one.amount}`);
                    }

                    expect(allStateChecks(folder, context).map((found) => found.line), JSON.stringify(steps)).toEqual([]);
                }
            }),
            { numRuns: 60 },
        );
    }, 120_000);
});

/** Every file of the campaign with its bytes, as text. */
function snapshot(root: string): Record<string, string>
{
    return Object.fromEntries(
        readdirSync(root, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => {
            const path = join(entry.parentPath, entry.name);
            return [path, readFileSync(path, "utf8")];
        }),
    );
}

async function ok(...args: (string | Context)[]): Promise<string>
{
    const given = args.at(-1);
    const own = typeof given === "object" ? given : context;
    const words = args.filter((arg): arg is string => typeof arg === "string");
    const result = await runCommandLine(words, own);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
