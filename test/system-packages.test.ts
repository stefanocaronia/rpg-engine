// The checks every installed game system passes (SYS-2, SYS-5, SYS-8, D-172): pages that read like a campaign's, each name once, no bases, every field declared, and where it comes from.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { comparableText } from "../src/core/text.ts";
import { checkWorld, isStandardField, loadWorld } from "../src/pages/index.ts";
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

            it("derives no page from another (SYS-2)", () => {
                expect(world.pages.filter((page) => page.fields.creature !== undefined || page.fields.item !== undefined).map((page) => page.name)).toEqual([]);
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
                    text: (value) => typeof value === "string",
                    list: (value) => Array.isArray(value),
                    counter: (value) => typeof value === "number" || (typeof value === "string" && /^\d+\/\d+$/.test(value)),
                };
                const kinds = new Map(Object.entries(system.fields).map(([field, kind]) => [comparableText(field), kind]));
                const wrong = world.pages.flatMap((page) =>
                    Object.entries(page.fields).filter(([field, value]) => {
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

            it("says where it comes from", () => {
                expect(system.attribution).toBeDefined();
            });
        });
    }
});
