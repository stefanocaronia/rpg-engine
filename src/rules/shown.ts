import { wordCount } from "../core/text.ts";
import type { RuleSection } from "./rule-book.ts";
import type { RuleFinding } from "./search.ts";

/** A section as an answer shows it: whole, or, when it is too long, its own text with the titles of its parts. */
export interface ShownRule
{
    section: RuleSection;
    text: string;
    /** The titles of its parts when only its own text is shown, so that they can be asked for; none when it is whole. */
    parts: string[];
}

// Sections shown whole when the text names none of them; the others are only named.
const wholeFound = 3;

/**
 * What an answer shows of what a search found (RUL-6), within about `words` words: the sections the text names, or else the best ones, up to three
 * and at least half as good as the first; each whole while it fits, never twice the same text, the first always, cut to its own text when it is too long alone.
 * The others are only named, best first; `used` is how many words the shown ones take.
 */
export function shownRules(found: RuleFinding[], words: number): { shown: ShownRule[]; others: RuleSection[]; used: number; }
{
    const anyNamed = found.some((finding) => finding.titled);
    const best = found.find((finding) => !finding.titled)?.score ?? 0;
    const shown: ShownRule[] = [];
    const others: RuleSection[] = [];
    let used = 0;

    for (const { section, titled, score } of found) {
        if (shown.some((entry) => entry.parts.length === 0 && holds(entry.section, section))) {
            continue;
        }

        const size = wordCount(section.text);
        const candidate = anyNamed ? titled : shown.length < wholeFound && score >= best / 2;

        if (!candidate || shown.some((entry) => holds(section, entry.section))) {
            others.push(section);
        } else if (used + size <= words) {
            shown.push({ section, text: section.text, parts: [] });
            used += size;
        } else if (shown.length === 0) {
            shown.push({ section, text: section.ownText, parts: section.parts });
            used += wordCount(section.ownText);
        } else {
            others.push(section);
        }
    }

    return { shown, others, used };
}

/** Whether a section holds another one among its parts, or is it. */
function holds(outer: RuleSection, inner: RuleSection): boolean
{
    return outer.source === inner.source && outer.file === inner.file && outer.path.length <= inner.path.length && outer.path.every((title, index) => inner.path[index] === title)
        && outer.text.includes(inner.text);
}
