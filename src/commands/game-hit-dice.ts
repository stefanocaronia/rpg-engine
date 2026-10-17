// Dice a rest lets one spend to recover (D-449), as hit dice in a short rest: rolled each with what the system adds, given to a counter, taken from theirs.
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { rollDice } from "../dice/index.ts";
import { findPage, isPartyMember, type World, writePage } from "../pages/index.ts";
import type { GameSystem, Recipe } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { systemCounterChanged } from "./game-system-code.ts";
import { thresholdNotes } from "./game-thresholds.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { formulaValue } from "./worked-out.ts";

/**
 * Spends dice of a counter named after its die, as hit-dice-d8, in a recipe that lets one (D-449): each die rolled with what the recipe adds, at least 0, the
 * total given to its counter up to the maximum, the dice taken from theirs; the line that says it, with the rules a party member's counters touch (DAT-3).
 * Refused when the recipe spends no such counter, or there are not as many.
 */
export function spendDice(root: string, context: Context, world: World, spending: { system: GameSystem; recipe: Recipe; }, name: string, field: string, amount: unknown, why: string): string
{
    const { system, recipe } = spending;
    const rule = Object.entries(recipe.spend).find(([pattern]) => pattern.endsWith("*") ? comparableText(field).startsWith(comparableText(pattern.slice(0, -1))) : comparableText(pattern) === comparableText(field))?.[1];
    const page = findPage(world, name);
    const sides = /d(\d+)$/i.exec(field.trim())?.[1];

    if (rule === undefined || sides === undefined) {
        const named = Object.keys(recipe.spend);
        throw new Error(`${recipe.name} spends ${named.length === 0 ? "no dice" : `only ${named.join(", ")}`}, not ${field}. Nothing changed.`);
    }

    if (page === undefined) {
        throw new Error(`There is no page named ${name}. Nothing changed.`);
    }

    const fields = effectiveFields(world, page);
    const dice = readCounter(valueNamed(fields, field));
    const count = typeof amount === "number" ? amount : Number(amount);

    if (dice === undefined || !Number.isSafeInteger(count) || count < 1 || count > dice.value) {
        throw new Error(`${page.name} has ${dice === undefined ? "no" : dice.value} ${field}: spend a whole number of them, from 1 up to that. Nothing changed.`);
    }

    const roll = rollDice(`${count}d${sides}`, { random: context.random });
    const adds = formulaValue(world, fields, rule.adds) ?? 0;
    const healed = roll.faces.reduce((total, face) => total + Math.max(0, face + adds), 0);
    const target = readCounter(valueNamed(fields, rule.gives)) ?? { value: 0 };
    const after = Math.min(target.value + healed, target.max ?? Number.POSITIVE_INFINITY);
    const written = (counter: { value: number; max?: number; }): number | string => (counter.max === undefined ? counter.value : formatCounter({ value: counter.value, max: counter.max }));
    writePage(world, page.name, undefined, { set: { [field]: written({ ...dice, value: dice.value - count }), [rule.gives]: written({ ...target, value: after }) } });
    const each = adds === 0 ? "" : ` ${adds > 0 ? "+" : "-"} ${Math.abs(adds)} each`;
    const result = `${roll.notation} = [${roll.faces.join(", ")}]${each}, ${healed}`;
    appendLogEntry(root, newDatedLogEntry(root, context, "roll", "public", { notation: roll.notation, total: healed, result, why, who: page.name, physical: false, dice: roll.dice }));

    for (const [changed, before, now] of [[field, dice.value, dice.value - count], [rule.gives, target.value, after]] as const) {
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: page.name, field: changed, before: String(before), after: String(now), why }));
    }

    const max = (counter: { max?: number; }): string => (counter.max === undefined ? "" : `/${counter.max}`);
    const notes = isPartyMember(page)
        ? [[field, dice.value, dice.value - count], [rule.gives, target.value, after]].flatMap(([changed, before, now]) => thresholdNotes(root, system, String(changed), { before, after: now, amount: {} }))
        : [];
    // What the counter regained sets off in the game system's code, as the 5e's dying point (D-448).
    const dying = systemCounterChanged(root, context, { page: page.name, field: rule.gives, before: target.value, after, lost: 0, ...(target.max === undefined ? {} : { max: target.max }) });
    const line = `${page.name} spends ${count} ${field}: ${result}; ${rule.gives} ${target.value}${max(target)} → ${after}${max(target)}; ${field} ${dice.value}${max(dice)} → ${dice.value - count}${max(dice)}.`;
    return [line, ...notes, ...dying].join("\n");
}
