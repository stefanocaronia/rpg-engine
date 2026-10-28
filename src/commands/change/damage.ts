// Damage of a type (D-449, DMG-1–DMG-3): what the lists of who takes it ignore, halve or double, before the counter loses it.
import { comparableText, valueNamed } from "../../core/text.ts";
import { bonusPages, inheritedFields, type Page, textsIn, type World } from "../../pages/index.ts";
import type { DamageRule, GameSystem } from "../../systems/index.ts";
import { effectsOf } from "../shared/effect-layer.ts";

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
