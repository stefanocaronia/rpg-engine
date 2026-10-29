import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { addCoins, changeFrom, type Coin, formatAmount, isSafePurse, payCoins, type Purse, readAmount, takeCoins, totalOf } from "../money/index.ts";
import {
    applyMove,
    canHold,
    concernsPlayer,
    countedText,
    declaredKind,
    inheritedFields,
    isPartyMember,
    kindNamed,
    locate,
    type MovePlan,
    MoveStopped,
    ownField,
    type Page,
    pageNamed,
    parsePageReference,
    readEntry,
    stackName,
    type World,
} from "../pages/index.ts";
import { coinExamples } from "./shared/examples.ts";
import { textList } from "./shared/inputs.ts";
import { campaignCoins } from "./shared/money.ts";
import { afterMoves, pagesPlan } from "./shared/moves.ts";
import { skippedPagesNote } from "./shared/notes.ts";
import { copyName, readOpenScene } from "./shared/scene.ts";
import { heldStack, logStackSteps, stackEdits, type StackMove, stackMoveSteps, type StackStep, stackStepText, unequipKinds } from "./shared/stacks.ts";
import { newDatedLogEntry } from "./shared/time.ts";
import { campaignWorld, missingSystemHint } from "./shared/world.ts";

/** What one side of a trade hands over: money, pieces of stacks, and items with a story of their own (STK-7). */
interface Handed
{
    money?: Purse;
    stacks: StackMove[];
    pages: Page[];
}

/** A purse that changes in a trade (STK-8): whose, in which field, before and after, and the coins it handed over and got back. */
interface PurseStep
{
    side: Page;
    field: string;
    before?: Purse;
    after: Purse;
    given?: Purse;
    back?: Purse;
}

