// What the party uses up each day under the rigor «rules» (D-435, UPK-1–UPK-3): a ration each outside a settlement, the days without food and what they bring,
// and a word on water.
import { readSettings } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { parseFormula } from "../core/formula.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText, valueNamed, withArticle } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { formatAmount, payCoins, readAmount, totalOf } from "../money/index.ts";
import { baseChain, heldStacksOfKind, kindNamed, locate, type Page, type World, writePage } from "../pages/index.ts";
import type { GameSystem, Lifestyle } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
import { campaignCoins } from "./game-money.ts";
import { partyPages } from "./game-recipes.ts";
import { writeStacks } from "./game-stacks.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";
import { formulaValue, hasSheet } from "./worked-out.ts";

// Where a day's meals come from the lifestyle, not from what one carries: a place of these kinds, or one inside it (UPK-1).
const settlementKinds = ["city", "town", "village", "inn"];

/** The upkeep of each midnight passed (UPK-1–UPK-3), for the party members who keep a sheet, under the rigor «rules» or «simulation»; the lines that say it. */
export function dailyUpkeep(root: string, context: Context, system: GameSystem | undefined, days: number): string[]
{
    const upkeep = system?.upkeep;
    const rigor = readSettings(root).rigor;

    if (upkeep === undefined || days <= 0 || (rigor !== "rules" && rigor !== "simulation")) {
        return [];
    }

    const lines: string[] = [];

    let thirsty = false;

    for (let day = 0; day < days; day++) {
        const world = campaignWorld(root, context);
        const members = partyPages(world).filter((page) => hasSheet(world, page));
        thirsty ||= members.some((member) => !inSettlement(world, member));
        lines.push(...members.map((member) => safeUpkeep(root, context, member.name, upkeep)).filter((line) => line !== ""));
    }

    // Water once, however many midnights passed outside a settlement; a line that says the same each day, once.
    return [...new Set(lines), ...(thirsty && upkeep.water !== undefined ? [`Water: ${upkeep.water}. Read ${upkeep.rules}.`] : [])];
}

/** One member's day, which never stops the time that has passed: a page that cannot be written becomes a line with what to do (UPK-1). */
function safeUpkeep(root: string, context: Context, name: string, upkeep: NonNullable<GameSystem["upkeep"]>): string
{
    try {
        return memberUpkeep(root, context, name, upkeep);
    } catch (error) {
        const why = (error instanceof Error ? error.message : String(error)).replace(/ ?Nothing (changed|moved)[^.]*\.?$/, "");
        return `${name}'s day could not be counted: ${why} Fix it, then charge the day with change.`;
    }
}

/** One member's day (UPK-1, UPK-2): a meal in a settlement, else a ration from what it carries, else a day more without food, and past the grace a level of what it brings. */
function memberUpkeep(root: string, context: Context, name: string, upkeep: NonNullable<GameSystem["upkeep"]>): string
{
    const world = campaignWorld(root, context);
    const member = world.pages.find((page) => page.name === name);

    if (member === undefined) {
        return "";
    }

    const fields = effectiveFields(world, member);
    const hungry = Number(valueNamed(fields, upkeep.short) ?? 0) || 0;

    if (inSettlement(world, member)) {
        const paid = upkeep.lifestyle === undefined ? "" : lifestylePaid(root, context, world, member, upkeep.lifestyle);
        const ate = hungry !== 0 && setNumber(root, context, campaignWorld(root, context), member, upkeep.short, 0, "ate in a settlement") ? `${member.name} ate: ${upkeep.short} back to 0.` : "";
        return [paid, ate].filter((line) => line !== "").join(" ");
    }

    // The system's kind, or one of the campaign that derives from it, as Razioni from Rations.
    const kind = kindNamed(world, member, upkeep.daily);
    const held = kind === undefined ? [] : heldStacksOfKind(world, member, kind);

    if (kind !== undefined && held.length > 0) {
        const { container, stack } = held[0];
        const step = { container, kind: stack.kind, before: stack.count, after: stack.count - 1, ...(stack.label === undefined ? {} : { label: stack.label }) };
        const spent = writeStacks(root, context, world, [step], "a day's food", { upkeep: true }).notes.join(" ");
        const fed = hungry > 0 && setNumber(root, context, campaignWorld(root, context), member, upkeep.short, 0, "a day's food") ? ` ${upkeep.short} back to 0.` : "";
        // The last one eaten is said, for the player to hear before the day without (UPK-2).
        const left = held.reduce((total, holding) => total + holding.stack.count, 0) - 1;
        const last = left === 0 ? ` That was the last ${upkeep.daily}: tell the player before tomorrow.` : "";
        return `${member.name} eats a day's food: ${spent}${fed}${last}`;
    }

    const days = hungry + 1;
    setNumber(root, context, world, member, upkeep.short, days, "a day without food");
    const grace = Math.max(1, formulaValue(world, fields, parseFormula(upkeep.grace)) ?? 1);

    if (days <= grace) {
        return `${member.name} has no ${upkeep.daily}: ${upkeep.short} ${days}, of ${grace} before ${upkeep.worsens}. Read ${upkeep.rules}.`;
    }

    const worse = raise(root, context, campaignWorld(root, context), member.name, upkeep.worsens);
    return `${member.name} has no ${upkeep.daily}: ${upkeep.short} ${days}, past ${grace}: ${upkeep.worsens} ${worse}. Read ${upkeep.rules}.`;
}

