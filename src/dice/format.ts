import type { Die, RollResult } from "./evaluate.js";

/**
 * One line such as `2d20kh1+5 = 19 [14, (7)] + 5`. Dropped dice are in parentheses,
 * rerolls show `1->6`, compounding explosions `6+3`, successes end with `*`.
 */
export function formatRoll(result: RollResult): string {
  const parts = result.terms.map((part, index) => {
    const sign = part.term.sign < 0 ? "- " : index === 0 ? "" : "+ ";
    if (part.term.kind === "constant") return sign + part.term.value;
    const fudge = part.term.sides === "F";
    return sign + "[" + part.dice.map((die) => formatDie(die, fudge)).join(", ") + "]";
  });
  const counted = result.terms.some((part) => part.term.kind === "dice" && part.term.success);
  return `${result.notation} = ${result.total}${counted ? " successes" : ""} ${parts.join(" ")}`;
}

function formatDie(die: Die, fudge: boolean): string {
  let text = fudge ? fudgeFace(die.value) : die.faces.join("+");
  if (die.rerolledFrom !== undefined) text = `${fudge ? fudgeFace(die.rerolledFrom) : die.rerolledFrom}->${text}`;
  if (die.success) text += "*";
  return die.dropped ? `(${text})` : text;
}

function fudgeFace(value: number): string {
  return value > 0 ? "+" : value < 0 ? "-" : "0";
}
