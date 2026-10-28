// The formulas of a game system (FOR-1–FOR-9): what they read, how they count, where they have no value, and what refuses a system.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { chosenDice, contributingReads, type FormulaScope, numberOf, parseFormula, parseRollFormula, readFormulas, tableOf, workOut } from "../src/core/formula.ts";

/** A scope over plain fields and the tables given. */
function scope(fields: Record<string, unknown>, tables: Record<string, Record<string, number>> = {}): FormulaScope
{
    return {
        field: (name) => Object.entries(fields).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1],
        table: (name) => (tables[name] === undefined ? undefined : tableOf(tables[name])),
    };
}

function valueOf(text: string, fields: Record<string, unknown> = {}, tables: Record<string, Record<string, number>> = {}): number | undefined
{
    return workOut(parseFormula(text), scope(fields, tables)).value;
}

describe("what a formula counts (FOR-2)", () => {
    it.each([
        ["1 + 2 * 3", {}, 7],
        ["(1 + 2) * 3", {}, 9],
        ["10 - 4 - 3", {}, 3],
        ["-2 * -3", {}, 6],
        ["7 / 2", {}, 3.5],
        ["floor((str - 10) / 2)", { str: 15 }, 2],
        ["floor((str - 10) / 2)", { str: 8 }, -1],
        ["ceil(level / 2)", { level: 5 }, 3],
        ["min(3, 1, 2)", {}, 1],
        ["max(0, 2 - debilities)", { debilities: 3 }, 0],
        ["wis-mod + 2", { "wis-mod": 3 }, 5],
        ["slots-1 + 1", { "slots-1": "2/4" }, 3],
        ["WIS-Mod", { "wis-mod": "+3" }, 3],
    ])("%s with %o is %s", (text, fields, value) => {
        expect(valueOf(text, fields)).toBe(value);
    });

    it("reads a hyphen inside a name as the name's, and a minus between spaces as a subtraction", () => {
        expect(valueOf("wis-mod", { "wis-mod": 3, wis: 16, mod: 1 })).toBe(3);
        expect(valueOf("wis - mod", { "wis-mod": 3, wis: 16, mod: 1 })).toBe(15);
        expect(valueOf("10-count(debilities)", { debilities: ["wounded"] })).toBe(9);
    });

    it("finds the row of a table: the highest not above a number, the one with a name", () => {
        const tables = { proficiency: { 1: 2, 5: 3, 9: 4 }, ranks: { troublesome: 12, dangerous: 8 } };
        expect([1, 4, 5, 8, 20].map((level) => valueOf("table(proficiency, level)", { level }, tables))).toEqual([2, 2, 3, 3, 4]);
        expect(valueOf("table(proficiency, level)", { level: 0 }, tables)).toBeUndefined();
        expect(valueOf("table(ranks, rank)", { rank: "Dangerous" }, tables)).toBe(8);
        expect(valueOf("table(ranks, rank)", { rank: "epic" }, tables)).toBeUndefined();
    });

    it("looks for names in lists: links, sections of a page, a number after a name", () => {
        const fields = {
            classes: ["[[Cleric]] 3", "[[Fighter]] 2"],
            features: ["[[Cleric#Channel Divinity]]", "[[Hill Dwarf#Dwarven Toughness|toughness]]"],
            skills: ["Perception +3", "Stealth +4"],
            saves: "wis",
        };
        expect(valueOf("has(classes, cleric)", fields)).toBe(1);
        expect(valueOf("has(classes, Wizard)", fields)).toBe(0);
        expect(valueOf("item(classes, Fighter)", fields)).toBe(2);
        expect(valueOf("item(classes, Wizard)", fields)).toBe(0);
        expect(valueOf("sum(classes)", fields)).toBe(5);
        expect(valueOf("count(classes)", fields)).toBe(2);
        expect(valueOf("has(features, Channel Divinity) + has(features, Dwarven Toughness)", fields)).toBe(2);
        expect(valueOf("item(skills, Perception)", fields)).toBe(3);
        expect(valueOf("has(saves, wis)", fields)).toBe(1);
    });

    it("reads a value in parentheses after a name as no part of it, and the number it begins with as the item's (D-220)", () => {
        const fields = { features: ["Channel Divinity (2/rest)", "Bardic Inspiration (d8)", "Extra Attack (3)", "Destroy Undead (CR 1/2)", "Rage"] };
        expect(valueOf("has(features, Channel Divinity) + has(features, Bardic Inspiration) + has(features, Destroy Undead)", fields)).toBe(3);
        expect(valueOf("item(features, Channel Divinity)", fields)).toBe(2);
        expect(valueOf("item(features, Extra Attack)", fields)).toBe(3);
        expect(valueOf("item(features, Bardic Inspiration) + item(features, Destroy Undead) + item(features, Rage)", fields)).toBe(0);
    });

    it("reads a field as a number: a number, a counter's current value, or text such as +2", () => {
        expect([12, "5/12", "+2", "-1", "-3/10", " 7 ", "dex", "[[Wolf]]", true, ["1"]].map(numberOf)).toEqual([12, 5, 2, -1, -3, 7, undefined, undefined, undefined, undefined]);
    });

    it("reads a measure with a note in brackets after its unit, and nothing else with brackets (FOR-2)", () => {
        expect(["40 ft (hover)", "30 ft (40 ft in wolf form)", "25 ft.", "3 (1d6)", "3 bludgeoning", "40 ft (hover) extra"].map(numberOf)).toEqual([40, 30, 25, undefined, undefined, undefined]);
    });
});

