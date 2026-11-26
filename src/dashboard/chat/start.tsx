// Where a chat with the master is opened: the AI app, the model, how much the master thinks, then the last chat taken up or a new one. An app that is not
// ready says what it needs, and does it from here (T-290); the page looks at the apps again as the player comes back to its window.
import { useEffect, useRef, useState } from "preact/hooks";
import type { HostWish } from "../api.ts";
import type { ChatChoice, MasterShown } from "../data.ts";
import { t } from "../text.ts";
import { choiceOf, firstChoice, hostReady, hostState, resumes } from "./chat.ts";
import { ChoiceFields } from "./fields.tsx";

export function ChatStart({ shown, sending, onOpen, onWish }: {
    shown: MasterShown;
    sending: boolean;
    onOpen(choice: ChatChoice, fresh: boolean): Promise<unknown>;
    onWish(wish: HostWish): void;
})
{
    // A chat that ended as its app's sign-in ran out stays with that app, to sign in again and take it up.
    const [choice, setChoice] = useState(() => (shown.chat?.code === "signin" ? choiceOf(shown, shown.chat.host) : firstChoice(shown)));
    const [opening, setOpening] = useState(false);
    const host = shown.hosts.find((one) => one.id === choice?.host && hostState(one) !== "later");
    const states = shown.hosts.map((one) => `${one.id}:${hostState(one)}`).join();

    // An app ready since, as one just installed or signed in to, with none chosen; or the one chosen gone: the first choice anew.
    useEffect(() => {
        if (host === undefined) {
            setChoice(firstChoice(shown));
        }
    }, [states]);

    useLookAgain(shown.hosts.some((one) => !["ready", "later"].includes(hostState(one))), onWish);

    const ready = choice !== undefined && host !== undefined && hostReady(host) && choice.model.trim() !== "" && !sending;

    const open = (fresh: boolean): void => {
        if (ready) {
            setOpening(true);
            void onOpen({ ...choice, model: choice.model.trim() }, fresh).finally(() => setOpening(false));
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
            {shown.messages.length === 0 && host !== undefined && <p class="chat-about">{t("The master answers here, in your AI app on this computer: open the chat to play.")}</p>}
            <ChoiceFields shown={shown} choice={choice} onChoice={setChoice} onWish={onWish} />
            {choice !== undefined && host !== undefined && hostReady(host) && (
                <div class="chat-buttons">
                    {/* An app takes from a few seconds to some more to start: that it is normal, said while it does. */}
                    <p class="chat-hint chat-opening" role="status">{opening ? t("Opening the chat with {name}: it can take a few seconds.", { name: host.name }) : ""}</p>
                    {again && <button type="button" class="button" aria-disabled={!ready} onClick={() => open(true)}>{t("New chat")}</button>}
                    <button type="submit" class="button gold" aria-disabled={!ready} aria-busy={sending}>{again ? t("Resume the chat") : t("Open the chat")}</button>
                </div>
            )}
        </form>
    );
}

// How often coming back to the window looks at the apps again, at most: the table has its own limit too.
const lookEvery = 60_000;

/**
 * Has the apps looked at again as the player comes back to the window, while one of them waits for something done outside the page: installed by hand,
 * signed in to in the browser; once a minute at most.
 */
export function useLookAgain(waiting: boolean, onWish: (wish: HostWish) => void): void
{
    const looked = useRef(Number.NEGATIVE_INFINITY);

    useEffect(() => {
        if (!waiting) {
            return;
        }

        const back = (): void => {
            if (Date.now() - looked.current >= lookEvery) {
                looked.current = Date.now();
                onWish({ hosts: true });
            }
        };

        window.addEventListener("focus", back);
        return () => window.removeEventListener("focus", back);
    }, [waiting]);
}
