// The engine's marks in the master's words, drawn (marks.ts reads them): a roll's mark is a pill in the line, with the roll as the engine told it, its
// die, what it is and its total in evidence, the dice one by one in its tooltip and for a screen reader; no token, which is its line's, and no colour of
// success or failure. A clock's mark is a pill with its name and how full it is; the mark of the turns a line of who acts in order, whoever acts now in
// evidence, with the round. A mark the engine gave no data for draws nothing. And the die of a roll, for whoever draws a roll in a line.
import type { ShownRoll, StoryMarks } from "../data.ts";
import { tossWords } from "../parts/faces.tsx";
import { DieIcon, Icon } from "../parts/icons.tsx";
import { drawnDie } from "../parts/labels.ts";
import type { OwnParts } from "../parts/markdown.tsx";
import { capitalized, t } from "../text.ts";
import { rollLine } from "./chat.ts";
import { type EngineMark, masterMarks, samePage } from "./marks.ts";

/** What draws the engine's marks within a line of the master's words, from the chat's rolls by their id and what the message's marks stood for. */
export function marksDrawer(rolls: ReadonlyMap<string, ShownRoll>, marks: StoryMarks | undefined): OwnParts
{
    return (words) => masterMarks(words).map((part) => (typeof part === "string" ? part : { drawn: drawnMark(part, rolls, marks) }));
}

function drawnMark(mark: EngineMark, rolls: ReadonlyMap<string, ShownRoll>, marks: StoryMarks | undefined)
{
    if (mark.kind === "roll") {
        return <RollPill roll={rolls.get(mark.id)} />;
    }

    return mark.kind === "clock" ? <ClockPill clock={marks?.clocks?.find((clock) => samePage(clock.page, mark.page))} /> : <TurnsLine turns={marks?.turns} />;
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

/** A clock on the table where the story moves it, by the name written for the player and how full it is; nothing for a clock the engine gave no data for. */
function ClockPill({ clock }: { clock: NonNullable<StoryMarks["clocks"]>[number] | undefined; })
{
    if (clock === undefined) {
        return null;
    }

    const full = t("{value} of {max}", { value: clock.value, max: clock.max });
    return (
        <span class="chat-mark" title={`${clock.name}: ${full}`}>
            <span aria-hidden="true">{clock.name}</span>
            <b class="chat-mark-total" aria-hidden="true">{`${clock.value}/${clock.max}`}</b>
            <span class="visually-hidden">{`${clock.name}: ${full}`}</span>
        </span>
    );
}

/** The order of the turns where the story tells it, whoever acts now in evidence, and the round; nothing without data. */
function TurnsLine({ turns }: { turns: StoryMarks["turns"]; })
{
    if (turns === undefined) {
        return null;
    }

    return (
        <span class="chat-mark chat-turns" role="group" aria-label={t("The order of the turns")}>
            {turns.round !== undefined && <span>{t("Round {round}", { round: turns.round })}</span>}
            {turns.order.map((name, index) => (
                <span key={index} class={name === turns.turn ? "chat-turns-name now" : "chat-turns-name"} {...(name === turns.turn ? { "aria-current": "step" as const } : {})}>
                    {name}
                </span>
            ))}
        </span>
    );
}
