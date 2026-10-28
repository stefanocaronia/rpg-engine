// The laws of game time (MECCANICHE, TIM-1–TIM-7): dates and durations made at random against a model that counts minutes from the first midnight; runs of advance
// on campaigns made at random, with planned events at random dates.
import fc from "fast-check";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { LogEntry } from "../src/core/log.ts";
import { addDuration, formatDuration, formatGameDate, type GameDate, minutesBetween, readDuration, readGameDate } from "../src/time/index.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

const runs = { numRuns: 3000 };
const dayMinutes = 24 * 60;
const dates = fc.record({ day: fc.integer({ min: 1, max: 400 }), minute: fc.option(fc.integer({ min: 0, max: dayMinutes - 1 }), { nil: undefined }) })
    .map((date): GameDate => (date.minute === undefined ? { day: date.day } : date));

describe("the laws of game dates and durations, made at random", () => {
    it("TIM-1: a date the engine writes reads back the same, and text reads as a date just as the model says", () => {
        fc.assert(
            fc.property(dates, (date) => {
                expect(readGameDate(formatGameDate(date))).toEqual(date);
            }),
            runs,
        );
        fc.assert(
            fc.property(fc.stringMatching(/^(day|Day|DAY|giorno)?[ ,0-9:]{0,10}$/), (text) => {
                expect(readGameDate(text), text).toEqual(gameDateByModel(text));
            }),
            runs,
        );
    });

    it("TIM-2: a duration the engine writes reads back the same; days, hours and minutes in this order add up; no time at all is no duration", () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 100 * dayMinutes }), (minutes) => {
                expect(readDuration(formatDuration(minutes))).toBe(minutes === 0 ? undefined : minutes);
            }),
            runs,
        );
        fc.assert(
            fc.property(fc.option(fc.nat(30)), fc.option(fc.nat(50)), fc.option(fc.nat(200)), fc.constantFrom("", " "), (days, hours, minutes, space) => {
                const parts = [[days, "d"], [hours, "h"], [minutes, "m"]].filter(([amount]) => amount !== null).map(([amount, unit]) => `${amount}${unit}`);
                const total = (days ?? 0) * dayMinutes + (hours ?? 0) * 60 + (minutes ?? 0);
                expect(readDuration(parts.join(space)), parts.join(space)).toBe(parts.length === 0 || total === 0 ? undefined : total);
            }),
            runs,
        );
    });

    it("TIM-3: time added is the time between, and adding twice is adding once; a date keeps no time of day only when it had none and whole days passed", () => {
        fc.assert(
            fc.property(dates, fc.nat(10 * dayMinutes), fc.nat(10 * dayMinutes), (date, first, second) => {
                const after = addDuration(date, first);
                expect(minutesBetween(date, after)).toBe(first);
                expect(minutesBetween(date, addDuration(after, second))).toBe(first + second);
                expect(after.minute === undefined).toBe(date.minute === undefined && first % dayMinutes === 0);
                expect(minutesBetween(after, date)).toBe(first === 0 ? 0 : -first);
                expect(minutesBetween(date, after)).toBe(minuteOf(after) - minuteOf(date));
            }),
            runs,
        );
    });
});

// A run of advance on a campaign with a few events: planned at a date with or without a time, happened, or planned at no date; the game with a date or not yet.
const events = fc.array(fc.record({ date: dates.filter((date) => date.day <= 6), status: fc.constantFrom("planned", "planned", "happened", undefined) }), { maxLength: 4 });
const requests = fc.oneof(
    fc.integer({ min: 1, max: 3 * dayMinutes }).chain((minutes) => fc.constantFrom(formatDuration(minutes), `${minutes}m`)).map((by) => ({ by })),
    dates.filter((date) => date.day <= 7).map((date) => ({ to: formatGameDate(date) })),
    // "now" goes to the date it is, "event 2" to the date of an event.
    fc.constant({ to: "now" }),
    fc.nat(3).map((index) => ({ to: `event ${index}` })),
);
const starts = fc.option(dates.filter((date) => date.day <= 4), { nil: undefined });

