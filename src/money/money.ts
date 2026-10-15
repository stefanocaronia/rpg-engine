import { comparableText } from "../core/text.ts";

/** A coin of the campaign (MON-1): its names, the first being the one written; its value in the smallest coin; whether it is rare, never given as change (D-128). */
export interface Coin
{
    name: string;
    names: string[];
    value: number;
    rare: boolean;
}

/** How many coins of each kind there are, by the coin's first name; kinds left out count 0. */
export type Purse = Record<string, number>;

/** A payment (MON-5): the purse after it; the coins given beyond those of the price, and the change that came back. */
export interface Payment
{
    purse: Purse;
    given: Purse;
    back: Purse;
}

// A coin name is one word, such as gp or corona; a coin may have several, written gp/mo.
const word = String.raw`\p{L}[\p{L}\p{M}]*`;
const coinNames = new RegExp(String.raw`^${word}(?:/${word})*$`, "u");
// One count and one coin, such as 34 gp or 34gp; pairs are parted by spaces or commas.
const countAndCoin = new RegExp(String.raw`(\d+)\s*(${word})`, "uy");
const separator = /[\s,]*/y;

/** What is wrong with a list of coins, as campaign.yaml holds it (MON-1, MON-8); undefined when it is right. */
export function coinsProblem(value: unknown): string | undefined
{
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
        return 'coins must list each coin with its value in the smallest coin, such as "gp 100, sp 10, cp 1".';
    }

    const entries = Object.entries(value);
    const badName = entries.find(([names]) => !coinNames.test(names));
    const badValue = entries.find(([, worth]) => readWorth(worth) === undefined);

    if (badName !== undefined) {
        return `"${badName[0]}" cannot be a coin: a coin is one word, such as gp or corona, or several names written gp/mo.`;
    }

    if (badValue !== undefined) {
        return `The coin ${badValue[0]} is worth ${JSON.stringify(badValue[1])}: give each coin a whole number from 1 up, its value in the smallest coin, and "rare" after it for a coin never given as change.`;
    }

    const coins = coinList(value as Record<string, unknown>);
    const names = coins.flatMap((coin) => coin.names.map(comparableText));
    const twice = names.find((name, index) => names.indexOf(name) !== index);
    const values = coins.map((coin) => coin.value);
    const repeated = values.find((worth, index) => values.indexOf(worth) !== index);
    const unit = coins.find((coin) => coin.value === 1);

    if (twice !== undefined) {
        return `The name ${twice} is given to two coins: give each name once.`;
    }

    if (repeated !== undefined) {
        return `Two coins are worth ${repeated}: each coin needs a value of its own.`;
    }

    if (unit === undefined) {
        return "No coin is worth 1: the smallest coin is worth 1, and the others are worth so many of it.";
    }

    return unit.rare ? `The coin ${unit.name} is worth 1, and change comes back in it: it cannot be rare.` : undefined;
}

/** The coins of a list that has no problem, in its order: the first is the coin of totals. */
export function coinList(value: Record<string, unknown>): Coin[]
{
    return Object.entries(value).map(([names, worth]) => {
        const all = names.split("/");
        const read = readWorth(worth) ?? { value: 0, rare: false };
        return { name: all[0], names: all, ...read };
    });
}

/** The list of coins written as text, such as "gp/mo 100, pp 1000 rare, sp 10, cp 1", as campaign.yaml keeps it; refused with what is wrong. */
export function readCoins(text: string): Record<string, number | string>
{
    const coins: Record<string, number | string> = {};

    for (const entry of text.normalize("NFC").split(",").map((part) => part.trim()).filter((part) => part !== "")) {
        const match = new RegExp(String.raw`^(${word}(?:\s*/\s*${word})*)\s*[=:]?\s*(\d+)(\s+rare)?$`, "iu").exec(entry);

        if (match === null) {
            throw new Error(`"${entry}" is not a coin and its value: write coins as "gp 100, pp 1000 rare, sp 10, cp 1", each with its value in the smallest coin; give a coin more names as gp/mo.`);
        }

        const names = match[1].split("/").map((name) => name.trim()).join("/");

        if (Object.keys(coins).some((other) => other.split("/").some((name) => names.split("/").some((given) => comparableText(given) === comparableText(name))))) {
            throw new Error(`The coin ${names} is listed twice: give each coin once.`);
        }

        coins[names] = match[3] === undefined ? Number(match[2]) : `${match[2]} rare`;
    }

    const problem = coinsProblem(coins);

    if (problem !== undefined) {
        throw new Error(problem);
    }

    return coins;
}

