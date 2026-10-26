// The laws of stacks (MECCANICHE, STK-3, STK-6–STK-9), on lists and worlds made at random, against a model: one stack of a kind in a list, pieces and money kept
// by move and trade, nothing written by a refusal.
import fc from "fast-check";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { entryOfKind, readEntry, withStackCount } from "../src/pages/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

const kinds = ["Rushlight", "Hardtack", "Tallow"];
// An entry as a list may hold it: a stack, a kind alone, written with a label or another case, a page, or text.
const entries = fc.oneof(
    fc.tuple(fc.constantFrom(...kinds), fc.integer({ min: 1, max: 30 })).map(([kind, count]) => `[[${kind}]] ${count}`),
    fc.constantFrom(...kinds).map((kind) => `[[${kind.toLowerCase()}|${kind.slice(0, 3)}]] 2`),
    fc.constantFrom(...kinds).map((kind) => `[[${kind}]]`),
    fc.constantFrom("[[Zaino]]", "corda di canapa", "[[Mazza]]"),
);

describe("the laws of a list's stacks", () => {
    it("STK-3: setting a kind's stack leaves one entry of it with that count, or none at 0, and every other entry as it was, in order", () => {
        fc.assert(
            fc.property(fc.array(entries, { maxLength: 8 }), fc.constantFrom(...kinds), fc.integer({ min: 0, max: 40 }), (list, kind, count) => {
                const after = withStackCount(list, kind, count);
                const ofKind = after.filter((entry) => entryOfKind(entry, kind));
                expect(ofKind.length).toBe(count === 0 ? 0 : 1);

                if (count > 0) {
                    const read = readEntry(String(ofKind[0]));
                    expect(read.shape === "stack" ? read.count : undefined).toBe(count);
                }

                expect(after.filter((entry) => !entryOfKind(entry, kind))).toEqual(list.filter((entry) => !entryOfKind(entry, kind)));
            }),
            { numRuns: 1000 },
        );
    });
});

// Who holds what at the start: two of the party, a merchant with a purse, a shop without one, and a pack in a character's inventory.
const holders = ["Ettore", "Lena", "Ugo", "Bottega", "Zaino"];
const sides = ["Ettore", "Lena", "Ugo", "Bottega"];
// The labels a stack written by hand may have, as an Italian table writes them.
const labels: Record<string, string> = { Rushlight: "giunchi", Hardtack: "gallette", Tallow: "sego" };
// What a side of a trade names: a kind by its name or by a label, with how many.
const goods = fc.tuple(fc.constantFrom(...kinds), fc.integer({ min: 1, max: 4 }), fc.integer({ min: 0, max: 4 })).map(([kind, count, way]) => `${way === 0 ? labels[kind] : kind} ${count}`);
const commands = fc.oneof(
    fc.record({ verb: fc.constant("move"), kind: fc.constantFrom(...kinds), from: fc.constantFrom(...holders), to: fc.constantFrom(...holders), count: fc.integer({ min: 1, max: 12 }) }),
    fc.record({
        verb: fc.constant("trade"),
        from: fc.constantFrom(...sides),
        to: fc.constantFrom(...sides),
        gives: fc.array(goods, { minLength: 1, maxLength: 3 }),
        gets: fc.array(goods, { maxLength: 1 }),
        price: fc.constantFrom("", "", "3 penny", "1 shilling", "2 shilling 5 penny", "1 crown"),
        // Who pays: page, with gives, or with, with gets.
        paidBy: fc.constantFrom("page", "with"),
    }),
);
// A stack a table wrote by hand beside one of the same kind, with its label.
const doubles = fc.array(fc.tuple(fc.constantFrom(...holders), fc.constantFrom(...kinds), fc.integer({ min: 1, max: 5 })), { maxLength: 2 });

describe("the laws of move and trade, on campaigns played at random", () => {
    it("STK-3, STK-6–STK-9: they keep the pieces of every kind and the money the sides count, leave one stack of a kind where they write, and a refusal writes nothing", async () => {
        // How many of each command went through: the laws say nothing if every one is refused.
        const done = { move: 0, trade: 0 };
        await fc.assert(
            fc.asyncProperty(
                // How many of each kind each holder starts with, 0 for none.
                fc.array(fc.array(fc.integer({ min: 0, max: 12 }), { minLength: kinds.length, maxLength: kinds.length }), { minLength: holders.length, maxLength: holders.length }),
                doubles,
                fc.array(commands, { minLength: 1, maxLength: 4 }),
                async (stacks, twice, steps) => {
                    const folder = makeTempFolder();
                    const run = (...args: string[]) => runCommandLine(args, testContext(folder));

                    try {
                        await setUp(run, folder, stacks, twice);

                        for (const step of steps) {
                            const before = snapshot(folder);
                            const args = step.verb === "move" ? ["move", step.kind, "--from", step.from, "--to", step.to, "--count", String(step.count)] : tradeArgs(step);
                            const result = await run(...args);
                            const said = `${args.join(" ")}: ${result.output}`;

                            if (result.exitCode !== 0) {
                                expect(snapshot(folder), said).toEqual(before);
                                continue;
                            }

                            const after = snapshot(folder);
                            done[step.verb === "move" ? "move" : "trade"] += 1;

                            for (const kind of kinds) {
                                expect(piecesIn(after, kind), `${said}: ${kind}`).toBe(piecesIn(before, kind));
                            }

                            // A container whose list a command wrote lists each kind once.
                            for (const [path, text] of Object.entries(after).filter(([path, text]) => path.startsWith("world/") && entriesIn(before[path] ?? "") !== entriesIn(text))) {
                                for (const kind of kinds) {
                                    expect(entriesOfKind(text, kind), `${said}: ${path}, ${kind}`).toBeLessThanOrEqual(1);
                                }
                            }

                            // Money moves only between purses that count it: with both sides counting, its value stays; with the shop, it changes by the price.
                            const counted = ["Ettore", "Lena", "Ugo"];
                            expect(valueIn(after, counted) - valueIn(before, counted), said).toBe(step.verb === "trade" ? shopShare(step) : 0);
                        }
                    } finally {
                        removeFolder(folder);
                    }
                },
            ),
            { numRuns: 25 },
        );
        expect(done.move).toBeGreaterThan(0);
        expect(done.trade).toBeGreaterThan(0);
    }, 180_000);
});

