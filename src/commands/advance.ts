import { z } from "zod";
import { changeState, requireCampaign } from "../campaign/index.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { isEmptyField, type World } from "../pages/index.ts";
import { addDuration, formatDuration, formatGameDate, type GameDate, lastGameDay, minutesBetween, readDuration, readGameDate } from "../time/index.ts";
import { endedByDate, endEffects } from "./game-effects.ts";
import { surroundings, surroundingsText } from "./game-environment.ts";
import { clocksToMove, type DatedEvent, dueAdvice, dueEvents, dueText, isDated, plannedEvents, plannedText } from "./game-events.ts";
import { readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry, presentDate } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";
import { shortList } from "./notes.ts";
import { skippedPagesNote } from "./notes.ts";

/** What advance did, as its output tells it. */
interface Advance
{
    /** Undefined when this advance set the date the game starts on. */
    from?: string;
    to: string;
    passed: number;
    wanted: number;
    /** The events it stopped at. */
    due: string[];
    /** Events whose date had already come, still planned. */
    stillDue: string[];
    next?: string;
    /** Planned events whose date is not a game date: time does not stop at them. */
    unreadable: string[];
    /** Files of the world that could not be read as pages. */
    skipped: string[];
    /** The scene still open after an hour or more: "Alla locanda (since day 1, 18:00)" (D-115). */
    openScene?: string;
    /** The effects whose end in game time this advance reached (EFF-8). */
    ended: string[];
    /** What holds around the player character after an hour or more (ENV-5): "Ettore: light: dark (Cripta)". */
    around?: string;
    /** How many midnights this advance passed, and the clocks to move then (EVT-8). */
    newDays: number;
    clocks: string[];
}

// An hour or more passing usually ends a scene: then advance reminds that one is still open.
const sceneReminderMinutes = 60;

