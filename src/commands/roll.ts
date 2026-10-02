import { z } from "zod";
import type { Context } from "../core/context.ts";
import { appendEvent, readEvents } from "../core/event-log.ts";
import { defineCommand } from "../core/registry.ts";
import { createProof, fingerprint, rollDice, sha256 } from "../dice/index.ts";

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
    description: "Roll dice and log the roll. Pass the faces of physical dice with --values; hide a roll from the player with --hidden.",
    positionals: ["notation"],
    input: z.object({
        notation: z.string().optional().describe("dice to roll: 1d20+5, 2d20kh1, 4d6dl1, 2d6ro<=2, 1d6!, 6d10>=8, 4dF, d%"),
        why: z.string().optional().describe("what the roll is for"),
        who: z.string().optional().describe("character the roll belongs to; leave it out for a free roll of the master"),
        values: faceValues.optional().describe("faces rolled by the player with physical dice, comma separated (--values=-1,0,1 for negative faces)"),
        hidden: z.boolean().optional().describe("only the master sees the result; the player gets a fingerprint"),
        reveal: z.string().optional().describe("id of a hidden roll to reveal"),
    }),

    run(input, context): RollOutput
    {
        if (input.reveal !== undefined) {
            if (input.notation !== undefined) {
                throw new Error("Give either a dice notation or --reveal <id>, not both.");
            }

            return revealHiddenRoll(input.reveal, context);
        }

        if (input.notation === undefined) {
            throw new Error("Give the dice to roll, for example: rpg roll 1d20+5");
        }

        if (input.values && input.hidden) {
            throw new Error("Physical dice are rolled by the player, so they cannot be hidden.");
        }

        const physical = input.values !== undefined;
        const diceRoll = rollDice(input.notation, input.values ? { values: input.values } : { random: context.random });
        const id = context.newId();
        const data: Record<string, unknown> = { notation: diceRoll.notation, total: diceRoll.total, result: diceRoll.text, why: input.why, who: input.who, physical };
        let shownFingerprint: string | undefined;

        if (input.hidden) {
            const proof = createProof(id, diceRoll.text, context.newSalt());
            shownFingerprint = fingerprint(proof);
            Object.assign(data, { proof, fingerprint: shownFingerprint });
        }

        appendEvent(context.folder, { id, at: context.now().toISOString(), type: "roll", visibility: input.hidden ? "hidden" : "public", data });
        return { kind: "roll", id, text: diceRoll.text, total: diceRoll.total, why: input.why, who: input.who, physical, hidden: input.hidden === true, fingerprint: shownFingerprint };
    },

    format(output)
    {
        if (output.kind === "reveal") {
            return `Hidden roll ${output.id} revealed: ${output.text}\nProof: ${output.proof}\nSHA-256 of the proof: ${output.sha256} (it starts with the fingerprint ${output.fingerprint})`;
        }

        if (output.hidden) {
            return `Hidden roll ${output.id}, only for the master: ${output.text}\nTell the player only the fingerprint: ${output.fingerprint}`;
        }

        const label = [output.who, output.why].filter(Boolean).join(", ");
        return `${output.id} ${label ? label + ": " : ""}${output.text}${output.physical ? " (physical dice)" : ""}`;
    },
});

function revealHiddenRoll(rollId: string, context: Context): RollOutput
{
    const events = readEvents(context.folder);
    const hiddenRoll = events.find((event) => event.id === rollId && event.type === "roll" && event.visibility === "hidden");

    if (!hiddenRoll) {
        throw new Error(`There is no hidden roll with id ${rollId}.`);
    }

    const proof = String(hiddenRoll.data.proof);
    const alreadyRevealed = events.some((event) => event.type === "reveal" && event.data.roll === rollId);

    if (!alreadyRevealed) {
        appendEvent(context.folder, { id: context.newId(), at: context.now().toISOString(), type: "reveal", visibility: "public", data: { roll: rollId, proof } });
    }

    return { kind: "reveal", id: rollId, text: String(hiddenRoll.data.result), proof, sha256: sha256(proof), fingerprint: String(hiddenRoll.data.fingerprint) };
}
