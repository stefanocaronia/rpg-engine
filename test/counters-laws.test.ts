// The laws of counters (MECCANICHE, CNT-1–CNT-10): the module on counters made at random, against a model that moves one unit at a time; change and write on pages made at random.
import fc from "fast-check";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { LogEntry } from "../src/core/log.ts";
import { canSpend, changeCounter, type Counter, counterLimit, formatCounter, readCounter, readCounterText } from "../src/counters/index.ts";
import { concernsPlayer, type Page, type PageType, type World } from "../src/pages/index.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

const runs = { numRuns: 3000 };
// A counter as a page may hold it: inside its limits or outside them, after a to, with a minimum below 0 or above it, as a game system works it out.
const counters = fc.record({ value: fc.integer({ min: -20, max: 40 }), max: fc.option(fc.integer({ min: 0, max: 30 }), { nil: undefined }), min: fc.option(fc.integer({ min: -8, max: 3 }), { nil: undefined }) })
    .filter((counter) => counter.min === undefined || counter.max === undefined || counter.min <= counter.max)
    .map((counter): Counter => Object.fromEntries(Object.entries(counter).filter(([, value]) => value !== undefined)) as unknown as Counter);

describe("the laws of counters, on counters made at random", () => {
    it("CNT-1: a counter the engine writes reads back the same, as a field and as text, and a field reads as the model of its text says", () => {
        fc.assert(
            fc.property(counters, (counter) => {
                const written = { value: counter.value, ...(counter.max === undefined ? {} : { max: counter.max }) };
                expect(readCounter(formatCounter(written))).toEqual(written);
                expect(readCounterText(String(formatCounter(written)))).toEqual(written);
                expect(readCounter(`${counter.value} / ${counter.max ?? 0}`)).toEqual({ value: counter.value, max: counter.max ?? 0 });
            }),
            runs,
        );
        fc.assert(
            fc.property(fc.stringMatching(/^[ 0-9/+\-.a]{0,8}$/), (text) => {
                expect(readCounter(text), text).toEqual(currentAndMaxByModel(text));
            }),
            runs,
        );
    });

    it("CNT-3: by moves the value one unit at a time while it stays within its limits or comes nearer to them; what it cannot move is beyond", () => {
        fc.assert(
            fc.property(counters, fc.integer({ min: -60, max: 60 }), (counter, by) => {
                const { counter: after, beyond } = changeCounter(counter, { by });
                const model = byModel(counter, by);
                expect(after).toEqual({ ...counter, value: model.value });
                expect(beyond).toBe(model.beyond);
                // Within its limits before, within them after; outside, never further out.
                expect(distance({ ...counter, value: after.value })).toBeLessThanOrEqual(distance(counter));
            }),
            runs,
        );
    });

    it("CNT-4, CNT-5: spend takes exactly what is asked, when it is above 0 and there; to gives the value asked", () => {
        fc.assert(
            fc.property(counters, fc.integer({ min: -5, max: 45 }), counters, (counter, amount, target) => {
                // Never below 0, nor below a minimum above it.
                expect(canSpend(counter, amount)).toBe(amount > 0 && counter.value - amount >= Math.max(0, counter.min ?? 0));

                if (canSpend(counter, amount)) {
                    expect(changeCounter(counter, { spend: amount })).toEqual({ counter: { ...counter, value: counter.value - amount }, beyond: 0 });
                }

                expect(changeCounter(counter, { to: target })).toEqual({ counter: target, beyond: 0 });
            }),
            runs,
        );
    });

    it("CNT-9: a counter is at 0, at its minimum, at its maximum, outside its limits or within them, as the model says", () => {
        fc.assert(
            fc.property(counters, (counter) => {
                const lowest = counter.min ?? 0;
                const model = distance(counter) > 0
                    ? "outside"
                    : counter.value === lowest
                    ? (lowest === 0 ? "at 0" : "at min")
                    : counter.value === counter.max
                    ? "at max"
                    : undefined;
                expect(counterLimit(counter)).toBe(model);
            }),
            runs,
        );
    });
});

