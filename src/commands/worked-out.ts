// What the game system works out from the fields of a page (D-199, FOR-3–FOR-8): its computed fields, each with the values it came from, and the limits of
// its counters. The formulas are the system's data; this is where they meet the pages and the counters.
import { contributingReads, fieldsRead, type Formula, type FormulaRead, type FormulaScope, numberOf, parseFormula, type SystemFormulas, type Table, type WorkedOut, workOut } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { declaredKind, inheritedFields, isEmptyField, type Page, pagesWithName, systemPageNamed, type World } from "../pages/index.ts";
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
    return [...computed, ...progressionFields(world, scope, explained)];
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
    for (const worked of progressionFields(world, scope)) {
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
    const fields = page.fields.role === "companion" ? inheritedFields(world, page) : page.fields;
    const list = world.system?.progression === undefined ? undefined : keyOf(fields, world.system.progression.list);
    const levelled = !isEmptyField(fields[keyOf(fields, "level") ?? "level"]) || (list !== undefined && !isEmptyField(fields[list]));
    const companion = page.fields.role === "companion" && (isEmptyField(page.fields.creature) || levelled);
    return page.type === "character" && (page.fields.role === "pc" || companion);
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

/**
 * The fields the classes give as computed fields, each with the items it comes from (PRO-2, FOR-8): the values of their rows, then the features, then what the
 * formulas their pages give work out, one value for each class (PRO-5). A column named as a counter of the system is not one: it is that counter's maximum (DAT-9).
 */
function progressionFields(world: World, scope: ReturnType<typeof formulaScope>, explained = false): WorkedField[]
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
    const features = progression.features.length === 0 ? [] : [{
        field: progression.featuresField,
        value: progression.features.map((feature) => feature.name).join(", "),
        reads: progression.from.map((from): FormulaRead => ({ list: from.list, item: from.name, value: from.level ?? 1 })),
    }];
    const each = (world.system?.progression?.formulas ?? []).flatMap((field) => {
        const worked = scope.each(field, explained);
        return worked === undefined ? [] : [worked];
    });
    return [...values, ...features, ...each];
}

/**
 * A formula that each item of the list gives on its page, such as a class's spell-save-dc, worked out on the character for each item that gives one (PRO-5): a
 * number for one, "Cleric 13, Wizard 12" for several. Undefined when none gives it.
 */
function eachItem(world: World, scope: ReturnType<typeof formulaScope>, field: string, explained: boolean): WorkedField | undefined
{
    const progression = scope.progression();
    const items = (progression?.from ?? []).filter((item) => item.level !== undefined).flatMap((item) => {
        const formula = itemFormula(scope.page(item.name), field);
        const worked = formula === undefined ? undefined : workOut(formula, scope);
        return formula === undefined || worked?.value === undefined ? [] : [{ name: item.name, value: worked.value, reads: explained ? contributingReads(formula, scope, worked) : worked.reads }];
    });

    if (items.length === 0) {
        return undefined;
    }

    const [first] = items;
    return items.length === 1
        ? { field, value: first.value, reads: first.reads }
        : { field, value: items.map((item) => `${item.name} ${signedText(world, field, item.value)}`).join(", "), reads: items.flatMap((item) => item.reads) };
}

/** The formula an item's page gives in a field, read once for each text; undefined when it gives none, or one that does not read, which validate reports (PRO-5). */
function itemFormula(fields: Record<string, unknown> | undefined, field: string): Formula | undefined
{
    const text = fields === undefined ? undefined : fields[keyOf(fields, field) ?? ""];

    if (typeof text !== "string" && typeof text !== "number") {
        return undefined;
    }

    const key = String(text);

    if (!itemFormulas.has(key)) {
        try {
            itemFormulas.set(key, parseFormula(key));
        } catch {
            itemFormulas.set(key, undefined);
        }
    }

    return itemFormulas.get(key);
}

const itemFormulas = new Map<string, Formula | undefined>();

/** A field the classes give, as a computed field that cannot be written, with the lists it comes from (PRO-2, FOR-7); undefined for any other field. */
function progressedField(world: World, scope: ReturnType<typeof formulaScope>, field: string): { name: string; value: number | string; from: string[]; } | undefined
{
    const progression = scope.progression();
    const found = progressionFields(world, scope).find((worked) => comparableText(worked.field) === comparableText(field.trim()));
    return found === undefined || progression === undefined ? undefined : { name: found.field, value: found.value, from: progression.lists };
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
    return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
}

/**
 * The game system's computed field with this name, in any case, and the fields it comes from, when its formula has a value with these fields (FOR-7):
 * where it has none, as on a creature without a level, the field is written like any other.
 */
