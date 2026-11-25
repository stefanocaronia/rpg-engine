import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { HostId } from "../src/core/hosts.ts";
import type { MasterChat, MasterDriver, MasterEvent, MasterOptions } from "../src/master/index.ts";
import { type ChatShown, type TableChat, tableChat, type TableChatOptions } from "../src/server/table/chat.ts";
import { readLastChat, writeLastChat } from "../src/server/table/last-chat.ts";
import { tableFile } from "../src/server/table/place.ts";
import { makeTempFolder } from "./support.ts";

// The table's own chat with the master, against a host the test drives: no process.

/** A chat with the master the test drives: what it was sent, interrupted and closed, and the events it tells. */
interface FakeMaster extends MasterChat
{
    options: MasterOptions;
    sent: string[];
    interrupted: number;
    closed: boolean;
    /** Whether send says no, as while the host's turn runs. */
    refuses: boolean;
    emit(event: MasterEvent): void;
}

function fakeMaster(options: MasterOptions): FakeMaster
{
    let listener: ((event: MasterEvent) => void) | undefined;
    const fake: FakeMaster = {
        options,
        sent: [],
        interrupted: 0,
        closed: false,
        refuses: false,
        send: (text) => {
            if (fake.refuses) {
                return false;
            }

            fake.sent.push(text);
            return true;
        },
        onEvent: (given) => (listener = given),
        interrupt: () => fake.interrupted++,
        close: () => (fake.closed = true),
        emit: (event) => listener?.(event),
    };
    return fake;
}

const driver: MasterDriver = {
    open: () => {
        throw new Error("The test opens through its own open.");
    },
    missing: () => missing,
    program: () => ({ command: "claude-program", args: [] }),
    environment: (environment) => ({ ...environment, DRIVER: "yes" }),
    model: "sonnet",
    efforts: ["low", "high"],
};

let root: string;
let home: string;
let masters: FakeMaster[];
let found: boolean;
let elsewhere: boolean;
let changes: number;
let idles: number;
let logged: string[];
let tokens: number;
let missing: string | undefined;
let left: string[];

beforeEach(() => {
    root = makeTempFolder();
    home = makeTempFolder();
    masters = [];
    found = true;
    elsewhere = false;
    changes = 0;
    idles = 0;
    logged = [];
    tokens = 0;
    missing = undefined;
    left = [];
});

function chatWith(overrides: Partial<TableChatOptions> = {}): TableChat
{
    return tableChat({
        root,
        home,
        environment: { PATH: "/bin" },
        platform: "linux",
        userHome: "/home/player",
        open: (host, options) => {
            const master = fakeMaster(options);
            masters.push(master);
            return host === "claudeCode" ? master : undefined;
        },
        driver: (host) => (host === "claudeCode" ? { ...driver, program: () => (found ? { command: "claude-program", args: [] } : undefined) } : undefined),
        npmProgram: () => undefined,
        elsewhere: () => elsewhere,
        changed: () => changes++,
        idle: () => idles++,
        newToken: () => `token-${++tokens}`,
        log: (line) => logged.push(line),
        left: (token) => left.push(token),
        ...overrides,
    });
}

const choice = { host: "claudeCode" as HostId, model: "sonnet" };

/** A chat opened with the choice, and its fake master. */
function opened(overrides: Partial<TableChatOptions> = {}): { chat: TableChat; master: FakeMaster; }
{
    const chat = chatWith(overrides);
    expect(chat.open(choice)).toBeUndefined();
    return { chat, master: masters.at(-1)! };
}

function shownWithout(chat: TableChat, ...left: (keyof ChatShown)[]): Partial<ChatShown>
{
    const shown: Partial<ChatShown> = chat.shown();
    left.forEach((key) => delete shown[key]);
    return shown;
}