describe("where a formula has no value (FOR-4)", () => {
    it("has none without a field it needs, without a row, or dividing by zero", () => {
        expect(valueOf("floor((str - 10) / 2)", {})).toBeUndefined();
        expect(valueOf("str + 1", { str: "strong" })).toBeUndefined();
        expect(valueOf("10 / (level - level)", { level: 3 })).toBeUndefined();
        expect(valueOf("sum(classes)", {})).toBeUndefined();
    });

    it("reads a list it lacks as empty in has, count and item", () => {
        expect(valueOf("has(expertise, Stealth) + count(debilities) + item(classes, Cleric)", {})).toBe(0);
    });
});

describe("what a result came from (FOR-8)", () => {
    it("keeps the values that change it: not a proficiency without the skill; always the key of a table", () => {
        const formula = parseFormula("wis-mod + proficiency * has(skill-proficiencies, Insight)");

        const read = (fields: Record<string, unknown>): string[] => {
            const worked = workOut(formula, scope(fields));
            return contributingReads(formula, scope(fields), worked).map((reading) => ("field" in reading ? reading.field : "list" in reading ? reading.list : reading.table));
        };

        expect(read({ "wis-mod": 3, proficiency: 2, "skill-proficiencies": ["Insight"] })).toEqual(["wis-mod", "proficiency", "skill-proficiencies"]);
        expect(read({ "wis-mod": 3, proficiency: 2, "skill-proficiencies": ["Medicine"] })).toEqual(["wis-mod"]);
        expect(read({ "wis-mod": 0, proficiency: 2 })).toEqual(["wis-mod"]);

        const table = parseFormula("table(proficiency, level)");
        const tables = { proficiency: { 1: 2, 5: 3 } };
        const worked = workOut(table, scope({ level: 3 }, tables));
        expect(contributingReads(table, scope({ level: 3 }, tables), worked)).toEqual([{ field: "level", value: 3, key: true }, { table: "proficiency", key: "3", value: 2 }]);
    });

    it("tries each value with the pages the list names, as a filtered count reads them", () => {
        const formula = parseFormula("count(classes, spellcasting = full) * 2 + skill * proficiency");
        const fields: Record<string, unknown> = { classes: ["[[Wizard]] 3"], skill: 0, proficiency: 2 };
        const pages: Record<string, Record<string, unknown>> = { wizard: { spellcasting: "full" } };
        const withPages = { ...scope(fields), page: (name: string) => pages[name.toLowerCase()] };
        const worked = workOut(formula, withPages);
        expect(worked.value).toBe(2);
        expect(contributingReads(formula, withPages, worked).map((reading) => ("field" in reading ? reading.field : "list" in reading ? reading.list : reading.table))).toEqual(["classes", "skill"]);
    });

    it("keeps of min, max and best only what the operand that gives the result read, and of a tie one that read something", () => {
        const read = (text: string, fields: Record<string, unknown>, tables: Record<string, Record<string, number>> = {}): string[] => {
            const formula = parseFormula(text);
            const worked = workOut(formula, scope(fields, tables));
            return contributingReads(formula, scope(fields, tables), worked).map((reading) => ("field" in reading ? reading.field : "list" in reading ? reading.list : reading.table));
        };

        expect(read("max(str-mod, dex-mod) + proficiency", { "str-mod": -1, "dex-mod": 4, proficiency: 2 })).toEqual(["dex-mod", "proficiency"]);
        expect(read("best(table(base, level) + dex-mod, unarmored-ac)", { level: 1, "dex-mod": 2, "unarmored-ac": 15 }, { base: { 1: 10 } })).toEqual(["unarmored-ac"]);
        expect(read("min(1, floor(level / 11))", { level: 11 })).toEqual(["level"]);
    });
});

