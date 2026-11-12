// The change command
import { z } from "zod";
import { requireCampaign } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import type { CounterChange as SystemCounterChange } from "../../core/packages/api.ts";
import { defineCommand } from "../../core/registry.ts";
import { comparableText, valueNamed } from "../../core/text.ts";
import { readCounter, readCounterText } from "../../counters/index.ts";
import { readAmount } from "../../money/index.ts";
import { declaredKind, isCounterField, kindNamed, type World } from "../../pages/index.ts";
import { faceValues } from "../roll/roll.ts";
import { campaignCoins } from "../shared/campaign/money.ts";
import { campaignSystem, campaignWorld } from "../shared/campaign/world.ts";
import { poolExample, restExample } from "../shared/examples.ts";
import { wholeNumber } from "../shared/inputs.ts";
import { skippedPagesNote } from "../shared/notes.ts";
import { allSaid, packagesCounterChanged } from "../shared/packages/hooks.ts";
import { effectiveFields } from "../shared/sheet/effect-layer.ts";
import { changeStack } from "../shared/sheet/stacks.ts";
import { counterLimits, maximumHint } from "../shared/sheet/worked-out.ts";
import { counterStep, moneyStep } from "./amounts.ts";
import { damageLists, damageSteps, shieldOf, typedDamage, untypedDamageNote } from "./damage.ts";
import { diceBy, diceHiding, logDiceBy, rolledText } from "./dice.ts";
import { countable, exampleValue, fieldName, holdsField, suggestedNumber, usuallyZero, withDeclaredStart, withoutMaximum } from "./fields.ts";
import { applyStep, type CounterHolder, holderNamed, stepNotes, type StepOutcome } from "./holder.ts";
import { recipeResult, recipeText } from "./recipe.ts";

