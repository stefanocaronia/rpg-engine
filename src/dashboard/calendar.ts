// The calendar of the World section (TIM-8): which day of the calendar a game day is, the months around today, and what each day holds. A calendar has months
// alone, each with its days and maybe a season: no weeks, so the days are drawn in rows of ten, or five on a phone, never seven.
import type { ShownCalendar } from "./data.ts";

/** A month of the calendar, counted from today's: its place in the months, its name, days and season, its year when the story has one, and its first game day. */
export interface CalendarMonth
{
    offset: number;
    month: number;
    name: string;
    days: number;
    season?: string;
    year?: number;
    first: number;
}

/** A day of the calendar: the day of its month, the month by its place, its name and season, the year when the story has one. */
export interface CalendarDate
{
    day: number;
    month: number;
    name: string;
    season?: string;
    year?: number;
}

/** What a game day holds: whether it is today or the story has passed it, the scenes that opened on it, the deadlines that fall on it. */
export interface DayMarks
{
    today: boolean;
    lived: boolean;
    scenes: ShownCalendar["scenes"];
    deadlines: ShownCalendar["deadlines"];
}

/** The month `offset` months from today's, with its first game day; none without a calendar start. */
export function monthAt(calendar: ShownCalendar, offset: number): CalendarMonth | undefined
{
    const { months, date, today } = calendar;

    if (months === undefined || months.length === 0 || date === undefined || today === undefined) {
        return undefined;
    }

    let month = date.month;
    let year = date.year;
    let first = today - (date.day - 1);

    for (let step = 0; step < offset; step++) {
        first += months[month].days;
        [month, year] = month === months.length - 1 ? [0, year === undefined ? undefined : year + 1] : [month + 1, year];
    }

    for (let step = 0; step > offset; step--) {
        [month, year] = month === 0 ? [months.length - 1, year === undefined ? undefined : year - 1] : [month - 1, year];
        first -= months[month].days;
    }

    const { name, days, season } = months[month];
    return { offset, month, name, days, ...(season === undefined ? {} : { season }), ...(year === undefined ? {} : { year }), first };
}

/** How many months from today's the month of a game day is; 0 without a calendar start. */
export function monthOffsetOf(calendar: ShownCalendar, gameDay: number): number
{
    let offset = 0;
    let month = monthAt(calendar, offset);

    while (month !== undefined && gameDay < month.first) {
        offset -= 1;
        month = monthAt(calendar, offset);
    }

    while (month !== undefined && gameDay >= month.first + month.days) {
        offset += 1;
        month = monthAt(calendar, offset);
    }

    return month === undefined ? 0 : offset;
}

/** The day of the calendar a game day is: from today's, counting the months' days, the first month again after the last and the year one more. */
export function calendarDateOf(calendar: ShownCalendar, gameDay: number): CalendarDate | undefined
{
    const month = monthAt(calendar, monthOffsetOf(calendar, gameDay));
    return month === undefined
        ? undefined
        : { day: gameDay - month.first + 1, month: month.month, name: month.name, ...(month.season === undefined ? {} : { season: month.season }), ...(month.year === undefined ? {} : { year: month.year }) };
}

/** What a game day holds. */
export function dayMarks(calendar: ShownCalendar, gameDay: number): DayMarks
{
    const today = calendar.today ?? 1;
    return {
        today: gameDay === calendar.today,
        lived: gameDay >= 1 && gameDay <= today,
        scenes: calendar.scenes.filter((scene) => scene.day === gameDay),
        deadlines: calendar.deadlines.filter((deadline) => deadline.day === gameDay),
    };
}

/** The game days a story without a calendar draws: from day 1 to the last that holds something, today included, in whole rows. */
export function storyDays(calendar: ShownCalendar, row: number): number[]
{
    const last = Math.max(calendar.today ?? 1, ...calendar.deadlines.map((deadline) => deadline.day), ...calendar.scenes.map((scene) => scene.day));
    return Array.from({ length: Math.ceil(last / row) * row }, (_, index) => index + 1);
}
