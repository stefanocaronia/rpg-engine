// Moving pages in play (D-151, CON-4, CON-5, CON-9), as move and scene do it: the move, its lines in the log, the events it sets off and what links to what moved.
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { applyMove, concernsPlayer, isInParty, links, locate, type MovePlan, type Page, planLeave, planMove, type World } from "../pages/index.ts";
import { fireEvents, heldNote, linkedStoryNotes, nowDueNote } from "./game-events.ts";
import { withSquares } from "./game-grids.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";

/** What a move did: the pages that changed place, the world after it and after the events it set off, the events it made due, and what the master should know. */
export interface MoveDone
{
    moved: Page[];
    world: World;
    due: string[];
    notes: string[];
}

/**
 * Moves pages into a container (CON-4), or out of every one, and does what follows: a line in the log for the pages that concern the player, public, and one for the others, hidden (CON-9);
 * the events it sets off, judged once on the world before and after it; what links to the pages that moved, but the living members of the party (CON-5).
 */
export function movePages(root: string, context: Context, world: World, pages: Page[], destination: Page | undefined): MoveDone
{
    const plan = pagesPlan(world, pages, destination);

    if (plan.edits.length === 0) {
        return { moved: [], world, due: [], notes: [] };
    }

    return afterMoves(root, context, world, applyMove(world, plan), [{ plan, destination }]);
}

/**
 * The plan of a move of pages into a container (CON-4), or out of every one without a destination, in the open between the places of the map (TRV-12); who moves leaves the
 * squares they had, and enters a map by the square that leads from where they were (GRD-3).
 */
export function pagesPlan(world: World, pages: Page[], destination: Page | undefined): MovePlan
{
    const planned = destination === undefined ? planLeave(world, pages) : planMove(world, pages, destination);
    return planned.edits.length === 0 ? planned : withSquares(world, planned, destination);
}

/**
 * What follows moves of pages once written, each part with its destination: their lines in the log (CON-9), the events judged once on the world before and after them all, and
 * what links to the pages that moved (CON-5).
 */
export function afterMoves(root: string, context: Context, world: World, after: World, parts: { plan: MovePlan; destination: Page | undefined; }[]): MoveDone
{
    for (const { plan, destination } of parts) {
        logMoves(root, context, world, after, plan.moving, destination);
    }

    const moving = parts.flatMap((part) => part.plan.moving);
    const present = readPresent(root).date;
    const fired = fireEvents(root, context, world, after, present);
    const now = (page: Page): Page => fired.world.pages.find((other) => other.path === page.path) ?? page;
    const linked = linkedStoryNotes(fired.world, moving.filter((page) => !isInParty(page)).map(now), fired.due.map((event) => event.name), present);
    const unequipped = parts.flatMap((part) => unequippedNotes(part.plan));
    return { moved: moving.map(now), world: fired.world, due: fired.due.map((event) => event.name), notes: [...unequipped, nowDueNote(fired.due), heldNote(fired.held), ...linked].filter((note) => note !== "") };
}

/** "Gara has Spada equipped no more.": who no longer holds what it had equipped (CON-12). */
function unequippedNotes(plan: MovePlan): string[]
{
    return plan.edits.filter((edit) => edit.field === "equipped").map((edit) => `${edit.holder.name} has ${edit.remove.map((entry) => links(entry)[0]?.page ?? entry).join(", ")} equipped no more.`);
}

/**
 * One line for the pages the player may see, before the move or after it (D-93), or that carry one of the party, as a ship with the party aboard, public;
 * one for the others, hidden. Each says where they were and where they went (CON-9).
 */
function logMoves(root: string, context: Context, before: World, after: World, moved: Page[], destination: Page | undefined): void
{
    const now = (page: Page): Page => after.pages.find((other) => other.path === page.path) ?? page;
    const carriesParty = (page: Page): boolean => before.pages.some((member) => isInParty(member) && locate(before, member).chain.some((holder) => holder.path === page.path));
    const seen = (page: Page): boolean => concernsPlayer(before, page) || concernsPlayer(after, now(page)) || carriesParty(page);
    const groups: ["public" | "hidden", Page[]][] = [["public", moved.filter(seen)], ["hidden", moved.filter((page) => !seen(page))]];

    for (const [visibility, pages] of groups.filter(([, group]) => group.length > 0)) {
        const from = Object.fromEntries(pages.map((page) => [page.name, locate(before, page).chain[0]?.name ?? null]));
        appendLogEntry(root, newDatedLogEntry(root, context, "moved", visibility, { pages: pages.map((page) => page.name), from, to: destination?.name ?? null }));
    }
}
