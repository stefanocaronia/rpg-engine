// Where the moods are kept (MOOD-3, MOOD-4): the master's in state.yaml, a character's on its page, a moment of the master's only in the log.
import { readStateValues } from "../../campaign/index.ts";
import type { LogEntry } from "../../core/log.ts";
import { type Mood, readMood } from "../../core/mood.ts";
import { ownField, type Page } from "../../pages/index.ts";

/** The key of state.yaml that keeps the master's mood. */
export const masterMoodKey = "master-mood";

/** The log's types: a mood that stays, and a moment of the master's, which the dashboard shows for a few seconds. */
export const moodChanged = "mood-changed";
export const moodMoment = "mood-moment";

/** A moment of the master's (MOOD-4): its line of the log, which tells it apart from the one before, the mood, and when, in real time. */
export interface MoodMoment
{
    id: string;
    mood: Mood;
    at: string;
}

/** The master's mood; neutral when state.yaml has none, or one that is not a mood, or cannot be read, which status reports as a problem of its own. */
export function masterMood(root: string): Mood
{
    try {
        return readMood(readStateValues(root)[masterMoodKey]);
    } catch {
        return "neutral";
    }
}

/** A character's own mood, never one of a base (INH-8); neutral when it has none. */
export function pageMood(page: Page): Mood
{
    const field = ownField(page, "mood");
    return field === undefined ? "neutral" : readMood(page.fields[field]);
}

/** A character's mood while alive: the dead have none to show. */
export function livingMood(page: Page): Mood
{
    return page.fields.status === "dead" ? "neutral" : pageMood(page);
}

/** The master's last moment in the log, if any. */
export function lastMoment(entries: LogEntry[]): MoodMoment | undefined
{
    const entry = entries.findLast((line) => line.type === moodMoment);
    return entry === undefined ? undefined : { id: entry.id, mood: readMood(entry.data.mood), at: entry.at };
}
