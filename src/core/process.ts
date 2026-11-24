// The processes the engine starts: stopped with every process they started, their output read by lines.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";

// How long a child's output may stay open after it exited, held by a process it started, before what was heard is taken as all.
const outputWait = 2000;

/** A process that speaks by lines on its input and output. */
export interface LineProcess
{
    pid: number | undefined;
    /** Writes a line, adding its "\n"; nothing once its input is not writable. */
    write(line: string): void;
    /** Each line of its output. */
    onLine(listener: (line: string) => void): void;
    /** Told once: the error's message, the signal, or `exit code N`; never after stop(). */
    onEnd(listener: (reason: string) => void): void;
    /** Stops it with every process it started. */
    stop(): void;
}

/** Stops a process with every process it started: on Windows its tree; elsewhere its group, which a detached process leads, else the process alone. Never throws. */
export function stopTree(pid: number | undefined, signal: "SIGTERM" | "SIGKILL" = "SIGTERM"): void
{
    // A number read from a file may be anything: 0 and 1 would name, as a group, this process's own or every process; and never this process itself.
    if (pid === undefined || !Number.isInteger(pid) || pid <= 1 || pid === process.pid) {
        return;
    }

    if (process.platform === "win32") {
        try {
            spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        } catch {
            // taskkill could not run: nothing more to do.
        }

        return;
    }

    try {
        process.kill(-pid, signal);
    } catch {
        try {
            process.kill(pid, signal);
        } catch {
            // Gone already.
        }
    }
}

/** Calls `ended` once with a child's exit code: at its close, or two seconds after its exit where a process it started holds its output open. */
export function whenEnded(child: ChildProcess, ended: (code: number | null) => void): void
{
    let done = false;

    const end = (code: number | null): void => {
        if (done) {
            return;
        }

        done = true;
        child.stdout?.destroy();
        child.stderr?.destroy();
        ended(code);
    };

    child.on("close", end);
    // Unreferenced: an output held open keeps the process alive until then, and one closed needs no wait.
    child.on("exit", (code) => setTimeout(() => end(code), outputWait).unref());
}

/** Calls `onLine` with each line of a stream, whatever its line ends, and `onClose` when it ends. */
export function readLines(input: Readable, onLine: (line: string) => void, onClose?: () => void): void
{
    const lines = createInterface({ input, crlfDelay: Infinity });
    lines.on("line", onLine);

    if (onClose !== undefined) {
        lines.on("close", onClose);
    }
}

/** Starts a process that speaks by lines; its errors go to this process's stderr, and on POSIX it leads a group of its own, so stop() reaches what it started. */
export function startLineProcess(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; }): LineProcess
{
    const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ["pipe", "pipe", "inherit"], windowsHide: true, detached: process.platform !== "win32" });
    let endListener: ((reason: string) => void) | undefined;
    let endReason: string | undefined;
    let told = false;
    let stopped = false;

    const tell = (): void => {
        if (!told && !stopped && endReason !== undefined && endListener !== undefined) {
            told = true;
            endListener(endReason);
        }
    };

    const end = (reason: string): void => {
        endReason ??= reason;
        tell();
    };

    child.stdin.on("error", () => undefined);
    child.on("error", (error) => end(error.message));
    child.on("exit", (code, signal) => end(signal ?? `exit code ${String(code)}`));
    return {
        pid: child.pid,
        write: (line) => {
            if (child.stdin.writable) {
                child.stdin.write(`${line}\n`);
            }
        },
        onLine: (listener) => readLines(child.stdout, listener),
        onEnd: (listener) => {
            endListener = listener;
            tell();
        },
        stop: () => {
            stopped = true;
            stopTree(child.pid);
        },
    };
}
