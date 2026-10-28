// The widgets of the campaign's extensions (D-502), drawn with the page's own parts: a chip in the top, cards in the table's column and at the end of a page.
// What they show comes from the server, in the campaign's language, checked; the page writes their values in its own language, isolated right to left.
import { type ComponentChildren, createContext } from "preact";
import { useContext, useEffect, useRef } from "preact/hooks";
import { type Section, sectionAddress } from "../address.ts";
import { CardHead } from "../card.tsx";
import type { PackageCode, ShownModule, ShownWidget, WidgetPage, WidgetPart, WidgetSpot, WidgetText, WidgetTrack, WidgetValue } from "../data.ts";
import { iconPath } from "../icons.tsx";
import { sideOf, Token } from "../party.tsx";
import { isolated, numberText, pageDirection, t } from "../text.ts";
import type { TrackChange } from "./card.ts";
import { type CardPage, cardsIn, codeOfModule, ExtensionRoot, type FigurePart, type FigurePlace, figureSize, type LoadedModule, ModulesContext, type PageCard, pagePropsOf, usePageModule, useWidgetData } from "./page-code.tsx";
import { PeopleContext } from "./people.ts";

/** The widgets of the campaign's extensions, as last read: every part of the page that holds some takes its own from here. */
export const WidgetsContext = createContext<ShownWidget[]>([]);

/** The widget whose parts are drawn here, with its page module and data, for a count its extension draws as a figure (D-510); where it stands. */
export const OwnerContext = createContext<Owner | undefined>(undefined);

/** A widget as its parts' drawing needs it: its module as it stands, its data, its place. */
export interface Owner
{
    widget: PackageCode;
    loaded: LoadedModule;
    data?: unknown;
    place: FigurePlace;
}

// The section of the page each widget's page is.
const pageSections: Record<WidgetPage, Section> = { scene: "scene", sheet: "party", world: "world", journal: "journal" };

// The card a chip in the top has just led to, which brings itself into view as it is drawn.
let wanted: string | undefined;

/** The chips of the widgets in the top, after the time: each its icon and its few words, its whole sentence in its tip and for a screen reader. */
export function WidgetChips()
{
    const widgets = useContext(WidgetsContext);
    return (
        <>
            {inPlace(widgets, "top").filter((widget) => widget.shows !== undefined).map((widget) => <WidgetChip key={widget.id} widget={widget} card={cardOf(widgets, widget)} />)}
        </>
    );
}

/**
 * The cards of the widgets that stand in this place, or at the end of this page, in their order; in a page, then the cards its packages' page code puts there
 * (D-511), given whose sheet it is and what the page shows. Nothing where none does.
 */
export function WidgetCards({ place, page, who, view }: { place: "side" | "page"; page?: WidgetPage; who?: string | undefined; view?: unknown; })
{
    const widgets = inPlace(useContext(WidgetsContext), place, page).filter((widget) => widget.shows?.parts !== undefined || widget.shows?.note !== undefined);
    const own = place === "page" && page !== undefined ? <PackageCards page={page} who={who} view={view} /> : null;

    if (widgets.length === 0) {
        return own;
    }

    return (
        <>
            <div class={`widget-cards on-${place}`}>
                {widgets.map((widget) => <WidgetCard key={widget.id} widget={widget} />)}
            </div>
            {own}
        </>
    );
}

/** The cards the page code of the campaign's packages puts in a page (D-511), the system's first, each package's in their order. */
function PackageCards({ page, who, view }: { page: CardPage; who?: string | undefined; view?: unknown; })
{
    const modules = useContext(ModulesContext);
    return modules.length === 0 ? null : <div class="widget-cards on-page package-cards">{modules.map((module) => <ModuleCards key={module.package} module={module} page={page} who={who} view={view} />)}</div>;
}

/** One package's cards in a page, once its module came; one that did not load says so in a card of its own, with its error. */
function ModuleCards({ module, page, who, view }: { module: ShownModule; page: CardPage; who?: string | undefined; view?: unknown; })
{
    const owner = codeOfModule(module);
    const loaded = usePageModule(owner);
    const cards = cardsIn(loaded, page);

    if (cards instanceof Error) {
        const id = titleId(`${module.package}.broken`);
        return (
            <section class="card widget-card package-card" aria-labelledby={id}>
                <CardHead icon={iconPath("packages")} title={<h3 id={id}>{module.package}</h3>} />
                <div class="card-body widget-body">
                    <ExtensionRoot widget={owner} loaded={cards} kind="ext-body" draw={() => null} />
                </div>
            </section>
        );
    }

    return <>{cards.map(([name, card]) => <ModuleCard key={name} module={module} name={name} card={card} page={page} who={who} view={view} />)}</>;
}