/**
 * A day in a settlement paid from the purse by the lifestyle chosen (UPK-4): the line that says it, or what to do when none is chosen or the purse is short.
 */
function lifestylePaid(root: string, context: Context, world: World, member: Page, lifestyle: Lifestyle): string
{
    const chosen = valueNamed(effectiveFields(world, member), lifestyle.field);
    const named = Object.keys(lifestyle.costs).find((name) => typeof chosen === "string" && comparableText(name) === comparableText(chosen));
    const { coins } = campaignCoins(root, context);

    if (named === undefined) {
        const names = Object.keys(lifestyle.costs);
        const example = names[Math.floor(names.length / 2)];
        const who = member.fields.role === "pc" ? "ask the player, then " : "";
        // A lifestyle of the campaign's has no price the system knows: the master charges it.
        return typeof chosen === "string" && chosen.trim() !== ""
            ? `${member.name}'s ${lifestyle.field} ${chosen} has no price here: charge the day with change ${member.name} money, or set one of ${names.join(", ")}. Read ${lifestyle.rules}.`
            : `${member.name} has no ${lifestyle.field} to pay a day in a settlement: ${who}set ${lifestyle.field}=${example}, one of ${
                names.join(", ")
            }; or, for a night paid on its own or board earned by work, charge it with change ${member.name} money, if not yet charged. Read ${lifestyle.rules}.`;
    }

    const price = coins === undefined ? undefined : readAmount(lifestyle.costs[named], coins);

    if (coins === undefined || price === undefined || totalOf(price, coins) === 0) {
        return "";
    }

    const purse = readAmount(valueNamed(member.fields, "money") ?? "", coins) ?? {};
    const payment = payCoins(purse, price, coins);
    const before = formatAmount(purse, coins);

    if (payment === undefined) {
        return `${member.name} cannot pay ${withArticle(named)} day, ${lifestyle.costs[named]}, with money ${before}: a poorer lifestyle, work or a debt, as you judge. Read ${lifestyle.rules}.`;
    }

    const after = formatAmount(payment.purse, coins);
    writePage(world, member.name, undefined, { set: { money: after } });
    appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: member.name, field: "money", before, after, why: `a ${named} day`, upkeep: true }));
    return `${member.name} pays ${withArticle(named)} day: money ${before} → ${after}.`;
}

/** Whether a page stands in a settlement, or in a place inside one (UPK-1). */
function inSettlement(world: World, page: Page): boolean
{
    return locate(world, page).chain.some((place) => typeof place.fields.kind === "string" && settlementKinds.includes(comparableText(place.fields.kind.trim())));
}