describe("the laws of advance, on campaigns made at random", () => {
    it("TIM-4–TIM-7: time goes forward as asked, never back, stops at the first planned event it reaches, and logs only what passed", async () => {
        const outcomes = new Set<string>();
        await fc.assert(
            fc.asyncProperty(starts, events, fc.array(requests, { minLength: 1, maxLength: 5 }), async (start, planned, run) => {
                const root = makeTempFolder();

                try {
                    writeFileSync(join(root, "campaign.yaml"), "name: Prova\nsystem: free\nlanguage: it\n");
                    writeFileSync(join(root, "state.yaml"), `mode: play\n${start === undefined ? "" : `date: ${formatGameDate(start)}\n`}`);
                    mkdirSync(join(root, "world", "events"), { recursive: true });

                    for (const [index, event] of planned.entries()) {
                        writeFileSync(join(root, "world", "events", `Evento ${index}.md`), `---\n${event.status === undefined ? "" : `status: ${event.status}\n`}date: ${formatGameDate(event.date)}\n---\n`);
                    }

                    let now = start;

                    for (const asked of run) {
                        const event = "to" in asked && asked.to.startsWith("event ") ? planned[Number(asked.to.slice(6)) % Math.max(1, planned.length)] : undefined;
                        const request = "to" in asked && asked.to === "now"
                            ? { to: now === undefined ? "day 1" : formatGameDate(now) }
                            : "to" in asked && asked.to.startsWith("event ")
                            ? { to: formatGameDate(event?.date ?? { day: 2 }) }
                            : asked;
                        const lines = readLog(root).length;
                        const result = await runCommandLine(["advance", ...("by" in request ? ["--by", request.by] : ["--to", request.to])], testContext(root));
                        const expected = advanceByModel(now, planned, request);
                        const label = `${JSON.stringify(request)} from ${now === undefined ? "no date" : formatGameDate(now)}: ${result.output}`;
                        outcomes.add(expected.refused ? "refused" : expected.stopped.length > 0 ? "stopped" : expected.passed > 0 || now === undefined ? "passed" : "same");
                        expect(result.exitCode === 0, label).toBe(!expected.refused);
                        const logged = readLog(root).slice(lines).filter((entry) => entry.type === "time-advanced");

                        if (expected.refused) {
                            expect(logged, label).toEqual([]);
                        } else {
                            const reached = expected.reached as GameDate;
                            expect(stateDate(root), label).toBe(formatGameDate(reached));
                            expect(logged.length, label).toBe(expected.passed > 0 || now === undefined ? 1 : 0);
                            expect(result.output.split("\n")[0], label).toBe(firstLine(now, reached, expected.passed, expected.wanted));
                            const due = /^Due: (.*?)\. /m.exec(result.output)?.[1].split(" · ").map((text) => text.replace(/ \(.*$/, "")).sort() ?? [];
                            expect(due, label).toEqual(expected.stopped.map((index) => `Evento ${index}`).sort());
                            now = reached;
                        }

                        expect(stateDate(root), label).toBe(now === undefined ? undefined : formatGameDate(now));
                    }
                } finally {
                    removeFolder(root);
                }
            }),
            { numRuns: 80 },
        );
        expect([...outcomes].sort()).toEqual(["passed", "refused", "same", "stopped"]);
    }, 120000);
});

/** What advance does, by the model (TIM-4–TIM-6): the first date sets the start; then forward only, to the end asked or to the first planned event after now up to it. */
function advanceByModel(
    now: GameDate | undefined,
    planned: { date: GameDate; status?: string; }[],
    request: { by: string; } | { to: string; },
): { refused: boolean; reached?: GameDate; passed: number; wanted: number; stopped: number[]; }
{
    const refused = { refused: true, passed: 0, wanted: 0, stopped: [] };
    const target = "to" in request ? readGameDate(request.to) : undefined;

    if (now === undefined) {
        return target === undefined ? refused : { refused: false, reached: target, passed: 0, wanted: 0, stopped: [] };
    }

    const wanted = target === undefined ? (readDuration((request as { by: string; }).by) ?? 0) : minuteOf(target) - minuteOf(now);

    if (wanted < 0) {
        return refused;
    }

    const coming = planned.map((event, index) => ({ ...event, index, at: minuteOf(event.date) - minuteOf(now) })).filter((event) => event.status !== "happened" && event.at > 0 && event.at <= wanted);
    const first = Math.min(...coming.map((event) => event.at));
    const passed = coming.length === 0 ? wanted : first;
    const total = minuteOf(now) + passed;
    const day = Math.floor(total / dayMinutes) + 1;
    const reached = now.minute === undefined && passed % dayMinutes === 0 ? { day } : { day, minute: total % dayMinutes };
    return { refused: false, reached, passed, wanted, stopped: coming.filter((event) => event.at === first).map((event) => event.index) };
}

/** The first line of advance: the start, nothing changed, or where time went and where it stopped. */
function firstLine(now: GameDate | undefined, reached: GameDate, passed: number, wanted: number): string
{
    if (now === undefined) {
        return `The game starts on ${formatGameDate(reached)}.`;
    }

    if (passed === 0) {
        return `Nothing changed: it is already ${formatGameDate(reached)}.`;
    }

    return `${formatGameDate(now)} → ${formatGameDate(reached)}${passed < wanted ? `: stopped after ${formatDuration(passed)} of ${formatDuration(wanted)}` : ""}.`;
}

/** Minutes from the midnight of day 1: a day without a time counts from its midnight. */
function minuteOf(date: GameDate): number
{
    return (date.day - 1) * dayMinutes + (date.minute ?? 0);
}

/** A game date read the model's way: "day", spaces, a day from 1 with up to nine digits, then maybe a comma and hours:minutes of a day, in any case. */
function gameDateByModel(text: string): GameDate | undefined
{
    const trimmed = text.trim();

    if (trimmed.slice(0, 3).toLowerCase() !== "day" || !/^\s$/.test(trimmed[3] ?? "")) {
        return undefined;
    }

    const [dayText, time, ...more] = trimmed.slice(3).split(",").map((part) => part.trim());
    const digits = (part: string | undefined, most: number): boolean => part !== undefined && part.length >= 1 && part.length <= most && [...part].every((character) => "0123456789".includes(character));

    if (more.length > 0 || !digits(dayText, 9) || Number(dayText) < 1) {
        return undefined;
    }

    if (time === undefined) {
        return { day: Number(dayText) };
    }

    const [hours, minutes, ...rest] = time.split(":");
    const valid = rest.length === 0 && digits(hours, 2) && digits(minutes, 2) && minutes.length === 2 && Number(hours) < 24 && Number(minutes) < 60;
    return valid ? { day: Number(dayText), minute: Number(hours) * 60 + Number(minutes) } : undefined;
}

function stateDate(root: string): string | undefined
{
    return /^date: (.*)$/m.exec(readFileSync(join(root, "state.yaml"), "utf8"))?.[1];
}

function readLog(root: string): LogEntry[]
{
    try {
        return readFileSync(join(root, "log.jsonl"), "utf8").trim().split("\n").filter((line) => line !== "").map((line) => JSON.parse(line) as LogEntry);
    } catch {
        return [];
    }
}
