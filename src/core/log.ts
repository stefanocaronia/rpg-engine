import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "./context.ts";

/** One line of the campaign's log: something that changed in the game. */
export interface LogEntry
{
    id: string;
    /** Real time, ISO 8601. */
    at: string;
    type: string;
    /** Who acted: the master, the player or a companion. */
    by: string;
    /** Public lines are what the player may see; hidden ones are for the master only. */
    visibility: "public" | "hidden";
    data: Record<string, unknown>;
}

const logFileName = "log.jsonl";

/** A new line for the log, stamped with a new id, the real time and who acts. */
export function newLogEntry(context: Context, type: string, visibility: LogEntry["visibility"], data: Record<string, unknown>): LogEntry
{
    return { id: context.newId(), at: context.now().toISOString(), type, by: context.actor, visibility, data };
}

export function appendLogEntry(folder: string, entry: LogEntry): void
{
    appendFileSync(join(folder, logFileName), JSON.stringify(entry) + "\n", "utf8");
}

export function readLog(folder: string): LogEntry[]
{
    const logPath = join(folder, logFileName);

    if (!existsSync(logPath)) {
        return [];
    }

    return readFileSync(logPath, "utf8")
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => JSON.parse(line) as LogEntry);
}
