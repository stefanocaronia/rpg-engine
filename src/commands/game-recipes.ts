// The recipes of a game system (D-185, DAT-4): which pages a rest goes to, the effects it ends, the fields it brings back, and what it leaves to the master.
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import type { Effect } from "../effects/index.ts";
import { isDeclaredUncounted, isInParty, locate, type Page, type World } from "../pages/index.ts";
import type { GameSystem, Recipe } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";
import { formulaValue, refillAmount } from "./worked-out.ts";

/** The recipe of the game system with this name, with the system; refused, with those it has, when it has none. */
export function recipeNamed(system: GameSystem | undefined, name: string): { system: GameSystem; recipe: Recipe; }
{
    const recipe = system?.recipes.find((candidate) => comparableText(candidate.name) === comparableText(name.trim()));

    if (system === undefined || recipe === undefined) {
        const recipes = system === undefined || system.recipes.length === 0 ? "" : ` Its recipes: ${system.recipes.map((candidate) => candidate.name).join(", ")}.`;
        throw new Error(`${system === undefined ? "The campaign has no game system, so it has no" : `The system ${system.name} has no`} recipe "${name.trim()}".${recipes} Nothing changed.`);
    }

    return { system, recipe };
}

/** The pages a recipe without a page goes to: the living player characters, and the living companions where one of them is. */
export function partyPages(world: World): Page[]
{
    const players = world.pages.filter((page) => isInParty(page) && page.fields.role === "pc");
    const places = new Set(players.map((page) => locate(world, page).chain[0]?.name));
    const companions = world.pages.filter((page) => isInParty(page) && page.fields.role === "companion" && places.has(locate(world, page).chain[0]?.name));
    return [...players, ...companions];
}

/** The effects of a page split by the recipe: those that last until one of its occasions, which it ends (DAT-5), and the others. */
export function effectsAtRecipe(page: Page, recipe: Recipe): { ending: Effect[]; remaining: Effect[]; }
{
    const ends = (effect: Effect): boolean => {
        const end = effect.end;
        return end !== undefined && "occasion" in end && recipe.ends.some((occasion) => comparableText(occasion) === comparableText(end.occasion));
    };

    const effects = effectsOf(page);
    return { ending: effects.filter(ends), remaining: effects.filter((effect) => !ends(effect)) };
}

/**
 * The counters of a page that the recipe brings back, as the page reads them, with the value each goes to (DAT-4, DAT-9): "max", which a counter without a
 * maximum cannot take, or a value. Those it names, then the uses whose occasion it ends, as much as their refill gives, then those it regains, when no choice
 * is left to the player.
 */
export function recipeTargets(world: World, recipe: Recipe, page: Page): { field: string; target: "max" | number; }[]
{
    const fields = effectiveFields(world, page);
    const named = Object.entries(fields).flatMap(([field, value]) => {
        const target = targetOf(recipe, field);
        const counter = isDeclaredUncounted(world, field) ? undefined : readCounter(value);
        return target === undefined || counter === undefined || (target === "max" && counter.max === undefined) ? [] : [{ field, target }];
    });
    const refilled = Object.entries(fields).flatMap(([field, value]) => {
        const counter = isDeclaredUncounted(world, field) || targetOf(recipe, field) !== undefined ? undefined : readCounter(value);
        const amount = counter?.max === undefined ? undefined : refillAmount(world, fields, field, recipe.ends, counter.max);
        return counter?.max === undefined || amount === undefined || amount === 0 || counter.value >= counter.max ? [] : [{ field, target: Math.min(counter.max, counter.value + amount) }];
    });
    return [...named, ...refilled, ...regainsOf(world, recipe, fields).flatMap((pool) => pool.targets)];
}

/**
 * What a recipe's regain leaves to the player (DAT-4): "which hit-dice come back, up to 2 of hit-dice-d10 1/3, hit-dice-d6 0/2", when fewer
 * come back than are spent, in more than one counter.
 */
