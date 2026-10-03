// The game time as several commands use it: the present date from state.yaml, and the planned events of the world.
import { readState } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { type LogEntry, newLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { isEmptyField, type Page, type PageType, parsePageReference, type World } from "../pages/index.ts";
import { formatDuration, formatGameDate, type GameDate, minutesBetween, readGameDate } from "../time/index.ts";

/** A planned event of the world, with its game date when the engine can read one. */
export interface PlannedEvent
{
    page: Page;
    date?: GameDate;
}

/** A planned event with a game date: it comes due at that date. */
export type DatedEvent = PlannedEvent & { date: GameDate; };

/** The present of the game: its date, or the problem that keeps state.yaml from giving one; neither before the game has a date. */
export function readPresent(root: string): { date?: GameDate; problem?: Problem; }
{
    let text: string | null | undefined;

    try {
        text = readState(root).date;
    } catch (error) {
        return { problem: { message: error instanceof Error ? error.message : String(error) } };
    }

    const date = readGameDate(text);

    if (isEmptyField(text) || date !== undefined) {
        return { date };
    }

    return { problem: { message: `The game date in state.yaml, "${text}", is not a game date.`, fix: "write it by hand as day 3, 06:00" } };
}

/** The game date now, undefined before the game has one. A state.yaml that cannot give it stops the command, with how to fix it. */
export function presentDate(root: string): GameDate | undefined
{
    const { date, problem } = readPresent(root);

    if (problem !== undefined) {
        throw new Error(problemText(problem));
    }

    return date;
}

/** A problem of the present as one sentence, with how to fix it. */
export function problemText(problem: Problem): string
{
    return problem.fix === undefined ? problem.message : `${problem.message.replace(/\.$/, "")}: ${problem.fix}.`;
}

/** The planned events: those with a game date first, in order of date, then those without one. */
export function plannedEvents(world: World): PlannedEvent[]
{
    const events: PlannedEvent[] = world.pages.filter((page) => isPlannedEvent(page.type, page.fields)).map((page) => ({ page, date: readGameDate(page.fields.date) }));
    const dated = events.filter(isDated).sort((first, second) => minutesBetween(second.date, first.date));
    return [...dated, ...events.filter((event) => !isDated(event))];
}

/** An event is planned when its status says so, or when it has none (D-107). */
export function isPlannedEvent(type: PageType | undefined, fields: Record<string, unknown>): boolean
{
    return type === "event" && (fields.status === "planned" || isEmptyField(fields.status));
}

export function isDated(event: PlannedEvent): event is DatedEvent
{
    return event.date !== undefined;
}

/** "Il rituale (day 2, 23:00, in 1d)" for an event still to come; "Sparizione di Rosa (day 1, 23:00, at Guadoscuro)" once it is due, since where it happens tells who sees it. */
export function eventText(event: PlannedEvent, now: GameDate | undefined): string
{
    const until = now === undefined || event.date === undefined ? undefined : minutesBetween(now, event.date);
    const place = typeof event.page.fields.place === "string" ? parsePageReference(event.page.fields.place).name : undefined;
    const parts = [
        event.date === undefined ? undefined : formatGameDate(event.date),
        until !== undefined && until > 0 ? `in ${formatDuration(until)}` : undefined,
        until !== undefined && until <= 0 && place !== undefined ? `at ${place}` : undefined,
    ].filter((part) => part !== undefined);
    return parts.length === 0 ? event.page.name : `${event.page.name} (${parts.join(", ")})`;
}

/** What to do with due events (D-106): seen or heard, a scene; out of sight, off screen; then their status, or a later date. */
export function dueAdvice(count: number): string
{
    return count === 1
        ? "If the characters see or hear it, play it as a scene; if not, it happens off screen, and they will find its traces. Set its status (happened or cancelled), or give it a later date if the story moves it."
        : "Play as scenes those the characters see or hear; the others happen off screen, and they will find their traces. Set each one's status (happened or cancelled), or give it a later date if the story moves it.";
}

/** A new line for the log, stamped with the game date when the game has one that can be read (D-66). It never fails: validate reports a state.yaml it cannot read. */
export function newDatedLogEntry(root: string, context: Context, type: string, visibility: LogEntry["visibility"], data: Record<string, unknown>): LogEntry
{
    const { date } = readPresent(root);
    return newLogEntry(context, type, visibility, data, date === undefined ? undefined : formatGameDate(date));
}

/** Why the date of a planned event cannot be used: a planned event comes due at its date, so the engine must read it (D-100). Undefined for anything else. */
export function plannedEventDateProblem(type: PageType | undefined, fields: Record<string, unknown>): string | undefined
{
    if (!isPlannedEvent(type, fields) || isEmptyField(fields.date) || readGameDate(fields.date) !== undefined) {
        return undefined;
    }

    return `The date ${JSON.stringify(fields.date)} is not a game date: a planned event needs one the engine can read, such as day 1, 23:00. Words, such as two winters ago, fit only an event that has happened.`;
}

/** The problems of the game time: a state.yaml that cannot give the game date, and planned events whose date cannot be read. */
export function timeProblems(root: string, world: World): Problem[]
{
    const { problem } = readPresent(root);
    const events = world.pages.filter((page) => plannedEventDateProblem(page.type, page.fields) !== undefined).map((page) => ({
        path: page.path,
        message: `${page.name} is planned, but its date ${JSON.stringify(page.fields.date)} is not a game date.`,
        fix: `write ${page.name}, set date to a game date such as day 1, 23:00, or status to happened if it already took place`,
    }));
    return [...(problem === undefined ? [] : [problem]), ...events];
}
