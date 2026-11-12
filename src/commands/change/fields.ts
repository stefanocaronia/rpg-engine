// Finds the field a change names, or says why it can't and how to add it
import { fieldsRead } from "../../core/formula.ts";
import { comparableText, valueNamed, withArticle } from "../../core/text.ts";
import { formatCounter, readCounter, readCounterText } from "../../counters/index.ts";
import { type Coin, formatAmount, readAmount, readSignedAmount } from "../../money/index.ts";
import { baseChain, baseFieldOf, declaredKind, followersOf, goodsNamed, isCounterField, isDeclaredUncounted, isStandardField, type Page, stackName, stacksOf, systemPageNamed, type World } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { missingSystemHint } from "../shared/campaign/world.ts";
import { hasSheet, startingAtZero } from "../shared/sheet/system-fields.ts";
import { computedField, computedMessage, counterLimits, maximumSources } from "../shared/sheet/worked-out.ts";
import type { CounterHolder } from "./holder.ts";

/**
 * The holder's field with this name, ignoring case and how accents are written; a missing or fixed one fails with the counters and money it holds and how to add one.
 * A field the game system never counts fails with how to write it instead, with `suggested` as its new value when the change gives one.
 */
export function fieldName(world: World, holder: CounterHolder, fields: Record<string, unknown>, name: string, example: string, coins: Coin[] | undefined, suggested: string): string
{
    const keys = Object.keys(fields);
    const found = keys.find((key) => key === name) ?? keys.find((key) => comparableText(key) === comparableText(name.trim()));
    const page = holder.page;
    const computed = computedField(world, name, fields);

    if (computed !== undefined) {
        throw new Error(`${computedMessage(world, computed, page.name)}. Nothing changed.`);
    }

    if (found !== undefined && isStandardField(page.type, found) && !isCounterField(page.type, found)) {
        const what = holder.kind === "copy" && found === "creature" ? `${found} is the creature ${page.name} copies` : `${found} is a fixed field of ${page.name}`;
        throw new Error(`${what}, not a counter${holder.kind === "page" ? ": change it with write" : ""}.`);
    }

    const declared = found ?? name.trim();

    if (isDeclaredUncounted(world, declared)) {
        throw new Error(uncountedMessage(world, page.name, declared, suggested));
    }

    if (found !== undefined) {
        return found;
    }

    const held = keys.filter((key) => (!isStandardField(page.type, key) || isCounterField(page.type, key)) && !isDeclaredUncounted(world, key)).flatMap((key) => {
        const counter = readCounter(fields[key]);
        const purse = coins === undefined || declaredKind(world, key) !== undefined ? undefined : readAmount(fields[key], coins);
        return purse !== undefined && coins !== undefined ? [`${key} ${formatAmount(purse, coins)}`] : counter === undefined ? [] : [`${key} ${formatCounter(counter)}`];
    });
    const hasMoney = coins !== undefined && keys.some((key) => declaredKind(world, key) === undefined && readAmount(fields[key], coins) !== undefined);
    const listed = held.length > 0 ? `Its counters${hasMoney ? " and money" : ""}: ${held.join(", ")}.` : "It has no counters.";
    // A counter the system gives who has what it comes from is not added by hand, as a warlock's spell-slots to a wizard (DAT-9).
    const given = Object.keys(world.system?.formulas?.counters ?? {}).find((counter) => comparableText(counter) === comparableText(name.trim()));
    // A maximum that reads nothing, as a track of 5, is everyone's: it is written by hand as any other counter.
    const max = given === undefined ? undefined : world.system?.formulas?.counters[given]?.max;
    const everyones = max !== undefined && fieldsRead(max).length === 0;

    if (given !== undefined && !everyones && holder.kind === "page" && hasSheet(world, page)) {
        const sources = maximumSources(world, given, fields);
        const whence = sources.length === 0 ? `the tables of its ${world.system?.progression?.list ?? "lists"}` : sources.join(", ");
        throw new Error(`${page.name} has no ${given}: the system ${world.system?.name ?? ""} gives it from ${whence}, and ${page.name} has none from them. ${listed}`);
    }

    // Goods are stacks, never a field: the stacks the page holds, and the call for the kind the name means (STK-5).
    const stacks = holder.kind === "page" ? stacksOf(world, page).map((stack) => `${stackName(stack)} ${stack.count}`) : [];
    const goods = goodsNamed(world, name);
    const counted = stacks.length === 0 ? "" : `Its stacks: ${stacks.join(", ")}. `;
    // Its maximum, everyone's, in the example: the master writes it as the system works it out (FOR-7).
    const shown = everyones && given !== undefined ? `0/${counterLimits(world, fields, given).max ?? 0}` : example;
    const theirs = systemCountersHeld(world, fields);
    const how = goods === undefined ? howToAdd(world, holder, name, shown, theirs) : `Goods are a stack, changed by its kind, such as change ${page.name}, ${goods.name}, spend 1.`;
    throw new Error(`${page.name} has no field "${name}". ${counted}${listed} ${how}`);
}

