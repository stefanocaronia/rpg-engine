// The Setup view (D-343, D-370): while the campaign is in its setup, the page is its first configuration, as a portal's: the robot as the host, the campaign's
// name to change, the three steps, and one question at a time, its choices large with what each means and the one the game suggests, as Settings has them; a
// choice can be left to the master. The master hears each choice at their next call (D-341), and the premise and the world stay in the chat.
import { useEffect, useRef, useState } from "preact/hooks";
import { changeSetting, readSetup, sendSetupWord, type SetupView as Setup } from "./api.ts";
import type { PlayerSetting } from "./data.ts";
import { Icon } from "./icons.tsx";
import { phraseLabel, settingLabel, valueLabel } from "./labels.ts";
import { Master } from "./master.tsx";
import { arrowStep, t } from "./text.ts";

// The steps of a campaign before play (MOD-1).
const steps = ["setup", "session zero", "play"];
// The lists of the setup, answered with items or with none: limits are the player's alone, never left to the master.
const lists = new Set(["lines", "veils"]);
// How long the arrows rest on a choice before it goes to the game, in milliseconds: the game is changed once.
const keyRest = 700;

/** The setup, read again whenever the campaign changes; undefined until read, or when it cannot be. */
export function useSetup(version: number): Setup | undefined
{
    const [setup, setSetup] = useState<Setup>();
    const reads = useRef(0);

    useEffect(() => {
        const reading = ++reads.current;
        void readSetup().then((read) => reading === reads.current && setSetup(read), () => reading === reads.current && setSetup(undefined));
    }, [version]);

    return setup;
}

export function SetupView({ setup }: { setup: Setup; })
{
    const questions = setup.questions;
    // The choices left to the master, as the game keeps them until the master makes them, and those just left here.
    const [leftHere, setLeftHere] = useState<Set<string>>(new Set());
    const left = new Set([...(setup.left ?? []), ...leftHere].filter((name) => questions.some((question) => question.name === name && !answered(question))));
    // The first question still open, once: the player moves on from there; with none, the last card.
    const [at, setAt] = useState(() => {
        const first = questions.findIndex((question) => !answered(question) && !(setup.left ?? []).includes(question.name));
        return first < 0 ? questions.length : first;
    });
    // Whether the player moved among the cards: then the new card's title takes the focus, never at the first reading.
    const [moved, setMoved] = useState(false);
    const [said, setSaid] = useState<string>();
    const done = at >= questions.length;
    const question = questions[Math.min(at, questions.length - 1)];
    const step = steps.indexOf(setup.mode);

    const go = (index: number): void => {
        setMoved(true);
        setAt(index);
    };

    const leave = async (name: string): Promise<void> => {
        const refused = await sendSetupWord({ leave: name });
        setSaid(refused);

        if (refused === undefined) {
            setLeftHere((before) => new Set([...before, name]));
            go(at + 1);
        }
    };

    return (
        <section class="setup" aria-labelledby="setup-title">
            <div class="setup-host">
                <Master mood="happy" />
            </div>
            <CampaignName name={setup.name} />
            <h1 id="setup-title" class="visually-hidden">{t("Setting up {campaign}", { campaign: setup.name })}</h1>
            <ol class="setup-steps" aria-label={t("Steps")}>
                {steps.map((one, index) => (
                    <li key={one} class={index < step ? "done" : index === step ? "now" : undefined} aria-current={index === step ? "step" : undefined}>
                        <span class="setup-step-dot" aria-hidden="true">{index < step ? "✓" : index + 1}</span>
                        {stepName(one)}
                    </li>
                ))}
            </ol>
            {said !== undefined && <p class="setup-problem" role="alert">{said}</p>}
            {!done && question !== undefined && (
                <Question
                    key={question.name}
                    question={question}
                    count={t("{value} of {max}", { value: at + 1, max: questions.length })}
                    left={left.has(question.name)}
                    focus={moved}
                    onBack={at > 0 ? () => go(at - 1) : undefined}
                    onNext={() => go(at + 1)}
                    onLeave={() => void leave(question.name)}
                    onProblem={setSaid}
                />
            )}
            {done && <Ready setup={setup} left={left} focus={moved} onGo={go} onProblem={setSaid} />}
            <ol class="setup-dots" aria-label={t("Questions")}>
                {questions.map((one, index) => (
                    <li key={one.name}>
                        <button
                            type="button"
                            class={[answered(one) ? "answered" : left.has(one.name) ? "left" : "", index === at ? "here" : ""].filter((name) => name !== "").join(" ")}
                            aria-label={answered(one) ? t("{setting}: answered", { setting: settingLabel(one.name) }) : left.has(one.name) ? t("{setting}: left to the master", { setting: settingLabel(one.name) }) : settingLabel(one.name)}
                            aria-current={index === at ? "step" : undefined}
                            onClick={() => go(index)}
                        />
                    </li>
                ))}
            </ol>
            <p class="setup-chat">{t("You can also tell the master in the chat: they hear what you choose here.")}</p>
        </section>
    );
}

