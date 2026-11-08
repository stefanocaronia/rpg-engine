// The game time as several commands use it: the present date from state.yaml, the log lines stamped with it, and the calendar that shows it.
import { resolve } from "node:path";
import { campaignFileName, readOneSetting, readState, readTextSetting } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { type LogEntry, newLogEntry, readLog } from "../../core/log.ts";
import type { Problem } from "../../core/problem.ts";
import { files } from "../../core/store.ts";
import { isEmptyField } from "../../pages/index.ts";
import {
    type Calendar,
    type CalendarDay,
    calendarDay,
    type CalendarStart,
    formatCalendarDay,
    formatDuration,
    formatGameDate,
    type GameDate,
    lastGameDay,
    minutesBetween,
    readBetweenSessions,
    readCalendar,
    readCalendarStart,
    readGameDate,
    realCalendar,
} from "../../time/index.ts";
import { campaignExtensions, extensionSources } from "./packages/extensions.ts";

// The setting of the game time between sessions (D-133).
const betweenSessionsSetting = "between-sessions";

/** The campaign's calendar and the day of it that is day 1, if the story starts on one (TIM-8); what does not read is a problem, never a stop. */
export interface CampaignCalendar
{
    calendar: Calendar;
    start?: CalendarStart;
    problems: Problem[];
}

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

/** A new line for the log, stamped with the game date when the game has one that can be read (D-66). It never fails: validate reports a state.yaml it cannot read. */
export function newDatedLogEntry(root: string, context: Context, type: string, visibility: LogEntry["visibility"], data: Record<string, unknown>): LogEntry
{
    const { date } = readPresent(root);
    return newLogEntry(context, type, visibility, data, date === undefined ? undefined : formatGameDate(date));
}

/** The problems of the game time: a state.yaml that cannot give the game date, a calendar or its start that do not read. The planned events have their own (eventProblems). */
export function timeProblems(root: string, context: Context): Problem[]
{
    const { problem } = readPresent(root);
    return [...(problem === undefined ? [] : [problem]), ...campaignCalendar(root, context).problems, ...betweenSessionsProblems(root)];
}

/**
 * The game time to let pass before a new session (D-133): when at least an hour of real time has passed since the last move and the game time runs between
 * sessions, the real time gone, the game time it makes and how to let it pass; nothing when the game time stops between sessions, the default. A move is the
 * master's: a page changed by hand or the player's change on the dashboard between sessions is none.
 */
export function timeBetweenSessions(root: string, context: Context, now: GameDate): string | undefined
{
    const written = readTextSetting(root, betweenSessionsSetting);
    const rate = written === undefined ? undefined : readBetweenSessions(written);
    const last = readLog(root).findLast((entry) => entry.by !== "outside" && entry.by !== "player");
    const realMinutes = last === undefined ? 0 : Math.floor((context.now().getTime() - Date.parse(last.at)) / 60_000);

    if (rate === undefined || rate === "stops" || !(realMinutes >= 60)) {
        return undefined;
    }

    // No further than the last day the game counts, which advance would refuse.
    const gameMinutes = Math.min(Math.floor((realMinutes / rate.real) * rate.game), minutesBetween(now, { day: lastGameDay }));
    return gameMinutes < 1 ? undefined : `${formatDuration(realMinutes)} of real time since the last move, and between sessions the game time runs `
        + `${formatDuration(rate.game)} per ${formatDuration(rate.real)}: if this is a new session, call advance by ${formatDuration(gameMinutes)} before you open it, `
        + "and let the opening tell what the world did meanwhile.";
}

/** The campaign's calendar (TIM-8): campaign.yaml's, else an extension's, else the core's real months; and its start. Read once until campaign.yaml changes. */
export function campaignCalendar(root: string, context: Context): CampaignCalendar
{
    return files().remember(`calendar ${resolve(root)}`, extensionSources(root, context), () => readCampaignCalendar(root, context));
}

/** The day of the calendar that a game day falls on; undefined without a calendar or its start. */
export function calendarDayOf(root: string, context: Context, gameDay: number): CalendarDay | undefined
{
    const { calendar, start } = campaignCalendar(root, context);
    return start === undefined ? undefined : calendarDay(calendar, start, gameDay);
}

/** A game date with its day of the calendar, as outputs write it: day 15, 07:00 (15 April, spring); the date alone when the story counts only the days. */
export function datedText(root: string, context: Context, date: GameDate): string
{
    const day = calendarDayOf(root, context, date.day);
    return day === undefined ? formatGameDate(date) : `${formatGameDate(date)} (${formatCalendarDay(day)})`;
}

/** A between-sessions setting that does not read as stops or a rate: the game time stops between sessions until it is fixed. */
function betweenSessionsProblems(root: string): Problem[]
{
    const written = readTextSetting(root, betweenSessionsSetting);
    return written === undefined || readBetweenSessions(written) !== undefined
        ? []
        : [{
            path: campaignFileName,
            message: `between-sessions: "${written}" is neither stops nor a rate of game time to real time, so the game time stops between sessions.`,
            fix: "set it with config between-sessions, such as 1d per 7d, or stops",
        }];
}

function readCampaignCalendar(root: string, context: Context): CampaignCalendar
{
    const problem = (error: unknown, fix: string): Problem => ({ path: campaignFileName, message: error instanceof Error ? error.message : String(error), fix });
    const { calendar: brought, problems } = extensionsCalendar(root, context);
    let written: unknown;

    try {
        written = readOneSetting(root, "calendar");
    } catch {
        // A campaign.yaml that does not read is checkSettings' problem.
        return { calendar: brought, problems };
    }

    let calendar = brought;

    try {
        calendar = isEmptyField(written) ? brought : readCalendar(written);
    } catch (error) {
        return { calendar, problems: [...problems, problem(error, "fix calendar in campaign.yaml by hand, or take it away with config calendar none")] };
    }

    const startText = readTextSetting(root, "calendar-start");

    if (startText === undefined) {
        return { calendar, problems };
    }

    try {
        return { calendar, start: readCalendarStart(startText, calendar), problems };
    } catch (error) {
        return { calendar, problems: [...problems, problem(error, "set it again with config calendar-start")] };
    }
}

/** The calendar of the campaign's extensions, the last listed that brings one winning over the core's real months (TIM-8); two that bring one are a problem. */
function extensionsCalendar(root: string, context: Context): { calendar: Calendar; problems: Problem[]; }
{
    const bringing = campaignExtensions(root, context).extensions.filter((extension) => extension.calendar !== undefined);
    const problems: Problem[] = [];
    let calendar = realCalendar;

    for (const extension of bringing) {
        try {
            calendar = readCalendar(extension.calendar);
        } catch (error) {
            const why = error instanceof Error ? error.message : String(error);
            problems.push({ path: campaignFileName, message: `The extension ${extension.name} brings a calendar that does not read: ${why}`, fix: `install it again with package install ${extension.name}` });
        }
    }

    if (bringing.length > 1) {
        const names = bringing.map((extension) => extension.name);
        problems.push({
            path: campaignFileName,
            message: `The extensions ${names.join(", ")} each bring a calendar: the last, ${names.at(-1) ?? ""}, holds.`,
            fix: "take away one of them with package remove, or write the campaign's own calendar with config calendar",
        });
    }

    return { calendar, problems };
}
