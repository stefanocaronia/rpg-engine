// The companions' diaries (MECCANICHE, DIA-1–DIA-4; D-497): writing a line, whose diary is due and when outputs say so, what view as gives back, what the journal shows.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { view, type ViewResult } from "../src/commands/view/view.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).not.toBe(0);
    return result.output;
}

/** A scene lived by those given, closed. */
async function scene(title: string, ...people: string[]): Promise<void>
{
    await ok("scene", "open", "--title", title, "--type", "social", ...people.flatMap((name) => ["--with", name]));
    await ok("scene", "close", "--summary", `${title}.`);
}

function journal(): Extract<ViewResult, { kind: "journal"; }>
{
    const result = view.run({ journal: true }, context) as ViewResult;

    if (result.kind !== "journal") {
        throw new Error(`The view is ${result.kind}, not the journal.`);
    }

    return result;
}

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Kira", "--type", "character", "--set", "role=pc");
    await ok("write", "Bran", "--type", "character", "--set", "role=companion");
    await ok("write", "Mira", "--type", "character", "--set", "role=companion");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc");
    await ok("write", "Guado", "--type", "place", "--add", "contains=[[Kira]]", "--add", "contains=[[Bran]]", "--add", "contains=[[Mira]]", "--add", "contains=[[Varro]]");
    await ok("advance", "--to", "day 1, 18:00");
});

afterEach(() => removeFolder(folder));

describe("writing a diary (DIA-1)", () => {
    it("keeps a companion's lines as a public line of the log, with the game date, and leaves the page alone", async () => {
        expect(await ok("thoughts", "Bran", "Non mi fido di Varro.\nLo terrò d'occhio.")).toBe("Bran's diary, day 1, 18:00: Non mi fido di Varro. Lo terrò d'occhio.");
        const line = readLogFile(folder).at(-1);
        expect(line).toMatchObject({ type: "thoughts", visibility: "public", date: "day 1, 18:00", data: { page: "Bran", text: "Non mi fido di Varro. Lo terrò d'occhio." } });
    });

    it("takes only companions, and at most 200 characters", async () => {
        expect(await refused("thoughts", "Kira", "Paura.")).toContain("Kira is not a companion of the party: only companions keep a diary. Nothing written.");
        expect(await refused("thoughts", "Varro", "Paura.")).toContain("Varro is not a companion");
        expect(await refused("thoughts", "Nessuno", "Paura.")).toContain("There is no page Nessuno");
        expect(await refused("thoughts", "Bran", "  ")).toContain("Give the lines Bran writes.");
        expect(await refused("thoughts", "Bran", "a".repeat(201))).toContain("These lines are 201 characters, the diary takes 200");
        await ok("thoughts", "Bran", "a".repeat(200));
        // Characters as a reader counts them: 200 emoji are 200, not 400.
        await ok("thoughts", "Bran", "🐺".repeat(200));
        expect(readLogFile(folder).filter((entry) => entry.type === "thoughts")).toHaveLength(2);
    });

    it("takes no page of the game system, no copy, and no dead companion", async () => {
        expect(await refused("thoughts", "Bog Hound", "Fame.")).toContain("Bog Hound is not a companion");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--creatures", "Bog Hound=1");
        expect(await refused("thoughts", "Bog Hound 1", "Fame.")).not.toBe("");
        await ok("scene", "close", "--summary", "Il lupo scappa.");
        await ok("write", "Bran", "--set", "status=dead");
        expect(await refused("thoughts", "Bran", "Addio.")).toContain("Bran is dead: the dead keep no diary. Nothing written.");
    });

    it("keeps a companion's lines under a new name", async () => {
        await ok("thoughts", "Bran", "Uno.");
        await ok("rename", "Bran", "Brando");
        expect(await ok("view", "--as", "Brando")).toContain("- day 1, 18:00 · Uno.");
        expect(journal().thoughts).toEqual([{ who: "Brando", date: "day 1, 18:00", text: "Uno." }]);
    });
});

