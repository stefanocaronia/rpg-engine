import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { masterDriver, type MasterEvent, type MasterOptions, openMaster } from "../src/master/index.ts";
import { checklist, type Scenario } from "./master/checklist.ts";
import { fakeAgent, type FakeAgentOptions, isModelSetting, isPrompt, joinedTexts, promptWords } from "./master/fake-agent.ts";
import { type FakeHost, type FlowEntry, listen, loadFlow, turnEnds } from "./master/fake-host.ts";
import { makeTempFolder } from "./support.ts";

type Message = Record<string, unknown>;

// No session of Antigravity was recorded, only its handshake (agy 1.5.14): the flows here are that handshake, then sessions in the protocol's shapes, its
// models listed apart from the options of configuration, as the protocol's models field has them.
const handshake = loadFlow("antigravity/handshake");
const folder = "/campaigns/test";
const model = "gemini-3-pro";
const session = "agy-session-1";

checklist({
    host: "Antigravity",
    open: (scenario) => {
        const flow = flows[scenario]();
        const resumed = scenario === "resumed" ? session : undefined;
        const { chat, host } = open(flow, { allowed: scenario === "refused" ? ["read"] : ["rpg", "read"], ...(resumed === undefined ? {} : { session: resumed }) });
        return { chat, host, turns: promptWords(flow), texts: joinedTexts(flow), ...(resumed === undefined ? {} : { session: resumed }), interruptTurn: 0 };
    },
    isModelRequest: isModelSetting,
    isPlayerWords: isPrompt,
});

describe("the master in Antigravity", () => {
    it("starts as agy acp after its own arguments, in the campaign's folder, and passes no MCP server: the campaign's own gives rpg", async () => {
        const { host, until } = play(flows.prose());
        await until(() => host.written.length >= 3);
        expect(host.started?.args).toEqual(["--first", "acp"]);
        expect(host.started?.options.cwd).toBe(folder);
        expect(host.written[1]).toMatchObject({ method: "session/new", params: { cwd: folder, mcpServers: [] } });
    });

    it("plays the handshake as recorded, then sets the model by the protocol's own call before the player's words", async () => {
        const { chat, host, events, until } = play(flows.prose());
        chat.send("Hello");
        await until(() => turnEnds(events).length === 1);
        expect(host.written.map((message) => message.method)).toEqual(["initialize", "session/new", "session/set_model", "session/prompt"]);
        expect(host.written[2].params).toEqual({ sessionId: session, modelId: model });
        expect(events[0]).toEqual({ type: "session", session, model });
        expect(host.problems).toEqual([]);
    });

    it("takes a chat up with session/load, which replays nothing, and sets the model again", async () => {
        const { chat, host, events, until } = play(flows.resumed(), { session });
        chat.send("Again");
        await until(() => turnEnds(events).length === 1);
        expect(host.written.map((message) => message.method)).toEqual(["initialize", "session/load", "session/set_model", "session/prompt"]);
        expect(host.written[1].params).toEqual({ cwd: folder, mcpServers: [], sessionId: session });
        expect(events.filter((event) => event.type === "text").map((event) => event.type === "text" && event.text).join("")).toBe("Welcome back.");
    });

    it("ends the chat with the agent's words when it does not take the model", async () => {
        const { chat, events, until } = play(flows.prose(), {}, { failing: ["session/set_model"] });
        chat.send("Hello");
        await until(() => events.some((event) => event.type === "ended"));
        expect(events.at(-1)).toEqual({ type: "ended", why: `the host did not take the model ${model}: session/set_model failed` });
    });

    it("never sends words while a turn runs, which the agent would take to steer it: the next words wait for the turn's end", async () => {
        const { chat, host, events, until } = play(flows.prose());
        chat.send("Hello");
        await until(() => host.written.some(isPrompt));
        expect(chat.send("And also this")).toBe(false);
        await until(() => turnEnds(events).length === 1);
        expect(host.written.filter(isPrompt)).toHaveLength(1);
    });

    it("reads a command of rpg by every name a host gives it, and other tools by the protocol's kinds", async () => {
        const tools = [
            call("c1", { title: "rpg: status", kind: "other" }),
            call("c2", { name: "mcp__rpg__roll", kind: "other" }),
            call("c3", { name: "rpg_scene", kind: "other" }),
            call("c4", { title: "Read campaign.yaml", kind: "read" }),
            call("c5", { title: "Run npm test", kind: "execute" }),
            call("c6", { title: "Edit a file", kind: "edit" }),
            call("c7", { title: "Fetch a page", kind: "fetch" }),
            call("c8", { title: "Think", kind: "think" }),
        ].flat();
        const { chat, events, until } = play([...handshake, ...newSession(), ...turn("Hello", ...tools)]);
        chat.send("Hello");
        await until(() => turnEnds(events).length === 1);
        const done = events.filter((event) => event.type === "tool" && event.state === "done").map((event) => event.type === "tool" && [event.name, event.kind]);
        expect(done).toEqual([
            ["status", "rpg"],
            ["roll", "rpg"],
            ["scene", "rpg"],
            ["Read campaign.yaml", "read"],
            ["Run npm test", "shell"],
            ["Edit a file", "write"],
            ["Fetch a page", "fetch"],
            ["Think", "other"],
        ]);
    });

    it("answers a permission by the tool's kind, and a read by its paths", async () => {
        const asked = async (toolCall: Message, chosen: string): Promise<MasterEvent[]> => {
            const { chat, host, events, until } = play([...handshake, ...newSession(), ...turn("Hello", ...permission(toolCall, chosen))], { allowed: ["rpg", "read"] });
            chat.send("Hello");
            await until(() => turnEnds(events).length === 1);
            expect(host.problems).toEqual([]);
            return events.filter((event) => event.type === "permission");
        };

        expect(await asked({ title: "rpg: roll", kind: "other", rawInput: {} }, "allow-once")).toEqual([{ type: "permission", name: "roll", kind: "rpg", allowed: true }]);
        expect(await asked({ title: "Run a command", kind: "execute", rawInput: { command: "dir" } }, "reject")).toEqual([{ type: "permission", name: "Run a command", kind: "shell", allowed: false }]);
        expect(await asked({ title: "Read", kind: "read", locations: [{ path: join(folder, "state.yaml") }], rawInput: {} }, "allow-once")).toEqual([{ type: "permission", name: "Read", kind: "read", allowed: true }]);
        expect(await asked({ title: "Read", kind: "read", locations: [{ path: "/home/player/.ssh/id_rsa" }], rawInput: {} }, "reject")).toEqual([{ type: "permission", name: "Read", kind: "read", allowed: false }]);
    });
});

