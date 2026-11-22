// The doorbell in every host (D-495, D-578): the hook's answer for each, Antigravity's hook let go when the player writes in the chat, OpenCode's when
// OpenCode is gone, and the engine's plugin that runs it in OpenCode.
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { appendFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { bellLine, hookAnswer, waitForBell, watchNewTurn } from "../src/server/bell/index.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

const folders: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise((done) => server.close(done))));
    folders.splice(0).forEach(removeFolder);
});

describe("the doorbell's answer in each host (D-578)", () => {
    it("wakes Claude Code with the line on stderr, Codex and Antigravity with their Stop hooks' answers, OpenCode's plugin with the line alone", () => {
        expect(hookAnswer("claude", true)).toBe(bellLine);
        expect(hookAnswer("claude", false)).toBeUndefined();
        expect(JSON.parse(hookAnswer("codex", true)!)).toEqual({ decision: "block", reason: bellLine });
        expect(hookAnswer("codex", false)).toBeUndefined();
        expect(JSON.parse(hookAnswer("antigravity", true)!)).toEqual({ decision: "continue", reason: bellLine });
        // Antigravity's Stop hook reads an answer even when the chat may stop.
        expect(hookAnswer("antigravity", false)).toBe("{}");
        expect(hookAnswer("opencode", true)).toBe(bellLine);
        expect(hookAnswer("opencode", false)).toBeUndefined();
    });

    it("sees the player start a new turn in the conversation Antigravity's hook holds: a message or a command typed, or Esc in its log", async () => {
        const folder = temporary();
        const history = join(folder, "history.jsonl");
        const log = join(folder, "cli.log");
        writeFileSync(history, `${JSON.stringify({ display: "Before", conversationId: "conv-1" })}\n`);
        writeFileSync(log, "I1114 12:15:46.881799 986 server.go:2504] Cancelling conversation conv-1 (killBackgroundTasks=false)\n");

        // What came before the hook started, or for another conversation, is no new turn.
        const typed = watchNewTurn("conv-1", folder, 5);
        appendFileSync(history, `${JSON.stringify({ display: "Hi", conversationId: "conv-2" })}\n`);
        expect(await soon(typed.started)).toBe(false);
        appendFileSync(history, `${JSON.stringify({ display: "/clear", conversationId: "conv-1", type: "slash_command" })}\n`);
        expect(await soon(typed.started)).toBe(true);

        const stopped = watchNewTurn("conv-1", folder, 5);
        appendFileSync(log, "I1114 12:16:26.154037 2054 conversation_manager.go:1880] Cancelling in-progress response for conversation conv-2\n");
        expect(await soon(stopped.started)).toBe(false);
        appendFileSync(log, "I1114 12:17:13.575385 2968 server.go:2504] Cancelling conversation conv-1 (killBackgroundTasks=false)\n");
        expect(await soon(stopped.started)).toBe(true);

        // A history written anew is read from its start.
        const anew = watchNewTurn("conv-1", folder, 5);
        writeFileSync(history, `${JSON.stringify({ display: "Ciao", conversationId: "conv-1" })}\n`);
        expect(await soon(anew.started)).toBe(true);
        anew.stop();

        // In Antigravity's app a message written while the turn has not ended waits in the conversation's own folder: another conversation's is not this one's.
        const app = temporary();
        const waiting = (conversation: string): string => join(app, "brain", conversation, ".system_generated", "messages", "undelivered");
        const inApp = watchNewTurn("conv-1", folder, 5, app);
        mkdirSync(waiting("conv-2"), { recursive: true });
        writeFileSync(join(waiting("conv-2"), "message-a"), "");
        mkdirSync(waiting("conv-1"), { recursive: true });
        expect(await soon(inApp.started)).toBe(false);
        writeFileSync(join(waiting("conv-1"), "message-b"), "");
        expect(await soon(inApp.started)).toBe(true);

        // A line written in two parts is read once whole, in the history and in the log (p.test.ts W2, W5).
        const quiet = temporary();
        const halves = watchNewTurn("conv-1", folder, 5, quiet);
        const line = `${JSON.stringify({ display: "una frase lunga", conversationId: "conv-1" })}\n`;
        appendFileSync(history, line.slice(0, 20));
        expect(await soon(halves.started)).toBe(false);
        appendFileSync(history, line.slice(20));
        expect(await soon(halves.started)).toBe(true);
        const esc = watchNewTurn("conv-1", folder, 5, quiet);
        appendFileSync(log, "I1114 12:18:00.000000 1 server.go:2504] Cancelling conver");
        expect(await soon(esc.started)).toBe(false);
        appendFileSync(log, "sation conv-1 (killBackgroundTasks=false)\n");
        expect(await soon(esc.started)).toBe(true);

        // A history put in place of the old one, longer, is read from its start (p.test.ts W4).
        writeFileSync(history, `${JSON.stringify({ display: "x", conversationId: "conv-2" })}\n`);
        const replaced = watchNewTurn("conv-1", folder, 5, quiet);
        const next = join(folder, "next.jsonl");
        writeFileSync(next, `${JSON.stringify({ display: "a message long enough to pass the old size", conversationId: "conv-1" })}\n${JSON.stringify({ display: "y", conversationId: "conv-2" })}\n`);
        renameSync(next, history);
        expect(await soon(replaced.started)).toBe(true);
    });

    it("lets Antigravity's chat go when the player writes in it while the hook waits, and wakes it when the player acts on the dashboard", async () => {
        const root = campaign();
        const home = temporary();
        const agy = join(home, ".gemini", "antigravity-cli");
        mkdirSync(agy, { recursive: true });
        const page = await fakePage(root);
        // Antigravity runs its hooks in .agents: the campaign is found above it.
        const input = { conversationId: "conv-1", hookEventName: "Stop" };
        const env = { HOME: home, USERPROFILE: home };

        const written = listening("antigravity", input, join(root, ".agents"), env);
        await page.waiting();
        appendFileSync(join(agy, "history.jsonl"), `${JSON.stringify({ display: "Why?", conversationId: "conv-1" })}\n`);
        expect(await written).toEqual({ code: 0, stdout: "{}\n" });

        const rung = listening("antigravity", input, join(root, ".agents"), env);
        await page.waiting();
        page.ring();
        expect(await rung).toEqual({ code: 0, stdout: `${hookAnswer("antigravity", true)}\n` });

        // No dashboard to wait at: the chat may stop at once.
        expect(await listening("antigravity", input, temporary(), env)).toEqual({ code: 0, stdout: "{}\n" });
    }, 30_000);

    it("gives OpenCode's plugin the player's words, or the line from a page with none, and stops waiting, saying nothing, once OpenCode is gone", async () => {
        expect(hookAnswer("opencode", true, "Fuggo.")).toBe("Fuggo.");
        expect(hookAnswer("antigravity", true, "Fuggo.")).toBe(hookAnswer("antigravity", true));
        expect(hookAnswer("claude", true, "Fuggo.")).toBe(bellLine);
        const root = campaign();
        const page = await fakePage(root);
        const input = { cwd: root, session_id: "ses_1", hook_event_name: "Stop" };

        const said = listening("opencode", input, root);
        await page.waiting();
        expect(page.asked()).toBe("/api/bell?words");
        page.ring("ring\nParlo con Varro.\n\nFuggo.");
        expect(await said).toEqual({ code: 0, stdout: "Parlo con Varro.\n\nFuggo.\n" });

        const rung = listening("opencode", input, root);
        await page.waiting();
        page.ring();
        expect(await rung).toEqual({ code: 0, stdout: `${bellLine}\n` });

        const opencode = spawn(process.execPath, ["-e", "setTimeout(() => {}, 500)"]);
        expect(await listening("opencode", { cwd: root, session_id: "ses_1", host_pid: opencode.pid }, root)).toEqual({ code: 0, stdout: "" });
    }, 30_000);

    it("looks again for a page that is not up yet as the hook comes, as in Antigravity, and waits there once it answers", async () => {
        const root = campaign();
        let probes = 0;
        const server = createServer((request, response) => {
            if (request.url?.startsWith("/api/bell?probe") === true) {
                probes += 1;
                response.writeHead(probes <= 2 ? 404 : 200).end(probes <= 2 ? "" : JSON.stringify({ session: null, root, others: [] }));
            } else {
                response.end("ring");
            }
        });
        servers.push(server);
        await new Promise<void>((done) => server.listen(0, "127.0.0.1", () => done()));
        const port = (server.address() as AddressInfo).port;
        const input = JSON.stringify({ conversationId: "conv-1", cwd: root });

        // No page at the first look nor the second; the third finds it.
        expect(await waitForBell(input, [port], { every: 5, times: 10 })).toBe(true);
        expect(probes).toBe(3);

        // Looks that run out give up.
        probes = 0;
        expect(await waitForBell(input, [port], { every: 5, times: 1 })).toBe(false);
        expect(probes).toBe(2);
    });

    it("refuses a host it does not know, with the hosts it knows", async () => {
        const ran = await listening("gemini" as never, {}, temporary());
        expect(ran.code).toBe(1);
        expect(ran.stderr).toContain("rpg --listen does not know the host gemini: give one of claude, codex, antigravity, opencode, or none for Claude Code.");
    }, 30_000);
});

