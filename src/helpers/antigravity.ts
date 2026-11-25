// Antigravity does the work outside the chat where it is the chat in use (D-579 (1)): the writer of text and the importer; and it paints the pictures where
// the campaign chose it (T-251). The engine starts its agy with the
// player's own login and model, in an empty folder of its own, never in the campaign's tree, with a home of the engine's, so that it starts none of the
// player's global servers and leaves nothing in their history; settings of the engine's and its hook fence it, and the brief goes as one stream-json message on
// its input. Each start keeps all it makes in one temporary folder, which names its process: what a run stopped from outside left is swept by the next.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DocumentReader, PictureMaker, PicturesReady, TextWriter } from "../core/context.ts";
import { isAlive } from "../core/process-mark.ts";
import { stopTree, whenEnded } from "../core/process.ts";
import { chatBrief } from "./briefs.ts";
import { chatEnvironment, isOwn, knownReady } from "./programs.ts";

// The same limits as Claude's: a brief in three minutes, a run of the importer in thirty.
const longest = 3 * 60 * 1000;
const longestReading = 30 * 60 * 1000;
// How old a run's folder that names no process may be before a sweep takes it.
const unownedAge = 60 * 60 * 1000;
// The beginning of the name of every run's folder in the temporary folder.
const runPrefix = "rpg-agy-";

/** The settings of agy's runs, as the engine passes them with --settings. */
export interface AgySettings
{
    trustedWorkspaces: string[];
    model?: string;
    permissions: { allow?: string[]; deny: string[]; };
}

/**
 * Antigravity on this computer as a writer of text (D-579 (1)): agy, sealed by settings of the engine's and refused every tool by its hook, in an empty folder
 * of its own. `program` is the line that starts it, `home` the player's real home, where their model is chosen.
 */
export function antigravityWriter(program = "agy", home = homedir()): TextWriter
{
    const ready = antigravityReady(program);
    return {
        ready: () => ready().ready,
        write: async (brief) => {
            if (!ready().ready) {
                return undefined;
            }

            const run = runFolder();

            try {
                prepareRun(run, sealedSettings(run.work, playerModel(home)), { read: [], write: [] });
                const ran = await runAgy(program, run, brief, longest);
                return ran.code === 0 && ran.status === "SUCCESS" ? ran.response : undefined;
            } finally {
                dropFolder(run.root);
            }
        },
    };
}

/**
 * Antigravity on this computer as the importer (D-579 (1)): agy in an empty folder of its own, reaching the import's folder by its full path, allowed to read
 * there and to write only in the folders given; its hook refuses any other call, and the settings close the run that makes one anyway.
 */
export function antigravityReader(program = "agy", home = homedir()): DocumentReader
{
    const ready = antigravityReady(program);
    return {
        ready: () => ready().ready,
        program: () => "Antigravity",
        clean: () => void sweep(),
        read: async (given, brief, writable, signal) => {
            const said = ready();

            if (!said.ready) {
                return { failed: said.why };
            }

            // Never in the campaign's tree, whose hooks and instructions agy would take as its own.
            const run = runFolder();

            try {
                // agy checks real paths: a folder behind a link would match none of its rules.
                const folder = realPath(given);
                const writeFolders = writable.map((name) => join(folder, name));
                prepareRun(run, readerSettings(folder, run.work, writable, playerModel(home)), { read: [folder, ...writeFolders], write: writeFolders });
                const ran = await runAgy(program, run, `${placeOf(folder)}\n\n${brief}`, longestReading, signal);
                return readingAnswer(ran);
            } finally {
                dropFolder(run.root);
            }
        },
    };
}

/** Why Antigravity paints no pictures, for the master and the player (T-251): the engine never installs it, so there is no step to give. */
export const antigravitySays = { notReady: { why: "Antigravity's agy does not answer on this computer, or is not signed in" } };

/**
 * Antigravity on this computer as the painter, where the campaign chose it and another host is the chat (T-251): agy in an empty folder of its own, with its
 * image tool and the two it calls it with let through, every other refused; the picture it saves in its own data folder, under its home of the engine's.
 */