describe("Antigravity as the table drives it", () => {
    const driver = masterDriver("antigravity")!;
    const exe = process.platform === "win32" ? "agy.exe" : "agy";

    it("proposes no model of its own and knows no effort until Antigravity lists its models", () => {
        expect(driver.model).toBe("");
        expect(driver.efforts).toEqual([]);
    });

    it("finds agy in a folder of the PATH, then where its installer puts it in the home, never a shim", () => {
        const onPath = makeTempFolder();
        writeFileSync(join(onPath, exe), "");
        const home = makeTempFolder();
        const installed = process.platform === "win32" ? join(home, "AppData", "Local", "agy", "bin") : join(home, ".local", "bin");
        mkdirSync(installed, { recursive: true });
        writeFileSync(join(installed, exe), "");
        const shims = makeTempFolder();
        writeFileSync(join(shims, "agy.cmd"), "");
        expect(driver.program({ PATH: onPath }, process.platform, home)).toEqual({ command: join(onPath, exe), args: [] });
        expect(driver.program({ PATH: shims }, process.platform, home)).toEqual({ command: join(installed, exe), args: [] });
        expect(driver.program({ PATH: shims }, "win32", makeTempFolder())).toBeUndefined();
    });

    it("says what a campaign lacks for it: its .agents/mcp_config.json", () => {
        const campaign = makeTempFolder();
        expect(driver.missing(campaign)).toContain(".agents/mcp_config.json");
        mkdirSync(join(campaign, ".agents"));
        writeFileSync(join(campaign, ".agents", "mcp_config.json"), "{}");
        expect(driver.missing(campaign)).toBeUndefined();
    });

    it("gives agy the table's environment, the player's home and login with it, without the engine's variables or a shell's folders", () => {
        expect(driver.environment({ PATH: "/bin", USERPROFILE: "/home/player", RPG_HELPER: "1", PWD: "/x" })).toEqual({ PATH: "/bin", USERPROFILE: "/home/player" });
    });

    it("lists the models a new session gives, the one in play first, and leaves the session where the agent says no way to delete it", async () => {
        const host = fakeAgent([...handshake, ...newSession()]);
        const models = await driver.models({ folder, program: { command: "agy-program", args: [] }, environment: {}, start: host.start });
        expect(models).toEqual([{ id: model, name: "Gemini 3 Pro", efforts: [] }, { id: "gemini-3-flash", name: "Gemini 3 Flash", about: "Fast", efforts: [] }]);
        expect(host.written.map((message) => message.method)).toEqual(["initialize", "session/new"]);
        expect(host.problems).toEqual([]);
    });
});

