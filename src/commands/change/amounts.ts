// Works out a change of a counter or money from by, spend or to, before anything is written
import { canSpend, changeCounter, type Counter, type CounterChange, counterLimit, formatCounter, isSafeCounter, readCounter, readCounterText } from "../../counters/index.ts";
import { addCoins, type Coin, formatAmount, formatTotal, isSafePurse, namesCoins, payCoins, type Purse, readAmount, readSignedAmount, totalOf } from "../../money/index.ts";
import { coinExamples } from "../shared/examples.ts";

/** One change worked out on a counter or on money, before it is written (D-92, MON-4). */
export interface Step
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

/** A change to a counter: by, spend or to, within its limits (D-92). */
export function counterStep(
    input: { by?: number | string; spend?: number | string; to?: number | string; },
    value: unknown,
    page: string,
    field: string,
    coins: Coin[] | undefined,
    limits: { min?: number; max?: number; hint?: { made: string; raise?: string; }; } = {},
): Step
{
    const read = readCounter(value);

    if (read === undefined) {
        throw new Error(notCounterMessage(page, field, value, coins));
    }

    const before = limits.min === undefined ? read : { ...read, min: limits.min };
    const counterChange = readChange(input, before, page, field, coins);
    // How to change a maximum the game system works out, said when a value goes past it.
    const raise = limits.hint?.raise === undefined ? "" : `; to raise the maximum, write ${limits.hint.raise}; to change it for a while, as a drain, give an effect that sets ${limits.hint.raise}`;

    // A maximum the game system works out is given only as it works it out (FOR-7).
    if ("to" in counterChange && limits.max !== undefined && counterChange.to.max !== undefined && counterChange.to.max !== limits.max) {
        throw new Error(
            `The maximum of ${field} on ${page} is worked out by the game system: ${limits.hint?.made ?? limits.max}. Give the current value alone, such as to ${Math.min(counterChange.to.value, limits.max)}${raise}. Nothing changed.`,
        );
    }

    // A value given with to keeps the minimum the system gives, for where it stands: 0 is no limit of a counter that goes below it.
    const { counter: after, beyond } = changeCounter(before, counterChange);

    // Above a maximum the game system works out, a value reads as the maximum (FOR-6): what change says it wrote would not be what is read.
    if ("to" in counterChange && limits.max !== undefined && after.value > limits.max) {
        throw new Error(`${field} on ${page} goes no higher than its maximum, which the game system works out: ${limits.hint?.made ?? limits.max}. Give to ${limits.max} or less${raise}. Nothing changed.`);
    }

    if (!isSafeCounter(after)) {
        throw new Error(`${field} on ${page} would be too large to count exactly. Nothing changed.`);
    }

    const same = (base: unknown): boolean => {
        const counter = readCounter(base);
        return counter !== undefined && formatCounter(counter) === formatCounter(after);
    };

    return { before: formatCounter(before), after: formatCounter(after), amount: { ...amountOf(counterChange), beyond: beyond === 0 ? undefined : beyond }, note: limitNote({ ...after, min: after.min ?? before.min }, beyond), same };
}

/** A change to money (MON-4, MON-5): coins received with by, paid with spend or a negative by, the purse set with to. */
export function moneyStep(input: { by?: number | string; spend?: number | string; to?: number | string; }, purse: Purse, coins: Coin[], page: string, field: string): Step
{
    const given = [input.by, input.spend, input.to].filter((part) => part !== undefined);

    if (given.length !== 1) {
        throw new Error(`Give one of by (coins received, or paid with a minus), spend (what is paid) or to (what the purse holds), such as spend "5 ${coinExamples(coins).smallCoin}".`);
    }

    // Coins in quotes, as a model may send "\"5 sp\"", are the coins.
    const asked = typeof given[0] === "string" ? given[0].trim().replace(/^"(.*)"$/s, "$1") : given[0];
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
            const floor = (counter.min ?? 0) > 0 ? `, which goes no lower than ${counter.min}` : "";
            throw new Error(input.spend > 0 ? `${page} has ${field} ${formatCounter(counter)}${floor}: cannot spend ${input.spend}. Nothing changed.` : "Give spend a number above 0.");
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
    const lowest = counter.min ?? 0;
    const where = limit === "outside" ? (counter.max === undefined ? `below ${lowest}` : `outside ${lowest}–${counter.max}`) : limit ?? "";
    return [where, beyond === 0 ? "" : `${Math.abs(beyond)} beyond`].filter((part) => part !== "").join(", ");
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

/** "gp/mo, pp, sp, cp": the coins of the campaign, by all their names. */
function coinNames(coins: Coin[]): string
{
    return coins.map((coin) => coin.names.join("/")).join(", ");
}