/** "gp/mo 100, pp 1000 rare, sp 10, cp 1": a list of coins as config shows it and takes it. */
export function coinsText(coins: Coin[]): string
{
    return coins.map((coin) => `${coin.names.join("/")} ${coin.value}${coin.rare ? " rare" : ""}`).join(", ");
}

/** The purse a value holds, such as "34 gp 4 sp", with any name of each coin; undefined when it is not an amount of these coins (MON-2). */
export function readAmount(value: unknown, coins: Coin[]): Purse | undefined
{
    return typeof value === "string" ? readCoinsText(value.trim(), coins) : undefined;
}

/** An amount given to change: coins to add, or, with a minus, to pay, such as "+20 gp" or "-5 sp"; undefined when it is not one. */
export function readSignedAmount(text: string, coins: Coin[]): { sign: 1 | -1; purse: Purse; } | undefined
{
    const trimmed = text.trim();
    const sign = trimmed.startsWith("-") ? -1 : 1;
    const purse = readCoinsText(trimmed.replace(/^[+-]\s*/, ""), coins);
    return purse === undefined ? undefined : { sign, purse };
}

/** Whether a text names coins of the list after a number, as an amount would, such as "34 mo e 4 ma": what was likely meant as money. */
export function namesCoins(text: string, coins: Coin[]): boolean
{
    const named = coins.flatMap((coin) => coin.names.map(comparableText));
    return [...text.matchAll(new RegExp(String.raw`\d+\s*(${word})`, "gu"))].some((match) => named.includes(comparableText(match[1])));
}

/** "34 gp 4 sp": from the coin worth most, by first names, without those at 0; an empty purse is 0 of the first coin (MON-2). */
export function formatAmount(purse: Purse, coins: Coin[]): string
{
    const held = byValue(coins).filter((coin) => (purse[coin.name] ?? 0) > 0);
    return held.length === 0 ? `0 ${coins[0].name}` : held.map((coin) => `${purse[coin.name]} ${coin.name}`).join(" ");
}

/** What a purse is worth, in the smallest coin. */
export function totalOf(purse: Purse, coins: Coin[]): number
{
    return coins.reduce((total, coin) => total + (purse[coin.name] ?? 0) * coin.value, 0);
}

/** What a purse is worth in the first coin, such as "33.9 gp"; when that does not come out in two decimals, in the smallest coin, such as "541 soldo" (MON-7). */
export function formatTotal(purse: Purse, coins: Coin[]): string
{
    const total = totalOf(purse, coins);
    const inFirst = total / coins[0].value;

    if (Math.round(inFirst * 100) / 100 === inFirst) {
        return `${inFirst} ${coins[0].name}`;
    }

    const unit = byValue(coins)[coins.length - 1];
    return `${total} ${unit.name}`;
}

/** The purse with coins added: they stay as they are given (MON-3). */
export function addCoins(purse: Purse, added: Purse): Purse
{
    const result = { ...purse };

    for (const [name, count] of Object.entries(added)) {
        result[name] = (result[name] ?? 0) + count;
    }

    return result;
}

/** The purse with coins taken out of it, as a payment hands them over. */
export function takeCoins(purse: Purse, taken: Purse): Purse
{
    return withoutEmpty(addCoins(purse, negate(taken)));
}

/** Whether every count of a purse is a whole number that can be counted exactly. */
export function isSafePurse(purse: Purse, coins: Coin[]): boolean
{
    return Object.values(purse).every((count) => Number.isSafeInteger(count)) && Number.isSafeInteger(totalOf(purse, coins));
}

/**
 * Pays a price from a purse, as at an inn (MON-5, D-128): the coins of the price; the rest with other coins that make it exactly, from the largest; else the smallest coin
 * that covers it, or, when none does alone, coins from the largest until they do, and the change comes back in as few coins as can be, never rare ones.
 * Undefined when the purse is worth less than the price.
 */
