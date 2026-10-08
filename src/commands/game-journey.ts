// A journey under way (D-258, TRV-8, TRV-9, TRV-12), kept in state.yaml under journey: what travels, where to or which way, where it stopped (on a road, or at
// a point in the open), the pace, the hours travelled since the last rest.
import { changeStateAt, readStateValues } from "../campaign/index.ts";
import { readLength } from "../core/length.ts";
import { comparableText } from "../core/text.ts";
import { pointAlong, type Start, type Stretch } from "../map/index.ts";
import { formatPosition, isEmptyField, locate, type Page, pagesWithName, parsePageReference, type Position, readPosition, type World } from "../pages/index.ts";
import { formatDuration, formatGameDate, type GameDate, minutesBetween, readDuration, readGameDate } from "../time/index.ts";
import { pointText, positionOf, regionAt } from "./game-positions.ts";
import { hoursText, lengthText, type Measures, type Roads } from "./game-roads.ts";

/** Where on a road a journey stopped (TRV-7): the road, its stretch by its place in the road, the ends of the stretch in the way it went, the metres done after `from`. */
export interface OnRoad
{
    road: string;
    index: number;
    from: string;
    toward: string;
    done: number;
}

/** How long a stop must last for the hours of travel to start again (TRV-8): a night's rest. */
export const restMinutes = 8 * 60;

/** A journey as state.yaml keeps it. */
export interface Journey
{
    /** What travels: the travellers, or the vehicle that carries them (TRV-6). */
    movers: string[];
    /** Where it goes; none once it arrived, while the day's hours still count. */
    to?: string;
    /** Off the roads, the way it goes instead of a place, and the metres left, when a distance was given (TRV-12). */
    heading?: string;
    left?: number;
    on?: OnRoad;
    /** Where in the open it stopped (TRV-12). */
    at?: Position;
    pace?: string;
    /** When its last travel ended, the minutes travelled since the last rest, and the hours of travel given for them (TRV-8). */
    last: GameDate;
    travelled: number;
    hours?: number;
}

/** The journey in state.yaml; none when there is none, or it does not read: then the next travel starts afresh. */
export function readJourney(root: string): Journey | undefined
{
    let value: unknown;

    try {
        value = readStateValues(root).journey;
    } catch {
        // A state.yaml that does not read is reported by validate (TIM-1); without a journey, travel starts afresh.
        return undefined;
    }

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const fields = value as Record<string, unknown>;
    const name = (field: unknown): string | undefined => (typeof field === "string" && !isEmptyField(field) ? parsePageReference(field).name : undefined);
    const text = (field: unknown): string | undefined => (typeof field === "string" && !isEmptyField(field) ? field.trim() : undefined);
    const movers = (Array.isArray(fields.who) ? fields.who : []).map(name).filter((mover) => mover !== undefined);
    const last = readGameDate(fields.last);
    const travelled = typeof fields.travelled === "string" ? readDuration(fields.travelled) : undefined;
    const hours = typeof fields.hours === "number" && fields.hours > 0 ? fields.hours : undefined;

    if (movers.length === 0 || last === undefined || travelled === undefined) {
        return undefined;
    }

    const [road, from, toward, index] = [name(fields.road), name(fields.from), name(fields.toward), Number(fields.stretch) - 1];
    const on = road === undefined || from === undefined || toward === undefined ? undefined : { road, index: Number.isInteger(index) ? index : -1, from, toward, done: readLength(fields.done) ?? 0 };
    const at = readPosition(fields.at);
    return { movers, to: name(fields.to), heading: text(fields.heading), left: readLength(fields.left), on, at, pace: text(fields.pace), last, travelled, hours };
}

/** Writes the journey in state.yaml, or removes it. */
export function saveJourney(root: string, journey: Journey | undefined): void
{
    const link = (name: string): string => `[[${name}]]`;
    const value = journey === undefined ? undefined : {
        who: journey.movers.map(link),
        ...(journey.to === undefined ? {} : { to: link(journey.to) }),
        ...(journey.heading === undefined ? {} : { heading: journey.heading }),
        ...(journey.left === undefined ? {} : { left: `${Math.round(journey.left)} m` }),
        ...(journey.on === undefined ? {} : {
            road: link(journey.on.road),
            stretch: journey.on.index + 1,
            from: link(journey.on.from),
            toward: link(journey.on.toward),
            done: `${Math.round(journey.on.done)} m`,
        }),
        ...(journey.at === undefined ? {} : { at: formatPosition(journey.at) }),
        ...(journey.pace === undefined ? {} : { pace: journey.pace }),
        last: formatGameDate(journey.last),
        travelled: formatDuration(journey.travelled) || "0m",
        ...(journey.hours === undefined ? {} : { hours: journey.hours }),
    };
    changeStateAt(root, [[["journey"], value]]);
}

/** The minutes travelled since the last rest (TRV-8): none once the movers have stopped for a night's rest since the last travel. */
export function travelledSinceRest(journey: Journey | undefined, now: GameDate): number
{
    return journey === undefined || minutesBetween(journey.last, now) >= restMinutes ? 0 : journey.travelled;
}

/** Whether a journey is made by these movers, the same ones. */
export function sameMovers(journey: Journey, movers: Page[]): boolean
{
    const names = new Set(movers.map((page) => comparableText(page.name)));
    return journey.movers.length === names.size && journey.movers.every((name) => names.has(comparableText(name)));
}

