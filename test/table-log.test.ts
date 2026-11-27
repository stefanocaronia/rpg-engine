// The log of a campaign's table, the file beside its place: each line with its time, short by taking the place of the one before it, and never in a table's way.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { tableLog, tableLogFile, tableLogWritten, tablePlaces } from "../src/server/table/index.ts";
import { makeTempFolder } from "./support.ts";

let home: string;
let root: string;

beforeEach(() => {
    home = makeTempFolder();
    root = makeTempFolder();
});

/** The lines of a file, without the empty one after the last. */
function linesOf(file: string): string[]
{
    return readFileSync(file, "utf8").split("\n").slice(0, -1);
}

describe("the log of a campaign's table", () => {
    it("is a file of the tables' folder of the data folder given, one for a campaign however its folder is written, and no place of a table", () => {
        const file = tableLogFile(home, root);
        expect(dirname(file)).toBe(join(home, "tables"));
        expect(file).toMatch(/[0-9a-f]{16}\.log$/);
        expect(tableLogFile(home, join(root, "."))).toBe(file);
        expect(tableLogFile(home, makeTempFolder())).not.toBe(file);
        // Written only once a table said something.
        expect(tableLogWritten(home, root)).toBeUndefined();
        tableLog(home, root)("A line.");
        expect(tableLogWritten(home, root)).toBe(file);
        expect(tablePlaces(home)).toEqual([]);
    });

    it("keeps each line with the time of the clock given, in order, and a line that starts with its own time as it is", () => {
        let time = Date.UTC(2026, 10, 27, 9, 30, 0);
        const log = tableLog(home, root, () => time);
        log("A chat sat at the table.");
        time += 1500;
        log("2026-11-27T09:30:01.000Z Claude Code started for its models (process 42).");
        log("The chat left the table.");

        expect(linesOf(tableLogFile(home, root))).toEqual([
            "2026-11-27T09:30:00.000Z A chat sat at the table.",
            "2026-11-27T09:30:01.000Z Claude Code started for its models (process 42).",
            "2026-11-27T09:30:01.500Z The chat left the table.",
        ]);
    });

    it("goes on in the file of the table before it, as each table of the campaign does", () => {
        tableLog(home, root, () => 0)("The first table.");
        tableLog(home, root, () => 1000)("The second table.");
        expect(linesOf(tableLogFile(home, root))).toEqual(["1970-01-01T00:00:00.000Z The first table.", "1970-01-01T00:00:01.000Z The second table."]);
    });

    it("once full takes the place of the file before it, which is thrown away: two files at most, neither much longer than full", () => {
        const file = tableLogFile(home, root);
        const before = file.replace(/\.log$/, ".old.log");
        const log = tableLog(home, root, () => 0, 200);
        const line = (number: number): string => `Line ${String(number).padStart(3, "0")} of the table, as long as a line of it is.`;

        for (let number = 1; number <= 40; number++) {
            log(line(number));
        }

        const kept = [...linesOf(before), ...linesOf(file)].map((one) => one.replace("1970-01-01T00:00:00.000Z ", ""));
        // The last lines, in order, with none missing between the two files; the first ones are gone.
        expect(kept.at(-1)).toBe(line(40));
        expect(kept).toEqual(Array.from({ length: kept.length }, (unused, index) => line(40 - kept.length + 1 + index)));
        expect(kept.length).toBeLessThan(40);
        expect(statSync(file).size).toBeLessThan(300);
        expect(statSync(before).size).toBeLessThan(300);
        expect(readdirSync(dirname(file)).sort()).toEqual([before, file].map((one) => one.slice(dirname(file).length + 1)).sort());
    });

    it("cuts a line far longer than an error with its stack", () => {
        tableLog(home, root, () => 0)("x".repeat(50_000));
        expect(linesOf(tableLogFile(home, root))).toEqual([expect.stringMatching(/^1970-01-01T00:00:00\.000Z x+$/)]);
        expect(statSync(tableLogFile(home, root)).size).toBe(4001);
    });

    it("never throws where it cannot be written, as where the data folder is a file: the table goes on without it", () => {
        const file = join(makeTempFolder(), "home");
        writeFileSync(file, "no folder");
        const log = tableLog(file, root);
        expect(() => log("A line nobody keeps.")).not.toThrow();
        expect(readFileSync(file, "utf8")).toBe("no folder");
        expect(existsSync(tableLogFile(file, root))).toBe(false);
    });

    it.skipIf(process.platform === "win32")("is the player's alone to read, where the system has modes", () => {
        tableLog(home, root)("A line.");
        expect(statSync(tableLogFile(home, root)).mode & 0o777).toBe(0o600);
        expect(statSync(dirname(tableLogFile(home, root))).mode & 0o777).toBe(0o700);
    });
});