export function recipeChoices(world: World, recipe: Recipe, page: Page): string[]
{
    return regainsOf(world, recipe, effectiveFields(world, page)).flatMap((pool) => (pool.choice === undefined ? [] : [pool.choice]));
}

/**
 * The page's other counters away from their usual value, which the recipe leaves to the master: their maximum, or zero for those the status line shows only
 * when they are not, such as exhaustion; each with the rule of a threshold it is at, or of one without a value, as in "exhaustion 1/6 (rules "Exhaustion")".
 */
export function notBroughtBack(world: World, system: GameSystem, recipe: Recipe, page: Page): string[]
{
    const atZero = (field: string): boolean => system.statusLine.some((entry) => entry.whenSet && comparableText(entry.field) === comparableText(field));

    return Object.entries(effectiveFields(world, page)).flatMap(([field, value]) => {
        // What the recipe sets, or leaves to the player among what it regains, is not left to the master.
        const handled = targetOf(recipe, field) !== undefined || regainOf(recipe, field) !== undefined;
        const counter = isDeclaredUncounted(world, field) || handled ? undefined : readCounter(value);

        if (counter?.max === undefined || counter.value === (atZero(field) ? 0 : counter.max)) {
            return [];
        }

        // The rule of a threshold that holds at every value, or at this one.
        const rule = system.thresholds.find((threshold) => comparableText(threshold.field) === comparableText(field) && (threshold.value === undefined || threshold.value === counter.value))?.rule;
        return [`${field} ${String(value).trim()}${rule === undefined ? "" : ` (rules "${rule}")`}`];
    });
}

/**
 * The regains of a recipe on these fields (DAT-4): for each, the counters it names that are spent and how many come back in all. When all that is spent comes
 * back, or only one counter is spent, they are targets; otherwise the player chooses.
 */
function regainsOf(world: World, recipe: Recipe, fields: Record<string, unknown>): { targets: { field: string; target: number; }[]; choice?: string; }[]
{
    return Object.entries(recipe.regain).flatMap(([name, formula]) => {
        const spent = Object.entries(fields).flatMap(([field, value]) => {
            const counter = isDeclaredUncounted(world, field) || !matches(name, field) ? undefined : readCounter(value);
            return counter?.max === undefined || counter.value >= counter.max ? [] : [{ field, value: counter.value, max: counter.max }];
        });
        const budget = Math.max(0, Math.floor(formulaValue(world, fields, formula) ?? 0));
        const missing = spent.reduce((total, counter) => total + counter.max - counter.value, 0);

        if (spent.length === 0 || budget === 0) {
            return [];
        }

        if (missing <= budget || spent.length === 1) {
            return [{ targets: spent.map((counter) => ({ field: counter.field, target: Math.min(counter.max, counter.value + budget) })) }];
        }

        const counters = spent.map((counter) => `${counter.field} ${counter.value}/${counter.max}`).join(", ");
        return [{ targets: [], choice: `which ${name.replace(/-?\*$/, "")} come back, up to ${budget} of ${counters}: change each one by what they take` }];
    });
}

/** The regain of a recipe that names a field, by its name or by a name ending in *. */
function regainOf(recipe: Recipe, field: string): string | undefined
{
    return Object.keys(recipe.regain).find((name) => matches(name, field));
}

function matches(name: string, field: string): boolean
{
    return name.endsWith("*") ? comparableText(field).startsWith(comparableText(name.slice(0, -1))) : comparableText(name) === comparableText(field);
}

/** What a recipe asks of a field: "max", a value, or nothing; a name ending in * stands for every field that begins so, such as slots-*. */
function targetOf(recipe: Recipe, field: string): "max" | number | undefined
{
    const entry = Object.entries(recipe.set).find(([name]) => name.endsWith("*") ? comparableText(field).startsWith(comparableText(name.slice(0, -1))) : comparableText(name) === comparableText(field));
    return entry?.[1];
}
