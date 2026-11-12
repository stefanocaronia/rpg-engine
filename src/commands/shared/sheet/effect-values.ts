// A page's fields with what its effects and bonus pages give, and what it carries (EFF-3, FOR-5, LOAD-1)
import { factorOf, numberOf } from "../../../core/formula.ts";
import { comparableText } from "../../../core/text.ts";
import { readEffects } from "../../../effects/index.ts";
import { bonusPages, carriedWeight, declaredKind, inheritedFields, type Page, readFieldValue, type World } from "../../../pages/index.ts";
import { keyOf } from "./system-fields.ts";

/**
 * A page's fields with the values its effects give over them (EFF-3): from the newest effect that gives a field, then the page, then its bases; a bonus field
 * adds up the effects that give it (FOR-5). Before what the system works out, as an item's formulas read it: a weapon under Magic Weapon (PRO-5).
 */
export function withEffectValues(world: World, page: Page): Record<string, unknown>
{
    // A world and its pages never change: worked out once in each world, and each caller gets its own copy (D-194).
    let byPage = layeredByWorld.get(world);

    if (byPage === undefined) {
        byPage = new WeakMap();
        layeredByWorld.set(world, byPage);
    }

    const known = byPage.get(page) ?? effectValuesOver(world, page);
    byPage.set(page, known);
    return { ...known };
}

const layeredByWorld = new WeakMap<World, WeakMap<Page, Record<string, unknown>>>();

// Where a character's fields keep what it carries weighs, for its formulas alone.
export const carriedKey = Symbol("carried weight");

/** What a character carries weighs, as its effective fields keep it (LOAD-1): worked out once with them; undefined for fields that do not keep it. */
export function carriedIn(fields: Record<string, unknown>): number | undefined
{
    const value = (fields as Record<string | symbol, unknown>)[carriedKey];
    return typeof value === "number" ? value : undefined;
}

function effectValuesOver(world: World, page: Page): Record<string, unknown>
{
    const fields = { ...inheritedFields(world, page) };
    const read = readEffects(Object.entries(page.fields).find(([field]) => comparableText(field) === "effects")?.[1]);

    // What the pages of the system's bonus lists give, as a Ring of Protection one is attuned to or a feat, adds up as effects do (FOR-5, D-449); an at-least
    // field rises to theirs, as Gauntlets of Ogre Power's str 19, and stays when higher.
    for (const page of bonusPages(world, fields)) {
        for (const [field, value] of Object.entries(inheritedFields(world, page))) {
            const kind = declaredKind(world, field);
            const amount = kind === "bonus" || kind === "at-least" ? numberOf(value) : undefined;
            const key = keyOf(fields, field) ?? field;
            const current = numberOf(fields[key]);
            fields[key] = amount === undefined ? fields[key] : kind === "bonus" ? (current ?? 0) + amount : Math.max(current ?? amount, amount);
        }
    }

    for (const effect of "effects" in read ? read.effects : []) {
        for (const [field, value] of effect.values) {
            const key = keyOf(fields, field) ?? field;
            const kind = declaredKind(world, field);
            fields[key] = kind === "bonus"
                ? (numberOf(fields[key]) ?? 0) + (numberOf(effectValue(value)) ?? 0)
                : kind === "factor"
                ? (factorOf(fields[key]) ?? 1) * (factorOf(value) ?? 1)
                : effectValue(value);
        }
    }

    // What a character carries weighs, for the formulas that read it as load, as a speed; under a key no list of fields shows (FOR-2, LOAD-1).
    if (page.type === "character" && world.system?.load !== undefined) {
        (fields as Record<string | symbol, unknown>)[carriedKey] = carriedWeight(world, world.system.load, page);
    }

    return fields;
}

/** A value of an effect as a page would hold it: a number, a link, a counter as text; text as it is when it does not read. */
function effectValue(value: string): unknown
{
    try {
        return readFieldValue(value);
    } catch {
        return value;
    }
}
