// The moods of the party (D-305): the face of the mood drawn in lines, before its word in the band of the sheet alone (D-419); the neutral face and the dead show none.
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
