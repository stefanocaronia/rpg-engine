// Extensions (D-27, D-28, D-63, D-121, D-427, D-428, D-436): those campaign.yaml lists, their parts of the instructions over the system's, their commands on the
// command line and through MCP, their own state, the lines they add when time passes, their calendar, and what keeps one out.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { appendFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { tonesOf } from "../src/commands/ask.ts";
import { campaignPageModules } from "../src/commands/game/packages/extensions.ts";
import { campaignWidgets, widgetCard } from "../src/commands/game/packages/widgets.ts";
import type { Context, Rows } from "../src/core/context.ts";
import { readsApi } from "../src/core/package-declarations.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { findExtension, installedExtensions, packageFingerprint, readExtension } from "../src/extensions/index.ts";
import { type Dashboard, startDashboard } from "../src/server/dashboard/index.ts";
import { createMcpServer } from "../src/server/mcp.ts";
import { type GameSystem, systemPageModule } from "../src/systems/index.ts";
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
        expect(findExtension(testExtensionFolders, "SEASONS-of-the-test")?.needs).toEqual({ system: "fake" });
        expect(findExtension(testExtensionFolders, "weather-of-nowhere")).toBeUndefined();
    });
});

describe("a campaign's extensions", () => {
    it("are listed in status, each with what it brings (D-28)", async () => {
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("status")).output).toContain("\nExtensions: omens (an omen each dawn, and one read at will).\n");
    });

    it("add their parts of the instructions to the core's and the system's (D-121)", async () => {
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("instructions")).output).toMatch(/\n\nAn omen comes each dawn: tell it when the party wakes\.(\n|$)/);
    });

    it("give their commands on the command line, which keep their state in the campaign and write in the log (D-63, D-436)", async () => {
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
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
        await campaign("free", {});
        const unknown = await rpg("omens", "--question", "now");
        expect(unknown.exitCode).toBe(1);
        expect(unknown.output).toMatch(/^Unknown command "omens"\./);
        expect(unknown.output).not.toContain("The campaign's extensions");
    });

    it("say what they make of the time passed, as the game starts and at each dawn (D-436)", async () => {
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
        expect((await rpg("advance", "--to", "day 1, 18:00")).output).toBe("The game starts on day 1, 18:00.\nOmens begin: a white stag.");
        expect((await rpg("advance", "--by", "6h")).output).toBe("day 1, 18:00 → day 2, 00:00.");
        expect((await rpg("advance", "--by", "6h")).output).toBe("day 2, 00:00 → day 2, 06:00.\nOmen of the dawn: a white stag.");
        expect((await rpg("advance", "--by", "3d")).output).toBe("day 2, 06:00 → day 5, 06:00.\nOmen of 3 dawns: a white stag.");
    });

    it("are left out when not installed or made for another game system, and validate says how to fix it; the campaign plays without them (D-27, D-163)", async () => {
        await campaign("free", { "@test/nowhere": "1.0.0", "seasons-of-the-test": "0.1.0" });
        const problems = (await rpg("validate")).output;
        expect(problems).toContain("The extension @test/nowhere is not installed on this computer: the campaign plays without it.");
        expect(problems).toContain("install it with package install @test/nowhere");
        expect(problems).toContain("The extension seasons-of-the-test needs the game system fake, and the campaign plays free: it is left out.");
        expect((await rpg("status")).output).not.toContain("Extensions:");
        expect((await rpg("advance", "--to", "day 1, 18:00")).exitCode).toBe(0);
    });

    it("bring their months in place of the real ones, and the campaign's own months take theirs (TIM-8)", async () => {
        await campaign("fake", { "seasons-of-the-test": "0.1.0" });
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
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
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
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
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
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
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
        const takes = "omens.last takes top, side, person, scene, sheet, world, journal, off, or {place, page, order}, such as omens.last: side.";
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
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
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
        await campaign("free", { "@rpgengine/gauges": "1.0.0" });
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
        await campaign("free", { "@rpgengine/gauges": "1.0.0" });
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
        await campaign("free", { "@rpgengine/gauges": "1.0.0" });
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
        cpSync(join(testExtensionFolders[0], "omens"), copy, { recursive: true });
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

        expect(refused("place: side", "place: bottom")).toContain("a widget's place is top, side, page, person, card → at widgets.last.place");
        expect(refused("    page: journal\n", "")).toContain("a widget in place page names its page (scene, sheet, world or journal)");
        expect(refused("icon: eye", "icon: moon")).toContain("the icon moon is not among the icons: add it there → at widgets.last.icon");
        expect(refused('eye: "M2', 'eye: "<path d=M2')).toContain("an icon is the path of an SVG, as M4 12h16");
    });
});

