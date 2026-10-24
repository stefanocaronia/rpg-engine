// What the master asks the player (D-279): the question, and a button for each check or answer; the click goes to the engine, which rolls the check and gives
// the master its result. Or the player's own words, in place of a button (ASK-10). A banner over the page, which never changes section by itself (D-276). By
// hand, as the player may choose for this browser, a check has no button: it is rolled from its row of the sheet or with the tray's dice (D-330).
import { Fragment } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { answer } from "./api.ts";
import type { Asked, ShownGrid } from "./data.ts";
import { trayThrows } from "./dice/pool.ts";
import { notationLabel } from "./game-words.ts";
import { Icon, NotationIcons } from "./icons.tsx";
import { checkOf, notationModifier, sameDice, signed } from "./labels.ts";
import { MapSheet } from "./map-sheet.tsx";
import { sheetAddress } from "./party.tsx";
import { byHandPref, usePref } from "./prefs.ts";
import { t, tParts } from "./text.ts";

// How far below the top the banner stays, as in the style sheet; how many characters the player's own words may have, as the server takes them.
const bannerTop = 16;
const mostWords = 500;
// How much of the question a folded bar keeps in sight beside its answers, in pixels, on a wide screen.
const questionRoom = 240;
// The question is whole at the very top of the page. It folds once the player has scrolled down, from the highest point since it was whole, its own height
// and this share of the window more: the page they read has gone past it, not a nudge.
const topOfPage = 8;
const furtherShare = 0.4;
// How long after the wheel, a key, the scroll bar or a finger's fling a scroll is still the player's; any other is the page's own, and counts for nothing.
const wheelTime = 800;
const flingTime = 2500;
// How long the question takes to fold or open, the style sheet's --short, its height eased out as it opens and in as it folds.
const foldTime = 250;
const easeOut = "cubic-bezier(0.05, 0.7, 0.1, 1)";
const easeIn = "cubic-bezier(0.3, 0, 0.8, 0.15)";
const scrollKeys = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);

