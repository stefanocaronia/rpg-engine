// The table, beside the page on a wide screen: what changes while the game goes on, always in sight as the page scrolls. The order of the turns while a fight is
// open, the quests the player follows, and the rolls, up to twelve before their list scrolls inside; each card closes to its header. The whole table folds into
// a tab on the window's edge, and opens again from it, as the browser remembers (D-293).
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { cardIcons, Icon, iconPath } from "./icons.tsx";
import { t } from "./text.ts";

// The gap between the table and the window's foot; how many rolls the list shows before it scrolls inside. Where the browser remembers that the player folded
// the table, as it did the rolls.
const windowMargin = 12;
const mostRolls = 12;

// How the table slides out to its side and back, as the master's question folds: the page's width changes once, before it comes in or after it went.
const slideTime = 220;
const slideWay = 24;
const easeOut = "cubic-bezier(0.05, 0.7, 0.1, 1)";
const easeIn = "cubic-bezier(0.3, 0, 0.8, 0.15)";
const awayKey = "rpg-engine.rolls-away";

/** Whether the table stands beside the page: from this width, as in the style sheet; under it what it holds goes back to the page. */
export const tableBeside = "(min-width: 900px)";

/** The table, with the tab on the window's edge that folds it; `entering` when the player opened it, which slides it in and gives that tab the focus. */
export function PlayTable({ children, entering = false, onFold }: { children: ComponentChildren; entering?: boolean; onFold(): void; })
{
    const [track, setTrack] = useState<HTMLElement | null>(null);
    const tab = useRef<HTMLButtonElement>(null);
    useTableFit(track);

    useEffect(() => {
        if (entering && track !== null) {
            tab.current?.focus();
            void slide(track, true);
        }
    }, [track]);

    // It slides out, then the page takes its room.
    const fold = (): void => {
        if (track === null) {
            onFold();
            return;
        }

        slide(track, false).then(onFold, onFold);
    };

    // The tab stands apart from the table, which moves as it slides.
    return (
        <>
            <button ref={tab} type="button" class="table-fold tip-left" aria-label={t("Hide the panel")} aria-controls="play-table" aria-expanded={true} data-tip={t("Hide the panel")} onClick={fold}>
                <Icon name="aside" />
            </button>
            <div class="play-table" id="play-table" ref={setTrack}>
                <div class="play-table-stick">{children}</div>
            </div>
        </>
    );
}

/** The table folded: a tab on the window's edge with the marks of what it holds, which opens it again; with the focus when the player has just folded it. */
export function TableTab({ fight, focused = false, onOpen }: { fight: boolean; focused?: boolean; onOpen(): void; })
{
    const button = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (focused) {
            button.current?.focus();
        }
    }, []);

    return (
        <div class="table-away">
            <button ref={button} type="button" class="rolls-tab tip-left" aria-label={t("Show the panel")} aria-expanded={false} data-tip={t("Show the panel")} onClick={onOpen}>
                {fight && <TabMark path={iconPath("list")} />}
                <TabMark path={iconPath("journal")} />
                <TabMark path={cardIcons.rolls} />
            </button>
        </div>
    );
}

/** Whether the player folded the table (D-293), as this browser remembers it, and how to change it. */
export function useTableAway(): [boolean, (away: boolean) => void]
{
    const [away, setAway] = useState(readAway);
    return [
        away,
        (now) => {
            setAway(now);
            writeAway(now);
        },
    ];
}

/** The table sliding to its side, in or out, only its picture moving; at once with reduced motion. */
function slide(table: HTMLElement, entering: boolean): Promise<unknown>
{
    if (!matchMedia("(prefers-reduced-motion: no-preference)").matches) {
        return Promise.resolve();
    }

    // A short way, inside the page's margin: past the window's edge the page would grow wider at each frame.
    const away = { transform: `translateX(${document.documentElement.dir === "rtl" ? "-" : ""}${slideWay}px)`, opacity: 0 };
    const here = { transform: "none", opacity: 1 };
    return table.animate(entering ? [away, here] : [here, away], { duration: slideTime, easing: entering ? easeOut : easeIn, fill: entering ? "none" : "forwards" }).finished;
}

function TabMark({ path }: { path: string; })
{
    return (
        <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d={path} />
        </svg>
    );
}

/**
 * The table's measures, taken only when it or the window changes size, never as the page scrolls. The rolls' list grows with its rolls up to twelve, as tall as
 * its first one draws, then scrolls inside. The table stays at the top while it fits the window; taller, its top goes up so that it scrolls with the page until
 * its foot reaches the window's and stays there, the end of the rolls always in reach.
 */
function useTableFit(track: HTMLElement | null): void
{
    useEffect(() => {
        if (track === null) {
            return;
        }

        const stick = track.querySelector<HTMLElement>(".play-table-stick");
        let asked = 0;

        const measure = (): void => {
            asked = 0;

            if (stick === null) {
                return;
            }

            const rows = stick.querySelector<HTMLElement>(".roll-list");
            const first = rows?.firstElementChild;

            if (rows !== null && first instanceof HTMLElement) {
                const gap = Number.parseFloat(getComputedStyle(rows).rowGap) || 0;
                track.style.setProperty("--list-room", `${Math.ceil(mostRolls * first.offsetHeight + (mostRolls - 1) * gap)}px`);
            }

            const style = getComputedStyle(stick);
            const pixels = (name: string): number => Number.parseFloat(style.getPropertyValue(name)) || 0;
            const stuckTop = pixels("--gap") + pixels("--top-space") + pixels("--asked-space");
            const windowFoot = window.innerHeight - windowMargin;

            if (stick.offsetHeight > windowFoot - stuckTop) {
                track.style.setProperty("--table-top", `${Math.floor(windowFoot - stick.offsetHeight)}px`);
            } else {
                track.style.removeProperty("--table-top");
            }
        };

        const update = (): void => {
            asked ||= requestAnimationFrame(measure);
        };

        // The table's height changes as cards open and close, fighters come and go and rolls come in.
        const sizes = new ResizeObserver(update);

        if (stick !== null) {
            sizes.observe(stick);
        }

        window.addEventListener("resize", update);
        // The table's top changes as the page's top or what the master asks come and go.
        track.addEventListener("transitionend", update);
        update();

        return () => {
            cancelAnimationFrame(asked);
            sizes.disconnect();
            window.removeEventListener("resize", update);
            track.removeEventListener("transitionend", update);
            track.style.removeProperty("--list-room");
            track.style.removeProperty("--table-top");
        };
    }, [track]);
}

function readAway(): boolean
{
    try {
        return localStorage.getItem(awayKey) === "away";
    } catch {
        return false;
    }
}

function writeAway(away: boolean): void
{
    try {
        localStorage.setItem(awayKey, away ? "away" : "beside");
    } catch {
        // The page forgets it at the next reload.
    }
}
