// Money (MECCANICHE, MON-1–MON-8): examples, and laws checked on coin lists, purses and prices made at random (D-118).
// The 5e values are the coin values of the SRD 5.2.1 (CC-BY-4.0); the other lists are invented, to keep the core generic.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addCoins, type Coin, coinList, coinsProblem, coinsText, formatAmount, formatTotal, isSafePurse, namesCoins, payCoins, type Purse, readAmount, readCoins, readSignedAmount, totalOf } from "../src/money/index.ts";

const fifth = coinList({ gp: 100, pp: "1000 rare", ep: "50 rare", sp: 10, cp: 1 });
const fifthPlain = coinList({ gp: 100, pp: 1000, ep: 50, sp: 10, cp: 1 });
const crowns = coinList({ "corona/corone": 240, "scellino/scellini": 12, "soldo/soldi": 1 });
// Coins that do not divide each other: no greedy sum is sure to come out exactly.
const odd = coinList({ quattro: 4, tre: 3, uno: 1 });
const five = coinList({ cinque: 5, quattro: 4, tre: 3, uno: 1 });
const guineas = coinList({ pound: 240, guinea: 252, shilling: 12, penny: 1 });
// Listed out of order on purpose: the first is the coin of totals, not the largest.
const scrambled = coinList({ sp: 10, cp: 1, pp: 1000, gp: 100 });

describe("the coins of a campaign (MON-1, MON-8)", () => {
    it("reads them as text, with other names and rare coins, and says what is wrong", () => {
        expect(readCoins("gp/mo 100, pp 1000 RARE, ep 50 rare, sp 10, cp 1")).toEqual({ "gp/mo": 100, pp: "1000 rare", ep: "50 rare", sp: 10, cp: 1 });
        expect(readCoins("corona / corone = 240, scellino: 12, soldo 1,, ")).toEqual({ "corona/corone": 240, scellino: 12, soldo: 1 });
        expect(coinsText(coinList(readCoins("gp/mo 100, pp 1000 rare, cp 1")))).toBe("gp/mo 100, pp 1000 rare, cp 1");

        const refused: [string, string][] = [
            ["gp, sp 10", '"gp" is not a coin and its value'],
            ["100 gp, cp 1", '"100 gp" is not a coin and its value'],
            ["1gp 100, cp 1", '"1gp 100" is not a coin and its value'],
            ["gp 100, sp 10", "No coin is worth 1"],
            ["gp 10, sp 10, cp 1", "Two coins are worth 10"],
            ["gp 100, sp 10, cp 1, gp 5", "The coin gp is listed twice"],
            ["gp/mo 100, MO 10, cp 1", "The coin MO is listed twice"],
            ["gp/mo 100, mo/xx 10, cp 1", "The coin mo/xx is listed twice"],
            ["gp 100, cp 1 rare", "The coin cp is worth 1, and change comes back in it: it cannot be rare."],
        ];

        for (const [text, message] of refused) {
            expect(() => readCoins(text), text).toThrow(message);
        }

        for (const value of [null, "gp 100", 5, {}, []]) {
            expect(coinsProblem(value), JSON.stringify(value)).toBe('coins must list each coin with its value in the smallest coin, such as "gp 100, sp 10, cp 1".');
        }

        for (const worth of ["100", 0, -5, 0.5, "100 common", "1000 rarely", "x1000 rare", "0 rare"]) {
            expect(coinsProblem({ gp: worth, cp: 1 }), JSON.stringify(worth)).toContain("The coin gp is worth");
        }

        expect(coinList({ pp: " 1000  RARE ", cp: 1 })[0]).toEqual({ name: "pp", names: ["pp"], value: 1000, rare: true });

        expect(coinsProblem({ "pezzo d'oro": 100, cp: 1 })).toContain(`"pezzo d'oro" cannot be a coin`);
        expect(coinsProblem({ "gp/mo": 100, "mo/ma": 10, cp: 1 })).toBe("The name mo is given to two coins: give each name once.");
    });
});

