// The card of a package's question (D-507): its widget's parts in the frame of the master's question, which stays through the questions of one attempt. Its
// counts on a stage of three places; under them the roll's button, or the choices a die asks for, and the rule; once the dice have spoken, the outcome where
// the buttons were. What the dice changed moves on its marks once they land; the card stays until the player closes it.
import { useEffect, useRef, useState } from "preact/hooks";
import type { WidgetShows, WidgetTrack } from "./data.ts";
import { Drawn, Part, Text, textOf, Track } from "./extension-widgets.tsx";
import { Icon, NotationIcons } from "./icons.tsx";
import { checkOf } from "./labels.ts";
import { cardLayout, labelKey, type PackCard, type TrackChange, trackChanges } from "./pack-card.ts";
import { t } from "./text.ts";
import { turnWords } from "./turns.tsx";

/** The card; `name`, with more than one player character, whom it asks; `title`, its widget's, for a card the page saw no question of. */
export function AskCard({ card, name, title, onAnswer, onWords, onClose }: {
    card: PackCard;
    name?: string | undefined;
    title?: string | undefined;
    /** A button pressed, by its place among the question's. */
    onAnswer(index: number): void;
    /** The player's own words in place of a button (ASK-10), `focused` when the focus was in the card: whether the game took them. */
    onWords(text: string, focused: boolean): Promise<boolean>;
    /** Closed, `focused` when the focus was in the card. */
    onClose(focused: boolean): void;
})
{
    const element = useRef<HTMLElement>(null);
    // Whether the focus was on one of its buttons as it was pressed: it goes to the next question's first button, or to Close at the end.
    const pressed = useRef(false);
    // What the card showed before, what changed since, and that change in words for a screen reader.
    const look = useRef<{ said: string; shows?: WidgetShows; changes: Map<string, TrackChange>; told: string; }>({ said: "", changes: new Map(), told: "" });
    const said = JSON.stringify(card.shows);

    if (look.current.said !== said) {
        const changes = trackChanges(look.current.shows, card.shows);
        look.current = { said, shows: card.shows, changes, told: look.current.shows === undefined ? "" : toldText(card, changes) };
    }

    const { changes, told } = look.current;
    const layout = cardLayout(card.shows);
    const asked = card.ended === true ? undefined : card.asked;
    const ruled = card.asked?.rule;
    const check = card.asked === undefined ? undefined : checkOf(card.asked.labels[0] ?? "", card.asked.title);
    const question = card.title ?? asked?.question;
    const prompt = asked !== undefined && question !== asked.question ? asked.question : undefined;
    // The widget's lead is the outcome once it has a tone, good or bad; before, it names who rolls, which the line on top says.
    const outcome = layout.lead?.tone === undefined ? undefined : layout.lead;
    const id = card.key.replace(/[^a-z0-9-]/gi, "-");
    const ruleId = `ask-rule-${id}`;
    const state = card.ended === true ? "ended" : card.sent !== undefined ? "rolling" : "asking";
    // The player's own words, as in the master's question: while they go, and what went wrong.
    const [words, setWords] = useState("");
    const [saying, setSaying] = useState(false);
    const [problem, setProblem] = useState<string>();
    const busy = card.sent !== undefined || saying;

    // While it stays in sight, the rolls beside the sheet stay in sight under it, as under the master's question (D-291); once it scrolls with the page, not.
    useEffect(() => {
        const box = element.current;

        if (box === null) {
            return;
        }

        const root = document.documentElement;

        const publish = (): void => {
            if (getComputedStyle(box).position === "sticky") {
                root.style.setProperty("--asked-space", `${box.offsetHeight + 16}px`);
            } else {
                root.style.removeProperty("--asked-space");
            }
        };

        const observer = new ResizeObserver(publish);
        observer.observe(box);
        publish();

        return () => {
            observer.disconnect();
            root.style.removeProperty("--asked-space");
        };
    }, [card.ended]);

    // The button pressed gone, the focus that was on it goes to the next question's first button, or to Close once the card has its outcome.
    useEffect(() => {
        if (!pressed.current || element.current === null || element.current.contains(document.activeElement)) {
            return;
        }

        const next = element.current.querySelector<HTMLElement>(card.ended === true ? ".ask-close" : ".ask-choices button:not([aria-disabled='true'])");

        if (next !== null) {
            pressed.current = false;
            next.focus();
        }
    }, [card.asked?.id, card.ended]);

    const press = (index: number): void => {
        if (card.sent !== undefined) {
            return;
        }

        pressed.current = element.current?.contains(document.activeElement) === true;
        onAnswer(index);
    };

    const say = async (event: Event): Promise<void> => {
        event.preventDefault();
        const text = words.trim();

        if (text === "" || busy) {
            return;
        }

        setSaying(true);
        setProblem(undefined);

        if (await onWords(text, element.current?.contains(document.activeElement) === true)) {
            return;
        }

        setSaying(false);
        setProblem(t("The answer did not reach the game: try again."));
    };

    const place = (stage: NonNullable<WidgetTrack["stage"]>) => {
        const tracks = layout.places[stage];
        // The facts under the counts at the end, or in the middle when none is at the end.
        const facts = stage === (layout.places.end.length > 0 ? "end" : "center") ? layout.facts : [];
        return (
            <div class={`ask-place at-${stage}`}>
                {tracks.map((track) => <Track key={labelKey(track.label)} track={track} place={stage} change={changes.get(labelKey(track.label))} />)}
                {facts.length > 0 && (
                    <ul class="chips ask-facts">
                        {facts.map((fact, index) => (
                            <li key={index} dir="auto">
                                <Text text={fact} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    return (
        <section ref={element} class={`asked ask-card ${state}`} aria-labelledby={`ask-${id}`}>
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                {card.ended === true && (
                    <button type="button" class="icon-button ask-close" aria-label={t("Close")} data-tip={t("Close")} onClick={() => onClose(element.current?.contains(document.activeElement) === true)}>
                        <Icon name="close" />
                    </button>
                )}
                <p class="eyebrow asked-turn">{check === undefined ? title ?? turnWords(name) : `${turnWords(name)} · ${check.check}`}</p>
                <p id={`ask-${id}`} class="asked-question" role={asked !== undefined && prompt === undefined ? "alert" : undefined}>{question ?? title}</p>
                <div class="ask-stage">
                    {place("start")}
                    {place("center")}
                    {place("end")}
                </div>
                {layout.others.length > 0 && <div class="ask-others">{layout.others.map((part, index) => <Part key={index} part={part} />)}</div>}
                <div class="ask-foot">
                    {asked !== undefined && (
                        <>
                            {prompt !== undefined && <p class="ask-prompt" role="alert">{prompt}</p>}
                            <div class="ask-choices">
                                {asked.labels.map((label, index) => {
                                    const roll = checkOf(label, asked.title);
                                    const own = asked.buttons?.[index] ?? undefined;
                                    // A choice that says what it costs, as "it resets", in the red of what is lost; else a plain button.
                                    const kind = roll !== undefined ? "ask-roll" : own?.note !== undefined ? "button danger ask-leave" : "button ask-leave";
                                    return (
                                        <button
                                            key={`${asked.id} ${index}`}
                                            type="button"
                                            class={card.sent === index ? `${kind} sent` : kind}
                                            aria-disabled={card.sent === undefined ? undefined : "true"}
                                            aria-describedby={ruled === undefined ? undefined : ruleId}
                                            onClick={() => press(index)}
                                        >
                                            {roll !== undefined && <NotationIcons notation={roll.dice} />}
                                            <span class="asked-check-name">{own?.name ?? roll?.check ?? label}</span>
                                            {own?.note !== undefined && <span class="ask-note">{own.note}</span>}
                                            {roll !== undefined && <span class="visually-hidden">{roll.dice}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    {/* The outcome where the buttons were, as tall, so that the page does not move; a screen reader hears it from the status below. */}
                    {asked === undefined && outcome !== undefined && (
                        <p class={outcome.tone === undefined ? "ask-outcome" : `ask-outcome ${outcome.tone}`} aria-hidden="true">
                            {outcome.icon !== undefined && <Drawn path={outcome.icon} kind="ask-outcome-icon" />}
                            <span dir="auto">
                                <Text text={outcome.lead} />
                            </span>
                        </p>
                    )}
                    {asked === undefined && layout.texts.map((text, index) => (
                        <p key={index} class="ask-then" dir="auto">
                            <Text text={text} />
                        </p>
                    ))}
                    {ruled !== undefined && <p id={ruleId} class="ask-rule" dir="auto">{ruled}</p>}
                    {/* The player's own words in place of a button, as in the master's question (ASK-10). */}
                    {asked !== undefined && (
                        <form class="asked-own ask-own" onSubmit={(event) => void say(event)}>
                            <input
                                type="text"
                                value={words}
                                maxLength={mostWords}
                                placeholder={t("Or write what you do…")}
                                aria-label={t("Or write what you do")}
                                disabled={busy}
                                onInput={(event) => setWords(event.currentTarget.value)}
                            />
                            <button type="submit" class="icon-button" aria-label={t("Send")} data-tip={t("Send")} disabled={busy || words.trim() === ""}>
                                <Icon name="send" />
                            </button>
                        </form>
                    )}
                    {problem !== undefined && <p class="asked-problem" role="alert">{problem}</p>}
                </div>
                <p class="visually-hidden" role="status">{told}</p>
            </div>
        </section>
    );
}

// How many characters the player's own words may have, as the server takes them.
const mostWords = 500;

/** What a look of the card changed, for a screen reader, once: its outcome, then each count that changed, as "Failed. Pins: 0 of 6. Failures: 3 of 4." */
function toldText(card: PackCard, changes: Map<string, TrackChange>): string
{
    const layout = cardLayout(card.shows);
    const lead = layout.lead?.tone === undefined ? "" : `${textOf(layout.lead.lead)}.`;
    const counts = Object.values(layout.places).flat().filter((track) => changes.has(labelKey(track.label))).map((track) => `${textOf(track.label)}: ${t("{value} of {max}", { value: track.value + (track.held ?? 0), max: track.max })}.`);
    return [lead, ...counts].filter((part) => part !== "").join(" ");
}
