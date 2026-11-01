// A yes/no oracle: a d100 against the odds, yes when it is no higher, or, in a game that reads it so, when it is above 100 less the odds; a double (11, 22, … 00)
// makes the answer extreme.
import { DiceError } from "./notation.ts";
import { type DiceRoll, type FaceSource, rollDice } from "./roll-dice.ts";

/** The odds an oracle is asked with, and the chance of a yes in a hundred. */
export const oracleOdds: Record<string, number> = { "almost certain": 90, likely: 75, "50/50": 50, unlikely: 25, "small chance": 10 };

/** An oracle's answer: the odds, the d100 rolled, yes or no and whether a double made it extreme, as `Likely (75%): [d100 = 41] Yes.` */
export interface OracleAnswer
{
    odds: string;
    chance: number;
    roll: DiceRoll;
    yes: boolean;
    extreme: boolean;
    text: string;
}

/** Where a d100 says yes: low, up to the odds; high, above 100 less the odds, as Ironsworn's oracle. */
export type OracleYes = "low" | "high";

/** Asks the oracle with the odds named, in any case, with hyphens for spaces too; refused, with the five odds, for any other. */
export function askOracle(odds: string, source: FaceSource, yesOn: OracleYes = "low"): OracleAnswer
{
    const name = odds.trim().toLowerCase().replace(/[-\s]+/g, " ");
    const chance = Object.hasOwn(oracleOdds, name) ? oracleOdds[name] : undefined;

    if (chance === undefined) {
        throw new DiceError(`"${odds}" are no odds of the oracle: give one of ${Object.keys(oracleOdds).join(", ")}.`);
    }

    const roll = rollDice("d100", source);
    const { yes, extreme } = oracleResult(chance, roll.total, yesOn);
    const answer = yes ? (extreme ? "Yes, and more: something beyond what was asked." : "Yes.") : extreme ? "No, and worse." : "No.";
    const shown = `${name[0].toUpperCase()}${name.slice(1)} (${chance}%)`;
    return { odds: name, chance, roll, yes, extreme, text: `${shown}: [d100 = ${roll.total}] ${answer}` };
}

/** Yes when the d100 is no higher than the chance, or above 100 less the chance when yes is high; extreme on a double, 11 to 99 and 100 as 00. */
export function oracleResult(chance: number, rolled: number, yesOn: OracleYes = "low"): { yes: boolean; extreme: boolean; }
{
    return { yes: yesOn === "high" ? rolled > 100 - chance : rolled <= chance, extreme: rolled === 100 || (rolled % 11 === 0 && rolled < 100) };
}
