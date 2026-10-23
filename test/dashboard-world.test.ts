// The World section's lore, documents and calendar (D-276, TIM-8): which day of the calendar a game day is, the months around today, what a day holds, the
// story's days without a calendar; the lore's groups and search, the links of a text, and the look of each kind of document.
import { describe, expect, it } from "vitest";
import { calendarDateOf, dayMarks, monthAt, monthOffsetOf, storyDays } from "../src/dashboard/calendar.ts";
import type { KnownEntry, ShownCalendar } from "../src/dashboard/data.ts";
import { documentLook, foundLore, groupedLore, linkedName, loreGroupOf } from "../src/dashboard/lore.ts";

// Three months, the last with no season, as a story's own calendar: today is game day 5, the 3rd of Mud, year 12.
const calendar: ShownCalendar = {
    now: "day 5, 08:00",
    today: 5,
    months: [{ name: "Frost", days: 4, season: "winter" }, { name: "Mud", days: 5, season: "spring" }, { name: "Sun", days: 3 }],
    date: { day: 3, month: 1, season: "spring", year: 12 },
    deadlines: [{ quest: "Ford", main: true, date: "day 7, 06:00", day: 7, minutes: 2000 }],
    scenes: [{ day: 1, number: 1, title: "Start" }, { day: 5, number: 2, title: "Market" }, { day: 5, number: 3, title: "Night" }],
};

describe("the calendar of the World section (TIM-8)", () => {
    it("finds the months around today, with their first game day, the year turning after the last month", () => {
        expect(monthAt(calendar, 0)).toEqual({ offset: 0, month: 1, name: "Mud", days: 5, season: "spring", year: 12, first: 3 });
        expect(monthAt(calendar, -1)).toEqual({ offset: -1, month: 0, name: "Frost", days: 4, season: "winter", year: 12, first: -1 });
        expect(monthAt(calendar, 1)).toEqual({ offset: 1, month: 2, name: "Sun", days: 3, year: 12, first: 8 });
        expect(monthAt(calendar, 2)).toMatchObject({ month: 0, name: "Frost", year: 13, first: 11 });
        expect(monthAt(calendar, -2)).toMatchObject({ month: 2, name: "Sun", year: 11, first: -4 });
    });

    it("gives the day of the calendar of any game day, before the story and after a year", () => {
        expect(calendarDateOf(calendar, 5)).toEqual({ day: 3, month: 1, name: "Mud", season: "spring", year: 12 });
        expect(calendarDateOf(calendar, 1)).toEqual({ day: 3, month: 0, name: "Frost", season: "winter", year: 12 });
        expect(calendarDateOf(calendar, 8)).toEqual({ day: 1, month: 2, name: "Sun", year: 12 });
        expect(calendarDateOf(calendar, 11)).toEqual({ day: 1, month: 0, name: "Frost", season: "winter", year: 13 });
        // Every game day, one after the other, is the next day of the calendar.
        const days = Array.from({ length: 40 }, (_, index) => calendarDateOf(calendar, index - 10));
        days.slice(1).forEach((date, index) => {
            const before = days[index];
            const next = before !== undefined && before.day === (calendar.months ?? [])[before.month].days ? { day: 1, month: (before.month + 1) % 3 } : { day: (before?.day ?? 0) + 1, month: before?.month };
            expect({ day: date?.day, month: date?.month }).toEqual(next);
        });
        expect(monthOffsetOf(calendar, 12)).toBe(2);
    });

    it("has no days of a calendar without a calendar start: the story's days by number, in whole rows", () => {
        const plain: ShownCalendar = { ...calendar, today: 9 };
        delete plain.months;
        delete plain.date;
        expect(monthAt(plain, 0)).toBeUndefined();
        expect(calendarDateOf(plain, 3)).toBeUndefined();
        expect(storyDays(plain, 10)).toEqual(Array.from({ length: 10 }, (_, index) => index + 1));
        expect(storyDays({ ...plain, deadlines: [{ quest: "Ford", main: false, date: "day 13", day: 13 }] }, 5).length).toBe(15);
    });

    it("says what a day holds: today, the story's days, its scenes and deadlines", () => {
        expect(dayMarks(calendar, 5)).toEqual({ today: true, lived: true, scenes: calendar.scenes.slice(1), deadlines: [] });
        expect(dayMarks(calendar, 7)).toEqual({ today: false, lived: false, scenes: [], deadlines: calendar.deadlines });
        expect(dayMarks(calendar, 0).lived).toBe(false);
    });
});

describe("what the character knows and its documents (D-276)", () => {
    const entry = (name: string, type: string, summary = "", within?: string[]): KnownEntry => ({ name, type, summary, ...(within === undefined ? {} : { within }) });
    const known = [
        entry("Bertoldo", "character", "L'oste della locanda."),
        entry("Città delle Radici", "place", "", ["Sottosuolo"]),
        entry("La leggenda", "topic", "Una torre senza porte."),
        entry("La piena", "event"),
        entry("Ser Aldo", "deity"),
    ];

    it("puts each kind of page in its group, in the list's order", () => {
        expect(known.map(loreGroupOf)).toEqual(["people", "places", "tales", "tales", "other"]);
        expect(groupedLore(known).map((part) => [part.group, part.entries.length])).toEqual([["people", 1], ["places", 1], ["tales", 2], ["other", 1]]);
    });

    it("finds by every word of the search in the name, the opening or the places that hold it, without minding case or accents", () => {
        expect(foundLore(known, "citta").map((one) => one.name)).toEqual(["Città delle Radici"]);
        expect(foundLore(known, "TORRE senza").map((one) => one.name)).toEqual(["La leggenda"]);
        expect(foundLore(known, "sottosuolo").map((one) => one.name)).toEqual(["Città delle Radici"]);
        expect(foundLore(known, "  ").length).toBe(5);
        expect(foundLore(known, "la", "tales").map((one) => one.name)).toEqual(["La leggenda", "La piena"]);
    });

    it("reads the page a link names", () => {
        expect(["Bertoldo", "Bertoldo#Segreto", "world/character/Bertoldo.md", "  Bertoldo "].map(linkedName)).toEqual(["Bertoldo", "Bertoldo", "Bertoldo", "Bertoldo"]);
    });

    it("draws each kind of document by its word, any other as plain paper", () => {
        expect(["Letter", "notice", "book", "journal", "map", "scroll", "inscription", "receipt", "contract"].map(documentLook)).toEqual([
            "letter",
            "notice",
            "page",
            "diary",
            "map",
            "scroll",
            "inscription",
            "note",
            "plain",
        ]);
    });
});
