// The checks before anything is written; each one throws what is wrong and how to fix it
import { comparableText, sameName, valueNamed, withArticle } from "../../core/text.ts";
import { formatCounter, readCounter } from "../../counters/index.ts";
import { readEffects } from "../../effects/index.ts";
import { type Coin, formatAmount, readAmount } from "../../money/index.ts";
import {
    baseFieldOf,
    baseValue,
    changedEnvironment,
    changedFields,
    checkFieldChange,
    environmentAt,
    type FieldChange,
    findPage,
    formatEnvironmentEntry,
    holdsField,
    inheritedFields,
    isCounterField,
    isDeclaredUncounted,
    isEmptyField,
    isNeverInherited,
    isStandardField,
    linksIn,
    misspelledFieldProblem,
    newBaseProblem,
    newPageFields,
    ownFieldChange,
    type Page,
    type PageType,
    readEnvironment,
    systemKnowsReason,
    systemLabel,
    systemPageNamed,
    type World,
} from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { checkNotCopied, type readOpenScene } from "../shared/scene/scene.ts";
import { checkBonds } from "../shared/sheet/bonds.ts";
import { effectiveFields, effectsField } from "../shared/sheet/effect-layer.ts";
import { checkLimits } from "../shared/sheet/limits.ts";
import { checkListValues } from "../shared/sheet/sheet.ts";
import { hasSheet, isUse, startingAtZero } from "../shared/sheet/system-fields.ts";
import { counterLimits, maximumHint, maximumSources } from "../shared/sheet/worked-out.ts";
import { eventFieldsProblem, plannedEventDateProblem } from "../shared/time/events.ts";

/**
 * The checks of write on what it is about to write on a page, new or not, and on its fields (D-435, D-514): their names and values, the lists the sheet
 * closes, a creature's copies in the open scene, counters, uses, the base, bonds, limits and an event's fields. It throws what is wrong, with how to fix it.
 */
export function checkFieldWrite(
    world: World,
    system: GameSystem | undefined,
    open: ReturnType<typeof readOpenScene>,
    coins: Coin[] | undefined,
    target: { existing: Page | undefined; name: string; type: PageType | undefined; },
    fields: FieldChange,
): void
{
    const { existing, name, type } = target;
    conditionsAsList(existing, fields);
    checkFieldNames(type, fields);
    checkFieldChange(type, fields);
    environmentAsSet(world, existing, type, name, fields);
    checkValues(fields);
    // A page that keeps the sheet, as it will be written, takes only the names the sheet closes (D-435).
    const asWritten: Page = { name, path: existing?.path ?? "", body: existing?.body ?? "", ...(type === undefined ? {} : { type }), fields: { ...existing?.fields, ...fields.set } };
    const onSheet = hasSheet(world, asWritten);
    checkListValues(system, fields.set ?? {}, onSheet);
    checkListValues(system, fields.add ?? {}, onSheet);
    checkKnows(world, fields);

    if (existing !== undefined) {
        if (changedFieldNames(fields).some(passesOn)) {
            checkNotCopied(world, open, existing);
        }

        checkCounters(world, existing, fields.set, coins);
        checkUses(world, system, existing, fields.set);
        checkClearedCounters(world, existing, ownFieldChange(world, existing, fields), coins);
        checkLists(world, existing, fields);
    }

    checkBase(world, existing?.name ?? name, type, fields.set);
    checkBonds(world, system, existing, existing?.name ?? name, fields);
    checkLimits(world, system, existing, existing?.name ?? name, fields);
    checkEventFields(world, existing, type, fields);
}

/** Effects change only with the effect command, which works out when they end and says what they change (EFF-6). */
export function checkNoEffects(change: FieldChange, page: Page | undefined): void
{
    // Effects that do not read can only be removed by hand, or with unset: effect will not write over them (EFF-12).
    const unreadable = page !== undefined && "problem" in readEffects(effectsField(page));
    const onlyUnset = Object.keys(change.set ?? {}).every((name) => comparableText(name) !== "effects") && [change.add, change.remove].every((items) => Object.keys(items ?? {}).every((name) => comparableText(name) !== "effects"));

    if (unreadable && onlyUnset) {
        return;
    }

    if (changedFieldNames(change).some((name) => comparableText(name) === "effects")) {
        throw new Error('effects change only with the effect command: action add with a name, for how long and the values it gives, such as name "Protezione", for 10m, set bonus-armor=2; action end to take one away. Nothing changed.');
    }
}

