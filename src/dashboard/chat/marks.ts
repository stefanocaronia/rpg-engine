// What the master writes in plain square brackets among the story's words, told by its shape, with no drawing: a roll, as [Sprint 2d6: 5 (4+1)], a
// clock, as [Escape 1/4], or any other note, as the order of the turns. Masters write them each their own way: a dice notation makes a roll, a count
// of steps a clock, whatever stands around them. A roll is taken in round brackets too, as (d6: 1, needed 4). Never words out of the game, which are
// told before (ooc.ts), nor a link's brackets.

/** A roll the master wrote: its words whole, and in parts where they have them, what it is, its dice, its total and what follows. */
export interface RollMark
{
    kind: "roll";
    text: string;
    label: string;
    notation: string;
    total?: string;
    rest: string;
}

/** A clock the master wrote: its words whole, what it counts, how many of its steps are done, and what follows. */
export interface ClockMark
{
    kind: "clock";
    text: string;
    label: string;
    filled: number;
    steps: number;
    rest: string;
}

/** Anything else the master wrote in brackets. */
export interface NoteMark
{
    kind: "note";
    text: string;
}

export type MasterMark = RollMark | ClockMark | NoteMark;

// A dice notation, as 2d6, d20+5, 1d20 - 1, d%, 4dF; and a count of steps, as 1/4, never a date nor a part of a longer number.
const notation = /(?<![\p{L}\d])\d*d(?:\d+|%|F)(?:\s*[+\-−]\s*\d+)*(?![\p{L}\d])/iu;
const count = /(?<![\d/.,])(\d{1,3})\s*\/\s*(\d{1,3})(?![\d/.,])/;
// What a pair of brackets holds at most to be a mark: longer, it is a sentence of the story in brackets, left as written.
const mostMark = 80;

/**
 * A line of the master's words in pieces: the words as they are, and the marks they hold. A mark is a pair of square brackets on one line, not empty
 * nor a single character, as a checkbox's, nor too long, that is no link, [words](address) or [[Page]], nor a picture's, nor comes after a backslash.
 */
export function masterMarks(words: string): (string | MasterMark)[]
{
    const parts: (string | MasterMark)[] = [];
    let from = 0;

    for (const found of words.matchAll(/\[([^[\]\n]*)\]|\(([^()[\]\n]*)\)/g)) {
        const at = found.index;
        const round = found[1] === undefined;
        const inside = (found[1] ?? found[2]).trim();
        const next = words[at + found[0].length];
        const link = round ? words[at - 1] === "]" : next === "(" || next === "]" || words[at - 1] === "[";
        const escaped = words[at - 1] === "\\" || words[at - 1] === "!";

        // Round brackets are a mark only around dice: a roll some masters write in a sentence's own parentheses, as (d6: 1, needed 4).
        if (link || escaped || inside.length < 2 || inside.length > mostMark || (round && !notation.test(inside))) {
            continue;
        }

        if (at > from) {
            parts.push(words.slice(from, at));
        }

        parts.push(...marksOf(inside));
        from = at + found[0].length;
    }

    if (from < words.length) {
        parts.push(words.slice(from));
    }

    return parts;
}

/** What the words in a pair of brackets are, by their shape: a roll where they hold a dice notation, a clock where they count steps, else a note. */
export function markOf(text: string): MasterMark
{
    const dice = notation.exec(text);

    if (dice !== null) {
        const after = text.slice(dice.index + dice[0].length);
        // The total, where it follows the dice after a sign that gives it, as : 5, = 5 or → 5.
        const total = /^\s*(?:[:=→]|->|=>)\s*([+\-−]?\d+)/.exec(after);
        return {
            kind: "roll",
            text,
            label: before(text, dice.index),
            notation: dice[0].replace(/\s+/g, ""),
            ...(total === null ? {} : { total: total[1] }),
            rest: (total === null ? after : after.slice(total[0].length)).trim(),
        };
    }

    const steps = count.exec(text);

    if (steps !== null && Number(steps[2]) > 0 && Number(steps[1]) <= Number(steps[2])) {
        return { kind: "clock", text, label: before(text, steps.index), filled: Number(steps[1]), steps: Number(steps[2]), rest: text.slice(steps.index + steps[0].length).trim() };
    }

    return { kind: "note", text };
}

/** The marks a pair of brackets holds: its clocks one by one where it lists several, as [Escape 2/3 · Chase 0/4]; else the one mark it is. */
function marksOf(text: string): MasterMark[]
{
    const listed = text.split(/\s+[·•|]\s+/).map(markOf);
    return listed.length > 1 && listed.every((mark) => mark.kind === "clock") ? listed : [markOf(text)];
}

/** What stands before the dice or the count, without the sign that leads to them. */
function before(text: string, at: number): string
{
    return text.slice(0, at).replace(/[\s:=–—-]+$/, "").trim();
}
