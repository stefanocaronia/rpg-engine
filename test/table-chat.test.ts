import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { view } from "../src/commands/view/view.ts";
import type { Context } from "../src/core/context.ts";
import type { HostId } from "../src/core/hosts.ts";
import { FileStore, withFiles } from "../src/core/store.ts";
import type { MasterChat, MasterDriver, MasterEvent, MasterModel, MasterOptions, ModelsOptions } from "../src/master/index.ts";
import { type ChatShown, type TableChat, tableChat, type TableChatOptions } from "../src/server/table/chat.ts";
import { readFlow } from "../src/server/table/flow.ts";
import { readLastChat, writeLastChat } from "../src/server/table/last-chat.ts";
import { type ResolvedMarks, storyMarks } from "../src/server/table/marks.ts";
import { tableFile } from "../src/server/table/place.ts";
import { drivenHelpers } from "./fake-helpers.ts";
import { inPlay, makeTempFolder, testContext } from "./support.ts";

// The table's own chat with the master, against a host the test drives: no process.

/** A chat with the master the test drives: what it was sent, interrupted and closed, and the events it tells. */
interface FakeMaster extends MasterChat
{
    options: MasterOptions;
    sent: string[];
    interrupted: number;
    closed: boolean;
    /** Whether it was closed gently, its program let go to end by itself. */
    gently?: boolean;
    /** Whether send says no, as while the host's turn runs; the models asked in the open chat, and whether it takes them. */
    refuses: boolean;
    changed: string[];
    takesModels: boolean;
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
        changed: [],
        takesModels: true,
        send: (text) => {
            if (fake.refuses) {
                return false;
            }

            fake.sent.push(text);
            return true;
        },
        onEvent: (given) => (listener = given),
        interrupt: () => fake.interrupted++,
        close: (gently) => {
            fake.closed = true;
            fake.gently = gently === true;
        },
        emit: (event) => listener?.(event),
        // A driver whose model changes in an open chat, where the test says so.
        ...(changing
            ? {
                setModel: (model: string, effort?: string): boolean => {
                    fake.changed.push(`${model} ${effort ?? "-"}`);
                    return fake.takesModels;
                },
            }
            : {}),
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
// Whether the fake masters change their model in an open chat.
let changing: boolean;

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
    changing = false;
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

/** A chat opened once the page showed the hosts and their models arrived: the models of an open chat's host are never asked meanwhile. */
async function openedKnowing(overrides: Partial<TableChatOptions> = {}): Promise<{ chat: TableChat; master: FakeMaster; }>
{
    const chat = chatWith(overrides);
    chat.shown();
    await settle();
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

    it("opens the host's program in the campaign, with the tools of the table, none that reads a file, the driver's environment and a token of its own", () => {
        const { chat, master } = opened();
        expect(master.options).toEqual({
            folder: root,
            program: { command: "claude-program", args: [] },
            model: "sonnet",
            allowed: ["rpg", "web", "fetch", "agent", "image"],
            environment: { PATH: "/bin", DRIVER: "yes", RPG_TABLE_MASTER: "token-1" },
            failed: expect.any(Function) as unknown,
            log: expect.any(Function) as unknown,
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
        // Every host of the registry has a driver: this one is left out by the drivers the test gives, while the hosts offered are still the registry's.
        expect(chat.open({ host: "codex", model: "gpt" })).toBe("The page cannot open a chat with Codex yet: choose Claude Code or Codex or Antigravity or OpenCode.");
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
        // A turn that ends with nothing written says so on the page.
        expect(chat.shown().messages).toEqual([
            { id: 1, from: "player", text: "Open the door" },
            { id: 2, from: "table", text: "The master ended its turn without writing anything. Write to it again." },
        ]);
    });

    it("writes to the master once to go on, where its turn ends without a word after a tool it was refused, the player's turn going on, unseen", () => {
        const { chat, master } = opened();
        chat.say("Climb the wall");
        master.emit({ type: "permission", name: "run_command", kind: "shell", allowed: false });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(master.sent).toEqual(["Climb the wall", "The table refused run_command: you cannot use it here. Go on with the game's commands, and answer the player."]);
        expect(chat.inTurn()).toBe(true);
        expect(idles).toBe(0);
        expect(chat.shown().messages).toEqual([{ id: 1, from: "player", text: "Climb the wall" }]);
        master.emit({ type: "text", block: 0, text: "The wall is slick." });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.inTurn()).toBe(false);
        expect(chat.shown().messages).toEqual([{ id: 1, from: "player", text: "Climb the wall" }, { id: 2, from: "master", text: "The wall is slick." }]);
        // In the campaign's file, the player's turn ends once, after the master's words.
        const folder = join(root, "sessions", "table-chats");
        const lines = readFileSync(join(folder, readdirSync(folder)[0]), "utf8").trim().split("\n");
        expect(lines.map((line) => JSON.parse(line) as Record<string, unknown>).map((line) => line.from ?? line.turn)).toEqual(["player", "master", "ended"]);
    });

    it("says which tool the master was refused, where its turn ends without a word after it once more; nothing where it wrote", () => {
        const { chat, master } = opened();
        chat.say("Climb the wall");
        master.emit({ type: "permission", name: "run_command", kind: "shell", allowed: false });
        master.emit({ type: "turnEnd", reason: "done" });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(master.sent).toHaveLength(2);
        expect(chat.shown().messages.at(-1)).toEqual({
            id: 2,
            from: "table",
            text: "The master ended its turn without writing anything. Write to it again. It tried to use run_command, which the master may not use here.",
        });

        chat.say("Again");
        master.emit({ type: "text", block: 0, text: "You climb." });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.shown().messages.at(-1)).toEqual({ id: 4, from: "master", text: "You climb." });
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

    it("runs a turn the host begins by itself: its words a new message, the player's refused meanwhile, and its end never said empty nor followed", () => {
        const { chat, master } = opened();
        chat.say("Ask Bertoldo");
        master.emit({ type: "text", block: 0, text: "You ask him." });
        master.emit({ type: "turnEnd", reason: "done" });
        master.emit({ type: "turnStart", by: "host" });
        expect(chat.inTurn()).toBe(true);
        expect(chat.shown().chat?.state).toBe("turn");
        expect(chat.say("And?")).toBe("busy");
        master.emit({ type: "text", block: 0, text: "Bertoldo shrugs." });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.inTurn()).toBe(false);
        expect(idles).toBe(2);

        // One with no words, even after a tool it was refused: nothing for the page, nothing to the master.
        master.emit({ type: "turnStart", by: "host" });
        master.emit({ type: "permission", name: "run_command", kind: "shell", allowed: false });
        chat.stop();
        expect(master.interrupted).toBe(1);
        master.emit({ type: "turnEnd", reason: "done" });
        expect(master.sent).toEqual(["Ask Bertoldo"]);
        expect(idles).toBe(3);
        expect(chat.shown().messages).toEqual([
            { id: 1, from: "player", text: "Ask Bertoldo" },
            { id: 2, from: "master", text: "You ask him." },
            { id: 3, from: "master", text: "Bertoldo shrugs." },
        ]);
        const folder = join(root, "sessions", "table-chats");
        const lines = readFileSync(join(folder, readdirSync(folder)[0]), "utf8").trim().split("\n");
        expect(lines.map((line) => JSON.parse(line) as Record<string, unknown>).map((line) => line.from ?? line.turn)).toEqual(["player", "master", "ended", "master", "ended", "ended"]);

        // The player's next turn is followed and said empty as ever.
        chat.say("Again");
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.shown().messages.at(-1)).toEqual({ id: 5, from: "table", text: "The master ended its turn without writing anything. Write to it again." });
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
        expect(chat.shown().messages).toHaveLength(2);
        // Taken up, with nothing said in it yet: the page offers to ask where the story stands, until the player says something.
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", takenUp: true, state: "idle" });
        chat.say("Where were we?");
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", state: "turn" });
        masters[1].emit({ type: "turnEnd", reason: "done" });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", state: "idle" });
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

    it("asks the host in the campaign's folder, with the driver's environment and no rpg server of its own, and shows its models once they arrive", async () => {
        listed = [sonnet, haiku];
        const chat = chatWith();
        expect(chat.shown().hosts[0].models).toEqual([]);
        await new Promise((resolve) => setImmediate(resolve));
        expect(asked).toEqual([{ folder: root, program: { command: "claude-program", args: [] }, environment: { PATH: "/bin", DRIVER: "yes", RPG_HELPER: "1" }, log: expect.any(Function) as unknown }]);
        expect(changes).toBe(1);
        expect(chat.shown().hosts[0].models).toEqual([sonnet, haiku]);
        expect(asked).toHaveLength(1);

        // What the host's program said of itself reaches the table's log with the time and the host's name.
        asked[0].log?.("started for its models (process 42).");
        expect(logged.at(-1)).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z Claude Code started for its models \(process 42\)\.$/);
    });

    it("asks a host's models again once its account changed, as after the player signed in: a list that came empty does not wait ten minutes", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        const chat = chatWith({ helpers });
        chat.shown();
        await settle();
        chat.shown();
        await settle();
        expect(asked).toHaveLength(1);

        listed = [{ id: "opus", name: "Opus 5.5", efforts: [] }];
        expect(chat.hostWish({ signIn: { host: "claudeCode" } })).toBeUndefined();
        helpers.states.claude = "ready";
        helpers.endLogin("claude", { state: "done" });
        await settle();
        chat.shown();
        await settle();
        expect(asked).toHaveLength(2);
        expect(chat.shown().hosts.find((host) => host.id === "claudeCode")?.models).toEqual(listed);
    });

    it("never asks the models of the host whose chat is open or opening, only those known; the other hosts' as always", async () => {
        const codex: MasterDriver = { ...driver, program: () => ({ command: "codex-program", args: [] }) };
        const chat = chatWith({ driver: (host) => (host === "claudeCode" ? driver : host === "codex" ? codex : undefined) });
        expect(chat.open(choice)).toBeUndefined();
        chat.shown();
        await settle();
        expect(asked.map((one) => one.program.command)).toEqual(["codex-program"]);

        // Closed: the host's models are asked as always.
        chat.close();
        chat.shown();
        await settle();
        expect(asked.map((one) => one.program.command)).toEqual(["codex-program", "claude-program"]);
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

    it("writes each message once complete, a question as it begins and as it ends, and is read back in order by the next table's chat", async () => {
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
        await listen(next);
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
    async function takenUp(lines: string): Promise<TableChat>
    {
        mkdirSync(flowFolder(), { recursive: true });
        writeFileSync(join(flowFolder(), "2026-11-20 10-00-00.jsonl"), lines);
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "s", flow: "2026-11-20 10-00-00.jsonl" });
        const chat = chatWith();
        await listen(chat);
        return chat;
    }

    const said = JSON.stringify({ id: 1, from: "player", text: "I open the chest." });
    const answered = JSON.stringify({ id: 2, from: "master", text: "It is empty." });
    const ended = JSON.stringify({ turn: "ended" });

    it("is not cut short where every turn ended, nor with no words of the player", async () => {
        expect((await takenUp(`${said}\n${answered}\n${ended}\n`)).shown().chat?.cutShort).toBeUndefined();
        expect((await takenUp(`${answered}\n`)).shown().chat?.cutShort).toBeUndefined();
        expect((await takenUp("")).shown().chat?.cutShort).toBeUndefined();
    });

    it("is cut short where the player's last words have no end of a turn after them, even with some of the master's", async () => {
        expect((await takenUp(`${said}\n${answered}\n${ended}\n${JSON.stringify({ id: 3, from: "player", text: "Again." })}\n`)).shown().chat).toMatchObject({ cutShort: true });
        expect((await takenUp(`${said}\n${answered}\n`)).shown().chat).toMatchObject({ cutShort: true });
    });

    it("is cut short where a question was left waiting: read as left, and written so the next time the file is written", async () => {
        const question = JSON.stringify({ id: 2, from: "asked", text: "Which door?", options: ["Left", "Right"], state: "waiting" });
        const chat = await takenUp(`${said}\n${question}\n`);
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

    it("is safe to cut anywhere: a last line torn in the middle is skipped, and the next line is written on a line of its own", async () => {
        const whole = `${said}\n${answered}\n${ended}\n`;
        const torn = JSON.stringify({ id: 3, from: "player", text: "I climb the stairs." });
        const chat = await takenUp(`${whole}${torn.slice(0, torn.length / 2)}`);
        expect(chat.shown().messages.map((message) => message.id)).toEqual([1, 2]);
        expect(chat.shown().chat?.cutShort).toBeUndefined();
        chat.say("I climb.");
        const text = readFileSync(join(flowFolder(), "2026-11-20 10-00-00.jsonl"), "utf8");
        expect(text.startsWith(whole)).toBe(true);
        expect(text.split("\n").at(-2)).toContain('"text":"I climb."');
        chat.release();
        expect((await takenUp(text)).shown().messages.map((message) => message.id)).toEqual([1, 2, 3]);
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

    it("opens as the first page listens, with the last choice and its session, once a table, and sends the host nothing", async () => {
        const chat = chatWith();
        expect(masters).toEqual([]);
        await listen(chat);
        expect(masters).toHaveLength(1);
        expect(masters[0].options).toMatchObject({ model: "sonnet", effort: "low", session: "session-1" });
        expect(masters[0].sent).toEqual([]);
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", effort: "low", takenUp: true, state: "idle" });
        chat.release();
        await listen(chat);
        expect(masters).toHaveLength(1);
    });

    it("asks its host's models first where none are known, opens once they came, failed or empty too, and the page has them", async () => {
        const sonnet = { id: "sonnet", name: "Sonnet 5.5", efforts: ["low", "high"] };
        let answer: (models: MasterModel[]) => void = () => expect.fail("the models were not asked");
        const waited: MasterDriver = {
            ...driver,
            models: (options) => {
                asked.push(options);
                return new Promise((resolve) => (answer = resolve));
            },
        };
        const chat = chatWith({ driver: (host) => (host === "claudeCode" ? waited : undefined) });
        await listen(chat);
        expect(asked).toHaveLength(1);
        expect(masters).toEqual([]);
        // The page looks meanwhile: the models are not asked twice.
        chat.shown();
        expect(asked).toHaveLength(1);
        answer([sonnet]);
        await settle();
        expect(masters).toHaveLength(1);
        expect(masters[0].options).toMatchObject({ model: "sonnet", session: "session-1" });
        expect(chat.shown().hosts[0].models).toEqual([sonnet]);
        expect(asked).toHaveLength(1);

        // An answer that fails opens it as well.
        const failing = { ...driver, models: () => Promise.reject(new Error("the host failed")) };
        chat.release();
        const next = chatWith({ driver: (host) => (host === "claudeCode" ? failing : undefined) });
        await listen(next);
        expect(masters).toHaveLength(2);

        // Models known already, as the page looked before it listened: it opens at once, asking nothing more.
        listed = [sonnet];
        next.release();
        const knowing = chatWith();
        knowing.shown();
        await settle();
        asked = [];
        knowing.listened();
        expect(masters).toHaveLength(3);
        expect(asked).toEqual([]);
    });

    it("is not taken up where the player opened or closed a chat, or the table let it go, while its host's models were asked", async () => {
        let answers: ((models: MasterModel[]) => void)[] = [];
        const waited = { ...driver, models: () => new Promise<MasterModel[]>((resolve) => answers.push(resolve)) };
        const waiting = (): TableChat => chatWith({ driver: (host) => (host === "claudeCode" ? waited : undefined) });

        const opening = waiting();
        opening.listened();
        expect(opening.open({ ...choice, fresh: true })).toBeUndefined();
        answers.forEach((answer) => answer([]));
        await settle();
        expect(masters).toHaveLength(1);
        expect(masters[0].options.session).toBeUndefined();
        opening.close();

        // Let go by the table, as it ends, while the models were asked.
        answers = [];
        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet", session: "session-1" });
        const released = waiting();
        released.listened();
        released.release();
        answers.forEach((answer) => answer([]));
        await settle();
        expect(masters).toHaveLength(1);

        // A chat opened by hand sat at the table meanwhile.
        answers = [];
        const byHand = waiting();
        byHand.listened();
        elsewhere = true;
        answers.forEach((answer) => answer([]));
        await settle();
        expect(masters).toHaveLength(1);
    });

    it("stays closed once the player closed it, at this table and the next, until they open one", async () => {
        const chat = chatWith();
        await listen(chat);
        chat.close();
        // The player's close lets its program end by itself too, as the table's own: one saving the player's login is never stopped at once.
        expect(masters[0]).toMatchObject({ closed: true, gently: true });
        expect(readLastChat(home, root)).toMatchObject({ session: "session-1", closed: true });
        expect(chat.shown().last).toEqual({ host: "claudeCode", model: "sonnet", effort: "low", resumable: true });

        const next = chatWith();
        next.listened();
        expect(masters).toHaveLength(1);
        expect(next.open({ ...choice, effort: "low" })).toBeUndefined();
        expect(readLastChat(home, root)?.closed).toBeUndefined();
        next.release();
        expect(masters[1]).toMatchObject({ closed: true, gently: true });
        await listen(chatWith());
        expect(masters).toHaveLength(3);
    });

    it("opens nothing with a chat opened by hand, a program not found, or no session to take up; a host that refuses is logged", async () => {
        elsewhere = true;
        await listen(chatWith());
        elsewhere = false;
        found = false;
        await listen(chatWith());
        found = true;
        expect(masters).toEqual([]);
        expect(logged).toEqual(["The table did not take up the campaign's last chat: Claude Code is not on this computer: install it, then try again."]);

        writeLastChat(home, root, { root, host: "claudeCode", model: "sonnet" });
        await listen(chatWith());
        expect(masters).toEqual([]);
    });

    it("shows the chat ended and the form again where the host's session is gone, and does not try again", async () => {
        const chat = chatWith();
        await listen(chat);
        masters[0].emit({ type: "ended", why: "the host's program ended (exit code 1): No conversation found" });
        expect(chat.shown().chat?.state).toBe("ended");
        expect(chat.shown().last?.resumable).toBe(false);
        await listen(chat);
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

describe("the player's rolls the master has not told in its words yet", () => {
    const roll = { id: "3cbdb056", at: "2026-11-25T10:00:00.000Z", by: "player" as const, who: "Ettore", check: "Shield", notation: "2d6", total: 4, text: "2d6 = 4", dice: [] };

    it("knows a roll of the player's untold, once its mark was handed out, until the master's words, written or being written, hold its mark", () => {
        const { chat, master } = opened();
        chat.say("I raise my shield.");
        master.emit({ type: "text", block: 0, text: "The blow falls." });
        expect(chat.untold()).toBeUndefined();
        chat.rolled("Ettore, Shield: 2d6 = 4", roll);
        chat.owed("3cbdb056");
        master.emit({ type: "text", block: 0, text: " The shield shakes, 4 on the dice." });
        expect(chat.untold()).toEqual({ id: "3cbdb056", check: "Shield" });
        master.emit({ type: "text", block: 0, text: " It holds [roll 3cbdb056]" });
        expect(chat.untold()).toBeUndefined();
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.untold()).toBeUndefined();
    });

    it("never counts a roll of the player's whose mark no command handed the master, as the dice of a rest or a package's roll", () => {
        const { chat } = opened();
        chat.say("We rest.");
        chat.rolled("Ettore, Stamina: 1d6 = 4", roll);
        expect(chat.untold()).toBeUndefined();
        chat.owed("aaaa0009");
        expect(chat.untold()).toBeUndefined();
    });

    it("gives the first untold, without a check where the roll has none, and never counts the master's own rolls", () => {
        const { chat, master } = opened();
        chat.say("I attack.");
        chat.rolled("Wolf: 1d20 = 15", { ...roll, id: "aaaa0001", by: "master", check: "Bite" });
        chat.owed("aaaa0001");
        expect(chat.untold()).toBeUndefined();
        const { check: _check, ...unnamed } = roll;
        chat.rolled("Ettore: 2d6 = 4", { ...unnamed, id: "aaaa0002" });
        chat.rolled("Ettore: 2d6 = 4", { ...roll, id: "aaaa0003" });
        chat.owed("aaaa0002");
        chat.owed("aaaa0003");
        expect(chat.untold()).toEqual({ id: "aaaa0002" });
        master.emit({ type: "text", block: 0, text: "The first blow glances off your shield [roll aaaa0002], then" });
        expect(chat.untold()).toEqual({ id: "aaaa0003", check: "Shield" });
    });

    it("gives the same roll three times at most: the fourth time it gives nothing, and the roll is no longer owed", () => {
        const { chat } = opened();
        chat.say("I attack.");
        chat.rolled("Ettore, Shield: 2d6 = 4", roll);
        chat.rolled("Ettore: 2d6 = 4", { ...roll, id: "aaaa0002" });
        chat.owed("3cbdb056");
        chat.owed("aaaa0002");
        expect([chat.untold(), chat.untold(), chat.untold()]).toEqual(Array(3).fill({ id: "3cbdb056", check: "Shield" }));
        expect(chat.untold()).toBeUndefined();
        expect([chat.untold(), chat.untold(), chat.untold()]).toEqual(Array(3).fill({ id: "aaaa0002", check: "Shield" }));
        expect(chat.untold()).toBeUndefined();
        expect(chat.untold()).toBeUndefined();
    });

    it("reads the mark whatever its case and spaces, with a colon after roll or a backslash before each bracket", () => {
        for (
            const text of [
                "The blow lands and your shield holds \\[roll 3cbdb056\\]",
                "The blow lands and your shield holds [roll: 3cbdb056]",
                "The blow lands and your shield holds [Roll  3cbdb056 ]",
                "The blow lands and your shield holds [ROLL:3cbdb056]",
            ]
        ) {
            const { chat, master } = opened();
            chat.say("I raise my shield.");
            chat.rolled("Ettore, Shield: 2d6 = 4", roll);
            chat.owed("3cbdb056");
            master.emit({ type: "text", block: 0, text });
            expect(chat.untold(), text).toBeUndefined();
        }

        const { chat, master } = opened();
        chat.say("I raise my shield.");
        chat.rolled("Ettore, Shield: 2d6 = 4", roll);
        chat.owed("3cbdb056");
        master.emit({ type: "text", block: 0, text: "It holds [roll 3cbdb05] [roll3cbdb056]" });
        expect(chat.untold()).toEqual({ id: "3cbdb056", check: "Shield" });
    });

    it("takes no mark alone for a roll told: the message that holds it has a few words of story too", () => {
        const { chat, master } = opened();
        chat.say("I raise my shield.");
        chat.rolled("Ettore, Shield: 2d6 = 4", roll);
        chat.owed("3cbdb056");
        master.emit({ type: "text", block: 0, text: "[roll 3cbdb056]" });
        expect(chat.untold()).toEqual({ id: "3cbdb056", check: "Shield" });
        master.emit({ type: "text", block: 0, text: " It holds." });
        expect(chat.untold()).toEqual({ id: "3cbdb056", check: "Shield" });
        master.emit({ type: "text", block: 0, text: " The club slides off the rim and the brigand stumbles past you." });
        expect(chat.untold()).toBeUndefined();
    });

    it("keeps a roll owed through a turn the host begins by itself, which goes on the player's turn", () => {
        const { chat, master } = opened();
        chat.say("I raise my shield.");
        chat.rolled("Ettore, Shield: 2d6 = 4", roll);
        chat.owed("3cbdb056");
        master.emit({ type: "text", block: 0, text: "The blow falls." });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.untold()).toBeUndefined();
        master.emit({ type: "turnStart", by: "host" });
        expect(chat.untold()).toEqual({ id: "3cbdb056", check: "Shield" });
        master.emit({ type: "text", block: 0, text: "Your shield holds and the brigand stumbles past you [roll 3cbdb056]" });
        expect(chat.untold()).toBeUndefined();
    });

    it("forgets the rolls of the turns before as the player speaks again, and knows none with no turn running or no chat", () => {
        const { chat, master } = opened();
        chat.say("I raise my shield.");
        chat.rolled("Ettore, Shield: 2d6 = 4", roll);
        chat.owed("3cbdb056");
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.untold()).toBeUndefined();
        chat.say("And now?");
        expect(chat.untold()).toBeUndefined();
        chat.close();
        expect(chat.untold()).toBeUndefined();
        expect(chatWith().untold()).toBeUndefined();
    });
});

/** Lets the promises settled so far run their callbacks. */
async function settle(): Promise<void>
{
    await new Promise((done) => setTimeout(done, 0));
}

/** The first page listens, and the chat it takes up opens once its host's models came. */
async function listen(chat: TableChat): Promise<void>
{
    chat.listened();
    await settle();
}

describe("the hosts' accounts at the table", () => {
    it("come with each host the page shows: its account, how it signs in and installs; none without the programs to ask", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        const chat = chatWith({ helpers });
        chat.shown();
        await settle();
        const hosts = chat.shown().hosts;
        expect(hosts.find((host) => host.id === "claudeCode")).toMatchObject({ found: true, account: "out", signIn: "page", install: { page: "https://code.claude.com/docs/en/setup", engine: true } });
        expect(hosts.find((host) => host.id === "antigravity")).toMatchObject({ account: "unknown", install: { page: "https://antigravity.google/download" } });
        expect(hosts.find((host) => host.id === "antigravity")).not.toHaveProperty("signIn");
        expect(chatWith().shown().hosts.find((host) => host.id === "claudeCode")).not.toHaveProperty("account");
    });

    it("never starts a host the player is not signed in to: refused with the sign-in's code, and the accounts looked at again", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        let clock = 0;
        const chat = chatWith({ helpers, now: () => clock });
        chat.shown();
        await settle();
        const looks = helpers.asked.length;
        // Signed in since, elsewhere, a minute after the last look: the first try is refused as it was known, and has the account looked at again.
        helpers.states.claude = "ready";
        clock = 61_000;

        expect(chat.open(choice)).toEqual({ error: "Claude Code is not signed in on this computer: sign in here, then open the chat.", code: "signin" });
        expect(masters).toEqual([]);
        expect(helpers.asked.length).toBeGreaterThan(looks);
        await settle();
        expect(chat.open(choice)).toBeUndefined();
        expect(masters).toHaveLength(1);
    });

    it("opens a chat signed out where its environment holds a key the account's status was asked without: the host says it, if it must", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        const chat = chatWith({ helpers, environment: { PATH: "/bin", ANTHROPIC_API_KEY: "a key" } });
        chat.shown();
        await settle();
        expect(chat.open(choice)).toBeUndefined();
        expect(masters[0].options.environment).toMatchObject({ ANTHROPIC_API_KEY: "a key" });
    });

    it("shows an app signed in with an API key as paid by the answer", async () => {
        const chat = chatWith({ helpers: drivenHelpers({ claude: "api key" }, true) });
        chat.shown();
        await settle();
        expect(chat.shown().hosts.find((host) => host.id === "claudeCode")).toMatchObject({ account: "in", metered: true });
    });

    it("names a trace to the chat where its environment asks one, never to the host's process nor to the host asked its models", async () => {
        const trace = join(makeTempFolder(), "trace.jsonl");
        const { master } = await openedKnowing({ environment: { PATH: "/bin", RPG_MASTER_TRACE: trace } });
        expect(master.options.trace).toBe(trace);
        expect(master.options.environment).not.toHaveProperty("RPG_MASTER_TRACE");
        expect(asked.at(-1)?.environment).not.toHaveProperty("RPG_MASTER_TRACE");
    });

    it("opens a chat while the account is not known yet: the host says it, if it must", () => {
        const chat = chatWith({ helpers: drivenHelpers({ claude: "logged out" }) });
        expect(chat.open(choice)).toBeUndefined();
    });

    it("signs in, cancels, installs and looks again as the page asks; never installs a host that is here, and says so without the programs", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        let clock = 0;
        const chat = chatWith({ helpers, now: () => clock });

        expect(chat.hostWish({ signIn: { host: "claudeCode" } })).toBeUndefined();
        await settle();
        expect(chat.shown().hosts.find((host) => host.id === "claudeCode")).toMatchObject({ signingIn: true, signInLink: "https://auth.example/claude" });
        expect(chat.hostWish({ signIn: { host: "claudeCode", cancel: true } })).toBeUndefined();
        expect(chat.shown().hosts.find((host) => host.id === "claudeCode")).not.toHaveProperty("signInLink");
        expect(chat.hostWish({ signIn: { host: "antigravity" } })).toMatch(/^Antigravity signs in from its own app/);

        expect(chat.hostWish({ install: { host: "claudeCode" } })).toBe("Claude Code is on this computer already: choose it, and open the chat.");
        found = false;
        clock = 5000;
        expect(chat.shown().hosts.find((host) => host.id === "claudeCode")?.found).toBe(false);
        expect(chat.hostWish({ install: { host: "claudeCode" } })).toBeUndefined();
        // Installed: whether it is here is looked at again at once, though the clock did not move.
        found = true;
        helpers.endInstall("claude", undefined);
        await settle();
        expect(chat.shown().hosts.find((host) => host.id === "claudeCode")?.found).toBe(true);

        // Asked again by the page a minute after the last look.
        clock = 70_000;
        const before = helpers.asked.filter((one) => one.startsWith("look")).length;
        expect(chat.hostWish({ hosts: true })).toBeUndefined();
        expect(helpers.asked.filter((one) => one.startsWith("look")).length).toBeGreaterThan(before);
        expect(helpers.asked).toEqual(expect.arrayContaining(["login claude", "cancel claude", "install claude"]));

        expect(chatWith().hostWish({ hosts: true })).toBe("This table cannot sign in to the AI apps or install them: start it again with rpg table in the campaign's folder, then try again.");
    });

    it("keeps the sign-in's code of a chat that ended so, and looks at the accounts again", async () => {
        const helpers = drivenHelpers({ claude: "ready" }, true);
        const { chat, master } = opened({ helpers });
        await settle();
        const looks = helpers.asked.length;
        chat.say("Hello");
        master.emit({ type: "turnEnd", reason: "failed", why: "Claude Code is not signed in on this computer: sign in here, then open the chat", code: "signin" });
        master.emit({ type: "ended", why: "Claude Code is not signed in on this computer: sign in here, then open the chat", code: "signin" });

        expect(chat.shown().chat).toMatchObject({ state: "ended", code: "signin" });
        expect(chat.shown().messages.at(-1)).toMatchObject({ from: "table", text: "Claude Code is not signed in on this computer: sign in here, then open the chat" });
        expect(helpers.asked.length).toBeGreaterThan(looks);
    });

    it("never looks at the host's account as its chat opens nor while it is open, the other hosts' as the page asks: the chat tells by itself", async () => {
        const helpers = drivenHelpers({ claude: "ready", codex: "ready" }, true);
        let clock = 0;
        const chat = chatWith({ helpers, now: () => clock });
        expect(chat.open(choice)).toBeUndefined();
        await settle();
        expect(helpers.asked).toEqual([]);

        clock = 120_000;
        chat.shown();
        expect(chat.hostWish({ hosts: true })).toBeUndefined();
        await settle();
        expect(helpers.asked).toEqual(["look codex"]);
    });
});

describe("another model in the open chat", () => {
    beforeEach(() => {
        changing = true;
        listed = [{ id: "opus", name: "Opus 5.5", efforts: ["low", "high"] }, { id: "haiku", name: "Haiku", efforts: [] }];
    });

    it("takes any effort for a model whose efforts the host says only once it is chosen; forgets one the host left out, and shows those it takes", async () => {
        listed = [{ id: "opus", name: "Opus 5.5", efforts: [] }, { id: "haiku", name: "Haiku", efforts: [] }];
        const chat = chatWith({ driver: (host) => (host === "claudeCode" ? { ...driver, effortsOnceChosen: true } : undefined) });
        chat.shown();
        await settle();
        expect(chat.open({ ...choice, model: "opus", effort: "max" })).toBeUndefined();
        const master = masters[0];
        master.emit({ type: "session", session: "s-1", model: "opus", efforts: ["low", "high"] });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "opus", runs: "opus", efforts: ["low", "high"], state: "idle", changes: true });
        expect(readLastChat(home, root)).not.toHaveProperty("effort");

        expect(chat.changeModel("haiku", "high")).toBeUndefined();
        master.emit({ type: "session", session: "s-1", model: "haiku", efforts: ["high"] });
        expect(chat.shown().chat).toMatchObject({ model: "opus", efforts: ["low", "high"] });
        master.emit({ type: "changeTaken", model: "haiku" });
        expect(chat.shown().chat).toMatchObject({ model: "haiku", effort: "high", efforts: ["high"] });
        expect(readLastChat(home, root)).toMatchObject({ model: "haiku", effort: "high" });
    });

    it("is asked of the host between turns: the chat, the campaign's last choice and its flow follow, and the page reads that it changes", async () => {
        const { chat, master } = await openedKnowing();
        expect(chat.shown().chat).toMatchObject({ changes: true });
        master.emit({ type: "session", session: "s-1", model: "claude-sonnet-5" });

        expect(chat.changeModel("opus", "high")).toBeUndefined();
        expect(master.changed).toEqual(["opus high"]);
        // Until the host takes it, the chat, the campaign's last choice and the flow say the model it runs, never the one asked.
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", runs: "claude-sonnet-5", state: "idle", changes: true });
        expect(readLastChat(home, root)).toMatchObject({ model: "sonnet", session: "s-1" });
        const line = "From now on the master plays with Opus 5.5, effort high.";
        expect(chat.shown().messages).toEqual([]);
        master.emit({ type: "changeTaken", model: "opus" });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "opus", effort: "high", state: "idle", changes: true });
        expect(readLastChat(home, root)).toMatchObject({ model: "opus", effort: "high", session: "s-1" });
        expect(chat.shown().messages.at(-1)).toMatchObject({ from: "table", text: line });
        const flow = readLastChat(home, root)?.flow;
        expect(flow === undefined ? [] : readFlow(root, flow, 50).messages.map((message) => message.text)).toContain(line);

        // Its own name for it, once the host confirms it; then a model with no effort drops the effort.
        master.emit({ type: "session", session: "s-1", model: "claude-opus-5" });
        expect(chat.shown().chat?.runs).toBe("claude-opus-5");
        expect(chat.changeModel("haiku")).toBeUndefined();
        master.emit({ type: "changeTaken", model: "haiku" });
        expect(chat.shown().chat).not.toHaveProperty("effort");
        expect(readLastChat(home, root)).not.toHaveProperty("effort");
        // The same again asks nothing.
        expect(chat.changeModel("haiku")).toBeUndefined();
        expect(master.changed).toEqual(["opus high", "haiku -"]);

        // The chat taken up by the next table opens with the model changed.
        chat.release();
        await listen(chatWith());
        expect(masters.at(-1)?.options).toMatchObject({ model: "haiku", session: "s-1" });
    });

