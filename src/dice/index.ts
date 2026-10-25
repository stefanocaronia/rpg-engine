// Dice for any game: notation, digital or physical faces, proofs for hidden rolls, random tables, a yes/no oracle. Depends on nothing else in rpg-engine.
export { DiceError, parseNotation } from "./notation.ts";
export { askOracle, type OracleAnswer, oracleOdds, oracleResult } from "./oracle.ts";
export { createProof, fingerprint, sha256 } from "./proof.ts";
export { type DiceRoll, type FaceSource, rollDice, type ThrownDie } from "./roll-dice.ts";
export { type RandomTable, readRandomTable, rollOnTable, type TableRoll, type TableRow } from "./tables.ts";
export { type NotationPart, notationParts } from "./words.ts";
