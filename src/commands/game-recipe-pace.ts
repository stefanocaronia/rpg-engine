// How often a recipe gives anything (D-449, RST-1): a long rest at most once in 24 hours, counted from the last one its page had, applied once its hours have passed (D-500), not at 0 hit points.
import type { Context } from "../core/context.ts";
import { appendLogEntry, readLog } from "../core/log.ts";
import { comparableText } from "../core/text.ts";
import type { Recipe } from "../systems/index.ts";
import { addDuration, formatGameDate, minutesBetween, readDuration, readGameDate } from "../time/index.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";

const appliedType = "recipe-applied";

/** Why a page gains nothing from a recipe it had too recently (RST-1), as "Ettore had a long rest at day 2, 08:00: …"; undefined when it may have it. */
export function tooSoonNote(root: string, recipe: Recipe, page: string): string | undefined
{
    const every = recipe.oncePer === undefined ? undefined : readDuration(recipe.oncePer);
    const now = readPresent(root).date;

    if (every === undefined || now === undefined) {
        return undefined;
    }

    const last = readLog(root).filter((entry) => entry.type === appliedType && comparableText(String(entry.data.page)) === comparableText(page) && entry.data.recipe === recipe.name).at(-1);
    const then = last === undefined ? undefined : readGameDate(last.date);

    if (then === undefined || minutesBetween(then, now) >= every) {
        return undefined;
    }

    return `${page} had a ${recipe.name} at ${formatGameDate(then)}, and gains nothing from another before ${formatGameDate(addDuration(then, every))}: one in ${recipe.oncePer}.`;
}

/** Writes in the log that a recipe gave a page something, when the system counts how often it may (RST-1). */
export function logRecipeApplied(root: string, context: Context, recipe: Recipe, page: string, visibility: "public" | "hidden"): void
{
    if (recipe.oncePer !== undefined) {
        appendLogEntry(root, newDatedLogEntry(root, context, appliedType, visibility, { page, recipe: recipe.name }));
    }
}