export const change = defineCommand({
    name: "change",
    description: "Change a counter, money or a stack of goods on a page: hit points, uses, a progress track, an event's clock, coins, torches. "
        + "A counter is a field written as a number (20, from 0 up) or as current/max (12/12, from 0 to the maximum); create it with write, then change it only with this command. "
        + 'Money is a field in the campaign\'s coins, such as money: 34 {{coin}} 4 {{smallCoin}}: spend "5 {{smallCoin}}" pays and makes change, by "+20 {{coin}}" adds coins, to "10 {{coin}}" sets the purse. '
        + "A stack of goods by its kind in place of the field, such as page Ettore, field Torch, spend 1. "
        + "recipe applies a rest of the game system once you have advanced its hours. "
        + 'Example: page Bruna, field {{counter}}, by -3, why "bitten by the wolf"; or recipe "{{rest}}".',
    group: "game",
    positionals: ["page", "field"],
    input: z.object({
        page: z.string().optional().describe("page that holds the counter or the money; with a recipe, left out for the player character and the companions with them"),
        field: z.string().optional().describe("the counter or the money, such as {{counter}}, or the kind of a stack, such as Torch; none with a recipe"),
        by: z.union([wholeNumber, z.string()]).optional().describe(
            "how much to add, or to take away when negative, or coins; stops at a limit (damage, healing); on the command line write --by=-7. Dice are rolled here: by -(2d6+3) takes away 2d6+3, by -2d6 a die alone, as the game's rules have them rolled; taking away from the party, the master's roll, hidden or shown as master-rolls says",
        ),
        spend: z.union([wholeNumber, z.string()]).optional().describe("how much is paid or used up, or coins; refused when there is not enough"),
        to: z.union([z.number().int(), z.string()]).optional().describe(
            "the new value, even outside the limits: a number, max, current/max such as 15/15 (the maximum changes too), or coins; on the command line write --to=-3",
        ),
        why: z.string().optional().describe("what the change is for"),
        damage: z.string().optional().describe(
            "the type of the damage, with by negative and as rolled, never halved or doubled by you, such as by -12, damage fire: the page's resistances, immunities and vulnerabilities change it; one call per type",
        ),
        recipe: z.string().optional().describe("a rest of the game system, by its name; with a page, field and spend, the pool of dice it lets one spend, such as field {{pool}}, spend 2"),
        values: faceValues.optional().describe("with spend and a recipe, the faces the player rolled with physical dice, one for each die, such as 6,1"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);

        if (input.recipe !== undefined) {
            return recipeResult(root, context, world, { ...input, recipe: input.recipe });
        }

        if (input.values !== undefined) {
            const pool = poolExample(campaignSystem(root, context));
            throw new Error(`Give values with the dice of a recipe: page, field, spend and recipe, such as page ${input.page ?? "Bruna"}, field ${pool.field}, spend 2, recipe "${pool.recipe}", values 6,1. Nothing changed.`);
        }

        if (input.page === undefined || input.field === undefined) {
            const system = campaignSystem(root, context);
            const counter = system?.damage?.counter ?? system?.combat?.track ?? "health";
            throw new Error(`Give the page and the field, such as page ${input.page ?? "Bruna"}, field ${counter}, by -3; or a recipe of the game system, such as recipe "${restExample(system)}".`);
        }

        // Dice in by are rolled first and logged once the change is made (D-459): one call for a roll and its damage.
        const roll = diceBy(input.by, context);
        const hiding = roll === undefined ? undefined : diceHiding(root, world, input.page, roll.taking);
        const { hitCounter, ...result } = changeField(root, context, world, { ...input, page: input.page, field: input.field, ...(roll === undefined ? {} : { by: roll.by }) });
        const hiddenRoll = roll === undefined ? undefined : logDiceBy(root, context, { ...roll.data, why: input.why ?? `${input.field} of ${input.page}` }, hiding);

        // The game system's code follows the change, after the roll that made it (D-448): as the 5e's dying point.
        const lines = hitCounter === undefined ? [] : allSaid(packagesCounterChanged(root, context, hitCounter));
        const told = lines.length === 0 ? result : { ...result, reminders: [...result.reminders, ...lines] };
        return roll === undefined ? told : { ...told, rolled: roll.data.result, ...(hiddenRoll === undefined ? {} : { hiddenRoll }) };
    },

    format(result)
    {
        if ("recipe" in result) {
            return result.spent ?? recipeText(result);
        }

        const note = result.note === "" ? "" : `: ${result.note}`;
        const after = `${result.after}${result.total === undefined ? "" : ` (${result.total})`}`;
        const summary = result.changed ? `${result.page}: ${result.field} ${result.before} → ${after}${note}.` : `Nothing changed: ${result.field} on ${result.page} is ${after}${note}.`;
        // A rule's text, of several lines, comes after the lines of the change.
        const notes = stepNotes(result);
        const lines = [...("rolled" in result && result.rolled !== undefined ? [rolledText(result.rolled, result.hiddenRoll)] : []), summary, ...notes.filter((line) => !line.includes("\n"))];
        return [lines.join("\n"), ...notes.filter((line) => line.includes("\n")), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** Changes a counter, money or a stack on a page as the input asks: by, spend or to, a damage type with its lists, then what the change sets off. */
function changeField(
    root: string,
    context: Context,
    world: World,
    input: { page: string; field: string; by?: number | string; spend?: number | string; to?: number | string; why?: string; damage?: string; },
)
{
    const holder = holderNamed(root, world, input.page, input.field);
    const fields = withDeclaredStart(world, holder, effectiveFields(world, holder.page), input.field);
    // A name that is no field of the page, nor one the system declares, may be a kind the page holds a stack of (STK-5).
    const kind = holdsField(world, fields, input.field) ? undefined : kindNamed(world, holder.kind === "page" ? holder.page : undefined, input.field) ?? countable(world, input.field);

    if (kind !== undefined && holder.kind === "copy") {
        throw new Error(`${holder.page.name} is a copy in the scene, which holds no stacks: what it carries is the master's to tell. Nothing changed.`);
    }

    if (kind !== undefined) {
        return { ...changeStack(root, context, world, holder.page, kind, input), problems: world.problems };
    }

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
    const why = input.why?.trim() === "" ? undefined : input.why;

    // Damage of a type, as the page's lists change it, its shield first (DMG-1).
    if (input.damage !== undefined) {
        const damage = typedDamage(system, { ...fields, ...(system?.damage === undefined ? {} : damageLists(world, holder.page, system.damage)) }, field, input, page);
        const done = damageSteps(root, context, world, { holder, name: input.page, fields, field, limits, coins }, damage, why, system);
        return { ...done.outcome, ...counterChangeOf({ holder, field, fields }, done.outcome, done.lost), problems: world.problems };
    }

    const step = purse !== undefined && coins !== undefined ? moneyStep(input, purse, coins, page, field) : counterStep(input, fields[field], page, field, coins, limits);
    const outcome = applyStep(root, context, world, holder, field, step, why, system).outcome;
    const by = typeof input.by === "number" ? input.by : Number(input.by);
    const untyped = Number.isFinite(by) && by < 0 ? untypedDamageNote(world, system, holder.page, field) : "";
    const told = untyped === "" ? outcome : { ...outcome, reminders: [...outcome.reminders, untyped] };
    // What a shield, as temporary hit points, would have taken first is no loss past the dying value: never an instant death the master undoes (review of 17 October).
    const shield = shieldOf(system, field);
    const shielded = shield === undefined ? 0 : Math.max(readCounter(valueNamed(fields, shield))?.value ?? 0, 0);
    const lost = Number.isFinite(by) && by < 0 ? Math.max(-by - shielded, 0) : 0;
    return { ...told, ...counterChangeOf({ holder, field, fields }, told, lost), problems: world.problems };
}

/** The counter a step changed on a page, never a copy, for the game system's code (D-448): before and after, its maximum, and what damage took of it. */
function counterChangeOf(target: { holder: CounterHolder; field: string; fields: Record<string, unknown>; }, outcome: StepOutcome, lost: number): { hitCounter?: SystemCounterChange; }
{
    const { holder, field, fields } = target;
    const before = readCounter(fields[field]);
    const after = comparableText(outcome.field) === comparableText(field) ? readCounterText(outcome.after)?.value : before?.value;

    // What an effect that gives the counter took, as a beast form, is not the page's own (DIE-8): its code sees the page's counter only.
    if (holder.kind !== "page" || before === undefined || after === undefined || outcome.effect !== undefined) {
        return {};
    }

    return { hitCounter: { page: holder.page.name, field, before: before.value, after, lost, ...(before.max === undefined ? {} : { max: before.max }) } };
}
