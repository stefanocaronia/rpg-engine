// What the master asks the player (D-279): the question, and a button for each check or answer; the click goes to the engine, which rolls the check and gives
// the master its result. Or the player's own words, in place of a button (ASK-10). A banner over the page, which never changes section by itself (D-276). By
// hand, as the player may choose for this browser, a check has no button: it is rolled from its row of the sheet or with the tray's dice (D-330).
import { Fragment } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { answer } from "./api.ts";
import type { Asked, ShownGrid } from "./data.ts";
import { Icon, NotationIcons } from "./icons.tsx";
import { checkOf, notationModifier, sameDice, signed } from "./labels.ts";
import { MapSheet } from "./map-sheet.tsx";
import { sheetAddress } from "./party.tsx";

// How far below the top the banner stays, as in the style sheet; how many characters the player's own words may have, as the server takes them.
const bannerTop = 8;
const mostWords = 500;

// Where the browser remembers that the player rolls by hand.
const handKey = "rpg-engine.rolls-by-hand";

export function AskedBanner(
    { asked, yourTurn, map, place, answered, onAnswered }: { asked: Asked; yourTurn?: boolean; map?: ShownGrid; place?: string; answered?: boolean; onAnswered(): void; },
)
{
    const [sent, setSent] = useState<number | "words" | "square">();
    const [byHand, setByHand] = useState(readByHand);
    const [picking, setPicking] = useState(false);
    const [problem, setProblem] = useState<string>();
    const [words, setWords] = useState("");
    const banner = useRef<HTMLElement>(null);
    const checks = asked.labels.map((label) => checkOf(label, asked.title));
    const roll = checks.some((check) => check !== undefined);
    const named = checks.filter((check) => check !== undefined);
    // Answered from the sheet or the tray, the banner folds away as after a click.
    const gone = sent !== undefined || answered === true;

    // While the banner is there, the rolls beside the sheet stay in sight under it, as tall as it is, even as it folds away (D-291).
    useEffect(() => {
        const element = banner.current;

        if (element === null) {
            return;
        }

        const root = document.documentElement;
        const observer = new ResizeObserver(() => root.style.setProperty("--asked-space", `${element.offsetHeight + bannerTop}px`));
        observer.observe(element);

        return () => {
            observer.disconnect();
            root.style.removeProperty("--asked-space");
        };
    }, []);

    // A question asked again takes the place of the one before: its buttons start unclicked.
    useEffect(() => {
        setSent(undefined);
        setProblem(undefined);
        setWords("");
        setPicking(false);
    }, [asked.id]);

    // A button by its place, the player's own words, or a square of the map.
    const reply = async (given: number | string | { square: string; }): Promise<void> => {
        setSent(typeof given === "number" ? given : typeof given === "string" ? "words" : "square");
        setPicking(false);
        setProblem(undefined);

        try {
            // A click that comes too late counts for nothing: the page reads what the master asks now.
            await answer(asked.id, given);
        } catch {
            setSent(undefined);
            setProblem("The answer did not reach the game: try again.");
        }

        onAnswered();
    };

    const own = (event: Event): void => {
        event.preventDefault();

        if (words.trim() !== "") {
            void reply(words.trim());
        }
    };

    return (
        // Once clicked, the banner folds away while the engine rolls, so that the page does not jump when it goes.
        <section ref={banner} class={["asked", roll ? "asked-roll" : "", gone ? "leaving" : ""].filter((name) => name !== "").join(" ")} aria-labelledby={`asked-${asked.id}`}>
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                {/* On the player's turn in a fight, the banner says so: the turn's own notice gives way to it (D-315). */}
                {yourTurn && <p class="asked-turn">Your turn</p>}
                <h2 class="asked-title">{asked.title}</h2>
                <p id={`asked-${asked.id}`} class="asked-question" role="alert">{asked.question}</p>
                {/* By hand, as a master says it: which check, with its dice as pictures; its number the player finds on the sheet. */}
                {roll && byHand && (
                    <p class="asked-hand-note">
                        <Icon name="hand" />
                        <span>
                            {"Roll "}
                            {named.map((check, index) => (
                                <Fragment key={check.check}>
                                    {index > 0 && (index === named.length - 1 ? " or " : ", ")}
                                    <a class="asked-hand-check" href={sheetAddress(asked.who ?? "")} onClick={() => showRow(asked.fields?.[asked.labels.findIndex((label) => checkOf(label, asked.title)?.check === check.check)])}>
                                        <NotationIcons notation={check.dice} />
                                        {check.check}
                                    </a>
                                </Fragment>
                            ))}
                            {" yourself, on "}
                            <a href={sheetAddress(asked.who ?? "")}>your sheet</a>
                            {" or with the dice."}
                        </span>
                    </p>
                )}
                <div class="asked-buttons">
                    {/* Where to go is chosen on the map, over the whole page (ASK-11). */}
                    {asked.square && map !== undefined && (
                        <button type="button" class={sent === "square" ? "asked-check sent" : "asked-check"} disabled={gone} onClick={() => setPicking(true)}>
                            <Icon name="world" />
                            <span class="asked-check-name">Choose on the map</span>
                        </button>
                    )}
                    {asked.labels.map((label, index) => {
                        const check = checks[index];
                        const kind = check !== undefined ? "asked-check" : roll ? "asked-other" : "asked-answer";

                        // By hand a check has no button: its row of the sheet and the tray's dice answer it; one that neither answers keeps it.
                        if (check !== undefined && byHand && byHandAnswers(asked, index)) {
                            return null;
                        }

                        return (
                            <button
                                key={label}
                                type="button"
                                class={sent === index ? `${kind} sent` : kind}
                                disabled={gone}
                                title={asked.words?.[index] ?? undefined}
                                onClick={() => void reply(index)}
                            >
                                {check === undefined ? label : <CheckLabel check={check.check} dice={check.dice} />}
                            </button>
                        );
                    })}
                </div>
                {/* The player's words, and in the banner's corner the switch to roll by hand. */}
                <div class="asked-foot">
                    <form class="asked-own" onSubmit={own}>
                        <input
                            type="text"
                            value={words}
                            maxLength={mostWords}
                            placeholder="Or write what you do…"
                            aria-label="Or write what you do"
                            disabled={gone}
                            onInput={(event) => setWords(event.currentTarget.value)}
                        />
                        <button type="submit" class="icon-button" aria-label="Send" data-tip="Send" disabled={gone || words.trim() === ""}>
                            <Icon name="send" />
                        </button>
                    </form>
                    {roll && (
                        <label class="asked-hand">
                            <input
                                type="checkbox"
                                role="switch"
                                checked={byHand}
                                onChange={(event) => {
                                    setByHand(event.currentTarget.checked);
                                    writeByHand(event.currentTarget.checked);
                                }}
                            />
                            <Icon name="hand" />
                            By hand
                        </label>
                    )}
                </div>
                {problem && <p class="asked-problem" role="alert">{problem}</p>}
            </div>
            {picking && map !== undefined && <MapSheet map={map} place={place ?? ""} question={asked.question} onPick={(square) => void reply({ square })} onClose={() => setPicking(false)} />}
        </section>
    );
}

