// The chat beside the page (D-582): a panel at the window's left or right, under the page's top, as tall as the window, with the chat in it as it is in its
// section; its inner edge is dragged, or moved with the arrows, to make it wider or narrower; it folds into a tab on the window's edge, which has a dot while
// the master said something new. Three small buttons in the chat's head say where the chat stands: in its tab, on the left, on the right.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "../parts/icons.tsx";
import { chatFoldedPref, chatSidePref, chatWidthKey, useChoice, useKeptText, usePref } from "../shell/prefs.ts";
import { pageDirection, t } from "../text.ts";
import { type ChatSide, chatSide, dockWidth, dockWidths, keptWidth, widthAfterKey, widthAtPointer } from "./dock.ts";
import { ChatPage } from "./page.tsx";
import type { MasterChat } from "./sending.ts";

/** Where the chat stands and how, as the player left it in this browser and as the window allows. */
export interface ChatDock
{
    /** Where the player has the chat, or the page's own side until they choose. */
    side: ChatSide;
    /** The panel's width in this window; none in a window too narrow for a panel, or where the chat has no panel at all. */
    width: number | undefined;
    /** The chat stands beside the page, open or folded: its section is gone from the page. */
    docked: boolean;
    folded: boolean;
    windowWidth: number;
    setSide(side: ChatSide): void;
    setWidth(width: number): void;
    setFolded(folded: boolean): void;
}

/** The chat's place as this browser keeps it; `available` where the page has a chat that may leave its section: at a campaign's table, out of the setup. */
export function useChatDock(available: boolean): ChatDock
{
    const [chosen, setChosen] = useChoice(chatSidePref);
    const [folded, setFolded] = usePref(chatFoldedPref);
    const [kept, setKept] = useKeptText(chatWidthKey);
    const windowWidth = useWindowWidth();
    const side = chatSide(chosen, pageDirection());
    const width = available ? dockWidth(keptWidth(kept), windowWidth) : undefined;
    return {
        side,
        width,
        docked: width !== undefined && side !== "tab",
        folded,
        windowWidth,
        setSide: (next) => {
            setChosen(next);
            // A side chosen shows the chat there.
            setFolded(false);
        },
        setWidth: (next) => setKept(String(next)),
        setFolded,
    };
}

/** The three small buttons of the chat's head: where the chat stands, one among them, the chosen one in gold; one stop of Tab, the arrows moving among them as they stand. */
export function ChatPlaces({ side, onSide }: { side: ChatSide; onSide(side: ChatSide): void; })
{
    const places: { side: ChatSide; icon: IconName; name: string; }[] = [
        { side: "tab", icon: "dockTab", name: t("In its tab") },
        { side: "left", icon: "dockLeft", name: t("On the left") },
        { side: "right", icon: "dockRight", name: t("On the right") },
    ];

    const move = (event: KeyboardEvent): void => {
        const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
        const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button")];
        const from = buttons.indexOf(event.target as HTMLElement);

        if (step === 0 || from < 0) {
            return;
        }

        // The arrows move among them; a press chooses, as the chat leaves for another place of the page with it.
        event.preventDefault();
        buttons[(from + step + places.length) % places.length]?.focus();
    };

    // The window's own sides, as the pictures show them: never mirrored where the page is written from right to left.
    return (
        <span class="segmented chat-places" role="radiogroup" dir="ltr" aria-label={t("Where the chat stands")} onKeyDown={move}>
            {places.map((place) => (
                <button
                    key={place.side}
                    type="button"
                    role="radio"
                    class="tip-below"
                    data-side={place.side}
                    aria-checked={place.side === side}
                    aria-label={place.name}
                    data-tip={place.name}
                    tabIndex={place.side === side ? 0 : -1}
                    onClick={() => place.side !== side && onSide(place.side)}
                >
                    <Icon name={place.icon} />
                </button>
            ))}
        </span>
    );
}

