// What validate says of pages about what the system works out (FOR-7, PRO-5)
import { diceFields, fieldsRead, type Formula, listItems, parseRollFormula, type RollFormula, tablesRead } from "../../../core/formula.ts";
import type { Problem } from "../../../core/problem.ts";
import { comparableText } from "../../../core/text.ts";
import { readCounter } from "../../../counters/index.ts";
import { declaredKind, inheritedFields, type Page, type World } from "../../../pages/index.ts";
import { formulaScope } from "./formula-scope.ts";
import { progressionProblems } from "./progression.ts";
import { keyOf } from "./system-fields.ts";
import { counterLimits, givenFields, progressedField } from "./worked-out.ts";
import { signedText } from "./worked-text.ts";

/**
 * What validate says of the pages of the campaign about what the game system works out (FOR-7): a computed field written on a page, where the system works it
 * out and the page's value is never read; a written maximum that is not the one the system works out from the page without its effects; what the classes of a
 * page cannot give (PRO-1, PRO-4). Found once for each world.
 */
export function workedOutProblems(world: World): Problem[]
{
    const formulas = world.system?.formulas;

    if (formulas === undefined) {
        return [];
    }

    const known = checkedWorlds.get(world);

    if (known !== undefined) {
        return known;
    }

    const computedNames = new Set(formulas.computed.map(([name]) => comparableText(name)));
    const counterNames = new Set(Object.keys(formulas.counters).map(comparableText));
    const lists = new Set([...(world.system?.progression === undefined ? [] : [world.system.progression.list]), ...Object.keys(world.system?.itemFormulas ?? {})].map(comparableText));
    const relevant = (field: string): boolean => computedNames.has(comparableText(field)) || counterNames.has(comparableText(field)) || lists.has(comparableText(field));
    const problems = world.pages.filter((page) => Object.keys(page.fields).some(relevant)).flatMap((page) => {
        const fields = inheritedFields(world, page);
        const scope = formulaScope(world, fields);
        const progressed = new Set(givenFields(world, scope).map((worked) => comparableText(worked.field)));
        // Only the fields the page writes are worked out: a page holds few of them.
        const written = Object.keys(page.fields).filter((key) => computedNames.has(comparableText(key)) || progressed.has(comparableText(key))).flatMap((key): Problem[] => {
            const value = scope.computed(key)?.value ?? progressedField(world, scope, key)?.value;
            return value === undefined ? [] : [{
                path: page.path,
                message: `${key} is worked out by the system ${world.system?.name ?? ""} (${signedText(world, key, value)}): the value written on ${page.name} is never read.`,
                fix: `write ${page.name}, unset ${key}`,
            }];
        });
        const limits = Object.keys(page.fields).filter((key) => counterNames.has(comparableText(key))).flatMap((key): Problem[] => {
            const counter = readCounter(page.fields[key]);
            const { max } = counterLimits(world, fields, key);
            return counter === undefined || max === undefined || counter.max === max ? [] : [{
                path: page.path,
                message: `${key} on ${page.name} has ${counter.max === undefined ? "no maximum" : `the maximum ${counter.max}`} written, but the system ${world.system?.name ?? ""} works out ${max}.`,
                fix: `change ${page.name}, field ${key}, to ${counter.value}/${max}`,
            }];
        });
        return [...written, ...limits, ...progressionProblems(world, page, fields), ...itemFormulaProblems(world, page, fields)];
    });
    checkedWorlds.set(world, problems);
    return problems;
}

const checkedWorlds = new WeakMap<World, Problem[]>();

/**
 * A formula an item's page gives that who lists it can have no value from (PRO-5): one that does not read, that reads itself, a table the system lacks or a name
 * that neither the system, the item nor who lists it has.
 */
