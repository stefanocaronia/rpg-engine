// The player's dashboard (D-270, D-272): view gives the party and the sheet as data, with the chat's text unchanged; the server gives only what view gives, only
// to its own page, tells the page when a file changes, and serves the pictures.
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, request } from "node:http";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { ask } from "../src/commands/ask.ts";
import type { ViewResult } from "../src/commands/view.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore, type WatchFolder } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/dashboard-server.ts";
import { explanations } from "../src/dashboard/api.ts";
import type { SheetValue, View } from "../src/dashboard/data.ts";
import { fieldLabel, groupLabels, initials, shownText } from "../src/dashboard/labels.ts";
import { groupLayout, orderedValues, trackPlaces, widgetOf } from "../src/dashboard/layout.ts";
import { dashboardOpener } from "../src/mcp-server.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext, testSystemFolders } from "./support.ts";

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("advance", "--to", "day 1, 18:00");
    await ok("write", "Locanda", "--type", "place");
    await ok(
        "write",
        "Ettore",
        "--type",
        "character",
        ...[
            "role=pc",
            "classes=[[Cleric]] 3",
            "xp=900",
            "str=14",
            "dex=8",
            "con=15",
            "int=10",
            "wis=16",
            "cha=12",
            "hp-base=18",
            "hp=20/24",
            "speed=25 ft.",
            "hit-dice-d8=3/3",
            "save-proficiencies=[wis, cha]",
            "skill-proficiencies=[Insight, Religion]",
            "languages=[Common, Dwarvish]",
        ].flatMap((field) => ["--set", field]),
    );
    await ok("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]");
    await ok("write", "Locanda", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lupa]]");
    await ok("effect", "add", "Ettore", "Benedizione", "--for", "1h");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Il mugnaio.");
    await ok("write", "Varro#Colpa", "--secret", "--text", "Ha ucciso il fratello.");
    await ok("write", "Ettore", "--add", "knows=[[Varro]]");
    writeFileSync(join(folder, "ritratto.png"), png);
    await ok("image", "Ettore", join(folder, "ritratto.png"));
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("view as data (VIEW-1, D-272)", () => {
    it("gives the party with their pictures, places, numbers with their limits and effects, and the chat the same lines", async () => {
        const data = JSON.parse(await ok("view", "--json"));
        expect(data.party[0]).toMatchObject({
            name: "Ettore",
            role: "pc",
            dead: false,
            image: { file: "Ettore.png", version: expect.any(Number) },
            place: "in Locanda",
            effects: [{ name: "Benedizione", end: "day 1, 19:00", text: "Benedizione until day 1, 19:00" }],
        });
        expect(data.party[0].counters).toContainEqual({ field: "hp", kind: "counter", text: "20/24", counter: { value: 20, max: 24 }, marks: 0 });
        // A companion shows the picture of the creature she derives from (D-267).
        expect(data.party[1]).toMatchObject({ name: "Lupa", role: "companion", image: { file: "wolf-head.svg", version: expect.any(Number) } });
        expect(await ok("view")).toContain([
            "Ettore, in Locanda: level 3 · xp 900 (1800 to level 4) · hp 20/24 · ac 9 · passive-perception 13 · hit-dice-d8 3/3 · slots-1 4/4 · slots-2 2/2 · channel-divinity 1/1 · Benedizione until day 1, 19:00",
            "Lupa (companion), in Locanda: hp 11/11 · ac 13 · passive-perception 13",
        ].join("\n"));
    });

    it("gives the sheet by the system's groups, each value with its text, marks, what is beside it, a counter's limits and the items of a list", async () => {
        const data = JSON.parse(await ok("view", "Ettore", "--json"));
        const group = (name: string) => data.sheet.find((candidate: { name: string; }) => candidate.name === name);
        expect(group("Abilities").values[0]).toEqual({ field: "str", kind: "number", text: "14", marks: 0, beside: "+2" });
        expect(group("Saving Throws").values).toContainEqual({ field: "wis-save", kind: "modifier", text: "+5", marks: 1 });
        expect(group("Combat").values).toContainEqual({ field: "hit-dice-d8", kind: "counter", text: "3/3", counter: { value: 3, max: 3 }, marks: 0 });
        expect(group("Proficiencies").values).toContainEqual({ field: "languages", kind: "list", text: "Common, Dwarvish", items: ["Common", "Dwarvish"], marks: 0 });
        expect(group("Attacks")).toEqual({
            name: "Attacks",
            values: [],
            items: [{ item: "Unarmed Strike", values: [expect.objectContaining({ field: "attack", text: "+4" }), expect.objectContaining({ field: "damage-roll", text: "3 bludgeoning" })] }],
        });
        expect(await ok("view", "Ettore")).toContain("Attacks: Unarmed Strike +4, 3 bludgeoning");
    });

    it("gives a companion who keeps no sheet the stat block of her creature, and the player character the traits and picture of its race (D-275, D-277)", async () => {
        const lupa = JSON.parse(await ok("view", "Lupa", "--json"));
        expect(lupa.sheet).toEqual([{ name: "Wolf", values: expect.arrayContaining([{ field: "str", kind: "number", text: "12", marks: 0, beside: "+1" }]) }]);
        expect(lupa.text).toContain("### Bite");
        // A challenge rating of 1/4 is text, not a counter of 1 out of 4.
        expect(lupa.sheet[0].values).toContainEqual({ field: "cr", kind: "text", text: "1/4", marks: 0 });
        await ok("write", "Brina", "--type", "character", "--set", "role=companion", "--set", "creature=[[Hill Dwarf]]", "--set", "classes=[[Fighter]] 1");
        await ok("write", "Ettore", "--set", "creature=[[Hill Dwarf]]");
        expect(await ok("view", "Ettore")).toContain("### Dwarven Toughness");
        const party = JSON.parse(await ok("view", "--json")).party;
        // Ettore keeps his own picture; Brina, with none, shows her race's.
        expect(party.map((member: { image?: { file: string; }; }) => member.image?.file)).toEqual(["Ettore.png", "dwarf-face.svg", "wolf-head.svg"]);
    });

    it("works the same for another game: momentum from -6, with the maximum the debilities leave", async () => {
        // The test system based on Ironsworn, with a sheet and a line of its own.
        const systems = makeTempFolder();
        cpSync(join(testSystemFolders[1], "ironsworn"), join(systems, "ironsworn"), { recursive: true });
        const settings = join(systems, "ironsworn", "system.yaml");
        writeFileSync(settings, `${readFileSync(settings, "utf8")}\nsheet:\n  Stats: [edge, heart, iron, shadow, wits]\n  Condition: [health, spirit, supply, momentum, debilities?]\nstatus-line: [health, spirit, supply, momentum]\n`);
        const ironsworn = makeTempFolder();
        context = { ...testContext(ironsworn), systemFolders: [testSystemFolders[0], systems] };

        try {
            await ok("init", "--name", "Ferro", "--language", "en", "--system", "ironsworn");
            inPlay(ironsworn);
            await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--set", "edge=2", "--set", "health=5/5", "--set", "momentum=2", "--set", "debilities=[wounded]");
            const data = JSON.parse(await ok("view", "Kira", "--json"));
            const condition = data.sheet.find((group: { name: string; }) => group.name === "Condition");
            expect(condition.values).toContainEqual({ field: "momentum", kind: "counter", text: "2/9", counter: { min: -6, max: 9, value: 2 }, marks: 0 });
            expect(condition.values).toContainEqual({ field: "debilities", kind: "list", text: "wounded", items: ["wounded"], marks: 0 });
            const party = JSON.parse(await ok("view", "--json")).party;
            expect(party[0].counters.map((value: { field: string; }) => value.field)).toEqual(["health", "momentum"]);
        } finally {
            removeFolder(ironsworn);
            removeFolder(systems);
        }
    });
});