/** Writes a plain number on a page, with its line in the log; false when it already held it. */
function setNumber(root: string, context: Context, world: World, page: Page, field: string, value: number, why: string): boolean
{
    const before = Number(valueNamed(page.fields, field) ?? 0) || 0;

    if (before === value) {
        return false;
    }

    writePage(world, page.name, undefined, value === 0 ? { unset: [field] } : { set: { [field]: value } });
    appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: page.name, field, before: String(before), after: String(value), why, upkeep: true }));
    return true;
}

/** Raises a counter by one, up to its maximum, as the page writes it: "1 → 2". */
function raise(root: string, context: Context, world: World, name: string, field: string): string
{
    const page = world.pages.find((candidate) => candidate.name === name);

    if (page === undefined) {
        return "";
    }

    const read = readCounter(valueNamed(effectiveFields(world, page), field)) ?? { value: 0 };
    const written = readCounter(valueNamed(page.fields, field));
    const after = Math.min(read.value + 1, read.max ?? Number.POSITIVE_INFINITY);
    const value = written?.max === undefined ? after : formatCounter({ ...written, value: after });
    writePage(world, page.name, undefined, { set: { [field]: value } });
    appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: page.name, field, before: String(read.value), after: String(after), why: "days without food", upkeep: true }));
    return `${read.value} → ${after}`;
}

/**
 * What an effect named after something that burns asks (UPK-3), as Torch: the kind it spends, its own or its fuel, such as Oil for a lantern, and how long it lasts;
 * refused when the holder carries none. Undefined for any other effect.
 */
export function burning(system: GameSystem | undefined, world: World, holder: Page, name: string): { kind: Page; lasts: string; } | undefined
{
    const entry = burningEntry(system, world, holder, name);

    if (entry === undefined) {
        return undefined;
    }

    const [burns, { lasts, spends }] = entry;
    const kind = kindNamed(world, holder, spends ?? burns);

    if (kind === undefined || heldStacksOfKind(world, holder, kind).length === 0) {
        throw new Error(`${holder.name} carries no ${spends ?? burns}, in what it holds, to light ${burns}. If the story gives some, add it to what ${holder.name} carries first. Nothing changed.`);
    }

    return { kind, lasts };
}

/** For an effect named after something that burns (UPK-3), what it spends, by the holder's name for it, as Torcia, and how many of it the holder still carries. */
export function fuelLeft(system: GameSystem | undefined, world: World, holder: Page, name: string): { fuel: string; left: number; } | undefined
{
    if (Object.keys(system?.burning ?? {}).length === 0) {
        return undefined;
    }

    // Only to show: a name two pages share, which a command would refuse, burns nothing here.
    try {
        const entry = burningEntry(system, world, holder, name);
        const kind = entry === undefined ? undefined : kindNamed(world, holder, entry[1].spends ?? entry[0]);
        return kind === undefined ? undefined : { fuel: kind.name, left: heldStacksOfKind(world, holder, kind).reduce((total, held) => total + held.stack.count, 0) };
    } catch {
        return undefined;
    }
}

/** Spends one of what burns from what the holder carries (UPK-3), with its line in the log; the line that says it. */
export function burnOne(root: string, context: Context, holderName: string, kind: Page): string
{
    const world = campaignWorld(root, context);
    const holder = world.pages.find((page) => page.name === holderName);
    const held = holder === undefined ? [] : heldStacksOfKind(world, holder, kind);

    if (held.length === 0) {
        return "";
    }

    const { container, stack } = held[0];
    const step = { container, kind: stack.kind, before: stack.count, after: stack.count - 1, ...(stack.label === undefined ? {} : { label: stack.label }) };
    return writeStacks(root, context, world, [step], "lit").notes.join(" ");
}

/** The system's entry of what burns that an effect is named after (UPK-3): by its name, or by a kind of the campaign that derives from it, as Torcia from Torch. */
function burningEntry(system: GameSystem | undefined, world: World, holder: Page, name: string): [string, NonNullable<GameSystem["burning"]>[string]] | undefined
{
    const named = kindNamed(world, holder, name);
    const names = [name, ...(named === undefined ? [] : [named, ...baseChain(world, named)].map((page) => page.name))];
    return Object.entries(system?.burning ?? {}).find(([burns]) => names.some((candidate) => comparableText(burns) === comparableText(candidate)));
}
