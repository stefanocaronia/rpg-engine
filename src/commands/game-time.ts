// The game time as several commands use it: the present date from state.yaml, and the log lines stamped with it.
import { readState } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { type LogEntry, newLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { isEmptyField } from "../pages/index.ts";
import { formatGameDate, type GameDate, readGameDate } from "../time/index.ts";

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

/** The problems of the game time: a state.yaml that cannot give the game date. The planned events have their own (eventProblems). */
export function timeProblems(root: string): Problem[]
{
    const { problem } = readPresent(root);
    return problem === undefined ? [] : [problem];
}
