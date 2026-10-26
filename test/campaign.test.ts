import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { startInstructions } from "../src/instructions/index.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

// The settings the setup asks of a new campaign without a written world, after the system and the language (MOD-3), and the call that moves on (MOD-7).
const asked =
    "mentor (ask how well the player knows the game: never played, tutorial; a little, hints; well, off), premise (the genre, the tone and a few elements of the world, in the player's words), preparation (on the fly, all at the start), "
    + "difficulty (story, easy, normal, hard, brutal), lethality (narrative, epic, dice), saves (permadeath, checkpoint, free), rigor (smooth, rules, simulation), dice (digital, physical), "
    + "master-rolls (your rolls for foes and NPCs: behind the screen, in view; suggest behind the screen), units (metric, imperial), "
    + "companions (none, made with the player, made by the master, met in play), calendar-start (when the story starts: day 1 to count only the days, or a day of the world, such as 14 April 1491), "
    + 'lines ("none" is an answer), veils ("none" is an answer)';
const onward = 'set each with config. When none is left and the player confirms: mode, to "session zero".';
const playLine = "To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.";

/** What config shows of the settings, before what the campaign still needs. */
function shown(output: string): string
{
    return output.split("\n\n")[0];
}

// The marks around the start lines in a campaign's AGENTS.md.
const startMark = "<!-- rpg: rpg keeps the lines up to the end mark up to date; the player's own instructions go after it. -->";
const endMark = "<!-- rpg: end -->";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
});

afterEach(() => removeFolder(folder));

// The doorbell init writes for Claude Code (D-495).
const bell = { type: "command", command: "rpg --listen", asyncRewake: true, timeout: 86_400 };