describe("amounts (MON-2, MON-3)", () => {
    it("reads coins by any name, in any case and order, once each, and writes them by their first name from the coin worth most", () => {
        expect(readAmount("4 sp 34 GP", fifth)).toEqual({ gp: 34, sp: 4 });
        expect(readAmount("  34gp, 4sp ", fifth)).toEqual({ gp: 34, sp: 4 });
        expect(readAmount("2 corone 5 scellini 1 soldo", crowns)).toEqual({ corona: 2, scellino: 5, soldo: 1 });
        expect(formatAmount({ scellino: 5, corona: 2 }, crowns)).toBe("2 corona 5 scellino");
        expect(formatAmount({ sp: 4, gp: 34, cp: 0 }, fifth)).toBe("34 gp 4 sp");
        expect(formatAmount({ gp: 2, pp: 1 }, fifth)).toBe("1 pp 2 gp");
        expect(formatAmount({}, fifth)).toBe("0 gp");
        expect(readAmount("0 gp", fifth)).toEqual({});

        for (const text of ["34 mo", "34 gp 4 gp", "gp 34", "34", "", "molti", "-3 gp", "3.5 gp", "34 gp e 4 sp"]) {
            expect(readAmount(text, fifth), text).toBeUndefined();
        }

        expect(readAmount("1 corona 2 corone", crowns)).toBeUndefined();
        expect(readAmount(34, fifth)).toBeUndefined();
        expect(readSignedAmount("-5 sp", fifth)).toEqual({ sign: -1, purse: { sp: 5 } });
        expect(readSignedAmount("  - 5 sp ", fifth)).toEqual({ sign: -1, purse: { sp: 5 } });
        expect(readSignedAmount("+20 gp", fifth)).toEqual({ sign: 1, purse: { gp: 20 } });
        expect(namesCoins("34 gp e 4 sp", fifth)).toBe(true);
        expect(namesCoins("3 razioni", fifth)).toBe(false);
    });

    it("adds coins as they are, and gives the total in the first coin, or in the smallest when it does not come out even", () => {
        expect(addCoins({ gp: 1, sp: 9 }, { sp: 5 })).toEqual({ gp: 1, sp: 14 });
        expect(isSafePurse({ gp: 9007199254740991 }, fifth)).toBe(false);
        expect(isSafePurse({ gp: 90071992547409, cp: 1 }, fifth)).toBe(true);
        expect(formatTotal({ gp: 33, sp: 9 }, fifth)).toBe("33.9 gp");
        expect(formatTotal({ corona: 2, scellino: 5 }, crowns)).toBe("2.25 corona");
        expect(formatTotal({ corona: 2, scellino: 5, soldo: 1 }, crowns)).toBe("541 soldo");
        expect(formatTotal({ soldo: 1 }, crowns)).toBe("1 soldo");
    });
});

describe("paying (MON-5, D-128)", () => {
    it.each([
        { purse: "34 gp 4 sp", price: "5 sp", coins: fifth, after: "33 gp 9 sp", given: "1 gp", back: "9 sp" },
        { purse: "14 gp", price: "4 cp", coins: fifth, after: "13 gp 9 sp 6 cp", given: "1 gp", back: "9 sp 6 cp" },
        { purse: "14 gp", price: "4 cp", coins: fifthPlain, after: "13 gp 1 ep 4 sp 6 cp", given: "1 gp", back: "1 ep 4 sp 6 cp" },
        { purse: "1 pp", price: "1 cp", coins: fifth, after: "9 gp 9 sp 9 cp", given: "1 pp", back: "9 gp 9 sp 9 cp" },
        { purse: "1 pp 10 sp", price: "1 gp 10 sp", coins: fifth, after: "9 gp", given: "1 pp", back: "9 gp" },
        { purse: "34 gp 4 sp 30 cp", price: "5 sp", coins: fifth, after: "34 gp 20 cp", given: "4 sp 10 cp", back: undefined },
        { purse: "13 sp 6 cp", price: "60 cp", coins: fifth, after: "7 sp 6 cp", given: "6 sp", back: undefined },
        { purse: "60 sp", price: "5 gp", coins: fifth, after: "10 sp", given: "50 sp", back: undefined },
        { purse: "1 gp", price: "10 sp", coins: fifth, after: "0 gp", given: "1 gp", back: undefined },
        { purse: "1 ep", price: "1 sp 5 cp", coins: fifth, after: "3 sp 5 cp", given: "1 ep", back: "3 sp 5 cp" },
        { purse: "2 gp", price: "15 sp", coins: fifth, after: "5 sp", given: "2 gp", back: "5 sp" },
        { purse: "2 corone", price: "5 scellini", coins: crowns, after: "1 corona 15 scellino", given: "1 corona", back: "15 scellino" },
        { purse: "3 sp 2 gp", price: "1 gp 5 sp", coins: scrambled, after: "8 sp", given: "1 gp", back: "8 sp" },
        { purse: "2 pound", price: "1 guinea", coins: guineas, after: "19 shilling", given: "2 pound", back: "19 shilling" },
        { purse: "1 quattro 2 tre 1 uno", price: "6 uno", coins: odd, after: "1 tre 2 uno", given: "1 quattro 1 tre", back: "2 uno" },
        { purse: "1 quattro 2 tre", price: "1 cinque", coins: five, after: "1 tre 2 uno", given: "1 quattro 1 tre", back: "2 uno" },
    ])("$purse, paying $price, leaves $after", ({ purse, price, coins, after, given, back }) => {
        const payment = payCoins(amount(purse, coins), amount(price, coins), coins);
        expect(payment === undefined ? undefined : formatAmount(payment.purse, coins)).toBe(after);
        expect(Object.keys(payment?.given ?? {}).length === 0 ? undefined : formatAmount(payment?.given ?? {}, coins)).toBe(given);
        expect(Object.keys(payment?.back ?? {}).length === 0 ? undefined : formatAmount(payment?.back ?? {}, coins)).toBe(back);
    });

    it("pays with the coins of the price when they are there, and refuses what the purse cannot pay", () => {
        expect(payCoins(amount("34 gp 4 sp", fifth), amount("3 gp 4 sp", fifth), fifth)).toEqual({ purse: { gp: 31 }, given: {}, back: {} });
        expect(payCoins(amount("4 sp", fifth), amount("5 sp", fifth), fifth)).toBeUndefined();
    });
});

