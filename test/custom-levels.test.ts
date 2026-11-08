// The custom difficulty and rigor (D-13, D-42, T-132), on the fake system: each item at its own level, started from the preset played until then; the engine
// counts food and load by their own level, formulas read the load's, and the master reads the levels item by item.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { playerChangeNews, playerSettingNamed, setupQuestions } from "../src/commands/config.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "hard", "--lethality", "dice");
    inPlay(folder);
});

afterEach(() => removeFolder(folder));

describe("config of a custom difficulty or rigor", () => {
    it("starts from the preset played until then, each item at its level, and keeps the items when custom is left and taken again", async () => {
        await ok("config", "rigor", "rules");
        await ok("config", "rigor", "custom");
        expect(campaign()).toMatch(/custom-rigor:\n {2}food: rules\n {2}light: rules\n {2}load: rules\n {2}fatigue: rules\n {2}travel: rules\n {2}supplies: rules/);
        await ok("config", "custom-rigor", "load: Smooth, Food: simulation");
        await ok("config", "rigor", "smooth");
        await ok("config", "rigor", "custom");
        expect(campaign()).toContain("  food: simulation\n");
        expect(campaign()).toContain("  load: smooth\n");
    });

    it("starts a custom difficulty from the difficulty played, and gives an item removed the default", async () => {
        await ok("config", "difficulty", "custom");
        expect(campaign()).toContain("custom-difficulty:\n  fights: hard\n");
        await ok("config", "custom-difficulty", "--remove", "fights");
        expect(await ok("config", "difficulty")).toMatch(/^difficulty: custom: item by item: fights moderate to high; .+; foes smart/m);
    });

    it("starts only the items not yet written from the preset played, keeping those written while it was not custom", async () => {
        await ok("config", "custom-difficulty", "fights: brutal");
        await ok("config", "difficulty", "custom");
        expect(campaign()).toMatch(/custom-difficulty:\n {2}fights: brutal\n {2}foes: hard\n/);
    });

    it("refuses an item or a level it does not take, saying which it takes", async () => {
        expect(await refused("config", "custom-rigor", "food")).toBe("food needs its level, smooth, rules, simulation: write it as food: rules. Nothing changed.");
        expect(await refused("config", "custom-rigor", "weather: rules")).toBe("weather is no item of the custom rigor: they are food, light, load, fatigue, travel, supplies. Nothing changed.");
        expect(await refused("config", "custom-difficulty", "clues: impossible")).toBe("clues takes story, easy, normal, hard, brutal, not impossible. Nothing changed.");
        expect(campaign()).not.toContain("custom-");
    });

    it("tells the master the levels item by item, grouped, with what the game counts itself", async () => {
        await ok("config", "rigor", "custom");
        await ok("config", "custom-rigor", "food: rules, light: rules, travel: simulation");
        const status = await ok("status");
        expect(status).toContain(
            "Rigor custom: item by item: load, fatigue and ammunition and components glossed over: count them only when the story turns on them; "
                + "food and water and light as written: charge with change what is used up, warn before something runs out, and once it has, the rule applies, "
                + "and advance spends the day's food outside a settlement and the day's lifestyle inside one, water and wages yours to charge, and an effect named after what burns, such as Rushlight, spends it as it is lit; "
                + "travel as written, and beyond: wear, spoilage, weather and the like. Where your instructions name a rigor, read it as the level of the item they speak of.",
        );
    });

    it("never offers custom in the setup's questions", async () => {
        const questions = setupQuestions(folder, context, false);
        expect(questions.find((question) => question.name === "difficulty")?.choices?.map((choice) => choice.value)).toEqual(["story", "easy", "normal", "hard", "brutal"]);
    });
});

describe("what the engine counts by its item's level", () => {
    beforeEach(async () => {
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "Bosco", "--type", "place");
        await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "might=1", "--add", "inventory=[[Hardtack]] 2", "--add", "inventory=[[Tallow]] 30");
        await ok("write", "Bosco", "--add", "contains=[[Ettore]]");
        await ok("config", "rigor", "custom");
    });

    it("spends the day's food by the food's level alone (UPK-1)", async () => {
        await ok("config", "custom-rigor", "food: smooth, load: rules");
        expect(await ok("advance", "--by", "1d")).not.toContain("Hardtack");
        await ok("config", "custom-rigor", "food: rules, load: smooth");
        expect(await ok("advance", "--by", "1d")).toContain("Ettore eats a day's food:");
    });

    it("says a load over the limit by the load's level alone (LOAD-3)", async () => {
        await ok("config", "custom-rigor", "food: rules, load: smooth");
        expect(await ok("status")).not.toContain("over the limit");
        await ok("config", "custom-rigor", "load: simulation");
        expect(await ok("status")).toContain("over the limit");
    });

    it("gives formulas the load's level as the rigor (FOR-2)", async () => {
        await ok("config", "fields", "burdened: number");
        await ok("config", "computed", 'burdened: "has(rigor, simulation)"');
        await ok("config", "custom-rigor", "food: simulation, load: rules");
        expect(await ok("show", "Ettore")).toContain("burdened 0");
        await ok("config", "custom-rigor", "load: simulation");
        expect(await ok("show", "Ettore")).toContain("burdened 1");
    });
});

describe("the custom items on the dashboard", () => {
    it("are the player's only while custom is played, and the master hears those changed with the whole", async () => {
        expect(playerSettingNamed(folder, context, "custom-rigor")).toBeUndefined();
        await runCommandLine(["config", "rigor", "custom"], { ...context, actor: "player" });
        const before = playerSettingNamed(folder, context, "custom-rigor");
        expect(before?.entries?.find((entry) => entry.name === "light")?.value).toBe("smooth");
        expect(before?.choices?.map((choice) => choice.value)).toEqual(["smooth", "rules", "simulation"]);
        await runCommandLine(["config", "custom-rigor", "light: rules"], { ...context, actor: "player" });
        const after = playerSettingNamed(folder, context, "custom-rigor");
        const news = playerChangeNews(folder, context, before ?? { name: "custom-rigor", about: "" }, after ?? { name: "custom-rigor", about: "" });
        expect(news).toHaveLength(1);
        expect(news[0]).toMatch(/^The player set in the custom rigor on the dashboard light to rules \(light as written: .+\)\. Play by it from now on\.$/);
    });
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode).not.toBe(0);
    return result.output;
}

function campaign(): string
{
    return readFileSync(join(folder, "campaign.yaml"), "utf8");
}
