// What scrolls in the page draws no scrollbar: a shade at its edge says there is more that way. This tells its frame where there is more.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

// How far from an edge, in pixels, there is still nothing more that way.
const edge = 2;

/**
 * The classes of the frame of something that scrolls: `more-above` and `more-below`, as it has more over or under what is in sight. Looked at as it
 * scrolls, as its room or what it holds changes size, as words are written in it, and whenever `watch` changes.
 */
export function useShades(scroller: { current: HTMLElement | null; }, watch?: unknown): string
{
    const where = useMore(scroller, watch);
    return [where.above ? "more-above" : "", where.below ? "more-below" : ""].filter((name) => name !== "").join(" ");
}

/**
 * The same for what scrolls aside, written left to right in every language, as a map: `more-left` and `more-right`, as it has more at a side of what is
 * in sight.
 */
export function useSideShades(scroller: { current: HTMLElement | null; }, watch?: unknown): string
{
    const where = useMore(scroller, watch);
    return [where.left ? "more-left" : "", where.right ? "more-right" : ""].filter((name) => name !== "").join(" ");
}

/** Where what scrolls has more than is in sight, each way. */
function useMore(scroller: { current: HTMLElement | null; }, watch: unknown): { above: boolean; below: boolean; left: boolean; right: boolean; }
{
    const [where, setWhere] = useState({ above: false, below: false, left: false, right: false });
    // The element listened to, and what stops listening to it: it may come after the first drawing, or change.
    const heard = useRef<{ element: HTMLElement | null; stop(): void; }>({ element: null, stop: () => undefined });

    const look = (): void => {
        const element = scroller.current;

        if (element !== null) {
            const now = {
                above: element.scrollTop > edge,
                below: element.scrollHeight - element.scrollTop - element.clientHeight > edge,
                left: element.scrollLeft > edge,
                right: element.scrollWidth - element.scrollLeft - element.clientWidth > edge,
            };
            setWhere((before) => (before.above === now.above && before.below === now.below && before.left === now.left && before.right === now.right ? before : now));
        }
    };

    useLayoutEffect(look, [watch]);

    useEffect(() => {
        const element = scroller.current;

        if (element === heard.current.element) {
            return;
        }

        heard.current.stop();
        heard.current = { element, stop: () => undefined };

        if (element === null) {
            return;
        }

        const sizes = new ResizeObserver(look);
        sizes.observe(element);

        for (const child of element.children) {
            sizes.observe(child);
        }

        element.addEventListener("scroll", look, { passive: true });
        element.addEventListener("input", look);

        heard.current.stop = () => {
            sizes.disconnect();
            element.removeEventListener("scroll", look);
            element.removeEventListener("input", look);
        };
    });

    useEffect(() => () => heard.current.stop(), []);

    return where;
}
