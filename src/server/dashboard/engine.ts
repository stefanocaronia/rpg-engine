// npm's latest rpg-engine as the page shows it (T-219): asked at most once a day and kept in the player's folder on this computer, so that a page drawn again
// or a new chat does not ask npm again; when npm did not answer, asked again after an hour. The update itself always asks npm anew.
import type { EngineUpdater } from "../../core/context.ts";
import { keepLatestEngine, keptLatestEngine } from "../../packages/index.ts";
import type { Served } from "./index.ts";

/** npm's latest version of rpg-engine, or why npm could not be asked. */
export type EngineLatest = { version: string; } | { failed: string; };

/** The last time this server asked npm: when, what it is answering, and whether it failed. */
export interface EngineAsked
{
    at: number;
    latest: Promise<EngineLatest>;
    failed: boolean;
}

const checkHolds = 24 * 60 * 60 * 1000;
const retryAfter = 60 * 60 * 1000;

/** npm's latest rpg-engine as known today: asked by this server or kept from today's check, else asked now and kept. */
export async function knownLatest(served: Served, updater: EngineUpdater): Promise<EngineLatest>
{
    const now = served.context.now().getTime();
    const asked = served.engineLatest;

    if (asked !== undefined && now - asked.at >= 0 && now - asked.at < (asked.failed ? retryAfter : checkHolds)) {
        return await asked.latest;
    }

    const kept = keptLatestEngine(served.context.home, now);

    if (kept !== undefined) {
        served.engineLatest = { at: kept.checked, latest: Promise.resolve({ version: kept.version }), failed: false };
        return { version: kept.version };
    }

    return await askLatest(served, updater);
}

/** Asks npm for its latest rpg-engine now, and keeps what it said for the page. */
export async function askLatest(served: Served, updater: EngineUpdater): Promise<EngineLatest>
{
    const now = served.context.now().getTime();
    const asking: EngineAsked = { at: now, latest: updater.latest(), failed: false };
    served.engineLatest = asking;
    const latest = await asking.latest;

    if ("failed" in latest) {
        asking.failed = true;
    } else {
        keepLatestEngine(served.context.home, now, latest.version);
    }

    return latest;
}
