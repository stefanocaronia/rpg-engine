// The parts of the master's instructions, layered from the core to the game system, and given once in a chat (D-97, D-121).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { corePart, layeredPart } from "../src/instructions/index.ts";
import { createMcpServer } from "../src/mcp-server.ts";
import { fightGuidance, inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

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
        expect(layeredPart([core, { text: "System.", replace: false }])).toBe("Core.\n\nSystem.");
        expect(layeredPart([core, { text: "System alone.", replace: true }])).toBe("System alone.");
        expect(layeredPart([undefined, { text: "System.", replace: false }])).toBe("System.");
        expect(layeredPart([core, undefined])).toBe("Core.");
        expect(layeredPart([undefined, undefined])).toBeUndefined();
    });

    it("give, in play, the core, then the part of play with the system's after a blank line (MOD-5)", async () => {
        await ok("init", "--name", "Rocca", "--system", "5e");
        inPlay(folder);
        const given = await ok("instructions");
        expect(given).toMatch(/^# Game master: core instructions\n/);
        expect(given).toMatch(/\n\n## Play\n\nThe story is on\.[\s\S]*14\. The player sees their whole sheet[^\n]*\n\n### Fifth edition\n\n- At difficulty normal, fights run from moderate to high difficulty \(XP budget per character\)/);
        expect(given).not.toContain("## Setup");
    });

    it("come from the system of the campaign too: a game without turns tells a fight its own way (D-111)", async () => {
        await ok("init", "--name", "Ferro", "--system", "ironsworn");
        inPlay(folder);
        const opened = await ok("scene", "open", "--title", "Il guado", "--type", "combat");
        expect(opened).toContain("A fight has no turns: whoever has initiative acts");
        expect(opened).not.toContain(fightGuidance);
        expect(await ok("scene", "close", "--summary", "Passati.")).not.toContain("initiative");
    });
});

describe("a part of the instructions in a chat (D-97)", () => {
    it("comes the first time its situation opens, again after instructions, and every time on the command line", async () => {
        await ok("init", "--name", "Rocca", "--system", "5e");
        inPlay(folder);
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

            // The part of a mode, with the system's, comes with every instructions (MOD-5).
            await ok("scene", "close", "--summary", "Basta.");
            writeFileSync(join(folder, "state.yaml"), "mode: session zero\n");
            const zero = "## Session zero\n\nPlay, as with a human game master";
            expect(await call("instructions", {})).toContain(zero);
            expect(await call("instructions", {})).toContain("Agree first, before any die, and set with config in table");
        } finally {
            await host.close();
        }
    });
});