/**
 * One question as its card shows it: what it is, its choices large with what each means and the one the game suggests, or a list's items; back, next, or left
 * to the master. Its title takes the focus when the player moved to it.
 */
function Question({ question, count, left, focus, onBack, onNext, onLeave, onProblem }: {
    question: PlayerSetting;
    count: string;
    left: boolean;
    focus: boolean;
    onBack?: () => void;
    onNext(): void;
    onLeave(): void;
    onProblem(problem: string | undefined): void;
})
{
    const [picked, setPicked] = useState<string>();
    const resting = useRef<{ choice: string; timer: ReturnType<typeof setTimeout>; }>();
    const heading = useRef<HTMLHeadingElement>(null);
    const value = picked ?? question.value;
    const title = question.question === undefined ? settingLabel(question.name) : t(question.question);
    const id = `setup-${question.name.replace(/[^a-z0-9]+/gi, "-")}`;
    const isList = lists.has(question.name);
    const open = value === undefined && question.items === undefined && !left;

    useEffect(() => {
        if (focus) {
            heading.current?.focus();
        }

        // A choice the arrows left resting goes when the card closes.
        return () => {
            if (resting.current !== undefined) {
                clearTimeout(resting.current.timer);
                void changeSetting({ setting: question.name, value: resting.current.choice }).then(onProblem);
            }
        };
    }, []);

    // A click chooses at once; the arrows show each choice and send the one they rest on.
    const pick = (choice: string, byKey: boolean): void => {
        setPicked(choice);
        clearTimeout(resting.current?.timer);
        resting.current = undefined;

        if (!byKey) {
            void changeSetting({ setting: question.name, value: choice }).then(onProblem);
            return;
        }

        const timer = setTimeout(() => {
            resting.current = undefined;
            void changeSetting({ setting: question.name, value: choice }).then(onProblem);
        }, keyRest);
        resting.current = { choice, timer };
    };

    return (
        <article class="setup-card" aria-labelledby={id}>
            <p class="eyebrow setup-count">{count}</p>
            <h2 id={id} ref={heading} tabIndex={-1}>{title}</h2>
            <p class="setup-about">{phraseLabel(t(question.about))}</p>
            {question.choices !== undefined && <Choices question={question} value={value} labelledBy={id} onPick={pick} />}
            {isList && <ListQuestion question={question} onProblem={onProblem} />}
            {left && value === undefined && <p class="setup-left">{t("Left to the master: they choose, and tell you.")}</p>}
            <div class="setup-moves">
                {onBack !== undefined && <button type="button" class="button setup-back" onClick={onBack}>{t("Back")}</button>}
                {open && !isList && <button type="button" class="button quiet" onClick={onLeave}>{t("You decide")}</button>}
                <button type="button" class={open ? "button quiet" : "button gold"} onClick={onNext}>
                    {open ? t("Skip") : t("Next")} <Icon name="send" />
                </button>
            </div>
        </article>
    );
}

