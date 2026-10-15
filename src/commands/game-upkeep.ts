// What the party uses up each day under the rigor «rules» (D-435, UPK-1–UPK-3): a ration each outside a settlement, the days without food and what they bring,
// and a word on water.
import { readSettings } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { parseFormula } from "../core/formula.ts";
import { appendLogEntry } from "../core/log.ts";
import { comparableText, valueNamed } from "../core/text.ts";
import { formatCounter, readCounter } from "../counters/index.ts";
import { heldStacks, kindNamed, locate, type Page, type World, writePage } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { effectiveFields } from "./effect-layer.ts";
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

    for (let day = 0; day < days; day++) {
        const world = campaignWorld(root, context);
        const members = partyPages(world).filter((page) => hasSheet(world, page));
        const outside = members.filter((member) => !inSettlement(world, member));
        lines.push(...members.map((member) => memberUpkeep(root, context, member.name, upkeep)).filter((line) => line !== ""));

        if (outside.length > 0 && upkeep.water !== undefined) {
            lines.push(`Water: ${upkeep.water}. Read ${upkeep.rules}.`);
        }
    }

    return lines;
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
        return hungry === 0 ? "" : setNumber(root, context, world, member, upkeep.short, 0, "ate in a settlement") ? `${member.name} ate: ${upkeep.short} back to 0.` : "";
    }

    const kind = kindNamed(world, member, upkeep.daily);
    const held = kind === undefined ? [] : heldStacks(world, member, kind);

    if (kind !== undefined && held.length > 0) {
        const { container, stack } = held[0];
        const step = { container, kind, before: stack.count, after: stack.count - 1, ...(stack.label === undefined ? {} : { label: stack.label }) };
        const spent = writeStacks(root, context, world, [step], "a day's food").notes.join(" ");
        const fed = hungry > 0 && setNumber(root, context, campaignWorld(root, context), member, upkeep.short, 0, "a day's food") ? ` ${upkeep.short} back to 0.` : "";
        return `${member.name} eats a day's food: ${spent}${fed}`;
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
    appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: page.name, field, before: String(before), after: String(value), why }));
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
    appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: page.name, field, before: String(read.value), after: String(after), why: "days without food" }));
    return `${read.value} → ${after}`;
}

/**
 * What an effect named after something that burns asks (UPK-3), as Torch: the kind it spends, its own or its fuel, such as Oil for a lantern, and how long it lasts;
 * refused when the holder carries none. Undefined for any other effect.
 */
export function burning(system: GameSystem | undefined, world: World, holder: Page, name: string): { kind: Page; lasts: string; } | undefined
{
    const named = kindNamed(world, holder, name);
    const entry = Object.entries(system?.burning ?? {}).find(([burns]) => comparableText(burns) === comparableText(name) || (named !== undefined && comparableText(burns) === comparableText(named.name)));

    if (entry === undefined) {
        return undefined;
    }

    const [burns, { lasts, spends }] = entry;
    const kind = kindNamed(world, holder, spends ?? burns);

    if (kind === undefined || heldStacks(world, holder, kind).length === 0) {
        throw new Error(`${holder.name} carries no ${spends ?? burns}, in what it holds, to light ${burns}. If the story gives some, add it to what ${holder.name} carries first. Nothing changed.`);
    }

    return { kind, lasts };
}

/** Spends one of what burns from what the holder carries (UPK-3), with its line in the log; the line that says it. */
export function burnOne(root: string, context: Context, holderName: string, kind: Page): string
{
    const world = campaignWorld(root, context);
    const holder = world.pages.find((page) => page.name === holderName);
    const held = holder === undefined ? [] : heldStacks(world, holder, kind);

    if (held.length === 0) {
        return "";
    }

    const { container, stack } = held[0];
    const step = { container, kind, before: stack.count, after: stack.count - 1, ...(stack.label === undefined ? {} : { label: stack.label }) };
    return writeStacks(root, context, world, [step], "lit").notes.join(" ");
}
