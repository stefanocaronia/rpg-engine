import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { connect, createServer, type Server, type Socket } from "node:net";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { type Context, userDataFolder } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { getVersion } from "../src/core/version.ts";
import type { MasterChat, MasterDriver, MasterEvent } from "../src/master/index.ts";
import { type ChatSide, importEnvironment } from "../src/server/context.ts";
import type { Served } from "../src/server/dashboard/index.ts";
import { chatEnvironmentNames } from "../src/server/table/hello.ts";
import { openTable, pipeHere, pipeToTable, readPlace, runTable, type Table, tableEnded, type TableOptions, type TablePlace } from "../src/server/table/index.ts";
import { tableSocket, writePlace } from "../src/server/table/place.ts";
import { pageFolder } from "./i18n/phrases.ts";
import { inPlay, makeTempFolder, testContext, testSystemCode, testSystemFolders } from "./support.ts";

// The table of a campaign (D-582): `rpg table` serves its page with no chat open, and the chats of the campaign run their commands in it, one at a time.

const version = "1.2.3";

let folder: string;
let home: string;
let tables: Table[];
let chats: ChatSide[];
let contexts: Context[];
let sessions: SessionStore[];
let listeners: Server[];

beforeEach(async () => {
    folder = makeTempFolder();
    home = makeTempFolder();
    tables = [];
    chats = [];
    contexts = [];
    sessions = [];
    listeners = [];
    await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
});

afterEach(async () => {
    for (const table of tables) {
        await table.end("the test is over");
    }

    for (const listener of listeners) {
        await new Promise((done) => listener.close(done));
    }
});

/** The options of a table of the test's campaign, in the test's data folder, with the test systems and the page's sources; its context kept in `contexts`. */
function tableOptions(options: Partial<TableOptions> = {}, own: Partial<Context> = {}): TableOptions
{
    return {
        folder,
        home,
        platform: process.platform,
        version,
        served: (chat) => {
            chats.push(chat);
            const session = new SessionStore({ systemFolders: testSystemFolders });
            const context: Context = { ...testContext(folder), files: session, host: chat.host, chat: { calls: 0 }, ...own };
            contexts.push(context);
            sessions.push(session);
            return Promise.resolve({ context, session });
        },
        dashboard: { ports: [0], page: pageFolder },
        chatFolders: () => undefined,
        ...options,
    };
}

async function open(options: Partial<TableOptions> = {}, own: Partial<Context> = {}): Promise<Table>
{
    const opened = await openTable(tableOptions(options, own));

    if (!("place" in opened)) {
        throw new Error(`The table did not open: ${JSON.stringify(opened)}`);
    }

    tables.push(opened);
    return opened;
}

/** A chat at the socket, as its `rpg mcp` would be: what it sends first, then the lines the table gives, and whether the socket closed. */
interface RawChat
{
    socket: Socket;
    lines: string[];
    closed(): boolean;
    send(message: object): void;
    /** The first line that holds `text`, waited for. */
    line(text: string): Promise<string>;
    /** The answer to the request with this id, waited for. */
    answer(id: number): Promise<string>;
    leave(): Promise<void>;
}

function knock(place: TablePlace, first: string): Promise<RawChat>
{
    return new Promise((done, fail) => {
        const socket = connect(place.socket);
        const lines: string[] = [];
        let buffer = "";
        let closed = false;
        socket.setEncoding("utf8");
        socket.on("data", (chunk: string) => {
            buffer += chunk;
            const parts = buffer.split("\n");
            buffer = parts.pop() ?? "";
            lines.push(...parts);
        });
        socket.on("close", () => (closed = true));
        socket.on("error", () => undefined);
        socket.once("connect", () => {
            socket.write(first);
            done({
                socket,
                lines,
                closed: () => closed,
                send: (message) => socket.write(`${JSON.stringify(message)}\n`),
                line: async (text) => {
                    await until(() => lines.some((one) => one.includes(text)), `a line with ${text}`);
                    return lines.find((one) => one.includes(text)) ?? "";
                },
                answer: async (id) => {
                    const answers = (one: string): boolean => (JSON.parse(one) as { id?: unknown; }).id === id;
                    await until(() => lines.some(answers), `the answer ${id}`);
                    return lines.find(answers) ?? "";
                },
                leave: async () => {
                    socket.end();
                    await until(() => closed, "the socket closed");
                },
            });
        });
        socket.once("error", fail);
    });
}

function hello(place: TablePlace, environment: Record<string, string> = {}, given: { token?: string; version?: string; } = {}): string
{
    return `${JSON.stringify({ token: given.token ?? place.token, version: given.version ?? version, environment })}\n`;
}

function probe(place: TablePlace): string
{
    return `${JSON.stringify({ token: place.token, version: "9.9.9", probe: true })}\n`;
}

const initialize = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "test-host", version: "1" } } };

/** A chat that sat and said initialize as a host does: its answer to the hello and to initialize read. */
async function sit(place: TablePlace, environment: Record<string, string> = {}): Promise<RawChat>
{
    const chat = await knock(place, hello(place, environment));
    expect(JSON.parse(await chat.line("{"))).toEqual({ ok: true });
    chat.send(initialize);
    await chat.answer(1);
    chat.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    return chat;
}

