import { z } from "zod";
import { comparableText } from "../core/text.ts";

/** A month of a calendar: its name, how many days it has, and the season it falls in, when the calendar says (TIM-8). */
export interface CalendarMonth
{
    name: string;
    days: number;
    season?: string;
}

/** The months of a game's calendar, in order (TIM-8): what shows a game date as a day of a month. */
export interface Calendar
{
    months: CalendarMonth[];
}

/** The day 1 of the story in a calendar: the day of a month, the month by its place in the calendar, and the year when one is given (TIM-8). */
export interface CalendarStart
{
    day: number;
    month: number;
    year?: number;
}

/** A day of a calendar: the day of its month, the month, its season, and the year when the start gave one. */
export interface CalendarDay
{
    day: number;
    month: string;
    season?: string;
    year?: number;
}

/** The core's calendar (D-437): the twelve real months, with the seasons of the northern hemisphere. */
export const realCalendar: Calendar = {
    months: ([
        ["January", 31, "winter"],
        ["February", 28, "winter"],
        ["March", 31, "spring"],
        ["April", 30, "spring"],
        ["May", 31, "spring"],
        ["June", 30, "summer"],
        ["July", 31, "summer"],
        ["August", 31, "summer"],
        ["September", 30, "autumn"],
        ["October", 31, "autumn"],
        ["November", 30, "autumn"],
        ["December", 31, "winter"],
    ] as const).map(([name, days, season]) => ({ name, days, season })),
};

const calendarExample = "months: [{name: January, days: 31, season: winter}, {name: February, days: 28, season: winter}, ...]";

const calendarSchema = z.object({
    months: z.array(z.object({ name: z.string().trim().min(1), days: z.int().min(1).max(10_000), season: z.string().trim().min(1).optional() }).strict()).min(1),
}).strict();

// "14 April" or "14 April 1491": the day, the month's name, which may hold spaces, and the year.
const startPattern = /^(\d{1,5})\s+(.*?)(?:\s+(-?\d{1,6}))?$/;

/** The calendar as a system, an extension or campaign.yaml writes it; it throws what is wrong, with how to write it. */
export function readCalendar(value: unknown): Calendar
{
    const parsed = calendarSchema.safeParse(value);

    if (!parsed.success) {
        throw new Error(`The calendar does not read: ${z.prettifyError(parsed.error).replace(/\s+/g, " ")}. Write it as ${calendarExample}.`);
    }

    const names = parsed.data.months.map((month) => comparableText(month.name));
    const twice = parsed.data.months.find((_, index) => names.indexOf(names[index]) !== index);

    if (twice !== undefined) {
        throw new Error(`The calendar names the month ${twice.name} twice: give each month a name of its own.`);
    }

    return parsed.data;
}

/**
 * When the story starts: day 1, undefined, when only the days are counted; else the day of the calendar that is day 1, written as 14 April or 14 April 1491, with
 * a month of the calendar in any case. It throws what is wrong, with what it takes.
 */
export function readCalendarStart(text: string, calendar: Calendar): CalendarStart | undefined
{
    if (/^day\s+1$/i.test(text.trim())) {
        return undefined;
    }

    const match = startPattern.exec(text.trim().replace(/\s+/g, " "));
    const monthNamed = (name: string): number => calendar.months.findIndex((candidate) => comparableText(candidate.name) === comparableText(name));
    // A month named with a number, as Month 3, takes the number when no month has the name without it: then the year is not given.
    const numbered = match !== null && match[3] !== undefined && monthNamed(match[2]) === -1 && monthNamed(`${match[2]} ${match[3]}`) !== -1;
    const month = match === null ? -1 : numbered ? monthNamed(`${match[2]} ${match[3]}`) : monthNamed(match[2]);
    const names = calendar.months.map((candidate) => candidate.name).join(", ");

    if (match === null || match[2] === "") {
        const first = calendar.months[0].name;
        throw new Error(`"${text}" is not when the story starts: write day 1 to count the days, or a day of the calendar, the year if wanted, such as 14 ${first} or 14 ${first} 1491.`);
    }

    if (month === -1) {
        throw new Error(`The calendar has no month "${match[2]}": its months are ${names}.`);
    }

    const day = Number(match[1]);
    const { name, days } = calendar.months[month];

    if (day < 1 || day > days) {
        throw new Error(`${name} has days 1 to ${days}, not ${day}: give a day it has.`);
    }

    return match[3] === undefined || numbered ? { day, month } : { day, month, year: Number(match[3]) };
}

/** The day of the calendar that a game day falls on, counting from the start as day 1; after the last month the first comes again, a year later. */
export function calendarDay(calendar: Calendar, start: CalendarStart, gameDay: number): CalendarDay
{
    const { months } = calendar;
    const yearDays = months.reduce((total, month) => total + month.days, 0);
    const beforeStart = months.slice(0, start.month).reduce((total, month) => total + month.days, 0) + start.day - 1;
    const sinceYearStart = beforeStart + gameDay - 1;
    let left = sinceYearStart % yearDays;
    let index = 0;

    while (left >= months[index].days) {
        left -= months[index].days;
        index += 1;
    }

    const month = months[index];
    const year = start.year === undefined ? {} : { year: start.year + Math.floor(sinceYearStart / yearDays) };
    return { day: left + 1, month: month.name, ...(month.season === undefined ? {} : { season: month.season }), ...year };
}

/** A day of the calendar as it is written: 15 April, spring; 15 April 1491, spring; 15 April when the month has no season. */
export function formatCalendarDay(date: CalendarDay): string
{
    const day = `${date.day} ${date.month}${date.year === undefined ? "" : ` ${date.year}`}`;
    return date.season === undefined ? day : `${day}, ${date.season}`;
}
