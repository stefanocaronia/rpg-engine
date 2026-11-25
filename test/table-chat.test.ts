import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { HostId } from "../src/core/hosts.ts";
import type { MasterChat, MasterDriver, MasterEvent, MasterModel, MasterOptions, ModelsOptions } from "../src/master/index.ts";
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
    models: (options) => {
        asked.push(options);
        return Promise.resolve(listed);
    },
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
// The models the host lists, and every ask of them.
let listed: MasterModel[];
let asked: ModelsOptions[];

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
    listed = [];
    asked = [];
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
        const notReady = (id: string, name: string): object => ({ id, name, ready: false, found: false, model: "", efforts: [], models: [] });
        expect(chatWith().shown()).toEqual({
            hosts: [
                { id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: ["low", "high"], models: [] },
                notReady("codex", "Codex"),
                notReady("antigravity", "Antigravity"),
                notReady("openCode", "OpenCode"),
            ],
            messages: [],
            elsewhere: false,
        });
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

describe("what the engine tells the table's chat between the master's words", () => {
    const question = { id: "q1", text: "Do you open the door?", title: "The door", options: ["Yes", "No"] };
    const roll = { id: "r1", at: "2026-11-25T10:00:00.000Z", by: "player" as const, who: "Ettore", notation: "1d20", total: 12, text: "1d20 = 12", dice: [] };

    it("keeps a question after the master's words so far, what they write after it a new message, and how it ended: answered, or left", () => {
        const { chat, master } = opened();
        chat.say("I knock.");
        master.emit({ type: "text", block: 0, text: "Someone answers." });
        const before = changes;
        chat.askBegins(question);
        expect(changes).toBe(before + 1);
        expect(chat.shown().messages.at(-1)).toEqual({ id: 3, from: "asked", text: "Do you open the door?", title: "The door", options: ["Yes", "No"], state: "waiting" });
        master.emit({ type: "text", block: 0, text: "The handle turns." });
        const after = changes;
        chat.askEnds("other", "Yes");
        expect(changes).toBe(after);
        chat.askEnds("q1", "Yes");
        expect(changes).toBe(after + 1);
        chat.askBegins({ id: "q2", text: "Which square?", options: [] });
        chat.askEnds("q2");
        expect(chat.shown().messages).toEqual([
            { id: 1, from: "player", text: "I knock." },
            { id: 2, from: "master", text: "Someone answers." },
            { id: 3, from: "asked", text: "Do you open the door?", title: "The door", options: ["Yes", "No"], state: "answered", answer: "Yes" },
            { id: 4, from: "master", text: "The handle turns." },
            { id: 5, from: "asked", text: "Which square?", options: [], state: "left" },
        ]);
    });

    it("leaves a question still waiting when another takes its place", () => {
        const { chat } = opened();
        chat.askBegins(question);
        chat.askBegins({ ...question, id: "q2" });
        expect(chat.shown().messages.map((message) => message.from === "asked" && message.state)).toEqual(["left", "waiting"]);
    });

    it("keeps a roll the player may see as it is given, between the master's words", () => {
        const { chat, master } = opened();
        chat.say("I attack.");
        master.emit({ type: "text", block: 0, text: "Roll it." });
        chat.rolled("Ettore: 1d20 = 12", roll);
        master.emit({ type: "text", block: 0, text: "A hit." });
        expect(chat.shown().messages.slice(1)).toEqual([
            { id: 2, from: "master", text: "Roll it." },
            { id: 3, from: "roll", text: "Ettore: 1d20 = 12", roll },
            { id: 4, from: "master", text: "A hit." },
        ]);
    });

    it("keeps nothing with no chat open, and empties them with the rest on a chat opened anew, keeps them on one taken up", () => {
        const chat = chatWith();
        chat.askBegins(question);
        chat.rolled("Ettore: 1d20 = 12", roll);
        expect(chat.shown().messages).toEqual([]);
        expect(chat.open(choice)).toBeUndefined();
        masters[0].emit({ type: "session", session: "s1", model: "sonnet" });
        chat.rolled("Ettore: 1d20 = 12", roll);
        chat.close();
        expect(chat.open(choice)).toBeUndefined();
        expect(chat.shown().messages.map((message) => message.from)).toEqual(["roll"]);
        chat.close();
        expect(chat.open({ ...choice, fresh: true })).toBeUndefined();
        expect(chat.shown().messages).toEqual([]);
    });

    it("answers a question that takes words with the player's words, during the master's turn; one that takes none keeps them busy", () => {
        const { chat, master } = opened();
        const answered: string[] = [];
        chat.say("I knock.");
        chat.askBegins(question, (words) => {
            answered.push(words);
            chat.askEnds("q1", words);
        });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", state: "turn", answers: true });
        expect(chat.say("I wait a moment.\n\nWhat the character knows.", "I wait a moment.")).toBe("sent");
        expect(answered).toEqual(["I wait a moment.\n\nWhat the character knows."]);
        expect(master.sent).toEqual(["I knock."]);
        expect(chat.inTurn()).toBe(true);
        expect(chat.shown().chat?.answers).toBeUndefined();
        expect(chat.shown().messages.slice(1)).toEqual([
            { id: 2, from: "asked", text: "Do you open the door?", title: "The door", options: ["Yes", "No"], state: "answered", answer: "I wait a moment.\n\nWhat the character knows." },
            { id: 3, from: "player", text: "I wait a moment." },
        ]);

        chat.askBegins({ id: "q2", text: "Spend your dice.", options: ["Done"] });
        expect(chat.shown().chat?.answers).toBeUndefined();
        expect(chat.say("Words")).toBe("busy");
        chat.askEnds("q2", "Done");
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.say("Hello")).toBe("sent");
        expect(master.sent).toEqual(["I knock.", "Hello"]);
    });

    it("holds the limits for them too: 200 messages, each text cut at 200,000 characters, the roll kept whole", () => {
        const { chat } = opened();

        for (let count = 0; count < 210; count++) {
            chat.rolled(`Roll ${count}`, roll);
        }

        chat.askBegins({ id: "q", text: "q".repeat(250_000), title: "t".repeat(250_000), options: ["Yes"] });
        chat.askEnds("q", "a".repeat(250_000));
        chat.rolled("r".repeat(250_000), roll);
        const messages = chat.shown().messages;
        expect(messages).toHaveLength(200);
        const [asked, rolled] = messages.slice(-2);
        expect(asked).toMatchObject({ from: "asked", state: "answered" });
        expect(asked.from === "asked" && [asked.text.length, asked.title?.length, asked.answer?.length]).toEqual([200_000, 200_000, 200_000]);
        expect(rolled).toEqual({ id: 212, from: "roll", text: "r".repeat(200_000), roll });
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
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", effort: "low", flow: expect.any(String) as unknown });
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
        expect(chat.shown().last).toEqual({ host: "claudeCode", model: "sonnet", resumable: true });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", runs: "claude-sonnet-5", state: "idle" });
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
        expect(next.shown().last).toEqual({ host: "claudeCode", model: "sonnet", resumable: true });
        next.open({ ...choice, effort: "low" });
        expect(masters[1].options.session).toBe("session-1");
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", effort: "low", session: "session-1", flow: expect.any(String) as unknown });

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

describe("the models a host offers at the table", () => {
    const sonnet = { id: "sonnet", name: "Sonnet 5.5", about: "Most efficient for simpler tasks", efforts: ["low", "medium", "high"] };
    const haiku = { id: "haiku", name: "Haiku 4.5", efforts: [] };

    it("asks the host in the campaign's folder, with the driver's environment, and shows its models once they arrive", async () => {
        listed = [sonnet, haiku];
        const chat = chatWith();
        expect(chat.shown().hosts[0].models).toEqual([]);
        await new Promise((resolve) => setImmediate(resolve));
        expect(asked).toEqual([{ folder: root, program: { command: "claude-program", args: [] }, environment: { PATH: "/bin", DRIVER: "yes" } }]);
        expect(changes).toBe(1);
        expect(chat.shown().hosts[0].models).toEqual([sonnet, haiku]);
        expect(asked).toHaveLength(1);
    });

    it("asks no host that is not on this computer", async () => {
        found = false;
        expect(chatWith().shown().hosts[0].models).toEqual([]);
        await new Promise((resolve) => setImmediate(resolve));
        expect(asked).toEqual([]);
    });

    it("takes an effort of the model chosen, refuses one it does not take naming its own, and takes a model the host did not list", async () => {
        listed = [sonnet, haiku];
        const chat = chatWith();
        chat.shown();
        await new Promise((resolve) => setImmediate(resolve));
        expect(chat.open({ ...choice, effort: "max" })).toBe("Sonnet 5.5 takes no effort max in Claude Code: choose one of low, medium, high.");
        expect(chat.open({ ...choice, model: "haiku", effort: "low" })).toBe("Haiku 4.5 takes no effort in Claude Code: leave the effort to the host.");
        expect(masters).toEqual([]);
        expect(chat.open({ ...choice, effort: "medium" })).toBeUndefined();
        chat.close();
        expect(chat.open({ ...choice, model: "claude-sonnet-6", effort: "high" })).toBeUndefined();
        expect(masters.map((master) => [master.options.model, master.options.effort])).toEqual([["sonnet", "medium"], ["claude-sonnet-6", "high"]]);
    });
});

describe("the chat's flow in the campaign", () => {
    const question = { id: "q1", text: "Do you open the door?", title: "The door", options: ["Yes", "No"] };
    const roll = { id: "r1", at: "2026-11-25T10:00:00.000Z", by: "player" as const, who: "Ettore", notation: "1d20", total: 12, text: "1d20 = 12", dice: [] };
    const flowFolder = (): string => join(root, "sessions", "table-chats");
    const flowFiles = (): string[] => readdirSync(flowFolder()).sort();
    const flowLines = (name: string): Record<string, unknown>[] => readFileSync(join(flowFolder(), name), "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);

    it("writes each message once complete, a question as it begins and as it ends, and is read back in order by the next table's chat", () => {
        const { chat, master } = opened();
        chat.say("I knock.");
        master.emit({ type: "session", session: "session-1", model: "claude-sonnet-5" });
        master.emit({ type: "text", block: 0, text: "Someone " });
        master.emit({ type: "text", block: 0, text: "answers." });
        const [name] = flowFiles();
        expect(name).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}\.jsonl$/);
        expect(flowLines(name).map((line) => line.id)).toEqual([1]);
        chat.askBegins(question);
        master.emit({ type: "text", block: 0, text: "The handle turns." });
        chat.askEnds("q1", "Yes");
        chat.rolled("Ettore: 1d20 = 12", roll);
        master.emit({ type: "text", block: 0, text: "A hit." });
        master.emit({ type: "turnEnd", reason: "done" });
        chat.say("Go in");
        master.emit({ type: "text", block: 0, text: "Inside, " });
        chat.release();
        expect(flowLines(name).map((line) => [line.id, line.from])).toEqual([
            [1, "player"],
            [2, "master"],
            [3, "asked"],
            [3, "asked"],
            [4, "master"],
            [5, "roll"],
            [6, "master"],
            [undefined, undefined],
            [7, "player"],
            [8, "master"],
        ]);
        expect(flowLines(name)[7]).toMatchObject({ turn: "ended" });
        expect(flowLines(name)[0]).toEqual({ at: expect.stringMatching(/^\d{4}-.*Z$/) as unknown, id: 1, from: "player", text: "I knock." });
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", session: "session-1", flow: name });

        const next = chatWith();
        expect(next.shown().messages).toEqual([]);
        next.listened();
        expect(masters[1].options.session).toBe("session-1");
        expect(next.shown().messages).toEqual([
            { id: 1, from: "player", text: "I knock." },
            { id: 2, from: "master", text: "Someone answers." },
            { id: 3, from: "asked", text: "Do you open the door?", title: "The door", options: ["Yes", "No"], state: "answered", answer: "Yes" },
            { id: 4, from: "master", text: "The handle turns." },
            { id: 5, from: "roll", text: "Ettore: 1d20 = 12", roll },
            { id: 6, from: "master", text: "A hit." },
            { id: 7, from: "player", text: "Go in" },
            { id: 8, from: "master", text: "Inside, " },
        ]);
        // The table ended in the middle of the turn that "Go in" began.
        expect(next.shown().chat?.cutShort).toBe(true);
        next.say("Look around");
        expect(next.shown().chat?.cutShort).toBeUndefined();
        expect(next.shown().messages.at(-1)).toEqual({ id: 9, from: "player", text: "Look around" });
        expect(flowFiles()).toEqual([name]);
        expect(flowLines(name).at(-1)).toMatchObject({ id: 9, from: "player" });
    });

    it("keeps what the master wrote so far as the chat ends, and the player's words only once said", () => {
        const { chat, master } = opened();
        master.refuses = true;
        chat.say("Refused");
        master.refuses = false;
        chat.say("Hello");
        master.emit({ type: "text", block: 0, text: "Wel" });
        master.emit({ type: "ended", why: "gone" });
        expect(flowLines(flowFiles()[0]).map((line) => line.text)).toEqual(["Hello", "Wel"]);
    });

    it("starts a new file for a chat opened anew, the old one left as it was", () => {
        const { chat } = opened();
        chat.say("First chat");
        chat.close();
        const [first] = flowFiles();
        const before = readFileSync(join(flowFolder(), first), "utf8");
        expect(chat.open({ ...choice, fresh: true })).toBeUndefined();
        chat.say("Second chat");
        expect(flowFiles()).toHaveLength(2);
        expect(readFileSync(join(flowFolder(), first), "utf8")).toBe(before);
        const second = flowFiles().find((name) => name !== first) ?? "";
        expect(flowLines(second).map((line) => line.text)).toEqual(["Second chat"]);
        expect(readLastChat(home, root)?.flow).toBe(second);
    });

    it("skips a line that does not read, and shows a question still waiting as left", () => {
        mkdirSync(flowFolder(), { recursive: true });
        const lines = [
            JSON.stringify({ at: "x", id: 1, from: "player", text: "Hello" }),
            "{ not json",
            JSON.stringify({ id: 2, from: "someone", text: "?" }),
            JSON.stringify({ id: 3, from: "asked", text: "Which way?", options: [1], state: "waiting" }),
            JSON.stringify({ id: 4, from: "roll", text: "no roll" }),
            JSON.stringify({ id: 5, from: "asked", text: "Left or right?", options: ["Left"], state: "waiting" }),
            "",
        ];
        writeFileSync(join(flowFolder(), "2026-11-20 10-00-00.jsonl"), lines.join("\n"));
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "s", flow: "2026-11-20 10-00-00.jsonl" });
        const chat = chatWith();
        expect(chat.open(choice)).toBeUndefined();
        expect(chat.shown().messages).toEqual([
            { id: 1, from: "player", text: "Hello" },
            { id: 5, from: "asked", text: "Left or right?", options: ["Left"], state: "left" },
        ]);
        chat.say("Next");
        expect(chat.shown().messages.at(-1)?.id).toBe(6);
    });

    /** A chat taken up by a new table from a file of `lines`; the last choice names it, with a session. */
    function takenUp(lines: string): TableChat
    {
        mkdirSync(flowFolder(), { recursive: true });
        writeFileSync(join(flowFolder(), "2026-11-20 10-00-00.jsonl"), lines);
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "s", flow: "2026-11-20 10-00-00.jsonl" });
        const chat = chatWith();
        chat.listened();
        return chat;
    }

    const said = JSON.stringify({ id: 1, from: "player", text: "I open the chest." });
    const answered = JSON.stringify({ id: 2, from: "master", text: "It is empty." });
    const ended = JSON.stringify({ turn: "ended" });

    it("is not cut short where every turn ended, nor with no words of the player", () => {
        expect(takenUp(`${said}\n${answered}\n${ended}\n`).shown().chat?.cutShort).toBeUndefined();
        expect(takenUp(`${answered}\n`).shown().chat?.cutShort).toBeUndefined();
        expect(takenUp("").shown().chat?.cutShort).toBeUndefined();
    });

    it("is cut short where the player's last words have no end of a turn after them, even with some of the master's", () => {
        expect(takenUp(`${said}\n${answered}\n${ended}\n${JSON.stringify({ id: 3, from: "player", text: "Again." })}\n`).shown().chat).toMatchObject({ cutShort: true });
        expect(takenUp(`${said}\n${answered}\n`).shown().chat).toMatchObject({ cutShort: true });
    });

    it("is cut short where a question was left waiting: read as left, and written so the next time the file is written", () => {
        const question = JSON.stringify({ id: 2, from: "asked", text: "Which door?", options: ["Left", "Right"], state: "waiting" });
        const chat = takenUp(`${said}\n${question}\n`);
        expect(chat.shown().chat?.cutShort).toBe(true);
        expect(chat.shown().messages[1]).toEqual({ id: 2, from: "asked", text: "Which door?", options: ["Left", "Right"], state: "left" });
        expect(flowLines("2026-11-20 10-00-00.jsonl")).toHaveLength(2);
        chat.say("The left one.");
        expect(flowLines("2026-11-20 10-00-00.jsonl").slice(2)).toEqual([
            expect.objectContaining({ id: 2, from: "asked", state: "left" }),
            expect.objectContaining({ id: 3, from: "player", text: "The left one." }),
        ]);
        expect(chat.shown().chat?.cutShort).toBeUndefined();
    });

    it("is safe to cut anywhere: a last line torn in the middle is skipped, and the next line is written on a line of its own", () => {
        const whole = `${said}\n${answered}\n${ended}\n`;
        const torn = JSON.stringify({ id: 3, from: "player", text: "I climb the stairs." });
        const chat = takenUp(`${whole}${torn.slice(0, torn.length / 2)}`);
        expect(chat.shown().messages.map((message) => message.id)).toEqual([1, 2]);
        expect(chat.shown().chat?.cutShort).toBeUndefined();
        chat.say("I climb.");
        const text = readFileSync(join(flowFolder(), "2026-11-20 10-00-00.jsonl"), "utf8");
        expect(text.startsWith(whole)).toBe(true);
        expect(text.split("\n").at(-2)).toContain('"text":"I climb."');
        chat.release();
        expect(takenUp(text).shown().messages.map((message) => message.id)).toEqual([1, 2, 3]);
    });

    it("writes the turn's end after the player's words even where the host ends the turn while they are sent", () => {
        const { chat, master } = opened();

        master.send = () => {
            master.emit({ type: "turnEnd", reason: "failed", why: "No model" });
            return true;
        };

        chat.say("Hello");
        expect(flowLines(flowFiles()[0]).map((line) => line.text ?? line.turn)).toEqual(["No model", "Hello", "ended"]);
    });

    it("gives the page the last 200 messages of a longer file, which keeps them all", () => {
        mkdirSync(flowFolder(), { recursive: true });
        const lines = Array.from({ length: 250 }, (_, index) => JSON.stringify({ id: index + 1, from: index % 2 === 0 ? "player" : "master", text: `Line ${index + 1}` }));
        writeFileSync(join(flowFolder(), "2026-11-20 10-00-00.jsonl"), `${lines.join("\n")}\n`);
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "s", flow: "2026-11-20 10-00-00.jsonl" });
        const chat = chatWith();
        chat.open(choice);
        const messages = chat.shown().messages;
        expect(messages).toHaveLength(200);
        expect(messages[0]).toEqual({ id: 51, from: "player", text: "Line 51" });
        chat.say("More");
        expect(flowLines("2026-11-20 10-00-00.jsonl")).toHaveLength(251);
    });

    it("starts anew where the last chat's file is gone, and goes on where a message cannot be written", () => {
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "s", flow: "2026-11-20 10-00-00.jsonl" });
        const chat = chatWith();
        chat.open(choice);
        expect(chat.shown().messages).toEqual([]);
        chat.close();

        // A folder where the file would be: nothing is written, the chat goes on.
        mkdirSync(join(flowFolder(), "2026-11-20 10-00-00.jsonl"), { recursive: true });
        chat.open(choice);
        expect(chat.say("Hello")).toBe("sent");
        expect(chat.shown().messages).toEqual([{ id: 1, from: "player", text: "Hello" }]);
        expect(logged.some((line) => line.startsWith("The table could not keep a message of its chat in the campaign:"))).toBe(true);
    });
});

