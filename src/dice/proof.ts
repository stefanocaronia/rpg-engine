import { createHash } from "node:crypto";

const fingerprintLength = 16;

/** The text a hidden roll commits to: once revealed, its SHA-256 must start with the fingerprint shown before. */
export function createProof(rollId: string, rollText: string, salt: string): string
{
    return `${rollId}|${rollText}|${salt}`;
}

export function sha256(text: string): string
{
    return createHash("sha256").update(text, "utf8").digest("hex");
}

export function fingerprint(proof: string): string
{
    return sha256(proof).slice(0, fingerprintLength);
}
