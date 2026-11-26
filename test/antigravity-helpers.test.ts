// Antigravity does the work outside the chat in its own chat (D-579 (1)): agy answers in stream-json, the brief comes as one message on its input, every start has
// a home of the engine's that is gone after, the player's model comes from their real settings, a refused effort is tried once more without it; the writer is
// sealed in an empty folder, the importer works outside the import's folder, fenced to it. A fake agy on a line of its own plays the program; the real one is
// never started.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DocumentReader, PictureSubject, TextWriter } from "../src/core/context.ts";
import { hosts } from "../src/core/hosts.ts";
import { type AgySettings, antigravityPainter, antigravityReader, antigravitySays, antigravityWriter, hostReader, hostWriter, painterSettings, playerModel, sealedSettings } from "../src/helpers/index.ts";
import { readImage } from "../src/images/index.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

// The fake: models, and a run that answers as mode.json beside it says, reading its input until it is closed; each start written to calls.jsonl.
const fakeScript = String.raw`
const { appendFileSync, existsSync, readdirSync, readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const here = __dirname;
const mode = JSON.parse(readFileSync(join(here, "mode.json"), "utf8"));
const args = process.argv.slice(2);
const log = (entry) => appendFileSync(join(here, "calls.jsonl"), JSON.stringify(entry) + "\n");
const say = (event) => process.stdout.write(JSON.stringify(event) + "\n");
const home = (process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME) ?? null;

if (args[0] === "models") {
    log({ models: true, home, homeThere: home !== null && existsSync(home) });
    process.exit(mode.models === false ? 1 : 0);
}

const effort = args.includes("--effort");
const settingsFile = args[args.indexOf("--settings") + 1];
const hooks = join(process.cwd(), ".agents", "hooks.json");
const fenceFile = join(dirname(settingsFile), "fence.json");
let input = "";
let answered = false;
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
    input += chunk;
    if (answered || !input.includes("\n")) { return; }
    answered = true;
    const message = JSON.parse(input.split("\n")[0]);
    log({
        args, cwd: process.cwd(), entries: readdirSync(process.cwd()), hooks: existsSync(hooks) ? JSON.parse(readFileSync(hooks, "utf8")) : null, message, settingsFile,
        settings: JSON.parse(readFileSync(settingsFile, "utf8")), helper: process.env.RPG_HELPER ?? null, host: process.env.RPG_HOST ?? null,
        place: process.env.AGY_TEST_PLACE ?? null, home, homeThere: home !== null && existsSync(home), fence: existsSync(fenceFile) ? JSON.parse(readFileSync(fenceFile, "utf8")) : null,
    });
    say({ event: "init", conversation_id: effort && mode.noEffort === true ? "" : "conversation-1" });
    if (effort && mode.noEffort === true) {
        say({ event: "result", result: { status: "ERROR", conversation_id: "", error: 'invalid model selection (--model "" --effort "low"): --effort is not supported for the current model' } });
        process.exit(1);
    }
    if (mode.run === "hang") { log({ hanging: true }); setInterval(() => undefined, 1000); return; }
    if (mode.run === "die") { process.exit(3); }
    if (mode.run === "holdOutput") {
        const held = require("node:child_process").spawn(process.execPath, ["-e", "setTimeout(() => undefined, 60000)"], { stdio: ["ignore", "inherit", "inherit"] });
        log({ holder: held.pid });
    }
    if (mode.run === "answerHang") { say({ event: "result", result: { status: "SUCCESS", response: " the answer " } }); log({ hanging: true }); setInterval(() => undefined, 1000); return; }
    if (mode.run === "closed") { say({ event: "result", result: { status: "SUCCESS", response: "", denied_actions: ["read_file"], conversation_id: "conversation-1" } }); return; }
    if (mode.run === "error") { say({ event: "result", result: { status: "ERROR", error: "quota exhausted", conversation_id: "conversation-1" } }); return; }
    if (mode.run === "paint") {
        const { mkdirSync, utimesSync, writeFileSync } = require("node:fs");
        const brain = join(home, ".gemini", "antigravity-cli", "brain", "conversation-1");
        const media = join(brain, ".system_generated", "logs", "media");
        mkdirSync(media, { recursive: true });
        writeFileSync(join(brain, "older_1.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        utimesSync(join(brain, "older_1.png"), new Date(2020, 0, 1), new Date(2020, 0, 1));
        writeFileSync(join(brain, "ponte_1764000000.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]));
        writeFileSync(join(media, "copy.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        say({ event: "result", result: { status: "SUCCESS", response: "done", conversation_id: "conversation-1" } });
        return;
    }
    if (mode.run === "paintNothing") { say({ event: "result", result: { status: "SUCCESS", response: "I cannot make images here.\nSorry.", conversation_id: "conversation-1" } }); return; }
    say({ event: "result", result: { status: mode.status ?? "SUCCESS", response: " the answer ", conversation_id: "conversation-1" } });
});
process.stdin.on("end", () => {
    if (mode.run === "answerHang") { return; }
    log({ closed: true });
    process.exit(mode.exit ?? 0);
});
`;

