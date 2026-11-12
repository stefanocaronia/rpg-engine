// A page as the viewer knows it: found by a name they know, its text, its sheet as the dashboard draws it, a place's look
import { readSettings } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { lengthsInUnits } from "../../core/length.ts";
import { comparableText } from "../../core/text.ts";
import { type Coin, readAmount } from "../../money/index.ts";
import { declaredKind, entryPage, isPlayerCharacter, locate, type Page, pagesWithName, pagesWithNameOrAlias, parsePageReference, systemPageNamed, textsIn, type World } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { shownImage } from "../shared/campaign/images.ts";
import { campaignCoins } from "../shared/campaign/money.ts";
import { campaignSystem, systemWordsOf } from "../shared/campaign/world.ts";
import { type Knowledge, knownSecretsApart, knownText, knowsPage, pageKnownBy, playerStory } from "../shared/characters/knowledge.ts";
import { type Measures, measuresOf } from "../shared/places/roads.ts";
import { lineExperience } from "../shared/sheet/counters.ts";
import { effectiveFields } from "../shared/sheet/effect-layer.ts";
import { counterOf, experienceNeed, experienceProgress, sheetData, type SheetGroupData, sheetHeadline, type SheetValue, statBlock } from "../shared/sheet/sheet.ts";
import { hasSheet } from "../shared/sheet/system-fields.ts";
import type { ViewResult } from "./result.ts";

/** A page as the one whose view it is knows it (VIEW-3): its text, and the whole sheet when it is theirs or of their party. */
export function shownPage(root: string, context: Context, world: World, knowledge: Knowledge, page: Page, party: boolean): Extract<ViewResult, { kind: "page"; }>
{
    const system = campaignSystem(root, context);
    // A companion who keeps no sheet shows the stat block of the creature it derives from (D-275).
    const sheet = withItemImages(
        root,
        context,
        world,
        withCoins(speedInUnits(!party ? [] : hasSheet(world, page) ? sheetData(world, system, page) : statBlock(world, system, page), system, measuresOf(root, system)), campaignCoins(root, context).coins, system),
    );
    const language = readSettings(root).language;
    const headline = party ? sheetHeadline(world, system, page, system === undefined || language === undefined ? undefined : systemWordsOf(root, system, language, context)) : undefined;
    const cards = party && hasSheet(world, page) ? system?.sheetCards : undefined;
    // Only the player's own characters act from the sheet: the others act as the master says (D-495). Talking to someone needs no game: a system without
    // actions of its own still gives the player's characters theirs, none, so that the people around can be talked to.
    const own = isPlayerCharacter(page) && (page === knowledge.pc || knowledge.each !== undefined);
    const actions = own ? (system?.sheetActions ?? {}) : undefined;
    const story = own ? playerStory(page) : undefined;
    const secrets = knownSecretsApart(world, knowledge, page);
    const whoKnows = pageKnownBy(knowledge, page);
    const unaware = whoKnows === undefined ? [] : (knowledge.each ?? []).map((one) => one.pc).filter((pc) => pc.fields.status !== "dead" && !whoKnows.includes(pc.name)).map((pc) => pc.name);
    return {
        kind: "page",
        title: `${page.name} (${page.type ?? "page"})`,
        ...(headline === undefined ? {} : { headline }),
        sheet,
        ...(cards === undefined ? {} : { cards }),
        ...(actions === undefined ? {} : { actions }),
        text: knownText(world, knowledge, page),
        ...(secrets.length === 0 ? {} : { knownBy: secrets }),
        ...(whoKnows === undefined ? {} : { whoKnows }),
        ...(unaware.length === 0 ? {} : { unaware }),
        ...(story === undefined ? {} : { story }),
    };
}

/**
 * The page the player character knows by this name, of the campaign or of the system, or by one of its aliases (VIEW-2): only one it knows, so that neither two
 * pages of one name nor an alias tells that a page it does not know exists.
 */
export function knownPage(world: World, knowledge: Knowledge, name: string): Page | undefined
{
    const one = (pages: Page[]): Page | undefined => {
        const known = pages.filter((page) => knowsPage(knowledge, page));
        return known.length === 1 ? known[0] : undefined;
    };

    const system = systemPageNamed(world, name);
    const named = pagesWithName(world, name);
    const aliased = world.pages.filter((page) => textsIn(page.fields.aliases).some((alias) => comparableText(alias.trim()) === comparableText(name.trim())));
    return one(named) ?? (named.length === 0 && system !== undefined ? one([system]) : undefined) ?? one(aliased);
}

/** A name as the view may write it: one of a page the player character knows; undefined for any other, which the view tells another way (D-254). */
export function shownName(world: World, knowledge: Knowledge, name: unknown): string | undefined
{
    return knownNamedPage(world, knowledge, name)?.name;
}

/** The page the player character knows by a name the log writes, of the campaign or of the system. */
export function knownNamedPage(world: World, knowledge: Knowledge, name: unknown): Page | undefined
{
    if (typeof name !== "string") {
        return undefined;
    }

    // The log keeps a renamed page by its old name, among its aliases (D-417).
    const reference = parsePageReference(name).name;
    const page = pagesWithNameOrAlias(world, reference)[0] ?? systemPageNamed(world, reference);
    return page !== undefined && knowsPage(knowledge, page) ? page : undefined;
}

/** A place as a chapter of the story shows it (D-384): its kind and its picture, else that of the nearest place that holds it, as the player character knows them. */
export function placeLook(root: string, context: Context, world: World, knowledge: Knowledge, name: unknown): { kind?: string; picture?: { file: string; version: number; }; }
{
    const page = knownNamedPage(world, knowledge, name);

    if (page === undefined) {
        return {};
    }

    const known = (base: Page): boolean => knowsPage(knowledge, base);
    const kind = page.fields.kind;
    const picture = [page, ...locate(world, page).chain.filter(known)].map((holder) => shownImage(root, context, world, holder, known)).find((image) => image !== undefined);
    return { ...(typeof kind === "string" ? { kind } : {}), ...(picture === undefined ? {} : { picture }) };
}

