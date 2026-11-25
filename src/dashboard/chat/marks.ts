// The engine's marks in the master's words (D-585), read with no drawing. The master does not write a roll's numbers again: where the roll decides, in the
// story, they write its mark, [roll <id>], and the page draws the roll there from what the engine told. A mark is square brackets with its word and what
// names its thing; anything else the master puts in brackets is the story's, left as written. One mark for now: another is one more reader here.
import type { ChatMessage } from "../data.ts";

/** A roll's mark: the id of the roll, as the chat's roll has it. */
export interface RollMark
{
    kind: "roll";
    id: string;
}

/** A mark of the engine's in the master's words. */
export type EngineMark = RollMark;

// The marks by their word, each reading what follows the word in the brackets: its mark, or nothing where that is not how its thing is named, and the
// brackets are the story's. A roll is named by its id, the letters and digits of a hexadecimal number.
const readers: Record<string, (named: string) => EngineMark | undefined> = {
    roll: (named) => (/^[0-9a-f]{4,16}$/i.test(named) ? { kind: "roll", id: named.toLowerCase() } : undefined),
};

/**
 * A line of the master's words in pieces: the words as they are, and the engine's marks among them. A mark's word may be in capitals, with any space
 * around it and what it names. A mark still being written at the line's end, as the master's words come, is left out until it closes: the player never
 * sees a mark's own letters.
 */
export function masterMarks(words: string): (string | EngineMark)[]
{
    const parts: (string | EngineMark)[] = [];
    let from = 0;

    // As the table reads it: a colon after the word, and a backslash before each bracket, are a master's own ways of writing the same mark.
    for (const found of words.matchAll(/\\?\[\s*([a-z]+)(?:\s*:\s*|\s+)([^[\]\s\\]+)\s*\\?\]/gi)) {
        const mark = readers[found[1].toLowerCase()]?.(found[2]);

        if (mark !== undefined) {
            if (found.index > from) {
                parts.push(words.slice(from, found.index));
            }

            parts.push(mark);
            from = found.index + found[0].length;
        }
    }

    const rest = words.slice(from).replace(beingWritten, "");

    if (rest !== "") {
        parts.push(rest);
    }

    return parts;
}

/**
 * The rolls of the chat that the master's words tell: those whose mark stands in a message of the master's that comes after them. Their own line goes,
 * as the roll is in the story now; a roll no word of the master's marks keeps its line.
 */
export function rollsTold(messages: readonly ChatMessage[]): Set<string>
{
    const told = new Set<string>();
    const rolled = new Set<string>();

    for (const message of messages) {
        if (message.from === "roll") {
            rolled.add(message.roll.id.toLowerCase());
        } else if (message.from === "master") {
            for (const part of masterMarks(message.text)) {
                if (typeof part !== "string" && part.kind === "roll" && rolled.has(part.id)) {
                    told.add(part.id);
                }
            }
        }
    }

    return told;
}

// A mark not closed yet at the end of the words: an open bracket, then as much of a mark's word, and of what it names, as has come.
const beingWritten = new RegExp(`\\[\\s*(?:${Object.keys(readers).map(startOf).join("|")})?\\s*$`, "i");

/** What matches a word from its first letter to any length of it, and what it names after it: r, ro, rol, roll, roll 3c. */
function startOf(word: string): string
{
    return `${[...word].reduceRight((rest, letter) => `${letter}(?:${rest})?`, "(?:\\s+[^\\[\\]\\s]*)?")}`;
}
