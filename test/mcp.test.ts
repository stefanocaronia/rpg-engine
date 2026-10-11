import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema, type ElicitResult, LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import { type ChildProcessByStdio, spawn } from "node:child_process";
import { readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { commands } from "../src/commands/index.ts";
import type { Context, Player } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { startInstructions } from "../src/instructions/index.ts";
import { createMcpServer } from "../src/mcp-server.ts";
import { unpackFiles } from "../src/saves/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let client: Client;

beforeEach(async () => {
    folder = makeTempFolder();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer(testContext(folder)).connect(serverTransport);
    client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientTransport);
});

afterEach(async () => {
    await client.close();
    removeFolder(folder);
});

async function call(name: string, args: Record<string, unknown>): Promise<{ text: string; isError: boolean; }>
{
    const result = await client.callTool({ name, arguments: args });
    return { text: (result.content as { text: string; }[])[0].text, isError: result.isError === true };
}

describe("MCP server", () => {
    it("offers every command as a tool, with its description and parameters", async () => {
        const { tools } = await client.listTools();
        expect(tools.map((tool) => tool.name)).toEqual(commands.filter((command) => !command.needsPlayer).map((command) => command.name));

        const write = tools.find((tool) => tool.name === "write");
        expect(write?.description).toBe(commands.find((command) => command.name === "write")?.description);
        expect(Object.keys(write?.inputSchema.properties ?? {})).toEqual(["page", "type", "set", "unset", "add", "remove", "text", "section", "append", "secret", "here"]);
    });

    it("sends the host to instructions, then status, marks the tools that change nothing, and loads both at once", async () => {
        expect(client.getInstructions()).toContain("call `instructions` (how to be its game master), then `status`");
        expect(client.getInstructions()!.length).toBeLessThan(512);

        const { tools } = await client.listTools();
        const tool = (name: string) => tools.find((candidate) => candidate.name === name);

        for (const name of ["instructions", "status"]) {
            expect(tool(name)?.annotations?.readOnlyHint, name).toBe(true);
            expect(tool(name)?._meta, name).toEqual({ "anthropic/alwaysLoad": true });
        }

        expect(tool("show")?.annotations?.readOnlyHint).toBe(true);
        expect(tool("write")?.annotations).toBeUndefined();
    });

    it("answers with the same text as the command line", async () => {
        const created = await call("init", { name: "Guadoscuro", language: "it", system: "5e", difficulty: "normal", lethality: "dice" });
        expect(created.isError).toBe(false);
        expect(created.text).toBe((await runCommandLine(["config", "language"], testContext(folder))).output.replace(/^language: it\n\n/, `Created the campaign "Guadoscuro" in ${folder}.\n`));
        expect((await call("roll", { notation: "1d20+2", why: "notare la trappola", who: "Elia" })).text).toBe("id2 Elia, notare la trappola: 1d20+2 = 6 [4] + 2");
    });

    it("takes text that troubles a shell, such as a list that starts with a dash", async () => {
        await call("init", { name: "Guadoscuro" });
        const text = '- primo indizio\n- secondo indizio, "tra virgolette"\n\nUna riga con $dollari e `apici`.';
        expect((await call("write", { page: "Appunti", type: "item", text })).isError).toBe(false);
        expect(readFileSync(join(folder, "world", "items", "Appunti.md"), "utf8")).toBe(`${text}\n`);
    });

    it("takes fields as an object, so lists of links need no quoting", async () => {
        await call("init", { name: "Guadoscuro" });
        await call("write", { page: "Lena", type: "character", set: { role: "companion", knows: ["[[Varro]]", "[[Il mulino#Le chiuse]]"] } });
        await call("write", { page: "Lena", add: { knows: "[[Mirta]]" } });
        expect(JSON.parse((await runCommandLine(["show", "Lena", "--json"], testContext(folder))).output).fields).toEqual({ role: "companion", knows: ["[[Varro]]", "[[Il mulino#Le chiuse]]", "[[Mirta]]"] });
        expect(await call("write", { page: "Lena", set: { knows: [["[[Pietro]]"], ["[[Rosa]]"]] } })).toEqual({ text: expect.stringContaining("would hold a list inside a list"), isError: true });
    });

    it("refuses a parameter a tool does not have, instead of leaving it out", async () => {
        await call("init", { name: "Guadoscuro" });
        await call("write", { page: "Lena", type: "character" });
        expect(await call("effect", { action: "add", page: "Lena", name: "Benedizione", duration: "10 rounds" })).toEqual({ text: expect.stringContaining("duration"), isError: true });
        expect(readFileSync(join(folder, "world", "characters", "Lena.md"), "utf8")).not.toContain("Benedizione");
    });

    it("reports a failure as a tool error with the command's message", async () => {
        expect(await call("show", { page: "Varro" })).toEqual({ text: expect.stringContaining("There is no campaign here"), isError: true });
    });

    it("gives the instructions even where there is no campaign, so that the master can always read them", async () => {
        expect(await call("instructions", {})).toEqual({ text: expect.stringMatching(/^# Game master: core instructions/), isError: false });
    });

    it("is explained on the command line, where it is the only command of its kind", async () => {
        expect((await runCommandLine(["--help"], testContext(folder))).output).toContain("mcp          Start the MCP server for an AI host.");
        expect((await runCommandLine(["mcp", "--help"], testContext(folder))).output).toContain("the host starts it, with no options.");
    });

    it("lists the commands in two groups, with the first sentence of each description", async () => {
        const help = (await runCommandLine(["--help"], testContext(folder))).output;
        expect(help).toContain("Campaign:\n  init         Create a new campaign.\n  config       Show or change the campaign settings.\n  mcp          Start the MCP server for an AI host.");
        expect(help).toContain("Game:\n  instructions Your instructions as game master, in full: how to run this campaign and use these tools.\n  status       Show where the game stands.\n");
        expect(help).toContain("  validate     Check the whole campaign and say how to fix each problem.\n  write        Create or change a page of the world.");
    });
});

/** A client of a new server on `folder` that shows forms, answering each with `answer` after `delay` milliseconds; the forms it was shown go in `shown`. */
async function formClient(answer: ElicitResult, shown: unknown[], capabilities: Record<string, unknown> = { form: {} }, delay = 0, environment: Record<string, string> = {}): Promise<Client>
{
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer(testContext(folder), environment).connect(serverTransport);
    const forms = new Client({ name: "forms", version: "1.0.0" }, { capabilities: { elicitation: capabilities } });
    forms.setRequestHandler(ElicitRequestSchema, async (request) => {
        shown.push(request.params);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return answer;
    });
    await forms.connect(clientTransport);
    return forms;
}

describe("what the player changed on the dashboard (D-341)", () => {
    it("comes at the head of the master's next answer, once, even when the call fails", async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        const news = ["The player set difficulty to hard on the dashboard. Play by it from now on."];
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...testContext(folder), news: () => ({ lines: news.splice(0), restore: () => undefined }) }, {}).connect(serverTransport);
        const plain = new Client({ name: "plain", version: "1.0.0" });
        await plain.connect(clientTransport);
        const answer = async (name: string, args: Record<string, unknown>) => ((await plain.callTool({ name, arguments: args })).content as { text: string; }[])[0].text;
        expect(await answer("status", {})).toMatch(/^The player set difficulty to hard on the dashboard\. Play by it from now on\.\n\n\S/);
        expect(await answer("status", {})).not.toContain("The player set");
        news.push('The player took "ragni" off lines on the dashboard.');
        const failed = await plain.callTool({ name: "show", arguments: { page: "Nessuno" } });
        expect(failed.isError).toBe(true);
        expect((failed.content as { text: string; }[])[0].text).toMatch(/^The player took "ragni" off lines on the dashboard\.\n\n\S/);
        await plain.close();
    });

    it("takes in what the player changed while the call waited for them", async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc"], testContext(folder));
        const news: string[] = [];
        // A page where the player changes a setting before answering.
        const page: Player = {
            choose: async () => {
                news.push("The player set dice to physical on the dashboard: you roll your own and tell the values. Play by it from now on.");
                return 0;
            },
        };
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...testContext(folder), page, news: () => ({ lines: news.splice(0), restore: () => undefined }) }, {}).connect(serverTransport);
        const plain = new Client({ name: "plain", version: "1.0.0" });
        await plain.connect(clientTransport);
        await plain.callTool({ name: "status", arguments: {} });
        const answer = await plain.callTool({ name: "ask", arguments: { question: "Scavalcare il muro?", options: ["Avanti", "Indietro"], who: "Bruna" } });
        expect((answer.content as { text: string; }[])[0].text).toMatch(/^The player set dice to physical on the dashboard: .+\n\n\S/);
        await plain.close();
    });

    it("comes back for the next call when the user stops the one it was taken for, whose answer never goes", async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc"], testContext(folder));
        const news: string[] = [];
        let reached: () => void = () => undefined;
        const asked = new Promise<void>((done) => (reached = done));
        // A page that waits for the player until the call is stopped.
        const page: Player = {
            choose: (...given: Parameters<Player["choose"]>) =>
                new Promise((done) => {
                    reached();
                    given[3]?.addEventListener("abort", () => done(undefined));
                }),
        };

        const taken = () => {
            const lines = news.splice(0);

            // A part the news brings, as the mentor's, counts as told in the chat.
            if (lines.length > 0) {
                served.told?.add("told in the stopped call");
            }

            return { lines, restore: () => news.unshift(...lines) };
        };

        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        const served: Context = { ...testContext(folder), page, news: taken };
        await createMcpServer(served, {}).connect(serverTransport);
        const plain = new Client({ name: "plain", version: "1.0.0" });
        await plain.connect(clientTransport);
        await plain.callTool({ name: "status", arguments: {} });
        news.push("The player set difficulty to hard on the dashboard. Play by it from now on.");
        const stop = new AbortController();
        const asking = plain.callTool({ name: "ask", arguments: { question: "Scavalcare il muro?", options: ["Atletica 1d20+5", "Acrobazia 1d20+3"], who: "Bruna" } }, undefined, {
            signal: stop.signal,
        });
        await asked;
        stop.abort();
        await expect(asking).rejects.toThrow();
        await vi.waitFor(() => expect(news).toHaveLength(1));
        // What the stopped call told the chat is told again: its answer never went (D-97).
        expect(served.told?.has("told in the stopped call")).toBe(false);
        const after = ((await plain.callTool({ name: "status", arguments: {} })).content as { text: string; }[])[0].text;
        expect(after).toMatch(/^The player set difficulty to hard on the dashboard\. Play by it from now on\.\n\n\S/);
        await plain.close();
    });
});

