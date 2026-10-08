// The mode of the campaign and the checklists that open each (MECCANICHE, MOD-1–MOD-7; D-77, D-221, D-241): a table of cases, then laws on campaigns made at random.
import fc from "fast-check";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
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
    await ok("init", "--name", "Ferro", "--system", "ironsworn");
    await ok("write", "Guado", "--type", "place");
    const answers: [string, string][] = [["language", "it"], ["difficulty", "normal"], ["lethality", "dice"], ["rigor", "smooth"], ["dice", "digital"], ["units", "metric"], ["companions", "none"], ["lines", "none"], ["veils", "none"]];

    for (const [setting, value] of answers.filter(([setting]) => !left.includes(setting))) {
        await ok("config", setting, value);
    }
}

describe("the mode (MOD-1–MOD-7)", () => {
    it("MOD-1: a new campaign starts in setup; one made before modes is in play once it had a scene, in session zero once it has a player character", async () => {
        await ok("init", "--name", "Ferro", "--system", "ironsworn");
        expect(file("state.yaml")).toContain("mode: setup\n");
        expect(await ok("status")).toMatch(/^Ferro · ironsworn, a test system based on Ironsworn · mode setup\n/);

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
        expect(entered).toMatch(/^The campaign is now in session zero\.\n\n## Session zero\n\nPlay, as with a human game master/);
        expect(file("state.yaml")).toContain("mode: session zero\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "mode-changed", visibility: "public", data: { from: "setup", to: "session zero" } });
        expect(await ok("mode", "session zero")).toBe("The campaign is already in session zero.");
    });

    it("MOD-3: a campaign without a written world is asked its premise and preparation; the system's settings are asked too", async () => {
        await ok("init", "--name", "Vuota", "--system", "5e");
        const status = await ok("status");
        expect(status).toContain("premise (the genre, the tone and a few elements of the world, in the player's words), preparation (on the fly, all at the start)");
        expect(status).toContain("advancement (xp or milestones); set each with config.");
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
        expect(await ok("status")).toContain("· mode session zero\nNothing is missing. When the player confirms: mode, to play.");
        // The part of play comes with it, the core's: this test system adds none (MOD-5).
        expect(await ok("mode", "play")).toMatch(/^The campaign is now in play\. Open the first scene, and set the game date with advance to, at its hour, such as day 1, 18:00\.\n\n## Play\n\nThe story is on\./);
    });

    it("MOD-2: the setup is always open, play is not without its checklists, and session zero again makes a new character", async () => {
        await setUp();
        expect(await refused("mode", "play")).toContain("The campaign cannot enter play yet: still to make with the player: a player character.");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("mode", "play");
        await ok("write", "Kira", "--set", "status=dead");
        expect(await ok("mode", "session zero")).toContain("The campaign is now in session zero.");
        expect(await ok("mode", "setup")).toMatch(/^The campaign is now in setup\.\n\n## Setup\n\nOut of the game/);
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
            "Ferro · it · ironsworn, a test system based on Ironsworn · difficulty normal · lethality dice · rigor smooth · units metric · mode setup\n"
                + 'Still to agree with the player: dice (digital, physical); set each with config. When none is left and the player confirms: mode, to "session zero".',
        );
        await ok("config", "dice", "physical");
        await ok("write", "Kira", "--type", "character", "--set", "role=pc");
        await ok("mode", "play");
        expect(await ok("status")).toMatch(/^Ferro · it · ironsworn, a test system based on Ironsworn · difficulty normal · lethality dice · rigor smooth · dice physical · units metric · mode play\n(?!Still)/);
    });

    it("answers a list with none only while it holds nothing, and an emptied list stays answered", async () => {
        await ok("init", "--name", "Ferro", "--system", "ironsworn");
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
    difficulty: "difficulty: normal",
    lethality: "lethality: dice",
    rigor: "rigor: smooth",
    dice: "dice: digital",
    units: "units: metric",
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
                        "system: ironsworn",
                        ...Object.keys(answers).filter((setting) => setting !== made.unanswered).map((setting) => answers[setting]),
                        ...(made.companions === undefined ? [] : [`companions: ${made.companions}`]),
                    ];
                    writeFileSync(join(root, "campaign.yaml"), `${settings.join("\n")}\n`);
                    writeFileSync(join(root, "state.yaml"), "mode: setup\n");
                    page(root, "characters", "Kira", made.player, "pc");
                    page(root, "characters", "Bran", made.companion, "companion");
                    page(root, "places", "Guado", made.place ? "alive" : "none");
                    const written = made.player !== "none" || made.companion !== "none" || made.place;
                    const setup = ["language", "difficulty", "lethality", "rigor", "dice", "units", "lines", "veils", ...(written ? [] : ["premise", "preparation"])].every((setting) => setting !== made.unanswered)
                        && made.companions !== undefined;
                    const made0 = made.companions === "made with the player" || made.companions === "made by the master";
                    const zero = made.player === "alive" && (!made0 || made.companion === "alive");
                    const expected = setup && (made.to === "session zero" || zero);
                    outcomes.add(expected);

                    const result = await runCommandLine(["mode", made.to], testContext(root));
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
