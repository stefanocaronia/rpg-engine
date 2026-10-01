import { DiceError, matches, type DiceTerm, type Term } from "./notation.js";

export interface Die {
    /** Final value; with compounding explosions, the sum of its faces. */
    value: number;
    /** Faces that make up the value: more than one only with compounding explosions. */
    faces: number[];
    /** The face this die showed before its reroll. */
    rerolledFrom?: number;
    dropped?: boolean;
    success?: boolean;
}

export interface TermResult {
    term: Term;
    dice: Die[];
    total: number;
}

export interface RollBreakdown {
    total: number;
    terms: TermResult[];
}

/** Returns the next face of a die with the given sides. */
export type NextFace = (sides: number | "F") => number;

const maxExplosions = 100;

export function evaluateTerms(terms: Term[], nextFace: NextFace): RollBreakdown {
    const results = terms.map((term): TermResult => {
        return term.kind === "constant" ? { term, dice: [], total: term.sign * term.value } : rollDiceTerm(term, nextFace);
    });
    return { total: results.reduce((sum, result) => sum + result.total, 0), terms: results };
}

export function digitalFaces(random: (sides: number) => number): NextFace {
    return (sides) => (sides === "F" ? random(3) - 2 : random(sides));
}

/** Faces from the values the player rolled, used in order: impossible or missing values are errors. */
export function physicalFaces(values: number[]): { nextFace: NextFace; unusedCount(): number } {
    let usedCount = 0;
    return {
        nextFace(sides) {
            if (usedCount >= values.length) {
                throw new DiceError(`The roll needs one more ${dieName(sides)}, for a reroll or an explosion: ask the player to roll it.`);
            }
            const value = values[usedCount++];
            const [lowest, highest] = sides === "F" ? [-1, 1] : [1, sides];
            if (!Number.isInteger(value) || value < lowest || value > highest) {
                throw new DiceError(`Impossible value ${value} on a ${dieName(sides)}: ask the player to roll it again.`);
            }
            return value;
        },
        unusedCount: () => values.length - usedCount,
    };
}

export function dieName(sides: number | "F"): string {
    return sides === "F" ? "Fudge die" : `d${sides}`;
}

function rollDiceTerm(term: DiceTerm, nextFace: NextFace): TermResult {
    const dice: Die[] = [];
    let explosionCount = 0;
    for (let index = 0; index < term.count; index++) {
        const firstFace = nextFace(term.sides);
        const die: Die = { value: firstFace, faces: [firstFace] };
        if (term.rerollOnce && matches(term.rerollOnce, firstFace)) {
            const rerolledFace = nextFace(term.sides);
            die.value = rerolledFace;
            die.faces = [rerolledFace];
            die.rerolledFrom = firstFace;
        }
        dice.push(die);
        if (!term.explode) {
            continue;
        }
        let lastFace = die.value;
        while (matches(term.explode.condition, lastFace)) {
            if (++explosionCount > maxExplosions) {
                throw new DiceError("Too many explosions in a single roll.");
            }
            lastFace = nextFace(term.sides);
            if (term.explode.compound) {
                die.faces.push(lastFace);
                die.value += lastFace;
            } else {
                dice.push({ value: lastFace, faces: [lastFace] });
            }
        }
    }

    if (term.keep || term.drop) {
        markDropped(dice, term);
    }
    const keptDice = dice.filter((die) => !die.dropped);
    if (term.success) {
        for (const die of keptDice) {
            die.success = matches(term.success, die.value);
        }
        return { term, dice, total: term.sign * keptDice.filter((die) => die.success).length };
    }
    return { term, dice, total: term.sign * keptDice.reduce((sum, die) => sum + die.value, 0) };
}

function markDropped(dice: Die[], term: DiceTerm): void {
    const indexesByValue = dice.map((_, index) => index).sort((left, right) => dice[left].value - dice[right].value || left - right);
    let droppedIndexes: number[];
    if (term.keep) {
        const keepCount = Math.min(term.keep.count, dice.length);
        droppedIndexes = term.keep.which === "highest" ? indexesByValue.slice(0, dice.length - keepCount) : indexesByValue.slice(keepCount);
    } else {
        const dropCount = Math.min(term.drop!.count, dice.length);
        droppedIndexes = term.drop!.which === "lowest" ? indexesByValue.slice(0, dropCount) : indexesByValue.slice(dice.length - dropCount);
    }
    for (const index of droppedIndexes) {
        dice[index].dropped = true;
    }
}
