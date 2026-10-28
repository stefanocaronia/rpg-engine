// The mode of the campaign and the checklists that open each (MECCANICHE, MOD-1–MOD-7; D-77, D-221, D-241): a table of cases, then laws on campaigns made at random.
import fc from "fast-check";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { madeSystem, makeTempFolder, readLogFile, removeFolder, testContext, testSystemFolders } from "./support.ts";

let folder: string;
let context: Context;
let systems: string;

/** A context in this folder that sees, beside the tests' own, a system of its fields alone: no sheet, no settings, no part of the instructions. */
function bareContext(root: string): Context
{
    return { ...testContext(root), systemFolders: [systems, ...testSystemFolders] };
}

beforeAll(() => {
    systems = madeSystem("bare", { "system.yaml": "title: a test system of its fields alone\nlanguage: en\nfields:\n  health: counter\n" });
});

beforeEach(() => {
    folder = makeTempFolder();
    context = bareContext(folder);
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(1);
    return result.output;
}

function file(name: string): string
{
    return readFileSync(join(folder, name), "utf8");
}

/** A campaign of the test system without a sheet, whose setup is done but for what `left` leaves out, with a written world. */
async function setUp(left: string[] = []): Promise<void>
{
    await ok("init", "--name", "Ferro", "--system", "bare");
    await ok("write", "Guado", "--type", "place");
    const answers: [string, string][] = [
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

    for (const [setting, value] of answers.filter(([setting]) => !left.includes(setting))) {
        await ok("config", setting, value);
    }
}

describe("the mode (MOD-1–MOD-7)", () => {
    it("MOD-1: a new campaign starts in setup; one made before modes is in play once it had a scene, in session zero once it has a player character", async () => {
        await ok("init", "--name", "Ferro", "--system", "bare");
        expect(file("state.yaml")).toContain("mode: setup\n");
        expect(await ok("status")).toMatch(/^Ferro · bare, a test system of its fields alone · mode setup\n/);

        writeFileSync(join(folder, "state.yaml"), "date: day 1\n");
        expect(await ok("status")).toContain("· mode setup\n");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        expect(await ok("status")).toContain("· mode session zero\n");
        writeFileSync(join(folder, "log.jsonl"), `${file("log.jsonl")}${JSON.stringify({ id: "x", at: "2026-10-01T10:00:00.000Z", type: "scene-opened", by: "master", visibility: "public", data: { title: "Prima" } })}\n`);
        expect(await ok("status")).toContain("· mode play\n");
        // A mode written wrongly by hand counts as none, and validate says how to fix it.
        writeFileSync(join(folder, "state.yaml"), "mode: gioco\n");
        expect(await ok("status")).toContain("· mode play\n");
        expect(await ok("validate")).toContain('- state.yaml: The mode in state.yaml, "gioco", is not a mode: setup, session zero, play. Fix: call mode with the one the campaign is in.');
    });

    it("MOD-2, MOD-3: session zero needs every setup answer, lines and veils answered with none too; it is refused with what is missing, and nothing changes", async () => {
        await setUp(["rigor", "veils"]);
        const before = [file("state.yaml"), file("log.jsonl")];
        expect(await refused("mode", "session zero")).toBe(
            'The campaign cannot enter session zero yet: still to agree with the player: rigor (smooth, rules, simulation), veils ("none" is an answer); set each with config. Then call mode again. Nothing changed.',
        );
        expect([file("state.yaml"), file("log.jsonl")]).toEqual(before);

        await ok("config", "rigor", "rules");
        expect(await ok("config", "veils", "none")).toBe('veils: (none)\n\nNothing is missing. When the player confirms: mode, to "session zero".');
        expect(file("campaign.yaml")).toContain("veils: []\n");
        const entered = await ok("mode", "session zero");
        // The first time in session zero, with no save, the state before it is saved: to start over with a new character (SAV-3, D-361).
        expect(entered).toMatch(
            /^The campaign is now in session zero\. Its state before session zero is saved, 1 - session zero: the save reset to session zero goes back to, if the player wants to start over with a new character\.\n\n## Session zero\n\nPlay, as with a human game master/,
        );
        expect(file("state.yaml")).toContain("mode: session zero\n");
        expect(readLogFile(folder).at(-2)).toMatchObject({ type: "mode-changed", visibility: "public", data: { from: "setup", to: "session zero" } });
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "saved", data: { save: 1, why: "session zero" } });
        expect(await ok("mode", "session zero")).toBe("The campaign is already in session zero.");
    });

    it("MOD-3: a campaign without a written world is asked its premise and preparation; the system's settings are asked too", async () => {
        await ok("init", "--name", "Vuota", "--system", "fake");
        const status = await ok("status");
        expect(status).toContain(
            "premise (the genre, the tone, a few elements of the world and what the player enjoys most in a game, such as fights, mysteries, talk or exploring, in the player's words), preparation (on the fly, all at the start)",
        );
        expect(status).toContain("harshness (gentle or bitter); set each with config.");
        await ok("write", "Guado", "--type", "place");
        expect(await ok("status")).not.toContain("premise (");
    });

    it("MOD-2, MOD-4: play needs a living player character with its whole sheet, and the companions made in session zero", async () => {
        await setUp(["companions"]);
        await ok("config", "companions", "made with the player");
        await ok("mode", "session zero");
        expect(await refused("mode", "play")).toBe(
            "The campaign cannot enter play yet: still to make with the player: a player character; a companion, made with the player. Then call mode again. Nothing changed.",
        );
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("write", "Bran", "--type", "character", "--set", "role=companion", "--set", "status=dead");
        expect(await refused("mode", "play")).toContain("still to make with the player: a companion, made with the player.");
        await ok("write", "Bran", "--set", "status=alive");
        expect(await ok("status")).toMatch(/· mode session zero\n(?:.+\n)*Nothing is missing\. When the player confirms: mode, to play\./);
        // The part of play comes with it, the core's: this test system adds none (MOD-5).
        // The first time in play, the start is saved: the save reset goes back to (SAV-3, D-359).
        expect(await ok("mode", "play")).toMatch(
            /^The campaign is now in play\. Its start is saved, 2 - start: the save reset goes back to, if the player wants to start over\. Open the first scene, and set the game date with advance to, at its hour, such as day 1, 18:00\.\n\n## Play\n\nThe story is on\./,
        );
        expect(readdirSync(join(folder, ".saves"))).toEqual(["001 - session zero.zip", "002 - start.zip"]);
        // Starting over with the same character, then with a new one (SAV-5, D-361).
        await ok("write", "Varro", "--type", "character", "--set", "role=npc");
        expect(await ok("save", "reset")).toMatch(/^Back to the start, 2 - start: the campaign starts over from there with the same character,/);
        expect(existsSync(join(folder, "world", "characters", "Kira.md"))).toBe(true);
        expect(existsSync(join(folder, "world", "characters", "Varro.md"))).toBe(false);
        expect(await ok("save", "reset", "--to", "session zero")).toMatch(
            /^Back to before session zero, 1 - session zero: the campaign starts over, the player character to make again in session zero,/,
        );
        expect(existsSync(join(folder, "world", "characters", "Kira.md"))).toBe(false);
        expect(file("state.yaml")).toContain("mode: session zero\n");
    });

    it("SAV-3 (D-361): a start that cannot be saved never stops the mode, and says so", async () => {
        await setUp();
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        mkdirSync(join(folder, ".saves", "001 - start.zip"), { recursive: true });
        expect(await ok("mode", "play")).toMatch(/^The campaign is now in play\. Its start could not be saved \(.+\): make \.saves a folder that can be written,/);
        expect(file("state.yaml")).toContain("mode: play\n");
    });

    it("MOD-2: the setup is always open, play is not without its checklists, and session zero again makes a new character", async () => {
        await setUp();
        expect(await refused("mode", "play")).toContain("The campaign cannot enter play yet: still to make with the player: a player character.");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("mode", "play");
        await ok("write", "Kira", "--set", "status=dead");
        expect(await ok("mode", "session zero")).toContain("The campaign is now in session zero.");
        expect(await ok("mode", "setup")).toMatch(/^The campaign is now in setup\.\n\n## Setup\n\nOut of the game/);
        // Back in play, the start is saved already: no other (SAV-3, D-359).
        await ok("write", "Kira", "--set", "status=alive");
        expect(await ok("mode", "play")).not.toContain("Its start is saved");
        expect(readdirSync(join(folder, ".saves"))).toEqual(["001 - start.zip"]);
    });

    it("MOD-5: instructions give the core and the part of the mode, with the system's", async () => {
        await setUp();
        const core = readFileSync(new URL("../instructions/core.md", import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();
        expect(await ok("instructions")).toMatch(/\n\n## Setup\n\nOut of the game/);
        expect((await ok("instructions")).startsWith(`${core}\n\n## Setup`)).toBe(true);
        await ok("mode", "session zero");
        expect(await ok("instructions")).toMatch(/\n\n## Session zero\n\n/);
        expect(await ok("instructions")).not.toContain("## Setup");
    });

    it("MOD-6: a scene opens only in play, and the refusal says what is missing and how to go on", async () => {
        await setUp(["units"]);
        expect(await refused("scene", "open", "--title", "Il guado", "--type", "exploration")).toBe(
            "The game has not started: the campaign is in setup, and scenes open in play. Still to agree with the player: units (metric, imperial); set each with config. "
                + 'When none is left and the player confirms: mode, to "session zero".',
        );
        await ok("config", "units", "imperial");
        await ok("mode", "session zero");
        expect(await refused("scene", "open", "--title", "Il guado", "--type", "exploration")).toBe(
            "The game has not started: the campaign is in session zero, and scenes open in play. Still to make with the player: a player character. When none is left and the player confirms: mode, to play.",
        );
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("mode", "play");
        expect(await ok("scene", "open", "--title", "Il guado", "--type", "exploration")).toContain("Scene opened: Il guado (exploration).");
    });

    it("MOD-7: status says the mode on the campaign's line, and before play what the next one needs; in play the settings the master follows", async () => {
        await setUp(["dice"]);
        expect(await ok("status")).toContain(
            "Ferro · it · bare, a test system of its fields alone · difficulty normal · lethality dice · saves checkpoint · rigor smooth · units metric · mode setup\n"
                + "Difficulty normal: fights moderate to high; two to four between full rests, with a reason not to rest; the plain approach wins at a real cost, a good choice cheaply; "
                + "foes with sensible tactics, using the place, normal morale; three clues to every conclusion; resources standard (treasure, supplies, prices); random encounters normal; "
                + "threat clocks at their pace: one of them a step each day.\n"
                + "Rigor smooth: you gloss over food and water, light, encumbrance, fatigue and the like: count them only when the story turns on them.\n"
                + 'Still to agree with the player: dice (digital, physical); set each with config. When none is left and the player confirms: mode, to "session zero".',
        );
        await ok("config", "dice", "physical");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("mode", "play");
        expect(await ok("status")).toMatch(
            /^Ferro · it · bare, a test system of its fields alone · difficulty normal · lethality dice · saves checkpoint · rigor smooth · dice physical · units metric · mode play\nDifficulty normal: .+\nRigor smooth: .+\n(?!Still)/,
        );
        // config gives the chosen value with what it means in play, and status follows a change (D-263).
        // A system that counts no food nor what burns: its master is never promised them (review of 17 October).
        expect(await ok("config", "rigor", "rules")).toMatch(
            /^rigor: rules: as written: charge with change what is used up; encumbrance, fatigue and the like as the rules say; warn before something runs out, and once it has, the rule applies$/m,
        );
        expect(await ok("config", "difficulty")).toMatch(/^difficulty: normal: fights moderate to high; .+$/m);
        expect(await ok("status")).toContain("\nRigor rules: as written: charge with change what is used up");
    });

    it("answers a list with none only while it holds nothing, and an emptied list stays answered", async () => {
        await ok("init", "--name", "Ferro", "--system", "bare");
        await ok("config", "lines", "--add", "ragni");
        expect(await refused("config", "lines", "none")).toBe('"lines" holds ragni: remove each one with remove, if the player no longer wants it. Nothing changed.');
        await ok("config", "lines", "--remove", "ragni");
        expect(file("campaign.yaml")).toContain("lines: []\n");
        expect(await ok("status")).not.toContain('lines ("none" is an answer)');
        const logged = readLogFile(folder).length;
        await ok("config", "lines", "none");
        expect(readLogFile(folder)).toHaveLength(logged);
        expect(await refused("config", "language", "none")).toContain('"none" is not a valid language');
    });
});

// The settings of the setup, the answer each takes here, and the model of MOD-3 and MOD-4.
const answers: Record<string, string> = {
    language: "language: it",
    mentor: "mentor: off",
    difficulty: "difficulty: normal",
    lethality: "lethality: dice",
    saves: "saves: checkpoint",
    rigor: "rigor: smooth",
    dice: "dice: digital",
    "master-rolls": "master-rolls: behind the screen",
    units: "units: metric",
    "calendar-start": "calendar-start: 14 April",
    lines: "lines: []",
    veils: "veils: [torture]",
    premise: "premise: fantasy cupo",
    preparation: "preparation: on the fly",
};
const campaigns = fc.record({
    // Mostly every answer, else all but one, so that the cases that decide come often.
    unanswered: fc.option(fc.constantFrom(...Object.keys(answers)), { nil: undefined, freq: 3 }),
    companions: fc.option(fc.constantFrom("none", "made with the player", "made by the master", "met in play"), { nil: undefined, freq: 6 }),
    player: fc.constantFrom("alive", "alive", "none", "dead"),
    companion: fc.constantFrom("none", "alive", "dead"),
    place: fc.boolean(),
    to: fc.constantFrom("session zero", "play"),
});

describe("the laws of the mode, on campaigns made at random", () => {
    it("MOD-2–MOD-4: from setup, a mode is entered exactly when the model's checklists before it are complete, and a refusal changes nothing", async () => {
        const outcomes = new Set<boolean>();
        await fc.assert(
            fc.asyncProperty(campaigns, async (made) => {
                const root = makeTempFolder();

                try {
                    const settings = [
                        "name: Prova",
                        "system: bare",
                        ...Object.keys(answers).filter((setting) => setting !== made.unanswered).map((setting) => answers[setting]),
                        ...(made.companions === undefined ? [] : [`companions: ${made.companions}`]),
                    ];
                    writeFileSync(join(root, "campaign.yaml"), `${settings.join("\n")}\n`);
                    writeFileSync(join(root, "state.yaml"), "mode: setup\n");
                    page(root, "characters", "Kira", made.player, "pc");
                    page(root, "characters", "Bran", made.companion, "companion");
                    page(root, "places", "Guado", made.place ? "alive" : "none");
                    const written = made.player !== "none" || made.companion !== "none" || made.place;
                    const setup = ["language", "mentor", "difficulty", "lethality", "saves", "rigor", "dice", "master-rolls", "units", "calendar-start", "lines", "veils", ...(written ? [] : ["premise", "preparation"])].every((setting) =>
                        setting !== made.unanswered
                    )
                        && made.companions !== undefined;
                    const made0 = made.companions === "made with the player" || made.companions === "made by the master";
                    const zero = made.player === "alive" && (!made0 || made.companion === "alive");
                    const expected = setup && (made.to === "session zero" || zero);
                    outcomes.add(expected);

                    const result = await runCommandLine(["mode", made.to], bareContext(root));
                    expect(result.exitCode === 0, result.output).toBe(expected);
                    expect(readFileSync(join(root, "state.yaml"), "utf8")).toBe(expected ? `mode: ${made.to}\n` : "mode: setup\n");
                } finally {
                    removeFolder(root);
                }
            }),
            { numRuns: 150 },
        );
        expect([...outcomes].sort()).toEqual([false, true]);
    }, 60000);
});

/** A page of the world, alive or dead, or none; with a role for a character. */
function page(root: string, typeFolder: string, name: string, state: string, role?: string): void
{
    if (state === "none") {
        return;
    }

    mkdirSync(join(root, "world", typeFolder), { recursive: true });
    const fields = [role === undefined ? "" : `role: ${role}\n`, state === "dead" ? "status: dead\n" : ""].join("");
    writeFileSync(join(root, "world", typeFolder, `${name}.md`), fields === "" ? "" : `---\n${fields}---\n`);
}