let folder: string;

beforeEach(() => {
    // Its real path, as a program started in it sees it: on macOS the temporary folder is behind a link.
    folder = realpathSync(makeTempFolder());
});

afterEach(() => {
    removeFolder(folder);
});

/** A fake agy in a folder of its own; the line that starts it. */
function fakeAgy(mode: { models?: false; status?: string; exit?: number; noEffort?: true; run?: "hang" | "closed" | "error" | "die" | "holdOutput" | "answerHang" | "paint" | "paintNothing"; }): string
{
    const fake = join(folder, `fake-${readdirSync(folder).length}`);
    mkdirSync(fake, { recursive: true });
    writeFileSync(join(fake, "agy.cjs"), fakeScript);
    writeFileSync(join(fake, "mode.json"), JSON.stringify(mode));
    return `"${process.execPath}" "${join(fake, "agy.cjs")}"`;
}

/** What the fake was asked, in order. */
function calls(line: string): Record<string, unknown>[]
{
    const file = join(/"([^"]+)agy\.cjs"$/.exec(line)?.[1] ?? "", "calls.jsonl");
    return existsSync(file) ? readFileSync(file, "utf8").trim().split("\n").map((one) => JSON.parse(one) as Record<string, unknown>) : [];
}

/** The runs the fake was given, without its other calls. */
function runs(line: string): Record<string, unknown>[]
{
    return calls(line).filter((call) => call.args !== undefined);
}

/** A real home of the player's, with the model they chose in Antigravity, or none. */
function playerHome(model?: unknown): string
{
    const home = join(folder, `home-${readdirSync(folder).length}`);
    mkdirSync(join(home, ".gemini", "antigravity-cli"), { recursive: true });

    if (model !== undefined) {
        writeFileSync(join(home, ".gemini", "antigravity-cli", "settings.json"), JSON.stringify({ model }));
    }

    return home;
}