/** One card of a package's page code, with the data of the widget it names for who, once it comes (D-514). */
function ModuleCard({ module, name, card, page, who, view }: { module: ShownModule; name: string; card: PageCard; page: CardPage; who?: string | undefined; view?: unknown; })
{
    const owner = codeOfModule(module);
    const loaded = usePageModule(owner);
    const data = useWidgetData(module.package, card.widget, who, useContext(WidgetsContext));
    const id = titleId(`${module.package}.${name}`);
    const Drawing = card.draw;
    return (
        <section class="card widget-card package-card" aria-labelledby={id}>
            <CardHead icon={card.icon ?? iconPath("packages")} title={<h3 id={id}>{card.title}</h3>} />
            <div class="card-body widget-body">
                <ExtensionRoot
                    widget={owner}
                    loaded={loaded}
                    kind="ext-body"
                    draw={() => <Drawing {...pagePropsOf(owner)} name={name} page={page} {...(who === undefined ? {} : { who })} {...(view === undefined ? {} : { view })} {...(data === undefined ? {} : { data })} />}
                />
            </div>
        </section>
    );
}

/** A widget's title as a chip names it: with what it says whole, Weather: scattered rain, 10–15 °C. */
export function widgetSaid(widget: ShownWidget): string
{
    const says = widget.shows?.says;
    return says === undefined ? widget.title : t("{title}: {says}", { title: widget.title, says: textOf(says) });
}

/** A widget's text as one string, its values written in the page's language: for a tip or a name. */
export function textOf(text: WidgetText): string
{
    return typeof text === "string" ? text : text.text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in text.values ? isolated(valueOf(text.values[name])) : whole));
}

/** The widgets of a place, of a page for a card in one, in their order; one turned off is in none. */
function inPlace(widgets: ShownWidget[], place: WidgetSpot["place"], page?: WidgetPage): ShownWidget[]
{
    return widgets.filter((widget) => widget.place === place && (page === undefined || widget.page === page)).sort((first, second) => first.order - second.order);
}

/** The card of the same extension a chip leads to: the first in a page, where the address reaches it. */
function cardOf(widgets: ShownWidget[], chip: ShownWidget): ShownWidget | undefined
{
    return inPlace(widgets, "page").find((widget) => widget.extension === chip.extension && widget.shows !== undefined);
}

function WidgetChip({ widget, card }: { widget: ShownWidget; card?: ShownWidget | undefined; })
{
    const shows = widget.shows;
    const icon = shows?.icon ?? widget.icon;
    const said = widgetSaid(widget);
    const loaded = usePageModule(widget);
    // Its lead's figure in place of its icon, when its page code draws one (D-510): the frame, the words, the tip and the name stay the page's.
    const lead = shows?.parts?.find((part) => "lead" in part && part.figure !== undefined) as Extract<WidgetPart, { lead: WidgetText; }> | undefined;
    // Named by its whole sentence, which its tip shows too: the tip's drawing would add itself to a name made of its words.
    const inside = (
        <>
            {lead?.figure !== undefined && widget.module !== undefined
                ? <Figure owner={{ widget, loaded, data: shows?.data, place: "top" }} name={lead.figure} part={lead} />
                : icon !== undefined && <Drawn path={icon} kind="icon" />}
            <span class="num">{shows?.chip === undefined ? widget.title : <Text text={shows.chip} />}</span>
        </>
    );

    // A chip leads to its extension's card where one stands in a page; else it only says.
    return card?.page === undefined
        ? <span class="status-chip widget-chip tip-below" role="img" aria-label={said} data-tip={said}>{inside}</span>
        : (
            <a class="status-chip widget-chip tip-below" href={sectionAddress(pageSections[card.page])} aria-label={said} data-tip={said} onClick={(event) => toCard(event, card.id)}>
                {inside}
            </a>
        );
}

/** A chip's click: to its card at once when the page shows it, else to its page, where the card brings itself into view. */
function toCard(event: MouseEvent, id: string): void
{
    const title = document.getElementById(titleId(id));

    if (title === null) {
        wanted = id;
        return;
    }

    event.preventDefault();
    bringTitle(title);
}

/** A card's title in view, the focus on it. */
function bringTitle(title: HTMLElement): void
{
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    title.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    title.focus({ preventScroll: true });
}

