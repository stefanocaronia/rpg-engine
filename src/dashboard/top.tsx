// The page's top (D-276, D-293): the master large, the campaign's name with the product's and the system's below it, and as chips the game's time, its place
// and whether the game is live. Past it, a bar that stays on top with the same things, the master whole and moving, a little smaller, for its moods to be seen
// (D-295); what the master asks and the rolls stay in sight under it. In both the robot shows the master's mood, a moment's face, and sleeps while the chat is
// away (D-305). Under the name, the sections, the same in the bar; beside the theme, the menu; on a phone the sections at the bottom (D-309).
import { useEffect, useRef, useState } from "preact/hooks";
import { menuPages, type Section, sectionAddress, sectionLabel, sections } from "./address.ts";
import type { Moment, Mood } from "./data.ts";
import { Icon } from "./icons.tsx";
import { Master } from "./master.tsx";
import { pickTheme, shownTheme } from "./theme.ts";

/** What the top says: the campaign, the product, the system's name, the game's time and place, and whether the game is live; the master's mood and moment. */
interface TopOf
{
    campaign?: string;
    product: string;
    system?: string;
    now?: string;
    place?: string;
    live: boolean;
    mood?: Mood;
    moment?: Moment;
    /** The chat is away: the robot sleeps. */
    asleep?: boolean;
    /** The section the page shows. */
    section: Section;
}

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
                <Sections current={top.section} />
                <StatusChips {...top} />
                <Menu current={top.section} />
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
                <Sections current={top.section} hidden />
                <StatusChips {...top} hidden />
            </div>
        </>
    );
}

/**
 * The sections, each a link to its address (D-276, D-309), the one shown marked; in the bar that stays a copy out of the keyboard's way, as the bar is hidden
 * from a screen reader.
 */
function Sections({ current, hidden }: { current: Section; hidden?: boolean; })
{
    return (
        <nav class={hidden ? "sections" : "sections main-nav"} aria-label={hidden ? undefined : "Sections"}>
            {sections.map((section) => (
                <a key={section} href={sectionAddress(section)} aria-current={section === current ? "page" : undefined} tabIndex={hidden ? -1 : undefined}>
                    <span class="section-mark">
                        <Icon name={section} />
                    </span>
                    {sectionLabel(section)}
                </a>
            ))}
        </nav>
    );
}

/** The menu (D-309): the saves, the settings and what the page is; the theme too, which on a phone has no switch of its own. */
function Menu({ current }: { current: Section; })
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

    return (
        <div class="menu" ref={holder}>
            <button type="button" class="icon-button tonal menu-button tip-left" aria-label="Menu" data-tip="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
                <Icon name="menu" />
            </button>
            {open && (
                <div class="menu-pop">
                    {menuPages.map((page) => (
                        <a key={page} href={sectionAddress(page)} aria-current={page === current ? "page" : undefined} onClick={() => setOpen(false)}>
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
    const [, setFlips] = useState(0);
    const next = shownTheme() === "dark" ? "light" : "dark";

    const flip = (): void => {
        pickTheme(next);
        setFlips((flips) => flips + 1);
    };

    return [{ next, name: next === "dark" ? "Dark theme" : "Light theme" }, flip];
}

/** The game's time, its place and whether the game is live, each a chip; the place's leads to the scene, out of the keyboard's way in the bar. */
function StatusChips({ now, place, live, hidden }: TopOf & { hidden?: boolean; })
{
    return (
        <div class="status-chips">
            {now && (
                <span class="status-chip">
                    <Icon name="clock" />
                    {now}
                </span>
            )}
            {place && (
                <a class="status-chip place-chip" href={sectionAddress("scene")} tabIndex={hidden ? -1 : undefined}>
                    <Icon name="place" />
                    {place}
                </a>
            )}
            <span class={live ? "status-chip live on" : "status-chip live"}>
                <span class="dot" />
                {live ? "live" : "waiting for the game"}
            </span>
        </div>
    );
}
