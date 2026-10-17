// The death save the master asks of the player (D-460, D-461): a card of its own over the page, which stays until the outcome is told. The character's portrait
// greyed, a ring that beats and a line of the heart; the successes on one side, the failures on the other, what each face does under the one button. Once the
// dice land, the outcome in words, the new mark lit, the line and the portrait as it says: back in colour on the highest face, flat and grey at the last failure.
import { useEffect, useRef } from "preact/hooks";
import { CheckLabel } from "./asked.tsx";
import type { Asked, Member, ShownRoll } from "./data.ts";
import { HeartLine, type HeartLineKind, Marks, Skull } from "./dying.tsx";
import { Icon } from "./icons.tsx";
import { checkOf, fieldLabel } from "./labels.ts";
import { Token } from "./party.tsx";
import { type SaveAsked, type SaveOutcome, saveOutcome } from "./save-outcome.ts";
import { t } from "./text.ts";

/** The card of a death save asked of the player, from the question to its outcome, which the player closes once read. */
export function DeathSaveCard({ asked, save, member, roll, rolling, onRoll, onClose }: {
    asked: Asked;
    save: SaveAsked;
    member?: Member;
    /** The roll, once its dice have landed. */
    roll?: ShownRoll;
    /** Answered, by its button or another way, its dice not landed yet. */
    rolling: boolean;
    onRoll(): void;
    onClose(): void;
})
{
    const card = useRef<HTMLElement>(null);
    const outcome = roll === undefined ? undefined : saveOutcome(save, roll);
    const check = checkOf(asked.labels[0] ?? "", asked.title);
    const successes = outcome?.successes ?? save.successes.value;
    const failures = outcome?.failures ?? save.failures.value;
    const highest = save.highest === undefined ? undefined : `${save.highest.value} ${fieldLabel(save.highest.field)}`;
    const classes = ["dying-card", outcome === undefined ? (rolling ? "rolling" : "asking") : `told ${outcome.kind}`].join(" ");

    // While it is there, the rolls beside the sheet stay in sight under it, as under the master's question (D-291).
    useEffect(() => {
        const element = card.current;

        if (element === null) {
            return;
        }

        const root = document.documentElement;
        const observer = new ResizeObserver(() => root.style.setProperty("--asked-space", `${element.offsetHeight + 16}px`));
        observer.observe(element);

        return () => {
            observer.disconnect();
            root.style.removeProperty("--asked-space");
        };
    }, []);

    return (
        <section ref={card} class={classes} aria-labelledby={`dying-${asked.id}`}>
            {outcome !== undefined && (
                <button type="button" class="icon-button dying-close" aria-label={t("Close")} data-tip={t("Close")} onClick={onClose}>
                    <Icon name="close" />
                </button>
            )}
            <p class="asked-turn">{check === undefined ? t("Your turn") : `${t("Your turn")} · ${check.check}`}</p>
            <p id={`dying-${asked.id}`} class="asked-question" role={outcome === undefined ? "alert" : undefined}>{asked.question}</p>
            <div class="dying-life">
                <HeartLine line={heartLine(outcome?.kind)} />
                <Marks kind="successes" value={successes} most={save.successes.most} lit={outcome?.kind === "success" || outcome?.kind === "stable" ? 1 : 0} />
                <span class="dying-token">
                    {member !== undefined && <Token member={member} large />}
                </span>
                <Marks kind="failures" value={failures} most={save.failures.most} lit={outcome?.count ?? 0} />
            </div>
            <div class="dying-foot">
                {outcome === undefined && (
                    <button type="button" class={rolling ? "dying-roll sent" : "dying-roll"} disabled={rolling} aria-describedby={`dying-stakes-${asked.id}`} onClick={onRoll}>
                        {check === undefined ? asked.labels[0] : <CheckLabel check={check.check} dice={check.dice} name={undefined} />}
                    </button>
                )}
                {/* The outcome in words where the button was, as tall, so that the page does not move; a screen reader hears it as it comes. */}
                <p class="dying-word" role="status">
                    {outcome !== undefined && roll !== undefined && (
                        <>
                            <span aria-hidden="true">
                                {`${roll.total} · `}
                                {outcome.kind === "dead" && <Skull />}
                                {outcomeWords(outcome, highest)}
                            </span>
                            <span class="visually-hidden">
                                {`${roll.total}: ${outcomeWords(outcome, highest)}. ${t("Successes")}: ${t("{value} of {max}", { value: outcome.successes, max: save.successes.most })}; ${t("Failures")}: ${
                                    t("{value} of {max}", { value: outcome.failures, max: save.failures.most })
                                }.`}
                            </span>
                        </>
                    )}
                </p>
                <p id={`dying-stakes-${asked.id}`} class="dying-stakes">
                    {[
                        t("{value} or more: a success", { value: save.atLeast }),
                        ...(save.lowest === undefined ? [] : [save.lowest === 2 ? t("{face}: two failures", { face: 1 }) : t("{face}: {count} failures", { face: 1, count: save.lowest })]),
                        ...(highest === undefined ? [] : [t("{face}: back up with {value}", { face: save.sides, value: highest })]),
                    ].join(" · ")}
                </p>
            </div>
        </section>
    );
}

/** The outcome in the page's words. */
function outcomeWords(outcome: SaveOutcome, highest: string | undefined): string
{
    switch (outcome.kind) {
        case "success":
            return t("Success");
        case "stable":
            return t("Stable");
        case "failure":
            return t("Failure");
        case "failures":
            return outcome.count === 2 ? t("Two failures") : t("{count} failures", { count: outcome.count });
        case "dead":
            return t("Dead");
        case "back":
            return highest === undefined ? t("Back up") : t("Back up with {value}", { value: highest });
    }
}

/** The line of the heart for an outcome: faint while it is to roll, a beat at a success, weaker at a failure, strong back on their feet, flat at the last. */
function heartLine(kind: SaveOutcome["kind"] | undefined): HeartLineKind
{
    return kind === undefined ? "faint" : kind === "back" ? "strong" : kind === "dead" ? "flat" : kind === "success" || kind === "stable" ? "beat" : "weak";
}
