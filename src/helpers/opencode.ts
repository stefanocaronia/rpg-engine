// OpenCode does the work outside the chat where it is the chat in use (D-578 (3)): the writer of text (D-406) and the importer (D-489 (1)), with the player's own
// model, the last one they chose in it, never one or a key the engine picks. Each run has an agent of its own, given in the environment and never as a file in
// the player's folders, with every tool denied but what it needs; the project's own configuration is left out, and the session it made is deleted as it ends.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { DocumentReader, PicturesReady, TextWriter } from "../core/context.ts";
import { isAlive } from "../core/process-mark.ts";
import { endingOf, endingOfPid, stopGently, whenEnded } from "../core/process.ts";
import { chatEnvironment, isOwn, knownReady } from "./programs.ts";

// The same limits as Claude's: a brief in three minutes, a run of the importer in thirty.
const longest = 3 * 60 * 1000;
const longestReading = 30 * 60 * 1000;
// How long the deletion of a session may take: it took under a second.
const deleteWait = 30_000;

/** A permission rule of an OpenCode agent: the last that matches decides. */
export interface OpenCodeRule
{
    action: string;
    resource: string;
    effect: "allow" | "deny";
}

/** OpenCode on this computer as a writer of text (D-406): an agent that may use no tool, in an empty folder of its own. `program` is the line that starts it. */
export function openCodeWriter(program = "opencode"): TextWriter
{
    const ready = openCodeReady(program);
    return {
        ready: () => ready().ready,
        write: async (brief) => {
            const model = ready();

            if (!model.ready || model.maker === undefined) {
                return undefined;
            }

            const folder = mkdtempSync(join(tmpdir(), "rpg-writing-"));

            try {
                const ran = await runAgent(program, model.maker, folder, writerAgent, brief, longest);
                return ran.code === 0 && ran.error === undefined ? ran.text : undefined;
            } finally {
                rmSync(folder, { recursive: true, force: true });
            }
        },
    };
}

/** OpenCode on this computer as the importer (D-489 (1)): in the import's folder, reading only there and writing only in the folders given. */
export function openCodeReader(program = "opencode"): DocumentReader
{
    const ready = openCodeReady(program);
    return {
        ready: () => ready().ready,
        program: () => "OpenCode",
        clean: () => void sweepRuns(program),
        // The model OpenCode named when it was asked whether it is ready, for the player, as it may be paid by the call.
        model: () => {
            const model = ready();
            return model.ready ? model.maker : undefined;
        },
        read: async (folder, brief, writable, signal) => {
            const model = ready();

            if (!model.ready || model.maker === undefined) {
                return { failed: model.ready ? "OpenCode has no model" : model.why };
            }

            ownRepository(folder);
            const ran = await runAgent(program, model.maker, folder, readerAgent(writable), brief, longestReading, signal);

            if (ran.code === 0 && ran.error === undefined && ran.text !== undefined) {
                return { said: ran.text };
            }

            const said = ran.error ?? ran.errors.trim().split("\n").at(-1)?.trim() ?? "";
            return { failed: said === "" ? "OpenCode stopped without an answer" : `OpenCode said: ${said}` };
        },
    };
}

/**
 * A git repository of the import's folder's own, where the campaign above it is one: OpenCode lets an agent read up to the root of the repository it runs in,
 * the campaign's secrets too, and with its own the import's folder is the root. Without git on this computer nothing is done, as no campaign is a repository.
 */
function ownRepository(folder: string): void
{
    if (!existsSync(join(folder, ".git"))) {
        spawnSync("git", ["init", "-q"], { cwd: folder, windowsHide: true, timeout: 15_000, stdio: "ignore" });
    }
}

/** The importer's fence (D-489 (1)), as Elena's probe proved it: everything denied, then reading in the folder and editing in the folders given, never outside it. */
export function readerRules(writable: string[]): OpenCodeRule[]
{
    return [
        { action: "*", resource: "*", effect: "deny" },
        { action: "read", resource: "*", effect: "allow" },
        { action: "glob", resource: "*", effect: "allow" },
        { action: "grep", resource: "*", effect: "allow" },
        ...writable.flatMap((name): OpenCodeRule[] => [{ action: "edit", resource: `${name}/*`, effect: "allow" }, { action: "edit", resource: `${name}/**`, effect: "allow" }]),
        { action: "external_directory", resource: "*", effect: "deny" },
    ];
}

// An agent of the engine's: its name, what it is told, and its rules.
interface Agent
{
    name: string;
    system: string;
    rules: OpenCodeRule[];
}

const writerAgent: Agent = { name: "rpg-writer", system: "You write what a brief asks, and only that.", rules: [{ action: "*", resource: "*", effect: "deny" }] };

function readerAgent(writable: string[]): Agent
{
    return { name: "rpg-reader", system: "You read a player's documents and write a tabletop adventure from them, as files in this folder.", rules: readerRules(writable) };
}

// Whether OpenCode is ready, by the line that starts it: asked once, as the other helpers are, and remembered.
const readies = new Map<string, (again?: boolean) => PicturesReady>();

