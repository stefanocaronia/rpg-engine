// The launcher found where its place says it is, asked to quit, or started apart from this process: what `rpg open` and a campaign's table do to reach it.
import { homedir } from "node:os";
import { isRunning, startApart } from "../../core/process.ts";
import { type RefusalBody, refusalWords } from "../../core/refusal.ts";
import { lookUntil } from "../../core/wait.ts";
import { oneWindowAtATime, openWindow, type WindowOpener } from "../../desktop/index.ts";
import { askPage } from "../page/index.ts";
import { type LauncherPlace, readLauncher, removeLauncher } from "./place.ts";

/**
 * What asking the launcher at its place finds: the engine it runs; gone where nothing listens there any more; silent where it is there and does not answer;
 * starting where it is still looking for one started beside it, which it may give way to.
 */
export type LauncherProbed = { version: string; } | "gone" | "silent" | "starting";

/** A launcher at its place: the engine it answered with; none where it is there and does not answer, or is starting. */
export type LauncherThere = LauncherPlace & { answered?: string; starting?: true; };

/** What reaching the launcher does outside this process: start it apart, ask it, wait; the tests give their own. */
export interface LauncherStarter
{
    start?: () => void;
    probe?: (place: LauncherPlace) => Promise<LauncherProbed>;
    quit?: (place: LauncherPlace) => Promise<void>;
    now?: () => number;
    wait?: (milliseconds: number) => Promise<void>;
}

// A launcher answers within ten seconds of its start, one of another engine quitting first, looked for every tenth of a second; a probe waits a second.
const startWait = 10_000;
const every = 100;

/**
 * The launcher at its place, of any engine, and whether it answered; undefined where there is none, or where nothing listens there any more, its stale place
 * taken away then. One that is slow, answers wrong or is starting keeps its place: it is there.
 */
export async function findLauncher(home: string, probe: (place: LauncherPlace) => Promise<LauncherProbed> = probeLauncher): Promise<LauncherThere | undefined>
{
    const place = readLauncher(home);

    if (place === undefined) {
        return undefined;
    }

    const probed = await probe(place);

    if (probed === "gone") {
        removeLauncher(home, place.token);
        return undefined;
    }

    return probed === "silent" ? place : probed === "starting" ? { ...place, starting: true } : { ...place, answered: probed.version };
}

/**
 * The link of the launcher of this engine, started apart first where none is there; one of another engine is asked to quit first, with its place's token;
 * one starting is asked again until it answers. A refusal, in words with their code and values, where none answers within ten seconds, or where one is
 * there and does not answer: never a second one beside it.
 */
export async function reachLauncher(home: string, version: string, starter: LauncherStarter = {}): Promise<{ url: string; } | RefusalBody>
{
    const asked = new Set<string>();
    let started = false;
    let there: LauncherThere | undefined;

    const look = async (): Promise<{ url: string; } | undefined> => {
        there = await findLauncher(home, starter.probe ?? probeLauncher);

        if (there?.answered === version) {
            return { url: there.url };
        }

        if (there?.answered !== undefined && !asked.has(there.token)) {
            asked.add(there.token);
            await (starter.quit ?? askToQuit)(there);
        } else if (there === undefined && !started) {
            started = true;
            (starter.start ?? startLauncher)();
        }

        return undefined;
    };

    return lookUntil(look, () => notReached(there), { within: startWait, every, now: starter.now, wait: starter.wait });
}

/**
 * The way from a campaign's page back to the launcher, for its table: the launcher's link where one answers, the launcher reached, and its page opened in an
 * application window of its own, one at a time.
 */
export function launcherWay(
    home: string,
    version: string,
    opener: WindowOpener = async (url, kind) => (await openWindow(url, kind, process.platform)).opened === "window",
): { find(): Promise<{ url: string; } | undefined>; reach(): Promise<{ url: string; } | RefusalBody>; open(url: string): Promise<boolean>; }
{
    const open = oneWindowAtATime(opener);
    return {
        find: async () => {
            const there = await findLauncher(home);
            return there?.answered === undefined ? undefined : { url: there.url };
        },
        reach: () => reachLauncher(home, version),
        open: (url) => open(url, "launcher"),
    };
}

/**
 * Asks the launcher at a place which engine it runs, at an address that reads no disk: gone where its process ended or nothing listens there; starting
 * where it answers 503, as it does until it keeps its place; silent where it does not answer within a second, or not as a launcher.
 */
export async function probeLauncher(place: LauncherPlace): Promise<LauncherProbed>
{
    if (!isRunning(place.pid)) {
        return "gone";
    }

    const answer = await askPage(place.url, "GET", "/api/ping");

    if (answer === "refused") {
        return "gone";
    }

    if (answer?.status === 503) {
        return "starting";
    }

    const read = answer?.status === 200 ? parsed(answer.body) as { launcher?: unknown; version?: unknown; } | undefined : undefined;
    return read?.launcher === true && typeof read.version === "string" ? { version: read.version } : "silent";
}

/** Asks the launcher at a place to quit, with its token, as its own page would. */
export async function askToQuit(place: LauncherPlace): Promise<void>
{
    await askPage(place.url, "POST", "/api/launcher", { quit: { token: place.token } });
}

/** Starts `rpg launcher` apart from this process, in the player's home: the same Node and script as this one. */
export function startLauncher(): void
{
    startApart(process.execPath, [...process.execArgv, process.argv[1] ?? "", "launcher"], { cwd: homedir() });
}

/** Why the launcher was not reached in time, by what was last found at its place: in words, with their code and values. */
function notReached(there: LauncherThere | undefined): RefusalBody
{
    if (there === undefined) {
        return refusalWords("RPG Engine's launcher did not start within ten seconds: run rpg launcher in a terminal to see why.", "launcher-not-started", { seconds: String(startWait / 1000) });
    }

    const at = { url: there.url, pid: String(there.pid) };
    return there.answered === undefined
        ? refusalWords(`RPG Engine's launcher, at ${there.url}, is there but does not answer: end its process, ${there.pid}, then try again.`, "launcher-silent", at)
        : refusalWords(`The launcher of RPG Engine ${there.answered}, at ${there.url}, did not quit: end its process, ${there.pid}, then try again.`, "launcher-not-quit", { version: there.answered, ...at });
}

function parsed(text: string): unknown
{
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return undefined;
    }
}