describe("the last chat taken up by itself", () => {
    beforeEach(() => {
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", effort: "low", session: "session-1" });
    });

    it("opens as the first page listens, with the last choice and its session, once a table, and sends the host nothing", () => {
        const chat = chatWith();
        expect(masters).toEqual([]);
        chat.listened();
        expect(masters).toHaveLength(1);
        expect(masters[0].options).toMatchObject({ model: "sonnet", effort: "low", session: "session-1" });
        expect(masters[0].sent).toEqual([]);
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", effort: "low", state: "idle" });
        chat.release();
        chat.listened();
        expect(masters).toHaveLength(1);
    });

    it("stays closed once the player closed it, at this table and the next, until they open one", () => {
        const chat = chatWith();
        chat.listened();
        chat.close();
        expect(readLastChat(home, root)).toMatchObject({ session: "session-1", closed: true });
        expect(chat.shown().last).toEqual({ host: "claudeCode", model: "sonnet", effort: "low", resumable: true });

        const next = chatWith();
        next.listened();
        expect(masters).toHaveLength(1);
        expect(next.open({ ...choice, effort: "low" })).toBeUndefined();
        expect(readLastChat(home, root)?.closed).toBeUndefined();
        next.release();
        chatWith().listened();
        expect(masters).toHaveLength(3);
    });

    it("opens nothing with a chat opened by hand, a program not found, or no session to take up; a host that refuses is logged", () => {
        elsewhere = true;
        chatWith().listened();
        elsewhere = false;
        found = false;
        chatWith().listened();
        found = true;
        expect(masters).toEqual([]);
        expect(logged).toEqual(["The table did not take up the campaign's last chat: Claude Code is not on this computer: install it, then try again."]);

        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet" });
        chatWith().listened();
        expect(masters).toEqual([]);
    });

    it("shows the chat ended and the form again where the host's session is gone, and does not try again", () => {
        const chat = chatWith();
        chat.listened();
        masters[0].emit({ type: "ended", why: "the host's program ended (exit code 1): No conversation found" });
        expect(chat.shown().chat?.state).toBe("ended");
        expect(chat.shown().last?.resumable).toBe(false);
        chat.listened();
        expect(masters).toHaveLength(1);
    });
});

describe("the last choice's file", () => {
    it("reads back its flow and whether the player closed it, an older file without them, and leaves out a flow that is no name of ours", () => {
        const file = tableFile(home, root, ".chat.json");
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "s", flow: "2026-11-25 21-04-17.jsonl", closed: true });
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", session: "s", flow: "2026-11-25 21-04-17.jsonl", closed: true });
        writeFileSync(file, JSON.stringify({ root, host: "claudeCode", model: "sonnet", effort: "low", session: "s" }));
        expect(readLastChat(home, root)).toEqual({ root, host: "claudeCode", model: "sonnet", effort: "low", session: "s" });

        for (const flow of ["../escape.jsonl", "a/b.jsonl", "notes.md", 7, ".jsonl"]) {
            writeFileSync(file, JSON.stringify({ root, host: "claudeCode", model: "sonnet", flow, closed: "yes" }));
            expect(readLastChat(home, root), String(flow)).toEqual({ root, host: "claudeCode", model: "sonnet" });
        }
    });
});
