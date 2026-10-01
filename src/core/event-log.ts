import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** One line of the campaign's event log. */
export interface GameEvent {
    id: string;
    /** Real time, ISO 8601. */
    at: string;
    type: string;
    visibility: "public" | "hidden";
    data: Record<string, unknown>;
}

const logFileName = "events.jsonl";

export function appendEvent(folder: string, event: GameEvent): void {
    appendFileSync(join(folder, logFileName), JSON.stringify(event) + "\n", "utf8");
}

export function readEvents(folder: string): GameEvent[] {
    const logPath = join(folder, logFileName);
    if (!existsSync(logPath)) {
        return [];
    }
    return readFileSync(logPath, "utf8")
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => JSON.parse(line) as GameEvent);
}