/** A question's choices as a radio group: one stop of Tab, the arrows move among them and choose; each with what it means, the suggested one marked. */
function Choices({ question, value, labelledBy, onPick }: { question: PlayerSetting; value?: string; labelledBy: string; onPick(choice: string, byKey: boolean): void; })
{
    const choices = question.choices ?? [];
    const at = choices.findIndex((choice) => choice.value === value);
    const stop = at >= 0 ? at : Math.max(0, choices.findIndex((choice) => choice.value === question.suggested));

    const move = (event: KeyboardEvent): void => {
        const step = arrowStep(event.key);

        if (step === 0) {
            return;
        }

        event.preventDefault();
        const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button")];
        const from = buttons.indexOf(event.target as HTMLElement);
        const next = ((from >= 0 ? from : stop) + step + choices.length) % choices.length;
        onPick(choices[next].value, true);
        buttons[next]?.focus();
    };

    return (
        <div class="setup-choices" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={move}>
            {choices.map((choice, index) => (
                <button
                    key={choice.value}
                    type="button"
                    role="radio"
                    aria-checked={value === choice.value}
                    tabIndex={index === stop ? 0 : -1}
                    class="setup-choice"
                    onClick={() => onPick(choice.value, false)}
                >
                    <strong>
                        {choice.label === undefined ? valueLabel(choice.value) : phraseLabel(t(choice.label))}
                        {choice.value === question.suggested && <span class="setup-suggested">{t("Suggested")}</span>}
                    </strong>
                    {choice.means !== undefined && <span>{phraseLabel(t(choice.means))}</span>}
                </button>
            ))}
        </div>
    );
}