// Pages that may concern the player, by type and role or status, and the containers that may hold them (D-93, CON-1).
const pageTypes: Record<string, PageType> = {
    Kira: "character",
    Bran: "character",
    Varro: "character",
    Guado: "place",
    Zaino: "item",
    Torcia: "item",
    Cassa: "item",
    Voto: "quest",
};
const names = Object.keys(pageTypes);
const holdable: Record<string, string[]> = { place: ["place", "character", "item"], character: ["item"], item: ["item", "character"] };
const containerField: Record<string, string> = { place: "contains", character: "inventory", item: "contains" };
const concernWorlds = fc.record({
    roles: fc.tuple(...["Kira", "Bran", "Varro"].map(() => fc.constantFrom("pc", "companion", "npc", undefined))),
    quest: fc.constantFrom("open", "planned", "done"),
    lists: fc.tuple(...names.map(() => fc.subarray(names, { maxLength: 3 }))),
}).map(({ roles, quest, lists }): World => ({
    root: "",
    problems: [],
    pages: names.map((name, index): Page => {
        const type = pageTypes[name];
        const role = type === "character" ? roles[["Kira", "Bran", "Varro"].indexOf(name)] : undefined;
        const field = containerField[type];
        const fields: Record<string, unknown> = {
            ...(role === undefined ? {} : { role }),
            ...(type === "quest" ? { status: quest } : {}),
            ...(field === undefined || lists[index].length === 0 ? {} : { [field]: lists[index].map((listed) => `[[${listed}]]`) }),
        };
        return { name, type, path: `world/${type}s/${name}.md`, fields, body: "" };
    }),
}));

describe("the laws of whom a counter's change concerns, on worlds made at random", () => {
    it("CNT-10: a page concerns the player when it is theirs or a companion's, an open quest, or inside one of them climbing the containers", () => {
        fc.assert(
            fc.property(concernWorlds, (world) => {
                for (const page of world.pages) {
                    const model = ["pc", "companion"].includes(String(page.fields.role)) || (page.type === "quest" && page.fields.status === "open")
                        || chainByModel(world, page.name).some((holder) => ["pc", "companion"].includes(String(world.pages.find((candidate) => candidate.name === holder)?.fields.role)));
                    expect(concernsPlayer(world, page), page.name).toBe(model);
                }
            }),
            runs,
        );
    });
});

// What a change asks for, and what a write gives: the fields of a page in the test system based on Ironsworn, where momentum goes down to -6 (FOR-6).
type Operation =
    | { command: "change"; field: string; by: number; }
    | { command: "change"; field: string; spend: number; }
    | { command: "change"; field: string; to: string; }
    | { command: "write"; field: string; value: string; };

const fieldNames = ["frecce", "ferite", "momentum"];
const counterTexts = fc.oneof(fc.integer({ min: -4, max: 14 }).map(String), fc.tuple(fc.integer({ min: -3, max: 14 }), fc.integer({ min: 0, max: 12 })).map(([value, max]) => `${value}/${max}`));
const operations: fc.Arbitrary<Operation> = fc.oneof(
    fc.record({ command: fc.constant("change" as const), field: fc.constantFrom(...fieldNames), by: fc.integer({ min: -16, max: 16 }) }),
    fc.record({ command: fc.constant("change" as const), field: fc.constantFrom(...fieldNames), spend: fc.integer({ min: -1, max: 8 }) }),
    fc.record({ command: fc.constant("change" as const), field: fc.constantFrom(...fieldNames), to: fc.oneof(counterTexts, fc.constant("max"), fc.constant("10/10")) }),
    // "same" writes the value the field has.
    fc.record({ command: fc.constant("write" as const), field: fc.constantFrom(...fieldNames), value: fc.oneof(counterTexts, fc.constant("same")) }),
);
const holders = fc.constantFrom("pc", "companion", "npc", "carried", "item", "open quest", "planned quest");
const startingFields = fc.record({
    frecce: fc.integer({ min: -2, max: 20 }).map(String),
    ferite: fc.tuple(fc.integer({ min: -2, max: 14 }), fc.integer({ min: 0, max: 12 })).map(([value, max]) => `${value}/${max}`),
    momentum: fc.integer({ min: -8, max: 10 }).map((value) => `${value}/10`),
});

