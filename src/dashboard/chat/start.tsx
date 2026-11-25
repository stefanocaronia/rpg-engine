// Where a chat with the master is opened: the AI app among those on this computer, the model, how much the master thinks, then the last chat taken up or a
// new one. An app that is not on this computer is only named, with what to do.
import { useEffect, useState } from "preact/hooks";
import type { ChatChoice, MasterShown } from "../data.ts";
import { t } from "../text.ts";
import { firstChoice, hostsFound, resumes } from "./chat.ts";
import { ChoiceFields } from "./fields.tsx";

export function ChatStart({ shown, sending, onOpen }: { shown: MasterShown; sending: boolean; onOpen(choice: ChatChoice, fresh: boolean): void; })
{
    const [choice, setChoice] = useState(() => firstChoice(shown));
    const { found } = hostsFound(shown);
    const host = found.find((one) => one.id === choice?.host);

    // An app found since, as one just installed, or the one chosen gone: the first choice anew.
    useEffect(() => {
        if (host === undefined) {
            setChoice(firstChoice(shown));
        }
    }, [found.map((one) => one.id).join()]);

    const ready = choice !== undefined && host !== undefined && choice.model.trim() !== "" && !sending;

    const open = (fresh: boolean): void => {
        if (ready) {
            onOpen({ ...choice, model: choice.model.trim() }, fresh);
        }
    };

    const again = choice !== undefined && resumes(shown, choice.host);
    return (
        <form
            class="chat-start"
            onSubmit={(event) => {
                event.preventDefault();
                open(!again);
            }}
        >
            {/* What this place is, until a chat has been played in it. */}
            {shown.messages.length === 0 && <p class="chat-about">{t("The master answers here, in your AI app on this computer: open the chat to play.")}</p>}
            <ChoiceFields shown={shown} choice={choice} onChoice={setChoice} />
            {choice !== undefined && host !== undefined && (
                <div class="chat-buttons">
                    {again && <button type="button" class="button" aria-disabled={!ready} onClick={() => open(true)}>{t("New chat")}</button>}
                    <button type="submit" class="button gold" aria-disabled={!ready} aria-busy={sending}>{again ? t("Resume the chat") : t("Open the chat")}</button>
                </div>
            )}
        </form>
    );
}
