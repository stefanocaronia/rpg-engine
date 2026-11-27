// `rpg open` and `rpg icon`: the launcher's page in a window of its own, the launcher started first where none of this engine answers; and the icon that
// does the same with a double click.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { userDataFolder } from "../core/context.ts";
import { getVersion } from "../core/version.ts";
import { type BrowserOpened, type IconPlaces, openInBrowser } from "../desktop/index.ts";
import { reachLauncher, serveWaitingPage, type WaitingPage } from "../server/launcher/index.ts";
import { iconOnFirstRun, iconsMade, iconsRemoved, type Terminal } from "./icon.ts";

/** What `rpg open` and `rpg icon` take from outside: this computer's folders and system, how the launcher is reached and its page opened; the tests give their own. */
export interface OpenWhere
{
    home: string;
    userHome: string;
    platform: string;
    version: string;
    reach?: () => Promise<{ url: string; } | { error: string; }>;
    browser?: (url: string) => Promise<BrowserOpened>;
    /** The page the window shows while the launcher is reached. */
    waiting?: () => Promise<WaitingPage>;
    terminal?: Terminal;
    places?: IconPlaces;
    now?: () => Date;
}

// An opening holds for half a minute at most: the launcher's ten seconds to start, the window's eight to come, and room to spare.
const openingFor = 30_000;

/** What a word of the command line says, and its exit code. */
export interface Said
{
    output: string;
    exitCode: number;
}

/** Where a command line writes: its output and its errors. */
export interface Streams
{
    out: NodeJS.WritableStream;
    err: NodeJS.WritableStream;
}

/**
 * `rpg open`: the launcher reached, started apart where none of this engine answers, then its page opened in a window; what happened in one line, with the
 * link for a terminal where no browser started. The first time in a terminal of a machine, it puts the icon there. A failure is also written to open.log in the data
 * folder, the last one alone, for the icon, which has no console.
 */
export async function runOpen(args: string[], where: OpenWhere = thisComputer()): Promise<Said>
{
    if (args.length > 0) {
        return { output: `rpg open takes no options: ${args.join(" ")}.`, exitCode: 1 };
    }

    const done = holdOpening(where);

    if (done === undefined) {
        return { output: "RPG Engine is opening already: its window comes in a moment.", exitCode: 0 };
    }

    try {
        return await openLauncherPage(where, done);
    } finally {
        done();
    }
}

// The window opens at once on the page of the wait, while the launcher is reached, and goes to it then: where that page cannot be served, it opens once the
// launcher is there.
async function openLauncherPage(where: OpenWhere, opened: () => void): Promise<Said>
{
    const browser = where.browser ?? (async (url: string) => (await openInBrowser(url, "launcher", where.platform)).opened);
    const waiting = await (where.waiting ?? serveWaitingPage)().catch(() => undefined);
    const opening = waiting === undefined ? undefined : browser(waiting.url);
    const reached = await (where.reach ?? (() => reachLauncher(where.home, where.version)))();
    waiting?.reached(reached);

    if ("error" in reached) {
        noteFailure(where, reached.error);
    }

    const shown = opening === undefined ? "error" in reached ? "none" : await browser(reached.url) : await opening;

    // The window takes what it waited for before this process ends with the page's server.
    if (waiting !== undefined && shown !== "none") {
        await waiting.ended;
    }

    // The window is there: another click opens again, whatever this process still does.
    opened();

    if ("error" in reached) {
        return { output: reached.error, exitCode: 1 };
    }

    const line = shown === "window"
        ? `RPG Engine's campaigns are open in a window: ${reached.url}`
        : shown === "tab"
        ? `RPG Engine's campaigns are open in your browser: ${reached.url}`
        : `RPG Engine's campaigns are at ${reached.url}: open that link in your browser.`;
    const icon = await iconOnFirstRun(where, where.terminal).catch(() => undefined);
    return { output: icon === undefined ? line : `${line}\n${icon}`, exitCode: 0 };
}

/** `rpg icon`, which puts the icon on the desktop and in the menu, and `rpg icon --remove`, which takes it away: the files, or why not. */
export async function runIcon(args: string[], where: OpenWhere = thisComputer()): Promise<Said>
{
    if (args.length === 1 && args[0] === "--remove") {
        return { output: iconsRemoved(where), exitCode: 0 };
    }

    if (args.length > 0) {
        return { output: `rpg icon takes only --remove, which takes the icon away: not ${args.join(" ")}.`, exitCode: 1 };
    }

    const made = await iconsMade(where);
    return { output: made.said, exitCode: made.failed ? 1 : 0 };
}

/**
 * Writes what `rpg open` or `rpg icon` said, to the output or, for a failure, the errors, then ends the process with its exit code once it is out: the icon
 * runs it in a console nobody reads or closes, where anything left open would keep it alive. There the write may never say it is done: the process ends
 * anyway `wait` ms later.
 */
export function sayAndEnd(said: Said, streams: Streams = { out: process.stdout, err: process.stderr }, exit: (code: number) => void = process.exit, wait = 500): void
{
    let ended = false;

    const end = (): void => {
        if (!ended) {
            ended = true;
            exit(said.exitCode);
        }
    };

    setTimeout(end, wait);
    (said.exitCode === 0 ? streams.out : streams.err).write(`${said.output}\n`, end);
}

function thisComputer(): OpenWhere
{
    return { home: userDataFolder(), userHome: homedir(), platform: process.platform, version: getVersion() };
}

/**
 * One `rpg open` at a time: its mark written in the data folder, and what takes it away; none where another one, still running, wrote its own within the
 * last half minute, as for clicks on the icon while the first waits for its window, which would open a window each.
 */
function holdOpening(where: OpenWhere): (() => void) | undefined
{
    const file = join(where.home, "opening");
    const now = (where.now ?? (() => new Date()))().getTime();
    const own = `${String(process.pid)} ${String(now)}`;

    try {
        mkdirSync(where.home, { recursive: true });
        const [pid, time] = readFileSync(file, "utf8").split(" ").map(Number);

        if (pid !== undefined && time !== undefined && now - time < openingFor && running(pid)) {
            return undefined;
        }

        rmSync(file, { force: true });
    } catch {
        // No mark, or one that does not read: none holds the opening.
    }

    try {
        // Written only where none is there: of two started in the same instant, one opens.
        writeFileSync(file, own, { flag: "wx" });
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EEXIST" ? undefined : () => undefined;
    }

    // Only its own mark: once taken away, another `rpg open` may have written its own.
    let taken = false;

    return () => {
        try {
            if (!taken && readFileSync(file, "utf8") === own) {
                rmSync(file, { force: true });
            }
        } catch {
            // Gone already.
        }

        taken = true;
    };
}

function running(pid: number): boolean
{
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM";
    }
}

// Where nobody reads a console, as for the icon: why the launcher did not open, in the data folder, the last time alone.
function noteFailure(where: OpenWhere, message: string): void
{
    try {
        mkdirSync(where.home, { recursive: true });
        writeFileSync(join(where.home, "open.log"), `${(where.now ?? (() => new Date()))().toISOString()} ${message}\n`);
    } catch {
        // A data folder that cannot be written has no other place for it.
    }
}
