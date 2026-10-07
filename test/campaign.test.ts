import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
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

describe("rpg init", () => {
    it("creates the files and folders of a campaign", async () => {
        const result = await runCommandLine(["init", "--name", "La nebbia di Guadoscuro"], context);
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain(`Created the campaign "La nebbia di Guadoscuro" in ${folder}.`);
        expect(result.output).toContain("Still missing: system (installed: 5e, ironsworn), language, difficulty, lethality.");

        const typeFolders = ["characters", "places", "factions", "quests", "items", "events", "topics", "creatures"].map((type) => `world/${type}`);

        for (const path of ["campaign.yaml", "state.yaml", "log.jsonl", "sessions", ...typeFolders]) {
            expect(existsSync(join(folder, path)), path).toBe(true);
        }

        expect(readLogFile(folder)).toEqual([{ id: "id1", at: "2026-10-02T10:00:00.000Z", type: "campaign-created", by: "master", visibility: "public", data: { name: "La nebbia di Guadoscuro" } }]);
    });

    it("names the campaign after its folder and takes the settings it is given", async () => {
        const result = await runCommandLine(["init", "guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
        expect(result.output).not.toContain("missing");
        expect(readFileSync(join(folder, "guadoscuro", "campaign.yaml"), "utf8")).toContain("name: guadoscuro\nlanguage: it\nsystem: 5e\ndifficulty: normal\nlethality: dice\n");
    });

    it("says how to set what is still missing", async () => {
        const result = await runCommandLine(["init", "--language", "it"], context);
        expect(result.output).toBe(
            `Created the campaign "${basename(folder)}" in ${folder}.\nStill missing: system (installed: 5e, ironsworn), difficulty, lethality. Ask the player, then set each one with the config command (setting and value).`,
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
            "name: Guadoscuro\nlanguage: (missing)\nsystem: (missing; installed: 5e, ironsworn)\ndifficulty: (missing)\nlethality: (missing)\nlines: (none)\nveils: (none)\ntable: (none)\nprecedents: (none)\ncoins: (none: neither the campaign nor its game system gives coins)\n\nStill missing: system (installed: 5e, ironsworn), language, difficulty, lethality. Ask the player, then set each one with the config command (setting and value).",
        );
    });

    it("changes a setting, keeps the rest of the file and logs the change", async () => {
        const result = await runCommandLine(["config", "language", "it"], context);
        expect(result.output).toBe("language: it\n\nStill missing: system (installed: 5e, ironsworn), difficulty, lethality. Ask the player, then set each one with the config command (setting and value).");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toBe(`# Campaign settings: change them with the config command.\nname: Guadoscuro\nlanguage: it\n`);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed", by: "master", visibility: "public", data: { setting: "language", value: "it" } });
    });

    it("adds to the lines and the veils one item at a time, and removes them", async () => {
        await runCommandLine(["config", "language", "it"], context);
        await runCommandLine(["config", "system", "5e"], context);
        await runCommandLine(["config", "difficulty", "normal"], context);
        await runCommandLine(["config", "lethality", "dice"], context);
        expect((await runCommandLine(["config", "lines", "--add", "ragni", "--add", "corpi descritti nei dettagli"], context)).output).toBe("lines: ragni; corpi descritti nei dettagli");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("lines:\n  - ragni\n  - corpi descritti nei dettagli\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed", data: { setting: "lines", add: ["ragni", "corpi descritti nei dettagli"] } });

        const logLines = readLogFile(folder).length;
        expect((await runCommandLine(["config", "lines", "--add", "Ragni"], context)).output).toBe("lines: ragni; corpi descritti nei dettagli");
        expect(readLogFile(folder)).toHaveLength(logLines);

        expect((await runCommandLine(["config", "lines", "--remove", "ragni"], context)).output).toBe("lines: corpi descritti nei dettagli");
        expect((await runCommandLine(["config", "lines", "--remove", "lupi"], context)).output).toBe(`"lines" does not hold "lupi", so nothing changed. It holds: corpi descritti nei dettagli.`);
        expect((await runCommandLine(["config", "lines", "--remove", "corpi descritti nei dettagli", "--remove", "lupi"], context)).output).toBe(
            `"lines" does not hold "lupi", so nothing changed. It holds: corpi descritti nei dettagli.`,
        );
        expect((await runCommandLine(["config", "lines", "lupi"], context)).output).toBe(`"lines" is a list: change it one item at a time with add and remove.`);
        expect((await runCommandLine(["config", "language", "--add", "it"], context)).output).toBe(`"language" holds one value: give the new value instead of add or remove.`);
        expect((await runCommandLine(["config", "veils", "--add", "torture"], context)).output).toBe("veils: torture");
        expect((await runCommandLine(["config", "veils", "--add", " "], context)).output).toBe("Give the text of each item to add or remove.");
    });

    it("keeps the comments of a hand-written list, and reads accents written either way", async () => {
        writeFileSync(join(folder, "campaign.yaml"), "name: Guadoscuro\nlanguage: it\nsystem: 5e\ndifficulty: normal\nlethality: dice\nlines:\n  - ragni # da sempre\n  - morte di città\n");
        expect((await runCommandLine(["config", "lines", "--add", "Morte di città"], context)).output).toBe("lines: ragni; morte di città");
        await runCommandLine(["config", "lines", "--add", "lupi"], context);
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("  - ragni # da sempre\n");
        expect((await runCommandLine(["config", "lines", "--remove", "morte di città"], context)).output).toBe("lines: ragni; lupi");
    });

    it("reads an empty list written by hand, and refuses one that is not a list", async () => {
        writeFileSync(join(folder, "campaign.yaml"), "name: Guadoscuro\nlanguage: it\nsystem: 5e\ndifficulty: normal\nlethality: dice\nlines:\n");
        expect((await runCommandLine(["config", "lines"], context)).output).toBe("lines: (none)");
        expect((await runCommandLine(["config", "lines", "--add", "ragni"], context)).output).toBe("lines: ragni");

        writeFileSync(join(folder, "campaign.yaml"), "name: Guadoscuro\nlanguage: it\nsystem: 5e\ndifficulty: normal\nlethality: dice\nveils: torture\n");
        expect((await runCommandLine(["config", "veils", "--add", "sangue"], context)).output).toBe(`"veils" in campaign.yaml is not a list of text; write it by hand as veils: [item, item].`);
    });

    it("takes difficulty and lethality among their values, and table as a list (D-141, D-142)", async () => {
        const refused = await runCommandLine(["config", "difficulty", "deadly"], context);
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toContain('"deadly" is not a valid difficulty');
        expect((await runCommandLine(["config", "lethality", "epic"], context)).output).toBe(
            "lethality: epic\n\nStill missing: system (installed: 5e, ironsworn), language, difficulty. Ask the player, then set each one with the config command (setting and value).",
        );
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
            `There is no setting "colour". The settings are: name, language, system, difficulty, lethality, lines, veils, table, precedents, coins, fields, tables, computed, counters, recipes, status-line.`,
        );
        expect((await runCommandLine(["config", "language", "Italiano"], context)).exitCode).toBe(1);
    });

    it("writes nothing when the settings would still not be valid", async () => {
        const handWritten = "name: Guadoscuro\nlanguage: Italiano\n";
        writeFileSync(join(folder, "campaign.yaml"), handWritten);
        const result = await runCommandLine(["config", "system", "5e"], context);
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
