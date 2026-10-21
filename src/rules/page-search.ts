import { sameWord, searchWords } from "./search.ts";

/** A book as a search reads it: its name, and its pages, or the parts of a document without pages, each with how it is cited. */
export interface SearchedBook
{
    name: string;
    parts: readonly { label: string; text: string; }[];
}

/** A page a search finds (LIB-6): its book, where it is among the book's parts, and how well. */
export interface PageFinding<Book extends SearchedBook = SearchedBook>
{
    book: Book;
    part: number;
    score: number;
}

/** A page's section as an answer shows it (LIB-7): whether it goes on at the next page, and whether it was cut short of its end. */
export interface PageExcerpt
{
    text: string;
    goesOn: boolean;
    cut: boolean;
}

/**
 * The pages a text finds, best first (LIB-6): as BM25 counts them, a word weighing more the fewer pages have it and the more a page repeats it for its length;
 * again for a word in a title of the page, and again for the words in a row. `also` are more searches whose words count as the text's, such as the system's
 * words in the books' language; each is a row of its own. A word that more than half of the pages have finds nothing by itself.
 */
export function findPages<Book extends SearchedBook>(books: Book[], text: string, also: string[] = []): PageFinding<Book>[]
{
    const rows = [text, ...also].map(searchWords).filter((row) => row.length > 0);
    const searched = [...new Set(rows.flat())];
    const indexed = books.map((book) => ({ book, words: wordsOfBook(book) }));
    const pages = indexed.reduce((sum, { words }) => sum + words.lengths.length, 0);
    const written = indexed.flatMap(({ words }) => words.lengths).filter((length) => length > 0);
    const averageLength = written.length === 0 ? 1 : written.reduce((sum, length) => sum + length, 0) / written.length;

    if (searched.length === 0 || pages === 0) {
        return [];
    }

    // For each book, the forms of each word searched that it has (RUL-4), and on which pages, how many times.
    const counts = indexed.map(({ words }) => searched.map((word) => countsOf(words, word)));
    const having = searched.map((_, index) => counts.reduce((sum, book) => sum + book[index].size, 0));
    const weights = having.map((count) => Math.log(1 + (pages - count + 0.5) / (count + 0.5)));
    const telling = having.map((count) => pages < 2 || count <= pages / 2);
    const found: PageFinding<Book>[] = [];

    indexed.forEach(({ book, words }, bookIndex) => {
        const candidates = new Set(counts[bookIndex].flatMap((perPage, index) => (telling[index] ? [...perPage.keys()] : [])));

        for (const part of [...candidates].sort((first, second) => first - second)) {
            const length = words.lengths[part];
            let score = 0;

            searched.forEach((word, index) => {
                const times = counts[bookIndex][index].get(part) ?? 0;
                score += times === 0 ? 0 : (weights[index] * times * (saturation + 1)) / (times + saturation * (1 - lengthWeight + (lengthWeight * length) / averageLength));
                score += weights[index] * titleShare(words.titles[part], searched, word);
            });

            const inRow = rows.filter((row) => row.length > 1 && hasRow(words.sequences[part], row));
            score += Math.max(0, ...inRow.map((row) => row.reduce((sum, word) => sum + weights[searched.indexOf(word)], 0)));
            found.push({ book, part, score });
        }
    });

    return found.sort((first, second) => second.score - first.score || books.indexOf(first.book) - books.indexOf(second.book) || first.part - second.part);
}

/**
 * The section of a page of a book an answer shows (LIB-7): from the title of the page that holds the most words searched, or else from the title above the line
 * that does, to the next title once it has about sixty words, within about `words` words; the line the words are on always in it. It goes on when it reaches
 * the end of the page unfinished.
 */