describe("a host that shows forms (D-148, ASK-1)", () => {
    const wall = { question: "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options: ["Atletica 1d20+5", "Acrobazia 1d20+3"], who: "Bruna" };

    beforeEach(async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc"], testContext(folder));
    });

    it("offers ask to a host without forms while the dashboard runs, whose page asks the player, from the first call on (ASK-1, D-279)", async () => {
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        const page: Player = { choose: async () => 0 };
        await createMcpServer({ ...testContext(folder), page }, {}).connect(serverTransport);
        const plain = new Client({ name: "plain", version: "1.0.0" });
        await plain.connect(clientTransport);
        expect((await plain.listTools()).tools.map((tool) => tool.name)).not.toContain("ask");
        await plain.callTool({ name: "status", arguments: {} });
        expect((await plain.listTools()).tools.map((tool) => tool.name)).toContain("ask");
        expect(((await plain.callTool({ name: "ask", arguments: wall })).content as { text: string; }[])[0].text).toContain("Bruna, Atletica: 1d20+5");
        await plain.close();
    });

    it("sees ask, with a line in the instructions, and gets the player's click back in the same call", async () => {
        expect((await client.listTools()).tools.map((tool) => tool.name)).not.toContain("ask");
        expect((await call("instructions", {})).text).not.toContain("call `ask`");

        const shown: unknown[] = [];
        const forms = await formClient({ action: "accept", content: { choice: "Tiro: Acrobazia (1d20+3)" } }, shown);
        expect((await forms.listTools()).tools.map((tool) => tool.name)).toContain("ask");
        expect(((await forms.callTool({ name: "instructions", arguments: {} })).content as { text: string; }[])[0].text).toMatch(
            /call `ask` instead of stopping in words\. Never speak of buttons to the player: if one does not show, ask in words\.$/,
        );

        const result = await forms.callTool({ name: "ask", arguments: wall });
        expect((result.content as { text: string; }[])[0].text).toContain("Bruna, Acrobazia: 1d20+3 = 7 [4] + 3, rolled by the player.");
        expect(shown).toEqual([{
            mode: "form",
            message: wall.question,
            requestedSchema: { type: "object", properties: { choice: { type: "string", title: "Tiro", enum: ["Tiro: Atletica (1d20+5)", "Tiro: Acrobazia (1d20+3)", "Cambio idea"] } }, required: ["choice"] },
        }]);
        await forms.close();
    });

    it("takes ask away from a host that closes the form faster than anyone could read it, since it never showed it (ASK-6)", async () => {
        const closing = await formClient({ action: "cancel" }, []);
        expect(((await closing.callTool({ name: "ask", arguments: wall })).content as { text: string; }[])[0].text).toBe(
            "The player saw no buttons: ask them in words what the call held, which they have not seen: Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono (the checks: Atletica 1d20+5, Acrobazia 1d20+3). No word about buttons; then stop. From now on, always in words.",
        );
        expect((await closing.listTools()).tools.map((tool) => tool.name)).not.toContain("ask");
        expect(((await closing.callTool({ name: "instructions", arguments: {} })).content as { text: string; }[])[0].text).not.toContain("call `ask`");
        await closing.close();
    });

    it("says to ask in words when a person declined the form or answered with something that is no button, and refuses a hidden roll", async () => {
        const declined = await formClient({ action: "decline" }, [], { form: {} }, 1600);
        expect(((await declined.callTool({ name: "ask", arguments: wall })).content as { text: string; }[])[0].text).toBe(
            "No answer from the buttons: ask the player in words what the call held: Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono (the checks: Atletica 1d20+5, Acrobazia 1d20+3). Then stop.",
        );
        expect((await declined.listTools()).tools.map((tool) => tool.name)).toContain("ask");
        expect((await declined.callTool({ name: "ask", arguments: { ...wall, hidden: true } })).isError).toBe(true);
        await declined.close();

        const strange = await formClient({ action: "accept", content: { choice: "Tiro: Furtività (1d20+9)" } }, [], { form: {} }, 1600);
        expect(((await strange.callTool({ name: "ask", arguments: wall })).content as { text: string; }[])[0].text).toBe(
            "No answer from the buttons: ask the player in words what the call held: Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono (the checks: Atletica 1d20+5, Acrobazia 1d20+3). Then stop.",
        );
        await strange.close();
    });

    it("offers no ask inside the desktop app's Claude Code, which declares forms but does not show them", async () => {
        const desktop = await formClient({ action: "accept", content: { choice: "Sì" } }, [], { form: {} }, 0, { CLAUDE_CODE_ENTRYPOINT: "claude-desktop" });
        expect((await desktop.listTools()).tools.map((tool) => tool.name)).not.toContain("ask");
        expect(((await desktop.callTool({ name: "instructions", arguments: {} })).content as { text: string; }[])[0].text).not.toContain("call `ask`");
        await desktop.close();

        const terminal = await formClient({ action: "accept", content: { choice: "Sì" } }, [], { form: {} }, 0, { CLAUDE_CODE_ENTRYPOINT: "cli" });
        expect((await terminal.listTools()).tools.map((tool) => tool.name)).toContain("ask");
        await terminal.close();
    });

    it("takes a host that declares forms the older way, without modes, as one that shows them", async () => {
        const older = await formClient({ action: "accept", content: { choice: "Sì" } }, [], {});
        expect(((await older.callTool({ name: "ask", arguments: { question: "Attacco di opportunità?", options: ["Sì", "No"] } })).content as { text: string; }[])[0].text).toBe("The player chose: Sì.");
        await older.close();
    });
});

