import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { approval, noteCampaign } from "../src/server/approver.ts";
import { type ChildServer, conversationKey, mcpRouter, noteConversation, notedCampaign, notesFolder, pruneNotes } from "../src/server/route/index.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

// The router of `rpg mcp` outside a campaign, as Antigravity's app starts it (D-578): one child for each campaign a call plays, one in its own folder.

/** A child server that keeps what it is given, and answers as the test tells it. */
class FakeChild implements ChildServer
{
    readonly given: string[] = [];
    readonly folder: string;
    stopped = false;
    inputClosed = false;
    /** What it does when its input closes; by default it stays, as a server that hangs. */
    closing: () => void = () => undefined;
    private listener: (line: string) => void = () => undefined;
    private endListener: (reason: string) => void = () => undefined;

    constructor(folder: string)
    {
        this.folder = folder;
    }

    write(line: string): void
    {
        this.given.push(line);
    }

    closeInput(): void
    {
        this.inputClosed = true;
        this.closing();
    }

    onLine(listener: (line: string) => void): void
    {
        this.listener = listener;
    }

    onEnd(listener: (reason: string) => void): void
    {
        this.endListener = listener;
    }

    stop(): void
    {
        this.stopped = true;
    }

    /** A line the child writes to its client. */
    say(message: object): void
    {
        this.listener(JSON.stringify(message));
    }

    /** The child ends by itself, as when its folder is gone. */
    die(reason: string): void
    {
        this.endListener(reason);
    }

    /** What it was given, as messages. */
    messages(): { id?: unknown; method?: string; result?: unknown; }[]
    {
        return this.given.map((line) => JSON.parse(line) as { id?: unknown; method?: string; });
    }
}

const initialize = JSON.stringify({ jsonrpc: "2.0", id: 0, method: "initialize", params: { clientInfo: { name: "antigravity-client", version: "1" } } });
const initialized = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });
const listChanged = JSON.stringify({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });

function call(id: number, conversation?: string, name = "status", args: object = {}): string
{
    return JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args, ...(conversation === undefined ? {} : { _meta: { [conversationKey]: conversation } }) } });
}

