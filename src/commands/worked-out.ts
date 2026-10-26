// What the game system works out from the fields of a page (D-199, FOR-3–FOR-8): its computed fields, each with the values it came from, and the limits of
// its counters. The formulas are the system's data; this is where they meet the pages and the counters.
import {
    chosenDice,
    contributingReads,
    diceFields,
    factorOf,
    fieldsRead,
    type Formula,
    type FormulaRead,
    type FormulaScope,
    listItems,
    numberOf,
    parseRollFormula,
    type RollFormula,
    type SystemFormulas,
    type Table,
    tablesRead,
    type WorkedOut,
    workOut,
} from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText, sameName, valueNamed } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { readEffects } from "../effects/index.ts";
import { bonusPages, carriedWeight, declaredKind, findPage, inheritedFields, isEmptyField, linksIn, type Page, pagesWithName, readFieldValue, systemPageNamed, weightUnit, type World } from "../pages/index.ts";
import { formatDuration } from "../time/index.ts";
import { type Progression, progressionOf, progressionProblems, progressionValue } from "./progression.ts";

/** A computed field that has a value, and the values it came from (FOR-8); a field the rows of the classes give may hold text, such as martial-arts 1d6 (PRO-2). */
export interface WorkedField
{
    field: string;
    value: number | string;
    reads: FormulaRead[];
}

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

/**
 * Whether a page keeps the sheet of the system (DAT-2, D-225): the player character, and a companion with a level, written or given by its classes, or that
 * derives from no creature. A fighter who derives from her race does, a wolf with its stat block does not; nor does any other page.
 */
export function hasSheet(world: World, page: Page): boolean
{
    // A level or classes the page inherits count too, as a companion deriving from a creature with classes.
    return page.type === "character" && keepsSheet(world, page.fields.role === "companion" ? inheritedFields(world, page) : page.fields);
}

/** Whether a character with these fields keeps the sheet (DAT-2): the player character, and a companion with a level or classes, or that derives from no creature. */
export function keepsSheet(world: World, fields: Record<string, unknown>): boolean
{
    // The level's field is the game's, as its list is: a game without levels has none (review of 17 October).
    const progression = world.system?.progression;
    const list = progression === undefined ? undefined : keyOf(fields, progression.list);
    const level = progression?.level === undefined ? undefined : (keyOf(fields, progression.level) ?? progression.level);
    const levelled = (level !== undefined && !isEmptyField(fields[level])) || (list !== undefined && !isEmptyField(fields[list]));
    return fields.role === "pc" || (fields.role === "companion" && (isEmptyField(fields.creature) || levelled));
}

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
const carriedKey = Symbol("carried weight");

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

