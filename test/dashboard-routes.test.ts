// The dashboard's gate on every route of its API: another site, another host's name, a write without the page's origin and any other method are refused before
// the route runs, and the campaign stays as it was.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type MasterChat, masterDriver, type MasterEvent, openMaster } from "../src/master/index.ts";
import { type Dashboard, pageRoutes, startDashboard } from "../src/server/dashboard/index.ts";
import { launcherRoutes, openLauncher } from "../src/server/launcher/index.ts";
import { tableChat } from "../src/server/table/chat.ts";
import { pageFolder } from "./i18n/phrases.ts";
import { type FakeHost, fakeHost, type FakeOptions, type FlowEntry, loadFlow, manualClock, playerWords, ticksUntil, wholeTexts } from "./master/fake-host.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
let session: SessionStore;
let dashboard: Dashboard;
let port: number;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    const made = await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    expect(made.exitCode, made.output).toBe(0);
    inPlay(folder);
    session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
    const started = await startDashboard({ ...context, files: session }, session, { ports: [0] });

    if (started === undefined) {
        throw new Error("The dashboard did not start.");
    }

    dashboard = started;
    port = Number(new URL(dashboard.url).port);
});

afterEach(async () => {
    await dashboard.close();
    session.close();
    removeFolder(folder);
});

describe("the dashboard's routes", () => {
    it("has the routes of the page's API, with what each takes", () => {
        expect(pageRoutes.map((route) => route.path)).toEqual(expect.arrayContaining(["/api/run", "/api/asked", "/api/bell", "/api/words"]));
        expect(pageRoutes.find((route) => route.path === "/api/notes")).toEqual({ path: "/api/notes", get: true, post: true });
        expect(pageRoutes.find((route) => route.path === "/api/run")).toEqual({ path: "/api/run", get: false, post: true });
        expect(pageRoutes.find((route) => route.path === "/api/master")).toEqual({ path: "/api/master", get: true, post: true });
    });

    it("refuses a write without the page's origin, or from another site, on every route that takes one", async () => {
        const before = campaignFiles();

        for (const route of pageRoutes.filter((one) => one.post)) {
            expect((await status("POST", route.path)).status, `${route.path} without origin`).toBe(405);
            expect((await status("POST", route.path, { origin: "http://evil.example" })).status, `${route.path} from another site`).toBe(403);
        }

        expect(campaignFiles()).toEqual(before);
    }, 30_000);

    it("refuses another host's name, and any other method, on every route", async () => {
        const before = campaignFiles();

        for (const route of pageRoutes) {
            expect((await status("GET", route.path, { host: "evil.example" })).status, `${route.path} at another host`).toBe(403);
            expect((await status("PUT", route.path, { origin: `http://127.0.0.1:${port}` })).status, `${route.path} put`).toBe(405);
        }

        expect(campaignFiles()).toEqual(before);
    }, 30_000);

    it("refuses the same on every route of the launcher's page", async () => {
        const home = makeTempFolder();
        // No table starts and no window opens, whatever a route is asked.
        const tables = { start: () => expect.fail("no table starts in this test"), probe: () => Promise.resolve("nobody" as const) };
        const launcher = await openLauncher({
            home,
            userHome: makeTempFolder(),
            platform: "linux",
            version: "1.0.0",
            context,
            ports: [0],
            lookAgainFor: 0,
            page: pageFolder,
            tables,
            pick: () => Promise.reject(new Error("no window in a test")),
            hosts: () => [],
        });
        expect(launcherRoutes.map((route) => route.path)).toEqual(["/api/launcher", "/api/ping"]);

        if (!("url" in launcher)) {
            throw new Error("The launcher did not start.");
        }

        const at = Number(new URL(launcher.url).port);

        try {
            for (const route of launcherRoutes) {
                expect((await status("POST", route.path, {}, at)).status, `${route.path} without origin`).toBe(405);
                expect((await status("POST", route.path, { origin: "http://evil.example" }, at)).status, `${route.path} from another site`).toBe(403);
                expect((await status("GET", route.path, { host: "evil.example" }, at)).status, `${route.path} at another host`).toBe(403);
                expect((await status("PUT", route.path, { origin: launcher.url }, at)).status, `${route.path} put`).toBe(405);
            }
        } finally {
            await launcher.end("the test is over");
            removeFolder(home);
        }
    });
});

