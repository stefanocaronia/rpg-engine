// What answers the master's question (D-279), drawn once for the question over the page and the one in the chat: the buttons of its checks, with their dice
// and the name of their roll, of its other answers and of a toss; the note and the switch of who rolls by hand (D-330); and what sends the answer to the
// engine. Each place gives them its own frame and room, nothing more.
import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { answer } from "../api.ts";
import type { Asked, Member } from "../data.ts";
import { CoinFace } from "../parts/faces.tsx";
import { notationLabel } from "../parts/game-words.ts";
import { Icon, NotationIcons } from "../parts/icons.tsx";
import { checkOf, notationModifier, signed } from "../parts/labels.ts";
import { sheetAddress } from "../sheet/party.tsx";
import { byHandPref, usePref } from "../shell/prefs.ts";
import { t, tParts } from "../text.ts";
import { asksRoll, handChecks, shownAnswers } from "./answering.ts";

/** A question as it is answered: the answer that left, by its button's place or its kind; what went wrong; and whether its buttons take no more clicks. */
export interface Answering
{
    sent: number | "words" | "square" | undefined;
    problem: string | undefined;
    gone: boolean;
    /** A button by its place, the player's own words, or a square of the map. */
    reply(given: number | string | { square: string; }): Promise<void>;
}

/**
 * What answers a question: a click goes to the engine, which rolls the check and gives the master its result. `answered` when the sheet or the tray
 * answered it meanwhile; `onAnswered` once the engine has it, or refused it. A question asked again starts unanswered.
 */
export function useAnswering(asked: Asked, answered: boolean | undefined, onAnswered: () => void): Answering
{
    const [sent, setSent] = useState<number | "words" | "square">();
    const [problem, setProblem] = useState<string>();

    useEffect(() => {
        setSent(undefined);
        setProblem(undefined);
    }, [asked.id]);

    const reply = async (given: number | string | { square: string; }): Promise<void> => {
        setSent(typeof given === "number" ? given : typeof given === "string" ? "words" : "square");
        setProblem(undefined);

        try {
            // A click that comes too late counts for nothing: the page reads what the master asks now. One the game refuses can be given again.
            if (!await answer(asked.id, given)) {
                setSent(undefined);
                setProblem(t("The answer did not reach the game: try again."));
            }
        } catch {
            setSent(undefined);
            setProblem(t("The answer did not reach the game: try again."));
        }

        onAnswered();
    };

    return { sent, problem, gone: sent !== undefined || answered === true, reply };
}

/** Whether the player rolls the checks by hand in this browser, and what changes it (D-330). */
export function useByHand(): [boolean, (on: boolean) => void]
{
    return usePref(byHandPref);
}

/**
 * The buttons of a question, a check's or an answer's, in the order it gives them; by hand a check has none, and `onlyChecks` leaves the others out. They go
 * in an `.asked-buttons` of the place's own.
 */
export function AnswerButtons({ asked, answering, byHand, onlyChecks = false }: { asked: Asked; answering: Answering; byHand: boolean; onlyChecks?: boolean; })
{
    const roll = asksRoll(asked);
    return (
        <>
            {shownAnswers(asked, byHand, onlyChecks).map((index) => {
                const label = asked.labels[index];
                const check = checkOf(label, asked.title);
                const kind = check !== undefined ? "asked-check" : roll ? "asked-other" : "asked-answer";
                return (
                    <button
                        key={label}
                        type="button"
                        class={answering.sent === index ? `${kind} sent` : kind}
                        disabled={answering.gone}
                        title={asked.toss === true ? undefined : notationLabel(asked.words?.[index] ?? undefined)}
                        onClick={() => void answering.reply(index)}
                    >
                        <AnswerLabel label={label} asked={asked} index={index} />
                    </button>
                );
            })}
        </>
    );
}

/**
 * What an answer says, on its button or once given: a check with its dice and the name of its roll, a toss with its coins, any other answer in its own
 * words. `index` is its button's place, where the question is still at hand: it names the roll as the game does.
 */
export function AnswerLabel({ label, asked, index }: { label: string; asked: Pick<Asked, "title" | "toss" | "names">; index?: number; })
{
    const check = checkOf(label, asked.title);

    if (check === undefined) {
        return <>{label}</>;
    }

    return asked.toss === true
        ? <TossLabel words={check.check} coins={Number(/^(\d+)d2$/.exec(check.dice)?.[1] ?? 1)} />
        : <CheckLabel check={check.check} dice={check.dice} name={(index === undefined ? undefined : asked.names?.[index]) ?? keptName(check.dice)} />;
}