function openCodeReady(program: string): (again?: boolean) => PicturesReady
{
    const known = readies.get(program) ?? knownReady(() => modelOf(program));
    readies.set(program, known);
    return known;
}

/**
 * The player's model in OpenCode, as its maker, without starting one: OpenCode answers, the last model the player chose (`recent[0]` of model.json in its state
 * folder), and that model among those OpenCode can use now. Not ready otherwise.
 */
function modelOf(program: string): PicturesReady
{
    const paths = quietRun(`${program} debug paths`);
    const state = paths === undefined ? undefined : /^state\s+(.+?)\s*$/m.exec(paths)?.[1];

    if (state === undefined) {
        return { ready: false, why: "OpenCode does not answer on this computer" };
    }

    const model = lastModel(join(state, "model.json"));

    if (model === undefined) {
        return { ready: false, why: "OpenCode has no model chosen yet: the player picks one in it" };
    }

    const models = quietRun(`${program} models --standalone`);

    if (models === undefined || !models.split(/\r?\n/).some((line) => line.trim() === model.name)) {
        return { ready: false, why: `OpenCode cannot use its model ${model.name} now` };
    }

    return { ready: true, maker: model.variant === undefined ? model.name : `${model.name}#${model.variant}` };
}

/** The last model the player chose in OpenCode, with its variant; undefined where there is none, or one whose name the shell could misread. */
function lastModel(file: string): { name: string; variant?: string; } | undefined
{
    try {
        const json = JSON.parse(readFileSync(file, "utf8")) as { recent?: { providerID?: unknown; modelID?: unknown; }[]; variant?: Record<string, unknown>; };
        const first = json.recent?.[0];
        const name = typeof first?.providerID === "string" && typeof first.modelID === "string" ? `${first.providerID}/${first.modelID}` : undefined;
        const variant = name === undefined ? undefined : json.variant?.[name];
        const safe = (value: string): boolean => /^[\w.:/@+-]+$/.test(value);

        if (name === undefined || !safe(name)) {
            return undefined;
        }

        return typeof variant === "string" && safe(variant) ? { name, variant } : { name };
    } catch {
        return undefined;
    }
}

/** What a quick command of OpenCode printed, from a folder of no campaign; undefined where it failed. */
function quietRun(line: string): string | undefined
{
    const run = spawnSync(line, { shell: true, encoding: "utf8", timeout: 15_000, windowsHide: true, cwd: tmpdir(), env: openCodeEnvironment() });
    return run.error === undefined && run.status === 0 ? run.stdout : undefined;
}

/**
 * One run of an agent: `opencode run` with a session whose name the engine chose, deleted however the run ends; the answer is the last text part of its
 * events, as a model may write two whole answers in two steps.
 */
function runAgent(program: string, model: string, folder: string, agent: Agent, brief: string, limit: number, signal?: AbortSignal): Promise<{ code: number | null; text?: string; error?: string; errors: string; }>
{
    const session = `ses_rpg${randomBytes(10).toString("hex")}`;
    const config = { agents: { [agent.name]: { description: agent.system, mode: "primary", system: agent.system, permissions: agent.rules } } };
    const environment = { ...openCodeEnvironment(), OPENCODE_CONFIG_CONTENT: JSON.stringify(config), OPENCODE_DISABLE_PROJECT_CONFIG: "1" };
    const line = `${program} run --standalone --agent ${agent.name} -m "${model}" --format json --archived --session ${session}`;
    void sweepRuns(program);
    markRun(session, { engine: process.pid, program });

    return new Promise((done) => {
        // Off Windows it leads a group of its own: the shell alone, stopped, would leave OpenCode running with the output held open.
        const child = spawn(line, { shell: true, windowsHide: true, cwd: folder, env: environment, stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
        const ending = endingOf(child);
        let stopped = false;

        if (child.pid !== undefined) {
            markRun(session, { engine: process.pid, child: child.pid, program });
        }

        // Dropped while it runs, or out of time: OpenCode ends with its own server, gently first (T-301).
        const stop = (): void => {
            stopped = true;
            void stopGently(ending);
        };

        signal?.addEventListener("abort", stop, { once: true });
        let output = "";
        let errors = "";
        const timer = setTimeout(stop, limit);
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => (output += chunk));
        child.stderr.on("data", (chunk: string) => (errors += chunk));
        child.stdin.on("error", () => undefined);
        child.on("error", () => undefined);
        whenEnded(child, (exitCode) => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", stop);
            const events = eventsOf(output);
            const text = events.filter((event) => event.type === "text").map((event) => event.part?.text).filter((one) => typeof one === "string" && one.trim() !== "").at(-1);
            const failed = events.find((event) => event.type === "error");
            const error = failed === undefined ? undefined : errorText(failed);
            // A run stopped after its last step finished keeps its answer.
            const finished = events.some((event) => event.type === "step_finish" && event.part?.reason === "stop");
            const code = stopped && finished && error === undefined ? 0 : exitCode;
            void deleteSession(program, session).then(() => {
                unmarkRun(session);
                done({ code, errors, ...(typeof text === "string" ? { text: text.trim() } : {}), ...(error === undefined ? {} : { error }) });
            });
        });
        child.stdin.end(brief);
    });
}

