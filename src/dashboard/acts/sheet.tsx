// The player's action as their own sentence to the master (D-495, D-573): a thing of the sheet opens on itself, what it is and its verbs; a verb, or someone at the
// place, starts the action in the same card: on whom, as chips and on the map when the place has one, then the sentence the player changes before it goes. No rule here.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "../address.ts";
import { readView } from "../api.ts";
import type { ActVerb, SheetValue, ShownPlace, ShownScene } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { fieldLabel, phraseLabel, shownText } from "../parts/labels.ts";
import { Markdown } from "../parts/markdown.tsx";
import { PlaceMap } from "../place/view.tsx";
import { t } from "../text.ts";
import { actPeople, actSentence, type ActStart, type ActTarget, actTitle, spokenBy, talkSentence, targetMode, verbLabel } from "./acts.ts";

// How many characters a sentence may have, as the server takes them.
const mostWords = 500;

/** How the sentence goes: told to the master, as the answer to what the master asks (ASK-10), or copied, for a chat that does not hear it by itself. */
export type ActReply = "tell" | "answer" | "copy";

/**
 * The card of an action (D-495, D-573): a thing first, its page's text and its verbs; a verb chosen, on whom as chips and on the place's map,
 * then the sentence in a field, which Enter sends and Escape closes. A card in the middle, wider with the map; a sheet from the foot on a phone.
 */
