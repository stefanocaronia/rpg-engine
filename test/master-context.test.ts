// The master's context (D-530): the part adventure when an adventure is to build, how a session opens, and the rules that left the instructions for the
// outputs of the calls they belong to, each once in a chat or when it applies, never lost.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { corePart, masterInstructions } from "../src/instructions/index.ts";
import { inPlay, madeSystem, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
});

afterEach(() => removeFolder(folder));

const adventure = corePart("adventure") ?? "";
const session = corePart("session") ?? "";
const knows = "When the player asks what their character knows, remembers or has seen, answer from view, never from show, which holds what they have not found out.";
const time = "Tell time and how long things take the way the world measures it: dawn, the third bell, a candle's length.";
const real = "Asked whether a roll was real: for a shown one, its numbers and reason; for a hidden one, its fingerprint. Never claim physical dice you did not roll.";

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** A command in a chat, where the MCP server keeps what it told. */
function chat(): (...args: string[]) => Promise<string>
{
    const inChat = { ...context, told: new Set<string>() };

    return async (...args) => {
        const result = await runCommandLine(args, inChat);
        expect(result.exitCode, result.output).toBe(0);
        return result.output;
    };
}

/** A campaign of the fake system in play, with its player character. */
async function playing(): Promise<void>
{
    await ok("init", "--name", "Rocca", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "grit=12/12");
}

/** A campaign of a system of its fields alone whose setup is done, its player character made, in session zero. */
async function readyForPlay(): Promise<void>
{
    const systems = madeSystem("bare", { "system.yaml": "title: a test system of its fields alone\nlanguage: en\nfields:\n  health: counter\n" });
    context = { ...context, systemFolders: [systems, ...(context.systemFolders ?? [])] };
    await ok("init", "--name", "Ferro", "--system", "bare");
    await ok("write", "Guado", "--type", "place");
    const answers = [
        ["language", "it"],
        ["mentor", "off"],
        ["difficulty", "normal"],
        ["lethality", "dice"],
        ["saves", "checkpoint"],
        ["rigor", "smooth"],
        ["dice", "digital"],
        ["master-rolls", "behind the screen"],
        ["units", "metric"],
        ["companions", "none"],
        ["calendar-start", "day 1"],
        ["lines", "none"],
        ["veils", "none"],
    ];

    for (const [setting, value] of answers) {
        await ok("config", setting, value);
    }

    await ok("mode", "session zero");
    await ok("write", "Kira", "--type", "character", "--set", "role=pc");
}

describe("the part adventure (D-530 (8))", () => {
    it("is a part of the core that holds for an adventure under way too, with how a session opens beside it", () => {
        expect(adventure).toMatch(/^An adventure is a quest with its secrets and events; a written or planned one opens as it is written\. Build one so:/);
        expect(adventure).not.toMatch(/No adventure is under way/);
        expect(session).toMatch(/^Before this session opens, choose about ten secrets/);
    });

    it("comes into play when no quest is open or planned, once in a chat; a planned quest is an adventure ready", async () => {
        await readyForPlay();
        const run = chat();
        const entered = await run("mode", "play");
        expect(entered).toContain(`\n\n${session}\n\nNo quest is open or planned: before the first scene, build an adventure.\n\n${adventure}`);
        await ok("mode", "session zero");
        await ok("write", "La torre", "--type", "quest");
        expect(await ok("mode", "play")).not.toContain("build an adventure");
    });

    it("comes with the write that ends the last quest open or planned, beside quest-ends, and then as its line alone in the same chat", async () => {
        await playing();
        await ok("write", "Il guado", "--type", "quest", "--set", "status=open");
        await ok("write", "La torre", "--type", "quest", "--set", "status=open");
        const run = chat();
        const first = await run("write", "Il guado", "--set", "status=done");
        expect(first).not.toContain("build the next adventure");
        const last = await run("write", "La torre", "--set", "status=failed");
        expect(last).toContain(`No quest is open or planned now: build the next adventure.\n\n${adventure}`);
        await run("write", "Il pozzo", "--type", "quest", "--set", "status=open");
        const again = await run("write", "Il pozzo", "--set", "status=done");
        expect(again).toContain("No quest is open or planned now: build the next adventure.");
        expect(again).not.toContain(adventure);
        // A quest that does not end says nothing of it.
        expect(await run("write", "Il pozzo", "--text", "Asciutto.")).not.toContain("adventure");
    });

    it("comes at the first status of a chat in play: with no quest, or, with the preparation on the fly, for the adventure under way", async () => {
        await playing();
        const none = await chat()("status");
        expect(none).toContain(`\n\n${session}\n\nNo quest is open or planned: before this session opens, build the next adventure.\n\n${adventure}`);
        await ok("write", "La torre", "--type", "quest", "--set", "status=open");
        await ok("config", "preparation", "all at the start");
        const prepared = await chat()("status");
        expect(prepared).toContain(session);
        expect(prepared).not.toContain(adventure);
        await ok("config", "preparation", "on the fly");
        const run = chat();
        expect(await run("status")).toContain(`The preparation is on the fly: before this session opens, build what it needs of the adventure under way.\n\n${adventure}`);
        expect(await run("status")).not.toContain(session);
        // On the command line no master opens a session.
        expect(await ok("status")).not.toContain(session);
    });

    it("never comes before play: the setup and session zero open no session", async () => {
        await ok("init", "--name", "Rocca", "--system", "fake");
        expect(await chat()("status")).not.toContain(session);
    });
});