describe("MCP server, with the files of a session (D-193)", () => {
    it("makes the session ready before every tool: what its watchers name, and everything at instructions", async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc", "--set", "hp=12/12"], testContext(folder));
        const reports = new Map<string, (name: string | undefined) => void>();
        const session = new SessionStore({ watchFolder: (watched, changed) => (reports.set(resolve(watched), changed), { close: () => undefined }) });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...testContext(folder), files: session }).connect(serverTransport);
        const host = new Client({ name: "host", version: "1.0.0" });
        await host.connect(clientTransport);
        const status = async (): Promise<string> => ((await host.callTool({ name: "status", arguments: {} })).content as { text: string; }[])[0].text;
        const bruna = (hp: string): void => writeFileSync(join(folder, "world", "characters", "Bruna.md"), `---\nrole: pc\nhp: ${hp}\n---\n`);

        try {
            // The campaign is watched once the host has the tools, before any call.
            await vi.waitFor(() => expect(reports.has(resolve(folder, "world", "characters"))).toBe(true));
            expect(await status()).toContain("hp 12/12");
            bruna("7/12");
            expect(await status()).toContain("hp 12/12");
            await host.callTool({ name: "instructions", arguments: {} });
            expect(await status()).toContain("hp 7/12");
            bruna("6/12");
            reports.get(resolve(folder, "world", "characters"))?.("Bruna.md");
            expect(await status()).toContain("hp 6/12");
        } finally {
            await host.close();
            session.close();
        }
    });
});

