/** A comparison against a die face, such as `>=8` or `=1`. */
export interface Condition {
    operator: "=" | "<" | "<=" | ">" | ">=";
    value: number;
}

export interface DiceTerm {
    kind: "dice";
    sign: 1 | -1;
    count: number;
    /** Number of faces, or "F" for Fudge dice (-1, 0, +1). */
    sides: number | "F";
    /** Reroll a die once when it matches (`ro<=2`). */
    rerollOnce?: Condition;
    /** Roll an extra die when a die matches (`!`), or add it to the same die (`!!`). */
    explode?: { condition: Condition; compound: boolean };
    keep?: { which: "highest" | "lowest"; count: number };
    drop?: { which: "highest" | "lowest"; count: number };
    /** Count the dice that match instead of adding them up (`>=8`). */
    success?: Condition;
}

export interface ConstantTerm {
    kind: "constant";
    sign: 1 | -1;
    value: number;
}

export type Term = DiceTerm | ConstantTerm;

/** A dice error the user or the AI can fix: its message says how. */
export class DiceError extends Error {}

const maxTerms = 20;
const maxDice = 100;
const maxSides = 1000;
const conditionPattern = /^(<=|>=|<|>|=)(\d+)/;

/** Reads a notation valid for any game, such as `1d20+5`, `2d20kh1`, `4d6dl1`, `2d6ro<=2`, `1d6!`, `6d10>=8`, `4dF`, `d%`. */
export function parseNotation(notation: string): Term[] {
    const compact = notation.replace(/\s+/g, "");
    if (compact === "") {
        throw new DiceError("The dice notation is empty.");
    }
    const signedTerms = compact.match(/[+-]?[^+-]+/g) ?? [];
    if (signedTerms.join("") !== compact) {
        throw new DiceError(`Cannot read "${notation}".`);
    }
    if (signedTerms.length > maxTerms) {
        throw new DiceError(`Too many terms in "${notation}" (at most ${maxTerms}).`);
    }
    return signedTerms.map((signedTerm) => parseTerm(signedTerm, notation));
}

/** How many dice the roll needs at least, before rerolls and explosions. */
export function minimumDice(terms: Term[]): number {
    return terms.reduce((sum, term) => sum + (term.kind === "dice" ? term.count : 0), 0);
}

export function matches(condition: Condition, face: number): boolean {
    switch (condition.operator) {
        case "=": return face === condition.value;
        case "<": return face < condition.value;
        case "<=": return face <= condition.value;
        case ">": return face > condition.value;
        case ">=": return face >= condition.value;
    }
}

function parseTerm(signedTerm: string, notation: string): Term {
    const sign = signedTerm.startsWith("-") ? -1 : 1;
    const termText = signedTerm.replace(/^[+-]/, "");
    if (/^\d+$/.test(termText)) {
        return { kind: "constant", sign, value: Number(termText) };
    }

    const match = /^(\d*)d(\d+|%|F)(.*)$/i.exec(termText);
    if (!match) {
        throw new DiceError(`Cannot read "${termText}" in "${notation}".`);
    }
    const [, countText, sidesText, modifiers] = match;
    const count = countText === "" ? 1 : Number(countText);
    const sides = sidesText.toUpperCase() === "F" ? "F" : sidesText === "%" ? 100 : Number(sidesText);
    if (count < 1 || count > maxDice) {
        throw new DiceError(`"${termText}": roll between 1 and ${maxDice} dice.`);
    }
    if (sides !== "F" && (sides < 2 || sides > maxSides)) {
        throw new DiceError(`"${termText}": a die has between 2 and ${maxSides} faces.`);
    }

    const term: DiceTerm = { kind: "dice", sign, count, sides };
    if (modifiers !== "") {
        if (sides === "F") {
            throw new DiceError(`"${termText}": Fudge dice take no modifiers.`);
        }
        parseModifiers(modifiers, term as DiceTerm & { sides: number }, termText);
    }
    return term;
}

function parseModifiers(modifiers: string, term: DiceTerm & { sides: number }, termText: string): void {
    let remaining = modifiers;
    while (remaining !== "") {
        let match: RegExpExecArray | null;
        if ((match = /^ro(<=|>=|<|>|=)?(\d+)/i.exec(remaining))) {
            if (term.rerollOnce) {
                throw duplicateModifier(termText, "reroll");
            }
            term.rerollOnce = toCondition(match[1] ?? "=", match[2]);
        } else if ((match = /^(!!?)(?:(<=|>=|<|>|=)(\d+))?/.exec(remaining))) {
            if (term.explode) {
                throw duplicateModifier(termText, "explosion");
            }
            const explodeOn = match[2] ? toCondition(match[2], match[3]) : { operator: "=" as const, value: term.sides };
            if (everyFaceMatches(explodeOn, term.sides)) {
                throw new DiceError(`"${termText}": the dice would explode forever.`);
            }
            term.explode = { condition: explodeOn, compound: match[1] === "!!" };
        } else if ((match = /^k([hl]?)(\d*)/i.exec(remaining))) {
            if (term.keep || term.drop) {
                throw duplicateModifier(termText, "keep or drop");
            }
            term.keep = { which: match[1].toLowerCase() === "l" ? "lowest" : "highest", count: match[2] === "" ? 1 : Number(match[2]) };
            if (term.keep.count < 1 || term.keep.count > term.count) {
                throw new DiceError(`"${termText}": keep between 1 and ${term.count} dice.`);
            }
        } else if ((match = /^d([hl])(\d*)/i.exec(remaining))) {
            if (term.keep || term.drop) {
                throw duplicateModifier(termText, "keep or drop");
            }
            term.drop = { which: match[1].toLowerCase() === "l" ? "lowest" : "highest", count: match[2] === "" ? 1 : Number(match[2]) };
            if (term.drop.count < 1 || term.drop.count >= term.count) {
                throw new DiceError(`"${termText}": drop between 1 and ${term.count - 1} dice.`);
            }
        } else if ((match = conditionPattern.exec(remaining))) {
            if (term.success) {
                throw duplicateModifier(termText, "success");
            }
            term.success = toCondition(match[1], match[2]);
        } else {
            throw new DiceError(`"${termText}": unknown modifier "${remaining}".`);
        }
        remaining = remaining.slice(match[0].length);
    }
}

function toCondition(operator: string, value: string): Condition {
    return { operator: operator as Condition["operator"], value: Number(value) };
}

function everyFaceMatches(condition: Condition, sides: number): boolean {
    for (let face = 1; face <= sides; face++) {
        if (!matches(condition, face)) {
            return false;
        }
    }
    return true;
}

function duplicateModifier(termText: string, modifier: string): DiceError {
    return new DiceError(`"${termText}": only one ${modifier} modifier per die.`);
}
