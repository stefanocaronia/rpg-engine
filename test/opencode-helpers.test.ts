// OpenCode does the work outside the chat in its own chat (D-578 (3)): the writer's answer is the last text part of its run, a failure gives none; the importer
// runs fenced in the import's folder; the agent comes through the environment, never as a file; every session it made is deleted, however the run ends; and
// the chains of writers and readers take it first only in OpenCode's chat. A fake opencode on a line of its own plays the program.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DocumentReader, TextWriter } from "../src/core/context.ts";
import { hosts } from "../src/core/hosts.ts";
import { hostReader, hostWriter, openCodeReader, openCodeWriter } from "../src/helpers/index.ts";
import { chatEnvironment } from "../src/helpers/programs.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

// The fake: debug paths, models, run and session delete, as mode.json beside it says; each call written to calls.jsonl.
const fakeScript = String.raw`
const { appendFileSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const here = __dirname;
const mode = JSON.parse(readFileSync(join(here, "mode.json"), "utf8"));
const args = process.argv.slice(2);
const log = (entry) => appendFileSync(join(here, "calls.jsonl"), JSON.stringify(entry) + "\n");
const event = (type, extra) => process.stdout.write(JSON.stringify({ type, sessionID: session, ...extra }) + "\n");
const session = args[args.indexOf("--session") + 1];

if (args[0] === "debug" && args[1] === "paths") {
    if (mode.paths === false) { process.exit(1); }
    console.log("home       " + here);
    console.log("state      " + join(here, "state"));
} else if (args[0] === "models") {
    console.log((mode.models ?? []).join("\n"));
} else if (args[0] === "session" && args[1] === "delete") {
    log({ deleted: args[2], standalone: args.includes("--standalone") });
} else if (args[0] === "run") {
    let brief = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (brief += chunk));
    process.stdin.on("end", () => {
        log({ run: args, cwd: process.cwd(), brief, config: process.env.OPENCODE_CONFIG_CONTENT, noProject: process.env.OPENCODE_DISABLE_PROJECT_CONFIG, host: process.env.RPG_HOST ?? null, folder: process.env.RPG_TEST_FOLDER ?? null });
        event("step_start", {});
        if (mode.run === "error") { event("error", { error: { name: "APIError", data: { message: "the model is not loaded" } } }); process.exit(1); }
        if (mode.run === "hang") { log({ hanging: true }); setInterval(() => undefined, 1000); return; }
        event("text", { part: { type: "text", text: "a first answer" } });
        event("step_finish", { part: { type: "step-finish", reason: "tool-calls" } });
        event("text", { part: { type: "text", text: " the last answer " } });
        event("step_finish", { part: { type: "step-finish", reason: "stop" } });
    });
}
`;

let folder: string;

beforeEach(() => {
    // Its real path, as a program started in it sees it: on macOS the temporary folder is behind a link.
    folder = realpathSync(makeTempFolder());
});

afterEach(() => {
    removeFolder(folder);
});

/** A fake opencode in a folder of its own, whose player chose `model`; the line that starts it. */
function fakeOpenCode(mode: { paths?: false; models?: string[]; run?: "two" | "error" | "hang"; }, model?: unknown): string
{
    const fake = join(folder, `fake-${readdirSync(folder).length}`);
    mkdirSync(join(fake, "state"), { recursive: true });
    writeFileSync(join(fake, "opencode.cjs"), fakeScript);
    writeFileSync(join(fake, "mode.json"), JSON.stringify(mode));

    if (model !== undefined) {
        writeFileSync(join(fake, "state", "model.json"), JSON.stringify(model));
    }

    return `"${process.execPath}" "${join(fake, "opencode.cjs")}"`;
}

/** What the fake was asked, in order. */
function calls(line: string): Record<string, unknown>[]
{
    const file = join(/"([^"]+)opencode\.cjs"$/.exec(line)?.[1] ?? "", "calls.jsonl");
    return existsSync(file) ? readFileSync(file, "utf8").trim().split("\n").map((one) => JSON.parse(one) as Record<string, unknown>) : [];
}