/**
 * The fields, with a counter the game system declares and gives no maximum at 0 when a character, a quest or a copy that no page derives from does not hold it
 * yet, as temporary hit points: change starts it, since write never changes it once written (CNT-7, CNT-8, D-266).
 */
export function withDeclaredStart(world: World, holder: CounterHolder, fields: Record<string, unknown>, name: string): Record<string, unknown>
{
    const declared = startingAtZero(world, name);
    const held = Object.keys(fields).some((field) => comparableText(field) === comparableText(name.trim()));

    if (declared === undefined || held || computedField(world, declared, fields) !== undefined) {
        return fields;
    }

    // Never on a place, an item or a kind: on a page others derive from, it would reach all of them, as on Ghoul instead of Ghoul 1.
    const owner = holder.kind === "copy" || ((holder.page.type === "character" || holder.page.type === "quest") && followersOf(world, holder.page, declared).length === 0);
    return owner ? { ...fields, [declared]: 0 } : fields;
}

/** An item a name means that may be counted though no stack counts it yet, as a kind of the campaign spent to 0 everywhere: change says how to write its stack (STK-5). */
export function countable(world: World, name: string): Page | undefined
{
    const page = goodsNamed(world, name);
    return page !== undefined && comparableText(page.name) === comparableText(name.trim()) ? page : undefined;
}

/** Whether a name is a field of the page, one the game system declares or works out (CNT-8): a field before a kind of the same name (STK-5). */
export function holdsField(world: World, fields: Record<string, unknown>, name: string): boolean
{
    return Object.keys(fields).some((key) => comparableText(key) === comparableText(name.trim())) || declaredKind(world, name.trim()) !== undefined || computedField(world, name, fields) !== undefined;
}

/**
 * How to add a counter that neither the page nor its bases hold, on the nearest base of the campaign, since the system's are read-only (SYS-6); or why its base cannot be read.
 */
function howToAdd(world: World, holder: CounterHolder, name: string, example: string, theirs: string[]): string
{
    // A name the system does not have is most often one of its counters by another name, as health for hp: those first, an added field after (D-518).
    const meant = theirs.length === 0 ? "" : `If you meant a counter of the system ${world.system?.name ?? ""}, give its name, such as ${theirs.join(", ")}`;

    const page = holder.page;
    const field = baseFieldOf(page.type);
    const link = field === undefined || typeof page.fields[field] !== "string" ? undefined : page.fields[field];
    const chain = baseChain(world, page);
    const base = chain.find((candidate) => candidate.system === undefined);

    if (field !== undefined && link !== undefined && chain.length === 0) {
        const fix = holder.kind === "copy" ? "fix the creature's page, or let the copy leave the scene" : "fix the link with write";
        return `${page.name} ${holder.kind === "copy" ? "copies" : "derives from"} ${link}, which cannot be read: no ${field} has that name, two pages share it, or it is not ${withArticle(field)}. `
            + `To fix it, ${fix}; validate shows why.${missingSystemHint(world)}`;
    }

    if (base === undefined) {
        return meant === "" ? `To add one, use write, such as set ${name}=${example}.` : `${meant}; only one it lacks is added, with write, such as set ${name}=${example}.`;
    }

    // A page of the campaign named like one of the system's hides it (SYS-4): writing on it is not what the master means.
    const hides = systemPageNamed(world, base.name) === undefined ? "" : ` But ${base.name} hides the system ${world.system?.name ?? ""}'s ${base.name}: validate says how to fix it.`;
    const first = meant === "" ? "" : `${meant}. `;

    if (holder.kind === "copy") {
        return `${first}To add one to ${page.name} alone, use write, such as set ${name}=${example}. To give it to every ${base.name}, write it on ${base.name} once the scene is closed.${hides}`;
    }

    return `${first}${page.name} reads what it does not hold from ${base.name}: write the counter there, such as set ${name}=${example}, and everything that derives from ${base.name} takes it; or on ${page.name} alone.${hides}`;
}

