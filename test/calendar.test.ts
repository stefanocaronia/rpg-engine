// The calendar over the game date (TIM-8, D-437): months with their days and seasons, when the story starts, and the campaign commands that show it.
import fc from "fast-check";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { type Calendar, type CalendarDay, calendarDay, type CalendarStart, formatCalendarDay, readCalendar, readCalendarStart, realCalendar } from "../src/time/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

/** A day of the world the story starts on, read with the calendar. */
function startOf(text: string, calendar: Calendar = realCalendar): CalendarStart
{
    const start = readCalendarStart(text, calendar);

    if (start === undefined) {
        throw new Error(`${text} counts only the days`);
    }

    return start;
}

describe("TIM-8: the calendar", () => {
    it("reads months with their days and seasons, and refuses what is not one, saying how to write it", () => {
        expect(readCalendar({ months: [{ name: "Midwinter", days: 1 }, { name: "Hammer", days: 30, season: "winter" }] }).months).toHaveLength(2);

        for (const wrong of [undefined, [], { months: [] }, { months: [{ name: "April" }] }, { months: [{ name: "April", days: 0 }] }, { months: [{ name: "April", days: 30, moons: 2 }] }]) {
            expect(() => readCalendar(wrong), JSON.stringify(wrong)).toThrow(/The calendar does not read: .*Write it as months: \[\{name: January/);
        }

        expect(() => readCalendar({ months: [{ name: "April", days: 30 }, { name: "april", days: 31 }] })).toThrow("The calendar names the month april twice");
    });

    it("has the twelve real months in the core, 365 days with the seasons of the north", () => {
        expect(realCalendar.months.map((month) => month.name)).toEqual(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
        expect(realCalendar.months.reduce((total, month) => total + month.days, 0)).toBe(365);
        expect(new Set(realCalendar.months.map((month) => month.season))).toEqual(new Set(["winter", "spring", "summer", "autumn"]));
    });

    it("reads when the story starts: day 1, or a day with a month of the calendar in any case, the year if given", () => {
        expect(readCalendarStart("day 1", realCalendar)).toBeUndefined();
        expect(readCalendarStart(" Day  1 ", realCalendar)).toBeUndefined();
        expect(readCalendarStart("14 April", realCalendar)).toEqual({ day: 14, month: 3 });
        expect(readCalendarStart(" 14  april  1491 ", realCalendar)).toEqual({ day: 14, month: 3, year: 1491 });
        expect(readCalendarStart("1 Deep Winter", { months: [{ name: "Deep Winter", days: 30 }] })).toEqual({ day: 1, month: 0 });
        expect(() => readCalendarStart("April 14", realCalendar)).toThrow(
            '"April 14" is not when the story starts: write day 1 to count the days, or a day of the calendar, the year if wanted, such as 14 January or 14 January 1491.',
        );
        expect(() => readCalendarStart("day 2", realCalendar)).toThrow('"day 2" is not when the story starts');
        expect(() => readCalendarStart("14 Aprile", realCalendar)).toThrow('The calendar has no month "Aprile": its months are January, February, March');
        expect(() => readCalendarStart("30 February", realCalendar)).toThrow("February has days 1 to 28, not 30: give a day it has.");
        expect(() => readCalendarStart("0 May", realCalendar)).toThrow("May has days 1 to 31, not 0: give a day it has.");
    });

    it("shows a game day as a day of a month, turning into the next month and the next year", () => {
        const start = startOf("14 April");
        expect(formatCalendarDay(calendarDay(realCalendar, start, 1))).toBe("14 April, spring");
        expect(formatCalendarDay(calendarDay(realCalendar, start, 18))).toBe("1 May, spring");
        expect(formatCalendarDay(calendarDay(realCalendar, startOf("31 December 1491"), 2))).toBe("1 January 1492, winter");
        expect(formatCalendarDay(calendarDay(realCalendar, startOf("1 January 1491"), 366))).toBe("1 January 1492, winter");
        expect(formatCalendarDay(calendarDay({ months: [{ name: "Ches", days: 30 }] }, { day: 30, month: 0 }, 2))).toBe("1 Ches");
    });

    it("counts as a model that turns the calendar a day at a time", () => {
        const calendars = fc.array(fc.record({ days: fc.integer({ min: 1, max: 40 }), season: fc.option(fc.constantFrom("dry", "wet"), { nil: undefined }) }), { minLength: 1, maxLength: 8 })
            .map((months): Calendar => ({ months: months.map((month, index) => ({ name: `Month ${String.fromCharCode(65 + index)}`, ...month })) }));
        const cases = calendars.chain((calendar) =>
            fc.record({
                calendar: fc.constant(calendar),
                month: fc.integer({ min: 0, max: calendar.months.length - 1 }),
                day: fc.integer({ min: 1, max: 40 }),
                year: fc.option(fc.integer({ min: -50, max: 3000 }), { nil: undefined }),
                gameDay: fc.integer({ min: 1, max: 900 }),
            })
        );

        fc.assert(
            fc.property(cases, ({ calendar, month, day, year, gameDay }) => {
                const startDay = Math.min(day, calendar.months[month].days);
                const start = startOf(`${startDay} ${calendar.months[month].name}${year === undefined ? "" : ` ${year}`}`, calendar);
                expect(start).toEqual({ day: startDay, month, ...(year === undefined ? {} : { year }) });
                expect(calendarDay(calendar, start, gameDay)).toEqual(dayByModel(calendar, start.day, month, year, gameDay));
            }),
            { numRuns: 2000 },
        );
    });
});

/** The day a game day falls on, by turning the calendar one day at a time from the start. */
function dayByModel(calendar: Calendar, startDay: number, startMonth: number, startYear: number | undefined, gameDay: number): CalendarDay
{
    let [day, month, year] = [startDay, startMonth, startYear];

    for (let step = 1; step < gameDay; step += 1) {
        day += 1;

        if (day > calendar.months[month].days) {
            day = 1;
            month = (month + 1) % calendar.months.length;
            year = month === 0 && year !== undefined ? year + 1 : year;
        }
    }

    const { name, season } = calendar.months[month];
    return { day, month: name, ...(season === undefined ? {} : { season }), ...(year === undefined ? {} : { year }) };
}

describe("when the campaign's story starts, in the setup, config, status and advance", () => {
    let folder: string;
    let context: Context;
    const rpg = (...args: string[]) => runCommandLine(args, context);

    beforeEach(async () => {
        folder = makeTempFolder();
        context = testContext(folder);
        await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    });

    afterEach(() => removeFolder(folder));

    it("is asked in the setup until answered, day 1 too", async () => {
        const asked = "calendar-start (when the story starts: day 1 to count only the days, or a day of the world, such as 14 April 1491)";
        expect((await rpg("status")).output).toContain(asked);
        expect((await rpg("config", "calendar-start", "day 1")).output).not.toContain(asked);
    });

    it("counts only the days with day 1, as without a start, and config shows the months only when the campaign writes its own", async () => {
        inPlay(folder);
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("advance", "--by", "1d")).output).toMatch(/^day 1, 18:00 → day 2, 18:00\.$/m);
        expect((await rpg("config")).output).toContain("\ncalendar-start: (missing)\n");

        expect((await rpg("config", "calendar-start", "Day 1")).output).toMatch(/^calendar-start: Day 1\n/);
        expect((await rpg("status")).output).toContain("Now: day 2, 18:00\n");
        expect((await rpg("config")).output).toContain("\ncalendar-start: Day 1\n");
        expect((await rpg("config")).output).not.toContain("\ncalendar:");
    });

    it("shows the date as a day of the real months once the story starts on one", async () => {
        inPlay(folder);
        await rpg("advance", "--to", "day 1, 18:00");
        const wrong = await rpg("config", "calendar-start", "31 April");
        expect(wrong.exitCode).toBe(1);
        expect(wrong.output).toBe("April has days 1 to 30, not 31: give a day it has. Nothing changed.");

        expect((await rpg("config", "calendar-start", " 30  april ")).output).toMatch(/^calendar-start: 30 april\n/);
        expect((await rpg("advance", "--by", "1d")).output).toMatch(/^day 1, 18:00 → day 2, 18:00 \(1 May, spring\)\.$/m);
        expect((await rpg("status")).output).toContain("Now: day 2, 18:00 (1 May, spring)\n");
        expect((await rpg("validate")).output).not.toContain("calendar");
    });

    it("takes the campaign's own months in place of the real ones, until they are taken away", async () => {
        inPlay(folder);
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("config", "calendar", "months: [{name: Midwinter, days: 1, season: winter}, {name: Hammer, days: 30, season: winter}]")).exitCode).toBe(0);
        expect((await rpg("config", "calendar-start", "1 Midwinter 1491")).exitCode).toBe(0);
        expect((await rpg("advance", "--by", "1d")).output).toMatch(/ \(1 Hammer 1491, winter\)\.$/m);
        expect((await rpg("config", "calendar-start", "14 April")).output).toBe('The calendar has no month "April": its months are Midwinter, Hammer. Nothing changed.');

        expect((await rpg("config", "calendar", "none")).exitCode).toBe(0);
        expect((await rpg("validate")).output).toContain('The calendar has no month "Midwinter"');
        expect((await rpg("status")).output).toContain("Now: day 2, 18:00\n");
    });

    it("never stops the game for a calendar that does not read: validate says it, and the date stays day N", async () => {
        inPlay(folder);
        writeFileSync(join(folder, "campaign.yaml"), "name: Guadoscuro\nlanguage: it\nsystem: fake\ndifficulty: normal\nlethality: dice\ncalendar: {months: [{name: April}]}\ncalendar-start: 1 April\n");
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("status")).output).toContain("Now: day 1, 18:00\n");
        expect((await rpg("validate")).output).toMatch(/campaign\.yaml: The calendar does not read: .* fix calendar in campaign\.yaml by hand, or take it away with config calendar none/);
    });
});
