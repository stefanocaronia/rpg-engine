// Extensions (D-27, D-28, D-63, D-121, D-427, D-428, D-436): those campaign.yaml lists, their parts of the instructions over the system's, their commands on the
// command line and through MCP, their own state, the lines they add when time passes, their calendar, and what keeps one out.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

/**
 * A folder of packages with the extension @rpgengine/gauges, made here: a widget in the column for each hook, given as its code, its icon a line, and a
 * picture in its images/.
 */
function gauges(where: string, hooks: Record<string, string>): string
{
    const own = join(where, "gauges");
    mkdirSync(join(own, "src"), { recursive: true });
    mkdirSync(join(own, "images"));
    writeFileSync(join(own, "images", "gauge.png"), "png");
    writeFileSync(join(own, "package.json"), JSON.stringify({ name: "@rpgengine/gauges", version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "extension", api: 2 } }));
    const widgets = Object.keys(hooks).map((name) => `  ${name}: {title: ${name}, icon: gauge, place: side}`).join("\n");
    writeFileSync(join(own, "extension.yaml"), `title: gauges\nabout: gauges for the tests\nlanguage: en\nicons:\n  gauge: "M4 12h16"\nwidgets:\n${widgets}\n`);
    const code = Object.entries(hooks).map(([name, hook]) => `${name}: ${hook},`).join(" ");
    writeFileSync(join(own, "src", "index.ts"), `export default () => ({ widgets: { ${code} } });\n`);
    return where;
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

        expect((await rpg("config", "widgets", "omens.nowhere: side")).output).toBe(
            "There is no widget omens.nowhere: the campaign's are omens.last, omens.every, omens.broken. Write one as omens.last: side. Nothing changed.",
        );
        const takes = "omens.last takes top, side, scene, sheet, world, journal, off, or {place, page, order}, such as omens.last: side.";
        expect((await rpg("config", "widgets", "omens.last: bottom")).output).toBe(`${takes} Nothing changed.`);
        expect((await rpg("config", "widgets", "omens.last: {order: 1.5}")).output).toBe(`${takes} Here order is a whole number from -100 to 100. Nothing changed.`);
        expect((await rpg("config", "widgets", "omens.last: {place: page}")).output).toBe(`${takes} Here a card in place page names its page: scene, sheet, world or journal. Nothing changed.`);
        // A widget's name in any case is the same widget, as campaign.yaml's other entries are.
        expect((await rpg("config", "widgets", "Omens.Broken: top")).exitCode).toBe(0);
        expect((await campaignWidgets(folder, context))[2]).toMatchObject({ place: "top" });
        await rpg("config", "widgets", "--remove", "omens.last");
        expect((await campaignWidgets(folder, context))[0]).toMatchObject({ place: "side", own: { place: "side", order: 2 } });
        expect((await rpg("config")).output).toContain("\nwidgets: { omens.every: { place: side, order: -1 }, Omens.Broken: top }");
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

    it("show nothing, with why, for hooks that are late, too long, or name a picture or an icon the extension lacks; the late ones within one time, never called again while at work", async () => {
        const packages = gauges(join(folder, "packages"), {
            slow: "() => { globalThis.gaugeCalls = (globalThis.gaugeCalls ?? 0) + 1; return new Promise(() => {}); }",
            slower: "() => new Promise(() => {})",
            long: "() => ({ parts: [{ text: 'x'.repeat(150) }, ...Array.from({ length: 11 }, () => ({ facts: Array.from({ length: 12 }, () => 'y'.repeat(150)) }))] })",
            picture: "() => ({ parts: [{ image: 'gauge.png', alt: 'a gauge' }] })",
            lost: "() => ({ parts: [{ image: 'lost.png', alt: 'a gauge' }] })",
            icon: "() => ({ icon: 'moon', chip: 'x' })",
        });
        context = { ...context, extensionFolders: [packages] };
        await campaign("ironsworn", { "@rpgengine/gauges": "1.0.0" });
        const started = Date.now();
        const [first, second] = await Promise.all([campaignWidgets(folder, context), campaignWidgets(folder, context)]);
        expect(Date.now() - started).toBeLessThan(3500);
        expect((globalThis as { gaugeCalls?: number; }).gaugeCalls).toBe(1);
        expect(second.map((widget) => widget.problem)).toEqual(first.map((widget) => widget.problem));
        expect(Object.fromEntries(first.map((widget) => [widget.id, widget.problem ?? widget.shows]))).toEqual({
            "gauges.slow": "it gave nothing in 2 seconds",
            "gauges.slower": "it gave nothing in 2 seconds",
            "gauges.long": "it gave more than the dashboard shows of a widget, 12000 characters as JSON",
            "gauges.picture": { parts: [{ image: { extension: "gauges", file: "gauge.png", version: expect.any(Number) }, alt: "a gauge" }] },
            "gauges.lost": "it shows the picture lost.png, which its images/ does not have",
            "gauges.icon": "it names the icon moon, which its extension.yaml does not have",
        });
    }, 10_000);

    it("have their pictures at an address of their extension's own, which a campaign's picture of the same name never hides", async () => {
        context = { ...context, extensionFolders: [gauges(join(folder, "packages"), { picture: "() => undefined" })] };
        await campaign("ironsworn", { "@rpgengine/gauges": "1.0.0" });
        mkdirSync(join(folder, "images"));
        writeFileSync(join(folder, "images", "gauge.png"), "the campaign's");
        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });
        const port = Number(new URL(dashboard?.url ?? "http://127.0.0.1:0").port);
        const get = (path: string): Promise<{ status: number; body: string; }> =>
            new Promise((done, fail) => {
                request({ host: "127.0.0.1", port, path }, (response) => {
                    let text = "";
                    response.setEncoding("utf8");
                    response.on("data", (chunk: string) => (text += chunk));
                    response.on("end", () => done({ status: response.statusCode ?? 0, body: text }));
                }).on("error", fail).end();
            });

        try {
            expect(await get("/images/ext/gauges/gauge.png")).toEqual({ status: 200, body: "png" });
            expect(await get("/images/gauge.png")).toEqual({ status: 200, body: "the campaign's" });
            expect((await get("/images/ext/nobody/gauge.png")).status).toBe(404);
            expect((await get("/images/ext/gauges/..%2Fpackage.json")).status).toBe(404);
        } finally {
            await dashboard?.close();
            session.close();
        }
    });

    it("show nothing, with why, when the extension's code does not load, or its words do not read; validate names the file", async () => {
        const broken = gauges(join(folder, "broken"), { picture: "() => undefined" });
        writeFileSync(join(broken, "gauges", "src", "index.ts"), "throw new Error('broken on purpose');\n");
        context = { ...context, extensionFolders: [broken] };
        await campaign("ironsworn", { "@rpgengine/gauges": "1.0.0" });
        expect((await campaignWidgets(folder, context))[0].problem).toBe("its code cannot be used: broken on purpose");

        const unread = gauges(join(folder, "unread"), { picture: "() => ({ chip: 'x' })" });
        mkdirSync(join(unread, "gauges", "words"));
        writeFileSync(join(unread, "gauges", "words", "it.yaml"), "words: [not, a, map]\n");
        context = { ...context, extensionFolders: [unread] };
        await rpg("config", "language", "it");
        expect((await campaignWidgets(folder, context))[0].problem).toMatch(/^The words of the extension in .*it\.yaml cannot be read: words: .*Fix the file\.$/);
        expect((await rpg("validate")).output).toMatch(/it\.yaml cannot be read: words: .* Fix the file\. Fix: or install it again with package install gauges\./);
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
