// The player's sentences after they go (D-495), in words and with a sign: said, with a button to take it back while it waits; called, the doorbell rang;
// heard; or never heard, the chat gone, to say again there. A screen reader hears only the change of state.
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "../icons.tsx";
import { t } from "../text.ts";
import type { SaidAct, SaidState } from "./acts.ts";

export function ActStrip(
    { entries, problem, onWithdraw, onCopy, onDismiss }: {
        entries: { act: SaidAct; state: SaidState; }[];
        /** What went wrong with the last thing the player did here. */
        problem?: string | undefined;
        onWithdraw(id: string): void;
        /** Copies a sentence never heard, for the chat, in its place. */
        onCopy(id: string, text: string): void;
        onDismiss(id: string): void;
    },
)
{
    const before = useRef(new Map<string, SaidState>());
    const [told, setTold] = useState("");

    // Only what changed is told, the newest change last: a sentence said, heard, lost or copied.
    useEffect(() => {
        const changed = entries.filter(({ act, state }) => before.current.get(act.id) !== state).at(-1);
        before.current = new Map(entries.map(({ act, state }) => [act.id, state]));

        if (changed !== undefined) {
            setTold(stateWords(changed.state));
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
                                <span class="act-state">{stateWords(state)}</span>
                            </span>
                            {state === "said" && <button type="button" class="act-small" aria-label={t("Take it back from the master")} onClick={() => onWithdraw(act.id)}>{t("Take back")}</button>}
                            {state === "lost" && <button type="button" class="act-small" onClick={() => onCopy(act.id, act.text)}>{t("Copy")}</button>}
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

/** How a sentence stands, in words. */
function stateWords(state: SaidState): string
{
    switch (state) {
        case "said":
            return t("Said to the master");
        case "called":
            return t("The master is about to read it");
        case "heard":
            return t("The master is reading it");
        case "lost":
            return t("Not heard: say it again in the chat");
        case "copied":
            return t("Copied: paste it in the chat");
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
        case "copied":
            return "copy";
    }
}