describe("the API 3 of an extension's code (D-505)", () => {
    /** A campaign of the fake system with the wards extension and those given, Kira its player character, Bram her companion, and Ombra outside the party. */
    async function warded(more: Record<string, string> = {}): Promise<void>
    {
        await campaign("fake", { "@rpgengine/wards": "0.3.0", ...more });
        await rpg("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "wit=7", "--set", "ward-sign=firm", "--set", "nerve=2");
        await rpg("write", "Bram", "--type", "character", "--set", "role=companion");
        await rpg("write", "Ombra", "--type", "character");
    }

    /** What the wards command reads of a page, the party and the scene. */
    const read = async (...args: string[]): Promise<any> => JSON.parse((await rpg("wards", ...args)).output);

    /** A folder of packages with an extension of no code, named @rpgengine/<name>, that adds this to the game system. */
    function adding(where: string, name: string, additions: string): string
    {
        mkdirSync(join(where, name), { recursive: true });
        writeFileSync(join(where, name, "package.json"), JSON.stringify({ name: `@rpgengine/${name}`, version: "1.0.0", "rpg-engine": { kind: "extension", api: 3 } }));
        writeFileSync(join(where, name, "extension.yaml"), `title: ${name}\nabout: ${name} for the tests\nlanguage: en\n${additions}\n`);
        return where;
    }

    it("add to the game system over it, the extensions in the campaign's order, and the campaign's additions win (CAM-2)", async () => {
        context = { ...context, extensionFolders: [adding(join(folder, "packages"), "later", "counters:\n  nerve: {min: -6, max: 9}"), ...testExtensionFolders] };
        await warded();
        expect((await read("Kira", "--field", "ward-bonus")).page.value).toBe(4);
        expect((await read("Kira", "--field", "ward-charges")).page).toMatchObject({ value: "3/3", counter: { value: 3, max: 3 } });
        expect((await read("Kira", "--field", "nerve")).page.value).toBe("2/8");
        expect((await rpg("write", "Kira", "--add", "scars=warded")).exitCode).toBe(0);
        expect((await rpg("validate")).output).not.toContain("warded");

        appendFileSync(join(folder, "campaign.yaml"), '  "@rpgengine/later": 1.0.0\n');
        expect((await read("Kira", "--field", "nerve")).page.value).toBe("2/9");
        await rpg("config", "counters", "nerve: {min: -6, max: 12}");
        expect((await read("Kira", "--field", "nerve")).page.value).toBe("2/12");

        await rpg("wards-change", "Kira", "--field", "ward-charges", "--to", "0");
        expect((await rpg("change", "Kira", "--recipe", "sojourn")).output).toContain("ward-charges 0/3 → 3/3");
    });

    it("are left out when they do not read, named by validate, and the campaign plays with the other layers (CAM-3)", async () => {
        context = { ...context, extensionFolders: [adding(join(folder, "packages"), "cracked", "fields:\n  crack: number\ncomputed:\n  crack: 1 +"), ...testExtensionFolders] };
        await warded({ "@rpgengine/cracked": "1.0.0" });
        const problems = (await rpg("validate")).output;
        expect(problems).toContain('What the extension cracked adds to the system fake does not read, so the campaign plays without it: computed.crack: "1 +" is not a formula');
        expect(problems).toContain("install another version of it with package install cracked, or take it away with package remove");
        expect((await read("Kira", "--field", "ward-bonus")).page.value).toBe(4);
        expect((await rpg("config", "counters", "nerve: {min: -6, max: ward-bonus}")).exitCode).toBe(0);
        expect((await read("Kira", "--field", "nerve")).page.value).toBe("2/4");
    });

    it("read a page with its effects and what the system works out, the party, and the scene with its round and turn", async () => {
        await warded();
        await rpg("effect", "add", "Kira", "Sharp", "--set", "wit=3");
        expect(await read("Kira", "--field", "wit", "--formula", "ward-bonus * 2", "--effect", "sharp")).toEqual({
            page: { name: "Kira", pc: true, party: true, value: 3, counter: { value: 3 }, formula: 4, has: true },
            members: [{ name: "Bram", pc: false }, { name: "Kira", pc: true }],
            scene: null,
        });
        expect((await read("Ombra", "--effect", "Sharp")).page).toEqual({ name: "Ombra", pc: false, party: false, has: false });
        expect((await read("Nessuno")).page).toBeNull();
        const unread = await rpg("wards", "Kira", "--formula", "1 +");
        expect(unread.exitCode).toBe(1);
        expect(unread.output).toContain("The formula 1 + does not read:");

        await rpg("scene", "open", "--title", "Agguato", "--type", "combat", "--with", "Kira", "--with", "Bram");
        expect((await read("Kira")).scene).toEqual({ title: "Agguato" });
        await rpg("scene", "order", "--order", "Kira", "--order", "Bram");
        expect((await read("Kira")).scene).toEqual({ title: "Agguato", round: 1, turn: "Kira" });
    });

    it("are left out when they declare a field the core's pages hold, as role or status, which validate says (D-505)", async () => {
        context = { ...context, extensionFolders: [adding(join(folder, "packages"), "usurper", "fields:\n  role: text\n  hostile: text\n  usurped: number"), ...testExtensionFolders] };
        await campaign("free", { "@rpgengine/usurper": "1.0.0" });
        expect((await rpg("validate")).output).toContain("The extension @rpgengine/usurper declares role, hostile, which the engine's own pages hold: it is left out.");
        expect((await rpg("status")).output).not.toContain("Extensions:");
    });

    it("set any field of any page as write --set does, under the name the system with its additions gives it; a counter is changed (D-511, D-514)", async () => {
        context = { ...context, extensionFolders: [adding(join(folder, "packages"), "earlier", "fields:\n  ward-strength: number"), ...testExtensionFolders] };
        await campaign("fake", { "@rpgengine/earlier": "1.0.0", "@rpgengine/wards": "0.3.0" });
        await rpg("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "wit=7", "--set", "ward-sign=firm");
        // Another extension's field, and the system's.
        expect((await rpg("wards-mark", "Kira", "--field", "ward-strength", "--value", "9")).output).toBe("Marked.");
        expect((await rpg("wards-mark", "Kira", "--field", "wit", "--value", "3")).output).toBe("Marked.");
        // A counter is changed, never just written, as write --set refuses it (D-514).
        expect((await rpg("wards-mark", "Kira", "--field", "ward-charges", "--value", "2")).output).toContain("ward-charges is a counter");
        // Under the name the system with its additions gives it, whatever the case it is given in.
        await rpg("wards-mark", "Kira", "--field", "WARD-SIGN", "--value", "deep");
        const kira = readFileSync(join(folder, "world", "characters", "Kira.md"), "utf8");
        expect(kira).toContain("\nward-sign: deep\n");
        expect(kira).toContain("\nwit: 3\n");
        expect(kira).not.toContain("WARD-SIGN");
    });

    it("set fields, each with its line in the log as the engine shows that page, and a widget reads them", async () => {
        await warded();
        expect((await rpg("wards-mark", "Kira", "--field", "ward-sign", "--value", "deep")).output).toBe("Marked.");
        expect((await read("Kira", "--field", "ward-bonus")).page.value).toBe(5);
        // As write logs it: page-updated for a field, nothing for a value that stays (D-514).
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "page-updated", visibility: "hidden", data: { page: "Kira", set: { "ward-sign": "deep" }, why: "a ward marked" } });
        const marked = readLogFile(folder).length;
        await rpg("wards-mark", "Kira", "--field", "ward-sign", "--value", "deep");
        expect(readLogFile(folder)).toHaveLength(marked);
        await rpg("wards-mark", "Ombra", "--field", "ward-strength", "--value", "3");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "page-updated", data: { page: "Ombra", set: { "ward-strength": 3 } } });

        await rpg("wards-change", "Kira", "--field", "nerve", "--to", "8");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Kira", field: "nerve", after: "8/8" } });
        const lines = readLogFile(folder).length;
        expect((await rpg("wards-mark", "Nessuno", "--field", "ward-strength", "--value", "1")).output).toBe("No page alone is named Nessuno: give the name of one page of the campaign. Nothing changed.");
        expect(readLogFile(folder)).toHaveLength(lines);

        const ward = async () => (await campaignWidgets(folder, context)).find((widget) => widget.extension === "wards")?.shows;
        expect(await ward()).toBeUndefined();
        await rpg("wards-mark", "Kira", "--field", "ward-strength", "--value", "6");
        expect(await ward()).toEqual({ parts: [{ track: { label: "Ward", value: 6, max: 10 } }] });
    });

    it("roll for who, in view in the party and behind the screen outside it as master-rolls says; the player's physical dice in view (D-287)", async () => {
        await warded();
        const roll = async (...args: string[]): Promise<any> => JSON.parse((await rpg("wards-roll", "--notation", "1d6", ...args)).output);
        expect(await roll("--who", "Bram")).toEqual({ notation: "1d6", total: 4, faces: [4], dice: [{ sides: 6, value: 4 }], text: "1d6 = 4 [4]", id: expect.any(String), hidden: false });
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "roll", visibility: "public", data: { who: "Bram", why: "a ward tested", check: "Ward", physical: false } });
        expect(await roll("--who", "Ombra")).toMatchObject({ total: 4, hidden: true });
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "roll", visibility: "hidden", data: { who: "Ombra", fingerprint: expect.any(String) } });
        expect(await roll("--who", "Ombra", "--values", "2")).toMatchObject({ total: 2, faces: [2], hidden: false });
        expect(readLogFile(folder).at(-1)).toMatchObject({ visibility: "public", data: { who: "Ombra", physical: true } });

        await rpg("config", "master-rolls", "in view");
        expect(await roll("--who", "Ombra")).toMatchObject({ hidden: false });
        expect(readLogFile(folder).at(-1)).toMatchObject({ visibility: "public" });
    });

    it("ask in the card of a widget, read before the dice and once the call ends, with their buttons' words, their rule, and no button to turn down a forced roll (D-507)", async () => {
        await warded();
        const asked: { labels: string[]; rows?: Rows; before?: unknown; }[] = [];
        const ended: unknown[] = [];
        context = {
            ...context,
            page: {
                // The question comes at once: the card is read apart, never in its way.
                choose: async (_question, _title, labels, _signal, rows) => (asked.push({ labels, rows, before: await rows?.card?.shows() }), 0),
                cardEnded: (card) => void card.shows().then((shows) => ended.push({ widget: card.widget, key: card.key, shows })),
            },
        };
        expect(JSON.parse((await rpg("wards-ask", "--question", "Raise the ward", "--card")).output)).toMatchObject({ rolled: { total: 6 } });
        expect(asked[0]).toMatchObject({
            labels: ["Roll: Ward (1d6+2)", "Change my mind"],
            rows: { who: "Kira", buttons: [{ name: "Raise it", note: "now" }, null], rule: "A 1 breaks the ward", card: { widget: "wards.ward", key: "ward-1" } },
            before: undefined,
        });
        await vi.waitFor(() => expect(ended).toEqual([{ widget: "wards.ward", key: "ward-1", shows: { parts: [{ track: { label: "Ward", value: 6, max: 10 } }] } }]));

        await rpg("wards-ask", "--question", "Hold the ward", "--forced");
        expect(asked[1].labels).toEqual(["Roll: Ward (1d6+2)"]);
        expect(asked[1].rows).toEqual({ who: "Kira", fields: ["wit-bonus"], forced: true });
        expect(ended).toHaveLength(1);
    });

    it("keep how the dice turned out in the roll's line only when there is one for each, good, bad or none, behind the screen too (D-507)", () => {
        expect(tonesOf(["bad", undefined], [1, 4])).toEqual({ tones: ["bad", null] });
        expect([tonesOf(["bad"], [1, 4]), tonesOf(["bad", "good", "good"], [1, 4]), tonesOf(["bad", "lucky"], [1, 4]), tonesOf([undefined, undefined], [1, 4])]).toEqual([{}, {}, {}, {}]);
    });

    it("give no card where the widget's hook fails, and refuse a widget the extension does not have", async () => {
        context = { ...context, extensionFolders: [gauges(join(folder, "packages"), { broken: "() => { throw new Error('no') }" })] };
        await campaign("free", { "@rpgengine/gauges": "1.0.0" });
        const extension = findExtension(context.extensionFolders ?? [], "gauges");
        expect(extension === undefined ? "none" : await widgetCard(folder, context, extension, "broken", "key")).toBeUndefined();
    });

    it("refuse to ask in the card of a widget the extension does not have, saying its own", async () => {
        await warded();
        context = { ...context, page: { choose: async () => 0 } };
        expect((await rpg("wards-ask", "--question", "Raise the ward", "--card", "--widget", "shield")).output).toBe(
            "The extension wards asks in the card of a widget shield it does not have: its own are ward. Nothing was asked.",
        );
    });

    it("ask the player for a roll as ask does: rolled, declined, said in words, or to ask in words; nothing is written once the call is stopped (ASK-3, ASK-4, ASK-8, ASK-9, ASK-10)", async () => {
        await warded();

        const asked = async (page?: Context["page"], signal?: AbortSignal): Promise<{ output: string; exitCode: number; }> => {
            const own = context;
            context = { ...context, ...(page === undefined ? {} : { page }), ...(signal === undefined ? {} : { signal }) };
            const result = await rpg("wards-ask", "--question", "Raise the ward before they come");
            context = own;
            return result;
        };

        const answering = (answer: Awaited<ReturnType<NonNullable<Context["page"]>["choose"]>>): Context["page"] => ({ choose: async () => answer });

        expect(JSON.parse((await asked(answering(0))).output)).toEqual({ rolled: { id: expect.any(String), total: 6, faces: [4], text: "1d6+2 = 6 [4] + 2" } });
        expect(readLogFile(folder).slice(-3)).toMatchObject([
            { type: "roll", by: "player", visibility: "public", data: { who: "Kira", check: "Ward", why: "Ward: Raise the ward before they come" } },
            { type: "page-updated", data: { page: "Kira", set: { "ward-strength": 6 } } },
            { type: "extension", data: { text: "ward asked: rolled" } },
        ]);
        expect(JSON.parse((await asked(answering(1))).output)).toEqual({ declined: true });
        expect(JSON.parse((await asked(answering({ said: "I run instead" }))).output)).toEqual({ said: "I run instead" });
        expect(JSON.parse((await asked()).output)).toEqual({ inWords: "Raise the ward before they come (the checks: Ward 1d6+2)", physical: false });
        await rpg("config", "dice", "physical");
        expect(JSON.parse((await asked(answering(0))).output)).toEqual({ inWords: "Raise the ward before they come (the checks: Ward 1d6+2)", physical: true });
        await rpg("config", "dice", "digital");

        const lines = readLogFile(folder).length;
        const stopped = new AbortController();
        stopped.abort();
        expect((await asked(answering(0), stopped.signal)).output).toBe("The call was stopped: nothing more is written.");
        const midway = new AbortController();
        const waiting: Context["page"] = { choose: (_question, _title, _labels, signal) => new Promise((done) => signal?.addEventListener("abort", () => done(0))) };
        setTimeout(() => midway.abort(), 20);
        expect((await asked(waiting, midway.signal)).exitCode).toBe(1);
        expect(readLogFile(folder)).toHaveLength(lines);
    });

    it("read packages made for the API 1 to 6, as omens, skies, wards and charms, and refuse one made for a newer, with what to install (D-515)", () => {
        expect([0, 1, 2, 3, 4, 5, 6, 7, 2.5, undefined].map((api) => readsApi(api, "extension"))).toEqual([false, true, true, true, true, true, true, false, false, false]);
        // A game system's first API is 5, the one contract (D-514).
        expect([1, 4, 5, 6, 7].map((api) => readsApi(api, "system"))).toEqual([false, false, true, true, false]);
        expect(findExtension(testExtensionFolders, "omens")?.adds).toEqual({});
        expect(findExtension(testExtensionFolders, "skies")?.name).toBe("skies");
        expect(findExtension(testExtensionFolders, "wards")?.adds.counters).toEqual({ "ward-charges": { max: "wit-bonus + 1" }, nerve: { min: -6, max: 8 } });

        const newer = join(folder, "newer");
        cpSync(join(testExtensionFolders[0], "wards"), newer, { recursive: true });
        writeFileSync(join(newer, "package.json"), JSON.stringify({ name: "@rpgengine/wards", version: "9.0.0", "rpg-engine": { kind: "extension", api: 7 } }));
        expect(() => readExtension(newer)).toThrow(
            "The extension @rpgengine/wards cannot be used, because it is made for the API 7, and this rpg-engine reads the API 1 to 6 for an extension: rpg-engine must be updated first: ask the player to update it on the Packages page of their dashboard, or as they installed it, then open a new chat.",
        );
    });
});