    it("is refused while the master answers, their own turn too, and while the host is not ready for it", () => {
        const { chat, master } = opened();
        chat.say("Hello");
        expect(chat.changeModel("opus")).toBe("The master is answering: change the model once they have finished.");
        master.emit({ type: "turnEnd", reason: "done" });
        master.emit({ type: "turnStart", by: "host" });
        expect(chat.changeModel("opus")).toBe("The master is answering: change the model once they have finished.");
        master.emit({ type: "turnEnd", reason: "done" });
        expect(master.changed).toEqual([]);

        master.takesModels = false;
        expect(chat.changeModel("opus")).toBe("The master is getting ready: change the model in a moment.");
        expect(chat.shown().chat?.model).toBe("sonnet");
    });

    it("checks the model and its effort as the opening does, and says why", async () => {
        const { chat, master } = await openedKnowing();
        expect(chat.changeModel("--x")).toBe("That is no name of a model: --x.");
        expect(chat.changeModel(" ")).toBe("Choose the model Claude Code plays the master with.");
        expect(chat.changeModel("opus", "max")).toBe("Opus 5.5 takes no effort max in Claude Code: choose one of low, high.");
        expect(chat.changeModel("haiku", "low")).toBe("Haiku takes no effort in Claude Code: leave the effort to the host.");
        expect(master.changed).toEqual([]);

        chat.close();
        expect(chat.changeModel("opus")).toBe("No chat with the master is open: open one first.");
    });

