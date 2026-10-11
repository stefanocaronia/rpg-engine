// The Setup view (D-343, D-370): while the campaign is in its setup, the page is its first configuration, as a portal's: the robot as the host, the campaign's
// name to change, the three steps, and one question at a time, its choices large with what each means, as Settings has them; a choice can be left to the
// master. The master hears each choice at their next call (D-341), and the premise and the world stay in the chat.
import { useEffect, useRef, useState } from "preact/hooks";
import { changeSetting, readSetup, sendSetupWord, type SetupView as Setup } from "./api.ts";
import type { PlayerSetting } from "./data.ts";
import { Icon } from "./icons.tsx";
import { fieldLabel, phraseLabel } from "./labels.ts";
import { Master } from "./master.tsx";

// The steps of a campaign before play (MOD-1).
const steps = [{ mode: "setup", name: "Settings" }, { mode: "session zero", name: "Session zero" }, { mode: "play", name: "Play" }];
// The lists of the setup, answered with items or with none.
const lists = new Set(["lines", "veils"]);
const examples: Record<string, string> = { lines: "e.g. spiders", veils: "e.g. torture" };

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
    // The first question without an answer, once: the player moves on from there.
    const [at, setAt] = useState(() => Math.max(0, questions.findIndex((question) => !answered(question))));
    const [left, setLeft] = useState<Set<string>>(new Set());
    const [said, setSaid] = useState<string>();
    const done = at >= questions.length;
    const question = questions[Math.min(at, questions.length - 1)];
    const step = steps.findIndex((one) => one.mode === setup.mode);

    const leave = async (name: string): Promise<void> => {
        const refused = await sendSetupWord({ leave: name });
        setSaid(refused);

        if (refused === undefined) {
            setLeft((before) => new Set([...before, name]));
            setAt(at + 1);
        }
    };

    return (
        <section class="setup" aria-labelledby="setup-title">
            <div class="setup-host">
                <Master mood="happy" />
            </div>
            <CampaignName name={setup.name} />
            <h1 id="setup-title" class="visually-hidden">Setting up {setup.name}</h1>
            <ol class="setup-steps" aria-label="Steps">
                {steps.map((one, index) => (
                    <li key={one.mode} class={index < step ? "done" : index === step ? "now" : undefined} aria-current={index === step ? "step" : undefined}>
                        <span class="setup-step-dot" aria-hidden="true">{index < step ? "✓" : index + 1}</span>
                        {one.name}
                    </li>
                ))}
            </ol>
            {said !== undefined && <p class="setup-problem" role="alert">{said}</p>}
            {!done && question !== undefined && (
                <Question
                    key={question.name}
                    question={question}
                    count={`${at + 1} of ${questions.length}`}
                    left={left.has(question.name)}
                    onBack={at > 0 ? () => setAt(at - 1) : undefined}
                    onNext={() => setAt(at + 1)}
                    onLeave={() => void leave(question.name)}
                    onProblem={setSaid}
                />
            )}
            {done && <Ready setup={setup} onBack={() => setAt(questions.length - 1)} onProblem={setSaid} />}
            <ol class="setup-dots" aria-label="Questions">
                {questions.map((one, index) => (
                    <li key={one.name}>
                        <button
                            type="button"
                            class={[answered(one) || left.has(one.name) ? "answered" : "", index === at ? "here" : ""].filter((name) => name !== "").join(" ")}
                            aria-label={`${phraseLabel(fieldLabel(one.name))}${answered(one) ? ": answered" : left.has(one.name) ? ": left to the master" : ""}`}
                            aria-current={index === at ? "step" : undefined}
                            onClick={() => setAt(index)}
                        />
                    </li>
                ))}
            </ol>
            <p class="setup-chat">You can also tell the master in the chat: they hear what you choose here.</p>
        </section>
    );
}

