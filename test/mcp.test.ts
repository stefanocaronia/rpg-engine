import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema, type ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { commands } from "../src/commands/index.ts";
import { createMcpServer } from "../src/mcp-server.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

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
        expect(Object.keys(write?.inputSchema.properties ?? {})).toEqual(["page", "type", "set", "unset", "add", "remove", "text", "section", "append", "secret"]);
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
        expect(await call("init", { name: "Guadoscuro", language: "it", system: "5e", difficulty: "normal", lethality: "dice" })).toEqual({ text: `Created the campaign "Guadoscuro" in ${folder}.`, isError: false });
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

describe("a host that shows forms (D-148, ASK-1)", () => {
    const wall = { question: "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options: ["Atletica 1d20+5", "Acrobazia 1d20+3"], who: "Bruna" };

    beforeEach(async () => {
        await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], testContext(folder));
        await runCommandLine(["write", "Bruna", "--type", "character", "--set", "role=pc"], testContext(folder));
    });

    it("sees ask, with a line in the instructions, and gets the player's click back in the same call", async () => {
        expect((await client.listTools()).tools.map((tool) => tool.name)).not.toContain("ask");
        expect((await call("instructions", {})).text).not.toContain("call `ask`");

        const shown: unknown[] = [];
        const forms = await formClient({ action: "accept", content: { choice: "Tiro: Acrobazia (1d20+3)" } }, shown);
        expect((await forms.listTools()).tools.map((tool) => tool.name)).toContain("ask");
        expect(((await forms.callTool({ name: "instructions", arguments: {} })).content as { text: string; }[])[0].text).toMatch(/call `ask` instead of stopping in words\.$/);

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
            "This app does not show the player the buttons: ask them in words, and stop; from now on, always in words.",
        );
        expect((await closing.listTools()).tools.map((tool) => tool.name)).not.toContain("ask");
        expect(((await closing.callTool({ name: "instructions", arguments: {} })).content as { text: string; }[])[0].text).not.toContain("call `ask`");
        await closing.close();
    });

    it("says to ask in words when a person declined the form or answered with something that is no button, and refuses a hidden roll", async () => {
        const declined = await formClient({ action: "decline" }, [], { form: {} }, 1600);
        expect(((await declined.callTool({ name: "ask", arguments: wall })).content as { text: string; }[])[0].text).toBe("No answer from the buttons: ask the player in words, and stop.");
        expect((await declined.listTools()).tools.map((tool) => tool.name)).toContain("ask");
        expect((await declined.callTool({ name: "ask", arguments: { ...wall, hidden: true } })).isError).toBe(true);
        await declined.close();

        const strange = await formClient({ action: "accept", content: { choice: "Tiro: Furtività (1d20+9)" } }, [], { form: {} }, 1600);
        expect(((await strange.callTool({ name: "ask", arguments: wall })).content as { text: string; }[])[0].text).toBe("No answer from the buttons: ask the player in words, and stop.");
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
