// The open chat's own sheet on a phone: what stands under the player's words on a wide screen, here one touch away, so that nothing stands between the
// field and the keyboard. What the master plays with, whole: the app in words, then the model and its thinking, a button that opens the list of the
// models where the app lets them change, else words; why it cannot change now, written, as a phone shows no tooltip; and what closes the chat.
import type { ComponentChildren } from "preact";
import { PhoneSheet } from "../parts/phone-sheet.tsx";
import { t } from "../text.ts";

/** The line under what the master plays with, which says how it changes: the model's button is described by it. */
export const chatSheetNote = "chat-sheet-note";

/** The label over what the master plays with: the model's button is named by it, then by the model. */
export const chatSheetLabel = "chat-sheet-label";

export function ChatSheet({ plays, app, model, turn, onClose, onEnd }: {
    /** The app, model and effort the chat plays with, in a line. */
    plays: string;
    /** Where the model can change: the app's name, and the model's button. */
    app?: string | undefined;
    model?: ComponentChildren;
    /** The master answers: the model changes once they have. */
    turn: boolean;
    onClose(): void;
    /** Closes the chat. */
    onEnd(): void;
})
{
    return (
        <PhoneSheet title={t("The chat")} kind="chat-sheet" onClose={onClose}>
            <div class="chat-sheet-body">
                <p id={chatSheetLabel} class="eyebrow">{t("The master plays with")}</p>
                {model === undefined
                    ? (
                        <p class="chat-sheet-plays">
                            <bdi dir="ltr">{plays}</bdi>
                        </p>
                    )
                    : (
                        <>
                            <p class="chat-sheet-app">
                                <bdi>{app}</bdi>
                            </p>
                            {model}
                        </>
                    )}
                <p id={chatSheetNote} class="chat-hint">
                    {model === undefined
                        ? t("To play with another app or model, close the chat: the story stays.")
                        : turn
                        ? t("You can change it when the master has answered.")
                        : t("Touch the model above to change it. To play with another app, close the chat: the story stays.")}
                </p>
                <button
                    type="button"
                    class="button danger chat-sheet-end"
                    onClick={(event) => {
                        // The sheet first, so that the focus goes back to its button and not to the field, which would call the keyboard.
                        event.currentTarget.closest("dialog")?.close();
                        onEnd();
                    }}
                >
                    {t("Close the chat")}
                </button>
            </div>
        </PhoneSheet>
    );
}
