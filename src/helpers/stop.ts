// A maker of pictures run through the shell, stopped whole when its time runs out: on Windows the shell's child lives on after the shell, so its tree goes; and
// taken as ended once it exited, even where a process it started holds its output open.
import { type ChildProcess, spawnSync } from "node:child_process";

/** Stops a process of another's, by its number, with every process it started: on Windows its tree, elsewhere its group, as a detached process leads one. */
export function stopProcess(pid: number): void
{
    if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
        return;
    }

    try {
        process.kill(-pid, "SIGTERM");
    } catch {
        try {
            process.kill(pid, "SIGTERM");
        } catch {
            // Gone already.
        }
    }
}

// How long a child's output may stay open after it exited, held by a process it started, before what was heard is taken as all.
const outputWait = 2000;

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

/** Stops a process and, on Windows, every process it started. */
export function stopTree(child: ChildProcess): void
{
    if (process.platform === "win32" && child.pid !== undefined) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
        return;
    }

    child.kill();
}
