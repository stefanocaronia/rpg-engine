// What comes back at dawn (D-571, RST-2): when time passes through the system's dawn, what the party carries below its maximum, which its text brings back, and
// who of the party had no rest of a night in its time, which the master gives if they slept. The engine gives nothing by itself.
import { readLog } from "../../../core/log.ts";
import { comparableText, valueNamed } from "../../../core/text.ts";
import { readCounter } from "../../../counters/index.ts";
import { isInParty, type Page, type World } from "../../../pages/index.ts";
import type { GameSystem, Recipe } from "../../../systems/index.ts";
import { formatGameDate, type GameDate, minutesBetween, readDuration, readGameDate } from "../../../time/index.ts";
import { effectiveFields } from "../sheet/effect-layer.ts";
import { carriedCounters, recipeTargets } from "./recipes.ts";

/** The type of the log's line that says a recipe gave a page something (RST-1). */
export const recipeAppliedType = "recipe-applied";

/** The lines of a dawn this passing of time went through, the last when it went through more; none without one, or when nothing is to say. */
export function dawnLines(root: string, world: World, system: GameSystem | undefined, from: GameDate, to: GameDate): string[]
{
    const dawn = system?.dawn === undefined ? undefined : lastDawn(from, to, system.dawn);

    if (system === undefined || dawn === undefined) {
        return [];
    }

    // Dawn comes for the whole living party, wherever each one is.
    const members = world.pages.filter(isInParty);
    const carried = members.flatMap((member) => carriedCounters(world, member).map((counter) => `${counter} (${member.name})`));
    const unrested = system.recipes.filter((recipe) => recipe.oncePer !== undefined && recipe.lasts !== undefined).flatMap((recipe) => unrestedLine(root, world, recipe, members, to));
    const counters = carried.length === 0 ? "" : ` Below their maximum, what the party carries: ${carried.join(" · ")}; what comes back at dawn, its text says: give it with change.`;
    return counters === "" && unrested.length === 0 ? [] : [`Dawn came at ${formatGameDate(dawn)}.${counters}`, ...unrested];
}

/** When a page last had a recipe that gave it something (RST-1); undefined when never. */
export function lastApplied(root: string, recipe: Recipe, page: string): GameDate | undefined
{
    const last = readLog(root).filter((entry) => entry.type === recipeAppliedType && comparableText(String(entry.data.page)) === comparableText(page) && entry.data.recipe === recipe.name).at(-1);
    return last === undefined ? undefined : readGameDate(last.date);
}

/** The last dawn after `from` and up to `to`; undefined when none falls there. */
function lastDawn(from: GameDate, to: GameDate, minute: number): GameDate | undefined
{
    const day = (to.minute ?? 0) >= minute ? to.day : to.day - 1;
    const dawn = { day, minute };
    return day >= 1 && minutesBetween(from, dawn) > 0 ? dawn : undefined;
}

/** "No long rest in the last 24h: …", for those of the party it would give something to who had none in its time (RST-1); none when no one is left. */
function unrestedLine(root: string, world: World, recipe: Recipe, members: Page[], now: GameDate): string[]
{
    const every = readDuration(recipe.oncePer ?? "") ?? 0;
    const missing = members.filter((member) => gainsFrom(world, recipe, member)).flatMap((member) => {
        const last = lastApplied(root, recipe, member.name);
        return last === undefined ? [`${member.name} (none yet)`] : minutesBetween(last, now) >= every ? [`${member.name} (last at ${formatGameDate(last)})`] : [];
    });
    return missing.length === 0 ? [] : [`No ${recipe.name} in the last ${recipe.oncePer}: ${missing.join(", ")}. If they slept, give it with change and the recipe ${recipe.name}.`];
}

/** Whether a recipe would change something on a page now: a counter it brings back that is not there yet. */
function gainsFrom(world: World, recipe: Recipe, page: Page): boolean
{
    const fields = effectiveFields(world, page);
    return recipeTargets(world, recipe, page).some(({ field, target }) => {
        const counter = readCounter(valueNamed(fields, field));
        return counter !== undefined && counter.value !== (target === "max" ? counter.max : target);
    });
}
