// The player's sentences after they go (D-495), in words and with a sign: said, with a button to take it back while it waits, and without a doorbell when the
// master reads it; called, the doorbell rang; heard; or never heard, the chat gone, to say again. A screen reader hears only the change of state.
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "../parts/icons.tsx";
import { t } from "../text.ts";
import type { SaidAct, SaidState } from "./acts.ts";

export function ActStrip(
    { entries, problem, bell, live, onWithdraw, onSayAgain, onDismiss }: {
        entries: { act: SaidAct; state: SaidState; }[];
        /** What went wrong with the last thing the player did here. */
        problem?: string | undefined;
        /** Whether the chat has a doorbell; without one the master reads a sentence when the player next writes in the chat. */
        bell: boolean;
        /** Whether the game is there, to say a lost sentence again. */
        live: boolean;
        onWithdraw(id: string): void;
        /** Says a sentence never heard again, in its place. */
        onSayAgain(id: string): void;
        onDismiss(id: string): void;
    },
)
{
    const before = useRef(new Map<string, SaidState>());
    const [told, setTold] = useState("");

    // Only what changed is told, the newest change last: a sentence said, heard or lost.
    useEffect(() => {
        const changed = entries.filter(({ act, state }) => before.current.get(act.id) !== state).at(-1);
        before.current = new Map(entries.map(({ act, state }) => [act.id, state]));

        if (changed !== undefined) {
            setTold(stateWords(changed.state, bell));
        }
    }, [entries.map(({ act, state }) => `${act.id} ${state}`).join()]);

    return (
        <>
            <p class="visually-hidden" role="status">{told}</p>
            {(entries.length > 0 || problem !== undefined) && (
                <section class="act-strip" aria-label={t("Your sentences")}>
                    {entries.map(({ act, state }) => (
                        <p key={act.id} class={`act-line ${state}`}>
                            <span class="act-sign">
                                <Icon name={stateIcon(state)} />
                            </span>
                            <span class="act-said">
                                <q>{act.text}</q>
                                <span class="act-state">{stateWords(state, bell)}</span>
                            </span>
                            {state === "said" && <button type="button" class="act-small" aria-label={t("Take it back from the master")} onClick={() => onWithdraw(act.id)}>{t("Take back")}</button>}
                            {state === "lost" && <button type="button" class="act-small" disabled={!live} onClick={() => onSayAgain(act.id)}>{t("Say it again")}</button>}
                            {state !== "said" && (
                                <button type="button" class="icon-button act-close tip-left" aria-label={t("Close")} data-tip={t("Close")} onClick={() => onDismiss(act.id)}>
                                    <Icon name="close" />
                                </button>
                            )}
                        </p>
                    ))}
                    {problem !== undefined && <p class="act-problem" role="alert">{problem}</p>}
                </section>
            )}
        </>
    );
}

/** How a sentence stands, in words; said without a doorbell, when the master reads it. */
function stateWords(state: SaidState, bell: boolean): string
{
    switch (state) {
        case "said":
            return bell ? t("Said to the master") : t("Said to the master: they read it as soon as you write in the chat");
        case "called":
            return t("The master is about to read it");
        case "heard":
            return t("The master is reading it");
        case "lost":
            return t("Not heard: the chat was closed");
    }
}

/** How a sentence stands, as a sign beside its words. */
function stateIcon(state: SaidState): IconName
{
    switch (state) {
        case "said":
            return "send";
        case "called":
            return "bell";
        case "heard":
            return "check";
        case "lost":
            return "offline";
    }
}
