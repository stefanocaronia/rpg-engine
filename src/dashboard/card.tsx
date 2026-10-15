// A card of the page (D-273, D-284): its header has its icon and title on the left, what it holds while it is closed, and the chevron on the right; it is open
// or closed as the player left it, in this browser.
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { t } from "./text.ts";

// Up to this width the cards start closed.
const narrow = "(max-width: 600px)";

// The chevron: down while the card is closed, turned up once it is open.
const chevronPath = "M6 9.5l6 6 6-6";

/**
 * Whether a card is open, and what opens and closes it: only the player's click, which the browser remembers by the card's name; the page setting it is not.
 * Until then a card starts closed on a phone, but the one that is `first`, or as `start` says.
 */
export function useOpen(name: string, first = false, start?: boolean): [boolean, (event: MouseEvent) => void]
{
    const [open, setOpen] = useState(() => storedOpen(name, first, start));

    const toggle = (event: MouseEvent): void => {
        event.preventDefault();
        setOpen(!open);
        storeOpen(name, !open);
    };

    return [open, toggle];
}

/** Whether the window matches a media query, as it changes. */
export function useMedia(query: string): boolean
{
    const [matches, setMatches] = useState(() => matchMedia(query).matches);

    useEffect(() => {
        const list = matchMedia(query);
        const follow = (): void => setMatches(list.matches);
        list.addEventListener("change", follow);
        return () => list.removeEventListener("change", follow);
    }, [query]);

    return matches;
}

/**
 * A card's header, all of it the toggle: its icon, its title, what it holds while closed, for the eye alone, a note that stays, and the chevron, whose tooltip
 * says what a click does; a card that stays open has no chevron and does not close.
 */
export function CardHeader(
    { icon, title, preview, note, open, onToggle, fixed }: { icon: string; title: ComponentChildren; preview?: string; note?: string; open: boolean; onToggle: (event: MouseEvent) => void; fixed?: boolean; },
)
{
    return (
        <summary class={fixed ? "fixed" : undefined} onClick={fixed ? (event) => event.preventDefault() : onToggle}>
            <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={icon} />
            </svg>
            {title}
            {!open && preview !== undefined && <span class="preview" aria-hidden="true">{preview}</span>}
            {note !== undefined && <span class="card-head-note">{note}</span>}
            {!fixed && (
                <span class="chevron-tip tip-left" aria-hidden="true" data-tip={open ? t("Close") : t("Open")}>
                    <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                        <path d={chevronPath} />
                    </svg>
                </span>
            )}
        </summary>
    );
}

/** The header of a card that is always open (D-419): the look of a card's header, its icon, its title, a note at its end, and its own buttons after it; no toggle. */
export function CardHead({ icon, title, note, children }: { icon: string; title: ComponentChildren; note?: ComponentChildren; children?: ComponentChildren; })
{
    return (
        <header class="card-head">
            <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={icon} />
            </svg>
            {title}
            {note !== undefined && <span class="card-head-note">{note}</span>}
            {children}
        </header>
    );
}

function storedOpen(name: string, first: boolean, start: boolean | undefined): boolean
{
    try {
        const stored = localStorage.getItem(`rpg-group:${name}`);

        if (stored !== null) {
            return stored === "open";
        }
    } catch {
        // No storage, as in a private window: the default.
    }

    return start ?? (first || !matchMedia(narrow).matches);
}

function storeOpen(name: string, open: boolean): void
{
    try {
        localStorage.setItem(`rpg-group:${name}`, open ? "open" : "closed");
    } catch {
        // No storage: it is only remembered while the page is open.
    }
}
