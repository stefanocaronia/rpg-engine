// Coins tossed, one to three, each heads or tails (COIN-1): a d2 with the names of its faces, 1 heads and 2 tails.
import { DiceError } from "./notation.ts";
import { type DiceRoll, type FaceSource, rollDice } from "./roll-dice.ts";

/** The faces of a coin, as a d2 numbers them. */
export const coinSides = ["heads", "tails"] as const;

export type CoinSide = (typeof coinSides)[number];

/** The most coins a toss takes. */
export const mostCoins = 3;

/** A toss: the d2s thrown, each coin's face in the order they fell, how many heads, and its text, as `Toss of 2: heads, tails`. */
export interface CoinToss
{
    roll: DiceRoll;
    sides: CoinSide[];
    heads: number;
    text: string;
}

/** Tosses `count` coins, from one to three; refused for any other number. */
export function tossCoins(count: number, source: FaceSource): CoinToss
{
    if (!Number.isInteger(count) || count < 1 || count > mostCoins) {
        throw new DiceError(`Toss one, two or three coins, not ${count}.`);
    }

    const roll = rollDice(`${count}d2`, source);
    const sides = roll.faces.map((face) => coinSides[face - 1]);
    const heads = sides.filter((side) => side === "heads").length;
    return { roll, sides, heads, text: `${count === 1 ? "Toss" : `Toss of ${count}`}: ${sides.join(", ")}` };
}
