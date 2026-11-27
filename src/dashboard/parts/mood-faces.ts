// The faces of the moods for the party's badges (D-305): the robot's faces in a few lines each, on a grid of 24.
import type { Mood } from "../data.ts";

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
    curious: { lines: "M7.4 8.2q1.6-.9 3.2.2 M13.4 7.4q1.7-1.6 3.4-.4 M8.6 16h6.8", dots: "M9 11.2v.7 M15 11.2v.7" },
    focused: { lines: "M7.4 9.7h3.2 M13.4 9.7h3.2 M9 15.6h6" },
    determined: { lines: "M7.6 7.6l2.8 1 M16.4 7.6l-2.8 1 M8.6 16h5.4q1 0 1.6-.9", dots: eyes },
    worried: { lines: "M7.6 8.2l2.8-1.2 M16.4 8.2l-2.8-1.2 M8.4 16.2q1.8-1.3 3.6 0t3.6 0", dots: eyes },
    surprised: { lines: "M8 7.6q1-.8 2 0 M14 7.6q1-.8 2 0 M12 13.6a1.8 2.2 0 1 0 0 4.4a1.8 2.2 0 1 0 0-4.4Z", dots: eyes },
    afraid: { lines: "M7.6 8.2l2.8-1.6 M16.4 8.2l-2.8-1.6 M8.6 16.4l1.7-1 1.7 1 1.7-1 1.7 1", dots: eyes },
    sad: { lines: "M7.6 8.8l2.8-1.4 M16.4 8.8l-2.8-1.4 M8.2 17.4q3.8-3.6 7.6 0", dots: "M9 11h.01 M15 11h.01" },
    angry: { lines: "M7.4 7.2l3 1.8 M16.6 7.2l-3 1.8 M8.4 17.2q3.6-2.6 7.2 0", dots: "M9 11h.01 M15 11h.01" },
    disgusted: { lines: "M7.4 10l3 .7 M16.6 10l-3 .7 M8 16.2q2-1.6 4 0t4 0" },
    mischievous: { lines: "M13.6 10.5h2.8 M8.4 15q3.8 3.4 7.6-.8", dots: "M9 10.5h.01" },
};
