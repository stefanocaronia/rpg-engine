/** A moment of the story: the day, counted from 1, the first day of the adventure, and the minute of that day when the time is known. */
export interface GameDate
{
    day: number;
    /** Minutes since midnight; undefined for a date given as a day only, such as day 12. */
    minute?: number;
}

const minutesInDay = 24 * 60;

/** The last day a game date can name: days have at most nine digits, so that every sum stays exact. */
export const lastGameDay = 999_999_999;
// "day 3, 06:00" or "day 3"; duration parts have at most nine digits too.
const gameDatePattern = /^day\s+(\d{1,9})(?:\s*,\s*(\d{1,2}):(\d{2}))?$/i;
const durationPattern = /^(?:(\d{1,9})\s*d)?\s*(?:(\d{1,9})\s*h)?\s*(?:(\d{1,9})\s*m)?$/i;

/** The game date a field holds, written as day 3, 06:00 or day 3; undefined for anything else. */
export function readGameDate(value: unknown): GameDate | undefined
{
    const match = typeof value === "string" ? gameDatePattern.exec(value.trim()) : null;

    if (match === null) {
        return undefined;
    }

    const day = Number(match[1]);

    if (day < 1) {
        return undefined;
    }

    if (match[2] === undefined) {
        return { day };
    }

    const hour = Number(match[2]);
    const minute = Number(match[3]);
    return hour < 24 && minute < 60 ? { day, minute: hour * 60 + minute } : undefined;
}

/** A game date as it is written: day 3, 06:00, or day 3 when the time is not known. */
export function formatGameDate(date: GameDate): string
{
    return date.minute === undefined ? `day ${date.day}` : `day ${date.day}, ${twoDigits(Math.floor(date.minute / 60))}:${twoDigits(date.minute % 60)}`;
}

/** A duration in minutes, written with days, hours and minutes in this order, such as 10m, 4h or 1d 6h; undefined for anything else, and for no time at all. */
export function readDuration(text: string): number | undefined
{
    const match = durationPattern.exec(text.trim());

    if (match === null || match.slice(1).every((part) => part === undefined)) {
        return undefined;
    }

    const [days, hours, minutes] = match.slice(1).map((part) => Number(part ?? 0));
    const total = days * minutesInDay + hours * 60 + minutes;
    return total > 0 ? total : undefined;
}

/** A duration as it is written: 1d 6h, 45m; 0m for no time. */
export function formatDuration(minutes: number): string
{
    const parts = [[Math.floor(minutes / minutesInDay), "d"], [Math.floor((minutes % minutesInDay) / 60), "h"], [minutes % 60, "m"]] as const;
    const written = parts.filter(([amount]) => amount > 0).map(([amount, unit]) => `${amount}${unit}`);
    return written.length > 0 ? written.join(" ") : "0m";
}

/** The date after some minutes have passed. It keeps a time of day when the date has one, or when the minutes are not whole days. */
export function addDuration(date: GameDate, minutes: number): GameDate
{
    const total = minutesFromStart(date) + minutes;
    const day = Math.floor(total / minutesInDay) + 1;
    return date.minute === undefined && minutes % minutesInDay === 0 ? { day } : { day, minute: total % minutesInDay };
}

/** How many minutes pass from one date to another; negative when the second comes first. A day without a time counts from its midnight. */
export function minutesBetween(from: GameDate, to: GameDate): number
{
    return minutesFromStart(to) - minutesFromStart(from);
}

function minutesFromStart(date: GameDate): number
{
    return (date.day - 1) * minutesInDay + (date.minute ?? 0);
}

function twoDigits(value: number): string
{
    return String(value).padStart(2, "0");
}
