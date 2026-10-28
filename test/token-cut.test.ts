// The cut of the master's tokens (D-532): rules that left the instructions always given for the parts of their situations and the outputs of the calls they
// belong to, each once in a chat or when it applies; the dashboard's sections only when the player asks how to use it; two rules of play gone (D-531 (6)).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { corePart, masterInstructions } from "../src/instructions/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
const link = "http://127.0.0.1:5760/?key=abc";

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Rocca", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "grit=12/12");
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** A command in a chat, where the MCP server keeps what it told, with the dashboard served or not. */
function chat(dashboard?: string): (...args: string[]) => Promise<string>
{
    const inChat = { ...context, told: new Set<string>(), ...(dashboard === undefined ? {} : { dashboard }) };

    return async (...args) => {
        const result = await runCommandLine(args, inChat);
        expect(result.exitCode, result.output).toBe(0);
        return result.output;
    };
}

describe("the instructions always given (D-532)", () => {
    it("no longer hold the rules that went to the parts and the outputs, nor the two of D-531 (6) taken away", async () => {
        const given = await ok("instructions");

        for (
            const gone of [
                "After a peak",
                "Judge a challenge by what it cost",
                "see which clock would fill",
                "Keep two or three threats in motion",
                "Watch pace, variety",
                "Enemies act by their intelligence",
                "Give every foe that matters",
                "Tie it to established facts",
                "ask in one question",
                "stands until a time",
                "never simply for sale",
                "`instructions`: before your first reply",
                "`validate`: when status",
            ]
        ) {
            expect(given).not.toContain(gone);
        }

        expect(masterInstructions()).toContain("14. Prepare situations, not plots, and build so what you improvise, as for a choice you did not foresee:");
        expect(masterInstructions()).toContain("a safe one and a risky one, none favoured");
        expect(given).toContain("a foe beyond the party's means by its number, its gear and how it moves");
        expect(given).toContain("let the scene answer; never ask what would decide a secret.");
    });

    it("give each of those rules in the part of its situation", () => {
        expect(corePart("combat")).toContain("- Foes act by their intelligence and motives.\n");
        expect(corePart("adventure")).toContain("Give every foe that matters one thing to find out and use, such as a weakness, a habit or a tell");
        expect(corePart("session")).toContain("- Keep two or three threats in motion, each a planned event with a clock and an owner");
        expect(corePart("session")).toContain("- Watch pace, variety, difficulty and engagement");
        expect(corePart("new-day")).toMatch(/Before you skip days again, see which clock would fill and stop there\.$/);
        expect(corePart("social")).not.toMatch(/for sale|stands until/);
    });
});

describe("the dashboard's sections (D-532)", () => {
    it("are not in the instructions, which give its link and how to read them when the player asks", async () => {
        const given = await chat(link)("instructions");
        expect(given).toContain(`at ${link}:`);
        expect(given).toContain("When they ask how to use it, call `instructions` with part dashboard");
        expect(given).not.toContain("- Party: their character's sheet");
    });

    it("come with instructions part dashboard, which starts nothing over in the chat; none where no dashboard is served", async () => {
        const run = chat(link);
        await run("instructions");
        expect(await run("status")).toContain("Write nothing to the player until your message is ready");
        const guide = await run("instructions", "--part", "dashboard");
        expect(guide).toMatch(/^How the player uses their dashboard, to answer in a few words[^\n]*\n- Party: their character's sheet/);
        expect(guide).not.toContain("# Game master");
        // What the chat was told stays told: the opening does not come again.
        expect(await run("status")).not.toContain("Write nothing to the player until your message is ready");
        expect(await runCommandLine(["instructions", "--part", "dashboard"], context)).toEqual({ exitCode: 1, output: "No dashboard is served in this chat: answer in words what the player asked." });
    });
});

describe("the notes of the outputs (D-532)", () => {
    const peak = "After a peak, give a quiet scene the player can fill: a meal, rain, a talk. Judge a challenge by what it cost, not by whether it was won: "
        + "after two that cost nothing, let the next rise, within what the difficulty allows.";

    it("scene close of a fight or a challenge says once in a chat what comes after a peak; another scene, or the command line, never", async () => {
        const run = chat();
        await run("scene", "open", "--title", "Il guado", "--type", "social", "--with", "Bruna");
        expect(await run("scene", "close", "--summary", "Parlano.")).not.toContain(peak);
        await run("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Bruna");
        expect(await run("scene", "close", "--summary", "Respinti.")).toContain(`\n${peak}`);
        await run("scene", "open", "--title", "La corsa", "--type", "challenge", "--with", "Bruna");
        expect(await run("scene", "close", "--summary", "Arrivati.")).not.toContain(peak);
        await ok("scene", "open", "--title", "Secondo agguato", "--type", "combat", "--with", "Bruna");
        expect(await ok("scene", "close", "--summary", "Respinti.")).not.toContain(peak);
    });

    it("a day paid by the lodging says once in a chat that it is the day's bed and board", async () => {
        const run = chat();
        const meaning = "What lodging pays is the day's bed and board: while it is set, never charge rooms and meals again; for nights paid one by one, or board earned by work, clear it while it lasts.";
        await ok("config", "rigor", "rules");
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "Guadoscuro", "--type", "place", "--set", "kind=village", "--add", "contains=[[Bruna]]");
        await ok("write", "Bruna", "--set", "lodging=Inn", "--set", "money=5 shilling");
        expect(await run("advance", "--by", "1d")).toContain(`Bruna pays an Inn day: money 5 shilling → 3 shilling. ${meaning}`);
        expect(await run("advance", "--by", "1d")).not.toContain(meaning);
    });
});