/** The text of a tool's answer in the chat, by the id of the call. */
async function call(chat: RawChat, id: number, name: string, args: object = {}): Promise<string>
{
    chat.send({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
    const answer = JSON.parse(await chat.answer(id)) as { result: { content: { text: string; }[]; }; };
    return answer.result.content.map((block) => block.text).join("\n");
}

function get(url: string, path: string, method = "GET", body?: object): Promise<{ status: number; body: string; }>
{
    const port = Number(new URL(url).port);
    const headers = body === undefined ? {} : { "Content-Type": "application/json", Origin: `http://127.0.0.1:${port}` };
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

/** A page open on the table's link, listening for notices and seen, as the player's browser keeps it. */
async function openPage(url: string): Promise<{ close(): void; }>
{
    const port = Number(new URL(url).port);
    const page = await new Promise<{ close(): void; }>((done) => {
        const sent = request({ host: "127.0.0.1", port, path: "/events?page=p1", headers: { Accept: "text/event-stream" } }, (response) => {
            response.on("data", () => undefined);
            response.on("error", () => undefined);
            done({ close: () => sent.destroy() });
        });
        sent.on("error", () => undefined).end();
    });
    await get(url, "/api/seen", "POST", { page: "p1", seen: true });
    return page;
}

async function until(holds: () => boolean, what: string, most = 10_000): Promise<void>
{
    const started = Date.now();

    while (!holds()) {
        if (Date.now() - started > most) {
            throw new Error(`Waited ${most} ms for ${what}.`);
        }

        await new Promise((done) => setTimeout(done, 20));
    }
}

/** Some ticks of the table's watch, which looks every `every` ms: time for it to end, were it to. */
async function ticks(every: number, count = 10): Promise<void>
{
    await new Promise((done) => setTimeout(done, every * count));
}

function settled(promise: Promise<unknown>): () => boolean
{
    let done = false;
    void promise.then(() => (done = true));
    return () => done;
}

/** A clock the test moves. */
function clock(): { now: () => number; pass(ms: number): void; }
{
    let time = 1_000_000;
    return { now: () => time, pass: (ms) => (time += ms) };
}

/** Something that listens at a place of the test's, as a table would: what it heard, a line at a time; `answer` gives what it does with each. */
async function listenerAt(place: TablePlace, answer: (socket: Socket, line: string, index: number) => void): Promise<string[]>
{
    const heard: string[] = [];
    const listener = createServer((socket) => {
        let buffer = "";
        socket.on("error", () => undefined);
        socket.setEncoding("utf8").on("data", (chunk: string) => {
            buffer += chunk;
            const parts = buffer.split("\n");
            buffer = parts.pop() ?? "";

            for (const line of parts) {
                heard.push(line);
                answer(socket, line, heard.length - 1);
            }
        });
    });
    listeners.push(listener);
    await new Promise<void>((done) => listener.listen(place.socket, done));
    return heard;
}

/** A place of the test's campaign, written as a table writes it, at the socket a table of it would have. */
function placeOf(root = folder): TablePlace
{
    const place = { root, pid: 4242, version, socket: tableSocket(home, root, process.platform), token: "a".repeat(32), url: "http://127.0.0.1:1" };
    writePlace(home, place);
    return place;
}

/** As if the campaign's files and log were written an hour ago: what changes now, by hand, is newer than the log's last line. */
function anHourAgo(): void
{
    const then = new Date(Date.now() - 2 * 3_600_000);

    for (const entry of readdirSync(folder, { recursive: true, withFileTypes: true })) {
        if (entry.isFile()) {
            utimesSync(join(entry.parentPath, entry.name), then, then);
        }
    }

    const log = join(folder, "log.jsonl");
    const at = new Date(Date.now() - 3_600_000).toISOString();
    const lines = readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.stringify({ ...(JSON.parse(line) as object), at }));
    writeFileSync(log, `${lines.join("\n")}\n`);
}

/** Bruna's hit points changed by hand, as in Obsidian, a moment before the next chat begins. */
function byHand(): void
{
    const bruna = join(folder, "world", "characters", "Bruna.md");
    writeFileSync(bruna, readFileSync(bruna, "utf8").replace("hp: 12/12", "hp: 7/12"));
    const then = new Date(Date.now() - 1000);
    utimesSync(bruna, then, then);
}

/** The environment that moves the engine's data folder under `base`, on any system: the place a process started with it reads. */
function dataFolderEnvironment(base: string): Record<string, string>
{
    return { APPDATA: base, XDG_DATA_HOME: base, HOME: base };
}

/** Runs `work` with these variables in the process's environment, given back as they were once it returned. */
function withEnvironment<T>(environment: Record<string, string>, work: () => T): T
{
    const before = Object.fromEntries(Object.keys(environment).map((name) => [name, process.env[name]]));
    Object.assign(process.env, environment);

    try {
        return work();
    } finally {
        for (const [name, value] of Object.entries(before)) {
            if (value === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = value;
            }
        }
    }
}

/** What of an object a chat could leave behind, as a picture: its fields set, with their values, functions as such, collections by size. */
function picture(value: unknown, depth = 2): unknown
{
    if (typeof value === "function") {
        return "function";
    }

    if (value instanceof Set || value instanceof Map) {
        return `${value.constructor.name}(${value.size})`;
    }

    if (Array.isArray(value)) {
        return `[${value.length}]`;
    }

    if (value === null || typeof value !== "object") {
        return value;
    }

    return depth === 0 ? "object" : Object.fromEntries(Object.entries(value).filter(([, one]) => one !== undefined).map(([key, one]) => [key, picture(one, depth - 1)]));
}

describe("the table of a campaign", () => {
    it("serves the campaign's page with no chat open, and writes its place", async () => {
        const table = await open();
        expect((await get(table.url, "/api/view")).status).toBe(200);
        expect(readPlace(home, table.place.root)).toEqual(table.place);
        expect(table.place).toMatchObject({ pid: process.pid, version, url: table.url });
        expect(table.place.token).toMatch(/^[0-9a-f]{32}$/);
    });

    it("refuses outside a campaign, saying how to make one, and gives the link of a table already there", async () => {
        const outside = await openTable({ folder: makeTempFolder(), home, platform: process.platform, version });
        expect(outside).toEqual({ refused: expect.stringContaining("rpg init") });
        const table = await open();
        expect(await openTable({ folder, home, platform: process.platform, version })).toEqual({ running: table.url });
    });

    it("runs a chat's commands, its host the chat's and what it reads of its environment, with the page's link in its status and the asking tools there (D-279)", async () => {
        const table = await open();
        const chat = await sit(table.place, { CLAUDE_CODE_SESSION_ID: "chat-1", RPG_TEST: "yes" });
        chat.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
        expect(await chat.answer(2)).toContain('"name":"status"');

        expect(await call(chat, 3, "status")).toContain(`Offer the player their dashboard's link in your first answer: ${table.url}.`);
        chat.send({ jsonrpc: "2.0", id: 4, method: "tools/list" });
        expect(await chat.answer(4)).toContain('"name":"ask"');
        expect(chats[0].host()).toBe("test-host");
        // Only the names the table reads, whatever a hello carries.
        expect(chats[0].environment()).toEqual({ CLAUDE_CODE_SESSION_ID: "chat-1" });
        expect(JSON.parse((await get(table.url, "/api/bell?probe")).body)).toMatchObject({ session: "chat-1" });

        await chat.leave();
        await until(() => chats[0].host() === undefined, "the seat empty");
        expect(chats[0].environment()).toEqual({});
        expect(JSON.parse((await get(table.url, "/api/bell?probe")).body)).toMatchObject({ session: null });
    });

    it("seats one chat at a time: another is refused while it sits, and finds a new chat's server once it left", async () => {
        const table = await open();
        const first = await sit(table.place);
        const real = "Asked whether a roll was real";
        const offer = "Offer the player their dashboard's link";
        expect(await call(first, 2, "status")).toContain(offer);
        expect(await call(first, 3, "status")).not.toContain(offer);
        expect(await call(first, 4, "roll", { notation: "1d20", why: "prova", who: "Elia", hidden: false })).toContain(real);
        expect(await call(first, 5, "roll", { notation: "1d20", why: "prova", who: "Elia", hidden: false })).not.toContain(real);
        const instructions = await call(first, 6, "instructions");

        const second = await knock(table.place, hello(table.place));
        expect(JSON.parse(await second.line("{"))).toEqual({ refused: "busy" });
        await until(second.closed, "the busy chat sent away");

        await first.leave();
        await until(() => chats[0].host() === undefined, "the seat empty");
        const next = await sit(table.place);
        expect(await call(next, 2, "status")).toContain(offer);
        expect(await call(next, 3, "roll", { notation: "1d20", why: "prova", who: "Elia", hidden: false })).toContain(real);
        expect(await call(next, 4, "instructions")).toBe(instructions);
    });

    it("forgets all that was the chat's as it leaves: the context and the page's state as before the first chat sat", async () => {
        let served: Served | undefined;
        const table = await open({ dashboard: { ports: [0], page: pageFolder, served: (state) => (served = state) } });
        const context = contexts[0];
        // The table's own, which live on: its files' session, and the page's state of the campaign apart from the chat.
        const pictured = (): unknown => ({
            context: picture({ ...context, files: undefined }),
            served: picture({ ...served, context: undefined, session: undefined }),
        });
        const before = pictured();

        const chat = await sit(table.place, { CLAUDE_CODE_SESSION_ID: "chat-1", CODEX_HOME: makeTempFolder() });
        await call(chat, 2, "instructions");
        await call(chat, 3, "status");
        chat.send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "roll", arguments: { notation: "1d20", why: "prova", who: "Elia", hidden: false }, _meta: { threadId: "thread-1" } } });
        await chat.answer(4);
        expect(context.chat).toMatchObject({ thread: "thread-1", session: "chat-1", dashboardOffered: true });
        expect(pictured()).not.toEqual(before);

        await chat.leave();
        await until(() => chats[0].host() === undefined, "the seat empty");
        expect(pictured()).toEqual(before);
    });

    it("lets a chat that leaves at once, before its late start, give nothing to the next: half a second after, the context is as before it", async () => {
        let served: Served | undefined;
        const table = await open({ dashboard: { ports: [0], page: pageFolder, served: (state) => (served = state) } });
        const context = contexts[0];
        const pictured = (): unknown => ({
            context: picture({ ...context, files: undefined }),
            served: picture({ ...served, context: undefined, session: undefined }),
        });
        const before = pictured();

        const chat = await sit(table.place);
        await chat.leave();
        await until(() => chats[0].host() === undefined, "the seat empty");
        await new Promise((done) => setTimeout(done, 500));
        expect(pictured()).toEqual(before);
    });

    it("refuses a wrong token, and closes without a word on what is no hello, or on silence", async () => {
        const table = await open({ helloWait: 300 });
        const wrong = await knock(table.place, hello(table.place, {}, { token: "0".repeat(32) }));
        expect(JSON.parse(await wrong.line("{"))).toEqual({ refused: "token" });
        await until(wrong.closed, "the wrong token sent away");

        const browser = await knock(table.place, "GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n");
        await until(browser.closed, "the request closed");
        expect(browser.lines).toEqual([]);

        const silent = await knock(table.place, "");
        await until(silent.closed, "the silent knock closed", 3000);
        expect(silent.lines).toEqual([]);
    });

    it("answers a probe with its engine and whether a chat sits, and never seats it", async () => {
        const table = await open();
        const asked = await knock(table.place, probe(table.place));
        expect(JSON.parse(await asked.line("{"))).toEqual({ table: { version, seated: false } });
        await until(asked.closed, "the probe closed");

        const chat = await sit(table.place);
        const again = await knock(table.place, probe(table.place));
        expect(JSON.parse(await again.line("{"))).toEqual({ table: { version, seated: true } });
        expect(await call(chat, 2, "status")).toContain("Rocca");
    });

    it("ends by itself with no chat and no page for a while, by its clock, its place gone, never while a chat sits", async () => {
        const time = clock();
        const table = await open({ idle: 60_000, idleEvery: 10, now: time.now });
        const ended = settled(table.ended);
        const chat = await sit(table.place);
        time.pass(120_000);
        await ticks(10);
        expect(ended()).toBe(false);
        expect(readPlace(home, table.place.root)).toBeDefined();

        await chat.leave();
        await until(() => chats[0].host() === undefined, "the seat empty");
        await ticks(10);
        expect(ended()).toBe(false);
        time.pass(60_000);
        await until(ended, "the table ended");
        expect(readPlace(home, table.place.root)).toBeUndefined();
    });

    it("refuses a chat of another engine, and ends for a newer one while no chat sits", async () => {
        const table = await open();
        const older = await knock(table.place, hello(table.place, {}, { version: "1.2.2" }));
        expect(JSON.parse(await older.line("{"))).toEqual({ refused: "version" });
        const ended = settled(table.ended);
        const there = await knock(table.place, probe(table.place));
        expect(JSON.parse(await there.line("{"))).toMatchObject({ table: { version } });
        expect(ended()).toBe(false);

        const newer = await knock(table.place, hello(table.place, {}, { version: "1.3.0" }));
        expect(JSON.parse(await newer.line("{"))).toEqual({ refused: "version" });
        await until(ended, "the table ended", 5000);
        expect(readPlace(home, table.place.root)).toBeUndefined();
    });
});

