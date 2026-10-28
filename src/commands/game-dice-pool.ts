// A pool of dice a rest lets one spend to recover (D-449, D-513 (6)), as a counter of d6: each rolled with what the recipe adds, given to a counter, taken from
// its own.
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { rollDice } from "../dice/index.ts";
import { concernsPlayer, findPage, isPartyMember, type Page, withPage, type World, writePage } from "../pages/index.ts";
import type { GameSystem, Recipe } from "../systems/index.ts";
import { effectGiving, effectiveFields, effectsOf, withValue } from "./effect-layer.ts";
import { saveEffects } from "./game-effects.ts";
import { behindTheScreen, screenNote, sealHiddenRoll } from "./game-master-rolls.ts";
import { allSaid, packagesCounterChanged } from "./game-package-hooks.ts";
import { thresholdNotes } from "./game-thresholds.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { formulaValue } from "./worked-out.ts";

/** Dice spent: the line that says it, with the rules they touched; the faces, what each die adds and what they gave, and the id of the roll's line in the log. */
export interface DiceSpent
{
    text: string;
    notes: string[];
    faces: number[];
    adds: number;
    total: number;
    id: string;
}

/** A counter of dice a recipe lets a page spend, as stamina-d6 3/5: its die, what each adds, and the counter it gives to. */
export interface RestDice
{
    field: string;
    sides: number;
    value: number;
    max: number;
    adds: number;
    gives: string;
}

/**
 * Spends dice of a counter named after its die, as stamina-d6, in a recipe that lets one (D-449): each die rolled with what the recipe adds, at least 0, the
 * total given to its counter up to the maximum, the dice taken from theirs, each on the effect that gives it, if one does (EFF-7); the line that says it, with the
 * rules a party member's counters touch (DAT-3). `how` gives the why, the check that names the roll in the log, as the player's own rolls are named (ASK-14),
 * and the faces of physical dice, one for each die (ASK-8). Refused when the recipe spends no such counter, there are not as many, or the faces are not one a die.
 */
export function spendDice(
    root: string,
    context: Context,
    world: World,
    spending: { system: GameSystem; recipe: Recipe; },
    name: string,
    field: string,
    amount: unknown,
    how: { why: string; check?: string; values?: number[]; },
): DiceSpent
{
    const { system, recipe } = spending;
    const rule = spendRule(recipe, field);
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

    const { why, check, values } = how;

    if (values !== undefined && values.length !== count) {
        throw new Error(`Give one face for each die spent: ${count} ${field}, ${values.length} ${values.length === 1 ? "face" : "faces"}. Nothing changed.`);
    }

    const roll = rollDice(`${count}d${sides}`, values === undefined ? { random: context.random } : { values });
    const adds = formulaValue(world, fields, rule.adds) ?? 0;
    const healed = roll.faces.reduce((total, face) => total + Math.max(0, face + adds), 0);
    const target = readCounter(valueNamed(fields, rule.gives)) ?? { value: 0 };
    const after = Math.min(target.value + healed, target.max ?? Number.POSITIVE_INFINITY);
    const written = (counter: { value: number; max?: number; }): number | string => (counter.max === undefined ? counter.value : formatCounter({ value: counter.value, max: counter.max }));
    const layers = writeCounters(root, context, world, page, [[field, written({ ...dice, value: dice.value - count })], [rule.gives, written({ ...target, value: after })]]);
    // What the dice add in all, in the notation as a check's bonus is, so that the page shows it beside the faces (playtest 19); each die heals at least 0.
    const added = adds * count;
    const notation = added === 0 ? roll.notation : `${roll.notation}${added > 0 ? "+" : "-"}${Math.abs(added)}`;
    const result = `${notation} = [${roll.faces.join(", ")}]${added === 0 ? "" : ` ${added > 0 ? "+" : "-"} ${Math.abs(added)}`}, ${healed}`;
    // Dice of someone the party does not hold stay behind the screen, as master-rolls says (D-287); their counters are seen where the player sees them.
    const hidden = values === undefined && behindTheScreen(root, context, page.name);
    const counters = concernsPlayer(world, page) ? "public" : "hidden";
    const entry = newDatedLogEntry(root, context, "roll", hidden ? "hidden" : "public", {
        notation,
        total: healed,
        result,
        why,
        who: page.name,
        ...(check === undefined ? {} : { check }),
        physical: values !== undefined,
        dice: roll.dice,
    });

    if (hidden) {
        sealHiddenRoll(entry, result, context);
    }

    appendLogEntry(root, entry);

    for (const [changed, before, now] of [[field, dice.value, dice.value - count], [rule.gives, target.value, after]] as const) {
        const data = { page: page.name, field: changed, effect: layers.get(changed), before: String(before), after: String(now), why };
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", counters, data));
    }

    const max = (counter: { max?: number; }): string => (counter.max === undefined ? "" : `/${counter.max}`);
    const notes = isPartyMember(page)
        ? [[field, dice.value, dice.value - count], [rule.gives, target.value, after]].flatMap(([changed, before, now]) => thresholdNotes(root, system, String(changed), { before, after: now, amount: {} }))
        : [];
    // What the counter regained sets off in the packages' code, as a game's down point (D-448).
    const hooked = allSaid(packagesCounterChanged(root, context, { page: page.name, field: rule.gives, before: target.value, after, lost: 0, ...(target.max === undefined ? {} : { max: target.max }) }));
    const within = (changed: string): string => (layers.get(changed) === undefined ? "" : ` in ${layers.get(changed)}`);
    const line = `${page.name} spends ${count} ${field}: ${result}; ${rule.gives} ${target.value}${max(target)} → ${after}${max(target)}${within(rule.gives)}; ${field} ${dice.value}${max(dice)} → ${dice.value - count}${max(dice)}${
        within(field)
    }.`;
    return { text: [hidden ? `${line} ${screenNote}` : line, ...notes, ...hooked].join("\n"), notes: [...notes, ...hooked], faces: roll.faces, adds, total: healed, id: entry.id };
}