/** The chat's panel at a side of the window; `focused` when the player has just opened it, which gives the focus to what folds it. */
export function ChatPanel({ chat, side, width, windowWidth, focused = false, onSide, onWidth, onFold }: {
    chat: MasterChat;
    side: "left" | "right";
    width: number;
    windowWidth: number;
    focused?: boolean;
    onSide(side: ChatSide): void;
    /** The width the player gave it, kept. */
    onWidth(width: number): void;
    onFold(): void;
})
{
    const panel = useRef<HTMLDivElement>(null);
    const fold = useRef<HTMLButtonElement>(null);
    const [dragging, setDragging] = useState(false);
    const hides = t("Hide the chat");
    useTopEdge(panel);

    useEffect(() => {
        if (focused) {
            fold.current?.focus();
        }
    }, []);

    // The width as the pointer drags the edge: on the page itself until the pointer lets go, so that nothing but the panel and the page's room are drawn anew.
    const drag = (event: PointerEvent): number | undefined => {
        const box = panel.current?.getBoundingClientRect();
        const next = box === undefined ? undefined : dockWidth(widthAtPointer(side, event.clientX, box), window.innerWidth);

        if (next !== undefined) {
            panel.current?.closest<HTMLElement>(".page")?.style.setProperty("--dock-width", `${next}px`);
        }

        return next;
    };

    return (
        <div ref={panel} class={dragging ? `chat-panel side-${side} dragging` : `chat-panel side-${side}`}>
            <ChatPage
                chat={chat}
                place="dock"
                tools={
                    <>
                        <ChatPlaces side={side} onSide={onSide} />
                        <button ref={fold} type="button" class="icon-button chat-fold tip-below" aria-label={hides} data-tip={hides} aria-expanded={true} onClick={onFold}>
                            <Icon name={side === "left" ? "toLeft" : "toRight"} />
                        </button>
                    </>
                }
            />
            <div
                class="chat-edge"
                role="separator"
                aria-orientation="vertical"
                aria-label={t("Width of the chat")}
                aria-valuenow={width}
                aria-valuemin={dockWidths.least}
                aria-valuemax={dockWidth(dockWidths.most, windowWidth) ?? dockWidths.most}
                tabIndex={0}
                onKeyDown={(event) => {
                    const next = widthAfterKey(event.key, width, side, window.innerWidth);

                    if (next !== undefined) {
                        event.preventDefault();
                        onWidth(next);
                    }
                }}
                onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(true);
                }}
                onPointerMove={(event) => dragging && drag(event)}
                onPointerUp={(event) => {
                    if (dragging) {
                        setDragging(false);
                        onWidth(drag(event) ?? width);
                    }
                }}
                onPointerCancel={() => {
                    setDragging(false);
                    panel.current?.closest<HTMLElement>(".page")?.style.setProperty("--dock-width", `${width}px`);
                }}
            />
        </div>
    );
}

/** The panel folded: a tab on the window's edge that opens it again, with a dot while the master said something new; with the focus when just folded. */
export function ChatTab({ side, unseen, focused = false, onOpen }: { side: "left" | "right"; unseen: boolean; focused?: boolean; onOpen(): void; })
{
    const button = useRef<HTMLButtonElement>(null);
    const name = unseen ? t("Show the chat, new words from the master") : t("Show the chat");

    useEffect(() => {
        if (focused) {
            button.current?.focus();
        }
    }, []);

    return (
        <button ref={button} type="button" class={`chat-tab side-${side}`} aria-label={name} data-tip={name} aria-expanded={false} onClick={onOpen}>
            <Icon name="chat" />
            {unseen && <span class="chat-dot" aria-hidden="true" />}
        </button>
    );
}

/** The panel's top under the page's top, which is taller at the page's start and draws itself together down the page: measured as it changes, never as the page scrolls. */
function useTopEdge(panel: { current: HTMLElement | null; }): void
{
    useLayoutEffect(() => {
        const top = document.querySelector<HTMLElement>("header.top");
        const element = panel.current;

        if (top === null || element === null) {
            return;
        }

        const measure = (): void => element.style.setProperty("--dock-top", `${Math.round(top.getBoundingClientRect().bottom)}px`);
        const sizes = new ResizeObserver(measure);
        sizes.observe(top);
        measure();
        return () => sizes.disconnect();
    }, []);
}

/** The window's width, as it changes. */
function useWindowWidth(): number
{
    const [width, setWidth] = useState(() => window.innerWidth);

    useEffect(() => {
        let asked = 0;

        const follow = (): void => {
            asked ||= requestAnimationFrame(() => {
                asked = 0;
                setWidth(window.innerWidth);
            });
        };

        window.addEventListener("resize", follow);

        return () => {
            cancelAnimationFrame(asked);
            window.removeEventListener("resize", follow);
        };
    }, []);

    return width;
}
