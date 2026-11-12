// Damage of a type (D-449, DMG-1–DMG-3): what the lists of who takes it ignore, halve or double, then a shield first, then the counter.
import type { Context } from "../../core/context.ts";
import { comparableText, valueNamed } from "../../core/text.ts";
import { readCounter } from "../../counters/index.ts";
import type { Coin } from "../../money/index.ts";
import { bonusPages, inheritedFields, type Page, textsIn, type World } from "../../pages/index.ts";
import type { DamageRule, GameSystem } from "../../systems/index.ts";
import { keepingLossNote } from "../shared/scene/reminders.ts";
import { readOpenScene } from "../shared/scene/scene.ts";
import { effectsOf } from "../shared/sheet/effect-layer.ts";
import { counterLimits } from "../shared/sheet/worked-out.ts";
import { counterStep } from "./amounts.ts";
import { applyStep, type CounterHolder, holderNamed, type StepOutcome } from "./holder.ts";

/** What a page takes of an amount of damage of a type, and the note that says why when it is not the amount. */
export interface DamageTaken
{
    amount: number;
    note: string;
}

/**
 * The damage a page takes of a type (DMG-1, DMG-2): none when its ignoring list names the type, half rounded down when its halving list does, then doubled when
 * its doubling list does. An item that names the type with a condition, as "slashing from nonmagical attacks", waits for the master to say whether it holds
 * for this damage (DMG-3): "slashing (applies)" or "slashing (does not apply)".
 */
export function damageTaken(system: GameSystem, rule: DamageRule, fields: Record<string, unknown>, amount: number, written: string, page: string): DamageTaken
{
    const { type, applies } = readDamageType(written);
    const named = typeNames(system, rule);
    checkKnownType(system, named, type);
    const found = (["ignores", "halves", "doubles"] as const).map((key) => {
        const value = valueNamed(fields, rule[key]);

        if (typeof value === "string" && value.includes(",")) {
            throw new Error(`${page}'s ${rule[key]} is text, "${value}": write it as a list, such as ${rule[key]}: [${named.slice(0, 2).join(", ") || "fire, cold"}]. Nothing changed.`);
        }

        const items = textsIn(value);
        const exact = items.some((item) => comparableText(item) === comparableText(type));
        // An item that names the type with a condition, or names no type at all, as "damage from spells", holds only for some damage (DMG-3).
        const conditional = items.filter((item) => comparableText(item) !== comparableText(type) && (namesWord(item, type) || (named.length > 0 && !named.some((name) => namesWord(item, name)))));
        return { list: rule[key], exact, conditional };
    });
    const pending = found.flatMap((entry) => entry.conditional.map((item) => `"${item}" in ${entry.list}`));

    if (pending.length > 0 && applies === undefined) {
        const several = found.filter((entry) => entry.conditional.length > 0).length > 1 ? "; when they do not all hold, give the damage worked out, without damage" : "";
        throw new Error(
            `${page} has ${pending.join(" and ")}, which hold only for some damage: give damage "${type} (applies)" when it holds for this one, or "${type} (does not apply)"${several} `
                + `(read rules "${rule.rules}"). Nothing changed.`,
        );
    }

    const [ignored, halved, doubled] = found.map((entry) => entry.exact || (applies === true && entry.conditional.length > 0));

    if (ignored) {
        return { amount: 0, note: `${type} ignored, in ${rule.ignores}` };
    }

    const taken = (halved ? Math.floor(amount / 2) : amount) * (doubled ? 2 : 1);
    const why = [halved ? `halved, in ${rule.halves}` : "", doubled ? `doubled, in ${rule.doubles}` : ""].filter((part) => part !== "");
    return { amount: taken, note: why.length === 0 ? "" : `${type} ${amount} ${why.join(", then ")}: ${taken}` };
}

/**
 * The lists of a page that change damage, each the union of what it writes, what the pages of the system's bonus lists give, as a ring one is attuned to,
 * and what its effects give, as a rage (DMG-1): an effect adds to the list, never covers it. A list written as text stays text, for damageTaken to refuse.
 */
export function damageLists(world: World, page: Page, rule: DamageRule): Record<string, unknown>
{
    const own = inheritedFields(world, page);
    const given = bonusPages(world, own);
    const effects = effectsOf(page);
    return Object.fromEntries([rule.ignores, rule.halves, rule.doubles].map((list) => {
        const written = valueNamed(own, list);
        const fromPages = given.flatMap((other) => textsIn(valueNamed(inheritedFields(world, other), list)));
        const fromEffects = effects.flatMap((effect) => effect.values.filter(([field]) => comparableText(field) === comparableText(list)).flatMap(([, value]) => value.split(/\s*,\s*/)));
        const added = [...fromPages, ...fromEffects].filter((item) => item.trim() !== "");
        return [list, typeof written === "string" && added.length === 0 ? written : [...textsIn(written), ...added]];
    }));
}

/** "slashing (applies)": the type, and whether a condition on it holds, when the master said so. */
function readDamageType(written: string): { type: string; applies?: boolean; }
{
    const match = /^(.*?)\s*\(\s*(applies|does not apply)\s*\)\s*$/i.exec(written.trim());
    return match === null ? { type: written.trim() } : { type: match[1], applies: match[2].toLowerCase() === "applies" };
}

/** The types the system names in its closed lists; none when it has no such list. */
function typeNames(system: GameSystem, rule: DamageRule): string[]
{
    return [...new Set([...(system.values[rule.halves] ?? []), ...(system.sheetValues[rule.halves] ?? [])])];
}

/** A type the system names, when it names them: a typo would change nothing in silence. */
function checkKnownType(system: GameSystem, named: string[], type: string): void
{
    if (type === "" || (named.length > 0 && !named.some((name) => comparableText(name) === comparableText(type)))) {
        throw new Error(`"${type}" is no damage type of ${system.name}: give one of ${named.join(", ")}. Nothing changed.`);
    }
}

/** Whether a text names a word, whole: "bludgeoning, piercing, and slashing from nonmagical attacks" names slashing. */
function namesWord(text: string, word: string): boolean
{
    const words = (value: string): string => ` ${comparableText(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
    return words(text).includes(words(word));
}

/** The damage a page takes of the type given (DMG-1): only with by, negative, on the counter the system's damage takes from. */
export function typedDamage(system: GameSystem | undefined, fields: Record<string, unknown>, field: string, input: { by?: number | string; spend?: unknown; to?: unknown; damage?: string; }, page: string): DamageTaken
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
export function damageSteps(
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
    const shield = shieldOf(system, field);
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
export function untypedDamageNote(world: World, system: GameSystem | undefined, page: Page, field: string): string
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

/** The counter that shields a counter, losing first, as temporary hit points (DAT-14); undefined when none does. */
export function shieldOf(system: GameSystem | undefined, field: string): string | undefined
{
    return Object.entries(system?.shields ?? {}).find(([, shielded]) => comparableText(shielded) === comparableText(field))?.[0];
}
