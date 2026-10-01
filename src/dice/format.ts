import type { Die, RollBreakdown } from "./evaluate.js";

/** One line such as `2d20kh1+5 = 19 [14, (7)] + 5`: dropped dice in parentheses, rerolls `1->6`, successes `8*`. */
export function formatRoll(notation: string, breakdown: RollBreakdown): string {
    const termTexts = breakdown.terms.map((termResult, index) => {
        const sign = termResult.term.sign < 0 ? "- " : index === 0 ? "" : "+ ";
        if (termResult.term.kind === "constant") {
            return sign + termResult.term.value;
        }
        const isFudge = termResult.term.sides === "F";
        return sign + "[" + termResult.dice.map((die) => formatDie(die, isFudge)).join(", ") + "]";
    });
    const countsSuccesses = breakdown.terms.some((termResult) => termResult.term.kind === "dice" && termResult.term.success);
    return `${notation} = ${breakdown.total}${countsSuccesses ? " successes" : ""} ${termTexts.join(" ")}`;
}

function formatDie(die: Die, isFudge: boolean): string {
    let dieText = isFudge ? fudgeSymbol(die.value) : die.faces.join("+");
    if (die.rerolledFrom !== undefined) {
        dieText = `${isFudge ? fudgeSymbol(die.rerolledFrom) : die.rerolledFrom}->${dieText}`;
    }
    if (die.success) {
        dieText += "*";
    }
    return die.dropped ? `(${dieText})` : dieText;
}

function fudgeSymbol(value: number): string {
    return value > 0 ? "+" : value < 0 ? "-" : "0";
}
