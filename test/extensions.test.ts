// Extensions (D-27, D-28, D-63, D-121, D-427, D-428, D-436): those campaign.yaml lists, their parts of the instructions over the system's, their commands on the
// command line and through MCP, their own state, the lines they add when time passes, their calendar, and what keeps one out.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { appendFileSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { campaignWidgets } from "../src/commands/game-widgets.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { startDashboard } from "../src/dashboard-server.ts";
import { findExtension, installedExtensions, readExtension } from "../src/extensions/index.ts";
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

describe("a campaign's widgets on the dashboard (D-502)", () => {
    it("stand where their extension puts them, show what their hook gives, checked, and never the state", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        expect((await campaignWidgets(folder, context)).map((widget) => [widget.id, widget.place, widget.page, widget.order, widget.shows === undefined])).toEqual([
            ["omens.last", "side", undefined, 2, true],
            ["omens.every", "page", "journal", 0, false],
            ["omens.broken", "top", undefined, 0, true],
        ]);

        await rpg("omens", "--question", "will the bridge hold");
        const [last, every, broken] = await campaignWidgets(folder, context);
        expect(last).toMatchObject({ title: "Last omen", from: "omens at dawn, a test extension", icon: expect.stringMatching(/^M2 12s4-7/) });
        expect(last.shows).toEqual({
            icon: expect.stringMatching(/^M12 3l2\.6/),
            chip: "a white stag",
            says: { text: "Read for: {why}", values: { why: "asked" } },
            parts: [{ lead: "a white stag", icon: expect.stringMatching(/^M12 3l2\.6/), value: { number: 3, unit: "days" } }, { text: { text: "Read for: {why}", values: { why: "asked" } } }],
        });
        expect(every.shows?.parts).toHaveLength(5);
        expect(broken).toMatchObject({ problem: 'it gave what the dashboard does not show, at its top: Unrecognized key: "script"' });
        expect(broken.shows).toBeUndefined();
    });

    it("speak the campaign's language by their extension's words, a word it lacks as written", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        await rpg("config", "language", "it");
        await rpg("omens", "--question", "will the bridge hold");
        const [last, every] = await campaignWidgets(folder, context);
        expect(last).toMatchObject({ title: "Ultimo presagio", from: "presagi all'alba, un'estensione di prova" });
        expect(last.shows?.chip).toBe("un cervo bianco");
        expect(last.shows?.parts?.[0]).toMatchObject({ lead: "un cervo bianco", value: { number: 3, unit: "giorni" } });
        expect(last.shows?.says).toEqual({ text: "Letto per: {why}", values: { why: "chiesto" } });
        expect(every.title).toBe("Omens");
    });

    it("are moved or turned off in campaign.yaml with config, and given back their extension's place", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("config", "widgets", "omens.last: journal")).exitCode).toBe(0);
        await rpg("config", "widgets", "omens.every: {place: side, order: -1}");
        await rpg("config", "widgets", "omens.broken: off");
        expect((await campaignWidgets(folder, context)).map((widget) => [widget.id, widget.place, widget.page, widget.order])).toEqual([
            ["omens.last", "page", "journal", 2],
            ["omens.every", "side", undefined, -1],
            ["omens.broken", "off", undefined, 0],
        ]);
        expect((await campaignWidgets(folder, context))[2]).not.toHaveProperty("problem");

        expect((await rpg("config", "widgets", "omens.nowhere: side")).output).toBe("There is no widget omens.nowhere: the campaign's are omens.last, omens.every, omens.broken. Nothing changed.");
        expect((await rpg("config", "widgets", "omens.last: bottom")).output).toBe("omens.last takes top, side, scene, sheet, world, journal, off, or {place, page, order}, such as omens.last: side. Nothing changed.");
        await rpg("config", "widgets", "--remove", "omens.last");
        expect((await campaignWidgets(folder, context))[0]).toMatchObject({ place: "side", own: { place: "side", order: 2 } });
        expect((await rpg("config")).output).toContain("\nwidgets: { omens.every: { place: side, order: -1 }, omens.broken: off }");
    });

    it("reach the page from the dashboard, which moves them as config does and names the extensions in the campaign's language", async () => {
        await campaign("ironsworn", { "@rpgengine/omens": "1.2.0" });
        await rpg("config", "language", "it");
        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });
        const port = Number(new URL(dashboard?.url ?? "http://127.0.0.1:0").port);
        const call = (path: string, body?: unknown): Promise<{ status: number; body: string; }> =>
            new Promise((done, fail) => {
                const headers = body === undefined ? {} : { origin: `http://127.0.0.1:${port}`, "content-type": "application/json" };
                request({ host: "127.0.0.1", port, path, method: body === undefined ? "GET" : "POST", headers }, (response) => {
                    let text = "";
                    response.setEncoding("utf8");
                    response.on("data", (chunk: string) => (text += chunk));
                    response.on("end", () => done({ status: response.statusCode ?? 0, body: text }));
                }).on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
            });

        try {
            const widgets = JSON.parse((await call("/api/widgets")).body) as { widgets: { id: string; place: string; title: string; }[]; };
            expect(widgets.widgets.map((widget) => [widget.id, widget.place, widget.title])).toEqual([["omens.last", "side", "Ultimo presagio"], ["omens.every", "page", "Omens"], [
                "omens.broken",
                "top",
                "Broken",
            ]]);
            expect((await call("/api/config", { setting: "widgets", value: "omens.broken: off" })).status).toBe(202);
            expect(JSON.parse((await call("/api/widgets")).body).widgets[2]).toMatchObject({ place: "off", own: { place: "top" } });
            expect(JSON.parse((await call("/api/config", { setting: "widgets", value: "omens.broken: under" })).body).error).toContain("omens.broken takes top, side");
            expect((await call("/api/config", { setting: "widgets", remove: "omens.broken" })).status).toBe(202);
            expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).not.toContain("widgets");
            expect(dashboard?.news().lines).toEqual([]);

            const packages = JSON.parse((await call("/api/packages")).body) as { installed: { package: string; title: string; about: string; }[]; };
            expect(packages.installed.find((one) => one.package === "@rpgengine/omens")).toMatchObject({ title: "presagi all'alba, un'estensione di prova", about: "un presagio a ogni alba, e uno letto a piacere" });
        } finally {
            await dashboard?.close();
            session.close();
        }
    });

    it("are refused in an extension.yaml that does not say how to show them, with what to fix", () => {
        const copy = join(folder, "omens");
        cpSync(join(testExtensionFolders[1], "omens"), copy, { recursive: true });
        const yaml = readFileSync(join(copy, "extension.yaml"), "utf8");

        const refused = (from: string, to: string): string => {
            writeFileSync(join(copy, "extension.yaml"), yaml.replace(from, to));
            return (() => {
                try {
                    readExtension(copy);
                    return "read";
                } catch (error) {
                    return (error as Error).message;
                }
            })();
        };

        expect(refused("place: side", "place: bottom")).toContain("a widget's place is top, side, page → at widgets.last.place");
        expect(refused("    page: journal\n", "")).toContain("a widget in place page names its page (scene, sheet, world or journal)");
        expect(refused("icon: eye", "icon: moon")).toContain("the icon moon is not among the icons: add it there → at widgets.last.icon");
        expect(refused('eye: "M2', 'eye: "<path d=M2')).toContain("an icon is the path of an SVG, as M4 12h16");
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