/** A standard field written in another case, such as Status, would be a field the engine does not read: refused before any other check. */
function checkFieldNames(type: PageType | undefined, change: FieldChange): void
{
    const names = [...Object.keys(change.set ?? {}), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
    const problem = names.map((name) => misspelledFieldProblem(type, name)).find((found) => found !== undefined);

    if (problem !== undefined) {
        throw new Error(problem);
    }
}

/** A counter written as current/max changes only with change, which keeps its limits and logs why (D-92, INH-11). A value that is not a counter makes it something else: on a page that holds it alone, only after unset. */
export function checkCounters(world: World, page: Page, set: Record<string, unknown> | undefined, coins: Coin[] | undefined): void
{
    const fields = inheritedFields(world, page);

    for (const [field, value] of Object.entries(set ?? {}).filter(([, candidate]) => !isEmptyField(candidate))) {
        const name = sameName(Object.keys(fields), field);
        const declared = name !== undefined && startingAtZero(world, name) !== undefined;
        const current = name === undefined || (isStandardField(page.type, name) && !isCounterField(page.type, name)) || isDeclaredUncounted(world, name) ? undefined : guarded(fields[name], coins, declared);
        const next = current === undefined ? undefined : sameKind(current.kind, value, coins);
        const base = baseValue(world, page, field);

        if (name === undefined || current === undefined || next === current.text || (next === undefined && base !== undefined)) {
            continue;
        }

        const hint = current.kind === "counter" ? maximumHint(world, effectiveFields(world, page), name) : undefined;
        throw new Error(hint === undefined ? guardedMessage(page, name, current.kind, next, holdsField(page, name) ? undefined : base?.base, base !== undefined) : workedCounterMessage(page, name, hint));
    }
}

/**
 * A use of the system that the character does not get, as a warlock's spell-slots on a wizard or slots on a warlock, is never written by hand (DAT-9): only on who
 * keeps the sheet and has the system's lists, and never for one the sheet asks to write, as hp.
 */
function checkUses(world: World, system: GameSystem | undefined, page: Page, set: Record<string, unknown> | undefined): void
{
    const list = world.system?.progression?.list;
    const after: Page = { ...page, fields: { ...page.fields, ...set } };
    const fields = inheritedFields(world, after);
    const classes = list === undefined ? undefined : valueNamed(fields, list);

    if (list === undefined || isEmptyField(classes) || !hasSheet(world, after)) {
        return;
    }

    const asked = askedFields(system);

    for (const field of Object.keys(set ?? {}).filter((name) => isUse(world, name) && !asked.has(comparableText(name)))) {
        const counted = Object.keys(world.system?.formulas?.counters ?? {}).some((name) => comparableText(name) === comparableText(field));
        const { max } = counterLimits(world, fields, field);

        if (counted && (max === undefined || max <= 0)) {
            const sources = maximumSources(world, field, fields);
            const whence = sources.length === 0 ? `the tables of its ${list}` : sources.join(", ");
            throw new Error(`${field} is a use the system ${world.system?.name ?? ""} gives from ${whence}, and ${page.name} has none of it: it is not written by hand. Nothing changed.`);
        }
    }
}

/**
 * A value that changes only with change, as it is compared: a current/max counter (D-92), a number the game system declares a counter with no maximum (CNT-7, D-266), or money
 * (MON-6); undefined for any other.
 */
export function guarded(value: unknown, coins: Coin[] | undefined, declared: boolean): { kind: "counter" | "money"; text: string; } | undefined
{
    const counter = readCounter(value);

    if (counter !== undefined && (counter.max !== undefined || declared)) {
        return { kind: "counter", text: String(formatCounter(counter)) };
    }

    const purse = coins === undefined ? undefined : readAmount(value, coins);
    return purse === undefined || coins === undefined ? undefined : { kind: "money", text: formatAmount(purse, coins) };
}

/** A new value read as the kind it would replace: any counter for a counter, coins for money; undefined when it is something else. */
function sameKind(kind: "counter" | "money", value: unknown, coins: Coin[] | undefined): string | undefined
{
    const counter = kind === "counter" ? readCounter(value) : undefined;
    const purse = kind === "money" && coins !== undefined ? readAmount(value, coins) : undefined;
    return counter !== undefined ? String(formatCounter(counter)) : purse !== undefined && coins !== undefined ? formatAmount(purse, coins) : undefined;
}

/** "hp is a counter whose maximum the game system works out": what to change instead, the current value with change and the maximum through what it comes from (D-226). */
function workedCounterMessage(page: Page, field: string, hint: { made: string; raise?: string; }): string
{
    const raise = hint.raise === undefined ? "" : `; to raise the maximum, write ${hint.raise}`;
    return `${field} is a counter whose maximum the game system works out: ${hint.made}. Change its current value with change, page "${page.name}", field ${field}${raise}. Nothing changed.`;
}

function guardedMessage(page: Page, field: string, kind: "counter" | "money", next: string | undefined, readFrom: Page | undefined, hasBase: boolean): string
{
    const what = kind === "counter" ? "a counter" : "money";
    const other = hasBase ? `To make it something else, set a value that is not ${what}.` : "To make it something else, unset it, then set it.";

    if (kind === "money") {
        const from = readFrom === undefined ? "" : `, which it reads from ${readFrom.name},`;
        const purse = next === undefined ? "sets the purse" : `"${next}" sets the purse`;
        return `${page.name}'s ${field}${from} changes only with change, page "${page.name}", field ${field}: spend pays, by adds coins, to ${purse}${readFrom === undefined ? "" : `, on ${page.name} only`}. ${other}`;
    }

    const use = `use change, page "${page.name}", field ${field}, to ${next ?? "a value"} (or by an amount)`;
    return readFrom === undefined ? `${field} is ${what}: ${use}. ${other}` : `${field} is ${what} that ${page.name} reads from ${readFrom.name}: ${use}, which writes it on ${page.name} only. ${other}`;
}

/**
 * Removing a counter that a base also holds as current/max would bring back the base's value with no line in the log: change does it, and logs it (INH-11).
 * `change` names the fields as the page writes them. The same field written twice in another case may lose one of the two: validate asks for it.
 */
export function checkClearedCounters(world: World, page: Page, change: FieldChange, coins: Coin[] | undefined): void
{
    for (const own of (change.unset ?? []).filter((field) => Object.hasOwn(page.fields, field))) {
        const current = isStandardField(page.type, own) || isDeclaredUncounted(world, own) ? undefined : guarded(page.fields[own], coins, false);
        const base = baseValue(world, page, own);
        const fromBase = base === undefined ? undefined : guarded(base.value, coins, false);
        const alsoHeld = Object.keys(page.fields).some((other) => other !== own && comparableText(other) === comparableText(own) && !isEmptyField(page.fields[other]));

        if (!alsoHeld && base !== undefined && current !== undefined && fromBase?.kind === current.kind) {
            const value = current.kind === "counter" ? fromBase.text : `"${fromBase.text}"`;
            const start = current.kind === "counter" ? `${own} on ${page.name} is a counter: without it,` : `Without ${own},`;
            throw new Error(
                `${start} ${page.name} would read ${fromBase.text} from ${base.base.name}, with no line in the log. Use change, page "${page.name}", field ${own}, to ${value}: it takes the field off, and ${page.name} follows ${base.base.name} again.`,
            );
        }
    }
}

/** knows lists pages and secrets of the campaign: a page of the game system, which anyone may know, never (SYS-2). */
function checkKnows(world: World, change: FieldChange): void
{
    const known = [...linksIn(change.set?.knows), ...linksIn(change.add?.knows)].map((name) => systemPageNamed(world, name)).find((page) => page !== undefined && findPage(world, page.name) === page);

    if (known !== undefined) {
        throw new Error(`${known.name} is ${systemLabel(known)}, ${systemKnowsReason(known)}: knows lists pages and secrets of the campaign. Nothing changed.`);
    }
}

/** A character or creature derives only from a creature, an item only from an item, never in a loop (INH-2, INH-3). */
function checkBase(world: World, name: string, type: PageType | undefined, set: Record<string, unknown> | undefined): void
{
    const field = baseFieldOf(type);
    const link = field === undefined ? undefined : set?.[field];
    const problem = typeof link === "string" ? newBaseProblem(world, { name, type }, link) : undefined;

    if (problem !== undefined) {
        throw new Error(`${problem} Nothing changed.`);
    }
}

/**
 * A planned event comes due at its date, so a write that sets its date or status cannot leave a date the engine does not read (D-100);
 * nor a clock or conditions that do not read (EVT-10).
 */
function checkEventFields(world: World, page: Page | undefined, type: PageType | undefined, change: FieldChange): void
{
    const changed = changedFieldNames(change);

    if (type !== "event" || !["date", "status", "clock", "when"].some((field) => changed.includes(field))) {
        return;
    }

    const fields = changedFields(page?.fields ?? newPageFields(type), change);
    const date = changed.includes("date") || changed.includes("status") ? plannedEventDateProblem(type, fields) : undefined;
    const problem = date ?? eventFieldsProblem(world, fields, changed);

    if (problem !== undefined) {
        throw new Error(problem);
    }
}

/**
 * A place's environment changes entry by entry (ENV-4): add puts a line in, or in place of the one with its name; remove takes one out by name; set gives them all,
 * each read as a line. The lines it ends with are set whole, or the field goes when none is left.
 */
function environmentAsSet(world: World, page: Page | undefined, type: PageType | undefined, name: string, change: FieldChange): void
{
    const add = change.add?.environment;
    const remove = change.remove?.environment;

    // On a character or an item environment would hold for nothing (ENV-6); taking it away is always allowed.
    if ((type === "character" || type === "item") && (change.set?.environment !== undefined || add !== undefined)) {
        throw new Error(`${name} is ${withArticle(type)}: an environment holds only on a place, for all it contains. What a thing does around itself, such as a lantern's light, is a field or an effect of its own.`);
    }

    if (type !== "place") {
        return;
    }

    if (change.set?.environment !== undefined) {
        const read = readEnvironment(change.set.environment);

        if ("problem" in read) {
            throw new Error(read.problem);
        }

        // Written back as lines, which Obsidian edits, whatever way they were given.
        change.set.environment = read.entries.map(formatEnvironmentEntry);
    }

    if (add === undefined && remove === undefined) {
        return;
    }

    checkOwnEntries(world, page, name, remove ?? []);
    const lines = changedEnvironment(page?.fields.environment, add ?? [], remove ?? [], page?.name ?? name);
    delete change.add?.environment;
    delete change.remove?.environment;

    if (lines.length > 0) {
        change.set = { ...change.set, environment: lines };
    } else if (page !== undefined && Object.hasOwn(page.fields, "environment")) {
        change.unset = [...(change.unset ?? []), "environment"];
    }
}

/** An entry to remove that the place does not write but reads from a place around it: removing it there would change it for all that place holds. */
function checkOwnEntries(world: World, page: Page | undefined, name: string, remove: unknown[]): void
{
    const own = page === undefined ? [] : readEnvironmentNames(page.fields.environment);

    for (const entry of remove.map((item) => String(item).split(":")[0].trim())) {
        const outer = page === undefined || own.some((other) => comparableText(other) === comparableText(entry)) ? undefined : environmentAt(world, page).find((found) => comparableText(found.entry.name) === comparableText(entry));

        if (outer !== undefined) {
            throw new Error(
                `${entry} holds in ${name} from ${outer.place.name}: to change it in ${name} only, add environment="${outer.entry.name}: …" on ${name}; to remove it everywhere ${outer.place.name} holds, write ${outer.place.name}, remove environment=${outer.entry.name}.`,
            );
        }
    }
}

/** The names a place's environment writes, as far as its lines read. */
function readEnvironmentNames(value: unknown): string[]
{
    const read = readEnvironment(value);
    return "entries" in read ? read.entries.map((entry) => entry.name) : [];
}

/** Adding a condition to an event that has one makes a list of the two, of which one is enough (EVT-3). */
function conditionsAsList(page: Page | undefined, change: FieldChange): void
{
    const current = page?.type === "event" ? page.fields.when : undefined;

    if (change.add?.when !== undefined && typeof current === "string" && current.trim() !== "" && change.set?.when === undefined) {
        change.set = { ...change.set, when: [current, ...change.add.when] };
        delete change.add.when;
    }
}

/** A field is given a value: an empty one would count as missing (INH-6), and removing a field is unset, which checks what it would bring back. */
export function checkValues(change: FieldChange): void
{
    const [empty] = Object.entries(change.set ?? {}).filter(([, value]) => isEmptyField(value));

    if (empty !== undefined) {
        throw new Error(`Give ${empty[0]} a value. To remove a field, use unset.`);
    }
}

/** Items are added to or removed from a list: one that the page reads as something else, itself or from a base, is set whole first (INH-7). */
export function checkLists(world: World, page: Page, change: FieldChange): void
{
    const fields = inheritedFields(world, page);

    for (const field of [...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})].filter((name) => !Object.hasOwn(change.set ?? {}, name))) {
        const [name, value] = Object.entries(fields).find(([key]) => comparableText(key) === comparableText(field)) ?? [];

        if (name !== undefined && !Array.isArray(value)) {
            const base = holdsField(page, name) ? undefined : baseValue(world, page, name)?.base;
            const from = base === undefined ? "" : `, which ${page.name} reads from ${base.name}`;
            throw new Error(`${name} on ${page.name} is ${JSON.stringify(value)}${from}, not a list: items cannot be added to it or removed from it. To make it a list, set it whole, such as set ${name}=[a, b].`);
        }
    }
}

/** Whether changing a field reaches the pages and copies deriving from a page: a field they inherit, or the creature or item it derives from. */
function passesOn(field: string): boolean
{
    return !isNeverInherited(field) || comparableText(field) === "creature" || comparableText(field) === "item";
}

export function changedFieldNames(change: FieldChange): string[]
{
    return [...Object.keys(change.set ?? {}), ...(change.unset ?? []), ...Object.keys(change.add ?? {}), ...Object.keys(change.remove ?? {})];
}

/** The fields the system's sheet asks of every character, its optional ones left out, as names are compared. */
export function askedFields(system: GameSystem | undefined): Set<string>
{
    return new Set((system?.sheet ?? []).flatMap((group) => group.entries.filter((entry) => !entry.optional).map((entry) => comparableText(entry.field))));
}