/** The values of someone's line as data (DAT-2): as the line writes them, with a counter's limits, and beside the experience what the next level needs (PRO-6). */
export function lineValues(world: World, page: Page, counters: Record<string, unknown>): SheetValue[]
{
    const fields = effectiveFields(world, page);
    const experience = lineExperience(world, page, counters);
    return Object.entries(counters).map(([field, value]) => {
        const kind = declaredKind(world, field);
        const counter = counterOf(world, fields, field, value);
        const progress = experienceProgress(world, fields, field);
        const beside = field === experience?.field ? experience.text : undefined;
        const need = beside === undefined ? undefined : experienceNeed(world, fields, field);
        return {
            field,
            ...(kind === undefined ? {} : { kind }),
            text: String(value).trim(),
            ...(counter === undefined ? {} : { counter }),
            marks: 0,
            ...(beside === undefined ? {} : { beside }),
            ...(progress === undefined ? {} : { progress }),
            ...(need === undefined ? {} : { levelNeed: need }),
        };
    });
}

/** A sheet with the speed told in the units of the story (D-328), as the maps tell their measures: 30 ft is 9 m in metric. */
function speedInUnits(groups: SheetGroupData[], system: GameSystem | undefined, measures: Measures): SheetGroupData[]
{
    const field = system?.grid?.speed;
    // The load in kilograms for a player who counts in metric, with the system's pound (LOAD-2).
    const pound = system?.pound;
    const kilograms = (text: string): string => text.replace(/[\d.]+/g, (number) => String(Math.round(Number(number) * (pound ?? 1) * 10) / 10)).replace(/\s*\p{L}[\p{L}.]*\s*$/u, " kg");
    // The speeds the system works out are lengths too (SPD-1).
    const declared = (name: string, wanted: string): boolean => Object.entries(system?.fields ?? {}).some(([key, kind]) => kind === wanted && comparableText(key) === comparableText(name));
    const inUnits = (text: string): string => lengthsInUnits(text, measures.units, measures.imperial);

    // What is beside a length is told in the same units, as the speed written beside the one worked out, and left out when it says the same.
    const lengthTold = ({ beside, ...value }: SheetValue): SheetValue => {
        const text = inUnits(value.text);
        const shownBeside = beside === undefined ? undefined : inUnits(beside);
        return { ...value, text, ...(shownBeside === undefined || shownBeside === text ? {} : { beside: shownBeside }) };
    };

    const told = (value: SheetValue): SheetValue =>
        (field !== undefined && comparableText(value.field) === comparableText(field)) || declared(value.field, "length")
            ? lengthTold(value)
            : (value.field === "load" || declared(value.field, "weight")) && measures.units === "metric" && pound !== undefined
            ? { ...value, text: kilograms(value.text), ...(value.load === undefined ? {} : { load: inKilograms(value.load, pound) }) }
            : value;
    return groups.map((group) => ({ ...group, values: group.values.map(told), ...(group.items === undefined ? {} : { items: group.items.map((item) => ({ ...item, values: item.values.map(told) })) }) }));
}

/** A load's numbers in kilograms, at the system's pound (LOAD-2). */
function inKilograms(load: NonNullable<SheetValue["load"]>, pound: number): NonNullable<SheetValue["load"]>
{
    const kilograms = (weight: number): number => Math.round(weight * pound * 10) / 10;
    return { ...load, value: kilograms(load.value), ...(load.limit === undefined ? {} : { limit: kilograms(load.limit) }) };
}

/** The groups of a sheet with the icon of every thing carried, its page's or the kind's it derives from (D-431); the page's name is the engine's, not the page's to show. */
function withItemImages(root: string, context: Context, world: World, groups: SheetGroupData[]): SheetGroupData[]
{
    return groups.map((group) => ({
        ...group,
        ...(group.items === undefined ? {} : {
            items: group.items.map(({ page, ...item }) => {
                const found = page === undefined ? undefined : entryPage(world, page);
                const image = found === undefined ? undefined : shownImage(root, context, world, found);
                return image === undefined ? item : { ...item, image };
            }),
        }),
    }));
}

/** The groups of a sheet with the coins of every value that is money, as the dashboard draws them (D-431). */
function withCoins(groups: SheetGroupData[], coins: Coin[] | undefined, system: GameSystem | undefined): SheetGroupData[]
{
    return groups.map((group) => ({ ...group, values: group.values.map((value) => valueCoins(value, coins, system)) }));
}

/** A value with its coins when it is money (MON-2), from the coin worth most, each with its metal when the game names it; as it was otherwise. */
export function valueCoins(value: SheetValue, coins: Coin[] | undefined, system: GameSystem | undefined): SheetValue
{
    const purse = coins === undefined || value.counter !== undefined ? undefined : readAmount(value.text, coins);

    if (purse === undefined || coins === undefined) {
        return value;
    }

    const metalOf = (coin: Coin): string | undefined => coin.names.map((name) => system?.coinMetals[name]).find((metal) => metal !== undefined);
    const shown = [...coins].sort((first, second) => second.value - first.value).filter((coin) => (purse[coin.name] ?? 0) > 0).map((coin) => {
        const metal = metalOf(coin);
        return { coin: coin.name, count: purse[coin.name] ?? 0, ...(metal === undefined ? {} : { metal }) };
    });
    return shown.length === 0 ? value : { ...value, coins: shown };
}
