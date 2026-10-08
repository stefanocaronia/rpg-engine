import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry, type LogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, valueNamed, withArticle } from "../core/text.ts";
import { canSpend, changeCounter, type Counter, type CounterChange, counterLimit, formatCounter, isSafeCounter, readCounter, readCounterText } from "../counters/index.ts";
import { addCoins, type Coin, formatAmount, formatTotal, isSafePurse, namesCoins, payCoins, type Purse, readAmount, readSignedAmount, totalOf } from "../money/index.ts";
import {
    baseChain,
    baseFieldOf,
    baseValue,
    concernsPlayer,
    declaredKind,
    findPage,
    followersOf,
    inheritedFields,
    isCounterField,
    isDeclaredUncounted,
    isPartyMember,
    isStandardField,
    keepersOf,
    ownField,
    type Page,
    playerConcerns,
    systemPageNamed,
    withPage,
    type World,
    writePage,
} from "../pages/index.ts";
import type { GameSystem, Recipe } from "../systems/index.ts";
import { effectGiving, effectiveFields, effectsOf, withValue } from "./effect-layer.ts";
import { checkEffectsReadable, saveEffects } from "./game-effects.ts";
import { fireEvents, nowDueNote } from "./game-events.ts";
import { experienceOf, newLevelNotes } from "./game-experience.ts";
import { campaignCoins } from "./game-money.ts";
import { effectsAtRecipe, notBroughtBack, partyPages, recipeChoices, recipeNamed, recipeTargets } from "./game-recipes.ts";
import { checkNotCopied, checkNotSystemPage, pageOrCopy, readOpenScene, updateScene } from "./game-scene.ts";
import { thresholdNotes } from "./game-thresholds.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";
import { followersNote, keepersNote, skippedPagesNote } from "./notes.ts";
import { keptRolls } from "./page-counters.ts";
import { situationPart } from "./parts.ts";
import { computedField, computedMessage, counterLimits, hasSheet, maximumHint, maximumSources } from "./worked-out.ts";

/** What holds a counter: a page, or a copy in the open scene, seen as a page that derives from its creature (INH-14). */
interface CounterHolder
{
    page: Page;
    kind: "page" | "copy";
    /** Writes fields as the page names them; undefined removes one, and the page reads it from its base again (INH-9). */
    /** Returns the page as written, or undefined for a copy. */
    write(fields: Record<string, number | string | undefined>): Page | undefined;
    visibility: LogEntry["visibility"];
}

/** One change worked out on a counter or on money, before it is written (D-92, MON-4). */
interface Step
{
    before: number | string;
    after: number | string;
    /** How it was asked, for the log: by, spend or to, and how far it went beyond a limit. */
    amount: Record<string, unknown>;
    note: string;
    /** For money: what the purse is worth in the first coin, when it holds other coins. */
    total?: string;
    /** Whether a base's value is the one the change leads to (INH-9). */
    same(value: unknown): boolean;
}

// Whole numbers arrive as text from a command line and as numbers through MCP; other text, such as coins, stays text.
const wholeNumber = z.preprocess((value) => (typeof value === "string" && /^[+-]?\d+$/.test(value.trim()) ? Number(value) : value), z.number().int());

