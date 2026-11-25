// The chat beside the page (D-582): a panel at the window's left or right, under the page's top or, as the player switches it, as tall as the window, the
// page's top beside it; with the chat in it as it is in its section; its inner edge is dragged, or moved with the arrows, to make it wider or narrower.
// Three small buttons in the chat's head say where the chat stands: in its tab, on the left, on the right; who wants it out of the way puts it back in its tab.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Icon, type IconName } from "../parts/icons.tsx";
import { chatSidePref, chatTallPref, chatWidthKey, useChoice, useKeptText, usePref } from "../shell/prefs.ts";
import { pageDirection, t } from "../text.ts";
import { type ChatSide, chatSide, dockWidth, dockWidths, keptWidth, widthAfterKey, widthAtPointer } from "./dock.ts";
import type { ChatGame } from "./log.tsx";
import { ChatPage } from "./page.tsx";
import type { ChatAsking } from "./question.tsx";
import type { MasterChat } from "./sending.ts";

/** Where the chat stands and how, as the player left it in this browser and as the window allows. */
export interface ChatDock
{
    /** Where the player has the chat, or the page's own side until they choose. */
    side: ChatSide;
    /** The panel's width in this window; none in a window too narrow for a panel, or where the chat has no panel at all. */
    width: number | undefined;
    /** The chat stands beside the page: its section is gone from the page. */
    docked: boolean;
    windowWidth: number;
    setSide(side: ChatSide): void;
    setWidth(width: number): void;
}

/** The chat's place as this browser keeps it; `available` where the page has a chat that may leave its section: at a campaign's table, out of the setup. */
export function useChatDock(available: boolean): ChatDock
{
    const [chosen, setChosen] = useChoice(chatSidePref);
    const [kept, setKept] = useKeptText(chatWidthKey);
    const windowWidth = useWindowWidth();
    const side = chatSide(chosen, pageDirection());
    const width = available ? dockWidth(keptWidth(kept), windowWidth) : undefined;
    return {
        side,
        width,
        docked: width !== undefined && side !== "tab",
        windowWidth,
        setSide: setChosen,
        setWidth: (next) => setKept(String(next)),
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

/** The chat's panel at a side of the window. */
export function ChatPanel({ chat, side, width, windowWidth, asking, game, onSide, onWidth }: {
    chat: MasterChat;
    /** The question the page is asked now, and what the chat's rolls are drawn with. */
    asking?: ChatAsking | undefined;
    game: ChatGame;
    side: "left" | "right";
    width: number;
    windowWidth: number;
    onSide(side: ChatSide): void;
    /** The width the player gave it, kept. */
    onWidth(width: number): void;
})
{
    const panel = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);
    const [tall, setTall] = usePref(chatTallPref);
    useTopEdge(panel, tall);
    const tallName = t("As tall as the window");

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
        <div ref={panel} class={["chat-panel", `side-${side}`, tall && "tall", dragging && "dragging"].filter(Boolean).join(" ")}>
            <ChatPage
                chat={chat}
                place="dock"
                asking={asking}
                game={game}
                tools={
                    <>
                        <ChatPlaces side={side} onSide={onSide} />
                        <span class="segmented chat-places chat-tall">
                            <button type="button" class="tip-below" aria-pressed={tall} aria-label={tallName} data-tip={tallName} onClick={() => setTall(!tall)}>
                                <Icon name="dockTall" />
                            </button>
                        </span>
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

/**
 * The panel's top at the line under the page's sections, where the row of where the party is starts, on the page for the top too: the top is taller at the
 * page's start and draws itself together down the page, measured as it changes, never as the page scrolls; none for the tall panel.
 */
function useTopEdge(panel: { current: HTMLElement | null; }, tall: boolean): void
{
    useLayoutEffect(() => {
        const top = document.querySelector<HTMLElement>("header.top");
        const page = panel.current?.closest<HTMLElement>(".page");

        if (top === null || top === undefined || page === null || page === undefined || tall) {
            return;
        }

        const measure = (): void => {
            const place = top.querySelector<HTMLElement>(".top-place");
            const edge = place === null ? top.getBoundingClientRect().bottom : place.getBoundingClientRect().top + place.clientTop;
            page.style.setProperty("--dock-top", `${Math.round(edge)}px`);
        };

        const sizes = new ResizeObserver(measure);
        sizes.observe(top);
        measure();

        return () => {
            sizes.disconnect();
            page.style.removeProperty("--dock-top");
        };
    }, [tall]);
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
