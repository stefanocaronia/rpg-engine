// The player's words to the master in the open chat: a field that grows with them, Enter sends, Shift+Enter starts a new line; under it what the chat
// plays with, and what closes it. While the master answers the words wait in the field.
import { Icon } from "../parts/icons.tsx";
import { t } from "../text.ts";
import { sendsWords, wordsToSend } from "./chat.ts";

// How many characters the player's words may have, as the table takes them.
const mostWords = 20_000;

export function ChatWords({ text, state, sending, plays, onText, onSend, onClose }: {
    text: string;
    state: "idle" | "turn" | "ended";
    sending: boolean;
    /** The app, model and effort the chat plays with, in a line. */
    plays: string;
    onText(text: string): void;
    onSend(words: string): void;
    onClose(): void;
})
{
    const words = sending ? undefined : wordsToSend(text, state);

    const send = (event: Event): void => {
        event.preventDefault();

        if (words !== undefined) {
            onSend(words);
        }
    };

    return (
        <form class="chat-words" onSubmit={send}>
            <label for="chat-words" class="eyebrow chat-words-label">
                <Icon name="chat" />
                {t("Your words to the master")}
            </label>
            <textarea
                id="chat-words"
                class="chat-field"
                dir="auto"
                rows={2}
                maxLength={mostWords}
                value={text}
                onInput={(event) => onText(event.currentTarget.value)}
                onKeyDown={(event) => {
                    if (sendsWords(event)) {
                        send(event);
                    }
                }}
            />
            <div class="chat-foot">
                <span class="chat-plays" dir="ltr">{plays}</span>
                <button type="button" class="button quiet" onClick={onClose}>{t("Close the chat")}</button>
                <button type="submit" class="button gold" aria-disabled={words === undefined}>
                    {t("Send")}
                    <Icon name="send" />
                </button>
            </div>
        </form>
    );
}