describe("the chat with the master in the page", () => {
    /** A host the test drives: what it was sent and how often interrupted, and the events it tells. */
    interface FakeMaster extends MasterChat
    {
        sent: string[];
        interrupted: number;
        emit(event: MasterEvent): void;
    }

    let masters: FakeMaster[];
    let withMaster: Dashboard;
    let masterPort: number;

    beforeEach(async () => {
        masters = [];
        const master = tableChat({
            root: folder,
            home: makeTempFolder(),
            environment: {},
            platform: process.platform,
            userHome: makeTempFolder(),
            open: () => {
                const fake = fakeMaster();
                masters.push(fake);
                return fake;
            },
            driver: (host) =>
                host === "claudeCode"
                    ? {
                        open: () => masters[0],
                        missing: () => undefined,
                        program: () => ({ command: "claude-program", args: [] }),
                        environment: (given) => given,
                        models: () => Promise.resolve(hostModels),
                        model: "sonnet",
                        efforts: ["low", "high"],
                    }
                    : undefined,
            elsewhere: () => false,
            changed: () => withMaster.chatChanged(),
            idle: () => withMaster.deliver(),
            newToken: () => "token",
        });
        const started = await startDashboard({ ...context, files: session }, session, { ports: [0], master });

        if (started === undefined) {
            throw new Error("The dashboard with a master did not start.");
        }

        withMaster = started;
        masterPort = Number(new URL(started.url).port);
        // The host's models asked once and known, as after the page's first read.
        master.shown();
        await new Promise((resolve) => setImmediate(resolve));
    });

    afterEach(async () => {
        await withMaster.close();
    });

    /** A host that refuses words while its turn runs, as Claude Code's driver does. */
    function fakeMaster(): FakeMaster
    {
        let listener: ((event: MasterEvent) => void) | undefined;
        let turn = false;
        const fake: FakeMaster = {
            sent: [],
            interrupted: 0,
            send: (text) => {
                if (turn) {
                    return false;
                }

                turn = true;
                fake.sent.push(text);
                return true;
            },
            onEvent: (given) => (listener = given),
            interrupt: () => fake.interrupted++,
            close: () => undefined,
            emit: (event) => {
                turn = turn && event.type !== "turnEnd";
                listener?.(event);
            },
        };
        return fake;
    }

    const hostModels = [
        { id: "opus", name: "Opus 5.5", about: "For complex work and everyday tasks", efforts: ["low", "medium", "high", "xhigh", "max"] },
        { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5", about: "Fastest for quick answers", efforts: [] },
    ];
    const notReady = (id: string, name: string): object => ({ id, name, ready: false, found: false, model: "", efforts: [], models: [] });
    const hostsShown = [
        { id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: ["low", "high"], models: hostModels },
        notReady("codex", "Codex"),
        notReady("antigravity", "Antigravity"),
        notReady("openCode", "OpenCode"),
    ];

    it("says there is no table where none keeps a chat, and refuses every write saying how to start one", async () => {
        expect(await json("GET", port)).toEqual({ status: 200, body: { table: false } });
        const refused = { error: "The chat with the master in the page needs the campaign's table: start it with rpg table in the campaign's folder." };
        expect(await json("POST", port, { say: "Hello" })).toEqual({ status: 409, body: refused });
        expect(await json("POST", port, { close: true })).toEqual({ status: 409, body: refused });
    });

    it("shows the chat with no chat open, in a turn with its text and tool, and ended", async () => {
        expect(await json("GET", masterPort)).toEqual({ status: 200, body: { table: true, hosts: hostsShown, messages: [], elsewhere: false } });

        expect((await json("POST", masterPort, { open: { host: "claudeCode", model: "sonnet", effort: "high" } })).status).toBe(200);
        expect((await json("POST", masterPort, { say: "I open the door." })).status).toBe(202);
        masters[0].emit({ type: "session", session: "session-1", model: "claude-sonnet-5" });
        masters[0].emit({ type: "text", block: 0, text: "The door creaks open." });
        masters[0].emit({ type: "tool", id: "t1", name: "roll", kind: "rpg", state: "started" });
        expect(await json("GET", masterPort)).toEqual({
            status: 200,
            body: {
                table: true,
                hosts: hostsShown,
                last: { host: "claudeCode", model: "claude-sonnet-5", effort: "high", resumable: true },
                chat: { host: "claudeCode", model: "claude-sonnet-5", effort: "high", state: "turn", tool: "roll" },
                messages: [{ id: 1, from: "player", text: "I open the door." }, { id: 2, from: "master", text: "The door creaks open." }],
                elsewhere: false,
            },
        });

        masters[0].emit({ type: "turnEnd", reason: "failed", why: "Claude Code ended before the turn did." });
        masters[0].emit({ type: "ended", why: "Claude Code ended (code 1)." });
        expect(await json("GET", masterPort)).toEqual({
            status: 200,
            body: {
                table: true,
                hosts: hostsShown,
                last: { host: "claudeCode", model: "claude-sonnet-5", effort: "high", resumable: true },
                chat: { host: "claudeCode", model: "claude-sonnet-5", effort: "high", state: "ended", why: "Claude Code ended (code 1)." },
                messages: [
                    { id: 1, from: "player", text: "I open the door." },
                    { id: 2, from: "master", text: "The door creaks open." },
                    { id: 3, from: "table", text: "Claude Code ended before the turn did." },
                ],
                elsewhere: false,
            },
        });
    });

    it("opens, says, stops and closes, each answered with the chat after it; refuses a second chat, words while busy or with no chat", async () => {
        const opened = await json("POST", masterPort, { open: { host: "claudeCode", model: "sonnet" } });
        expect(opened).toMatchObject({ status: 200, body: { table: true, chat: { host: "claudeCode", model: "sonnet", state: "idle" } } });
        const again = await json("POST", masterPort, { open: { host: "claudeCode", model: "sonnet", fresh: true } });
        expect(again).toMatchObject({ status: 409, body: { error: "A chat with the master is open already: close it first.", table: true } });

        expect(await json("POST", masterPort, { say: "  Hello  " })).toMatchObject({ status: 202, body: { chat: { state: "turn" }, messages: [{ id: 1, from: "player", text: "Hello" }] } });
        expect(masters[0].sent).toEqual(["Hello"]);
        expect(await json("POST", masterPort, { say: "Again" })).toMatchObject({ status: 409, body: { error: "The master is still answering: wait, or stop the turn." } });
        expect(await json("POST", masterPort, { stop: true })).toMatchObject({ status: 200, body: { chat: { state: "turn" } } });
        expect(masters[0].interrupted).toBe(1);
        masters[0].emit({ type: "turnEnd", reason: "interrupted" });

        const closed = await json("POST", masterPort, { close: true });
        expect(closed.status).toBe(200);
        expect(closed.body).not.toHaveProperty("chat");
        expect(await json("POST", masterPort, { say: "Hello" })).toMatchObject({ status: 409, body: { error: "No chat with the master is open." } });
    });

    it("refuses a body of no shape it takes, saying the four", async () => {
        const bodies = [
            {},
            { say: "   " },
            { say: "x".repeat(20_001) },
            { stop: false },
            { close: true, stop: true },
            { open: { host: "elsewhere", model: "m" } },
            { open: { host: "claudeCode", model: "" } },
            { open: { host: "claudeCode", model: "m", extra: 1 } },
        ];

        for (const body of bodies) {
            const answer = await json("POST", masterPort, body);
            expect(answer.status, JSON.stringify(body).slice(0, 80)).toBe(400);
            expect((answer.body as { error: string; }).error).toBe(
                "Send { say } with the player's words, up to 20000 characters, { stop: true }, { open: { host, model, effort?, fresh? } } or { close: true }.",
            );
        }

        expect((await json("POST", masterPort, { say: "x".repeat(20_000) })).status).toBe(409);
    });

    it("says a sentence of the page to the open chat, heard at once; while the master answers, it waits for the turn's end, one a turn", async () => {
        await json("POST", masterPort, { open: { host: "claudeCode", model: "sonnet" } });
        const first = await json("POST", masterPort, { text: "I draw my sword." }, "/api/act");
        expect(first.status).toBe(202);
        const id = (first.body as { id: string; }).id;
        expect(masters[0].sent).toEqual(["I draw my sword."]);
        expect(await json("GET", masterPort, undefined, "/api/act")).toMatchObject({ status: 200, body: { pending: [], heard: [id], bell: true } });

        await json("POST", masterPort, { text: "I step back." }, "/api/act");
        await json("POST", masterPort, { text: "I shout." }, "/api/act");
        expect(masters[0].sent).toEqual(["I draw my sword."]);
        expect((await json("GET", masterPort, undefined, "/api/act")).body).toMatchObject({ pending: [{ text: "I step back." }, { text: "I shout." }], bell: true });

        masters[0].emit({ type: "turnEnd", reason: "done" });
        expect(masters[0].sent).toEqual(["I draw my sword.", "I step back."]);
        masters[0].emit({ type: "turnEnd", reason: "done" });
        expect(masters[0].sent).toEqual(["I draw my sword.", "I step back.", "I shout."]);
        expect((await json("GET", masterPort, undefined, "/api/act")).body).toMatchObject({ pending: [] });

        await json("POST", masterPort, { close: true });
        expect((await json("GET", masterPort, undefined, "/api/act")).body).toMatchObject({ bell: false });
    });

    it("tells the pages of the chat alone as the master's prose comes, once for pieces that come together", async () => {
        const page = await listenTo(masterPort);

        try {
            await json("POST", masterPort, { open: { host: "claudeCode", model: "sonnet" } });
            await json("POST", masterPort, { say: "Hello" });
            await page.until((said) => said.includes("event: chat"));
            const before = page.said().length;

            for (const text of ["The hall ", "is ", "dark."]) {
                masters[0].emit({ type: "text", block: 0, text });
            }

            await page.until((said) => said.length > before);
            await new Promise((done) => setTimeout(done, 300));
            expect(page.said().slice(before)).toEqual(["event: chat"]);
        } finally {
            page.close();
        }
    });
});

describe("the table's chat over the real driver of Claude Code, its host a fake that plays recorded flows", () => {
    let hosts: FakeHost[];
    let clock: ReturnType<typeof manualClock>;
    let flow: FlowEntry[];
    let fake: FakeOptions;
    let withMaster: Dashboard;
    let masterPort: number;

    beforeEach(async () => {
        hosts = [];
        clock = manualClock();
        flow = loadFlow("claude-code/three-turns");
        fake = {};
        const claudeCode = masterDriver("claudeCode");
        const master = tableChat({
            root: folder,
            home: makeTempFolder(),
            environment: {},
            platform: process.platform,
            userHome: makeTempFolder(),
            open: (host, options) => {
                const played = fakeHost(flow, fake);
                hosts.push(played);
                return openMaster(host, { ...options, start: played.start, later: clock.later });
            },
            driver: (host) =>
                host === "claudeCode" && claudeCode !== undefined
                    ? { ...claudeCode, program: () => ({ command: "claude-program", args: [] }), missing: () => undefined, models: () => Promise.resolve([]) }
                    : undefined,
            elsewhere: () => false,
            changed: () => withMaster.chatChanged(),
            idle: () => withMaster.deliver(),
        });
        const started = await startDashboard({ ...context, files: session }, session, { ports: [0], master });

        if (started === undefined) {
            throw new Error("The dashboard with a master did not start.");
        }

        withMaster = started;
        masterPort = Number(new URL(started.url).port);
    });

    afterEach(async () => {
        await withMaster.close();
    });

    type Shown = { chat?: { state: string; why?: string; }; messages: { from: string; text: string; }[]; };

    it("plays a turn end to end: the player's words written to the host, the master's prose joined in one message", async () => {
        expect((await json("POST", masterPort, { open: { host: "claudeCode", model: "haiku" } })).status).toBe(200);
        const words = playerWords(flow)[0];
        expect((await json("POST", masterPort, { say: words })).status).toBe(202);
        let shown: Shown | undefined;
        await until(async () => {
            shown = (await json("GET", masterPort)).body as Shown;
            return shown.chat?.state === "idle" && shown.messages.length === 2;
        });
        expect(shown?.messages).toEqual([{ id: 1, from: "player", text: words }, { id: 2, from: "master", text: wholeTexts(flow)[0].join("\n\n") }]);
        expect(hosts[0].problems).toEqual([]);
    });

    const refusals: [string, FakeOptions, number][] = [["refuses the model", { models: { haiku: "claude-other-9" } }, 0], ["does not confirm it within 30 seconds", { ignore: ["set_model"] }, 30_000]];

    for (const [refusal, options, advance] of refusals) {
        it(`ends the chat when the host ${refusal}: the sentences said on the page stay waiting, none heard, none shown`, async () => {
            fake = options;
            expect((await json("POST", masterPort, { open: { host: "claudeCode", model: "haiku" } })).status).toBe(200);
            await ticksUntil(() => hosts[0].written.length > 0);
            clock.advance(advance);
            await until(async () => ((await json("GET", masterPort)).body as Shown).chat?.state === "ended");

            for (const text of ["I draw my sword.", "I step back.", "I shout."]) {
                expect((await json("POST", masterPort, { text }, "/api/act")).status).toBe(202);
            }

            const acts = (await json("GET", masterPort, undefined, "/api/act")).body as { pending: { text: string; }[]; heard: string[]; };
            expect(acts.pending.map((one) => one.text)).toEqual(["I draw my sword.", "I step back.", "I shout."]);
            expect(acts.heard).toEqual([]);
            expect(((await json("GET", masterPort)).body as Shown).messages).toEqual([]);
            expect(hosts[0].written.filter((line) => line.type === "user")).toEqual([]);
            expect(hosts[0].stopped).toBe(true);
        });
    }
});

/** Waits until a condition read from the server holds, looking every 20 ms; fails after ten seconds. */
async function until(holds: () => Promise<boolean>): Promise<void>
{
    for (let waited = 0; waited < 10_000; waited += 20) {
        if (await holds()) {
            return;
        }

        await new Promise((done) => setTimeout(done, 20));
    }

    throw new Error("waited ten seconds in vain");
}

/** A page listening for the server's notices at a port: the event lines it heard, in order. */
async function listenTo(at: number): Promise<{ said(): string[]; until(holds: (said: string[]) => boolean): Promise<void>; close(): void; }>
{
    const lines: string[] = [];
    const sent = request({ host: "127.0.0.1", port: at, path: "/events?page=test-page", headers: { Accept: "text/event-stream" } });
    await new Promise<void>((done) => {
        sent.on("response", (response) => {
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => lines.push(...chunk.split("\n").filter((line) => line.startsWith("event:"))));
            response.on("error", () => undefined);
            done();
        });
        sent.on("error", () => undefined).end();
    });
    return {
        said: () => [...lines],
        until: (holds) => until(() => Promise.resolve(holds(lines))),
        close: () => sent.destroy(),
    };
}

