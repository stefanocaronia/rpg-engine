// A recipe of the game system applied to pages, and its text
import { readSettings } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { comparableText, valueNamed } from "../../core/text.ts";
import { readCounter } from "../../counters/index.ts";
import { findPage, type Page, withPage, type World } from "../../pages/index.ts";
import type { GameSystem, Recipe } from "../../systems/index.ts";
import { campaignSystem } from "../shared/campaign/world.ts";
import { restExample } from "../shared/examples.ts";
import { checkEffectsReadable, saveEffects } from "../shared/scene/effects.ts";
import { restingEffectsNote } from "../shared/scene/reminders.ts";
import { keptRolls } from "../shared/sheet/counters.ts";
import { effectiveFields } from "../shared/sheet/effect-layer.ts";
import { spendableDice, spendDice } from "../shared/time/dice-pool.ts";
import { effectsAtRecipe, notBroughtBack, partyPages, recipeChoices, recipeNamed, recipeTargets } from "../shared/time/recipes.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { counterStep } from "./amounts.ts";
import { applyStep, holderNamed, pageHolder, stepNotes, type StepOutcome } from "./holder.ts";
import { logRecipeApplied, tooSoonNote } from "./recipe-pace.ts";

/**
 * What a recipe did to a page: the effects it ended, the steps it wrote, what it leaves to the player or, for a companion, to the master (D-206), and the
 * counters it leaves to the master.
 */
export interface RecipeOutcome
{
    page: string;
    pc: boolean;
    ended: string[];
    steps: StepOutcome[];
    choices: string[];
    /** The dice the recipe lets the page spend that would give something, as hit-dice-d8 2/3, which the player chooses for the player character (ASK-14). */
    spendable: string[];
    notBroughtBack: string[];
    kept: string[];
    /** The effects without an end still on the page, which a rest may ask something of (EFF-15). */
    resting: string;
    /** Whether the recipe gave the page nothing, at 0 of what it needs or too soon after the last (RST-1). */
    barred: boolean;
}

/**
 * A recipe of the game system applied to a page, or to the living player characters and the companions with them (DAT-4). Every page is checked before any
 * is written.
 */
export function recipeResult(
    root: string,
    context: Context,
    world: World,
    input: { page?: string; field?: string; by?: unknown; spend?: unknown; to?: unknown; why?: string; recipe: string; values?: number[]; },
): { recipe: string; system: string; outcomes: RecipeOutcome[]; rules: string[]; lasts?: string; buttons?: boolean; physical?: boolean; spent?: string; }
{
    const named = campaignSystem(root, context);
    const page = input.page?.trim() === "" ? undefined : input.page;
    checkQuotedRecipe(named, input.recipe, [page, input.field]);

    // Dice the rest lets one spend, as hit dice in a short rest (D-449).
    if (input.field !== undefined && input.spend !== undefined && input.by === undefined && input.to === undefined && page !== undefined) {
        const { system, recipe } = recipeNamed(named, input.recipe);
        const why = input.why === undefined || input.why.trim() === "" ? recipe.name : input.why;
        return { recipe: recipe.name, system: system.name, outcomes: [], rules: [], spent: spendDice(root, context, world, { system, recipe }, page, input.field, input.spend, { why, values: input.values }).text };
    }

    if (input.field !== undefined || input.by !== undefined || input.spend !== undefined || input.to !== undefined || input.values !== undefined) {
        throw new Error(
            `A recipe changes by itself the fields it names: give it with the page, or alone for the player character and the companions with them, such as recipe "${restExample(named)}". Nothing changed.`,
        );
    }

    const { system, recipe } = recipeNamed(named, input.recipe);
    const pages = page === undefined ? partyPages(world) : [recipePage(root, world, page)];

    if (pages.length === 0) {
        throw new Error("There is no living player character, so a recipe without a page goes to no one: give the page. Nothing changed.");
    }

    // A page given was checked when it was found; each must still be the only one of its name, and its effects must read.
    for (const candidate of pages) {
        findPage(world, candidate.name);
        checkEffectsReadable(candidate);
    }

    const why = input.why === undefined || input.why.trim() === "" ? recipe.name : input.why;
    let current = world;
    const outcomes = pages.map((candidate) => {
        const applied = recipeOn(root, context, current, system, recipe, candidate.name, why);
        current = applied.world;
        return applied.outcome;
    });
    // Where the dashboard serves a page, the player spends their dice there with ask (ASK-14); with physical dice, they roll their own (ASK-8).
    const physical = readSettings(root).dice === "physical";
    return { recipe: recipe.name, system: system.name, outcomes, rules: recipe.rules, lasts: recipe.lasts, buttons: context.page?.spendDice !== undefined, physical };
}

