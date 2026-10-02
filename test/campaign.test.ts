import { existsSync, readFileSync } from "node:fs";
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

    it("refuses a second campaign in the same folder or inside another one", async () => {
        await runCommandLine(["init"], context);
        expect((await runCommandLine(["init"], context)).output).toContain("is already a campaign");
        expect((await runCommandLine(["init", "world/inner"], context)).output).toContain("a campaign cannot hold another one");
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
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toBe(`# Campaign settings: change them with "rpg config <setting> <value>".\nname: Guadoscuro\nlanguage: it\n`);
        expect(readEventLog(folder).at(-1)).toMatchObject({ type: "config-changed", visibility: "public", data: { setting: "language", value: "it" } });
    });

    it("refuses unknown settings and invalid values", async () => {
        expect((await runCommandLine(["config", "colour", "red"], context)).output).toBe(`There is no setting "colour". The settings are: name, language, system.`);
        expect((await runCommandLine(["config", "language", "Italiano"], context)).exitCode).toBe(1);
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
        expect(result.output).toContain(`Create one with "rpg init"`);
        expect(existsSync(join(folder, "events.jsonl"))).toBe(false);
    });
});