describe("the rules that left the instructions for the outputs (D-530)", () => {
    it("are no longer in the instructions of play, and each is in the output it belongs to", async () => {
        await playing();
        const given = await ok("instructions");

        for (const gone of ["third bell", "about ten secrets", "short recap", "A fall means", "answer from `view`", "precedents setting", "Roll hidden when", "physical dice you did not roll"]) {
            expect(given).not.toContain(gone);
        }

        expect(masterInstructions()).toContain("An agreement on how the game is played, such as how characters are made, goes in the table setting, in the words you said.");
        // The precedents: rules says it when no text holds; the hidden roll: roll's own description.
        expect(await ok("rules", "zzzz")).toContain("If you rule without the text, tell the player it is your call, and add it to the precedents");
        expect(await ok("roll", "--help")).toContain("Make it hidden when the player must not see the result; left out, a roll for a foe or anyone outside the party is hidden or shown as the master-rolls setting says.");
    });

    it("show says once in a chat that what the character knows is view's", async () => {
        await playing();
        await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Il mugnaio.");
        const run = chat();
        expect(await run("show", "Varro")).toMatch(new RegExp(`\n\n${knows}$`));
        expect(await run("show", "Varro")).not.toContain(knows);
        expect(await run("instructions")).not.toContain(knows);
        expect(await run("show", "Bruna#Gear")).toContain(knows);
        expect(await ok("show", "Varro")).not.toContain(knows);
    });

    it("advance says once in a chat how the world tells time", async () => {
        await playing();
        const run = chat();
        expect(await run("advance", "--to", "day 1, 08:00")).toContain(time);
        expect(await run("advance", "--by", "1h")).not.toContain(time);
        expect(await ok("advance", "--by", "1h")).not.toContain(time);
    });

    it("roll says once in a chat what to answer when asked whether a roll was real, after a hidden roll too", async () => {
        await playing();
        const run = chat();
        expect(await run("roll", "1d6", "--why", "una porta", "--hidden")).toMatch(new RegExp(`fingerprint, only if the player asks for it: \\S+\n${real.replace(/[.]/g, "\\.")}$`));
        expect(await run("roll", "1d6", "--why", "un'altra porta")).not.toContain(real);
        expect(await ok("roll", "1d6", "--why", "la terza")).not.toContain(real);
    });

    it("a fall of the player character to the system's down value says what lethality makes of it, and only then", async () => {
        await playing();
        const death = "If they die, write status=dead: it says what the saves allow.";
        expect(await ok("change", "Bruna", "grit", "--by=-5")).not.toContain("is down");
        expect(await ok("change", "Bruna", "grit", "--to", "0")).toContain(`Bruna is down: with lethality dice, the dice decide, as the rules say. ${death}`);
        expect(await ok("change", "Bruna", "grit", "--by=-1")).not.toContain("is down");
        await ok("change", "Bruna", "grit", "--to", "5");
        await ok("config", "lethality", "narrative");
        const narrative = await ok("change", "Bruna", "grit", "--by=-9");
        expect(narrative).toContain("Bruna is down: with lethality narrative, the character never dies of it.");
        expect(narrative).not.toContain(death);
        await ok("change", "Bruna", "grit", "--to", "5");
        await ok("config", "lethality", "epic");
        expect(await ok("change", "Bruna", "grit", "--to", "0")).toContain(`Bruna is down: with lethality epic, the character dies only when it matters. ${death}`);
        // A companion's fall is not the player's character's.
        await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "grit=6/6");
        expect(await ok("change", "Lena", "grit", "--to", "0")).not.toContain("is down");
    });
});