describe("a system's formulas that do not read (FOR-9)", () => {
    it.each([
        ["str +", '"str +" is not a formula: a number, a field, a function or ( was expected at the end.'],
        ["floor(str, 2)", "one value in floor()"],
        ["max(str)", "at least two values in max()"],
        ["square(str)", "a function: floor, ceil, min, max, best, table, has, count, item, sum"],
        ["has(skills)", '"," was expected'],
        ["str 2", "an operator, or the end of the formula was expected"],
        ["has(skills, )", "the name of an item, then )"],
    ])("refuses %s", (text, message) => {
        expect(() => parseFormula(text)).toThrow(message);
    });

    it("takes several formulas in order, the first with a value, with what that one read (D-210)", () => {
        const formulas = readFormulas({ computed: { perception: ["wis-mod + level", "wis-mod + item(skills, Perception)"], flat: 2 } });
        const [, perception] = formulas.computed[0];
        const worked = (fields: Record<string, unknown>) => workOut(perception, scope(fields));
        expect(worked({ "wis-mod": 1, level: 3, skills: ["Perception +5"] })).toEqual({ value: 4, reads: [{ field: "wis-mod", value: 1 }, { field: "level", value: 3 }] });
        expect(worked({ "wis-mod": 1, skills: ["Perception +5"] }).value).toBe(6);
        expect(worked({}).value).toBeUndefined();
        expect(formulas.computed[1][1]).toEqual({ kind: "number", value: 2 });
        expect(() => readFormulas({ computed: { a: [] } })).toThrow("computed.a: give a formula, or formulas in order");
        expect(() => readFormulas({ computed: { a: ["1", "b +"] } })).toThrow(/^computed\.a\[2\]: "b \+" is not a formula/);
        expect(() => readFormulas({ computed: { a: "1", A: "2" } })).toThrow("computed.A: the field is given twice, in different cases: give it once.");
    });

    it("sums the numbers of the items whose page has a value in a field, and refuses one written otherwise (D-215)", () => {
        const pages: Record<string, Record<string, unknown>> = { Fighter: { "hit-die": "d10" }, Wizard: { "hit-die": "d6" }, Ranger: { "Hit-Die": "D10" } };
        const formula = parseFormula("sum(classes, hit-die = d10)");
        const read = (classes: unknown) => workOut(formula, { ...scope({ classes }), page: (name) => pages[name] }).value;
        expect(read(["[[Fighter]] 3", "[[Wizard]] 2", "[[Ranger]] 1", "[[Unknown]] 4"])).toBe(4);
        expect(read(["[[Wizard]] 2"])).toBe(0);
        expect(read(undefined)).toBeUndefined();
        expect(() => parseFormula("sum(classes, hit-die)")).toThrow("a field = value, such as hit-die = d10, then )");
        const count = parseFormula("count(classes, hit-die = d10)");
        // best: the highest of those that have a value; none when none has one (FOR-2).
        expect(valueOf("best(10 + dex, armor, 12)", { dex: 2 })).toBe(12);
        expect(valueOf("best(armor, shield)", {})).toBeUndefined();
        // A formula of a page may begin with dice and end with words (PRO-5).
        expect(parseRollFormula("1d8 + str-mod + bonus slashing")).toMatchObject({ dice: [{ dice: "1d8" }], words: "slashing" });
        expect(parseRollFormula("1 + dex-mod piercing")).toMatchObject({ words: "piercing" });
        expect(parseRollFormula("2d6 fire")).toEqual({ dice: [{ dice: "2d6" }], words: "fire" });
        expect(parseRollFormula("16 + bonus").dice).toBeUndefined();
        expect(() => parseRollFormula("1d8 + str-mod +")).toThrow(/is not a formula/);
        // Why it does not read is said of what follows the dice, which are allowed.
        expect(() => parseRollFormula("1d8 + str_mod slashing")).toThrow(/^"str_mod slashing" is not a formula/);
        // Or with dice(…), the largest of several, as a monk weapon's own die and the Martial Arts die (D-235).
        expect(parseRollFormula("dice(1d6, martial-arts) + dex-mod bludgeoning")).toMatchObject({ dice: [{ dice: "1d6" }, { field: "martial-arts" }], words: "bludgeoning" });
        expect(parseRollFormula("DICE(martial-arts, 1) + str-mod")).toMatchObject({ dice: [{ field: "martial-arts" }, { number: 1 }] });
        expect(parseRollFormula("dice(2d6) cold")).toEqual({ dice: [{ dice: "2d6" }], words: "cold" });
        expect(() => parseRollFormula("dice(1d6, martial arts) + dex-mod")).toThrow(
            '"dice(1d6, martial arts) + dex-mod" is not a formula: dice, a number or a field that holds dice was expected in dice() at "martial arts", such as dice(1d6, martial-arts).',
        );
        expect(() => parseRollFormula("dice() + dex-mod")).toThrow('in dice() at ""');
        expect(() => parseFormula("2 + dice(1d6)")).toThrow('"2 + dice(1d6)" is not a formula: dice() goes only at the beginning of an item\'s formula, such as dice(1d6, martial-arts) + dex-mod.');
        expect(() => parseRollFormula("1d4 + dice(1d6) cold")).toThrow("dice() goes only at the beginning");
        expect(workOut(count, { ...scope({ classes: ["[[Fighter]] 3", "[[Wizard]] 2", "[[Ranger]] 1"] }), page: (name) => pages[name] }).value).toBe(2);
    });

    it("names the place, a table that is not there, and fields that read each other in a circle", () => {
        expect(() => readFormulas({ computed: { "str-mod": "floor((str - 10) /" } })).toThrow(/^computed\.str-mod: "floor\(\(str - 10\) \/" is not a formula/);
        expect(() => readFormulas({ computed: { proficiency: "table(proficiency-by-level, level)" } })).toThrow('computed.proficiency: there is no table "proficiency-by-level" in tables.');
        expect(() => readFormulas({ counters: { hp: { max: "table(hit, level)" } } })).toThrow('counters.hp.max: there is no table "hit" in tables.');
        // What comes back on an occasion: all of it for an occasion alone, else a formula by occasion, where max is the counter's maximum (DAT-9).
        expect(readFormulas({ counters: { ki: { refill: "short rest" } } }).counters.ki.refill).toEqual({ "short rest": { kind: "field", name: "max" } });
        expect(() => readFormulas({ counters: { ki: { refill: { "short rest": "max *" } } } })).toThrow(/^counters\.ki\.refill\.short rest: "max \*" is not a formula/);
        expect(() => readFormulas({ counters: { ki: { refill: { "long rest": "table(ki, level)" } } } })).toThrow('counters.ki.refill.long rest: there is no table "ki" in tables.');
        expect(() => readFormulas({ computed: { a: "b + 1", b: "c + 1", c: "a + 1" } })).toThrow("computed fields read each other in a circle: a → b → c → a.");
        expect(() => readFormulas({ computed: { a: "a + 1" } })).toThrow("computed fields read each other in a circle: a → a.");
        expect(readFormulas({ computed: { b: "a + 1", a: "1" }, counters: { momentum: { min: -6, max: "10 - count(debilities)" } } }).counters.momentum.min).toEqual({ kind: "number", value: -6 });
    });
});