describe("the engine's plugin for OpenCode (D-578)", () => {
    it("waits for the player after each turn, wakes the chat with the doorbell's line, and lets the wait go when a turn starts", async () => {
        const folder = temporary();
        const opencode = fakeOpenCode(folder);
        const stop = await (await plugin()).setup(opencode.context, opencode.run);

        // The turn ends: the doorbell waits, and its line becomes a message of the chat.
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: "Ciao!" } } });
        await opencode.send("session.execution.started", { sessionID: "ses_1" });
        await opencode.send("session.execution.succeeded", { sessionID: "ses_1" });
        const first = opencode.children.at(-1)!;
        expect(opencode.hooks()).toEqual([{ command: "rpg --listen opencode", input: { cwd: folder, session_id: "ses_1", hook_event_name: "Stop", host_pid: process.pid }, cwd: folder, shell: true }]);
        first.ends(0, `${bellLine}\n`);
        await settled();
        expect(opencode.prompts).toEqual([{ sessionID: "ses_1", text: bellLine }]);

        // Its own message starts the next turn; the turn after waits again, and a message of the player's lets that wait go, with no message sent.
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: bellLine } } });
        expect(first.killed).toBe(false);
        await opencode.send("session.execution.started", { sessionID: "ses_1" });
        await opencode.send("session.execution.succeeded", { sessionID: "ses_1" });
        const second = opencode.children.at(-1)!;
        expect(second).not.toBe(first);
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: "Perché?" } } });
        expect(second.killed).toBe(true);
        second.ends(null, "");
        expect(opencode.prompts).toHaveLength(1);

        // A turn that started ends the wait too; one that failed still waits for the player.
        await opencode.send("session.execution.failed", { sessionID: "ses_1", error: { name: "APIError" } });
        const failed = opencode.children.at(-1)!;
        expect(failed).not.toBe(second);
        await opencode.send("session.execution.started", { sessionID: "ses_1" });
        expect(failed.killed).toBe(true);

        // A subagent's session, born with its parent's, is no chat: nobody waits after its turn.
        const before = opencode.hooks().length;
        await opencode.send("session.created", { sessionID: "ses_agent", parentID: "ses_1" });
        await opencode.send("session.execution.succeeded", { sessionID: "ses_agent" });
        expect(opencode.hooks()).toHaveLength(before);

        // OpenCode letting the plugin go ends the waits still on.
        await opencode.send("session.execution.succeeded", { sessionID: "ses_1" });
        const last = opencode.children.at(-1)!;
        stop();
        expect(last.killed).toBe(true);
    });

    it("waits for the player across the character agent's round: the subagent's turns start no doorbell, and the master's second round waits again (D-490)", async () => {
        const folder = temporary();
        const opencode = fakeOpenCode(folder);
        await (await plugin()).setup(opencode.context, opencode.run);
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: "Marta, vieni con noi?" } } });
        await opencode.send("session.execution.started", { sessionID: "ses_1" });
        // The master starts the subagent, whose tool answers at once, and ends its turn: a doorbell waits.
        await opencode.send("session.execution.succeeded", { sessionID: "ses_1" });
        const waiting = opencode.children.at(-1)!;
        const before = opencode.hooks().length;

        // The subagent's own session runs and ends in the same folder: no doorbell for it, and the master's still waits.
        await opencode.send("session.created", { sessionID: "ses_marta", parentID: "ses_1" });
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_marta", item: { type: "user", payload: { text: "Marta, ..." } } });
        await opencode.send("session.execution.started", { sessionID: "ses_marta" });
        await opencode.send("session.execution.succeeded", { sessionID: "ses_marta" });
        expect(opencode.hooks()).toHaveLength(before);
        expect(waiting.killed).toBe(false);

        // Its lines come to the master as a message, which starts the master's second round: that wait goes, and the round's end waits again.
        await opencode.send("session.execution.started", { sessionID: "ses_1" });
        expect(waiting.killed).toBe(true);
        await opencode.send("session.execution.succeeded", { sessionID: "ses_1" });
        expect(opencode.hooks()).toHaveLength(before + 1);
        expect(opencode.children.at(-1)!.killed).toBe(false);
    });

    it("leaves alone the chats of other folders, which OpenCode's background service tells it of too", async () => {
        const folder = temporary();
        const opencode = fakeOpenCode(folder);
        await (await plugin()).setup(opencode.context, opencode.run);
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_here", item: { type: "user", payload: { text: "Ciao!" } } });
        await opencode.send("session.execution.succeeded", { sessionID: "ses_here" });
        const waiting = opencode.children.at(-1)!;
        const before = opencode.hooks().length;

        const elsewhere = join(folder, "..", `${basename(folder)}-other`);
        await opencode.send("session.created", { sessionID: "ses_there" }, elsewhere);
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_there", item: { type: "user", payload: { text: "Ciao" } } }, elsewhere);
        await opencode.send("session.execution.succeeded", { sessionID: "ses_there" });
        expect(opencode.hooks()).toHaveLength(before);
        expect(waiting.killed).toBe(false);
    });

    it("never stops OpenCode: a hook that cannot start, or a chat that cannot be woken, changes nothing", async () => {
        const folder = temporary();
        const broken = fakeOpenCode(folder, () => {
            throw new Error("no shell");
        });
        await (await plugin()).setup(broken.context, broken.run);
        await broken.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: "Ciao" } } });
        await broken.send("session.execution.succeeded", { sessionID: "ses_1" });
        expect(broken.children).toEqual([]);

        const closed = fakeOpenCode(folder);
        await (await plugin()).setup({ ...closed.context, session: { prompt: () => Promise.reject(new Error("closed")) } }, closed.run);
        await closed.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: "Ciao" } } });
        await closed.send("session.execution.succeeded", { sessionID: "ses_1" });
        closed.children.at(-1)!.ends(0, `${bellLine}\n`);
        await settled();
        // The words the chat could not take come back to the page, which rings again: a doorbell waits for them (p.test.ts P1).
        expect(closed.children).toHaveLength(2);
        expect(closed.children[1].killed).toBe(false);
        await closed.send("session.execution.succeeded", { sessionID: "ses_1" });
        expect(closed.children).toHaveLength(3);
        expect(closed.children[1].killed).toBe(true);
    });

    it("sends the words a doorbell already had when the player's own message starts a turn, after it (p.test.ts P2)", async () => {
        const folder = temporary();
        const opencode = fakeOpenCode(folder);
        await (await plugin()).setup(opencode.context, opencode.run);
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: "Ciao" } } });
        await opencode.send("session.execution.succeeded", { sessionID: "ses_1" });
        const waiting = opencode.children.at(-1)!;
        waiting.stdout.emit("data", "Apro la porta.\n");
        await opencode.send("session.inbox.enqueued", { sessionID: "ses_1", item: { type: "user", payload: { text: "Aspetta." } } });
        expect(waiting.killed).toBe(true);
        waiting.emit("close", null);
        await settled();
        expect(opencode.prompts).toEqual([{ sessionID: "ses_1", text: "Apro la porta." }]);
    });
});

