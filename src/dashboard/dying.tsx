// The dying (D-310 (7), D-314, D-461), in the language of the death save's card: the successes as circles on one side, the failures as squares on the other,
// the line of the heart and a word between them, tinted by where they stand: red dying, green stable, grey and flat dead. In the band of the sheet and the
// card at hand a panel; in a row of the turns one line.
import type { DyingCounter } from "./data.ts";
import { statusIcons } from "./icons.tsx";
import { fieldLabel, itemLabel } from "./labels.ts";
import { type DyingState, dyingState, stableName } from "./save-outcome.ts";
import { t } from "./text.ts";

/** The panel of the dying, from its counters by their sides: large, or in one line in a row of the turns. */
export function DeathSaves({ dying, compact = false }: { dying: DyingCounter[]; compact?: boolean; })
{
    const state = dyingState(dying) ?? "dying";
    const successes = dying.find((counter) => counter.side === "successes");
    const failures = dying.find((counter) => counter.side === "failures");
    return (
        <div class={["death-saves", state, compact ? "compact" : ""].filter((name) => name !== "").join(" ")}>
            {successes !== undefined && <Marks kind="successes" label={sideLabel(successes)} value={successes.value} most={successes.limit ?? Math.max(successes.value, 1)} lit={0} />}
            <span class="death-middle">
                <HeartLine line={stateLines[state]} />
                <span class="death-word">
                    {state === "dead" && <Skull />}
                    {dyingWord(state, dying)}
                </span>
            </span>
            {failures !== undefined && <Marks kind="failures" label={sideLabel(failures)} value={failures.value} most={failures.limit ?? Math.max(failures.value, 1)} lit={0} />}
        </div>
    );
}

/** The red skull of the dead, as on their token (D-461), before the word. */
export function Skull()
{
    return (
        <svg class="dying-skull" viewBox="0 0 24 24" aria-hidden="true">
            <path d={statusIcons.dead} />
        </svg>
    );
}

/** Where someone at their dying point stands, in a word: stable as the system calls it, by their counters. */
export function dyingWord(state: DyingState, counters: DyingCounter[] | undefined): string
{
    return state === "dead" ? t("Dead") : state === "stable" ? stableWord(counters) : t("Dying");
}

/** What the system calls one whose successes are full, in the page's language, as Stable; else the label of the successes. */
export function stableWord(counters: DyingCounter[] | undefined): string
{
    const name = stableName(counters);
    return name === undefined ? fieldLabel(counters?.find((counter) => counter.side === "successes")?.field ?? "") : itemLabel(name);
}

/** The words of a side's marks, the system's short ones, as Successes, else its field's label. */
export function sideLabel(counter: { field: string; mark?: string | undefined; }): string
{
    return counter.mark === undefined ? fieldLabel(counter.field) : itemLabel(counter.mark);
}

/** A side's marks, named by the system: successes as circles, failures as squares; the last `lit` of those marked are new, lit as they come. */
export function Marks({ kind, label, value, most, lit }: { kind: "successes" | "failures"; label: string; value: number; most: number; lit: number; })
{
    return (
        <div class={`dying-side dying-${kind}`}>
            <span class="dying-label" aria-hidden="true">{label}</span>
            <span class="dying-marks">
                {Array.from({ length: most }, (_, index) => (
                    <span
                        key={index}
                        class={["dying-mark", index < value ? "marked" : "", index < value && index >= value - lit ? "new" : ""].filter((name) => name !== "").join(" ")}
                        aria-hidden="true"
                    />
                ))}
                <span class="visually-hidden">{`${label}: ${t("{value} of {max}", { value, max: most })}`}</span>
            </span>
        </div>
    );
}

/** The kinds of the line of the heart. */
export type HeartLineKind = keyof typeof heartLines;

// The line of the heart, on a strip 420 wide and 60 high: a faint beat while dying, a stronger one at a success, weaker at a failure, flat at the last.
const heartLines = {
    faint: "M0 30H130l6-6 5 10 4-4H170l5-16 7 28 5-12H260l5-5 4 8 4-3H420",
    beat: "M0 30H120l8-4 6 4H170l6-26 8 50 6-24H240l8-4 6 4H330l6-22 8 42 6-20H420",
    weak: "M0 30H140l6-8 6 14 4-6H300l4-6 4 8H420",
    flat: "M0 30H420",
    strong: "M0 30H120l8-6 6 6H160l8-34 10 60 8-30H250l8-6 6 6H320l8-30 10 54 8-24H420",
};

// The line of each state that stays.
const stateLines: Record<DyingState, HeartLineKind> = { dying: "faint", stable: "beat", dead: "flat" };

export function HeartLine({ line }: { line: HeartLineKind; })
{
    return (
        <svg class="dying-line" viewBox="0 0 420 60" preserveAspectRatio="none" aria-hidden="true">
            <path d={heartLines[line]} />
        </svg>
    );
}
