// The speed the sheet works out (D-445; SPD-1, SPD-2), on the fake system: the stride written, then what effects add and multiply, and a condition that
// stops one. The 5e's speeds, armor, loads and feet are in the 5e's repository.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "stride=8 m");
});

afterEach(() => removeFolder(folder));

describe("the speed a sheet works out", () => {
    it("starts from the stride written, and shows it beside (SPD-1)", async () => {
        expect(await speed("Ettore")).toBe("speed 8 m (8 m)");
        await ok("write", "Brom", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Warden]] 1", "--set", "stride=6 m");
        expect(await speed("Brom")).toBe("speed 6 m (6 m)");
    });

    it("adds what effects add, multiplies their factors, and stops with a condition that stops one (SPD-2)", async () => {
        await ok("effect", "add", "Ettore", "Passo lungo", "--set", "bonus-stride=2");
        expect(await speed("Ettore")).toBe("speed 10 m (8 m)");
        await ok("effect", "add", "Ettore", "Fretta", "--set", "stride-factor=2");
        expect(await speed("Ettore")).toBe("speed 20 m (8 m)");
        await ok("effect", "add", "Ettore", "Lentezza", "--set", "stride-factor=1/2");
        expect(await speed("Ettore")).toBe("speed 10 m (8 m)");
        const half = await runCommandLine(["effect", "add", "Ettore", "Mezzo", "--set", "stride-factor=half"], context);
        expect(half.output).toBe('stride-factor on Ettore is a factor: give what the effect multiplies by, such as stride-factor=2 or stride-factor=1/2, not "half". Nothing changed.');
        await ok("effect", "add", "Ettore", "Pinned");
        expect(await speed("Ettore")).toBe("speed 0 m (8 m)");
    });

    it("gives the dashboard the speed worked out, the written one beside it only when it says something else (SPD-1)", async () => {
        const shown = async (): Promise<{ text: string; beside?: string; } | undefined> => {
            const sheet = JSON.parse(await ok("view", "Ettore", "--json")).sheet as { values: { field: string; text: string; beside?: string; }[]; }[];
            const value = sheet.flatMap((group) => group.values).find((one) => one.field === "speed");
            return value === undefined ? undefined : { text: value.text, ...(value.beside === undefined ? {} : { beside: value.beside }) };
        };

        expect(await shown()).toEqual({ text: "8 m" });
        await ok("effect", "add", "Ettore", "Passo lungo", "--set", "bonus-stride=2");
        expect(await shown()).toEqual({ text: "10 m", beside: "8 m" });
    });
});

/** The speed on a character's sheet, with the written stride beside it. */
async function speed(name: string): Promise<string>
{
    return /(?<![-\w])speed [^(·\n]*\([^)]*\)/.exec(await ok("show", name))?.[0] ?? "";
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