const chosen = { recent: [{ providerID: "ollama", modelID: "gpt-oss:20b" }, { providerID: "deepseek", modelID: "deepseek-v4-pro" }], variant: {} };
const listed = ["deepseek/deepseek-v4-pro", "ollama/gpt-oss:20b"];

describe("OpenCode's writer (D-406, D-578 (3))", () => {
    it("answers with the last text part of the run, with the player's own model and an agent that may use nothing, given in the environment", async () => {
        const line = fakeOpenCode({ models: listed, run: "two" }, chosen);
        const writer = openCodeWriter(line);
        expect(writer.ready()).toBe(true);
        expect(await writer.write("Translate: hello")).toBe("the last answer");
        const [run, deleted] = calls(line);
        const args = run.run as string[];
        expect(args.slice(0, 7)).toEqual(["run", "--standalone", "--agent", "rpg-writer", "-m", "ollama/gpt-oss:20b", "--format"]);
        expect(args).toContain("--archived");
        expect(run.brief).toBe("Translate: hello");
        expect(run.noProject).toBe("1");
        expect(JSON.parse(String(run.config))).toEqual({
            agents: {
                "rpg-writer": {
                    description: "You write what a brief asks, and only that.",
                    mode: "primary",
                    system: "You write what a brief asks, and only that.",
                    permissions: [{ action: "*", resource: "*", effect: "deny" }],
                },
            },
        });
        // Its folder was an empty one of its own, gone after; its session is deleted.
        expect(existsSync(String(run.cwd))).toBe(false);
        expect(deleted).toEqual({ deleted: args[args.indexOf("--session") + 1], standalone: true });
        expect(String(deleted.deleted)).toMatch(/^ses_rpg[0-9a-f]{20}$/);
    });

    it("gives none when the run fails, and deletes its session all the same", async () => {
        const line = fakeOpenCode({ models: listed, run: "error" }, chosen);
        expect(await openCodeWriter(line).write("Translate: hello")).toBeUndefined();
        const [run, deleted] = calls(line);
        const args = run.run as string[];
        expect(deleted).toMatchObject({ deleted: args[args.indexOf("--session") + 1] });
    });

    it("passes the model's variant the player chose, and nothing of the chat that names the campaign", async () => {
        const line = fakeOpenCode({ models: listed, run: "two" }, { recent: [{ providerID: "deepseek", modelID: "deepseek-v4-pro" }], variant: { "deepseek/deepseek-v4-pro": "high" } });
        const saved = { host: process.env.RPG_HOST, folder: process.env.RPG_TEST_FOLDER };
        process.env.RPG_HOST = hosts.openCode.client;
        process.env.RPG_TEST_FOLDER = join(process.cwd(), "campaign");

        try {
            await openCodeWriter(line).write("brief");
        } finally {
            restore("RPG_HOST", saved.host);
            restore("RPG_TEST_FOLDER", saved.folder);
        }

        const [run] = calls(line);
        expect((run.run as string[])[5]).toBe("deepseek/deepseek-v4-pro#high");
        expect(run).toMatchObject({ host: null, folder: null });
    });

    it("is not ready, and starts no model, where OpenCode is missing, has no model chosen, or cannot use it now", () => {
        expect(openCodeWriter(fakeOpenCode({ paths: false, models: listed }, chosen)).ready()).toBe(false);
        expect(openCodeWriter(fakeOpenCode({ models: listed })).ready()).toBe(false);
        expect(openCodeWriter(fakeOpenCode({ models: listed }, { recent: [] })).ready()).toBe(false);
        const away = fakeOpenCode({ models: ["deepseek/deepseek-v4-pro"] }, chosen);
        expect(openCodeWriter(away).ready()).toBe(false);
        expect(openCodeReader(away).ready()).toBe(false);
        // A model whose name the shell could misread is never passed.
        expect(openCodeWriter(fakeOpenCode({ models: ["ollama/a&b"] }, { recent: [{ providerID: "ollama", modelID: "a&b" }] })).ready()).toBe(false);
        expect(calls(away)).toEqual([]);
    });
});

