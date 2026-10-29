// Time passing in the story (TIM-5, TIM-6, EFF-8, EVT-8), as advance and travel do it: up to the first planned event that comes due, with what ends and what comes.
import { changeState } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { isEmptyField, locate, type Page, playerCharacters, type World } from "../../pages/index.ts";
import { addDuration, formatCalendarDay, formatGameDate, type GameDate, minutesBetween } from "../../time/index.ts";
import { endedByDate, endEffects } from "./effects.ts";
import { surroundings, surroundingsText } from "./environment.ts";
import { clocksToMove, type DatedEvent, dueAdvice, dueEvents, dueText, isDated, plannedEvents, plannedText } from "./events.ts";
import { shortList, skippedPagesNote } from "./notes.ts";
import { situationPart } from "./parts.ts";
import { readOpenScene } from "./scene.ts";
import { diaryDueLine } from "./thoughts.ts";
import { calendarDayOf, newDatedLogEntry } from "./time.ts";
import { dailyUpkeep } from "./upkeep.ts";
import { campaignSystem, campaignWorld } from "./world.ts";

/** What time passing did, as outputs tell it. */
export interface TimePassed
{
    /** Undefined when an advance set the date the game starts on. */
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
    /** How many midnights it passed, and the clocks to move then (EVT-8), with how to move them the first time in a chat (D-97). */
    newDays: number;
    clocks: string[];
    newDayPart: string;
    /** The companion whose diary is due on a new day, and how (DIA-2). */
    diary?: string;
    /** What the party used up at each midnight passed, under the rigor «rules» (UPK-1, UPK-2). */
    upkeep?: string[];
    /** The day of the calendar reached, when the campaign has one (TIM-8): 15 April, spring. */
    calendar?: string;
    /** What the campaign's extensions said of the time passed, such as the weather of a new morning (D-436). */
    extensionLines?: string[];
    /** What cannot be true together now, not yet told in the chat (CHK-3). */
    checks?: string[];
}

// An hour or more passing usually ends a scene: then advance reminds that one is still open.
const sceneReminderMinutes = 60;

/**
 * Lets `wanted` minutes pass from `now` (TIM-5), stopping at the first planned event whose date comes (TIM-6): writes the new date and a public line with `why`,
 * ends the effects whose time came (EFF-8), and says the clocks to move on a new day (EVT-8) and whose diary is due (DIA-2).
 */
export function passTime(root: string, context: Context, world: World, now: GameDate, wanted: number, why: string | undefined, requested: string): TimePassed
{
    const events = plannedEvents(world);
    const dated = events.filter(isDated);
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
        calendar: calendarText(root, context, reached),
        ...unreadNotes(world),
    };

    if (passed > 0) {
        changeState(root, { date: result.to });
        appendLogEntry(root, newDatedLogEntry(root, context, "time-advanced", "public", { from: result.from, to: result.to, requested, why }));
    }

    const ended = passed > 0 ? endEffects(root, context, world, readOpenScene(root).scene, (effect) => endedByDate(effect, reached), "time passed") : [];
    // Read again only when effects ended, which may have been on the places around.
    const around = passed >= sceneReminderMinutes ? aroundLead(ended.length === 0 ? world : campaignWorld(root, context)) : undefined;
    // A new day with clocks to move is the world's turn: its part of the instructions says how (EVT-8, D-134).
    const newDayPart = result.clocks.length === 0 ? "" : situationPart("new-day", context, campaignSystem(root, context));
    const upkeep = passed > 0 ? dailyUpkeep(root, context, campaignSystem(root, context), result.newDays) : [];
    const diary = result.newDays > 0 ? diaryDueLine(root, context, world) : "";
    return { ...result, ended, around, newDayPart, ...(upkeep.length === 0 ? {} : { upkeep }), ...(diary === "" ? {} : { diary }) };
}

/**
 * What outputs say after time passed, line by line: the effects ended, the events due with how to play them and `then`, what to do after them, those still due,
 * the next, the open scene, what holds around, the clocks of a new day, and what could not be read.
 */
