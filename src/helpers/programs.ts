// Codex and Claude Code with the player's own login (D-424, D-425): found on the PATH or in the engine's folder, installed there with npm, never globally, and
// signed in by the player in the browser; started through the shell from a folder of no campaign, without the chat's variables or an API key.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import type { HelperLogin, HelperName, Helpers, HelperState, PicturesReady } from "../core/context.ts";
import type { HostId } from "../core/hosts.ts";
import { claimMark, releaseMark } from "../core/process-mark.ts";
import { endingOf, stopGently, stopTree, whenEnded } from "../core/process.ts";

// The npm package of each program, and its name for the player.
const packages: Record<HelperName, string> = { codex: "@openai/codex", claude: "@anthropic-ai/claude-code" };
const programNames: Record<HelperName, string> = { codex: "Codex", claude: "Claude Code" };

// What a sign-in and an installation answer where another process of the engine has one under way.
const signInElsewhere = (name: HelperName): string => `a sign-in to ${programNames[name]} is already under way in another window of RPG Engine: finish it there, or close that window, then try again`;
const installElsewhere = "an installation is already under way in another window of RPG Engine: wait for it to end there, then try again";

// How long the player has to sign in, in the browser that opened (neither program stops waiting by itself).
const loginWait = 10 * 60 * 1000;

// How long install waits for the sign-in's link, or its end, before it answers: the probe's printed its link at once.
const linkWait = 5000;

// How long an installation may take: the probe's took 13 to 21 seconds.
const installWait = 5 * 60 * 1000;

// How long a program may take to say its status or its version.
const statusWait = 15_000;

// How long Codex may take to queue a message: the probe's took well under a second.
const queueWait = 15_000;

// Off Windows a line of the shell leads a group of its own: stopped, the program the shell started goes with it, where the shell alone would go and leave it.
const ownGroup = process.platform !== "win32";

// The sign-ins under way, or failed and not yet told, by program; the installations under way; how each program stood when last asked; how many times one
// came ready here, after which the makers of pictures ask again; and how many installations run here, which hold the computer's mark.
const logins = new Map<HelperName, LoginRun>();
const installs = new Map<HelperName, Promise<string | undefined>>();
const states = new Map<HelperName, HelperState>();
let changes = 0;
let installsHere = 0;

/** A sign-in under way, or failed and not yet told: how it stands, its program, who waits for its end, and how it is stopped. */
interface LoginRun
{
    login: HelperLogin;
    child?: ChildProcess;
    heard: ((login: HelperLogin) => void)[];
    stop?: () => void;
}

// A sign-in still waiting goes with the server: its own timer would never come.
process.once("exit", () => logins.forEach((run) => run.child !== undefined && run.login.state === "waiting" && stopTree(run.child.pid)));

/** The program behind a host that the engine signs in and installs itself; undefined for the others. */
export const hostHelper: Partial<Record<HostId, HelperName>> = { claudeCode: "claude", codex: "codex" };

/** Codex and Claude Code on this computer, the engine's own folder in `folder`, found in the folders of the `environment`'s PATH. */
export function computerHelpers(folder = toolsFolder(), environment: NodeJS.ProcessEnv = process.env): Helpers
{
    return {
        state: (name) => helperState(name, folder, environment).state,
        look: async (name) => noteState(name, await lookAtHelper(name, folder, environment)),
        install: (name) => {
            // One installation of a program at a time: a call the host gave up on and asked again waits for the first.
            const running = installs.get(name) ?? installAlone(name, folder).finally(() => installs.delete(name));
            installs.set(name, running);
            return running;
        },
        login: async (name, ended) => {
            const run = logins.get(name);

            if (run?.login.state === "waiting") {
                if (ended !== undefined) {
                    run.heard.push(ended);
                }

                return run.login;
            }

            // A sign-in that failed after install answered is told once; the next call starts another.
            if (run?.login.state === "failed") {
                logins.delete(name);
                return run.login;
            }

            // Found without starting anything, so that the sign-in starts in this very call, where a cancel at once reaches it.
            const line = helperLine(name, folder, environment);

            if (line === undefined) {
                return { state: "failed", why: `${name} is not on this computer` };
            }

            // One sign-in of a program on this computer: another window of the engine, a table or the launcher, may have one under way.
            const mark = markFile(folder, `login-${name}`);

            if (!claimMark(mark)) {
                return { state: "failed", why: signInElsewhere(name) };
            }

            try {
                return await startLogin(name, line, linkWait, ended, () => releaseMark(mark));
            } catch (error) {
                releaseMark(mark);
                throw error;
            }
        },
        cancel: cancelLogin,
    };
}

