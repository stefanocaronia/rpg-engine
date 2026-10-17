// What a death save the player rolled did (D-461), as the engine writes it (DIE-4): the page reads it from the roll and what the question carried, to tell it as
// soon as the dice land.
import type { Asked, ThrownDie } from "./data.ts";

/** What a death save asks, as the engine sends it. */
export type SaveAsked = NonNullable<Asked["save"]>;

/** What a death save did: a success, the last of them, one failure or more, the last of them, or the highest face that ends it all; the counters after it. */
export interface SaveOutcome
{
    kind: "success" | "stable" | "failure" | "failures" | "dead" | "back";
    successes: number;
    failures: number;
    /** How many failures it counts, two on the lowest face. */
    count: number;
}

/** The outcome of a death save from its roll, as the engine writes it (DIE-4): the highest face brings the counter back, a total at least the save's succeeds. */
export function saveOutcome(save: SaveAsked, roll: { total: number; dice: ThrownDie[]; }): SaveOutcome
{
    const natural = roll.dice.find((die) => die.sides === save.sides && die.dropped !== true)?.value;

    if (save.highest !== undefined && natural === save.sides) {
        return { kind: "back", successes: 0, failures: 0, count: 0 };
    }

    if (roll.total >= save.atLeast) {
        const successes = Math.min(save.successes.value + 1, save.successes.most);
        return { kind: successes >= save.successes.most ? "stable" : "success", successes, failures: save.failures.value, count: 0 };
    }

    const count = natural === 1 ? (save.lowest ?? 1) : 1;
    const failures = Math.min(save.failures.value + count, save.failures.most);
    return { kind: failures >= save.failures.most ? "dead" : count > 1 ? "failures" : "failure", successes: save.successes.value, failures, count };
}

/** Where one of the party at their dying point stands (D-461): still dying, stable at the last success, dead at the last failure. */
export type DyingState = "dying" | "stable" | "dead";

/** The state the panel of the dying says, from its counters by their sides; none when not dying. */
export function dyingState(counters: { value: number; limit?: number; side?: "successes" | "failures"; }[] | undefined): DyingState | undefined
{
    if (counters === undefined) {
        return undefined;
    }

    const full = (side: "successes" | "failures"): boolean => counters.some((counter) => counter.side === side && counter.limit !== undefined && counter.value >= counter.limit);
    return full("failures") ? "dead" : full("successes") ? "stable" : "dying";
}
