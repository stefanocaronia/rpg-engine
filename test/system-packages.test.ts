// The checks every installed game system passes (SYS-2, SYS-5, SYS-8, D-172, D-267): pages that read like a campaign's, each name once, no bases, every field declared, the pictures they link, and where it comes from.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRollFormula } from "../src/core/formula.ts";
import { FileStore, withFiles } from "../src/core/store.ts";
import { comparableText } from "../src/core/text.ts";
import { findImage, imageFileName, imagesFolderName } from "../src/images/index.ts";
import { coinsProblem, readCoins } from "../src/money/index.ts";
import { checkWorld, isStandardField, listFieldNames, loadWorld } from "../src/pages/index.ts";
import { isTitled, readRuleBook } from "../src/rules/index.ts";
import { installedSystems } from "../src/systems/index.ts";
import { testSystemFolders } from "./support.ts";

describe("the installed game systems", () => {
    it("are the 5e system of the package and the ironsworn system of the tests", () => {
        expect(installedSystems(testSystemFolders).map((system) => system.name)).toEqual(["5e", "ironsworn"]);
    });

    for (const system of installedSystems(testSystemFolders)) {
        describe(`the system ${system.name}`, () => {
            // Read as a campaign would be: the checks of validate apply to its pages too.
            const world = loadWorld(system.folder);

            it("reads like a campaign: every page reads, and validate finds no problem in it", () => {
                expect(world.pages.length).toBeGreaterThan(0);
                expect(world.problems).toEqual([]);
                expect(checkWorld(world)).toEqual([]);
            });

            it("names each page once among all its types, with a straight apostrophe (SYS-2, SYS-5)", () => {
                const names = world.pages.map((page) => comparableText(page.name));
                expect(new Set(names).size).toBe(names.length);
                expect(world.pages.filter((page) => /[‘’]/.test(page.name)).map((page) => page.name)).toEqual([]);
            });

            it("writes in quotes a value that YAML would read as a number, such as the +2 of a shield", () => {
                const signed = world.pages.filter((page) => /^[\w-]+: [+-]\d/m.test(readFileSync(join(system.folder, page.path), "utf8"))).map((page) => page.name);
                expect(signed).toEqual([]);
            });

            it("derives a page only from another of its own that exists, as a subrace from its race (SYS-2, D-201)", () => {
                const derived = world.pages.filter((page) => page.fields.creature !== undefined || page.fields.item !== undefined);
                const named = (link: unknown): string => String(link).replace(/^\[\[|\]\]$/g, "");
                expect(derived.filter((page) => !world.pages.some((other) => other.name === named(page.fields.creature ?? page.fields.item))).map((page) => page.name)).toEqual([]);
            });

            it("gives data the engine can read: coins, declared fields, and rules that its chapters hold (DAT-1–DAT-7)", () => {
                const book = readRuleBook(join(system.folder, "rules"), system.name);
                const hasRule = (title: string): boolean => book.some((section) => isTitled(section, title));
                const declared = (field: string): boolean => Object.keys(system.fields).some((name) => (field.endsWith("*") ? name.startsWith(field.slice(0, -1)) : comparableText(name) === comparableText(field)));

                if (system.coins !== undefined) {
                    expect(coinsProblem(typeof system.coins === "string" ? readCoins(system.coins) : system.coins)).toBeUndefined();
                }

                // The sheet may show a fixed field of the core, such as creature, the race (D-201), what the character has equipped (CON-12), or the purse a trade pays from, money (STK-8).
                const onSheet = system.sheet.flatMap((group) => group.entries.flatMap((entry) => (entry.beside === undefined ? [entry.field] : [entry.field, entry.beside]))).filter((field) =>
                    !isStandardField("character", field) && field !== "money"
                );
                expect([...onSheet, ...Object.keys(system.sheetDice), ...system.statusLine.map((entry) => entry.field), ...Object.keys(system.values)].filter((field) => !declared(field))).toEqual([]);
                expect(system.thresholds.filter((threshold) => system.fields[threshold.field] !== "counter" || !hasRule(threshold.rule))).toEqual([]);
                expect(system.recipes.flatMap((recipe) => [...Object.keys(recipe.set).filter((field) => !declared(field)), ...recipe.rules.filter((rule) => !hasRule(rule))])).toEqual([]);
                expect(system.conditions.filter((condition) => !hasRule(condition))).toEqual([]);
                expect(system.roundSeconds === undefined || system.roundSeconds > 0).toBe(true);
                // What every character with a sheet has in a list (D-235): a list of the system or of the core, and pages the system has.
                const lists = Object.keys(system.alwaysIn).filter((list) => system.fields[list] !== "list" && !(isStandardField("character", list) && listFieldNames.includes(list)));
                expect(lists).toEqual([]);
                expect(Object.values(system.alwaysIn).flat().filter((name) => !world.pages.some((page) => comparableText(page.name) === comparableText(name)))).toEqual([]);
            });

            it("writes its rules in chapters that open with a heading, each section read by its path (RUL-1, RUL-3)", () => {
                const book = readRuleBook(join(system.folder, "rules"), system.name);
                expect(book.length).toBeGreaterThan(0);
                expect(book.filter((section) => section.level === 0).map((section) => section.file)).toEqual([]);
                // A title with ›, > or / in it could not be read by its path.
                const unread = book.filter((section) => !isTitled(section, section.path.join(" › ")));
                expect(unread.map((section) => section.path.join(" › "))).toEqual([]);
            });

            it("gives every declared field a value of its kind, without a final period (SYS-8)", () => {
                const fits: Record<string, (value: unknown) => boolean> = {
                    number: (value) => typeof value === "number",
                    "at-least": (value) => typeof value === "number",
                    modifier: (value) => typeof value === "number",
                    bonus: (value) => typeof value === "number",
                    // Text, or true and false, which write reads as such: a spell's ritual.
                    text: (value) => typeof value === "string" || typeof value === "boolean",
                    list: (value) => Array.isArray(value),
                    counter: (value) => typeof value === "number" || (typeof value === "string" && /^\d+\/\d+$/.test(value)),
                };
                const kinds = new Map(Object.entries(system.fields).map(([field, kind]) => [comparableText(field), kind]));
                // A field whose value the classes' pages give as a formula holds that formula there (PRO-5).
                const formulas = new Set(Object.values(system.itemFormulas).flat().map(comparableText));
                const wrong = world.pages.flatMap((page) =>
                    Object.entries(page.fields).filter(([field, value]) => {
                        if (formulas.has(comparableText(field))) {
                            return typeof value !== "string" || !reads(value);
                        }

                        const kind = kinds.get(comparableText(field));
                        return kind !== undefined && (!fits[kind](value) || (typeof value === "string" && value.endsWith(".")));
                    }).map(([field, value]) => `${page.name}: ${field} ${JSON.stringify(value)}`)
                );
                expect(wrong).toEqual([]);
            });

            it("declares the kind of every field its pages hold (SYS-8)", () => {
                const declared = new Set(Object.keys(system.fields).map(comparableText));
                const undeclared = world.pages.flatMap((page) => Object.keys(page.fields).filter((field) => !isStandardField(page.type, field) && !declared.has(comparableText(field))).map((field) => `${page.name}: ${field}`));
                expect(undeclared).toEqual([]);
            });

            it("has in its images folder every picture its pages link, and only those (D-267)", () => {
                const linked = new Set(world.pages.map((page) => imageFileName(page.fields.image)).filter((name) => name !== undefined));
                const missing = [...linked].filter((name) => withFiles(new FileStore(), () => findImage([system.folder], name)) === undefined);
                expect(missing).toEqual([]);
                const folder = join(system.folder, imagesFolderName);
                const files = existsSync(folder) ? readdirSync(folder, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name) : [];
                expect(files.filter((name) => !linked.has(name))).toEqual([]);
            });

            it("says where it comes from", () => {
                expect(system.attribution).toBeDefined();
            });
        });
    }
});

/** Whether a text reads as a formula, which may begin with dice and end with words, as a weapon's damage (PRO-5). */
function reads(text: string): boolean
{
    try {
        parseRollFormula(text);
        return true;
    } catch {
        return false;
    }
}