describe("the laws of change and write on counters, on pages made at random", () => {
    it("CNT-3–CNT-10: a run of changes and writes gives what the model gives, refuses what it refuses, and logs each change once, public just when it concerns the player", async () => {
        const outcomes = new Set<string>();
        await fc.assert(
            fc.asyncProperty(holders, startingFields, fc.array(operations, { minLength: 1, maxLength: 6 }), async (holder, start, run) => {
                const root = makeTempFolder();

                try {
                    const { file, name } = counterCampaign(root, holder, start);
                    const model: Record<string, Counter> = Object.fromEntries(Object.entries(start).map(([field, value]) => [field, readCounterText(value) as Counter]));
                    const visibility = ["pc", "companion", "carried", "open quest"].includes(holder) ? "public" : "hidden";

                    for (const asked of run) {
                        const operation = asked.command === "write" && asked.value === "same" ? { ...asked, value: String(formatCounter(model[asked.field])) } : asked;
                        const before = readFileSync(file, "utf8");
                        const lines = readLog(root).length;
                        const expected = applyByModel(model, operation);
                        const result = await runCommandLine(commandOf(name, operation), testContext(root));
                        const label = `${JSON.stringify(operation)} on ${JSON.stringify(model)}: ${result.output}`;
                        expect(result.exitCode === 0, label).toBe(expected !== "refused");
                        outcomes.add(`${operation.command} ${expected === "refused" ? "refused" : formatCounter(expected) === formatCounter(model[operation.field]) ? "same" : visibility}`);

                        if (expected === "refused") {
                            expect(readFileSync(file, "utf8"), label).toBe(before);
                            expect(readLog(root).length, label).toBe(lines);
                            continue;
                        }

                        const changed = formatCounter(expected) !== formatCounter(model[operation.field]);
                        const logged = readLog(root).slice(lines).filter((entry) => entry.type === "counter-changed");

                        if (operation.command === "change") {
                            expect(logged.length, label).toBe(changed ? 1 : 0);

                            if (changed) {
                                expect(logged[0], label).toMatchObject({ visibility, data: { page: name, field: operation.field, before: formatCounter(model[operation.field]), after: formatCounter(expected) } });
                            }
                        }

                        model[operation.field] = expected;
                        expect(fieldsOf(file), label).toEqual(Object.fromEntries(Object.entries(model).map(([field, counter]) => [field, formatCounter(counter)])));
                    }
                } finally {
                    removeFolder(root);
                }
            }),
            { numRuns: 60 },
        );
        expect([...outcomes].sort()).toEqual(["change hidden", "change public", "change refused", "change same", "write hidden", "write public", "write refused", "write same"]);
    }, 120000);
});

/** A campaign in the test system based on Ironsworn with one page that holds the counters: whose it is decides whom its changes concern (D-93). */
function counterCampaign(root: string, holder: string, start: Record<string, string>): { file: string; name: string; }
{
    writeFileSync(join(root, "campaign.yaml"), "name: Prova\nsystem: ironsworn\nlanguage: it\n");
    writeFileSync(join(root, "state.yaml"), "mode: play\n");
    const counted = Object.entries(start).map(([field, value]) => `${field}: ${value}`);
    const [type, name, fields] = holder.includes("quest")
        ? ["quest", "Voto", [`status: ${holder.split(" ")[0]}`]]
        : holder === "carried" || holder === "item"
        ? ["item", "Torcia", []]
        : ["character", "Bran", [`role: ${holder}`]];
    page(root, type, name, [...fields, ...counted]);
    page(root, "character", "Kira", ["role: pc", ...(holder === "carried" ? ['inventory: ["[[Torcia]]"]'] : [])]);
    return { file: join(root, "world", `${type}s`, `${name}.md`), name };
}

function page(root: string, type: string, name: string, lines: string[]): void
{
    mkdirSync(join(root, "world", `${type}s`), { recursive: true });
    writeFileSync(join(root, "world", `${type}s`, `${name}.md`), `---\n${lines.join("\n")}\n---\n`);
}

function commandOf(name: string, operation: Operation): string[]
{
    if (operation.command === "write") {
        return ["write", name, "--set", `${operation.field}=${operation.value}`];
    }

    const [parameter, value] = "by" in operation ? ["by", operation.by] : "spend" in operation ? ["spend", operation.spend] : ["to", operation.to];
    return ["change", name, operation.field, `--${parameter}=${value}`];
}

/**
 * What a change or a write leaves in the field, or "refused" (CNT-3–CNT-7): momentum's maximum is the system's, 10, and its minimum -6 (FOR-6, FOR-7);
 * a current/max counter changes only with change (D-92).
 */