describe("the table's chat with the master", () => {
    it("shows the hosts with a driver, whether each is on this computer, its model and efforts, and no chat before one opens", () => {
        expect(chatWith().shown()).toEqual({ hosts: [{ id: "claudeCode", name: "Claude Code", found: true, model: "sonnet", efforts: ["low", "high"] }], messages: [], elsewhere: false });
        found = false;
        expect(chatWith().shown().hosts[0].found).toBe(false);
        expect(chatWith({ npmProgram: (host) => (host === "claudeCode" ? { command: "node", args: ["cli.js"] } : undefined) }).shown().hosts[0].found).toBe(true);
    });

    it("looks for the host's program again only after a few seconds", () => {
        let time = 0;
        const chat = chatWith({ now: () => time });
        expect(chat.shown().hosts[0].found).toBe(true);
        found = false;
        time += 4000;
        expect(chat.shown().hosts[0].found).toBe(true);
        time += 1000;
        expect(chat.shown().hosts[0].found).toBe(false);
    });

    it("opens the host's program in the campaign, with the tools of the table, the driver's environment and a token of its own", () => {
        const { chat, master } = opened();
        expect(master.options).toEqual({
            folder: root,
            program: { command: "claude-program", args: [] },
            model: "sonnet",
            allowed: ["rpg", "read", "web", "agent"],
            environment: { PATH: "/bin", DRIVER: "yes", RPG_TABLE_MASTER: "token-1" },
            failed: expect.any(Function) as unknown,
        });
        expect(changes).toBe(1);
        expect(chat.active()).toBe(true);
        expect(chat.inTurn()).toBe(false);
        expect(chat.owns({ RPG_TABLE_MASTER: "token-1" })).toBe(true);
        expect(chat.owns({ RPG_TABLE_MASTER: "token-2" })).toBe(false);
        expect(chat.owns({})).toBe(false);
        expect(shownWithout(chat, "hosts")).toEqual({ last: { host: "claudeCode", model: "sonnet", resumable: false }, chat: { host: "claudeCode", model: "sonnet", state: "idle" }, messages: [], elsewhere: false });
    });

    it("gives the effort chosen, and a new token to each chat", () => {
        const chat = chatWith();
        expect(chat.open({ ...choice, effort: "high" })).toBeUndefined();
        expect(masters[0].options.effort).toBe("high");
        chat.close();
        expect(chat.open(choice)).toBeUndefined();
        expect(masters[1].options.environment.RPG_TABLE_MASTER).toBe("token-2");
        expect(chat.owns({ RPG_TABLE_MASTER: "token-1" })).toBe(false);
    });

    it("refuses, in words, a second chat, one while a chat opened by hand sits, a host with no driver or not here, no model, an effort the host does not know", () => {
        const chat = chatWith();
        elsewhere = true;
        expect(chat.open(choice)).toBe("A chat opened by hand plays this campaign: close it, then open the chat here.");
        elsewhere = false;
        expect(chat.open({ host: "codex", model: "gpt" })).toBe("The page cannot open a chat with Codex yet: choose Claude Code.");
        found = false;
        expect(chat.open(choice)).toBe("Claude Code is not on this computer: install it, then try again.");
        found = true;
        expect(chat.open({ ...choice, model: " " })).toBe("Choose the model Claude Code plays the master with.");
        expect(chat.open({ ...choice, effort: "max" })).toBe("Claude Code knows no effort max: choose one of low, high.");
        expect(masters).toEqual([]);
        expect(chat.open(choice)).toBeUndefined();
        expect(chat.open(choice)).toBe("A chat with the master is open already: close it first.");
        expect(masters).toHaveLength(1);
    });

    it("refuses a model no host's program may take, what the campaign lacks for the host, and a program that does not start, in words", () => {
        const chat = chatWith();
        expect(chat.open({ ...choice, model: "--dangerously-skip-permissions" })).toBe("That is no name of a model: --dangerously-skip-permissions.");
        missing = "This campaign has no .mcp.json: run rpg init.";
        expect(chat.open(choice)).toBe("This campaign has no .mcp.json: run rpg init.");
        missing = undefined;
        expect(masters).toEqual([]);

        const broken = chatWith({
            open: () => {
                throw new Error("spawn ENAMETOOLONG");
            },
        });
        expect(broken.open(choice)).toBe("Claude Code could not start: spawn ENAMETOOLONG.");
        expect(broken.active()).toBe(false);
    });

    it("knows every token it gave a host, open or closed, and tells the server of a chat closed or ended to leave", () => {
        const { chat, master } = opened();
        expect(chat.gave({ RPG_TABLE_MASTER: "token-1" })).toBe(true);
        chat.close();
        expect(left).toEqual(["token-1"]);
        expect(chat.gave({ RPG_TABLE_MASTER: "token-1" })).toBe(true);
        expect(chat.owns({ RPG_TABLE_MASTER: "token-1" })).toBe(false);
        master.emit({ type: "ended", why: "late" });
        expect(left).toEqual(["token-1"]);

        chat.open(choice);
        masters[1].emit({ type: "ended", why: "the host's program ended (exit code 1)" });
        expect(left).toEqual(["token-1", "token-2"]);
        expect(chat.gave({ RPG_TABLE_MASTER: "token-2" })).toBe(true);
        expect(chat.gave({ RPG_TABLE_MASTER: "token-3" })).toBe(false);
        expect(chat.gave({})).toBe(false);
    });

    it("tells the master the words given, and keeps for the page the sentence alone where it is given", () => {
        const { chat, master } = opened();
        expect(chat.say("I open the chest.\n\nWhat the character knows of the chest.", "I open the chest.")).toBe("sent");
        expect(master.sent).toEqual(["I open the chest.\n\nWhat the character knows of the chest."]);
        expect(chat.shown().messages).toEqual([{ id: 1, from: "player", text: "I open the chest." }]);
    });

    it("logs what failed while it heard the master", () => {
        const { master } = opened();
        master.options.failed?.(new Error("the page's delivery broke"));
        expect(logged).toEqual(["The table's chat failed while hearing the master: the page's delivery broke"]);
    });

    it("says the player's words, and refuses them while a turn runs or the host says no, and with no chat", () => {
        const chat = chatWith();
        expect(chat.say("Hello")).toBe("closed");
        chat.open(choice);
        const master = masters[0];
        expect(chat.say("Open the door")).toBe("sent");
        expect(master.sent).toEqual(["Open the door"]);
        expect(chat.inTurn()).toBe(true);
        expect(chat.say("And again")).toBe("busy");
        master.emit({ type: "turnEnd", reason: "done" });
        master.refuses = true;
        expect(chat.say("Refused")).toBe("busy");
        expect(chat.inTurn()).toBe(false);
        expect(chat.shown().messages).toEqual([{ id: 1, from: "player", text: "Open the door" }]);
    });

    it("joins the master's prose of a turn in one message, a new block a new paragraph, and shows the tool in use until it is done or failed", () => {
        const { chat, master } = opened();
        chat.say("Look around");
        master.emit({ type: "text", block: 0, text: "The hall " });
        master.emit({ type: "text", block: 0, text: "is dark." });
        master.emit({ type: "tool", id: "t1", name: "view", kind: "rpg", state: "started" });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", state: "turn", tool: "view" });
        master.emit({ type: "tool", id: "t1", name: "view", kind: "rpg", state: "done" });
        expect(chat.shown().chat?.tool).toBeUndefined();
        master.emit({ type: "tool", id: "t2", name: "roll", kind: "rpg", state: "started" });
        master.emit({ type: "tool", id: "t2", name: "roll", kind: "rpg", state: "failed" });
        master.emit({ type: "text", block: 1, text: "A door creaks." });
        master.emit({ type: "turnEnd", reason: "done" });
        chat.say("Go in");
        master.emit({ type: "text", block: 0, text: "Inside." });
        expect(chat.shown().messages).toEqual([
            { id: 1, from: "player", text: "Look around" },
            { id: 2, from: "master", text: "The hall is dark.\n\nA door creaks." },
            { id: 3, from: "player", text: "Go in" },
            { id: 4, from: "master", text: "Inside." },
        ]);
    });

    it("ends a turn: idle, the tool cleared, the page told and the sentences waiting brought; a failed one says why, an interrupted one nothing", () => {
        const { chat, master } = opened();
        chat.say("One");
        master.emit({ type: "tool", id: "t1", name: "view", kind: "rpg", state: "started" });
        master.emit({ type: "turnEnd", reason: "failed", why: "API Error: overloaded" });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", state: "idle" });
        expect(idles).toBe(1);
        chat.say("Two");
        chat.stop();
        expect(master.interrupted).toBe(1);
        master.emit({ type: "turnEnd", reason: "interrupted" });
        expect(idles).toBe(2);
        chat.stop();
        expect(master.interrupted).toBe(1);
        expect(chat.shown().messages).toEqual([
            { id: 1, from: "player", text: "One" },
            { id: 2, from: "table", text: "API Error: overloaded" },
            { id: 3, from: "player", text: "Two" },
        ]);
    });

    it("keeps the turn a host fails while the words are sent", () => {
        const { chat, master } = opened();

        master.send = (text) => {
            master.emit({ type: "turnEnd", reason: "failed", why: `No model for ${text}` });
            return true;
        };

        expect(chat.say("Hello")).toBe("sent");
        expect(chat.inTurn()).toBe(false);
        expect(chat.shown().messages.map((message) => message.from)).toEqual(["player", "table"]);
    });

    it("logs a permission refused and shows nothing of it", () => {
        const { chat, master } = opened();
        const before = changes;
        master.emit({ type: "permission", name: "Bash", kind: "shell", allowed: false });
        master.emit({ type: "permission", name: "Read", kind: "read", allowed: true });
        expect(logged).toEqual(["The master asked for Bash (shell), which the table does not give it."]);
        expect(changes).toBe(before);
        expect(chat.shown().messages).toEqual([]);
    });

    it("shows the chat ended, with why, no longer active: words are refused, and a new chat opens", () => {
        const { chat, master } = opened();
        master.emit({ type: "ended", why: "Claude Code ended (code 1)." });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", state: "ended", why: "Claude Code ended (code 1)." });
        expect(chat.active()).toBe(false);
        expect(chat.owns({ RPG_TABLE_MASTER: "token-1" })).toBe(false);
        expect(chat.say("Hello")).toBe("closed");
        expect(chat.open(choice)).toBeUndefined();
        expect(chat.active()).toBe(true);
    });

    it("tells that a chat opened, closed or ended, apart from what changes within it", () => {
        let switches = 0;
        const { chat, master } = opened({ switched: () => switches++ });
        expect(switches).toBe(1);
        chat.say("Hello");
        master.emit({ type: "text", block: 0, text: "Welcome." });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(switches).toBe(1);
        master.emit({ type: "ended", why: "gone" });
        expect(switches).toBe(2);
        expect(chat.open(choice)).toBeUndefined();
        chat.close();
        expect(switches).toBe(4);
    });

    it("closes the chat, its events no longer heard; the last choice stays", () => {
        const { chat, master } = opened();
        chat.close();
        expect(master.closed).toBe(true);
        expect(chat.active()).toBe(false);
        master.emit({ type: "text", block: 0, text: "late" });
        expect(shownWithout(chat, "hosts")).toEqual({ last: { host: "claudeCode", model: "sonnet", resumable: false }, messages: [], elsewhere: false });
    });

    it("keeps at most the last 200 messages, ids still growing, and cuts a message at 200,000 characters", () => {
        const { chat, master } = opened();

        for (let turn = 0; turn < 110; turn++) {
            chat.say(`Turn ${turn}`);
            master.emit({ type: "text", block: 0, text: "ok" });
            master.emit({ type: "turnEnd", reason: "done" });
        }

        const messages = chat.shown().messages;
        expect(messages).toHaveLength(200);
        expect(messages[0]).toEqual({ id: 21, from: "player", text: "Turn 10" });
        expect(messages.at(-1)?.id).toBe(220);
        chat.say("x".repeat(250_000));
        master.emit({ type: "text", block: 0, text: "y".repeat(150_000) });
        master.emit({ type: "text", block: 1, text: "z".repeat(150_000) });
        const [said, answer] = chat.shown().messages.slice(-2);
        expect(said.text).toHaveLength(200_000);
        expect(answer.text).toHaveLength(200_000);
        expect(answer.text.slice(150_000, 150_002)).toBe("\n\n");
    });
});