export const trade = defineCommand({
    name: "trade",
    description: "Buy, sell or barter in one go: what page gives and what it gets, items and money both ways, with the change in coins. "
        + "with is the merchant, a character, or the shop, a place that holds its goods: what is taken comes from there. "
        + "Each entry is money in the campaign's coins, a kind with how many, or an item with a story of its own; never a character. "
        + 'If one side lacks what it gives, nothing changes. Example: page Ettore, with Bottega di Ugo, gives "2 {{coin}}", gets ["Torch 5", "Hempen Rope"].',
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: z.string().describe("who trades, usually the player character"),
        with: z.string().describe("the other side: a merchant, or a shop, a place that holds its goods"),
        gives: textList.optional().describe('what page gives: money such as "2 {{coin}}", kinds with how many such as Torch 5, items such as Mazza di Matteo'),
        gets: textList.optional().describe("what page gets, written the same way"),
        why: z.string().optional().describe("what the trade is, such as bought torches at the market"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const world = campaignWorld(root, context);
        const { scene } = readOpenScene(root);
        const side = (name: string): Page => sideNamed(world, scene === undefined ? undefined : copyName(world, scene, parsePageReference(name).name), name);
        const [buyer, seller] = [side(input.page), side(input.with)];

        if (buyer === seller) {
            throw new Error(`${buyer.name} would trade with itself: give the other side in with. Nothing changed.`);
        }

        const { coins } = campaignCoins(root, context);
        const gives = handed(world, coins, buyer, seller, listOf(input.gives), "page");
        const gets = handed(world, coins, seller, buyer, listOf(input.gets), "with");

        if (gives.money === undefined && gets.money === undefined && gives.stacks.length + gives.pages.length + gets.stacks.length + gets.pages.length === 0) {
            throw new Error(`Give what ${buyer.name} gives, gives, and what it gets, gets, such as gives "2 ${coinExamples(coins).coin}", gets "Torch 5". Nothing changed.`);
        }

        if (gives.money !== undefined && gets.money !== undefined) {
            throw new Error(`Money goes one way in a trade: give only the difference, on one side. To change coins, use change with to. Nothing changed.`);
        }

        const payment = gives.money !== undefined ? pay(world, coins, buyer, seller, gives.money) : gets.money !== undefined ? pay(world, coins, seller, buyer, gets.money) : [];
        const why = input.why?.trim() === "" ? undefined : input.why;
        // Pages, stacks and purses in one plan, checked whole before anything is written, each file written once (STK-9).
        const parts = [{ plan: pagesPlan(world, gives.pages, seller), destination: seller }, { plan: pagesPlan(world, gets.pages, buyer), destination: buyer }];
        const steps = stackMoveSteps(world, [...gives.stacks, ...gets.stacks]).filter((step) => step.before !== step.after);
        const purses = payment.map((step) => ({ holder: step.side, field: step.field, remove: [], add: [], set: { [ownField(step.side, step.field) ?? step.field]: formatAmount(step.after, coins ?? []) } }));
        const plan: MovePlan = { edits: [...parts.flatMap((part) => part.plan.edits), ...stackEdits(steps), ...purses], moving: parts.flatMap((part) => part.plan.moving), once: true };
        const written = applyTrade(root, context, world, plan, { steps, payment, coins, why });
        const done = afterMoves(root, context, world, written, parts.filter((part) => part.plan.edits.length > 0));
        const gone = steps.filter((step) => step.after === 0).map((step) => step.kind);
        const unequipped = gone.length === 0 ? [] : unequipKinds(done.world, gone).notes;
        return {
            page: buyer.name,
            with: seller.name,
            gave: entriesOf(gives, coins),
            got: entriesOf(gets, coins),
            stacks: steps.length === 0 ? [] : [`${steps.map(stackStepText).join("; ")}.`],
            purses: payment.map((step) => purseText(step, coins)),
            moved: [...done.notes, ...unequipped],
            problems: world.problems,
        };
    },

    format(result)
    {
        const gave = result.gave.length === 0 ? "nothing" : result.gave.join(", ");
        const got = result.got.length === 0 ? "nothing" : result.got.join(", ");
        const lines = [`${result.page} gave ${result.with} ${gave}, and got ${got}.`, ...result.stacks, ...result.purses, ...result.moved];
        return [lines.join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** A side of a trade: a character, an item or a place of the campaign that holds items (STK-7); never a copy in the scene, which holds nothing. */
function sideNamed(world: World, copy: string | undefined, name: string): Page
{
    if (copy !== undefined) {
        throw new Error(`${copy} is a copy in the open scene, which holds nothing to trade: one who trades is a character. Nothing changed.`);
    }

    const page = pageNamed(world, parsePageReference(name).name);

    if (page === undefined) {
        throw new Error(`There is no page named ${parsePageReference(name).name}: a side of a trade is a character, or a place that holds its goods.${missingSystemHint(world)} Nothing changed.`);
    }

    if (page.system !== undefined || !canHold(page.type, "item")) {
        throw new Error(`${page.name} holds no items, so it does not trade: a side is a character, an item or a place of the campaign. Nothing changed.`);
    }

    return page;
}

/** The entries given, as a list or one text, each without quotes around it, as a model may send "\"2 gp\"". */
function listOf(value: string | string[] | undefined): string[]
{
    return (value === undefined ? [] : typeof value === "string" ? [value] : value).map((entry) => entry.trim().replace(/^"(.*)"$/s, "$1").trim()).filter((entry) => entry !== "");
}

/**
 * What a side hands over, read entry by entry (STK-7): money in the campaign's coins, a kind with how many, taken from the side's stack (STK-4), or an item with a story
 * of its own inside the side. Refused, before anything is written, when the side lacks it.
 */
function handed(world: World, coins: Coin[] | undefined, giver: Page, taker: Page, entries: string[], side: "page" | "with"): Handed
{
    const result: Handed = { stacks: [], pages: [] };

    for (const entry of entries) {
        const money = coins === undefined ? undefined : readAmount(entry, coins);

        if (money !== undefined) {
            if (result.money !== undefined) {
                const { coin, smallCoin } = coinExamples(coins);
                throw new Error(`Give the money ${giver.name} hands over as one amount, such as "2 ${coin} 5 ${smallCoin}". Nothing changed.`);
            }

            result.money = money;
            continue;
        }

        const { name, count } = goodsOf(entry);
        const kind = kindNamed(world, giver, name);

        if (kind !== undefined) {
            // A merchant's goods are often in the shop it stands in: the trade is with the shop, while one of the party first takes them in hand.
            const instead = (container: Page, inside: boolean): string =>
                inside || isPartyMember(giver) ? `move, page ${kind.name}, from ${container.name}, to ${giver.name}, then trade` : side === "with" ? `trade with ${container.name}` : `trade, page ${container.name}`;
            // The same kind written twice on a side counts once, with both counts (STK-7).
            const known = result.stacks.find((move) => move.kind === kind);
            const held = known?.from ?? heldStack(world, giver, kind, instead, count);
            const total = (known?.count ?? 0) + count;

            if (total > held.stack.count) {
                throw new Error(`${giver.name} has ${held.stack.count} ${stackName(held.stack)}: cannot give ${total}. Nothing changed.`);
            }

            if (known === undefined) {
                result.stacks.push({ kind, from: held, to: taker, count });
            } else {
                known.count = total;
            }

            continue;
        }

        result.pages.push(goodsPage(world, giver, name, count, coins, entry));
    }

    return result;
}

/** The name and count of an entry of goods: [[Torch]] 5, Torch 5 or 5 Torch; a name alone is 1. */
function goodsOf(entry: string): { name: string; count: number; }
{
    const read = readEntry(entry);

    if (read.shape === "stack") {
        return { name: read.page, count: read.count };
    }

    if (read.shape === "other") {
        throw new Error(`"${entry}" is no count of goods: give a kind and how many, such as "${read.page} 3", or an item by its name. Nothing changed.`);
    }

    if (read.shape === "link") {
        return { name: read.page, count: 1 };
    }

    const counted = countedText(entry);
    return counted ?? { name: entry, count: 1 };
}

/** An item with a story of its own that a side gives: a page of the campaign inside it, given whole; never a character (STK-7). */
function goodsPage(world: World, giver: Page, name: string, count: number, coins: Coin[] | undefined, entry: string): Page
{
    const page = pageNamed(world, name);

    if (page === undefined) {
        const money = coins === undefined ? "" : ` Money is in the campaign's coins, such as "2 ${coins[0].name}".`;
        const list = entry.includes(",") ? ` For more than one, give a list, such as ["Torch 2", "Hempen Rope"].` : "";
        throw new Error(`"${entry}" is neither money nor a kind nor an item that ${giver.name} has. The system's kinds go by their English names, as find shows them.${list}${money} Nothing changed.`);
    }

    if (page.type === "character") {
        throw new Error(`${page.name} is a character, who is never traded: pay for a mount with trade, then make it the party's with write and move. Nothing changed.`);
    }

    if (count !== 1 || page.type !== "item" || page.system !== undefined) {
        throw new Error(`${page.name} is no kind counted in stacks${count === 1 ? "" : `, so it cannot be given ${count} times`}: give it by name, alone. Nothing changed.`);
    }

    if (!locate(world, page).chain.includes(giver)) {
        throw new Error(`${page.name} is not in ${giver.name}, so ${giver.name} cannot give it: move it there first, or trade with where it is. Nothing changed.`);
    }

    return page;
}

/**
 * The purses a payment changes (STK-8): the payer pays as at an inn (MON-5); a payee with a purse gets the coins handed over and gives the change from what it had, else
 * the trade is refused. A side without a purse pays and gets without counting, but one of the party, who pays only with what it has.
 */
function pay(world: World, coins: Coin[] | undefined, payer: Page, payee: Page, price: Purse): PurseStep[]
{
    if (coins === undefined) {
        throw new Error("The campaign has no coins, so no money changes hands: write the price as goods. Nothing changed.");
    }

    const from = purseOf(world, coins, payer);
    const to = purseOf(world, coins, payee);

    if (from === undefined && isPartyMember(payer)) {
        throw new Error(`${payer.name} has no money to pay ${formatAmount(price, coins)}. Nothing changed.`);
    }

    const payment = from === undefined ? undefined : payCoins(from.purse, price, coins);

    if (from !== undefined && payment === undefined) {
        throw new Error(`${payer.name} has ${from.field} ${formatAmount(from.purse, coins)}: cannot pay ${formatAmount(price, coins)}. Nothing changed.`);
    }

    // The coins handed over: what left the purse and the change that came back, or the price itself from a purse not counted.
    const handedOver = from === undefined || payment === undefined ? price : addCoins(takeCoins(from.purse, payment.purse), payment.back);
    const owed = totalOf(handedOver, coins) - totalOf(price, coins);
    const paid = from === undefined || payment === undefined ? [] : [{ side: payer, field: from.field, before: from.purse, after: payment.purse, given: handedOver, back: payment.back }];

    if (to === undefined && !isPartyMember(payee)) {
        return paid;
    }

    const change = owed === 0 ? {} : to === undefined ? undefined : changeFrom(to.purse, owed, coins);

    if (change === undefined) {
        const field = to?.field ?? "money";
        // The change in as few coins as can be, from a purse that lacks none.
        const owedCoins = formatAmount(changeFrom(Object.fromEntries(coins.map((coin) => [coin.name, owed])), owed, coins) ?? {}, coins);
        throw new Error(
            `${payee.name} has not the coins to give ${owedCoins} of change for the ${formatAmount(handedOver, coins)} ${payer.name} hands over. If the master says ${payee.name} has them, `
                + `give them first, such as change ${payee.name}, ${field}, by "+${owedCoins}"; or pay with other coins. Nothing changed.`,
        );
    }

    const received = { side: payee, field: to?.field ?? "money", ...(to === undefined ? {} : { before: to.purse }), after: takeCoins(addCoins(to?.purse ?? {}, handedOver), change) };
    const payerAfter = payment === undefined ? undefined : addCoins(takeCoins(payment.purse, payment.back), change);

    if (![received.after, payerAfter ?? {}].every((purse) => isSafePurse(purse, coins))) {
        throw new Error("A purse would be too large to count exactly. Nothing changed.");
    }

    return [...paid.map((step) => ({ ...step, after: payerAfter ?? step.after, back: change })), received];
}

/** A side's purse (STK-8): its field money, or its only field that holds an amount; none when it has none. Refused when it has several and none is money. */
function purseOf(world: World, coins: Coin[], side: Page): { field: string; purse: Purse; } | undefined
{
    const purses = Object.entries(inheritedFields(world, side)).flatMap(([field, value]) => {
        const purse = declaredKind(world, field) === undefined ? readAmount(value, coins) : undefined;
        return purse === undefined ? [] : [{ field, purse }];
    });
    const named = purses.find((purse) => comparableText(purse.field) === "money");

    if (named === undefined && purses.length > 1) {
        throw new Error(`${side.name} holds money in ${purses.map((purse) => purse.field).join(" and ")}: a trade pays from the field money. Name one money, or pay with change. Nothing changed.`);
    }

    return named ?? purses[0];
}

/**
 * Writes a trade's plan (STK-9), then the lines in the log of its stacks and purses (STK-12, MON-4), public when they concern the player. Stopped halfway, the lines of what was
 * written are still logged, then the stop, with the calls that finish it, is said.
 */
function applyTrade(root: string, context: Context, world: World, plan: MovePlan, done: { steps: StackStep[]; payment: PurseStep[]; coins: Coin[] | undefined; why: string | undefined; }): World
{
    const log = (written: (page: Page) => boolean): void => {
        logStackSteps(root, context, world, done.steps.filter((step) => written(step.container)), done.why);

        for (const step of done.payment.filter((candidate) => written(candidate.side))) {
            const list = done.coins ?? [];
            const data = {
                page: step.side.name,
                field: step.field,
                before: step.before === undefined ? "0" : formatAmount(step.before, list),
                after: formatAmount(step.after, list),
                given: amountText(step.given, done.coins),
                back: amountText(step.back, done.coins),
                why: done.why,
            };
            appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", concernsPlayer(world, step.side) ? "public" : "hidden", data));
        }
    };

    try {
        const after = applyMove(world, plan);
        log(() => true);
        return after;
    } catch (error) {
        if (error instanceof MoveStopped) {
            log((page) => error.written.includes(page.path));
        }

        throw error;
    }
}

/** "Ettore: money 2 gp → 1 gp 5 sp (1 gp given, 5 sp back)": a purse that changed. */
function purseText(step: PurseStep, coins: Coin[] | undefined): string
{
    const list = coins ?? [];
    const before = step.before === undefined ? `0 ${list[0]?.name ?? ""}` : formatAmount(step.before, list);
    const how = [amountText(step.given, coins), amountText(step.back, coins)];
    const note = how[0] === undefined ? "" : ` (${how[0]} given${how[1] === undefined ? "" : `, ${how[1]} back`})`;
    return `${step.side.name}: ${step.field} ${before} → ${formatAmount(step.after, list)}${note}.`;
}

/** Coins as text, or undefined for none. */
function amountText(purse: Purse | undefined, coins: Coin[] | undefined): string | undefined
{
    return purse === undefined || coins === undefined || Object.values(purse).every((count) => count === 0) ? undefined : formatAmount(purse, coins);
}

/** What a side handed over, as the output names it: the money, the pieces and the items. */
function entriesOf(given: Handed, coins: Coin[] | undefined): string[]
{
    return [
        ...(given.money === undefined || coins === undefined ? [] : [formatAmount(given.money, coins)]),
        ...given.stacks.map((move) => `${move.count} ${stackName(move.from.stack)}`),
        ...given.pages.map((page) => page.name),
    ];
}
