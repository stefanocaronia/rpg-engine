// Someone's state (D-419): on their token a small pip at the lower right, the mark that counts most (dead, at 0, kept from acting, then the last condition put
// on), a second coin behind it when there are more, all of them in its tooltip; in Combat's order each mark as an icon. The conditions' drawings are the game
// system's (`condition-icons`); one it does not draw, or a system without them, has a plain mark. The player chooses when the pips show (Settings).
import type { DyingCounter, Member, SeenEffect, ShownScene } from "./data.ts";
import { stableWord } from "./dying.tsx";
import { effectLabel } from "./game-words.ts";
import { statusIcons } from "./icons.tsx";
import { conditionsPref, useChoice } from "./prefs.ts";
import { type DyingState, dyingState } from "./save-outcome.ts";
import { t } from "./text.ts";

/** What a token's pip reads of someone: what is on them, whether they act, are at 0 or dead. */
export interface TokenStatus
{
    effects?: SeenEffect[] | undefined;
    inactive?: boolean | undefined;
    down?: boolean | undefined;
    dead?: boolean | undefined;
    /** One of the party at their dying point: dying, stable, or dead at the last failure (D-461). */
    dying?: DyingState | undefined;
    /** Their counters at the dying point, which say what the system calls one stable. */
    counters?: DyingCounter[] | undefined;
    /** One of the party, whose 0 is a heartbeat; anyone else's is their fall to the ground (D-461). */
    party?: boolean | undefined;
}

/** A mark of someone's state: its drawing, its words, and whether it is one of the engine's states, a condition, or another effect (`other`: `.effect` is the chips of the effects). */
export interface StatusMark
{
    icon: string;
    label: string;
    kind: "state" | "condition" | "other";
    /** Where one at 0 stands, which tints the mark as the panel of the dying: dying, stable, dead, or a foe down (D-461). */
    tone?: DyingState | "down";
    /** A drawing filled, its holes empty, as the skull of the dead; else a line. */
    filled?: true;
}

/** The marks of someone's state, the one that counts most first: dead, at 0, kept from acting, then the conditions, the last put on first; with `all`, their other effects after them. */
export function statusMarks(status: TokenStatus, all = false): StatusMark[]
{
    const effects = status.effects ?? [];
    // At 0 one of the party has a heartbeat, dying or stable; anyone else falls to the ground. The dead a red skull (D-461).
    const down: StatusMark = status.party === true
        ? { icon: statusIcons.down, label: status.dying === "stable" ? stableWord(status.counters) : t("Dying"), kind: "state", tone: status.dying === "stable" ? "stable" : "dying" }
        : { icon: statusIcons.fallen, label: t("down"), kind: "state", tone: "down" };
    const states: StatusMark[] = status.dead === true || status.dying === "dead"
        ? [{ icon: statusIcons.dead, label: t("dead"), kind: "state", tone: "dead", filled: true }]
        : [
            ...(status.down === true ? [down] : []),
            ...(status.inactive === true ? [{ icon: statusIcons.inactive, label: t("Can't act"), kind: "state" as const }] : []),
        ];
    const conditions = effects.filter((effect) => effect.condition === true).reverse().map((effect): StatusMark => ({ icon: effect.icon ?? statusIcons.condition, label: effectLabel(effect), kind: "condition" }));
    const others = all ? effects.filter((effect) => effect.condition !== true).map((effect): StatusMark => ({ icon: statusIcons.condition, label: effectLabel(effect), kind: "other" })) : [];
    return [...states, ...conditions, ...others];
}

/** The state of one of the party: their effects, whether dead or at their dying point, and whether the open scene says they cannot act. */
export function memberStatus(member: Member, scene?: ShownScene): TokenStatus
{
    const inScene = scene?.fighters?.find((fighter) => fighter.name === member.name) ?? scene?.who.find((person) => person.name === member.name);
    return { effects: member.effects, dead: member.dead, down: member.dying !== undefined, inactive: inScene?.inactive === true, dying: dyingState(member.dying), counters: member.dying, party: true };
}

/** The pip of someone's state on their token, its marks in its tooltip; none without a mark, or while the player keeps them off. */
export function StatusPip({ status }: { status: TokenStatus | undefined; })
{
    const [shown] = useChoice(conditionsPref);
    const marks = status === undefined ? [] : statusMarks(status);

    if (shown === "never" || marks.length === 0) {
        return null;
    }

    const classes = ["status-pip", marks[0].kind === "state" ? "strong" : "", marks[0].tone ?? "", marks.length > 1 ? "stacked" : "", shown === "hover" ? "on-hover" : ""];
    return (
        <span class={classes.filter((name) => name !== "").join(" ")} data-tip={marks.map((mark) => mark.label).join(", ")}>
            <svg viewBox="-3 -3 30 30" aria-hidden="true">
                <path d={marks[0].icon} class={marks[0].filled ? "filled" : undefined} />
            </svg>
        </span>
    );
}

/**
 * Each mark of someone's state as an icon with its words, for a screen reader too and for the keyboard, as Combat's order shows them (D-419); a foe's fall only
 * drawn when its words already say it.
 */
export function StatusIcons({ status, downSaid = false }: { status: TokenStatus; downSaid?: boolean; })
{
    const marks = statusMarks(status, true);
    return marks.length === 0 ? null : (
        <span class="status-icons">
            {marks.map((mark, index) => {
                const said = downSaid && mark.tone === "down";
                return (
                    <span
                        key={`${mark.label} ${index}`}
                        class={["status-icon", mark.kind, mark.tone ?? ""].filter((name) => name !== "").join(" ")}
                        {...(said ? { "aria-hidden": "true" } : { role: "img", "aria-label": mark.label, tabIndex: 0 })}
                        data-tip={mark.label}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d={mark.icon} class={mark.filled ? "filled" : undefined} />
                        </svg>
                    </span>
                );
            })}
        </span>
    );
}

/** The words of someone's state for a screen reader, as a token's name says them. */
export function statusWords(status: TokenStatus): string[]
{
    return statusMarks(status, true).map((mark) => mark.label);
}
