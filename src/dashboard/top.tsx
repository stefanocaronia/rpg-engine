// The page's top (D-276, D-293): the master large, the campaign's name with the product's and the system's below it, and as chips the game's time, its place
// and whether the game is live. Past it, a bar that stays on top with the same things, the master whole and moving, a little smaller, for its moods to be seen
// (D-295); what the master asks and the rolls stay in sight under it.
import { useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./icons.tsx";
import { Master } from "./master.tsx";

/** What the top says: the campaign, the product, the system's name, the game's time and place, and whether the game is live. */
interface TopOf
{
    campaign?: string;
    product: string;
    system?: string;
    now?: string;
    place?: string;
    live: boolean;
}

export function Top(top: TopOf)
{
    const header = useRef<HTMLElement>(null);
    const bar = useRef<HTMLDivElement>(null);
    const [past, setPast] = useState(false);

    // The bar comes when the top has gone out of sight.
    useEffect(() => {
        const element = header.current;

        if (element === null) {
            return;
        }

        const watcher = new IntersectionObserver(([entry]) => setPast(!entry.isIntersecting));
        watcher.observe(element);
        return () => watcher.disconnect();
    }, []);

    // While the bar is there, what stays on top under it knows how tall it is.
    useEffect(() => {
        document.documentElement.style.setProperty("--top-space", past ? `${bar.current?.offsetHeight ?? 0}px` : "0px");
    }, [past]);

    const title = top.campaign ?? top.product;
    return (
        <>
            <header ref={header} class="top">
                <Master />
                <div class="titles">
                    <h1>{title}</h1>
                    {top.campaign !== undefined && (
                        <p class="product">
                            {top.product}
                            {top.system && <span class="system">· {top.system}</span>}
                        </p>
                    )}
                </div>
                <StatusChips {...top} />
            </header>
            <div ref={bar} class={past ? "top-bar shown" : "top-bar"} aria-hidden="true">
                <Master />
                <span class="top-bar-title">{title}</span>
                <StatusChips {...top} />
            </div>
        </>
    );
}

/** The game's time, its place and whether the game is live, each a chip. */
function StatusChips({ now, place, live }: TopOf)
{
    return (
        <div class="status-chips">
            {now && (
                <span class="status-chip">
                    <Icon name="clock" />
                    {now}
                </span>
            )}
            {place && (
                <span class="status-chip">
                    <Icon name="place" />
                    {place}
                </span>
            )}
            <span class={live ? "status-chip live on" : "status-chip live"}>
                <span class="dot" />
                {live ? "live" : "waiting for the game"}
            </span>
        </div>
    );
}
