import { z } from "zod";
import { digitalFaces, dieName, evaluate, physicalFaces, type RollResult } from "../dice/evaluate.js";
import { formatRoll } from "../dice/format.js";
import { DiceError, minimumDice, parseNotation, type Term } from "../dice/notation.js";
import { fingerprint, proofText, sha256 } from "../dice/proof.js";
import { appendEvent, readEvents, type GameEvent } from "../log.js";
import { defineCommand } from "../registry.js";

// Faces arrive as "14,7" or "14 7" from a shell (PowerShell turns 14,7 into "14 7"), or as an array.
const faceValues = z.preprocess(
  (value) => (typeof value === "string" ? value.split(/[\s,;]+/).filter(Boolean).map(Number) : value),
  z.array(z.number()),
);

type RollOutput =
  | { kind: "roll"; id: string; line: string; total: number; why?: string; who?: string; physical: boolean; hidden: boolean; fingerprint?: string }
  | { kind: "reveal"; id: string; line: string; proof: string; sha256: string; fingerprint: string };

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

  run(input, ctx): RollOutput {
    if (input.reveal !== undefined) {
      if (input.notation !== undefined) throw new DiceError("Give either a dice notation or --reveal <id>, not both.");
      return reveal(input.reveal, ctx.cwd, ctx);
    }
    if (input.notation === undefined) throw new DiceError("Give the dice to roll, for example: rpg roll 1d20+5");
    if (input.values && input.hidden) throw new DiceError("Physical dice are rolled by the player, so they cannot be hidden.");

    const terms = parseNotation(input.notation);
    const result = input.values ? rollPhysical(input.notation, terms, input.values) : evaluate(input.notation, terms, digitalFaces(ctx.random));
    const line = formatRoll(result);
    const id = ctx.newId();
    const event: GameEvent = {
      id,
      at: ctx.now().toISOString(),
      type: "roll",
      visibility: input.hidden ? "hidden" : "public",
      data: { notation: input.notation, total: result.total, result: line, why: input.why, who: input.who, physical: input.values !== undefined },
    };
    let print: string | undefined;
    if (input.hidden) {
      const proof = proofText(id, line, ctx.newSalt());
      print = fingerprint(proof);
      Object.assign(event.data, { proof, fingerprint: print });
    }
    appendEvent(ctx.cwd, event);
    return { kind: "roll", id, line, total: result.total, why: input.why, who: input.who, physical: input.values !== undefined, hidden: input.hidden === true, fingerprint: print };
  },

  format(output) {
    if (output.kind === "reveal") {
      return `Hidden roll ${output.id} revealed: ${output.line}\nProof: ${output.proof}\nSHA-256 of the proof: ${output.sha256} (it starts with the fingerprint ${output.fingerprint})`;
    }
    if (output.hidden) {
      return `Hidden roll ${output.id}, only for the master: ${output.line}\nTell the player only the fingerprint: ${output.fingerprint}`;
    }
    const label = [output.who, output.why].filter(Boolean).join(", ");
    return `${output.id} ${label ? label + ": " : ""}${output.line}${output.physical ? " (physical dice)" : ""}`;
  },
});

function rollPhysical(notation: string, terms: Term[], values: number[]): RollResult {
  const needed = minimumDice(terms);
  if (values.length < needed) {
    const dice = terms.flatMap((term) => (term.kind === "dice" ? [`${term.count} ${dieName(term.sides)}`] : []));
    throw new DiceError(`This roll needs at least ${needed} values (${dice.join(", ")}), but ${values.length} were given.`);
  }
  const source = physicalFaces(values);
  const result = evaluate(notation, terms, source.next);
  if (source.unused() > 0) throw new DiceError(`Too many values: ${values.length} given, but the roll used ${values.length - source.unused()}.`);
  return result;
}

function reveal(id: string, dir: string, ctx: { newId(): string; now(): Date }): RollOutput {
  const events = readEvents(dir);
  const hidden = events.find((event) => event.id === id && event.type === "roll" && event.visibility === "hidden");
  if (!hidden) throw new DiceError(`There is no hidden roll with id ${id}.`);
  const proof = String(hidden.data.proof);
  if (!events.some((event) => event.type === "reveal" && event.data.roll === id)) {
    appendEvent(dir, { id: ctx.newId(), at: ctx.now().toISOString(), type: "reveal", visibility: "public", data: { roll: id, proof } });
  }
  return { kind: "reveal", id, line: String(hidden.data.result), proof, sha256: sha256(proof), fingerprint: String(hidden.data.fingerprint) };
}
