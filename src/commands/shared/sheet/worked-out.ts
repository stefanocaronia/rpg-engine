// What the game system works out from the fields of a page (D-199, FOR-3–FOR-8): its computed fields, each with the values it came from, and the limits of// its counters. The formulas are the system's data; this is where they meet the pages and the counters.
import { contributingReads, diceFields, fieldsRead, type Formula, type FormulaRead, type FormulaScope, listItems, numberOf, type WorkedOut, workOut } from "../../../core/formula.ts";
import { comparableText } from "../../../core/text.ts";
import { formatCounter, readCounter } from "../../../counters/index.ts";
import { declaredKind, pagesWithName, type World } from "../../../pages/index.ts";
import { formulaIndex, formulaScope, itemFormula, itemValues } from "./formula-scope.ts";
import { progressionValue } from "./progression.ts";
import { isSystemCounter, isUse, itemList, keyOf } from "./system-fields.ts";
import { signedText, type WorkedField, workedParts } from "./worked-text.ts";

/**
 * The computed fields of the game system that have a value with these fields (FOR-4), in the order the system gives them; `explained`, each with only the
 * values that changed it (FOR-8).
 */
export function workedFields(world: World, fields: Record<string, unknown>, explained = false): WorkedField[]
{
    const scope = formulaScope(world, fields);
    const computed = (world.system?.formulas?.computed ?? []).flatMap(([field, formula]) => {
        const worked = scope.computed(field);
        return worked?.value === undefined ? [] : [{ field, value: worked.value, reads: explained ? contributingReads(formula, scope, worked) : worked.reads }];
    });
    return [...computed, ...givenFields(world, scope, explained)];
}

/**
 * The fields with what the game system works out over them: each computed field that has a value takes it, over what the page writes (FOR-4); a counter
 * takes the maximum the system works out, and a current above it reads as the maximum (FOR-6). With `sheeted`, the uses it does not write read full (DAT-9).
 */
export function withWorkedOut(world: World, fields: Record<string, unknown>, sheeted: boolean): Record<string, unknown>
{
    const formulas = world.system?.formulas;

    if (formulas === undefined) {
        return fields;
    }

    const result = { ...fields };
    const scope = formulaScope(world, fields);
    const progression = scope.progression();

    // What the classes give, then what the formulas work out over it (PRO-2, FOR-3); a column named as a counter is that counter's maximum (DAT-9).
    for (const worked of givenFields(world, scope)) {
        result[keyOf(result, worked.field) ?? worked.field] = progressionValue(progression, worked.field) ?? worked.value;
    }

    for (const [field] of formulas.computed) {
        const worked = scope.computed(field);

        if (worked?.value !== undefined) {
            result[keyOf(result, field) ?? field] = worked.value;
        }
    }

    for (const field of Object.keys(formulas.counters)) {
        const key = keyOf(result, field);
        const counter = key === undefined ? undefined : readCounter(result[key]);
        const { max } = limitsIn(scope, formulas.counters[field], field);

        if (key !== undefined && counter !== undefined && max !== undefined) {
            result[key] = formatCounter({ value: Math.min(counter.value, max), max });
        }

        // A use the page does not write is full, for who keeps the sheet (DAT-9, D-225).
        if (sheeted && key === undefined && max !== undefined && max > 0 && isUse(world, field)) {
            result[field] = formatCounter({ value: max, max });
        }
    }

    return result;
}

/** The uses the system gives a page with these fields that it does not write, each with its maximum (DAT-9): what write puts, full, on who keeps the sheet. */
export function missingUses(world: World, fields: Record<string, unknown>): { field: string; max: number; }[]
{
    return Object.keys(world.system?.formulas?.counters ?? {}).flatMap((field) => {
        const { max } = keyOf(fields, field) === undefined && isUse(world, field) ? counterLimits(world, fields, field) : {};
        return max === undefined || max <= 0 ? [] : [{ field, max }];
    });
}

/**
 * How much of a counter comes back with these occasions (DAT-9): the sum of what its refill gives for each, where max is the counter's maximum; undefined when
 * it names none of them.
 */
export function refillAmount(world: World, fields: Record<string, unknown>, field: string, occasions: string[], max: number): number | undefined
{
    const refill = Object.entries(world.system?.formulas?.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field))?.[1].refill;
    const named = Object.entries(refill ?? {}).filter(([occasion]) => occasions.some((other) => comparableText(other) === comparableText(occasion)));

    if (named.length === 0) {
        return undefined;
    }

    const scope = formulaScope(world, fields);
    const withMax: FormulaScope = { ...scope, field: (name) => (comparableText(name) === "max" ? max : scope.field(name)) };
    return named.reduce((total, [, formula]) => total + Math.max(0, Math.floor(workOut(formula, withMax).value ?? 0)), 0);
}

