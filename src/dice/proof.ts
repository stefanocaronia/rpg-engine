import { createHash } from "node:crypto";

/** Characters of the fingerprint shown to the player for a hidden roll. */
const FINGERPRINT_LENGTH = 16;

/**
 * The exact text a hidden roll commits to. When it is revealed, anyone can compute its
 * SHA-256 and check that it starts with the fingerprint shown before.
 */
export function proofText(id: string, rollLine: string, salt: string): string {
  return `${id}|${rollLine}|${salt}`;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function fingerprint(proof: string): string {
  return sha256(proof).slice(0, FINGERPRINT_LENGTH);
}