export function AskedBanner(
    { asked, yourTurn, map, place, answered, onAnswered }: { asked: Asked; yourTurn?: boolean; map?: ShownGrid; place?: string; answered?: boolean; onAnswered(): void; },
)
{
    // Folded to a bar that stays in sight, the checks still in it: by the player, even at the top of the page, until they open it or a new question comes;
    // or down the page. How it changed last, for its motion.
    const [folded, setFolded] = useState<false | "hand" | "scroll">(false);
    const [motion, setMotion] = useState<"" | "folding" | "opening">("");
    const foldedNow = useRef(folded);
    foldedNow.current = folded;
    const unfolding = useRef(false);
    // Opened by the player, it stays open until they fold it or a new question comes.
    const opened = useRef(false);
    // The highest point of the page the player has scrolled to since the question was whole, and where the page was at the last look.
    const travel = useRef({ from: window.scrollY, last: window.scrollY });
    // Its height before it folded or opened, which it grows or shrinks from; folded down the page, the room it kept open, its height and margin, so that the
    // page under it neither moves nor changes its length.
    const before = useRef<number>();
    const kept = useRef<{ height: number; margin: number; }>();
    const moving = useRef(false);
    const [sent, setSent] = useState<number | "words" | "square">();
    const [byHand, setByHand] = usePref(byHandPref);
    const [picking, setPicking] = useState(false);
    const [problem, setProblem] = useState<string>();
    const [words, setWords] = useState("");
    const banner = useRef<HTMLElement>(null);
    const checks = asked.labels.map((label) => checkOf(label, asked.title));
    const roll = checks.some((check) => check !== undefined);
    // Folded, every answer stays in the bar while they all fit in a line beside the question; else only the checks. Their width, measured while all shown.
    const [roomy, setRoomy] = useState(true);
    const needed = useRef(0);

    // A new question measures its own answers afresh.
    useEffect(() => {
        needed.current = 0;
        setRoomy(true);
    }, [asked.id]);

    useLayoutEffect(() => {
        const element = banner.current;

        if (folded === false || element === null) {
            return;
        }

        const measure = (): void => {
            const buttons = element.querySelector<HTMLElement>(".asked-buttons");

            if (roomy && buttons !== null) {
                needed.current = buttons.scrollWidth;
            }

            setRoomy(needed.current <= foldedRoom(element));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [folded, asked.id, roomy]);
    // By hand, the note names the checks the sheet or the tray answer; the others keep their buttons (D-380).
    const named = checks.flatMap((check, index) => (check !== undefined && byHandAnswers(asked, index) ? [check] : []));
    // Answered from the sheet or the tray, the banner folds away as after a click.
    const gone = sent !== undefined || answered === true;

    // While the banner is there, the rolls beside the sheet stay in sight under it, as tall as it is, even as it folds away (D-291); folding to its bar or
    // opening, once it has its new height, as the page restyles itself at each change.
    useEffect(() => {
        const element = banner.current;

        if (element === null) {
            return;
        }

        const root = document.documentElement;
        const observer = new ResizeObserver(() => !moving.current && publishSpace(element));
        observer.observe(element);

        return () => {
            observer.disconnect();
            root.style.removeProperty("--asked-space");
            freePage();
        };
    }, []);

    // A question asked again takes the place of the one before: its buttons start unclicked, and it folds again as the page scrolls.
    useEffect(() => {
        opened.current = false;
        travel.current = { from: window.scrollY, last: window.scrollY };
        setSent(undefined);
        setProblem(undefined);
        setWords("");
        setPicking(false);
        setFolded(false);
        setMotion("");
    }, [asked.id]);

    // Opened or folded by the player, the focus stays on the button that undoes it, drawn anew.
    useEffect(() => {
        const element = banner.current;

        if (element === null || !unfolding.current) {
            return;
        }

        unfolding.current = false;
        element.querySelector<HTMLElement>(".asked-fold")?.focus();
    }, [folded]);

    // Folded or opened, the question eases from its old height to its new one, its content fading in, unless the player asks for less motion. Folded down
    // the page, its margin grows by what its height loses, so that the page keeps its length and its place.
    useLayoutEffect(() => {
        const element = banner.current;

        if (element === null) {
            return;
        }

        const from = before.current;
        before.current = undefined;
        const room = kept.current;

        if (room !== undefined) {
            holdPage();
        }

        // In the room it keeps, height and margin always make the same: also from a height caught halfway, when the player opens it as it folds.
        const to = element.getBoundingClientRect().height;
        const marginFrom = room === undefined || from === undefined ? Number.parseFloat(getComputedStyle(element).marginBottom) : room.margin + room.height - from;
        const marginTo = room === undefined ? marginFrom : folded === false ? room.margin : room.margin + room.height - to;

        // Its last state; the page free to hold on to what the player reads only when no other motion follows.
        const settle = (last = true): void => {
            if (last) {
                freePage();
            }

            moving.current = false;

            if (folded === false || room === undefined) {
                element.style.removeProperty("margin-bottom");
                kept.current = undefined;
            } else {
                element.style.marginBottom = `${marginTo}px`;
            }

            publishSpace(element);
        };

        if (from === undefined || matchMedia("(prefers-reduced-motion: reduce)").matches) {
            settle();
            return;
        }

        // Its margin at the end at once, under the animation, which holds the start until it plays.
        element.style.marginBottom = `${marginTo}px`;
        moving.current = true;
        const easing = folded === false ? easeOut : easeIn;
        const motion = element.animate(
            [{ height: `${from}px`, marginBottom: `${marginFrom}px`, overflow: "hidden" }, { height: `${to}px`, marginBottom: `${marginTo}px`, overflow: "hidden" }],
            { duration: foldTime, easing },
        );
        motion.onfinish = () => settle();

        return () => {
            motion.onfinish = null;
            motion.cancel();
            settle(false);
        };
    }, [folded]);

    // Scrolled down by the player far enough, past the page's header and stuck at the top, the question folds to its bar; back at the very top it is whole.
    // Never when the player folded or opened it, has the keyboard in it, or has answered. A scroll that is not the player's, as the page holding on to what
    // they read while something above it changes its height, moves where the count starts with it.
    useEffect(() => {
        const change = (element: HTMLElement, now: false | "scroll"): void => {
            const box = element.getBoundingClientRect();

            if (now === "scroll") {
                kept.current = { height: box.height, margin: Number.parseFloat(getComputedStyle(element).marginBottom) };
            }

            holdPage();
            before.current = box.height;
            setMotion(now === false ? "opening" : "folding");
            setFolded(now);
        };

        // Until when a scroll is the player's: the wheel, a key, a finger or the scroll bar.
        let theirsUntil = 0;
        let held = false;

        const theirs = (time: number) => (): void => {
            theirsUntil = Math.max(theirsUntil, performance.now() + time);
        };

        const wheel = theirs(wheelTime);
        const fling = theirs(flingTime);

        const key = (event: KeyboardEvent): void => {
            const typing = event.target instanceof HTMLElement && event.target.closest(event.key === " " ? "input, textarea, select, [contenteditable], button, summary, a" : "input, textarea, select, [contenteditable]") !== null;

            if (scrollKeys.has(event.key) && !typing) {
                wheel();
            }
        };

        // A finger on the page, or the pointer on the scroll bar, which the page itself is the target of.
        const press = (event: Event): void => {
            held = event.type === "touchstart" || event.target === document.documentElement;
        };

        const release = (): void => {
            if (held) {
                held = false;
                fling();
            }
        };

        // Read once a frame, however often the page scrolls.
        let queued = false;

        const queue = (): void => {
            if (!queued) {
                queued = true;
                requestAnimationFrame(() => {
                    queued = false;
                    onScroll();
                });
            }
        };

        const onScroll = (): void => {
            const element = banner.current;
            const now = window.scrollY;
            const count = travel.current;

            if (held || performance.now() < theirsUntil) {
                count.from = Math.min(count.from, now);
            } else {
                count.from += now - count.last;
            }

            count.last = now;

            if (element === null || gone || picking || moving.current || foldedNow.current === "hand" || element.querySelector(":focus-visible") !== null) {
                return;
            }

            if (now <= topOfPage) {
                count.from = now;

                if (foldedNow.current === "scroll") {
                    change(element, false);
                }

                return;
            }

            // The top has drawn itself together first, and is still; the question stuck under it.
            const header = document.querySelector<HTMLElement>(".top.compact");
            const still = header !== null && !header.getAnimations({ subtree: true }).some((running) => running instanceof CSSTransition);
            const stuck = element.getBoundingClientRect().top <= Number.parseFloat(getComputedStyle(element).top) + 1;
            const further = element.offsetHeight + window.innerHeight * furtherShare;

            if (foldedNow.current === false && !opened.current && still && stuck && now - count.from >= further) {
                change(element, "scroll");
            }
        };

        // The top done drawing itself together, the question may fold where the page already is.
        const settled = (event: TransitionEvent): void => {
            if (event.target instanceof Element && event.target.closest(".top") !== null) {
                queue();
            }
        };

        window.addEventListener("scroll", queue, { passive: true });
        window.addEventListener("wheel", wheel, { passive: true });
        window.addEventListener("keydown", key);
        window.addEventListener("pointerdown", press);
        window.addEventListener("pointerup", release);
        window.addEventListener("touchstart", press, { passive: true });
        window.addEventListener("touchend", release);
        window.addEventListener("touchcancel", release);
        document.addEventListener("transitionend", settled);

        return () => {
            window.removeEventListener("scroll", queue);
            window.removeEventListener("wheel", wheel);
            window.removeEventListener("keydown", key);
            window.removeEventListener("pointerdown", press);
            window.removeEventListener("pointerup", release);
            window.removeEventListener("touchstart", press);
            window.removeEventListener("touchend", release);
            window.removeEventListener("touchcancel", release);
            document.removeEventListener("transitionend", settled);
        };
    }, [gone, picking]);

    // Folded or opened by the player, it stays so until they change it or a new question comes.
    const fold = (now: boolean): void => {
        unfolding.current = true;
        opened.current = !now;
        before.current = banner.current?.getBoundingClientRect().height;

        if (kept.current !== undefined) {
            holdPage();
        }

        setMotion(now ? "folding" : "opening");
        setFolded(now ? "hand" : false);
    };

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
            setProblem(t("The answer did not reach the game: try again."));
        }

        onAnswered();
    };

    const own = (event: Event): void => {
        event.preventDefault();

        if (words.trim() !== "") {
            void reply(words.trim());
        }
    };

    // A check's button, or an answer's; by hand a check has none, as its row of the sheet and the tray's dice answer it, unless neither does.
    const answerButton = (label: string, index: number, onlyChecks = false) => {
        const check = checks[index];
        const kind = check !== undefined ? "asked-check" : roll ? "asked-other" : "asked-answer";

        if ((check !== undefined && byHand && byHandAnswers(asked, index)) || (onlyChecks && check === undefined)) {
            return null;
        }

        return (
            <button
                key={label}
                type="button"
                class={sent === index ? `${kind} sent` : kind}
                disabled={gone}
                title={notationLabel(asked.words?.[index] ?? undefined)}
                onClick={() => void reply(index)}
            >
                {check === undefined ? label : <CheckLabel check={check.check} dice={check.dice} name={asked.names?.[index] ?? keptName(check.dice)} />}
            </button>
        );
    };

    const classes = ["asked", roll ? "asked-roll" : "", gone ? "leaving" : "", folded === false ? "" : "folded", motion].filter((name) => name !== "").join(" ");
    const toggle = (
        <button
            type="button"
            class="icon-button asked-fold"
            aria-expanded={folded === false}
            aria-label={folded === false ? t("Fold the question") : t("Open the question")}
            data-tip={folded === false ? t("Fold the question") : undefined}
            onClick={() => fold(folded === false)}
        >
            {folded === false && <Icon name="minus" />}
        </button>
    );

    if (folded !== false) {
        // Folded, a bar the whole width: the question in a line, its answers when they fit or else the checks' buttons, and the button that opens it again.
        const shown = asked.labels.map((label, index) => answerButton(label, index, !roomy)).filter((button) => button !== null);
        return (
            <section ref={banner} class={classes} aria-label={t("What the master asks")}>
                <img class="asked-robot" src="/assets/favicon.svg" alt="" />
                <p class="asked-bar-question">{asked.question}</p>
                {shown.length > 0 && <div class="asked-buttons">{shown}</div>}
                {toggle}
            </section>
        );
    }

    return (
        // Once clicked, the banner folds away while the engine rolls, so that the page does not jump when it goes.
        <section ref={banner} class={classes} aria-labelledby={`asked-${asked.id}`}>
            {toggle}
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                {/* On the player's turn in a fight, the banner says so: the turn's own notice gives way to it (D-315). */}
                {yourTurn && <p class="eyebrow asked-turn">{t("Your turn")}</p>}
                <h2 class="asked-title">{asked.title}</h2>
                <p id={`asked-${asked.id}`} class="asked-question" role="alert">{asked.question}</p>
                {/* By hand, as a master says it: which check, with its dice as pictures; its number the player finds on the sheet. */}
                {named.length > 0 && byHand && (
                    <p class="asked-hand-note">
                        <Icon name="hand" />
                        <span>
                            {tParts("Roll {checks} yourself, on {sheet} or with the dice.", {
                                checks: named.map((check, index) => (
                                    <Fragment key={check.check}>
                                        {index > 0 && (index === named.length - 1 ? ` ${t("or")} ` : ", ")}
                                        <a class="asked-hand-check" href={sheetAddress(asked.who ?? "")} onClick={() => showRow(asked.fields?.[asked.labels.findIndex((label) => checkOf(label, asked.title)?.check === check.check)])}>
                                            <NotationIcons notation={check.dice} />
                                            {check.check}
                                        </a>
                                    </Fragment>
                                )),
                                sheet: <a href={sheetAddress(asked.who ?? "")}>{t("your sheet")}</a>,
                            }).map((part, index) => <Fragment key={index}>{part}</Fragment>)}
                        </span>
                    </p>
                )}
                <div class="asked-buttons">
                    {/* Where to go is chosen on the map, over the whole page (ASK-11). */}
                    {asked.square && map !== undefined && (
                        <button type="button" class={sent === "square" ? "asked-check sent" : "asked-check"} disabled={gone} onClick={() => setPicking(true)}>
                            <Icon name="world" />
                            <span class="asked-check-name">{t("Choose on the map")}</span>
                        </button>
                    )}
                    {asked.labels.map((label, index) => answerButton(label, index))}
                </div>
                {/* The player's words, and in the banner's corner the switch to roll by hand. */}
                <div class="asked-foot">
                    <form class="asked-own" onSubmit={own}>
                        <input
                            type="text"
                            value={words}
                            maxLength={mostWords}
                            placeholder={t("Or write what you do…")}
                            aria-label={t("Or write what you do")}
                            disabled={gone}
                            onInput={(event) => setWords(event.currentTarget.value)}
                        />
                        <button type="submit" class="icon-button" aria-label={t("Send")} data-tip={t("Send")} disabled={gone || words.trim() === ""}>
                            <Icon name="send" />
                        </button>
                    </form>
                    {roll && (
                        <label class="asked-hand">
                            <input
                                type="checkbox"
                                role="switch"
                                checked={byHand}
                                onChange={(event) => setByHand(event.currentTarget.checked)}
                            />
                            <Icon name="hand" />
                            {t("By hand")}
                        </label>
                    )}
                </div>
                {problem && <p class="asked-problem" role="alert">{problem}</p>}
            </div>
            {picking && map !== undefined && <MapSheet map={map} place={place ?? ""} question={asked.question} onPick={(square) => void reply({ square })} onClose={() => setPicking(false)} />}
        </section>
    );
}

