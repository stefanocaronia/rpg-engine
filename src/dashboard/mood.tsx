// The moods on the party's tokens (D-305): a small disc like the robot's screen, with the face of the mood drawn in lines; the neutral face and the dead show none.
import type { Mood } from "./data.ts";
import { moodFaces } from "./mood-faces.ts";

/** A mood's face, in lines on a grid of 24. */
export function MoodFace({ mood }: { mood: Mood; })
{
    const face = moodFaces[mood];
    return (
        <svg class="mood-face" viewBox="0 0 24 24" aria-hidden="true">
            <path d={face.lines} />
            {face.dots !== undefined && <path class="mood-eyes" d={face.dots} />}
        </svg>
    );
}

/** The badge of someone's mood, with its name in a tooltip; nothing for the neutral face or for no mood. `large` goes with a large token. */
export function MoodBadge({ mood, large }: { mood?: Mood; large?: boolean; })
{
    return mood === undefined || mood === "neutral" ? null : (
        <span class={large ? "mood-badge large tip-left" : "mood-badge tip-left"} data-tip={mood}>
            <MoodFace key={mood} mood={mood} />
        </span>
    );
}
