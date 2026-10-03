import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry, readLog } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { createProof, fingerprint, rollDice, sha256 } from "../dice/index.ts";
import { newDatedLogEntry } from "./game-time.ts";

// Faces arrive as "14,7" or "14 7" from a shell (PowerShell turns 14,7 into "14 7"), or as an array.
const faceValues = z.preprocess(
    (value) => (typeof value === "string" ? value.split(/[\s,;]+/).filter(Boolean).map(Number) : value),
    z.array(z.number()),
);

type RollOutput =
    | { kind: "roll"; id: string; text: string; total: number; why?: string; who?: string; physical: boolean; hidden: boolean; fingerprint?: string; }
    | { kind: "reveal"; id: string; text: string; proof: string; sha256: string; fingerprint: string; };

export const roll = defineCommand({
    name: "roll",
    description: "Roll dice and log the roll. "
        + "Give what the roll is for and, if it belongs to someone, whose it is. "
        + "When the player rolls physical dice, pass the faces they rolled as values. "
        + "When the player must not see the result, make it hidden; give the player its fingerprint only if they ask for it. reveal shows a hidden roll's proof later. "
        + "Notation: 1d20+5, 2d20kh1 (keep the highest), 4d6dl1 (drop the lowest), 2d6ro<=2 (reroll once), 1d6! (exploding), 6d10>=8 (count successes), 4dF, d%. "
        + 'Example: notation 1d20+3, why "notice the trap", who Bruna.',
    group: "game",
    positionals: ["notation"],
    input: z.object({
        notation: z.string().optional().describe("dice to roll: 1d20+5, 2d20kh1, 4d6dl1, 2d6ro<=2, 1d6!, 6d10>=8, 4dF, d%"),
        why: z.string().optional().describe("what the roll is for"),
        who: z.string().optional().describe("character the roll belongs to; leave it out for a free roll of the master"),
        values: faceValues.optional().describe("faces rolled by the player with physical dice, separated by commas; on the command line write --values=-1,0,1 for negative faces"),
        hidden: z.boolean().optional().describe("only the master sees the result; its fingerprint goes to the player only if they ask for it"),
        reveal: z.string().optional().describe("id of a hidden roll to reveal"),
    }),

    run(input, context): RollOutput
    {
        const root = requireCampaign(context.folder);

        if (input.reveal !== undefined) {
            if (input.notation !== undefined) {
                throw new Error("Give either the dice to roll or the id of a hidden roll to reveal, not both.");
            }

            return revealHiddenRoll(input.reveal, root, context);
        }

        if (input.notation === undefined) {
            throw new Error("Give the dice to roll, for example 1d20+5.");
        }

        if (input.values && input.hidden) {
            throw new Error("Physical dice are rolled by the player, so they cannot be hidden.");
        }

        const physical = input.values !== undefined;
        const diceRoll = rollDice(input.notation, input.values ? { values: input.values } : { random: context.random });
        const data = { notation: diceRoll.notation, total: diceRoll.total, result: diceRoll.text, why: input.why, who: input.who, physical };
        const entry = newDatedLogEntry(root, context, "roll", input.hidden ? "hidden" : "public", data);
        let shownFingerprint: string | undefined;

        if (input.hidden) {
            const proof = createProof(entry.id, diceRoll.text, context.newSalt());
            shownFingerprint = fingerprint(proof);
            Object.assign(entry.data, { proof, fingerprint: shownFingerprint });
        }

        appendLogEntry(root, entry);
        return { kind: "roll", id: entry.id, text: diceRoll.text, total: diceRoll.total, why: input.why, who: input.who, physical, hidden: input.hidden === true, fingerprint: shownFingerprint };
    },

    format(output)
    {
        if (output.kind === "reveal") {
            return `Hidden roll ${output.id} revealed: ${output.text}\nProof: ${output.proof}\nSHA-256 of the proof: ${output.sha256} (it starts with the fingerprint ${output.fingerprint})`;
        }

        if (output.hidden) {
            return `Hidden roll ${output.id}, only for the master: ${output.text}\nIts fingerprint, only if the player asks for it: ${output.fingerprint}`;
        }

        const label = [output.who, output.why].filter(Boolean).join(", ");
        return `${output.id} ${label ? label + ": " : ""}${output.text}${output.physical ? " (physical dice)" : ""}`;
    },
});

function revealHiddenRoll(rollId: string, root: string, context: Context): RollOutput
{
    const log = readLog(root);
    const hiddenRoll = log.find((entry) => entry.id === rollId && entry.type === "roll" && entry.visibility === "hidden");

    if (!hiddenRoll) {
        throw new Error(`There is no hidden roll with id ${rollId}.`);
    }

    const proof = String(hiddenRoll.data.proof);
    const alreadyRevealed = log.some((entry) => entry.type === "roll-revealed" && entry.data.roll === rollId);

    if (!alreadyRevealed) {
        appendLogEntry(root, newDatedLogEntry(root, context, "roll-revealed", "public", { roll: rollId, proof }));
    }

    return { kind: "reveal", id: rollId, text: String(hiddenRoll.data.result), proof, sha256: sha256(proof), fingerprint: String(hiddenRoll.data.fingerprint) };
}