describe("the dashboard's server (D-270, D-272)", () => {
    let watchers: { changed: (name: string | undefined) => void; failed: () => void; }[];
    let session: SessionStore;
    let dashboard: Dashboard;
    let port: number;
    // A built page of the tests: a script and a style sheet.
    let page: string;

    const fakeWatcher: WatchFolder = (_folder, changed, failed) => {
        watchers.push({ changed, failed });
        return { close: () => undefined };
    };

    beforeEach(async () => {
        watchers = [];
        page = join(folder, "page");
        mkdirSync(page);
        writeFileSync(join(page, "app.js"), "export {};\n");
        writeFileSync(join(page, "style.css"), "body {}\n");
        mkdirSync(join(page, "assets"));
        writeFileSync(join(page, "assets", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
        writeFileSync(join(folder, "secret.js"), "export {};\n");
        session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: fakeWatcher });
        const started = await startDashboard({ ...context, files: session }, session, { ports: [0], page });

        if (started === undefined) {
            throw new Error("The dashboard did not start.");
        }

        dashboard = started;
        port = Number(new URL(dashboard.url).port);
    });

    afterEach(async () => {
        await dashboard.close();
        session.close();
    });

    function get(path: string, headers: Record<string, string> = {}): Promise<{ status: number; headers: IncomingHttpHeaders; body: string; }>
    {
        return new Promise((done, fail) => {
            request({ host: "127.0.0.1", port, path, headers }, (response) => {
                let body = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (body += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, headers: response.headers, body }));
            }).on("error", fail).end();
        });
    }

    it("gives what view gives, in JSON, and never a secret not discovered, nor another command", async () => {
        const overview = await get("/api/view");
        expect(overview.status).toBe(200);
        expect(overview.headers["content-type"]).toBe("application/json; charset=utf-8");
        expect(JSON.parse(overview.body)).toEqual(JSON.parse(await ok("view", "--json")));
        const varro = await get("/api/view?page=Varro");
        expect(JSON.parse(varro.body)).toMatchObject({ kind: "page", title: "Varro (character)" });
        expect(varro.body).not.toContain("fratello");
        const shown = await get("/api/show?page=Varro");
        expect(shown.status).toBe(404);
        expect(shown.body).not.toContain("fratello");
        expect(JSON.parse(shown.body).error).toBe("The dashboard has no command show: it has view.");
        expect((await get("/api/view?pagina=Varro")).status).toBe(400);
    });

    it("serves the page, which runs only its own scripts and the import map written in it, and Preact from its package", async () => {
        const html = await get("/");
        expect(html.status).toBe(200);
        expect(html.headers["content-type"]).toBe("text/html; charset=utf-8");
        const importMap = /<script type="importmap">(.*)<\/script>/.exec(html.body)?.[1] ?? "";
        expect(JSON.parse(importMap).imports).toEqual({
            "preact": "/vendor/preact.js",
            "preact/hooks": "/vendor/hooks.js",
            "preact/jsx-runtime": "/vendor/jsx-runtime.js",
            "three": "/vendor/three.module.js",
            "cannon-es": "/vendor/cannon-es.js",
        });
        expect(html.headers["content-security-policy"]).toBe(`default-src 'self'; script-src 'self' 'sha256-${createHash("sha256").update(importMap).digest("base64")}'; base-uri 'none'; form-action 'none'`);
        expect(await get("/app.js")).toMatchObject({ status: 200, body: "export {};\n", headers: { "content-type": "text/javascript; charset=utf-8" } });
        expect((await get("/style.css")).headers["content-type"]).toBe("text/css; charset=utf-8");
        expect((await get("/assets/logo.svg")).headers).toMatchObject({ "content-type": "image/svg+xml", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
        // Nothing outside the page's folder, nor what is not a script or a style sheet.
        expect((await get("/%2e%2e/secret.js")).status).toBe(404);
        expect((await get("/..%5Csecret.js")).status).toBe(404);
        expect((await get("/page.json")).status).toBe(404);
        const preact = await get("/vendor/hooks.js");
        expect(preact.status).toBe(200);
        expect(preact.body).toContain('from"preact"');
        expect((await get("/vendor/three.core.js")).status).toBe(200);
        expect((await get("/vendor/compat.js")).status).toBe(404);
    });

    it("answers only its own page: another site, or a name that leads elsewhere, gets nothing", async () => {
        expect((await get("/api/view", { origin: "http://evil.example" })).status).toBe(403);
        expect((await get("/api/view", { host: `evil.example:${port}` })).status).toBe(403);
        expect((await get("/api/view", { origin: `http://localhost:${port}`, host: `localhost:${port}` })).status).toBe(200);
        expect((await get("/api/view")).headers["content-security-policy"]).toBe("default-src 'self'");
    });

    it("tells the page when a file of the campaign changes, by whoever, once for changes that come together", async () => {
        // The first call finds the campaign, and the session watches it.
        await get("/api/view");
        const received: string[] = [];
        const events = request({ host: "127.0.0.1", port, path: "/events" });
        const connected = new Promise<void>((done) => {
            events.on("response", (response) => {
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => {
                    received.push(chunk);
                    done();
                });
            });
        });
        events.end();
        await connected;
        watchers[0].changed("log.jsonl");
        watchers[0].changed("state.yaml");
        await new Promise((done) => setTimeout(done, 300));
        events.destroy();
        expect(received.join("")).toBe("retry: 2000\n\nevent: changed\ndata: {}\n\n");
    });

    it("serves the pictures of the campaign and of the system by name, which a page asks again for nothing when they did not change", async () => {
        const picture = await get("/images/Ettore.png");
        expect(picture.status).toBe(200);
        expect(picture.headers).toMatchObject({ "content-type": "image/png", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
        expect((await get("/images/Ettore.png", { "if-none-match": picture.headers.etag ?? "" })).status).toBe(304);
        expect((await get("/images/wolf-head.svg")).headers["content-type"]).toBe("image/svg+xml");
        expect((await get("/images/..%2Fcampaign.yaml")).status).toBe(404);
        expect((await get("/images/%E0%A4%A")).status).toBe(404);
    });

    it("takes the next port when another program answers at one, even on ::1 only, and gives its link on 127.0.0.1 (D-277)", async () => {
        for (const host of ["127.0.0.1", "::1"]) {
            const taken = createServer();
            await new Promise<void>((done) => taken.listen(0, host, done));
            const busy = (taken.address() as { port: number; }).port;
            const next = await startDashboard({ ...context, files: session }, session, { ports: [busy, 0] });

            try {
                expect(next?.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
                expect(next?.url).not.toBe(`http://127.0.0.1:${busy}`);
            } finally {
                await next?.close();
                taken.close();
            }
        }

        const status = await runCommandLine(["status"], { ...context, dashboard: "http://localhost:4747" });
        expect(status.output).toContain("Dashboard: http://localhost:4747, the player's sheet, live: give the player the link when the session starts.");
    });
});

describe("the session's notices (D-193, D-272)", () => {
    it("calls who listens when a watcher names a change or loses track, until told to stop", () => {
        const watched: { changed: (name: string | undefined) => void; failed: () => void; }[] = [];
        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: (_folder, changed, failed) => (watched.push({ changed, failed }), { close: () => undefined }) });
        let changes = 0;
        const stop = session.onChange(() => changes++);
        session.track(folder);
        watched[0].changed("log.jsonl");
        watched[0].failed();
        expect(changes).toBe(2);
        stop();
        watched[1].changed("Ettore.md");
        expect(changes).toBe(2);
        session.close();
    });

    it("opens the dashboard before the first call that finds a campaign, as after init, never in a folder without one (D-277)", async () => {
        const empty = makeTempFolder();
        const session = new SessionStore({ systemFolders: context.systemFolders });
        const served: Context = { ...testContext(empty), files: session };
        const opener = dashboardOpener(served, session, [0]);

        try {
            await opener.open();
            expect(served.dashboard).toBeUndefined();
            await runCommandLine(["init", "--name", "Nuova", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], served);
            await opener.open();
            expect(served.dashboard).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
            expect((await runCommandLine(["status"], served)).output).toContain(`Dashboard: ${served.dashboard}`);
        } finally {
            await opener.close();
            session.close();
            removeFolder(empty);
        }
    });
});

