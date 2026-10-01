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

const LOG_FILE = "events.jsonl";

export function appendEvent(dir: string, event: GameEvent): void {
  appendFileSync(join(dir, LOG_FILE), JSON.stringify(event) + "\n", "utf8");
}

export function readEvents(dir: string): GameEvent[] {
  const path = join(dir, LOG_FILE);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as GameEvent);
}