/** A list of the setup, lines or veils: its items to take off, a field to add one, and None for a player who wants none. */
function ListQuestion({ question, onProblem }: { question: PlayerSetting; onProblem(problem: string | undefined): void; })
{
    const [item, setItem] = useState("");
    const field = useRef<HTMLInputElement>(null);
    const send = (change: Parameters<typeof changeSetting>[0]): void => void changeSetting(change).then(onProblem);
    return (
        <div class="setup-list">
            {(question.items ?? []).length > 0 && (
                <ul>
                    {(question.items ?? []).map((one) => (
                        <li key={one}>
                            {one}
                            <button
                                type="button"
                                class="icon-button"
                                aria-label={t("Take {item} off", { item: one })}
                                onClick={() => {
                                    send({ setting: question.name, remove: one });
                                    field.current?.focus();
                                }}
                            >
                                <Icon name="close" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {question.items !== undefined && question.items.length === 0 && <p class="setup-left">{t("None: nothing kept out.")}</p>}
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (item.trim() !== "") {
                        send({ setting: question.name, add: item.trim() });
                        setItem("");
                    }
                }}
            >
                <input
                    ref={field}
                    type="text"
                    value={item}
                    maxLength={80}
                    placeholder={question.name === "lines" ? t("Add, e.g. spiders") : question.name === "veils" ? t("Add, e.g. torture") : t("Add…")}
                    aria-label={t("Add to {setting}", { setting: settingLabel(question.name) })}
                    onInput={(event) => setItem(event.currentTarget.value)}
                />
                <button type="submit" class="button" disabled={item.trim() === ""}>{t("Add")}</button>
                {question.items === undefined && <button type="button" class="button quiet" onClick={() => send({ setting: question.name, value: "none" })}>{t("None")}</button>}
            </form>
        </div>
    );
}

/**
 * The last card: the questions still open, each a chip back to its card; those left to the master; what only the chat settles, as the premise; and the word that
 * the player is ready.
 */
function Ready({ setup, left, focus, onGo, onProblem }: { setup: Setup; left: Set<string>; focus: boolean; onGo(index: number): void; onProblem(problem: string | undefined): void; })
{
    const [sent, setSent] = useState(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const open = setup.questions.flatMap((question, index) => (answered(question) || left.has(question.name) ? [] : [{ question, index }]));
    const asked = new Set(setup.questions.map((question) => question.name));
    const inChat = setup.missing.map((item) => item.split(" (")[0]).filter((name) => !asked.has(name));

    useEffect(() => {
        if (focus) {
            heading.current?.focus();
        }
    }, []);

    return (
        <article class="setup-card" aria-labelledby="setup-ready">
            <h2 id="setup-ready" ref={heading} tabIndex={-1}>{open.length === 0 ? t("All set") : t("Almost there")}</h2>
            {open.length > 0 && (
                <div class="setup-open">
                    <span class="eyebrow setup-open-label">{t("Still open")}</span>
                    {open.map(({ question, index }) => <button key={question.name} type="button" class="setup-chip" onClick={() => onGo(index)}>{settingLabel(question.name)}</button>)}
                </div>
            )}
            {left.size > 0 && <p class="setup-about">{t("Left to the master: {settings}.", { settings: [...left].map((name) => settingLabel(name).toLowerCase()).join(", ") })}</p>}
            {inChat.length > 0 && <p class="setup-about">{t("In the chat, with the master: {settings}.", { settings: inChat.map((name) => settingLabel(name).toLowerCase()).join(" · ") })}</p>}
            {sent ? <p class="setup-left">{t("The master knows: write to them in the chat, and the story begins.")}</p> : (
                <div class="setup-moves">
                    <button type="button" class="button setup-back" onClick={() => onGo(setup.questions.length - 1)}>{t("Back")}</button>
                    <button
                        type="button"
                        class="button gold"
                        onClick={() =>
                            void sendSetupWord({ ready: true }).then((refused) => {
                                onProblem(refused);
                                setSent(refused === undefined);
                            })}
                    >
                        {t("I'm ready")}
                    </button>
                </div>
            )}
        </article>
    );
}

/** The campaign's name, with a pencil to change it, as the master hears (D-370); Esc leaves it as it was. */
function CampaignName({ name }: { name: string; })
{
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(name);
    const pencil = useRef<HTMLButtonElement>(null);
    const field = useRef<HTMLInputElement>(null);
    const wasEditing = useRef(false);

    useEffect(() => setText(name), [name]);

    // The field takes the focus; back from it, the pencil.
    useEffect(() => {
        if (editing) {
            field.current?.focus();
        } else if (wasEditing.current) {
            pencil.current?.focus();
        }

        wasEditing.current = editing;
    }, [editing]);

    if (!editing) {
        return (
            <p class="setup-name">
                <span>{name}</span>
                <button ref={pencil} type="button" class="icon-button" aria-label={t("Change the campaign's name")} onClick={() => setEditing(true)}>
                    <Icon name="pencil" />
                </button>
            </p>
        );
    }

    return (
        <form
            class="setup-name editing"
            onSubmit={(event) => {
                event.preventDefault();

                if (text.trim() !== "" && text.trim() !== name) {
                    void changeSetting({ setting: "name", value: text.trim() });
                }

                setEditing(false);
            }}
        >
            <input
                ref={field}
                type="text"
                value={text}
                maxLength={80}
                aria-label={t("The campaign's name")}
                onInput={(event) => setText(event.currentTarget.value)}
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        setText(name);
                        setEditing(false);
                    }
                }}
            />
            <button type="submit" class="button gold">{t("Save")}</button>
        </form>
    );
}

/** Whether a question is answered: a value chosen, or a list given, even with none. */
function answered(question: PlayerSetting): boolean
{
    return question.value !== undefined || question.items !== undefined;
}

/** A step of a campaign before play, by its name in the page's language. */
function stepName(mode: string): string
{
    return mode === "setup" ? t("Settings") : mode === "session zero" ? t("Session zero") : t("Play");
}
