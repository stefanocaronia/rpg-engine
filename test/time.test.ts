import { describe, expect, it } from "vitest";
import { addDuration, formatDuration, formatGameDate, minutesBetween, readDuration, readGameDate } from "../src/time/index.ts";

describe("game dates", () => {
    it("reads and writes a day with a time, or a day only", () => {
        expect(readGameDate("day 3, 06:00")).toEqual({ day: 3, minute: 360 });
        expect(readGameDate("day 12")).toEqual({ day: 12 });
        expect(readGameDate(" Day 1,23:59 ")).toEqual({ day: 1, minute: 1439 });
        expect(readGameDate("day 2, 6:05")).toEqual({ day: 2, minute: 365 });
        expect(formatGameDate({ day: 2, minute: 365 })).toBe("day 2, 06:05");
        expect(formatGameDate({ day: 12 })).toBe("day 12");
    });

    it("refuses what is not a game date", () => {
        for (const text of ["giorno 3, 06:00", "day 0", "day -2", "day 3, 24:00", "day 3, 06:60", "day 3 06:00", "la prima notte", "day 1234567890", "", "day 3,"]) {
            expect(readGameDate(text), text).toBeUndefined();
        }

        expect(readGameDate(3)).toBeUndefined();
        expect(readGameDate(undefined)).toBeUndefined();
    });
});

describe("durations", () => {
    it("reads days, hours and minutes, in this order", () => {
        expect(readDuration("10m")).toBe(10);
        expect(readDuration("4h")).toBe(240);
        expect(readDuration("1d 6h")).toBe(1800);
        expect(readDuration("1d6h30m")).toBe(1830);
        expect(readDuration("90m")).toBe(90);
    });

    it("refuses what is not a duration, and no time at all", () => {
        for (const text of ["", "0h", "6h 1d", "1.5h", "-2h", "2 ore", "h"]) {
            expect(readDuration(text), text).toBeUndefined();
        }
    });

    it("writes a duration in its largest parts", () => {
        expect(formatDuration(1800)).toBe("1d 6h");
        expect(formatDuration(1830)).toBe("1d 6h 30m");
        expect(formatDuration(2880)).toBe("2d");
        expect(formatDuration(45)).toBe("45m");
        expect(formatDuration(0)).toBe("0m");
    });
});

describe("time passing", () => {
    it("adds a duration across midnight", () => {
        expect(addDuration({ day: 1, minute: 21 * 60 }, 8 * 60)).toEqual({ day: 2, minute: 5 * 60 });
        expect(addDuration({ day: 1, minute: 0 }, 2 * 24 * 60)).toEqual({ day: 3, minute: 0 });
    });

    it("keeps a date without a time as a day, unless the time passed is not whole days", () => {
        expect(addDuration({ day: 12 }, 24 * 60)).toEqual({ day: 13 });
        expect(addDuration({ day: 12 }, 4 * 60)).toEqual({ day: 12, minute: 240 });
    });

    it("counts the minutes between two dates, a day without a time from its midnight", () => {
        expect(minutesBetween({ day: 1, minute: 21 * 60 }, { day: 1, minute: 23 * 60 })).toBe(120);
        expect(minutesBetween({ day: 1, minute: 21 * 60 }, { day: 2 })).toBe(180);
        expect(minutesBetween({ day: 2 }, { day: 1, minute: 60 })).toBe(-1380);
    });
});
