// The recipes of a game system (D-185, DAT-4): which pages a rest goes to, the effects it ends, the fields it brings back, and what it leaves to the master.
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import type { Effect } from "../effects/index.ts";
import { isDeclaredUncounted, isInParty, locate, type Page, type World } from "../pages/index.ts";
import type { GameSystem, Recipe } from "../systems/index.ts";
import { effectiveFields, effectsOf } from "./effect-layer.ts";

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

/** The counters of a page that the recipe names, as the page reads them, with what it asks: "max", which a counter without a maximum cannot take, or a value. */
export function recipeTargets(world: World, recipe: Recipe, page: Page): { field: string; target: "max" | number; }[]
{
    return Object.entries(effectiveFields(world, page)).flatMap(([field, value]) => {
        const target = targetOf(recipe, field);
        const counter = isDeclaredUncounted(world, field) ? undefined : readCounter(value);
        return target === undefined || counter === undefined || (target === "max" && counter.max === undefined) ? [] : [{ field, target }];
    });
}

/**
 * The page's other counters away from their usual value, which the recipe leaves to the master: their maximum, or zero for those the status line shows only
 * when they are not, such as exhaustion; each with the rule of a threshold it is at, or of one without a value, as in "exhaustion 1/6 (rules "Exhaustion")".
 */
export function notBroughtBack(world: World, system: GameSystem, recipe: Recipe, page: Page): string[]
{
    const atZero = (field: string): boolean => system.statusLine.some((entry) => entry.whenSet && comparableText(entry.field) === comparableText(field));

    return Object.entries(effectiveFields(world, page)).flatMap(([field, value]) => {
        const counter = isDeclaredUncounted(world, field) || targetOf(recipe, field) !== undefined ? undefined : readCounter(value);

        if (counter?.max === undefined || counter.value === (atZero(field) ? 0 : counter.max)) {
            return [];
        }

        // The rule of a threshold that holds at every value, or at this one.
        const rule = system.thresholds.find((threshold) => comparableText(threshold.field) === comparableText(field) && (threshold.value === undefined || threshold.value === counter.value))?.rule;
        return [`${field} ${String(value).trim()}${rule === undefined ? "" : ` (rules "${rule}")`}`];
    });
}

/** What a recipe asks of a field: "max", a value, or nothing; a name ending in * stands for every field that begins so, such as slots-*. */
function targetOf(recipe: Recipe, field: string): "max" | number | undefined
{
    const entry = Object.entries(recipe.set).find(([name]) => name.endsWith("*") ? comparableText(field).startsWith(comparableText(name.slice(0, -1))) : comparableText(name) === comparableText(field));
    return entry?.[1];
}