/** Whether why a sign-in or an installation did not start says that another window of the engine has one under way: nothing failed, it goes on there. */
export function isUnderWayElsewhere(why: string): boolean
{
    return why === installElsewhere || (Object.keys(programNames) as HelperName[]).some((name) => why === signInElsewhere(name));
}

/** Stops the sign-in of a program under way, its program and all it started, and forgets it; nothing where none is. */
export function cancelLogin(name: HelperName): void
{
    const run = logins.get(name);
    logins.delete(name);
    run?.stop?.();
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

/**
 * The line that starts a program in the shell, found without starting anything: its name where a folder of the `environment`'s PATH has it, else its full
 * path in the engine's folder; undefined where neither has it.
 */
export function helperLine(name: HelperName, folder = toolsFolder(), environment: NodeJS.ProcessEnv = process.env): string | undefined
{
    return onPath(name, environment) ? name : installedLine(name, folder);
}

/**
 * How a program stands, from its own status, without spending anything; with the line that starts it. A status that says nothing, too slow, failed or not
 * read, is never signed out: it keeps how the program stood when last known here, and only where nothing is known reads as signed out.
 */
export function helperState(name: HelperName, folder = toolsFolder(), environment: NodeJS.ProcessEnv = process.env): { state: HelperState; line?: string; }
{
    const line = helperLine(name, folder, environment);

    if (line === undefined) {
        return { state: "missing" };
    }

    const status = spawnSync(`${line} ${statusArguments(name)}`, { shell: true, encoding: "utf8", timeout: statusWait, windowsHide: true, cwd: tmpdir(), env: helperEnvironment(name) });
    const said = statusSaid(name, { ended: status.error === undefined, stdout: status.stdout ?? "", stderr: status.stderr ?? "" });

    if (said !== undefined) {
        return { state: noteState(name, said), line };
    }

    // Found now, so never missing, whatever was known before.
    const known = states.get(name);
    return { state: known === undefined || known === "missing" ? "logged out" : known, line };
}

/**
 * How a program stands, as helperState says it, without holding the process: one program started, its status. It fails where the status says nothing, as one
 * that took too long or could not be read: not knowing is never signed out, which would send the player to sign in again.
 */
export async function lookAtHelper(name: HelperName, folder = toolsFolder(), environment: NodeJS.ProcessEnv = process.env, wait = statusWait): Promise<HelperState>
{
    const line = helperLine(name, folder, environment);

    if (line === undefined) {
        return "missing";
    }

    const said = statusSaid(name, await runLine(name, `${line} ${statusArguments(name)}`, wait));

    if (said === undefined) {
        throw new Error(`${name} did not say how it stands`);
    }

    return said;
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
    const own = Object.fromEntries(Object.entries(process.env).filter(([variable]) => !isDropped(name, variable)));
    return { ...own, NoDefaultCurrentDirectoryInExePath: "1" };
}

/**
 * Whether an environment holds, with a value, a credential a program's status is asked without, as an API key or a cloud provider of its own: a chat started
 * with it may play where that status says the player is signed out. Only these: the program's other variables, which its status is asked without too, as
 * a chat's own or a setting, sign nobody in.
 */
export function heldBack(name: HelperName, environment: NodeJS.ProcessEnv): boolean
{
    // Codex's app-server signs nobody in with OPENAI_API_KEY (tried with Codex 0.166.0); CODEX_API_KEY, not tried, is held as one that may.
    const credentials = name === "codex" ? /^CODEX_API_KEY$/i : /^(ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|CLAUDE_CODE_OAUTH_TOKEN|CLAUDE_CODE_USE_(BEDROCK|VERTEX|FOUNDRY))$/i;
    return Object.entries(environment).some(([variable, value]) => value !== undefined && value !== "" && credentials.test(variable) && isDropped(name, variable));
}

// What a program's environment keeps of the player's though its name is among those left out.
const keptVariables = new Set(["CLAUDE_CONFIG_DIR", "CLAUDE_CODE_GIT_BASH_PATH", "CODEX_HOME"]);

/** Whether a variable is left out of a program's environment: never an API key (D-493), which pays by the call; only the player's own plan. */
function isDropped(name: HelperName, variable: string): boolean
{
    const dropped = name === "codex" ? /^(OPENAI_API_KEY|CODEX_API_KEY)$/i : /^(CLAUDE|ANTHROPIC)/i;
    return !keptVariables.has(variable.toUpperCase()) && dropped.test(variable);
}

/** Whether a file or folder of the temporary folder is this user's own, never another's left to have the engine stop or run something; always on Windows. */
export function isOwn(path: string): boolean
{
    try {
        return process.getuid === undefined || statSync(path).uid === process.getuid();
    } catch {
        return false;
    }
}

/**
 * The environment of a program of the chat in use, as OpenCode or Antigravity: the chat's own, without the variables whose names `dropped` matches nor any that
 * names the `campaign`'s folder, and the PATH without its folders; the player's keys and settings stay. On Windows the shell does not look for programs in the
 * folder it starts in.
 */
export function chatEnvironment(dropped: RegExp, campaign = process.cwd()): NodeJS.ProcessEnv
{
    // The folder the chat runs in, a campaign's; never a root, which every path would name.
    const here = dirname(campaign) === campaign ? "\u0000" : campaign.toLowerCase().replace(/[\\/]+$/, "");

    // A folder of the PATH in the campaign: the campaign itself or one below it, never a sibling whose name begins the same.
    const inCampaign = (folder: string): boolean => {
        const path = folder.toLowerCase().replace(/[\\/]+$/, "");
        return path === here || path.startsWith(`${here}\\`) || path.startsWith(`${here}/`);
    };

    const kept = Object.entries(process.env).flatMap(([variable, value]): [string, string][] => {
        if (value === undefined || dropped.test(variable)) {
            return [];
        }

        if (variable.toUpperCase() === "PATH") {
            return [[variable, value.split(delimiter).filter((folder) => !inCampaign(folder)).join(delimiter)]];
        }

        return value.toLowerCase().includes(here) ? [] : [[variable, value]];
    });
    return { ...Object.fromEntries(kept), NoDefaultCurrentDirectoryInExePath: "1" };
}

/**
 * The player's sign-in, started once and kept alive until it ends or ten minutes pass. It answers once the program printed its link, for a browser that did
 * not open, or ended, or after a few seconds; how it ends later is told by the next call. `released` is called once as it ends or is cancelled.
 */
export function startLogin(name: HelperName, line: string, wait = linkWait, ended?: (login: HelperLogin) => void, released?: () => void): Promise<HelperLogin>
{
    let free = released;

    const release = (): void => {
        free?.();
        free = undefined;
    };

    const child = spawn(`${line} ${name === "codex" ? "login" : "auth login"}`, { shell: true, detached: ownGroup, windowsHide: true, cwd: tmpdir(), env: helperEnvironment(name), stdio: ["pipe", "pipe", "pipe"] });
    const ending = endingOf(child);
    const run: LoginRun = { login: { state: "waiting" }, child, heard: ended === undefined ? [] : [ended] };
    let said = "";
    let answer: ((login: HelperLogin) => void) | undefined;
    logins.set(name, run);

    const tell = (): void => {
        answer?.(run.login);
        answer = undefined;
    };

    const end = (login: HelperLogin): void => {
        clearTimeout(timer);
        release();

        if (logins.get(name) !== run) {
            return;
        }

        run.login = login;

        // Signed in: nothing to tell later, as the program now says it is ready; a failure waits for the next call, unless someone heard it already.
        if (login.state === "done" || run.heard.length > 0) {
            changes += login.state === "done" ? 1 : 0;
            logins.delete(name);
        }

        run.heard.forEach((hear) => hear(login));
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

    // Out of time or cancelled, the program ends gently first: it may be saving the player's sign-in (T-301).
    const timer = setTimeout(() => {
        void stopGently(ending);
        end({ state: "failed", why: "the sign-in waited ten minutes, and the player did not finish it" });
    }, loginWait);

    // Cancelled: forgotten already, so its close tells nobody; the first answer still comes, as it stood.
    run.stop = () => {
        clearTimeout(timer);
        void stopGently(ending);
        release();
    };

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
export function helperCommand(name: HelperName, folder = toolsFolder(), environment: NodeJS.ProcessEnv = process.env): { command: string; args: string[]; } | undefined
{
    // PATH whatever the case of its name, as Windows writes Path.
    const path = Object.entries(environment).find(([key]) => key.toUpperCase() === "PATH")?.[1];
    const folders = (path ?? "").split(delimiter).filter((one) => one !== "");
    const roots = [join(folder, "node_modules"), ...folders.flatMap((one) => [join(one, "node_modules"), join(one, "..", "lib", "node_modules")])];

    for (const root of roots) {
        const file = packageBin(name, root);

        if (file !== undefined) {
            return /\.[cm]?js$/i.test(file) ? { command: process.execPath, args: [file] } : { command: file, args: [] };
        }
    }

    return undefined;
}

/**
 * The program of an AI host installed with npm, as helperCommand finds it in the folders of the environment's PATH: Claude Code's and Codex's; undefined for
 * another host, or where it is not there.
 */
export function hostCommand(host: HostId, environment: NodeJS.ProcessEnv = process.env, folder = toolsFolder()): { command: string; args: string[]; } | undefined
{
    const name = hostHelper[host];
    return name === undefined ? undefined : helperCommand(name, folder, environment);
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
            child = spawn(codex.command, [...codex.args, "queue", "--thread", thread, `--message=${message}`], { detached: ownGroup, windowsHide: true, cwd: tmpdir(), env: helperEnvironment("codex"), stdio: "ignore" });
        } catch {
            done(false);
            return;
        }

        // Out of time, Codex ends gently first (T-301).
        const ending = endingOf(child);
        const timer = setTimeout(() => void stopGently(ending), queueWait).unref();
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

/**
 * Installs a program as installHelper does, one installation in the engine's folder on this computer: another window of the engine, a table or the launcher,
 * may have one under way in the same folder, which npm cannot share.
 */
async function installAlone(name: HelperName, folder: string): Promise<string | undefined>
{
    const mark = markFile(folder, "install");

    if (!claimMark(mark)) {
        return installElsewhere;
    }

    installsHere++;

    try {
        return await installHelper(name, folder);
    } finally {
        // The mark is this process's: it goes once its last installation ended.
        installsHere--;

        if (installsHere === 0) {
            releaseMark(mark);
        }
    }
}

/** The file of a mark of work done alone in the engine's folder, as a sign-in or an installation. */
function markFile(folder: string, work: string): string
{
    return join(folder, "marks", work);
}

/** Installs a program in the engine's folder with npm, never globally (D-425): undefined once it answers there, else why not. */
function installHelper(name: HelperName, folder: string): Promise<string | undefined>
{
    return new Promise((done) => {
        const child = spawn(`npm install --prefix "${folder}" ${packages[name]} --no-audit --no-fund --loglevel=error`, {
            shell: true,
            detached: ownGroup,
            windowsHide: true,
            cwd: tmpdir(),
            env: { ...process.env, NoDefaultCurrentDirectoryInExePath: "1" },
            stdio: ["ignore", "ignore", "pipe"],
        });
        let errors = "";
        const timer = setTimeout(() => stopTree(child.pid), installWait);
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk: string) => (errors += chunk));
        child.on("error", () => undefined);
        child.on("close", async (code) => {
            clearTimeout(timer);
            const line = installedLine(name, folder);

            if (code === 0 && line !== undefined && await answersLater(name, line)) {
                done(undefined);
                return;
            }

            const said = errors.trim().split("\n").filter((one) => one.trim() !== "").at(-1)?.trim();
            done(said === undefined ? `npm stopped without installing ${packages[name]}` : `npm said: ${said}`);
        });
    });
}

/** How a program stood when last asked, kept: one come ready, however the player signed in, has the makers of pictures ask again. */
function noteState(name: HelperName, state: HelperState): HelperState
{
    if (state === "ready" && states.get(name) !== "ready") {
        changes++;
    }

    states.set(name, state);
    return state;
}

/** What a program is asked for its status. */
function statusArguments(name: HelperName): string
{
    return name === "codex" ? "login status" : "auth status";
}

/**
 * How a program stands as its status says it, Codex in words and Claude Code in JSON; undefined where it says nothing: it did not end in time or could not
 * start, or its words are none of these. Signed out only where the program says so.
 */
function statusSaid(name: HelperName, status: { ended: boolean; stdout: string; stderr: string; }): HelperState | undefined
{
    if (!status.ended) {
        return undefined;
    }

    if (name === "codex") {
        const said = `${status.stdout}${status.stderr}`;
        return /not logged in/i.test(said) ? "logged out" : !/logged in/i.test(said) ? undefined : /chatgpt/i.test(said) ? "ready" : "api key";
    }

    try {
        const json = JSON.parse(status.stdout) as { loggedIn?: unknown; authMethod?: unknown; };
        return typeof json.loggedIn !== "boolean" ? undefined : !json.loggedIn ? "logged out" : json.authMethod === "claude.ai" ? "ready" : "api key";
    } catch {
        return undefined;
    }
}

/** Whether a folder of the environment's PATH holds a program by this name, as the shell finds it: on Windows with one of the extensions it runs. */
function onPath(name: HelperName, environment: NodeJS.ProcessEnv): boolean
{
    const variable = (wanted: string): string => Object.entries(environment).find(([key]) => key.toUpperCase() === wanted)?.[1] ?? "";
    const windows = process.platform === "win32";
    const endings = windows ? (variable("PATHEXT") || ".COM;.EXE;.BAT;.CMD").split(";").filter((ending) => ending !== "") : [""];

    return variable("PATH").split(delimiter).filter((folder) => folder !== "").some((folder) => endings.some((ending) => isProgram(join(folder, `${name}${ending}`), windows)));
}

/** Whether a file is there and, off Windows, may run. */
function isProgram(file: string, windows: boolean): boolean
{
    try {
        if (!statSync(file).isFile()) {
            return false;
        }

        if (!windows) {
            accessSync(file, constants.X_OK);
        }

        return true;
    } catch {
        return false;
    }
}

/** Whether a program answers through a line, its version given in a moment, without holding the process. */
async function answersLater(name: HelperName, line: string): Promise<boolean>
{
    const ran = await runLine(name, `${line} --version`, statusWait);
    return ran.ended && ran.code === 0;
}

/**
 * A line run in the shell, in a program of its own, as the programs' status is asked: what it said, its exit code, and whether it ended within `wait`; at
 * `wait` it is stopped and told at once, whatever it started that still holds its output.
 */
function runLine(name: HelperName, line: string, wait: number): Promise<{ ended: boolean; code: number | null; stdout: string; stderr: string; }>
{
    return new Promise((done) => {
        let stdout = "";
        let stderr = "";
        let told = false;
        let child: ChildProcess;

        try {
            child = spawn(line, { shell: true, detached: ownGroup, windowsHide: true, cwd: tmpdir(), env: helperEnvironment(name), stdio: ["ignore", "pipe", "pipe"] });
        } catch {
            done({ ended: false, code: null, stdout, stderr });
            return;
        }

        const tell = (ended: boolean, code: number | null): void => {
            if (!told) {
                told = true;
                clearTimeout(timer);
                done({ ended, code, stdout, stderr });
            }
        };

        // Out of time, told at once; the program ends gently first, as one at work on the player's sign-in (T-301).
        const ending = endingOf(child);
        const timer = setTimeout(() => {
            void stopGently(ending);
            tell(false, null);
        }, wait);
        child.stdout?.setEncoding("utf8");
        child.stderr?.setEncoding("utf8");
        child.stdout?.on("data", (chunk: string) => (stdout += chunk));
        child.stderr?.on("data", (chunk: string) => (stderr += chunk));
        child.on("error", () => tell(false, null));
        whenEnded(child, (code) => tell(true, code));
    });
}
