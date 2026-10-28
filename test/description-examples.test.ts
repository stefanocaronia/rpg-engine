// The examples of the commands' descriptions in the names of the campaign's game system (D-518): the MCP server gives the fake system's to its own
// campaign, as the 5e's to a 5e campaign in its repository, and neutral names to free play, to a folder without a campaign and to the command line; after config system, the new system's.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Player } from "../src/core/context.ts";
import { createMcpServer } from "../src/server/mcp.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let client: Client | undefined;

afterEach(async () => {
    await client?.close();
    client = undefined;
    removeFolder(folder);
});

/** The descriptions the host reads, each tool's with its parameters', by tool. */
async function shown(system: string | undefined): Promise<Record<string, string>>
{
    folder = makeTempFolder();
    // A player who answers in a form, so that ask is among the tools.
    const context = { ...testContext(folder), player: {} as Player };

    if (system !== undefined) {
        expect((await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", system], context)).exitCode).toBe(0);
    }

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer(context).connect(serverTransport);
    client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientTransport);
    return described(client);
}

async function described(from: Client): Promise<Record<string, string>>
{
    const { tools } = await from.listTools();
    return Object.fromEntries(tools.map((tool) => [tool.name, [tool.description, ...Object.values((tool.inputSchema.properties ?? {}) as Record<string, { description?: string; }>).map((field) => field.description)].join("\n")]));
}

describe("the examples of the descriptions (D-518)", () => {
    it("names the fake system's own, never the 5e's", async () => {
        const tools = await shown("fake");
        expect(tools.change).toContain('field grit, by -3, why "bitten by the wolf"; or recipe "night\'s sleep".');
        expect(tools.change).toContain('such as money: 34 crown 4 shilling: spend "5 shilling" pays');
        expect(tools.change).toContain("such as field stamina-d6, spend 2");
        expect(tools.roll).toContain("Example: notation 2d6+notice, why");
        expect(tools.ask).toContain('options ["notice 2d6+notice", "might-bonus 2d6+might-bonus"]');
        expect(tools.scene).toContain("such as move, deed, strike");
        expect(tools.effect).toContain("set guard-bonus=2.");
        expect(tools.trade).toContain('gives "2 crown", gets');
        expect(Object.values(tools).join("\n")).not.toMatch(/\{\{\w+\}\}/);
    });

    it("gives neutral names to free play, to a folder without a campaign and to the command line", async () => {
        const neutral = ['field health, by -3, why "bitten by the wolf"; or recipe "night\'s rest".', "such as money: 34 gold 4 silver"];

        for (const tools of [await shown("free"), await shown(undefined)]) {
            expect(tools.change).toContain(neutral[0]);
            expect(tools.change).toContain(neutral[1]);
            expect(tools.roll).toContain("Example: notation 2d6+wits, why");
            expect(tools.scene).toContain("such as action, move, reaction");
            expect(tools.effect).toContain("set bonus-armor=2.");
        }

        const help = (await runCommandLine(["change", "--help"], testContext(folder))).output;
        expect(help).toContain(neutral[0]);
        expect(help).not.toMatch(/\{\{\w+\}\}/);
    });

    it("follows the system config sets, in the same chat, as after init", async () => {
        await shown("free");
        await client?.callTool({ name: "config", arguments: { setting: "system", value: "fake" } });
        const tools = await described(client!);
        expect(tools.change).toContain("field grit, by -3");
        expect(tools.scene).toContain("such as move, deed, strike");
    });
});
