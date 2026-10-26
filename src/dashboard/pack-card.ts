// A package's card for its questions (D-507): what the page keeps of it from one reading to the next, how its widget's parts stand on it, and what changed
// on it between two looks, for its marks to move.
import type { Asked, AskedNow, WidgetPart, WidgetShows, WidgetText, WidgetTrack } from "./data.ts";

/**
 * The card as the page shows it: its widget and attempt and what it shows; the attempt's question the page saw first, its title; the question asked now;
 * the button the player pressed, while its answer goes; ended once the call that asked in it is over.
 */
export interface PackCard
{
    widget: string;
    key: string;
    shows: WidgetShows;
    title?: string;
    asked?: Asked;
    sent?: number;
    ended?: true;
}

/** The card after a reading; and an attempt whose card goes without a button of it pressed, which no card that ends it brings back. */
export interface PackReading
{
    card?: PackCard;
    let?: string;
}

/**
 * The card after a reading of what the master asks: the question's card once its widget answered, the one before while it has not; the card a call left
 * once over, unless the player let it go; the one before while the button pressed goes; else none, as when another question takes its place. `gone`: the
 * attempts the player let go, each with the question they did it at.
 */
export function nextPackCard(before: PackCard | undefined, now: AskedNow, gone: ReadonlyMap<string, string | undefined>): PackReading
{
    const asked = now.asked ?? undefined;

    if (asked !== undefined) {
        const card = asked.card;
        const kept = before?.key === card?.key ? before : undefined;

        // Let go by the player at this very question, which the master has not taken back yet.
        if (card === undefined || card.shows === undefined || (gone.has(card.key) && gone.get(card.key) === asked.id)) {
            return card?.coming === true && kept !== undefined ? { card: kept } : {};
        }

        const sent = kept?.asked?.id === asked.id && kept.sent !== undefined ? { sent: kept.sent } : {};
        return { card: { widget: card.widget, key: card.key, shows: card.shows, title: kept?.title ?? asked.question, asked, ...sent } };
    }

    const ended = now.card;

    // The call over with nothing for its card to show, as a roll turned down before its first die: the card goes.
    if (ended?.ended === true && ended.shows === undefined && before?.key === ended.key) {
        return {};
    }

    if (ended?.ended === true && ended.shows !== undefined && !gone.has(ended.key)) {
        const kept = before?.key === ended.key ? before : undefined;
        const title = kept?.title === undefined ? {} : { title: kept.title };
        return { card: { widget: ended.widget, key: ended.key, shows: ended.shows, ...title, ...(kept?.asked === undefined ? {} : { asked: kept.asked }), ended: true } };
    }

    // Its question gone with no button of it pressed, as answered in words or taken back by the master: the card goes, and what the call leaves stays away.
    if (before !== undefined && before.ended !== true) {
        return before.sent !== undefined ? { card: before } : { let: before.key };
    }

    return {};
}

/** Whether a question is asked in a package's card, coming or come, which shows in place of the banner and alone answers it (D-507). */
export function inCard(asked: Asked | undefined): boolean
{
    return asked?.card !== undefined && (asked.card.shows !== undefined || asked.card.coming === true);
}

/**
 * Where a card's parts stand: who acts, the outcome, the counts in their places (the middle one large, the start's and the end's one over the other at
 * the side, D-509), the facts under the last, the lines under the outcome, and any other part.
 */
export interface CardLayout
{
    who?: Extract<WidgetPart, { who: string; }>;
    lead?: Extract<WidgetPart, { lead: WidgetText; }>;
    places: Record<NonNullable<WidgetTrack["stage"]>, WidgetTrack[]>;
    facts: WidgetText[];
    texts: WidgetText[];
    others: WidgetPart[];
}

/** A widget's parts as a card lays them out: a count with no place in the middle, the facts in the place of the last count at the end, else the middle. */
export function cardLayout(shows: WidgetShows): CardLayout
{
    const layout: CardLayout = { places: { start: [], center: [], end: [] }, facts: [], texts: [], others: [] };

    for (const part of shows.parts ?? []) {
        if ("lead" in part) {
            layout.lead ??= part;
        } else if ("who" in part) {
            layout.who ??= part;
        } else if ("track" in part) {
            layout.places[part.track.stage ?? "center"].push(part.track);
        } else if ("facts" in part) {
            layout.facts.push(...part.facts);
        } else if ("text" in part) {
            layout.texts.push(part.text);
        } else {
            layout.others.push(part);
        }
    }

    return layout;
}

/** What changed on a count: the marks lit since, in the order they light; those gone out, from the last; those marked anew, as a die that failed. */
export interface TrackChange
{
    lit: number[];
    out: number[];
    marked: number[];
}

/** What changed on each count from one look of a card to the next, by its label: only the counts that changed. */
export function trackChanges(before: WidgetShows | undefined, after: WidgetShows): Map<string, TrackChange>
{
    const changes = new Map<string, TrackChange>();
    const was = new Map(tracksOf(before).map((track) => [labelKey(track.label), track]));

    for (const track of tracksOf(after)) {
        const old = was.get(labelKey(track.label));

        if (old === undefined) {
            continue;
        }

        const [from, to] = [litOf(old), litOf(track)];
        const marked = range(to, to + (track.marked ?? 0)).filter((index) => index < litOf(old) || index >= litOf(old) + (old.marked ?? 0));
        const change = { lit: range(from, to), out: range(to, from).reverse(), marked };

        if (change.lit.length + change.out.length + change.marked.length > 0) {
            changes.set(labelKey(track.label), change);
        }
    }

    return changes;
}

/** A count's label as a key, the same however its values are given. */
export function labelKey(label: WidgetText): string
{
    return JSON.stringify(label);
}

/** The marks a count shows filled: those lit, then those held. */
function litOf(track: WidgetTrack): number
{
    return track.value + (track.held ?? 0);
}

function tracksOf(shows: WidgetShows | undefined): WidgetTrack[]
{
    return (shows?.parts ?? []).flatMap((part) => ("track" in part ? [part.track] : []));
}

/** The whole numbers from one to the other, the last left out; none when the second is not past the first. */
function range(from: number, to: number): number[]
{
    return Array.from({ length: Math.max(0, to - from) }, (_, index) => from + index);
}
