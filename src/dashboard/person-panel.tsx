// A package's widget on someone of the party (D-514, D-516). One that says their state (its chip) is drawn as a panel, as the 5e's death saves (D-461):
// its good counts on the start side as circles, its bad ones on the end side as squares, its lead's word between them with the package's figure over it,
// tinted by the lead's tone, greyed when dead by its rules; large under the name and in the card at hand, one line in a row of the turns, small in the
// party's strip; with one side only, the word beside it, the two in the middle. Any other is a small card of its package among the boxes of values under the
// name, as the rerolls of a lock.
import type { ShownWidget, Tone, WidgetPart, WidgetShows, WidgetText, WidgetTrack, WidgetValue } from "./data.ts";
import { statusIcons } from "./icons.tsx";
import { usePageModule } from "./packages/page-code.tsx";
import { Figure, textOf, Value } from "./packages/widgets.tsx";
import { numberText, t } from "./text.ts";

/** What the widgets on someone of the party show on them, in their order; only those that draw something, a count or a lead. */
export interface PersonShown
{
    widget: ShownWidget;
    shows: WidgetShows;
}

/** The widgets on someone of the party that say their state (a `chip`) and draw it, in their order: each the panel of A (D-516). */
export function personShown(widgets: ShownWidget[], name: string): PersonShown[]
{
    return onPerson(widgets, name).filter((shown) => saysState(shown) && shown.shows.parts?.some((part) => "track" in part || "lead" in part) === true);
}

/** The other widgets on someone of the party, each boxes among the values under their name: a package's small card on them (D-516). */
export function personBoxes(widgets: ShownWidget[], name: string): PersonShown[]
{
    return onPerson(widgets, name).filter((shown) => !saysState(shown) && boxParts(shown.shows).length > 0);
}

/** Whether a widget on someone says their state: its chip, from one made for each of the party; one the campaign moved there has the top's chip (D-516). */
export function saysState({ widget, shows }: PersonShown): boolean
{
    return shows.chip !== undefined && widget.own.place === "person";
}

/**
 * A package's widget on someone as boxes of the line under their name, as the sheet's own values (D-516): a count with its label, its marks or its number; a
 * lead under the widget's title, its words and value; each value under its label.
 */
export function PersonBoxes({ shown }: { shown: PersonShown[]; })
{
    return (
        <>
            {shown.flatMap(({ widget, shows }) =>
                boxParts(shows).map((part, index) => (
                    <span key={`${widget.id} ${index}`} class="line-value person-box">
                        <span class="label" dir="auto">{"track" in part ? textOf(part.track.label) : "lead" in part ? widget.title : textOf(part.label)}</span>
                        <span class="changing">{"track" in part ? <BoxCount track={part.track} /> : "lead" in part ? <BoxLead lead={part} /> : <Value value={part.value} />}</span>
                    </span>
                ))
            )}
        </>
    );
}

/** The counters of the sheet the widgets on someone show (`track.field`), panels and boxes, which leave the line of values under their name. */
export function personFields(shown: PersonShown[]): Set<string>
{
    return new Set(shown.flatMap(({ shows }) => tracksOf(shows).flatMap((track) => (track.field === undefined ? [] : [track.field]))));
}

/** The panel of a widget on someone: large, or in one line in a row of the turns. */
export function PersonPanel({ shown, compact = false }: { shown: PersonShown; compact?: boolean; })
{
    const loaded = usePageModule(shown.widget);
    const { start, end, lead } = sidesOf(shown.shows);
    const one = start.length === 0 || end.length === 0;
    const dead = shown.shows.dead === true;
    const tint = dead ? "dead" : tintOf(lead?.tone);
    const figure = lead?.figure !== undefined && shown.widget.module !== undefined ? lead : undefined;
    const classes = ["person-panel", tint, one ? "one-side" : "", compact ? "compact" : "", figure === undefined ? "" : "figured"].filter((name) => name !== "").join(" ");
    return (
        <div class={classes}>
            {start.map((track, index) => <Side key={`start ${index}`} track={track} side="start" />)}
            {lead !== undefined && (
                <span class="person-middle">
                    {figure !== undefined && <Figure owner={{ widget: shown.widget, loaded, data: shown.shows.data, place: "person" }} name={figure.figure ?? ""} part={figure} />}
                    <span class="person-word" dir="auto">
                        {dead && <Skull />}
                        {textOf(lead.lead)}
                    </span>
                </span>
            )}
            {end.map((track, index) => <Side key={`end ${index}`} track={track} side="end" />)}
        </div>
    );
}

