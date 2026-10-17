// What a death save the player rolled did (D-461), as the system's code wrote it (DIE-4): the page reads it from the counters the roll left against those the
// question carried, to tell it as soon as the dice land; the rule itself is the system's alone.
import type { Asked, DyingCounter } from "./data.ts";

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

/** One of the party as the roll left them: their counters by their sides while at their dying point, none above it; whether dead. */
export interface AfterSave
{
    dying?: DyingCounter[] | undefined;
    dead?: boolean | undefined;
}

/**
 * The outcome of a death save from what its roll left (DIE-4): back above the dying point, failures added, the last of them dead, or a success, the last of
 * them stable; none when it changed nothing, as when the system's code did not run.
 */
export function saveOutcome(save: SaveAsked, after: AfterSave): SaveOutcome | undefined
{
    if (after.dead === true) {
        return { kind: "dead", successes: save.successes.value, failures: save.failures.most, count: Math.max(save.failures.most - save.failures.value, 1) };
    }

    if (after.dying === undefined) {
        return { kind: "back", successes: 0, failures: 0, count: 0 };
    }

    const successes = sideValue(after.dying, "successes") ?? save.successes.value;
    const failures = sideValue(after.dying, "failures") ?? save.failures.value;

    if (failures > save.failures.value) {
        const count = failures - save.failures.value;
        return { kind: failures >= save.failures.most ? "dead" : count > 1 ? "failures" : "failure", successes, failures, count };
    }

    if (successes > save.successes.value) {
        return { kind: successes >= save.successes.most ? "stable" : "success", successes, failures, count: 0 };
    }

    return undefined;
}

/** What the system calls one whose successes are full, as the 5e's Stable; none when it names nothing. */
export function stableName(counters: DyingCounter[] | undefined): string | undefined
{
    return counters?.find((counter) => counter.side === "successes")?.full;
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

function sideValue(counters: DyingCounter[], side: "successes" | "failures"): number | undefined
{
    return counters.find((counter) => counter.side === side)?.value;
}