/** The movers of a journey as pages, those that still exist. */
export function moversNamed(world: World, journey: Journey): Page[]
{
    return journey.movers.map((name) => pagesWithName(world, name)[0]).filter((page) => page !== undefined);
}

/** Where on its road a journey stopped (TRV-9), as a start: when its movers are all still right in the road; undefined otherwise. */
export function journeyStart(world: World, roads: Roads, journey: Journey, movers: Page[]): Start | undefined
{
    const on = journey.on;
    const road = on === undefined ? undefined : pagesWithName(world, on.road)[0];

    if (on === undefined || road === undefined || !sameMovers(journey, movers) || !movers.every((page) => locate(world, page).chain[0] === road)) {
        return undefined;
    }

    const same = (first: string, second: string): boolean => comparableText(first) === comparableText(second);
    const joins = (candidate: Stretch): boolean => (same(candidate.from, on.from) && same(candidate.to, on.toward)) || (same(candidate.from, on.toward) && same(candidate.to, on.from));
    // The stretch by its place in the road, so that a road through the same two stops twice finds the right one; by its ends when written by hand.
    const stretch = roads.stretches.find((candidate) => candidate.road === road.name && candidate.index === on.index && joins(candidate))
        ?? roads.stretches.find((candidate) => candidate.road === road.name && joins(candidate));

    if (stretch === undefined) {
        return undefined;
    }

    const done = Math.min(Math.max(on.done, 0), stretch.length);
    return { stretch, done: same(stretch.from, on.from) ? done : stretch.length - done };
}

/**
 * Where in the open a journey stopped (TRV-12), when its movers are still there: in the smallest region that covers the point, or in no place when none does;
 * undefined otherwise.
 */
export function journeyPoint(world: World, journey: Journey, movers: Page[]): Position | undefined
{
    const holder = movers[0] === undefined ? undefined : locate(world, movers[0]).chain[0];

    if (journey.at === undefined || !sameMovers(journey, movers) || !movers.every((page) => locate(world, page).chain[0] === holder)) {
        return undefined;
    }

    return regionAt(world, journey.at)?.page === holder ? journey.at : undefined;
}

/**
 * Where the movers are on the map (TRV-12): the point in the open their journey stopped at; on its road, the point between the stretch's stops when both have
 * a position; else the position of the place they are in. Undefined when none gives one.
 */
export function moversPosition(world: World, roads: Roads, journey: Journey | undefined, movers: Page[]): Position | undefined
{
    const open = journey === undefined ? undefined : journeyPoint(world, journey, movers);
    const start = journey === undefined ? undefined : journeyStart(world, roads, journey, movers);

    if (open !== undefined) {
        return open;
    }

    if (start !== undefined && "stretch" in start) {
        const [from, to] = [pagesWithName(world, start.stretch.from)[0], pagesWithName(world, start.stretch.to)[0]];
        const [fromAt, toAt] = [from === undefined ? undefined : positionOf(world, from), to === undefined ? undefined : positionOf(world, to)];
        return fromAt === undefined || toAt === undefined ? undefined : pointAlong(fromAt, toAt, start.done / start.stretch.length);
    }

    return movers[0] === undefined ? undefined : positionOf(world, movers[0]);
}

/**
 * The journey under way as status says it (TRV-10): "to Capitale, on Via del Re, 36 km past Rocca, toward Capitale; 8h of travel on day 4. To go on: travel to
 * Capitale". Undefined when there is none, it arrived, or its movers left where it stopped.
 */
export function journeyText(world: World, roads: Roads, journey: Journey | undefined, measures: Measures): string | undefined
{
    if (journey === undefined) {
        return undefined;
    }

    const movers = moversNamed(world, journey);
    const stopped = journey.at === undefined ? undefined : journeyPoint(world, journey, movers);

    // Arrived at a point in the open, with nowhere more to go: where they are (TRV-13).
    if (journey.to === undefined && journey.heading === undefined) {
        const region = stopped === undefined ? undefined : regionAt(world, stopped)?.page.name;
        return stopped === undefined ? undefined : `stopped ${region === undefined ? "in the open" : `in ${region}`}, ${pointText(world, stopped, measures)}.`;
    }

    const onRoad = journey.on === undefined ? undefined : journeyStart(world, roads, journey, movers);
    const open = journey.at === undefined ? undefined : journeyPoint(world, journey, movers);

    if ((journey.on !== undefined && onRoad === undefined) || (journey.at !== undefined && open === undefined)) {
        return undefined;
    }

    const goal = journey.to === undefined ? `${journey.heading}${journey.left === undefined ? "" : ` for ${lengthText(journey.left, measures)} more`}` : `to ${journey.to}`;
    const region = open === undefined ? undefined : regionAt(world, open)?.page.name;
    const where = journey.on !== undefined
        ? `, on ${journey.on.road}, ${lengthText(journey.on.done, measures)} past ${journey.on.from}, toward ${journey.on.toward}`
        : open !== undefined
        ? `, ${region === undefined ? "in the open" : `in ${region}`}, ${pointText(world, open, measures)}`
        : "";
    const call = journey.to === undefined ? `travel toward ${journey.heading}` : `travel to ${journey.to}${journey.at === undefined ? "" : ", across"}`;
    return `${goal}${where}; ${hoursText(journey.travelled)} of travel since the last rest. To go on: ${call}.`;
}
