// The player's action as their own sentence to the master (D-495): a thing of the sheet or someone at the place starts it; the sheet of the squares (ASK-11)
// made for people chooses on whom, on the map or in a list; the page writes the sentence in a field the player changes before it goes. No rule here.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { actPeople, actSentence, type ActStart, type ActTarget, actTitle, talkSentence, targetMode, verbLabel } from "./acts.ts";
import type { ActVerb, ShownPlace, ShownScene } from "./data.ts";
import { Icon } from "./icons.tsx";
import { PlaceMap } from "./place-map-view.tsx";
import { t } from "./text.ts";

// How many characters a sentence may have, as the server takes them.
const mostWords = 500;

/** How the sentence goes: told to the master, as the answer to what the master asks (ASK-10), or copied, for a chat that does not hear it by itself. */
export type ActReply = "tell" | "answer" | "copy";

/**
 * The sheet of an action (D-495): its verb, among the thing's, on whom on the map and in the list "On whom", then the sentence in a field, which Enter
 * sends and Escape closes; over the whole page with a map, else a card.
 */
export function ActSheet(
    { start, place, scene, companions, reply, onSend, onClose }: {
        start: ActStart;
        place?: ShownPlace;
        scene?: ShownScene;
        companions: string[];
        reply: ActReply;
        /** Sends or copies the sentence: undefined when done, else what went wrong. */
        onSend(text: string): Promise<string | undefined>;
        onClose(): void;
    },
)
{
    const dialog = useRef<HTMLDialogElement>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    const list = useRef<HTMLFieldSetElement>(null);
    const [verb, setVerb] = useState<ActVerb | undefined>("verbs" in start ? start.verbs[0] : undefined);
    const mode = verb === undefined ? "none" : targetMode(verb);
    const [target, setTarget] = useState<ActTarget | "square" | undefined>(mode === "lets" ? "none" : undefined);
    const [square, setSquare] = useState("");
    const map = place?.map;
    const people = actPeople(place, scene, companions);
    const shownTarget: ActTarget = target === undefined ? "none" : target === "square" ? (square.trim() === "" ? "none" : { square: square.trim().toUpperCase() }) : target;
    const composed = "talk" in start ? talkSentence(start.talk) : actSentence(verb ?? "use", start.item, shownTarget);
    const [text, setText] = useState(composed);
    // What the page wrote last: changed by the player, the sentence is theirs and a new choice leaves it as it is.
    const written = useRef(composed);
    const [problem, setProblem] = useState<string>();
    const [sending, setSending] = useState(false);
    const title = "talk" in start ? t("Talk to {name}", { name: start.talk }) : actTitle(verb ?? "use", start.item);
    const choosing = mode !== "none";

    useEffect(() => {
        if (text === written.current) {
            setText(composed);
        }

        written.current = composed;
    }, [composed]);

    // A modal dialog lies over everything on the page and closes with Escape by itself. The focus goes where the player chooses first: on whom, for an
    // attack; else the sentence, the cursor at its end.
    useEffect(() => {
        dialog.current?.showModal();

        if (mode === "asks") {
            list.current?.querySelector<HTMLInputElement>("input[type=radio]")?.focus();
        } else {
            focusEnd(field.current);
        }
    }, []);

    const choose = (chosen: ActTarget | "square"): void => {
        setTarget(chosen);
        setProblem(undefined);
    };

    const send = async (event: Event): Promise<void> => {
        event.preventDefault();
        const words = text.trim();

        if (words === "" || sending) {
            return;
        }

        setSending(true);
        const failed = await onSend(words);
        setSending(false);

        if (failed === undefined) {
            dialog.current?.close();
        } else {
            setProblem(failed);
        }
    };

    // Enter sends, Shift+Enter starts a new line; never while an input method composes a word.
    const keys = (event: KeyboardEvent): void => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            void send(event);
        }
    };

    // Enter on a choice of the list takes the player to the sentence.
    const toSentence = (event: KeyboardEvent): void => {
        if (event.key === "Enter") {
            event.preventDefault();
            focusEnd(field.current);
        }
    };

    const personChosen = typeof target === "object" && "person" in target ? target.person : undefined;
    const option = (key: string, chosen: ActTarget | "square", label: ComponentChildren, kind = "") => (
        <label key={key} class={["act-who-one", kind].filter((name) => name !== "").join(" ")}>
            <input type="radio" name="act-who" checked={sameTarget(target, chosen)} onChange={() => choose(chosen)} onKeyDown={toSentence} />
            {label}
        </label>
    );
    const full = choosing && map !== undefined;
    const button = reply === "copy" ? t("Copy") : reply === "answer" ? t("Answer the master") : t("Tell the master");
    return (
        <dialog ref={dialog} class={full ? "map-sheet act-sheet full" : "map-sheet act-sheet"} aria-labelledby="act-sheet-title" onClose={onClose}>
            <header class="map-sheet-head">
                <h2 id="act-sheet-title">{title}</h2>
                <button type="button" class="icon-button tip-left" aria-label={t("Close")} data-tip={t("Close")} onClick={() => dialog.current?.close()}>
                    <Icon name="close" />
                </button>
            </header>
            {"verbs" in start && start.verbs.length > 1 && (
                <fieldset class="act-verbs">
                    <legend class="visually-hidden">{t("What you do")}</legend>
                    {start.verbs.map((one) => (
                        <label key={one} class="act-verb">
                            <input type="radio" name="act-verb" checked={verb === one} onChange={() => setVerb(one)} />
                            {verbLabel(one)}
                        </label>
                    ))}
                </fieldset>
            )}
            {choosing && (
                <div class="map-sheet-body act-body">
                    {map !== undefined && place !== undefined && (
                        <PlaceMap
                            map={map}
                            place={place.name}
                            bare
                            choosing={{ selected: personChosen, onChoose: (name) => choose(name === undefined ? "self" : { person: name }) }}
                            {...(target === "square" ? { picking: { selected: square.trim().toUpperCase(), onSelect: setSquare } } : {})}
                        />
                    )}
                    <fieldset ref={list} class="act-who">
                        <legend class="eyebrow">{t("On whom")}</legend>
                        {people.map((person, index) =>
                            option(
                                `person ${index}`,
                                { person: person.name },
                                <>
                                    <span class="act-who-name">
                                        {person.name}
                                        {person.count !== undefined && <span class="count">{` ×${person.count}`}</span>}
                                    </span>
                                    {person.square !== undefined && <span class="lm-key-square">{person.square}</span>}
                                    {person.distance !== undefined && <span class="lm-where-far">{person.distance}</span>}
                                </>,
                                [person.role, person.hostile === true ? "hostile" : ""].filter((name) => name !== "").join(" "),
                            )
                        )}
                        {option("self", "self", <span class="act-who-name">{t("Myself")}</span>, "plain")}
                        {option("none", "none", <span class="act-who-name">{t("No one in particular")}</span>, "plain")}
                        {map !== undefined && option("square", "square", <span class="act-who-name">{t("A square…")}</span>, "plain")}
                        {target === "square" && (
                            <input
                                type="text"
                                class="act-square"
                                value={square}
                                maxLength={5}
                                placeholder="E4"
                                aria-label={t("The square, such as E4")}
                                onInput={(event) => setSquare(event.currentTarget.value)}
                                onKeyDown={toSentence}
                            />
                        )}
                    </fieldset>
                </div>
            )}
            <form class="act-bar" onSubmit={(event) => void send(event)}>
                <textarea
                    ref={field}
                    class="act-words"
                    value={text}
                    rows={2}
                    maxLength={mostWords}
                    aria-label={t("Your words to the master")}
                    aria-describedby={reply === "tell" ? undefined : "act-note"}
                    onInput={(event) => setText(event.currentTarget.value)}
                    onKeyDown={keys}
                />
                {reply !== "tell" && (
                    <p id="act-note" class="act-note">
                        <Icon name={reply === "answer" ? "chat" : "info"} />
                        {reply === "answer" ? t("Answers the master") : t("This chat does not hear it by itself: copy it, then paste it in the chat.")}
                    </p>
                )}
                {problem && <p class="act-problem" role="alert">{problem}</p>}
                <div class="act-buttons">
                    <button type="button" class="act-cancel" onClick={() => dialog.current?.close()}>{t("Cancel")}</button>
                    <button type="submit" class="map-sheet-go act-go" disabled={sending || text.trim() === ""}>
                        {button}
                        <Icon name={reply === "copy" ? "copy" : "send"} />
                    </button>
                </div>
            </form>
        </dialog>
    );
}

/** Whether two choices of the list are the same. */
function sameTarget(target: ActTarget | "square" | undefined, other: ActTarget | "square"): boolean
{
    if (typeof target === "object" && typeof other === "object") {
        return "person" in target && "person" in other && target.person === other.person;
    }

    return target === other;
}

/** Focuses a field with its cursor at the end of what it holds. */
function focusEnd(field: HTMLTextAreaElement | null): void
{
    field?.focus();
    field?.setSelectionRange(field.value.length, field.value.length);
}
