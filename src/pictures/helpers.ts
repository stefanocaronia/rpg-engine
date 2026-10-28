// Codex and Claude Code with the player's own login (D-424, D-425): found on the PATH or in the engine's folder, installed there with npm, never globally, and
// signed in by the player in the browser; started through the shell from a folder of no campaign, without the chat's variables or an API key.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import type { HelperLogin, HelperName, Helpers, HelperState, PicturesReady } from "../core/context.ts";
import { stopTree } from "./stop.ts";

// The npm package of each program.
const packages: Record<HelperName, string> = { codex: "@openai/codex", claude: "@anthropic-ai/claude-code" };

// How long the player has to sign in, in the browser that opened (neither program stops waiting by itself).
const loginWait = 10 * 60 * 1000;

// How long install waits for the sign-in's link, or its end, before it answers: the probe's printed its link at once.
const linkWait = 5000;

// How long an installation may take: the probe's took 13 to 21 seconds.
const installWait = 5 * 60 * 1000;

// How long Codex may take to queue a message: the probe's took well under a second.
const queueWait = 15_000;

// The sign-ins under way, or failed and not yet told, by program; the installations under way; how each program stood when last asked; and how many times one
// came ready here, after which the makers of pictures ask again.
const logins = new Map<HelperName, { login: HelperLogin; child?: ChildProcess; }>();
const installs = new Map<HelperName, Promise<string | undefined>>();
const states = new Map<HelperName, HelperState>();
let changes = 0;

// A sign-in still waiting goes with the server: its own timer would never come.
process.once("exit", () => logins.forEach((run) => run.child !== undefined && run.login.state === "waiting" && stopTree(run.child)));

/** Codex and Claude Code on this computer, the engine's own folder in `folder`. */
export function computerHelpers(folder = toolsFolder()): Helpers
{
    return {
        // A program come ready, however the player signed in, has the makers of pictures ask again.
        state: (name) => {
            const state = helperState(name, folder).state;

            if (state === "ready" && states.get(name) !== "ready") {
                changes++;
            }

            states.set(name, state);
            return state;
        },
        install: (name) => {
            // One installation of a program at a time: a call the host gave up on and asked again waits for the first.
            const running = installs.get(name) ?? installHelper(name, folder).finally(() => installs.delete(name));
            installs.set(name, running);
            return running;
        },
        login: (name) => {
            const run = logins.get(name);

            if (run?.login.state === "waiting") {
                return Promise.resolve(run.login);
            }

            // A sign-in that failed after install answered is told once; the next call starts another.
            if (run?.login.state === "failed") {
                logins.delete(name);
                return Promise.resolve(run.login);
            }

            const line = helperLine(name, folder);
            return line === undefined ? Promise.resolve({ state: "failed", why: `${name} does not answer on this computer` }) : startLogin(name, line);
        },
    };
}

/** Where the engine keeps the programs it installs: the player's local data, as they weigh hundreds of megabytes (D-425). */
export function toolsFolder(): string
{
    const home = homedir();

    if (process.platform === "win32") {
        return join(process.env.LOCALAPPDATA || join(home, "AppData", "Local"), "rpg-engine", "tools");
    }

    return process.platform === "darwin"
        ? join(home, "Library", "Application Support", "rpg-engine", "tools")
        : join(process.env.XDG_DATA_HOME || join(home, ".local", "share"), "rpg-engine", "tools");
}

/** The line that starts a program in the shell: its name where the PATH has it, else its full path in the engine's folder; undefined where neither answers. */
export function helperLine(name: HelperName, folder = toolsFolder()): string | undefined
{
    if (answers(name, name)) {
        return name;
    }

    const own = installedLine(name, folder);
    return own !== undefined && answers(name, own) ? own : undefined;
}

/** How a program stands, from its own status, without spending anything; with the line that starts it. */
export function helperState(name: HelperName, folder = toolsFolder()): { state: HelperState; line?: string; }
{
    const line = helperLine(name, folder);

    if (line === undefined) {
        return { state: "missing" };
    }

    const status = spawnSync(`${line} ${name === "codex" ? "login status" : "auth status"}`, {
        shell: true,
        encoding: "utf8",
        timeout: 15_000,
        windowsHide: true,
        cwd: tmpdir(),
        env: helperEnvironment(name),
    });
    const said = `${status.stdout ?? ""}${status.stderr ?? ""}`;

    if (name === "codex") {
        const state: HelperState = status.error !== undefined || status.status !== 0 || /not logged in/i.test(said) ? "logged out" : /chatgpt/i.test(said) ? "ready" : "api key";
        return { state, line };
    }

    const json = ((): { loggedIn?: unknown; authMethod?: unknown; } => {
        try {
            return JSON.parse(status.stdout ?? "") as { loggedIn?: unknown; authMethod?: unknown; };
        } catch {
            return {};
        }
    })();
    return { state: json.loggedIn !== true ? "logged out" : json.authMethod === "claude.ai" ? "ready" : "api key", line };
}

