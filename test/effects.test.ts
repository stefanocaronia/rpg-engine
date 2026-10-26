// Effects as lines of text (MECCANICHE, EFF-1, EFF-2, EFF-9): the table of what reads, and laws checked at random (D-118).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { effectiveFields } from "../src/commands/effect-layer.ts";
import { endedByDate } from "../src/commands/game-effects.ts";
import { type Effect, effectNamed, endsAtTurn, formatEffect, readEffect, readEffects, readRounds, withEffect } from "../src/effects/index.ts";
import { type Page, readFieldValue, type World } from "../src/pages/index.ts";
import { nextTurn } from "../src/scene/index.ts";
import { minutesBetween, readGameDate } from "../src/time/index.ts";

const runs = { numRuns: 2000 };

describe("effects as lines (EFF-1, EFF-2)", () => {
    it("reads a name, values in brackets and an end in game time or rounds, each optional", () => {
        const table: [string, Effect][] = [
            ["Spaventato", { name: "Spaventato", values: [] }],
            ["Scudo della fede (ac: 15) until day 2, 14:20", { name: "Scudo della fede", values: [["ac", "15"]], end: { date: "day 2, 14:20" } }],
            ["Forma d'orso (hp: 34/34, ac: 11, speed: 40 ft) until day 1, 22:00", { name: "Forma d'orso", values: [["hp", "34/34"], ["ac", "11"], ["speed", "40 ft"]], end: { date: "day 1, 22:00" } }],
            ["Spaventato until round 12, Ennio", { name: "Spaventato", values: [], end: { round: 12, turn: "Ennio" } }],
            ["Trattenuto  UNTIL  Round 3,  Annegato 1", { name: "Trattenuto", values: [], end: { round: 3, turn: "Annegato 1" } }],
            ["Forma (orso)", { name: "Forma (orso)", values: [] }],
            ["Forma (orso) (hp: 34/34)", { name: "Forma (orso)", values: [["hp", "34/34"]] }],
            ["Benedizione (temp hp: 5)", { name: "Benedizione", values: [["temp hp", "5"]] }],
            ["Benedizione (by: [[Lena]], temp hp: 5) until round 11, [[Lena]]", { name: "Benedizione", by: "[[Lena]]", values: [["temp hp", "5"]], end: { round: 11, turn: "Lena" } }],
            ["Ira (by: Mago 1) until scene end", { name: "Ira", by: "Mago 1", values: [], end: { scene: true } }],
        ];

        for (const [line, effect] of table) {
            expect(readEffect(line), line).toEqual({ effect });
        }
    });

    it("says why a field of effects does not read", () => {
        expect(readEffects([42])).toEqual({ problem: "effects must be a list of lines of text, such as Protezione (armor: 2) until day 2, 14:20." });
        expect(readEffects(["Spaventato", "spaventato until round 2, Lena"])).toEqual({ problem: "The effect spaventato is written twice: keep one." });
        expect(readEffect("Spaventato until round 0, Lena")).toEqual({ problem: '"round 0, Lena" is not an end: rounds start from 1.' });
        expect(readEffects(undefined)).toEqual({ effects: [] });
        expect(readEffects("")).toEqual({ effects: [] });
        expect(readEffects(["", "Prono"])).toEqual({ effects: [{ name: "Prono", values: [] }] });
        // A line written in Obsidian without quotes, which YAML reads as a map of one key, is the line it was.
        expect(readEffects([{ "Maledetta (wis": "6) until day 9, 06:00" }])).toEqual({ effects: [{ name: "Maledetta", values: [["wis", "6"]], end: { date: "day 9, 06:00" } }] });
        expect(readEffects([{ a: 1, b: 2 }])).toEqual({ problem: "effects must be a list of lines of text, such as Protezione (armor: 2) until day 2, 14:20." });
        expect(readEffect("Scudo (until day 1, 20:00)")).toEqual({ problem: '"Scudo (until day 1, 20:00)" has "until" in its name: write the end after the name and the values, such as Scudo until day 2, 14:20.' });
    });

    it("reads rounds, replaces an effect with the same name as the newest, and finds one in any case", () => {
        expect([readRounds("1 round"), readRounds("10 ROUNDS"), readRounds("0 rounds"), readRounds("10m")]).toEqual([1, 10, undefined, undefined]);
        const effects: Effect[] = [{ name: "Spaventato", values: [] }, { name: "Prono", values: [] }];
        expect(withEffect(effects, { name: "spaventato", values: [["ac", "10"]] })).toEqual([{ name: "Prono", values: [] }, { name: "spaventato", values: [["ac", "10"]] }]);
        expect(withEffect(effects, { name: "Cieco", values: [] })).toHaveLength(3);
        expect(effectNamed(effects, "PRONO")?.name).toBe("Prono");
    });
});

