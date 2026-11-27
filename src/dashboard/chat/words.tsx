// The player's words to the master in the open chat, as an AI app has them: one rounded box with the words, which grows with them and then scrolls, and in
// its corner what sends them; Enter sends, Shift+Enter starts a new line. While the master answers, what stops them stands there, and the words wait in
// the field; while the master waits for an answer the player may give in words, the words are that answer, and go. Under the box, small, what the chat plays
// with, and what closes it; where the app lets the model change in an open chat, the model is a button that opens its list (T-290). The app's name is
// words: to play in another app the player closes the chat, and chooses where one is opened (T-307). On a phone the box is a bar as wide as the window,
// and nothing stands under it: one button at its start opens the chat's own sheet, with what it plays with and what closes it (T-321); on a phone's
// keyboard Enter starts a new line and the button alone sends, and what is touched beside the field leaves the keyboard where it is.
import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { Icon } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { sendsWords, wordsToSend } from "./chat.ts";
import { useShades } from "./shades.ts";
import { ChatSheet } from "./sheet.tsx";

// How many characters the player's words may have, as the table takes them.
const mostWords = 20_000;

/** A phone in the hand, as the style sheet has it: the page's phone width, and a finger for a pointer, which writes on a keyboard on the screen. */
export const touchPhone = "(pointer: coarse) and (max-width: 600px)";

export function ChatWords({ text, state, answers, sending, plays, app, model, sheet, onSheet, onText, onSend, onStop, onClose }: {
    text: string;
    state: "idle" | "turn" | "ended";
    /** The master waits for an answer the player's own words may give. */
    answers: boolean;
    sending: boolean;
    /** The app, model and effort the chat plays with, in a line. */
    plays: string;
    /** Where the model can change: the app's name, and the model's button after it. */
    app?: string | undefined;
    model?: ComponentChildren;
    /** On a phone's width, where what stands under the box is in the chat's sheet, which a button of the box opens: whether the sheet is open. */
    sheet?: boolean | undefined;
    onSheet?(open: boolean): void;
    onText(text: string): void;
    onSend(words: string): void;
    onStop(): void;
    onClose(): void;
})
{
    const words = sending ? undefined : wordsToSend(text, state, answers);
    const turn = state === "turn";
    // Past its eight lines the field scrolls, with no bar: its box's shades say where there is more.
    const field = useRef<HTMLTextAreaElement>(null);
    const shades = useShades(field, text);
    const phone = sheet !== undefined;
    // What the field is, said where it is empty: the player's words, or the answer in words to what the master asks.
    const what = answers ? t("Or write what you do…") : t("Your words to the master");

    const send = (event: Event): void => {
        event.preventDefault();

        if (words !== undefined) {
            onSend(words);
        }
    };

    // On a phone a touch on what sends or stops leaves the focus in the field: the keyboard stays, and nothing moves under the finger before its click.
    const keepKeyboard = (event: MouseEvent): void => {
        if (matchMedia(touchPhone).matches) {
            event.preventDefault();
        }
    };

    return (
        <form class="chat-words" onSubmit={send}>
            <label for="chat-words" class="visually-hidden">{t("Your words to the master")}</label>
            <div class={`chat-field-box ${shades}`}>
                {phone && (
                    <button type="button" class="icon-button chat-tune" aria-label={t("The chat: model, close")} aria-haspopup="dialog" aria-expanded={sheet} onClick={() => onSheet?.(true)}>
                        <Icon name="tune" />
                    </button>
                )}
                <textarea
                    ref={field}
                    id="chat-words"
                    class="chat-field"
                    dir="auto"
                    rows={1}
                    maxLength={mostWords}
                    placeholder={what}
                    value={text}
                    onInput={(event) => onText(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (sendsWords(event, matchMedia(touchPhone).matches)) {
                            send(event);
                        }
                    }}
                />
                {/* The field's own controls, at its end: one more, as a microphone, goes before these. */}
                <div class="chat-field-tools">
                    {turn && (
                        <button type="button" class="icon-button chat-stop tip-left" aria-label={t("Stop")} data-tip={t("Stop")} onMouseDown={keepKeyboard} onClick={onStop}>
                            <Icon name="stop" />
                        </button>
                    )}
                    {(!turn || answers) && (
                        <button type="submit" class="icon-button chat-send tip-left" aria-label={t("Send")} data-tip={t("Send")} aria-disabled={words === undefined} onMouseDown={keepKeyboard}>
                            <Icon name="send" />
                        </button>
                    )}
                </div>
            </div>
            {!phone && (
                <div class="chat-foot">
                    {model === undefined ? <span class="chat-plays" dir="ltr" title={plays}>{plays}</span> : (
                        <span class="chat-plays changes" dir="ltr">
                            <span class="chat-plays-app">{app}</span>
                            <span aria-hidden="true">·</span>
                            {model}
                        </span>
                    )}
                    <button type="button" class="chat-close" onClick={onClose}>{t("Close the chat")}</button>
                </div>
            )}
            {sheet === true && <ChatSheet plays={plays} app={app} model={model} turn={turn} onClose={() => onSheet?.(false)} onEnd={onClose} />}
        </form>
    );
}
