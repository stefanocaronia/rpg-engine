// The Chat section (D-582), there only where the campaign's table keeps the chat with the master: its messages, with the master's questions and the rolls
// among them, then, while a chat is open, what the master is doing and the player's words, with what sends them or stops the master; with none open, where
// one is opened, or the line that says a chat opened by hand plays the campaign. Its place in the page is this section, the panel beside the page, and in
// the setup, which has no sections, beside its questions or under them.
import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { MasterShown } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { PageHead } from "../shell/pages.tsx";
import { t } from "../text.ts";
import { chatApp, chatNews, chatOffer, type ChatPlace, chatRoom, type ChatView, chatView, choiceLine, endedWords, expiredHost, firstAnswerDue, turnDoing, turnWords, waitingQuestion } from "./chat.ts";
import { type ChatGame, ChatLog } from "./log.tsx";
import { ModelPicker } from "./models.tsx";
import { ChatOffering } from "./offer.tsx";
import type { ChatAsking } from "./question.tsx";
import type { MasterChat } from "./sending.ts";
import { ChatStart } from "./start.tsx";
import { ChatWords } from "./words.tsx";

/**
 * The chat in its place; `entering` when the page itself led here, as when the setup ends under an open chat: then the player's words take the focus.
 * `tools` are the place's own controls, at the end of the chat's head: where the chat stands. `asking` is the question the page is asked now and where it
 * is answered, for the one that waits among the messages; `game` what the rolls among them are drawn with.
 */
export function ChatPage({ chat, place = "section", entering = false, tools, asking, game }: {
    chat: MasterChat;
    place?: ChatPlace;
    entering?: boolean;
    tools?: ComponentChildren;
    asking?: ChatAsking | undefined;
    game: ChatGame;
})
{
    const shown = chat.shown;
    const root = useRef<HTMLElement>(null);
    // What a screen reader is told, once, as the chat changes.
    const [told, setTold] = useState("");
    const before = useRef<MasterShown | undefined>(undefined);
    // What had the focus in the chat last: when it goes with its view, the focus goes to the view that comes, never to the page.
    const held = useRef<Element | null>(null);
    const view = shown === undefined ? undefined : chatView(shown);
    const state = shown?.chat?.state;
    const viewBefore = useRef<ChatView | undefined>(undefined);
    useRoom(root, view === "open" && place !== "dock", place);

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

    // What had the focus went away, as the button that opened the chat, Stop at the turn's end, or Open as the table said to sign in first: the focus goes
    // to the words, or to what opens a chat or sets its app up. Looked at after every change, as an app's state changes neither the view nor the chat's.
    useEffect(() => {
        const gone = held.current !== null && !held.current.isConnected;

        if (gone && (document.activeElement === null || document.activeElement === document.body)) {
            const next = view === "open" ? "#chat-words" : ".chat-start .button.gold";
            const taking = root.current?.querySelector<HTMLElement>(next) ?? root.current?.querySelector<HTMLElement>(".chat-log");
            // Into sight by the shortest way, clear of the dice's button: the browser's own way would put it in the window's middle, and why the chat ended out of it.
            taking?.focus({ preventScroll: true });
            taking?.scrollIntoView({ block: "nearest" });
        }
    });

    if (shown === undefined || view === undefined) {
        return <PageHead section="chat" id="chat-title" />;
    }

    const waiting = waitingQuestion(shown.messages) !== undefined;
    const turn = turnWords(shown.chat, waiting);
    const waits = turnDoing(shown.chat, waiting) === "asks";
    // What the open chat offers in place of writing; with messages it stands at their end, with none in their place.
    const offer = view === "open" ? chatOffer(shown) : undefined;
    const some = shown.messages.length > 0;
    const offering = offer === undefined ? undefined : <ChatOffering offer={offer} busy={chat.sending} alone={!some} onSend={(words) => void chat.say(words)} />;
    const open = view === "open" ? shown.chat : undefined;
    const playing = open === undefined ? undefined : shown.hosts.find((one) => one.id === open.host);
    // The model of the open chat changes from under its words, where the app lets it, between two turns: its levels of thinking as the app said them once
    // it was chosen, else as its list says. Another model is asked without a level: the table keeps the one chosen where that model takes it, and says so
    // in a line where it does not. Default stands only while no level holds.
    const switcher = open?.changes === true && playing !== undefined && playing.models.length > 0
        ? (
            <ModelPicker
                host={playing}
                id="chat-switch"
                foot
                model={open.model}
                effort={open.effort}
                efforts={open.efforts}
                fallback={open.effort === undefined}
                off={open.state === "turn" ? t("You can change it when the master has answered.") : undefined}
                onPick={(model) => model !== "" && model !== open.model && void chat.switchModel(model, undefined)}
                onEffort={(effort) => effort !== (open.effort ?? "") && void chat.switchModel(open.model, effort === "" ? undefined : effort)}
            />
        )
        : undefined;
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
            <div class="chat-head">
                <PageHead section="chat" id="chat-title" />
                {tools}
            </div>
            <p class="visually-hidden" role="status">{told}</p>
            <div class="card chat-box">
                {some && <ChatLog messages={shown.messages} asking={asking} game={game} app={chatApp(shown)} foot={offering} />}
                {!some && view === "open" && <div class="chat-empty">{offering}</div>}
                {turn !== undefined && (
                    <p class={waits ? "chat-turn waits" : "chat-turn"}>
                        {/* The master at work, a die that turns; the master waiting for the player, a still light that breathes now and then. */}
                        {waits ? <span class="chat-waits" aria-hidden="true" /> : <Icon name="dieTurning" />}
                        <span class="chat-turn-words">{turn}</span>
                    </p>
                )}
                <FirstAnswer due={firstAnswerDue(shown) && !waits} />
                {view === "ended" && (
                    <p class="chat-note problem" dir="auto">
                        <Icon name="alert" />
                        {endedWords(shown.chat?.why, expiredHost(shown))}
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
                        text={chat.draft}
                        state={shown.chat.state}
                        answers={shown.chat.answers === true && asking?.words !== false}
                        sending={chat.sending}
                        plays={choiceLine(shown, shown.chat)}
                        app={playing?.name}
                        model={switcher}
                        onText={chat.setDraft}
                        onSend={async (words) => {
                            if (await chat.say(words)) {
                                chat.setDraft("");
                                root.current?.querySelector<HTMLElement>("#chat-words")?.focus();
                            }
                        }}
                        onStop={() => void chat.stop()}
                        onClose={() => void chat.close()}
                    />
                )}
                {(view === "start" || view === "ended") && <ChatStart shown={shown} sending={chat.sending} onOpen={(choice, fresh) => chat.open(choice, fresh)} onWish={(wish) => void chat.wish(wish)} />}
            </div>
        </section>
    );
}

// How long the master's first answer takes before the page says that a long one is normal.
const firstAnswerWait = 8000;

/**
 * While the master's first answer of a chat is due: after some seconds, a quiet line that says a long wait is normal, as the app starts and the master sets
 * the scene. No count, no bar: the turn's line says the master is at work.
 */
function FirstAnswer({ due }: { due: boolean; })
{
    const [long, setLong] = useState(false);

    useEffect(() => {
        setLong(false);

        if (!due) {
            return;
        }

        const timer = setTimeout(() => setLong(true), firstAnswerWait);
        return () => clearTimeout(timer);
    }, [due]);

    return due && long ? <p class="chat-turn-note">{t("The master is setting the scene: the first answer can take a couple of minutes.")}</p> : null;
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
