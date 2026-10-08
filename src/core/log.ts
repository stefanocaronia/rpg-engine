import { join } from "node:path";
import type { Context } from "./context.ts";
import type { Problem } from "./problem.ts";
import { files } from "./store.ts";

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

/** The log of a campaign, at its top. */
export const logFileName = "log.jsonl";

/** A new line for the log, stamped with a new id, the real time, the game date when there is one, and who acts. */
export function newLogEntry(context: Context, type: string, visibility: LogEntry["visibility"], data: Record<string, unknown>, date?: string): LogEntry
{
    return { id: context.newId(), at: context.now().toISOString(), date, type, by: context.actor, visibility, data };
}

export function appendLogEntry(folder: string, entry: LogEntry): void
{
    files().append(join(folder, logFileName), logLine(entry));
}

/** An entry as the log writes it: one line of JSON. */
export function logLine(entry: LogEntry): string
{
    return JSON.stringify(entry) + "\n";
}

/** The entries of the log; lines that are not entries, such as lines edited by hand, are left out: checkLog reports them. */
export function readLog(folder: string): LogEntry[]
{
    return logLines(folder).flatMap((read) => (read !== undefined && "entry" in read ? [read.entry] : []));
}

/** The lines of the log that are not log entries, such as lines edited by hand. */
export function checkLog(folder: string): Problem[]
{
    return logLines(folder).flatMap((read, index) => read === undefined || "entry" in read ? [] : [{ path: logFileName, message: `line ${index + 1} ${read.problem}.`, fix: "repair or remove that line by hand" }]);
}

/** Each line of the log, read once in a call: its entry, what keeps it from being one, or nothing for an empty line. */
function logLines(folder: string): ({ entry: LogEntry; } | { problem: string; } | undefined)[]
{
    return files().read(join(folder, logFileName), "log", (text) => text.split("\n").map((line) => (line.trim() === "" ? undefined : readEntry(line)))) ?? [];
}

/** A line of the log read once: the entry, or what keeps it from being one. */
function readEntry(line: string): { entry: LogEntry; } | { problem: string; }
{
    try {
        const entry = JSON.parse(line) as Partial<LogEntry>;
        const hasData = typeof entry.data === "object" && entry.data !== null && !Array.isArray(entry.data);
        return typeof entry.id === "string" && typeof entry.type === "string" && typeof entry.at === "string" && hasData ? { entry: entry as LogEntry } : { problem: "is not an entry: it needs id, at, type and data" };
    } catch {
        return { problem: "is not valid JSON" };
    }
}
