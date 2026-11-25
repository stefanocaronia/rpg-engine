// The Chat section (D-582), there only where the campaign's table keeps the chat with the master: its messages, then, while a chat is open, what the master
// is doing with Stop and the player's words; with none open, where one is opened, or the line that says a chat opened by hand plays the campaign. Bare: its
// place in the page is this section, and in the setup, which has no sections, beside its questions or under them, until the page is laid out around it.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { MasterShown } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { PageHead } from "../shell/pages.tsx";
import { t } from "../text.ts";
import { chatNews, type ChatPlace, chatRoom, type ChatView, chatView, choiceLine, endedWords, turnWords } from "./chat.ts";
import { ChatLog } from "./log.tsx";
import type { MasterChat } from "./sending.ts";
import { ChatStart } from "./start.tsx";
import { ChatWords } from "./words.tsx";

/** The chat in its place; `entering` when the page itself led here, as when the setup ends under an open chat: then the player's words take the focus. */
export function ChatPage({ chat, place = "section", entering = false }: { chat: MasterChat; place?: ChatPlace; entering?: boolean; })
{
    const shown = chat.shown;
    const root = useRef<HTMLElement>(null);
    // The player's words, kept while the chat's place changes under them, as when its program ends.
    const [text, setText] = useState("");
    // What a screen reader is told, once, as the chat changes.
    const [told, setTold] = useState("");
    const before = useRef<MasterShown | undefined>(undefined);
    // What had the focus in the chat last: when it goes with its view, the focus goes to the view that comes, never to the page.
    const held = useRef<Element | null>(null);
    const view = shown === undefined ? undefined : chatView(shown);
    const state = shown?.chat?.state;
    const viewBefore = useRef<ChatView | undefined>(undefined);
    useRoom(root, view === "open", place);

    // The open chat of the section fills the window from the page's top: reached from a section read far down, the page goes back there. Under the setup's
    // questions it takes the window once the player opens it, never by itself as the page is read.
    useLayoutEffect(() => {
        const opened = viewBefore.current !== undefined && viewBefore.current !== "open" && view === "open";
        viewBefore.current = view;

        if (view === "open" && place === "section") {
            window.scrollTo({ top: 0 });
        } else if (opened && place === "under") {
            root.current?.scrollIntoView({ block: "start" });
        }
    }, [view, place]);

    useEffect(() => {
        if (shown !== undefined) {
            const news = before.current === undefined ? undefined : chatNews(before.current, shown);
            before.current = shown;

            if (news !== undefined) {
                setTold(news);
            }
        }
    }, [shown]);

    useEffect(() => {
        if (entering) {
            root.current?.querySelector<HTMLElement>("#chat-words")?.focus({ preventScroll: true });
        }
    }, []);

    // The chat moved on: what went wrong before says nothing of it now.
    useEffect(() => chat.forget(), [state]);

    // What had the focus went away, as the button that opened the chat or Stop at the turn's end: the focus goes to the words, or to what opens a chat.
    useEffect(() => {
        const gone = held.current !== null && !held.current.isConnected;

        if (gone && (document.activeElement === null || document.activeElement === document.body)) {
            const next = view === "open" ? "#chat-words" : ".chat-start .button.gold";
            const taking = root.current?.querySelector<HTMLElement>(next) ?? root.current?.querySelector<HTMLElement>(".chat-log");
            // Into sight by the shortest way, clear of the dice's button: the browser's own way would put it in the window's middle, and why the chat ended out of it.
            taking?.focus({ preventScroll: true });
            taking?.scrollIntoView({ block: "nearest" });
        }
    }, [view, state]);

    if (shown === undefined || view === undefined) {
        return <PageHead section="chat" id="chat-title" />;
    }

    const turn = turnWords(shown.chat);
    return (
        <section
            ref={root}
            class={`chat-page view-${view} chat-${place}`}
            aria-labelledby="chat-title"
            onFocusIn={(event) => {
                held.current = event.target instanceof Element ? event.target : null;
            }}
            onFocusOut={(event) => {
                // The focus left for something else of the page; with nothing named it may be that its control is going away.
                if (event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget) !== true) {
                    held.current = null;
                }
            }}
        >
            <PageHead section="chat" id="chat-title" />
            <p class="visually-hidden" role="status">{told}</p>
            <div class="card chat-box">
                {shown.messages.length > 0 && <ChatLog messages={shown.messages} />}
                {shown.messages.length === 0 && view === "open" && <p class="chat-empty">{t("Write to the master to begin: their answer comes here.")}</p>}
                {turn !== undefined && (
                    <p class="chat-turn">
                        <Icon name="hourglass" />
                        <span class="chat-turn-words">{turn}</span>
                        <button type="button" class="button" onClick={() => void chat.stop()}>{t("Stop")}</button>
                    </p>
                )}
                {view === "ended" && (
                    <p class="chat-note problem" dir="auto">
                        <Icon name="alert" />
                        {endedWords(shown.chat?.why)}
                    </p>
                )}
                {view === "elsewhere" && (
                    <p class="chat-note">
                        <Icon name="info" />
                        {t("A chat you opened yourself is playing this campaign: go on there, or close it to play here.")}
                    </p>
                )}
                {chat.problem !== undefined && <p class="chat-problem" role="alert" dir="auto">{chat.problem}</p>}
                {view === "open" && shown.chat !== undefined && (
                    <ChatWords
                        text={text}
                        state={shown.chat.state}
                        sending={chat.sending}
                        plays={choiceLine(shown, shown.chat)}
                        onText={setText}
                        onSend={async (words) => {
                            if (await chat.say(words)) {
                                setText("");
                                root.current?.querySelector<HTMLElement>("#chat-words")?.focus();
                            }
                        }}
                        onClose={() => void chat.close()}
                    />
                )}
                {(view === "start" || view === "ended") && <ChatStart shown={shown} sending={chat.sending} onOpen={(choice, fresh) => void chat.open(choice, fresh)} />}
            </div>
        </section>
    );
}

