// A character's subagent in Codex and Antigravity (D-580): known by the metadata of its calls, it may only look, and takes none of the master's lines.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { createMcpServer } from "../src/server/mcp.ts";
import { fromSubagent, subagentRefusal } from "../src/server/subagent.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

// The metadata of a call from each host's subagent, and from its master.
const codexChild = { "x-codex-turn-metadata": { thread_source: "subagent", subagent_kind: "spawn", parent_thread_id: "019a-master" } };
const codexChildText = { "x-codex-turn-metadata": JSON.stringify({ thread_source: "subagent", parent_thread_id: "019a-master" }) };
const antigravityChild = { "antigravity.google/parent_conversation_id": "c0ffee" };
const codexMaster = { "x-codex-turn-metadata": { thread_source: "user" }, threadId: "019a-master" };

describe("a subagent's call (D-580)", () => {
    it("is known by Codex's turn, as an object or as JSON, and by Antigravity's parent conversation", () => {
        expect(fromSubagent(codexChild)).toBe(true);
        expect(fromSubagent(codexChildText)).toBe(true);
        expect(fromSubagent(antigravityChild)).toBe(true);
    });

    it("is not the master's, nor one with no metadata or metadata that does not parse", () => {
        expect(fromSubagent(codexMaster)).toBe(false);
        expect(fromSubagent({ "x-codex-turn-metadata": JSON.stringify({ thread_source: "user" }) })).toBe(false);
        expect(fromSubagent({ "x-codex-turn-metadata": "{not json" })).toBe(false);
        expect(fromSubagent({ "antigravity.google/parent_conversation_id": "" })).toBe(false);
        expect(fromSubagent({ threadId: "019a" })).toBe(false);
        expect(fromSubagent(undefined)).toBe(false);
    });
});

describe("the server with a character's subagent (D-580)", () => {
    let folder: string;
    let client: Client;
    let newsTaken: number;
    const chat: NonNullable<Context["chat"]> = { calls: 0 };

    beforeEach(async () => {
        folder = makeTempFolder();
        await runCommandLine(["init", "--name", "Rocca"], testContext(folder));
        await runCommandLine(["write", "Mira", "--type", "character", "--text", "Una locandiera."], testContext(folder));
        newsTaken = 0;
        chat.thread = undefined;
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        const news = (): { lines: string[]; restore(): void; } => (newsTaken++, { lines: ["The player changed the dashboard."], restore: () => undefined });
        await createMcpServer({ ...testContext(folder), chat, news }, {}).connect(serverTransport);
        client = new Client({ name: "codex-mcp-client", version: "1.0.0" });
        await client.connect(clientTransport);
    });

    afterEach(async () => {
        await client.close();
        removeFolder(folder);
    });

    const call = async (name: string, args: Record<string, unknown>, meta: Record<string, unknown>): Promise<{ text: string; isError: boolean; }> => {
        const result = await client.callTool({ name, arguments: args, _meta: meta });
        return { text: (result.content as { text: string; }[])[0].text, isError: result.isError === true };
    };

    it("lets it view as its character, with none of the master's lines and nothing told to the master's chat", async () => {
        for (const meta of [codexChild, codexChildText, antigravityChild]) {
            const seen = await call("view", { as: "Mira" }, meta);
            expect(seen.isError).toBe(false);
            expect(seen.text).not.toContain("The player changed the dashboard.");
            expect(seen.text).not.toBe(subagentRefusal);
        }

        expect([newsTaken, chat.calls, chat.thread]).toEqual([0, 0, undefined]);
    });

    it("refuses it every other tool, as write, roll and book, saying what is its own", async () => {
        for (const meta of [codexChild, codexChildText, antigravityChild]) {
            expect(await call("write", { page: "Mira", text: "Altro." }, meta)).toEqual({ text: subagentRefusal, isError: true });
            expect(await call("roll", { dice: "1d6" }, meta)).toEqual({ text: subagentRefusal, isError: true });
            expect(await call("book", { text: "Altro." }, meta)).toEqual({ text: subagentRefusal, isError: true });
        }

        expect((await runCommandLine(["show", "Mira"], testContext(folder))).output).not.toContain("Altro.");
        expect(newsTaken).toBe(0);
    });

    it("a server that only looks (D-588 (2)): every call is a character's, refused with its sentence, and it starts nothing of the chat's", async () => {
        const watched: string[] = [];
        const session = new SessionStore({ watchFolder: (path) => (watched.push(path), { close: () => undefined }) });
        const outside = vi.spyOn(session, "beforeOutsideChanges");
        const looking = { ...testContext(folder), chat: { calls: 0 }, files: session };
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer(looking, {}, { onlyLooks: "Another chat plays here." }).connect(serverTransport);
        const host = new Client({ name: "codex-mcp-client", version: "1.0.0" }, { capabilities: { elicitation: {} } });
        await host.connect(clientTransport);

        try {
            // Past the time the chat's own server reads the campaign and watches it, before any call.
            await new Promise((done) => setTimeout(done, 500));
            expect([watched, outside.mock.calls.length, looking.player]).toEqual([[], 0, undefined]);
            const result = await host.callTool({ name: "write", arguments: { page: "Mira", text: "Altro." } });
            expect([(result.content as { text: string; }[])[0].text, result.isError]).toEqual(["Another chat plays here.", true]);
            const seen = await host.callTool({ name: "view", arguments: { as: "Mira" } });
            expect(seen.isError).not.toBe(true);
            expect(outside).not.toHaveBeenCalled();
            expect((await runCommandLine(["show", "Mira"], testContext(folder))).output).not.toContain("Altro.");
        } finally {
            await host.close();
        }
    });

    it("leaves the master's calls as they were", async () => {
        const written = await call("write", { page: "Mira", text: "Una locandiera che sa tutto." }, codexMaster);
        expect(written.isError).toBe(false);
        expect(written.text).toContain("The player changed the dashboard.");
        expect(newsTaken).toBe(1);
        expect(chat.thread).toBe("019a-master");
    });
});
