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

    it("tell the master, once as the setup begins, what the player chose in their last campaign: never again at each config (T-168)", async () => {
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "brutal", "--lethality", "epic");
        const said = " In their last campaign the player chose difficulty brutal, lethality epic: offer those first.";
        expect(await ok(second, "init", "--name", "Seconda", "--language", "it", "--system", "fake", "--master")).toContain(said);
        expect(await ok(second, "status")).toContain(said);
        const config = await ok(second, "config", "units", "metric");
        expect(config).not.toContain("last campaign");
        // Once chosen, a setting is no longer offered from the last campaign.
        await ok(second, "config", "difficulty", "easy");
        expect(await ok(second, "status")).toContain(" In their last campaign the player chose lethality epic: offer those first.");
    });

    it("never remember what belongs to one game: the mentor, a custom difficulty", async () => {
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "easy");
        await ok(first, "config", "mentor", "tutorial");
        await ok(first, "config", "difficulty", "custom");
        expect(lastChoices(home)).toEqual({ difficulty: "easy" });
    });

    it("never come from the campaign being set up: a first campaign has none, and a new choice leaves the last campaign's in view (T-212)", async () => {
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "hard");
        await ok(first, "config", "saves", "permadeath");
        const firstAsked = setupQuestions(first, contextIn(first), false);
        expect(firstAsked.filter((question) => question.last !== undefined)).toEqual([]);

        await ok(second, "init", "--name", "Seconda", "--language", "it", "--system", "fake");
        await ok(second, "config", "saves", "free");
        const asked = (name: string) => setupQuestions(second, contextIn(second), false).find((question) => question.name === name);
        expect(asked("saves")).toMatchObject({ value: "free", last: "permadeath" });
        expect(asked("difficulty")).toMatchObject({ last: "hard" });
        // The next campaign has the second's choice, and the first's where the second made none.
        expect(lastChoices(home)).toEqual({ difficulty: "hard", saves: "free" });
    });

    it("read nothing from a file written wrongly, and are rewritten whole at the next choice; a file of the choices alone is the campaigns' before", async () => {
        writeFileSync(join(home, "last-choices.json"), "{ not json");
        expect(lastChoices(home)).toEqual({});
        await ok(first, "init", "--name", "Prima", "--language", "it", "--system", "fake", "--difficulty", "normal");
        expect(JSON.parse(readFileSync(join(home, "last-choices.json"), "utf8"))).toMatchObject({ own: { difficulty: "normal" }, before: {} });

        writeFileSync(join(home, "last-choices.json"), JSON.stringify({ units: "imperial" }));
        expect(lastChoices(home, first)).toEqual({ units: "imperial" });
    });
});
