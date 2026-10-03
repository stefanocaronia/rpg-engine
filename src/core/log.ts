import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "./context.ts";
import type { Problem } from "./problem.ts";

/** One line of the campaign's log: something that changed in the game. */
export interface LogEntry
{
    id: string;
    /** Real time, ISO 8601. */
    at: string;
    /** The game date, such as day 2, 14:10, once the game has one. */
    date?: string;
    type: string;
    /** Who acted: the master, the player or a companion. */
    by: string;
    /** Public lines are what the player may see; hidden ones are for the master only. */
    visibility: "public" | "hidden";
    data: Record<string, unknown>;
}

const logFileName = "log.jsonl";

/** A new line for the log, stamped with a new id, the real time, the game date when there is one, and who acts. */
export function newLogEntry(context: Context, type: string, visibility: LogEntry["visibility"], data: Record<string, unknown>, date?: string): LogEntry
{
    return { id: context.newId(), at: context.now().toISOString(), date, type, by: context.actor, visibility, data };
}

export function appendLogEntry(folder: string, entry: LogEntry): void
{
    appendFileSync(join(folder, logFileName), JSON.stringify(entry) + "\n", "utf8");
}

/** The entries of the log; lines that are not entries, such as lines edited by hand, are left out: checkLog reports them. */
export function readLog(folder: string): LogEntry[]
{
    return logLines(folder).filter((line) => line.trim() !== "" && entryProblem(line) === undefined).map((line) => JSON.parse(line) as LogEntry);
}

/** The lines of the log that are not log entries, such as lines edited by hand. */
export function checkLog(folder: string): Problem[]
{
    return logLines(folder).flatMap((line, index) => {
        const problem = line.trim() === "" ? undefined : entryProblem(line);
        return problem === undefined ? [] : [{ path: logFileName, message: `line ${index + 1} ${problem}.`, fix: "repair or remove that line by hand" }];
    });
}

function logLines(folder: string): string[]
{
    const logPath = join(folder, logFileName);
    return existsSync(logPath) ? readFileSync(logPath, "utf8").split("\n") : [];
}

function entryProblem(line: string): string | undefined
{
    try {
        const entry = JSON.parse(line) as Partial<LogEntry>;
        const hasData = typeof entry.data === "object" && entry.data !== null && !Array.isArray(entry.data);
        return typeof entry.id === "string" && typeof entry.type === "string" && typeof entry.at === "string" && hasData ? undefined : "is not an entry: it needs id, at, type and data";
    } catch {
        return "is not valid JSON";
    }
}
