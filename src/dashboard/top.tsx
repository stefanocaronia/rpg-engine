// The page's top (D-276, D-293, D-333): the master large, the campaign's name with the product's and the system's below it, and as chips the game's time and
// whether the game is live; under the name the sections, then the saves, the settings and About at the row's end, what does not fit in a menu there; under them
// all, where the party is. It stays on top: down the page it draws itself together, the master and the name smaller, the product and the place folded away,
// the sections still there (D-295); what the master asks and the rolls stay in sight under it. The robot shows the master's mood, a moment's face, and sleeps
// while the chat is away (D-305). On a phone the sections at the bottom, the rest in the menu (D-309).
import type { RefObject } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { menuPages, type Section, sectionAddress, sectionLabel, sections } from "./address.ts";
import type { CalendarDay, Moment, Mood } from "./data.ts";
import { WidgetChips } from "./extension-widgets.tsx";
import { calendarDayLabel, gameDateLabel } from "./game-words.ts";
import { Icon } from "./icons.tsx";
import { Master } from "./master.tsx";
import { usePrefChange } from "./prefs.ts";
import { t } from "./text.ts";
import { pickTheme, shownTheme } from "./theme.ts";

/** What the top says: the campaign, the product, the system's name, the game's time and place, and whether the game is live; the master's mood and moment. */
interface TopOf
{
    campaign?: string;
    product: string;
    system?: string;
    now?: string;
    /** The day of the game's calendar, when the campaign has one (TIM-8). */
    calendar?: CalendarDay;
    /** Where the party is, from the largest place that holds it to its own (D-333). */
    path?: string[];
    live: boolean;
    mood?: Mood;
    moment?: Moment;
    /** The chat is away: the robot sleeps. */
    asleep?: boolean;
    /** The section the page shows. */
    section: Section;
    /** The open scene goes by turns: the Scene's name in gold (D-444). */
    fight?: boolean;
    /** It is the player's character's turn (D-315). */
    yourTurn?: boolean;
    /** With more than one player character, whose turn it is, named in place of "you" (D-480 (7)). */
    turnName?: string | undefined;
}

// What the row of the sections leaves between a link and the next, between the sections and the pages after them, and for the menu's button.
const linkGap = 2;
const pagesGap = 24;
const menuRoom = 48;

export function Top(top: TopOf)
{
    const room = useRef<HTMLDivElement>(null);
    const header = useRef<HTMLElement>(null);
    const compact = useCompact(room, header);
    // The robot's face when the robot or the campaign's name leads back to the party.
    const [poke, setPoke] = useState<Moment>();

    const home = (): void => {
        window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        setPoke({ id: String(Date.now()), mood: pokedMoods[Date.now() % pokedMoods.length] ?? "happy" });
    };

    const title = top.campaign ?? top.product;
    return (
        <>
            <div ref={room} class="top-room">
                <span class="top-mark far" aria-hidden="true" />
                <span class="top-mark near" aria-hidden="true" />
            </div>
            <header ref={header} class={compact ? "top compact" : "top"}>
                <MasterHome top={top} poke={poke} onHome={home} />
                <div class="titles">
                    <h1>
                        <a class="title-home" href={sectionAddress("party")} onClick={home}>{title}</a>
                    </h1>
                    {top.campaign !== undefined && (
                        <p class="product">
                            {top.product}
                            {top.system && <span class="system-chip">{top.system}</span>}
                        </p>
                    )}
                </div>
                <StatusChips now={top.now} calendar={top.calendar} live={top.live} />
                <Navigation current={top.section} fight={top.fight} yourTurn={top.yourTurn} turnName={top.turnName} />
                {top.path !== undefined && top.path.length > 0 && <PlacePath path={top.path} />}
            </header>
            <ThemeCorner />
        </>
    );
}

/**
 * The sections, each a link to its address (D-276, D-309), the one shown marked, then the saves, Help, the settings and About as icons at the row's end (D-333, D-409): what does not
 * fit goes into the menu, those three first, then the sections from the last.
 */
