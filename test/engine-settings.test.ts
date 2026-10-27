// What a game system offers of the engine's settings, the settings of its own that a value asks, and the parts its values choose (D-522, DAT-16–DAT-18), on
// free play, whose ways of deciding what happens are a setting, and on systems made for a check.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { playerChangeNews, playerSettings, setupQuestions } from "../src/commands/config.ts";
import { campaignWorld } from "../src/commands/game-world.ts";
import type { Context } from "../src/core/context.ts";
import { installedSystems } from "../src/systems/index.ts";
import { systemChecks } from "../src/testing.ts";
import { madeSystem, makeTempFolder, removeFolder, testContext, testSystemFolders } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Porto grigio", "--language", "it", "--system", "free", "--difficulty", "normal");
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

/** The whole setup but the given settings, then a player character and play. */
async function inPlay(...settings: [string, string][]): Promise<void>
{
    const usual: [string, string][] = [
        ["mentor", "off"],
        ["premise", "a grey harbour"],
        ["preparation", "on the fly"],
        ["saves", "checkpoint"],
        ["dice", "digital"],
        ["master-rolls", "behind the screen"],
        ["units", "metric"],
        ["companions", "none"],
        ["calendar-start", "day 1"],
        ["lines", "none"],
        ["veils", "none"],
    ];

    for (const [setting, value] of [...usual, ...settings]) {
        await ok("config", setting, value);
    }

    await ok("mode", "session zero");
    await ok("write", "Lena", "--type", "character", "--set", "role=pc", "--set", "concept=a smuggler", "--add", "abilities=sailing");
    await ok("mode", "play");
}

function settingNamed(name: string): ReturnType<typeof playerSettings>[number] | undefined
{
    return playerSettings(folder, context).find((setting) => setting.name === name);
}

describe("DAT-16: the engine's settings a system offers", () => {
    it("plays one value alone as no choice: never asked nor shown to the player, refused by config, read so whatever campaign.yaml writes", async () => {
        expect(await ok("status")).not.toMatch(/rigor/);
        expect(await ok("config")).toContain("\nrigor: smooth (the only one this game plays: no choice)\n");
        expect(await refused("config", "rigor", "rules")).toContain("rigor is no choice in this game: the game system free plays it smooth alone. Nothing changed.");
        expect(settingNamed("rigor")).toBeUndefined();
        expect(setupQuestions(folder, context, false).map((question) => question.name)).not.toContain("rigor");

        // Written by hand, as by a campaign that played another system before its first character.
        writeFileSync(join(folder, "campaign.yaml"), `${readFileSync(join(folder, "campaign.yaml"), "utf8")}rigor: rules\n`);
        expect(campaignWorld(folder, context).rigor).toBe("smooth");
        expect(await ok("status")).not.toMatch(/rigor/);
    });

    it("offers only the values of the one played: lethality without dice when the story decides, asked again when a change leaves it out", async () => {
        expect(settingNamed("lethality")?.choices?.map((choice) => choice.value)).toEqual(["narrative", "epic", "dice"]);
        await ok("config", "lethality", "dice");
        const told = await ok("config", "outcomes", "told");
        expect(told).toContain("lethality dice does not go with outcomes told: ask the player for narrative or epic, then set it with config.");
        expect(told).toContain("lethality (narrative, epic)");
        expect(await ok("config")).toContain("\nlethality: (missing; narrative, epic)\n");
        expect(settingNamed("lethality")).toEqual({ name: "lethality", about: "what a fall means", choices: [expect.objectContaining({ value: "narrative" }), expect.objectContaining({ value: "epic" })] });
        expect(await refused("config", "lethality", "dice")).toContain("lethality dice does not go with outcomes told: give narrative or epic. Nothing changed.");
        await ok("config", "lethality", "epic");
        expect(await ok("status")).toContain(" · lethality epic · ");

        // With the dice deciding again, every lethality is offered.
        await ok("config", "outcomes", "tossed");
        expect(settingNamed("lethality")?.choices?.map((choice) => choice.value)).toEqual(["narrative", "epic", "dice"]);
    });

    it("asks a setting with the values it offers, in the setup and in play, one written by hand with a value it does not offer too", async () => {
        await ok("config", "outcomes", "told");
        expect(await ok("status")).toContain("lethality (narrative, epic)");
        await ok("config", "outcomes", "rolled");
        await ok("config", "lethality", "dice");
        await ok("config", "outcomes", "told");
        await inPlay(["lethality", "narrative"]);
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("lethality: narrative", "lethality: dice"));
        // In play, the setting the game no longer offers is missing, with what it offers.
        expect(await ok("status")).toContain("Still missing: lethality (narrative, epic).");
    });

    it("refuses in the checks of a system an engine's setting it does not have, or a value the setting lacks", () => {
        const systems = madeSystem("stretto", {
            "system.yaml": "title: a test system of its settings\nlanguage: en\nengine-settings:\n  rigour: [smooth]\nsettings:\n  pace:\n    about: how fast\n"
                + "    slow: {means: slow, engine-settings: {lethality: [deadly, epic]}}\n    fast: {means: fast}\n",
        });
        expect(systemChecks(join(systems, "stretto")).declarations).toEqual([
            "engine-settings: rigour is no setting of the engine with values to offer",
            "settings.pace.slow: lethality has no value deadly",
        ]);
    });
});