describe("the campaign's last chat", () => {
    it("forgets the session of a chat taken up that ends before the host says it: the next chat starts new, with the same host, model and effort", () => {
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", effort: "low", session: "gone-session" });
        const chat = chatWith();
        chat.open({ ...choice, effort: "low" });
        expect(masters[0].options.session).toBe("gone-session");
        masters[0].emit({ type: "ended", why: "the host's program ended (exit code 1): No conversation found" });
        expect(chat.shown().last).toEqual({ host: "claudeCode", model: "sonnet", effort: "low", resumable: false });
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", effort: "low" });
        chat.open({ ...choice, effort: "low" });
        expect(masters[1].options.session).toBeUndefined();
    });

    it("keeps the session of a chat taken up that ends after the host said it", () => {
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "session-1" });
        const chat = chatWith();
        chat.open(choice);
        masters[0].emit({ type: "session", session: "session-1", model: "sonnet" });
        masters[0].emit({ type: "ended", why: "the host's program ended (exit code 1)" });
        expect(chat.shown().last?.resumable).toBe(true);
    });

    it("takes up the last chat in the same host, with its session and messages; fresh or another host start anew", () => {
        const { chat, master } = opened();
        chat.say("Hello");
        master.emit({ type: "session", session: "session-1", model: "claude-sonnet-5" });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.shown().last).toEqual({ host: "claudeCode", model: "claude-sonnet-5", resumable: true });
        expect(chat.shown().chat?.model).toBe("claude-sonnet-5");
        chat.close();

        expect(chat.open(choice)).toBeUndefined();
        expect(masters[1].options.session).toBe("session-1");
        expect(chat.shown().messages).toHaveLength(1);
        chat.close();

        expect(chat.open({ ...choice, fresh: true })).toBeUndefined();
        expect(masters[2].options.session).toBeUndefined();
        expect(chat.shown().messages).toEqual([]);
        expect(chat.shown().last).toEqual({ host: "claudeCode", model: "sonnet", resumable: false });
    });

    it("is read back by the next table of the campaign, and a session of another host is never taken up", () => {
        const first = opened();
        first.master.emit({ type: "session", session: "session-1", model: "claude-sonnet-5" });
        first.chat.close();

        const next = chatWith();
        expect(next.shown().last).toEqual({ host: "claudeCode", model: "claude-sonnet-5", resumable: true });
        next.open({ ...choice, effort: "low" });
        expect(masters[1].options.session).toBe("session-1");
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", effort: "low", session: "session-1" });

        writeLastChat(home, root, { root, host: "codex", model: "gpt", session: "codex-thread" });
        const third = chatWith();
        third.open(choice);
        expect(masters[2].options.session).toBeUndefined();
    });

    it("is none when its file does not read, names a host the engine does not know, or is another campaign's", () => {
        const file = tableFile(home, root, ".chat.json");
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "s" });
        expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ root, host: "claudeCode", model: "sonnet", session: "s" });
        writeFileSync(file, "{ not json");
        expect(readLastChat(home, root)).toBeUndefined();
        expect(chatWith().shown().last).toBeUndefined();
        writeFileSync(file, JSON.stringify({ root, host: "someHost", model: "m" }));
        expect(readLastChat(home, root)).toBeUndefined();
        writeFileSync(file, JSON.stringify({ root, host: "claudeCode", model: "" }));
        expect(readLastChat(home, root)).toBeUndefined();
        writeFileSync(file, JSON.stringify({ root: join(root, "other"), host: "claudeCode", model: "sonnet" }));
        expect(readLastChat(home, root)).toBeUndefined();

        for (const hostile of [{ model: "--dangerously-skip-permissions" }, { model: "sonnet", session: "--dangerously-skip-permissions" }, { model: "sonnet", session: "s".repeat(40_000) }, { model: "a\u0000b" }]) {
            writeFileSync(file, JSON.stringify({ root, host: "claudeCode", ...hostile }));
            expect(readLastChat(home, root), JSON.stringify(hostile).slice(0, 80)).toBeUndefined();
        }

        expect(readLastChat(home, join(root, "missing"))).toBeUndefined();
    });

    it("never throws where its file cannot be written", () => {
        const file = join(makeTempFolder(), "a-file");
        writeFileSync(file, "");
        expect(() => writeLastChat(file, root, { root, host: "claudeCode", model: "sonnet" })).not.toThrow();
        expect(readLastChat(file, root)).toBeUndefined();
    });
});