/** Deletes a session of the engine's from the player's OpenCode, whether the run made it or not. */
function deleteSession(program: string, session: string): Promise<void>
{
    return new Promise((done) => {
        const child = spawn(`${program} session delete ${session} --standalone`, { shell: true, windowsHide: true, cwd: tmpdir(), env: openCodeEnvironment(), stdio: "ignore" });
        const ending = endingOf(child);
        const timer = setTimeout(() => void stopGently(ending), deleteWait);
        child.on("error", () => undefined);
        child.on("close", () => {
            clearTimeout(timer);
            done();
        });
    });
}

/** The mark of a run under way: the engine's process that runs it, the OpenCode it started, and the line that starts OpenCode. */
interface RunMark
{
    engine: number;
    child?: number;
    program: string;
}

// The marks of the runs under way, one a session: a run stopped from outside, as by an import's cancel, leaves its own, and the next sweep deletes its session.
function runsFolder(): string
{
    return join(tmpdir(), "rpg-opencode-runs");
}

function markRun(session: string, mark: RunMark): void
{
    try {
        mkdirSync(runsFolder(), { recursive: true });
        writeFileSync(join(runsFolder(), `${session}.json`), JSON.stringify(mark));
    } catch {
        // No mark: a run stopped from outside would leave its session, as before.
    }
}

function unmarkRun(session: string): void
{
    try {
        rmSync(join(runsFolder(), `${session}.json`), { force: true });
    } catch {
        // Held a moment: a sweep finds its engine alive, or takes it later.
    }
}

/**
 * Deletes the sessions that runs of `program` stopped from outside left: each mark whose engine process is gone, its OpenCode stopped first if it still runs.
 * Only marks of the same program line, never a line read from a file alone. Never throws.
 */
async function sweepRuns(program: string): Promise<void>
{
    try {
        const marks = readdirSync(runsFolder()).filter((name) => /^ses_rpg[0-9a-f]{20}\.json$/.test(name));

        for (const name of marks) {
            const file = join(runsFolder(), name);
            const mark = markOf(file);

            if (mark === undefined || mark.program !== program || isAlive(mark.engine) || !isOwn(file)) {
                continue;
            }

            await sweepRun(program, file, mark);
        }
    } catch {
        // No marks: nothing to sweep.
    }
}

// One mark of a run whose engine is gone: its OpenCode stopped if it still runs, its session deleted, the mark taken away.
async function sweepRun(program: string, file: string, mark: RunMark): Promise<void>
{
    const taken = `${file}.taken`;

    try {
        // Taken by this sweep alone: another at the same time finds it gone.
        renameSync(file, taken);
    } catch {
        return;
    }

    if (mark.child !== undefined && isAlive(mark.child)) {
        await stopGently(endingOfPid(mark.child));
    }

    await deleteSession(program, basename(file, ".json"));
    rmSync(taken, { force: true });
}

function markOf(file: string): RunMark | undefined
{
    try {
        const mark = JSON.parse(readFileSync(file, "utf8")) as { engine?: unknown; child?: unknown; program?: unknown; };
        const pid = (value: unknown): number | undefined => (typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined);
        const engine = pid(mark.engine);
        const child = pid(mark.child);
        return engine === undefined || typeof mark.program !== "string" ? undefined : { engine, program: mark.program, ...(child === undefined ? {} : { child }) };
    } catch {
        return undefined;
    }
}

interface OpenCodeEvent
{
    type?: unknown;
    part?: { text?: unknown; reason?: unknown; };
    error?: { name?: unknown; data?: { message?: unknown; }; };
}

function eventsOf(output: string): OpenCodeEvent[]
{
    return output.split("\n").flatMap((line): OpenCodeEvent[] => {
        try {
            const event: unknown = JSON.parse(line);
            return typeof event === "object" && event !== null ? [event as OpenCodeEvent] : [];
        } catch {
            return [];
        }
    });
}

function errorText(event: OpenCodeEvent): string
{
    const message = event.error?.data?.message ?? event.error?.name;
    return typeof message === "string" && message !== "" ? message : "it failed";
}

// The chat's variables OpenCode's runs never get: the engine's, the chat's session and folder, and what OpenCode would take from the chat.
const chatVariables = /^(RPG_|OPENCODE_(SESSION_ID|CLIENT|CONFIG_CONTENT|DISABLE_PROJECT_CONFIG|SERVER_PASSWORD)$|PWD$|OLDPWD$|INIT_CWD$)/i;

/** The environment of OpenCode's runs: the chat's own, without what names the campaign; the player's keys and settings stay, as their model needs them. */
function openCodeEnvironment(): NodeJS.ProcessEnv
{
    return chatEnvironment(chatVariables);
}