describe("the dice a roll takes (D-235)", () => {
    const dice = (text: string, fields: Record<string, unknown> = {}) => {
        const choices = parseRollFormula(text).dice ?? [];
        return chosenDice(choices, scope(fields));
    };

    it("takes the largest by its average, the first of two alike, dice a field holds, and a number, as an unarmed strike's 1", () => {
        expect(dice("dice(1d6, martial-arts)", { "martial-arts": "1d4" })).toEqual({ dice: "1d6", reads: [] });
        expect(dice("dice(1d6, martial-arts)", { "martial-arts": "1d8" })).toEqual({ dice: "1d8", reads: [{ field: "martial-arts", dice: "1d8" }] });
        expect(dice("dice(1d6, martial-arts)", { "martial-arts": "1d6" })).toEqual({ dice: "1d6", reads: [] });
        expect(dice("dice(martial-arts, 1d6)", { "martial-arts": "1d6" })).toEqual({ dice: "1d6", reads: [{ field: "martial-arts", dice: "1d6" }] });
        expect(dice("dice(martial-arts, 1)", {})).toEqual({ number: 1, reads: [] });
        expect(dice("dice(martial-arts, 1)", { "martial-arts": "d4" })).toEqual({ dice: "d4", reads: [{ field: "martial-arts", dice: "d4" }] });
        expect(dice("dice(2d6, 1d10)")).toEqual({ dice: "2d6", reads: [] });
        // A field that holds a number gives it; one that holds other text, as two classes' "Bard 3, Sorcerer 4", gives nothing.
        expect(dice("dice(extra)", { extra: "+3" })).toEqual({ number: 3, reads: [{ field: "extra", value: 3 }] });
        expect(dice("dice(martial-arts)", { "martial-arts": "Monk 1d6, Bard 3" })).toBeUndefined();
        expect(dice("dice(martial-arts)", {})).toBeUndefined();
    });

    it("is never smaller on average than any choice with a value, and has a value when one has", () => {
        const choice = fc.oneof(
            fc.tuple(fc.integer({ min: 1, max: 4 }), fc.constantFrom(4, 6, 8, 10, 12)).map(([count, faces]) => ({ text: `${count}d${faces}`, average: (count * (faces + 1)) / 2 })),
            fc.integer({ min: 0, max: 20 }).map((number) => ({ text: String(number), average: number })),
        );
        fc.assert(fc.property(fc.array(choice, { minLength: 1, maxLength: 4 }), fc.option(choice, { nil: undefined }), (choices, held) => {
            const fields = held === undefined ? {} : { held: held.text };
            const chosen = dice(`dice(${[...choices.map((given) => given.text), "held"].join(", ")})`, fields);
            const valued = [...choices, ...(held === undefined ? [] : [held])];
            const average = chosen?.dice === undefined ? chosen?.number : valued.find((given) => given.text === chosen.dice)?.average;
            expect(average).toBe(Math.max(...valued.map((given) => given.average)));
        }));
    });
});