export function antigravityPainter(program = "agy", home = homedir()): PictureMaker
{
    const ready = antigravityReady(program);
    return {
        ready,
        make: async (subject) => {
            const said = ready();

            if (!said.ready) {
                return { refused: said.why };
            }

            const run = runFolder();

            try {
                prepareRun(run, painterSettings(run.work, playerModel(home)), { read: [], write: [], tools: painterTools });
                const ran = await runAgy(program, run, chatBrief(subject), longestPainting);
                const file = newestPicture(join(run.home, ".gemini", "antigravity-cli", "brain"));

                // The folder stays until the engine copied the picture.
                if (file !== undefined) {
                    return { file, done: () => dropFolder(run.root) };
                }

                dropFolder(run.root);
                const words = ran.error ?? ran.response?.split("\n")[0]?.trim();
                return words === undefined || words === "" ? { refused: "Antigravity made no picture, and said nothing", onlyThis: true } : { refused: `Antigravity made no picture: ${words}` };
            } catch (error) {
                dropFolder(run.root);
                throw error;
            }
        },
    };
}

/** The painter's settings: its working folder trusted, the player's model, and every command, MCP tool and URL denied. */
export function painterSettings(work: string, model: string | undefined): AgySettings
{
    return { trustedWorkspaces: [work], ...modelOf(model), permissions: { deny: ["command(*)", "mcp(*)", "read_url(*)", "execute_url(*)", "download_url(*)"] } };
}

// The tools the painter calls, as the real run of 22 November did: its image tool, and the subagent and message it uses to reach it.
const painterTools = ["invoke_subagent", "generate_image", "send_message"];

// A picture in five minutes: the real run's took 52 seconds.
const longestPainting = 5 * 60 * 1000;

// The pictures agy saves, by their names' ends.
const pictureFile = /\.(png|jpe?g|webp)$/i;

