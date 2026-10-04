// The conditions events listen to (MECCANICHE, EVT-3): the table of what reads, and laws checked on containers made at random (D-118).
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatTrigger, readTrigger, readTriggers, type Subject, type Trigger, type TriggerFacts, triggerHolds } from "../src/triggers/index.ts";

const runs = { numRuns: 2000 };
const party: Subject = { party: true };
const page = (name: string): Subject => ({ page: name });

describe("conditions (EVT-3)", () => {
    it("reads each form, in any case and spacing, and links with a label", () => {
        const table: [string, Trigger][] = [
            ["party in [[Ossario]]", { kind: "in", what: party, where: page("Ossario") }],
            ["  PARTY  IN  [[Ossario]] ", { kind: "in", what: party, where: page("Ossario") }],
            ["[[Lanterna della cappella]] in party", { kind: "in", what: page("Lanterna della cappella"), where: party }],
            ["[[Lanterna|la lanterna]] in [[Cappella]]", { kind: "in", what: page("Lanterna"), where: page("Cappella") }],
            ["[[Varro]] dead", { kind: "status", page: "Varro", status: "dead" }],
            ["[[Varro]]   DEAD", { kind: "status", page: "Varro", status: "dead" }],
            ["[[ Varro ]] dead", { kind: "status", page: "Varro", status: "dead" }],
            ["[[characters/Varro.md]] dead", { kind: "status", page: "Varro", status: "dead" }],
            ["party in [[places/Ossario]]", { kind: "in", what: party, where: page("Ossario") }],
            ["[[Ludovico, il conte]] dead", { kind: "status", page: "Ludovico, il conte", status: "dead" }],
            ["[[La marcia della Confraternita]] happened", { kind: "status", page: "La marcia della Confraternita", status: "happened" }],
        ];

        for (const [text, trigger] of table) {
            expect(readTrigger(text), text).toEqual({ trigger });
        }
    });

    it("says why a text is not a condition, and how to write one", () => {
        const forms = '"party in [[Place]]", "[[Item]] in party", "[[Thing]] in [[Place]]" or "[[Page]] dead"';
        const table: [string, string][] = [
            ["Varro dead", `"Varro dead" is not a condition: write ${forms}, with the pages as links.`],
            ["party dead", `"party dead" is not a condition: write ${forms}, with the pages as links.`],
            ["[[Varro]] is dead", `"[[Varro]] is dead" is not a condition: write ${forms}, with the pages as links.`],
            ["party in [[Ossario]] or [[Varro]] dead", '"party in [[Ossario]] or [[Varro]] dead" holds more than one condition: give a list, of which one is enough, such as ["party in [[Ossario]]", "[[Varro]] dead"].'],
            ["party in [[Ossario]], [[Lanterna]] in party", '"party in [[Ossario]], [[Lanterna]] in party" holds more than one condition: give a list, of which one is enough, such as ["party in [[Ossario]]", "[[Lanterna]] in party"].'],
            ["party in [[Ossario]], domani", `"party in [[Ossario]], domani" is not a condition: write ${forms}, with the pages as links.`],
            ["[[Varro #Il piano]] dead", "[[Varro #Il piano]] names a part of a page: a condition is on a whole page, such as [[Varro]]."],
            ["[[Varro^blocco]] dead", "[[Varro^blocco]] names a part of a page: a condition is on a whole page, such as [[Varro]]."],
            ["party in party", '"party in party" can never hold: nothing is inside itself.'],
            ["[[Varro]] in [[varro]]", '"[[Varro]] in [[varro]]" can never hold: nothing is inside itself.'],
            ["[[]] dead", "[[]] names no page: write it as a link, such as [[Ossario]]."],
            ["[[Varro#Il piano]] dead", "[[Varro#Il piano]] names a part of a page: a condition is on a whole page, such as [[Varro]]."],
            ["party in [[Varro#Il piano]]", "[[Varro#Il piano]] names a part of a page: a condition is on a whole page, such as [[Varro]]."],
        ];

        for (const [text, problem] of table) {
            expect(readTrigger(text), text).toEqual({ problem });
        }
    });

    it("reads a when field: one condition, a list of which one is enough, or nothing when empty", () => {
        const inside: Trigger = { kind: "in", what: party, where: page("Ossario") };
        const dead: Trigger = { kind: "status", page: "Varro", status: "dead" };
        expect(readTriggers("party in [[Ossario]]")).toEqual({ triggers: [inside] });
        expect(readTriggers(["party in [[Ossario]]", "", "  ", "[[Varro]] dead"])).toEqual({ triggers: [inside, dead] });
        expect(readTriggers([])).toEqual({ triggers: [] });
        expect(readTriggers(["Varro dead"])).toEqual(readTrigger("Varro dead"));

        for (const value of [42, [1], { party: "in" }, null]) {
            expect(readTriggers(value), JSON.stringify(value)).toEqual({ problem: 'when must be a condition or a list of conditions, as text: "party in [[Place]]", "[[Item]] in party", "[[Thing]] in [[Place]]" or "[[Page]] dead".' });
        }
    });

    it("writes a condition with its pages as links or as names", () => {
        const trigger: Trigger = { kind: "in", what: page("Lanterna"), where: party };
        expect(formatTrigger(trigger)).toBe("[[Lanterna]] in party");
        expect(formatTrigger(trigger, false)).toBe("Lanterna in party");
        expect(formatTrigger({ kind: "status", page: "Varro", status: "dead" }, false)).toBe("Varro dead");
    });

    it("asks the world: a page that does not exist, or that two pages share, never holds", () => {
        const facts = forestFacts({ Ennio: "Ossario", Lanterna: "Ennio", Ossario: undefined }, ["Ennio"], { Varro: "dead" });

        const holds = (text: string, given = facts): boolean => {
            const read = readTrigger(text);
            return "trigger" in read && triggerHolds(read.trigger, given);
        };

        expect(holds("party in [[ossario]]")).toBe(true);
        expect(holds("[[Lanterna]] in party")).toBe(true);
        expect(holds("[[Ennio]] in party")).toBe(true);
        expect(holds("[[Lanterna]] in [[OSSARIO]]")).toBe(true);
        expect(holds("[[Ossario]] in [[Lanterna]]")).toBe(false);
        expect(holds("party in [[Cripta]]")).toBe(false);
        expect(holds("[[Varro]] dead")).toBe(true);
        expect(holds("[[Varro]] alive")).toBe(false);
        expect(holds("[[Nessuno]] dead")).toBe(false);
        expect(holds("party in [[Ossario]]", { ...facts, isPage: (name) => name.toLowerCase() !== "ossario" })).toBe(false);
        expect(holds("[[Lanterna]] in party", { ...facts, isPage: (name) => name.toLowerCase() !== "lanterna" })).toBe(false);
    });
});

