// The words out of the game in the chat with the master, told from the story's: the master writes them as *[OOC: like this]*, the player as [OOC: like this]
// or in plain brackets, [like this]. Here they are found in a message's text, with no drawing: the chat draws them apart, without their brackets.

/** A run of a message: words of the story, or words out of the game, without their brackets and their mark. */
export interface ChatRun
{
    ooc: boolean;
    text: string;
}

/**
 * A block of the master's message: the story's text, as markdown reads it; a paragraph that is out of the game whole; or a paragraph with words out of the
 * game among the story's, as its runs.
 */
export type MasterBlock = { kind: "text"; text: string; } | { kind: "ooc"; text: string; } | { kind: "mixed"; runs: ChatRun[]; };

/** Words out of the game found in a text: from where to where, their brackets and the emphasis around them included, and the words themselves. */
interface Found
{
    start: number;
    end: number;
    text: string;
}

// The mark the master's and the player's off-game words begin with, which the chat does not show.
const mark = /^\s*OOC\s*:\s*/i;

/**
 * The master's message in blocks: its paragraphs out of the game apart, those that hold some words out of the game as runs, and all the rest as the text
 * it was, whole, so that what markdown reads over several paragraphs, as a list or a fenced block, stays together.
 */
export function masterBlocks(text: string): MasterBlock[]
{
    const found = offGame(text, "master");

    if (found.length === 0) {
        return [{ kind: "text", text }];
    }

    const blocks: MasterBlock[] = [];

    for (const [start, end] of paragraphs(text)) {
        const inside = found.filter((one) => one.start >= start && one.end <= end);
        const paragraph = text.slice(start, end);
        const last = blocks.at(-1);

        if (inside.length === 0) {
            // The story goes on from the paragraph before: one text, as it was written.
            if (last?.kind === "text") {
                last.text = `${last.text}\n\n${paragraph}`;
            } else {
                blocks.push({ kind: "text", text: paragraph });
            }
        } else if (inside.length === 1 && text.slice(start, inside[0].start).trim() === "" && text.slice(inside[0].end, end).trim() === "") {
            blocks.push({ kind: "ooc", text: inside[0].text });
        } else {
            blocks.push({ kind: "mixed", runs: runsOf(text, start, end, inside) });
        }
    }

    return blocks;
}

/** The player's message as runs, the words out of the game apart; `whole` when all of it is out of the game. */
export function playerRuns(text: string): { runs: ChatRun[]; whole: boolean; }
{
    const runs = runsOf(text, 0, text.length, offGame(text, "player"));
    return { runs, whole: runs.length > 0 && runs.every((run) => run.ooc) };
}

/** A stretch of a text as runs: the words between those out of the game, as written, and those out of the game; a run of nothing but space between two is left out. */
function runsOf(text: string, start: number, end: number, found: Found[]): ChatRun[]
{
    const runs: ChatRun[] = [];
    let at = start;

    for (const one of found) {
        runs.push({ ooc: false, text: text.slice(at, one.start) }, { ooc: true, text: one.text });
        at = one.end;
    }

    runs.push({ ooc: false, text: text.slice(at, end) });
    return runs.filter((run) => run.ooc || run.text.trim() !== "");
}

/**
 * The words out of the game of a text. They stand in square brackets that close, others inside them counted; the master's begin with OOC:, the player's
 * may be plain. Never brackets of a link, [words](address) or [[Page]], of a picture, in code, inline or fenced, or after a backslash; nor across a blank
 * line. The emphasis right around them, as the master's italics, goes with them. Those marked OOC: that never close run to their paragraph's end.
 */
function offGame(text: string, by: "master" | "player"): Found[]
{
    const found: Found[] = [];
    let at = 0;
    let lineStart = true;
    let fenced = false;

    while (at < text.length) {
        const character = text[at];

        // A fenced block opens and closes on a line that starts with three backticks: nothing in it is words.
        if (lineStart && /^[ \t]*```/.test(text.slice(at, at + 12))) {
            fenced = !fenced;
        }

        lineStart = character === "\n";

        if (fenced) {
            at++;
        } else if (character === "\\") {
            at += 2;
        } else if (character === "`") {
            at = afterCode(text, at);
        } else if (character === "[") {
            const one = bracketsAt(text, at, by);

            if (one.found !== undefined) {
                found.push(one.found);
            }

            at = one.next;
        } else {
            at++;
        }
    }

    return found;
}

