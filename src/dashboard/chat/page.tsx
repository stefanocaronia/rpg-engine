// The Chat section (D-582), there only where the campaign's table keeps the chat with the master: its messages, with the master's questions and the rolls
// among them, then, while a chat is open, what the master is doing and the player's words, with what sends them or stops the master; with none open, where
// one is opened, or the line that says a chat opened by hand plays the campaign: never the messages of a chat that is not open (T-307). Its place in
// the page is this section, the panel beside the page, and in the setup, which has no sections, beside its questions or under them.
import type { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { MasterShown } from "../data.ts";
import { useMedia } from "../parts/card.tsx";
import { Icon } from "../parts/icons.tsx";
import { PageHead } from "../shell/pages.tsx";
import { tableSection } from "../shell/table.tsx";
import { t } from "../text.ts";
import { chatApp, chatNews, chatOffer, type ChatPlace, chatRoom, type ChatView, chatView, choiceLine, effortsOf, endedWords, expiredHost, firstAnswerDue, proposedEffort, turnDoing, turnWords, waitingQuestion } from "./chat.ts";
import { type ChatGame, ChatLog } from "./log.tsx";
import { ModelPicker } from "./models.tsx";
import { ChatOffering } from "./offer.tsx";
import type { ChatAsking } from "./question.tsx";
import type { MasterChat } from "./sending.ts";
import { chatSheetLabel, chatSheetNote } from "./sheet.tsx";
import { ChatStart } from "./start.tsx";
import { ChatWords, touchPhone } from "./words.tsx";

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
    // On a phone's width what stands under the player's words is in the chat's own sheet, the model's button as wide as it; a model chosen there closes
    // the sheet, as what became of the change is a line among the messages.
    const phone = useMedia(tableSection);
    const [sheet, setSheet] = useState(false);
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
    // On a phone it goes to the messages in place of the words, which would call the keyboard over them.
    useEffect(() => {
        const gone = held.current !== null && !held.current.isConnected;

        if (gone && (document.activeElement === null || document.activeElement === document.body)) {
            const next = view !== "open" ? ".chat-start .button.gold" : matchMedia(touchPhone).matches ? ".chat-log" : "#chat-words";
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
    // it was chosen, else as its list says. Another model is asked with its level: the one chosen where that model takes it, else the one proposed for it;
    // with none where its levels are not known until it is chosen. On a phone it changes from the chat's sheet, named and described by the sheet's lines.
    const switcher = open?.changes === true && playing !== undefined && playing.models.length > 0
        ? (
            <ModelPicker
                host={playing}
                id="chat-switch"
                foot={!phone}
                {...(phone ? { labelledBy: chatSheetLabel, describedBy: chatSheetNote } : {})}
                model={open.model}
                effort={open.effort}
                efforts={open.efforts}
                off={open.state === "turn" ? t("You can change it when the master has answered.") : undefined}
                onPick={(model) => {
                    setSheet(false);

                    if (model !== open.model) {
                        void chat.switchModel(model, proposedEffort(effortsOf(playing, model), open.effort));
                    }
                }}
                onEffort={(effort) => effort !== open.effort && void chat.switchModel(open.model, effort)}
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
                {/* The messages are the open chat's alone: a chat closed, ended or played elsewhere shows none. */}
                {some && view === "open" && <ChatLog messages={shown.messages} asking={asking} game={game} app={chatApp(shown)} foot={offering} />}
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
                        sheet={phone ? sheet : undefined}
                        onSheet={setSheet}
                        onText={chat.setDraft}
                        onSend={async (words) => {
                            if (await chat.say(words)) {
                                chat.setDraft("");
                                const field = root.current?.querySelector<HTMLElement>("#chat-words");

                                // The field keeps the focus for the next words; on a phone it lets go of it, so that the keyboard leaves the window to the answer.
                                if (matchMedia(touchPhone).matches) {
                                    field?.blur();
                                } else {
                                    field?.focus();
                                }
                            }
                        }}
                        onStop={() => void chat.stop()}
                        onClose={() => void chat.close()}
                    />
                )}
                {(view === "start" || view === "ended") && <ChatStart shown={shown} sending={chat.sending} closed={view === "start" && some} onOpen={(choice, fresh) => chat.open(choice, fresh)} onWish={(wish) => void chat.wish(wish)} />}
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
 * who scrolls to it. Measured when the window or what stands over it changes, never as the page scrolls. On a phone, while the player writes in it, the bar
 * steps aside and the chat takes the whole window over the keyboard, the page scrolled up to its top; then the page goes back where it was.
 */
function useRoom(root: { current: HTMLElement | null; }, open: boolean, place: ChatPlace): void
{
    useLayoutEffect(() => {
        const box = root.current?.querySelector<HTMLElement>(".chat-box") ?? null;

        if (box === null || !open) {
            return;
        }

        let asked = 0;
        // Where the page stood before the player started writing, to go back there, and whether the chat took the window for it.
        let before: number | undefined;
        let typed = false;
        // In its section on a phone the chat is the window's own, down to the bar or the keyboard.
        const flush = (): boolean => place === "section" && matchMedia(tableSection).matches;

        const measure = (): void => {
            asked = 0;
            // The bar of the sections, where it stands at the window's foot; stepped aside, on a phone, for the keyboard of a field the player writes in.
            const bar = document.querySelector<HTMLElement>(".main-nav");
            const barShown = bar !== null && bar.getClientRects().length > 0 && getComputedStyle(bar).position === "fixed";
            const typing = place === "section" && bar !== null && !barShown && box.contains(document.activeElement);
            const foot = Math.min(barShown ? bar.getBoundingClientRect().top : window.innerHeight, keyboardTop());
            // Where the box starts in the page, how far under its own title, and what the page keeps clear at its foot for a field that takes the focus.
            const top = box.getBoundingClientRect().top + window.scrollY;
            const title = box.getBoundingClientRect().top - (root.current?.getBoundingClientRect().top ?? 0);
            const clear = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0;
            // Writing, the chat starts right under the page's top, which stays over the page.
            const under = document.querySelector(".top")?.getBoundingClientRect().bottom ?? 0;
            box.style.setProperty("--chat-room", `${chatRoom(place, { foot, top: typing ? under : top, title, clear, typing, flush: flush() })}px`);

            if (typing) {
                typed = true;
                window.scrollTo({ top: top - under, behavior: "instant" });
            } else {
                if (typed && before !== undefined) {
                    window.scrollTo({ top: before, behavior: "instant" });
                }

                typed = false;
                before = undefined;
            }
        };

        const update = (): void => {
            asked ||= requestAnimationFrame(measure);
        };

        // What stands over the chat comes and goes: the master's question, a notice, the top as it is measured.
        const sizes = new ResizeObserver(update);
        sizes.observe(document.body);

        // In its section on a phone the page is as tall as the window whatever it holds, and the body keeps its size: there each part of the page is
        // watched, as it comes, goes and changes size.
        const page = root.current?.closest(".page") ?? null;

        const phoneUpdate = (): void => {
            if (flush()) {
                update();
            }
        };

        const parts = new ResizeObserver(phoneUpdate);

        const coming = new MutationObserver(() => {
            [...(page?.children ?? [])].forEach((part) => parts.observe(part));
            phoneUpdate();
        });

        if (page !== null) {
            [...page.children].forEach((part) => parts.observe(part));
            coming.observe(page, { childList: true });
        }

        window.addEventListener("resize", update);
        window.visualViewport?.addEventListener("resize", update);

        // A field that takes or leaves the focus moves the bar aside or back; where the page stood is taken as the focus comes, before anything scrolls.
        const focused = (event: FocusEvent): void => {
            if (before === undefined && event.target instanceof Node && box.contains(event.target)) {
                before = window.scrollY;
            }

            update();
        };

        document.addEventListener("focusin", focused);
        document.addEventListener("focusout", update);
        measure();

        return () => {
            cancelAnimationFrame(asked);
            sizes.disconnect();
            parts.disconnect();
            coming.disconnect();
            window.removeEventListener("resize", update);
            window.visualViewport?.removeEventListener("resize", update);
            document.removeEventListener("focusin", focused);
            document.removeEventListener("focusout", update);
            box.style.removeProperty("--chat-room");
        };
    }, [open, place]);
}

/**
 * Where a phone's keyboard starts, in the window: the foot of what the window shows, which a keyboard laid over the page shortens, as Safari's does; past the
 * window's foot where nothing covers it, or the page is zoomed in, which shortens it too.
 */
function keyboardTop(): number
{
    const seen = window.visualViewport;
    return seen === null || seen.scale > 1.01 ? window.innerHeight : seen.height;
}
