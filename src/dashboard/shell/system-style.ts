// The game's style on the page (D-528, D-574): the theme of the campaign's system, its CSS of custom properties in the layer theme, its icons, and the free
// style sheet of the system's page module over the page's; or a theme installed on this computer, its CSS and icons alone; or the page's own. This browser
// remembers the choice for each system. A theme's own style sheet comes last, in the layer theme-style, while the player keeps it on, for each theme (D-575).
import { readAddress } from "../address.ts";
import type { ShownTheme } from "../data.ts";
import { type Choice, readChoice } from "./prefs.ts";

/** The event that tells the page the game's style changed: what draws an icon draws it again. */
export const gameStyleChanged = "rpg-engine:game-style";

/** The value of the choice that shows an installed theme, by its id. */
export function installedStyle(id: string): string
{
    return `theme:${id}`;
}

/**
 * Which style the page shows, by system: the game's, while it has one to show; an installed theme, while it is installed; or the page's own. One no longer
 * offered goes back to the first: the game's, else the page's.
 */
export function systemStylePref(system: string): Choice
{
    const shows = gameShows();
    return {
        key: `rpg-engine.game-style.${system}`,
        initial: shows ? "game" : "page",
        values: [...(shows ? ["game"] : []), ...(theme.themes ?? []).map((one) => installedStyle(one.id)), "page"],
    };
}

/**
 * The game's style as last read, for Settings: its system and its theme's name; whether it has anything to show, or its theme was refused; the themes
 * installed; and the choice that keeps the own style sheet of the theme shown on, when it has one.
 */
export function gameStyle(): { system?: string; name?: string; shows: boolean; refused: boolean; themes: { id: string; name: string; }[]; ownStyle?: Choice; }
{
    const own = shownOwnStyle();
    return {
        system: theme.system,
        name: theme.name,
        shows: gameShows(),
        refused: theme.refused === true,
        themes: (theme.themes ?? []).map(({ id, name }) => ({ id, name })),
        ...(own === undefined ? {} : { ownStyle: own.choice }),
    };
}

/** The installed theme the page shows for the campaign's system, by its id; undefined when it shows the game's style or its own. */
export function shownInstalledTheme(): string | undefined
{
    return chosen().installed?.id;
}

/** The lines of an icon the style shown draws anew; undefined for the page's own. */
export function themedIcon(name: string): string | undefined
{
    const style = chosen();
    return style.installed !== undefined ? style.installed.icons[name] : style.game ? theme.icons?.[name] : undefined;
}

/** Takes the theme of the campaign's system as read, with the themes installed, and the free style sheet of its page module; the page shows the one chosen. */
export function takeSystemStyle(read: ShownTheme, pageStyle: string | undefined): void
{
    const same = JSON.stringify(read) === JSON.stringify(theme) && pageStyle === freeStyle;
    theme = read;
    freeStyle = pageStyle;

    if (!same) {
        applyGameStyle();
    }
}

/** Shows the style the player keeps for the campaign's system: after a change of that choice, or of what the system and this computer give. */
export function applyGameStyle(): void
{
    if (typeof document === "undefined") {
        return;
    }

    const style = chosen();
    themeSheet ??= new CSSStyleSheet();
    freeSheet ??= new CSSStyleSheet();
    themeSheet.replaceSync(style.installed?.css ?? (style.game ? theme.css ?? "" : ""));
    // The free style of the system's page module goes with its own theme alone: never under another's colours.
    freeSheet.replaceSync(style.game ? freeStyle ?? "" : "");
    adopt();
    watchAddress();
    showOwnStyle();
    document.querySelectorAll(".title-too-wide").forEach((title) => title.classList.remove("title-too-wide"));
    watchTitles();
    fitTitles();
    window.dispatchEvent(new Event(gameStyleChanged));
}

type InstalledTheme = NonNullable<ShownTheme["themes"]>[number];

let theme: ShownTheme = {};
let freeStyle: string | undefined;
let themeSheet: CSSStyleSheet | undefined;
let freeSheet: CSSStyleSheet | undefined;
// The link to the own style sheet of the theme shown, and its address.
let ownLink: HTMLLinkElement | undefined;
let ownAddress: string | undefined;

/** The page's sheets of the game's style, after the page's own: the theme's custom properties, the system's free style. */
function adopt(): void
{
    const ours = [themeSheet, freeSheet].filter((sheet): sheet is CSSStyleSheet => sheet !== undefined);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets.filter((sheet) => !ours.includes(sheet)), ...ours];
}

/** The own style sheet of the theme shown, when it has one: its address, and the choice that keeps it on, by the theme. */
function shownOwnStyle(): { address: string; choice: Choice; } | undefined
{
    const style = chosen();
    const address = style.installed?.style ?? (style.game ? theme.style : undefined);
    const key = style.installed?.id ?? `game.${theme.system ?? ""}`;
    return address === undefined ? undefined : { address, choice: { key: `rpg-engine.theme-style.${key}`, initial: "on", values: ["on", "off"] } };
}

/**
 * Shows a theme's own style sheet, from its address, or none: a link to the server's sheet of one line that imports it into the layer theme-style, so that
 * no brace of it closes that layer and its url() come from its folder. The new one shows before the old goes; one that fails is asked again at the next change.
 */
function takeOwnStyle(address: string | undefined): void
{
    if (address === ownAddress) {
        return;
    }

    ownAddress = address;
    const gone = ownLink;
    ownLink = undefined;

    if (address === undefined) {
        gone?.remove();
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = address;
    link.addEventListener("load", () => {
        gone?.remove();
        fitTitles();
    });
    link.addEventListener("error", () => {
        gone?.remove();

        if (ownLink === link) {
            link.remove();
            ownLink = undefined;
            ownAddress = undefined;
        }
    });
    ownLink = link;
    document.head.append(link);
}

/** Whether the page shows Settings, which never take a theme's own style sheet: whatever it does, the switch that turns it off stays in reach. */
function inSettings(): boolean
{
    return readAddress(window.location.hash).section === "settings";
}

/** Takes the own style sheet off on the way into Settings, and back on the way out. */
function watchAddress(): void
{
    if (watchingAddress) {
        return;
    }

    watchingAddress = true;
    window.addEventListener("hashchange", showOwnStyle);
}

/** Shows the own style sheet of the theme shown while the player keeps it on, out of Settings. */
function showOwnStyle(): void
{
    const own = shownOwnStyle();
    takeOwnStyle(own !== undefined && readChoice(own.choice) === "on" && !inSettings() ? own.address : undefined);
}

let watchingAddress = false;
let watching = false;
let fitting = false;
// The card titles the theme's face may make too wide, and the campaign's name.
const titles = ":is(summary, .card-head) :is(h2, h3, .rolls-title), .titles h1";

/** Whether the game's own style has anything to show: its theme, or the free style of its page module. */
function gameShows(): boolean
{
    return theme.css !== undefined || freeStyle !== undefined;
}

/** The style the player keeps for the campaign's system: the game's, an installed theme, or neither, the page's own. */
function chosen(): { game: boolean; installed?: InstalledTheme; }
{
    if (theme.system === undefined) {
        return { game: false };
    }

    const value = readChoice(systemStylePref(theme.system));
    const installed = theme.themes?.find((one) => installedStyle(one.id) === value);
    return installed === undefined ? { game: value === "game" } : { game: false, installed };
}

/** Whether a style other than the page's own is on, whose faces may make a title too wide. */
function styleOn(): boolean
{
    const style = chosen();
    return style.game || style.installed !== undefined;
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
