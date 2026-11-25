// What answers the master's question (D-279), with no drawing: which of its buttons show, and which checks the sheet or the tray answer by hand (D-330).
// The question over the page and the one in the chat read the same.
import type { Asked } from "../data.ts";
import { trayThrows } from "../dice/pool.ts";
import { checkOf, sameDice } from "../parts/labels.ts";

/** Whether a question asks for a roll: one of its buttons is a check. */
export function asksRoll(asked: Pick<Asked, "labels" | "title">): boolean
{
    return asked.labels.some((label) => checkOf(label, asked.title) !== undefined);
}

/**
 * The buttons of a question that show, by their place: by hand a check has none, as its row of the sheet and the tray's dice answer it, unless neither does;
 * `onlyChecks` leaves the other answers out, as a folded bar with no room for them.
 */
export function shownAnswers(asked: Asked, byHand: boolean, onlyChecks = false): number[]
{
    return asked.labels.flatMap((label, index) => {
        const check = checkOf(label, asked.title) !== undefined;
        return (check && byHand && byHandAnswers(asked, index)) || (onlyChecks && !check) ? [] : [index];
    });
}

/** The checks of a question the sheet or the tray answer by hand, each with the field of the sheet it rolls, which the note names (D-380). */
export function handChecks(asked: Asked): { check: string; dice: string; field: string | null; }[]
{
    return asked.labels.flatMap((label, index) => {
        const check = checkOf(label, asked.title);
        return check !== undefined && byHandAnswers(asked, index) ? [{ ...check, field: asked.fields?.[index] ?? null }] : [];
    });
}

/** Whether a check can be answered by hand: a field of the sheet it alone names, whose row lights, or dice the tray can throw and tells from the other checks'. */
export function byHandAnswers(asked: Asked, index: number): boolean
{
    const field = asked.fields?.[index] ?? null;
    const ownRow = field !== null && asked.fields?.filter((other) => other === field).length === 1;
    const dice = checkOf(asked.labels[index], asked.title)?.dice;
    const ownDice = dice !== undefined && trayThrows(dice) && asked.labels.filter((label) => {
                const other = checkOf(label, asked.title)?.dice;
                return other !== undefined && sameDice(other, dice);
            }).length === 1;
    return ownRow || ownDice;
}