describe("MCP server, what changed outside the chat (OUT-1–OUT-4, D-364)", () => {
    it("tells the master at the next call what changed by hand, each page's fields and text, logs it hidden and fires the events it set off", async () => {
        // The real clock: what changed while no chat was open is told by the time of the log's last line (OUT-4).
        const context = { ...testContext(folder), now: () => new Date() };
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
        inPlay(folder);
        const session = new SessionStore({ watchFolder: () => ({ close: () => undefined }) });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...context, files: session }).connect(serverTransport);
        const host = new Client({ name: "host", version: "1.0.0" });
        await host.connect(clientTransport);
        const tool = async (name: string, args: Record<string, unknown>): Promise<string> => ((await host.callTool({ name, arguments: args })).content as { text: string; }[])[0].text;

        try {
            await tool("instructions", {});
            await tool("write", { page: "Bruna", type: "character", set: { role: "pc", hp: "12/12" }, text: "Una guerriera." });
            await tool("write", { page: "Varro", type: "character", set: { role: "npc" } });
            await tool("write", { page: "La vendetta del fratello", type: "event", set: { when: "[[Varro]] dead" } });
            expect(await tool("status", {})).not.toContain("Changed outside");

            // By hand, as in Obsidian: a number and the text of a page, a death, a new page, a setting.
            const bruna = join(folder, "world", "characters", "Bruna.md");
            writeFileSync(bruna, readFileSync(bruna, "utf8").replace("hp: 12/12", "hp: 7/12").replace("Una guerriera.", "Una guerriera ferita."));
            const varro = join(folder, "world", "characters", "Varro.md");
            writeFileSync(varro, readFileSync(varro, "utf8").replace("role: npc", "role: npc\nstatus: dead"));
            writeFileSync(join(folder, "world", "places", "Cortile.md"), "---\ntype: place\n---\n");
            writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("difficulty: normal", "difficulty: hard"));

            // The next call checks everything, as instructions does: what changed comes first, with the events it set off.
            const told = await tool("instructions", {});
            expect(told).toMatch(/^Changed outside this chat since your last call, by hand or elsewhere \(the log keeps it, hidden\): /);
            expect(told).toContain("Bruna: hp 12/12 → 7/12, and its text");
            expect(told).toContain("Varro: status — → dead");
            expect(told).toContain("campaign.yaml: difficulty normal → hard");
            expect(told).toContain("new: Cortile");
            expect(told).toMatch(/Take it as the game's truth, and go on from it\.\n\nNow due: La vendetta del fratello/);
            const log = readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
            expect(log.filter((entry) => entry.type === "changed-outside").at(-1)).toMatchObject({
                by: "outside",
                visibility: "hidden",
                data: { files: expect.arrayContaining([{ file: "world/characters/Bruna.md", fields: { hp: ["12/12", "7/12"] }, text: true }]) },
            });
            expect(log.at(-1)).toMatchObject({ type: "event-due", visibility: "hidden", data: { event: "La vendetta del fratello" } });
            // Once: the next call says nothing of it, and what rpg writes itself is never outside.
            await tool("write", { page: "Bruna", set: { hp: "9/12" } });
            expect(await tool("status", {})).not.toContain("Changed outside");
        } finally {
            await host.close();
            session.close();
        }
    });

    it("names at a chat's first call the files changed while no chat was open (OUT-4)", async () => {
        // The real clock: what changed while no chat was open is told by the time of the log's last line (OUT-4).
        const context = { ...testContext(folder), now: () => new Date() };
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
        await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc"], context);
        const bruna = join(folder, "world", "characters", "Bruna.md");
        writeFileSync(bruna, `${readFileSync(bruna, "utf8")}\nScritto a mano.\n`);
        const later = new Date(Date.now() + 60_000);
        utimesSync(bruna, later, later);
        const session = new SessionStore({ watchFolder: () => ({ close: () => undefined }) });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...context, files: session }).connect(serverTransport);
        const host = new Client({ name: "host", version: "1.0.0" });
        await host.connect(clientTransport);
        const tool = async (name: string, args: Record<string, unknown>): Promise<string> => ((await host.callTool({ name, arguments: args })).content as { text: string; }[])[0].text;

        try {
            expect(await tool("instructions", {})).toMatch(
                /^Changed outside rpg while no chat was open \(the log keeps it, hidden\): world\/characters\/Bruna\.md\. Read those that matter with show\./,
            );
            expect(await tool("status", {})).not.toContain("Changed outside");
        } finally {
            await host.close();
            session.close();
        }
    });
});

