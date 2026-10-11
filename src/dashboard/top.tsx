// The page's top (D-276, D-293, D-333): the master large, the campaign's name with the product's and the system's below it, and as chips the game's time and
// whether the game is live; under the name the sections, then the saves, the settings and About at the row's end, what does not fit in a menu there; under them
// all, where the party is. Past it, a bar that stays on top with the same things but where, the master whole and moving, a little smaller, for its moods to be
// seen (D-295); what the master asks and the rolls stay in sight under it. In both the robot shows the master's mood, a moment's face, and sleeps while the
// chat is away (D-305). On a phone the sections at the bottom, the rest in the menu (D-309).
import type { RefObject } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { menuPages, type Section, sectionAddress, sectionLabel, sections } from "./address.ts";
import type { Moment, Mood } from "./data.ts";
import { Icon } from "./icons.tsx";
import { Master } from "./master.tsx";
import { usePrefChange } from "./prefs.ts";
import { pickTheme, shownTheme } from "./theme.ts";

/** What the top says: the campaign, the product, the system's name, the game's time and place, and whether the game is live; the master's mood and moment. */
interface TopOf
{
    campaign?: string;
    product: string;
    system?: string;
    now?: string;
    /** Where the party is, from the largest place that holds it to its own (D-333). */
    path?: string[];
    live: boolean;
    mood?: Mood;
    moment?: Moment;
    /** The chat is away: the robot sleeps. */
    asleep?: boolean;
    /** The section the page shows. */
    section: Section;
    /** A fight is open: Combat is among the sections (D-314). */
    fight?: boolean;
    /** It is the player's character's turn in the fight (D-315). */
    yourTurn?: boolean;
}

// What the row of the sections leaves between a link and the next, between the sections and the pages after them, and for the menu's button.
const linkGap = 2;
const pagesGap = 24;
const menuRoom = 48;

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
                <Master mood={top.mood} moment={top.moment} asleep={top.asleep} />
                <div class="titles">
                    <h1>{title}</h1>
                    {top.campaign !== undefined && (
                        <p class="product">
                            {top.product}
                            {top.system && <span class="system-chip">{top.system}</span>}
                        </p>
                    )}
                </div>
                <StatusChips now={top.now} live={top.live} />
                <Navigation current={top.section} fight={top.fight} yourTurn={top.yourTurn} />
                {top.path !== undefined && top.path.length > 0 && <PlacePath path={top.path} />}
            </header>
            <ThemeCorner />
            <div ref={bar} class={past ? "top-bar shown" : "top-bar"} aria-hidden="true">
                <Master mood={top.mood} moment={top.moment} asleep={top.asleep} />
                <span class="top-bar-title">
                    {title}
                    {top.campaign !== undefined && (
                        <span class="product">
                            {top.product}
                            {top.system && <span class="system-chip">{top.system}</span>}
                        </span>
                    )}
                </span>
                <Navigation current={top.section} fight={top.fight} yourTurn={top.yourTurn} hidden />
                <StatusChips now={top.now} live={top.live} />
            </div>
        </>
    );
}

/**
 * The sections, each a link to its address (D-276, D-309), the one shown marked, then the saves, the settings and About at the row's end (D-333): what does not
 * fit goes into the menu, those three first, then the sections from the last. In the bar that stays a copy out of the keyboard's way, as the bar is hidden
 * from a screen reader.
 */
function Navigation({ current, hidden, fight, yourTurn }: { current: Section; hidden?: boolean; fight?: boolean; yourTurn?: boolean; })
{
    // Combat only while a fight is open; on the player's turn, from another section, its name pulses in gold, the same name (D-315, D-349, D-351).
    const shown = sections.filter((section) => section !== "combat" || fight === true);
    const turn = yourTurn === true && current !== "combat";
    const row = useRef<HTMLDivElement>(null);
    const fitting = useFitting(row, shown.length, `${shown.join()} ${turn}`);
    const away = [...shown.slice(fitting.sections), ...(fitting.pages ? [] : menuPages)];
    return (
        <div ref={row} class="nav-row">
            <nav class={hidden ? "sections" : "sections main-nav"} aria-label={hidden ? undefined : "Sections"}>
                {[...shown, ...menuPages].map((section, index) => {
                    const gone = away.includes(section);
                    const kinds = [section === "combat" && turn ? "your-turn" : "", index === shown.length ? "pages-start" : "", index >= shown.length ? "page-link" : "", gone ? "away" : ""];
                    return (
                        <a
                            key={section}
                            href={sectionAddress(section)}
                            class={kinds.filter((kind) => kind !== "").join(" ") || undefined}
                            aria-current={section === current ? "page" : undefined}
                            aria-hidden={gone ? true : undefined}
                            tabIndex={hidden || gone ? -1 : undefined}
                        >
                            <span class="section-mark">
                                <Icon name={section} />
                            </span>
                            {sectionLabel(section)}
                            {section === "combat" && turn && <span class="visually-hidden">, your turn</span>}
                        </a>
                    );
                })}
            </nav>
            <Menu current={current} away={away} hidden={hidden} />
        </div>
    );
}

