// A campaign opened from the launcher: its table, started apart when none answers, looked for through its place until it serves its page.
import { startApart } from "../../core/process.ts";
import { lookUntil } from "../../core/wait.ts";
import { type Probed, probeTable, readPlace, type TablePlace } from "../table/index.ts";
import { holdsCampaign } from "./campaigns.ts";

/** What opening a campaign does outside this process: start its table, ask a table whether it is there, wait; the tests give their own. */
export interface TableStarter
{
    /** The engine's data folder, where the tables' places are, and the engine's version, which a table's must be. */
    home: string;
    version: string;
    /** Starts `rpg table` in the campaign's folder, apart from this process. */
    start?: (root: string) => void;
    probe?: (place: TablePlace) => Promise<Probed>;
    now?: () => number;
    wait?: (milliseconds: number) => Promise<void>;
    /** Whether the launcher is quitting: it stops looking then. */
    quitting?: () => boolean;
}

/** A page's link, or a refusal in words that say what to do. */
export type Reached = { url: string; } | { error: string; };

// A table serves its page within fifteen seconds of its start, looked for every tenth of a second; a probe answers within a second.
const startWait = 15_000;
const every = 100;
const probeWait = 1000;

/**
 * The link of the page of the campaign at `root`, its table started apart first where none answers; a refusal where it holds no campaign or cannot be read,
 * where its table runs another engine or does not answer, where it did not start in time, or once the launcher quits. A table is never ended from here.
 */
export async function openCampaign(root: string, starter: TableStarter): Promise<Reached>
{
    const holds = holdsCampaign(root);

    if (holds !== true) {
        return { error: holds === false ? `${root} holds no campaign: its campaign.yaml is gone. Take it off the list, or add the folder where it is now.` : holds.unreadable };
    }

    const probe = starter.probe ?? ((place: TablePlace) => probeTable(place, starter.version, probeWait));
    let started = false;

    const look = async (): Promise<Reached | undefined> => {
        if (starter.quitting?.() === true) {
            return { error: "RPG Engine's launcher is closing: open your campaigns again with rpg open, then this one." };
        }

        const place = readPlace(starter.home, root);
        const probed = place === undefined ? "nobody" : await probe(place);

        if (place !== undefined && typeof probed === "object" && "version" in probed) {
            return probed.version === starter.version
                ? { url: place.url }
                : {
                    error: `The table of ${root} runs RPG Engine ${probed.version}, not ${starter.version}: close its page and its chats, and it ends by itself within a few minutes `
                        + `(or end its process, ${place.pid}); then open the campaign again.`,
                };
        }

        if (place !== undefined && (probed === "silent" || (typeof probed === "object" && "refused" in probed && probed.refused !== "ending"))) {
            return { error: `The table of ${root} (process ${place.pid}) does not answer: end that process, then open the campaign again.` };
        }

        // None there, or a stale place, which the table started takes away; a table ending is let end first.
        if (probed === "nobody" && !started) {
            started = true;
            (starter.start ?? startTable)(root);
        }

        return undefined;
    };

    const late = (): Reached => ({
        error: started
            ? `The table of ${root} did not start within ${startWait / 1000} seconds: run rpg table in that folder to see why.`
            : `The table of ${root} is still ending: open the campaign again in a moment.`,
    });
    return lookUntil(look, late, { within: startWait, every, now: starter.now, wait: starter.wait });
}

/** Starts `rpg table` in a campaign's folder, apart from this process: the same Node and script as this one. */
export function startTable(root: string): void
{
    startApart(process.execPath, [...process.execArgv, process.argv[1] ?? "", "table"], { cwd: root });
}