/**
 * A recipe applied to one page (DAT-4): the effects that last until one of its occasions end first (DAT-5), then each field it names goes to its maximum or to
 * its value, as change sets it.
 */
function recipeOn(root: string, context: Context, world: World, system: GameSystem, recipe: Recipe, name: string, why: string): { outcome: RecipeOutcome; world: World; }
{
    let current = world;
    const start = pageHolder(current, pageCalled(current, name));
    const { ending, remaining } = effectsAtRecipe(start.page, recipe);

    if (ending.length > 0) {
        const written = saveEffects(root, context, current, { page: start.page, copy: false }, remaining);

        for (const effect of ending) {
            appendLogEntry(root, newDatedLogEntry(root, context, "effect-ended", start.visibility, { page: name, effect: effect.name, why }));
        }

        current = written === undefined ? current : withPage(current, start.page, written);
    }

    const steps: StepOutcome[] = [];
    // A rest that needs a counter above 0, as a long rest hit points, gives nothing to who has none when it begins (D-449).
    const needed = recipe.needs === undefined ? undefined : readCounter(valueNamed(effectiveFields(current, pageCalled(current, name)), recipe.needs));
    const atZero = needed !== undefined && needed.value <= 0;
    // Nor to who had one too recently, as a second long rest within 24 hours (RST-1).
    const tooSoon = atZero ? undefined : tooSoonNote(root, recipe, name);
    const barred = atZero || tooSoon !== undefined;

    for (const { field, target } of barred ? [] : recipeTargets(current, recipe, pageCalled(current, name))) {
        const holder = pageHolder(current, pageCalled(current, name));
        const step = counterStep({ to: target }, effectiveFields(current, holder.page)[field], name, field, undefined);

        if (String(step.after) !== String(step.before)) {
            const applied = applyStep(root, context, current, holder, field, step, why, system);
            steps.push(applied.outcome);
            current = applied.world;
        }
    }

    const outcome = {
        page: name,
        pc: pageCalled(current, name).fields.role === "pc",
        ended: ending.map((effect) => effect.name),
        steps,
        choices: recipeChoices(current, recipe, pageCalled(current, name)),
        spendable: barred ? [] : spendableDice(current, recipe, pageCalled(current, name)),
        notBroughtBack: notBroughtBack(current, system, recipe, pageCalled(current, name)),
        kept: keptRolls(current, pageCalled(current, name)).map(([field, values]) => `${field} ${values.join(", ")}`),
        barred,
        resting: [atZero ? `At 0 ${recipe.needs ?? ""} when it began, ${name} gains nothing from it.` : tooSoon ?? "", restingEffectsNote(pageCalled(current, name))].filter((note) => note !== "").join(" "),
    };

    if (!barred) {
        logRecipeApplied(root, context, recipe, name, start.visibility);
    }

    return { outcome, world: current };
}

/** The page with this name, which a recipe has just checked or written. */
function pageCalled(world: World, name: string): Page
{
    const page = findPage(world, name);

    if (page === undefined) {
        throw new Error(`There is no page named ${name}. Look for it with the find command.`);
    }

    return page;
}

/** "--recipe long rest" without quotes reads rest as the page or the field: refused, with the quotes to give. */
function checkQuotedRecipe(system: GameSystem | undefined, recipe: string, rest: (string | undefined)[]): void
{
    const known = (name: string): boolean => (system?.recipes ?? []).some((candidate) => comparableText(candidate.name) === comparableText(name));
    const words = rest.filter((word) => word !== undefined);
    const joined = [...words.map((word) => `${recipe} ${word}`), [recipe, ...words].join(" ")].find(known);

    if (!known(recipe) && joined !== undefined) {
        throw new Error(`Put the recipe's name in quotes, such as recipe "${joined}". Nothing changed.`);
    }
}

