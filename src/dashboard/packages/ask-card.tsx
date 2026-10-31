// The card of a package's question (D-507, D-509): its widget's parts in the frame of the master's question, which stays through the questions of one attempt.
// Who acts on the left, the count drawn large in the middle, the others one over the other on the right; under them the roll's button, or the choices a die
// asks for, and the rule; once the dice have spoken, the outcome where the buttons were. Its extension's page code may draw the middle's figure, or the
// whole inside, the frame staying the page's (D-510). What the dice changed moves once they land; the card stays until the player closes it.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Asked, RestDice, ShownWidget, WidgetShows } from "../data.ts";
import { Icon, NotationIcons } from "../icons.tsx";
import { checkOf, fieldLabel } from "../labels.ts";
import { t } from "../text.ts";
import { turnWords } from "../turns.tsx";
import { cardLayout, type CardRoll, labelKey, type PackCard, type TrackChange, trackChanges } from "./card.ts";
import { type CardButton, deepQuery, ExtensionRoot, figureSize, type PageModule, pagePropsOf, usePageModule } from "./page-code.tsx";
import { Drawn, OwnerContext, Part, Text, textOf, Track, Who } from "./widgets.tsx";

/** The card; `name`, with more than one player character, whom it asks; `widget`, whose card it is, its title for a card the page saw no question of. */
export function AskCard({ card, name, widget, onAnswer, onWords, onClose }: {
    card: PackCard;
    name?: string | undefined;
    widget?: ShownWidget | undefined;
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
    // What the card showed, and before it, what changed since, and that change in words for a screen reader.
    const look = useRef<{ said: string; shows?: WidgetShows; before?: WidgetShows; changes: Map<string, TrackChange>; told: string; }>({ said: "", changes: new Map(), told: "" });
    const said = JSON.stringify(card.shows);

    if (look.current.said !== said) {
        const changes = trackChanges(look.current.shows, card.shows);
        const before = look.current.shows === undefined ? {} : { before: look.current.shows };
        look.current = { said, shows: card.shows, ...before, changes, told: look.current.shows === undefined ? "" : toldText(card, changes) };
    }

    const { changes, told } = look.current;
    const layout = cardLayout(card.shows);
    const asked = card.ended === true ? undefined : card.asked;
    const ruled = card.asked?.rule;
    const check = card.asked === undefined ? undefined : checkOf(card.asked.labels[0] ?? "", card.asked.title);
    // The dice of a rest are asked in it one at a time, the same question until its end (ASK-14).
    const rest = card.asked?.spend;
    const question = card.title ?? asked?.question;
    const prompt = asked !== undefined && question !== asked.question ? asked.question : undefined;
    // The widget's lead is the outcome once it has a tone, good or bad; before, it names who rolls, which the line on top says.
    const outcome = layout.lead?.tone === undefined ? undefined : layout.lead;
    const id = card.key.replace(/[^a-z0-9-]/gi, "-");
    const ruleId = `ask-rule-${id}`;
    const state = card.ended === true ? "ended" : card.sent !== undefined ? "rolling" : "asking";
    // The extension's page code, when it has one: it may draw the whole inside of this card (D-510).
    const loaded = usePageModule(widget);
    const body = widget?.module === undefined ? undefined : card.shows.body;
    // The player's own words, as in the master's question: while they go, and what went wrong.
    const [words, setWords] = useState("");
    const [saying, setSaying] = useState(false);
    const [problem, setProblem] = useState<string>();
    const busy = card.sent !== undefined || saying;
    // The player's own words take no forced roll's place, nor a rest's dice (D-507, ASK-14).
    const takesWords = asked !== undefined && asked.forced !== true && rest === undefined;

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

    // The button pressed gone, the focus that was on it goes to the next question's first button, or to Close once the card has its outcome; in an
    // extension's drawing too.
    useEffect(() => {
        if (!pressed.current || element.current === null || (element.current.contains(document.activeElement) && deepActive()?.classList.contains("ext-root") !== true)) {
            return;
        }

        const next = deepQuery(element.current, card.ended === true ? ".ask-close" : ".ask-choices button:not([aria-disabled='true'])");

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

    const tracksOf = (stage: "start" | "center" | "end") => layout.places[stage].map((track) => <Track key={labelKey(track.label)} track={track} place={stage} change={changes.get(labelKey(track.label))} />);
    const side = layout.places.start.length + layout.places.end.length > 0;
    // The facts under the counts at the side, or in the middle when none is there.
    const facts = layout.facts.length === 0 ? null : (
        <ul class="chips ask-facts">
            {layout.facts.map((fact, index) => (
                <li key={index} dir="auto">
                    <Text text={fact} />
                </li>
            ))}
        </ul>
    );
    const choices = asked === undefined ? undefined : rest === undefined ? cardAskedOf(asked, prompt) : restAskedOf(asked, rest);

    // The inside the page draws: who acts, the middle, the side; the others; the buttons, the outcome and the rule.
    const inside = (
        <>
            <div class={layout.who === undefined ? "ask-stage" : "ask-stage with-who"}>
                {layout.who !== undefined && (
                    <div class="ask-place at-who">
                        <Who who={layout.who.who} does={layout.who.does} />
                    </div>
                )}
                <div class="ask-place at-center">
                    {tracksOf("center")}
                    {!side && facts}
                </div>
                {side && (
                    <div class="ask-place at-side">
                        {tracksOf("start")}
                        {tracksOf("end")}
                        {facts}
                    </div>
                )}
            </div>
            {layout.others.length > 0 && <div class="ask-others">{layout.others.map((part, index) => <Part key={index} part={part} />)}</div>}
            <div class="ask-foot">
                {choices !== undefined && asked !== undefined && (
                    <>
                        {choices.prompt !== undefined && <p class="ask-prompt" role="alert">{choices.prompt}</p>}
                        <Choices key={asked.id} buttons={choices.buttons} sent={card.sent} describedBy={ruled === undefined ? undefined : ruleId} onChoose={press} />
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
            </div>
        </>
    );

    return (
        // The package's tint of the moment, as the 5e's death save, frames it in its colour, without the robot (D-517).
        <section ref={element} class={`asked ask-card ${state}${card.shows.tint === undefined ? "" : ` tinted tint-${card.shows.tint}`}`} aria-labelledby={`ask-${id}`}>
            <img class="asked-robot" src="/assets/favicon.svg" alt="" />
            <div class="asked-body">
                {card.ended === true && (
                    <button type="button" class="icon-button ask-close" aria-label={t("Close")} data-tip={t("Close")} onClick={() => onClose(element.current?.contains(document.activeElement) === true)}>
                        <Icon name="close" />
                    </button>
                )}
                <p class="eyebrow asked-turn">{rest !== undefined ? card.asked?.title : check === undefined ? widget?.title ?? turnWords(name) : `${turnWords(name)} · ${check.check}`}</p>
                <p id={`ask-${id}`} class="asked-question" role={asked !== undefined && prompt === undefined ? "alert" : undefined}>{question ?? widget?.title}</p>
                {body !== undefined && widget !== undefined
                    ? (
                        <ExtensionRoot
                            widget={widget}
                            loaded={loaded}
                            kind="ext-card"
                            draw={(module) => (
                                <OwnBody
                                    module={module}
                                    name={body}
                                    widget={widget}
                                    shows={card.shows}
                                    before={look.current.before}
                                    rest={rest}
                                    rolled={card.rolled}
                                    asked={choices}
                                    sent={card.sent}
                                    ended={card.ended === true}
                                    answer={press}
                                />
                            )}
                        />
                    )
                    : widget === undefined
                    ? inside
                    : <OwnerContext.Provider value={{ widget, loaded, data: card.shows.data, place: "ask" }}>{inside}</OwnerContext.Provider>}
                {/* The player's own words in place of a button, as in the master's question (ASK-10): always the page's. */}
                {takesWords && (
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
                <p class="visually-hidden" role="status">{told}</p>
            </div>
        </section>
    );
}

/**
 * The buttons of a question in a card, as the page draws them, for its own card and an extension's (D-510): a roll in gold with its dice, a choice that
 * loses something with a red edge, any other plain; the one pressed marked while its answer goes, the others waiting.
 */
export function Choices({ buttons, sent, describedBy, onChoose }: { buttons: CardButton[]; sent?: number | undefined; describedBy?: string | undefined; onChoose(index: number): void; })
{
    return (
        <div class="ask-choices">
            {buttons.map((button, index) => {
                const kind = button.dice !== undefined ? "ask-roll" : button.danger === true ? "button danger ask-leave" : "button ask-leave";
                return (
                    <button
                        key={index}
                        type="button"
                        class={sent === index ? `${kind} sent` : kind}
                        aria-disabled={sent === undefined ? undefined : "true"}
                        aria-describedby={describedBy}
                        onClick={() => onChoose(index)}
                    >
                        {button.dice !== undefined && <NotationIcons notation={button.dice} />}
                        <span class="asked-check-name">{button.name}</span>
                        {/* Words apart for a screen reader too: Reroll, you have 2, 1d6. */}
                        {button.note !== undefined && <span class="ask-note">{` ${button.note}`}</span>}
                        {button.dice !== undefined && <span class="visually-hidden">{` ${button.dice}`}</span>}
                    </button>
                );
            })}
        </div>
    );
}

/** The buttons of the dice of a rest as a card shows them (ASK-14): a die of each counter, in their order, then the one that ends it. */
function restAskedOf(asked: Asked, rest: RestDice): CardAsked
{
    return { buttons: [...rest.dice.map((dice) => ({ name: fieldLabel(dice.field), dice: `1d${dice.sides}` })), { name: asked.labels[0] ?? "" }] };
}

/** The buttons of a question as a card shows them: each its name, its note and its dice when it rolls; the question a die asks, and the rule. */
export function cardAskedOf(asked: Asked, prompt?: string): CardAsked
{
    const buttons = asked.labels.map((label, index) => {
        const roll = checkOf(label, asked.title);
        const own = asked.buttons?.[index] ?? undefined;
        const note = own?.note === undefined ? {} : { note: own.note };
        // A choice that says what it costs, as "it resets", in the red of what is lost.
        return { name: own?.name ?? roll?.check ?? label, ...note, ...(roll === undefined ? (own?.note === undefined ? {} : { danger: true }) : { dice: roll.dice }) };
    });
    return { buttons, ...(prompt === undefined ? {} : { prompt }), ...(asked.rule === undefined ? {} : { rule: asked.rule }) };
}

// How many characters the player's own words may have, as the server takes them.
const mostWords = 500;

/** The whole inside of a card of a roll as its extension's page code draws it (D-510): its body, a figure with the question's buttons. */
function OwnBody({ module, name, widget, shows, before, rest, rolled, asked, sent, ended, answer }: {
    module: PageModule;
    name: string;
    widget: ShownWidget;
    shows: WidgetShows;
    before?: WidgetShows | undefined;
    rest?: RestDice | undefined;
    rolled?: CardRoll | undefined;
    asked?: CardAsked | undefined;
    sent?: number | undefined;
    ended: boolean;
    answer(index: number): void;
})
{
    const Drawing = module.bodies?.[name];

    if (Drawing === undefined) {
        throw new Error(`its page module has no body ${name}`);
    }

    return (
        <Drawing
            {...pagePropsOf(widget)}
            name={name}
            data={shows.data}
            {...(before === undefined ? {} : { before: before.data })}
            place="ask"
            size={figureSize(widget, name)}
            parts={shows.parts ?? []}
            {...(rest === undefined ? {} : { rest })}
            {...(rolled === undefined ? {} : { rolled })}
            buttons={asked?.buttons ?? []}
            {...(asked?.prompt === undefined ? {} : { prompt: asked.prompt })}
            {...(asked?.rule === undefined ? {} : { rule: asked.rule })}
            {...(sent === undefined ? {} : { sent })}
            ended={ended}
            answer={answer}
        />
    );
}

/** The buttons of a question as a card shows them, with the question a die asks over them and the rule under them. */
interface CardAsked
{
    prompt?: string;
    buttons: CardButton[];
    rule?: string;
}

/** The element with the focus, inside an extension's drawing too. */
function deepActive(): Element | null
{
    let active = document.activeElement;

    while (active?.shadowRoot?.activeElement !== undefined && active.shadowRoot.activeElement !== null) {
        active = active.shadowRoot.activeElement;
    }

    return active;
}

/** What a look of the card changed, for a screen reader, once: its outcome, then each count that changed, as "Failed. Pins: 0 of 6. Failures: 3 of 4." */
function toldText(card: PackCard, changes: Map<string, TrackChange>): string
{
    const layout = cardLayout(card.shows);
    const lead = layout.lead?.tone === undefined ? "" : `${textOf(layout.lead.lead)}.`;
    const counts = Object.values(layout.places).flat().filter((track) => changes.has(labelKey(track.label))).map((track) => `${textOf(track.label)}: ${t("{value} of {max}", { value: track.value + (track.held ?? 0), max: track.max })}.`);
    return [lead, ...counts].filter((part) => part !== "").join(" ");
}