// Names, fields and values written as an AI would write them: words with spaces and accents, numbers, counters, units.
const words = fc.constantFrom("Spaventato", "Scudo della fede", "Forma d'orso", "Benedizione", "Città sacra");
const fields = fc.constantFrom("ac", "hp", "speed", "temp hp", "velocità");
const values = fc.constantFrom("15", "34/34", "40 ft", "[[Varro]]", "vero");
const ends = fc.oneof(
    fc.constant(undefined),
    fc.constantFrom("day 2, 14:20", "day 9").map((date) => ({ date })),
    fc.tuple(fc.integer({ min: 1, max: 99 }), fc.constantFrom("Ennio", "Annegato 1", "Lena")).map(([round, turn]) => ({ round, turn })),
    fc.constant({ scene: true as const }),
);
const keepers = fc.option(fc.constantFrom("[[Lena]]", "Mago 1"), { nil: undefined });
const effects: fc.Arbitrary<Effect> = fc.record({ name: words, by: keepers, values: fc.uniqueArray(fc.tuple(fields, values), { selector: ([field]) => field, maxLength: 3 }), end: ends }).map((drawn) => {
    const effect: Effect = { name: drawn.name, ...(drawn.by === undefined ? {} : { by: drawn.by }), values: drawn.values };
    return drawn.end === undefined ? effect : { ...effect, end: drawn.end };
});

describe("the laws of effects, at random", () => {
    it("EFF-1: an effect read back from its line is the same effect", () => {
        fc.assert(
            fc.property(effects, (effect) => {
                expect(readEffect(formatEffect(effect))).toEqual({ effect });
            }),
            runs,
        );
    });

    it("EFF-9: an effect counted in rounds ends at its turn in its round, at the start of its round without that turn in the order, and a round later anyway; never before its round", () => {
        const names = ["Ennio", "Lena", "Annegato 1"];
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 9 }), fc.constantFrom(...names), fc.integer({ min: 1, max: 9 }), fc.constantFrom(...names), fc.subarray(names, { minLength: 1 }), (endRound, endTurn, round, turn, order) => {
                const ends = endsAtTurn({ round: endRound, turn: endTurn }, round, turn, order);
                const expected = round > endRound || (round === endRound && (turn === endTurn || !order.includes(endTurn)));
                expect(ends).toBe(expected);
            }),
            runs,
        );
    });
});

describe("the laws of the layer of values, at random", () => {
    const names = ["hp", "ac", "speed", "stealth"];
    const fieldsOf = fc.dictionary(fc.constantFrom(...names), fc.constantFrom("12/12", "13", "30 ft", "+4"), { maxKeys: 3 });
    const layers = fc.array(
        fc.record({ name: fc.constantFrom("Scudo", "Forma", "Fretta", "Ombra"), values: fc.uniqueArray(fc.tuple(fc.constantFrom(...names), fc.constantFrom("34/34", "15", "60 ft")), { selector: ([field]) => field, maxLength: 2 }) }),
        { maxLength: 3 },
    )
        .map((effects) => effects.filter((effect, index) => effects.findIndex((other) => other.name === effect.name) === index) as Effect[]);

    it("EFF-3: a field reads from the newest effect that gives it, then from the page, then from its base; never an effect of the base", () => {
        fc.assert(
            fc.property(fieldsOf, fieldsOf, layers, layers, (own, inherited, effects, baseEffects) => {
                const base: Page = { name: "Annegato", type: "creature", path: "world/creatures/Annegato.md", fields: { ...inherited, ...(baseEffects.length === 0 ? {} : { effects: baseEffects.map(formatEffect) }) }, body: "" };
                const page: Page = { name: "Zanna", type: "character", path: "world/characters/Zanna.md", fields: { ...own, creature: "[[Annegato]]", ...(effects.length === 0 ? {} : { effects: effects.map(formatEffect) }) }, body: "" };
                const world: World = { root: "", pages: [base, page], problems: [] };
                const read = effectiveFields(world, page);

                for (const field of names) {
                    const given = effects.findLast((effect) => effect.values.some(([name]) => name === field))?.values.find(([name]) => name === field)?.[1];
                    const expected = given !== undefined ? readFieldValue(given) : field in own ? own[field] : inherited[field];
                    expect(read[field], field).toEqual(expected);
                }
            }),
            runs,
        );
    });

    it("EFF-8: an effect ends in time when its end is a game date that has come, and only then", () => {
        const dates = fc.constantFrom("day 1, 18:10", "day 2", "day 1", "domani", "day 1, 18:00");
        const nows = fc.constantFrom({ day: 1, minute: 18 * 60 }, { day: 1, minute: 18 * 60 + 10 }, { day: 2, minute: 0 }, { day: 3 });
        fc.assert(
            fc.property(dates, nows, fc.boolean(), (date, now, inRounds) => {
                const effect: Effect = { name: "Scudo", values: [], end: inRounds ? { round: 2, turn: "Ennio" } : { date } };
                const end = readGameDate(date);
                expect(endedByDate(effect, now)).toBe(!inRounds && end !== undefined && minutesBetween(now, end) <= 0);
            }),
            runs,
        );
    });
});

