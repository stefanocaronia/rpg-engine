import { z } from "zod";
import { readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { fieldsRead } from "../core/formula.ts";
import { appendLogEntry, type LogEntry } from "../core/log.ts";
import type { CounterChange as SystemCounterChange } from "../core/package-api.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, valueNamed, withArticle } from "../core/text.ts";
import { canSpend, changeCounter, type Counter, type CounterChange, counterLimit, formatCounter, isSafeCounter, readCounter, readCounterText } from "../counters/index.ts";
import { DiceError, parseNotation, rollDice } from "../dice/index.ts";
import { addCoins, type Coin, formatAmount, formatTotal, isSafePurse, namesCoins, payCoins, type Purse, readAmount, readSignedAmount, totalOf } from "../money/index.ts";
import {
    baseChain,
    baseFieldOf,
    baseValue,
    concernsPlayer,
    declaredKind,
    findPage,
    followersOf,
    goodsNamed,
    inheritedFields,
    isCounterField,
    isDeclaredUncounted,
    isPartyMember,
    isPlayerCharacter,
    isStandardField,
    keepersOf,
    kindNamed,
    ownField,
    type Page,
    stackName,
    stacksOf,
    systemPageNamed,
    textsIn,
    withPage,
    type World,
    writePage,
} from "../pages/index.ts";
import type { GameSystem, Recipe } from "../systems/index.ts";
import { effectGiving, effectiveFields, effectsOf, withValue } from "./effect-layer.ts";
import { damageLists, type DamageTaken, damageTaken } from "./game-damage.ts";
import { spendableDice, spendDice } from "./game-dice-pool.ts";
import { checkEffectsReadable, saveEffects } from "./game-effects.ts";
import { fireEvents, nowDueNote } from "./game-events.ts";
import { poolExample, restExample } from "./game-examples.ts";
import { experienceOf, newLevelNotes } from "./game-experience.ts";
import { screenNote, screenUp, sealHiddenRoll } from "./game-master-rolls.ts";
import { campaignCoins } from "./game-money.ts";
import { allSaid, packagesCounterChanged } from "./game-package-hooks.ts";
import { logRecipeApplied, tooSoonNote } from "./game-recipe-pace.ts";
import { effectsAtRecipe, notBroughtBack, partyPages, recipeChoices, recipeNamed, recipeTargets } from "./game-recipes.ts";
import { keepingLossNote, restingEffectsNote, shieldNotes } from "./game-reminders.ts";
import { checkNotCopied, checkNotSystemPage, pageOrCopy, readOpenScene, updateScene } from "./game-scene.ts";
import { changeStack } from "./game-stacks.ts";
import { fallNotes, thresholdNotes } from "./game-thresholds.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { campaignSystem, campaignWorld, missingSystemHint } from "./game-world.ts";
import { followersNote, keepersNote, skippedPagesNote } from "./notes.ts";
import { keptRolls } from "./page-counters.ts";
import { situationPart } from "./parts.ts";
import { faceValues } from "./roll.ts";
import { computedField, computedMessage, counterLimits, hasSheet, maximumHint, maximumSources, startingAtZero } from "./worked-out.ts";

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
    const shield = Object.entries(system?.shields ?? {}).find(([, shielded]) => comparableText(shielded) === comparableText(field))?.[0];
    const shielded = shield === undefined ? 0 : Math.max(readCounter(valueNamed(fields, shield))?.value ?? 0, 0);
    const lost = Number.isFinite(by) && by < 0 ? Math.max(-by - shielded, 0) : 0;
    return { ...told, ...counterChangeOf({ holder, field, fields }, told, lost), problems: world.problems };
}

/**
 * Dice given as by, such as -(2d6+3), rolled with the engine's dice (D-459): the sign in front is the roll's, so -(2d6+3) takes away 2d6+3, never less than 0;
 * undefined for a number, coins or any other text.
 */
