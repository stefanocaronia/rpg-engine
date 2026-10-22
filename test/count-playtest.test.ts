// The counts of a playtest run (playtests/count-playtest.mjs), on a run made up here: the character agent's calls (D-490), apart from the master's own.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { makeTempFolder } from "./support.ts";

const script = fileURLToPath(new URL("../playtests/count-playtest.mjs", import.meta.url));
let table: string;
let session: { calls: Record<string, number>; otherTools: { tool: string; }[]; characterAgent: CharacterCall[]; };

interface CharacterCall
{
    turn: string;
    who: string;
    as: string[];
    otherCalls: string[];
    background: boolean;
    failed: boolean;
    seconds?: number;
    tokensRead: number;
    tokens?: number;
    saysAndDoes: boolean;
    unknownNames: string[];
}

beforeAll(() => {
    const folder = makeTempFolder();
    const results = join(folder, "results");
    const world = join(folder, "world");
    writeRun(results, world);
    table = execFileSync(process.execPath, [script, results, world], { encoding: "utf8" });
    session = JSON.parse(readFileSync(join(folder, "numbers.json"), "utf8"))["session-1"];
});

describe("the character agent's calls in a playtest's counts (D-490)", () => {
    it("are counted apart from the master's: its view is no call of the master, and only another agent is another tool", () => {
        expect(session.calls).toEqual({ Agent: 4, roll: 1 });
        expect(session.otherTools.map((tool) => tool.tool)).toEqual(["Agent"]);
        expect(session.characterAgent.map((call) => `${call.turn} ${call.who}`)).toEqual(["M1 Ermanno", "M2 Gisella", "M2 Gisella"]);
    });

    it("say whether the view was the character's the message names, in the background or not, how long and how many tokens, each message of the subagent once", () => {
        const [ermanno, gisellaInBackground, gisellaWithoutView] = session.characterAgent;
        expect(ermanno).toMatchObject({ as: ["Ermanno"], background: false, failed: false, seconds: 6.215, tokensRead: 5220, tokens: 3425, saysAndDoes: true, otherCalls: [] });
        expect(gisellaInBackground).toMatchObject({ as: ["Ermanno"], background: true, seconds: 4, tokensRead: 300, tokens: 330, saysAndDoes: false });
        expect(gisellaWithoutView).toMatchObject({ as: [], otherCalls: ["show"], seconds: 3, tokensRead: 700, tokens: 740, saysAndDoes: true });
    });

    it("name what the character said that neither the message nor its view gave it: a page of the world, a name made up", () => {
        expect([...session.characterAgent[0].unknownNames].sort()).toEqual(["Agata", "Bortolo"]);
        expect(session.characterAgent[2].unknownNames).toEqual([]);
    });

    it("go into the table: calls per turn and by character, the same character twice in a turn, the views not theirs", () => {
        expect(table).toContain("| Character agent: calls (in the background, failed); its calls other than view | 3 (1, 0); M2 show |");
        expect(table).toContain("| Character agent: calls per turn, median (max); by character | 1.5 (2 M2); Ermanno 1, Gisella 2 |");
        expect(table).toContain("| Character agent: the same character more than once in a turn | M2 Gisella 2 |");
        expect(table).toContain("| Character agent: seconds per call, median (max); tokens per call, read over its model calls and Claude Code's count (medians) | 4 s (6.215 M1 Ermanno); 700, 740 |");
        expect(table).toContain("| Character agent: view as the name the message begins with; otherwise | 1 of 3; M2 Gisella: as Ermanno, M2 Gisella: no view |");
        expect(table).toContain("| Character agent: answers with Says and Does | 2 of 3 |");
        expect(table).toContain("| Character agent: names it said that neither the message nor its view gave it | M1 Ermanno: ");
    });
});