/**
 * Each item of a list with what the formulas of its page give, field by field, in the order of the list, for a sheet that shows them item by item, as the
 * attacks of the weapons a character has equipped (PRO-5).
 */
export function itemLines(world: World, fields: Record<string, unknown>, list: string, names: string[], explained = false): { item: string; values: WorkedField[]; }[]
{
    const scope = formulaScope(world, fields);
    const items = listItems(scope.field(list)).map((item) => item.name);
    const byField = names.map((field) => ({ field, values: itemValues(world, scope, field, explained) }));
    return items.flatMap((item) => {
        const values = byField.flatMap(({ field, values }) => values.filter((value) => value.name === item).map((value) => ({ field, value: value.value, reads: value.reads })));
        return values.length === 0 ? [] : [{ item, values }];
    });
}

/** The minimum and maximum the game system works out for a counter with these fields, where they have a whole value (FOR-6). */
export function counterLimits(world: World, fields: Record<string, unknown>, field: string): { min?: number; max?: number; }
{
    const limits = Object.entries(world.system?.formulas?.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field.trim()))?.[1];

    if (limits === undefined) {
        return {};
    }

    return limitsIn(formulaScope(world, fields), limits, field);
}

/**
 * The game system's computed field with this name, in any case, and the fields it comes from, when its formula has a value with these fields (FOR-7):
 * where it has none, as on a creature without a level, the field is written like any other.
 */
export function computedField(world: World, field: string, fields: Record<string, unknown>): { name: string; value: number | string; from: string[]; direct?: string[]; } | undefined
{
    const entry = world.system?.formulas?.computed.find(([name]) => comparableText(name) === comparableText(field.trim()));
    const scope = formulaScope(world, fields);
    const value = entry === undefined ? undefined : scope.computed(entry[0])?.value;

    if (entry === undefined || value === undefined) {
        return progressedField(world, scope, field);
    }

    // Of several formulas, the one that gave the value says what it comes from (D-210).
    const used = entry[1].kind === "first" ? (entry[1].options.find((option) => workOut(option, scope).value !== undefined) ?? entry[1]) : entry[1];
    return { name: entry[0], value, from: writtenSources(world, used, scope), direct: fieldsRead(used) };
}

/** The written fields the maximum of a counter comes from with these fields, as hp-base, level and con for hp (FOR-6); none when the system works out no maximum. */
export function maximumSources(world: World, field: string, fields: Record<string, unknown>): string[]
{
    const max = Object.entries(world.system?.formulas?.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field.trim()))?.[1].max;
    return max === undefined ? [] : writtenSources(world, max, formulaScope(world, fields));
}

/**
 * How the maximum the game system works out for a counter is made, "38, from hp-base 28, level 11, con-mod +1", and the written field to raise it with, as at a
 * new level (FOR-6, D-226); undefined where the system works out none.
 */
export function maximumHint(world: World, fields: Record<string, unknown>, field: string): { made: string; raise?: string; } | undefined
{
    const worked = workedMaximum(world, fields, field);

    if (worked === undefined) {
        return undefined;
    }

    const parts = workedParts(world, worked.reads);
    // A maximum of 0 says the character lacks what gives it: no field raises it.
    const [raise] = worked.value === 0 ? [] : maximumSources(world, field, fields).filter((name) => declaredKind(world, name) !== "list");
    return { made: `${worked.value}${parts === "" ? "" : `, from ${parts}`}`, ...(raise === undefined ? {} : { raise }) };
}

/** Why a computed field is not written or changed, and what to change instead: the fields it comes from, or an effect on a bonus among them (FOR-7). */
export function computedMessage(world: World, computed: { name: string; value: number | string; from: string[]; direct?: string[]; }, page: string): string
{
    const bonuses = directBonuses(world, computed);
    const instead = bonuses.length === 0 ? "change one of those" : `change one of those, or give ${bonuses.join(" or ")} with an effect${aloneNote(world, computed.name, bonuses)}`;
    return `${computed.name} on ${page} is ${signedText(world, computed.name, computed.value)}, worked out by the system ${world.system?.name ?? ""} from ${computed.from.join(", ")}: ${instead}`;
}

/**
 * "; bonus-skills also changes the other fields that read it…": of these bonuses, those other computed fields read too, as bonus-skills for every skill, which
 * are no bonus to one alone (playtest 14); nothing when none is.
 */
