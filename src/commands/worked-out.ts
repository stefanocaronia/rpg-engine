// What the game system works out from the fields of a page (D-199, FOR-3–FOR-8): its computed fields, each with the values it came from, and the limits of
// its counters. The formulas are the system's data; this is where they meet the pages and the counters.
import { contributingReads, fieldsRead, type Formula, type FormulaRead, type FormulaScope, type SystemFormulas, type Table, type WorkedOut, workOut } from "../core/formula.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { declaredKind, inheritedFields, type World } from "../pages/index.ts";

/** A computed field that has a value, and the values it came from (FOR-8). */
export interface WorkedField
{
    field: string;
    value: number;
    reads: FormulaRead[];
}

/**
 * The computed fields of the game system that have a value with these fields (FOR-4), in the order the system gives them; `explained`, each with only the
 * values that changed it (FOR-8).
 */
export function workedFields(world: World, fields: Record<string, unknown>, explained = false): WorkedField[]
{
    const scope = formulaScope(world, fields);
    return (world.system?.formulas?.computed ?? []).flatMap(([field, formula]) => {
        const worked = scope.computed(field);
        return worked?.value === undefined ? [] : [{ field, value: worked.value, reads: explained ? contributingReads(formula, scope, worked) : worked.reads }];
    });
}

/**
 * The fields with what the game system works out over them: each computed field that has a value takes it, over what the page writes (FOR-4); a counter
 * takes the maximum the system works out, and a current above it reads as the maximum (FOR-6).
 */
export function withWorkedOut(world: World, fields: Record<string, unknown>): Record<string, unknown>
{
    const formulas = world.system?.formulas;

    if (formulas === undefined) {
        return fields;
    }

    const result = { ...fields };

    for (const { field, value } of workedFields(world, fields)) {
        result[keyOf(result, field) ?? field] = value;
    }

    for (const field of Object.keys(formulas.counters)) {
        const key = keyOf(result, field);
        const counter = key === undefined ? undefined : readCounter(result[key]);
        const { max } = counterLimits(world, fields, field);

        if (key !== undefined && counter !== undefined && max !== undefined) {
            result[key] = formatCounter({ value: Math.min(counter.value, max), max });
        }
    }

    return result;
}

/** The minimum and maximum the game system works out for a counter with these fields, where they have a whole value (FOR-6). */
export function counterLimits(world: World, fields: Record<string, unknown>, field: string): { min?: number; max?: number; }
{
    const limits = Object.entries(world.system?.formulas?.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field.trim()))?.[1];

    if (limits === undefined) {
        return {};
    }

    const scope = formulaScope(world, fields);
    const whole = (worked: WorkedOut | undefined): number | undefined => (worked?.value !== undefined && Number.isSafeInteger(worked.value) ? worked.value : undefined);
    const min = whole(limits.min === undefined ? undefined : workOut(limits.min, scope));
    const max = whole(limits.max === undefined ? undefined : workOut(limits.max, scope));
    return { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
}

/**
 * The game system's computed field with this name, in any case, and the fields it comes from, when its formula has a value with these fields (FOR-7):
 * where it has none, as on a creature without a level, the field is written like any other.
 */
export function computedField(world: World, field: string, fields: Record<string, unknown>): { name: string; value: number; from: string[]; } | undefined
{
    const entry = world.system?.formulas?.computed.find(([name]) => comparableText(name) === comparableText(field.trim()));
    const scope = formulaScope(world, fields);
    const value = entry === undefined ? undefined : scope.computed(entry[0])?.value;

    if (entry === undefined || value === undefined) {
        return undefined;
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
 * The written fields a formula comes from, through the computed fields it reads that have a value: what can be changed, as wis for passive-perception, and
 * level where the page writes it, having no classes (FOR-7).
 */
function writtenSources(world: World, formula: Formula, scope: ReturnType<typeof formulaScope>, seen = new Set<string>()): string[]
{
    const formulas = world.system?.formulas;
    const index = formulas === undefined ? undefined : formulaIndex(formulas);
    const sources = fieldsRead(formula).flatMap((name) => {
        const entry = index?.computed.get(comparableText(name));

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
export function computedMessage(world: World, computed: { name: string; value: number; from: string[]; }, page: string): string
{
    const bonuses = computed.from.filter((field) => declaredKind(world, field) === "bonus");
    const instead = bonuses.length === 0 ? "change one of those" : `change one of those, or give ${bonuses.join(" or ")} with an effect`;
    return `${computed.name} on ${page} is ${signedText(world, computed.name, computed.value)}, worked out by the system ${world.system?.name ?? ""} from ${computed.from.join(", ")}: ${instead}`;
}

/** A value of a field as the outputs show it: with its sign when the system declares the field a modifier or a bonus (FOR-8). */
export function signedText(world: World, field: string, value: number): string
{
    const kind = declaredKind(world, field);
    return (kind === "modifier" || kind === "bonus") && value >= 0 ? `+${value}` : String(value);
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

    if (entry === undefined || formula === undefined) {
        return undefined;
    }

    const scope = formulaScope(world, fields);
    const worked = workOut(formula, scope);
    return worked.value === undefined ? undefined : { field: entry[0], value: worked.value, reads: contributingReads(formula, scope, worked) };
}

/**
 * What validate says of the pages of the campaign about what the game system works out (FOR-7): a computed field written on a page, where the system works it
 * out and the page's value is never read; a written maximum that is not the one the system works out from the page without its effects. Found once for each world.
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
    const problems = world.pages.filter((page) => Object.keys(page.fields).some((field) => computedNames.has(comparableText(field)) || counterNames.has(comparableText(field)))).flatMap((page) => {
        const fields = inheritedFields(world, page);
        const scope = formulaScope(world, fields);
        // Only the fields the page writes are worked out: a page holds few of them.
        const written = Object.keys(page.fields).filter((key) => computedNames.has(comparableText(key))).flatMap((key): Problem[] => {
            const value = scope.computed(key)?.value;
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
                message: `${key} on ${page.name} has the maximum ${counter.max ?? "none"} written, but the system ${world.system?.name ?? ""} works out ${max}.`,
                fix: `change ${page.name}, field ${key}, to ${counter.value}/${max}`,
            }];
        });
        return [...written, ...limits];
    });
    checkedWorlds.set(world, problems);
    return problems;
}

const checkedWorlds = new WeakMap<World, Problem[]>();

/** The scope a formula reads on these fields: computed fields by their formulas, each worked out once; a bonus field the page lacks as 0 (FOR-4, FOR-5). */
function formulaScope(world: World, fields: Record<string, unknown>): FormulaScope & { computed(name: string): WorkedOut | undefined; }
{
    const formulas = world.system?.formulas;
    const index = formulas === undefined ? undefined : formulaIndex(formulas);
    const keys = new Map<string, string>();
    const done = new Map<string, WorkedOut>();

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

    const scope: FormulaScope = {
        field: (name) => {
            const worked = computed(name);

            if (worked?.value !== undefined) {
                return worked.value;
            }

            const key = keys.get(comparableText(name));
            const value = key === undefined ? undefined : fields[key];
            return value === undefined && declaredKind(world, name) === "bonus" ? 0 : value;
        },
        table: (name) => index?.tables.get(comparableText(name)),
    };
    return { ...scope, computed };
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

/** The name under which the fields hold a field, in any case. */
function keyOf(fields: Record<string, unknown>, field: string): string | undefined
{
    return Object.keys(fields).find((key) => comparableText(key) === comparableText(field));
}