// Coin lists of every shape: distinct values from 1 up, in any order, some rare but never the coin worth 1; purses and prices made of them.
const lists = fc.uniqueArray(fc.integer({ min: 2, max: 400 }), { maxLength: 4 }).chain((values) =>
    fc.tuple(fc.shuffledSubarray([1, ...values], { minLength: values.length + 1 }), fc.array(fc.boolean(), { minLength: values.length + 1, maxLength: values.length + 1 })).map(([ordered, rare]) =>
        coinList(Object.fromEntries(ordered.map((worth, index) => [coinName(worth), rare[index] && worth !== 1 ? `${worth} rare` : worth])))
    )
);
const purseOf = (coins: Coin[], most: number): fc.Arbitrary<Purse> =>
    fc.tuple(...coins.map(() => fc.integer({ min: 0, max: most }))).map((counts) => Object.fromEntries(coins.map((coin, index) => [coin.name, counts[index]]).filter(([, count]) => count !== 0)));
const cases = fc.oneof(lists, fc.constantFrom(fifth, fifthPlain, crowns, odd, five, guineas, scrambled)).chain((coins) =>
    fc.record({ coins: fc.constant(coins), purse: purseOf(coins, 30), price: purseOf(coins, 8).filter((price) => Object.keys(price).length > 0) })
);
const runs = { numRuns: 3000 };

describe("the laws of money, on coin lists, purses and prices made at random", () => {
    it("MON-5: a payment is refused exactly when the purse is worth less, and takes exactly the price, never leaving fewer than 0 coins", () => {
        fc.assert(
            fc.property(cases, ({ coins, purse, price }) => {
                const payment = payCoins(purse, price, coins);
                expect(payment === undefined).toBe(totalOf(purse, coins) < totalOf(price, coins));

                if (payment !== undefined) {
                    expect(totalOf(payment.purse, coins)).toBe(totalOf(purse, coins) - totalOf(price, coins));
                    expect(Object.values(payment.purse).every((count) => Number.isSafeInteger(count) && count > 0)).toBe(true);
                }
            }),
            runs,
        );
    });

    it("MON-3, MON-5, D-128: a coin grows only as change, never a rare one, and with enough of each coin of the price nothing else moves", () => {
        fc.assert(
            fc.property(cases, ({ coins, purse, price }) => {
                const payment = payCoins(purse, price, coins);

                for (const coin of coins.filter((candidate) => (payment?.purse[candidate.name] ?? 0) > (purse[candidate.name] ?? 0))) {
                    expect((payment?.back[coin.name] ?? 0) > 0 && !coin.rare, coin.name).toBe(true);
                }

                if (coins.every((coin) => (purse[coin.name] ?? 0) >= (price[coin.name] ?? 0))) {
                    expect(payment?.given).toEqual({});
                    expect(payment?.back).toEqual({});
                }
            }),
            runs,
        );
    });

    it("MON-2, MON-3: an amount reads back as it is written, and coins added keep the total", () => {
        fc.assert(
            fc.property(cases, ({ coins, purse, price }) => {
                expect(readAmount(formatAmount(purse, coins), coins) ?? {}).toEqual(purse);
                expect(totalOf(addCoins(purse, price), coins)).toBe(totalOf(purse, coins) + totalOf(price, coins));
            }),
            runs,
        );
    });
});

/** A coin's name made of letters, as names are: 33 is "xdd". */
function coinName(worth: number): string
{
    return `x${[...String(worth)].map((digit) => String.fromCharCode(97 + Number(digit))).join("")}`;
}

function amount(text: string, coins: Coin[]): Purse
{
    const purse = readAmount(text, coins);

    if (purse === undefined) {
        throw new Error(`${text} is not an amount`);
    }

    return purse;
}
