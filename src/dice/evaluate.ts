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

export interface RollResult {
  notation: string;
  total: number;
  terms: TermResult[];
}

/** Where the faces come from: the digital generator or the values the player rolled. */
export type FaceSource = (sides: number | "F") => number;

const MAX_EXPLOSIONS = 100;

export function evaluate(notation: string, terms: Term[], next: FaceSource): RollResult {
  const results = terms.map((term): TermResult =>
    term.kind === "constant" ? { term, dice: [], total: term.sign * term.value } : rollTerm(term, next),
  );
  return { notation, total: results.reduce((sum, result) => sum + result.total, 0), terms: results };
}

export function digitalFaces(random: (sides: number) => number): FaceSource {
  return (sides) => (sides === "F" ? random(3) - 2 : random(sides));
}

/** Faces from the values the player rolled, used in order. Impossible or missing values are errors. */
export function physicalFaces(values: number[]): { next: FaceSource; unused(): number } {
  let used = 0;
  return {
    next(sides) {
      if (used >= values.length) {
        throw new DiceError(`The roll needs one more ${dieName(sides)}, for a reroll or an explosion: ask the player to roll it.`);
      }
      const value = values[used++];
      const [min, max] = sides === "F" ? [-1, 1] : [1, sides];
      if (!Number.isInteger(value) || value < min || value > max) {
        throw new DiceError(`Impossible value ${value} on a ${dieName(sides)}: ask the player to roll it again.`);
      }
      return value;
    },
    unused: () => values.length - used,
  };
}

export function dieName(sides: number | "F"): string {
  return sides === "F" ? "Fudge die" : `d${sides}`;
}

function rollTerm(term: DiceTerm, next: FaceSource): TermResult {
  const dice: Die[] = [];
  let explosions = 0;
  for (let i = 0; i < term.count; i++) {
    const first = next(term.sides);
    const die: Die = { value: first, faces: [first] };
    if (term.rerollOnce && matches(term.rerollOnce, first)) {
      const again = next(term.sides);
      Object.assign(die, { value: again, faces: [again], rerolledFrom: first });
    }
    dice.push(die);
    if (!term.explode) continue;
    let last = die.value;
    while (matches(term.explode.condition, last)) {
      if (++explosions > MAX_EXPLOSIONS) throw new DiceError("Too many explosions in a single roll.");
      last = next(term.sides);
      if (term.explode.compound) {
        die.faces.push(last);
        die.value += last;
      } else {
        dice.push({ value: last, faces: [last] });
      }
    }
  }

  if (term.keep || term.drop) markDropped(dice, term);
  const kept = dice.filter((die) => !die.dropped);
  if (term.success) {
    for (const die of kept) die.success = matches(term.success, die.value);
    return { term, dice, total: term.sign * kept.filter((die) => die.success).length };
  }
  return { term, dice, total: term.sign * kept.reduce((sum, die) => sum + die.value, 0) };
}

function markDropped(dice: Die[], term: DiceTerm): void {
  const ascending = dice.map((_, i) => i).sort((a, b) => dice[a].value - dice[b].value || a - b);
  let dropped: number[];
  if (term.keep) {
    const keep = Math.min(term.keep.count, dice.length);
    dropped = term.keep.which === "highest" ? ascending.slice(0, dice.length - keep) : ascending.slice(keep);
  } else {
    const drop = Math.min(term.drop!.count, dice.length);
    dropped = term.drop!.which === "lowest" ? ascending.slice(0, drop) : ascending.slice(dice.length - drop);
  }
  for (const i of dropped) dice[i].dropped = true;
}