/** The counters the game system declares among a page's fields, at most three, in the page's order. */
function systemCountersHeld(world: World, fields: Record<string, unknown>): string[]
{
    return Object.keys(fields).filter((key) => declaredKind(world, key) === "counter" && readCounter(fields[key]) !== undefined).slice(0, 3);
}

/**
 * A field the game system never counts, such as ac: a number for a while is an effect, for good a write (SYS-8). `suggested` is the value the change would give, when it gives one.
 */
function uncountedMessage(world: World, page: string, field: string, suggested: string): string
{
    const system = world.system?.name ?? "";

    if (!["number", "at-least"].includes(declaredKind(world, field) ?? "")) {
        const kind = declaredKind(world, field) === "text" ? "text" : declaredKind(world, field) === "list" ? "a list" : `a ${declaredKind(world, field) ?? "field"}`;
        return `${field} is ${kind} in the system ${system}, never counted: write it instead, such as write "${page}", set ${field}=${suggested}. Nothing changed.`;
    }

    return `${field} is a number in the system ${system}, never counted: for a while, effect, action add, page "${page}", set ${field}=${suggested}; `
        + `for good, write "${page}", set ${field}=${suggested}. Nothing changed.`;
}

/** The value a change would give a number, such as 18 for by 2 on ac 16; "<value>" when it gives none. */
export function suggestedNumber(fields: Record<string, unknown>, input: { field: string; by?: number | string; to?: number | string; }): string
{
    const current = valueNamed(fields, input.field.trim());

    // From a command line a number arrives as text.
    if (input.to !== undefined && /^[+-]?\d+$/.test(String(input.to).trim())) {
        return String(Number(input.to));
    }

    return typeof current === "number" && typeof input.by === "number" ? String(current + input.by) : "<value>";
}

/**
 * The value a missing counter or purse is shown with, in the hint to add one: money that the page holds, when money was asked for;
 * a clock as given, or empty (EVT-2); 0 for a field usually at zero, such as exhaustion (DAT-2); else 12/12.
 */
export function exampleValue(input: { by?: number | string; spend?: number | string; to?: number | string; }, coins: Coin[] | undefined, clock: boolean, zero: boolean): string
{
    const money = coins !== undefined && [input.by, input.spend, input.to].some((part) => typeof part === "string" && readSignedAmount(part, coins) !== undefined);

    if (money && coins !== undefined) {
        return `10 ${coins[0].name} (what it holds, not the price)`;
    }

    const given = typeof input.to === "string" ? readCounterText(input.to) : undefined;
    return clock ? (given?.max === undefined ? "0/4" : String(formatCounter(given))) : zero ? "0" : "12/12";
}

/** Whether the game system declares a field a counter and works out no maximum for it, as xp: it counts up from 0. */
export function withoutMaximum(system: GameSystem | undefined, field: string): boolean
{
    const counted = Object.entries(system?.fields ?? {}).some(([name, kind]) => kind === "counter" && comparableText(name) === comparableText(field));
    const limits = Object.entries(system?.formulas.counters ?? {}).find(([name]) => comparableText(name) === comparableText(field))?.[1];
    return counted && limits?.max === undefined;
}

/** Whether the game system's status line shows a field only when it is not at zero, as it does exhaustion: it is usually at zero (DAT-2). */
export function usuallyZero(system: GameSystem | undefined, field: string): boolean
{
    return system?.statusLine.some((entry) => entry.whenSet && comparableText(entry.field) === comparableText(field.trim())) === true;
}