describe("Antigravity's writer (D-406, D-579 (1))", () => {
    it("is ready where agy lists its models, and not where it fails", () => {
        expect(antigravityWriter(fakeAgy({})).ready()).toBe(true);
        expect(antigravityWriter(fakeAgy({ models: false })).ready()).toBe(false);
    });

    it("answers with the result's response, from a stream-json message, sealed in an empty folder with the fence's hook, all gone after", async () => {
        const line = fakeAgy({});
        expect(await antigravityWriter(line, playerHome()).write("Translate: hello")).toBe("the answer");
        const [run] = runs(line);
        expect(run.message).toEqual({ event: "user", message: { role: "user", content: "Translate: hello" } });
        expect(run.args).toEqual(["--print=", "--input-format", "stream-json", "--output-format", "stream-json", "--mode", "accept-edits", "--effort", "low", "--settings", run.settingsFile]);
        expect(run.entries).toEqual([".agents"]);
        // The hook refuses every tool: a fence with nothing to read or write, by this engine's own command line.
        expect(run.fence).toEqual({ read: [], write: [] });
        expect(hookCommand(run)).toContain("--fence");
        expect(hookCommand(run)).toContain(join(dirname(String(run.settingsFile)), "fence.json"));
        // The engine's own command line, never the script that started this process: a hook that named that one would start it again at every tool.
        expect(hookCommand(run)).toContain(`"${join(process.cwd(), "src", "cli", "cli.ts")}" --fence`);
        expect(hookCommand(run)).not.toContain(process.argv[1]);
        // Its input closed after the result, as the real one ends then.
        expect(calls(line).at(-1)).toEqual({ closed: true });
        expect(await gone([String(run.cwd), String(run.settingsFile), dirname(String(run.settingsFile))])).toBe(true);
        expect(String(run.settingsFile).startsWith(String(run.cwd))).toBe(false);
        const settings = run.settings as AgySettings;
        expect(settings.trustedWorkspaces).toEqual([run.cwd]);
        expect(settings.permissions.deny).toEqual(expect.arrayContaining(["command(*)", "mcp(*)", "read_url(*)", "execute_url(*)"]));
        expect(settings.permissions.deny.filter((rule) => rule.startsWith("read_file(")).length).toBeGreaterThan(0);
    });

    it("gives every start of agy a home of the engine's, gone after, and the model of the player's real settings", async () => {
        const line = fakeAgy({});
        const writer = antigravityWriter(line, playerHome("gemini-3-pro"));
        await writer.write("brief");
        const [models, run] = calls(line);

        for (const start of [models, run]) {
            expect(start.homeThere).toBe(true);
            expect(start.home).not.toBe(homedir());
            expect(await gone([String(start.home)])).toBe(true);
        }

        expect(models.home).not.toBe(run.home);
        expect((run.settings as AgySettings).model).toBe("gemini-3-pro");

        const without = fakeAgy({});
        await antigravityWriter(without, playerHome()).write("brief");
        expect(runs(without)[0].settings).not.toHaveProperty("model");
    });

    it("denies every root of the computer, to read and to write", () => {
        expect(sealedSettings("work", undefined, ["C:\\", "F:\\"])).toEqual({
            trustedWorkspaces: ["work"],
            permissions: { deny: ["command(*)", "mcp(*)", "read_url(*)", "execute_url(*)", "read_file(C:\\)", "write_file(C:\\)", "read_file(F:\\)", "write_file(F:\\)"] },
        });
        expect(sealedSettings("work", "a-model").permissions.deny).toContain(process.platform === "win32" ? `read_file(${process.cwd().slice(0, 3).toUpperCase()})` : "read_file(/)");
    });

    it("is marked as the engine's helper, and gets nothing of the chat that names the campaign", async () => {
        const line = fakeAgy({});
        const saved = { host: process.env.RPG_HOST, place: process.env.AGY_TEST_PLACE };
        process.env.RPG_HOST = hosts.antigravity.client;
        process.env.AGY_TEST_PLACE = join(process.cwd(), "campaign");

        try {
            await antigravityWriter(line, playerHome()).write("brief");
        } finally {
            restore("RPG_HOST", saved.host);
            restore("AGY_TEST_PLACE", saved.place);
        }

        expect(runs(line)[0]).toMatchObject({ helper: "1", host: null, place: null });
    });

    it("gives none for a result of another status, or a run that fails", async () => {
        expect(await antigravityWriter(fakeAgy({ status: "ERROR" }), playerHome()).write("brief")).toBeUndefined();
        expect(await antigravityWriter(fakeAgy({ exit: 1 }), playerHome()).write("brief")).toBeUndefined();
    });

    it("tries once more without the effort a model has not, as agy refuses it, and answers", async () => {
        const line = fakeAgy({ noEffort: true });
        expect(await antigravityWriter(line, playerHome()).write("brief")).toBe("the answer");
        const both = runs(line);
        expect(both).toHaveLength(2);
        expect(both[0].args).toContain("--effort");
        expect(both[1].args).not.toContain("--effort");
    });

    it("starts no agy from inside a run of the engine's helper", async () => {
        const line = fakeAgy({});
        process.env.RPG_HELPER = "1";

        try {
            expect(antigravityWriter(line, playerHome()).ready()).toBe(false);
            expect(await antigravityWriter(line, playerHome()).write("Translate: hello")).toBeUndefined();
            expect(await antigravityReader(line, playerHome()).read(folder, "Read", ["notes"])).toEqual({ failed: expect.stringContaining("already a run") as string });
            expect(calls(line)).toEqual([]);
        } finally {
            delete process.env.RPG_HELPER;
        }
    });

    it("never runs again a run that died without a result", async () => {
        const line = fakeAgy({ run: "die" });
        expect(await antigravityWriter(line, playerHome()).write("brief")).toBeUndefined();
        expect(runs(line)).toHaveLength(1);
    });

    it("answers once agy exited, though a process it started holds its output open", async () => {
        const line = fakeAgy({ run: "holdOutput" });
        const started = Date.now();

        try {
            expect(await antigravityWriter(line, playerHome()).write("brief")).toBe("the answer");
            expect(Date.now() - started).toBeLessThan(20_000);
        } finally {
            const holder = calls(line).find((call) => call.holder !== undefined)?.holder;

            try {
                process.kill(Number(holder));
            } catch {
                // Gone already.
            }
        }
    }, 30_000);

    it("strips a byte-order mark from the player's settings", () => {
        const home = playerHome();
        writeFileSync(join(home, ".gemini", "antigravity-cli", "settings.json"), `﻿${JSON.stringify({ model: "gemini-3-flash" })}`);
        expect(playerModel(home)).toBe("gemini-3-flash");
        expect(playerModel(join(folder, "nobody"))).toBeUndefined();
    });
});

