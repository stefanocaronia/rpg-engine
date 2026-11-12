// The player's last choices (D-37, T-134): a new campaign's setup suggests how the player chose to play in their last one on this computer, never chooses it.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { lastChoices } from "../src/campaign/index.ts";
import { runCommandLine } from "../src/cli/command-line.ts";
import { setupQuestions } from "../src/commands/config/dashboard.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

let home: string;
let first: string;
let second: string;

beforeEach(() => {
    home = makeTempFolder();
    first = makeTempFolder();
    second = makeTempFolder();
});

afterEach(() => [home, first, second].forEach(removeFolder));

const contextIn = (folder: string): Context => ({ ...testContext(folder), home });

async function ok(folder: string, ...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, contextIn(folder));
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("the last choices", () => {
    it("are remembered from init and config, by the master or the player, and suggested by the next campaign's setup", async () => {
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "hard", "--lethality", "epic");
        await ok(first, "config", "saves", "permadeath");
        await runCommandLine(["config", "units", "imperial"], { ...contextIn(first), actor: "player" });
        expect(lastChoices(home)).toEqual({ difficulty: "hard", lethality: "epic", saves: "permadeath", units: "imperial" });

        await ok(second, "init", "--name", "Seconda", "--language", "it", "--system", "fake");
        const questions = setupQuestions(second, contextIn(second), false);
        const asked = (name: string) => questions.find((question) => question.name === name);
        expect(asked("difficulty")).toMatchObject({ suggested: "hard", last: "hard" });
        expect(asked("lethality")).toMatchObject({ suggested: "epic", last: "epic" });
        expect(asked("saves")).toMatchObject({ suggested: "permadeath", last: "permadeath" });
        // Nothing chosen for the player: the setup still asks it.
        expect(asked("difficulty")?.value).toBeUndefined();
        // A setting never chosen keeps the game's own suggestion.
        expect(asked("rigor")).toMatchObject({ suggested: "smooth" });
        expect(asked("rigor")?.last).toBeUndefined();
    });

    it("tell the master, in the setup, what the player chose in their last campaign", async () => {
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "brutal");
        expect(await ok(second, "init", "--name", "Seconda", "--language", "it", "--system", "fake", "--master")).toMatch(/difficulty \([^)]*\), in their last campaign brutal: offer it first/);
    });

    it("never remember what belongs to one game: the mentor, a custom difficulty", async () => {
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "easy");
        await ok(first, "config", "mentor", "tutorial");
        await ok(first, "config", "difficulty", "custom");
        expect(lastChoices(home)).toEqual({ difficulty: "easy" });
    });

    it("read nothing from a file written wrongly, and are rewritten whole at the next choice", async () => {
        writeFileSync(join(home, "last-choices.json"), "{ not json");
        expect(lastChoices(home)).toEqual({});
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "normal");
        expect(JSON.parse(readFileSync(join(home, "last-choices.json"), "utf8"))).toEqual({ difficulty: "normal" });
    });
});