/** The id of a widget card's title. */
function titleId(id: string): string
{
    return `widget-${id.replace(/[^a-z0-9-]/gi, "-")}`;
}

function WidgetCard({ widget }: { widget: ShownWidget; })
{
    const id = titleId(widget.id);
    const title = useRef<HTMLHeadingElement>(null);
    const shows = widget.shows;
    const loaded = usePageModule(widget);
    const place = widget.place === "page" ? "page" : "side";

    // Led here by its chip from another page.
    useEffect(() => {
        if (wanted === widget.id && title.current !== null) {
            wanted = undefined;
            bringTitle(title.current);
        }
    }, []);

    return (
        <section class="card widget-card" aria-labelledby={id}>
            <CardHead
                icon={shows?.icon ?? widget.icon ?? iconPath("packages")}
                title={<h3 id={id} ref={title} tabIndex={-1}>{widget.title}</h3>}
                {...(shows?.note === undefined ? {} : { note: <Text text={shows.note} /> })}
            />
            {/* Its parts, whose counts and lead its page code may draw as figures (D-510). */}
            {shows?.parts !== undefined && shows.parts.length > 0 && (
                <OwnerContext.Provider value={{ widget, loaded, data: shows.data, place }}>
                    <div class="card-body widget-body">{shows.parts.map((part, index) => <Part key={index} part={part} />)}</div>
                </OwnerContext.Provider>
            )}
        </section>
    );
}

/** Who acts in a card (D-509, D-510): their portrait as the page draws it, the party and those at the place known by name; their name and what they do. */
export function Who({ who, does }: { who: string; does?: WidgetText | undefined; })
{
    const person = useContext(PeopleContext).find((one) => one.name === who) ?? { name: who, role: "other" as const };
    const side = sideOf(person.role);
    return (
        <div class="who-acts">
            <Token member={person} {...(side === undefined ? {} : { side })} />
            <p class="who-acts-words" dir="auto">
                <b class="who-acts-name">{who}</b>
                {does !== undefined && (
                    <span class="who-acts-does">
                        <Text text={does} />
                    </span>
                )}
            </p>
        </div>
    );
}