/** The counters of dice a recipe lets this page spend, as the page reads them, with a maximum above 0: those at 0 too, as a page shows them spent. */
export function restDice(world: World, recipe: Recipe, page: Page): RestDice[]
{
    const fields = effectiveFields(world, page);
    return Object.entries(fields).flatMap(([field, value]) => {
        const rule = spendRule(recipe, field);
        const sides = Number(/d(\d+)$/i.exec(field.trim())?.[1]);
        const counter = rule === undefined || !Number.isSafeInteger(sides) ? undefined : readCounter(value);
        return rule === undefined || counter?.max === undefined || counter.max <= 0
            ? []
            : [{ field, sides, value: counter.value, max: counter.max, adds: formulaValue(world, fields, rule.adds) ?? 0, gives: rule.gives }];
    });
}

/** The counters of dice worth spending, as stamina-d6 2/3: some left, and the counter they give to below its maximum, where they would give something. */
export function spendableDice(world: World, recipe: Recipe, page: Page): string[]
{
    const fields = effectiveFields(world, page);
    return restDice(world, recipe, page).filter((dice) => {
        const target = readCounter(valueNamed(fields, dice.gives));
        return dice.value > 0 && (target?.max === undefined || target.value < target.max);
    }).map((dice) => `${dice.field} ${dice.value}/${dice.max}`);
}

/**
 * Writes counters of a page, each on the effect that gives it, under which the page keeps its own (EFF-7), else on the page: the name of the effect each was
 * written on.
 */
function writeCounters(root: string, context: Context, world: World, page: Page, values: [string, number | string][]): Map<string, string>
{
    const layers = new Map(values.flatMap(([field]) => {
        const layer = effectGiving(page, field);
        return layer === undefined ? [] : [[field, layer.name] as const];
    }));
    let current = { world, page };

    if (layers.size > 0) {
        const effects = effectsOf(page).map((effect) => values.reduce((changed, [field, value]) => (layers.get(field) === effect.name ? withValue(changed, field, String(value)) : changed), effect));
        const saved = saveEffects(root, context, world, { page, copy: false }, effects);
        current = saved === undefined ? current : { world: withPage(world, page, saved), page: saved };
    }

    const own = values.filter(([field]) => !layers.has(field));

    if (own.length > 0) {
        writePage(current.world, current.page.name, undefined, { set: Object.fromEntries(own) });
    }

    return layers;
}

/** What a recipe's spend says of a counter: by its name, or by a name ending in *, such as stamina-*. */
function spendRule(recipe: Recipe, field: string): Recipe["spend"][string] | undefined
{
    return Object.entries(recipe.spend).find(([pattern]) => pattern.endsWith("*") ? comparableText(field).startsWith(comparableText(pattern.slice(0, -1))) : comparableText(pattern) === comparableText(field))?.[1];
}
