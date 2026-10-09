import { type Die, dieName, digitalFaces, evaluateTerms, physicalFaces, type RollBreakdown } from "./evaluate.ts";
import { formatRoll } from "./format.ts";
import { DiceError, minimumDice, parseNotation, type Term } from "./notation.ts";

/** Where the faces come from: the digital generator, or the faces the player rolled with physical dice. */
export type FaceSource = { random(sides: number): number; } | { values: number[]; };

export interface DiceRoll
{
    notation: string;
    total: number;
    /** One line such as `2d20kh1+5 = 19 [14, (7)] + 5`. */
    text: string;
    /** The value of each die, in order, dropped ones included: what a roll kept for later holds (KEP-2). */
    faces: number[];
    /** Each die as it was thrown, for who shows the throw (D-279). */
    dice: ThrownDie[];
}

/**
 * A die as it was thrown: its sides, the face it shows, the faces that add up on it with explosions, the face it showed before a reroll, and whether it was
 * dropped or is a success.
 */
export interface ThrownDie
{
    sides: number | "F";
    value: number;
    faces?: number[];
    rerolledFrom?: number;
    dropped?: boolean;
    success?: boolean;
}

export function rollDice(notation: string, source: FaceSource): DiceRoll
{
    const terms = parseNotation(notation);
    const breakdown = "values" in source ? rollPhysical(terms, source.values) : evaluateTerms(terms, digitalFaces(source.random));
    return {
        notation,
        total: breakdown.total,
        text: formatRoll(notation, breakdown),
        faces: breakdown.terms.flatMap((term) => term.dice.map((die) => die.value)),
        dice: breakdown.terms.flatMap((result) => {
            const term = result.term;
            return term.kind === "dice" ? result.dice.map((die) => thrownDie(term.sides, die)) : [];
        }),
    };
}

function rollPhysical(terms: Term[], values: number[]): RollBreakdown
{
    const neededCount = minimumDice(terms);

    if (values.length < neededCount) {
        throw new DiceError(`This roll needs at least ${neededCount} values (${describeDice(terms)}), but ${values.length} were given.`);
    }

    const faces = physicalFaces(values);
    const breakdown = evaluateTerms(terms, faces.nextFace);
    const unusedCount = faces.unusedCount();

    if (unusedCount > 0) {
        throw new DiceError(`Too many values: ${values.length} given, but the roll used ${values.length - unusedCount}.`);
    }

    return breakdown;
}

function describeDice(terms: Term[]): string
{
    return terms.flatMap((term) => (term.kind === "dice" ? [`${term.count} ${dieName(term.sides)}`] : [])).join(", ");
}

function thrownDie(sides: number | "F", die: Die): ThrownDie
{
    return {
        sides,
        value: die.value,
        ...(die.faces.length > 1 ? { faces: die.faces } : {}),
        ...(die.rerolledFrom === undefined ? {} : { rerolledFrom: die.rerolledFrom }),
        ...(die.dropped === true ? { dropped: true } : {}),
        ...(die.success === undefined ? {} : { success: die.success }),
    };
}
