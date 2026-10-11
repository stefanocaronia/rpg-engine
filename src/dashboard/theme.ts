// The page's theme (D-300): the system's, until the player picks light or dark at the top of the page, which this browser remembers; the dice follow it.
import { announcePref } from "./prefs.ts";

/** The page's light or dark look. */
export type Theme = "light" | "dark";

// Where the browser remembers the theme the player picked.
const themeKey = "rpg-engine.theme";

/** The theme the page shows: the one the player picked, or the system's. */
export function shownTheme(): Theme
{
    const picked = document.documentElement.dataset.theme;
    return picked === "light" || picked === "dark" ? picked : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Shows the theme the player picked, and remembers it in this browser; every part of the page that shows it hears of it. */
export function pickTheme(theme: Theme): void
{
    document.documentElement.dataset.theme = theme;
    announcePref();

    try {
        localStorage.setItem(themeKey, theme);
    } catch {
        // The page forgets it at the next reload.
    }
}

/** At the page's start, the theme the player picked before, if any. */
export function restoreTheme(): void
{
    try {
        const picked = localStorage.getItem(themeKey);

        if (picked === "light" || picked === "dark") {
            document.documentElement.dataset.theme = picked;
        }
    } catch {
        // No storage: the system's theme.
    }
}