/** How many sections fit in the row, and whether the saves, the settings and About fit after them; on a phone the sections are at the bottom, the rest in the menu. */
function useFitting(row: RefObject<HTMLElement>, count: number, shape: string): { sections: number; pages: boolean; }
{
    const [fitting, setFitting] = useState({ sections: count, pages: true });

    useLayoutEffect(() => {
        const element = row.current;
        const phone = window.matchMedia("(max-width: 600px)");

        if (element === null) {
            return;
        }

        // Every link stays in the row, what does not fit unseen, so that each can be measured.
        const measure = (): void => {
            const widths = [...element.querySelectorAll<HTMLElement>("nav > a")].map((link) => link.offsetWidth + linkGap);
            const total = (from: number, to?: number): number => widths.slice(from, to).reduce((sum, width) => sum + width, 0);
            const room = element.clientWidth;
            const left = phone.matches ? Infinity : room - menuRoom;
            const fit = widths.slice(0, count).findIndex((_, index) => total(0, index + 1) > left);
            const next = phone.matches || total(0) + pagesGap > room ? { sections: fit === -1 ? count : fit, pages: false } : { sections: count, pages: true };
            setFitting((before) => (before.sections === next.sections && before.pages === next.pages ? before : next));
        };

        measure();
        const watcher = new ResizeObserver(measure);
        watcher.observe(element);
        phone.addEventListener("change", measure);

        return () => {
            watcher.disconnect();
            phone.removeEventListener("change", measure);
        };
    }, [count, shape]);

    return fitting;
}

/** The menu (D-309, D-333): what does not fit in the row, and on a phone the theme too, which has no switch of its own there; none when all fits. */
function Menu({ current, away, hidden }: { current: Section; away: Section[]; hidden?: boolean; })
{
    const [open, setOpen] = useState(false);
    const holder = useRef<HTMLDivElement>(null);
    const [theme, flip] = useTheme();

    // A touch outside or Escape closes it.
    useEffect(() => {
        if (!open) {
            return;
        }

        const away = (event: PointerEvent): void => {
            if (!(event.target instanceof Node && holder.current?.contains(event.target) === true)) {
                setOpen(false);
            }
        };

        const escape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", away);
        document.addEventListener("keydown", escape);

        return () => {
            document.removeEventListener("pointerdown", away);
            document.removeEventListener("keydown", escape);
        };
    }, [open]);

    if (away.length === 0) {
        return null;
    }

    return (
        <div class="menu" ref={holder}>
            <button
                type="button"
                class="icon-button tonal menu-button tip-left"
                aria-label="Menu"
                data-tip="Menu"
                aria-expanded={open}
                tabIndex={hidden ? -1 : undefined}
                onClick={() => setOpen(!open)}
            >
                <Icon name="menu" />
            </button>
            {open && (
                <div class="menu-pop">
                    {away.map((page) => (
                        <a key={page} href={sectionAddress(page)} aria-current={page === current ? "page" : undefined} tabIndex={hidden ? -1 : undefined} onClick={() => setOpen(false)}>
                            <Icon name={page} />
                            {sectionLabel(page)}
                        </a>
                    ))}
                    <button type="button" class="menu-theme" onClick={flip}>
                        <Icon name={theme.next === "dark" ? "moon" : "sun"} />
                        {theme.name}
                    </button>
                </div>
            )}
        </div>
    );
}

/** The switch between the light and the dark theme (D-300, D-310): the window's corner, with the theme it goes to. */
function ThemeCorner()
{
    const [theme, flip] = useTheme();
    return (
        <button type="button" class="theme-corner tip-left" aria-label={theme.name} data-tip={theme.name} onClick={flip}>
            <Icon name={theme.next === "dark" ? "moon" : "sun"} />
        </button>
    );
}

/** The theme the switch goes to, with its name, and what switches to it; read again at each drawing, as the menu and the switch both change it. */
function useTheme(): [{ next: "light" | "dark"; name: string; }, () => void]
{
    usePrefChange();
    const next = shownTheme() === "dark" ? "light" : "dark";
    const flip = (): void => pickTheme(next);

    return [{ next, name: next === "dark" ? "Dark theme" : "Light theme" }, flip];
}

/** Where the party is (D-333), from the largest place that holds it to its own, which stays whole when the line is short; it leads to the scene (D-309). */
function PlacePath({ path }: { path: string[]; })
{
    return (
        <a class="top-place" href={sectionAddress("scene")} aria-label={`Where the party is: ${path.toReversed().join(", ")}`}>
            <Icon name="place" />
            <ol>{path.map((name, index) => <li key={index}>{name}</li>)}</ol>
        </a>
    );
}

/** The game's time and whether the game is live, each a chip. */
function StatusChips({ now, live }: { now?: string; live: boolean; })
{
    // Live first and the time after, drawn the other way round: where the row is short, the time goes first (D-355).
    return (
        <div class="status-chips">
            <span class={live ? "status-chip live on" : "status-chip live"}>
                <span class="dot" />
                {live ? "live" : "waiting for the game"}
            </span>
            {now && (
                <span class="status-chip">
                    <Icon name="clock" />
                    {now}
                </span>
            )}
        </div>
    );
}