/** One question as its card shows it: what it is, its choices large with what the chosen one means, or a list's items; back, next, or left to the master. */
function Question({ question, count, left, onBack, onNext, onLeave, onProblem }: {
    question: PlayerSetting;
    count: string;
    left: boolean;
    onBack?: () => void;
    onNext(): void;
    onLeave(): void;
    onProblem(problem: string | undefined): void;
})
{
    const [picked, setPicked] = useState<string>();
    const value = picked ?? question.value;
    const title = phraseLabel(fieldLabel(question.name));
    const id = `setup-${question.name.replace(/[^a-z0-9]+/gi, "-")}`;

    const pick = (choice: string): void => {
        setPicked(choice);
        void changeSetting({ setting: question.name, value: choice }).then(onProblem);
    };

    return (
        <article class="setup-card" aria-labelledby={id}>
            <p class="setup-count">{count}</p>
            <h2 id={id}>{title}</h2>
            <p class="setup-about">{phraseLabel(question.about)}</p>
            {question.choices !== undefined && (
                <div class="setup-choices" role="radiogroup" aria-labelledby={id}>
                    {question.choices.map((choice) => (
                        <button key={choice.value} type="button" role="radio" aria-checked={value === choice.value} class="setup-choice" onClick={() => pick(choice.value)}>
                            <strong>{phraseLabel(choice.value)}</strong>
                            {choice.means !== undefined && <span>{phraseLabel(choice.means)}</span>}
                        </button>
                    ))}
                </div>
            )}
            {lists.has(question.name) && <ListQuestion question={question} onProblem={onProblem} />}
            {left && value === undefined && <p class="setup-left">Left to the master: they choose, and tell you.</p>}
            <div class="setup-moves">
                {onBack !== undefined && <button type="button" class="setup-button" onClick={onBack}>Back</button>}
                {value === undefined && question.items === undefined && !left && <button type="button" class="setup-button quiet" onClick={onLeave}>You decide</button>}
                <button type="button" class="setup-button gold" onClick={onNext}>
                    Next <Icon name="send" />
                </button>
            </div>
        </article>
    );
}

/** A list of the setup, lines or veils: its items to take off, a field to add one, and None for a player who wants none. */
function ListQuestion({ question, onProblem }: { question: PlayerSetting; onProblem(problem: string | undefined): void; })
{
    const [item, setItem] = useState("");
    const send = (change: Parameters<typeof changeSetting>[0]): void => void changeSetting(change).then(onProblem);
    return (
        <div class="setup-list">
            {(question.items ?? []).length > 0 && (
                <ul>
                    {(question.items ?? []).map((one) => (
                        <li key={one}>
                            {one}
                            <button type="button" class="icon-button" aria-label={`Take ${one} off`} onClick={() => send({ setting: question.name, remove: one })}>
                                <Icon name="close" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {question.items !== undefined && question.items.length === 0 && <p class="setup-left">None: nothing kept out.</p>}
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (item.trim() !== "") {
                        send({ setting: question.name, add: item.trim() });
                        setItem("");
                    }
                }}
            >
                <input type="text" value={item} maxLength={80} placeholder={`Add, ${examples[question.name] ?? "e.g. …"}`} aria-label={`Add to ${question.name}`} onInput={(event) => setItem(event.currentTarget.value)} />
                <button type="submit" class="setup-button" disabled={item.trim() === ""}>Add</button>
                {question.items === undefined && <button type="button" class="setup-button quiet" onClick={() => send({ setting: question.name, value: "none" })}>None</button>}
            </form>
        </div>
    );
}

/** The last card: the choices made, what the chat still has to settle, and the word that the player is ready. */
function Ready({ setup, onBack, onProblem }: { setup: Setup; onBack(): void; onProblem(problem: string | undefined): void; })
{
    const [sent, setSent] = useState(false);
    const open = setup.questions.filter((question) => !answered(question));
    return (
        <article class="setup-card" aria-labelledby="setup-ready">
            <h2 id="setup-ready">{open.length === 0 ? "All set" : "Almost there"}</h2>
            {open.length > 0 && <p class="setup-about">Still to choose, here or in the chat: {open.map((question) => fieldLabel(question.name)).join(", ")}.</p>}
            {setup.missing.length > 0 && <p class="setup-about">The master still settles with you in the chat: {setup.missing.map((item) => item.split(" (")[0]).join(", ")}.</p>}
            {sent ? <p class="setup-left">The master knows: write to them in the chat, and the story begins.</p> : (
                <div class="setup-moves">
                    <button type="button" class="setup-button" onClick={onBack}>Back</button>
                    <button
                        type="button"
                        class="setup-button gold"
                        onClick={() =>
                            void sendSetupWord({ ready: true }).then((refused) => {
                                onProblem(refused);
                                setSent(refused === undefined);
                            })}
                    >
                        I'm ready
                    </button>
                </div>
            )}
        </article>
    );
}

/** The campaign's name, with a pencil to change it, as the master hears (D-370). */
function CampaignName({ name }: { name: string; })
{
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(name);

    useEffect(() => setText(name), [name]);

    if (!editing) {
        return (
            <p class="setup-name">
                <span>{name}</span>
                <button type="button" class="icon-button" aria-label="Change the campaign's name" onClick={() => setEditing(true)}>
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
            <input type="text" value={text} maxLength={80} aria-label="The campaign's name" autoFocus onInput={(event) => setText(event.currentTarget.value)} />
            <button type="submit" class="setup-button gold">Save</button>
        </form>
    );
}

/** Whether a question is answered: a value chosen, or a list given, even with none. */
function answered(question: PlayerSetting): boolean
{
    return question.value !== undefined || question.items !== undefined;
}
