// The page's theme (D-300): the system's, until the player picks light or dark at the top of the page, which this browser remembers; the dice follow it. The page
// always says on <html> which one it shows, so that a game's style can give each its own pictures (D-528).
import { announcePref } from "./prefs.ts";

/** The page's light or dark look. */
export type Theme = "light" | "dark";

// Where the browser remembers the theme the player picked.
const themeKey = "rpg-engine.theme";
// The theme of the system, which the page shows while the player picks none.
const systemDark = typeof matchMedia === "undefined" ? undefined : matchMedia("(prefers-color-scheme: dark)");

/** The theme the page shows: the one the player picked, or the system's. */
export function shownTheme(): Theme
{
    const shown = typeof document === "undefined" ? undefined : document.documentElement.dataset.theme;
    return shown === "light" || shown === "dark" ? shown : systemDark?.matches === true ? "dark" : "light";
}

/** Shows the theme the player picked, and remembers it in this browser; every part of the page that shows it hears of it. */
export function pickTheme(theme: Theme): void
{
    document.documentElement.dataset.theme = theme;

    try {
        localStorage.setItem(themeKey, theme);
    } catch {
        // The page forgets it at the next reload.
    }

    announcePref();
}

/** At the page's start, the theme the player picked before, else the system's, followed as it changes while the player picks none. */
export function restoreTheme(): void
{
    document.documentElement.dataset.theme = picked() ?? (systemDark?.matches === true ? "dark" : "light");
    systemDark?.addEventListener("change", () => {
        if (picked() === undefined) {
            document.documentElement.dataset.theme = systemDark.matches ? "dark" : "light";
            announcePref();
        }
    });
}

function picked(): Theme | undefined
{
    try {
        const kept = localStorage.getItem(themeKey);
        return kept === "light" || kept === "dark" ? kept : undefined;
    } catch {
        // No storage: the system's theme.
        return undefined;
    }
}