/** Whether a check can be answered by hand: a field of the sheet it alone names, whose row lights, or dice the tray tells from the other checks'. */
function byHandAnswers(asked: Asked, index: number): boolean
{
    const field = asked.fields?.[index] ?? null;
    const ownRow = field !== null && asked.fields?.filter((other) => other === field).length === 1;
    const dice = checkOf(asked.labels[index], asked.title)?.dice;
    const ownDice = dice !== undefined && asked.labels.filter((label) => {
                const other = checkOf(label, asked.title)?.dice;
                return other !== undefined && sameDice(other, dice);
            }).length === 1;
    return ownRow || ownDice;
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

function readByHand(): boolean
{
    try {
        return localStorage.getItem(handKey) === "on";
    } catch {
        return false;
    }
}

function writeByHand(on: boolean): void
{
    try {
        localStorage.setItem(handKey, on ? "on" : "off");
    } catch {
        // The page forgets it at the next reload.
    }
}

/** A check's button (D-297): its dice as pictures, one of two faded when only one counts, its name and the number added; the notation is in the tooltip. */
function CheckLabel({ check, dice }: { check: string; dice: string; })
{
    const modifier = notationModifier(dice);
    return (
        <>
            <NotationIcons notation={dice} />
            <span class="asked-check-name">{check}</span>
            {modifier !== 0 && <span class="asked-dice">{signed(modifier)}</span>}
            <span class="visually-hidden">{dice}</span>
        </>
    );
}
