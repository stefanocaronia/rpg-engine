// What scrolls in the chat draws no scrollbar: a shade at its edge says there is more that way. This tells its frame where there is more.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

// How far from an edge, in pixels, there is still nothing more that way.
const edge = 2;

/**
 * The classes of the frame of something that scrolls: `more-above` and `more-below`, as it has more over or under what is in sight. Looked at as it
 * scrolls, as its room or what it holds changes size, as words are written in it, and whenever `watch` changes.
 */
export function useShades(scroller: { current: HTMLElement | null; }, watch?: unknown): string
{
    const [where, setWhere] = useState({ above: false, below: false });
    // The element listened to, and what stops listening to it: it may come after the first drawing, or change.
    const heard = useRef<{ element: HTMLElement | null; stop(): void; }>({ element: null, stop: () => undefined });

    const look = (): void => {
        const element = scroller.current;

        if (element !== null) {
            const now = { above: element.scrollTop > edge, below: element.scrollHeight - element.scrollTop - element.clientHeight > edge };
            setWhere((before) => (before.above === now.above && before.below === now.below ? before : now));
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

    return [where.above ? "more-above" : "", where.below ? "more-below" : ""].filter((name) => name !== "").join(" ");
}
