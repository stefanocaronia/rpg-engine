// Git in a folder, through the git of this computer: whether the folder is in a repository, a commit of its changes, a push. It never asks anything: a git
// that would ask for a password or a passphrase fails instead, and says why.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { stopTree } from "../core/process.ts";

/** Whether `folder` is inside a git repository: it, or a folder above it, holds a .git. Git itself need not be installed. */
export function isRepository(folder: string): boolean
{
    return repositoryRoot(folder) !== undefined;
}

/** The folder of the repository `folder` is in, the one that holds the .git: it or one above it; undefined outside any. */
export function repositoryRoot(folder: string): string | undefined
{
    for (let current = resolve(folder);; current = dirname(current)) {
        // A folder, or a file in a worktree or a submodule.
        if (existsSync(join(current, ".git"))) {
            return current;
        }

        if (dirname(current) === current) {
            return undefined;
        }
    }
}

/**
 * Commits every change under `folder`, and only there, with `message`, `left` (paths in it) taken out of the repository but left on the disk: true when there
 * was a change, false when there was none. The commit is made on an index of its own, so that what the player staged elsewhere stays staged and out of it;
 * then the repository's index follows it under `folder`. It throws with git's words.
 */
export async function commitFolder(folder: string, message: string, left: string[] = []): Promise<boolean>
{
    const own = { GIT_INDEX_FILE: join(tmpdir(), `rpg-git-index-${randomUUID()}`) };

    try {
        const before = await hasCommits(folder);

        if (before) {
            await git(folder, ["read-tree", "HEAD"], own);
        }

        await stageFolder(folder, left, own);
        // The changes to HEAD, or in a repository with no commit yet whatever is staged.
        const changes = await git(folder, before ? ["diff", "--cached", "--name-only"] : ["ls-files"], own);

        if (changes.trim() === "") {
            return false;
        }

        await git(folder, ["commit", "--quiet", "--message", message], own);
    } finally {
        rmSync(own.GIT_INDEX_FILE, { force: true });
    }

    await stageFolder(folder, left);
    return true;
}

/** Pushes the branch of the repository of `folder` to where it is pushed. It throws with git's words. */
export async function push(folder: string): Promise<void>
{
    // A branch with no upstream yet gets the one of its name, as the player's first git push -u would.
    await git(folder, ["-c", "push.autoSetupRemote=true", "push", "--quiet"], await sshVariables(folder));
}

/** The ssh of the player, as GIT_SSH_COMMAND, GIT_SSH or core.sshCommand say, else ssh that never asks for a passphrase. */
async function sshVariables(folder: string): Promise<NodeJS.ProcessEnv>
{
    if (process.env.GIT_SSH_COMMAND !== undefined || process.env.GIT_SSH !== undefined) {
        return {};
    }

    try {
        const own = (await git(folder, ["config", "--get", "core.sshCommand"])).trim();

        if (own !== "") {
            // Their command kept; BatchMode only where it is OpenSSH's.
            return { GIT_SSH_COMMAND: /(^|[\\/])ssh(\.exe)?"?(\s|$)/i.test(own) ? `${own} -o BatchMode=yes` : own };
        }
    } catch {
        // Unset: git says so with a failure.
    }

    return { GIT_SSH_COMMAND: "ssh -o BatchMode=yes" };
}

/** Stages every change under `folder`, `left` taken out, on the index `variables` name, or the repository's. */
async function stageFolder(folder: string, left: string[], variables: NodeJS.ProcessEnv = {}): Promise<void>
{
    await git(folder, ["add", "--all", "--", "."], variables);

    if (left.length > 0) {
        await git(folder, ["rm", "-r", "--cached", "--quiet", "--ignore-unmatch", "--", ...left], variables);
    }
}

async function hasCommits(folder: string): Promise<boolean>
{
    try {
        await git(folder, ["rev-parse", "--verify", "--quiet", "HEAD"]);
        return true;
    } catch {
        return false;
    }
}

// How long git may take before it is stopped: a push that waits on a network or on a question never answers.
const longest = 120_000;

// What a git that another git holds says: tried once more a moment later.
const heldByAnother = /index\.lock|cannot lock ref/i;

/** What git printed, or an error with what it said and how to fix it when it failed, could not start or took too long; once again when another git held it. */
async function git(folder: string, args: string[], variables: NodeJS.ProcessEnv = {}): Promise<string>
{
    try {
        return await gitOnce(folder, args, variables);
    } catch (error) {
        if (!(error instanceof Error) || !heldByAnother.test(error.message)) {
            throw error;
        }

        await new Promise((done) => setTimeout(done, 500));
        return gitOnce(folder, args, variables);
    }
}

function gitOnce(folder: string, args: string[], variables: NodeJS.ProcessEnv): Promise<string>
{
    return new Promise((done, fail) => {
        // core.askPass emptied too: an askpass is a program that asks.
        const child = spawn("git", ["-c", "core.askPass=", ...args], { cwd: folder, env: { ...quietEnvironment(), ...variables }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        let said = "";
        let settled = false;

        const settle = (work: () => void): void => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                work();
            }
        };

        // A git stopped answers at once: its hooks, ssh or the remote's helper may keep its pipes open long after.
        const timer = setTimeout(() => {
            stopTree(child.pid, "SIGKILL");
            child.stdout.destroy();
            child.stderr.destroy();
            settle(() => fail(new Error(`git ${args[0]} took longer than ${longest / 60_000} minutes and was stopped: look at the network, or at a hook of the repository that waits.`)));
        }, longest);
        child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString("utf8")));
        child.stderr.on("data", (chunk: Buffer) => (said += chunk.toString("utf8")));
        child.on("error", (error) => settle(() => fail(new Error(`git could not start (${error.message}): install git, or turn git off in the settings.`))));
        child.on("close", (code) => settle(() => (code === 0 ? done(out) : fail(new Error(gitFailure(said || out, args[0]))))));
    });
}

/** What git said when it failed, its errors and hints, with our own fix for the failures a player meets most. */
function gitFailure(said: string, command: string): string
{
    if (/please tell me who you are|author identity unknown/i.test(said)) {
        return 'git does not know who commits: run git config user.name "Your Name" and git config user.email "you@example.com" in the campaign\'s folder.';
    }

    if (/could not read (username|password)|cannot prompt|terminal prompts disabled|permission denied \(publickey|authentication failed/i.test(said)) {
        return "git has no credentials for the remote: run git push once from a terminal in the campaign's folder and sign in; then the engine pushes with what git keeps.";
    }

    if (/has no upstream branch/i.test(said)) {
        return "the branch has no upstream yet: run git push -u origin with the branch's name once in the campaign's folder.";
    }

    if (/no configured push destination|does not appear to be a git repository/i.test(said)) {
        return "the repository has no remote to push to: add one with git remote add origin and its address, or choose commit alone in the settings.";
    }

    const lines = said.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "");
    const told = lines.filter((line) => /^(fatal|error|hint):/i.test(line));
    return (told.length > 0 ? told : lines.slice(0, 6)).join(" ") || `git ${command} stopped`;
}

/** The environment of git: the one of this process, with every question it could ask turned into a failure. */
function quietEnvironment(): NodeJS.ProcessEnv
{
    return {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GCM_INTERACTIVE: "never",
        GIT_ASKPASS: "",
        SSH_ASKPASS: "",
    };
}