function Navigation({ current, fight, yourTurn, turnName }: { current: Section; fight?: boolean; yourTurn?: boolean; turnName?: string | undefined; })
{
    // While the scene goes by turns the Scene's name is in gold; on the player's turn, from another section, it pulses (D-315, D-349, D-351, D-444).
    const shown = [...sections];
    const turns = fight === true && current !== "scene";
    const turn = yourTurn === true && current !== "scene";
    const row = useRef<HTMLDivElement>(null);
    const fitting = useFitting(row, shown.length, `${shown.join()} ${turn}`);
    const away = [...shown.slice(fitting.sections), ...(fitting.pages ? [] : menuPages)];
    return (
        <div ref={row} class="nav-row">
            <nav class="sections main-nav" aria-label={t("Sections")}>
                {[...shown, ...menuPages].map((section, index) => {
                    const gone = away.includes(section);
                    const kinds = [section === "scene" && turns ? (turn ? "your-turn" : "in-turns") : "", index === shown.length ? "pages-start" : "", index >= shown.length ? "page-link tip-below" : "", gone ? "away" : ""];
                    return (
                        <a
                            key={section}
                            href={sectionAddress(section)}
                            class={kinds.filter((kind) => kind !== "").join(" ") || undefined}
                            aria-label={index >= shown.length ? sectionLabel(section) : undefined}
                            data-tip={index >= shown.length ? sectionLabel(section) : undefined}
                            aria-current={section === current ? "page" : undefined}
                            aria-hidden={gone ? true : undefined}
                            tabIndex={gone ? -1 : undefined}
                        >
                            <span class="section-mark">
                                <Icon name={section} />
                            </span>
                            {/* The pages at the row's end are icons, their names in a tooltip under them and for a screen reader (D-409). */}
                            {index < shown.length && sectionLabel(section)}
                            {section === "scene" && turn && <span class="visually-hidden">{`, ${turnName === undefined ? t("your turn") : t("It's {name}'s turn", { name: turnName })}`}</span>}
                        </a>
                    );
                })}
            </nav>
            <Menu current={current} away={away} />
        </div>
    );
}

/**
 * Whether the top is drawn together, down the page: two marks in its room, one this far down and one near the very top, tell it, with no work while the page
 * scrolls. The top stays on top out of the page's flow, and its room keeps its whole height, so that drawing it together moves nothing under it.
 */