/** A request to the page's API at a port, with the page's origin when it has a body: its status and its JSON. */
function json(method: string, at: number, body?: unknown, path = "/api/master"): Promise<{ status: number; body: unknown; }>
{
    const headers = body === undefined ? {} : { "origin": `http://127.0.0.1:${at}`, "content-type": "application/json" };
    return new Promise((done, fail) => {
        request({ host: "127.0.0.1", port: at, path, method, headers }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => done({ status: response.statusCode ?? 0, body: JSON.parse(text) as unknown }));
        }).on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
    });
}

/** The status of a request with an empty body. */
function status(method: string, path: string, headers: Record<string, string> = {}, at = port): Promise<{ status: number; }>
{
    return new Promise((done, fail) => {
        request({ host: "127.0.0.1", port: at, path, method, headers }, (response) => {
            response.resume();
            response.on("end", () => done({ status: response.statusCode ?? 0 }));
        }).on("error", fail).end();
    });
}

/** Every file of the campaign, with its text and when it last changed. */
function campaignFiles(): Record<string, string>
{
    const paths = (readdirSync(folder, { recursive: true }) as string[]).filter((path) => statSync(join(folder, path)).isFile());
    return Object.fromEntries(paths.map((path) => [path, `${statSync(join(folder, path)).mtimeMs} ${readFileSync(join(folder, path), "utf8")}`]));
}
