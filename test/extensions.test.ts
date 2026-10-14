// Extensions (D-27, D-28, D-63, D-121, D-427, D-428, D-436): those campaign.yaml lists, their parts of the instructions over the system's, their commands on the
// command line and through MCP, their own state, the lines they add when time passes, their calendar, and what keeps one out.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { findExtension, installedExtensions } from "../src/extensions/index.ts";
import { createMcpServer } from "../src/mcp-server.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext, testExtensionFolders } from "./support.ts";

let folder: string;
let context: Context;
const rpg = (...args: string[]) => runCommandLine(args, context);

/** A campaign of a game system, in play, that lists these extensions in campaign.yaml, as the package command writes them. */
async function campaign(system: string, extensions: Record<string, string>): Promise<void>
{
    await rpg("init", "--name", "Prova", "--language", "en", "--system", system, "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    const listed = Object.entries(extensions).map(([name, version]) => `  "${name}": ${version}\n`).join("");
    appendFileSync(join(folder, "campaign.yaml"), listed === "" ? "" : `extensions:\n${listed}`);
}

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
});

afterEach(() => removeFolder(folder));

describe("the installed extensions", () => {
    it("are the packages with an extension.yaml, scoped or not, found by their package's name or by their name alone", () => {
        expect(installedExtensions(testExtensionFolders).map((found) => found.package)).toEqual(expect.arrayContaining(["@rpgengine/omens", "seasons-of-the-test"]));
        const omens = findExtension(testExtensionFolders, "omens");
        expect(omens).toMatchObject({ package: "@rpgengine/omens", name: "omens", version: "1.2.0", about: "an omen each dawn, and one read at will", needs: {} });
        expect(omens?.parts.play.text).toBe("An omen comes each dawn: tell it when the party wakes.");
        expect(findExtension(testExtensionFolders, "@rpgengine/omens")?.name).toBe("omens");
        expect(findExtension(testExtensionFolders, "SEASONS-of-the-test")?.needs).toEqual({ system: "5e" });
        expect(findExtension(testExtensionFolders, "weather-of-nowhere")).toBeUndefined();
    });
});

describe("a campaign's extensions", () => {
    it("are listed in status, each with what it brings (D-28)", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("status")).output).toContain("\nExtensions: omens (an omen each dawn, and one read at will).\n");
    });

    it("add their parts of the instructions to the core's and the system's (D-121)", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("instructions")).output).toMatch(/\n\nAn omen comes each dawn: tell it when the party wakes\.(\n|$)/);
    });

    it("give their commands on the command line, which keep their state in the campaign and write in the log (D-63, D-436)", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("omens-last")).output).toBe("No omen yet.");

        const asked = await rpg("omens", "--question", "will the bridge hold");
        expect(asked.output).toBe("will the bridge hold: a white stag.");
        expect(readFileSync(join(folder, "extensions", "omens", "state.yaml"), "utf8")).toBe("# The state of the extension @rpgengine/omens, kept by its code.\nlast: a white stag\nwhy: asked\n");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "extension", visibility: "hidden", data: { extension: "omens", text: "omen: a white stag" } });
        expect((await rpg("omens-last")).output).toBe("The last omen: a white stag.");
        expect((await rpg("--help")).output).toMatch(/\nThe campaign's extensions:\n  omens\s+Read an omen now, for a question\.\n  omens-last\s+The last omen read\./);

        const refused = await rpg("omens");
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toContain('Invalid input for "omens"');
    });

    it("have no commands where the campaign does not list them", async () => {
        await campaign("ironsworn", {});
        const unknown = await rpg("omens", "--question", "now");
        expect(unknown.exitCode).toBe(1);
        expect(unknown.output).toMatch(/^Unknown command "omens"\./);
        expect(unknown.output).not.toContain("The campaign's extensions");
    });

    it("say what they make of the time passed, as the game starts and at each dawn (D-436)", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("advance", "--to", "day 1, 18:00")).output).toBe("The game starts on day 1, 18:00.\nOmens begin: a white stag.");
        expect((await rpg("advance", "--by", "6h")).output).toBe("day 1, 18:00 → day 2, 00:00.");
        expect((await rpg("advance", "--by", "6h")).output).toBe("day 2, 00:00 → day 2, 06:00.\nOmen of the dawn: a white stag.");
        expect((await rpg("advance", "--by", "3d")).output).toBe("day 2, 06:00 → day 5, 06:00.\nOmen of 3 dawns: a white stag.");
    });

    it("are left out when not installed or made for another game system, and validate says how to fix it; the campaign plays without them (D-27, D-163)", async () => {
        await campaign("ironsworn", { "@test/nowhere": "1.0.0", "seasons-of-the-test": "0.1.0" });
        const problems = (await rpg("validate")).output;
        expect(problems).toContain("The extension @test/nowhere is not installed on this computer: the campaign plays without it.");
        expect(problems).toContain("install it with package install @test/nowhere");
        expect(problems).toContain("The extension seasons-of-the-test needs the game system 5e, and the campaign plays ironsworn: it is left out.");
        expect((await rpg("status")).output).not.toContain("Extensions:");
        expect((await rpg("advance", "--to", "day 1, 18:00")).exitCode).toBe(0);
    });

    it("bring their months in place of the real ones, and the campaign's own months take theirs (TIM-8)", async () => {
        await campaign("5e", { "seasons-of-the-test": "0.1.0" });
        expect((await rpg("config", "calendar-start", "14 April")).output).toBe('The calendar has no month "April": its months are Thaw, Bloom, Ember, Frost. Nothing changed.');
        await rpg("config", "calendar-start", "90 Thaw");
        expect((await rpg("advance", "--to", "day 2, 08:00")).output).toBe("The game starts on day 2, 08:00 (1 Bloom, summer).");

        await rpg("config", "calendar", "months: [{name: Long, days: 365}]");
        expect((await rpg("validate")).output).toContain('The calendar has no month "Thaw"');
        await rpg("config", "calendar-start", "1 Long");
        expect((await rpg("status")).output).toContain("Now: day 2, 08:00 (2 Long)\n");
    });
});

describe("a campaign's extensions through MCP", () => {
    it("are tools beside the core's, there from the first list, and gone when the campaign no longer lists them", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        const server = createMcpServer(context);
        await server.connect(serverTransport);
        const client = new Client({ name: "test", version: "1.0.0" });
        await client.connect(clientTransport);

        try {
            const names = async (): Promise<string[]> => (await client.listTools()).tools.map((tool) => tool.name);
            await client.callTool({ name: "status", arguments: {} });
            expect(await names()).toEqual(expect.arrayContaining(["omens", "omens-last"]));
            const result = await client.callTool({ name: "omens", arguments: { question: "rain?" } });
            expect((result.content as { text: string; }[])[0].text).toBe("rain?: a white stag.");

            const settings = join(folder, "campaign.yaml");
            writeFileSync(settings, readFileSync(settings, "utf8").replace(/extensions:\n.*\n/, ""));
            await client.callTool({ name: "status", arguments: {} });
            expect(await names()).not.toContain("omens");
        } finally {
            await client.close();
        }
    });
});