describe("OpenCode's importer (D-489 (1), D-578 (3))", () => {
    it("runs in the import's folder fenced as measured, leaves there only a repository of its own, and deletes its session", async () => {
        const line = fakeOpenCode({ models: listed, run: "two" }, chosen);
        const reader = openCodeReader(line);
        const work = join(folder, "import");
        mkdirSync(work);
        expect(reader.program?.()).toBe("OpenCode");
        // The model it reads with, which the player is told (D-579 (2)).
        expect(reader.model?.()).toBe("ollama/gpt-oss:20b");
        expect(hostReader(() => hosts.openCode.client, reader, reader, reader).model?.()).toBe("ollama/gpt-oss:20b");
        expect(await reader.read(work, "Read the source", ["adventure", "notes"])).toEqual({ said: "the last answer" });
        // Its own repository, so that the campaign's above is not the one OpenCode lets it read; nothing where git is missing.
        expect(readdirSync(work).filter((name) => name !== ".git")).toEqual([]);
        const [run, deleted] = calls(line);
        expect(run.cwd).toBe(work);
        expect(run.noProject).toBe("1");
        const agent = (JSON.parse(String(run.config)) as { agents: Record<string, { permissions: unknown[]; }>; }).agents["rpg-reader"];
        expect(agent.permissions).toEqual([
            { action: "*", resource: "*", effect: "deny" },
            { action: "read", resource: "*", effect: "allow" },
            { action: "glob", resource: "*", effect: "allow" },
            { action: "grep", resource: "*", effect: "allow" },
            { action: "edit", resource: "adventure/*", effect: "allow" },
            { action: "edit", resource: "adventure/**", effect: "allow" },
            { action: "edit", resource: "notes/*", effect: "allow" },
            { action: "edit", resource: "notes/**", effect: "allow" },
            { action: "external_directory", resource: "*", effect: "deny" },
        ]);
        expect(deleted).toMatchObject({ deleted: (run.run as string[])[(run.run as string[]).indexOf("--session") + 1] });
    });

    it("says why when the run fails, and deletes its session", async () => {
        const line = fakeOpenCode({ models: listed, run: "error" }, chosen);
        expect(await openCodeReader(line).read(folder, "Read", ["adventure"])).toEqual({ failed: "OpenCode said: the model is not loaded" });
        expect(calls(line).at(-1)).toHaveProperty("deleted");
    });

    it("stops whole when dropped, and deletes its session", async () => {
        const line = fakeOpenCode({ models: listed, run: "hang" }, chosen);
        const stop = new AbortController();
        const reading = openCodeReader(line).read(folder, "Read", ["adventure"], stop.signal);
        await waitFor(() => calls(line).some((call) => call.hanging === true));
        stop.abort();
        expect(await reading).toMatchObject({ failed: expect.stringMatching(/^OpenCode/) });
        const [run, , deleted] = calls(line);
        expect(deleted).toMatchObject({ deleted: (run.run as string[])[(run.run as string[]).indexOf("--session") + 1] });
    }, 20_000);
});

describe("the sessions of runs stopped from outside (D-578 (3))", () => {
    /** A mark of a run of `line` whose engine process is gone; its session. */
    function deadMark(line: string): string
    {
        const session = `ses_rpg${randomBytes(10).toString("hex")}`;
        const dead = spawnSync(process.execPath, ["-e", ""]).pid;
        mkdirSync(join(tmpdir(), "rpg-opencode-runs"), { recursive: true });
        writeFileSync(join(tmpdir(), "rpg-opencode-runs", `${session}.json`), JSON.stringify({ engine: dead, program: line }));
        return session;
    }

    it("deletes the session of a dead engine's run, at the next run and at the reader's clean, and takes its mark away", async () => {
        const line = fakeOpenCode({ models: listed, run: "two" }, chosen);
        const left = deadMark(line);
        await openCodeWriter(line).write("brief");
        await waitFor(() => calls(line).some((call) => call.deleted === left));
        expect(calls(line).some((call) => call.deleted === left)).toBe(true);

        const again = deadMark(line);
        openCodeReader(line).clean?.();
        await waitFor(() => calls(line).some((call) => call.deleted === again));
        expect(calls(line).some((call) => call.deleted === again)).toBe(true);
        await waitFor(() => !existsSync(join(tmpdir(), "rpg-opencode-runs", `${again}.json.taken`)));
        expect(readdirSync(join(tmpdir(), "rpg-opencode-runs")).filter((name) => name.startsWith(left) || name.startsWith(again))).toEqual([]);
    }, 30_000);
});