interface PluginContext
{
    location: { directory: string; };
    event: { subscribe(options: { signal: AbortSignal; }): AsyncIterable<unknown>; };
    session: { prompt(message: { sessionID: string; text: string; }): Promise<unknown>; };
}

type Run = (command: string, options: { cwd: string; shell: boolean; }) => FakeChild;

/** The plugin as OpenCode loads it from the campaign's folder. */
async function plugin(): Promise<{ setup(context: PluginContext, run: Run): Promise<() => void>; }>
{
    const module = await import(pathToFileURL(join(import.meta.dirname, "..", "plugins", "opencode.js")).href) as { default: { setup(context: PluginContext, run: Run): Promise<() => void>; }; };
    return module.default;
}

/** A hook the plugin starts: what it was given on stdin, and how the test ends it. */
class FakeChild extends EventEmitter
{
    readonly stdout = new EventEmitter();
    readonly stdin = { end: (text: string) => (this.input = JSON.parse(text) as unknown), on: () => undefined };
    readonly pid = undefined;
    readonly command: string;
    readonly options: { cwd: string; shell: boolean; };
    input: unknown;
    killed = false;

    constructor(command: string, options: { cwd: string; shell: boolean; })
    {
        super();
        this.command = command;
        this.options = options;
    }

    kill(): void
    {
        this.killed = true;
    }

