// The player's free rolls (D-330 (4)): kept in this browser alone, by campaign, never written in the campaign nor seen by the master; Clear forgets them.
import type { ShownRoll } from "./data.ts";

/** A roll the page decided, free (D-278 (2)), as the rolls show it beside the logged ones. */
export type PageRoll = ShownRoll & { free: true; };

// Where the browser keeps them, and how many at most.
const freeKey = "rpg-engine.free-rolls";
const mostFree = 30;

export function readFree(campaign: string | undefined): PageRoll[]
{
    try {
        const kept: unknown = JSON.parse(localStorage.getItem(`${freeKey}:${campaign ?? ""}`) ?? "[]");
        return Array.isArray(kept) ? kept.filter((roll): roll is PageRoll => typeof roll === "object" && roll !== null && "free" in roll) : [];
    } catch {
        return [];
    }
}

/** The free rolls with one more, the oldest left out past the most kept; kept in the browser. */
export function withFree(campaign: string | undefined, rolls: PageRoll[], roll: PageRoll): PageRoll[]
{
    const kept = [...rolls, roll].slice(-mostFree);
    writeFree(campaign, kept);
    return kept;
}

export function writeFree(campaign: string | undefined, rolls: PageRoll[]): void
{
    try {
        if (rolls.length === 0) {
            localStorage.removeItem(`${freeKey}:${campaign ?? ""}`);
        } else {
            localStorage.setItem(`${freeKey}:${campaign ?? ""}`, JSON.stringify(rolls));
        }
    } catch {
        // The page forgets them at the next reload.
    }
}