describe("rpg init", () => {
    it("creates the files and folders of a campaign", async () => {
        const result = await runCommandLine(["init", "--name", "La nebbia di Guadoscuro"], context);
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain(`Created the campaign "La nebbia di Guadoscuro" in ${folder}.`);
        expect(result.output).toContain(`Still to agree with the player: system (installed: 5e, free, ironsworn, fake), language (a code, such as it), ${asked}; ${onward}`);
        // A new campaign starts in setup (MOD-1).
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).toContain("\nmode: setup\n");

        const typeFolders = ["characters", "places", "factions", "quests", "items", "events", "topics", "creatures"].map((type) => `world/${type}`);

        for (const path of ["campaign.yaml", "state.yaml", "log.jsonl", "sessions", ...typeFolders]) {
            expect(existsSync(join(folder, path)), path).toBe(true);
        }

        expect(readLogFile(folder)).toEqual([{ id: "id1", at: "2026-10-02T10:00:00.000Z", type: "campaign-created", by: "master", visibility: "public", data: { name: "La nebbia di Guadoscuro" } }]);
    });

    it("names the campaign after its folder and takes the settings it is given", async () => {
        const result = await runCommandLine(["init", "guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
        // What the system adds to the setup is asked after (DAT-10).
        expect(result.output).toContain('veils ("none" is an answer), harshness (gentle or bitter); set each with config.');
        expect(readFileSync(join(folder, "guadoscuro", "campaign.yaml"), "utf8")).toContain("name: guadoscuro\nlanguage: it\nsystem: fake\ndifficulty: normal\nlethality: dice\n");
    });

    it("tells the player how to start playing, and the master what is still missing", async () => {
        const result = await runCommandLine(["init", "--language", "it"], context);
        expect(result.output).toBe(
            `Created the campaign "${basename(folder)}" in ${folder}.\n${playLine}\n\nFor the master: Still to agree with the player: system (installed: 5e, free, ironsworn, fake), ${asked}; ${onward}`,
        );
    });

    it("refuses a second campaign in the same folder, inside another one or around another one", async () => {
        mkdirSync(join(folder, "campagne", "vecchia"), { recursive: true });
        writeFileSync(join(folder, "campagne", "vecchia", "campaign.yaml"), "name: Vecchia\n");
        expect((await runCommandLine(["init", "campagne"], context)).output).toContain(`holds the campaign in ${join(folder, "campagne", "vecchia")}`);

        await runCommandLine(["init", "nuova"], context);
        expect((await runCommandLine(["init", "nuova"], context)).output).toContain("is already a campaign");
        expect((await runCommandLine(["init", "nuova/world/inner"], context)).output).toContain("a campaign cannot hold another one");
    });

    it("writes the .mcp.json through which an AI host finds the tools, in the form each system needs", async () => {
        await runCommandLine(["init", "linux"], context);
        expect(JSON.parse(readFileSync(join(folder, "linux", ".mcp.json"), "utf8"))).toEqual({ mcpServers: { rpg: { command: "rpg", args: ["mcp"] } } });

        await runCommandLine(["init", "windows"], { ...testContext(folder), platform: "win32" });
        expect(JSON.parse(readFileSync(join(folder, "windows", ".mcp.json"), "utf8"))).toEqual({ mcpServers: { rpg: { command: "cmd", args: ["/c", "rpg", "mcp"] } } });
    });

    it("keeps the other servers of an existing .mcp.json, and refuses a broken one before creating anything", async () => {
        mkdirSync(join(folder, "con-altri"));
        writeFileSync(join(folder, "con-altri", ".mcp.json"), JSON.stringify({ mcpServers: { altro: { command: "altro" } } }));
        await runCommandLine(["init", "con-altri"], context);
        expect(JSON.parse(readFileSync(join(folder, "con-altri", ".mcp.json"), "utf8")).mcpServers).toEqual({ altro: { command: "altro" }, rpg: { command: "rpg", args: ["mcp"] } });

        mkdirSync(join(folder, "rotto"));
        writeFileSync(join(folder, "rotto", ".mcp.json"), "{ non è json");
        expect((await runCommandLine(["init", "rotto"], context)).output).toContain(".mcp.json is not valid JSON");
        expect(existsSync(join(folder, "rotto", "campaign.yaml"))).toBe(false);
    });

    it("writes the files that send an AI host to the start lines and the rpg server, with the hosts' memories off (D-97, D-242, D-362, D-412)", async () => {
        await runCommandLine(["init", "nuova"], context);
        expect(readFileSync(join(folder, "nuova", "AGENTS.md"), "utf8")).toBe(`${startMark}\n${startInstructions()}\n${endMark}\n`);
        expect(readFileSync(join(folder, "nuova", "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\n");
        // Claude Code: no auto memory, and the rpg server approved with its tools allowed, so the first chat asks nothing of them.
        expect(JSON.parse(readFileSync(join(folder, "nuova", ".claude", "settings.json"), "utf8"))).toEqual({
            autoMemoryEnabled: false,
            enabledMcpjsonServers: ["rpg"],
            permissions: { allow: ["mcp__rpg"] },
            // The character agent answers within the master's turn (D-490).
            env: { CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1" },
            // The doorbell of the player's sentences on the dashboard (D-495).
            hooks: { Stop: [{ hooks: [bell] }] },
        });
        // Codex: the rpg server, waiting for the player's click, and its memories off; nothing for Gemini CLI, no longer set up (D-493).
        const rpg = context.platform === "win32" ? { command: "cmd", args: ["/c", "rpg", "mcp"] } : { command: "rpg", args: ["mcp"] };
        expect(readFileSync(join(folder, "nuova", ".codex", "config.toml"), "utf8")).toBe(
            `[mcp_servers.rpg]\ncommand = "${rpg.command}"\nargs = [${
                rpg.args.map((arg) => `"${arg}"`).join(", ")
            }]\ntool_timeout_sec = 1800\ndefault_tools_approval_mode = "approve"\nenv_vars = ["CODEX_HOME"]\n\n[memories]\ngenerate_memories = false\nuse_memories = false\n`,
        );
        expect(existsSync(join(folder, "nuova", ".gemini"))).toBe(false);
    });

    it("keeps what the player wrote in Codex's settings, and adds only what is missing (D-362)", async () => {
        mkdirSync(join(folder, "mia", ".codex"), { recursive: true });
        writeFileSync(join(folder, "mia", ".codex", "config.toml"), 'model = "gpt-5"\n\n[mcp_servers.rpg]\ncommand = "rpg-dev"\n');
        await runCommandLine(["init", "mia"], context);
        expect(readFileSync(join(folder, "mia", ".codex", "config.toml"), "utf8")).toBe('model = "gpt-5"\n\n[mcp_servers.rpg]\ncommand = "rpg-dev"\n\n[memories]\ngenerate_memories = false\nuse_memories = false\n');

        // Gemini CLI's settings of an older campaign stay as they are, broken ones too (D-493).
        mkdirSync(join(folder, "vecchia", ".gemini"), { recursive: true });
        writeFileSync(join(folder, "vecchia", ".gemini", "settings.json"), "{ non è json");
        await runCommandLine(["init", "vecchia"], context);
        expect(existsSync(join(folder, "vecchia", "campaign.yaml"))).toBe(true);
        expect(readFileSync(join(folder, "vecchia", ".gemini", "settings.json"), "utf8")).toBe("{ non è json");

        mkdirSync(join(folder, "scelta", ".codex"), { recursive: true });
        writeFileSync(join(folder, "scelta", ".codex", "config.toml"), "[memories]\nuse_memories = true\n");
        await runCommandLine(["init", "scelta"], context);
        expect(readFileSync(join(folder, "scelta", ".codex", "config.toml"), "utf8")).toMatch(/^\[memories\]\nuse_memories = true\n\n\[mcp_servers\.rpg\]\n/);
    });

    it("keeps what the folder had: its own AGENTS.md after the start lines, CLAUDE.md after the import, Claude Code's other settings and the player's choices", async () => {
        mkdirSync(join(folder, "mia", ".claude"), { recursive: true });
        writeFileSync(join(folder, "mia", "AGENTS.md"), "Parla come un bardo.\r\n");
        writeFileSync(join(folder, "mia", "CLAUDE.md"), "Niente spoiler.\n");
        writeFileSync(join(folder, "mia", ".claude", "settings.json"), '\uFEFF{ "model": "opus" }');
        await runCommandLine(["init", "mia"], context);
        expect(readFileSync(join(folder, "mia", "AGENTS.md"), "utf8")).toBe(`${startMark}\n${startInstructions()}\n${endMark}\n\nParla come un bardo.\n`.replace(/\n/g, "\r\n"));
        expect(readFileSync(join(folder, "mia", "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\nNiente spoiler.\n");
        expect(JSON.parse(readFileSync(join(folder, "mia", ".claude", "settings.json"), "utf8"))).toEqual({
            model: "opus",
            autoMemoryEnabled: false,
            enabledMcpjsonServers: ["rpg"],
            permissions: { allow: ["mcp__rpg"] },
            env: { CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1" },
            hooks: { Stop: [{ hooks: [bell] }] },
        });

        // The player's choices stay; the doorbell is put back beside their own hooks, once.
        mkdirSync(join(folder, "scelta", ".claude"), { recursive: true });
        const chosen = {
            autoMemoryEnabled: true,
            enabledMcpjsonServers: [],
            permissions: { allow: ["Read"], deny: ["Bash"] },
            env: { CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "0" },
            hooks: { Stop: [{ hooks: [{ type: "command", command: "mine" }] }] },
        };
        writeFileSync(join(folder, "scelta", ".claude", "settings.json"), JSON.stringify(chosen));
        await runCommandLine(["init", "scelta"], context);
        expect(JSON.parse(readFileSync(join(folder, "scelta", ".claude", "settings.json"), "utf8"))).toEqual({ ...chosen, hooks: { Stop: [...chosen.hooks.Stop, { hooks: [bell] }] } });
    });

    it("refuses a broken Claude Code settings file before creating anything", async () => {
        mkdirSync(join(folder, "rotto", ".claude"), { recursive: true });
        writeFileSync(join(folder, "rotto", ".claude", "settings.json"), "{ non è json");
        expect((await runCommandLine(["init", "rotto"], context)).output).toContain("settings.json is not valid JSON, so Claude Code cannot be set up for the game in it");
        expect(existsSync(join(folder, "rotto", "campaign.yaml"))).toBe(false);
        expect(existsSync(join(folder, "rotto", "AGENTS.md"))).toBe(false);
    });

    it("checks the settings before creating anything", async () => {
        const result = await runCommandLine(["init", "--language", "Italiano"], context);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("use a language code");
        expect(existsSync(join(folder, "campaign.yaml"))).toBe(false);
    });
});

describe("rpg config", () => {
    beforeEach(async () => {
        await runCommandLine(["init", "--name", "Guadoscuro"], context);
    });

    it("shows the settings and what is still missing", async () => {
        const result = await runCommandLine(["config"], context);
        expect(result.output).toBe(
            "name: Guadoscuro\nlanguage: (missing)\nsystem: (missing; installed: 5e, free, ironsworn, fake)\nmentor: (missing)\npremise: (missing)\npreparation: (missing)\n"
                + "prose: plain (as your instructions write)\nstory: situations (as your instructions write)\nauthor: (none)\nstyle: (none)\ndifficulty: (missing)\nlethality: (missing)\n"
                + "saves: (missing)\nrigor: (missing)\ndice: (missing)\nmaster-rolls: behind the screen (unset: roll hides your rolls for foes and NPCs)\nunits: (missing)\nvoices: auto (a subagent at key moments, as you choose, where the app has them)\ncompanions: (missing)\ncalendar-start: (missing)\npictures: (missing)\neffort: (the app's own: the player's to choose)\nlines: (missing)\nveils: (missing)\ntable: (none)\nprecedents: (none)\nlearned: (none)\nlibrary: (none)\n"
                + `coins: (none: neither the campaign nor its game system gives coins)\n\nStill to agree with the player: system (installed: 5e, free, ironsworn, fake), language (a code, such as it), ${asked}; ${onward}`,
        );
    });

    it("writes the master's effort the player chose where each app reads it, refused to the master (D-462)", async () => {
        mkdirSync(join(folder, ".codex"), { recursive: true });
        writeFileSync(join(folder, ".codex", "config.toml"), 'model = "gpt-5"\nmodel_reasoning_effort = "xhigh"\n\n[mcp_servers.rpg]\ncommand = "rpg"\n');
        expect((await runCommandLine(["config", "effort", "low"], context)).output).toBe(
            "effort is the player's to choose, never yours: tell them they can set it on the dashboard's Settings, or in their terminal with rpg config effort and low, medium, high or app. Nothing changed.",
        );
        const set = await runCommandLine(["config", "effort", "low"], { ...context, terminal: true });
        expect(set.output).toContain("effort: low\nWritten for Claude Code and Codex: it applies from the next chat");
        expect(JSON.parse(readFileSync(join(folder, ".claude", "settings.json"), "utf8"))).toMatchObject({ effortLevel: "low", autoMemoryEnabled: false, hooks: { Stop: [{ hooks: [bell] }] } });
        // A key of Codex's top, before its first table, in place of the player's: under a table it would be ignored.
        expect(readFileSync(join(folder, ".codex", "config.toml"), "utf8")).toMatch(/^model_reasoning_effort = "low"\nmodel = "gpt-5"\n\n\[mcp_servers\.rpg\]\ncommand = "rpg"\n/);
        expect(existsSync(join(folder, ".gemini"))).toBe(false);
        // The player's own change on the dashboard, and the same written twice stays one key.
        await runCommandLine(["config", "effort", "high"], { ...context, actor: "player" });
        await runCommandLine(["config", "effort", "high"], { ...context, actor: "player" });
        expect(readFileSync(join(folder, ".codex", "config.toml"), "utf8").match(/model_reasoning_effort/g)).toHaveLength(1);
        expect(JSON.parse(readFileSync(join(folder, ".claude", "settings.json"), "utf8")).effortLevel).toBe("high");
        // app takes it away from every file: each app keeps its own again.
        expect((await runCommandLine(["config", "effort", "app"], { ...context, terminal: true })).output).toContain("Taken away for Claude Code and Codex");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("effort");
        expect(JSON.parse(readFileSync(join(folder, ".claude", "settings.json"), "utf8")).effortLevel).toBeUndefined();
        expect(readFileSync(join(folder, ".codex", "config.toml"), "utf8")).toMatch(/^model = "gpt-5"\n\n\[mcp_servers\.rpg\]/);
    });

    it("puts the effort first in a Codex file with a byte order mark, a quoted key, an array of brackets and a commented table (review of 17 October)", async () => {
        mkdirSync(join(folder, ".codex"), { recursive: true });
        writeFileSync(join(folder, ".codex", "config.toml"), '﻿"model_reasoning_effort" = "xhigh"\nnotify = [\n  ["a", "b"],\n]\n\n[mcp_servers.rpg] # mine\ncommand = "rpg"\n');
        await runCommandLine(["config", "effort", "low"], { ...context, terminal: true });
        expect(readFileSync(join(folder, ".codex", "config.toml"), "utf8")).toBe(
            'model_reasoning_effort = "low"\nnotify = [\n  ["a", "b"],\n]\n\n[mcp_servers.rpg] # mine\ncommand = "rpg"\n\n[memories]\ngenerate_memories = false\nuse_memories = false\n',
        );
    });

    it("changes a setting, keeps the rest of the file and logs the change", async () => {
        const result = await runCommandLine(["config", "language", "it"], context);
        expect(result.output).toBe(`language: it\n\nStill to agree with the player: system (installed: 5e, free, ironsworn, fake), ${asked}; ${onward}`);
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toBe(`# Campaign settings: change them with the config command.\nname: Guadoscuro\nlanguage: it\n`);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed", by: "master", visibility: "public", data: { setting: "language", value: "it" } });
    });

    it("adds to the lines and the veils one item at a time, and removes them", async () => {
        await runCommandLine(["config", "language", "it"], context);
        await runCommandLine(["config", "system", "fake"], context);
        await runCommandLine(["config", "difficulty", "normal"], context);
        await runCommandLine(["config", "lethality", "dice"], context);
        await runCommandLine(["config", "harshness", "gentle"], context);
        expect(shown((await runCommandLine(["config", "lines", "--add", "ragni", "--add", "corpi descritti nei dettagli"], context)).output)).toBe("lines: ragni; corpi descritti nei dettagli");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("lines:\n  - ragni\n  - corpi descritti nei dettagli\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed", data: { setting: "lines", add: ["ragni", "corpi descritti nei dettagli"] } });

        const logLines = readLogFile(folder).length;
        expect(shown((await runCommandLine(["config", "lines", "--add", "Ragni"], context)).output)).toBe("lines: ragni; corpi descritti nei dettagli");
        expect(readLogFile(folder)).toHaveLength(logLines);

        expect(shown((await runCommandLine(["config", "lines", "--remove", "ragni"], context)).output)).toBe("lines: corpi descritti nei dettagli");
        expect((await runCommandLine(["config", "lines", "--remove", "lupi"], context)).output).toBe(`"lines" does not hold "lupi", so nothing changed. It holds: corpi descritti nei dettagli.`);
        expect((await runCommandLine(["config", "lines", "--remove", "corpi descritti nei dettagli", "--remove", "lupi"], context)).output).toBe(
            `"lines" does not hold "lupi", so nothing changed. It holds: corpi descritti nei dettagli.`,
        );
        expect((await runCommandLine(["config", "lines", "lupi"], context)).output).toBe(`"lines" is a list: change it one item at a time with add and remove, or give the value none when the player wants none.`);
        expect((await runCommandLine(["config", "language", "--add", "it"], context)).output).toBe(`"language" holds one value: give the new value instead of add or remove.`);
        expect(shown((await runCommandLine(["config", "veils", "--add", "torture"], context)).output)).toBe("veils: torture");
        expect((await runCommandLine(["config", "veils", "--add", " "], context)).output).toBe("Give the text of each item to add or remove.");
    });

    it("keeps the comments of a hand-written list, and reads accents written either way", async () => {
        writeFileSync(join(folder, "campaign.yaml"), "name: Guadoscuro\nlanguage: it\nsystem: fake\ndifficulty: normal\nlethality: dice\nharshness: gentle\nlines:\n  - ragni # da sempre\n  - morte di città\n");
        expect(shown((await runCommandLine(["config", "lines", "--add", "Morte di città"], context)).output)).toBe("lines: ragni; morte di città");
        await runCommandLine(["config", "lines", "--add", "lupi"], context);
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("  - ragni # da sempre\n");
        expect(shown((await runCommandLine(["config", "lines", "--remove", "morte di città"], context)).output)).toBe("lines: ragni; lupi");
    });

    it("reads an empty list written by hand, and refuses one that is not a list", async () => {
        writeFileSync(join(folder, "campaign.yaml"), "name: Guadoscuro\nlanguage: it\nsystem: fake\ndifficulty: normal\nlethality: dice\nharshness: gentle\nlines:\n");
        // Written empty, as Obsidian does, a list is not yet answered (D-107, MOD-3).
        expect(shown((await runCommandLine(["config", "lines"], context)).output)).toBe("lines: (missing)");
        expect(shown((await runCommandLine(["config", "lines", "--add", "ragni"], context)).output)).toBe("lines: ragni");

        writeFileSync(join(folder, "campaign.yaml"), "name: Guadoscuro\nlanguage: it\nsystem: fake\ndifficulty: normal\nlethality: dice\nveils: torture\n");
        expect((await runCommandLine(["config", "veils", "--add", "sangue"], context)).output).toBe(`"veils" in campaign.yaml is not a list of text; write it by hand as veils: [item, item].`);
    });

    it("takes difficulty and lethality among their values, and table as a list (D-141, D-142)", async () => {
        const refused = await runCommandLine(["config", "difficulty", "deadly"], context);
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toContain('"deadly" is not a valid difficulty');
        const lethality = (await runCommandLine(["config", "lethality", "epic"], context)).output;
        expect(shown(lethality)).toBe("lethality: epic");
        expect(lethality).toContain("difficulty (story, easy, normal, hard, brutal), saves (permadeath, checkpoint, free), rigor (smooth, rules, simulation)");
        expect((await runCommandLine(["config", "table", "--add", "rolls shown as they fall"], context)).output).toContain("table: rolls shown as they fall");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("table:\n  - rolls shown as they fall\n");
    });

    it("writes no line when a setting already has that value", async () => {
        await runCommandLine(["config", "language", "it"], context);
        await runCommandLine(["config", "language", "it"], context);
        expect(readLogFile(folder).map((entry) => entry.type)).toEqual(["campaign-created", "config-changed"]);
    });

    it("refuses unknown settings and invalid values", async () => {
        expect((await runCommandLine(["config", "colour", "red"], context)).output).toBe(
            `There is no setting "colour". The settings are: name, language, system, mentor, premise, preparation, prose, story, author, style, difficulty, lethality, saves, rigor, dice, master-rolls, units, voices, companions, calendar-start, pictures, effort, lines, veils, table, precedents, learned, library, coins, calendar, fields, tables, computed, counters, recipes, status-line, travel, values, condition-icons, widgets.`,
        );
        expect((await runCommandLine(["config", "language", "Italiano"], context)).exitCode).toBe(1);
    });

    it("writes nothing when the settings would still not be valid", async () => {
        const handWritten = "name: Guadoscuro\nlanguage: Italiano\n";
        writeFileSync(join(folder, "campaign.yaml"), handWritten);
        const result = await runCommandLine(["config", "system", "fake"], context);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Fix it by hand (a list is written as [item, item]); a single value can also be set with the config command.");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toBe(handWritten);
        expect(readLogFile(folder).map((event) => event.type)).toEqual(["campaign-created"]);
        expect((await runCommandLine(["config", "language", "it"], context)).exitCode).toBe(0);
    });

    it("says to fix by hand a campaign.yaml that holds no settings", async () => {
        writeFileSync(join(folder, "campaign.yaml"), "solo del testo\n");
        expect((await runCommandLine(["config"], context)).output).toBe(`campaign.yaml must hold settings, such as "name: ..."; fix it by hand.`);
    });
});

describe("finding the campaign", () => {
    it("works from any folder inside the campaign", async () => {
        await runCommandLine(["init"], context);
        const inner = testContext(join(folder, "world", "places"));
        expect((await runCommandLine(["roll", "1d6"], inner)).exitCode).toBe(0);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "roll" });
    });

    it("refuses to work outside a campaign", async () => {
        const result = await runCommandLine(["roll", "1d6"], context);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Create one with the init command");
        expect(existsSync(join(folder, "log.jsonl"))).toBe(false);
    });
});