describe("the page's reading of a sheet (D-273)", () => {
    // The types are checked by npm run lint, which compiles the tests: what runs here only uses them.
    it("reads what view gives with types of its own, which view's result fits", () => {
        const fits = (result: ViewResult): View => result;
        expect(fits({ kind: "none" })).toEqual({ kind: "none" });
    });

    it("labels a field by its words, in capitals the short ones that name a field, and leaves out a last word a group shares", () => {
        const fields = new Set(["str", "dex", "hp", "max-prepared"]);
        expect(fieldLabel("hit-dice-d8", fields)).toBe("hit dice d8");
        expect(fieldLabel("str-save", fields)).toBe("STR save");
        expect(fieldLabel("spell-save-dc", fields)).toBe("spell save DC");
        expect(fieldLabel("max-prepared", fields)).toBe("max prepared");
        expect(fieldLabel("momentum", fields)).toBe("momentum");
        expect(fieldLabel("sleight-of-hand", fields)).toBe("sleight of hand");
        expect(groupLabels(["str-save", "dex-save"], fields)).toEqual(new Map([["str-save", "STR"], ["dex-save", "DEX"]]));
        expect(groupLabels(["slots-1", "slots-2"], fields)).toEqual(new Map([["slots-1", "slots 1"], ["slots-2", "slots 2"]]));
        expect(shownText("-1 (+2) · hit-dice 3")).toBe("−1 (+2) · hit-dice 3");
        expect(initials("Ettore di Valle")).toBe("ED");
    });

    it("draws a value by its kind, never by its name: pips, bars, a track below zero, chips, text", () => {
        const value = (counter: { value: number; max?: number; min?: number; } | undefined, text = "1"): SheetValue => ({ field: "any", text, marks: 0, ...(counter === undefined ? {} : { counter }) });
        expect(widgetOf(value({ value: 3, max: 3 }))).toBe("pips");
        expect(widgetOf(value({ value: 20, max: 24 }))).toBe("bar");
        expect(widgetOf(value({ value: 2, max: 9, min: -6 }))).toBe("track");
        expect(widgetOf(value({ value: 900 }))).toBe("number");
        expect(widgetOf({ ...value(undefined), items: ["Common"] })).toBe("list");
        expect(widgetOf(value(undefined, "Cito le scritture, sempre, e a ogni pasto ne trovo una nuova."))).toBe("text");
        expect(trackPlaces({ value: 2, min: -6, max: 10 })).toEqual({ zero: 0.375, value: 0.5 });
        expect(groupLayout({ name: "Stats", values: [value(undefined), value(undefined)] })).toBe("tiles");
        expect(groupLayout({ name: "Combat", values: [value(undefined), value({ value: 20, max: 24 })] })).toBe("rows");
        expect(orderedValues([{ ...value(undefined), items: [] }, value({ value: 1, max: 2 }), value(undefined)]).map(widgetOf)).toEqual(["number", "pips", "list"]);
    });

    it("reads how each number of a group is made from what view gives for Page#Group (FOR-8)", () => {
        expect(explanations(["insight +5: wis-mod +3, proficiency +2, Insight in skill-proficiencies", "speed 25 ft."])).toEqual(
            new Map([["insight", ["wis-mod +3", "proficiency +2", "Insight in skill-proficiencies"]]]),
        );
    });
});