describe("the leftovers of runs stopped from outside (D-579 (1))", () => {
    /** A run's folder as one left by `engine`, whose agy is `agy`. */
    function leftFolder(engine: number, agy?: number): string
    {
        const left = mkdtempSync(join(tmpdir(), "rpg-agy-"));
        mkdirSync(join(left, "home", ".gemini"), { recursive: true });
        writeFileSync(join(left, "owner.json"), JSON.stringify({ engine, ...(agy === undefined ? {} : { agy }) }));
        return left;
    }

    it("takes away a dead engine's folder with its agy, by the reader's clean and by the next run, and leaves a living one's", async () => {
        const dead = spawnSync(process.execPath, ["-e", ""]).pid;
        const agy = spawn(process.execPath, ["-e", "setInterval(() => undefined, 1000)"], { stdio: "ignore" });
        const stopped = new Promise((done) => agy.on("exit", done));
        const left = leftFolder(dead, agy.pid);
        const living = leftFolder(process.pid);

        try {
            antigravityReader(fakeAgy({}), playerHome()).clean?.();
            expect(await gone([left])).toBe(true);
            await stopped;
            expect(existsSync(living)).toBe(true);

            const again = leftFolder(dead);
            await antigravityWriter(fakeAgy({}), playerHome()).write("brief");
            expect(await gone([again])).toBe(true);
            expect(existsSync(living)).toBe(true);
        } finally {
            agy.kill();
            rmSync(living, { recursive: true, force: true });
        }
    }, 30_000);
});

describe("Antigravity's importer (D-489 (1), D-579 (1))", () => {
    /** The import's folder, with the folders it may write in. */
    function importFolder(): string
    {
        const work = join(folder, "import");
        mkdirSync(join(work, "document"), { recursive: true });
        return work;
    }

    it("works outside the import's folder, fenced to it, in an empty folder with the engine's hook, and leaves nothing", async () => {
        const line = fakeAgy({});
        const reader = antigravityReader(line, playerHome("gemini-3-pro"));
        const work = importFolder();
        expect(reader.program?.()).toBe("Antigravity");
        expect(await reader.read(work, "Read the source", ["adventure", "notes"])).toEqual({ said: "the answer" });
        const [run] = runs(line);
        const cwd = String(run.cwd);
        expect(cwd.startsWith(work)).toBe(false);
        expect(run.entries).toEqual([".agents"]);
        expect(hookCommand(run)).toContain("--fence");
        expect(run.args).toEqual(expect.arrayContaining(["--mode", "accept-edits"]));
        expect(run.settings).toEqual({
            trustedWorkspaces: [cwd],
            model: "gemini-3-pro",
            permissions: {
                allow: [`read_file(${work})`, `write_file(${join(work, "adventure")})`, `write_file(${join(work, "notes")})`],
                deny: ["command(*)", "mcp(*)", "read_url(*)", "execute_url(*)", "download_url(*)"],
            },
        });
        const brief = String((run.message as { message: { content: string; }; }).message.content);
        expect(brief.startsWith(work)).toBe(true);
        expect(brief.endsWith("Read the source")).toBe(true);
        // Everything of its own is gone, and the import's folder holds only what it held.
        expect(await gone([cwd, String(run.settingsFile), String(run.home)])).toBe(true);
        expect(readdirSync(work)).toEqual(["document"]);
    });

    it("says why a run closed by the settings stopped, and gives agy's words for an error", async () => {
        const closed = await antigravityReader(fakeAgy({ run: "closed" }), playerHome()).read(importFolder(), "Read", ["adventure"]);
        expect(closed).toEqual({ failed: "Antigravity was stopped as it asked for something outside the import's folder (read_file)" });
        expect(await antigravityReader(fakeAgy({ run: "error" }), playerHome()).read(importFolder(), "Read", ["adventure"])).toEqual({ failed: "Antigravity said: quota exhausted" });
    });

    it("stops whole when dropped, and leaves nothing", async () => {
        const line = fakeAgy({ run: "hang" });
        const stop = new AbortController();
        const reading = antigravityReader(line, playerHome()).read(importFolder(), "Read", ["adventure"], stop.signal);
        await waitFor(() => calls(line).some((call) => call.hanging === true));
        stop.abort();
        expect(await reading).toEqual({ failed: "Antigravity stopped without an answer" });
        // Asked first, by its input closing, it ended by itself: never killed, as one saving the player's sign-in (T-301).
        expect(calls(line).some((call) => call.closed === true)).toBe(true);
        const [run] = runs(line);
        expect(await gone([String(run.cwd), String(run.settingsFile), String(run.home)])).toBe(true);
    }, 20_000);

    it("gives the answer it had when it is stopped after it", async () => {
        const line = fakeAgy({ run: "answerHang" });
        const stop = new AbortController();
        const reading = antigravityReader(line, playerHome()).read(importFolder(), "Read", ["adventure"], stop.signal);
        await waitFor(() => calls(line).some((call) => call.hanging === true));
        stop.abort();
        expect(await reading).toEqual({ said: "the answer" });
    }, 20_000);

    it("names the import's folder by its real path, where it is reached through a link", async () => {
        const line = fakeAgy({});
        const work = importFolder();
        const link = join(folder, "linked");
        symlinkSync(work, link, "junction");
        await antigravityReader(line, playerHome()).read(link, "Read", ["adventure"]);
        const [run] = runs(line);
        expect((run.settings as AgySettings).permissions.allow).toEqual([`read_file(${work})`, `write_file(${join(work, "adventure")})`]);
        expect(run.fence).toEqual({ read: [work, join(work, "adventure")], write: [join(work, "adventure")] });
        expect(String((run.message as { message: { content: string; }; }).message.content).startsWith(work)).toBe(true);
    });
});