/** By hand, as a master says it: which checks, with their dice as pictures; their number the player finds on the sheet. Nothing with no check to roll so. */
export function HandNote({ asked, who }: { asked: Asked; who?: Member | undefined; })
{
    const named = handChecks(asked);

    if (named.length === 0) {
        return null;
    }

    return (
        <p class="asked-hand-note">
            <Icon name="hand" />
            <span>
                {tParts("Roll {checks} yourself, on {sheet} or with the dice.", {
                    checks: named.map((check, index) => (
                        <Fragment key={check.check}>
                            {index > 0 && (index === named.length - 1 ? ` ${t("or")} ` : ", ")}
                            <a class="asked-hand-check" href={sheetAddress(asked.who ?? "")} onClick={() => showRow(check.field)}>
                                <NotationIcons notation={check.dice} />
                                {check.check}
                            </a>
                        </Fragment>
                    )),
                    sheet: <a href={sheetAddress(asked.who ?? "")}>{who === undefined ? t("your sheet") : t("{name}'s sheet", { name: who.name })}</a>,
                }).map((part, index) => <Fragment key={index}>{part}</Fragment>)}
            </span>
        </p>
    );
}

/** The switch to roll by hand, for this browser. */
export function HandSwitch({ byHand, onChange }: { byHand: boolean; onChange(on: boolean): void; })
{
    return (
        <label class="asked-hand">
            <input type="checkbox" role="switch" checked={byHand} onChange={(event) => onChange(event.currentTarget.checked)} />
            <Icon name="hand" />
            {t("By hand")}
        </label>
    );
}

/**
 * A check's button (D-297): its dice as pictures, one of two faded when only one counts, its name, the number added and what kind of roll it is in words, as
 * "with advantage" (D-399); the notation is in the tooltip.
 */
export function CheckLabel({ check, dice, name }: { check: string; dice: string; name: string | undefined; })
{
    const modifier = notationModifier(dice);
    return (
        <>
            <NotationIcons notation={dice} />
            <span class="asked-check-name">{check}</span>
            {modifier !== 0 && <span class="asked-dice">{signed(modifier)}</span>}
            {name !== undefined && <span class="asked-roll-name">{name}</span>}
            <span class="visually-hidden">{dice}</span>
        </>
    );
}

/** A toss's button (ASK-15): its coins as they are, one before the other, at most three, and its words, which say how many. */
function TossLabel({ words, coins }: { words: string; coins: number; })
{
    return (
        <>
            <span class="die-icons">{Array.from({ length: coins }, (_, index) => <CoinFace key={index} side="heads" />)}</span>
            <span class="asked-check-name">{words}</span>
        </>
    );
}

/** A roll that keeps one die of several, in words any game reads, when its game gives it no name: "highest of 2", "lowest of 3" (D-399); undefined for any other. */
function keptName(dice: string): string | undefined
{
    const kept = /^(\d+)d(?:\d+|%)(kh1?|kl1?|dl1|dh1)(?:[+-]\d+)*$/.exec(dice.toLowerCase().replace(/\s+/g, "").replaceAll("−", "-"));
    const count = Number(kept?.[1] ?? 0);
    const rule = kept?.[2] ?? "";
    const highest = rule.startsWith("kh") || (rule === "dl1" && count === 2);
    const lowest = rule.startsWith("kl") || (rule === "dh1" && count === 2);
    return count < 2 ? undefined : highest ? t("highest of {count}", { count }) : lowest ? t("lowest of {count}", { count }) : undefined;
}

/** Sets the row of the sheet a check names in the middle of the window, with the focus on it, once the sheet the link leads to is drawn. */
function showRow(field: string | null | undefined): void
{
    if (field === null || field === undefined) {
        return;
    }

    const started = Date.now();

    const find = (): void => {
        const row = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(field)}"]`);

        if (row !== null) {
            row.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            row.focus({ preventScroll: true });
        } else if (Date.now() - started < 2000) {
            requestAnimationFrame(find);
        }
    };

    requestAnimationFrame(find);
}
