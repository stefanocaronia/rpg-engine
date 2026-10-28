// The rules command on the fake system's chapter (RUL-2, RUL-3, RUL-6–RUL-8): a section by its title or its path, a table by its caption, the chapters
// without a text, the system's own names in the campaign's language, what it says when nothing matches, the house rules and the precedents. The same on the
// 5e's chapters is in the 5e's repository.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

const falling = "Basics › Falling (fake):\n## Falling\n\nAt 0 grit one falls.";

describe("the rules command on the fake system", () => {
    it("gives the exact text of a section by its title or its path, and a table by its caption (RUL-3, RUL-6)", async () => {
        expect((await ok("rules", "Falling")).startsWith(falling)).toBe(true);
        expect(await ok("rules", "Basics › Rest")).toContain("Basics › Rest (fake):\n## Rest\n\nA night's sleep brings back all grit");
        expect(await ok("rules", "omens")).toContain("| 1d6 | Omen |\n|---|---|\n| 1-2 | A crow on the left |");
    });

    it("searches the system by its own names too, as its words in the campaign's language give them (RUL-8)", async () => {
        const output = await ok("rules", "bloccato");
        expect(output).toMatch(/^fake searched by its own names too: Pinned\.\n\nBasics › Pinned \(fake\):\n## Pinned\n\nA pinned person cannot move/);
    });

    it("lists the chapters with their sections without a text, and says when nothing matches how to record a precedent", async () => {
        expect(await ok("rules")).toContain("The rules of the system fake, in English, by chapter:\nBasics: Rolls, Falling, Gone,");
        expect(await ok("rules", "xylophone")).toBe(
            'No rule matches "xylophone". The system fake writes its rules in English: search with the book\'s words, such as a condition, an action or a heading. The chapters of fake: Basics, Rest. '
                + 'If you rule without the text, tell the player it is your call, and add it to the precedents: config, setting precedents, add "<the rule\'s name in English>: what you said".',
        );
        expect(await ok("rules", "Bog Hound")).toMatch(/^Bog Hound is a page of the system fake \(creature\): show Bog Hound reads it\./);
    });

    it("names the campaign's house rules, and shows a precedent beside the rule it names, also in status (RUL-2, RUL-7)", async () => {
        mkdirSync(join(folder, "rules"), { recursive: true });
        writeFileSync(join(folder, "rules", "Casa.md"), "# Regole di casa\n\n## Cadere\n\nA 0 grit si cade, ma si resta coscienti un round.\n");
        expect(await ok("rules", "falling")).toContain("House rules of the campaign: Regole di casa.");
        await ok("config", "precedents", "--add", "Falling: un round in piedi prima di cadere");
        const output = await ok("rules", "falling");
        expect(output).toContain(`${falling}`);
        expect(output).toContain("Precedents: Falling: un round in piedi prima di cadere");
        expect(await ok("status")).toContain("Precedents: Falling: un round in piedi prima di cadere\nHouse rules (rules): Regole di casa");
    });
});