export const advance = defineCommand({
    name: "advance",
    description: "Let time pass in the story, whenever it does, before you narrate it: by a duration, such as 10m, 4h or 1d 6h, or to a later game date, such as day 3, 06:00. "
        + "At the first scene, set the date the game starts on with to, at the scene's hour. Time never goes back. "
        + "It stops at the first planned event that comes due, names it and says how to play it; on a new day, it lists the events' clocks to move. "
        + 'Example: by 8h, why "a night at the inn".',
    group: "game",
    input: z.object({
        by: z.string().optional().describe("how much time passes, in days, hours and minutes: 10m, 4h, 1d 6h"),
        to: z.string().optional().describe("the game date to reach, such as day 3, 06:00 (day 3 alone is its midnight); the first one sets when play starts, at the hour of the first scene, such as day 1, 18:00"),
        why: z.string().optional().describe("what the time is spent on"),
    }),

    run(input, context): Advance
    {
        const root = requireCampaign(context.folder);
        const request = readRequest(input);
        const now = presentDate(root);
        const world = campaignWorld(root, context);
        const events = plannedEvents(world);
        const dated = events.filter(isDated);
        const why = input.why?.trim() === "" ? undefined : input.why;
        const notes = { unreadable: events.filter((event) => !isDated(event) && !isEmptyField(event.page.fields.date)).map((event) => event.page.name), skipped: world.problems };

        if (now === undefined) {
            if ("by" in request) {
                throw new Error('The game has no date yet: set the date it starts on with to, such as to "day 1, 18:00".');
            }

            const start = formatGameDate(request.to);
            changeState(root, { date: start });
            appendLogEntry(root, newDatedLogEntry(root, context, "time-advanced", "public", { to: start, why }));
            return { to: start, passed: 0, wanted: 0, due: [], stillDue: dueEvents(world, request.to).map(dueText), next: nextAfter(dated, request.to), ended: [], newDays: 0, clocks: [], ...notes };
        }

        const end = "by" in request ? addDuration(now, request.by) : request.to;

        if (end.day > lastGameDay) {
            throw new Error(`${input.by} would go past day ${lastGameDay}, the last game date the engine counts: let less time pass.`);
        }

        const wanted = minutesBetween(now, end);

        if (wanted < 0) {
            throw new Error(`${formatGameDate(end)} is before now, ${formatGameDate(now)}: time never goes back.`);
        }

        const stop = dated.find((event) => minutesBetween(now, event.date) > 0 && minutesBetween(now, event.date) <= wanted);
        const passed = stop === undefined ? wanted : minutesBetween(now, stop.date);
        const reached = addDuration(now, passed);
        const result = {
            from: formatGameDate(now),
            to: formatGameDate(reached),
            passed,
            wanted,
            due: stop === undefined ? [] : dated.filter((event) => minutesBetween(stop.date, event.date) === 0).map(dueText),
            stillDue: dueEvents(world, now).map(dueText),
            next: stop === undefined ? nextAfter(dated, reached) : undefined,
            openScene: passed >= sceneReminderMinutes ? openSceneText(root) : undefined,
            newDays: reached.day - now.day,
            clocks: reached.day > now.day ? clocksToMove(world, reached) : [],
            ...notes,
        };

        if (passed > 0) {
            changeState(root, { date: result.to });
            appendLogEntry(root, newDatedLogEntry(root, context, "time-advanced", "public", { from: result.from, to: result.to, requested: input.by ?? input.to, why }));
        }

        const ended = passed > 0 ? endEffects(root, context, world, readOpenScene(root).scene, (effect) => endedByDate(effect, reached), "time passed") : [];
        // Read again only when effects ended, which may have been on the places around.
        const around = passed >= sceneReminderMinutes ? aroundLead(ended.length === 0 ? world : campaignWorld(root, context)) : undefined;
        return { ...result, ended, around };
    },

    format(result)
    {
        const rest = result.wanted - result.passed;
        return [
            movedLine(result, rest),
            result.ended.length === 0 ? "" : `Ended: ${result.ended.join(" · ")}.`,
            result.due.length === 0 ? "" : `Due: ${result.due.join(" · ")}. ${dueAdvice(result.due.length)}${rest > 0 ? ` Then advance the other ${formatDuration(rest)}, if they are still doing what they were.` : ""}`,
            stillDueLine(result.stillDue, result.due.length > 0),
            result.next === undefined ? "" : `Next: ${result.next}.`,
            result.openScene === undefined ? "" : `A scene is still open: ${result.openScene}. Close it if this time ends it.`,
            result.around === undefined ? "" : `Around ${result.around}.`,
            clocksLine(result.newDays, result.to, result.clocks),
            result.unreadable.length === 0 ? "" : `Time does not stop at these planned events, whose date is not a game date: ${result.unreadable.join(" · ")}. Give each one a game date with write.`,
            skippedPagesNote(result.skipped),
        ].filter((line) => line !== "").join("\n");
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

/** "Alla locanda (since day 1, 18:00)": the open scene, if any; a scene that cannot be read is left to validate. */
function openSceneText(root: string): string | undefined
{
    const { scene } = readOpenScene(root);
    return scene === undefined ? undefined : `${scene.title}${scene.opened === undefined ? "" : ` (since ${scene.opened})`}`;
}

/** "Ettore: light: dark (Cripta)": what holds around the player character, for rules that count the hours spent there (ENV-5); undefined when nothing does. */
function aroundLead(world: World): string | undefined
{
    const lead = world.pages.find((page) => page.type === "character" && page.fields.role === "pc");
    const around = surroundingsText(surroundings(world, lead));
    return lead === undefined || around === "" ? undefined : `${lead.name}: ${around}`;
}

/** The first line: where time went, and where it stopped short of what was asked. */
function movedLine(result: Advance, rest: number): string
{
    if (result.from === undefined) {
        return `The game starts on ${result.to}.`;
    }

    if (result.passed === 0) {
        return `Nothing changed: it is already ${result.to}.`;
    }

    return `${result.from} → ${result.to}${rest > 0 ? `: stopped after ${formatDuration(result.passed)} of ${formatDuration(result.wanted)}` : ""}.`;
}

/** The first events after `date`: all those at the same moment. */
function nextAfter(events: DatedEvent[], date: GameDate): string | undefined
{
    const next = events.find((event) => minutesBetween(date, event.date) > 0);
    return next === undefined ? undefined : events.filter((event) => minutesBetween(next.date, event.date) === 0).map((event) => plannedText(event, date)).join(" · ");
}

/** A new day is the world's turn (EVT-8): the clocks to move as the time moved them, which they never do by themselves, and how (D-134). */
function clocksLine(newDays: number, to: string, clocks: string[]): string
{
    if (clocks.length === 0) {
        return "";
    }

    const days = newDays === 1 ? `A new day (${to.replace(/,.*$/, "")})` : `${newDays} new days (to ${to.replace(/,.*$/, "")})`;
    return `${days}: move each clock as its event says, or a step for each day its owner worked unhindered; show each step as a sign, never the plan: ${shortList(clocks, " · ")}.`;
}

/** The events already due before this advance; with new ones due too, the advice above covers them. */
function stillDueLine(events: string[], afterDue: boolean): string
{
    if (events.length === 0) {
        return "";
    }

    return afterDue ? `Still due as well: ${events.join(" · ")}.` : `Still due: ${events.join(" · ")}. ${dueAdvice(events.length)}`;
}
