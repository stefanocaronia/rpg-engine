import { z } from "zod";
import { comparableText } from "../core/text.ts";

/** The kinds of scene, so that the master can see the variety of the game (D-39, D-111). */
export const sceneTypes = ["combat", "social", "exploration", "travel", "rest", "challenge", "other"] as const;

/** A numbered copy of a creature in the scene, such as Annegato 1: the creature it copies, and only what it changed (D-110, INH-14). */
export type SceneCopy = { creature: string; } & Record<string, unknown>;

/** The open scene (D-113): who is in it, the copies of creatures, and the order of turns when the game has one. */
export interface Scene
{
    title: string;
    type: string;
    /** A link to the place, such as [[Ossario]]. */
    place?: string;
    /** The game date the scene opened. */
    opened?: string;
    /** What is happening now, in one line as the player sees it, for their dashboard (SCN-11). */
    now?: string;
    /** Links to the characters in the scene. */
    with: string[];
    copies: Record<string, SceneCopy>;
    order?: string[];
    round?: number;
    turn?: string;
    /** Who left the scene: their names are never given again to a copy in it, and the log keeps them. */
    left?: string[];
    /** The copies that left, as they were when they left: what overcoming them gives counts when the scene closes (DAT-11). */
    gone?: Record<string, SceneCopy>;
    /** How many squares of a map the one whose turn it is has moved in it (GRD-5): it counts only for that round and turn. */
    moved?: { round: number; turn: string; squares: number; };
    /** Who attacks the party, as the master marks them, characters or copies by name (D-415): the player's dashboard shows it in a fight. */
    hostile?: string[];
    /** What the player character sees of who it does not know by name, by the character's or the creature's name, such as brigante incappucciato (D-416). */
    seen?: Record<string, string>;
}

// Loose: keys written by hand in the scene stay.
const sceneSchema = z.looseObject({
    title: z.string().min(1),
    type: z.enum(sceneTypes),
    place: z.string().optional(),
    opened: z.string().optional(),
    now: z.string().optional(),
    with: z.array(z.string()).default([]),
    copies: z.record(z.string(), z.looseObject({ creature: z.string() })).default({}),
    order: z.array(z.string()).min(1).optional(),
    round: z.number().int().positive().optional(),
    turn: z.string().optional(),
    left: z.array(z.string()).optional(),
    gone: z.record(z.string(), z.looseObject({ creature: z.string() })).optional(),
    hostile: z.array(z.string()).optional(),
    seen: z.record(z.string(), z.string()).optional(),
    // What the engine counts, never the master: written wrongly by hand it is forgotten, never a scene that cannot be read.
    moved: z.object({ round: z.number().int().positive(), turn: z.string(), squares: z.number().nonnegative() }).optional().catch(undefined),
});

/** The open scene, checked; a scene written wrongly by hand fails with what is wrong. */
export function readScene(value: unknown): Scene
{
    const parsed = sceneSchema.safeParse(value);

    if (!parsed.success) {
        throw new Error(`${parsed.error.issues.map((issue) => `${issue.path.join(".") || "scene"}: ${issue.message}`).join("; ")}.`);
    }

    return parsed.data as Scene;
}

/** Names for `count` new copies of a creature, numbered after the copies of it that `taken` already holds: Annegato 3, Annegato 4. */
export function copyNames(creature: string, count: number, taken: string[]): string[]
{
    const prefix = `${comparableText(creature)} `;
    const used = taken.map(comparableText).filter((name) => name.startsWith(prefix)).map((name) => Number(name.slice(prefix.length))).filter(Number.isSafeInteger);
    const last = Math.max(0, ...used);
    return Array.from({ length: count }, (_, index) => `${creature} ${last + index + 1}`);
}

/** The turn after the current one, and the round: after the last in the order comes the first, in the next round. */
export function nextTurn(order: string[], turn: string | undefined, round: number): { turn: string; round: number; }
{
    const index = turn === undefined ? -1 : order.findIndex((name) => comparableText(name) === comparableText(turn));
    return index === order.length - 1 ? { turn: order[0], round: round + 1 } : { turn: order[index + 1], round };
}