/** The width the folded bar leaves its answers: beside the robot and some of the question on a wide screen; a line of their own on a phone. */
function foldedRoom(element: HTMLElement): number
{
    const style = getComputedStyle(element);
    const inner = element.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
    const robot = element.querySelector<HTMLElement>(".asked-robot");
    const gap = Number.parseFloat(style.columnGap) || 0;
    const beside = matchMedia("(max-width: 600px)").matches ? 0 : (robot?.offsetWidth ?? 0) + questionRoom + 2 * gap;
    return inner - beside;
}

/** Tells what stays on top beside the page, the rolls, how much room the question takes. */
function publishSpace(element: HTMLElement): void
{
    document.documentElement.style.setProperty("--asked-space", `${element.offsetHeight + bannerTop}px`);
}

/**
 * Keeps the page where it is while the question changes its height and margin by the same amount: the browser would otherwise move the page for the moment
 * the question is measured at its new height, and stop at its top. Chrome reads it from the body as well as from the root.
 */
function holdPage(): void
{
    document.documentElement.style.overflowAnchor = "none";
    document.body.style.overflowAnchor = "none";
}

/** Lets the browser hold on to what the player reads again. */
function freePage(): void
{
    document.documentElement.style.removeProperty("overflow-anchor");
    document.body.style.removeProperty("overflow-anchor");
}

/** Whether a check can be answered by hand: a field of the sheet it alone names, whose row lights, or dice the tray can throw and tells from the other checks'. */
function byHandAnswers(asked: Asked, index: number): boolean
{
    const field = asked.fields?.[index] ?? null;
    const ownRow = field !== null && asked.fields?.filter((other) => other === field).length === 1;
    const dice = checkOf(asked.labels[index], asked.title)?.dice;
    const ownDice = dice !== undefined && trayThrows(dice) && asked.labels.filter((label) => {
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