export function aloneNote(world: World, field: string, bonuses: string[]): string
{
    const readers = (bonus: string): number => (world.system?.formulas?.computed ?? []).filter(([, formula]) => fieldsRead(formula).some((name) => comparableText(name) === comparableText(bonus))).length;
    const shared = bonuses.filter((bonus) => readers(bonus) > 1);
    const one = shared.length === 1;
    return shared.length === 0 ? "" : `; ${shared.join(" and ")} also ${one ? "changes" : "change"} the other fields that read ${one ? "it" : "them"}, so for ${field} alone add the number to its roll`;
}

/** The bonus fields an effect gives to change a computed field that its formula reads itself, as bonus-skills for insight, not bonus-proficiency through proficiency. */
export function directBonuses(world: World, computed: { from: string[]; direct?: string[]; }): string[]
{
    return effectBonuses(world, computed.from).filter((field) => computed.direct?.some((name) => comparableText(name) === comparableText(field)) === true);
}

/**
 * The first item of its list whose page gives a field, with the fields of its own that its formula reads, as a shield's bonus (PRO-5): a page of the campaign,
 * which an effect can change, not one of the system, as the unarmed strike (D-235).
 */
export function itemSource(world: World, fields: Record<string, unknown>, field: string): { item: string; list: string; own: string[]; } | undefined
{
    const list = itemList(world, field);
    const scope = formulaScope(world, fields);

    for (const item of list === undefined ? [] : listItems(scope.field(list))) {
        const page = scope.page(item.name);
        const given = itemFormula(page, field);

        if (list !== undefined && page !== undefined && given?.formula !== undefined && pagesWithName(world, item.name).length > 0) {
            return { item: item.name, list, own: fieldsRead(given.formula).filter((name) => keyOf(page, name) !== undefined) };
        }
    }

    return undefined;
}

/** The maximum the game system works out for a counter with these fields, with only the values that changed it (FOR-6, FOR-8); undefined where it has none. */
export function workedMaximum(world: World, fields: Record<string, unknown>, field: string): WorkedField | undefined
{
    const entry = Object.entries(world.system?.formulas?.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field.trim()));
    const formula = entry?.[1].max;
    const scope = formulaScope(world, fields);

    if (entry === undefined) {
        return undefined;
    }

    // Without a formula, the maximum a class's row gives, from the classes it comes from (DAT-9).
    if (formula === undefined) {
        const row = scope.progression()?.values.find((value) => comparableText(value.field) === comparableText(entry[0]));
        const max = numberOf(row?.value);
        return row === undefined || max === undefined ? undefined : { field: entry[0], value: max, reads: row.from.map((from): FormulaRead => ({ list: scope.progression()?.lists[0] ?? "", item: from.name, value: from.level })) };
    }

    const worked = workOut(formula, scope);
    return worked.value === undefined ? undefined : { field: entry[0], value: atLeastZero(worked.value), reads: contributingReads(formula, scope, worked) };
}

/** What the lists of a page give as computed fields: what its classes give (PRO-2, PRO-3), then what the formulas of its items' pages work out (PRO-5). */
export function givenFields(world: World, scope: ReturnType<typeof formulaScope>, explained = false): WorkedField[]
{
    return [...progressionFields(world, scope), ...itemFields(world, scope, explained)];
}

/**
 * The fields the classes give as computed fields, each with the items it comes from (PRO-2, FOR-8): the values of their rows, then the features. A column named
 * as a counter of the system is not one: it is that counter's maximum (DAT-9).
 */
function progressionFields(world: World, scope: ReturnType<typeof formulaScope>): WorkedField[]
{
    const progression = scope.progression();

    if (progression === undefined) {
        return [];
    }

    const values = progression.values.filter((value) => !isSystemCounter(world, value.field)).map((value) => ({
        field: value.field,
        value: value.value,
        reads: value.from.map((from): FormulaRead => ({ list: progression.lists[0], item: from.name, value: from.level })),
    }));
    const features = progression.features.length + progression.written.length === 0 ? [] : [{
        field: progression.featuresField,
        value: [...progression.features.map((feature) => feature.name), ...progression.written].join(", "),
        reads: progression.from.map((from): FormulaRead => ({ list: from.list, item: from.name, value: from.level ?? 1 })),
    }];
    return [...values, ...features];
}

/** The fields the formulas of the items' pages give, one value for each item, for every list the system names (PRO-5). */
function itemFields(world: World, scope: ReturnType<typeof formulaScope>, explained: boolean): WorkedField[]
{
    return Object.values(world.system?.itemFormulas ?? {}).flat().flatMap((field) => {
        const worked = scope.each(field, explained);
        // A bonus an item gives as nothing, as the speed a heavy armor takes from who has its Strength, says nothing (FOR-8).
        return worked === undefined || (worked.value === 0 && declaredKind(world, field) === "bonus") ? [] : [worked];
    });
}

