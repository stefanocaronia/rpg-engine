// The versions of a system's rules (D-513 (5), VER-1–VER-4), on the fake system's first and second: a common part with a folder for each version over it,
// chosen as the setting ruleset, the first while none is chosen, kept once the game has begun.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { campaignSystem, campaignSystemWords } from "../src/commands/shared/world.ts";
import type { Context } from "../src/core/context.ts";
import { findSystem } from "../src/systems/index.ts";
import { madeSystem, makeTempFolder, removeFolder, testContext, testSystemFolders, useSystem } from "./support.ts";

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

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

describe("VER-1, VER-2: a system lists its versions, and a campaign plays one", () => {
    it("asks the version in the setup as a setting of the system, the first played while none is chosen; validate checks one written by hand", async () => {
        expect(await ok("config")).toContain(
            "\nruleset: (missing; first: the first rules: a night's sleep brings back some stamina dice; second: the second rules: a night's sleep brings back every stamina die, and a rushlight burns longer)\n",
        );
        // The first is read meanwhile, never said as chosen.
        expect(await ok("status")).toContain("Guadoscuro · it · fake, the fake system of the core's tests, the version of its rules still to ask · ");
        expect(await ok("config", "system")).toMatch(/^system: fake, the fake system of the core's tests, the version of its rules still to ask \(@rpgengine\/system-fake 1\.0\.0\)\n/);
        expect(await ok("status")).toMatch(/ruleset \(first or second\), harshness \(gentle or bitter\)/);
        expect(campaignSystem(folder, context)?.recipes.find((recipe) => recipe.name === "night's sleep")?.regain).toMatchObject({ "stamina-*": { kind: "math", name: "max" } });

        expect(await refused("config", "ruleset", "third")).toContain('"third" is not a value of ruleset, which takes first (the first rules');
        const second = await ok("config", "ruleset", "Second");
        expect(second).toMatch(
            /^ruleset: second: the second rules: a night's sleep brings back every stamina die, and a rushlight burns longer\nFrom now on the campaign plays the rules second, in place of first: the pages already written stay as they are\.\n\nStill to agree with the player: /,
        );
        expect(second).not.toContain("ruleset (");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("ruleset: second\n");
        expect(await ok("config", "system")).toMatch(/^system: fake, the fake system of the core's tests, the second rules \(@rpgengine\/system-fake 1\.0\.0\)\n/);
        expect(campaignSystem(folder, context)?.recipes.find((recipe) => recipe.name === "night's sleep")?.regain).toEqual({ "stamina-*": { kind: "field", name: "max" } });

        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("ruleset: second", "ruleset: seconda"));
        expect(await ok("validate")).toContain('ruleset is "seconda", which the system fake does not take: first or second.');
        // A version written by hand that is not one of them plays the first, as none written does.
        expect(campaignSystem(folder, context)?.version?.name).toBe("first");
    });
});

describe("VER-3: the version's pages, rules, words and instructions over the common ones", () => {
    it("takes the version's page, chapter, word and part of the same name in the place of the common one, the rest staying common", async () => {
        expect(await ok("show", "Rushlight")).toContain("that burns two hours.");
        expect(await ok("rules", "Night's Sleep")).toContain("Half the stamina dice come back, at least one.");
        expect(campaignSystemWords(folder, context)?.Down).toBe("A terra");

        await ok("config", "ruleset", "second");
        expect(await ok("show", "Rushlight")).toContain("that burns four hours under the second rules.");
        expect(await ok("rules", "Night's Sleep")).toContain("Every stamina die comes back.");
        // A chapter only the common part has stays, as the common pages do.
        expect(await ok("rules", "Falling")).toContain("At 0 grit one falls.");
        expect(await ok("show", "Bog Hound")).toContain("Bog Hound");
        expect(campaignSystemWords(folder, context)).toMatchObject({ Down: "Caduto", Pinned: "Bloccato" });
        expect(campaignSystem(folder, context)?.parts.play.text).toContain("The fake system, second rules");
        expect(campaignSystem(folder, context)?.parts["session-zero"]).toBeDefined();
    });

    it("merges the version's system.yaml over the common one: a map by its names, a list or a value in its place; a version without its folder is no system", () => {
        const copy = join(makeTempFolder(), "fake");
        cpSync(join(testSystemFolders[1], "fake"), copy, { recursive: true });
        const versioned = join(copy, "versions", "second", "system.yaml");
        writeFileSync(versioned, `${readFileSync(versioned, "utf8")}conditions: [Dazed, Pinned, Asleep, Down, Soaked]\ntravel:\n  pace: quick\n`);
        const second = findSystem([join(copy, "..")], "fake", "second");
        expect(second?.title).toBe("the fake system of the core's tests");
        expect(second?.version).toMatchObject({ name: "second", title: "the second rules" });
        expect(second?.conditions).toEqual(["Dazed", "Pinned", "Asleep", "Down", "Soaked"]);
        expect(second?.travel).toMatchObject({ pace: "quick", paces: { quick: 6000, steady: 4500, slow: 3000 } });
        expect(findSystem([join(copy, "..")], "fake")?.version?.name).toBe("first");

        rmSync(join(copy, "versions", "first"), { recursive: true });
        expect(() => findSystem([join(copy, "..")], "fake")).toThrow(
            /^The game system fake cannot be read, because .*system\.yaml is not valid: versions\.first: there is no folder versions\/first with files beside it; give each version its folder, with what it changes\.$/,
        );
        mkdirSync(join(copy, "versions", "first", "rules"), { recursive: true });
        writeFileSync(join(copy, "versions", "first", "system.yaml"), "versions: {a: {means: a}, b: {means: b}}\n");
        expect(() => findSystem([join(copy, "..")], "fake")).toThrow(/versions[\\/]first[\\/]system\.yaml is not valid: a version lists no versions of its own\.$/);
    });
});

describe("VER-4: the version changes only as the player chooses", () => {
    it("plays the first unwritten once the game has begun, no longer asked; another chosen holds from the next read, the pages written staying", async () => {
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        expect(await ok("status")).not.toContain("ruleset (first or second)");
        const shown = await ok("config", "ruleset");
        expect(shown).toMatch(/^ruleset: first: the first rules: a night's sleep brings back some stamina dice\n/);
        expect(shown).not.toContain("ruleset (first or second)");
        expect(await ok("config", "ruleset", "FIRST")).not.toContain("From now on");

        const changed = await ok("config", "ruleset", "second");
        expect(changed).toMatch(
            /^ruleset: second: the second rules: a night's sleep brings back every stamina die, and a rushlight burns longer\nFrom now on the campaign plays the rules second, in place of first: the pages already written stay as they are\.\n/,
        );
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("ruleset: second\n");
        expect(await ok("show", "Rushlight")).toContain("that burns four hours under the second rules.");
        expect(await ok("show", "Ettore")).toContain("Ettore");
    });

    it("keeps the system once the game has begun, as SYS-9 says, whatever the version", async () => {
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc");
        expect(await refused("config", "system", "free")).toContain("a campaign keeps its system");
    });
});

describe("VER-1: a system with one version alone, as the 5e for now", () => {
    it("reads it with no setting to choose, and says nothing more of it", async () => {
        const systems = madeSystem("lone", {
            "system.yaml": 'title: a test system\nlanguage: en\nversions:\n  about: which rules you play\n  only: {means: "the only rules", player: "the only rules"}\n'
                + 'settings:\n  pace:\n    about: how fast it goes\n    slow: {means: "slow", player: "slow"}\n    quick: {means: "quick", player: "quick"}\n',
            "versions/only/system.yaml": "title: the only rules\n",
        });
        const lone = findSystem([systems], "lone");
        expect(lone?.version).toMatchObject({ name: "only", title: "the only rules" });
        expect(lone?.settings.map((setting) => setting.name)).toEqual(["pace"]);
        expect(lone?.title).toBe("a test system");
        context = { ...context, systemFolders: [systems, ...testSystemFolders] };
        useSystem(folder, "lone");
        expect(await refused("config", "ruleset", "only")).toContain('There is no setting "ruleset".');
        expect(await ok("status")).toContain("Guadoscuro · it · lone, a test system · ");
    });
});

describe("VER-1: a version is a folder of versions/", () => {
    it("refuses one that a path leads out of the system to", () => {
        const systems = madeSystem("astray", {
            "system.yaml": 'title: a test system\nlanguage: en\nversions:\n  about: which rules you play\n  ../../outside: {means: "far rules", player: "far rules"}\n',
            "versions/x/system.yaml": "title: x\n",
        });
        expect(() => findSystem([systems], "astray")).toThrow("versions.../../outside: a version is a folder of versions/, named such as srd-5.1.");
    });
});