describe("MCP server, loading a save in a session (SAV-5)", () => {
    it("reads the campaign as the save gave it back, at the very next call", async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        await runCommandLine(["config", "saves", "free"], testContext(folder));
        const session = new SessionStore({ watchFolder: () => ({ close: () => undefined }) });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...testContext(folder), files: session }).connect(serverTransport);
        const host = new Client({ name: "host", version: "1.0.0" });
        await host.connect(clientTransport);
        const tool = async (name: string, args: Record<string, unknown>): Promise<string> => ((await host.callTool({ name, arguments: args })).content as { text: string; }[])[0].text;

        try {
            await tool("instructions", {});
            await tool("write", { page: "Bruna", type: "character", set: { role: "pc", hp: "12/12" } });
            await tool("save", { action: "make" });
            await tool("change", { page: "Bruna", field: "hp", by: -5 });
            await tool("write", { page: "Varro", type: "character", set: { role: "npc" } });
            expect(await tool("status", {})).toContain("hp 7/12");
            await tool("save", { action: "load", save: "1" });
            // The chat that went on remembers what is gone: nothing runs in it, instructions too leaves the game shut, until the player confirms a new chat (D-361, D-362).
            expect(await tool("status", {})).toMatch(/^The game went back to save 1 - save\. If this chat went on before that: This chat remembers what is gone: ask the player to open a new chat /);
            expect(await tool("write", { page: "Lia", type: "character" })).toContain("then call save with action new chat.");
            expect(await tool("instructions", {})).toMatch(/^The game went back to save 1 - save\. Before going on, ask the player to confirm this chat began after it/);
            expect(await tool("status", {})).toMatch(/^The game went back to save 1 - save\./);
            expect(await tool("save", { action: "new chat" })).toBe("The game goes on in this chat, from save 1 - save, as status gives it: tell nothing of what came after.");
            expect(await tool("instructions", {})).not.toContain("The game went back");
            expect(await tool("save", { action: "new chat" })).toBe("The game did not go back since the last chat began: there is nothing to confirm. Go on with the story.");
            // What the load wrote is rpg's own: never told as changed outside (OUT-1).
            const after = await tool("status", {});
            expect(after).toContain("hp 12/12");
            expect(after).not.toContain("Changed outside");
            expect(await tool("show", { page: "Lia" })).toContain("There is no page named Lia");
            expect(await tool("show", { page: "Varro" })).toContain("There is no page named Varro");

            // A save holds the files as the disk has them, also those the session read before they were changed by hand, outside world and rules.
            writeFileSync(join(folder, "sessions", "note.md"), "v1");
            await tool("save", { action: "make" });
            writeFileSync(join(folder, "sessions", "note.md"), "v2");
            writeFileSync(join(folder, "sessions", "nuova.md"), "nuova");
            await tool("save", { action: "make" });
            const [last] = readdirSync(join(folder, ".saves")).filter((file) => file.startsWith("003"));
            const held = unpackFiles(readFileSync(join(folder, ".saves", last)));
            expect(new TextDecoder().decode(held["sessions/note.md"])).toBe("v2");
            expect(new TextDecoder().decode(held["sessions/nuova.md"])).toBe("nuova");
        } finally {
            await host.close();
            session.close();
        }
    });
});