/** How many times a program came ready on this computer since the engine started: a maker that said no asks again after one. */
export function helperChanges(): number
{
    return changes;
}

/**
 * A maker's ready, as its `check` says it: asked once; a no again after a minute, only where the player may be waiting for it, as Settings and image, never on
 * every call of the master; and again at once after a program came ready here, as after the player signs in (D-424).
 */
export function knownReady(check: () => PicturesReady): (again?: boolean) => PicturesReady
{
    let known: { said: PicturesReady; at: number; changes: number; } | undefined;

    return (again) => {
        const late = again === true && Date.now() - (known?.at ?? 0) > 60_000;

        if (known === undefined || (!known.said.ready && (late || known.changes !== changes))) {
            known = { said: check(), at: Date.now(), changes };
        }

        return known.said;
    };
}

/**
 * The environment of a program: the chat's variables and any API key taken away, where its login and its shell are kept (D-342, D-425); and on Windows the shell
 * told not to look for programs in the folder it starts in, which could be a campaign's.
 */
export function helperEnvironment(name: HelperName): NodeJS.ProcessEnv
{
    const kept = new Set(["CLAUDE_CONFIG_DIR", "CLAUDE_CODE_GIT_BASH_PATH", "CODEX_HOME"]);
    // Never an API key (D-493): it pays by the call, and a player could spend thousands without noticing; only the player's own plan.
    const dropped = name === "codex" ? /^(OPENAI_API_KEY|CODEX_API_KEY)$/i : /^(CLAUDE|ANTHROPIC)/i;
    const own = Object.fromEntries(Object.entries(process.env).filter(([variable]) => kept.has(variable.toUpperCase()) || !dropped.test(variable)));
    return { ...own, NoDefaultCurrentDirectoryInExePath: "1" };
}

/**
 * The player's sign-in, started once and kept alive until it ends or ten minutes pass. It answers once the program printed its link, for a browser that did
 * not open, or ended, or after a few seconds; how it ends later is told by the next call.
 */
export function startLogin(name: HelperName, line: string, wait = linkWait): Promise<HelperLogin>
{
    const child = spawn(`${line} ${name === "codex" ? "login" : "auth login"}`, { shell: true, windowsHide: true, cwd: tmpdir(), env: helperEnvironment(name), stdio: ["pipe", "pipe", "pipe"] });
    const run: { login: HelperLogin; child?: ChildProcess; } = { login: { state: "waiting" }, child };
    let said = "";
    let answer: ((login: HelperLogin) => void) | undefined;
    logins.set(name, run);

    const tell = (): void => {
        answer?.(run.login);
        answer = undefined;
    };

    const end = (login: HelperLogin): void => {
        clearTimeout(timer);

        if (logins.get(name) !== run) {
            return;
        }

        run.login = login;

        // Signed in: nothing to tell later, as the program now says it is ready; a failure waits for the next call.
        if (login.state === "done") {
            changes++;
            logins.delete(name);
        }

        tell();
    };

    const hear = (chunk: string): void => {
        said += chunk;
        const link = /https:\/\/\S+/.exec(said)?.[0];

        if (link !== undefined && run.login.state === "waiting" && run.login.link === undefined) {
            run.login = { state: "waiting", link };
            tell();
        }
    };

    const timer = setTimeout(() => {
        stopTree(child);
        end({ state: "failed", why: "the sign-in waited ten minutes, and the player did not finish it" });
    }, loginWait);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", hear);
    child.stderr.on("data", hear);
    child.stdin.on("error", () => undefined);
    child.on("error", () => undefined);
    child.on("close", (code) => {
        const last = said.trim().split("\n").filter((one) => one.trim() !== "").at(-1)?.trim();
        end(code === 0 ? { state: "done" } : { state: "failed", why: last === undefined ? "the sign-in stopped" : `it said: ${last}` });
    });

    return new Promise((done) => {
        answer = done;
        setTimeout(tell, wait).unref();
    });
}

