// The game's style on the page (D-528): the theme of the campaign's system, its CSS of custom properties in the layer theme, its icons, and the free style
// sheet of the system's page module over the page's; all on while the player keeps the game's style, which this browser remembers for each system.
import type { ShownTheme } from "./data.ts";
import { type Choice, readChoice } from "./prefs.ts";

/** The event that tells the page the game's style changed: what draws an icon draws it again. */
export const gameStyleChanged = "rpg-engine:game-style";

/** Whether the page shows the game's style, by system: the game's, or the page's own. */
export function systemStylePref(system: string): Choice
{
    return { key: `rpg-engine.game-style.${system}`, initial: "game", values: ["game", "page"] };
}

/** The game's style as last read, for Settings: its system and its theme's name; whether it has anything to show, or its theme was refused. */
export function gameStyle(): { system?: string; name?: string; shows: boolean; refused: boolean; }
{
    return { system: theme.system, name: theme.name, shows: theme.css !== undefined || freeStyle !== undefined, refused: theme.refused === true };
}

/** The lines of an icon the game's style draws anew, while it is on; undefined for the page's own. */
export function themedIcon(name: string): string | undefined
{
    return styleOn() ? theme.icons?.[name] : undefined;
}

/** Takes the theme of the campaign's system as read, and the free style sheet of its page module; the page shows them while the game's style is on. */
export function takeSystemStyle(read: ShownTheme, pageStyle: string | undefined): void
{
    const same = JSON.stringify(read) === JSON.stringify(theme) && pageStyle === freeStyle;
    theme = read;
    freeStyle = pageStyle;

    if (!same) {
        applyGameStyle();
    }
}

/** Shows the game's style or the page's own, as the player keeps it for the campaign's system: after a change of that choice, or of what the system gives. */
export function applyGameStyle(): void
{
    if (typeof document === "undefined") {
        return;
    }

    const on = styleOn();
    themeSheet ??= new CSSStyleSheet();
    freeSheet ??= new CSSStyleSheet();
    themeSheet.replaceSync(on ? theme.css ?? "" : "");
    freeSheet.replaceSync(on ? freeStyle ?? "" : "");
    const others = document.adoptedStyleSheets.filter((sheet) => sheet !== themeSheet && sheet !== freeSheet);
    document.adoptedStyleSheets = [...others, themeSheet, freeSheet];
    document.querySelectorAll(".title-too-wide").forEach((title) => title.classList.remove("title-too-wide"));
    watchTitles();
    fitTitles();
    window.dispatchEvent(new Event(gameStyleChanged));
}

let theme: ShownTheme = {};
let freeStyle: string | undefined;
let themeSheet: CSSStyleSheet | undefined;
let freeSheet: CSSStyleSheet | undefined;
let watching = false;
let fitting = false;
// The card titles the theme's face may make too wide, and the campaign's name.
const titles = ":is(summary, .card-head) :is(h2, h3, .rolls-title), .titles h1";

function styleOn(): boolean
{
    return theme.system !== undefined && gameStyle().shows && readChoice(systemStylePref(theme.system)) === "game";
}

/**
 * Each title the theme's face makes wider than its card goes back to the text's face, that title alone (D-528 (4)): measured as the page changes, as its
 * faces come, and anew when the window's width changes.
 */
function watchTitles(): void
{
    if (watching) {
        return;
    }

    watching = true;
    new MutationObserver(fitTitles).observe(document.body, { subtree: true, childList: true });
    document.fonts.addEventListener("loadingdone", fitTitles);
    window.addEventListener("resize", () => {
        document.querySelectorAll(".title-too-wide").forEach((title) => title.classList.remove("title-too-wide"));
        fitTitles();
    });
}

/** Measures the titles at the next frame, once however often it is asked meanwhile. */
function fitTitles(): void
{
    if (fitting || !styleOn()) {
        return;
    }

    fitting = true;
    requestAnimationFrame(() => {
        fitting = false;

        for (const title of document.querySelectorAll<HTMLElement>(titles)) {
            const head = title.closest<HTMLElement>("summary, .card-head") ?? title;

            if (!title.classList.contains("title-too-wide") && (title.scrollWidth > title.clientWidth + 1 || head.scrollWidth > head.clientWidth + 1)) {
                title.classList.add("title-too-wide");
            }
        }
    });
}
