// The hooks of a game system's code (D-448), on the fake system: called after the engine's own writes, the roll that made a change first in the log; one that
// fails, or code that is not loaded, is a line for the master and the change stands. The 5e's dying point is in the 5e's repository.
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
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "grit=10/20");
});

afterEach(() => removeFolder(folder));

async function ok(...args: (string | Context)[]): Promise<string>
{
    const given = args.at(-1);
    const own = typeof given === "object" ? given : context;
    const result = await runCommandLine(args.filter((arg): arg is string => typeof arg === "string"), own);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("the hooks of a system's code (D-448)", () => {
    it("say a hook that fails, or code not loaded, in a line, the change made all the same", async () => {
        const failing = {
            ...context,
            systemCode: {
                fake: {
                    code: {
                        counterChanged: () => {
                            throw new Error("broken: on purpose");
                        },
                    },
                },
            },
        };
        expect(await ok("change", "Ettore", "grit", "--by=-3", failing)).toContain(
            "Ettore: grit 10/20 → 7/20.\nThe game system fake failed after this change: broken: on purpose. It is done all the same; meanwhile apply its rules yourself, as its pages say.",
        );
        expect(await ok("change", "Ettore", "grit", "--by=-1", { ...context, systemCode: {} })).toContain("The game system fake's code is not loaded: start the MCP server again (/mcp in Claude Code)");
        expect(await ok("show", "Ettore")).toContain("grit 6/20");
    });

    it("keep the engine's own notes when the code is not loaded: the marks of the turn, what a roll's effects ask", async () => {
        const unloaded = { ...context, systemCode: {} };
        await ok("effect", "add", "Ettore", "Dazed");
        expect(await ok("roll", "2d6+2", "--who", "Ettore", "--why", "Forza", unloaded)).toMatch(/Ettore has Dazed: if they change this roll[^\n]*\nThe game system fake's code is not loaded/);
        await ok("scene", "open", "--title", "Al guado", "--type", "combat", "--with", "Ettore", "--creatures", "Bog Hound=1");
        await ok("scene", "order", "--order", "Bog Hound 1", "--order", "Ettore");
        const turn = await ok("scene", "next", unloaded);
        expect(turn).toContain("Mark with scene use what Ettore uses of the turn");
        expect(turn).toContain("The game system fake's code is not loaded");
    });

    it("come after the roll that made a change, in the log (D-459)", async () => {
        await ok("change", "Ettore", "grit", "--to", "2");
        // The dice bring the grit to 0: the change, its roll logged once it is made, then the effect the fake's code adds after them.
        await ok("change", "Ettore", "grit", "--by=-(1d4)");
        const last = readLogFile(folder).slice(-3).map((entry) => `${entry.type} ${String(entry.data.field ?? entry.data.effect ?? "")}`.trim());
        expect(last).toEqual(["counter-changed grit", "roll", "effect-added Down"]);
    });
});
