import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { childrenEnded, type Ending, endingOf, guardProcess, type LineProcess, startLineProcess, stopGently, stopTree, whenEnded } from "../src/core/process.ts";

// spawnSync watched, as taskkill runs through it on Windows; everything else as it is.
vi.mock("node:child_process", async (original) => {
    const real = await original<typeof import("node:child_process")>();
    return { ...real, spawnSync: vi.fn(real.spawnSync) };
});

// Every process a test started, stopped after it whatever happened.
const started: (number | undefined)[] = [];

afterEach(() => {
    started.splice(0).filter(isAlive).forEach((pid) => stopTree(pid, "SIGKILL"));
});

describe("process", () => {
    it("tells whole lines, split across writes and ended by \\r\\n", async () => {
        const child = node("process.stdout.write('hel'); setTimeout(() => process.stdout.write('lo\\r\\nwor'), 50); setTimeout(() => process.stdout.write('ld\\r\\n'), 100);");
        const lines: string[] = [];
        child.onLine((line) => lines.push(line));
        await until(() => lines.length === 2);
        expect(lines).toEqual(["hello", "world"]);
    }, 15_000);

    it("tells a line of megabytes whole, as Codex writes a picture it painted, and the line after it", async () => {
        const child = node("process.stdout.write(JSON.stringify({ result: 'A'.repeat(4_000_000) }) + '\\n' + 'after\\n');");
        const lines: string[] = [];
        child.onLine((line) => lines.push(line));
        await until(() => lines.length === 2);
        expect(lines.map((line) => line.length)).toEqual([4_000_013, 5]);
        expect((JSON.parse(lines[0]) as { result: string; }).result).toHaveLength(4_000_000);
    }, 15_000);

    it("writes lines to the process", async () => {
        const child = node("require('node:readline').createInterface({ input: process.stdin }).on('line', (line) => console.log('heard ' + line));");
        const lines: string[] = [];
        child.onLine((line) => lines.push(line));
        child.write("one");
        child.write("two");
        await until(() => lines.length === 2);
        expect(lines).toEqual(["heard one", "heard two"]);
    }, 15_000);

    it("closes its input, which a program reading it to the end takes for the end of its work, and writes nothing after", async () => {
        const child = node("process.stdin.on('data', () => undefined); process.stdin.on('end', () => { console.log('input closed'); process.exit(4); });");
        const lines: string[] = [];
        const ends: string[] = [];
        child.onLine((line) => lines.push(line));
        child.onEnd((reason) => ends.push(reason));
        child.closeInput();
        child.write("too late");
        child.closeInput();
        await until(() => ends.length > 0);
        expect(lines).toEqual(["input closed"]);
        expect(ends).toEqual(["exit code 4"]);
    }, 15_000);

    it("waits until the processes it started ended, at most as long as asked, says whether none runs, and logs how, with the time and those still at work", async () => {
        // What the tests before left ends first.
        await childrenEnded("the test", 10_000, () => undefined, { every: 10 });
        const script = join(mkdtempSync(join(tmpdir(), "rpg-process-")), "program.cjs");
        writeFileSync(script, "setTimeout(() => process.exit(0), 500);");
        const child = startLineProcess(process.execPath, [script], { cwd: tmpdir(), env: process.env });
        started.push(child.pid);
        const ends: string[] = [];
        const lines: string[] = [];
        child.onEnd((reason) => ends.push(reason));
        expect(await childrenEnded("the table", 100, (line) => lines.push(line), { every: 10 })).toBe(false);
        expect(lines).toEqual([`${lines[0]?.slice(0, 24)} The exit of the table stops 1 program it started, still at work after 100 ms: ${basename(process.execPath)} ${script} (process ${child.pid}).`]);
        expect(lines[0]).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z /);

        expect(await childrenEnded("the table", 10_000, (line) => lines.push(line), { every: 10 })).toBe(true);
        expect(lines[1]).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z The programs the table started ended by themselves in \d+ ms\.$/);
        expect(ends).toEqual(["exit code 0"]);
    }, 15_000);

    it("on an exception nobody caught cleans up, lets a program it started end by itself, as one saving once its input closed, then exits with 1", async () => {
        await childrenEnded("the test", 10_000, () => undefined, { every: 10 });
        const saved = join(mkdtempSync(join(tmpdir(), "rpg-process-")), "saved.txt");
        const child = node(`process.stdin.on('data', () => undefined); process.stdin.on('end', () => setTimeout(() => { require('node:fs').writeFileSync(${JSON.stringify(saved)}, 'saved'); process.exit(0); }, 500)); console.log('ready');`);
        const lines: string[] = [];
        child.onLine((line) => lines.push(line));
        await until(() => lines.length > 0);
        const logged: string[] = [];
        const exits: number[] = [];
        const before = process.listeners("uncaughtException");

        // A cleanup that fails after closing the program's input: logged, and the wait and the exit still come.
        const cleanup = (): void => {
            child.closeInput();
            throw new Error("cleanup broken");
        };

        const unguard = guardProcess("rpg table", "the table", (line) => logged.push(line), cleanup, (code) => exits.push(code), 10_000);

        try {
            const thrown = process.listeners("uncaughtException").find((one) => !before.includes(one));
            thrown?.(new Error("broken"), "uncaughtException");
            expect(exits).toEqual([]);
            await until(() => exits.length > 0);
            expect(exits).toEqual([1]);
            expect(readFileSync(saved, "utf8")).toBe("saved");
            expect(logged[0]).toContain("rpg table: an error nobody caught; the table ends. Error: broken");
            expect(logged[1]).toContain("rpg table: the table could not clean up after the error. Error: cleanup broken");
            expect(logged[2]).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z The programs the table started ended by themselves in \d+ ms\.$/);
            expect(Number(/in (\d+) ms/.exec(logged[2] ?? "")?.[1])).toBeGreaterThanOrEqual(400);
        } finally {
            unguard();
        }
    }, 15_000);

    it("tells its end once, with the exit code", async () => {
        const child = node("process.exit(3);");
        const ends: string[] = [];
        child.onEnd((reason) => ends.push(reason));
        await until(() => ends.length > 0);
        await pause(300);
        expect(ends).toEqual(["exit code 3"]);
    }, 15_000);

    it("tells no end after stop", async () => {
        const child = node("setInterval(() => undefined, 1000);");
        const ends: string[] = [];
        child.onEnd((reason) => ends.push(reason));
        await pause(200);
        child.stop();
        await until(() => !isAlive(child.pid));
        await pause(300);
        expect(ends).toEqual([]);
    }, 15_000);

    it("stops nothing once its exit was seen: its pid may be another program's by then", async () => {
        const child = node("process.exit(3);");
        const ends: string[] = [];
        child.onEnd((reason) => ends.push(reason));
        await until(() => ends.length > 0);
        vi.mocked(spawnSync).mockClear();
        const killed = vi.spyOn(process, "kill");

        try {
            child.stop();
            expect(vi.mocked(spawnSync)).not.toHaveBeenCalled();
            expect(killed).not.toHaveBeenCalled();
        } finally {
            killed.mockRestore();
        }
    }, 15_000);

    it.skipIf(process.platform === "win32")("kills a process that does not end at SIGTERM a few seconds after", async () => {
        const child = node("process.on('SIGTERM', () => undefined); console.log('ready'); setInterval(() => undefined, 1000);");
        const lines: string[] = [];
        child.onLine((line) => lines.push(line));
        await until(() => lines.length > 0);
        child.stop();
        await pause(1000);
        expect(isAlive(child.pid)).toBe(true);
        await until(() => !isAlive(child.pid));
    }, 15_000);

    it("reads its errors by lines when asked, and tells its end once they are read", async () => {
        const errors: string[] = [];
        const child = startLineProcess(process.execPath, ["-e", "process.stderr.write('first\\nsecond\\n', () => process.exit(1));"], { cwd: tmpdir(), env: process.env, errors: (line) => errors.push(line) });
        started.push(child.pid);
        const ends: string[] = [];
        child.onEnd((reason) => ends.push(`${reason} after ${errors.length}`));
        await until(() => ends.length > 0);
        expect(errors).toEqual(["first", "second"]);
        expect(ends).toEqual(["exit code 1 after 2"]);
    }, 15_000);

    it("tells an end that came before its listener as soon as the listener is set", async () => {
        const child = node("process.exit(0);");
        await until(() => !isAlive(child.pid));
        await pause(300);
        const ends: string[] = [];
        child.onEnd((reason) => ends.push(reason));
        expect(ends).toEqual(["exit code 0"]);
    }, 15_000);

    it("ends a program that does not exist with a reason, and throws nothing", async () => {
        const child = startLineProcess("rpg-engine-no-such-program", [], { cwd: tmpdir(), env: process.env });
        started.push(child.pid);
        const ends: string[] = [];
        child.onEnd((reason) => ends.push(reason));
        await until(() => ends.length > 0);
        expect(ends[0]).not.toBe("");
    }, 15_000);

    it("stops a process with the process it started", async () => {
        const script = "const grandchild = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => undefined, 1000)'], { stdio: 'ignore' }); console.log(grandchild.pid); setInterval(() => undefined, 1000);";
        const child = spawn(process.execPath, ["-e", script], { cwd: tmpdir(), stdio: ["ignore", "pipe", "ignore"], windowsHide: true, detached: process.platform !== "win32" });
        started.push(child.pid);
        let said = "";
        child.stdout.setEncoding("utf8").on("data", (chunk: string) => (said += chunk));
        await until(() => said.includes("\n"));
        const grandchild = Number(said.trim());
        started.push(grandchild);
        expect(isAlive(grandchild)).toBe(true);
        stopTree(child.pid);
        await until(() => !isAlive(child.pid) && !isAlive(grandchild));
    }, 15_000);

    it("stops nothing, and throws nothing, without a process", async () => {
        const child = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore", windowsHide: true });
        await new Promise((done) => child.on("exit", done));
        await until(() => !isAlive(child.pid));
        expect(() => stopTree(undefined)).not.toThrow();
        expect(() => stopTree(child.pid)).not.toThrow();
        expect(() => stopTree(child.pid, "SIGKILL")).not.toThrow();
    }, 15_000);

    it("never stops this process, its group or every process, whatever number it is given", () => {
        for (const pid of [process.pid, 0, 1, -1, -process.pid, Number.NaN, 1.5]) {
            expect(() => stopTree(pid, "SIGKILL")).not.toThrow();
        }

        // Still here: the test's own process was not stopped.
        expect(isAlive(process.pid)).toBe(true);
    });

    it("tells a child's end once, with its exit code", async () => {
        const child = spawn(process.execPath, ["-e", "process.exit(2)"], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
        const codes: (number | null)[] = [];
        whenEnded(child, (code) => codes.push(code));
        await until(() => codes.length > 0);
        await pause(300);
        expect(codes).toEqual([2]);
    }, 15_000);
});