/** A field the classes give, as a computed field that cannot be written, with the lists it comes from (PRO-2, FOR-7); undefined for any other field. */
export function progressedField(world: World, scope: ReturnType<typeof formulaScope>, field: string): { name: string; value: number | string; from: string[]; } | undefined
{
    const found = givenFields(world, scope).find((worked) => comparableText(worked.field) === comparableText(field.trim()));
    const list = found === undefined ? undefined : itemList(world, found.field);

    // The features are written too, beside those the rows give (PRO-3).
    if (found === undefined || comparableText(found.field) === comparableText(scope.progression()?.featuresField ?? "")) {
        return undefined;
    }

    // A formula of the items' pages comes from what it reads, as the bonus an item gives, and from its list (PRO-5); the rows, from the lists alone.
    if (list !== undefined) {
        const read = listItems(scope.field(list)).flatMap((item) => {
            const page = scope.page(item.name);
            const given = itemFormula(page, found.field);
            // What the item holds itself, as a weapon's bonus, comes from it, not from who lists it.
            // Only the dice a field gives count, as a monk's martial-arts: one no one has is no source.
            const dice = (given === undefined ? [] : diceFields(given)).filter((name) => scope.field(name) !== undefined).flatMap((name) => writtenSources(world, { kind: "field", name }, scope));
            const formula = given?.formula === undefined ? [] : writtenSources(world, given.formula, scope);
            return [...formula, ...dice].filter((name) => page === undefined || keyOf(page, name) === undefined);
        });
        return { name: found.field, value: found.value, from: [...new Set([...read, list])] };
    }

    return { name: found.field, value: found.value, from: scope.progression()?.lists ?? [] };
}

/** The limits of a counter worked out in a scope, where they have a whole value (FOR-6); without a max formula, the column of a class's row (DAT-9). */
function limitsIn(scope: ReturnType<typeof formulaScope>, limits: { min?: Formula; max?: Formula; }, field: string): { min?: number; max?: number; }
{
    const whole = (worked: WorkedOut | undefined): number | undefined => (worked?.value !== undefined && Number.isSafeInteger(worked.value) ? worked.value : undefined);
    const min = whole(limits.min === undefined ? undefined : workOut(limits.min, scope));
    const row = limits.max === undefined ? numberOf(progressionValue(scope.progression(), field)) : undefined;
    const max = limits.max === undefined ? (row !== undefined && Number.isSafeInteger(row) ? row : undefined) : whole(workOut(limits.max, scope));
    return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max: atLeastZero(max) }) };
}

/** A maximum worked out below 0, as 1 + cha-mod with Charisma 7, is 0: a counter is never written with a maximum below 0 (FOR-6). */
function atLeastZero(max: number): number
{
    return Math.max(0, max);
}

/**
 * The written fields a formula comes from, through the computed fields it reads that have a value: what can be changed, as wis for passive-perception, and
 * level where the page writes it, having no classes (FOR-7).
 */
function writtenSources(world: World, formula: Formula, scope: ReturnType<typeof formulaScope>, seen = new Set<string>()): string[]
{
    const formulas = world.system?.formulas;
    const index = formulas === undefined ? undefined : formulaIndex(formulas);
    const sources = fieldsRead(formula).flatMap((name) => {
        const entry = index?.computed.get(comparableText(name));

        // What the classes give comes from the lists that name them (PRO-3); what the items' pages give, from their list, as armor-class from equipped (PRO-5).
        // Whether the classes or the items give it, without asking where they come from, which may read this field again.
        if (entry === undefined && givenFields(world, scope).some((worked) => comparableText(worked.field) === comparableText(name))) {
            const list = itemList(world, name);
            return list === undefined ? (scope.progression()?.lists ?? [name]) : [list];
        }

        // What the engine gives a formula, as the campaign's rigor or a character's load, is no field anyone writes (FOR-2).
        if (["rigor", "effects", "load", "load-limit"].includes(comparableText(name))) {
            return [];
        }

        if (entry === undefined || scope.computed(name)?.value === undefined) {
            return [name];
        }

        if (seen.has(comparableText(name))) {
            return [];
        }

        seen.add(comparableText(name));
        return writtenSources(world, entry[1], scope, seen);
    });
    return sources.filter((name, position) => sources.findIndex((other) => comparableText(other) === comparableText(name)) === position);
}

/**
 * The bonus fields among those a computed field comes from, which an effect on the page gives to change it, as bonus-ac for ac (FOR-5); not those the items of a
 * list give, as a shield's armor-class-bonus, which change on the item (PRO-5).
 */
function effectBonuses(world: World, from: string[]): string[]
{
    return from.filter((field) => declaredKind(world, field) === "bonus" && itemList(world, field) === undefined);
}
