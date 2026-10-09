import { type Condition, type DiceTerm, parseNotation } from "./notation.ts";

/**
 * A notation in words, for a player who does not read it: 2d20kh1+5 is "2d20, keep the highest, +5"; undefined for a notation that says nothing more than its
 * dice and numbers, as 1d20+2, or that cannot be read.
 */
export function notationWords(notation: string): string | undefined
{
    try {
        const terms = parseNotation(notation);
        const ruled = terms.some((term) => term.kind === "dice" && diceRules(term).length > 0);
        return ruled ? terms.map((term) => (term.kind === "constant" ? `${term.sign < 0 ? "−" : "+"}${term.value}` : [`${term.sign < 0 ? "−" : ""}${term.count}d${term.sides}`, ...diceRules(term)].join(", "))).join(", ") : undefined;
    } catch {
        return undefined;
    }
}

/** What a term of dice does past rolling them: keep, drop, reroll, explode, count successes. */
function diceRules(term: DiceTerm): string[]
{
    const which = (rule: { which: "highest" | "lowest"; count: number; }): string => (rule.count === 1 ? `the ${rule.which}` : `the ${rule.count} ${rule.which}`);
    return [
        term.keep === undefined ? undefined : `keep ${which(term.keep)}`,
        term.drop === undefined ? undefined : `drop ${which(term.drop)}`,
        term.rerollOnce === undefined ? undefined : `reroll once ${conditionWords(term.rerollOnce)}`,
        term.explode === undefined ? undefined : `${term.explode.compound ? "add a die to the die" : "roll one more"} ${conditionWords(term.explode.condition)}`,
        term.success === undefined ? undefined : `count the dice ${conditionWords(term.success)}`,
    ].filter((rule) => rule !== undefined);
}

function conditionWords(condition: Condition): string
{
    const { operator, value } = condition;
    return operator === "=" ? `on ${value}` : operator === "<=" ? `on ${value} or less` : operator === ">=" ? `on ${value} or more` : operator === "<" ? `below ${value}` : `above ${value}`;
}
