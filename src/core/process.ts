// The processes the engine starts: stopped with every process they started, their output read by lines.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";

// How long a child's output may stay open after it exited, held by a process it started, before what was heard is taken as all.
const outputWait = 2000;
// How long a process stopped off Windows has to end at SIGTERM before it is killed.
const killAfter = 3000;

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
    /** Stops it with every process it started; nothing once it exited. */
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

/**
 * Starts a process that speaks by lines; on POSIX it leads a group of its own, so stop() reaches what it started. Its errors go to this process's stderr, or
 * by lines to `errors` when given; its end is then told once they are all read, or two seconds after its exit where a process it started holds them open.
 */
export function startLineProcess(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; errors?: (line: string) => void; }): LineProcess
{
    const errors = options.errors;
    const given = { cwd: options.cwd, env: options.env, windowsHide: true, detached: process.platform !== "win32" };
    const child = errors === undefined ? spawn(command, args, { ...given, stdio: ["pipe", "pipe", "inherit"] }) : spawn(command, args, { ...given, stdio: ["pipe", "pipe", "pipe"] });
    let endListener: ((reason: string) => void) | undefined;
    let endReason: string | undefined;
    let told = false;
    let stopped = false;
    // Once its exit was seen its pid may be another program's: never stopped then.
    let exited = false;
    let killing: NodeJS.Timeout | undefined;
    let errorsRead = errors === undefined;
    let afterErrors: (() => void) | undefined;

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

    const exit = (reason: string): void => {
        exited = true;
        clearTimeout(killing);

        if (errorsRead) {
            end(reason);
            return;
        }

        const timer = setTimeout(() => end(reason), outputWait).unref();

        afterErrors = () => {
            clearTimeout(timer);
            end(reason);
        };
    };

    if (errors !== undefined && child.stderr !== null) {
        readLines(child.stderr, errors, () => {
            errorsRead = true;
            afterErrors?.();
        });
    }

    child.stdin.on("error", () => undefined);
    child.on("error", (error) => end(error.message));
    child.on("exit", (code, signal) => exit(signal ?? `exit code ${String(code)}`));
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

            if (exited) {
                return;
            }

            stopTree(child.pid);

            // Off Windows, a process that does not end at SIGTERM is killed a while after.
            if (process.platform !== "win32") {
                killing ??= setTimeout(() => {
                    if (!exited) {
                        stopTree(child.pid, "SIGKILL");
                    }
                }, killAfter).unref();
            }
        },
    };
}