describe("what the master asks, on the page (D-279; ASK-1, ASK-3, ASK-8, ASK-9)", () => {
    let session: SessionStore;
    let dashboard: Dashboard;
    let served: Context;
    let port: number;

    const wall = { question: "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options: ["Atletica 1d20+5", "Acrobazia 1d20-1"], who: "Ettore" };

    beforeEach(async () => {
        session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        served = { ...context, files: session };
        const started = await startDashboard(served, session, { ports: [0], page: folder });

        if (started === undefined) {
            throw new Error("The dashboard did not start.");
        }

        dashboard = started;
        port = Number(new URL(dashboard.url).port);
        served.page = dashboard.player;
    });

    afterEach(async () => {
        await dashboard.close();
        session.close();
    });

    function send(method: string, path: string, body?: unknown): Promise<{ status: number; body: string; }>
    {
        const headers = body === undefined ? {} : { "origin": `http://127.0.0.1:${port}`, "content-type": "application/json" };
        return new Promise((done, fail) => {
            const sent = request({ host: "127.0.0.1", port, path, method, headers }, (response) => {
                let text = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (text += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, body: text }));
            });
            sent.on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
        });
    }

    /** A page open on the dashboard, waiting for notices. */
    function openPage(): Promise<{ close(): void; }>
    {
        return new Promise((done) => {
            const events = request({ host: "127.0.0.1", port, path: "/events" }, (response) => {
                response.once("data", () => done({ close: () => events.destroy() }));
            });
            events.end();
        });
    }

    async function askedNow(): Promise<{ id: string; question: string; title: string; labels: string[]; } | null>
    {
        return (JSON.parse((await send("GET", "/api/asked")).body) as { asked: { id: string; question: string; title: string; labels: string[]; } | null; }).asked;
    }

    async function waitAsked(): Promise<{ id: string; question: string; title: string; labels: string[]; }>
    {
        for (let tries = 0; tries < 100; tries++) {
            const asked = await askedNow();

            if (asked !== null) {
                return asked;
            }

            await new Promise((done) => setTimeout(done, 10));
        }

        throw new Error("Nothing was asked on the page.");
    }

    it("asks on the page while one is open: a click rolls with the engine, logs the player's roll with its dice, and answers the master", async () => {
        const page = await openPage();
        const asking = ask.run(ask.input.parse(wall), served);
        const asked = await waitAsked();
        expect(asked).toMatchObject({ question: wall.question, title: "Tiro", labels: ["Tiro: Atletica (1d20+5)", "Tiro: Acrobazia (1d20-1)", "Cambio idea"] });
        expect((await send("POST", "/api/answer", { asked: asked.id, choice: 9 })).status).toBe(409);
        expect((await send("POST", "/api/answer", { asked: asked.id, choice: 0 })).status).toBe(202);
        expect(await asking).toMatchObject({ kind: "roll", who: "Ettore", check: "Atletica", total: 9 });
        expect(await askedNow()).toBeNull();
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "roll", by: "player", data: { check: "Atletica", who: "Ettore", dice: [{ sides: 20, value: 4 }] } });
        // A click on a question no longer asked counts for nothing.
        expect((await send("POST", "/api/answer", { asked: asked.id, choice: 0 })).status).toBe(409);
        page.close();
    });

    it("turns to the form, or to words this time, when no page is open, and keeps the buttons for later", async () => {
        expect(ask.format(await ask.run(ask.input.parse(wall), served))).toBe("The player has no buttons open now: ask them in words this time, without a word about buttons, and stop.");
        const form = { choose: async () => 1 };
        expect(await ask.run(ask.input.parse(wall), { ...served, player: form })).toMatchObject({ kind: "roll", check: "Acrobazia" });
    });

    it("takes the question away when the call is stopped, and logs nothing", async () => {
        const page = await openPage();
        const stop = new AbortController();
        const lines = readLogFile(folder).length;
        const asking = ask.run(ask.input.parse(wall), { ...served, signal: stop.signal });
        const asked = await waitAsked();
        stop.abort();
        expect(await asking).toEqual({ kind: "unanswered" });
        expect(await askedNow()).toBeNull();
        expect(readLogFile(folder)).toHaveLength(lines);
        expect((await send("POST", "/api/answer", { asked: asked.id, choice: 0 })).status).toBe(409);
        page.close();
    });

    it("asks a roll in words when the player rolls their own dice (ASK-8)", async () => {
        const settings = join(folder, "campaign.yaml");
        writeFileSync(settings, readFileSync(settings, "utf8").replace(/^dice: .*$/m, "dice: physical"));
        const page = await openPage();
        expect(ask.format(await ask.run(ask.input.parse(wall), served))).toBe("The player rolls their own dice: ask the roll in words, with what is at stake, and stop; they will tell the values.");
        expect(await askedNow()).toBeNull();
        page.close();
    });

    it("gives in view the rolls the player may see: theirs and those the master showed, never a hidden one", async () => {
        const page = await openPage();
        const asking = ask.run(ask.input.parse(wall), served);
        const asked = await waitAsked();
        await send("POST", "/api/answer", { asked: asked.id, choice: 1 });
        await asking;
        page.close();
        await ok("roll", "1d20+4", "--who", "Varro", "--why", "il mugnaio mente");
        await ok("roll", "1d20", "--hidden", "--why", "la ronda sente");
        const rolls = JSON.parse(await ok("view", "--json")).rolls;
        expect(rolls).toEqual([
            expect.objectContaining({ by: "player", who: "Ettore", check: "Acrobazia", notation: "1d20-1", total: 3, dice: [{ sides: 20, value: 4 }] }),
            expect.objectContaining({ by: "master", who: "Varro", notation: "1d20+4", total: 8, dice: [{ sides: 20, value: 4 }] }),
        ]);
        expect(JSON.stringify(rolls)).not.toContain("mugnaio");
    });
});
