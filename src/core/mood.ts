// The moods of the master and of the characters (MOOD-1, D-305): one closed list for both, since the dashboard draws each; neutral is no mood at all.

/** Every mood, the neutral one first. */
export const moods = ["neutral", "happy", "delighted", "curious", "focused", "determined", "worried", "surprised", "afraid", "sad", "angry", "disgusted", "mischievous"] as const;

export type Mood = (typeof moods)[number];

export function isMood(value: unknown): value is Mood
{
    return typeof value === "string" && (moods as readonly string[]).includes(value);
}

/** The mood a value holds, as a page's field or state.yaml writes it; neutral for anything else. */
export function readMood(value: unknown): Mood
{
    const written = typeof value === "string" ? value.trim().toLowerCase() : value;
    return isMood(written) ? written : "neutral";
}
