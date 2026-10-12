// A card of the page (D-273, D-284): its header has its icon and title on the left, what it holds while it is closed, and the chevron on the right; it is open
// or closed as the player left it, in this browser.
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

// Up to this width the cards start closed.
const narrow = "(max-width: 600px)";

// The chevron: down while the card is closed, turned up once it is open.
const chevronPath = "M6 9.5l6 6 6-6";

/**
 * Whether a card is open, and what opens and closes it: only the player's click, which the browser remembers by the card's name; the page setting it is not.
 * Until then a card starts closed on a phone, but the one that is `first`.
 */
export function useOpen(name: string, first = false): [boolean, (event: MouseEvent) => void]
{
    const [open, setOpen] = useState(() => storedOpen(name, first));

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
 * A card's header, all of it the toggle: its icon, its title, what it holds while closed, for the eye alone, and the chevron; a card that stays open has no
 * chevron and does not close.
 */
export function CardHeader({ icon, title, preview, open, onToggle, fixed }: { icon: string; title: ComponentChildren; preview?: string; open: boolean; onToggle: (event: MouseEvent) => void; fixed?: boolean; })
{
    return (
        <summary class={fixed ? "fixed" : undefined} onClick={fixed ? (event) => event.preventDefault() : onToggle}>
            <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={icon} />
            </svg>
            {title}
            {!open && preview !== undefined && <span class="preview" aria-hidden="true">{preview}</span>}
            {!fixed && (
                <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={chevronPath} />
                </svg>
            )}
        </summary>
    );
}

function storedOpen(name: string, first: boolean): boolean
{
    try {
        const stored = localStorage.getItem(`rpg-group:${name}`);

        if (stored !== null) {
            return stored === "open";
        }
    } catch {
        // No storage, as in a private window: the default.
    }

    return first || !matchMedia(narrow).matches;
}

function storeOpen(name: string, open: boolean): void
{
    try {
        localStorage.setItem(`rpg-group:${name}`, open ? "open" : "closed");
    } catch {
        // No storage: it is only remembered while the page is open.
    }
}