    ends(code: number | null, output: string): void
    {
        this.stdout.emit("data", output);
        this.emit("close", code);
    }
}

/** OpenCode as the plugin sees it: the folder, its events as the test sends them, the messages the plugin sends, the hooks it starts. */
function fakeOpenCode(folder: string, start?: () => void): {
    context: PluginContext;
    run: Run;
    send(type: string, data: object, directory?: string): Promise<void>;
    children: FakeChild[];
    prompts: object[];
    hooks(): object[];
}
{
    const events: unknown[] = [];
    let wake = (): void => undefined;
    const children: FakeChild[] = [];
    const prompts: object[] = [];

    const subscribe = ({ signal }: { signal: AbortSignal; }): AsyncIterable<unknown> => ({
        async *[Symbol.asyncIterator]()
        {
            while (!signal.aborted) {
                if (events.length === 0) {
                    await new Promise<void>((done) => {
                        wake = done;
                        signal.addEventListener("abort", () => done(), { once: true });
                    });
                }

                while (events.length > 0) {
                    yield events.shift();
                }
            }
        },
    });

    return {
        context: { location: { directory: folder }, event: { subscribe }, session: { prompt: (message) => Promise.resolve(prompts.push(message)) } },
        run: (command, options) => {
            start?.();
            const child = new FakeChild(command, options);
            children.push(child);
            return child;
        },
        // As OpenCode's events, which say the session's folder but for a turn's start and end.
        send: async (type, data, directory = folder) => {
            events.push(type.startsWith("session.execution.") ? { type, data } : { type, location: { directory }, data });
            wake();
            await settled();
        },
        children,
        prompts,
        hooks: () => children.map((child) => ({ command: child.command, input: child.input, cwd: child.options.cwd, shell: child.options.shell })),
    };
}