describe("MCP server, starting a session (D-194)", () => {
    it("lists the tools to a host that asks for them after initialized before it reads the campaign", async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        const order: string[] = [];

        class SeenSession extends SessionStore
        {
            override async ready(everything = false): Promise<void>
            {
                order.push(everything ? "read the campaign" : "ready");
                return super.ready(everything);
            }
        }

        const session = new SeenSession({ watchFolder: () => ({ close: () => undefined }) });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...testContext(folder), files: session }).connect(serverTransport);
        const host = new Client({ name: "host", version: "1.0.0" });
        await host.connect(clientTransport);

        try {
            // As Claude Code and Gemini CLI do, some 40 milliseconds after initialized.
            await new Promise((done) => setTimeout(done, 50));
            await host.listTools();
            order.push("tools");
            await vi.waitFor(() => expect(order).toContain("read the campaign"));
            expect(order).toEqual(["tools", "read the campaign"]);
        } finally {
            await host.close();
            session.close();
        }
    });

    it("brings the start lines of the campaign's AGENTS.md and the files beside it up to date, keeping the player's own text (D-97, D-242)", async () => {
        await runCommandLine(["init", "--name", "Rocca"], testContext(folder));
        const agents = join(folder, "AGENTS.md");
        const current = readFileSync(agents, "utf8");
        writeFileSync(agents, `${current.replace(startInstructions(), "Old start lines.")}\nParla come un bardo.\n`);
        rmSync(join(folder, "CLAUDE.md"));
        rmSync(join(folder, ".claude"), { recursive: true });

        const session = new SessionStore({ watchFolder: () => ({ close: () => undefined }) });
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer({ ...testContext(folder), files: session }).connect(serverTransport);
        const host = new Client({ name: "host", version: "1.0.0" });
        await host.connect(clientTransport);

        try {
            await vi.waitFor(() => expect(readFileSync(agents, "utf8")).toBe(`${current}\nParla come un bardo.\n`));
            expect(readFileSync(join(folder, "CLAUDE.md"), "utf8")).toBe("@AGENTS.md\n");
            expect(JSON.parse(readFileSync(join(folder, ".claude", "settings.json"), "utf8"))).toEqual({ autoMemoryEnabled: false });
            expect(readFileSync(join(folder, ".codex", "config.toml"), "utf8")).toContain("use_memories = false");
            expect(JSON.parse(readFileSync(join(folder, ".gemini", "settings.json"), "utf8"))).toMatchObject({ tools: { exclude: ["write_file", "replace"] } });
        } finally {
            await host.close();
            session.close();
        }
    });
});

