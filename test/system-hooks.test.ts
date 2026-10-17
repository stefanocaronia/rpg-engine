// The hooks of a game system's code (D-448): called after the engine's own writes, the roll that made a change first in the log; one that fails, or code that
// is not loaded, is a line for the master and the change stands; the dashboard reads the 5e's death save from what its code wrote.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { ask } from "../src/commands/ask.ts";
import type { Context, Player } from "../src/core/context.ts";
import { saveOutcome } from "../src/dashboard/save-outcome.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "hp=10/20");
});

afterEach(() => removeFolder(folder));

describe("the hooks of a system's code (D-448)", () => {
    it("say a hook that fails, or code not loaded, in a line, the change made all the same", async () => {
        const failing = {
            ...context,
            systemCode: {
                "5e": {
                    hooks: {
                        counterChanged: () => {
                            throw new Error("broken: on purpose");
                        },
                    },
                },
            },
        };
        expect(await ok("change", "Ettore", "hp", "--by=-3", failing)).toContain(
            "Ettore: hp 10/20 → 7/20.\nThe system 5e failed after this change: broken: on purpose. It is done all the same; meanwhile apply its rules yourself, as its pages say.",
        );
        expect(await ok("change", "Ettore", "hp", "--by=-1", { ...context, systemCode: {} })).toContain("The system 5e's code is not loaded: start the MCP server again (/mcp in Claude Code)");
        expect(await ok("show", "Ettore")).toContain("hp 6/20");
    });

    it("keep the engine's own notes when the code is not loaded: the marks of the turn, what a roll's effects ask (review of 17 October)", async () => {
        const unloaded = { ...context, systemCode: {} };
        await ok("effect", "add", "Ettore", "Poisoned");
        expect(await ok("roll", "1d20+2", "--who", "Ettore", "--why", "Atletica", unloaded)).toMatch(/Ettore has Poisoned: if they change this roll[^\n]*\nThe system 5e's code is not loaded/);
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--creatures", "Wolf=1");
        await ok("scene", "order", "--order", "Wolf 1", "--order", "Ettore");
        const turn = await ok("scene", "next", unloaded);
        expect(turn).toContain("Mark with scene use what Ettore uses of the turn");
        expect(turn).toContain("The system 5e's code is not loaded");
    });

    it("come after the roll that made a change, in the log (D-459)", async () => {
        await ok("change", "Ettore", "hp", "--to", "0");
        // At 0 the damage changes no hit points: the roll, then the failure the 5e's code writes.
        await ok("change", "Ettore", "hp", "--by=-(1d4)");
        const last = readLogFile(folder).slice(-2).map((entry) => `${entry.type} ${String(entry.data.field ?? "")}`.trim());
        expect(last).toEqual(["roll", "counter-changed death-failures"]);
    });

    it("write the death save the dashboard reads from the view, for every face and every count, stable as the system names it (D-461)", async () => {
        await ok("change", "Ettore", "hp", "--to", "0");
        const clicking: Player = { choose: async () => 0 };

        for (const [successes, failures] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
            for (const face of [1, 9, 10, 19, 20]) {
                await ok("change", "Ettore", "hp", "--to", "0");
                await ok("change", "Ettore", "death-successes", "--to", String(successes));
                await ok("change", "Ettore", "death-failures", "--to", String(failures));
                await ok("effect", "end", "Ettore", "Stable").catch(() => "");
                const asking: { save?: Parameters<typeof saveOutcome>[0]; } = {};
                const page: Player = {
                    choose: async (_question, _title, _labels, _signal, rows) => {
                        asking.save = rows?.save;
                        return 0;
                    },
                };
                await ask.run(ask.input.parse({ question: "Ettore", options: "Tiro contro la morte 1d20", who: "Ettore" }), { ...context, page, player: clicking, random: () => face });
                const member = JSON.parse(await ok("view", "--json")).party.find((one: { name: string; }) => one.name === "Ettore");
                const outcome = saveOutcome(asking.save as Parameters<typeof saveOutcome>[0], member);
                const lost = failures + (face === 1 ? 2 : 1);
                const expected = face === 20 ? "back" : face >= 10 ? (successes === 2 ? "stable" : "success") : lost >= 3 ? "dead" : face === 1 ? "failures" : "failure";
                expect(outcome?.kind, `${successes}/${failures}, face ${face}`).toBe(expected);

                if (expected !== "back") {
                    expect(member.dying.find((counter: { side: string; }) => counter.side === "successes").full).toBe("Stable");
                }
            }
        }
    });
});

async function ok(...args: (string | Context)[]): Promise<string>
{
    const given = args.at(-1);
    const own = typeof given === "object" ? given : context;
    const words = args.filter((arg): arg is string => typeof arg === "string");
    const result = await runCommandLine(words, own);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