export const change = defineCommand({
    name: "change",
    description: "Change a counter or money on a page: hit points, uses, ammunition, supply, a progress track, an event's clock, coins. "
        + "A counter is a field written as a number (20, from 0 up) or as current/max (12/12, from 0 to the maximum); create it with write, then change it only with this command. "
        + "by adds or takes away and stops at a limit (damage, healing); spend takes what is paid or used up, and is refused when there is not enough; "
        + "to sets a value, max, or current/max (15/15 changes the maximum too), even outside the limits. "
        + 'Money is a field written in the campaign\'s coins, such as money: 34 gp 4 sp: spend "5 sp" pays and makes change, by "+20 gp" adds coins, to "10 gp" sets the purse. '
        + "recipe applies a rest of the game system, such as long rest, once you have advanced its hours: to the page, or without one to the player character and the companions with them. "
        + 'Example: page Bruna, field hp, by -7, why "bitten by the wolf"; or recipe "long rest".',
    group: "game",
    positionals: ["page", "field"],
    input: z.object({
        page: z.string().optional().describe("page that holds the counter or the money; with a recipe, left out for the player character and the companions with them"),
        field: z.string().optional().describe("the counter or the money, such as hp; none with a recipe"),
        by: z.union([wholeNumber, z.string()]).optional().describe("how much to add, or to take away when negative, or coins; on the command line write --by=-7"),
        spend: z.union([wholeNumber, z.string()]).optional().describe("how much is paid or used up, or coins"),
        to: z.union([z.number().int(), z.string()]).optional().describe("the new value: a number, max, current/max such as 15/15, or coins; on the command line write --to=-3"),
        why: z.string().optional().describe("what the change is for"),
        recipe: z.string().optional().describe("a recipe of the game system, such as long rest"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);

        if (input.recipe !== undefined) {
            return recipeResult(root, context, world, { ...input, recipe: input.recipe });
        }

        if (input.page === undefined || input.field === undefined) {
            throw new Error('Give the page and the field, such as page Bruna, field hp, by -7; or a recipe of the game system, such as recipe "long rest".');
        }

        const holder = holderNamed(root, world, input.page);
        const fields = effectiveFields(world, holder.page);
        const { coins, problem } = campaignCoins(root, context);
        const system = campaignSystem(root, context);
        const clock = holder.kind === "page" && isCounterField(holder.page.type, comparableText(input.field.trim()));
        const example = exampleValue(input, coins, clock, usuallyZero(system, input.field) || withoutMaximum(system, input.field));
        const field = fieldName(world, holder, fields, input.field, example, coins, suggestedNumber(fields, { ...input, field: input.field }));
        // A field the game system declares is never money (SYS-8).
        const purse = coins === undefined || declaredKind(world, field) !== undefined ? undefined : readAmount(fields[field], coins);
        const page = holder.page.name;

        if (problem !== undefined && typeof fields[field] === "string" && /\d+\s*\p{L}/u.test(fields[field])) {
            throw new Error(`${field} on ${page} looks like money, but the campaign's coins cannot be read: ${problem.message} To fix it, ${problem.fix}. Nothing changed.`);
        }

        const limits = { ...counterLimits(world, fields, field), hint: maximumHint(world, fields, field) };
        const step = purse !== undefined && coins !== undefined ? moneyStep(input, purse, coins, page, field) : counterStep(input, fields[field], page, field, coins, limits);
        const why = input.why?.trim() === "" ? undefined : input.why;
        return { ...applyStep(root, context, world, holder, field, step, why, system).outcome, problems: world.problems };
    },

    format(result)
    {
        if ("recipe" in result) {
            return recipeText(result);
        }

        const note = result.note === "" ? "" : `: ${result.note}`;
        const after = `${result.after}${result.total === undefined ? "" : ` (${result.total})`}`;
        const summary = result.changed ? `${result.page}: ${result.field} ${result.before} → ${after}${note}.` : `Nothing changed: ${result.field} on ${result.page} is ${after}${note}.`;
        // A rule's text, of several lines, comes after the lines of the change.
        const notes = stepNotes(result);
        const lines = [summary, ...notes.filter((line) => !line.includes("\n"))];
        return [lines.join("\n"), ...notes.filter((line) => line.includes("\n")), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** What a step did to a counter or to money. */
interface StepOutcome
{
    page: string;
    field: string;
    before: string;
    after: string;
    total?: string;
    /** "in Forma d'orso; at max; again as Lupo": the effect it changed on, the limit it reached, the base whose value the page reads again. */
    note: string;
    effect?: string;
    again?: string;
    changed: boolean;
    due: ReturnType<typeof fireEvents>["due"];
    followers: string[];
    keepers: string[];
    thresholds: string[];
}

/**
 * What a recipe did to a page: the effects it ended, the steps it wrote, what it leaves to the player or, for a companion, to the master (D-206), and the
 * counters it leaves to the master.
 */
interface RecipeOutcome
{
    page: string;
    pc: boolean;
    ended: string[];
    steps: StepOutcome[];
    choices: string[];
    notBroughtBack: string[];
    kept: string[];
}

/**
 * Writes a step: on the effect that gives the field (EFF-7), else on the page, from which the field goes when it comes back to its base's value (INH-9); with
 * its line in the log and those of the pages that read it from this one (INH-10), the events it sets off (EVT-4) and the thresholds it touches (DAT-3).
 * Returns the world as written, for a next step.
 */
function applyStep(
    root: string,
    context: Context,
    world: World,
    holder: CounterHolder,
    field: string,
    step: Step,
    why: string | undefined,
    system: GameSystem | undefined,
): { outcome: StepOutcome; world: World; }
{
    const page = holder.page.name;
    checkClock(holder.page, field, step.after);
    const written = ownField(holder.page, field) ?? field;
    // A value an effect gives changes on the effect, under which the page keeps its own (EFF-7).
    const layer = effectGiving(holder.page, field);
    // A maximum written by hand that is not the system's is put right even when the value reads the same, as validate's fix asks (FOR-6).
    const workedMax = holder.kind === "page" && counterLimits(world, inheritedFields(world, holder.page), field).max !== undefined;
    const stale = layer === undefined && workedMax && Object.hasOwn(holder.page.fields, written) && String(holder.page.fields[written]) !== String(storedCounter(world, holder, field, step.after));
    const changed = String(step.after) !== String(step.before) || stale;
    const base = layer === undefined ? baseValue(world, holder.page, field) : undefined;
    const backToBase = changed && base !== undefined && step.same(base.value);
    const followers = changed && holder.kind === "page" && layer === undefined ? followersOf(world, holder.page, field) : [];
    const keepers = changed && holder.kind === "page" && layer === undefined ? keepersOf(world, holder.page, field).map((keeper) => `${keeper.name} (${field} ${String(counterOf(world, keeper, field))})`) : [];

    let after: Page | undefined;

    if (changed) {
        // Back to the base's value, the field goes in every spelling the page wrote it, so that the page reads the base's (INH-5, INH-9).
        const spellings = Object.keys(holder.page.fields).filter((name) => comparableText(name) === comparableText(field));

        if (layer === undefined) {
            after = holder.write(backToBase ? Object.fromEntries(spellings.map((name) => [name, undefined])) : { [written]: storedCounter(world, holder, field, step.after) });
        } else {
            const effects = effectsOf(holder.page).map((effect) => (effect.name === layer.name ? withValue(effect, field, String(step.after)) : effect));
            after = saveEffects(root, context, world, { page: holder.page, copy: holder.kind === "copy" }, effects);
        }

        const data = { page, copy: holder.kind === "copy" ? true : undefined, field, effect: layer?.name, before: step.before, after: step.after, ...step.amount, why };
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", holder.visibility, data));
        logFollowers(root, world, context, followers, { field, before: step.before, after: step.after });
    }

    const again = backToBase ? base?.base.name : undefined;
    const note = [layer === undefined ? "" : `in ${layer.name}`, step.note, again === undefined ? "" : `again as ${again}`].filter((part) => part !== "").join("; ");
    const updated = after === undefined ? world : withPage(world, holder.page, after);
    // Only an event's clock sets anything off when it changes (EVT-4).
    const due = after !== undefined && layer === undefined && isCounterField(after.type, field) ? fireEvents(root, context, world, updated, readPresent(root).date).due : [];
    // The rules a counter of the player character or a companion touches (DAT-3): never for a copy, nor for a page that is not in the party.
    const touched = changed || (step.amount.beyond ?? 0) !== 0;
    const party = holder.kind === "page" && isPartyMember(holder.page);
    // Points that reach a new level are said with the rule to read (PRO-6).
    const companion = holder.page.fields.role === "companion";
    const levelUp = (): string => situationPart("level-up", context, system);
    const levels = changed && party && after !== undefined
        ? newLevelNotes(page, experienceOf(world, effectiveFields(world, holder.page)), experienceOf(updated, effectiveFields(updated, after)), companion, levelUp)
        : [];
    const thresholds = [...(touched && party ? thresholdNotes(root, system, field, step, layer?.name) : []), ...levels];
    const outcome = {
        page,
        field,
        before: String(step.before),
        after: String(step.after),
        total: step.total,
        note,
        effect: layer?.name,
        again,
        changed,
        due,
        followers: followers.map((follower) => follower.name),
        keepers,
        thresholds,
    };
    return { outcome, world: updated };
}

/** What else a step says: the thresholds it touches, the events it sets off, the pages that changed with it, and those that keep their own. */
function stepNotes(step: StepOutcome): string[]
{
    const followers = followersNote(step.followers, `since they read ${step.field} from ${step.page}`, "change", `${step.field} ${step.after}`);
    return [...step.thresholds, nowDueNote(step.due), followers, keepersNote(step.keepers, step.field)].filter((note) => note !== "");
}

/**
 * A recipe of the game system applied to a page, or to the living player characters and the companions with them (DAT-4). Every page is checked before any
 * is written.
 */
function recipeResult(
    root: string,
    context: Context,
    world: World,
    input: { page?: string; field?: string; by?: unknown; spend?: unknown; to?: unknown; why?: string; recipe: string; },
): { recipe: string; system: string; outcomes: RecipeOutcome[]; rules: string[]; }
{
    const named = campaignSystem(root, context);
    const page = input.page?.trim() === "" ? undefined : input.page;
    checkQuotedRecipe(named, input.recipe, [page, input.field]);

    if (input.field !== undefined || input.by !== undefined || input.spend !== undefined || input.to !== undefined) {
        throw new Error('A recipe changes by itself the fields it names: give it with the page, or alone for the player character and the companions with them, such as recipe "long rest". Nothing changed.');
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
    return { recipe: recipe.name, system: system.name, outcomes, rules: recipe.rules };
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

    for (const { field, target } of recipeTargets(current, recipe, pageCalled(current, name))) {
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
        notBroughtBack: notBroughtBack(current, system, recipe, pageCalled(current, name)),
        kept: keptRolls(current, pageCalled(current, name)).map(([field, values]) => `${field} ${values.join(", ")}`),
    };
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
function recipeText(result: { recipe: string; system: string; outcomes: RecipeOutcome[]; rules: string[]; }): string
{
    const notes = result.outcomes.flatMap((outcome) => outcome.steps.flatMap(stepNotes));
    const lines = result.outcomes.flatMap((outcome) => {
        const done = [...outcome.ended.map((effect) => `${effect} ended`), ...outcome.steps.map(stepText)];
        const left = outcome.notBroughtBack.length === 0 ? "" : ` Not brought back: ${outcome.notBroughtBack.join(", ")}.`;
        // The player chooses and rolls for the player character, the master for a companion (D-206, D-213).
        const chosen = outcome.choices.map((choice) => ` ${outcome.pc ? "Ask the player" : `Choose for ${outcome.page}`}: ${choice}.`).join("");
        // Rolls kept for later: if this rest brings them back, they are rolled again (KEP-4).
        const roller = outcome.pc ? "the player rolls" : "roll";
        const kept = outcome.kept.length === 0 ? "" : ` ${outcome.page} keeps ${outcome.kept.join("; ")}: if this rest brings them back, ${roller} them again, with roll and keep.`;
        return [`${outcome.page}: ${done.length === 0 ? "nothing changed" : done.join("; ")}.${chosen}${left}${kept}`, ...outcome.steps.flatMap(stepNotes).filter((note) => !note.includes("\n"))];
    });
    const rules = result.rules.length === 0 ? "" : `For the rest, read ${result.rules.map((rule) => `rules "${rule}"`).join(" and ")}.`;
    const title = `${result.recipe.charAt(0).toUpperCase()}${result.recipe.slice(1)} (a recipe of the system ${result.system}):`;
    const text = [title, ...lines, rules, "The game date did not move: advance the hours of the rest, if you have not yet."].filter((line) => line !== "").join("\n");
    return [text, ...notes.filter((note) => note.includes("\n"))].join("\n\n");
}

/** "hp 20/34 → 34/34 (in Forma d'orso)": a step of a recipe, with the effect it changed on or the base the page reads again. */
function stepText(step: StepOutcome): string
{
    // A value an effect gives never goes back to a base: one of the two at most.
    const where = step.effect !== undefined ? ` (in ${step.effect})` : step.again !== undefined ? ` (again as ${step.again})` : "";
    return `${step.field} ${step.before} → ${step.after}${where}`;
}

/** A change to a counter: by, spend or to, within its limits (D-92). */
function counterStep(
    input: { by?: number | string; spend?: number | string; to?: number | string; },
    value: unknown,
    page: string,
    field: string,
    coins: Coin[] | undefined,
    limits: { min?: number; max?: number; hint?: { made: string; raise?: string; }; } = {},
): Step
{
    const read = readCounter(value);

    if (read === undefined) {
        throw new Error(notCounterMessage(page, field, value, coins));
    }

    const before = limits.min === undefined ? read : { ...read, min: limits.min };
    const counterChange = readChange(input, before, page, field, coins);

    // A maximum the game system works out is given only as it works it out (FOR-7).
    if ("to" in counterChange && limits.max !== undefined && counterChange.to.max !== undefined && counterChange.to.max !== limits.max) {
        const raise = limits.hint?.raise === undefined ? "" : `; to raise the maximum, write ${limits.hint.raise}`;
        throw new Error(
            `The maximum of ${field} on ${page} is worked out by the game system: ${limits.hint?.made ?? limits.max}. Give the current value alone, such as to ${Math.min(counterChange.to.value, limits.max)}${raise}. Nothing changed.`,
        );
    }

    const { counter: after, beyond } = changeCounter(before, counterChange);

    if (!isSafeCounter(after)) {
        throw new Error(`${field} on ${page} would be too large to count exactly. Nothing changed.`);
    }

    const same = (base: unknown): boolean => {
        const counter = readCounter(base);
        return counter !== undefined && formatCounter(counter) === formatCounter(after);
    };

    return { before: formatCounter(before), after: formatCounter(after), amount: { ...amountOf(counterChange), beyond: beyond === 0 ? undefined : beyond }, note: limitNote(after, beyond), same };
}

/** A counter as the page keeps it: with the maximum the game system works out from the page without its effects, which the reading puts back (FOR-6). */
function storedCounter(world: World, holder: CounterHolder, field: string, value: number | string): number | string
{
    const counter = readCounter(value);
    const { max } = holder.kind === "page" ? counterLimits(world, inheritedFields(world, holder.page), field) : {};
    return counter === undefined || max === undefined ? value : formatCounter({ value: counter.value, max });
}

/** A change to money (MON-4, MON-5): coins received with by, paid with spend or a negative by, the purse set with to. */
function moneyStep(input: { by?: number | string; spend?: number | string; to?: number | string; }, purse: Purse, coins: Coin[], page: string, field: string): Step
{
    const given = [input.by, input.spend, input.to].filter((part) => part !== undefined);

    if (given.length !== 1) {
        throw new Error('Give one of by (coins received, or paid with a minus), spend (what is paid) or to (what the purse holds), such as spend "5 sp".');
    }

    const asked = given[0];
    const parameter = input.by !== undefined ? "by" : input.spend !== undefined ? "spend" : "to";
    const signed = typeof asked === "string" ? readSignedAmount(asked, coins) : undefined;

    if (signed === undefined || (parameter !== "by" && String(asked).trim().startsWith("-"))) {
        const example = `${parameter === "by" ? "+" : ""}${Math.abs(Number(String(asked).trim())) || 5} ${coins[0].name}`;
        const what = parameter === "by" ? "coins to add or, with a minus, to pay" : "coins";
        throw new Error(`"${String(asked)}" is not ${what} for ${field} on ${page}: give coins of the campaign (${coinNames(coins)}), such as ${parameter} "${example}".`);
    }

    const paying = parameter === "spend" || (parameter === "by" && signed.sign === -1);

    if (paying && totalOf(signed.purse, coins) === 0) {
        throw new Error(`Give ${parameter} the coins paid, such as ${parameter} "${parameter === "by" ? "-" : ""}5 ${coins[0].name}".`);
    }

    const payment = paying ? payCoins(purse, signed.purse, coins) : undefined;

    if (paying && payment === undefined) {
        throw new Error(`${page} has ${field} ${formatAmount(purse, coins)} (${formatTotal(purse, coins)}): cannot pay ${formatAmount(signed.purse, coins)} (${formatTotal(signed.purse, coins)}). Nothing changed.`);
    }

    const after = payment?.purse ?? (parameter === "to" ? signed.purse : addCoins(purse, signed.purse));

    if (!isSafePurse(after, coins)) {
        throw new Error(`${field} on ${page} would be too large to count exactly. Nothing changed.`);
    }

    const text = (coinsGiven: Purse | undefined): string | undefined => (coinsGiven === undefined || Object.keys(coinsGiven).length === 0 ? undefined : formatAmount(coinsGiven, coins));
    const handed = text(payment?.given);
    const back = text(payment?.back);
    const amount = formatAmount(signed.purse, coins);
    const request = parameter === "to" ? { to: amount } : parameter === "spend" ? { spend: amount } : { by: `${signed.sign === -1 ? "-" : "+"}${amount}` };
    const others = Object.keys(after).some((name) => name !== coins[0].name);

    const same = (base: unknown): boolean => {
        const basePurse = readAmount(base, coins);
        return basePurse !== undefined && formatAmount(basePurse, coins) === formatAmount(after, coins);
    };

    return {
        before: formatAmount(purse, coins),
        after: formatAmount(after, coins),
        amount: { ...request, given: handed, back },
        note: back !== undefined ? `${handed} given, ${back} back` : handed === undefined ? "" : `paid with ${handed}`,
        total: others ? formatTotal(after, coins) : undefined,
        same,
    };
}

/**
 * The value a missing counter or purse is shown with, in the hint to add one: money that the page holds, when money was asked for;
 * a clock as given, or empty (EVT-2); 0 for a field usually at zero, such as exhaustion (DAT-2); else 12/12.
 */
function exampleValue(input: { by?: number | string; spend?: number | string; to?: number | string; }, coins: Coin[] | undefined, clock: boolean, zero: boolean): string
{
    const money = coins !== undefined && [input.by, input.spend, input.to].some((part) => typeof part === "string" && readSignedAmount(part, coins) !== undefined);

    if (money && coins !== undefined) {
        return `10 ${coins[0].name} (what it holds, not the price)`;
    }

    const given = typeof input.to === "string" ? readCounterText(input.to) : undefined;
    return clock ? (given?.max === undefined ? "0/4" : String(formatCounter(given))) : zero ? "0" : "12/12";
}

/** Whether the game system declares a field a counter and works out no maximum for it, as xp: it counts up from 0. */
function withoutMaximum(system: GameSystem | undefined, field: string): boolean
{
    const counted = Object.entries(system?.fields ?? {}).some(([name, kind]) => kind === "counter" && comparableText(name) === comparableText(field));
    const limits = Object.entries(system?.formulas.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field))?.[1];
    return counted && limits?.max === undefined;
}

/** Whether the game system's status line shows a field only when it is not at zero, as it does exhaustion: it is usually at zero (DAT-2). */
function usuallyZero(system: GameSystem | undefined, field: string): boolean
{
    return system?.statusLine.some((entry) => entry.whenSet && comparableText(entry.field) === comparableText(field.trim())) === true;
}

/** An event's clock keeps a maximum of at least 1, as write asks (EVT-2). */
function checkClock(page: Page, field: string, after: number | string): void
{
    const counter = readCounter(after);

    if (isCounterField(page.type, field) && (counter?.max === undefined || counter.max < 1)) {
        throw new Error(`A clock needs a maximum of at least 1, such as 0/4: ${after} is not one. Nothing changed.`);
    }
}

/** "gp/mo, pp, sp, cp": the coins of the campaign, by all their names. */
function coinNames(coins: Coin[]): string
{
    return coins.map((coin) => coin.names.join("/")).join(", ");
}

/** What holds the counter, given by name or as a link: a copy in the open scene first, then a page of the campaign. */
function holderNamed(root: string, world: World, name: string): CounterHolder
{
    const open = readOpenScene(root);
    const found = pageOrCopy(world, open, name, (page) => `a counter is a field of the page, such as page ${page}, field hp`);
    const copy = found.copy;

    if (copy !== undefined) {
        const write = (fields: Record<string, number | string | undefined>): undefined => {
            updateScene(root, Object.entries(fields).map(([field, value]) => [["copies", copy, field], value]));
            return undefined;
        };

        return { page: found.page, kind: "copy", write, visibility: "hidden" };
    }

    checkNotSystemPage(world, open, found.page);
    checkNotCopied(world, open, found.page);
    return pageHolder(world, found.page);
}

/** A page as what holds its counters: written with write, its lines in the log public when it concerns the player. */
function pageHolder(world: World, page: Page): CounterHolder
{
    return {
        page,
        kind: "page",
        write: (fields) => {
            const set = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
            const unset = Object.keys(fields).filter((field) => fields[field] === undefined);
            return writePage(world, page.name, undefined, { set: Object.keys(set).length === 0 ? undefined : set, unset: unset.length === 0 ? undefined : unset }).page;
        },
        visibility: concernsPlayer(world, page) ? "public" : "hidden",
    };
}

/** One public line for each page that changed with a base and concerns the player, with its own name only and no why: the base and the other pages may be secret (INH-10, D-93). */
function logFollowers(root: string, world: World, context: Context, followers: Page[], change: { field: string; before: number | string; after: number | string; }): void
{
    const concerns = playerConcerns(world);

    for (const follower of followers.filter(concerns)) {
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: follower.name, ...change }));
    }
}

/**
 * The holder's field with this name, ignoring case and how accents are written; a missing or fixed one fails with the counters and money it holds and how to add one.
 * A field the game system never counts fails with how to write it instead, with `suggested` as its new value when the change gives one.
 */
function fieldName(world: World, holder: CounterHolder, fields: Record<string, unknown>, name: string, example: string, coins: Coin[] | undefined, suggested: string): string
{
    const keys = Object.keys(fields);
    const found = keys.find((key) => key === name) ?? keys.find((key) => comparableText(key) === comparableText(name.trim()));
    const page = holder.page;
    const computed = computedField(world, name, fields);

    if (computed !== undefined) {
        throw new Error(`${computedMessage(world, computed, page.name)}. Nothing changed.`);
    }

    if (found !== undefined && isStandardField(page.type, found) && !isCounterField(page.type, found)) {
        const what = holder.kind === "copy" && found === "creature" ? `${found} is the creature ${page.name} copies` : `${found} is a fixed field of ${page.name}`;
        throw new Error(`${what}, not a counter${holder.kind === "page" ? ": change it with write" : ""}.`);
    }

    const declared = found ?? name.trim();

    if (isDeclaredUncounted(world, declared)) {
        throw new Error(uncountedMessage(world, page.name, declared, suggested));
    }

    if (found !== undefined) {
        return found;
    }

    const held = keys.filter((key) => (!isStandardField(page.type, key) || isCounterField(page.type, key)) && !isDeclaredUncounted(world, key)).flatMap((key) => {
        const counter = readCounter(fields[key]);
        const purse = coins === undefined || declaredKind(world, key) !== undefined ? undefined : readAmount(fields[key], coins);
        return purse !== undefined && coins !== undefined ? [`${key} ${formatAmount(purse, coins)}`] : counter === undefined ? [] : [`${key} ${formatCounter(counter)}`];
    });
    const hasMoney = coins !== undefined && keys.some((key) => declaredKind(world, key) === undefined && readAmount(fields[key], coins) !== undefined);
    const listed = held.length > 0 ? `Its counters${hasMoney ? " and money" : ""}: ${held.join(", ")}.` : "It has no counters.";
    // A counter the system gives who has what it comes from is not added by hand, as a warlock's spell-slots to a wizard (DAT-9).
    const given = Object.keys(world.system?.formulas?.counters ?? {}).find((counter) => comparableText(counter) === comparableText(name.trim()));

    if (given !== undefined && holder.kind === "page" && hasSheet(world, page)) {
        const sources = maximumSources(world, given, fields);
        const whence = sources.length === 0 ? `the tables of its ${world.system?.progression?.list ?? "lists"}` : sources.join(", ");
        throw new Error(`${page.name} has no ${given}: the system ${world.system?.name ?? ""} gives it from ${whence}, and ${page.name} has none from them. ${listed}`);
    }

    throw new Error(`${page.name} has no field "${name}". ${listed} ${howToAdd(world, holder, name, example)}`);
}

/** The value a page reads for a field, written in any case. */
function counterOf(world: World, page: Page, field: string): unknown
{
    return Object.entries(inheritedFields(world, page)).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}

/**
 * How to add a counter that neither the page nor its bases hold, on the nearest base of the campaign, since the system's are read-only (SYS-6); or why its base cannot be read.
 */
function howToAdd(world: World, holder: CounterHolder, name: string, example: string): string
{
    const page = holder.page;
    const field = baseFieldOf(page.type);
    const link = field === undefined || typeof page.fields[field] !== "string" ? undefined : page.fields[field];
    const chain = baseChain(world, page);
    const base = chain.find((candidate) => candidate.system === undefined);

    if (field !== undefined && link !== undefined && chain.length === 0) {
        const fix = holder.kind === "copy" ? "fix the creature's page, or let the copy leave the scene" : "fix the link with write";
        return `${page.name} ${holder.kind === "copy" ? "copies" : "derives from"} ${link}, which cannot be read: no ${field} has that name, two pages share it, or it is not ${withArticle(field)}. `
            + `To fix it, ${fix}; validate shows why.${missingSystemHint(world)}`;
    }

    if (base === undefined) {
        return `To add one, use write, such as set ${name}=${example}.`;
    }

    // A page of the campaign named like one of the system's hides it (SYS-4): writing on it is not what the master means.
    const hides = systemPageNamed(world, base.name) === undefined ? "" : ` But ${base.name} hides the system ${world.system?.name ?? ""}'s ${base.name}: validate says how to fix it.`;

    if (holder.kind === "copy") {
        return `To add one to ${page.name} alone, use write, such as set ${name}=${example}. To give it to every ${base.name}, write it on ${base.name} once the scene is closed.${hides}`;
    }

    return `${page.name} reads what it does not hold from ${base.name}: write the counter there, such as set ${name}=${example}, and everything that derives from ${base.name} takes it; or on ${page.name} alone.${hides}`;
}

/**
 * A field the game system never counts, such as ac: a number for a while is an effect, for good a write (SYS-8). `suggested` is the value the change would give, when it gives one.
 */
function uncountedMessage(world: World, page: string, field: string, suggested: string): string
{
    const system = world.system?.name ?? "";

    if (declaredKind(world, field) !== "number") {
        const kind = declaredKind(world, field) === "text" ? "text" : "a list";
        return `${field} is ${kind} in the system ${system}, never counted: write it instead, such as write "${page}", set ${field}=${suggested}. Nothing changed.`;
    }

    return `${field} is a number in the system ${system}, never counted: for a while, such as a spell, effect, action add, page "${page}", set ${field}=${suggested}; `
        + `for good, write "${page}", set ${field}=${suggested}. Nothing changed.`;
}

/** The value a change would give a number, such as 18 for by 2 on ac 16; "<value>" when it gives none. */
function suggestedNumber(fields: Record<string, unknown>, input: { field: string; by?: number | string; to?: number | string; }): string
{
    const current = valueNamed(fields, input.field.trim());

    // From a command line a number arrives as text.
    if (input.to !== undefined && /^[+-]?\d+$/.test(String(input.to).trim())) {
        return String(Number(input.to));
    }

    return typeof current === "number" && typeof input.by === "number" ? String(current + input.by) : "<value>";
}

function notCounterMessage(page: string, field: string, value: unknown, coins: Coin[] | undefined): string
{
    if (typeof value === "string" && readCounterText(value) !== undefined) {
        return `${field} on ${page} is the text "${value}": write it without quotes, such as ${field}: ${value}, to make it a counter.`;
    }

    // Coins of the campaign after a number, such as "34 mo e 4 ma", meant money that does not read as an amount (MON-2).
    if (typeof value === "string" && coins !== undefined && namesCoins(value, coins)) {
        return `${field} on ${page} is "${value}", not money: write the coins one after the other, such as set ${field}=12 ${coins[0].name}.`;
    }

    const notCounter = `${field} on ${page} is ${JSON.stringify(value)}, not a counter: write a counter as a number (20) or as current/max (12/12).`;
    const word = typeof value === "string" ? /\d+\s*(\p{L}[\p{L}\p{M}]*)/u.exec(value)?.[1] : undefined;

    if (word === undefined) {
        return notCounter;
    }

    return coins === undefined
        ? `${notCounter} If it is money, the campaign needs its coins: set them with config, naming them as written here (${word}), each with its value in the smallest.`
        : `${notCounter} If it is money, ${word} is not a coin of the campaign (${coinNames(coins)}): write it with those, or give a coin that name too with config, such as ${coins[0].name}/${word}.`;
}

function readChange(input: { by?: number | string; spend?: number | string; to?: number | string; }, counter: Counter, page: string, field: string, coins: Coin[] | undefined): CounterChange
{
    const given = [input.by, input.spend, input.to].filter((part) => part !== undefined);

    if (given.length !== 1) {
        throw new Error("Give one of by (damage, healing), spend (what is paid or used up) or to (a value, max, or current/max).");
    }

    if (typeof input.by === "string" || typeof input.spend === "string") {
        const parameter = typeof input.by === "string" ? "by" : "spend";
        // A plain number given coins may be money written without them; a current/max counter is no purse.
        const coinsAsked = counter.max === undefined && coins !== undefined && readSignedAmount(String(input.by ?? input.spend), coins) !== undefined;
        const money = coinsAsked && coins !== undefined
            ? `${field} on ${page} is a number, not money: to count it in coins, set it with its coins, such as set ${field}=${counter.value} ${coins[0].name}; or give ${parameter} a whole number.`
            : undefined;
        throw new Error(money ?? `${field} on ${page} is a counter: give ${parameter} a whole number, such as ${parameter === "by" ? "by -7" : "spend 1"}.`);
    }

    if (input.by !== undefined) {
        return { by: input.by };
    }

    if (input.spend !== undefined) {
        if (!canSpend(counter, input.spend)) {
            throw new Error(input.spend > 0 ? `${page} has ${field} ${formatCounter(counter)}: cannot spend ${input.spend}. Nothing changed.` : "Give spend a number above 0.");
        }

        return { spend: input.spend };
    }

    return { to: readTarget(String(input.to).trim(), counter, page, field) };
}

/** The value given to `to`: max, a whole number, or current/max. */
function readTarget(target: string, counter: Counter, page: string, field: string): Counter
{
    if (target.toLowerCase() === "max") {
        if (counter.max === undefined) {
            throw new Error(`${field} on ${page} has no maximum: give to a number, or write the field as current/max with write.`);
        }

        return { ...counter, value: counter.max };
    }

    const given = readCounterText(target);

    if (given === undefined) {
        throw new Error(`"${target}" is not a value for to: give a whole number, max, or current/max such as 15/15.`);
    }

    return given.max === undefined ? { ...counter, value: given.value } : given;
}

function amountOf(change: CounterChange): Record<string, unknown>
{
    return "to" in change ? { to: formatCounter(change.to) } : change;
}

/** Where the counter stands, when it matters: at 0 or at its maximum, how far a change went beyond, or outside the limits. */
function limitNote(counter: Counter, beyond: number): string
{
    const limit = counterLimit(counter);
    const lowest = counter.min ?? 0;
    const where = limit === "outside" ? (counter.max === undefined ? `below ${lowest}` : `outside ${lowest}–${counter.max}`) : limit ?? "";
    return [where, beyond === 0 ? "" : `${Math.abs(beyond)} beyond`].filter((part) => part !== "").join(", ");
}
