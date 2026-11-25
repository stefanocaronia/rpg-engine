// The messages of the chat with the master, in order: the player's words at the end side, the master's as the text they write, a word of the table's as a
// notice. The list follows what comes while its end is in sight; farther up the player is reading, and it stays, with a button that leads back to the end.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { ChatMessage } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { Markdown } from "../parts/markdown.tsx";
import { t } from "../text.ts";
import { atEnd, speaker } from "./chat.ts";

export function ChatLog({ messages }: { messages: ChatMessage[]; })
{
    const list = useRef<HTMLDivElement>(null);
    // Whether the list shows its end, and so follows; and whether words came under what is in sight.
    const following = useRef(true);
    const [below, setBelow] = useState(false);
    const last = messages.at(-1);

    // At once, never smoothly: the end moves while the master writes, and a scroll on its way there would stop short of it.
    const toEnd = (): void => {
        const element = list.current;

        if (element !== null) {
            element.scrollTop = element.scrollHeight;
        }
    };

    const follow = (): void => {
        following.current = true;
        setBelow(false);
        toEnd();
    };

    // A message comes, or the last one grows: the player's own words always show; the master's only to who is at the end.
    useLayoutEffect(() => {
        if (following.current || last?.from === "player") {
            following.current = true;
            toEnd();
        } else {
            setBelow(true);
        }
    }, [messages.length, last?.id, last?.text.length]);

    // The list's own room changes, as the window does or the player's words grow under it: its end stays in sight for who was there.
    useEffect(() => {
        const element = list.current;

        if (element === null) {
            return;
        }

        const sizes = new ResizeObserver(() => {
            if (following.current) {
                toEnd();
            }
        });
        sizes.observe(element);
        return () => sizes.disconnect();
    }, []);

    const scrolled = (): void => {
        const element = list.current;
        following.current = element === null || atEnd(element);

        if (following.current) {
            setBelow(false);
        }
    };

    return (
        <div class="chat-log-frame">
            {/* No live region: a screen reader hears once that the master answered, then reads the words here. */}
            <div ref={list} class="chat-log" role="log" aria-live="off" aria-label={t("Chat with the master")} tabIndex={0} onScroll={scrolled}>
                <ol class="chat-messages">
                    {messages.map((message) => (
                        <li key={message.id} class={`chat-message from-${message.from}`}>
                            <span class="visually-hidden">{speaker(message.from)}</span>
                            {message.from === "table" && <Icon name="alert" />}
                            {message.from === "master"
                                ? (
                                    <div class="chat-prose" dir="auto">
                                        <Markdown text={message.text} lines />
                                    </div>
                                )
                                : <p class="chat-text" dir="auto">{message.text}</p>}
                        </li>
                    ))}
                </ol>
            </div>
            {below && (
                <button type="button" class="icon-button tonal chat-to-end" aria-label={t("Go to the last words")} data-tip={t("Go to the last words")} onClick={follow}>
                    <Icon name="more" />
                </button>
            )}
        </div>
    );
}