export function pageExcerpt(book: SearchedBook, part: number, search: string, also: string[], words: number): PageExcerpt
{
    const { lines, headings, hits, titled } = pageLines(book, part, search, also);
    const bestOf = (indexes: number[]): number | undefined => indexes.filter((index) => hits[index] > 0).sort((first, second) => hits[second] - hits[first] || first - second)[0];
    const best = titled ?? bestOf(lines.map((_, index) => index)) ?? 0;
    let start = titled ?? headingAbove(headings, best) ?? Math.max(0, best - 2);

    // A title too far above leaves the words out: the excerpt starts just before them.
    if (wordCount(lines.slice(start, best + 1).join(" ")) > words * 0.6) {
        start = Math.max(0, best - 2);
    }

    const shown: string[] = [];
    let used = 0;
    let index = start;
    let cut = false;

    for (; index < lines.length; index++) {
        const size = wordCount(lines[index]);

        if (index > start && headings[index] && used >= fewestWords) {
            break;
        }

        // A line longer than what is left, as a paragraph of a document without pages, is cut at its words.
        if (used + size > words) {
            shown.push(lines[index].split(/\s+/).filter((word) => word !== "").slice(0, Math.max(0, words - used)).join(" "));
            cut = true;
            break;
        }

        shown.push(lines[index]);
        used += size;
    }

    return { text: `${shown.join("\n").trim()}${cut ? " …" : ""}`, goesOn: !cut && index >= lines.length, cut };
}

