// The widgets of the campaign's extensions (D-502), drawn with the page's own parts: a chip in the top, cards in the table's column and at the end of a page.
// What they show comes from the server, in the campaign's language, checked; the page writes their values in its own language, isolated right to left.
import { type ComponentChildren, createContext } from "preact";
import { useContext, useEffect, useRef } from "preact/hooks";
import { type Section, sectionAddress } from "./address.ts";
import { CardHead } from "./card.tsx";
import type { ShownWidget, WidgetPage, WidgetPart, WidgetSpot, WidgetText, WidgetValue } from "./data.ts";
import { iconPath } from "./icons.tsx";
import { isolated, numberText, pageDirection, t } from "./text.ts";

/** The widgets of the campaign's extensions, as last read: every part of the page that holds some takes its own from here. */
export const WidgetsContext = createContext<ShownWidget[]>([]);

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

/** The cards of the widgets that stand in this place, or at the end of this page, in their order; nothing where none does. */
export function WidgetCards({ place, page }: { place: "side" | "page"; page?: WidgetPage; })
{
    const widgets = inPlace(useContext(WidgetsContext), place, page).filter((widget) => widget.shows?.parts !== undefined || widget.shows?.note !== undefined);

    if (widgets.length === 0) {
        return null;
    }

    return (
        <div class={`widget-cards on-${place}`}>
            {widgets.map((widget) => <WidgetCard key={widget.id} widget={widget} />)}
        </div>
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
    // Named by its whole sentence, which its tip shows too: the tip's drawing would add itself to a name made of its words.
    const inside = (
        <>
            {icon !== undefined && <Drawn path={icon} kind="icon" />}
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
            {shows?.parts !== undefined && shows.parts.length > 0 && <div class="card-body widget-body">{shows.parts.map((part, index) => <Part key={index} part={part} />)}</div>}
        </section>
    );
}

/** A part of a widget's card, as the page draws its own. */
function Part({ part }: { part: WidgetPart; })
{
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

/** A count as pips, or a bar, with its label and its value in words for a screen reader. */
function Track({ track }: { track: { label: WidgetText; value: number; max: number; look?: "pips" | "bar"; }; })
{
    const label = textOf(track.label);
    const said = t("{value} of {max}", { value: track.value, max: track.max });
    const pips = track.look !== "bar" && track.max <= 10;
    return (
        <div class="widget-track">
            <span class="widget-track-label" dir="auto">{label}</span>
            {pips
                ? (
                    <span class="pips" role="img" aria-label={`${label}: ${said}`}>
                        {Array.from({ length: track.max }, (_, index) => <span key={index} class={index < track.value ? "pip on" : "pip"} />)}
                    </span>
                )
                : (
                    <span class="bar-line">
                        <span class="bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={track.max} aria-valuenow={track.value} aria-valuetext={said}>
                            <span class="fill" style={{ "--fill": String(track.value / track.max) }} />
                        </span>
                        <span class="num">{`${numberText(track.value)}/${numberText(track.max)}`}</span>
                    </span>
                )}
        </div>
    );
}

/** Words of an extension, its values written in the page's language, each set apart. */
function Text({ text }: { text: WidgetText; })
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
function Value({ value, kind }: { value: WidgetValue; kind?: string; })
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
function Drawn({ path, kind }: { path: string; kind: string; })
{
    return (
        <svg class={kind} viewBox="0 0 24 24" aria-hidden="true">
            <path d={path} />
        </svg>
    );
}