describe("rpg mcp, as a host starts it", () => {
    beforeEach(async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
    });

    /** The server in a new process, as a host starts it, initialized by a host with these capabilities; what it writes goes in `output`. */
    async function startServer(capabilities: object, output: string[]): Promise<{ send: (message: object) => boolean; server: ChildProcessByStdio<Writable, Readable, null>; }>
    {
        // Not as the host that runs the tests may be: one whose forms the server leaves out.
        const env = { ...process.env, CLAUDE_CODE_ENTRYPOINT: "" };
        const server = spawn(process.execPath, [fileURLToPath(new URL("../src/cli.ts", import.meta.url)), "mcp"], { cwd: folder, env, stdio: ["pipe", "pipe", "ignore"] });
        server.stdout.on("data", (data: Buffer) => output.push(data.toString()));
        const send = (message: object): boolean => server.stdin.write(`${JSON.stringify(message)}\n`);
        send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities, clientInfo: { name: "test", version: "1" } } });
        await until(output, '"id":1');
        send({ jsonrpc: "2.0", method: "notifications/initialized" });
        return { send, server };
    }

    /** The exit code of the server once its input closes; "still running" if it is still there after five seconds. */
    async function endInput(server: ChildProcessByStdio<Writable, Readable, null>): Promise<number | string | null>
    {
        const ended = new Promise<number | string | null>((done) => {
            const timer = setTimeout(() => (server.kill(), done("still running")), 5000);
            server.on("exit", (code) => (clearTimeout(timer), done(code)));
        });
        server.stdin.end();
        return ended;
    }

    async function until(output: string[], text: string): Promise<void>
    {
        while (!output.join("").includes(text)) {
            await new Promise((done) => setTimeout(done, 20));
        }
    }

    it("answers, and ends when the host goes and its input closes, after its watchers started (D-193)", async () => {
        const output: string[] = [];
        const { send, server } = await startServer({}, output);
        send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "status", arguments: {} } });
        await until(output, '"id":2');
        expect(output.join("")).toContain("Rocca");
        expect(await endInput(server)).toBe(0);
    }, 30000);

    it("ends when the host goes while a player's form still waits", async () => {
        const output: string[] = [];
        const { send, server } = await startServer({ elicitation: {} }, output);
        send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "ask", arguments: { question: "Apri la porta?", options: ["Sì", "No"] } } });
        await until(output, "elicitation/create");
        expect(await endInput(server)).toBe(0);
    }, 30000);
});