    it("keeps the effort when none is given and the model takes it, or its efforts are not known yet; leaves it, saying so, where the model takes none", async () => {
        listed = [...listed, { id: "fable", name: "Fable", efforts: ["low", "high"] }];
        const { chat, master } = await openedKnowing();
        expect(chat.changeModel("opus", "high")).toBeUndefined();

        // Another model with no effort given: the one before goes with it, and the line marks it for the page.
        expect(chat.changeModel("fable")).toBeUndefined();
        expect(master.changed).toEqual(["opus high", "fable high"]);
        // Asked twice before the host took either: only the one it took is said.
        master.emit({ type: "changeTaken", model: "fable" });
        expect(chat.shown().chat).toMatchObject({ model: "fable", effort: "high" });
        expect(chat.shown().messages.filter((message) => message.from === "table")).toHaveLength(1);
        expect(chat.shown().messages.at(-1)).toEqual({ id: expect.any(Number) as unknown, from: "table", text: "From now on the master plays with Fable, effort high.", code: "model", model: "Fable", effort: "high" });

        // A model that takes no effort: it is left, and said so.
        expect(chat.changeModel("haiku")).toBeUndefined();
        expect(master.changed.at(-1)).toBe("haiku -");
        master.emit({ type: "changeTaken", model: "haiku" });
        expect(chat.shown().chat).not.toHaveProperty("effort");
        expect(readLastChat(home, root)).not.toHaveProperty("effort");
        expect(chat.shown().messages.at(-1)).toEqual({
            id: expect.any(Number) as unknown,
            from: "table",
            text: "From now on the master plays with Haiku, which takes no effort high: the app chooses its own.",
            code: "model",
            model: "Haiku",
            dropped: true,
        });

        // The marks stay in the campaign's file, for the next table's page.
        const flow = readLastChat(home, root)?.flow;
        expect(flow === undefined ? [] : readFlow(root, flow, 50).messages.filter((message) => message.from === "table")).toEqual(chat.shown().messages.filter((message) => message.from === "table"));
    });