describe("a package's code in the dashboard's page (D-510, D-511)", () => {
    /** The campaign's dashboard, and what it answers at an address, sent JSON when there is a body. */
    async function served(): Promise<{ call(path: string, body?: unknown): Promise<{ status: number; body: string; type: string; policy: string; }>; close(): Promise<void>; dashboard: Dashboard; }>
    {
        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });

        if (dashboard === undefined) {
            throw new Error("The dashboard did not start.");
        }

        const port = Number(new URL(dashboard.url).port);
        return {
            dashboard,
            call: (path, body) =>
                new Promise((done, fail) => {
                    const headers = body === undefined ? {} : { origin: `http://127.0.0.1:${port}`, "content-type": "application/json" };
                    request({ host: "127.0.0.1", port, path, method: body === undefined ? "GET" : "POST", headers }, (response) => {
                        let text = "";
                        response.setEncoding("utf8");
                        response.on("data", (chunk: string) => (text += chunk));
                        response.on("end", () => done({ status: response.statusCode ?? 0, body: text, type: String(response.headers["content-type"]), policy: String(response.headers["content-security-policy"]) }));
                    }).on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
                }),
            close: async () => {
                await dashboard.close();
                session.close();
            },
        };
    }

    it("read a package's page module and figures, and the figures a widget names, which its extension.yaml declares", async () => {
        const charms = findExtension(testExtensionFolders, "charms");
        expect(charms?.page).toBe(join(testExtensionFolders[0], "charms", "page", "page.js"));
        expect(charms?.figures).toEqual({ knot: { width: 120, height: 40, mirror: true }, braid: { width: 360, height: 120 } });

        await campaign("free", { "@rpgengine/charms": "1.0.0" });
        await rpg("write", "Kira", "--type", "character", "--set", "role=pc");
        const [charm] = await campaignWidgets(folder, context);
        expect(charm).toMatchObject({ id: "charms.charm", version: "1.0.0", module: "/pkg/%40rpgengine%2Fcharms/1.0.0/page.js", figures: charms?.figures });
        expect(charm.shows).toEqual({
            data: { knots: 0, secret: "only-the-page-reads-this" },
            body: "braid",
            parts: [{ who: "Kira", does: "ties" }, { track: { label: "Knots", value: 0, max: 5, figure: "knot" } }],
        });
        // What only the page draws never reaches the master.
        expect(`${(await rpg("view", "--json")).output}${(await rpg("status")).output}`).not.toContain("only-the-page-reads-this");
    });

    it("serve a package's page files beside its module, only of the campaign's packages whose code runs, at the version installed", async () => {
        await campaign("free", { "@rpgengine/charms": "1.0.0" });
        const page = await served();

        try {
            expect(JSON.parse((await page.call("/api/modules")).body)).toEqual({
                modules: [{ package: "@rpgengine/charms", kind: "extension", version: "1.0.0", address: "/pkg/%40rpgengine%2Fcharms/1.0.0/page.js", figures: expect.any(Object) }],
            });
            const module = await page.call("/pkg/%40rpgengine%2Fcharms/1.0.0/page.js");
            expect(module).toMatchObject({ status: 200, type: "text/javascript; charset=utf-8" });
            expect(module.body).toContain("figures");
            expect(await page.call("/pkg/%40rpgengine%2Fcharms/1.0.0/parts/twist.js")).toMatchObject({ status: 200 });
            expect((await page.call("/pkg/%40rpgengine%2Fcharms/1.0.0/page.css")).type).toBe("text/css; charset=utf-8");

            for (const refused of ["notes.txt", "..%2Fpackage.json", "..%2Fsrc%2Findex.ts", "%2E%2E/extension.yaml"]) {
                expect((await page.call(`/pkg/%40rpgengine%2Fcharms/1.0.0/${refused}`)).status, refused).toBe(404);
            }

            expect((await page.call("/pkg/%40rpgengine%2Fcharms/0.9.0/page.js")).status).toBe(404);
            expect((await page.call("/pkg/%40rpgengine%2Fomens/1.2.0/page.js")).status).toBe(404);
        } finally {
            await page.close();
        }

        // A package the campaign does not use gives the page nothing.
        await rpg("package", "remove", "charms");
        const other = await served();

        try {
            expect((await other.call("/pkg/%40rpgengine%2Fcharms/1.0.0/page.js")).status).toBe(404);
            expect(JSON.parse((await other.call("/api/modules")).body)).toEqual({ modules: [] });
        } finally {
            await other.close();
        }
    });

    it("give a package's page code its words in the campaign's language, with its widgets and its module, and none in its own language (D-510)", async () => {
        await campaign("free", { "@rpgengine/charms": "1.0.0" });
        const words = { "{count} knots tied": "{count} nodi fatti", Knots: "Nodi" };
        const page = await served();

        try {
            expect((await campaignWidgets(folder, context))[0].words).toBeUndefined();
            expect(JSON.parse((await page.call("/api/modules")).body).modules[0].words).toBeUndefined();
            await rpg("config", "language", "it");
            expect((await campaignWidgets(folder, context))[0]).toMatchObject({ words, shows: { parts: [expect.anything(), { track: { label: "Nodi" } }] } });
            expect(campaignPageModules(folder, context, undefined)[0].words).toEqual(words);
        } finally {
            await page.close();
        }
    });

    it("refuse a page module outside its package, an extension's or a system's, and an address that does not decode; fingerprint files in a plain order (D-510)", async () => {
        const root = makeTempFolder();
        cpSync(join(testExtensionFolders[0], "charms"), join(root, "packs", "charms"), { recursive: true });
        const manifest = join(root, "packs", "charms", "package.json");
        writeFileSync(manifest, readFileSync(manifest, "utf8").replace('"page/page.js"', '"../../elsewhere/page.js"'));
        expect(() => readExtension(join(root, "packs", "charms"))).toThrow(
            "The extension @rpgengine/charms cannot be used, because its page, ../../elsewhere/page.js, is not inside its package: name a file of its own, such as dist/page.js.",
        );
        const system = join(root, "trial");
        mkdirSync(system);
        writeFileSync(join(system, "package.json"), JSON.stringify({ name: "@test/system-trial", version: "0.3.0", "rpg-engine": { kind: "system", page: "../elsewhere/page.js" } }));
        expect(systemPageModule(system)).toBeUndefined();

        await campaign("free", {});
        const page = await served();

        try {
            expect((await page.call("/pkg/%E0%A4%A/1.0.0/page.js")).status).toBe(404);
        } finally {
            await page.close();
        }

        // The same files make the same fingerprint, whichever came first, in the order of their names' code points.
        const [first, second] = [join(root, "one"), join(root, "two")];
        mkdirSync(first);
        mkdirSync(second);
        writeFileSync(join(first, "b.js"), "b");
        writeFileSync(join(first, "A.js"), "a");
        writeFileSync(join(second, "A.js"), "a");
        writeFileSync(join(second, "b.js"), "b");
        expect(packageFingerprint(first)).toBe(packageFingerprint(second));
    });

    it("read a game system's page module too, as its package.json declares it, listed before the extensions' (D-511)", async () => {
        const system = join(makeTempFolder(), "trial");
        mkdirSync(system);
        writeFileSync(join(system, "package.json"), JSON.stringify({ name: "@test/system-trial", version: "0.3.0", "rpg-engine": { kind: "system", api: 5, page: "page/page.js" } }));
        expect(systemPageModule(system)).toEqual({ file: join(system, "page", "page.js"), package: "@test/system-trial", version: "0.3.0" });
        await campaign("free", { "@rpgengine/charms": "1.0.0" });
        const modules = campaignPageModules(folder, context, { folder: system, language: "en" } as GameSystem);
        expect(modules.map((one) => [one.package, one.kind, one.address])).toEqual([
            ["@test/system-trial", "system", "/pkg/%40test%2Fsystem-trial/0.3.0/page.js"],
            ["@rpgengine/charms", "extension", "/pkg/%40rpgengine%2Fcharms/1.0.0/page.js"],
        ]);
    });

    it("run for the player only an extension's commands marked player, as the player, and the master hears it, quoted, at their next call", async () => {
        await campaign("free", { "@rpgengine/charms": "1.0.0" });
        const page = await served();

        try {
            const tied = await page.call("/api/run", { command: "charms-tie", input: { knot: "sailor's" } });
            expect(JSON.parse(tied.body)).toEqual({ text: "A sailor's knot: 1 in all." });
            expect(readLogFile(folder).at(-1)).toMatchObject({ type: "extension", by: "player", data: { text: "knot tied: sailor's" } });
            expect(page.dashboard.news().lines).toEqual(["The player, on the dashboard, ran charms-tie: it is already done, do not run it again. It said, as its package's words:\n> A sailor's knot: 1 in all."]);
            expect(JSON.parse((await page.call("/api/run", { command: "charms", input: {} })).body).error).toBe("No package of the campaign gives charms to the player: a page runs only the commands its package marks player.");
            expect(JSON.parse((await page.call("/api/run", { command: "charms-tie", input: {} })).body).error).toMatch(/^The input of charms-tie is not valid: knot: /);
            expect((await page.call("/api/run", { command: "status" })).status).toBe(400);
        } finally {
            await page.close();
        }
    });

    it("let the page update or take away only packages on this computer, and never ask again in the session for one the player said no to (D-510)", async () => {
        await campaign("free", {});
        const asked: string[] = [];
        const npm = { describe: () => Promise.resolve({ name: "@test/rumors", version: "2.0.0", kind: "extension", api: 1 }), install: () => Promise.resolve(undefined) };
        context = { ...context, packages: npm as unknown as Context["packages"], confirm: { ask: (_title, text) => (asked.push(text), Promise.resolve("no" as const)) } };
        const page = await served();

        try {
            expect(JSON.parse((await page.call("/api/package", { action: "update", name: "npm:@test/rumors" })).body).error).toBe(
                "npm:@test/rumors is not installed on this computer: add a package from the Packages page, where you choose it.",
            );
            expect(asked).toEqual([]);
            expect((await page.call("/api/add", { source: "npm:@test/rumors" })).status).toBe(400);
            expect(asked).toEqual([expect.stringMatching(/^Install @test\/rumors 2\.0\.0\? Not verified by RPG Engine: @test\/rumors 2\.0\.0, asked from the dashboard\./)]);

            // However the page writes it, the package npm describes was said no to: no window again.
            for (const source of ["npm:@test/rumors", "@test/rumors", "npm:@test/rumors@2.0.0", "@test/rumors@latest", " npm:@test/rumors@2"]) {
                const again = await page.call("/api/add", { source });
                expect(again.status, source).toBe(400);
                expect(JSON.parse(again.body), source).toMatchObject({ code: "declined" });
            }

            expect(asked).toHaveLength(1);
        } finally {
            await page.close();
        }
    });
});

