// What the master writes in plain square brackets among the story's words, drawn (marks.ts tells them): a pill in the line, in the page's fixed-width
// letters. A roll has its die before it, what it is, its dice and its total in evidence; a clock has the clock's picture, and its steps as dots, done
// and to do, when they are few; anything else is a plain pill. And the die of a roll, for whoever draws a roll in a line.
import { DieIcon, Icon } from "../parts/icons.tsx";
import { drawnDie } from "../parts/labels.ts";
import type { OwnParts } from "../parts/markdown.tsx";
import { type MasterMark, masterMarks } from "./marks.ts";

// How many steps a clock shows as dots: more, its count alone says them.
const mostDots = 8;

/** The master's marks within a line of their words, for the text that reads the line. */
export const drawMarks: OwnParts = (words) => masterMarks(words).map((part) => (typeof part === "string" ? part : { drawn: <Mark mark={part} /> }));

/** The first die of a notation as a picture, as the d6 of 2d6+1; the page's die for one it does not draw, or with none. */
export function FirstDie({ notation }: { notation: string; })
{
    const kind = /d(\d+|%|F)/i.exec(notation)?.[1];
    const sides = kind === undefined ? undefined : kind === "%" ? 100 : kind.toUpperCase() === "F" ? "F" : Number(kind);
    return sides === undefined || drawnDie(sides) === undefined ? <Icon name="dice" /> : <DieIcon sides={sides} />;
}

function Mark({ mark }: { mark: MasterMark; })
{
    if (mark.kind === "roll") {
        return (
            <span class="chat-mark roll">
                <FirstDie notation={mark.notation} />
                {mark.label !== "" && <span>{mark.label}</span>}
                <span class="chat-mark-dice">{mark.notation}</span>
                {mark.total !== undefined && <b class="chat-mark-total">{mark.total}</b>}
                {mark.rest !== "" && <span class="chat-mark-rest">{mark.rest}</span>}
            </span>
        );
    }

    if (mark.kind === "clock") {
        return (
            <span class="chat-mark clock">
                <Icon name="clock" />
                {mark.label !== "" && <span>{mark.label}</span>}
                {mark.steps <= mostDots && (
                    <span class="chat-mark-steps" aria-hidden="true">
                        {Array.from({ length: mark.steps }, (_, step) => <i key={step} class={step < mark.filled ? "done" : undefined} />)}
                    </span>
                )}
                <span class="chat-mark-count">{`${mark.filled}/${mark.steps}`}</span>
                {mark.rest !== "" && <span class="chat-mark-rest">{mark.rest}</span>}
            </span>
        );
    }

    return <span class="chat-mark">{mark.text}</span>;
}