/** Whether a counter of the system comes back with a rest (DAT-9): who keeps the sheet has it full until it spends it. */
export function isUse(world: World, field: string): boolean
{
    return (world.system?.uses ?? []).some((name) => name.endsWith("*") ? comparableText(field).startsWith(comparableText(name.slice(0, -1))) : comparableText(name) === comparableText(field));
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

/** A formula of the system worked out on these fields, as a recipe's regain is; undefined when it has no value (FOR-4). */
export function formulaValue(world: World, fields: Record<string, unknown>, formula: Formula): number | undefined
{
    return workOut(formula, formulaScope(world, fields)).value;
}

/** What the lists of a page give as computed fields: what its classes give (PRO-2, PRO-3), then what the formulas of its items' pages work out (PRO-5). */
function givenFields(world: World, scope: ReturnType<typeof formulaScope>, explained = false): WorkedField[]
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

/** The list whose items' pages give a field as a formula, as classes for spell-save-dc (PRO-5); undefined when none does. */
export function itemList(world: World, field: string): string | undefined
{
    return Object.entries(world.system?.itemFormulas ?? {}).find(([, names]) => names.some((name) => comparableText(name) === comparableText(field.trim())))?.[0];
}

/**
 * A formula that each item of its list gives on its page, such as a class's spell-save-dc or a weapon's attack, worked out on who lists them for each item that
 * gives one (PRO-5): a number, or a roll as text, for one; "Cleric 13, Wizard 12" for several. Undefined when none gives it.
 */
function eachItem(world: World, field: string, items: ItemValue[]): WorkedField | undefined
{
    if (items.length === 0) {
        return undefined;
    }

    const [first] = items;
    return items.length === 1
        ? { field, value: first.value, reads: first.reads }
        : { field, value: items.map((item) => `${item.name} ${signedText(world, field, item.value)}`).join(", "), reads: items.flatMap((item) => item.reads) };
}

/** What an item of a list gives a field (PRO-5), with what it came from. */
interface ItemValue
{
    name: string;
    value: number | string;
    reads: FormulaRead[];
}

/**
 * What a field gives for each item of its list whose page gives it (PRO-5): a number, or a roll as text, as "1d8+3 slashing". The formula reads first the
 * item's own fields, as a magic weapon's bonus, then those of who lists it.
 */
function itemValues(world: World, scope: ReturnType<typeof formulaScope>, field: string, explained: boolean): ItemValue[]
{
    const list = itemList(world, field);

    if (list === undefined) {
        return [];
    }

    return listItems(scope.field(list)).flatMap((item) => {
        const page = scope.page(item.name);
        const given = itemFormula(page, field);

        if (page === undefined || given === undefined) {
            return [];
        }

        const own = itemScope(world, scope, page, list);
        const worked = given.formula === undefined ? undefined : workOut(given.formula, own);
        // The dice it takes, as the Martial Arts die of a monk when it is larger (D-235); none of its choices with a value, no value.
        const dice = given.dice === undefined ? undefined : chosenDice(given.dice, own);

        if ((given.formula !== undefined && worked?.value === undefined) || (given.dice !== undefined && dice === undefined)) {
            return [];
        }

        const reads = worked === undefined || given.formula === undefined ? [] : explained ? contributingReads(given.formula, own, worked) : worked.reads;
        return [{ name: item.name, value: rollValue(given, dice, worked?.value), reads: [...(dice?.reads ?? []), ...reads] }];
    });
}

/**
 * "1d8+3 slashing": a roll's dice, the number its formula works out, unless 0, and its words; the number alone for a plain formula. Dice that are a number, as an
 * unarmed strike's 1, add to it: "4 bludgeoning" (D-235).
 */
function rollValue(given: RollFormula, dice: { dice?: string; number?: number; } | undefined, value: number | undefined): number | string
{
    const rolled = dice?.dice;
    const total = dice?.number === undefined ? value : (value ?? 0) + dice.number;

    if (rolled === undefined && given.words === undefined && total !== undefined) {
        return total;
    }

    const number = total === undefined || (total === 0 && rolled !== undefined) ? "" : rolled === undefined ? String(total) : total > 0 ? `+${total}` : String(total);
    return `${rolled ?? ""}${number}${given.words === undefined ? "" : ` ${given.words}`}`;
}

/**
 * The scope of an item's formula: the item's own fields first, as a magic weapon's bonus, written 1 or +1, then those of who lists it (PRO-5). The formulas
 * the item gives for its list are worked out on who lists it: a monk's Unarmored Defense reads the armor-class-bonus of the shield it has equipped.
 */
function itemScope(world: World, scope: FormulaScope, page: Record<string, unknown>, list: string): FormulaScope
{
    const given = world.system?.itemFormulas?.[list] ?? [];
    return {
        ...scope,
        field: (name) => {
            const key = keyOf(page, name);

            if (key === undefined || isEmptyField(page[key]) || given.some((field) => comparableText(field) === comparableText(name))) {
                return scope.field(name);
            }

            return numberOf(page[key]) ?? page[key];
        },
    };
}

/** The formula an item's page gives in a field, read once for each text; undefined when it gives none, or one that does not read, which validate reports (PRO-5). */
function itemFormula(fields: Record<string, unknown> | undefined, field: string): RollFormula | undefined
{
    const text = fields === undefined ? undefined : fields[keyOf(fields, field) ?? ""];

    if (typeof text !== "string" && typeof text !== "number") {
        return undefined;
    }

    const key = String(text);

    if (!itemFormulas.has(key)) {
        try {
            itemFormulas.set(key, parseRollFormula(key));
        } catch {
            itemFormulas.set(key, undefined);
        }
    }

    return itemFormulas.get(key);
}

const itemFormulas = new Map<string, RollFormula | undefined>();

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

/** A field the classes give, as a computed field that cannot be written, with the lists it comes from (PRO-2, FOR-7); undefined for any other field. */
function progressedField(world: World, scope: ReturnType<typeof formulaScope>, field: string): { name: string; value: number | string; from: string[]; } | undefined
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

/** The minimum and maximum the game system works out for a counter with these fields, where they have a whole value (FOR-6). */
export function counterLimits(world: World, fields: Record<string, unknown>, field: string): { min?: number; max?: number; }
{
    const limits = Object.entries(world.system?.formulas?.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field.trim()))?.[1];

    if (limits === undefined) {
        return {};
    }

    return limitsIn(formulaScope(world, fields), limits, field);
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
 * The name, as the game system declares it, of a counter that starts at 0 where a page does not hold it yet, as temporary hit points or experience points:
 * declared a counter, with no maximum and not a use that comes back with a rest (CNT-8, D-266). Undefined for any other.
 */
export function startingAtZero(world: World, field: string): string | undefined
{
    const declared = Object.keys(world.system?.fields ?? {}).find((name) => comparableText(name) === comparableText(field.trim()));
    const limits = Object.entries(world.system?.formulas?.counters ?? {}).find(([counter]) => comparableText(counter) === comparableText(field.trim()))?.[1];
    return declared !== undefined && declaredKind(world, declared) === "counter" && limits?.max === undefined && limits?.refill === undefined ? declared : undefined;
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

/**
 * The bonus fields among those a computed field comes from, which an effect on the page gives to change it, as bonus-ac for ac (FOR-5); not those the items of a
 * list give, as a shield's armor-class-bonus, which change on the item (PRO-5).
 */
export function effectBonuses(world: World, from: string[]): string[]
{
    return from.filter((field) => declaredKind(world, field) === "bonus" && itemList(world, field) === undefined);
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

/** A value of a field as the outputs show it: with its sign when the system declares the field a modifier or a bonus (FOR-8). */
export function signedText(world: World, field: string, value: number | string): string
{
    const kind = declaredKind(world, field);

    // A length in the system's unit, at most one decimal: 12.5 ft (SPD-1).
    if (typeof value === "number" && kind === "length") {
        return `${Math.round(value * 10) / 10}${world.system?.lengthUnit === undefined ? "" : ` ${world.system.lengthUnit}`}`;
    }

    // A weight in the unit the system's items are weighed in: 420 lb.
    if (typeof value === "number" && kind === "weight") {
        const unit = world.system?.load === undefined ? undefined : weightUnit(world, world.system.load.field);
        return `${Math.round(value * 10) / 10}${unit === undefined ? "" : ` ${unit}`}`;
    }

    // A duration in minutes as the engine writes them, half a minute in seconds: 3m, 30s.
    if (typeof value === "number" && kind === "duration") {
        return value > 0 && value < 1 ? `${Math.round(value * 60)}s` : formatDuration(Math.round(value));
    }

    return typeof value === "number" && (kind === "modifier" || kind === "bonus") && value >= 0 ? `+${value}` : String(value);
}

/** "insight +5: wis-mod +3, proficiency +2, Insight in skill-proficiencies": a computed field and what it came from, leaving out what adds nothing (FOR-8). */
export function workedLine(world: World, worked: WorkedField): string
{
    const parts = workedParts(world, worked.reads);
    return `${worked.field} ${signedText(world, worked.field, worked.value)}${parts === "" ? "" : `: ${parts}`}`;
}

/** "wis-mod +3, proficiency +2, Insight in skill-proficiencies": the values a result came from, leaving out what adds nothing (FOR-8). */
export function workedParts(world: World, reads: FormulaRead[]): string
{
    const parts = reads.flatMap((read): string[] => {
        if ("table" in read) {
            // A key the explanation does not already give, as text: "ranks dangerous: 8".
            const keyed = reads.some((other) => "field" in other && "key" in other && other.key === true);
            return [keyed ? `${read.table} ${read.value}` : `${read.table} ${read.key}: ${read.value}`];
        }

        // The dice a roll took from a field, as a monk's martial-arts 1d6 (D-235).
        if ("dice" in read) {
            return [`${read.field} ${read.dice}`];
        }

        if ("field" in read) {
            // A bonus of 0 and a factor of 1 change nothing (FOR-5).
            const kind = declaredKind(world, read.field);
            return (read.value === 0 && kind === "bonus") || (read.value === 1 && kind === "factor") ? [] : [`${read.field} ${signedText(world, read.field, read.value)}`];
        }

        if ("item" in read) {
            return read.value === 0 ? [] : [read.value === 1 && !/\d/.test(read.item) ? `${read.item} in ${read.list}` : `${read.item} ${read.value} in ${read.list}`];
        }

        // The total of a list says nothing more beside one of its items, "Cleric 3 in classes", nor when it is 0; how many items a list has is no part of a value.
        if (read.count === true || read.value === 0 || reads.some((other) => "item" in other && other.list === read.list && other.value !== 0)) {
            return [];
        }

        return [`${read.value} in ${read.list}${read.where === undefined ? "" : `, ${read.where}`}`];
    });
    // "Perception in skills" says nothing more beside "Perception 3 in skills".
    const named = (part: string): boolean => parts.some((other) => other !== part && other.startsWith(part.replace(/ in [^ ]+$/, " ")) && other.endsWith(part.slice(part.lastIndexOf(" in "))));
    return parts.filter((part, index) => parts.indexOf(part) === index && !named(part)).join(", ");
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

/**
 * What a formula reads for a field the page lacks (FOR-2, FOR-4, FOR-5): a bonus as 0, a factor as 1, the effects by their names, the campaign's rigor; the
 * page's own value, as always-in lists give it, for anything else.
 */
function missingValue(world: World, fields: Record<string, unknown>, name: string): unknown
{
    const kind = declaredKind(world, name);

    if (kind === "bonus" || kind === "factor") {
        return kind === "bonus" ? 0 : 1;
    }

    if (comparableText(name) === "rigor") {
        return world.rigor;
    }

    // What a character carries weighs, and its limit by the system's formula (LOAD-1, LOAD-4).
    if (comparableText(name) === "load") {
        return (fields as Record<string | symbol, unknown>)[carriedKey];
    }

    if (comparableText(name) === "load-limit" && world.system?.load !== undefined) {
        return formulaValue(world, fields, world.system.load.limit);
    }

    return withAlwaysIn(world, fields, name, undefined);
}

/** The scope a formula reads on these fields: computed fields by their formulas, each worked out once; a bonus field the page lacks as 0 (FOR-4, FOR-5). */
function formulaScope(
    world: World,
    fields: Record<string, unknown>,
): FormulaScope & { computed(name: string): WorkedOut | undefined; progression(): Progression | undefined; each(field: string, explained: boolean): WorkedField | undefined; page(name: string): Record<string, unknown> | undefined; }
{
    const formulas = world.system?.formulas;
    const index = formulas === undefined ? undefined : formulaIndex(formulas);
    const keys = new Map<string, string>();
    const done = new Map<string, WorkedOut>();
    let progressed: { progression?: Progression; } | undefined;
    // What the classes give, worked out once and only when a formula reads a field it may give (PRO-2).
    const progression = (): Progression | undefined => (progressed ??= { progression: progressionOf(world, fields) }).progression;

    for (const key of Object.keys(fields)) {
        if (!keys.has(comparableText(key))) {
            keys.set(comparableText(key), key);
        }
    }

    const computed = (name: string): WorkedOut | undefined => {
        const entry = index?.computed.get(comparableText(name));

        if (entry === undefined) {
            return undefined;
        }

        const key = comparableText(entry[0]);
        const worked = done.get(key) ?? workOut(entry[1], scope);
        done.set(key, worked);
        return worked;
    };

    // What the items' pages give a field, worked out once; a formula that reads itself, round and round, has no value (PRO-5).
    const itemsDone = new Map<string, ItemValue[]>();
    const working = new Set<string>();

    const items = (field: string, explained: boolean): ItemValue[] => {
        const key = `${comparableText(field)}|${explained}`;

        if (itemsDone.has(key) || working.has(comparableText(field))) {
            return itemsDone.get(key) ?? [];
        }

        working.add(comparableText(field));
        const found = itemValues(world, full, field, explained);
        working.delete(comparableText(field));
        itemsDone.set(key, found);
        return found;
    };

    const each = (field: string, explained: boolean): WorkedField | undefined => eachItem(world, field, items(field, explained));

    const scope: FormulaScope = {
        field: (name) => {
            const worked = computed(name);

            if (worked?.value !== undefined) {
                return worked.value;
            }

            // A formula of the items' pages counts in another as the number of the first item that gives it, as the Unarmored Defense of the first class
            // that has it (p. 57); with none, the page's own value, as a witch's written DC.
            if (itemList(world, name) !== undefined) {
                const [first] = items(name, false);

                if (first !== undefined) {
                    return typeof first.value === "number" ? first.value : undefined;
                }
            }

            const given = isSystemCounter(world, name) ? undefined : progressionValue(progression(), name);

            if (given !== undefined) {
                return given;
            }

            const key = keys.get(comparableText(name));
            const value = key === undefined ? undefined : fields[key];

            // The effects read by their names, as has(effects, Grappled) (FOR-2); one named in the campaign's language by the system's English, Afferrato as Grappled (D-403).
            if (comparableText(name) === "effects") {
                const read = readEffects(value);
                return "effects" in read ? read.effects.map((effect) => systemName(world.words, effect.name)) : [];
            }

            return value === undefined ? missingValue(world, fields, name) : withAlwaysIn(world, fields, name, value);
        },
        table: (name) => index?.tables.get(comparableText(name)),
        // The page an item names, of the campaign or of the system, with its effects, as a class with its hit die (D-215) or a weapon under Magic Weapon.
        page: (name) => {
            const [named] = pagesWithName(world, name);
            const page = named ?? systemPageNamed(world, name);
            return page === undefined ? undefined : withEffectValues(world, page);
        },
    };
    const full = { ...scope, computed, progression, each, page: (name: string) => scope.page?.(name) };
    return full;
}

/**
 * A list as the formulas read it (DAT-13, D-235): what the page writes, then what the system puts in it for who keeps the sheet, as the unarmed strike among what a
 * character has equipped, so that the attacks show it.
 */
function withAlwaysIn(world: World, fields: Record<string, unknown>, list: string, value: unknown): unknown
{
    const added = Object.entries(world.system?.alwaysIn ?? {}).find(([name]) => comparableText(name) === comparableText(list))?.[1];

    if (added === undefined || !keepsSheet(world, fields)) {
        return value;
    }

    const written = value === undefined || value === null || value === "" ? [] : Array.isArray(value) ? value : [value];
    const names = new Set(listItems(written).map((item) => comparableText(item.name)));
    return [...written, ...added.filter((name) => !names.has(comparableText(name)))];
}

/** A system's computed fields and tables by the name as it is compared, built once for each system: a formula reads many names (D-194). */
function formulaIndex(formulas: SystemFormulas): { computed: Map<string, [string, Formula]>; tables: Map<string, Table>; }
{
    const known = indexes.get(formulas);

    if (known !== undefined) {
        return known;
    }

    const computed = new Map<string, [string, Formula]>();
    const tables = new Map<string, Table>();

    for (const entry of formulas.computed) {
        computed.set(comparableText(entry[0]), entry);
    }

    for (const [name, table] of Object.entries(formulas.tables)) {
        tables.set(comparableText(name), table);
    }

    const index = { computed, tables };
    indexes.set(formulas, index);
    return index;
}

const indexes = new WeakMap<SystemFormulas, { computed: Map<string, [string, Formula]>; tables: Map<string, Table>; }>();

/** Whether the system gives the limits of a counter by this name (FOR-1). */
function isSystemCounter(world: World, field: string): boolean
{
    return Object.keys(world.system?.formulas?.counters ?? {}).some((name) => comparableText(name) === comparableText(field));
}

/** The name under which the fields hold a field, in any case. */
function keyOf(fields: Record<string, unknown>, field: string): string | undefined
{
    return sameName(Object.keys(fields), field);
}

/** The English name the system's words give a name written in the campaign's language, Grappled for Afferrato (D-403); the name itself when they give none. */
function systemName(words: Record<string, string> | undefined, name: string): string
{
    const written = comparableText(name.trim());
    return Object.entries(words ?? {}).find(([, word]) => comparableText(word) === written)?.[0] ?? name;
}