/** The newest picture under `folder`, at any depth, but none under a .system_generated folder, which holds agy's own copies; undefined where there is none. */
function newestPicture(folder: string): string | undefined
{
    let newest: { path: string; time: number; } | undefined;

    const look = (here: string): void => {
        let entries;

        try {
            entries = readdirSync(here, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const path = join(here, entry.name);

            if (entry.isDirectory() && entry.name !== ".system_generated") {
                look(path);
            } else if (entry.isFile() && pictureFile.test(entry.name)) {
                const time = statSync(path).mtimeMs;
                newest = newest === undefined || time > newest.time ? { path, time } : newest;
            }
        }
    };

    look(folder);
    return newest?.path;
}

/** The writer's settings: `folder` trusted, the player's model, and every command, MCP tool, URL and file of the computer's `roots` denied. */
export function sealedSettings(folder: string, model: string | undefined, roots = computerRoots()): AgySettings
{
    const files = roots.flatMap((root) => [`read_file(${root})`, `write_file(${root})`]);
    return { trustedWorkspaces: [folder], ...modelOf(model), permissions: { deny: ["command(*)", "mcp(*)", "read_url(*)", "execute_url(*)", ...files] } };
}

/**
 * The importer's settings: its working folder trusted, the player's model, reading in the import's `folder` and writing in its `writable` subfolders, by their
 * full paths; commands, MCP tools and URLs denied. No drive is denied, as a deny wins over an allow beneath it.
 */
export function readerSettings(folder: string, work: string, writable: string[], model: string | undefined): AgySettings
{
    return {
        trustedWorkspaces: [work],
        ...modelOf(model),
        permissions: {
            allow: [`read_file(${folder})`, ...writable.map((name) => `write_file(${join(folder, name)})`)],
            deny: ["command(*)", "mcp(*)", "read_url(*)", "execute_url(*)", "download_url(*)"],
        },
    };
}

/** The model the player chose in Antigravity, from its settings in their real `home`; undefined where there is none. */
export function playerModel(home: string): string | undefined
{
    try {
        const text = readFileSync(join(home, ".gemini", "antigravity-cli", "settings.json"), "utf8").replace(/^﻿/, "");
        const settings = JSON.parse(text) as { model?: unknown; };
        return typeof settings.model === "string" ? settings.model : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Takes away what runs stopped from outside left, as by an import's cancel: each run's folder whose engine process is gone, its agy stopped first if it still
 * runs, and a folder that names no process once it is an hour old. Never throws.
 */
export async function sweep(): Promise<void>
{
    try {
        const names = readdirSync(tmpdir()).filter((name) => name.startsWith(runPrefix));
        await Promise.all(names.map((name) => sweepOne(join(tmpdir(), name))));
    } catch {
        // The temporary folder unread: the next sweep tries again.
    }
}

/** A run's folder: all a start of agy makes, its home and its working folder within. */
interface RunFolder
{
    root: string;
    home: string;
    work: string;
}

/** What one run of agy gave: its exit code, the result's response and status, why it failed, and what it refused. */
interface AgyRun
{
    code: number | null;
    response?: string;
    status?: string;
    error?: string;
    denied?: string[];
}

/** What owns a run's folder: the engine's process, and the agy it started. */
interface Owner
{
    engine: number;
    agy?: number;
}

/**
 * One run of agy in its folder: the brief as a stream-json message, its input closed once the result came, as agy then ends. It runs at low effort, and once
 * more without where agy refuses it for the model, at once and without spending. Stopped after `limit`, or by `signal`.
 */
async function runAgy(program: string, run: RunFolder, brief: string, limit: number, signal?: AbortSignal): Promise<AgyRun>
{
    const first = await runOnce(program, run, brief, limit, true, signal);

    // Only agy's own refusal of the effort: a run that died otherwise is never run again, as it may have spent half an hour.
    if (first.stopped || first.run.code === 0 || !/--effort/.test(first.run.error ?? "")) {
        return first.run;
    }

    return (await runOnce(program, run, brief, limit, false, signal)).run;
}

// A new run's folder, swept for what dead runs left first; its owner is this process.
function runFolder(): RunFolder
{
    void sweep();
    const root = realpathSync(mkdtempSync(join(tmpdir(), runPrefix)));
    writeOwner(root, { engine: process.pid });
    mkdirSync(join(root, "home"));
    mkdirSync(join(root, "work"));
    return { root, home: join(root, "home"), work: join(root, "work") };
}

// The settings, the fence and the hook of a run, in its folder: the hook in its working folder, where agy reads it.
function prepareRun(run: RunFolder, settings: AgySettings, fence: { read: string[]; write: string[]; tools?: string[]; }): void
{
    writeFileSync(join(run.root, "settings.json"), JSON.stringify(settings));
    writeFileSync(join(run.root, "fence.json"), JSON.stringify(fence));
    mkdirSync(join(run.work, ".agents"));
    writeFileSync(join(run.work, ".agents", "hooks.json"), JSON.stringify(fenceHooks(join(run.root, "fence.json"))));
}

// The importer's answer from its run: its words, or why it stopped, the run closed by the settings told apart.
function readingAnswer(ran: AgyRun): { said: string; } | { failed: string; }
{
    const done = ran.code === 0 && ran.status === "SUCCESS";

    if (done && ran.response !== undefined) {
        return { said: ran.response };
    }

    if (done && ran.denied !== undefined) {
        const names = ran.denied.length === 0 ? "" : ` (${ran.denied.join(", ")})`;
        return { failed: `Antigravity was stopped as it asked for something outside the import's folder${names}` };
    }

    return { failed: ran.error === undefined ? "Antigravity stopped without an answer" : `Antigravity said: ${ran.error}` };
}

// What the reader says before the engine's brief, whose paths are the import folder's while agy works elsewhere.
function placeOf(folder: string): string
{
    return `${folder} is the folder this brief calls "this folder". Every path of the brief is inside it: read and write each by its full path, as `
        + `${join(folder, "notes", "notes.md")}. Nothing outside it can be read or written.`;
}

// This engine's own command line, the file beside this module: never the script that started this process, which may be another program's, and which the
// hook would then start again at every tool, each start with a run of its own.
const engineScript = fileURLToPath(new URL(import.meta.url.endsWith(".ts") ? "../cli/cli.ts" : "../cli/cli.js", import.meta.url));

// The hook of a run's working folder: before every tool, this engine's own rpg --fence with the fence file, by full paths; an rpg of the PATH may be older,
// or not found from the home agy is given.
function fenceHooks(fence: string): object
{
    const command = `"${process.execPath}" "${engineScript}" --fence "${fence}"`;
    return { rpg: { PreToolUse: [{ matcher: ".*", hooks: [{ type: "command", command, timeout: 10 }] }] } };
}

function modelOf(model: string | undefined): { model?: string; }
{
    return model === undefined ? {} : { model };
}

// A folder by its real path, where it has one.
function realPath(folder: string): string
{
    try {
        return realpathSync(folder);
    } catch {
        return resolve(folder);
    }
}

// The drives of this computer, every file of which the writer is denied: on Windows each letter that is there, elsewhere the root.
function computerRoots(): string[]
{
    if (process.platform !== "win32") {
        return ["/"];
    }

    return Array.from({ length: 26 }, (_, index) => `${String.fromCharCode(65 + index)}:\\`).filter((root) => existsSync(root));
}

// Whether agy is ready, by the line that starts it: asked once, as the other helpers are, and remembered.
const readies = new Map<string, (again?: boolean) => PicturesReady>();

function antigravityReady(program: string): (again?: boolean) => PicturesReady
{
    const known = readies.get(program) ?? knownReady(() => modelsListed(program));
    readies.set(program, known);
    // Never from inside a run of the engine's helper: whatever starts there starts no agy of its own, or each run would start more.
    return (again) => (process.env.RPG_HELPER === "1" ? { ready: false, why: "this is already a run of RPG Engine's helper, which starts no other" } : known(again));
}

/** Ready where agy lists its models, which it does only signed in, without starting one. */
function modelsListed(program: string): PicturesReady
{
    const run = runFolder();

    try {
        const listed = spawnSync(`${program} models`, { shell: true, encoding: "utf8", timeout: 15_000, windowsHide: true, cwd: run.work, env: agyEnvironment(run.home) });
        return listed.error === undefined && listed.status === 0 ? { ready: true, maker: "Antigravity" } : { ready: false, ...antigravitySays.notReady };
    } finally {
        dropFolder(run.root);
    }
}

interface AgyEvent
{
    event?: unknown;
    result?: { response?: unknown; status?: unknown; error?: unknown; denied_actions?: unknown; };
}

/** One run of agy, with its effort or without: what it gave, whether a result came, and whether it was stopped. */
function runOnce(program: string, run: RunFolder, brief: string, limit: number, effort: boolean, signal?: AbortSignal): Promise<{ run: AgyRun; result: boolean; stopped: boolean; }>
{
    // The mode always given: the default differs by account.
    const line = `${program} --print= --input-format stream-json --output-format stream-json --mode accept-edits${effort ? " --effort low" : ""} --settings "${join(run.root, "settings.json")}"`;

    return new Promise((done) => {
        // Off Windows it leads a group of its own: the shell alone, stopped, would leave agy running with the output held open.
        const child = spawn(line, { shell: true, windowsHide: true, cwd: run.work, env: agyEnvironment(run.home), stdio: ["pipe", "pipe", "pipe"], detached: process.platform !== "win32" });
        let stopped = false;

        if (child.pid !== undefined) {
            writeOwner(run.root, { engine: process.pid, agy: child.pid });
        }

        const stop = (): void => {
            stopped = true;
            stopTree(child.pid);
        };

        signal?.addEventListener("abort", stop, { once: true });
        const timer = setTimeout(stop, limit);
        let pending = "";
        let result: AgyEvent["result"] | undefined;

        const hear = (text: string): void => {
            const event = eventOf(text);

            // The result came: its input closed, agy ends by itself.
            if (event?.event === "result" && result === undefined) {
                result = event.result ?? {};
                child.stdin.end();
            }
        };

        child.stdout.setEncoding("utf8");
        child.stderr.resume();
        child.stdout.on("data", (chunk: string) => {
            const lines = (pending + chunk).split("\n");
            pending = lines.pop() ?? "";
            lines.forEach(hear);
        });
        child.stdin.on("error", () => undefined);
        child.on("error", () => undefined);
        whenEnded(child, (code) => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", stop);
            hear(pending);
            done({ run: runOf(code, result, stopped), result: result !== undefined, stopped });
        });

        // The brief as one user message; the input stays open until the result comes.
        child.stdin.write(`${JSON.stringify({ event: "user", message: { role: "user", content: brief } })}\n`);
    });
}

// A run from its exit code and its result event: a failure's words in its error, or in its response where it did not succeed. A run stopped after its result
// succeeded keeps it.
function runOf(code: number | null, result: AgyEvent["result"] | undefined, stopped: boolean): AgyRun
{
    const response = textOf(result?.response)?.trim() || undefined;
    const status = textOf(result?.status);
    const error = textOf(result?.error) ?? textOf((result?.error as { message?: unknown; } | undefined)?.message) ?? (status !== "SUCCESS" ? response : undefined);
    const denied = deniedOf(result?.denied_actions);
    return {
        code: stopped && status === "SUCCESS" ? 0 : code,
        ...(response === undefined ? {} : { response }),
        ...(status === undefined ? {} : { status }),
        ...(error === undefined || error.trim() === "" ? {} : { error: error.trim() }),
        ...(denied === undefined ? {} : { denied }),
    };
}

// What a closed run refused, by name where it gives one; undefined where it refused nothing.
function deniedOf(value: unknown): string[] | undefined
{
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        return undefined;
    }

    const items: unknown[] = Array.isArray(value) ? value : [value];
    return items.flatMap((item): string[] => {
        const named = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : undefined;
        const name = textOf(item) ?? textOf(named?.action) ?? textOf(named?.name) ?? textOf(named?.tool);
        return name === undefined ? [] : [name];
    });
}

function textOf(value: unknown): string | undefined
{
    return typeof value === "string" ? value : undefined;
}

function eventOf(line: string): AgyEvent | undefined
{
    try {
        const event: unknown = JSON.parse(line);
        return typeof event === "object" && event !== null ? (event as AgyEvent) : undefined;
    } catch {
        return undefined;
    }
}

function writeOwner(root: string, owner: Owner): void
{
    try {
        writeFileSync(join(root, "owner.json"), JSON.stringify(owner));
    } catch {
        // A folder taken away meanwhile: nothing to own.
    }
}

// One run's folder, taken away when its engine is gone, or when it names none and is an hour old; its agy stopped first.
async function sweepOne(root: string): Promise<void>
{
    try {
        if (!isOwn(root)) {
            return;
        }

        const owner = ownerOf(root);

        if (owner === undefined ? Date.now() - statSync(root).mtimeMs < unownedAge : isAlive(owner.engine)) {
            return;
        }

        if (owner?.agy !== undefined && isAlive(owner.agy)) {
            stopTree(owner.agy);
        }

        await removeFolder(root);
    } catch {
        // Gone already, or held: the next sweep tries again.
    }
}

function ownerOf(root: string): Owner | undefined
{
    try {
        const owner = JSON.parse(readFileSync(join(root, "owner.json"), "utf8")) as { engine?: unknown; agy?: unknown; };
        const pid = (value: unknown): number | undefined => (typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined);
        const engine = pid(owner.engine);
        const agy = pid(owner.agy);
        return engine === undefined ? undefined : { engine, ...(agy === undefined ? {} : { agy }) };
    } catch {
        return undefined;
    }
}

// A run's folder taken away in the background, never holding the answer nor throwing: what stays, as a home agy still holds, is the next sweep's.
function dropFolder(folder: string): void
{
    void removeFolder(folder);
}

async function removeFolder(folder: string): Promise<void>
{
    try {
        await rm(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
        // Held still: the next sweep takes it.
    }
}

// The chat's variables agy's runs never get: the engine's, and the chat's folder. More of Antigravity's own may join them.
const chatVariables = /^(RPG_|PWD$|OLDPWD$|INIT_CWD$)/i;

/**
 * The environment of agy's runs: the chat's own, without what names the campaign, marked as a run of the engine's helper, and with `home` as its home, where
 * agy makes its own folder; its login is in the system's keychain, and follows.
 */
function agyEnvironment(home: string): NodeJS.ProcessEnv
{
    const name = process.platform === "win32" ? "USERPROFILE" : "HOME";
    const environment = Object.entries(chatEnvironment(chatVariables)).filter(([variable]) => variable.toUpperCase() !== name);
    return { ...Object.fromEntries(environment), RPG_HELPER: "1", [name]: home };
}
