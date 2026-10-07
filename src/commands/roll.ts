import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { numberOf } from "../core/formula.ts";
import { appendLogEntry, readLog } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, sameName } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { createProof, fingerprint, rollDice, sha256 } from "../dice/index.ts";
import { findPage, type Page, pagesWithName, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { copyPage, readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";
import { signedText, workedFields } from "./worked-out.ts";

// Faces arrive as "14,7" or "14 7" from a shell (PowerShell turns 14,7 into "14 7"), or as an array.
const faceValues = z.preprocess(
    (value) => (typeof value === "string" ? value.split(/[\s,;]+/).filter(Boolean).map(Number) : value),
    z.array(z.number()),
);

// A name in a notation, at the start of a term: a field of the sheet of who rolls, such as athletics or sleight-of-hand (DAT-8). A hyphen inside a name is the
// name's, as in formulas (FOR-2); a die such as d20 or dF is no name.
const namePattern = /(^|[+-])(\s*)([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)/g;
const diePattern = /^\d*d(\d+|%|F)/i;

type RollOutput =
    | { kind: "roll"; id: string; text: string; total: number; why?: string; who?: string; physical: boolean; hidden: boolean; fingerprint?: string; note?: string; }
    | { kind: "reveal"; id: string; text: string; proof: string; sha256: string; fingerprint: string; };

export const roll = defineCommand({
    name: "roll",
    description: "Roll dice and log the roll. "
        + "Give what the roll is for and, if it belongs to someone, whose it is. "
        + "When the player rolls physical dice, pass the faces they rolled as values. "
        + "When the player must not see the result, make it hidden; give the player its fingerprint only if they ask for it. reveal shows a hidden roll's proof later. "
        + "Notation: 1d20+5, 2d20kh1 (keep the highest), 4d6dl1 (drop the lowest), 2d6ro<=2 (reroll once), 1d6! (exploding), 6d10>=8 (count successes), 4dF, d%. "
        + "With who, a field of their sheet stands for its value, such as 1d20+athletics. "
        + 'Example: notation 1d20+perception, why "notice the trap", who Lena.',
    group: "game",
    positionals: ["notation"],
    input: z.object({
        notation: z.string().optional().describe("dice to roll: 1d20+5, 2d20kh1, 4d6dl1, 2d6ro<=2, 1d6!, 6d10>=8, 4dF, d%; with who, 1d20+athletics takes the value from their sheet"),
        why: z.string().optional().describe("what the roll is for"),
        who: z.string().optional().describe("character the roll belongs to, or a copy in the open scene; leave it out for a free roll of the master"),
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
        const system = campaignSystem(root, context);
        const roller = rollerOf(root, context, input.who, hasNames(input.notation));
        const named = withSheetValues(input.notation, roller, input.who, system);
        const diceRoll = rollDice(named.notation, input.values ? { values: input.values } : { random: context.random });
        // The notation as it was given, with the values its names took from the sheet (DAT-8).
        const taken = Object.entries(named.taken).map(([field, value]) => `${field} ${roller === undefined ? value : signedText(roller.world, field, value)}`);
        const text = taken.length === 0 ? diceRoll.text : `${input.notation}${diceRoll.text.slice(diceRoll.notation.length)} (${taken.join(", ")})`;
        const sheet = taken.length === 0 ? {} : { sheet: named.taken };
        const data = { notation: input.notation, total: diceRoll.total, result: text, ...sheet, why: input.why, who: input.who, physical };
        const entry = newDatedLogEntry(root, context, "roll", input.hidden ? "hidden" : "public", data);
        let shownFingerprint: string | undefined;

        if (input.hidden) {
            const proof = createProof(entry.id, text, context.newSalt());
            shownFingerprint = fingerprint(proof);
            Object.assign(entry.data, { proof, fingerprint: shownFingerprint });
        }

        appendLogEntry(root, entry);
        const note = roller === undefined ? undefined : rollerNote(roller.world, system, roller.page);
        return { kind: "roll", id: entry.id, text, total: diceRoll.total, why: input.why, who: input.who, physical, hidden: input.hidden === true, fingerprint: shownFingerprint, note };
    },

    format(output)
    {
        if (output.kind === "reveal") {
            const tell = "Tell the player what it was for and what came out, in the story's words; give the proof only if they ask how to check it.";
            return `Hidden roll ${output.id} revealed: ${output.text}. ${tell}\nProof: ${output.proof}\nSHA-256 of the proof: ${output.sha256} (it starts with the fingerprint ${output.fingerprint})`;
        }

        const note = output.note === undefined ? "" : `\n${output.note}`;

        if (output.hidden) {
            return `Hidden roll ${output.id}, only for the master: ${output.text}\nIts fingerprint, only if the player asks for it: ${output.fingerprint}${note}`;
        }

        const label = [output.who, output.why].filter(Boolean).join(", ");
        return `${output.id} ${label ? label + ": " : ""}${output.text}${output.physical ? " (physical dice)" : ""}${note}`;
    },
});

/**
 * The page of who rolls, a character or a copy in the open scene, with its world; undefined when who names neither, as a free label does. Without names to
 * read, a name two pages share is a label too: the roll needs no sheet.
 */
function rollerOf(root: string, context: Context, who: string | undefined, readsSheet: boolean): { world: World; page: Page; } | undefined
{
    if (who === undefined) {
        return undefined;
    }

    const world = campaignWorld(root, context);
    const named = pagesWithName(world, who);
    const page = readsSheet ? findPage(world, who) : named.length === 1 ? named[0] : undefined;

    if (page !== undefined) {
        return { world, page };
    }

    const { scene } = readOpenScene(root);
    const copy = scene === undefined ? undefined : sameName(Object.keys(scene.copies), who);
    return scene === undefined || copy === undefined ? undefined : { world, page: copyPage(copy, scene.copies[copy]) };
}

/** Whether a notation names a field, such as athletics in 1d20+athletics (DAT-8). */
function hasNames(notation: string): boolean
{
    return [...notation.matchAll(namePattern)].some((match) => !diePattern.test(notation.slice((match.index ?? 0) + match[1].length + match[2].length)));
}

/** The notation with each name of a field replaced by its value on the sheet of who rolls, effects and formulas included, and the values taken (DAT-8). */
function withSheetValues(notation: string, roller: { world: World; page: Page; } | undefined, who: string | undefined, system: GameSystem | undefined): { notation: string; taken: Record<string, number>; }
{
    const taken: Record<string, number> = {};
    const fields = roller === undefined ? undefined : effectiveFields(roller.world, roller.page);
    const replaced = notation.replace(namePattern, (whole: string, sign: string, space: string, name: string, offset: number) => {
        if (diePattern.test(notation.slice(offset + sign.length + space.length))) {
            return whole;
        }

        // "sleight of hand": a name of several words, which a notation cannot hold.
        const words = /^\s+[A-Za-z]/.test(notation.slice(offset + whole.length));
        checkNotScore(roller, system, fields, name);
        const value = sheetValue(roller, fields, name, who, words);
        taken[name] = value;
        const negative = (sign === "-") !== (value < 0);
        return `${negative ? "-" : sign === "" ? "" : "+"}${Math.abs(value)}`;
    });
    return { notation: replaced, taken };
}

/** Refuses a score the system shows with a modifier beside it, such as str with str-mod (DAT-2): a roll adds the modifier, and 1d20+str would add the score. */
function checkNotScore(roller: { world: World; page: Page; } | undefined, system: GameSystem | undefined, fields: Record<string, unknown> | undefined, name: string): void
{
    const entry = system?.sheet.flatMap((group) => group.entries).find((candidate) => candidate.beside !== undefined && comparableText(candidate.field) === comparableText(name));
    const read = (field: string): unknown => Object.entries(fields ?? {}).find(([key]) => comparableText(key) === comparableText(field))?.[1];
    const modifier = entry?.beside === undefined ? undefined : numberOf(read(entry.beside));

    if (roller !== undefined && entry?.beside !== undefined && modifier !== undefined) {
        const worked = `${entry.beside} ${signedText(roller.world, entry.beside, modifier)}`;
        throw new Error(`${name} ${String(read(name))} is a score: the system ${system?.name ?? ""} works out ${worked} from it, which is what a roll adds, such as 1d20+${entry.beside}. Nothing rolled.`);
    }
}

/** The whole number a field holds on the sheet of who rolls; refused, with the numbers it has, when there is no sheet or it holds none. */
function sheetValue(roller: { world: World; page: Page; } | undefined, fields: Record<string, unknown> | undefined, name: string, who: string | undefined, words: boolean): number
{
    const page = roller?.page;

    if (roller === undefined || fields === undefined || page === undefined) {
        throw new Error(
            who === undefined
                ? `"${name}" is no die: to take it from a sheet, give who rolls, such as who Bruna; or give the number, such as 1d20+5.`
                : `There is no page named ${who}, nor a copy of that name in the open scene, to take ${name} from: give who as the name of a character, or the number in the notation.`,
        );
    }

    const value = Object.entries(fields).find(([field]) => comparableText(field) === comparableText(name))?.[1];
    const number = numberOf(value);

    if (value === undefined) {
        const numbers = workedFields(roller.world, fields).map((worked) => `${worked.field} ${signedText(roller.world, worked.field, worked.value)}`);
        const has = numbers.length === 0 ? "" : ` Its numbers: ${numbers.join(", ")}.`;
        const subtraction = /-\d+$/.test(name) ? " To subtract, put spaces around the minus, such as 1d20+athletics - 1." : "";
        const hyphens = words ? " A name of several words is written with hyphens, such as sleight-of-hand." : "";
        throw new Error(`${page.name} has no ${name}.${has} Give one of them, or the number, such as 1d20+5.${subtraction}${hyphens}${missingSystemHint(roller.world)}`);
    }

    if (number === undefined || !Number.isInteger(number)) {
        throw new Error(`${name} on ${page.name} is ${JSON.stringify(value)}, not a whole number: give the number in the notation.`);
    }

    return number;
}

/**
 * "Lena has Poisoned, Bless, exhaustion 1: see whether they change this roll.": the effects on who rolls that are not already in their numbers, being no more
 * than a name, and the conditions (DAT-6); then the fields of their line written with ?, when they are not at zero (DAT-8).
 */
function rollerNote(world: World, system: GameSystem | undefined, page: Page): string | undefined
{
    const fields = effectiveFields(world, page);
    const effects = effectsOf(page).filter((effect) => effect.values.length === 0 || sameName(system?.conditions ?? [], effect.name) !== undefined);
    const marked = (system?.statusLine ?? []).filter((entry) => entry.whenSet).flatMap((entry) => {
        const value = Object.entries(fields).find(([field]) => comparableText(field) === comparableText(entry.field))?.[1];
        const number = readCounter(value)?.value ?? numberOf(value);
        return number === undefined || number === 0 ? [] : [`${entry.field} ${number}`];
    });
    const all = [...effects.map((effect) => effect.name), ...marked];
    return all.length === 0 ? undefined : `${page.name} has ${all.join(", ")}: if they change this roll, complete it: roll only what they add, such as one more die, and keep this one; never roll it again.`;
}

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