    it("keeps the effort for a model whose efforts are not known until chosen, and leaves it, saying so, once the host says that model takes none such", async () => {
        listed = [{ id: "opus", name: "Opus 5.5", efforts: [] }, { id: "haiku", name: "Haiku", efforts: [] }];
        const chat = chatWith({ driver: (host) => (host === "claudeCode" ? { ...driver, effortsOnceChosen: true } : undefined) });
        chat.shown();
        await settle();
        expect(chat.open({ ...choice, model: "opus", effort: "high" })).toBeUndefined();
        const master = masters[0];
        master.emit({ type: "session", session: "s-1", model: "opus", efforts: ["low", "high"] });

        expect(chat.changeModel("haiku")).toBeUndefined();
        expect(master.changed).toEqual(["haiku high"]);
        master.emit({ type: "session", session: "s-1", model: "haiku", efforts: ["low"] });
        master.emit({ type: "changeTaken", model: "haiku" });
        expect(chat.shown().chat).not.toHaveProperty("effort");
        expect(chat.shown().messages.filter((message) => message.from === "table")).toHaveLength(1);
        expect(chat.shown().messages.at(-1)).toMatchObject({ from: "table", code: "model", model: "Haiku", dropped: true });
    });

    it("shows the model in play, its name and efforts, until the host takes the change or refuses it; never what the host said of the one asked meanwhile", async () => {
        listed = [{ id: "opus", name: "Opus 5.5", efforts: [] }, { id: "haiku", name: "Haiku", efforts: [] }];
        const chat = chatWith({ driver: (host) => (host === "claudeCode" ? { ...driver, effortsOnceChosen: true } : undefined) });
        chat.shown();
        await settle();
        expect(chat.open({ ...choice, model: "opus", effort: "high" })).toBeUndefined();
        const master = masters[0];
        master.emit({ type: "session", session: "s-1", model: "claude-opus-5", efforts: ["low", "high"] });
        const playing = { host: "claudeCode", model: "opus", effort: "high", runs: "claude-opus-5", efforts: ["low", "high"], state: "idle", changes: true };
        expect(chat.shown().chat).toEqual(playing);

        // Asked, then said by the host before it confirms it, as OpenCode does: the chat stays as it is.
        expect(chat.changeModel("haiku")).toBeUndefined();
        expect(chat.shown().chat).toEqual(playing);
        master.emit({ type: "session", session: "s-1", model: "claude-haiku-4", efforts: ["low"] });
        expect(chat.shown().chat).toEqual(playing);

        // Refused: still as it was.
        master.emit({ type: "changeRefused", asked: "haiku", model: "opus", effort: "high", why: "no such model" });
        expect(chat.shown().chat).toEqual(playing);

        // Taken, with what the host said of it meanwhile; the effort it does not take left.
        expect(chat.changeModel("haiku")).toBeUndefined();
        master.emit({ type: "session", session: "s-1", model: "claude-haiku-4", efforts: ["low"] });
        expect(chat.shown().chat).toEqual(playing);
        master.emit({ type: "changeTaken", model: "haiku" });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "haiku", runs: "claude-haiku-4", efforts: ["low"], state: "idle", changes: true });