/** A part of a widget's card, as the page draws its own. */
export function Part({ part }: { part: WidgetPart; })
{
    const owner = useContext(OwnerContext);

    if ("who" in part) {
        return <Who who={part.who} does={part.does} />;
    }

    if ("lead" in part && part.figure !== undefined && owner?.widget.module !== undefined) {
        // Drawn by its extension's page code over its words and value, which stay the page's (D-510): the figure in place of its icon.
        return (
            <div class="widget-lead figured">
                <Figure owner={owner} name={part.figure} part={part} />
                <span class="widget-lead-words" dir="auto">
                    <Text text={part.lead} />
                </span>
                {part.value !== undefined && <Value value={part.value} kind="widget-lead-value" />}
            </div>
        );
    }

    if ("lead" in part) {
        return (
            <div class="widget-lead">
                {part.icon !== undefined && <Drawn path={part.icon} kind="widget-lead-icon" />}
                <span class="widget-lead-words" dir="auto">
                    <Text text={part.lead} />
                </span>
                {part.value !== undefined && <Value value={part.value} kind="widget-lead-value" />}
            </div>
        );
    }

    if ("text" in part) {
        return (
            <p class="widget-text" dir="auto">
                <Text text={part.text} />
            </p>
        );
    }

    if ("facts" in part) {
        return (
            <ul class="chips">
                {part.facts.map((fact, index) => (
                    <li key={index} dir="auto">
                        <Text text={fact} />
                    </li>
                ))}
            </ul>
        );
    }

    if ("values" in part) {
        return (
            <div class="line">
                {part.values.map((one, index) => (
                    <span key={index} class="line-value">
                        <span class="label">
                            <Text text={one.label} />
                        </span>
                        <Value value={one.value} />
                    </span>
                ))}
            </div>
        );
    }

    if ("track" in part) {
        return <Track track={part.track} />;
    }

    if ("rows" in part) {
        return (
            <div class="rows widget-rows">
                {part.rows.map((row, index) => (
                    <div key={index} class="row row-number">
                        <span class="label" dir="auto">
                            <Text text={row.label} />
                        </span>
                        <span class="changing">{row.value === undefined ? null : <Value value={row.value} />}</span>
                        {row.note !== undefined && (
                            <span class="beside" dir="auto">
                                <Text text={row.note} />
                            </span>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if ("table" in part) {
        return (
            <div class="widget-table">
                <table>
                    <thead>
                        <tr>
                            {part.table.head.map((cell, index) => (
                                <th key={index} scope="col">
                                    <Text text={cell} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {part.table.rows.map((row, index) => (
                            <tr key={index}>
                                {row.map((cell, at) => (
                                    <td key={at}>
                                        <Value value={cell} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return <img class="widget-image" src={`/images/ext/${encodeURIComponent(part.image.extension)}/${encodeURIComponent(part.image.file)}?v=${part.image.version}`} alt={textOf(part.alt)} loading="lazy" />;
}

/**
 * A count as marks, or a bar, with its label; a screen reader hears the label once, in the count's name, with its value in words (D-507). Marks are pips, or
 * tall steps of a progress with their count under them; good ones circles, bad ones squares; after those lit, the held, the marked and the coming. In a card
 * of a question, its place there, and what changed since the card's last look, for its marks to move.
 */
export function Track({ track, place, change }: { track: WidgetTrack; place?: "start" | "center" | "end"; change?: TrackChange | undefined; })
{
    // Without a figure, its marks drawn here: a plain count needs nothing of the page around it.
    return track.figure === undefined ? Marks({ track, place, change }) : <Figured track={track} figure={track.figure} place={place} change={change} />;
}

/**
 * A count its package draws as a figure (D-510), where its page code runs: the page keeps its name, in words for a screen reader, and its count in figures
 * under it; elsewhere its marks.
 */
function Figured({ track, figure, place, change }: { track: WidgetTrack; figure: string; place?: "start" | "center" | "end" | undefined; change?: TrackChange | undefined; })
{
    const owner = useContext(OwnerContext);

    if (owner?.widget.module === undefined) {
        return <Marks track={track} place={place} change={change} />;
    }

    const { label, named, kind } = trackWords(track, place);
    return (
        <div class={`${kind} figured`}>
            <span class="track-figure" role="img" aria-label={named}>
                <Figure owner={owner} name={figure} part={{ track }} />
            </span>
            <span class="track-count figure-count" aria-hidden="true">
                <span dir="auto">{label}</span> <span class="num">{`${numberText(track.value + (track.held ?? 0))}/${numberText(track.max)}`}</span>
            </span>
        </div>
    );
}

/** A count's words: its label, its name for a screen reader with the marks held, failed and coming, its value in words, and its classes. */
function trackWords(track: WidgetTrack, place: "start" | "center" | "end" | undefined): { label: string; said: string; more: string[]; named: string; kind: string; }
{
    const label = textOf(track.label);
    const said = t("{value} of {max}", { value: track.value, max: track.max });
    const kind = [place === undefined ? "widget-track" : `ask-track track-${place}`, track.tone ?? ""].filter((name) => name !== "").join(" ");
    const more = [
        track.held === undefined || track.held === 0 ? "" : t("held: {count}", { count: track.held }),
        track.marked === undefined || track.marked === 0 ? "" : t("failed: {count}", { count: track.marked }),
        track.coming === undefined || track.coming === 0 ? "" : t("this roll: {count}", { count: track.coming }),
    ].filter((part) => part !== "");
    return { label, said, more, named: [`${label}: ${said}`, ...more].join(", "), kind };
}

/** A count as marks, or a bar, with its label. */
function Marks({ track, place, change }: { track: WidgetTrack; place?: "start" | "center" | "end" | undefined; change?: TrackChange | undefined; })
{
    const { label, said, more, named, kind } = trackWords(track, place);
    const steps = track.look === "steps";
    const marks = track.look !== "bar" && track.max <= (steps ? mostSteps : mostPips);

    return (
        <div class={kind}>
            <span class="widget-track-label" dir="auto" aria-hidden="true">{label}</span>
            {marks
                ? (
                    <span class={["pips", steps ? "steps" : "", track.tone ?? ""].filter((name) => name !== "").join(" ")} role="img" aria-label={named}>
                        {Array.from({ length: track.max }, (_, index) => <Mark key={index} index={index} track={track} change={change} />)}
                    </span>
                )
                : (
                    <span class="bar-line">
                        <span class="bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={track.max} aria-valuenow={track.value} aria-valuetext={more.length === 0 ? said : [said, ...more].join(", ")}>
                            <span class="fill" style={{ "--fill": String(track.value / track.max) }} />
                        </span>
                        <span class="num" aria-hidden="true">{`${numberText(track.value)}/${numberText(track.max)}`}</span>
                    </span>
                )}
            {marks && steps && <span class="track-count num" aria-hidden="true">{`${numberText(track.value + (track.held ?? 0))}/${numberText(track.max)}`}</span>}
        </div>
    );
}

/** A figure of an extension, given what it drew before once what it draws changes, for it to move from one to the other. */
export function Figure({ owner, name, part }: { owner: Owner; name: string; part: FigurePart; })
{
    const looks = useRef<{ said: string; data?: unknown; before?: unknown; }>();
    const said = JSON.stringify([part, owner.data]);

    // The data it drew before, once what it draws changes: in a card of a roll that is once the dice land, as the card changes only then.
    if (looks.current?.said !== said) {
        looks.current = { said, data: owner.data, ...(looks.current === undefined ? {} : { before: looks.current.data }) };
    }

    const before = looks.current.before;
    const size = figureSize(owner.widget, name);
    return (
        <ExtensionRoot
            widget={owner.widget}
            loaded={owner.loaded}
            kind={`ext-figure at-${owner.place}`}
            size={size}
            draw={(module) => {
                const Drawing = module.figures?.[name];

                if (Drawing === undefined) {
                    throw new Error(`its page module has no figure ${name}`);
                }

                return <Drawing {...pagePropsOf(owner.widget)} name={name} data={owner.data} {...(before === undefined ? {} : { before })} part={part} place={owner.place} size={size} />;
            }}
        />
    );
}

// How many marks a count draws at most, as pips or as steps; past that, a bar.
const mostPips = 10;
const mostSteps = 12;

/** One mark of a count: lit, held, marked or coming, by where it falls after the value; lit or gone out just now, its step in the order they move. */
function Mark({ index, track, change }: { index: number; track: WidgetTrack; change?: TrackChange | undefined; })
{
    const held = track.value + (track.held ?? 0);
    const marked = held + (track.marked ?? 0);
    const state = index < track.value ? "on" : index < held ? "held" : index < marked ? "marked" : index < marked + (track.coming ?? 0) ? "coming" : "";
    const lit = change?.lit.indexOf(index) ?? -1;
    const out = change?.out.indexOf(index) ?? -1;
    const moves = lit >= 0 ? "lit" : out >= 0 ? "out" : change?.marked.includes(index) === true ? "struck" : "";
    const step = Math.max(lit, out, 0);
    return <span class={["pip", state, moves].filter((name) => name !== "").join(" ")} style={moves === "" ? undefined : { "--step": String(step) }} />;
}

/** Words of an extension, its values written in the page's language, each set apart. */
export function Text({ text }: { text: WidgetText; })
{
    if (typeof text === "string") {
        return <>{text}</>;
    }

    const pieces: ComponentChildren[] = text.text.split(/(\{\w+\})/).filter((piece) => piece !== "").map((piece, index) => {
        const name = /^\{(\w+)\}$/.exec(piece)?.[1];
        return name !== undefined && name in text.values ? <Value key={index} value={text.values[name]} /> : piece;
    });
    return <>{pieces}</>;
}

/** A value: a number or a range with its unit, as the page's language writes them, set apart; a word as it is. */
export function Value({ value, kind }: { value: WidgetValue; kind?: string; })
{
    return typeof value === "string"
        ? <span class={kind} dir="auto">{value}</span>
        : <bdi class={kind === undefined ? "num" : `num ${kind}`} dir={pageDirection() === "rtl" ? "ltr" : undefined}>{valueOf(value)}</bdi>;
}

/** A value as one string in the page's language: 12 km, 10–15 °C. */
function valueOf(value: WidgetValue): string
{
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number") {
        return numberText(value);
    }

    const unit = value.unit === undefined || value.unit === "" ? "" : ` ${value.unit}`;
    return "number" in value ? `${numberText(value.number)}${unit}` : `${rangeText(value.from, value.to)}${unit}`;
}

/** Two numbers as a range, as the page's language writes it: 10–15, −5 – 0. */
function rangeText(from: number, to: number): string
{
    const format = new Intl.NumberFormat(document.documentElement.lang || "en", { numberingSystem: "latn", useGrouping: false, maximumFractionDigits: 2 });
    return typeof format.formatRange === "function" ? format.formatRange(from, to) : `${numberText(from)}–${numberText(to)}`;
}

/** An extension's icon, drawn as the page strokes its own. */
export function Drawn({ path, kind }: { path: string; kind: string; })
{
    return (
        <svg class={kind} viewBox="0 0 24 24" aria-hidden="true">
            <path d={path} />
        </svg>
    );
}
