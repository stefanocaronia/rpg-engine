// A check of what the player character knows (sheet-knowledge): roll and ask tell the master to say what it reveals as knowledge, never as an episode of the
// character's past the player has not told (Elena's tests of 28 October). Text for the master, not a mechanic: nothing else of the roll changes.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { ask } from "../src/commands/ask.ts";
import type { Context, Player } from "../src/core/context.ts";
import { madeSystem, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

const note = "What it reveals is what the world shows or their trade knows, said as knowledge: an episode of their past the player has not told is a question to them.";
const outcome = "Tell the outcome in the story, with the roll in brackets right after the moment it decides; write nothing until your message is ready.";

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** The player who presses the button at index. */
function pressing(index: number): Player
{
    return { choose: () => Promise.resolve(index) };
}

async function asked(options: string[], index: number): Promise<string>
{
    const input = ask.input.parse({ question: "Riconosci il sigillo? Se fallisci, non ne sai nulla", options, who: "Bruna" });
    return ask.format(await ask.run(input, { ...context, player: pressing(index) }));
}

describe("a check of what the character knows", () => {
    beforeEach(async () => {
        await ok("init", "--name", "Rocca", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        await ok("write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "wit=14", "--set", "might=8");
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "wit=12");
    });

    it("rolled with roll for the player character, says once to tell it as knowledge, hidden too; another check does not", async () => {
        const known = await ok("roll", "2d6+wit-bonus", "--who", "Bruna", "--why", "il sigillo");
        expect(known).toMatch(new RegExp(`^id\\d+ Bruna, il sigillo: 2d6\\+wit-bonus = .+\\n${note.replace(/[.]/g, "\\.")}$`));
        expect(known.split(note)).toHaveLength(2);
        expect(await ok("roll", "2d6+wit-bonus", "--who", "Bruna", "--why", "il sigillo", "--hidden")).toContain(`\n${note}`);
        expect(await ok("roll", "2d6+might-bonus", "--who", "Bruna", "--why", "la porta")).not.toContain(note);
        expect(await ok("roll", "2d6+2", "--who", "Bruna", "--why", "il sigillo")).not.toContain(note);
    });

    it("of a companion says nothing of it: the player tells only their own character's past", async () => {
        expect(await ok("roll", "2d6+wit-bonus", "--who", "Lena", "--why", "il sigillo")).not.toContain(note);
    });

    it("asked with buttons, says it right after the outcome to tell; the other check does not", async () => {
        expect(await asked(["Ingegno 2d6+wit-bonus", "Forza 2d6+might-bonus"], 0)).toContain(`${outcome}\n${note}`);
        expect(await asked(["Ingegno 2d6+wit-bonus", "Forza 2d6+might-bonus"], 1)).not.toContain(note);
    });
});

describe("a system that declares no checks of knowledge", () => {
    it("never says it, whatever is rolled", async () => {
        // A system of its fields alone, with a number to roll and no sheet-knowledge.
        const systems = madeSystem("bare", { "system.yaml": "title: a test system of its fields alone\nlanguage: en\nfields:\n  wits: number\n" });
        context = { ...context, systemFolders: [systems, ...(context.systemFolders ?? [])] };
        await ok("init", "--name", "Ferro", "--language", "it", "--system", "bare", "--difficulty", "normal", "--lethality", "dice");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "wits=3");
        expect(await ok("roll", "1d6+wits", "--who", "Kira", "--why", "il sigillo")).not.toContain(note);
    });
});