/** The page a recipe goes to: a page of the campaign, never a copy in the scene. */
function recipePage(root: string, world: World, name: string): Page
{
    const holder = holderNamed(root, world, name);

    if (holder.kind === "copy") {
        throw new Error(`${holder.page.name} is a copy in the scene: a recipe goes to pages, such as the characters who rest. Nothing changed.`);
    }

    return holder.page;
}

/**
 * "Long rest (a recipe of the system 5e):", then for each page what ended and changed, as in "Ennio: Prosciugato ended; hp 8/12 → 12/12. Not brought back:
 * hit-dice 1/3.", with the thresholds it touched; the rules for the rest; the game date, which a recipe does not move.
 */
export function recipeText(result: { recipe: string; system: string; outcomes: RecipeOutcome[]; rules: string[]; lasts?: string; buttons?: boolean; physical?: boolean; }): string
{
    const notes = result.outcomes.flatMap((outcome) => outcome.steps.flatMap(stepNotes));
    const lines = result.outcomes.flatMap((outcome) => {
        const done = [...outcome.ended.map((effect) => `${effect} ended`), ...outcome.steps.map(stepText)];
        const left = outcome.notBroughtBack.length === 0 ? "" : ` Not brought back: ${outcome.notBroughtBack.join(", ")}.`;
        // The player chooses and rolls for the player character, the master for a companion (D-206, D-213).
        const chosen = [...outcome.choices.map((choice) => ` ${outcome.pc ? "Ask the player" : `Choose for ${outcome.page}`}: ${choice}.`), spendText(outcome, result)].join("");
        // Rolls kept for later: if this rest brings them back, they are rolled again (KEP-4).
        const roller = outcome.pc ? "the player rolls" : "roll";
        const kept = outcome.kept.length === 0 ? "" : ` ${outcome.page} keeps ${outcome.kept.join("; ")}: if this rest brings them back, ${roller} them again, with roll and keep.`;
        const resting = outcome.resting === "" ? "" : ` ${outcome.resting}`;
        return [`${outcome.page}: ${done.length === 0 ? "nothing changed" : done.join("; ")}.${chosen}${left}${kept}${resting}`, ...outcome.steps.flatMap(stepNotes).filter((note) => !note.includes("\n"))];
    });
    const rules = result.rules.length === 0 ? "" : `For the rest, read ${result.rules.map((rule) => `rules "${rule}"`).join(" and ")}.`;
    const title = `${result.recipe.charAt(0).toUpperCase()}${result.recipe.slice(1)} (a recipe of the system ${result.system}):`;
    // A refused rest has no hours to advance (D-500).
    const hours = result.outcomes.every((outcome) => outcome.barred)
        ? ""
        : `The game date did not move: apply a rest once its hours${result.lasts === undefined ? "" : ` (${result.lasts})`} have passed; if they have not yet, advance them now.`;
    const text = [title, ...lines, rules, hours].filter((line) => line !== "").join("\n");
    return [text, ...notes.filter((note) => note.includes("\n"))].join("\n\n");
}

/**
 * The dice a rest lets a page spend, left to who chooses them (ASK-14): the player for the player character, with ask's buttons where they are, the master for
 * a companion.
 */
function spendText(outcome: RecipeOutcome, result: { recipe: string; buttons?: boolean; physical?: boolean; }): string
{
    if (outcome.spendable.length === 0) {
        return "";
    }

    const dice = outcome.spendable.join(", ");
    const spend = `change with spend and recipe "${result.recipe}"`;

    if (!outcome.pc) {
        return ` Choose whether ${outcome.page} spends ${dice}: ${spend}.`;
    }

    if (result.physical === true) {
        return ` Ask the player how many of ${dice} they spend and roll with their own dice, then ${spend} and values, the faces they tell.`;
    }

    return result.buttons === true ? ` The player spends ${dice} on the page, one die at a time: ask with recipe "${result.recipe}", even when they already said how many.` : ` Ask the player how many of ${dice} they spend, then ${spend}.`;
}

/** "hp 20/34 → 34/34 (in Forma d'orso)": a step of a recipe, with the effect it changed on or the base the page reads again. */
function stepText(step: StepOutcome): string
{
    // A value an effect gives never goes back to a base: one of the two at most.
    const where = step.effect !== undefined ? ` (in ${step.effect})` : step.again !== undefined ? ` (again as ${step.again})` : "";
    return `${step.field} ${step.before} → ${step.after}${where}`;
}
