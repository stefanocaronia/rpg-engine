import { type DiceTerm, parseNotation } from "./notation.ts";

/** A part of a notation as the dashboard writes it in words: dice with what they do past rolling, as 2d20 keeping the highest, or a number added, as +5. */
export type NotationPart = ({ dice: string; } & Pick<DiceTerm, "keep" | "drop" | "rerollOnce" | "explode" | "success">) | { add: string; };

/**
 * A notation in parts, for the dashboard to say in words to a player who does not read it (D-292): 2d20kh1+5 is 2d20 keeping the highest, and +5; undefined for
 * a notation that says nothing more than its dice and numbers, as 1d20+2, or that cannot be read.
 */
export function notationParts(notation: string): NotationPart[] | undefined
{
    try {
        const terms = parseNotation(notation);
        const ruled = terms.some((term) => term.kind === "dice" && rules(term).length > 0);
        return ruled
            ? terms.map((term) => (term.kind === "constant" ? { add: `${term.sign < 0 ? "−" : "+"}${term.value}` } : { dice: `${term.sign < 0 ? "−" : ""}${term.count}d${term.sides}`, ...Object.fromEntries(rules(term)) }))
            : undefined;
    } catch {
        return undefined;
    }
}

/** What a term of dice does past rolling them: keep, drop, reroll, explode, count successes. */
function rules(term: DiceTerm): [string, unknown][]
{
    return (["keep", "drop", "rerollOnce", "explode", "success"] as const).flatMap((rule) => (term[rule] === undefined ? [] : [[rule, term[rule]]]));
}