export function computedField(world: World, field: string, fields: Record<string, unknown>): { name: string; value: number | string; from: string[]; } | undefined
{
    const entry = world.system?.formulas?.computed.find(([name]) => comparableText(name) === comparableText(field.trim()));
    const scope = formulaScope(world, fields);
    const value = entry === undefined ? undefined : scope.computed(entry[0])?.value;

    if (entry === undefined || value === undefined) {
        return progressedField(world, scope, field);
    }

    // Of several formulas, the one that gave the value says what it comes from (D-210).
    const used = entry[1].kind === "first" ? (entry[1].options.find((option) => workOut(option, scope).value !== undefined) ?? entry[1]) : entry[1];
    return { name: entry[0], value, from: writtenSources(world, used, scope) };
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

        // What the classes give comes from the lists that name them (PRO-3).
        if (entry === undefined && progressedField(world, scope, name) !== undefined) {
            return scope.progression()?.lists ?? [name];
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
export function computedMessage(world: World, computed: { name: string; value: number | string; from: string[]; }, page: string): string
{
    const bonuses = computed.from.filter((field) => declaredKind(world, field) === "bonus");
    const instead = bonuses.length === 0 ? "change one of those" : `change one of those, or give ${bonuses.join(" or ")} with an effect`;
    return `${computed.name} on ${page} is ${signedText(world, computed.name, computed.value)}, worked out by the system ${world.system?.name ?? ""} from ${computed.from.join(", ")}: ${instead}`;
}

/** A value of a field as the outputs show it: with its sign when the system declares the field a modifier or a bonus (FOR-8). */
export function signedText(world: World, field: string, value: number | string): string
{
    const kind = declaredKind(world, field);
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
            const keyed = reads.some((other) => "field" in other && other.key === true);
            return [keyed ? `${read.table} ${read.value}` : `${read.table} ${read.key}: ${read.value}`];
        }

        if ("field" in read) {
            return read.value === 0 && declaredKind(world, read.field) === "bonus" ? [] : [`${read.field} ${signedText(world, read.field, read.value)}`];
        }

        if ("item" in read) {
            return read.value === 0 ? [] : [read.value === 1 && !/\d/.test(read.item) ? `${read.item} in ${read.list}` : `${read.item} ${read.value} in ${read.list}`];
        }

        // The total of a list says nothing more beside one of its items: "Cleric 3 in classes".
        return reads.some((other) => "item" in other && other.list === read.list && other.value !== 0) ? [] : [`${read.value} in ${read.list}`];
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
    return worked.value === undefined ? undefined : { field: entry[0], value: worked.value, reads: contributingReads(formula, scope, worked) };
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
    const progressionList = world.system?.progression === undefined ? undefined : comparableText(world.system.progression.list);
    const relevant = (field: string): boolean => computedNames.has(comparableText(field)) || counterNames.has(comparableText(field)) || comparableText(field) === progressionList;
    const problems = world.pages.filter((page) => Object.keys(page.fields).some(relevant)).flatMap((page) => {
        const fields = inheritedFields(world, page);
        const scope = formulaScope(world, fields);
        const progressed = new Set(progressionFields(world, scope).map((worked) => comparableText(worked.field)));
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
        return [...written, ...limits, ...progressionProblems(world, page, fields)];
    });
    checkedWorlds.set(world, problems);
    return problems;
}

const checkedWorlds = new WeakMap<World, Problem[]>();

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

    // A formula of the classes' pages, worked out once; one that reads itself, round and round, has no value (PRO-5).
    const eachDone = new Map<string, WorkedField | undefined>();
    const working = new Set<string>();

    const each = (field: string, explained: boolean): WorkedField | undefined => {
        const key = `${comparableText(field)}|${explained}`;

        if (eachDone.has(key) || working.has(comparableText(field))) {
            return eachDone.get(key);
        }

        working.add(comparableText(field));
        const worked = eachItem(world, full, field, explained);
        working.delete(comparableText(field));
        eachDone.set(key, worked);
        return worked;
    };

    const scope: FormulaScope = {
        field: (name) => {
            const worked = computed(name);

            if (worked?.value !== undefined) {
                return worked.value;
            }

            // A formula of the classes' pages counts in another only as one number, for one class.
            if ((world.system?.progression?.formulas ?? []).some((field) => comparableText(field) === comparableText(name))) {
                const value = each(name, false)?.value;
                return typeof value === "number" ? value : undefined;
            }

            const given = isSystemCounter(world, name) ? undefined : progressionValue(progression(), name);

            if (given !== undefined) {
                return given;
            }

            const key = keys.get(comparableText(name));
            const value = key === undefined ? undefined : fields[key];
            return value === undefined && declaredKind(world, name) === "bonus" ? 0 : value;
        },
        table: (name) => index?.tables.get(comparableText(name)),
        // The page an item names, of the campaign or of the system, as a class with its hit die (D-215).
        page: (name) => {
            const [named] = pagesWithName(world, name);
            const page = named ?? systemPageNamed(world, name);
            return page === undefined ? undefined : inheritedFields(world, page);
        },
    };
    const full = { ...scope, computed, progression, each, page: (name: string) => scope.page?.(name) };
    return full;
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
    return Object.keys(fields).find((key) => comparableText(key) === comparableText(field));
}