/** A widget on someone in the party's strip, in place of their bar: its word and its counts' marks, small. */
export function PersonStrip({ shown }: { shown: PersonShown; })
{
    const { start, end, lead } = sidesOf(shown.shows);
    const marks = [...start, ...end].flatMap((track, at) =>
        Array.from({ length: track.max }, (_, index) => <span key={`${at} ${index}`} class={`strip-mark ${goodOf(track, start.includes(track)) ? "success" : "failure"}${index < track.value ? " marked" : ""}`} />)
    );
    return (
        <span class={`member-state ${shown.shows.dead === true ? "dead" : tintOf(lead?.tone)}`}>
            {lead !== undefined && <span class="member-state-word" dir="auto">{textOf(lead.lead)}</span>}
            {marks.length > 0 && <span class="strip-marks" aria-hidden="true">{marks}</span>}
        </span>
    );
}

/** A count in a box, as the line draws a counter: its pips, up to ten, else its number of the most; named by its label and value. */
function BoxCount({ track }: { track: WidgetTrack; })
{
    const named = `${textOf(track.label)}: ${t("{value} of {max}", { value: track.value, max: track.max })}`;
    return track.max <= 10 && track.look !== "bar"
        ? (
            <span class={track.tone === undefined ? "pips" : `pips ${track.tone}`} role="img" aria-label={named}>
                {Array.from({ length: track.max }, (_, index) => <span key={index} class={index < track.value ? "pip on" : "pip"} />)}
            </span>
        )
        : <span class="num" role="img" aria-label={named}>{`${numberText(track.value)}/${numberText(track.max)}`}</span>;
}

/** A lead in a box: its words, and its value after them. */
function BoxLead({ lead }: { lead: Lead; })
{
    return (
        <span class="person-box-lead">
            <span dir="auto">{textOf(lead.lead)}</span>
            {lead.value !== undefined && <Value value={lead.value} />}
        </span>
    );
}

type BoxPart = { track: WidgetTrack; } | Lead | { label: WidgetText; value: WidgetValue; };

/** What of a widget a box draws: its counts, its leads, and each of its values. */
function boxParts(shows: WidgetShows): BoxPart[]
{
    return (shows.parts ?? []).flatMap((part): BoxPart[] => ("track" in part || "lead" in part ? [part] : "values" in part ? part.values : []));
}

/** The widgets that show something on someone of the party, in their order. */
function onPerson(widgets: ShownWidget[], name: string): PersonShown[]
{
    return widgets.filter((widget) => widget.place === "person").sort((first, second) => first.order - second.order).flatMap((widget) => {
        const shows = widget.people?.[name];
        return shows === undefined ? [] : [{ widget, shows }];
    });
}

/** A count on its side: good ones circles, bad ones squares; one without a tone as its side's. */
function Side({ track, side }: { track: WidgetTrack; side: "start" | "end"; })
{
    return <Marks kind={goodOf(track, side === "start") ? "successes" : "failures"} label={textOf(track.label)} value={track.value} most={track.max} />;
}

/** A side's marks under their label: good ones as circles, bad ones as squares, by shape as well as colour; a screen reader hears the count. */
function Marks({ kind, label, value, most }: { kind: "successes" | "failures"; label: string; value: number; most: number; })
{
    return (
        <div class={kind === "failures" ? "person-side bad" : "person-side good"}>
            <span class="eyebrow person-label" aria-hidden="true">{label}</span>
            <span class="person-marks">
                {Array.from({ length: most }, (_, index) => <span key={index} class={index < value ? "person-mark marked" : "person-mark"} aria-hidden="true" />)}
                <span class="visually-hidden">{`${label}: ${t("{value} of {max}", { value, max: most })}`}</span>
            </span>
        </div>
    );
}

/** The red skull of the dead, as on their token (D-461), before the word. */
function Skull()
{
    return (
        <svg class="person-skull" viewBox="0 0 24 24" aria-hidden="true">
            <path d={statusIcons.dead} />
        </svg>
    );
}

type Lead = Extract<WidgetPart, { lead: unknown; }>;

/** A widget's counts by their side, the good ones and those at the stage's start first, and its first lead. */
function sidesOf(shows: WidgetShows): { start: WidgetTrack[]; end: WidgetTrack[]; lead?: Lead | undefined; }
{
    const tracks = tracksOf(shows);
    const atStart = (track: WidgetTrack): boolean => track.stage === "start" || (track.stage !== "end" && track.tone === "good");
    return {
        start: tracks.filter(atStart),
        end: tracks.filter((track) => !atStart(track)),
        lead: shows.parts?.find((part): part is Lead => "lead" in part),
    };
}

function tracksOf(shows: WidgetShows): WidgetTrack[]
{
    return (shows.parts ?? []).flatMap((part) => ("track" in part ? [part.track] : []));
}

function goodOf(track: WidgetTrack, start: boolean): boolean
{
    return track.tone === undefined ? start : track.tone === "good";
}

/** The panel's tint by its lead's tone: bad as dying, good as stable, none quiet. */
function tintOf(tone: Tone | undefined): string
{
    return tone === "good" ? "stable" : tone === "bad" ? "dying" : "quiet";
}
