import { z } from "zod";
import { changeState, requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { addDuration, formatDuration, formatGameDate, type GameDate, lastGameDay, minutesBetween, readDuration, readGameDate } from "../time/index.ts";
import { calendarText, nextAfter, passedLines, passTime, type TimePassed, unreadNotes } from "./game-advance.ts";
import { dueEvents, dueText, isDated, plannedEvents } from "./game-events.ts";
import { timePassedLines } from "./game-extensions.ts";
import { newDatedLogEntry, presentDate } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

export const advance = defineCommand({
    name: "advance",
    description: "Let time pass in the story, whenever it does, before you narrate it: by a duration or to a later game date. "
        + "At the first scene, set the date the game starts on with to, at the scene's hour. Time never goes back. "
        + "It stops at the first planned event that comes due and says how to play it; on a new day, it lists the events' clocks to move. "
        + 'Example: by 8h, why "a night at the inn".',
    group: "game",
    input: z.object({
        by: z.string().optional().describe("how much time passes, in days, hours and minutes: 10m, 4h, 1d 6h"),
        to: z.string().optional().describe("the game date to reach, such as day 3, 06:00 (day 3 alone is its midnight); the first one sets when play starts, such as day 1, 18:00"),
        why: z.string().optional().describe("what the time is spent on"),
    }),

    async run(input, context): Promise<TimePassed>
    {
        const root = requireCampaign(context.folder);
        const request = readRequest(input);
        const now = presentDate(root);
        const world = campaignWorld(root, context);
        const why = input.why?.trim() === "" ? undefined : input.why;

        if (now === undefined) {
            if ("by" in request) {
                throw new Error('The game has no date yet: set the date it starts on with to, such as to "day 1, 18:00".');
            }

            const start = formatGameDate(request.to);
            changeState(root, { date: start });
            appendLogEntry(root, newDatedLogEntry(root, context, "time-advanced", "public", { to: start, why }));
            const next = nextAfter(plannedEvents(world).filter(isDated), request.to);
            const calendar = calendarText(root, context, request.to);
            const extensionLines = await timePassedLines(root, context, request.to, request.to);
            return {
                to: start,
                passed: 0,
                wanted: 0,
                due: [],
                stillDue: dueEvents(world, request.to).map(dueText),
                next,
                ended: [],
                newDays: 0,
                clocks: [],
                newDayPart: "",
                calendar,
                extensionLines,
                ...unreadNotes(world),
            };
        }

        const end = "by" in request ? addDuration(now, request.by) : request.to;

        if (end.day > lastGameDay) {
            throw new Error(`${input.by} would go past day ${lastGameDay}, the last game date the engine counts: let less time pass.`);
        }

        const wanted = minutesBetween(now, end);

        if (wanted < 0) {
            throw new Error(`${formatGameDate(end)} is before now, ${formatGameDate(now)}: time never goes back.`);
        }

        const passed = passTime(root, context, world, now, wanted, why, input.by ?? input.to ?? "");
        return passed.passed === 0 ? passed : { ...passed, extensionLines: await timePassedLines(root, context, now, addDuration(now, passed.passed)) };
    },

    format(result)
    {
        const rest = result.wanted - result.passed;
        const then = rest > 0 ? ` Then advance the other ${formatDuration(rest)}, if they are still doing what they were.` : "";
        return [movedLine(result, rest), ...passedLines(result, then)].filter((line) => line !== "").join("\n");
    },
});

function readRequest(input: { by?: string; to?: string; }): { by: number; } | { to: GameDate; }
{
    if ((input.by === undefined) === (input.to === undefined)) {
        throw new Error("Give one of by (how much time passes, such as 8h or 1d 6h) or to (the game date to reach, such as day 3, 06:00).");
    }

    if (input.by !== undefined) {
        const minutes = readDuration(input.by);

        if (minutes === undefined) {
            throw new Error(`"${input.by}" is not a duration: write days, hours and minutes in this order, such as 10m, 4h or 1d 6h.`);
        }

        return { by: minutes };
    }

    const date = readGameDate(input.to);

    if (date === undefined) {
        throw new Error(`"${input.to}" is not a game date: write it as day 3, 06:00, or day 3.`);
    }

    return { to: date };
}

/** The first line: where time went, and where it stopped short of what was asked. */
function movedLine(result: TimePassed, rest: number): string
{
    const to = result.calendar === undefined ? result.to : `${result.to} (${result.calendar})`;

    if (result.from === undefined) {
        return `The game starts on ${to}.`;
    }

    if (result.passed === 0) {
        return `Nothing changed: it is already ${to}.`;
    }

    return `${result.from} → ${to}${rest > 0 ? `: stopped after ${formatDuration(result.passed)} of ${formatDuration(result.wanted)}` : ""}.`;
}
