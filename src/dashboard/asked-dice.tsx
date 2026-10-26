// The dice of a rest the master asks the player to spend (ASK-14), when no package draws a card for them (D-513 (6)): the master's question with a button
// for each counter of dice, which rolls one of its dice and stays, and the button that ends it. The engine rolls each die and the question comes back with
// the counters as they are; a game's own card, as the 5e's for its hit dice, comes from its page module.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Asked, RestDice } from "./data.ts";
import { DieIcon } from "./icons.tsx";
import { fieldLabel, signed } from "./labels.ts";
import { numberText, t } from "./text.ts";

export function AskedDice({ asked, spend, flying, onSpend, onDone }: {
    asked: Asked;
    spend: RestDice;
    /** The roll whose dice are in the air: what it changed waits for them. */
    flying?: string | undefined;
    /** Spends a die of a counter: whether the engine took it. */
    onSpend(field: string): Promise<boolean>;
    /** Ends the question, `focused` when the focus was in it: whether the engine took it. */
    onDone(focused: boolean): Promise<boolean>;
})
{
    const element = useRef<HTMLElement>(null);
    // A die asked of the engine, until its roll comes back, as how many rolls there were then; the end asked.
    const [sent, setSent] = useState<number>();
    const [leaving, setLeaving] = useState(false);
    const waiting = (sent !== undefined && spend.rolls.length <= sent) || spend.rolls.some((roll) => roll.id === flying);
    const busy = waiting || leaving;
    // The dice as they were until the last roll's dice land.
    const steady = useRef(spend);

    if (!waiting) {
        steady.current = spend;
    }

    const shown = steady.current;
    const last = shown.rolls.at(-1);

    // While it is there, the rolls beside the sheet stay in sight under it, as under the master's question (D-291).
    useEffect(() => {
        const box = element.current;

        if (box === null) {
            return;
        }

        const root = document.documentElement;
        const observer = new ResizeObserver(() => root.style.setProperty("--asked-space", `${box.offsetHeight + 16}px`));
        observer.observe(box);

        return () => {
            observer.disconnect();
            root.style.removeProperty("--asked-space");
        };
    }, []);

    const spendOne = async (field: string): Promise<void> => {
        if (busy) {
            return;
        }

        setSent(spend.rolls.length);

        if (!await onSpend(field)) {
            setSent(undefined);
        }
    };

    const end = async (): Promise<void> => {
        if (busy) {
            return;
        }

        setLeaving(true);

        if (!await onDone(element.current?.contains(document.activeElement) === true)) {
            setLeaving(false);
        }
    };

    const gives = shown.gives;
    return (
        <section ref={element} class="asked asked-roll asked-rest" aria-labelledby={`asked-${asked.id}`}>
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                <h2 class="asked-title">{asked.title}</h2>
                <p id={`asked-${asked.id}`} class="asked-question" role="alert">{asked.question}</p>
                <p class="asked-gives">
                    {`${fieldLabel(gives.field)} ${numberText(gives.value)}${gives.max === undefined ? "" : `/${numberText(gives.max)}`}`}
                </p>
                <div class="asked-buttons">
                    {shown.dice.map((dice) => (
                        <button key={dice.field} type="button" class="asked-check" disabled={busy || dice.value <= 0} onClick={() => void spendOne(dice.field)}>
                            <DieIcon sides={dice.sides} />
                            <span class="asked-check-name">{fieldLabel(dice.field)}</span>
                            {dice.adds !== 0 && <span class="asked-dice">{signed(dice.adds)}</span>}
                            <span class="asked-roll-name">{t("{value} of {max}", { value: dice.value, max: dice.max })}</span>
                        </button>
                    ))}
                    <button type="button" class="asked-other" disabled={busy} onClick={() => void end()}>{asked.labels[0]}</button>
                </div>
                {/* Each die as it lands, for a screen reader. */}
                <p class="visually-hidden" role="status">{last === undefined ? "" : `${fieldLabel(last.field)}: ${last.total}`}</p>
            </div>
        </section>
    );
}
