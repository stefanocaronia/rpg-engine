// The scope a system formula reads on a page's fields, item formulas included
import { chosenDice, contributingReads, type Formula, type FormulaRead, type FormulaScope, listItems, numberOf, parseRollFormula, type RollFormula, type SystemFormulas, type Table, type WorkedOut, workOut } from "../../../core/formula.ts";
import { comparableText } from "../../../core/text.ts";
import { readEffects } from "../../../effects/index.ts";
import { declaredKind, isEmptyField, pagesWithName, systemPageNamed, type World } from "../../../pages/index.ts";
import { carriedKey, withEffectValues } from "./effect-values.ts";
import { type Progression, progressionOf, progressionValue } from "./progression.ts";
import { isSystemCounter, itemList, keepsSheet, keyOf } from "./system-fields.ts";
import { signedText, type WorkedField } from "./worked-text.ts";

/** The scope a formula reads on these fields: computed fields by their formulas, each worked out once; a bonus field the page lacks as 0 (FOR-4, FOR-5). */
export function formulaScope(
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
export function formulaIndex(formulas: SystemFormulas): { computed: Map<string, [string, Formula]>; tables: Map<string, Table>; }
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

/** The English name the system's words give a name written in the campaign's language, Grappled for Afferrato (D-403); the name itself when they give none. */
function systemName(words: Record<string, string> | undefined, name: string): string
{
    const written = comparableText(name.trim());
    return Object.entries(words ?? {}).find(([, word]) => comparableText(word) === written)?.[0] ?? name;
}

/** A formula of the system worked out on these fields, as a recipe's regain is; undefined when it has no value (FOR-4). */
export function formulaValue(world: World, fields: Record<string, unknown>, formula: Formula): number | undefined
{
    return workOut(formula, formulaScope(world, fields)).value;
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
export function itemValues(world: World, scope: ReturnType<typeof formulaScope>, field: string, explained: boolean): ItemValue[]
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
export function itemFormula(fields: Record<string, unknown> | undefined, field: string): RollFormula | undefined
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