function itemFormulaProblems(world: World, page: Page, fields: Record<string, unknown>): Problem[]
{
    const system = world.system;
    const scope = formulaScope(world, fields);
    // What the system and the page have, once for the page: a formula of an item reads among these, or the item's own fields.
    const known = new Set([
        ...Object.keys(system?.fields ?? {}),
        ...(system?.formulas?.computed ?? []).map(([name]) => name),
        ...Object.keys(system?.formulas?.counters ?? {}),
        ...Object.values(system?.itemFormulas ?? {}).flat(),
        ...(scope.progression()?.values.map((value) => value.field) ?? []),
        ...Object.keys(fields),
        // What every formula reads besides the fields (FOR-2).
        "effects",
        "rigor",
        ...(system?.load === undefined ? [] : ["load", "load-limit"]),
    ].map(comparableText));
    return Object.entries(system?.itemFormulas ?? {}).flatMap(([list, names]) =>
        listItems(keyOf(fields, list) === undefined ? undefined : fields[keyOf(fields, list) ?? ""]).flatMap((item) => {
            const holder = scope.page(item.name);
            return holder === undefined ? [] : names.flatMap((field): Problem[] => {
                const key = keyOf(holder, field);
                const text = key === undefined ? undefined : holder[key];

                if (typeof text !== "string" && typeof text !== "number") {
                    return [];
                }

                let given: RollFormula;

                try {
                    given = parseRollFormula(String(text));
                } catch (error) {
                    const why = error instanceof Error ? error.message : String(error);
                    return [{ path: page.path, message: `${field} on ${item.name} does not read, so ${page.name} has none from it: ${why}`, fix: `write ${item.name}, set ${field} as a formula` }];
                }

                const why = given.formula === undefined ? undefined : formulaGap(world, known, holder, field, given.formula);

                if (why !== undefined) {
                    return [{ path: page.path, message: `${field} on ${item.name} ${why}, so ${page.name} has none from it.`, fix: `write ${item.name}, set ${field} as a formula of what the system has` }];
                }

                // Dice from a field no one has never count, while the other dice still do (D-235).
                const dice = diceFields(given).find((name) => comparableText(name) === comparableText(field) || (!known.has(comparableText(name)) && keyOf(holder, name) === undefined));

                if (dice !== undefined) {
                    return [{
                        path: page.path,
                        message: `${field} on ${item.name} takes dice from ${dice}, which ${
                            comparableText(dice) === comparableText(field) ? "is the field itself" : "neither the system nor the character has"
                        }: they never count for ${page.name}.`,
                        fix: `write ${item.name}, set ${field}="${withoutDiceField(String(text), dice)}"`,
                    }];
                }

                // Words after a number another formula reads, as "12 + Dex modifier", make it text, which no formula counts.
                return given.words === undefined || given.dice !== undefined || !isReadAsNumber(world, field) ? [] : [{
                    path: page.path,
                    message: `${field} on ${item.name} ends with "${given.words}", words no formula counts, so ${page.name} has it only as text.`,
                    fix: `write ${item.name}, set ${field} as a formula alone, without "${given.words}"`,
                }];
            });
        })
    );
}

/** A roll formula without one of the fields its dice(…) names: "dice(1d6) + dex-mod bludgeoning" for ki-die in "dice(1d6, ki-die) + dex-mod bludgeoning". */
function withoutDiceField(text: string, field: string): string
{
    return text.replace(/^(\s*dice\s*\()([^()]*)\)/i, (_whole, opening: string, inside: string) => {
        const kept = inside.split(",").map((part) => part.trim()).filter((part) => comparableText(part) !== comparableText(field));
        return kept.length === 0 ? "" : `${opening}${kept.join(", ")})`;
    }).trim().replace(/^\+\s*/, "");
}

/** Whether a field is a number for the system: declared as one, or read by one of its computed fields, as an armor's armor-class by ac. */
function isReadAsNumber(world: World, field: string): boolean
{
    return ["number", "at-least", "modifier", "bonus"].includes(declaredKind(world, field) ?? "")
        || (world.system?.formulas?.computed ?? []).some(([, formula]) => fieldsRead(formula).some((name) => comparableText(name) === comparableText(field)));
}

/** Why a formula of an item's page can give no value: it reads itself, a table the system lacks, or a name no one has; undefined when none of these. */
function formulaGap(world: World, known: Set<string>, item: Record<string, unknown>, field: string, formula: Formula): string | undefined
{
    const system = world.system;
    const read = fieldsRead(formula);

    if (read.some((name) => comparableText(name) === comparableText(field))) {
        return "reads itself";
    }

    const table = tablesRead(formula).find((name) => !Object.keys(system?.formulas?.tables ?? {}).some((other) => comparableText(other) === comparableText(name)));

    if (table !== undefined) {
        return `reads the table "${table}", which the system lacks`;
    }

    const unknown = read.find((name) => !known.has(comparableText(name)) && keyOf(item, name) === undefined);
    return unknown === undefined ? undefined : `reads ${unknown}, which neither the system nor the character has`;
}