export function payCoins(purse: Purse, price: Purse, coins: Coin[]): Payment | undefined
{
    if (totalOf(purse, coins) < totalOf(price, coins)) {
        return undefined;
    }

    const ordered = byValue(coins);

    // The coins of the price, when they are all there; else other coins that make the price exactly, such as 6 sp for 60 cp.
    if (coins.every((coin) => (purse[coin.name] ?? 0) >= (price[coin.name] ?? 0))) {
        return { purse: withoutEmpty(addCoins(purse, negate(price))), given: {}, back: {} };
    }

    const whole = exactly(purse, ordered, totalOf(price, coins));

    if (whole !== undefined) {
        return { purse: withoutEmpty(addCoins(purse, negate(whole))), given: withoutEmpty(whole), back: {} };
    }

    const result = { ...purse };
    let rest = 0;

    for (const coin of coins) {
        const taken = Math.min(result[coin.name] ?? 0, price[coin.name] ?? 0);
        result[coin.name] = (result[coin.name] ?? 0) - taken;
        rest += ((price[coin.name] ?? 0) - taken) * coin.value;
    }

    const given = exactly(result, ordered, rest) ?? covering(result, ordered, rest);
    const handed = totalOf(given, coins);
    const back = change(handed - rest, ordered.filter((coin) => !coin.rare));
    return { purse: withoutEmpty(addCoins(addCoins(result, negate(given)), back)), given: withoutEmpty(given), back: withoutEmpty(back) };
}

/**
 * The change one gives from a purse of one's own (STK-8): `amount` in coins it holds, never rare ones, from the largest; undefined when they do not make it exactly.
 */
export function changeFrom(purse: Purse, amount: number, coins: Coin[]): Purse | undefined
{
    const given = exactly(purse, byValue(coins).filter((coin) => !coin.rare), amount);
    return given === undefined ? undefined : withoutEmpty(given);
}

/** The value and rarity of a coin as the list writes them: 100, or "1000 rare". */
function readWorth(worth: unknown): { value: number; rare: boolean; } | undefined
{
    const match = typeof worth === "string" ? /^(\d+)\s+rare$/i.exec(worth.trim()) : null;
    const value = match === null ? worth : Number(match[1]);
    return Number.isSafeInteger(value) && (value as number) >= 1 ? { value: value as number, rare: match !== null } : undefined;
}

/** Reads "34 gp 4 sp" against the list of coins: each coin once, by any of its names, in any case; kept by its first name. */
function readCoinsText(text: string, coins: Coin[]): Purse | undefined
{
    const purse: Purse = {};
    let position = 0;

    while (position < text.length) {
        countAndCoin.lastIndex = position;
        const match = countAndCoin.exec(text);
        const coin = match === null ? undefined : coins.find((candidate) => candidate.names.some((name) => comparableText(name) === comparableText(match[2])));

        if (match === null || coin === undefined || Object.hasOwn(purse, coin.name) || !Number.isSafeInteger(Number(match[1]))) {
            return undefined;
        }

        purse[coin.name] = Number(match[1]);
        separator.lastIndex = countAndCoin.lastIndex;
        separator.exec(text);
        position = separator.lastIndex;
    }

    return Object.keys(purse).length === 0 ? undefined : withoutEmpty(purse);
}

/** The coins worth exactly `amount`, taken from the largest; undefined when the purse cannot make it so. */
function exactly(purse: Purse, coins: Coin[], amount: number): Purse | undefined
{
    const taken: Purse = {};
    let left = amount;

    for (const coin of coins) {
        taken[coin.name] = Math.min(purse[coin.name] ?? 0, Math.floor(left / coin.value));
        left -= taken[coin.name] * coin.value;
    }

    return left === 0 ? taken : undefined;
}

/** The smallest coin worth at least `amount`; when none is, coins from the largest until they are worth it. The purse is worth it all, so they always do. */
function covering(purse: Purse, coins: Coin[], amount: number): Purse
{
    const single = [...coins].reverse().find((coin) => coin.value >= amount && (purse[coin.name] ?? 0) > 0);

    if (single !== undefined) {
        return { [single.name]: 1 };
    }

    const taken: Purse = {};
    let left = amount;

    for (const coin of coins) {
        if (left <= 0) {
            break;
        }

        taken[coin.name] = Math.min(purse[coin.name] ?? 0, Math.ceil(left / coin.value));
        left -= taken[coin.name] * coin.value;
    }

    return taken;
}

/** `amount` in as few coins as can be, from the largest: the coin worth 1 is among them, so it always comes out exactly. */
function change(amount: number, coins: Coin[]): Purse
{
    const back: Purse = {};
    let left = amount;

    for (const coin of coins) {
        back[coin.name] = Math.floor(left / coin.value);
        left -= back[coin.name] * coin.value;
    }

    return back;
}

/** The coins from the one worth most. */
function byValue(coins: Coin[]): Coin[]
{
    return [...coins].sort((first, second) => second.value - first.value);
}

function negate(purse: Purse): Purse
{
    return Object.fromEntries(Object.entries(purse).map(([name, count]) => [name, -count]));
}

function withoutEmpty(purse: Purse): Purse
{
    return Object.fromEntries(Object.entries(purse).filter(([, count]) => count !== 0));
}
