import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
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
        expect(tools.map((tool) => tool.name)).toEqual(commands.map((command) => command.name));

        const write = tools.find((tool) => tool.name === "write");
        expect(write?.description).toBe(commands.find((command) => command.name === "write")?.description);
        expect(Object.keys(write?.inputSchema.properties ?? {})).toEqual(["page", "type", "set", "unset", "add", "remove", "text", "section", "append", "secret"]);
    });

    it("sends the host to status, marks the tools that change nothing, and loads status at once", async () => {
        expect(client.getInstructions()).toContain("call `status`");
        expect(client.getInstructions()!.length).toBeLessThan(512);

        const { tools } = await client.listTools();
        const tool = (name: string) => tools.find((candidate) => candidate.name === name);
        expect(tool("status")?.annotations?.readOnlyHint).toBe(true);
        expect(tool("status")?._meta).toEqual({ "anthropic/alwaysLoad": true });
        expect(tool("show")?.annotations?.readOnlyHint).toBe(true);
        expect(tool("write")?.annotations).toBeUndefined();
    });

    it("answers with the same text as the command line", async () => {
        expect(await call("init", { name: "Guadoscuro", language: "it", system: "5e" })).toEqual({ text: `Created the campaign "Guadoscuro" in ${folder}.`, isError: false });
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

    it("reports a failure as a tool error with the command's message", async () => {
        expect(await call("show", { page: "Varro" })).toEqual({ text: expect.stringContaining("There is no campaign here"), isError: true });
    });

    it("is explained on the command line, where it is the only command of its kind", async () => {
        expect((await runCommandLine(["--help"], testContext(folder))).output).toContain("mcp      Start the MCP server for an AI host.");
        expect((await runCommandLine(["mcp", "--help"], testContext(folder))).output).toContain("the host starts it, with no options.");
    });

    it("lists the commands in two groups, with the first sentence of each description", async () => {
        const help = (await runCommandLine(["--help"], testContext(folder))).output;
        expect(help).toContain("Campaign:\n  init     Create a new campaign.\n  config   Show or change the campaign settings.\n  mcp      Start the MCP server for an AI host.");
        expect(help).toContain(
            "Game:\n  status   Show the campaign's state and your instructions as game master.\n  write    Create or change a page of the world.\n  show     Show a page of the world, or one of its sections or secrets.\n  find     Find pages of the world.\n  roll     Roll dice and log the roll.\n  change   Change a counter on a page: hit points, uses, ammunition, supply, a progress track.",
        );
    });
});
