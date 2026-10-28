// The parts of the master's instructions, layered from the core to the game system, and given once in a chat (D-97, D-121).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { corePart, layeredPart } from "../src/instructions/index.ts";
import { createMcpServer } from "../src/server/mcp.ts";
import { explorationGuidance, fightGuidance, inPlay, madeSystem, makeTempFolder, removeFolder, testContext, travelGuidance } from "./support.ts";

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
        expect(corePart("social")).toMatch(/^In a talk, one speaks for a group/);
        expect(corePart("travel")).toBe(travelGuidance);
        expect(corePart("exploration")).toBe(explorationGuidance);
        expect(corePart("challenge")).toMatch(/^Run a challenge as a scene of its own\. Say its stake before the first roll/);
        expect(corePart("adventure")).toMatch(/^An adventure is a quest with its secrets and events; a written or planned one opens as it is written\. Build one so:\n\n1\. /);
        expect(corePart("session")).toMatch(/^Before this session opens, choose about ten secrets not tied to places[^\n]*Open it with a short recap of what the files hold/);
        expect(corePart("rest")).toBeUndefined();
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
        await ok("init", "--name", "Rocca", "--system", "fake");
        inPlay(folder);
        const given = await ok("instructions");
        expect(given).toMatch(/^# Game master: core instructions\n/);
        expect(given).toMatch(
            /\n\n## Play\n\nThe story is on\.[\s\S]*\d+\. The player sees their whole sheet[^\n]*\n\n### Before you send\n\nRead your message once as the player will\.[^\n]*handing the choice back\?\n\n### The fake system\n\n- A roll is two six-sided dice and a bonus, 8 or more succeeds/,
        );
        expect(given).not.toContain("## Setup");
    });

    it("give a fight the core's words for any game, then its system's; the 5e's, armor class, attacks and damage, are tested in its repository (D-514)", async () => {
        await ok("init", "--name", "Rocca", "--system", "fake");
        inPlay(folder);
        const opened = await ok("scene", "open", "--title", "Agguato", "--type", "combat");
        expect(opened).toContain(fightGuidance);
        expect(fightGuidance).not.toMatch(/armor|damage|d20/i);
    });

    it("give the mentor's part for the way the player wants the game taught, with the system's and what was already explained; none when off (D-347)", async () => {
        await ok("init", "--name", "Rocca", "--system", "fake");
        inPlay(folder);
        expect(await ok("instructions")).not.toContain("mentor");
        await ok("config", "mentor", "hints");
        const hints = await ok("instructions");
        expect(hints).toContain("The player wants a hint now and then (mentor hints).");
        expect(hints).not.toContain("mentor tutorial");
        await ok("config", "mentor", "tutorial");
        await ok("config", "learned", "--add", "Edge and Odds", "--add", "Falling");
        const tutorial = await ok("instructions");
        expect(tutorial).toMatch(/The player is learning the game \(mentor tutorial\)\.[^\n]*\n\nIn the fake system, the first evenings,[^\n]*\n\nAlready explained: Edge and Odds, Falling\./);
        await ok("config", "mentor", "off");
        expect(await ok("instructions")).not.toContain("mentor");
        expect(await ok("status")).not.toContain("mentor");
        await ok("config", "mentor", "hints");
        expect(await ok("status")).toMatch(/ · mentor hints · /);
    });

    it("give the mentor's part when the master sets it with config, once in a chat, as in the setup; the player's change comes with the news instead (D-347)", async () => {
        await ok("init", "--name", "Rocca", "--system", "fake");
        const chat = { ...context, told: new Set<string>() };
        const set = async (value: string) => (await runCommandLine(["config", "mentor", value], chat)).output;
        expect(await set("tutorial")).toMatch(/^mentor: tutorial: each mechanic explained[\s\S]*\n\nThe player is learning the game \(mentor tutorial\)\.[^\n]*\n\nIn the fake system, the first evenings,/);
        expect(await set("tutorial")).not.toContain("(mentor tutorial)");
        expect(await set("hints")).toContain("The player wants a hint now and then (mentor hints).");
        expect(await set("off")).not.toContain("mentor hints");
        expect((await runCommandLine(["config", "mentor", "tutorial"], { ...chat, told: new Set<string>(), actor: "player" })).output).not.toContain("(mentor tutorial)");
    });

    it("come from the system of the campaign too: a game without turns tells a fight its own way (D-111)", async () => {
        // A system of the test's own, whose part combat takes the core's place.
        const systems = madeSystem("duello", {
            "system.yaml": "title: a test system without turns\nlanguage: en\n",
            "instructions/combat.md": "---\nreplace: true\n---\nA fight has no turns: whoever has the upper hand acts, and a miss gives it to the foe.\n",
        });
        context = { ...context, systemFolders: [systems] };
        await ok("init", "--name", "Ferro", "--system", "duello");
        inPlay(folder);
        const opened = await ok("scene", "open", "--title", "Il guado", "--type", "combat");
        expect(opened).toContain("A fight has no turns: whoever has the upper hand acts");
        expect(opened).not.toContain(fightGuidance);
        expect(await ok("scene", "close", "--summary", "Passati.")).not.toContain("initiative");
    });
});

describe("a part of the instructions in a chat (D-97)", () => {
    it("comes the first time its situation opens, again after instructions, and every time on the command line", async () => {
        await ok("init", "--name", "Rocca", "--system", "fake");
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
            expect(await call("instructions", {})).toContain("Choose the vocations first, with their ranks");
        } finally {
            await host.close();
        }
    });
});