describe("Antigravity's painter (T-251)", () => {
    const bridge: PictureSubject = { kind: "place", name: "Ponte", seen: "un ponte di pietra", unseen: [] };

    it("gives the newest picture agy saved in its home, never its copies under .system_generated, with the run's folder kept until done", async () => {
        const line = fakeAgy({ run: "paint" });
        const made = await antigravityPainter(line, playerHome("gemini-3-pro")).make(bridge);

        if ("refused" in made) {
            throw new Error(made.refused);
        }

        expect(made.file.replace(/\\/g, "/")).toMatch(/\/home\/\.gemini\/antigravity-cli\/brain\/conversation-1\/ponte_1764000000\.jpg$/);
        expect(readImage(made.file)).toMatchObject({ extension: "jpg" });
        const [run] = runs(line);
        expect(String((run.message as { message: { content: string; }; }).message.content)).toMatch(/^Make exactly one new image from the brief below with your own image generation tool/);
        expect(String((run.message as { message: { content: string; }; }).message.content)).not.toMatch(/\bimage again\b|\brpg\b/);
        expect(run.settings).toEqual(painterSettings(String(run.cwd), "gemini-3-pro"));
        expect(run.fence).toEqual({ read: [], write: [], tools: ["invoke_subagent", "generate_image", "send_message"] });
        expect(existsSync(made.file)).toBe(true);
        made.done();
        expect(await gone([dirname(String(run.settingsFile))])).toBe(true);
    });

    it("refuses with agy's words where no picture came, its folder gone at once", async () => {
        const line = fakeAgy({ run: "paintNothing" });
        expect(await antigravityPainter(line, playerHome()).make(bridge)).toEqual({ refused: "Antigravity made no picture: I cannot make images here." });
        expect(await gone([dirname(String(runs(line)[0].settingsFile))])).toBe(true);
        expect(await antigravityPainter(fakeAgy({ run: "error" }), playerHome()).make(bridge)).toEqual({ refused: "Antigravity made no picture: quota exhausted" });
        expect(await antigravityPainter(fakeAgy({ models: false }), playerHome()).make(bridge)).toEqual({ refused: antigravitySays.notReady.why });
    });
});

