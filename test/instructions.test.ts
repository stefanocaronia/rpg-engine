// The parts of the master's instructions, layered from the core to the game system, and given once in a chat (D-97, D-121).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { corePart, layeredPart } from "../src/instructions/index.ts";
import { createMcpServer } from "../src/mcp-server.ts";
import { fightGuidance, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
});

afterEach(() => removeFolder(folder));

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

describe("the parts of the instructions (D-121)", () => {
    it("are the core's files by name, none for a name the core lacks or that is no plain name", () => {
        expect(corePart("combat")).toBe(fightGuidance);
        expect(corePart("new-day")).toMatch(/^Move each clock as its event says/);
        expect(corePart("social")).toBeUndefined();
        expect(corePart("../package")).toBeUndefined();
    });

    it("add each layer to those below, unless a layer says it takes their place", () => {
        const core = { text: "Core.", replace: false };
        expect(layeredPart([core, { text: "System.", replace: false }])).toBe("Core.\nSystem.");
        expect(layeredPart([core, { text: "System alone.", replace: true }])).toBe("System alone.");
        expect(layeredPart([undefined, { text: "System.", replace: false }])).toBe("System.");
        expect(layeredPart([core, undefined])).toBe("Core.");
        expect(layeredPart([undefined, undefined])).toBeUndefined();
    });

    it("come from the system of the campaign too: a game without turns tells a fight its own way (D-111)", async () => {
        await ok("init", "--name", "Ferro", "--system", "ironsworn");
        const opened = await ok("scene", "open", "--title", "Il guado", "--type", "combat");
        expect(opened).toContain("A fight has no turns: whoever has initiative acts");
        expect(opened).not.toContain(fightGuidance);
        expect(await ok("scene", "close", "--summary", "Passati.")).not.toContain("initiative");
    });
});

describe("a part of the instructions in a chat (D-97)", () => {
    it("comes the first time its situation opens, again after instructions, and every time on the command line", async () => {
        await ok("init", "--name", "Rocca", "--system", "5e");
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await createMcpServer(testContext(folder)).connect(serverTransport);
        const host = new Client({ name: "host", version: "1.0.0" });
        await host.connect(clientTransport);
        const call = async (name: string, args: Record<string, unknown>): Promise<string> => ((await host.callTool({ name, arguments: args })).content as { text: string; }[])[0].text;

        const fight = async (): Promise<string> => {
            const opened = await call("scene", { action: "open", title: "Agguato", type: "combat" });
            await call("scene", { action: "close", summary: "Respinti." });
            return opened;
        };

        try {
            expect(await fight()).toContain(fightGuidance);
            expect(await fight()).not.toContain(fightGuidance);
            await call("instructions", {});
            expect(await fight()).toContain(fightGuidance);
            expect(await ok("scene", "open", "--title", "Ancora", "--type", "combat")).toContain(fightGuidance);

            // The system's part, as status gives it while the player character is being made (DAT-12).
            const creation = "Creating the player character (5e): agree first";
            expect(await call("status", {})).toContain(creation);
            expect(await call("status", {})).not.toContain(creation);
            await call("instructions", {});
            expect(await call("status", {})).toContain(creation);
        } finally {
            await host.close();
        }
    });
});