/**
 * The open chat as tall as the window leaves it, from where it starts to the window's foot, or to the bar of the sections on a phone: its messages scroll
 * inside it, and the player's words stay in sight. Under the setup's questions, far down the page, as tall as the window with its title, for the player
 * who scrolls to it. Measured when the window or what stands over it changes, never as the page scrolls.
 */
function useRoom(root: { current: HTMLElement | null; }, open: boolean, place: ChatPlace): void
{
    useLayoutEffect(() => {
        const box = root.current?.querySelector<HTMLElement>(".chat-box") ?? null;

        if (box === null || !open) {
            return;
        }

        let asked = 0;

        const measure = (): void => {
            asked = 0;
            // The bar of the sections, where it stands at the window's foot.
            const bar = document.querySelector<HTMLElement>(".main-nav");
            const foot = bar !== null && getComputedStyle(bar).position === "fixed" ? bar.getBoundingClientRect().top : window.innerHeight;
            // Where the box starts in the page, how far under its own title, and what the page keeps clear at its foot for a field that takes the focus.
            const top = box.getBoundingClientRect().top + window.scrollY;
            const title = box.getBoundingClientRect().top - (root.current?.getBoundingClientRect().top ?? 0);
            const clear = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0;
            box.style.setProperty("--chat-room", `${chatRoom(place, { foot, top, title, clear })}px`);
        };

        const update = (): void => {
            asked ||= requestAnimationFrame(measure);
        };

        // What stands over the chat comes and goes: the master's question, a notice, the top as it is measured.
        const sizes = new ResizeObserver(update);
        sizes.observe(document.body);
        window.addEventListener("resize", update);
        measure();

        return () => {
            cancelAnimationFrame(asked);
            sizes.disconnect();
            window.removeEventListener("resize", update);
            box.style.removeProperty("--chat-room");
        };
    }, [open, place]);
}