describe("a campaign's extensions through MCP", () => {
    it("are tools beside the core's, there from the first list, and gone when the campaign no longer lists them", async () => {
        await campaign("free", { "@rpgengine/omens": "1.2.0" });
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

    it("tell the host they wait for the player while one that needs the player asks, and leave the others silent (D-505)", async () => {
        await campaign("fake", { "@rpgengine/wards": "0.3.0" });
        await rpg("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "wit=7");
        let click: (index: number) => void = () => undefined;
        let shown: () => void = () => undefined;
        const asked = new Promise<void>((done) => (shown = done));
        context = { ...context, page: { choose: () => new Promise((done) => ((click = done), shown())) } };
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer(context).connect(serverTransport);
        const client = new Client({ name: "test", version: "1.0.0" });
        await client.connect(clientTransport);
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

        try {
            const heard: string[] = [];
            await client.callTool({ name: "status", arguments: {} });
            const call = client.callTool({ name: "wards-ask", arguments: { question: "Raise the ward" } }, undefined, { onprogress: (progress) => heard.push(progress.message ?? "") });
            await asked;
            await vi.advanceTimersByTimeAsync(20_000);
            await vi.waitFor(() => expect(heard).toEqual(["waiting for the player"]));
            click(0);
            expect(JSON.parse(((await call).content as { text: string; }[])[0].text)).toMatchObject({ rolled: { total: 6 } });

            heard.length = 0;
            const read = client.callTool({ name: "wards", arguments: { page: "Kira" } }, undefined, { onprogress: (progress) => heard.push(progress.message ?? "") });
            await vi.advanceTimersByTimeAsync(20_000);
            await read;
            expect(heard).toEqual([]);
        } finally {
            vi.useRealTimers();
            await client.close();
        }
    });
});