// Containers made at random as a forest: each thing is in at most one other, which comes before it, so that no chain loops.
const names = ["Ossario", "Cripta", "Mulino", "Ennio", "Lena", "Bruno", "Lanterna", "Diario", "Spada"];
const forests = fc.tuple(fc.array(fc.option(fc.nat({ max: names.length - 1 }), { nil: undefined }), { minLength: names.length, maxLength: names.length }), fc.subarray(names))
    .map(([parents, members]) => {
        const holder = Object.fromEntries(names.map((name, index) => {
            const parent = parents[index];
            return [name, parent === undefined || parent >= index ? undefined : names[parent]];
        }));
        return { holder, members };
    });
const subjects = fc.oneof(fc.constant<Subject>(party), fc.constantFrom(...names, "Nessuno").map((name) => page(name)));

describe("the laws of conditions, on containers made at random", () => {
    it("EVT-3: a thing is inside what holds it, what holds that, and so on, and in the party when it is one of them or inside one of them", () => {
        fc.assert(
            fc.property(forests, subjects, subjects, ({ holder, members }, what, where) => {
                const facts = forestFacts(holder, members, {});
                const read = readTrigger(formatTrigger({ kind: "in", what, where }));

                if (!("trigger" in read)) {
                    // Only the party in itself, or a page in itself, does not read.
                    expect("party" in what ? "party" in where : "page" in where && where.page === what.page).toBe(true);
                    return;
                }

                expect(triggerHolds(read.trigger, facts)).toBe(insideByModel(holder, members, what, where));
            }),
            runs,
        );
    });

    it("EVT-3: being inside goes through containers: A in B and B in C gives A in C", () => {
        fc.assert(
            fc.property(forests, fc.constantFrom(...names), fc.constantFrom(...names), fc.constantFrom(...names), ({ holder, members }, first, second, third) => {
                const facts = forestFacts(holder, members, {});
                const inside = (what: string, where: string): boolean => what !== where && triggerHolds({ kind: "in", what: page(what), where: page(where) }, facts);

                if (inside(first, second) && inside(second, third)) {
                    expect(inside(first, third)).toBe(true);
                }
            }),
            runs,
        );
    });

    it("EVT-3: a condition read back from how it is written is the same condition", () => {
        const triggers = fc.oneof(
            fc.tuple(subjects, subjects).filter(([what, where]) => ("party" in what ? !("party" in where) : !("page" in where) || where.page !== what.page)).map(([what, where]): Trigger => ({ kind: "in", what, where })),
            fc.tuple(fc.constantFrom(...names), fc.constantFrom("dead", "alive", "happened", "done")).map(([name, status]): Trigger => ({ kind: "status", page: name, status })),
        );
        fc.assert(
            fc.property(triggers, (trigger) => {
                expect(readTrigger(formatTrigger(trigger))).toEqual({ trigger });
            }),
            runs,
        );
    });
});

/** The facts of a forest of containers: who holds whom, the party, and the statuses. */
function forestFacts(holder: Record<string, string | undefined>, members: string[], statuses: Record<string, string>): TriggerFacts
{
    const known = (name: string): string | undefined => Object.keys(holder).find((key) => key.toLowerCase() === name.toLowerCase()) ?? Object.keys(statuses).find((key) => key.toLowerCase() === name.toLowerCase());

    const chain = (name: string): string[] => {
        const found = known(name);
        const containers: string[] = [];

        for (let next = found === undefined ? undefined : holder[found]; next !== undefined; next = holder[next]) {
            containers.push(next);
        }

        return containers;
    };

    return { party: members, isPage: (name) => known(name) !== undefined, containersOf: chain, statusOf: (name) => statuses[known(name) ?? ""] };
}

/** The reference: what is inside a place is all it holds, and all they hold, gathered downwards. */
function insideByModel(holder: Record<string, string | undefined>, members: string[], what: Subject, where: Subject): boolean
{
    const within = (container: string): Set<string> => {
        const found = new Set<string>();
        let added = true;

        while (added) {
            added = false;

            for (const [name, parent] of Object.entries(holder)) {
                if (parent !== undefined && (parent === container || found.has(parent)) && !found.has(name)) {
                    found.add(name);
                    added = true;
                }
            }
        }

        return found;
    };

    if ("party" in what) {
        return "page" in where && names.includes(where.page) && members.some((member) => within(where.page).has(member));
    }

    if ("party" in where) {
        return names.includes(what.page) && (members.includes(what.page) || members.some((member) => within(member).has(what.page)));
    }

    return names.includes(where.page) && within(where.page).has(what.page);
}