function applyByModel(model: Record<string, Counter>, operation: Operation): Counter | "refused"
{
    const counter = model[operation.field];
    const worked = operation.field === "momentum" ? { min: -6, max: 10 } : {};
    const given = "to" in operation ? operation.to : operation.command === "write" ? operation.value : undefined;
    const target = given === undefined || given === "max" ? undefined : readCounterText(given);

    if (operation.command === "write") {
        const same = target !== undefined && formatCounter(target) === formatCounter(counter);
        return counter.max !== undefined && !same ? "refused" : target ?? "refused";
    }

    if ("by" in operation) {
        return { ...counter, value: byModel({ ...counter, ...worked }, operation.by).value };
    }

    if ("spend" in operation) {
        return operation.spend > 0 && operation.spend <= counter.value ? { ...counter, value: counter.value - operation.spend } : "refused";
    }

    if (given === "max") {
        return counter.max === undefined ? "refused" : { ...counter, value: counter.max };
    }

    // A maximum the system works out is given only as it is, and the value goes no higher (FOR-6, FOR-7).
    if (target === undefined || (worked.max !== undefined && ((target.max !== undefined && target.max !== worked.max) || target.value > worked.max))) {
        return "refused";
    }

    return target.max === undefined ? { ...counter, value: target.value } : target;
}

/** A change by an amount moved one unit at a time: a unit goes when the value it leads to is no further outside the limits than the one before (CNT-3). */
function byModel(counter: Counter, by: number): { value: number; beyond: number; }
{
    let value = counter.value;
    let beyond = 0;

    for (let step = 0; step < Math.abs(by); step++) {
        const next = value + Math.sign(by);

        if (distance({ ...counter, value: next }) <= distance({ ...counter, value })) {
            value = next;
        } else {
            beyond += Math.sign(by);
        }
    }

    return { value, beyond };
}

/** How far a value is outside its limits: from the minimum, 0 unless given, to the maximum, if any. */
function distance(counter: Counter): number
{
    const lowest = counter.min ?? 0;
    return counter.value < lowest ? lowest - counter.value : counter.max !== undefined && counter.value > counter.max ? counter.value - counter.max : 0;
}

/** current/max text read the model's way: two parts around one slash, a whole number and a number from 0 up, spaces around them allowed. */
function currentAndMaxByModel(text: string): Counter | undefined
{
    const parts = text.split("/").map((part) => part.trim());
    const whole = (part: string, signed: boolean): boolean => part !== "" && [...part].every((character, index) => (signed && index === 0 && character === "-" && part.length > 1) || "0123456789".includes(character));
    return parts.length === 2 && whole(parts[0], true) && whole(parts[1], false) ? { value: Number(parts[0]) || 0, max: Number(parts[1]) } : undefined;
}

/** The first container that lists a page and can hold it, then its own, stopping before a page already seen (CON-3). */
function chainByModel(world: World, name: string): string[]
{
    const holderOf = (held: string): string | undefined =>
        world.pages.find((holder) => {
            const field = containerField[holder.type ?? ""];
            const listed = field === undefined || !Array.isArray(holder.fields[field]) ? [] : (holder.fields[field] as string[]);
            return holder.name !== held && listed.includes(`[[${held}]]`) && (holdable[holder.type ?? ""] ?? []).includes(pageTypes[held]);
        })?.name;
    const chain: string[] = [];

    for (let holder = holderOf(name); holder !== undefined && holder !== name && !chain.includes(holder); holder = holderOf(holder)) {
        chain.push(holder);
    }

    return chain;
}

function readLog(root: string): LogEntry[]
{
    try {
        return readFileSync(join(root, "log.jsonl"), "utf8").trim().split("\n").filter((line) => line !== "").map((line) => JSON.parse(line) as LogEntry);
    } catch {
        return [];
    }
}

/** The counters a page holds, as its file writes them. */
function fieldsOf(file: string): Record<string, unknown>
{
    const lines = readFileSync(file, "utf8").split("\n").filter((line) => fieldNames.some((field) => line.startsWith(`${field}:`)));
    return Object.fromEntries(lines.map((line) => line.split(": ")).map(([field, value]) => [field, /^-?\d+$/.test(value) ? Number(value) : value]));
}