describe("who works outside the chat in Antigravity (D-579 (1))", () => {
    const writer = (name: string, ready: boolean): TextWriter => ({ ready: () => ready, write: () => Promise.resolve(name) });
    const reader = (name: "Codex" | "Claude Code" | "OpenCode" | "Antigravity", ready: boolean): DocumentReader => ({ ready: () => ready, program: () => name, read: () => Promise.resolve({ said: name }) });

    it("takes Antigravity's agy first in its own chat, then Codex and Claude Code; never elsewhere", async () => {
        expect(await hostWriter(() => hosts.antigravity.client, writer("codex", true), writer("claude", true), writer("opencode", true), writer("antigravity", true)).write("b")).toBe("antigravity");
        expect(await hostWriter(() => hosts.antigravity.client, writer("codex", true), writer("claude", true), writer("opencode", true), writer("antigravity", false)).write("b")).toBe("codex");
        expect(await hostWriter(() => hosts.antigravity.client, writer("codex", false), writer("claude", true), writer("opencode", true), writer("antigravity", false)).write("b")).toBe("claude");
        expect(await hostWriter(() => hosts.openCode.client, writer("codex", true), writer("claude", true), writer("opencode", true), writer("antigravity", true)).write("b")).toBe("opencode");
        expect(await hostWriter(() => "claude-code", writer("codex", true), writer("claude", true), writer("opencode", true), writer("antigravity", true)).write("b")).toBe("codex");
        expect(hostWriter(() => "codex-mcp-client", writer("codex", false), writer("claude", true), writer("opencode", true), writer("antigravity", true)).ready()).toBe(false);
    });

    it("reads with Antigravity's agy first in its own chat, then Claude Code and Codex; never elsewhere", () => {
        const all = (antigravity: boolean, claude = true): DocumentReader => hostReader(() => hosts.antigravity.client, reader("Codex", true), reader("Claude Code", claude), reader("OpenCode", true), reader("Antigravity", antigravity));
        expect(all(true).program?.()).toBe("Antigravity");
        expect(all(false).program?.()).toBe("Claude Code");
        expect(all(false, false).program?.()).toBe("Codex");
        expect(hostReader(() => "claude-code", reader("Codex", true), reader("Claude Code", true), reader("OpenCode", true), reader("Antigravity", true)).program?.()).toBe("Claude Code");
    });

    it("cleans with every reader that can, in any chat", () => {
        const cleaned: string[] = [];
        const cleaning = (name: "OpenCode" | "Antigravity"): DocumentReader => ({ ...reader(name, false), clean: () => cleaned.push(name) });
        hostReader(() => "claude-code", reader("Codex", true), reader("Claude Code", true), cleaning("OpenCode"), cleaning("Antigravity")).clean?.();
        expect(cleaned).toEqual(["OpenCode", "Antigravity"]);
    });
});

describe("rpg mcp in a run of the engine's helper (D-579 (1))", () => {
    it("leaves at once, answering nothing, its input still open", async () => {
        const initialize = { jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "antigravity-client", version: "1" } } };
        const child = spawn(process.execPath, [join(process.cwd(), "src", "cli", "cli.ts"), "mcp"], { cwd: folder, env: { ...process.env, RPG_HELPER: "1" } });
        let output = "";
        let errors = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (output += chunk));
        child.stderr.on("data", (chunk: string) => (errors += chunk));
        child.stdin.on("error", () => undefined);
        child.stdin.write(`${JSON.stringify(initialize)}\n`);
        // A server would answer and wait for more: one that leaves ends by itself, without a word.
        const code = await new Promise<number | null>((done) => {
            const timer = setTimeout(() => {
                child.kill();
                done(-1);
            }, 20_000);
            child.on("exit", (exit) => {
                clearTimeout(timer);
                done(exit);
            });
        });
        expect(code).toBe(0);
        expect(output).toBe("");
        expect(errors).toBe("rpg mcp: not started, this is a run of RPG Engine's own helper (RPG_HELPER=1)\n");
    }, 30_000);
});

function restore(name: string, value: string | undefined): void
{
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
}

/** The command of the hook a run's working folder had. */
function hookCommand(run: Record<string, unknown>): string
{
    return String((run.hooks as { rpg: { PreToolUse: { hooks: { command: string; }[]; }[]; }; }).rpg.PreToolUse[0].hooks[0].command);
}

/** Whether every path is gone, waiting a while: a run's folder goes in the background. */
async function gone(paths: string[]): Promise<boolean>
{
    await waitFor(() => paths.every((path) => !existsSync(path)));
    return paths.every((path) => !existsSync(path));
}

async function waitFor(done: () => boolean): Promise<void>
{
    for (let tries = 0; tries < 100 && !done(); tries++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}
