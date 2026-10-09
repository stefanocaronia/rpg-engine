// The faces of the moods for the party's badges (D-305): the robot's faces in a few lines each, on a grid of 24.
import type { Mood } from "./data.ts";

/** A face on a grid of 24: its lines, and its dots, the eyes, drawn bolder. */
export interface Face
{
    lines: string;
    dots?: string;
}

const eyes = "M9 10.5h.01 M15 10.5h.01";

export const moodFaces: Record<Mood, Face> = {
    neutral: { lines: "M10 15.5h4", dots: eyes },
    happy: { lines: "M8.8 14.6q3.2 3.2 6.4 0", dots: eyes },
    delighted: { lines: "M7.6 11.2q1.4-2.4 2.8 0 M13.6 11.2q1.4-2.4 2.8 0 M9 14.2h6q0 3.6-3 3.6t-3-3.6Z" },
    curious: { lines: "M10.6 15.5h2.8 M13.8 6.6l2.6-1", dots: eyes },
    focused: { lines: "M7.6 10.5h2.8 M13.6 10.5h2.8 M10 15.5h4" },
    determined: { lines: "M7.2 7.2l3.2 1 M16.8 7.2l-3.2 1 M9.6 16.2q2.8-.2 5-1.4", dots: eyes },
    worried: { lines: "M7.6 7.6l2.8-1 M16.4 7.6l-2.8-1 M10.6 15.6h2.8", dots: eyes },
    surprised: { lines: "M12 13.8a1.6 1.9 0 1 0 0 3.8a1.6 1.9 0 1 0 0-3.8Z", dots: eyes },
    afraid: { lines: "M7.2 8l3.2-1.8 M16.8 8l-3.2-1.8 M8.6 16.4l1.7-1 1.7 1 1.7-1 1.7 1", dots: eyes },
    sad: { lines: "M7.6 11.2q1.4-2.4 2.8 0 M13.6 11.2q1.4-2.4 2.8 0 M9.4 16.6q2.6-2.6 5.2 0" },
    angry: { lines: "M7 6.6l3.4 2 M17 6.6l-3.4 2 M9 16.8q3-2.8 6 0", dots: eyes },
    disgusted: { lines: "M7.6 10h2.8a1.4 1.4 0 0 1-2.8 0Z M13.6 10h2.8a1.4 1.4 0 0 1-2.8 0Z M7.8 7.4h2.8 M13.8 6.8l2.6-1 M8.8 16.4q1.6-1.8 3.2-.6t3.2-1.2" },
    mischievous: { lines: "M13.6 10.5h2.8 M8.8 14.6q3.2 3.4 6.6-.6", dots: "M9 10.5h.01" },
};