/** A trade's call: what page gives and gets, and the price on the side of who pays. */
function tradeArgs(step: { from: string; to: string; gives: string[]; gets: string[]; price: string; paidBy: string; }): string[]
{
    const price = step.price === "" ? [] : [step.paidBy === "page" ? "--gives" : "--gets", step.price];
    return ["trade", step.from, "--with", step.to, ...step.gives.flatMap((entry) => ["--gives", entry]), ...step.gets.flatMap((entry) => ["--gets", entry]), ...price];
}

/** What the money counted gains in a trade with the shop, which keeps no purse: the price when the shop pays it, less the price when it gets it. */
function shopShare(step: { from: string; to: string; price: string; paidBy: string; }): number
{
    const payer = step.paidBy === "page" ? step.from : step.to;
    const payee = step.paidBy === "page" ? step.to : step.from;
    const price = valueIn({ "world/characters/Price.md": `money: ${step.price}` }, ["Price"]);
    return payer === "Bottega" ? price : payee === "Bottega" ? 0 - price : 0;
}

/** A campaign in play with the holders, their purses, the stacks given, written one by one as write allows them, and doubles written by hand with a label. */
async function setUp(run: (...args: string[]) => Promise<{ exitCode: number; output: string; }>, folder: string, stacks: number[][], twice: [string, string, number][]): Promise<void>
{
    await run("init", "--name", "Mercato", "--language", "it", "--system", "fake");
    inPlay(folder);
    await run("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "money=3 crown 4 shilling 7 penny");
    await run("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "money=9 shilling 9 penny");
    await run("write", "Ugo", "--type", "character", "--set", "role=npc", "--set", "money=2 crown 5 shilling 5 penny");
    await run("write", "Bottega", "--type", "place", "--add", "contains=[[Ugo]]");
    await run("write", "Zaino", "--type", "item");
    await run("move", "Zaino", "--to", "Ettore");

    for (const [index, holder] of holders.entries()) {
        for (const [at, kind] of kinds.entries()) {
            if (stacks[index][at] > 0) {
                await run("write", holder, "--add", `${fieldOf(holder)}=[[${kind}]] ${stacks[index][at]}`);
            }
        }
    }

    for (const [holder, kind, count] of twice) {
        const path = join(folder, "world", holder === "Bottega" ? "places" : holder === "Zaino" ? "items" : "characters", `${holder}.md`);
        const text = readFileSync(path, "utf8");
        const entry = `  - "[[${kind}|${labels[kind]}]] ${count}"\n`;
        const field = `${fieldOf(holder)}:\n`;
        writeFileSync(path, text.includes(field) ? text.replace(field, `${field}${entry}`) : text.replace(/\n---\n?$/, `\n${field}${entry}---\n`));
    }
}

function fieldOf(holder: string): string
{
    return holder === "Bottega" || holder === "Zaino" ? "contains" : "inventory";
}

/** Every file of the campaign that a command may write, as text, by its path: the pages, the log and the state. */
function snapshot(folder: string): Record<string, string>
{
    const files: Record<string, string> = {};

    for (const type of ["characters", "places", "items"]) {
        for (const name of readdirSync(join(folder, "world", type))) {
            files[`world/${type}/${name}`] = readFileSync(join(folder, "world", type, name), "utf8");
        }
    }

    for (const name of ["log.jsonl", "state.yaml"].filter((candidate) => existsSync(join(folder, candidate)))) {
        files[name] = readFileSync(join(folder, name), "utf8");
    }

    return files;
}

/** The pieces of a kind in every container of the campaign, as the pages say. */
function piecesIn(files: Record<string, string>, kind: string): number
{
    const pattern = new RegExp(String.raw`\[\[${kind}(?:\|[^\]]*)?\]\](?: (\d+))?`, "g");
    return Object.entries(files).filter(([path]) => path.startsWith("world/")).flatMap(([, text]) => [...text.matchAll(pattern)]).reduce((sum, match) => sum + Number(match[1] ?? 1), 0);
}

/** The entries of a page's lists, as written. */
function entriesIn(text: string): string
{
    return text.split("\n").filter((line) => /^\s*- "?\[\[/.test(line)).join("\n");
}

/** How many entries of a page name a kind. */
function entriesOfKind(text: string, kind: string): number
{
    return [...text.matchAll(new RegExp(String.raw`\[\[${kind}(?:\|[^\]]*)?\]\]`, "g"))].length;
}

/** What the purses of some characters are worth, in copper, as the pages say. */
function valueIn(files: Record<string, string>, names: string[]): number
{
    const worth: Record<string, number> = { crown: 240, mark: 160, shilling: 12, penny: 1 };
    return names.reduce((total, name) => {
        const money = /^money: (.*)$/m.exec(files[`world/characters/${name}.md`] ?? "")?.[1] ?? "";
        return total + [...money.matchAll(/(\d+) (crown|mark|shilling|penny)/g)].reduce((sum, [, count, coin]) => sum + Number(count) * worth[coin], 0);
    }, 0);
}
