// A maker of pictures run through the shell, stopped whole when its time runs out: on Windows the shell's child lives on after the shell, so its tree goes.
import { type ChildProcess, spawnSync } from "node:child_process";

/** Stops a process and, on Windows, every process it started. */
export function stopTree(child: ChildProcess): void
{
    if (process.platform === "win32" && child.pid !== undefined) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
        return;
    }

    child.kill();
}