describe("a program ended gently (T-301)", () => {
    /** A program that ends `after` ms of the clock once asked, or never; what was done to it, and the patience with the clock and the signals. */
    function fakeProgram(after: number | undefined): { program: Ending; done: string[]; patience: { now: () => number; pause: (ms: number) => Promise<void>; signal: (pid: number | undefined, signal: string) => void; }; }
    {
        let clock = 0;
        let askedAt: number | undefined;
        const done: string[] = [];
        const program: Ending = {
            pid: 4242,
            ended: () => askedAt !== undefined && after !== undefined && clock >= askedAt + after,
            closeInput: () => {
                done.push("input closed");
                askedAt ??= clock;
            },
        };
        const patience = {
            now: () => clock,
            pause: (ms: number) => {
                clock += ms;
                return Promise.resolve();
            },
            signal: (pid: number | undefined, signal: string) => done.push(`${signal} to ${String(pid)} at ${String(clock)}`),
        };
        return { program, done, patience };
    }

    it("closes its input and, off Windows, sends SIGTERM: one that ends within the wait is never killed", async () => {
        const { program, done, patience } = fakeProgram(1200);
        expect(await stopGently(program, { ...patience, platform: "linux" })).toBe(true);
        expect(done).toEqual(["input closed", "SIGTERM to 4242 at 0"]);
    });

    it("on Windows only closes its input, as no signal asks a program there, and waits", async () => {
        const { program, done, patience } = fakeProgram(2900);
        expect(await stopGently(program, { ...patience, platform: "win32" })).toBe(true);
        expect(done).toEqual(["input closed"]);
    });

    it("stops one still there after the wait, with all it started, and only then", async () => {
        const { program, done, patience } = fakeProgram(undefined);
        expect(await stopGently(program, { ...patience, platform: "win32", wait: 5000 })).toBe(false);
        expect(done).toEqual(["input closed", "SIGKILL to 4242 at 5000"]);
    });

    it("does nothing to one that ended already", async () => {
        const { program, done, patience } = fakeProgram(0);
        program.closeInput?.();
        done.length = 0;
        expect(await stopGently(program, { ...patience, platform: "linux" })).toBe(true);
        expect(done).toEqual([]);
    });

    it("lets a real program that reads its input until it ends finish by itself, never stopped", async () => {
        const script = `process.stdin.resume(); process.stdin.on('end', () => setTimeout(() => process.exit(0), 300)); console.log('ready');`;
        const child = spawn(process.execPath, ["-e", script], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
        started.push(child.pid);
        await new Promise((ready) => child.stdout.once("data", ready));
        const signals: string[] = [];

        // SIGTERM is let through, as a program asked to end; a SIGKILL would be the force.
        const signal = (pid: number | undefined, sent: "SIGTERM" | "SIGKILL"): void => {
            signals.push(sent);

            if (sent === "SIGTERM" && process.platform !== "win32") {
                stopTree(pid, sent);
            }
        };

        expect(await stopGently(endingOf(child), { signal, wait: 5000 })).toBe(true);
        expect(signals).not.toContain("SIGKILL");
    }, 15_000);

    it("asks the programs still at work to end when an error nobody caught ends the process", async () => {
        const script = `process.stdin.resume(); process.stdin.on('end', () => process.exit(0)); console.log('ready');`;
        const child = spawn(process.execPath, ["-e", script], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
        started.push(child.pid);
        endingOf(child);
        await new Promise((ready) => child.stdout.once("data", ready));
        const ended = new Promise<string>((done) => child.once("exit", (code, signal) => done(signal ?? String(code))));
        const logged: string[] = [];
        const exits: number[] = [];
        const before = process.listeners("uncaughtException");
        const unguard = guardProcess("rpg table", "the table", (line) => logged.push(line), () => undefined, (code) => exits.push(code), 10_000);

        try {
            const thrown = process.listeners("uncaughtException").find((one) => !before.includes(one));
            thrown?.(new Error("broken"), "uncaughtException");
            // Its input closed; off Windows SIGTERM too, which may come first.
            expect(await ended).toMatch(/^(0|SIGTERM)$/);
            await until(() => exits.length > 0);
            expect(logged[1]).toMatch(/The programs the table started ended by themselves/);
        } finally {
            unguard();
        }
    }, 15_000);
});

/** A node process running a script, stopped after the test. */
function node(script: string): LineProcess
{
    const child = startLineProcess(process.execPath, ["-e", script], { cwd: tmpdir(), env: process.env });
    started.push(child.pid);
    return child;
}

/** Waits until `done` holds, looking every 50 ms; fails after ten seconds. */
async function until(done: () => boolean): Promise<void>
{
    for (let waited = 0; waited < 10_000; waited += 50) {
        if (done()) {
            return;
        }

        await pause(50);
    }

    throw new Error("waited ten seconds in vain");
}

function pause(ms: number): Promise<void>
{
    return new Promise((done) => setTimeout(done, ms));
}

/** Whether a process is running. */
function isAlive(pid: number | undefined): boolean
{
    if (pid === undefined) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}
