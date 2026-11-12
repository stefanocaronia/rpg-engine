// Dice given as by: rolled, hidden or shown, logged
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { diceProblem, rollDice } from "../../dice/index.ts";
import { isPartyMember, type World } from "../../pages/index.ts";
import { screenNote, screenUp, sealHiddenRoll } from "../shared/scene/master-rolls.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { holderNamed } from "./holder.ts";

/**
 * Dice given as by, such as -(2d6+3), rolled with the engine's dice (D-459): the sign in front is the roll's, so -(2d6+3) takes away 2d6+3, never less than 0;
 * undefined for a number, coins or any other text.
 */
export function diceBy(by: number | string | undefined, context: Context): { by: number; taking: boolean; data: { notation: string; total: number; result: string; physical: false; dice: unknown; }; } | undefined
{
    const text = typeof by === "string" ? by.replace(/\s+/g, "") : "";
    const body = text.replace(/^[+-]/, "");
    const bracketed = /^\((.*)\)$/.exec(body)?.[1];
    const notation = bracketed ?? body;

    if (!/\d*d(\d+|%|F)/i.test(notation)) {
        return undefined;
    }

    // Dice that do not read as a roll: as -(2d6)+3, with brackets around a part, the whole roll goes in them; in brackets already, what the dice say is wrong.
    const problem = diceProblem(notation);

    if (problem !== undefined) {
        throw new Error(
            bracketed === undefined
                ? `by ${String(by)} does not read as a roll: put the whole roll in brackets after the sign, such as by -(2d6+3), which takes away 2d6+3. Nothing changed.`
                : `by ${String(by)} does not read as a roll: ${problem} Nothing changed.`,
        );
    }

    // -1d8-2 reads as 1d8+2 taken away or as 1d8-2 taken away: a minus before more than one term asks for brackets (playtest 08).
    if (text.startsWith("-") && bracketed === undefined && /[+-]/.test(notation)) {
        throw new Error(`by ${String(by)} reads two ways: put the roll in brackets after the minus, such as by -(1d8+2), which takes away 1d8+2. Nothing changed.`);
    }

    const rolled = rollDice(notation, { random: context.random });
    const total = Math.max(0, rolled.total);
    return { by: text.startsWith("-") ? -total : total, taking: text.startsWith("-"), data: { notation, total: rolled.total, result: rolled.text, physical: false, dice: rolled.dice } };
}

/** The dice in by, hidden: the roll's id, the fingerprint the player may ask for, and whether master-rolls hid them. */
export interface HiddenDice
{
    id: string;
    fingerprint: string;
    screened: boolean;
}

/**
 * Why the dice in by are hidden, or undefined when shown (D-287): with their change, on a page that does not concern the player, whatever master-rolls says;
 * behind the screen, taking away from the player character or a companion, as a foe's or a trap's do. Healing them, or dice on a copy in the scene, are shown.
 */
export function diceHiding(root: string, world: World, name: string, taking: boolean): "secret" | "screen" | undefined
{
    const holder = holderNamed(root, world, name);

    if (holder.kind === "copy") {
        return undefined;
    }

    if (holder.visibility === "hidden") {
        return "secret";
    }

    return taking && screenUp(root) && isPartyMember(holder.page) ? "screen" : undefined;
}

/** Logs the roll of the dice in by, sealed when hidden as roll seals one; what the master is told of it when hidden. */
export function logDiceBy(root: string, context: Context, data: { result: string; } & Record<string, unknown>, hiding: "secret" | "screen" | undefined): HiddenDice | undefined
{
    const entry = newDatedLogEntry(root, context, "roll", hiding === undefined ? "public" : "hidden", data);
    const fingerprint = hiding === undefined ? undefined : sealHiddenRoll(entry, data.result, context);
    appendLogEntry(root, entry);
    return fingerprint === undefined ? undefined : { id: entry.id, fingerprint, screened: hiding === "screen" };
}

/** "Rolled 2d6+3 = 11 [5, 3] + 3.", or the hidden roll as roll tells it, only for the master. */
export function rolledText(rolled: string, hidden: HiddenDice | undefined): string
{
    const screen = hidden?.screened === true ? `. ${screenNote}` : "";
    return hidden === undefined ? `Rolled ${rolled}.` : `Hidden roll ${hidden.id}, only for the master: ${rolled}${screen}\nIts fingerprint, only if the player asks for it: ${hidden.fingerprint}`;
}