describe("what the table keeps from going wrong", () => {
    it("ends by itself once the code it loaded is not the code on disk, once no call runs, and tells the master to start it again (defect 1)", async () => {
        inPlay(folder);
        await runCommandLine(["write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "grit=10/20"], testContext(folder));
        const table = await open({ idleEvery: 10 });
        const ended = settled(table.ended);
        const page = await openPage(table.url);
        const chat = await sit(table.place);
        // A call that waits for the player's click, still running as the next learns the code is old.
        // The asking tools come with the first call, the page being open.
        await call(chat, 2, "status");
        chat.send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "ask", arguments: { question: "Avanti?", options: ["Sì", "No"], who: "Ettore" } } });
        await until(() => contexts[0].chat?.calls === 1, "the question asked");
        // As after the system was updated while the table ran: its code loaded at another version than the one installed now.
        contexts[0].systemCode = { fake: { ...testSystemCode.fake, version: "0.9.0" } } as Context["systemCode"];

        const told = await call(chat, 4, "change", { page: "Ettore", field: "grit", by: -1 });
        expect(told).toContain("is loaded at version 0.9.0, and 1.0.0 is installed now: the campaign's table ends by itself once no call is running: start it again (rpg table in the campaign's folder), then open a new chat");
        await ticks(10);
        expect(ended()).toBe(false);

        // The question ends with the chat that asked it: no call runs.
        await chat.leave();
        await until(ended, "the table ended");
        page.close();
        expect(readPlace(home, table.place.root)).toBeUndefined();
    });

    it("tells a change made by hand between two chats once, with what changed, the session having seen it (defect 2)", async () => {
        inPlay(folder);
        const table = await open({}, { now: () => new Date() });
        const first = await sit(table.place);
        await call(first, 2, "instructions");
        await call(first, 3, "write", { page: "Bruna", type: "character", set: { role: "pc", hp: "12/12" }, text: "Una guerriera." });
        await first.leave();
        await until(() => chats[0].host() === undefined, "the seat empty");
        anHourAgo();
        byHand();

        const next = await sit(table.place);
        const heard = (text: string): string[] => text.split("\n").filter((line) => line.startsWith("Changed outside"));
        // instructions looks at every file the session kept: the change is in it whatever its watchers said.
        const told = heard(await call(next, 2, "instructions"));
        expect(told).toEqual([expect.stringContaining("Bruna: hp 12/12 → 7/12")]);
        expect(heard(await call(next, 3, "status"))).toEqual([]);
        const logged = readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").filter((line) => line.includes('"changed-outside"') && line.includes("Bruna"));
        expect(logged, logged.join("\n")).toHaveLength(1);
    });

    it("tells a change made by hand at a table no chat sat at, read by its page, once (defect 2)", async () => {
        inPlay(folder);
        await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "hp=12/12"], testContext(folder));
        anHourAgo();
        const table = await open({}, { now: () => new Date() });
        expect((await get(table.url, "/api/view")).status).toBe(200);
        byHand();

        const chat = await sit(table.place);
        const told = (await call(chat, 2, "instructions")).split("\n").filter((line) => line.includes("Bruna"));
        expect(told).toEqual([expect.stringContaining("Bruna: hp 12/12 → 7/12")]);
    });

    it("says hello with no more of the chat's environment than the table reads, and the import starts with the server's own (defect 3)", async () => {
        const place = placeOf();
        const heard = await listenerAt(place, (socket) => socket.destroy());
        const environment = { SECRET_KEY: "hunter2", PATH: "/bin", CLAUDE_CODE_SESSION_ID: "chat-1", CLAUDE_CODE_ENTRYPOINT: "cli", CLAUDE_CONFIG_DIR: "/c", CODEX_HOME: "/x", RPG_TABLE_MASTER: "token" };
        expect(await pipeToTable(folder, new PassThrough(), new PassThrough(), { home, version, environment })).toBeUndefined();
        await until(() => heard.length > 0, "the hello heard");
        const said = JSON.parse(heard[0]) as { environment: Record<string, string>; };
        expect(said.environment).toEqual({ CLAUDE_CODE_SESSION_ID: "chat-1", CLAUDE_CODE_ENTRYPOINT: "cli", CLAUDE_CONFIG_DIR: "/c", CODEX_HOME: "/x", RPG_TABLE_MASTER: "token" });
        expect(Object.keys(said.environment).sort()).toEqual([...chatEnvironmentNames].sort());

        const own = { PATH: "/bin", HOME: "/home/player" };
        expect(importEnvironment({ host: () => undefined, environment: () => ({}) }, own)).toEqual({ ...own, RPG_HOST: "" });
        expect(importEnvironment({ host: () => "codex", environment: () => ({ CODEX_HOME: "/x" }) }, own)).toEqual({ ...own, CODEX_HOME: "/x", RPG_HOST: "codex" });
    });

    it("answers the host's requests still waiting, and exits with 1, when the table ends first; with 0 when the host's input ends (defect 4)", async () => {
        const place = placeOf();
        // A table that lets the chat sit, then ends as its first request comes.
        await listenerAt(place, (socket, _line, index) => (index === 0 ? socket.write('{"ok":true}\n') : socket.destroy()));
        const input = new PassThrough();
        const output = new PassThrough();
        const said: string[] = [];
        const heard: string[] = [];
        output.setEncoding("utf8").on("data", (chunk: string) => heard.push(chunk));
        const piping = pipeToTable(folder, input, output, { home, version, environment: {}, log: (line) => said.push(line) });
        input.write(`${JSON.stringify(initialize)}\n`);

        expect(await piping).toBe(1);
        expect(JSON.parse(heard.join("").trim())).toEqual({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: tableEnded } });
        expect(said).toEqual([`rpg mcp: ${tableEnded}`]);
    });

    it("closes a knock that has not sat as it ends: a hello said after is never seated (defect 5)", async () => {
        const time = clock();
        const table = await open({ idle: 1000, idleEvery: 10, helloWait: 10_000, now: time.now });
        const late = await knock(table.place, "");
        time.pass(2000);
        await table.ended;
        late.socket.write(hello(table.place));
        await until(late.closed, "the late knock closed");
        expect(late.lines).toEqual([]);
    });

    it("lets the seat go when the chat's server fails as it sits, or its transport closes, and says why (defect 6)", async () => {
        const said: string[] = [];
        let seats = 0;

        const chatFolders = (): undefined => {
            seats++;

            if (seats === 1) {
                throw new Error("boom as the chat sits");
            }

            return undefined;
        };

        const table = await open({ chatFolders, log: (line) => said.push(line) });
        const failing = await knock(table.place, hello(table.place));
        await until(failing.closed, "the failing chat sent away");
        await until(() => said.some((line) => line.includes("boom as the chat sits")), "the failure said");

        const huge = await sit(table.place);
        // A line longer than the SDK reads: it closes its transport, and the socket with it.
        huge.socket.write(Buffer.alloc(11 * 1024 * 1024, 0x61));
        await until(huge.closed, "the huge line's chat sent away");
        await until(() => chats[0].host() === undefined, "the seat empty");
        const next = await sit(table.place);
        expect(await call(next, 2, "status")).toContain("Rocca");
    });

    it("finds the other table of two started together, and refuses one that does not answer, with its process (defect 7)", async () => {
        const port = await new Promise<number>((done) => {
            const free = createServer().listen(0, "127.0.0.1", () => {
                const address = free.address();
                free.close(() => done(typeof address === "object" && address !== null ? address.port : 0));
            });
        });
        const both = await Promise.all([openTable(tableOptions({ dashboard: { ports: [port], page: pageFolder } })), openTable(tableOptions({ dashboard: { ports: [port], page: pageFolder } }))]);
        const opened = both.filter((one): one is Table => "place" in one);
        tables.push(...opened);
        expect(opened).toHaveLength(1);
        expect(both.find((one) => !("place" in one))).toEqual({ running: opened[0].url });

        await opened[0].end("the next case");
        const place = placeOf();
        // A program at the place's socket that takes the knock and never answers.
        await listenerAt(place, () => undefined);
        expect(await openTable(tableOptions())).toEqual({ refused: expect.stringContaining(`(process ${place.pid}) does not answer: end that process, then run rpg table again`) });
    });

    it("reads no place of another campaign, and starts no table where another program listens at its socket (defect 8)", async () => {
        const place = placeOf();
        expect(readPlace(home, folder)).toEqual(place);
        // The same folder written in other capitals: one on Windows, another where the case counts.
        expect(readPlace(home, folder.toUpperCase())).toEqual(process.platform === "win32" ? place : undefined);
        const file = join(home, "tables", readdirSync(join(home, "tables")).find((name) => name.endsWith(".json")) ?? "");
        writeFileSync(file, JSON.stringify({ ...place, root: `${folder}-other` }));
        expect(readPlace(home, folder)).toBeUndefined();
        expect(await pipeToTable(folder, new PassThrough(), new PassThrough(), { home, version, environment: {} })).toBeUndefined();

        // No place, and another program at the socket the table would listen at.
        rmSync(file);
        await listenerAt(place, () => undefined);
        const time = clock();
        const refused = await openTable(tableOptions({ now: () => (time.pass(500), time.now()) }));
        expect(refused).toEqual({ refused: expect.stringContaining(`another program listens at ${place.socket}`) });
    });

    it.skipIf(process.platform === "win32")("keeps its token for the player alone, and takes away a socket file nothing answers at (defect 8)", async () => {
        const socket = tableSocket(home, folder, process.platform);
        writePlace(home, { ...placeOf(), socket });
        writeFileSync(socket, "");
        // The place left there answers nothing: taken away, as the socket file left with it.
        const table = await open();
        expect(statSync(join(home, "tables")).mode & 0o777).toBe(0o700);
        const file = join(home, "tables", readdirSync(join(home, "tables")).find((name) => name.endsWith(".json")) ?? "");
        expect(statSync(file).mode & 0o777).toBe(0o600);
        expect(readPlace(home, folder)?.token).toBe(table.place.token);
    });

    it("rpg table: logs a promise nobody caught and goes on, and on an exception nobody caught takes its place away and exits with 1", async () => {
        const said: string[] = [];
        const exit = vi.fn();
        const written = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const before = { rejected: process.listeners("unhandledRejection"), thrown: process.listeners("uncaughtException") };
        const time = clock();
        const options = tableOptions({ idle: 1000, idleEvery: 10, now: time.now, log: (line) => said.push(line) });
        const running = runTable(folder, { ...options, exit });

        try {
            await until(() => readPlace(home, folder) !== undefined, "the table's place");
            expect(written).toHaveBeenCalledWith(`${readPlace(home, folder)?.url}\n`);
            const rejected = process.listeners("unhandledRejection").find((one) => !before.rejected.includes(one));
            const thrown = process.listeners("uncaughtException").find((one) => !before.thrown.includes(one));
            rejected?.(new Error("a promise of nobody's"), Promise.resolve());
            expect(said.at(-1)).toContain("the table goes on");
            expect(readPlace(home, folder)).toBeDefined();

            thrown?.(new Error("an error of nobody's"), "uncaughtException");
            expect(said.at(-1)).toContain("an error of nobody's");
            expect(exit).toHaveBeenCalledWith(1);
            expect(readPlace(home, folder)).toBeUndefined();
        } finally {
            time.pass(2000);
            expect(await running).toBe(0);
            written.mockRestore();
        }

        expect(process.listeners("unhandledRejection")).toEqual(before.rejected);
        expect(process.listeners("uncaughtException")).toEqual(before.thrown);
    });
});

