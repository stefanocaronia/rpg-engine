import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readEventLog, removeFolder, testContext } from "./support.ts";

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
        expect(result.output).toContain("Still missing: language, system.");

        for (const path of ["campaign.yaml", "state.yaml", "events.jsonl", "sessions", "world/characters", "world/places", "world/factions", "world/quests", "world/items"]) {
            expect(existsSync(join(folder, path)), path).toBe(true);
        }

        expect(readEventLog(folder)).toEqual([{ id: "id1", at: "2026-10-02T10:00:00.000Z", type: "campaign-created", visibility: "public", data: { name: "La nebbia di Guadoscuro" } }]);
    });

    it("names the campaign after its folder and takes the settings it is given", async () => {
        const result = await runCommandLine(["init", "guadoscuro", "--language", "it", "--system", "5e"], context);
        expect(result.output).not.toContain("missing");
        expect(readFileSync(join(folder, "guadoscuro", "campaign.yaml"), "utf8")).toContain("name: guadoscuro\nlanguage: it\nsystem: 5e\n");
    });

    it("says how to set what is still missing", async () => {
        const result = await runCommandLine(["init", "--language", "it"], context);
        expect(result.output).toBe(`Created the campaign "${basename(folder)}" in ${folder}.\nStill missing: system. Set it with: rpg config <setting> <value>`);
    });

    it("refuses a second campaign in the same folder, inside another one or around another one", async () => {
        mkdirSync(join(folder, "campagne", "vecchia"), { recursive: true });
        writeFileSync(join(folder, "campagne", "vecchia", "campaign.yaml"), "name: Vecchia\n");
        expect((await runCommandLine(["init", "campagne"], context)).output).toContain(`holds the campaign in ${join(folder, "campagne", "vecchia")}`);

        await runCommandLine(["init", "nuova"], context);
        expect((await runCommandLine(["init", "nuova"], context)).output).toContain("is already a campaign");
        expect((await runCommandLine(["init", "nuova/world/inner"], context)).output).toContain("a campaign cannot hold another one");
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
        expect(result.output).toBe("name: Guadoscuro\nlanguage: (missing)\nsystem: (missing)\n\nStill missing: language, system. Set them with: rpg config <setting> <value>");
    });

    it("changes a setting, keeps the rest of the file and logs the change", async () => {
        const result = await runCommandLine(["config", "language", "it"], context);
        expect(result.output).toBe("language: it\n\nStill missing: system. Set it with: rpg config <setting> <value>");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toBe(`# Campaign settings: change them with the config command.\nname: Guadoscuro\nlanguage: it\n`);
        expect(readEventLog(folder).at(-1)).toMatchObject({ type: "config-changed", visibility: "public", data: { setting: "language", value: "it" } });
    });

    it("refuses unknown settings and invalid values", async () => {
        expect((await runCommandLine(["config", "colour", "red"], context)).output).toBe(`There is no setting "colour". The settings are: name, language, system.`);
        expect((await runCommandLine(["config", "language", "Italiano"], context)).exitCode).toBe(1);
    });

    it("writes nothing when the settings would still not be valid", async () => {
        const handWritten = "name: Guadoscuro\nlanguage: Italiano\n";
        writeFileSync(join(folder, "campaign.yaml"), handWritten);
        const result = await runCommandLine(["config", "system", "5e"], context);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Fix it with the config command, or by hand.");
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toBe(handWritten);
        expect(readEventLog(folder).map((event) => event.type)).toEqual(["campaign-created"]);
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
        expect(readEventLog(folder).at(-1)).toMatchObject({ type: "roll" });
    });

    it("refuses to work outside a campaign", async () => {
        const result = await runCommandLine(["roll", "1d6"], context);
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Create one with the init command");
        expect(existsSync(join(folder, "events.jsonl"))).toBe(false);
    });
});