function diceBy(by: number | string | undefined, context: Context): { by: number; taking: boolean; data: { notation: string; total: number; result: string; physical: false; dice: unknown; }; } | undefined
{
    const text = typeof by === "string" ? by.replace(/\s+/g, "") : "";
    const body = text.replace(/^[+-]/, "");
    const bracketed = /^\((.*)\)$/.exec(body)?.[1];
    const notation = bracketed ?? body;

    if (!/\d*d(\d+|%|F)/i.test(notation)) {
        return undefined;
    }

    // Dice that do not read as a roll, as -(2d6)+3 with brackets around a part: the whole roll goes in them.
    if (!isDiceNotation(notation)) {
        throw new Error(`by ${String(by)} does not read as a roll: put the whole roll in brackets after the sign, such as by -(2d6+3), which takes away 2d6+3. Nothing changed.`);
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
interface HiddenDice
{
    id: string;
    fingerprint: string;
    screened: boolean;
}

/**
 * Why the dice in by are hidden, or undefined when shown (D-287): with their change, on a page that does not concern the player, whatever master-rolls says;
 * behind the screen, taking away from the player character or a companion, as a foe's or a trap's do. Healing them, or dice on a copy in the scene, are shown.
 */
function diceHiding(root: string, world: World, name: string, taking: boolean): "secret" | "screen" | undefined
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
function logDiceBy(root: string, context: Context, data: { result: string; } & Record<string, unknown>, hiding: "secret" | "screen" | undefined): HiddenDice | undefined
{
    const entry = newDatedLogEntry(root, context, "roll", hiding === undefined ? "public" : "hidden", data);
    const fingerprint = hiding === undefined ? undefined : sealHiddenRoll(entry, data.result, context);
    appendLogEntry(root, entry);
    return fingerprint === undefined ? undefined : { id: entry.id, fingerprint, screened: hiding === "screen" };
}

/** "Rolled 2d6+3 = 11 [5, 3] + 3.", or the hidden roll as roll tells it, only for the master. */
function rolledText(rolled: string, hidden: HiddenDice | undefined): string
{
    const screen = hidden?.screened === true ? `. ${screenNote}` : "";
    return hidden === undefined ? `Rolled ${rolled}.` : `Hidden roll ${hidden.id}, only for the master: ${rolled}${screen}\nIts fingerprint, only if the player asks for it: ${hidden.fingerprint}`;
}

/** Whether a text reads as dice, such as 2d6+3: coins and names of fields do not. */
function isDiceNotation(text: string): boolean
{
    try {
        return parseNotation(text).some((term) => term.kind === "dice");
    } catch (error) {
        if (error instanceof DiceError) {
            return false;
        }

        throw error;
    }
}

/** The damage a page takes of the type given (DMG-1): only with by, negative, on the counter the system's damage takes from. */
function typedDamage(system: GameSystem | undefined, fields: Record<string, unknown>, field: string, input: { by?: number | string; spend?: unknown; to?: unknown; damage?: string; }, page: string): DamageTaken
{
    const rule = system?.damage;

    if (system === undefined || rule === undefined) {
        throw new Error(`The game system ${system?.name ?? "of the campaign"} has no damage types: give by alone, such as by -12. Nothing changed.`);
    }

    if (comparableText(field) !== comparableText(rule.counter)) {
        throw new Error(`A damage type goes with ${rule.counter}, not ${field}: change ${page} ${rule.counter} --by=-12 --damage fire. Nothing changed.`);
    }

    const by = typeof input.by === "number" ? input.by : Number(input.by);

    if (input.spend !== undefined || input.to !== undefined || !Number.isSafeInteger(by) || by >= 0) {
        throw new Error(`A damage type goes with by, negative, the damage before ${page}'s lists change it, such as by -12, damage fire. Nothing changed.`);
    }

    return damageTaken(system, rule, fields, -by, input.damage ?? "", page);
}

/**
 * Damage of a type taken by its counter (DMG-1): the counter that shields it loses first, as temporary hit points (DAT-14), then the counter the rest; one
 * outcome that says both, and why the damage is not the amount given.
 */
function damageSteps(
    root: string,
    context: Context,
    world: World,
    target: { holder: CounterHolder; name: string; fields: Record<string, unknown>; field: string; limits: Parameters<typeof counterStep>[5]; coins: Coin[] | undefined; },
    damage: DamageTaken,
    why: string | undefined,
    system: GameSystem | undefined,
): { outcome: StepOutcome; lost: number; }
{
    const { holder, fields, field, coins } = target;
    const page = holder.page.name;
    const withNote = (outcome: StepOutcome, notes: string[]): StepOutcome => ({ ...outcome, note: [...notes, outcome.note].filter((part) => part !== "").join("; ") });
    const shield = Object.entries(system?.shields ?? {}).find(([, shielded]) => comparableText(shielded) === comparableText(field))?.[0];
    const shieldField = shield === undefined ? undefined : Object.keys(fields).find((name) => comparableText(name) === comparableText(shield));
    const absorbed = shieldField === undefined ? 0 : Math.min(Math.max(readCounter(fields[shieldField])?.value ?? 0, 0), damage.amount);
    const onCounter = (current: World, currentHolder: CounterHolder, amount: number): StepOutcome =>
        applyStep(root, context, current, currentHolder, field, counterStep({ by: -amount }, fields[field], page, field, coins, target.limits), why, system).outcome;

    if (shieldField === undefined || absorbed === 0) {
        return { outcome: withNote(onCounter(world, holder, damage.amount), [damage.note]), lost: damage.amount };
    }

    const shieldStep = counterStep({ by: -absorbed }, fields[shieldField], page, shieldField, coins, counterLimits(world, fields, shieldField));
    const first = applyStep(root, context, world, holder, shieldField, shieldStep, why, system);

    if (absorbed === damage.amount) {
        return { outcome: withNote(first.outcome, [damage.note]), lost: 0 };
    }

    const outcome = onCounter(first.world, holderNamed(root, first.world, target.name), damage.amount - absorbed);
    const shielded = `${shieldField} ${first.outcome.before} → ${first.outcome.after} first`;
    // What someone keeps alive reads the whole damage, the shield's part too (EFF-14).
    const keeping = keepingLossNote(world, readOpenScene(root).scene, system, page, field, damage.amount);
    const merged = {
        ...withNote(outcome, [damage.note, shielded]),
        thresholds: [...first.outcome.thresholds, ...outcome.thresholds],
        // The shield is spent, so the only reminder left is what someone keeps (DAT-14).
        reminders: keeping === "" ? [] : [keeping],
        due: [...first.outcome.due, ...outcome.due],
        followers: [...new Set([...first.outcome.followers, ...outcome.followers])],
        keepers: [...new Set([...first.outcome.keepers, ...outcome.keepers])],
    };
    return { outcome: merged, lost: damage.amount - absorbed };
}

/** "Ghoul 1 has damage-immunities poison: …": for damage given without a type to a page whose lists change some (DMG-1); empty otherwise. */
function untypedDamageNote(world: World, system: GameSystem | undefined, page: Page, field: string): string
{
    const rule = system?.damage;

    if (rule === undefined || comparableText(field) !== comparableText(rule.counter)) {
        return "";
    }

    const lists = Object.entries(damageLists(world, page, rule)).flatMap(([list, value]) => {
        const items = textsIn(value);
        return items.length === 0 ? [] : [`${list} ${items.join(", ")}`];
    });
    return lists.length === 0 ? "" : `${page.name} has ${lists.join("; ")}: if this damage has a type, give it with damage, as rolled.`;
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
    /** What the change may break that someone keeps alive, and what shields the counter it lowered (EFF-14, DAT-14). */
    reminders: string[];
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
    // The player character's own counter, never a form's, falling to the system's down value: what lethality makes of it (D-530).
    const fall = changed && holder.kind === "page" && layer === undefined && isPlayerCharacter(holder.page) ? fallNotes(root, system, page, field, step) : [];
    const thresholds = [...(touched && party ? thresholdNotes(root, system, field, step, layer?.name) : []), ...fall, ...levels];
    // What the loss may break that someone keeps alive, on anyone, and what shields the counter that went down (EFF-14, DAT-14).
    const lost = touched ? lostBy(step) : 0;
    // What goes past 0 in an effect that gives the counter, as a beast form, may carry over to the page's own (D-454).
    const beyond = Math.abs(Number(step.amount.beyond ?? 0));
    const carried = layer !== undefined && lost > 0 && beyond > 0 && readCounterText(String(step.after))?.value === 0
        ? `${beyond} went past 0 in ${layer.name}: when it ends so, what goes past may carry over to ${page}'s own ${field}, as its text says.`
        : "";
    const reminders = [keepingLossNote(world, readOpenScene(root).scene, system, page, field, lost), ...shieldNotes(world, system, holder.page, field, lost, fellBy(step)), carried].filter((note) => note !== "");
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
        reminders,
    };
    return { outcome, world: updated };
}

/**
 * The fields, with a counter the game system declares and gives no maximum at 0 when a character, a quest or a copy that no page derives from does not hold it
 * yet, as temporary hit points: change starts it, since write never changes it once written (CNT-7, CNT-8, D-266).
 */
function withDeclaredStart(world: World, holder: CounterHolder, fields: Record<string, unknown>, name: string): Record<string, unknown>
{
    const declared = startingAtZero(world, name);
    const held = Object.keys(fields).some((field) => comparableText(field) === comparableText(name.trim()));

    if (declared === undefined || held || computedField(world, declared, fields) !== undefined) {
        return fields;
    }

    // Never on a place, an item or a kind: on a page others derive from, it would reach all of them, as on Ghoul instead of Ghoul 1.
    const owner = holder.kind === "copy" || ((holder.page.type === "character" || holder.page.type === "quest") && followersOf(world, holder.page, declared).length === 0);
    return owner ? { ...fields, [declared]: 0 } : fields;
}

/** How much a step took away: the whole of a negative by, even past a limit, as damage is taken; otherwise what the value went down. */
function lostBy(step: Step): number
{
    const by = step.amount.by;
    return typeof by === "number" ? Math.max(0, -by) : fellBy(step);
}

/** How far a step's counter went down, which stops at its least. */
function fellBy(step: Step): number
{
    const before = readCounter(step.before)?.value;
    const after = readCounter(step.after)?.value;
    return before === undefined || after === undefined ? 0 : Math.max(0, before - after);
}

/** What else a step says: the thresholds it touches, the events it sets off, the pages that changed with it, and those that keep their own. */
function stepNotes(step: StepOutcome): string[]
{
    const followers = followersNote(step.followers, `since they read ${step.field} from ${step.page}`, "change", `${step.field} ${step.after}`);
    return [...step.thresholds, ...step.reminders, nowDueNote(step.due), followers, keepersNote(step.keepers, step.field)].filter((note) => note !== "");
}

/**
 * A recipe of the game system applied to a page, or to the living player characters and the companions with them (DAT-4). Every page is checked before any
 * is written.
 */
function recipeResult(
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
function recipeText(result: { recipe: string; system: string; outcomes: RecipeOutcome[]; rules: string[]; lasts?: string; buttons?: boolean; physical?: boolean; }): string
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
        const raise = limits.hint?.raise === undefined ? "" : `; to raise the maximum, write ${limits.hint.raise}; to change it for a while, as a drain, give an effect that sets ${limits.hint.raise}`;
        throw new Error(
            `The maximum of ${field} on ${page} is worked out by the game system: ${limits.hint?.made ?? limits.max}. Give the current value alone, such as to ${Math.min(counterChange.to.value, limits.max)}${raise}. Nothing changed.`,
        );
    }

    // A value given with to keeps the minimum the system gives, for where it stands: 0 is no limit of a counter that goes below it.
    const { counter: after, beyond } = changeCounter(before, counterChange);

    // Above a maximum the game system works out, a value reads as the maximum (FOR-6): what change says it wrote would not be what is read.
    if ("to" in counterChange && limits.max !== undefined && after.value > limits.max) {
        const raise = limits.hint?.raise === undefined ? "" : `; to raise the maximum, write ${limits.hint.raise}; to change it for a while, as a drain, give an effect that sets ${limits.hint.raise}`;
        throw new Error(`${field} on ${page} goes no higher than its maximum, which the game system works out: ${limits.hint?.made ?? limits.max}. Give to ${limits.max} or less${raise}. Nothing changed.`);
    }

    if (!isSafeCounter(after)) {
        throw new Error(`${field} on ${page} would be too large to count exactly. Nothing changed.`);
    }

    const same = (base: unknown): boolean => {
        const counter = readCounter(base);
        return counter !== undefined && formatCounter(counter) === formatCounter(after);
    };

    return { before: formatCounter(before), after: formatCounter(after), amount: { ...amountOf(counterChange), beyond: beyond === 0 ? undefined : beyond }, note: limitNote({ ...after, min: after.min ?? before.min }, beyond), same };
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

    // Coins in quotes, as a model may send "\"5 sp\"", are the coins.
    const asked = typeof given[0] === "string" ? given[0].trim().replace(/^"(.*)"$/s, "$1") : given[0];
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

/** What holds the counter, given by name or as a link: a copy in the open scene first, then a page of the campaign; the field asked names the example. */
function holderNamed(root: string, world: World, name: string, field?: string): CounterHolder
{
    const open = readOpenScene(root);
    const found = pageOrCopy(world, open, name, (page) => `a counter is a field of the page, such as page ${page}${field === undefined ? "" : `, field ${field}`}`);
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
    for (const follower of followers.filter((page) => concernsPlayer(world, page))) {
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
    // A maximum that reads nothing, as a track of 5, is everyone's: it is written by hand as any other counter.
    const max = given === undefined ? undefined : world.system?.formulas?.counters[given]?.max;
    const everyones = max !== undefined && fieldsRead(max).length === 0;

    if (given !== undefined && !everyones && holder.kind === "page" && hasSheet(world, page)) {
        const sources = maximumSources(world, given, fields);
        const whence = sources.length === 0 ? `the tables of its ${world.system?.progression?.list ?? "lists"}` : sources.join(", ");
        throw new Error(`${page.name} has no ${given}: the system ${world.system?.name ?? ""} gives it from ${whence}, and ${page.name} has none from them. ${listed}`);
    }

    // Goods are stacks, never a field: the stacks the page holds, and the call for the kind the name means (STK-5).
    const stacks = holder.kind === "page" ? stacksOf(world, page).map((stack) => `${stackName(stack)} ${stack.count}`) : [];
    const goods = goodsNamed(world, name);
    const counted = stacks.length === 0 ? "" : `Its stacks: ${stacks.join(", ")}. `;
    // Its maximum, everyone's, in the example: the master writes it as the system works it out (FOR-7).
    const shown = everyones && given !== undefined ? `0/${counterLimits(world, fields, given).max ?? 0}` : example;
    const how = goods === undefined ? howToAdd(world, holder, name, shown) : `Goods are a stack, changed by its kind, such as change ${page.name}, ${goods.name}, spend 1.`;
    throw new Error(`${page.name} has no field "${name}". ${counted}${listed} ${how}`);
}

/** An item a name means that may be counted though no stack counts it yet, as a kind of the campaign spent to 0 everywhere: change says how to write its stack (STK-5). */
function countable(world: World, name: string): Page | undefined
{
    const page = goodsNamed(world, name);
    return page !== undefined && comparableText(page.name) === comparableText(name.trim()) ? page : undefined;
}

/** Whether a name is a field of the page, one the game system declares or works out (CNT-8): a field before a kind of the same name (STK-5). */
function holdsField(world: World, fields: Record<string, unknown>, name: string): boolean
{
    return Object.keys(fields).some((key) => comparableText(key) === comparableText(name.trim())) || declaredKind(world, name.trim()) !== undefined || computedField(world, name, fields) !== undefined;
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

    if (!["number", "at-least"].includes(declaredKind(world, field) ?? "")) {
        const kind = declaredKind(world, field) === "text" ? "text" : declaredKind(world, field) === "list" ? "a list" : `a ${declaredKind(world, field) ?? "field"}`;
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
            const floor = (counter.min ?? 0) > 0 ? `, which goes no lower than ${counter.min}` : "";
            throw new Error(input.spend > 0 ? `${page} has ${field} ${formatCounter(counter)}${floor}: cannot spend ${input.spend}. Nothing changed.` : "Give spend a number above 0.");
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