describe("the router of rpg mcp outside a campaign", () => {
    let children: FakeChild[];
    let toClient: string[];
    let notes: Map<string, string>;
    let logged: string[];

    function router(looks = { every: 0, times: 0 }): ReturnType<typeof mcpRouter>
    {
        return mcpRouter({
            folder: "app",
            start: (folder) => {
                const child = new FakeChild(folder);
                children.push(child);
                return child;
            },
            campaignOf: (conversation) => notes.get(conversation),
            toClient: (line) => toClient.push(line),
            noteLooks: looks,
            log: (line) => logged.push(line),
            patience: 20,
        });
    }

    function child(folder: string): FakeChild
    {
        const found = children.filter((one) => one.folder === folder);
        expect(found).toHaveLength(1);
        return found[0];
    }

    function heard(): { id?: unknown; method?: string; result?: { content?: { text: string; }[]; isError?: boolean; }; error?: { message: string; }; }[]
    {
        return toClient.map((line) => JSON.parse(line) as { id?: unknown; method?: string; });
    }

    beforeEach(() => {
        children = [];
        toClient = [];
        notes = new Map([["uno", "campagne/uno"], ["due", "campagne/due"]]);
        logged = [];
    });

    it("passes the handshake and the answers through to the child in its own folder", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        children[0].say({ jsonrpc: "2.0", id: 0, result: { serverInfo: { name: "rpg" } } });
        await routed.fromClient(initialized);
        expect(children.map((one) => one.folder)).toEqual(["app"]);
        expect(children[0].given).toEqual([initialize, initialized]);
        expect(toClient).toEqual([JSON.stringify({ jsonrpc: "2.0", id: 0, result: { serverInfo: { name: "rpg" } } })]);
    });

    it("starts a child in a call's campaign with the handshake again, its answer kept from the client, and keeps every child alive", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(initialized);
        await routed.fromClient(call(1, "uno"));

        expect(children.map((one) => one.folder)).toEqual(["app", "campagne/uno"]);
        expect(child("campagne/uno").given).toEqual([initialize, initialized, call(1, "uno")]);
        expect(child("app").stopped).toBe(false);
        expect(logged).toEqual(["rpg mcp router: call 1 of conversation uno goes to the server in campagne/uno"]);

        child("campagne/uno").say({ jsonrpc: "2.0", id: 0, result: {} });
        child("campagne/uno").say({ jsonrpc: "2.0", id: 1, result: { content: [] } });
        expect(toClient).toEqual([JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [] } })]);

        // The same campaign again, and another one: one child each, none stopped (r2.mjs).
        await routed.fromClient(call(2, "uno"));
        await routed.fromClient(call(3, "due"));
        expect(children.map((one) => one.folder)).toEqual(["app", "campagne/uno", "campagne/due"]);
        expect(child("campagne/uno").given.slice(-1)).toEqual([call(2, "uno")]);
        expect(children.some((one) => one.stopped)).toBe(false);
    });

    it("passes a call's metadata to the child as it came, by which the child knows a character's subagent (D-580)", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        const line = JSON.stringify({
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: { name: "view", arguments: {}, _meta: { [conversationKey]: "uno", "antigravity.google/parent_conversation_id": "padre" } },
        });
        await routed.fromClient(line);
        expect(child("campagne/uno").given.slice(-1)).toEqual([line]);
    });

    it("brings the answer of a call under way while another conversation calls (r2.mjs, call 12)", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(call(12, "uno"));
        await routed.fromClient(call(13, "due"));
        child("campagne/due").say({ jsonrpc: "2.0", id: 13, result: { content: [{ type: "text", text: "Beta" }] } });
        child("campagne/uno").say({ jsonrpc: "2.0", id: 12, result: { content: [{ type: "text", text: "Alfa" }] } });
        expect(heard().filter((one) => one.id !== undefined).map((one) => [one.id, one.result?.content?.[0].text])).toEqual([[13, "Beta"], [12, "Alfa"]]);
    });

    it("sends a conversation with no note, and a call with none, to its own folder, never to the campaign of the last call (r5.mjs, r2.mjs call 14)", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(call(1, "due"));
        await routed.fromClient(call(2, "ignota"));
        await routed.fromClient(call(3));

        expect(child("campagne/due").given.slice(-1)).toEqual([call(1, "due")]);
        expect(child("app").given).toEqual([initialize, call(2, "ignota"), call(3)]);
        expect(logged.slice(1)).toEqual([
            "rpg mcp router: call 2 of conversation ignota goes to the server in app (no campaign noted for it)",
            "rpg mcp router: call 3 goes to the server in app",
        ]);

        // The conversation the hooks never noted hears how to start playing; a call with no conversation, as another client's, hears nothing more.
        child("app").say({ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "There is no campaign here." }], isError: true } });
        child("app").say({ jsonrpc: "2.0", id: 3, result: { content: [{ type: "text", text: "There is no campaign here." }], isError: true } });
        const [second, third] = heard().filter((one) => one.id === 2 || one.id === 3);
        expect(second.result?.content?.map((part) => part.text)).toEqual([
            "There is no campaign here.",
            "Tell the player: open the campaign's folder in Antigravity and start a new chat there. This chat runs outside the campaign, and the game's hooks load only when a chat starts in its folder.",
        ]);
        expect(third.result?.content?.map((part) => part.text)).toEqual(["There is no campaign here."]);
    });

    it("never makes a campaign in the app's own folder: init needs a full path there, and then a new chat in it", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(call(1, "ignota", "init", { name: "Rocca" }));
        await routed.fromClient(call(2, "ignota", "init", { folder: "Rocca" }));
        expect(child("app").given).toEqual([initialize]);
        expect(heard().map((one) => [one.id, one.result?.isError, one.result?.content?.[0].text])).toEqual([
            [1, true, "This chat runs in no campaign's folder, so init needs where to make the campaign: ask the player which folder, and pass its full path as folder."],
            [2, true, "This chat runs in no campaign's folder, so init needs where to make the campaign: ask the player which folder, and pass its full path as folder."],
        ]);

        const where = resolve("Rocca");
        await routed.fromClient(call(3, "ignota", "init", { folder: where }));
        child("app").say({ jsonrpc: "2.0", id: 3, result: { content: [{ type: "text", text: `Created the campaign "Rocca" in ${where}.` }] } });
        expect(heard()[2].result?.content?.[1].text).toBe(
            `Tell the player: open ${where} in Antigravity and start a new chat there. This chat runs outside the campaign, and the game's hooks load only when a chat starts in its folder.`,
        );
    });

    it("gives the children's own requests ids that never cross, and the client's answers back to the child that asked (p.test.ts R2)", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(call(1, "uno"));
        await routed.fromClient(call(2, "due"));
        child("campagne/uno").say({ jsonrpc: "2.0", id: 0, method: "elicitation/create", params: { message: "Uno?" } });
        child("campagne/due").say({ jsonrpc: "2.0", id: 0, method: "elicitation/create", params: { message: "Due?" } });
        child("campagne/due").say({ jsonrpc: "2.0", method: "notifications/progress", params: { progress: 1 } });
        const asked = heard().filter((one) => one.method === "elicitation/create");
        expect(new Set(asked.map((one) => one.id)).size).toBe(2);
        expect(heard().some((one) => one.method === "notifications/progress")).toBe(true);

        await routed.fromClient(JSON.stringify({ jsonrpc: "2.0", id: asked[0].id, result: { action: "accept", content: { answer: "Sì" } } }));
        await routed.fromClient(JSON.stringify({ jsonrpc: "2.0", id: asked[1].id, result: { action: "decline" } }));
        expect(child("campagne/uno").given.slice(-1)).toEqual([JSON.stringify({ jsonrpc: "2.0", id: 0, result: { action: "accept", content: { answer: "Sì" } } })]);
        expect(child("campagne/due").given.slice(-1)).toEqual([JSON.stringify({ jsonrpc: "2.0", id: 0, result: { action: "decline" } })]);
    });

    it("tells the client the tools changed when a call goes to a child whose tools it did not list", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
        child("app").say({ jsonrpc: "2.0", id: 1, result: { tools: [] } });
        await routed.fromClient(call(2, "uno"));
        expect(toClient.filter((line) => line === listChanged)).toHaveLength(1);

        // The client lists them again, from the child it last called; further calls there change nothing.
        await routed.fromClient(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" }));
        expect(child("campagne/uno").given.slice(-1)).toEqual([JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list" })]);
        child("campagne/uno").say({ jsonrpc: "2.0", id: 3, result: { tools: [] } });
        await routed.fromClient(call(4, "uno"));
        expect(toClient.filter((line) => line === listChanged)).toHaveLength(1);
        await routed.fromClient(call(5, "due"));
        expect(toClient.filter((line) => line === listChanged)).toHaveLength(2);
    });

    it("answers the calls of a child that ends, as when its folder is gone, and starts it again at the next call", async () => {
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(call(1, "uno"));
        child("campagne/uno").die("spawn ENOENT");
        expect(heard()).toEqual([{ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "The rpg server in campagne/uno stopped (spawn ENOENT): call again." } }]);

        await routed.fromClient(call(2, "uno"));
        expect(children.map((one) => one.folder)).toEqual(["app", "campagne/uno", "campagne/uno"]);
        expect(children[2].given).toEqual([initialize, call(2, "uno")]);
    });

    it("ends every child as the client goes, and takes a folder written two ways as one", async () => {
        notes.set("tre", `campagne/uno/`);
        const routed = router();
        await routed.fromClient(initialize);
        await routed.fromClient(call(1, "uno"));
        await routed.fromClient(call(2, "tre"));
        expect(children).toHaveLength(2);
        // Each child's input closes first: the one that ends by itself is never stopped, the one still there after a while is.
        children[0].closing = () => children[0].die("exit code 0");
        await routed.stop();
        expect(children.every((one) => one.inputClosed)).toBe(true);
        expect(children.map((one) => one.stopped)).toEqual([false, true]);
    });

    it("waits a moment for a note that comes after the call, once per conversation", async () => {
        notes.clear();
        const routed = router({ every: 5, times: 10 });
        await routed.fromClient(initialize);
        setTimeout(() => notes.set("tarda", "campagne/tarda"), 15);
        await routed.fromClient(call(1, "tarda"));
        expect(children.map((one) => one.folder)).toEqual(["app", "campagne/tarda"]);

        // A conversation already waited for is looked up once: with no note it goes to the router's own folder at once.
        const started = Date.now();
        await routed.fromClient(call(2, "mai"));
        await routed.fromClient(call(3, "mai"));
        expect(children).toHaveLength(2);
        expect(Date.now() - started).toBeLessThan(500);
    });
});

