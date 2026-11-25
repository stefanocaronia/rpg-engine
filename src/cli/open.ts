// `rpg open` and `rpg icon`: the launcher's page in a window of its own, the launcher started first where none of this engine answers; and the icon that
// does the same with a double click.
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { userDataFolder } from "../core/context.ts";
import { getVersion } from "../core/version.ts";
import { type BrowserOpened, type IconPlaces, openInBrowser } from "../desktop/index.ts";
import { reachLauncher } from "../server/launcher/index.ts";
import { iconsMade, iconsRemoved, offerIcon, type Terminal } from "./icon.ts";

/** What `rpg open` and `rpg icon` take from outside: this computer's folders and system, how the launcher is reached and its page opened; the tests give their own. */
export interface OpenWhere
{
    home: string;
    userHome: string;
    platform: string;
    version: string;
    reach?: () => Promise<{ url: string; } | { error: string; }>;
    browser?: (url: string) => Promise<BrowserOpened>;
    terminal?: Terminal;
    places?: IconPlaces;
    now?: () => Date;
}

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
 * link for a terminal where no browser started. In a terminal, it asks once a machine about the icon. A failure is also written to open.log in the data
 * folder, the last one alone, for the icon, which has no console.
 */
export async function runOpen(args: string[], where: OpenWhere = thisComputer()): Promise<Said>
{
    if (args.length > 0) {
        return { output: `rpg open takes no options: ${args.join(" ")}.`, exitCode: 1 };
    }

    const reached = await (where.reach ?? (() => reachLauncher(where.home, where.version)))();

    if ("error" in reached) {
        noteFailure(where, reached.error);
        return { output: reached.error, exitCode: 1 };
    }

    const opened = await (where.browser ?? (async (url: string) => (await openInBrowser(url, "launcher", where.platform)).opened))(reached.url);
    const line = opened === "window"
        ? `RPG Engine's campaigns are open in a window: ${reached.url}`
        : opened === "tab"
        ? `RPG Engine's campaigns are open in your browser: ${reached.url}`
        : `RPG Engine's campaigns are at ${reached.url}: open that link in your browser.`;
    const icon = await offerIcon(where, where.terminal);
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