describe("the chat's environment for a helper", () => {
    it("drops from the PATH the campaign's folders, never a sibling whose name begins the same", () => {
        const campaign = join(folder, "rpg");
        const saved = process.env.PATH;
        process.env.PATH = [join(campaign, "bin"), `${campaign}${sep}`, join(folder, "rpg-tools", "bin")].join(delimiter);

        try {
            const path = Object.entries(chatEnvironment(/^$/, campaign)).find(([name]) => name.toUpperCase() === "PATH")?.[1];
            expect(path?.split(delimiter)).toEqual([join(folder, "rpg-tools", "bin")]);
        } finally {
            restore("PATH", saved);
        }
    });
});

describe("who does the work outside the chat, by the chat in use (D-578 (3))", () => {
    const writer = (name: string, ready: boolean): TextWriter & { name: string; } => ({ name, ready: () => ready, write: () => Promise.resolve(name) });
    const reader = (name: "Codex" | "Claude Code" | "OpenCode", ready: boolean): DocumentReader => ({ ready: () => ready, program: () => name, read: () => Promise.resolve({ said: name }) });

    it("takes OpenCode first in its own chat, then Codex and Claude Code; never elsewhere", async () => {
        expect(await hostWriter(() => hosts.openCode.client, writer("codex", true), writer("claude", true), writer("opencode", true)).write("brief")).toBe("opencode");
        expect(await hostWriter(() => hosts.openCode.client, writer("codex", true), writer("claude", true), writer("opencode", false)).write("brief")).toBe("codex");
        expect(await hostWriter(() => hosts.openCode.client, writer("codex", false), writer("claude", true), writer("opencode", false)).write("brief")).toBe("claude");
        expect(await hostWriter(() => "claude-code", writer("codex", true), writer("claude", true), writer("opencode", true)).write("brief")).toBe("codex");
        expect(await hostWriter(() => "codex-mcp-client", writer("codex", false), writer("claude", true), writer("opencode", true)).ready()).toBe(false);
        expect(hostWriter(() => "antigravity-client", writer("codex", false), writer("claude", false), writer("opencode", true), writer("antigravity", false)).ready()).toBe(false);

        expect(hostReader(() => hosts.openCode.client, reader("Codex", true), reader("Claude Code", true), reader("OpenCode", true)).program?.()).toBe("OpenCode");
        expect(hostReader(() => hosts.openCode.client, reader("Codex", true), reader("Claude Code", true), reader("OpenCode", false)).program?.()).toBe("Claude Code");
        expect(hostReader(() => hosts.openCode.client, reader("Codex", true), reader("Claude Code", false), reader("OpenCode", false)).program?.()).toBe("Codex");
        expect(hostReader(() => "claude-code", reader("Codex", true), reader("Claude Code", true), reader("OpenCode", true)).program?.()).toBe("Claude Code");
        expect(hostReader(() => undefined, reader("Codex", false), reader("Claude Code", false), reader("OpenCode", true)).ready()).toBe(false);
        expect(await hostReader(() => hosts.openCode.client, reader("Codex", true), reader("Claude Code", true), reader("OpenCode", true)).read(folder, "brief", [])).toEqual({ said: "OpenCode" });
    });
});

function restore(name: string, value: string | undefined): void
{
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
}

async function waitFor(done: () => boolean): Promise<void>
{
    for (let tries = 0; tries < 100 && !done(); tries++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}
