// The formulas of a game system (FOR-1–FOR-9): what they read, how they count, where they have no value, and what refuses a system.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { contributingReads, type FormulaScope, numberOf, parseFormula, readFormulas, tableOf, workOut } from "../src/core/formula.ts";

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
});

describe("a system's formulas that do not read (FOR-9)", () => {
    it.each([
        ["str +", '"str +" is not a formula: a number, a field, a function or ( was expected at the end.'],
        ["floor(str, 2)", "one value in floor()"],
        ["max(str)", "at least two values in max()"],
        ["square(str)", "a function: floor, ceil, min, max, table, has, count, item, sum"],
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
