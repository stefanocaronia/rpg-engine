// The moods on the party's tokens (D-305): a small disc like the robot's screen, with the face of the mood drawn in lines; the neutral face and the dead show none.
import type { Mood } from "./data.ts";
import { moodFaces } from "./mood-faces.ts";
import { t } from "./text.ts";

/** A mood's face, in lines on a grid of 24, cropped to the face. */
export function MoodFace({ mood }: { mood: Mood; })
{
    const face = moodFaces[mood];
    return (
        // The face's part of the grid, so that it fills the disc.
        <svg class="mood-face" viewBox="3.5 3 17 17" aria-hidden="true">
            <path d={face.lines} />
            {face.dots !== undefined && <path class="mood-eyes" d={face.dots} />}
        </svg>
    );
}

/** The badge of someone's mood, with its name in a tooltip; nothing for the neutral face or for no mood. `large` goes with a large token. */
export function MoodBadge({ mood, large }: { mood?: Mood; large?: boolean; })
{
    return mood === undefined || mood === "neutral" ? null : (
        <span class={large ? "mood-badge large tip-left" : "mood-badge tip-left"} data-tip={moodLabel(mood)}>
            <MoodFace key={mood} mood={mood} />
        </span>
    );
}

/** A mood's name in the page's language, as a noun where the language marks gender on its adjectives. */
export function moodLabel(mood: Mood): string
{
    const labels: Record<Mood, string> = {
        neutral: t("neutral"),
        happy: t("happy"),
        delighted: t("delighted"),
        curious: t("curious"),
        focused: t("focused"),
        determined: t("determined"),
        worried: t("worried"),
        surprised: t("surprised"),
        afraid: t("afraid"),
        sad: t("sad"),
        angry: t("angry"),
        disgusted: t("disgusted"),
        mischievous: t("mischievous"),
    };
    return labels[mood];
}