export function ActSheet(
    { start, self, place, scene, companions, reply, asked, onSend, onClose }: {
        start: ActStart;
        /** The player character who acts, with more than one: the others are people to act on (VIEW-12). */
        self?: string | undefined;
        place?: ShownPlace;
        scene?: ShownScene;
        companions: string[];
        reply: ActReply;
        /** The master's open question the words answer, and whether it has buttons, as a roll, the words take the place of (ASK-10). */
        asked?: { question: string; buttons: boolean; } | undefined;
        /** Sends or copies the sentence: undefined when done, else what went wrong. */
        onSend(text: string): Promise<string | undefined>;
        onClose(): void;
    },
)
{
    const dialog = useRef<HTMLDialogElement>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    const list = useRef<HTMLFieldSetElement>(null);
    const verbsBar = useRef<HTMLDivElement>(null);
    const closer = useRef<HTMLButtonElement>(null);
    const thing = "verbs" in start;
    // A thing opens on itself until a verb is chosen; talking goes straight to the words.
    const [verb, setVerb] = useState<ActVerb>();
    const acting = !thing || verb !== undefined;
    const mode = verb === undefined ? "none" : targetMode(verb);
    const [target, setTarget] = useState<ActTarget | "square">();
    const [square, setSquare] = useState("");
    const map = place?.map;
    // With a map at the place, on whom is chosen on it too, by a click.
    const mapShown = map !== undefined && place !== undefined && mode !== "none";
    const people = actPeople(place, scene, companions, self);
    const shownTarget: ActTarget = target === undefined ? "none" : target === "square" ? (square.trim() === "" ? "none" : { square: square.trim().toUpperCase() }) : target;
    // With more than one player character the sentence starts with who acts (D-480 (8)).
    const composed = spokenBy("talk" in start ? talkSentence(start.talk) : actSentence(verb ?? "use", start.item, shownTarget), self);
    const [text, setText] = useState(composed);
    // What the page wrote last: changed by the player, the sentence is theirs and a new target leaves it as it is; a new verb writes it again.
    const written = useRef(composed);
    const writtenFor = useRef(verb);
    const [problem, setProblem] = useState<string>();
    const [sending, setSending] = useState(false);
    // The text of the thing's page: undefined while it is read, empty for a page of data alone, null when the character knows no page of it.
    const [about, setAbout] = useState<string | null>();
    // What the page says of the thing as data, as damage and weight (D-573).
    const [data, setData] = useState<SheetValue[]>([]);
    const title = "talk" in start ? t("Talk to {name}", { name: start.talk }) : verb === undefined ? start.item : actTitle(verb, start.item);

    useEffect(() => {
        if (text === written.current || writtenFor.current !== verb) {
            setText(composed);
        }

        written.current = composed;
        writtenFor.current = verb;
    }, [composed, verb]);

    // A modal dialog lies over everything on the page and closes with Escape by itself; a thing's page is read once, when it opens.
    useEffect(() => {
        dialog.current?.showModal();

        if (!thing) {
            focusEnd(field.current);
            return;
        }

        (verbsBar.current?.querySelector<HTMLElement>("a, button") ?? closer.current)?.focus();
        let live = true;
        readView(start.page ?? start.item).then(
            (page) => {
                if (live) {
                    setAbout(page.kind === "page" ? page.text.trim() : null);
                    setData(page.kind === "page" ? page.sheet.flatMap((group) => group.values) : []);
                }
            },
            () => live && setAbout(null),
        );

        return () => {
            live = false;
        };
    }, []);

    // The focus goes where the player chooses next: on whom, for a verb that needs someone; else the sentence, the cursor at its end.
    useEffect(() => {
        if (verb === undefined) {
            return;
        }

        if (mode === "asks") {
            list.current?.querySelector<HTMLInputElement>("input[type=radio]")?.focus();
        } else {
            focusEnd(field.current);
        }
    }, [verb]);

    const pick = (chosen: ActVerb): void => {
        setVerb(chosen);
        setTarget(targetMode(chosen) === "lets" ? "none" : undefined);
        setProblem(undefined);
    };

    // Back to the thing, the focus on the verb that was chosen.
    const back = (): void => {
        const was = verb;
        setVerb(undefined);
        setProblem(undefined);
        requestAnimationFrame(() => verbsBar.current?.querySelector<HTMLButtonElement>(`button[data-verb="${was ?? ""}"]`)?.focus());
    };

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

    const close = (): void => dialog.current?.close();
    const personChosen = typeof target === "object" && "person" in target ? target.person : undefined;
    const option = (key: string, chosen: ActTarget | "square", label: ComponentChildren, kind = "") => (
        <label key={key} class={["act-who-one", kind].filter((name) => name !== "").join(" ")}>
            <input type="radio" name="act-who" checked={sameTarget(target, chosen)} onChange={() => choose(chosen)} onKeyDown={toSentence} />
            {label}
        </label>
    );
    const button = reply === "copy" ? t("Copy") : reply === "answer" ? t("Answer the master") : t("Tell the master");
    const facts = thing ? start.facts ?? [] : [];
    return (
        <dialog ref={dialog} class={mapShown ? "map-sheet act-sheet wide" : "map-sheet act-sheet"} aria-labelledby="act-sheet-title" aria-describedby={!acting && facts.length > 0 ? "act-facts" : undefined} onClose={onClose}>
            <header class="map-sheet-head act-head">
                {thing && acting && (
                    <button type="button" class="icon-button tip-right act-back" aria-label={t("Back")} data-tip={t("Back")} onClick={back}>
                        <Icon name="fold" />
                    </button>
                )}
                <div class="act-heading">
                    <h2 id="act-sheet-title">{title}</h2>
                    {!acting && facts.length > 0 && <p id="act-facts" class="act-facts">{facts.join(" · ")}</p>}
                </div>
                <button ref={closer} type="button" class="icon-button tip-left" aria-label={t("Close")} data-tip={t("Close")} onClick={close}>
                    <Icon name="close" />
                </button>
            </header>
            {thing && !acting && (
                <>
                    {/* A page of data alone, as a weapon's, says no more than the facts; no page at all, that the character knows only the name. */}
                    {data.length > 0 && (
                        <dl class="act-data">
                            {data.map((value) => (
                                <div key={value.field}>
                                    <dt>{phraseLabel(fieldLabel(value.field))}</dt>
                                    <dd>{shownText(value.text, value.kind)}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    {about !== undefined && about !== "" && (about !== null || data.length === 0) && (
                        <div class="act-about">
                            {about === null ? <p class="browse-none">{t("Your character knows its name, and nothing more yet.")}</p> : <Markdown text={about} />}
                        </div>
                    )}
                    {(start.verbs.length > 0 || start.document === true) && (
                        <div ref={verbsBar} class="act-buttons act-verbs" role="group" aria-label={t("What you do")}>
                            {/* A document is read again where the World keeps them, before anything is done with it. */}
                            {start.document === true && (
                                <a class="map-sheet-go act-go" href={sectionAddress("world", "documents", start.page ?? start.item)} onClick={close}>
                                    {t("Read it")}
                                </a>
                            )}
                            {start.verbs.map((one, index) => (
                                <button key={one} type="button" data-verb={one} class={index === 0 && start.document !== true ? "map-sheet-go act-go" : "act-cancel"} onClick={() => pick(one)}>
                                    {verbLabel(one)}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
            {acting && mode !== "none" && (
                <div class="act-body">
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
                                </>,
                                [person.role, person.hostile === true ? "hostile" : ""].filter((name) => name !== "").join(" "),
                            )
                        )}
                        {option("self", "self", <span class="act-who-name">{t("Myself")}</span>, "plain")}
                        {option("none", "none", <span class="act-who-name">{t("No one in particular")}</span>, "plain")}
                        {mapShown && option("square", "square", <span class="act-who-name">{t("A square…")}</span>, "plain")}
                        {target === "square" && mapShown && (
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
                    {mapShown && (
                        <PlaceMap
                            map={map}
                            place={place.name}
                            bare
                            self={self}
                            choosing={{ selected: personChosen, onChoose: (name) => choose(name === undefined ? "self" : { person: name }) }}
                            {...(target === "square" ? { picking: { selected: square.trim().toUpperCase(), onSelect: setSquare } } : {})}
                        />
                    )}
                </div>
            )}
            {acting && (
                <form class="act-bar" onSubmit={(event) => void send(event)}>
                    {reply === "answer" && (
                        <p id="act-note" class="act-note act-answer">
                            <Icon name="bell" />
                            {asked?.buttons === true
                                ? t("These words answer the master instead of a roll or a button: {question}", { question: asked.question })
                                : t("These words answer the master's question: {question}", { question: asked?.question ?? "" })}
                        </p>
                    )}
                    {/* Named on the page, never taken for the thing's text: these are words that go to the master (T-218). */}
                    <label for="act-words" class="eyebrow act-words-label">
                        <Icon name="chat" />
                        {t("Your words to the master")}
                    </label>
                    <textarea
                        ref={field}
                        id="act-words"
                        class="act-words"
                        value={text}
                        rows={2}
                        maxLength={mostWords}
                        aria-describedby={reply === "tell" ? undefined : "act-note"}
                        onInput={(event) => setText(event.currentTarget.value)}
                        onKeyDown={keys}
                    />
                    {reply === "copy" && (
                        <p id="act-note" class="act-note">
                            <Icon name="info" />
                            {t("This chat does not hear it by itself: copy it, then paste it in the chat.")}
                        </p>
                    )}
                    {problem && <p class="act-problem" role="alert">{problem}</p>}
                    <div class="act-buttons">
                        <button type="button" class="act-cancel" onClick={close}>{t("Cancel")}</button>
                        <button type="submit" class="map-sheet-go act-go" disabled={sending || text.trim() === ""}>
                            {button}
                            <Icon name={reply === "copy" ? "copy" : "send"} />
                        </button>
                    </div>
                </form>
            )}
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