describe("the law of rounds, played out", () => {
    it("EFF-9: an effect of N rounds, added on someone's turn, ends when the turns come back to them N rounds later, and never before", () => {
        const names = ["Ennio", "Lena", "Annegato 1", "Annegato 2"];
        fc.assert(
            fc.property(fc.shuffledSubarray(names, { minLength: 1 }), fc.nat({ max: 3 }), fc.integer({ min: 1, max: 5 }), (order, start, rounds) => {
                const owner = order[start % order.length];
                const end = { round: 1 + rounds, turn: owner };
                let turn = owner;
                let round = 1;
                let steps = 0;

                while (!endsAtTurn(end, round, turn, order)) {
                    ({ turn, round } = nextTurn(order, turn, round));
                    steps++;
                }

                expect(steps).toBe(rounds * order.length);
                expect(turn).toBe(owner);
            }),
            runs,
        );
    });
});

describe("the edges of the lines (EFF-1, EFF-2)", () => {
    it("reads lines with spaces around and inside, and refuses an empty one", () => {
        expect(readEffect("  Scudo  (ac: 15)  until  day 2, 14:20 ")).toEqual({ effect: { name: "Scudo", values: [["ac", "15"]], end: { date: "day 2, 14:20" } } });
        expect(readEffect("Prono until round 3,   [[ Annegato 1 ]]")).toEqual({ effect: { name: "Prono", values: [], end: { round: 3, turn: "Annegato 1" } } });
        expect(readEffect("Ira until SCENE END")).toEqual({ effect: { name: "Ira", values: [], end: { scene: true } } });
        expect(readEffect("")).toEqual({ problem: '"" is not an effect: write its name, then its values in brackets and its end, such as Protezione (armor: 2) until day 2, 14:20.' });
        expect(readEffects("  ")).toEqual({ effects: [] });
        expect(readEffects(["  ", "Prono"])).toEqual({ effects: [{ name: "Prono", values: [] }] });
        expect(readEffects(["Prono", 42])).toEqual({ problem: "effects must be a list of lines of text, such as Protezione (armor: 2) until day 2, 14:20." });
    });

    it("reads rounds only as a whole duration", () => {
        expect([readRounds("10rounds"), readRounds(" 2 Rounds "), readRounds("10 rounds later"), readRounds("x10 rounds"), readRounds("10 round s")]).toEqual([10, 2, undefined, undefined, undefined]);
    });
});

describe("the layer reads fields in any case", () => {
    it("gives a value to the field the page writes, whatever case the effect writes it in", () => {
        const page: Page = { name: "Zanna", type: "character", path: "world/characters/Zanna.md", fields: { ac: 13, effects: ["Scudo (AC: 15)"] }, body: "" };
        expect(effectiveFields({ root: "", pages: [page], problems: [] }, page)).toEqual({ ac: 15, effects: ["Scudo (AC: 15)"] });
    });
});
