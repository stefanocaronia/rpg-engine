// The rows of their tables that the vocations of a character give, and its features (D-201, D-219, PRO-1–PRO-4): the module on tables. The same through the
// commands is in fake-progression.test.ts, and on the 5e's classes in the 5e's repository.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fieldName, gainedFeatures, levelledFeatures, levelTable, mergedFeatures, rowFields } from "../src/progression/index.ts";

const classPage = [
    "**The Bard**",
    "",
    "| d6 | Mood |",
    "|---|---|",
    "| 1 | Sad |",
    "",
    "| Level | Proficiency Bonus | Features | Inspirations | Song \\| Die |",
    "|---|---|---|---|---|",
    "| 1st | +2 | Inspiration (d6), Path feature | 1 | — |",
    "| 2nd | +2 | Jack of All Trade | 2 | d6 |",
    "| 3rd | +2 | Inspiration (d8), Wild improvement | — | d8 |",
    "",
    "## Features",
    "### Inspiration",
    "### Jack of All Trades",
].join("\n");

describe("the table of levels (PRO-1–PRO-3)", () => {
    const table = levelTable(classPage, "Features");
    const titles = ["Inspiration", "Jack of All Trades"];
    const title = (name: string): string | undefined => titles.find((candidate) => [name.toLowerCase(), `${name.toLowerCase()}s`].includes(candidate.toLowerCase()));

    it("reads the first table with the features column whose first column counts levels, past a table of a die; a bar written \\| stays in its cell", () => {
        expect(table?.columns).toEqual(["Level", "Proficiency Bonus", "Features", "Inspirations", "Song | Die"]);
        expect([...(table?.rows.keys() ?? [])]).toEqual([1, 2, 3]);
        expect(levelTable("| Level | Features |\n|---|---|\n| 1 | Rage |\n| 2 | — |", "features")?.rows.get(2)).toEqual(["2", "—"]);
        expect(levelTable("| Name | Features |\n|---|---|\n| Rope | Knots |", "Features")).toBeUndefined();
        expect(levelTable("| Level | Cost |\n|---|---|\n| 1 | 5 |", "Features")).toBeUndefined();
    });

    it("gives the columns of a row as fields, but the first and those skipped; an empty cell or a dash gives nothing", () => {
        expect(rowFields(table!, 2, ["Proficiency Bonus", "Features"])).toEqual([["inspirations", "2"], ["song-die", "d6"]]);
        expect(rowFields(table!, 1, ["proficiency bonus", "features"])).toEqual([["inspirations", "1"]]);
        expect(rowFields(table!, 4, [])).toEqual([]);
        expect(fieldName("Rage Damage")).toBe("rage-damage");
        expect(fieldName(" Max. CR ")).toBe("max-cr");
    });

    it("gives the features up to a level, only those that are titles of the page, as the page titles them", () => {
        expect(gainedFeatures(table!, "Features", 3, title)).toEqual([
            { level: 1, name: "Inspiration (d6)" },
            { level: 2, name: "Jack of All Trades" },
            { level: 3, name: "Inspiration (d8)" },
        ]);
        expect(gainedFeatures(table!, "Features", 1, title)).toEqual([{ level: 1, name: "Inspiration (d6)" }]);
        expect(gainedFeatures(table!, "Talents", 3, title)).toEqual([]);
    });

    it("keeps each feature once: a later value in parentheses takes the place of the earlier, a later name without one does not", () => {
        const merged = mergedFeatures([
            { level: 1, name: "Inspiration (d6)" },
            { level: 2, name: "Jack of All Trades" },
            { level: 3, name: "Inspiration (d8)" },
            { level: 3, name: "inspiration" },
        ]);
        expect(merged.map((feature) => feature.name)).toEqual(["Inspiration (d8)", "Jack of All Trades"]);
    });

    it("reads the features a part lists with their levels, and marks those without one", () => {
        expect(levelledFeatures(["Improved Critical 3", "Channel Divinity: Preserve Life 2", "Survivor"])).toEqual([
            { level: 3, name: "Improved Critical" },
            { level: 2, name: "Channel Divinity: Preserve Life" },
            undefined,
        ]);
    });
});