describe("the table's own chat with the master", () => {
    /** A host the test drives: whether it was closed, and the events it tells. */
    interface FakeMaster extends MasterChat
    {
        closed: boolean;
        interrupted: number;
        emit(event: MasterEvent): void;
    }

    let masters: FakeMaster[];

    beforeEach(() => {
        masters = [];
    });

    /** What the table's chat takes in the test: a host the test drives, found on this computer, and the tokens token-1, token-2… */
    function withMaster(options: Partial<TableOptions> = {}): Partial<TableOptions>
    {
        let tokens = 0;
        const driver: MasterDriver = {
            open: () => masters[0],
            missing: () => undefined,
            program: () => ({ command: "claude-program", args: [] }),
            environment: (given) => given,
            models: () => Promise.resolve([]),
            model: "sonnet",
            efforts: ["low"],
        };
        return {
            master: {
                open: () => {
                    let listener: ((event: MasterEvent) => void) | undefined;
                    const fake: FakeMaster = {
                        closed: false,
                        interrupted: 0,
                        send: () => true,
                        onEvent: (given) => (listener = given),
                        interrupt: () => fake.interrupted++,
                        close: () => (fake.closed = true),
                        emit: (event) => listener?.(event),
                    };
                    masters.push(fake);
                    return fake;
                },
                driver: (host) => (host === "claudeCode" ? driver : undefined),
                environment: {},
                newToken: () => `token-${++tokens}`,
            },
            ...options,
        };
    }

    async function openChat(table: Table): Promise<{ status: number; body: string; }>
    {
        return await get(table.url, "/api/master", "POST", { open: { host: "claudeCode", model: "sonnet" } });
    }

    it("seats only its own server while it is open: a chat opened by hand is refused busy", async () => {
        const table = await open(withMaster());
        expect((await openChat(table)).status).toBe(200);
        const byHand = await knock(table.place, hello(table.place));
        expect(JSON.parse(await byHand.line("{"))).toEqual({ refused: "busy" });
        const stale = await knock(table.place, hello(table.place, { RPG_TABLE_MASTER: "token-0" }));
        expect(JSON.parse(await stale.line("{"))).toEqual({ refused: "busy" });

        const own = await sit(table.place, { RPG_TABLE_MASTER: "token-1" });
        expect(await call(own, 2, "status")).toContain("Rocca");
        expect(chats[0].environment()).toEqual({ RPG_TABLE_MASTER: "token-1" });
    });

    it("does not open while a chat opened by hand sits", async () => {
        const table = await open(withMaster());
        const byHand = await sit(table.place);
        const refused = await openChat(table);
        expect(refused.status).toBe(409);
        expect(JSON.parse(refused.body)).toMatchObject({ error: "A chat opened by hand plays this campaign: close it, then open the chat here.", elsewhere: true });
        expect(masters).toEqual([]);

        await byHand.leave();
        await until(() => chats[0].host() === undefined, "the seat empty");
        expect((await openChat(table)).status).toBe(200);
    });

    it("never takes its own server, still seated once its chat closed or ended, for a chat opened by hand: the seat is cleared at once", async () => {
        const table = await open(withMaster());
        await openChat(table);
        const own = await sit(table.place, { RPG_TABLE_MASTER: "token-1" });
        const closed = await get(table.url, "/api/master", "POST", { close: true });
        expect(JSON.parse(closed.body)).toMatchObject({ elsewhere: false });
        await until(() => own.closed(), "its server sent away");
        expect((await openChat(table)).status).toBe(200);

        const next = await sit(table.place, { RPG_TABLE_MASTER: "token-2" });
        masters[1].emit({ type: "ended", why: "the host's program ended (exit code 1)" });
        expect(JSON.parse((await get(table.url, "/api/master")).body)).toMatchObject({ elsewhere: false, chat: { state: "ended" } });
        await until(() => next.closed(), "its server sent away");
        await until(() => chats[0].host() === undefined, "the seat empty");
        expect((await openChat(table)).status).toBe(200);
    });

    it("rpg table: closes its chat before it exits on an exception nobody caught", async () => {
        const exit = vi.fn();
        const written = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const before = process.listeners("uncaughtException");
        const time = clock();
        const running = runTable(folder, { ...tableOptions(withMaster({ idle: 1000, idleEvery: 10, now: time.now, log: () => undefined })), exit });

        try {
            await until(() => readPlace(home, folder) !== undefined, "the table's place");
            const url = readPlace(home, folder)?.url ?? "";
            expect((await get(url, "/api/master", "POST", { open: { host: "claudeCode", model: "sonnet" } })).status).toBe(200);
            const thrown = process.listeners("uncaughtException").find((one) => !before.includes(one));
            thrown?.(new Error("an error of nobody's"), "uncaughtException");
            expect(masters[0].closed).toBe(true);
            expect(exit).toHaveBeenCalledWith(1);
        } finally {
            time.pass(2000);
            expect(await running).toBe(0);
            written.mockRestore();
        }
    });

    it("closes its chat as the table ends", async () => {
        const table = await open(withMaster());
        await openChat(table);
        await table.end("the test ends it");
        expect(masters[0].closed).toBe(true);
    });

    it("after the idle time with no page stops its chat's turn, then closes the chat out of a turn; the table's own end follows", async () => {
        const time = clock();
        const table = await open(withMaster({ idle: 60_000, idleEvery: 10, now: time.now }));
        const ended = settled(table.ended);
        await openChat(table);
        const own = await sit(table.place, { RPG_TABLE_MASTER: "token-1" });
        expect((await get(table.url, "/api/master", "POST", { say: "Hello" })).status).toBe(202);
        time.pass(59_000);
        await ticks(10);
        expect(masters[0].interrupted).toBe(0);
        time.pass(1000);
        await until(() => masters[0].interrupted === 1, "the turn stopped");
        await ticks(10);
        expect(masters[0].interrupted).toBe(1);
        expect(masters[0].closed).toBe(false);

        masters[0].emit({ type: "turnEnd", reason: "interrupted" });
        await ticks(10);
        expect(masters[0].closed).toBe(false);
        time.pass(60_000);
        await until(() => masters[0].closed, "the chat closed");
        expect(ended()).toBe(false);

        // Its server, sent away as the chat closed.
        await until(() => own.closed(), "its server sent away");
        await until(() => chats[0].host() === undefined, "the seat empty");
        time.pass(60_000);
        await until(ended, "the table ended");
    });

    it("waits for its chat's turn to end before it ends for outdated code", async () => {
        const table = await open(withMaster({ idleEvery: 10 }));
        const ended = settled(table.ended);
        await openChat(table);
        expect((await get(table.url, "/api/master", "POST", { say: "Hello" })).status).toBe(202);
        contexts[0].codeOutdated?.();
        await ticks(10);
        expect(ended()).toBe(false);

        masters[0].emit({ type: "turnEnd", reason: "done" });
        await until(ended, "the table ended");
        expect(masters[0].closed).toBe(true);
    });
});