describe("the notes of which campaign a conversation plays", () => {
    let home: string;
    let campaign: string;

    beforeEach(() => {
        home = makeTempFolder();
        campaign = makeTempFolder();
        writeFileSync(join(campaign, "campaign.yaml"), "name: Rocca\n");
        mkdirSync(join(campaign, ".agents"));
    });

    afterEach(() => {
        removeFolder(home);
        removeFolder(campaign);
    });

    function hookInput(name: string, server: string, cwd: string, conversationId: unknown = "conv/1"): string
    {
        return JSON.stringify({ conversationId, cwd, toolCall: { name, args: { ServerName: server, ToolName: "status" } } });
    }

    it("are written by the approval hook for an rpg tool, from the campaign of its folder, in the data folder, never in the campaign", () => {
        const input = hookInput("call_mcp_tool", "rpg", join(campaign, ".agents"));
        expect(approval(input)).toEqual({ decision: "auto_approve" });
        noteCampaign(input, home);
        expect(readdirSync(notesFolder(home))).toEqual(["conv_1.txt"]);
        expect(notedCampaign(home, "conv/1")).toBe(campaign);
        expect(readdirSync(campaign).sort()).toEqual([".agents", "campaign.yaml"]);
    });

    it("are not written for another server's tool, outside a campaign, or without a conversation", () => {
        noteCampaign(hookInput("call_mcp_tool", "altro", campaign), home);
        noteCampaign(hookInput("call_mcp_tool", "rpg", home), home);
        noteCampaign(hookInput("call_mcp_tool", "rpg", campaign, 7), home);
        noteCampaign("not json", home);
        expect(existsSync(notesFolder(home))).toBe(false);
    });

    it("name no campaign once its folder is no longer one", () => {
        noteConversation(home, "conv", campaign);
        expect(notedCampaign(home, "conv")).toBe(campaign);
        expect(notedCampaign(home, "altra")).toBeUndefined();
        rmSync(join(campaign, "campaign.yaml"));
        expect(notedCampaign(home, "conv")).toBeUndefined();
    });

    it("go when not written for a month", () => {
        noteConversation(home, "vecchia", campaign);
        noteConversation(home, "nuova", campaign);
        const now = new Date("2026-11-21T12:00:00Z");
        utimesSync(join(notesFolder(home), "vecchia.txt"), new Date("2026-10-21T11:00:00Z"), new Date("2026-10-21T11:00:00Z"));
        utimesSync(join(notesFolder(home), "nuova.txt"), new Date("2026-10-23T12:00:00Z"), new Date("2026-10-23T12:00:00Z"));
        pruneNotes(home, now);
        expect(readdirSync(notesFolder(home))).toEqual(["nuova.txt"]);
        expect(readFileSync(join(notesFolder(home), "nuova.txt"), "utf8")).toBe(`${campaign}\n`);
        pruneNotes(join(home, "nessuna"), now);
    });
});