describe("whose diary is due (DIA-2)", () => {
    it("is no one's before a scene, and says nothing on a new day", async () => {
        expect(await ok("advance", "--by", "12h")).not.toContain("Diary:");
    });

    it("names one companion who lived a scene, the one whose last line is oldest, on a new day", async () => {
        await scene("Al pozzo", "Kira", "Bran", "Mira");
        const first = await ok("advance", "--by", "12h");
        expect(first).toContain("Diary: Bran's is due: at this pause, before the story goes on, have them write a few lines on how they took what they lived: write it yourself in their voice, with thoughts.");
        expect(first).not.toContain("Mira lived");

        await ok("thoughts", "Bran", "Il pozzo mi mette paura.");
        expect(await ok("advance", "--by", "1d")).toContain("Diary: Mira's is due");
        await ok("thoughts", "Mira", "Kira sa ascoltare.");
        expect(await ok("advance", "--by", "1d")).not.toContain("Diary:");
    });

    it("counts the open scene when it opened after the last line, and never time within the day", async () => {
        await ok("thoughts", "Bran", "Domani si parte.");
        await ok("thoughts", "Mira", "Domani si parte.");
        await ok("scene", "open", "--title", "Il bivacco", "--type", "social", "--with", "Kira", "--with", "Mira");
        expect(await ok("advance", "--by", "2h")).not.toContain("Diary:");
        expect(await ok("advance", "--by", "12h")).toContain("Diary: Mira's is due");
    });

    it("asks the character agent where the chat has it and the master does not voice everyone", async () => {
        await scene("Al pozzo", "Kira", "Bran");
        const agent = await runCommandLine(["advance", "--by", "12h"], { ...context, host: () => "claude-code", characterAgent: true });
        expect(agent.output).toContain(
            `Diary: Bran's is due: at this pause, before the story goes on, have them write a few lines on how they took what they lived: ask their agent "Write your diary" and keep its Writes line with thoughts.`,
        );
        await ok("config", "voices", "master");
        const master = await runCommandLine(["advance", "--by", "1d"], { ...context, host: () => "claude-code", characterAgent: true });
        expect(master.output).toContain("write it yourself in their voice, with thoughts.");
    });

    it("counts who left a scene, and never the dead nor who left the party", async () => {
        await ok("scene", "open", "--title", "Al pozzo", "--type", "social", "--with", "Kira", "--with", "Bran", "--with", "Mira");
        await ok("scene", "leave", "--who", "Bran");
        await ok("scene", "close", "--summary", "Al pozzo.");
        await ok("write", "Mira", "--set", "role=npc");
        expect(await ok("advance", "--by", "12h")).toContain("Diary: Bran's is due");
        await ok("write", "Bran", "--set", "status=dead");
        expect(await ok("advance", "--by", "1d")).not.toContain("Diary:");
    });

    it("names the one whose last line is older, then the other", async () => {
        await ok("thoughts", "Mira", "Uno.");
        await ok("thoughts", "Bran", "Due.");
        await scene("Al pozzo", "Kira", "Bran", "Mira");
        expect(await ok("advance", "--by", "12h")).toContain("Diary: Mira's is due");
        await ok("thoughts", "Mira", "Tre.");
        expect(await ok("advance", "--by", "1d")).toContain("Diary: Bran's is due");
    });

    it("is said when a quest ends", async () => {
        await ok("write", "Il pozzo", "--type", "quest", "--set", "status=open");
        await scene("Al pozzo", "Kira", "Mira");
        expect(await ok("write", "Il pozzo", "--set", "status=done")).toContain("Diary: Mira's is due");
    });
});

describe("what a companion reads of their diary (DIA-3)", () => {
    it("gives a companion their last three lines and the rule, and no one else's", async () => {
        expect(await ok("view", "--as", "Bran")).toContain(
            "Your diary: nothing yet. When you write in it: how you took what happened, whom you trust or fear now, what you mean to do; never what happened (Lived keeps it), and nothing you hide from the others.",
        );

        for (const text of ["Uno.", "Due.", "Tre.", "Quattro."]) {
            await ok("thoughts", "Bran", text);
        }

        await ok("thoughts", "Mira", "Di Mira.");
        const memory = await ok("view", "--as", "Bran");
        expect(memory).toContain("Your diary, the last lines:\n- day 1, 18:00 · Due.\n- day 1, 18:00 · Tre.\n- day 1, 18:00 · Quattro.\nWhen you write in it:");
        expect(memory).not.toContain("Uno.");
        expect(memory).not.toContain("Di Mira.");
        expect(await ok("view", "--as", "Varro")).not.toContain("Your diary");
    });
});

describe("what the player reads (DIA-4)", () => {
    it("gives every line in the journal, the last first, and never as a fact of the story", async () => {
        await ok("thoughts", "Bran", "Uno.");
        await ok("advance", "--by", "1h");
        await ok("thoughts", "Mira", "Due.");
        expect(journal().thoughts).toEqual([
            { who: "Mira", date: "day 1, 19:00", text: "Due." },
            { who: "Bran", date: "day 1, 18:00", text: "Uno." },
        ]);
        expect(JSON.stringify(journal().chapters)).not.toContain("Uno.");
        expect(await ok("view")).not.toContain("Uno.");
    });
});