/** A run of one session of two master turns, as Claude Code streams them: the first calls the agent once, the second twice and another agent. */
function writeRun(results: string, world: string): void
{
    const session = join(results, "session-1");
    writeFile(join(session, "meta.json"), JSON.stringify({ started: "2026-10-23T10:00:00.000Z", options: {} }));
    writeFile(join(session, "end.json"), JSON.stringify({ at: "2026-10-23T10:10:00.000Z", stop: "player", count: 2, masterCost: 0.9, playerRunCost: 0.1 }));
    writeFile(join(session, "dialogue.md"), "**P1**\n\nCiao\n\n**M1**\n\nEcco.\n\n**P2**\n\nE Gisella?\n\n**M2**\n\nNo.\n\n");
    writeFile(join(session, "campaign-after", "log.jsonl"), `${JSON.stringify({ type: "campaign-created" })}\n`);

    for (const name of ["Ermanno", "Agata", "Gisella"]) {
        writeFile(join(session, "campaign-after", "world", "characters", `${name}.md`), "---\nrole: npc\n---\n\nUno del casale.\n");
    }

    writeFile(join(world, "characters", "Ermanno.md"), "---\nrole: npc\n---\n\nIl fabbro.\n");
    writeTurn(join(session, "turns", "M1.jsonl"), [
        { type: "system", subtype: "init", mcp_servers: [{ name: "rpg", status: "connected" }] },
        master({ type: "tool_use", id: "call1", name: "Agent", input: { subagent_type: "rpg-character", prompt: "Ermanno. Sei all'aia. Corrado ti dice: «Nino ti ha visto.» Cosa dici?" } }),
        { type: "system", subtype: "task_started", tool_use_id: "call1", is_backgrounded: false },
        subagent("call1", "s1", { input_tokens: 2, cache_creation_input_tokens: 2400, output_tokens: 3 }, { type: "tool_use", id: "v1", name: "mcp__rpg__view", input: { as: "Ermanno" } }),
        subagent("call1", "s1", { input_tokens: 2, cache_creation_input_tokens: 2400, output_tokens: 7 }, { type: "thinking", thinking: "" }),
        result("call1", "v1", "Ermanno (character)\n\n> [!secret] Cosa ha fatto\n> Spinse Piero nel pozzo.\n\nKnown:\n- Nino (character): il nipote."),
        { type: "system", subtype: "task_notification", tool_use_id: "call1", status: "completed", usage: { duration_ms: 6215 } },
        // In the foreground the subagent's last message is not streamed: it comes back whole in the call's result.
        {
            ...result(null, "call1", "[Subagent hand-back] …"),
            tool_use_result: {
                totalDurationMs: 6216,
                totalTokens: 3425,
                usage: { input_tokens: 2, cache_read_input_tokens: 2443, cache_creation_input_tokens: 373, output_tokens: 607 },
                content: [{ type: "text", text: "Says: «Il ragazzo sogna, come sua nonna Agata. Chiedilo a Bortolo.»\nDoes: Posa la pietra sull'orlo.\nKeeps: Piero era più leggero di questa pietra." }],
            },
        },
        master({ type: "text", text: "Ermanno posa la pietra." }),
        { type: "result", total_cost_usd: 0.4, num_turns: 3, duration_ms: 20000 },
    ]);
    writeTurn(join(session, "turns", "M2.jsonl"), [
        master({ type: "tool_use", id: "roll1", name: "mcp__rpg__roll", input: { dice: "1d20", who: "Corrado" } }),
        result(null, "roll1", "Corrado: 14"),
        master({ type: "tool_use", id: "call2", name: "Agent", input: { subagent_type: "rpg-character", prompt: "Gisella, nana dei colli. Ermanno ti guarda: «Hai dato la tua parola.»" } }),
        { type: "system", subtype: "task_started", tool_use_id: "call2", is_backgrounded: true },
        subagent("call2", "s3", { input_tokens: 100, output_tokens: 10 }, { type: "tool_use", id: "v2", name: "mcp__rpg__view", input: { as: "Ermanno" } }),
        subagent("call2", "s4", { input_tokens: 200, output_tokens: 20 }, { type: "text", text: "Says: «La parola è parola.»" }),
        { type: "system", subtype: "task_notification", tool_use_id: "call2", status: "completed", usage: { duration_ms: 4000, total_tokens: 330 } },
        master({ type: "tool_use", id: "call3", name: "Agent", input: { subagent_type: "rpg-character", prompt: "Gisella. Corrado ti chiede di fermarlo." } }),
        subagent("call3", "s5", { input_tokens: 300, output_tokens: 30 }, { type: "tool_use", id: "show1", name: "mcp__rpg__show", input: { page: "Ermanno" } }),
        subagent("call3", "s6", { input_tokens: 400, output_tokens: 40 }, { type: "text", text: "Says: «No.»\nDoes: Resta ferma accanto a Corrado." }),
        { ...result(null, "call3", "[Subagent hand-back] …"), tool_use_result: { totalDurationMs: 3000, totalTokens: 740 } },
        master({ type: "tool_use", id: "other1", name: "Agent", input: { subagent_type: "general-purpose", prompt: "Cerca." } }),
        master({ type: "text", text: "Gisella non si muove." }),
        { type: "result", total_cost_usd: 0.9, num_turns: 5, duration_ms: 30000 },
    ]);
}

function master(block: object): object
{
    return { type: "assistant", parent_tool_use_id: null, message: { id: `m-${JSON.stringify(block).length}`, content: [block], usage: { input_tokens: 10, output_tokens: 5 } } };
}

function subagent(parent: string, id: string, usage: object, block: object): object
{
    return { type: "assistant", parent_tool_use_id: parent, message: { id, content: [block], usage } };
}

function result(parent: string | null, toolUseId: string, text: string): object
{
    return { type: "user", parent_tool_use_id: parent, message: { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseId, content: [{ type: "text", text }] }] } };
}

function writeTurn(file: string, events: object[]): void
{
    writeFile(file, events.map((event) => JSON.stringify(event)).join("\n") + "\n");
}

function writeFile(file: string, text: string): void
{
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
}