        // Another model taken with nothing said of it: neither the name nor the efforts of the one before.
        expect(chat.changeModel("opus")).toBeUndefined();
        expect(chat.shown().chat).toMatchObject({ runs: "claude-haiku-4", efforts: ["low"] });
        master.emit({ type: "changeTaken", model: "opus" });
        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "opus", state: "idle", changes: true });
    });

    it("keeps the host's name of the model and its efforts when the effort alone changes", async () => {
        listed = [{ id: "opus", name: "Opus 5.5", efforts: [] }];
        const chat = chatWith({ driver: (host) => (host === "claudeCode" ? { ...driver, effortsOnceChosen: true } : undefined) });
        chat.shown();
        await settle();
        expect(chat.open({ ...choice, model: "opus" })).toBeUndefined();
        masters[0].emit({ type: "session", session: "s-1", model: "claude-opus-5", efforts: ["low", "high"] });

        expect(chat.changeModel("opus", "high")).toBeUndefined();
        masters[0].emit({ type: "changeTaken", model: "opus" });
        expect(chat.shown().chat).toMatchObject({ model: "opus", effort: "high", runs: "claude-opus-5", efforts: ["low", "high"] });
    });

    it("goes back to the model the host ran when it does not take the one asked, and says so with its mark; an effort not taken is said with the model's", async () => {
        const { chat, master } = await openedKnowing();
        master.emit({ type: "session", session: "s-1", model: "claude-sonnet-5" });
        expect(chat.changeModel("opus", "high")).toBeUndefined();
        master.emit({ type: "changeRefused", asked: "opus", model: "sonnet", why: "the host did not take the model opus: no such model" });

        expect(chat.shown().chat).toEqual({ host: "claudeCode", model: "sonnet", runs: "claude-sonnet-5", state: "idle", changes: true });
        expect(readLastChat(home, root)).toMatchObject({ model: "sonnet" });
        expect(readLastChat(home, root)).not.toHaveProperty("effort");
        // Only the line of the model kept: none says the master plays with the one the host did not take, on the page or in the campaign.
        const flow = readLastChat(home, root)?.flow;
        expect(chat.shown().messages.filter((message) => message.from === "table")).toHaveLength(1);
        expect(flow === undefined ? [] : readFlow(root, flow, 50).messages.map((message) => message.text).join("\n")).not.toContain("From now on");
        expect(chat.shown().messages.at(-1)).toEqual({
            id: expect.any(Number) as unknown,
            from: "table",
            text: "Claude Code did not take Opus 5.5: the master goes on with sonnet.",
            code: "model-kept",
            model: "sonnet",
            asked: "Opus 5.5",
        });
        expect(logged.at(-1)).toBe("Claude Code did not take opus: the host did not take the model opus: no such model");

        expect(chat.changeModel("opus", "high")).toBeUndefined();
        master.emit({ type: "changeRefused", asked: "opus", model: "opus", why: "the host did not take the effort high: no" });
        expect(chat.shown().chat).toMatchObject({ model: "opus" });
        expect(chat.shown().chat).not.toHaveProperty("effort");
        expect(chat.shown().messages.at(-1)).toMatchObject({ from: "table", code: "model", model: "Opus 5.5", dropped: true });
    });

    it("is refused, and never offered, where the host's driver cannot change it", () => {
        changing = false;
        const { chat } = opened();
        expect(chat.shown().chat).not.toHaveProperty("changes");
        expect(chat.changeModel("opus")).toBe("Claude Code cannot change its model in an open chat: close the chat, then open it with another model.");
    });
});

