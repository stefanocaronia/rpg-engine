// Dice for any game: notation, digital or physical faces, proofs for hidden rolls. Depends on nothing else in rpg-engine.
export { DiceError } from "./notation.ts";
export { createProof, fingerprint, sha256 } from "./proof.ts";
export { type DiceRoll, type FaceSource, rollDice } from "./roll-dice.ts";
