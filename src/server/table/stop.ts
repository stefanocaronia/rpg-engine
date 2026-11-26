// `rpg table --stop`: asks the table of a campaign to end, with the token of its place, and waits until it ended, its place gone and its process with it. It
// never stops the table from outside, which would cut short the AI apps it started, as one saving the player's sign-in.
import { findCampaign } from "../../campaign/index.ts";
import { userDataFolder } from "../../core/context.ts";
import { isRunning } from "../../core/process.ts";
import { getVersion } from "../../core/version.ts";
import { lookUntil } from "../../core/wait.ts";
import { askTableToEnd } from "./hello.ts";
import { readPlace, removePlace } from "./place.ts";

/** How long a table that ends waits for its chat's turn to stop: a little more than the master's own wait (10 s), after which the master ends the chat. */
export const turnStopWait = 12_000;

/**
 * How long the table and the launcher, once ended, wait for the programs they started to end by themselves, before their exit stops them: the longest ask
 * of a host's models (20 s) and the grace after it (10 s), and a little more. A chat let go ends sooner: it is stopped when its own grace of 10 s is over.
 */
export const programsWait = 35_000;

/** How the table of a campaign asked to end went: it ended, there was none, it did not answer, or it was still there once the wait was over. */
export type TableStop = "ended" | "none" | "silent" | "late";

export interface StopOptions
{
    /** The engine's data folder on this computer, where the table's place is. */
    home: string;
    version: string;
    /** How long the table may take to end, and how often to look, in ms. */
    within?: number;
    every?: number;
    /** How long it may take to answer the knock, and as long the stop, in ms. */
    wait?: number;
    /** Whether a process still runs; the tests give their own, as their table runs in their own process. */
    running?: (pid: number) => boolean;
    now?: () => number;
}

// Longer than a table's end may take: its chat's turn stopped, then the programs it started ended.
const stopWait = 60_000;
const stopEvery = 200;
const answerWait = 2000;

/**
 * Asks the table of the campaign at `root` to end, and waits for it: "ended" once its place is gone and its process with it; "none" where there is no place,
 * or nothing listens at it, the place taken away then; "silent" where the table does not say it ends, and its place stays; "late" where it is still there
 * once the wait is over.
 * The table's process, where one was asked.
 */
export async function stopTable(root: string, options: StopOptions): Promise<{ stop: TableStop; pid?: number; }>
{
    const place = readPlace(options.home, root);

    if (place === undefined) {
        return { stop: "none" };
    }

    const wait = options.wait ?? answerWait;
    const asked = await askTableToEnd(place, options.version, wait);

    if (asked === "nobody") {
        removePlace(options.home, root, place.token);
        return { stop: "none" };
    }

    const looking = { every: options.every ?? stopEvery, now: options.now };
    const placeGone = (): Promise<true | undefined> => Promise.resolve(readPlace(options.home, root)?.token === place.token ? undefined : true);

    // A table ending already, as one asked twice at once, closes a knock without a word: its place goes in a moment, and it is waited for as one that said so.
    if (asked === "silent" && !(await lookUntil(placeGone, () => false, { ...looking, within: wait }))) {
        return { stop: "silent", pid: place.pid };
    }

    const running = options.running ?? isRunning;
    const gone = async (): Promise<true | undefined> => ((await placeGone()) && !running(place.pid) ? true : undefined);
    const ended = await lookUntil(gone, () => false, { ...looking, within: options.within ?? stopWait });
    return { stop: ended ? "ended" : "late", pid: place.pid };
}

/**
 * `rpg table --stop` in the process's folder: a line that says how it went, on stdout where no table is left, else on stderr with what to do; its exit
 * code, 0 then, else 1.
 */
export async function runTableStop(folder = process.cwd(), given: Partial<StopOptions> = {}): Promise<number>
{
    const root = findCampaign(folder);

    if (root === undefined) {
        process.stderr.write(`rpg table --stop: ${folder} is no campaign. Run it in a campaign's folder.\n`);
        return 1;
    }

    const options: StopOptions = { home: userDataFolder(), version: getVersion(), ...given };
    const { stop, pid } = await stopTable(root, options);
    const seconds = Math.round((options.within ?? stopWait) / 1000);

    const lines: Record<TableStop, string> = {
        ended: `The table of ${root} ended.`,
        none: `No table is on for ${root}.`,
        silent: `rpg table --stop: the table of ${root} (process ${String(pid)}) does not answer, or is of an older RPG Engine, which cannot be asked to end. Wait a `
            + `moment and run rpg table --stop again; if it still does not answer, end process ${String(pid)} yourself, knowing that an AI app it started may lose `
            + "what it was saving, as the player's sign-in.",
        late: `rpg table --stop: the table of ${root} (process ${String(pid)}) was asked to end and is still ending after ${String(seconds)} s, as an AI app it `
            + `started may still be saving its work. Run rpg table --stop again to wait more; end process ${String(pid)} yourself only if it never ends.`,
    };

    const done = stop === "ended" || stop === "none";
    (done ? process.stdout : process.stderr).write(`${lines[stop]}\n`);
    return done ? 0 : 1;
}
