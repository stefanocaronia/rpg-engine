// A card of the page (D-273, D-284): its header has its icon and title on the left, what it holds while it is closed, and the chevron on the right; it is open
// or closed as the player left it, in this browser.
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

// Up to this width the cards start closed.
const narrow = "(max-width: 600px)";

// The chevron: down while the card is closed, turned up once it is open.
const chevronPath = "M6 9.5l6 6 6-6";

/** Whether a card is open, and what opens and closes it: only the player's click, which the browser remembers by the card's name; the page setting it is not. */
export function useOpen(name: string): [boolean, (event: MouseEvent) => void]
{
    const [open, setOpen] = useState(() => storedOpen(name));

    const toggle = (event: MouseEvent): void => {
        event.preventDefault();
        setOpen(!open);
        storeOpen(name, !open);
    };

    return [open, toggle];
}

/** A card's header, all of it the toggle: its icon, its title, what it holds while closed, for the eye alone, and the chevron. */
export function CardHeader({ icon, title, preview, open, onToggle }: { icon: string; title: ComponentChildren; preview?: string; open: boolean; onToggle: (event: MouseEvent) => void; })
{
    return (
        <summary onClick={onToggle}>
            <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d={icon} />
            </svg>
            {title}
            {!open && preview !== undefined && <span class="preview" aria-hidden="true">{preview}</span>}
            <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d={chevronPath} />
            </svg>
        </summary>
    );
}

function storedOpen(name: string): boolean
{
    try {
        const stored = localStorage.getItem(`rpg-group:${name}`);

        if (stored !== null) {
            return stored === "open";
        }
    } catch {
        // No storage, as in a private window: the default.
    }

    return !matchMedia(narrow).matches;
}

function storeOpen(name: string, open: boolean): void
{
    try {
        localStorage.setItem(`rpg-group:${name}`, open ? "open" : "closed");
    } catch {
        // No storage: it is only remembered while the page is open.
    }
}
