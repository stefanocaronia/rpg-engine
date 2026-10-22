// The dice of a rest the master asks the player to spend (D-492, ASK-14): a card in the frame of the master's question that stays while the player rolls, one
// die at a time. Who rests and the points the dice give, as a bar that keeps where the rest began; a row for each kind of die with its pips and its button;
// the dice rolled as chips; the one button that ends it. What a roll changes shows once its dice land.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Asked, Member } from "./data.ts";
import { DieIcon, Icon } from "./icons.tsx";
import { fieldLabel, signed } from "./labels.ts";
import { Token } from "./party.tsx";
import { t } from "./text.ts";

type Spend = NonNullable<Asked["spend"]>;

// How long the points take to climb to what a die gave.
const climbTime = 400;

export function SpendCard({ asked, spend, member, flying, onSpend, onDone }: {
    asked: Asked;
    spend: Spend;
    member?: Member | undefined;
    /** The roll whose dice are in the air: what it changed waits for them. */
    flying?: string | undefined;
    /** Spends a die of a counter: whether the engine took it. */
    onSpend(field: string): Promise<boolean>;
    /** Ends the question, `focused` when the focus was in the card: whether the engine took it. */
    onDone(focused: boolean): Promise<boolean>;
})
{
    const card = useRef<HTMLElement>(null);
    const done = useRef<HTMLButtonElement>(null);
    // A die asked of the engine, until its roll comes back: its counter, and how many rolls there were then.
    const [sent, setSent] = useState<{ field: string; rolls: number; }>();
    const [leaving, setLeaving] = useState(false);
    const waiting = (sent !== undefined && spend.rolls.length <= sent.rolls) || spend.rolls.some((roll) => roll.id === flying);
    // What the card shows: the dice as they were until the last roll's dice land.
    const steady = useRef(spend);

    if (!waiting) {
        steady.current = spend;
    }

    const shown = steady.current;
    const { gives } = shown;
    const value = useClimb(gives.value);
    const gained = gives.value - gives.from;
    const full = gives.max !== undefined && gives.value >= gives.max;
    const left = shown.dice.some((dice) => dice.value > 0);
    const last = shown.rolls.at(-1);
    const busy = waiting || leaving;

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

    // The last die spent, the focus that was on a button to roll goes to the one that ends it.
    useEffect(() => {
        if (!left && card.current?.contains(document.activeElement) === true) {
            done.current?.focus();
        }
    }, [left]);

    const spendOne = async (field: string): Promise<void> => {
        if (busy) {
            return;
        }

        setSent({ field, rolls: spend.rolls.length });

        if (!await onSpend(field)) {
            setSent(undefined);
        }
    };

    const end = async (): Promise<void> => {
        if (busy) {
            return;
        }

        setLeaving(true);

        if (!await onDone(card.current?.contains(document.activeElement) === true)) {
            setLeaving(false);
        }
    };

    return (
        <section ref={card} class={leaving ? "asked spend-card leaving" : "asked spend-card"} aria-labelledby={`spend-${asked.id}`}>
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                <p class="asked-turn">{asked.title}</p>
                <p id={`spend-${asked.id}`} class="asked-question" role="alert">{asked.question}</p>
                <div class="spend-play">
                    <div class="spend-life">
                        <span class="spend-token">{member !== undefined && <Token member={member} />}</span>
                        <div class="spend-points">
                            <span class="spend-points-head">
                                <span class="spend-points-name">{fieldLabel(gives.field)}</span>
                                <span class="spend-points-number">
                                    <b>{value}</b>
                                    {gives.max !== undefined && <span class="spend-points-max">/{gives.max}</span>}
                                </span>
                                {gained > 0 && <span class="spend-gain">+{gained}</span>}
                                {full && (
                                    <span class="spend-full">
                                        <Icon name="check" />
                                        {t("at the maximum")}
                                    </span>
                                )}
                            </span>
                            {gives.max !== undefined && gives.max > 0 && (
                                <span
                                    class="bar spend-bar"
                                    role="meter"
                                    aria-label={fieldLabel(gives.field)}
                                    aria-valuemin={0}
                                    aria-valuemax={gives.max}
                                    aria-valuenow={gives.value}
                                    aria-valuetext={t("{value} of {max}", { value: gives.value, max: gives.max })}
                                >
                                    <span class="fill spend-now" style={{ "--fill": String(share(gives.value, gives.max)) }} />
                                    {gives.from > 0 && <span class="fill spend-before" style={{ "--fill": String(share(gives.from, gives.max)) }} />}
                                </span>
                            )}
                        </div>
                    </div>
                    <ul class="spend-rows">
                        {shown.dice.map((dice) => {
                            const out = dice.value <= 0;
                            const label = fieldLabel(dice.field);
                            return (
                                <li key={dice.field} class={out ? "spend-row out" : "spend-row"}>
                                    <span class="spend-row-name">{label}</span>
                                    {dice.max <= 10
                                        ? (
                                            <span class="pips spend-pips" role="img" aria-label={`${label}: ${t("{value} of {max}", { value: dice.value, max: dice.max })}`}>
                                                {Array.from(
                                                    { length: dice.max },
                                                    (_, index) => (
                                                        <span
                                                            key={index}
                                                            class={["pip", index < dice.value ? "on" : "", last?.field === dice.field && index === dice.value ? "fresh" : ""].filter((name) => name !== "").join(" ")}
                                                        />
                                                    ),
                                                )}
                                            </span>
                                        )
                                        : <span class="spend-count">{t("{value} of {max}", { value: dice.value, max: dice.max })}</span>}
                                    <button
                                        type="button"
                                        class={sent?.field === dice.field && waiting ? "spend-roll sent" : "spend-roll"}
                                        aria-disabled={out || busy ? "true" : undefined}
                                        onClick={() => !out && void spendOne(dice.field)}
                                    >
                                        <DieIcon sides={dice.sides} />
                                        <span class="asked-check-name">{out ? t("None left") : t("Roll")}</span>
                                        {!out && dice.adds !== 0 && <span class="asked-dice">{signed(dice.adds)}</span>}
                                        <span class="visually-hidden">{label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div class="spend-foot">
                    {shown.rolls.length === 0
                        ? <p class="spend-hint">{t("One die at a time: stop when you like.")}</p>
                        : (
                            <ol class="spend-chips" aria-label={t("Dice rolled")}>
                                {shown.rolls.map((roll) => (
                                    <li key={roll.id} class={roll.id === last?.id ? "spend-chip fresh" : "spend-chip"}>
                                        <span class="die-chip">
                                            <DieIcon sides={shown.dice.find((dice) => dice.field === roll.field)?.sides ?? 6} />
                                            {roll.face}
                                        </span>
                                        {roll.adds !== 0 && <span class="spend-chip-adds">{signed(roll.adds)}</span>}
                                        <span class="spend-chip-total">= {roll.total}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    <button ref={done} type="button" class={left ? "spend-done" : "spend-done last"} aria-disabled={busy ? "true" : undefined} onClick={() => void end()}>
                        {shown.rolls.length === 0 ? t("I spend none") : t("Done")}
                    </button>
                </div>
                {/* Each die as it lands, for a screen reader: what it gave and what is left. */}
                <p class="visually-hidden" role="status">{last === undefined ? "" : landedText(shown, last)}</p>
            </div>
        </section>
    );
}

/** "Hit dice d8: 6 +2 = 8. HP: 22 of 27. Left: 1.": a die as it landed, for a screen reader. */
function landedText(spend: Spend, roll: Spend["rolls"][number]): string
{
    const dice = spend.dice.find((counter) => counter.field === roll.field);
    const points = spend.gives.max === undefined ? String(spend.gives.value) : t("{value} of {max}", { value: spend.gives.value, max: spend.gives.max });
    const rolled = `${roll.face}${roll.adds === 0 ? "" : ` ${signed(roll.adds)}`} = ${roll.total}`;
    return `${fieldLabel(roll.field)}: ${rolled}. ${fieldLabel(spend.gives.field)}: ${points}.${dice === undefined ? "" : ` ${t("Left: {count}", { count: dice.value })}`}`;
}

/** A value's share of its maximum, from 0 to 1. */
function share(value: number, max: number): number
{
    return Math.min(1, Math.max(0, value / max));
}

/** A number that climbs to its new value in a moment, at once for a player who asked for less motion. */
function useClimb(target: number): number
{
    const [value, setValue] = useState(target);
    const from = useRef(target);

    useEffect(() => {
        const start = from.current;
        from.current = target;

        if (start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setValue(target);
            return;
        }

        const began = performance.now();
        let frame = 0;

        const step = (now: number): void => {
            const part = Math.min(1, (now - began) / climbTime);
            setValue(Math.round(start + (target - start) * part));

            if (part < 1) {
                frame = requestAnimationFrame(step);
            }
        };

        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [target]);

    return value;
}