/** The line that starts a program installed in the engine's folder, from its package's own bin: node and a script, or the program itself; undefined where it is not there. */
export function installedLine(name: HelperName, folder: string): string | undefined
{
    const file = packageBin(name, join(folder, "node_modules"));

    if (file === undefined) {
        return undefined;
    }

    return /\.[cm]?js$/i.test(file) ? `"${process.execPath}" "${file}"` : `"${file}"`;
}

/**
 * A program as it starts without a shell, for words the player wrote that no shell may read (D-495): node and its package's script, or the program itself;
 * from the engine's folder, else from npm's beside a folder of the PATH. Undefined where neither has it.
 */
export function helperCommand(name: HelperName, folder = toolsFolder()): { command: string; args: string[]; } | undefined
{
    const folders = (process.env.PATH ?? "").split(delimiter).filter((one) => one !== "");
    const roots = [join(folder, "node_modules"), ...folders.flatMap((one) => [join(one, "node_modules"), join(one, "..", "lib", "node_modules")])];

    for (const root of roots) {
        const file = packageBin(name, root);

        if (file !== undefined) {
            return /\.[cm]?js$/i.test(file) ? { command: process.execPath, args: [file] } : { command: file, args: [] };
        }
    }

    return undefined;
}

/** Queues a message in a Codex thread, as the player's own (D-495): whether Codex took it, in fifteen seconds at most. */
export function queueInCodex(thread: string, message: string, folder = toolsFolder()): Promise<boolean>
{
    const codex = helperCommand("codex", folder);

    if (codex === undefined) {
        return Promise.resolve(false);
    }

    return new Promise((done) => {
        let child: ChildProcess;

        try {
            // The message joined to its option, so that one that begins with a dash is never read as another.
            child = spawn(codex.command, [...codex.args, "queue", "--thread", thread, `--message=${message}`], { windowsHide: true, cwd: tmpdir(), env: helperEnvironment("codex"), stdio: "ignore" });
        } catch {
            done(false);
            return;
        }

        const timer = setTimeout(() => stopTree(child), queueWait).unref();
        child.on("error", () => done(false));
        child.on("exit", (code) => {
            clearTimeout(timer);
            done(code === 0);
        });
    });
}

/** The file a package's bin names for a program, in a node_modules folder; undefined where it is not there. */
function packageBin(name: HelperName, modules: string): string | undefined
{
    const packageFolder = join(modules, ...packages[name].split("/"));

    try {
        const bin = (JSON.parse(readFileSync(join(packageFolder, "package.json"), "utf8")) as { bin?: string | Record<string, string>; }).bin;
        const relative = typeof bin === "string" ? bin : bin?.[name];
        const file = relative === undefined ? undefined : join(packageFolder, relative);
        return file !== undefined && existsSync(file) ? file : undefined;
    } catch {
        return undefined;
    }
}

/** Installs a program in the engine's folder with npm, never globally (D-425): undefined once it answers there, else why not. */
function installHelper(name: HelperName, folder: string): Promise<string | undefined>
{
    return new Promise((done) => {
        const child = spawn(`npm install --prefix "${folder}" ${packages[name]} --no-audit --no-fund --loglevel=error`, {
            shell: true,
            windowsHide: true,
            cwd: tmpdir(),
            env: { ...process.env, NoDefaultCurrentDirectoryInExePath: "1" },
            stdio: ["ignore", "ignore", "pipe"],
        });
        let errors = "";
        const timer = setTimeout(() => stopTree(child), installWait);
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk: string) => (errors += chunk));
        child.on("error", () => undefined);
        child.on("close", (code) => {
            clearTimeout(timer);
            const line = installedLine(name, folder);

            if (code === 0 && line !== undefined && answers(name, line)) {
                done(undefined);
                return;
            }

            const said = errors.trim().split("\n").filter((one) => one.trim() !== "").at(-1)?.trim();
            done(said === undefined ? `npm stopped without installing ${packages[name]}` : `npm said: ${said}`);
        });
    });
}

/** Whether a program answers through a line, its version given in a moment. */
function answers(name: HelperName, line: string): boolean
{
    const version = spawnSync(`${line} --version`, { shell: true, encoding: "utf8", timeout: 15_000, windowsHide: true, cwd: tmpdir(), env: helperEnvironment(name) });
    return version.error === undefined && version.status === 0;
}