function useCompact(room: RefObject<HTMLDivElement>, header: RefObject<HTMLElement>): boolean
{
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        const holder = room.current;
        const element = header.current;

        if (holder === null || element === null) {
            return;
        }

        const far = holder.querySelector<HTMLElement>(".top-mark.far");
        const near = holder.querySelector<HTMLElement>(".top-mark.near");
        const seen = new Map<Element, boolean>();
        const watcher = new IntersectionObserver((entries) => {
            entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting));
            setCompact((now) => (now ? seen.get(near!) !== true : seen.get(far!) === false));
        });

        if (far !== null && near !== null) {
            watcher.observe(far);
            watcher.observe(near);
        }

        // Its room as tall as the top whole, measured while it is whole and still: its transitions are asked for, as their events come a frame late.
        const measure = (): void => {
            if (!element.classList.contains("compact") && !element.getAnimations({ subtree: true }).some((running) => running instanceof CSSTransition)) {
                holder.style.height = `${element.offsetHeight}px`;
            }
        };

        const sizes = new ResizeObserver(measure);
        sizes.observe(element);
        element.addEventListener("transitionend", measure);
        element.addEventListener("transitioncancel", measure);

        return () => {
            watcher.disconnect();
            sizes.disconnect();
            element.removeEventListener("transitionend", measure);
            element.removeEventListener("transitioncancel", measure);
        };
    }, []);

    return compact;
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
function Menu({ current, away }: { current: Section; away: Section[]; })
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
                aria-label={t("Menu: {pages}", { pages: pagesList(away) })}
                data-tip={t("Menu: {pages}", { pages: pagesList(away) })}
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                <Icon name="menu" />
            </button>
            {open && (
                <div class="menu-pop">
                    {away.map((page) => (
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

/** In the setup, which has no sections (D-379): whether the game is live and the switch of the theme, small at the top right. */
export function SetupCorner({ live }: { live: boolean; })
{
    const [theme, flip] = useTheme();
    return (
        <div class="setup-corner">
            <StatusChips live={live} />
            <button type="button" class="icon-button tonal tip-left" aria-label={theme.name} data-tip={theme.name} onClick={flip}>
                <Icon name={theme.next === "dark" ? "moon" : "sun"} />
            </button>
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

    return [{ next, name: next === "dark" ? t("Dark theme") : t("Light theme") }, flip];
}

/** Where the party is (D-333), from the largest place that holds it to its own, which stays whole when the line is short; its own leads to the scene (D-309). */
function PlacePath({ path }: { path: string[]; })
{
    return (
        <nav class="top-place" aria-label={t("Where the party is")}>
            <Icon name="place" />
            <ol>
                {path.map((name, index) => <li key={index}>{index === path.length - 1 ? <a href={sectionAddress("scene")}>{name}</a> : name}</li>)}
            </ol>
        </nav>
    );
}

// The faces the robot makes when it is clicked.
const pokedMoods: Mood[] = ["happy", "surprised", "mischievous", "delighted"];

/** The robot, which leads back to the party at the top of the page, as the campaign's name does, and makes a face as it does. */
function MasterHome({ top, poke, onHome }: { top: Pick<TopOf, "mood" | "moment" | "asleep">; poke?: Moment; onHome(): void; })
{
    return (
        <a class="master-home" href={sectionAddress("party")} aria-label={t("Back to the party")} onClick={onHome}>
            <Master mood={top.mood} moment={top.moment} poke={poke} asleep={top.asleep} />
        </a>
    );
}

/** The game's time, its day of the calendar, and whether the game is live, each a chip. */
function StatusChips({ now, calendar, live }: { now?: string; calendar?: CalendarDay; live: boolean; })
{
    const row = useRef<HTMLDivElement>(null);
    useWrapped(row);
    // Live first and the time after, drawn the other way round: where the row is short, the time goes first (D-355), and before it the extensions'.
    return (
        <div ref={row} class="status-chips">
            <span class={live ? "status-chip live on" : "status-chip live"}>
                <span class="dot" />
                {live ? t("live") : t("waiting for the game")}
            </span>
            {now && (
                <span class="status-chip">
                    <Icon name="clock" />
                    {gameDateLabel(now)}
                </span>
            )}
            {now && calendar && (
                <span class="status-chip">
                    <Icon name="calendar" />
                    {calendarDayLabel(calendar)}
                </span>
            )}
            {/* The extensions' chips after the time: where the row is short, they go first (D-502). */}
            <WidgetChips />
        </div>
    );
}

/**
 * The chips a short row puts on its second line, which is never seen, marked so: unseen, still read by a screen reader. The row does not clip, so that a chip's
 * tooltip shows under it (D-502).
 */
function useWrapped(row: RefObject<HTMLElement>): void
{
    useLayoutEffect(() => {
        const element = row.current;

        if (element === null) {
            return;
        }

        const mark = (): void => {
            const chips = [...element.children] as HTMLElement[];
            const first = chips[0]?.offsetTop ?? 0;
            chips.forEach((chip) => chip.classList.toggle("wrapped", chip.offsetTop > first));
        };

        const sizes = new ResizeObserver(mark);
        const added = new MutationObserver(() => {
            [...element.children].forEach((chip) => sizes.observe(chip));
            mark();
        });
        sizes.observe(element);
        [...element.children].forEach((chip) => sizes.observe(chip));
        added.observe(element, { childList: true, subtree: true, characterData: true });

        return () => {
            sizes.disconnect();
            added.disconnect();
        };
    }, []);
}

/** The pages a menu holds as a list in the page's language: Rules, Saves and Settings; ルール、セーブ、設定. */
function pagesList(pages: Section[]): string
{
    return new Intl.ListFormat(document.documentElement.lang || "en", { type: "conjunction" }).format(pages.map(sectionLabel));
}
