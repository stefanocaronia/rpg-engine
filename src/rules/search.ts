import { comparableText } from "../core/text.ts";
import type { RuleSection } from "./rule-book.ts";

/** A section that a search finds: named by the text, or holding its words, with how well. */
export interface RuleFinding
{
    section: RuleSection;
    /** The text names it: its title, or titles of its path. */
    titled: boolean;
    /** How much of the search it holds, the rarest words weighing most and counting twice in its title. */
    score: number;
}

/**
 * The sections that a text finds, best first (RUL-3, RUL-5): those it names, then those with its words, the rarest words weighing most, in the title most of all.
 * After sections it names, the others are found by the words of its last title alone: "Combat › Grappling" looks for grappling.
 */
export function findRules(sections: RuleSection[], text: string): RuleFinding[]
{
    const titled = sections.filter((section) => isTitled(section, text));
    const searched = [...new Set(searchWords(titled.length > 0 ? (titlesIn(text).at(-1) ?? "") : text))];
    const named = titled.map((section) => ({ section, titled: true, score: Infinity }));

    if (searched.length === 0) {
        return named;
    }

    const indexed = sections.map((section, index) => ({ section, index, ...wordsOf(section) }));
    const having = searched.map((word) => indexed.filter((entry) => [entry.title, entry.above, entry.text].some((words) => hasForm(words, word))).length);
    // A word weighs more the fewer sections have it, and never nothing, so that a book of one section is found too.
    const weights = having.map((count) => 1 + Math.log((sections.length + 1) / (count + 1)));
    // A word that more than half of the sections have, such as "in" or "a", finds nothing by itself.
    const telling = searched.filter((_, index) => sections.length < 2 || having[index] <= sections.length / 2);
    const scored = indexed
        .filter((entry) => !titled.includes(entry.section) && telling.some((word) => [entry.title, entry.above, entry.text].some((words) => hasForm(words, word))))
        .map((entry) => ({ entry, score: scoreOf(entry, searched, weights) }));
    scored.sort((first, second) => second.score - first.score || titleLength(first.entry.section) - titleLength(second.entry.section) || first.entry.index - second.entry.index);
    return [...named, ...scored.map(({ entry, score }) => ({ section: entry.section, titled: false, score }))];
}

/**
 * Whether a section is the one a text names: its title, or titles of its path ending with its own, as in "Combat › Grappling"; a translated section by the
 * path it has in its book's own language too (D-542).
 */
export function isTitled(section: RuleSection, text: string): boolean
{
    return pathTitled(section.path, text) || (section.alias !== undefined && pathTitled(section.alias, text));
}

function pathTitled(sectionPath: string[], text: string): boolean
{
    const titles = titlesIn(text).map(comparableText);
    const path = sectionPath.map(comparableText);

    if (titles.length === 0 || titles.at(-1) !== path.at(-1)) {
        return false;
    }

    let position = 0;

    for (const title of titles.slice(0, -1)) {
        position = path.indexOf(title, position);

        if (position < 0 || position >= path.length - 1) {
            return false;
        }

        position++;
    }

    return true;
}

/** Whether a text holds every word of a search, as search compares words: what finds a precedent. */
export function hasAllWords(text: string, search: string): boolean
{
    const words = searchWords(text);
    return searchWords(search).every((searched) => hasForm(words, searched));
}

/** The words of a text as a search compares them: letters and digits, in any case and however accents are written. */
export function searchWords(text: string): string[]
{
    return comparableText(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Whether a word of a text is a form of a word searched (RUL-4): the two differ at most in their last three letters, and share at least the first four, or all of a shorter word.
 * Grapple finds grappled and grappling, rest finds resting but not restrained, concentration not conceal; two letters find only themselves.
 */
export function sameWord(searched: string, word: string): boolean
{
    if (searched.length <= 2) {
        return word === searched;
    }

    let common = 0;

    while (common < searched.length && common < word.length && searched[common] === word[common]) {
        common++;
    }

    // A form may double the last letter the two share, as swim and swimming do.
    const doubledInWord = common > 0 && word[common] === word[common - 1] ? 1 : 0;
    const doubledInSearched = common > 0 && searched[common] === searched[common - 1] ? 1 : 0;
    return word.length - common <= formLetters + doubledInWord && common >= Math.max(Math.min(searched.length, stemLetters), searched.length - formLetters - doubledInSearched);
}

/** The titles a text gives, as in "Combat › Grappling" (› > or / between them), without the stop that may end one. */
function titlesIn(text: string): string[]
{
    return text.split(/\s*[›>/]\s*/).map((title) => title.trim().replace(/[.:]$/, "")).filter((title) => title !== "");
}

/** The words of a section's title, of the titles above it and of its own text, each once: cut once for each section, which never changes (D-194). */
function wordsOf(section: RuleSection): { title: string[]; above: string[]; text: string[]; }
{
    let words = wordsBySection.get(section);

    if (words === undefined) {
        const distinct = (text: string): string[] => [...new Set(searchWords(text))];
        words = { title: distinct(section.path.at(-1) ?? ""), above: distinct(section.path.slice(0, -1).join(" ")), text: distinct(section.ownText) };
        wordsBySection.set(section, words);
    }

    return words;
}

const wordsBySection = new WeakMap<RuleSection, { title: string[]; above: string[]; text: string[]; }>();

// A form of a word may change this many of its last letters, and must keep at least the first four (all of a shorter word).
const formLetters = 3;

const stemLetters = 4;

function hasForm(words: string[], searched: string): boolean
{
    return words.some((word) => sameWord(searched, word));
}

/** How much of a search a section holds: the weight of each word it has, and again for each word in its title (half for the titles above it). */
function scoreOf(entry: { title: string[]; above: string[]; text: string[]; }, searched: string[], weights: number[]): number
{
    let score = 0;

    for (const [index, word] of searched.entries()) {
        const title = hasForm(entry.title, word), above = hasForm(entry.above, word);
        const found = title || above || hasForm(entry.text, word);
        score += (found ? weights[index] : 0) + (title ? weights[index] : above ? weights[index] / 2 : 0);
    }

    return score;
}

function titleLength(section: RuleSection): number
{
    return (section.path.at(-1) ?? "").length;
}