describe("rpg mcp at its campaign's table", () => {
    it("takes a stale place away and says, quickly, that there is no table", async () => {
        const table = await open();
        const placeFile = join(home, "tables", readdirSync(join(home, "tables")).find((name) => name.endsWith(".json")) ?? "");
        const written = readFileSync(placeFile, "utf8");
        await table.end("killed");
        // As a table killed without its cleanup leaves it.
        writeFileSync(placeFile, written);

        const started = Date.now();
        expect(await pipeToTable(table.place.root, new PassThrough(), new PassThrough(), { home, version, environment: {} })).toBeUndefined();
        expect(Date.now() - started).toBeLessThan(1000);
        expect(existsSync(placeFile)).toBe(false);
    });

    it("pipes the chat's lines to the table and its answers back, and leaves the input untouched where there is no table", async () => {
        const nowhere = new PassThrough();
        nowhere.write("waiting\n");
        expect(await pipeToTable(folder, nowhere, new PassThrough(), { home, version, environment: {} })).toBeUndefined();
        expect(String(nowhere.read())).toBe("waiting\n");

        const table = await open();
        const input = new PassThrough();
        const output = new PassThrough();
        const heard: string[] = [];
        output.setEncoding("utf8");
        output.on("data", (chunk: string) => heard.push(chunk));
        const piping = pipeToTable(table.place.root, input, output, { home, version, environment: { CODEX_HOME: "/piped" }, wait: 2000 });

        const send = (message: object): boolean => input.write(`${JSON.stringify(message)}\n`);
        send({ ...initialize, params: { ...initialize.params, clientInfo: { name: "piped-host", version: "1" } } });
        await until(() => heard.join("").includes('"id":1}'), "initialize answered");
        send({ jsonrpc: "2.0", method: "notifications/initialized" });
        send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "status", arguments: {} } });
        await until(() => heard.join("").includes('"id":2}'), "status answered");
        expect(heard.join("")).toContain(table.url);
        expect(chats[0].environment()).toEqual({ CODEX_HOME: "/piped" });

        input.end();
        expect(await piping).toBe(0);
        await until(() => chats[0].host() === undefined, "the seat empty");
    });

    it("pipeHere: pipes from the process's folder to its campaign's table, in the engine's data folder; serves as always outside a campaign or with no table", async () => {
        const base = makeTempFolder();
        const data = withEnvironment(dataFolderEnvironment(base), () => userDataFolder());
        expect(await withEnvironment(dataFolderEnvironment(base), () => pipeHere(new PassThrough(), new PassThrough(), makeTempFolder()))).toBeUndefined();
        expect(await withEnvironment(dataFolderEnvironment(base), () => pipeHere(new PassThrough(), new PassThrough(), folder))).toBeUndefined();

        const table = await open({ home: data, version: getVersion() });
        const input = new PassThrough();
        const output = new PassThrough();
        const heard: string[] = [];
        output.setEncoding("utf8").on("data", (chunk: string) => heard.push(chunk));
        const piping = withEnvironment(dataFolderEnvironment(base), () => pipeHere(input, output, folder));
        input.write(`${JSON.stringify(initialize)}\n`);
        await until(() => heard.join("").includes('"id":1'), "initialize answered");
        expect(chats[0].host()).toBe("test-host");
        input.end();
        expect(await piping).toBe(0);
        expect(readPlace(data, folder)).toEqual(table.place);
    });

    it("the command line: rpg mcp pipes to the table without loading the server, and serves itself with no table", async () => {
        const base = makeTempFolder();
        const data = withEnvironment(dataFolderEnvironment(base), () => userDataFolder());
        const said: string[] = [];
        await open({ home: data, version: getVersion(), log: (line) => said.push(line) });
        const cli = fileURLToPath(new URL("../src/cli/cli.ts", import.meta.url));
        // Says on stderr whether the MCP server's module was loaded.
        const hook = "data:text/javascript,import{registerHooks}from'node:module';registerHooks({resolve(s,c,n){const r=n(s,c);if(r.url.endsWith('/server/mcp.ts'))process.stderr.write('loaded the server\\n');return r;}});";

        const rpgMcp = async (): Promise<{ code: number | null; out: string; err: string; }> => {
            const child = spawn(process.execPath, ["--no-warnings", "--import", hook, cli, "mcp"], { cwd: folder, env: { ...process.env, ...dataFolderEnvironment(base), CLAUDE_CODE_ENTRYPOINT: "" } });
            let out = "";
            let err = "";
            child.stdout.setEncoding("utf8").on("data", (chunk: string) => (out += chunk));
            child.stderr.setEncoding("utf8").on("data", (chunk: string) => (err += chunk));
            const exited = new Promise<number | null>((done) => child.on("exit", done));
            child.stdin.write(`${JSON.stringify(initialize)}\n`);
            await until(() => out.includes('"id":1'), "initialize answered", 30_000);
            child.stdin.end();
            return { code: await exited, out, err };
        };

        const piped = await rpgMcp();
        expect(piped.code).toBe(0);
        expect(piped.err).not.toContain("loaded the server");
        expect(piped.out).toContain('"name":"rpg"');
        expect(said).toContain("A chat sat at the table.");

        await tables[0].end("the next case");
        const alone = await rpgMcp();
        expect(alone.code).toBe(0);
        expect(alone.err).toContain("loaded the server");
        expect(alone.out).toContain('"name":"rpg"');
    }, 60_000);
});