describe("laws of formulas", () => {
    // An expression of whole numbers, with its value as JavaScript counts it.
    const expression: fc.Arbitrary<{ text: string; value: number; }> = fc.letrec((tie) => ({
        node: fc.oneof(
            { depthSize: "small", withCrossShrink: true },
            fc.integer({ min: 0, max: 50 }).map((value) => ({ text: String(value), value })),
            fc.record({ left: tie("node"), operator: fc.constantFrom("+", "-", "*"), right: tie("node") }).map(({ left, operator, right }) => {
                const typed = left as { text: string; value: number; };
                const other = right as { text: string; value: number; };
                const value = operator === "+" ? typed.value + other.value : operator === "-" ? typed.value - other.value : typed.value * other.value;
                return { text: `(${typed.text} ${operator} ${other.text})`, value };
            }),
            tie("node").map((inner) => {
                const typed = inner as { text: string; value: number; };
                return { text: `-${typed.text}`, value: -typed.value };
            }),
        ),
    })).node as fc.Arbitrary<{ text: string; value: number; }>;

    it("counts as JavaScript counts, however an expression is nested (FOR-2)", () => {
        fc.assert(fc.property(expression, ({ text, value }) => {
            expect(valueOf(text)).toBe(value === 0 ? 0 : value);
        }));
    });

    it("finds in a list exactly the names it holds, in any case and as links (FOR-2)", () => {
        const name = fc.constantFrom("Insight", "Stealth", "Animal Handling", "Sleight of Hand", "wis");
        fc.assert(fc.property(fc.array(name), name, fc.boolean(), (items, wanted, linked) => {
            const list = items.map((item) => (linked ? `[[${item}]]` : item.toUpperCase()));
            expect(valueOf(`has(list, ${wanted})`, { list })).toBe(items.includes(wanted) ? 1 : 0);
            expect(valueOf("count(list)", { list })).toBe(items.length);
        }));
    });
});
