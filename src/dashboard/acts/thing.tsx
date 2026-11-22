// A thing of the sheet as its card (D-573, D-581): what it is, its data and its page's text, then its verbs. A verb without anyone to act on asks to confirm on
// its own button and goes to the master at once; one with someone asks on whom, as chips and on the place's map, and its button then says the whole action.
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
import { actPeople, actSentence, type ActStart, type ActTarget, actTitle, spokenBy, targetMode, verbLabel, withoutFullStop } from "./acts.ts";
import { ActHead } from "./head.tsx";
import type { ActReply } from "./sheet.tsx";

// A click this soon after a verb asks to confirm is the rest of a double click, never the confirmation (milliseconds).
const doubleClick = 400;

/** The card of a thing of the sheet: what it is, then its verbs, each a sentence to the master (D-493 (1)); how it goes as `reply` says. */
export function ThingSheet({ start, self, place, scene, companions, reply, onSend, onClose }: {
    start: Extract<ActStart, { verbs: ActVerb[]; }>;
    self?: string | undefined;
    place?: ShownPlace | undefined;
    scene?: ShownScene | undefined;
    companions: string[];
    reply: ActReply;
    onSend(text: string): Promise<string | undefined>;
    onClose(): void;
})
{
    const dialog = useRef<HTMLDialogElement>(null);
    const list = useRef<HTMLFieldSetElement>(null);
    const verbsBar = useRef<HTMLDivElement>(null);
    const go = useRef<HTMLButtonElement>(null);
    const closer = useRef<HTMLButtonElement>(null);
    // The verb whose on whom is being chosen, in the card's second step; the verb without anyone that asks to confirm, and since when.
    const [verb, setVerb] = useState<ActVerb>();
    const [confirming, setConfirming] = useState<ActVerb>();
    const confirmedAt = useRef(0);
    const [target, setTarget] = useState<ActTarget | "square">();
    const [square, setSquare] = useState("");
    const [problem, setProblem] = useState<string>();
    const [sending, setSending] = useState(false);
    const sendingNow = useRef(false);
    // The text of the thing's page: undefined while it is read, empty for a page of data alone, null when the character knows no page of it.
    const [about, setAbout] = useState<string | null>();
    // What the page says of the thing as data, as damage and weight, or a spell's range (D-573, D-581).
    const [data, setData] = useState<SheetValue[]>([]);
    const map = place?.map;
    // With a map at the place, on whom is chosen on it too, by a click.
    const mapShown = map !== undefined && place !== undefined && verb !== undefined;
    const people = actPeople(place, scene, companions, self);
    const chosen = chosenTarget(target, square);
    // While the master waits for an answer, the verbs wait (D-581): talking answers in words.
    const waiting = reply === "answer";
    // With more than one player character the sentence starts with who acts (D-480 (8)).
    const sentence = (one: ActVerb, on: ActTarget = "none"): string => spokenBy(actSentence(one, start.item, on), self);
    const facts = verb === undefined ? start.facts ?? [] : [];

    // A modal dialog lies over everything on the page and closes with Escape by itself; the thing's page is read once, when it opens.
    useEffect(() => {
        dialog.current?.showModal();
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

    // On whom is the next choice: the focus on the first of the list.
    useEffect(() => {
        if (verb !== undefined) {
            list.current?.querySelector<HTMLInputElement>("input[type=radio]")?.focus();
        }
    }, [verb]);

    const verbButton = (one: ActVerb | undefined): HTMLButtonElement | null | undefined => verbsBar.current?.querySelector<HTMLButtonElement>(`button[data-verb="${one ?? ""}"]`);

    const tell = async (words: string): Promise<void> => {
        sendingNow.current = true;
        setSending(true);
        const failed = await onSend(words);
        sendingNow.current = false;
        setSending(false);

        if (failed === undefined) {
            dialog.current?.close();
            return;
        }

        // Failed, the verb is as before the first click, the problem under the verbs.
        const was = confirming;
        setConfirming(undefined);
        setProblem(failed);
        requestAnimationFrame(() => (verb === undefined ? verbButton(was)?.focus() : go.current?.focus()));
    };

    // A verb with someone to act on leads to on whom; one without asks to confirm on its button, and a second click, not part of a double one, sends it.
    const press = (one: ActVerb): void => {
        if (waiting || sending) {
            return;
        }

        if (targetMode(one) !== "none") {
            setVerb(one);
            setTarget(undefined);
            setSquare("");
            setConfirming(undefined);
            setProblem(undefined);
            return;
        }

        if (confirming !== one) {
            setConfirming(one);
            confirmedAt.current = performance.now();
            setProblem(undefined);
            return;
        }

        if (performance.now() - confirmedAt.current >= doubleClick) {
            void tell(sentence(one));
        }
    };

    // Leaving the button leaves the confirmation, except while it goes to the master.
    const leave = (one: ActVerb): void => {
        if (!sendingNow.current) {
            setConfirming((now) => (now === one ? undefined : now));
        }
    };

    // The first Escape leaves the confirmation; the next closes the card.
    const cancel = (event: Event): void => {
        if (confirming !== undefined) {
            event.preventDefault();
            setConfirming(undefined);
        }
    };

    // Back to the thing, the focus on the verb that was chosen.
    const back = (): void => {
        const was = verb;
        setVerb(undefined);
        setProblem(undefined);
        requestAnimationFrame(() => verbButton(was)?.focus());
    };

    const choose = (one: ActTarget | "square"): void => {
        setTarget(one);
        setProblem(undefined);
    };

    const submit = (event: Event): void => {
        event.preventDefault();

        if (verb !== undefined && chosen !== undefined && !sending) {
            void tell(sentence(verb, chosen));
        }
    };

    // Enter on a choice of the list takes the player to the button that sends.
    const toButton = (event: KeyboardEvent): void => {
        if (event.key === "Enter") {
            event.preventDefault();
            go.current?.focus();
        }
    };

    const close = (): void => dialog.current?.close();
    const personChosen = typeof target === "object" && "person" in target ? target.person : undefined;
    const option = (key: string, one: ActTarget | "square", label: ComponentChildren, kind = "") => (
        <label key={key} class={["act-who-one", kind].filter((name) => name !== "").join(" ")}>
            <input type="radio" name="act-who" checked={sameTarget(target, one)} onChange={() => choose(one)} onKeyDown={toButton} />
            {label}
        </label>
    );
    const confirmLabel = (one: ActVerb): string => t("Confirm: {sentence}", { sentence: withoutFullStop(sentence(one)) });

    return (
        <dialog
            ref={dialog}
            class={mapShown ? "map-sheet act-sheet wide" : "map-sheet act-sheet"}
            aria-labelledby="act-sheet-title"
            aria-describedby={facts.length > 0 ? "act-facts" : undefined}
            onCancel={cancel}
            onClose={onClose}
        >
            <ActHead title={verb === undefined ? start.item : actTitle(verb, start.item)} facts={facts} closer={closer} {...(verb === undefined ? {} : { onBack: back })} onClose={close} />
            {verb === undefined && (
                <>
                    {/* A page of data alone, as a weapon's, says no more than its data; no page at all, that the character knows only the name. */}
                    {data.length > 0 && (
                        <dl class="act-data">
                            {data.map((value) => (
                                <div key={value.field}>
                                    <dt class="eyebrow">{fieldLabel(value.field)}</dt>
                                    <dd>{dataText(value)}</dd>
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
                        <div class="act-verbs">
                            {waiting && start.verbs.length > 0 && (
                                <p id="act-wait" class="act-note">
                                    <Icon name="bell" />
                                    {t("The master is waiting for your answer: answer that first.")}
                                </p>
                            )}
                            <div ref={verbsBar} class="act-buttons" role="group" aria-label={t("What you do")}>
                                {/* A document is read again where the World keeps them, before anything is done with it. */}
                                {start.document === true && (
                                    <a class="map-sheet-go act-go" href={sectionAddress("world", "documents", start.page ?? start.item)} onClick={close}>
                                        {t("Read it")}
                                    </a>
                                )}
                                {start.verbs.map((one, index) => {
                                    const primary = confirming === undefined ? index === 0 && start.document !== true : confirming === one;
                                    return (
                                        <button
                                            key={one}
                                            type="button"
                                            data-verb={one}
                                            class={confirming === one ? "map-sheet-go act-go says confirming" : primary ? "map-sheet-go act-go" : "act-cancel"}
                                            disabled={sending && confirming === one}
                                            aria-disabled={waiting ? "true" : undefined}
                                            aria-describedby={waiting ? "act-wait" : undefined}
                                            onClick={() => press(one)}
                                            onBlur={() => leave(one)}
                                        >
                                            {confirming === one ? confirmLabel(one) : verbLabel(one)}
                                        </button>
                                    );
                                })}
                            </div>
                            {problem && <p class="act-problem" role="alert">{problem}</p>}
                            <p class="visually-hidden" role="status">{confirming === undefined ? "" : t("Press again to tell the master.")}</p>
                        </div>
                    )}
                </>
            )}
            {verb !== undefined && (
                <>
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
                                    onKeyDown={toButton}
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
                    <form class="act-bar" onSubmit={submit}>
                        {problem && <p class="act-problem" role="alert">{problem}</p>}
                        <div class="act-buttons">
                            <button type="button" class="act-cancel" onClick={close}>{t("Cancel")}</button>
                            <button ref={go} type="submit" class="map-sheet-go act-go says" disabled={sending || chosen === undefined}>
                                {chosen === undefined ? t("Choose on whom") : withoutFullStop(sentence(verb, chosen))}
                                {chosen !== undefined && <Icon name="send" />}
                            </button>
                        </div>
                    </form>
                </>
            )}
        </dialog>
    );
}

/** On whom the player chose: undefined while nothing is, or a square not yet written. */
function chosenTarget(target: ActTarget | "square" | undefined, square: string): ActTarget | undefined
{
    if (target !== "square") {
        return target;
    }

    return square.trim() === "" ? undefined : { square: square.trim().toUpperCase() };
}

/** Whether two choices of the list are the same. */
function sameTarget(target: ActTarget | "square" | undefined, other: ActTarget | "square"): boolean
{
    if (typeof target === "object" && typeof other === "object") {
        return "person" in target && "person" in other && target.person === other.person;
    }

    return target === other;
}

/** A value of a thing's data as its card reads it: yes or no for true and false, else its text with a capital. */
function dataText(value: SheetValue): string
{
    const text = value.text.trim().toLowerCase();
    return text === "true" ? t("Yes") : text === "false" ? t("No") : phraseLabel(shownText(value.text, value.kind));
}
