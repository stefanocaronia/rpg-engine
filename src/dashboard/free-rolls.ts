// The player's free rolls (D-330 (4)): kept in this browser alone, by campaign, never written in the campaign nor seen by the master; Clear forgets them.
import type { ShownRoll, ThrownDie } from "./data.ts";

/** A roll the page decided, free (D-278 (2)), as the rolls show it beside the logged ones. */
export type PageRoll = ShownRoll & { free: true; };

// Where the browser keeps them, and how many at most.
const freeKey = "rpg-engine.free-rolls.1";
const mostFree = 30;

export function readFree(campaign: string | undefined): PageRoll[]
{
    try {
        const kept: unknown = JSON.parse(localStorage.getItem(`${freeKey}:${campaign ?? ""}`) ?? "[]");
        return Array.isArray(kept) ? kept.filter(isPageRoll) : [];
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

/** Whether what the browser kept is a free roll whole, as the page writes one: a field missing or of another kind leaves it out. */
function isPageRoll(kept: unknown): kept is PageRoll
{
    if (typeof kept !== "object" || kept === null) {
        return false;
    }

    const roll = kept as Partial<Record<keyof PageRoll, unknown>>;
    const isDie = (die: unknown): die is ThrownDie => typeof die === "object" && die !== null && typeof (die as ThrownDie).value === "number" && (typeof (die as ThrownDie).sides === "number" || (die as ThrownDie).sides === "F");
    return roll.free === true && typeof roll.id === "string" && typeof roll.at === "string" && !Number.isNaN(Date.parse(roll.at)) && typeof roll.notation === "string"
        && typeof roll.text === "string" && typeof roll.total === "number" && Array.isArray(roll.dice) && roll.dice.every(isDie);
}