// The flows of the checklist.
const flows: Record<Scenario, () => FlowEntry[]> = {
    prose: () => [...handshake, ...newSession(), ...turn("Hello", text("The rain ", "m1"), text("falls.", "m1"), text("A door creaks.", "m2"))],
    refused: () => [...handshake, ...newSession(), ...turn("Roll for me", ...permission({ title: "rpg: roll", kind: "other", rawInput: {} }, "reject"), text("I cannot roll.", "m1"))],
    interrupt: () => [...handshake, ...newSession(), ...turn("Tell me a long story", ...["Once ", "upon ", "a ", "time ", "there ", "was ", "a ", "keep."].map((words) => text(words, "m1")))],
    resumed: () => [
        ...handshake,
        { dir: "in", msg: { jsonrpc: "2.0", id: 2, method: "session/load", params: {} } },
        { dir: "out", msg: { jsonrpc: "2.0", id: 2, result: { models: listed() } } },
        ...turn("Again", text("Welcome back.", "m9")),
    ],
};

function open(flow: FlowEntry[], overrides: Partial<MasterOptions> = {}, fake: FakeAgentOptions = {}): { chat: NonNullable<ReturnType<typeof openMaster>>; host: FakeHost; }
{
    const host = fakeAgent(flow, fake);
    const chat = openMaster("antigravity", { folder, program: { command: "agy-program", args: ["--first"] }, model, allowed: ["rpg"], environment: {}, start: host.start, ...overrides });

    if (chat === undefined) {
        throw new Error("Antigravity has no driver");
    }

    return { chat, host };
}

function play(flow: FlowEntry[], overrides: Partial<MasterOptions> = {}, fake: FakeAgentOptions = {}): ReturnType<typeof open> & ReturnType<typeof listen>
{
    const opened = open(flow, overrides, fake);
    return { ...opened, ...listen(opened.chat) };
}

function listed(): Message
{
    return { currentModelId: model, availableModels: [{ modelId: model, name: "Gemini 3 Pro" }, { modelId: "gemini-3-flash", name: "Gemini 3 Flash", description: "Fast" }] };
}

function newSession(): FlowEntry[]
{
    return [
        { dir: "in", msg: { jsonrpc: "2.0", id: 2, method: "session/new", params: {} } },
        { dir: "out", msg: { jsonrpc: "2.0", id: 2, result: { sessionId: session, models: listed() } } },
    ];
}

// The recorded ids of the turns' prompts, apart from the driver's.
let turns = 0;

/** A turn: the player's words, the agent's lines, and the prompt's answer. */
function turn(words: string, ...then: FlowEntry[]): FlowEntry[]
{
    turns += 1;
    const id = 100 + turns;
    return [
        { dir: "in", msg: { jsonrpc: "2.0", id, method: "session/prompt", params: { sessionId: session, prompt: [{ type: "text", text: words }] } } },
        ...then,
        { dir: "out", msg: { jsonrpc: "2.0", id, result: { stopReason: "end_turn" } } },
    ];
}

/** A tool call that runs and ends. */
function call(id: string, fields: Message): FlowEntry[]
{
    return [update({ sessionUpdate: "tool_call", toolCallId: id, status: "pending", ...fields }), update({ sessionUpdate: "tool_call_update", toolCallId: id, status: "completed" })];
}

/** A tool call the agent asks to run, in the shape of the protocol's permission request, the option the table must choose, and the call's end as chosen. */
function permission(toolCall: Message, chosen: string): FlowEntry[]
{
    const options = [{ optionId: "allow-once", name: "Allow", kind: "allow_once" }, { optionId: "allow-always", name: "Always", kind: "allow_always" }, { optionId: "reject", name: "Reject", kind: "reject_once" }];
    return [
        update({ sessionUpdate: "tool_call", toolCallId: "t1", status: "pending", ...toolCall }),
        { dir: "out", msg: { jsonrpc: "2.0", id: 0, method: "session/request_permission", params: { sessionId: session, toolCall: { toolCallId: "t1", ...toolCall }, options } } },
        { dir: "in", msg: { jsonrpc: "2.0", id: 0, result: { outcome: { outcome: "selected", optionId: chosen } } } },
        update({ sessionUpdate: "tool_call_update", toolCallId: "t1", status: chosen === "reject" ? "failed" : "completed" }),
    ];
}

function text(words: string, message: string): FlowEntry
{
    return update({ sessionUpdate: "agent_message_chunk", messageId: message, content: { type: "text", text: words } });
}

function update(fields: Message): FlowEntry
{
    return { dir: "out", msg: { jsonrpc: "2.0", method: "session/update", params: { sessionId: session, update: fields } } };
}