export function passedLines(result: TimePassed, then: string): string[]
{
    return [
        result.ended.length === 0 ? "" : `Ended: ${result.ended.join(" · ")}.`,
        result.due.length === 0 ? "" : `Due: ${result.due.join(" · ")}. ${dueAdvice(result.due.length)}${then}`,
        stillDueLine(result.stillDue, result.due.length > 0),
        result.next === undefined ? "" : `Next: ${result.next}.`,
        result.openScene === undefined ? "" : `A scene is still open: ${result.openScene}. Close it if this time ends it.`,
        result.around === undefined ? "" : `Around ${result.around}.`,
        clocksLine(result.newDays, result.to, result.clocks),
        result.newDayPart,
        ...(result.upkeep ?? []),
        result.diary ?? "",
        ...(result.extensionLines ?? []),
        result.unreadable.length === 0 ? "" : `Time does not stop at these planned events, whose date is not a game date: ${result.unreadable.join(" · ")}. Give each one a game date with write.`,
        skippedPagesNote(result.skipped),
    ].filter((line) => line !== "");
}

/** The planned events whose date is not a game date, and the files that are no pages: what an advance says it could not read. */
export function unreadNotes(world: World): { unreadable: string[]; skipped: string[]; }
{
    const events = plannedEvents(world);
    return { unreadable: events.filter((event) => !isDated(event) && !isEmptyField(event.page.fields.date)).map((event) => event.page.name), skipped: world.problems };
}

/** The day of the calendar a date falls on, as outputs write it after the date: 15 April, spring; undefined without a calendar (TIM-8). */
export function calendarText(root: string, context: Context, date: GameDate): string | undefined
{
    const day = calendarDayOf(root, context, date.day);
    return day === undefined ? undefined : formatCalendarDay(day);
}

/** The first events after `date`: all those at the same moment. */
export function nextAfter(events: DatedEvent[], date: GameDate): string | undefined
{
    const next = events.find((event) => minutesBetween(date, event.date) > 0);
    return next === undefined ? undefined : events.filter((event) => minutesBetween(next.date, event.date) === 0).map((event) => plannedText(event, date)).join(" · ");
}

/**
 * "Ettore: light: dark (Cripta)": what holds around the player characters, once for each place of the living (VIEW-12), for rules that count the hours spent
 * there (ENV-5); undefined when nothing does.
 */
export function aroundLead(world: World): string | undefined
{
    const players = playerCharacters(world);
    const living = players.filter((page) => page.fields.status !== "dead");
    const placeOf = (page: Page): Page | undefined => locate(world, page).chain.find((holder) => holder.type === "place");
    const groups = living.length === 0 ? players.slice(0, 1).map((page) => [page]) : [...new Set(living.map(placeOf))].map((place) => living.filter((page) => placeOf(page) === place));
    const lines = groups.flatMap((group) => {
        const around = surroundingsText(surroundings(world, group[0]));
        return around === "" ? [] : [`${group.map((page) => page.name).join(" and ")}: ${around}`];
    });
    return lines.length === 0 ? undefined : lines.join("; ");
}

/** A new day is the world's turn (EVT-8): the clocks to move as the time moved them, which they never do by themselves; how, the part new-day says (D-134). */
function clocksLine(newDays: number, to: string, clocks: string[]): string
{
    if (clocks.length === 0) {
        return "";
    }

    const days = newDays === 1 ? `A new day (${to.replace(/,.*$/, "")})` : `${newDays} new days (to ${to.replace(/,.*$/, "")})`;
    return `${days}, with clocks to move: ${shortList(clocks, " · ")}.`;
}

/** The events already due before time passed; with new ones due too, the advice above covers them. */
function stillDueLine(events: string[], afterDue: boolean): string
{
    if (events.length === 0) {
        return "";
    }

    return afterDue ? `Still due as well: ${events.join(" · ")}.` : `Still due: ${events.join(" · ")}. ${dueAdvice(events.length)}`;
}

/** "Alla locanda (since day 1, 18:00)": the open scene, if any; a scene that cannot be read is left to validate. */
function openSceneText(root: string): string | undefined
{
    const { scene } = readOpenScene(root);
    return scene === undefined ? undefined : `${scene.title}${scene.opened === undefined ? "" : ` (since ${scene.opened})`}`;
}
