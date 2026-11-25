// The engine's marks in the master's words, drawn (marks.ts reads them): a roll's mark is a pill in the line, with the roll as the engine told it, its
// die, what it is and its total in evidence, the dice one by one in its tooltip and for a screen reader; no token, which is its line's, and no colour of
// success or failure. A mark whose roll the chat does not have draws nothing. And the die of a roll, for whoever draws a roll in a line.
import type { ShownRoll } from "../data.ts";
import { tossWords } from "../parts/faces.tsx";
import { DieIcon, Icon } from "../parts/icons.tsx";
import { drawnDie } from "../parts/labels.ts";
import type { OwnParts } from "../parts/markdown.tsx";
import { capitalized } from "../text.ts";
import { rollLine } from "./chat.ts";
import { masterMarks } from "./marks.ts";

/** What draws the engine's marks within a line of the master's words, from the chat's rolls by their id. */
export function marksDrawer(rolls: ReadonlyMap<string, ShownRoll>): OwnParts
{
    return (words) => masterMarks(words).map((part) => (typeof part === "string" ? part : { drawn: <RollPill roll={rolls.get(part.id)} /> }));
}

/** The first die of a notation as a picture, as the d6 of 2d6+1; the page's die for one it does not draw, or with none. */
export function FirstDie({ notation }: { notation: string; })
{
    const kind = /d(\d+|%|F)/i.exec(notation)?.[1];
    const sides = kind === undefined ? undefined : kind === "%" ? 100 : kind.toUpperCase() === "F" ? "F" : Number(kind);
    return sides === undefined || drawnDie(sides) === undefined ? <Icon name="dice" /> : <DieIcon sides={sides} />;
}

/** A roll where the story tells it; nothing for a roll the chat does not have. */
function RollPill({ roll }: { roll: ShownRoll | undefined; })
{
    if (roll === undefined) {
        return null;
    }

    // What it is alone: the story around it says whose.
    const line = rollLine(roll, "", roll.toss === undefined ? undefined : capitalized(tossWords(roll.toss)));
    return (
        <span class="chat-mark" title={line.detail}>
            {roll.toss === undefined && <FirstDie notation={roll.notation} />}
            {line.what !== "" && <span>{line.what}</span>}
            <b class="chat-mark-total">{line.result}</b>
            <span class="visually-hidden">{line.detail}</span>
        </span>
    );
}