describe("the engine's marks of clocks and turns in the master's words (D-586)", () => {
    const clock = { page: "La marcia", name: "Le guardie arrivano", value: 2, max: 4 };
    const flowFolder = (): string => join(root, "sessions", "table-chats");

    it("resolves the marks of the master's message once it is complete, keeps them in it and in the campaign, and logs a mark that stands for nothing", () => {
        let value = 2;
        const asked: string[] = [];

        const marks = (text: string): ResolvedMarks => {
            asked.push(text);
            return text.includes("[clock") ? { marks: { clocks: [{ ...clock, value }] }, unresolved: ["[clock Nebbia]"] } : { unresolved: [] };
        };

        const { chat, master } = opened({ marks });
        chat.say("I run.");
        master.emit({ type: "text", block: 0, text: "The bells ring. [clock La marcia] " });
        // While the master writes, the message has no values yet.
        expect(chat.shown().messages.at(-1)).toEqual({ id: 2, from: "master", text: "The bells ring. [clock La marcia] " });
        master.emit({ type: "text", block: 0, text: "[clock Nebbia] Run." });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(asked).toEqual(["The bells ring. [clock La marcia] [clock Nebbia] Run."]);
        expect(chat.shown().messages.at(-1)).toEqual({ id: 2, from: "master", text: "The bells ring. [clock La marcia] [clock Nebbia] Run.", marks: { clocks: [clock] } });
        expect(logged).toContain("The master wrote [clock Nebbia] in the story, which stands for nothing the page can show: it shows nothing there.");

        // An old message keeps the value of then, as the next table reads it back; one with no marks has none.
        value = 3;
        chat.say("Again.");
        master.emit({ type: "text", block: 0, text: "Nothing moves." });
        master.emit({ type: "turnEnd", reason: "done" });
        const flow = readLastChat(home, root)?.flow ?? "";
        expect(readFlow(root, flow, 50).messages.filter((message) => message.from === "master")).toEqual([
            { id: 2, from: "master", text: "The bells ring. [clock La marcia] [clock Nebbia] Run.", marks: { clocks: [clock] } },
            { id: 4, from: "master", text: "Nothing moves." },
        ]);
    });

    it("keeps the message where its marks cannot be read, and says so", () => {
        const { chat, master } = opened({
            marks: () => {
                throw new Error("campaign.yaml does not read");
            },
        });
        chat.say("I run.");
        master.emit({ type: "text", block: 0, text: "[turns] Ombra moves." });
        master.emit({ type: "turnEnd", reason: "done" });
        expect(chat.shown().messages.at(-1)).toEqual({ id: 2, from: "master", text: "[turns] Ombra moves." });
        expect(logged).toContain("The table could not read the marks of a message of its chat: campaign.yaml does not read");
    });

    it("reads back from the flow the marks well formed, and drops those that are not, the message kept", () => {
        mkdirSync(flowFolder(), { recursive: true });
        const turns = { order: ["Ettore", "creature 1"], turn: "Ettore", round: 2 };
        const lines = [
            { id: 1, from: "master", text: "One.", marks: { clocks: [clock], turns } },
            { id: 2, from: "master", text: "Two.", marks: { turns: { order: ["Ettore"], turn: "Ettore" } } },
            { id: 3, from: "master", text: "Three.", marks: { clocks: [{ ...clock, max: 0 }] } },
            { id: 4, from: "master", text: "Four.", marks: { turns: { order: [], turn: "Ettore" } } },
            { id: 5, from: "master", text: "Five.", marks: "[clock La marcia]" },
            { id: 6, from: "master", text: "Six.", marks: {} },
            { id: 7, from: "player", text: "Seven.", marks: { turns } },
        ];
        writeFileSync(join(flowFolder(), "chat.jsonl"), lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
        expect(readFlow(root, "chat.jsonl", 50).messages).toEqual([
            { id: 1, from: "master", text: "One.", marks: { clocks: [clock], turns } },
            { id: 2, from: "master", text: "Two.", marks: { turns: { order: ["Ettore"], turn: "Ettore" } } },
            { id: 3, from: "master", text: "Three." },
            { id: 4, from: "master", text: "Four." },
            { id: 5, from: "master", text: "Five." },
            { id: 6, from: "master", text: "Six." },
            { id: 7, from: "player", text: "Seven." },
        ]);
    });
});

describe("what the marks of clocks and turns stand for in the campaign (D-586)", () => {
    let folder: string;
    let context: Context;

    beforeEach(async () => {
        folder = makeTempFolder();
        context = testContext(folder);

        const rpg = async (...args: string[]): Promise<void> => {
            const result = await runCommandLine(args, context);
            expect(result.exitCode, result.output).toBe(0);
        };

        await rpg("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        inPlay(folder);
        await rpg("write", "Ennio", "--type", "character", "--set", "role=pc");
        await rpg("write", "Ossario", "--type", "place", "--add", "contains=[[Ennio]]");
        await rpg("write", "Annegato", "--type", "creature", "--set", "grit=22/22");
        await rpg("write", "Il piano di Varro", "--type", "event", "--set", "clock=1/4", "--set", "clock-name=Le guardie arrivano");
        await rpg("write", "La piena", "--type", "event", "--set", "clock=2/6");
        await rpg("write", "Il pozzo", "--type", "place", "--set", "clock=1/4", "--set", "clock-name=Acqua");
    });

    const marked = (text: string): ResolvedMarks => withFiles(new FileStore(context.systemFolders), () => storyMarks(folder, context, text));

    it("resolves a clock on the table by its event's page, whatever its spelling, and none behind the screen or of no event", () => {
        expect(marked("The bells. [Clock:  il PIANO di varro ] \[clock Il piano di Varro\] [clock La piena] [clock Il pozzo] [clock Nessuno] [Fuga 1/4]")).toEqual({
            marks: { clocks: [{ page: "il PIANO di varro", name: "Le guardie arrivano", value: 1, max: 4 }] },
            unresolved: ["[clock La piena]", "[clock Il pozzo]", "[clock Nessuno]"],
        });
        expect(marked("No marks. [roll 3cb1a2f0]")).toEqual({ unresolved: [] });
    });

    it("resolves the turns as the player's view names them, and none without an order", async () => {
        expect(marked("[turns]")).toEqual({ unresolved: ["[turns]"] });
        await runCommandLine(["scene", "open", "--title", "Ossario", "--type", "combat", "--creatures", "Annegato=1"], context);
        expect(marked("[turns]")).toEqual({ unresolved: ["[turns]"] });
        await runCommandLine(["scene", "order", "--order", "Annegato 1", "--order", "Ennio"], context);
        await runCommandLine(["scene", "next"], context);
        // The names the player's view gives the turns, never the master's: a copy of a creature the character does not know by what it sees of it.
        const shown = ((await view.run({}, context)) as { openScene?: { order?: string[]; turn?: string; round?: number; }; }).openScene;
        expect(marked("Ennio moves. [turns]")).toEqual({ marks: { turns: { order: shown?.order, turn: "Ennio", round: 1 } }, unresolved: [] });
        expect(shown?.order).toHaveLength(2);
    });
});