describe("DAT-17: a setting a value asks", () => {
    it("asks the die of the campaign only where the dice decide, with the value each setting suggests, the way first after the mentor", async () => {
        expect(await ok("status")).not.toMatch(/\bdie \(/);
        expect(await refused("config", "die", "d20")).toContain("die holds only with outcomes rolled: change that first, if the player wants it. Nothing changed.");
        expect(await ok("config")).not.toMatch(/\ndie:/);
        const questions = setupQuestions(folder, context, false);
        expect(questions.map((question) => question.name).slice(0, 3)).toEqual(["mentor", "outcomes", "difficulty"]);
        expect(questions.find((question) => question.name === "outcomes")?.suggested).toBe("rolled");
        expect(questions.find((question) => question.name === "die")).toBeUndefined();

        await ok("config", "outcomes", "rolled");
        expect(await ok("status")).toContain("die (d6 or d20)");
        expect(setupQuestions(folder, context, false).find((question) => question.name === "die")).toMatchObject({ suggested: "d6", choices: [{ value: "d6" }, { value: "d20" }] });
        expect(await ok("config", "die", "d20")).toContain("die: d20: a d20 for each roll of the player's");
        expect(await ok("status")).toContain(" · outcomes rolled · die d20 · ");

        // Another way leaves it written, and holding no more.
        await ok("config", "outcomes", "tossed");
        expect(await ok("status")).not.toMatch(/die d20/);
        expect(settingNamed("die")).toBeUndefined();
    });

    it("refuses a system whose value asks a setting it does not have, or its own, and one that suggests two values", () => {
        const system = (yaml: string): string => madeSystem("chiesto", { "system.yaml": `title: a test system of its settings\nlanguage: en\nsettings:\n${yaml}` });
        expect(() => installedSystems([system("  pace:\n    slow: {means: slow, asks: [die]}\n    fast: {means: fast}\n")])).toThrow("settings.pace.slow: asks die, which is no setting of the system");
        expect(() => installedSystems([system("  pace:\n    slow: {means: slow, asks: [pace]}\n    fast: {means: fast}\n")])).toThrow("settings.pace.slow: asks pace, which is its own setting");
        expect(() => installedSystems([system("  pace:\n    slow: {means: slow, suggested: true}\n    fast: {means: fast, suggested: true}\n")])).toThrow("settings.pace: suggest one value at most");
        expect(installedSystems(testSystemFolders).find((one) => one.name === "free")?.settings.map((setting) => setting.name)).toEqual(["outcomes", "die"]);
    });
});

describe("DAT-18: the part of a value", () => {
    it("follows the part of play with the part of the way played, the die named in it, and comes with the player's change on the dashboard", async () => {
        await inPlay(["outcomes", "rolled"], ["die", "d20"], ["lethality", "dice"]);
        const instructions = await ok("instructions");
        const play = instructions.indexOf("### Free play");
        const way = instructions.indexOf("- Every roll is one d20, the player's shown");
        expect(play).toBeGreaterThan(0);
        expect(way).toBeGreaterThan(play);
        expect(instructions).toContain("Lethality dice means the d20: when the character falls");
        expect(instructions).not.toContain("{die}");
        expect(instructions).not.toContain("The player never rolls");
        expect(instructions).not.toContain("No dice: coins, heads or tails.");

        const before = settingNamed("outcomes");
        await runCommandLine(["config", "outcomes", "told"], { ...context, actor: "player" });
        const after = settingNamed("outcomes");

        if (before === undefined || after === undefined) {
            throw new Error("outcomes is no setting of the player's");
        }

        const news = playerChangeNews(folder, context, before, after).join("\n\n");
        expect(news).toMatch(/^The player set outcomes to told on the dashboard: the story decides: .+ Play by it from now on\.\n\n- The player never rolls:/);
        expect(news).toContain("lethality dice does not go with outcomes told: ask the player for narrative or epic, then set it with config.");
        expect(await ok("instructions")).toContain("- Your 1d100 on the world is always hidden here, and never mentioned.");
    });

    it("gives the master the part of the value they set themselves in play, and none in the setup", async () => {
        expect(await ok("config", "outcomes", "tossed")).not.toContain("No dice: coins");
        await inPlay(["outcomes", "rolled"], ["die", "d6"], ["lethality", "epic"]);
        const tossed = await ok("config", "outcomes", "tossed");
        expect(tossed).toContain("- One coin answers yes or no. With two, the first answers and the second shades it");
        expect(tossed).not.toContain("Every roll is one");
    });
});
