// The script that places a window on Windows, run for real as the engine runs it, with a browser of the test's own (test/desktop/fake-browser.cs, compiled
// here): small windows that take no focus and close by themselves within seconds. Never a real browser, never a window of the player's.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { lookUntil } from "../src/core/wait.ts";
import { placeCommand, readPlaced, realSystem, type WindowKind, type WindowPlace, windowTitles } from "../src/desktop/index.ts";
import { makeTempFolder } from "./support.ts";

const onWindows = process.platform === "win32";
const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
const compiler = ["Framework64", "Framework"].map((folder) => join(systemRoot, "Microsoft.NET", folder, "v4.0.30319", "csc.exe")).find((path) => existsSync(path));
const address = "http://127.0.0.1:5750/";
let browser = "";

beforeAll(async () => {
    if (!onWindows) {
        return;
    }

    const folder = join(makeTempFolder(), "Fake Browser");
    mkdirSync(folder);
    browser = join(folder, "fake-browser.exe");
    const compiled = await run(compiler ?? "csc.exe", ["/nologo", "/target:winexe", `/out:${browser}`, join(import.meta.dirname, "desktop", "fake-browser.cs")]);
    expect(existsSync(browser), compiled).toBe(true);
}, 60_000);

describe.runIf(onWindows)("the window script on Windows, with a browser of the test's own", () => {
    it("compiles and runs, and says it opened a window it did not place where the browser shows none", async () => {
        expect(await place("launcher", ["--life=300"], 1500)).toBe("opened");
    }, 60_000);

    it("places the window with a title of ours, and leaves where it is one with another title that the browser shows first", async () => {
        const log = join(makeTempFolder(), "log.txt");
        const placed = await place("launcher", [`--log=${log}`, "--title=RPG Engine", "--delay=1200", "--other=200:Downloads", "--life=5000"]);
        const windows = await windowsIn(log);

        expect(placed).toEqual(expect.objectContaining({ width: expect.any(Number) }));
        expect(windows["RPG Engine"]).toEqual(placed);
        expect(windows.Downloads).not.toEqual(placed);
        expect(windows.Downloads?.width).toBeLessThan(500);
    }, 60_000);

    it("knows a window by its address while its page loads, and not by an address of another port that begins the same", async () => {
        const log = join(makeTempFolder(), "log.txt");
        const placed = await place("campaign", [`--log=${log}`, "--title=127.0.0.1:5750/", "--delay=1200", "--other=200:127.0.0.1:57501/", "--life=5000"]);
        const windows = await windowsIn(log);

        expect(windows["127.0.0.1:5750/"]).toEqual(placed);
        expect(windows["127.0.0.1:57501/"]).not.toEqual(placed);
    }, 60_000);

    it("places each window of two scripts started together, each its own", async () => {
        const logs = [join(makeTempFolder(), "launcher.txt"), join(makeTempFolder(), "campaign.txt")];
        const [launcher, campaign] = await Promise.all([
            place("launcher", [`--log=${logs[0]}`, "--title=RPG Engine", "--delay=600", "--life=7000"]),
            place("campaign", [`--log=${logs[1]}`, "--title=Rocca · RPG Engine", "--delay=600", "--life=7000"]),
        ]);

        expect((await windowsIn(logs[0] ?? ""))["RPG Engine"]).toEqual(launcher);
        expect((await windowsIn(logs[1] ?? ""))["Rocca · RPG Engine"]).toEqual(campaign);
        expect(launcher).not.toEqual(campaign);
    }, 60_000);
});

/** The engine's script run as the engine runs it, the fake browser in place of the browser, for a window of a kind at the address of a launcher. */
async function place(kind: WindowKind, args: string[], wait = 8000): Promise<WindowPlace | "opened" | undefined>
{
    const command = placeCommand(browser, args, kind, systemRoot, windowTitles(kind, address));
    const ran = await realSystem.run(command.file, command.args, { ...command.env, RPG_WINDOW_WAIT: String(wait) }, command.input);
    return readPlaced(ran.printed);
}

/** Where each window of the fake browser was at its end, by its title, as its log says once it closed. */
async function windowsIn(log: string): Promise<Record<string, WindowPlace>>
{
    const text = await lookUntil(async () => (existsSync(log) ? readFileSync(log, "utf8") : undefined), () => "", { within: 20_000, every: 100 });
    const windows: Record<string, WindowPlace> = {};

    for (const line of text.split("\n")) {
        const read = /^window (\d+)x(\d+) at (-?\d+),(-?\d+) (.*)$/.exec(line);

        if (read !== null) {
            windows[read[5] ?? ""] = { width: Number(read[1]), height: Number(read[2]), left: Number(read[3]), top: Number(read[4]) };
        }
    }

    return windows;
}

/** What a program printed, run hidden. */
function run(file: string, args: string[]): Promise<string>
{
    return new Promise((done) => {
        execFile(file, args, { windowsHide: true, timeout: 60_000 }, (error, printed, stderr) => done(`${String(printed)}${String(stderr)}${error === null ? "" : error.message}`));
    });
}
