/** A comparison against a die face, such as `>=8` or `=1`. */
export interface Condition {
  op: "=" | "<" | "<=" | ">" | ">=";
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

const MAX_TERMS = 20;
const MAX_DICE = 100;
const MAX_SIDES = 1000;
const CONDITION = /^(<=|>=|<|>|=)(\d+)/;

/**
 * Reads a dice notation valid for any game: `1d20+5`, `2d20kh1` (keep highest),
 * `4d6dl1` (drop lowest), `2d6ro<=2` (reroll once), `1d6!` and `1d6!!` (explode),
 * `6d10>=8` (count successes), `4dF` (Fudge), `d%`.
 */
export function parseNotation(notation: string): Term[] {
  const text = notation.replace(/\s+/g, "");
  if (text === "") throw new DiceError("The dice notation is empty.");
  const parts = text.match(/[+-]?[^+-]+/g) ?? [];
  if (parts.join("") !== text) throw new DiceError(`Cannot read "${notation}".`);
  if (parts.length > MAX_TERMS) throw new DiceError(`Too many terms in "${notation}" (at most ${MAX_TERMS}).`);
  return parts.map((part) => parseTerm(part, notation));
}

/** How many dice the roll needs at least, before rerolls and explosions. */
export function minimumDice(terms: Term[]): number {
  return terms.reduce((sum, term) => sum + (term.kind === "dice" ? term.count : 0), 0);
}

export function matches(condition: Condition, face: number): boolean {
  switch (condition.op) {
    case "=": return face === condition.value;
    case "<": return face < condition.value;
    case "<=": return face <= condition.value;
    case ">": return face > condition.value;
    case ">=": return face >= condition.value;
  }
}

function parseTerm(part: string, notation: string): Term {
  const sign = part.startsWith("-") ? -1 : 1;
  const body = part.replace(/^[+-]/, "");
  if (/^\d+$/.test(body)) return { kind: "constant", sign, value: Number(body) };

  const match = /^(\d*)d(\d+|%|F)(.*)$/i.exec(body);
  if (!match) throw new DiceError(`Cannot read "${body}" in "${notation}".`);
  const [, countText, sidesText, modifiers] = match;
  const count = countText === "" ? 1 : Number(countText);
  const sides = sidesText.toUpperCase() === "F" ? "F" : sidesText === "%" ? 100 : Number(sidesText);
  if (count < 1 || count > MAX_DICE) throw new DiceError(`"${body}": roll between 1 and ${MAX_DICE} dice.`);
  if (sides !== "F" && (sides < 2 || sides > MAX_SIDES)) throw new DiceError(`"${body}": a die has between 2 and ${MAX_SIDES} faces.`);

  const term: DiceTerm = { kind: "dice", sign, count, sides };
  if (modifiers !== "") {
    if (sides === "F") throw new DiceError(`"${body}": Fudge dice take no modifiers.`);
    parseModifiers(modifiers, term as DiceTerm & { sides: number }, body);
  }
  return term;
}

function parseModifiers(text: string, term: DiceTerm & { sides: number }, body: string): void {
  let rest = text;
  while (rest !== "") {
    let match: RegExpExecArray | null;
    if ((match = /^ro(<=|>=|<|>|=)?(\d+)/i.exec(rest))) {
      if (term.rerollOnce) throw duplicate(body, "reroll");
      term.rerollOnce = condition(match[1] ?? "=", match[2]);
    } else if ((match = /^(!!?)(?:(<=|>=|<|>|=)(\d+))?/.exec(rest))) {
      if (term.explode) throw duplicate(body, "explosion");
      const explodeOn = match[2] ? condition(match[2], match[3]) : { op: "=" as const, value: term.sides };
      if (everyFaceMatches(explodeOn, term.sides)) throw new DiceError(`"${body}": the dice would explode forever.`);
      term.explode = { condition: explodeOn, compound: match[1] === "!!" };
    } else if ((match = /^k([hl]?)(\d*)/i.exec(rest))) {
      if (term.keep || term.drop) throw duplicate(body, "keep or drop");
      term.keep = { which: match[1].toLowerCase() === "l" ? "lowest" : "highest", count: match[2] === "" ? 1 : Number(match[2]) };
      if (term.keep.count < 1 || term.keep.count > term.count) throw new DiceError(`"${body}": keep between 1 and ${term.count} dice.`);
    } else if ((match = /^d([hl])(\d*)/i.exec(rest))) {
      if (term.keep || term.drop) throw duplicate(body, "keep or drop");
      term.drop = { which: match[1].toLowerCase() === "l" ? "lowest" : "highest", count: match[2] === "" ? 1 : Number(match[2]) };
      if (term.drop.count < 1 || term.drop.count >= term.count) throw new DiceError(`"${body}": drop between 1 and ${term.count - 1} dice.`);
    } else if ((match = CONDITION.exec(rest))) {
      if (term.success) throw duplicate(body, "success");
      term.success = condition(match[1], match[2]);
    } else {
      throw new DiceError(`"${body}": unknown modifier "${rest}".`);
    }
    rest = rest.slice(match[0].length);
  }
}

function condition(op: string, value: string): Condition {
  return { op: op as Condition["op"], value: Number(value) };
}

function everyFaceMatches(cond: Condition, sides: number): boolean {
  for (let face = 1; face <= sides; face++) if (!matches(cond, face)) return false;
  return true;
}

function duplicate(body: string, what: string): DiceError {
  return new DiceError(`"${body}": only one ${what} modifier per die.`);
}
