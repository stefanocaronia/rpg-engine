import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry, type LogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { canSpend, changeCounter, type Counter, type CounterChange, counterLimit, formatCounter, isSafeCounter, readCounter, readCounterText } from "../counters/index.ts";
import { addCoins, type Coin, formatAmount, formatTotal, isSafePurse, namesCoins, payCoins, type Purse, readAmount, readSignedAmount, totalOf } from "../money/index.ts";
import {
    baseChain,
    baseValue,
    concernsPlayer,
    findPage,
    followersOf,
    inheritedFields,
    isCounterField,
    isStandardField,
    keepersOf,
    loadWorld,
    ownField,
    type Page,
    parsePageReference,
    playerConcerns,
    withPage,
    type World,
    writePage,
} from "../pages/index.ts";
import { fireEvents, nowDueNote } from "./game-events.ts";
import { campaignCoins } from "./game-money.ts";
import { checkNotCopied, copyName, copyPage, readOpenScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { followersNote, keepersNote, skippedPagesNote } from "./notes.ts";

/** What holds a counter: a page, or a copy in the open scene, seen as a page that derives from its creature (INH-14). */
interface CounterHolder
{
    page: Page;
    kind: "page" | "copy";
    /** Writes fields as the page names them; undefined removes one, and the page reads it from its base again (INH-9). */
    /** Returns the page as written, or undefined for a copy. */
    write(fields: Record<string, number | string | undefined>): Page | undefined;
    visibility: LogEntry["visibility"];
}

/** One change worked out on a counter or on money, before it is written (D-92, MON-4). */
interface Step
{
    before: number | string;
    after: number | string;
    /** How it was asked, for the log: by, spend or to, and how far it went beyond a limit. */
    amount: Record<string, unknown>;
    note: string;
    /** For money: what the purse is worth in the first coin, when it holds other coins. */
    total?: string;
    /** Whether a base's value is the one the change leads to (INH-9). */
    same(value: unknown): boolean;
}

// Whole numbers arrive as text from a command line and as numbers through MCP; other text, such as coins, stays text.
const wholeNumber = z.preprocess((value) => (typeof value === "string" && /^[+-]?\d+$/.test(value.trim()) ? Number(value) : value), z.number().int());

export const change = defineCommand({
    name: "change",
    description: "Change a counter or money on a page: hit points, uses, ammunition, supply, a progress track, an event's clock, coins. "
        + "A counter is a field written as a number (20, from 0 up) or as current/max (12/12, from 0 to the maximum); create it with write, then change it only with this command. "
        + "by adds or takes away and stops at a limit (damage, healing); spend takes what is paid or used up, and is refused when there is not enough; "
        + "to sets a value, max, or current/max (15/15 changes the maximum too), even outside the limits. "
        + 'Money is a field written in the campaign\'s coins, such as money: 34 gp 4 sp: spend "5 sp" pays and makes change, by "+20 gp" adds coins, to "10 gp" sets the purse. '
        + 'Example: page Bruna, field hp, by -7, why "bitten by the wolf".',
    group: "game",
    positionals: ["page", "field"],
    input: z.object({
        page: z.string().describe("page that holds the counter or the money"),
        field: z.string().describe("the counter or the money, such as hp"),
        by: z.union([wholeNumber, z.string()]).optional().describe("how much to add, or to take away when negative, or coins; on the command line write --by=-7"),
        spend: z.union([wholeNumber, z.string()]).optional().describe("how much is paid or used up, or coins"),
        to: z.union([z.number().int(), z.string()]).optional().describe("the new value: a number, max, current/max such as 15/15, or coins; on the command line write --to=-3"),
        why: z.string().optional().describe("what the change is for"),
    }),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const world = loadWorld(root);
        const holder = holderNamed(root, world, input.page);
        const fields = inheritedFields(world, holder.page);
        const { coins, problem } = campaignCoins(root);
        const clock = holder.kind === "page" && isCounterField(holder.page.type, comparableText(input.field.trim()));
        const field = fieldName(world, holder, fields, input.field, exampleValue(input, coins, clock), coins);
        const purse = coins === undefined ? undefined : readAmount(fields[field], coins);
        const page = holder.page.name;

        if (problem !== undefined && typeof fields[field] === "string" && /\d+\s*\p{L}/u.test(fields[field])) {
            throw new Error(`${field} on ${page} looks like money, but the campaign's coins cannot be read: ${problem.message} To fix it, ${problem.fix}. Nothing changed.`);
        }

        const step = purse !== undefined && coins !== undefined ? moneyStep(input, purse, coins, page, field) : counterStep(input, fields[field], page, field, coins);
        const changed = String(step.after) !== String(step.before);
        checkClock(holder.page, field, step.after);
        const written = ownField(holder.page, field) ?? field;
        const base = baseValue(world, holder.page, field);
        const backToBase = changed && base !== undefined && step.same(base.value);
        const followers = changed && holder.kind === "page" ? followersOf(world, holder.page, field) : [];
        const keepers = changed && holder.kind === "page" ? keepersOf(world, holder.page, field).map((keeper) => `${keeper.name} (${field} ${String(counterOf(world, keeper, field))})`) : [];

        let after: Page | undefined;

        if (changed) {
            // Back to the base's value, the field goes in every spelling the page wrote it, so that the page reads the base's (INH-5, INH-9).
            const spellings = Object.keys(holder.page.fields).filter((name) => comparableText(name) === comparableText(field));
            after = holder.write(backToBase ? Object.fromEntries(spellings.map((name) => [name, undefined])) : { [written]: step.after });
            const why = input.why?.trim() === "" ? undefined : input.why;
            const data = { page, copy: holder.kind === "copy" ? true : undefined, field, before: step.before, after: step.after, ...step.amount, why };
            appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", holder.visibility, data));
            logFollowers(root, world, context, followers, { field, before: step.before, after: step.after });
        }

        const note = [step.note, backToBase && base !== undefined ? `again as ${base.base.name}` : ""].filter((part) => part !== "").join("; ");
        // Only an event's clock sets anything off when it changes (EVT-4).
        const due = after !== undefined && isCounterField(after.type, field) ? fireEvents(root, context, world, withPage(world, holder.page, after), readPresent(root).date).due : [];
        const result = { page, field, before: String(step.before), after: String(step.after), total: step.total, note, changed, due, problems: world.problems };
        return { ...result, followers: followers.map((follower) => follower.name), keepers };
    },

    format(result)
    {
        const note = result.note === "" ? "" : `: ${result.note}`;
        const after = `${result.after}${result.total === undefined ? "" : ` (${result.total})`}`;
        const summary = result.changed ? `${result.page}: ${result.field} ${result.before} → ${after}${note}.` : `Nothing changed: ${result.field} on ${result.page} is ${after}${note}.`;
        const followers = followersNote(result.followers, `since they read ${result.field} from ${result.page}`, "change", `${result.field} ${result.after}`);
        const lines = [summary, nowDueNote(result.due), followers, keepersNote(result.keepers, result.field)].filter((line) => line !== "");
        return [lines.join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** A change to a counter: by, spend or to, within its limits (D-92). */
function counterStep(input: { by?: number | string; spend?: number | string; to?: number | string; }, value: unknown, page: string, field: string, coins: Coin[] | undefined): Step
{
    const before = readCounter(value);

    if (before === undefined) {
        throw new Error(notCounterMessage(page, field, value, coins));
    }

    const counterChange = readChange(input, before, page, field, coins);
    const { counter: after, beyond } = changeCounter(before, counterChange);

    if (!isSafeCounter(after)) {
        throw new Error(`${field} on ${page} would be too large to count exactly. Nothing changed.`);
    }

    const same = (base: unknown): boolean => {
        const counter = readCounter(base);
        return counter !== undefined && formatCounter(counter) === formatCounter(after);
    };

    return { before: formatCounter(before), after: formatCounter(after), amount: { ...amountOf(counterChange), beyond: beyond === 0 ? undefined : beyond }, note: limitNote(after, beyond), same };
}

/** A change to money (MON-4, MON-5): coins received with by, paid with spend or a negative by, the purse set with to. */
function moneyStep(input: { by?: number | string; spend?: number | string; to?: number | string; }, purse: Purse, coins: Coin[], page: string, field: string): Step
{
    const given = [input.by, input.spend, input.to].filter((part) => part !== undefined);

    if (given.length !== 1) {
        throw new Error('Give one of by (coins received, or paid with a minus), spend (what is paid) or to (what the purse holds), such as spend "5 sp".');
    }

    const asked = given[0];
    const parameter = input.by !== undefined ? "by" : input.spend !== undefined ? "spend" : "to";
    const signed = typeof asked === "string" ? readSignedAmount(asked, coins) : undefined;

    if (signed === undefined || (parameter !== "by" && String(asked).trim().startsWith("-"))) {
        const example = `${parameter === "by" ? "+" : ""}${Math.abs(Number(String(asked).trim())) || 5} ${coins[0].name}`;
        const what = parameter === "by" ? "coins to add or, with a minus, to pay" : "coins";
        throw new Error(`"${String(asked)}" is not ${what} for ${field} on ${page}: give coins of the campaign (${coinNames(coins)}), such as ${parameter} "${example}".`);
    }

    const paying = parameter === "spend" || (parameter === "by" && signed.sign === -1);

    if (paying && totalOf(signed.purse, coins) === 0) {
        throw new Error(`Give ${parameter} the coins paid, such as ${parameter} "${parameter === "by" ? "-" : ""}5 ${coins[0].name}".`);
    }

    const payment = paying ? payCoins(purse, signed.purse, coins) : undefined;

    if (paying && payment === undefined) {
        throw new Error(`${page} has ${field} ${formatAmount(purse, coins)} (${formatTotal(purse, coins)}): cannot pay ${formatAmount(signed.purse, coins)} (${formatTotal(signed.purse, coins)}). Nothing changed.`);
    }

    const after = payment?.purse ?? (parameter === "to" ? signed.purse : addCoins(purse, signed.purse));

    if (!isSafePurse(after, coins)) {
        throw new Error(`${field} on ${page} would be too large to count exactly. Nothing changed.`);
    }

    const text = (coinsGiven: Purse | undefined): string | undefined => (coinsGiven === undefined || Object.keys(coinsGiven).length === 0 ? undefined : formatAmount(coinsGiven, coins));
    const handed = text(payment?.given);
    const back = text(payment?.back);
    const amount = formatAmount(signed.purse, coins);
    const request = parameter === "to" ? { to: amount } : parameter === "spend" ? { spend: amount } : { by: `${signed.sign === -1 ? "-" : "+"}${amount}` };
    const others = Object.keys(after).some((name) => name !== coins[0].name);

    const same = (base: unknown): boolean => {
        const basePurse = readAmount(base, coins);
        return basePurse !== undefined && formatAmount(basePurse, coins) === formatAmount(after, coins);
    };

    return {
        before: formatAmount(purse, coins),
        after: formatAmount(after, coins),
        amount: { ...request, given: handed, back },
        note: back !== undefined ? `${handed} given, ${back} back` : handed === undefined ? "" : `paid with ${handed}`,
        total: others ? formatTotal(after, coins) : undefined,
        same,
    };
}

/**
 * The value a missing counter or purse is shown with, in the hint to add one: money that the page holds, when money was asked for;
 * a clock as given, or empty (EVT-2); else 12/12.
 */
function exampleValue(input: { by?: number | string; spend?: number | string; to?: number | string; }, coins: Coin[] | undefined, clock: boolean): string
{
    const money = coins !== undefined && [input.by, input.spend, input.to].some((part) => typeof part === "string" && readSignedAmount(part, coins) !== undefined);

    if (money && coins !== undefined) {
        return `10 ${coins[0].name} (what it holds, not the price)`;
    }

    const given = typeof input.to === "string" ? readCounterText(input.to) : undefined;
    return clock ? (given?.max === undefined ? "0/4" : String(formatCounter(given))) : "12/12";
}

/** An event's clock keeps a maximum of at least 1, as write asks (EVT-2). */
function checkClock(page: Page, field: string, after: number | string): void
{
    const counter = readCounter(after);

    if (isCounterField(page.type, field) && (counter?.max === undefined || counter.max < 1)) {
        throw new Error(`A clock needs a maximum of at least 1, such as 0/4: ${after} is not one. Nothing changed.`);
    }
}

/** "gp/mo, pp, sp, cp": the coins of the campaign, by all their names. */
function coinNames(coins: Coin[]): string
{
    return coins.map((coin) => coin.names.join("/")).join(", ");
}

/** What holds the counter, given by name or as a link: a copy in the open scene first, then a page. */
function holderNamed(root: string, world: World, name: string): CounterHolder
{
    const reference = parsePageReference(name);

    if (reference.section !== undefined) {
        throw new Error(`Give the page without #${reference.section}: a counter is a field of the page, such as page ${reference.name}, field hp.`);
    }

    // A scene that cannot be read holds no copies here; validate reports it.
    const open = readOpenScene(root);
    const copy = copyName(world, open.scene, reference.name);

    if (open.scene !== undefined && copy !== undefined) {
        const copies = open.scene.copies;

        const write = (fields: Record<string, number | string | undefined>): undefined => {
            updateScene(root, Object.entries(fields).map(([field, value]) => [["copies", copy, field], value]));
            return undefined;
        };

        return { page: copyPage(copy, copies[copy]), kind: "copy", write, visibility: "hidden" };
    }

    const page = findPage(world, reference.name);

    if (page === undefined) {
        const copies = open.scene === undefined ? "" : ", nor a copy of that name in the open scene";
        const unreadable = open.problem === undefined ? "" : " The open scene in state.yaml cannot be read: validate shows how to fix it.";
        throw new Error(`There is no page named ${reference.name}${copies}. Look for it with the find command.${unreadable}`);
    }

    checkNotCopied(world, open, page);
    return {
        page,
        kind: "page",
        write: (fields) => {
            const set = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
            const unset = Object.keys(fields).filter((field) => fields[field] === undefined);
            return writePage(world, page.name, undefined, { set: Object.keys(set).length === 0 ? undefined : set, unset: unset.length === 0 ? undefined : unset }).page;
        },
        visibility: concernsPlayer(world, page) ? "public" : "hidden",
    };
}

/** One public line for each page that changed with a base and concerns the player, with its own name only and no why: the base and the other pages may be secret (INH-10, D-93). */
function logFollowers(root: string, world: World, context: Context, followers: Page[], change: { field: string; before: number | string; after: number | string; }): void
{
    const concerns = playerConcerns(world);

    for (const follower of followers.filter(concerns)) {
        appendLogEntry(root, newDatedLogEntry(root, context, "counter-changed", "public", { page: follower.name, ...change }));
    }
}

/** The holder's field with this name, ignoring case and how accents are written; a missing or fixed one fails with the counters and money it holds and how to add one. */
function fieldName(world: World, holder: CounterHolder, fields: Record<string, unknown>, name: string, example: string, coins: Coin[] | undefined): string
{
    const keys = Object.keys(fields);
    const found = keys.find((key) => key === name) ?? keys.find((key) => comparableText(key) === comparableText(name.trim()));
    const page = holder.page;

    if (found !== undefined && isStandardField(page.type, found) && !isCounterField(page.type, found)) {
        const what = holder.kind === "copy" && found === "creature" ? `${found} is the creature ${page.name} copies` : `${found} is a fixed field of ${page.name}`;
        throw new Error(`${what}, not a counter${holder.kind === "page" ? ": change it with write" : ""}.`);
    }

    if (found !== undefined) {
        return found;
    }

    const held = keys.filter((key) => !isStandardField(page.type, key) || isCounterField(page.type, key)).flatMap((key) => {
        const counter = readCounter(fields[key]);
        const purse = coins === undefined ? undefined : readAmount(fields[key], coins);
        return purse !== undefined && coins !== undefined ? [`${key} ${formatAmount(purse, coins)}`] : counter === undefined ? [] : [`${key} ${formatCounter(counter)}`];
    });
    const hasMoney = coins !== undefined && keys.some((key) => readAmount(fields[key], coins) !== undefined);
    const listed = held.length > 0 ? `Its counters${hasMoney ? " and money" : ""}: ${held.join(", ")}.` : "It has no counters.";
    throw new Error(`${page.name} has no field "${name}". ${listed} ${howToAdd(world, holder, name, example)}`);
}

/** The value a page reads for a field, written in any case. */
function counterOf(world: World, page: Page, field: string): unknown
{
    return Object.entries(inheritedFields(world, page)).find(([name]) => comparableText(name) === comparableText(field))?.[1];
}

/** How to add a counter that neither the page nor its bases hold; or why its base cannot be read. */
function howToAdd(world: World, holder: CounterHolder, name: string, example: string): string
{
    const page = holder.page;
    const link = typeof page.fields.creature === "string" ? page.fields.creature : undefined;
    const base = baseChain(world, page)[0];

    if (link !== undefined && base === undefined && (page.type === "character" || page.type === "creature")) {
        const fix = holder.kind === "copy" ? "fix the creature's page, or let the copy leave the scene" : "fix the link with write";
        return `${page.name} ${holder.kind === "copy" ? "copies" : "derives from"} ${link}, which cannot be read: no creature has that name, two pages share it, or it is not a creature. To fix it, ${fix}; validate shows why.`;
    }

    if (base === undefined) {
        return `To add one, use write, such as set ${name}=${example}.`;
    }

    if (holder.kind === "copy") {
        return `To add one to ${page.name} alone, use write, such as set ${name}=${example}. To give it to every ${base.name}, write it on ${base.name} once the scene is closed.`;
    }

    return `${page.name} reads what it does not hold from ${base.name}: write the counter there, such as set ${name}=${example}, and everything that derives from ${base.name} takes it; or on ${page.name} alone.`;
}

function notCounterMessage(page: string, field: string, value: unknown, coins: Coin[] | undefined): string
{
    if (typeof value === "string" && readCounterText(value) !== undefined) {
        return `${field} on ${page} is the text "${value}": write it without quotes, such as ${field}: ${value}, to make it a counter.`;
    }

    // Coins of the campaign after a number, such as "34 mo e 4 ma", meant money that does not read as an amount (MON-2).
    if (typeof value === "string" && coins !== undefined && namesCoins(value, coins)) {
        return `${field} on ${page} is "${value}", not money: write the coins one after the other, such as set ${field}=12 ${coins[0].name}.`;
    }

    const notCounter = `${field} on ${page} is ${JSON.stringify(value)}, not a counter: write a counter as a number (20) or as current/max (12/12).`;
    const word = typeof value === "string" ? /\d+\s*(\p{L}[\p{L}\p{M}]*)/u.exec(value)?.[1] : undefined;

    if (word === undefined) {
        return notCounter;
    }

    return coins === undefined
        ? `${notCounter} If it is money, the campaign needs its coins: set them with config, naming them as written here (${word}), each with its value in the smallest.`
        : `${notCounter} If it is money, ${word} is not a coin of the campaign (${coinNames(coins)}): write it with those, or give a coin that name too with config, such as ${coins[0].name}/${word}.`;
}

function readChange(input: { by?: number | string; spend?: number | string; to?: number | string; }, counter: Counter, page: string, field: string, coins: Coin[] | undefined): CounterChange
{
    const given = [input.by, input.spend, input.to].filter((part) => part !== undefined);

    if (given.length !== 1) {
        throw new Error("Give one of by (damage, healing), spend (what is paid or used up) or to (a value, max, or current/max).");
    }

    if (typeof input.by === "string" || typeof input.spend === "string") {
        const parameter = typeof input.by === "string" ? "by" : "spend";
        // A plain number given coins may be money written without them; a current/max counter is no purse.
        const coinsAsked = counter.max === undefined && coins !== undefined && readSignedAmount(String(input.by ?? input.spend), coins) !== undefined;
        const money = coinsAsked && coins !== undefined
            ? `${field} on ${page} is a number, not money: to count it in coins, set it with its coins, such as set ${field}=${counter.value} ${coins[0].name}; or give ${parameter} a whole number.`
            : undefined;
        throw new Error(money ?? `${field} on ${page} is a counter: give ${parameter} a whole number, such as ${parameter === "by" ? "by -7" : "spend 1"}.`);
    }

    if (input.by !== undefined) {
        return { by: input.by };
    }

    if (input.spend !== undefined) {
        if (!canSpend(counter, input.spend)) {
            throw new Error(input.spend > 0 ? `${page} has ${field} ${formatCounter(counter)}: cannot spend ${input.spend}. Nothing changed.` : "Give spend a number above 0.");
        }

        return { spend: input.spend };
    }

    return { to: readTarget(String(input.to).trim(), counter, page, field) };
}

/** The value given to `to`: max, a whole number, or current/max. */
function readTarget(target: string, counter: Counter, page: string, field: string): Counter
{
    if (target.toLowerCase() === "max") {
        if (counter.max === undefined) {
            throw new Error(`${field} on ${page} has no maximum: give to a number, or write the field as current/max with write.`);
        }

        return { ...counter, value: counter.max };
    }

    const given = readCounterText(target);

    if (given === undefined) {
        throw new Error(`"${target}" is not a value for to: give a whole number, max, or current/max such as 15/15.`);
    }

    return given.max === undefined ? { ...counter, value: given.value } : given;
}

function amountOf(change: CounterChange): Record<string, unknown>
{
    return "to" in change ? { to: formatCounter(change.to) } : change;
}

/** Where the counter stands, when it matters: at 0 or at its maximum, how far a change went beyond, or outside the limits. */
function limitNote(counter: Counter, beyond: number): string
{
    const limit = counterLimit(counter);
    const where = limit === "outside" ? (counter.max === undefined ? "below 0" : `outside 0–${counter.max}`) : limit ?? "";
    return [where, beyond === 0 ? "" : `${Math.abs(beyond)} beyond`].filter((part) => part !== "").join(", ");
}