/** The title of a page found that names what was searched, as an answer lists the pages it does not show; undefined when none of its titles does. */
export function pageTitle(book: SearchedBook, part: number, search: string, also: string[]): string | undefined
{
    const { lines, titled } = pageLines(book, part, search, also);
    return titled === undefined ? undefined : lines[titled].trim().replace(/^#+\s*/, "");
}

/**
 * A page's lines, which are its titles, how many words searched each holds, and the title that holds the most of them. Words of two letters count only when the
 * search has no longer ones, so that "di" never makes a title.
 */
function pageLines(book: SearchedBook, part: number, search: string, also: string[]): { lines: string[]; headings: boolean[]; hits: number[]; titled?: number; }
{
    const lines = book.parts[part].text.split("\n");
    const all = [...new Set([search, ...also].flatMap(searchWords))];
    const searched = all.some((word) => word.length > 2) ? all.filter((word) => word.length > 2) : all;
    const hits = lines.map((line) => {
        const own = searchWords(line);
        return searched.filter((word) => own.some((form) => sameWord(word, form))).length;
    });
    const headings = titleLines(lines, wordsOfBook(book).running);
    const titled = lines.flatMap((_, index) => (headings[index] && hits[index] > 0 ? [index] : [])).sort((first, second) => hits[second] - hits[first] || first - second)[0];
    return { lines, headings, hits, ...(titled === undefined ? {} : { titled }) };
}

// BM25's own: how soon a word repeated stops adding, and how much a page's length counts.
const saturation = 1.2;
const lengthWeight = 0.75;
// The longest line that can be a title, in letters and in words, and the fewest letters it has; the fewest words a section shows before the next title ends
// it, so that a creature's block or a spell keeps its parts.
const longestTitle = 60;
const mostTitleWords = 6;
const fewestTitleLetters = 4;
const fewestWords = 60;
// A line on this many pages of a book or more, and on one in fifty, is the page's running head, never a title.
const runningPages = 3;
const runningShare = 0.02;
// How far above a line its title may be.
const titleDistance = 15;

/** A book's words, page by page: how many times each, how many in all, those of each of its titles, and all in order; and the lines its pages repeat. */
interface BookWords
{
    pagesOf: Map<string, Map<number, number>>;
    lengths: number[];
    titles: string[][][];
    sequences: string[][];
    running: Set<string>;
}

// Cut once for each book's parts, which never change: the MCP server keeps a book read (LIB-3).
const wordsByBook = new WeakMap<object, BookWords>();

function wordsOfBook(book: SearchedBook): BookWords
{
    let words = wordsByBook.get(book.parts);

    if (words === undefined) {
        const pagesOf = new Map<string, Map<number, number>>();
        const sequences = book.parts.map((part) => searchWords(part.text));
        sequences.forEach((sequence, part) => {
            for (const word of sequence) {
                const pages = pagesOf.get(word) ?? new Map<number, number>();
                pages.set(part, (pages.get(part) ?? 0) + 1);
                pagesOf.set(word, pages);
            }
        });
        const running = runningLines(book);
        const titles = book.parts.map((part) => {
            const lines = part.text.split("\n");
            const headings = titleLines(lines, running);
            return lines.filter((_, index) => headings[index]).map(searchWords);
        });
        words = { pagesOf, lengths: sequences.map((sequence) => sequence.length), titles, sequences, running };
        wordsByBook.set(book.parts, words);
    }

    return words;
}

/**
 * Which lines of a page are its titles: a markdown heading, or a short line almost all in capitals, as printed books set them; never a page's running head, a
 * column of short words as FOR DEX CON, or the first line of a paragraph set in capitals, which a line in small letters goes on from.
 */
function titleLines(lines: string[], running: Set<string>): boolean[]
{
    return lines.map((line, index) => {
        const trimmed = line.trim();

        if (/^#{1,6}\s/.test(trimmed)) {
            return true;
        }

        const cased = trimmed.match(/[\p{Lu}\p{Ll}]/gu)?.length ?? 0;
        const capitals = trimmed.match(/\p{Lu}/gu)?.length ?? 0;
        const short = trimmed.length <= longestTitle && trimmed.split(/\s+/).length <= mostTitleWords;
        const goesOn = /^\s*\p{Ll}/u.test(lines[index + 1] ?? "");
        return short && cased >= 3 && capitals >= cased * 0.7 && new RegExp(`\\p{L}{${fewestTitleLetters}}`, "u").test(trimmed) && !goesOn && !running.has(lineKey(trimmed));
    });
}

/**
 * How much of a page's best title a word searched brings (LIB-6): nothing when no title of the page has it; else the share of that title's words the search
 * has, so that CADUTE weighs more than CADUTA MORBIDA for "caduta".
 */
function titleShare(titles: string[][], searched: string[], word: string): number
{
    const shares = titles.filter((title) => title.some((form) => sameWord(word, form)))
        .map((title) => title.filter((form) => searched.some((one) => sameWord(one, form))).length / title.length);
    return Math.max(0, ...shares);
}

/** The lines a book repeats on many of its pages, as its running heads: by their words, without their numbers. */
function runningLines(book: SearchedBook): Set<string>
{
    const pagesWith = new Map<string, number>();

    for (const part of book.parts) {
        for (const key of new Set(part.text.split("\n").map(lineKey).filter((key) => key !== ""))) {
            pagesWith.set(key, (pagesWith.get(key) ?? 0) + 1);
        }
    }

    const least = Math.max(runningPages, book.parts.length * runningShare);
    return new Set([...pagesWith].filter(([, count]) => count >= least).map(([key]) => key));
}

/** A line as the same running head on every page: its words, without the numbers of the page or chapter. */
function lineKey(line: string): string
{
    return searchWords(line).filter((word) => !/^\d+$/.test(word)).join(" ");
}

/** On which pages of a book the forms of a word are, and how many times. */
function countsOf(words: BookWords, searched: string): Map<number, number>
{
    const counts = new Map<number, number>();

    for (const [word, pages] of words.pagesOf) {
        if (sameWord(searched, word)) {
            for (const [part, times] of pages) {
                counts.set(part, (counts.get(part) ?? 0) + times);
            }
        }
    }

    return counts;
}

/** Whether a page has the words of a row one after another, each in one of its forms. */
function hasRow(sequence: string[], row: string[]): boolean
{
    for (let start = 0; start + row.length <= sequence.length; start++) {
        if (row.every((word, offset) => sameWord(word, sequence[start + offset]))) {
            return true;
        }
    }

    return false;
}

function headingAbove(headings: boolean[], line: number): number | undefined
{
    for (let index = line; index >= Math.max(0, line - titleDistance); index--) {
        if (headings[index]) {
            return index;
        }
    }

    return undefined;
}

function wordCount(text: string): number
{
    return text.split(/\s+/).filter((word) => word !== "").length;
}