describe("the loot of the fallen (D-530, Elena's tests of 27 October)", () => {
    const loot = (name: string): string => `What is on or in ${name} is there to be found: tell what the party sees, and let the player say what is taken, and by whom.`;

    it("show says it of one dead or down, a copy too, and of an item that holds something; never of the living, nor of what the party holds", async () => {
        await playing();

        for (const item of ["Anello", "Pugnale", "Moneta", "Corda"]) {
            await ok("write", item, "--type", "item");
        }

        await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "status=dead", "--add", "inventory=[[Anello]]");
        await ok("write", "Mira", "--type", "character", "--set", "role=npc", "--add", "inventory=[[Pugnale]]");
        await ok("write", "Lupo", "--type", "creature", "--set", "grit=4/4");
        await ok("write", "Forziere", "--type", "item", "--add", "contains=[[Moneta]]");
        await ok("write", "Zaino", "--type", "item", "--add", "contains=[[Corda]]");
        await ok("write", "Bruna", "--add", "inventory=[[Zaino]]");
        expect(await ok("show", "Varro")).toContain(loot("Varro"));
        expect(await ok("show", "Mira")).not.toContain(loot("Mira"));
        expect(await ok("show", "Forziere")).toContain(loot("Forziere"));
        expect(await ok("show", "Zaino")).not.toContain(loot("Zaino"));
        expect(await ok("show", "Moneta")).not.toContain("is there to be found");
        await ok("change", "Bruna", "grit", "--to", "0");
        expect(await ok("show", "Bruna")).not.toContain("is there to be found");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--creatures", "Lupo=1");
        const copy = "Lupo 1";
        expect(await ok("show", copy)).not.toContain("is there to be found");
        await ok("change", copy, "grit", "--to", "0");
        expect(await ok("show", copy)).toContain(loot(copy));
    });

    it("scene close says once who fell there, copies by their creature, and that what they carried lies there; never the living, the fled or the party", async () => {
        await playing();
        await ok("write", "Lupo", "--type", "creature", "--set", "grit=4/4");
        await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "grit=6/6");
        await ok("write", "Mira", "--type", "character", "--set", "role=npc", "--set", "grit=6/6");
        await ok("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Bruna", "--with", "Varro", "--with", "Mira", "--creatures", "Lupo=4");
        await ok("change", "Lupo 1", "grit", "--to", "0");
        await ok("change", "Lupo 2", "grit", "--to", "0");
        await ok("change", "Lupo 3", "grit", "--to", "0");
        // One left the scene fallen, one fled whole: only the fallen leave what they carried.
        await ok("scene", "leave", "--who", "Lupo 3", "--who", "Lupo 4");
        await ok("change", "Varro", "grit", "--to", "0");
        await ok("change", "Bruna", "grit", "--to", "0");
        const closed = await ok("scene", "close", "--summary", "I lupi cadono.");
        const line = "Fallen here: Lupo 1, Lupo 2, Lupo 3 (show Lupo), Varro. What they carried lies where they fell: tell what the party sees, and let the player say what is taken, and by whom.";
        expect(closed).toContain(`\n${line}\n`);
        expect(closed.split("Fallen here")).toHaveLength(2);
        expect(closed).not.toMatch(/Fallen here:[^\n]*(Lupo 4|Mira|Bruna)/);
        await ok("scene", "open", "--title", "Il guado", "--type", "social", "--with", "Bruna", "--with", "Mira");
        expect(await ok("scene", "close", "--summary", "Parlano.")).not.toContain("Fallen here");
    });
});
