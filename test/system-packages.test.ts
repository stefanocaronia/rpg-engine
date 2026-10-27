// The checks every installed game system passes (SYS-2, SYS-5, SYS-8, D-172, D-267), through the test kit's systemChecks, which a system's own repository
// runs on itself: pages that read like a campaign's, each name once, no bases, every field declared, the pictures they link, and where it comes from. Here
// on free and the fake; the 5e and Ironsworn run them in their repositories.
import { describe, expect, it } from "vitest";
import { installedSystems } from "../src/systems/index.ts";
import { systemChecks } from "../src/testing.ts";
import { madeSystem, testSystemFolders } from "./support.ts";

describe("the installed game systems", () => {
    it("are free, the one of the package, and the fake system of the tests", () => {
        expect(installedSystems(testSystemFolders).map((system) => system.name)).toEqual(["free", "fake"]);
    });

    for (const system of installedSystems(testSystemFolders)) {
        describe(`the system ${system.name}`, () => {
            const checks = systemChecks(system.folder);
            // Free play is ours, a sheet of words and nothing else: no pages, no rules, no source to credit (D-489 (7)).
            const sourced = system.name !== "free";

            it("reads like a campaign: every page reads, and validate finds no problem in it", () => {
                expect(checks.pages > 0).toBe(sourced);
                expect(checks.unread).toEqual([]);
            });

            it("names each page once among all its types, with a straight apostrophe (SYS-2, SYS-5)", () => {
                expect(checks.names).toEqual([]);
            });

            it("writes in quotes a value that YAML would read as a number, such as the +2 of a shield", () => {
                expect(checks.unquoted).toEqual([]);
            });

            it("derives a page only from another of its own that exists, as a subrace from its race (SYS-2, D-201)", () => {
                expect(checks.bases).toEqual([]);
            });

            it("gives data the engine can read: coins, declared fields, and rules that its chapters hold (DAT-1–DAT-7)", () => {
                expect(checks.declarations).toEqual([]);
            });

            it("writes its rules in chapters that open with a heading, each section read by its path (RUL-1, RUL-3)", () => {
                expect(checks.chapters > 0).toBe(sourced);
                expect(checks.rules).toEqual([]);
            });

            it("gives every declared field a value of its kind, without a final period (SYS-8)", () => {
                expect(checks.values).toEqual([]);
            });

            it("declares the kind of every field its pages hold (SYS-8)", () => {
                expect(checks.undeclared).toEqual([]);
            });

            it("has in its images folder every picture its pages link, and only those (D-267)", () => {
                expect(checks.pictures).toEqual([]);
            });

            it("says where it comes from", () => {
                expect(checks.attribution !== undefined).toBe(sourced);
            });
        });
    }

    it("find what a system gets wrong, by check, in one made wrong on purpose, named by its package", () => {
        const systems = madeSystem("wrong", {
            "package.json": JSON.stringify({ name: "@test/system-crooked", version: "1.0.0" }),
            "system.yaml": "title: a system made wrong\nlanguage: en\nfields:\n  strength: number\n  shield: text\n  pain: counter\nthresholds:\n  pain 0: Fainting\nconditions: [Dizzy]\n"
                + "sheet:\n  Body: [strength, nerve]\n",
            "rules/Loose.md": "Text before any heading.\n\n# Body\n\n## Pain / Hurt\n\nIt hurts.\n",
            "world/creatures/Wolf.md": '---\nstrength: twelve\nhowl: loud\nimage: "[[wolf.svg]]"\n---\n',
            "world/creatures/wolf’s Kin.md": '---\ncreature: "[[Bear]]"\nshield: +2\n---\n',
            "world/items/WOLF.md": "",
            "images/stray.svg": "<svg/>",
        });
        const checks = systemChecks(`${systems}/wrong`);
        expect(checks.name).toBe("crooked");
        expect(checks.names).toEqual(["WOLF: twice", "wolf’s Kin: a curly apostrophe"]);
        expect(checks.unquoted).toEqual(["wolf’s Kin"]);
        expect(checks.bases).toEqual(["wolf’s Kin"]);
        expect(checks.declarations).toEqual(["nerve: named, not declared in fields", "threshold pain: no counter, or no rule Fainting", "condition Dizzy: no rule of that title"]);
        expect(checks.rules).toEqual(["Loose: no chapter heading", "Loose › Body › Pain / Hurt"]);
        expect(checks.values).toEqual(['Wolf: strength "twelve"', "wolf’s Kin: shield 2"]);
        expect(checks.undeclared).toEqual(["Wolf: howl"]);
        expect(checks.pictures).toEqual(["wolf.svg: linked, not in images/", "stray.svg: in images/, linked by no page"]);
        expect(checks.attribution).toBeUndefined();
    });
});