/** A campaign's folder, with the .agents folder Antigravity runs its hooks in. */
function campaign(): string
{
    const root = temporary();
    writeFileSync(join(root, "campaign.yaml"), "name: Guadoscuro\n");
    mkdirSync(join(root, ".agents"));
    return root;
}

/**
 * The campaign's dashboard as the hook finds it, at the port the campaign keeps: it says whose it is, and holds the hook's wait until it rings. `waiting`
 * waits for one more hook than it has seen.
 */
async function fakePage(root: string): Promise<{ waiting: () => Promise<void>; ring: (said?: string) => void; asked: () => string | undefined; }>
{
    let hook: ServerResponse | undefined;
    let asked: string | undefined;
    let hooks = 0;
    let seen = 0;
    let arrived = (): void => undefined;
    const server = createServer((request, response) => {
        if (request.url?.startsWith("/api/bell?probe") === true) {
            response.end(JSON.stringify({ session: null, root, others: [] }));
            return;
        }

        hook = response;
        asked = request.url;
        hooks += 1;
        arrived();
    });
    servers.push(server);
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", () => done()));
    writeFileSync(join(root, ".dashboard-port"), `${(server.address() as AddressInfo).port}\n`);

    return {
        waiting: async () => {
            seen += 1;

            if (hooks < seen) {
                await new Promise<void>((done) => (arrived = () => hooks >= seen && done()));
            }
        },
        ring: (said = "ring") => hook?.end(said),
        asked: () => asked,
    };
}

/** `rpg --listen <host>` as the host runs it, in `cwd`: its exit code and what it wrote. */
function listening(host: string, input: object, cwd: string, env: Record<string, string> = {}): Promise<{ code: number | null; stdout: string; stderr?: string; }>
{
    const cli = join(import.meta.dirname, "..", "src", "cli", "cli.ts");
    const child = spawn(process.execPath, ["--no-warnings", cli, "--listen", host], { cwd, env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk: Buffer) => (stderr += String(chunk)));
    child.stdin.end(JSON.stringify(input));
    return new Promise((done) => child.on("exit", (code) => done(code === 1 ? { code, stdout, stderr } : { code, stdout })));
}

/** Whether the promise settles within a few of the watch's turns. */
function soon(promise: Promise<void>): Promise<boolean>
{
    return Promise.race([promise.then(() => true), new Promise<boolean>((done) => setTimeout(() => done(false), 200))]);
}

function settled(): Promise<void>
{
    return new Promise((done) => setTimeout(done, 10));
}

function temporary(): string
{
    const folder = makeTempFolder();
    folders.push(folder);
    return folder;
}
