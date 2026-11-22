// Talking to someone from the page (D-495): the start of the sentence in a field, which the player goes on and sends; Enter sends, Escape closes.
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { spokenBy, talkSentence } from "./acts.ts";
import { ActHead } from "./head.tsx";
import type { ActReply } from "./sheet.tsx";

// How many characters a sentence may have, as the server takes them.
const mostWords = 500;

/** The card of talking to someone: the player's words under a visible label, and how they go, told or as the answer to the master's question (ASK-10). */
export function TalkSheet({ name, self, reply, asked, onSend, onClose }: {
    name: string;
    self?: string | undefined;
    reply: ActReply;
    asked?: { question: string; buttons: boolean; } | undefined;
    onSend(text: string): Promise<string | undefined>;
    onClose(): void;
})
{
    const dialog = useRef<HTMLDialogElement>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    // With more than one player character the sentence starts with who acts (D-480 (8)).
    const [text, setText] = useState(spokenBy(talkSentence(name), self));
    const [problem, setProblem] = useState<string>();
    const [sending, setSending] = useState(false);

    // A modal dialog lies over everything on the page and closes with Escape by itself; the cursor waits at the end of the words.
    useEffect(() => {
        dialog.current?.showModal();
        field.current?.focus();
        field.current?.setSelectionRange(field.current.value.length, field.current.value.length);
    }, []);

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

    const close = (): void => dialog.current?.close();
    const button = reply === "answer" ? t("Answer the master") : t("Tell the master");
    return (
        <dialog ref={dialog} class="map-sheet act-sheet" aria-labelledby="act-sheet-title" onClose={onClose}>
            <ActHead title={t("Talk to {name}", { name })} onClose={close} />
            <form class="act-bar" onSubmit={(event) => void send(event)}>
                {reply === "answer" && (
                    <p id="act-note" class="act-note act-answer">
                        <Icon name="bell" />
                        {asked?.buttons === true
                            ? t("These words answer the master instead of a roll or a button: {question}", { question: asked.question })
                            : t("These words answer the master's question: {question}", { question: asked?.question ?? "" })}
                    </p>
                )}
                {/* Named on the page, never taken for a thing's text: these are words that go to the master (T-218). */}
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
                {problem && <p class="act-problem" role="alert">{problem}</p>}
                <div class="act-buttons">
                    <button type="button" class="act-cancel" onClick={close}>{t("Cancel")}</button>
                    <button type="submit" class="map-sheet-go act-go" disabled={sending || text.trim() === ""}>
                        {button}
                        <Icon name="send" />
                    </button>
                </div>
            </form>
        </dialog>
    );
}