/** What the square brackets that open at `open` are: words out of the game, or not, and where the reading goes on. */
function bracketsAt(text: string, open: number, by: "master" | "player"): { found?: Found; next: number; }
{
    // A link to a page, [[Page]]: read past its end, or past its opening where it never closes.
    if (text[open + 1] === "[") {
        const closes = text.indexOf("]]", open + 2);
        return { next: closes < 0 ? open + 2 : closes + 2 };
    }

    const close = closingOf(text, open);

    if (close === undefined) {
        return neverClosed(text, open);
    }

    // A link, [words](address), and a picture, ![words](address): read past its address.
    if (text[close + 1] === "(" || text[open - 1] === "!") {
        const address = text[close + 1] === "(" ? text.indexOf(")", close + 1) : -1;
        return { next: address < 0 || text.slice(close + 1, address).includes("\n") ? close + 1 : address + 1 };
    }

    const inside = text.slice(open + 1, close);
    const words = inside.replace(mark, "").trim();

    if (words === "" || (by === "master" && !mark.test(inside))) {
        return { next: close + 1 };
    }

    // The same emphasis right before and right after, as the master's italics: not words. At the text's end, what closes it may not be written yet.
    let around = 0;

    while (around < emphasisBefore(text, open) && (text[close + around + 1] === text[open - 1] || close + around + 1 >= text.length)) {
        around++;
    }

    const end = Math.min(text.length, close + around + 1);
    return { found: { start: open - around, end, text: words }, next: end };
}

/**
 * Brackets that never close. Marked with OOC:, as while the master still writes them, their words are out of the game to the end of their paragraph, so
 * that the mark never shows and then goes; plain ones are the story's.
 */
function neverClosed(text: string, open: number): { found?: Found; next: number; }
{
    const rest = text.slice(open + 1);
    const blank = rest.search(/\n[ \t]*\n/);
    const inside = (blank < 0 ? rest : rest.slice(0, blank)).trimEnd();
    const words = inside.replace(mark, "").trim();

    if (!mark.test(inside) || words === "") {
        return { next: open + 1 };
    }

    const end = open + 1 + inside.length;
    return { found: { start: open - emphasisBefore(text, open), end, text: words }, next: end };
}

/** How many marks of one emphasis, three at most, stand right before the brackets that open at `open`. */
function emphasisBefore(text: string, open: number): number
{
    const sign = text[open - 1];
    let count = 0;

    while (count < 3 && (sign === "*" || sign === "_") && text[open - count - 1] === sign) {
        count++;
    }

    return count;
}

/** Where the brackets that open at `open` close, those opened inside them counted; nowhere when they never do, or not before a blank line. */
function closingOf(text: string, open: number): number | undefined
{
    let depth = 0;

    for (let at = open; at < text.length; at++) {
        if (text[at] === "\\") {
            at++;
        } else if (text[at] === "[") {
            depth++;
        } else if (text[at] === "]") {
            depth--;

            if (depth === 0) {
                return at;
            }
        } else if (text[at] === "\n" && /^[ \t]*\n/.test(text.slice(at + 1))) {
            return undefined;
        }
    }

    return undefined;
}

/** Past a stretch of inline code that opens at `open`, with as many backticks as open it, on its line; past its backticks alone when it never closes. */
function afterCode(text: string, open: number): number
{
    const ticks = /^`+/.exec(text.slice(open))?.[0] ?? "`";
    const line = text.indexOf("\n", open);
    const close = text.indexOf(ticks, open + ticks.length);
    return close < 0 || (line >= 0 && close > line) ? open + ticks.length : close + ticks.length;
}

/** The paragraphs of a text, each from where to where: lines with no blank line between them; a fenced block is one, whatever blank lines it holds. */
function paragraphs(text: string): [number, number][]
{
    const found: [number, number][] = [];
    let start: number | undefined;
    let end = 0;
    let fenced = false;
    let at = 0;

    for (const line of text.split("\n")) {
        if (/^[ \t]*```/.test(line)) {
            fenced = !fenced;
        }

        if (line.trim() === "" && !fenced) {
            if (start !== undefined) {
                found.push([start, end]);
                start = undefined;
            }
        } else {
            start ??= at;
            end = at + line.length;
        }

        at += line.length + 1;
    }

    if (start !== undefined) {
        found.push([start, end]);
    }

    return found;
}
