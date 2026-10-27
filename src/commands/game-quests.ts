// The quests as several commands use them: an open quest whose goals are all ticked (D-239), whose story is the master's to end, as the playtests showed the
// master leaving such a quest open for evenings, so the story's reward, a new level with milestones included, never came; what a quest measures, its counters,
// clock and deadline, which the journal shows and status tells the master (D-367, D-369); and the line a quest's change of status leaves in the story.
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { everyGoalTicked, isEmptyField, type Page, type World } from "../pages/index.ts";
import { formatDuration, formatGameDate, type GameDate, minutesBetween, readGameDate } from "../time/index.ts";
import { newDatedLogEntry } from "./game-time.ts";

// What the master does with such a quest.
const advice = "if the story has ended it, write status done";
// The fields of a quest the journal shows apart; any other counter is a bar.
const ownFields = new Set(["status", "kind", "giver", "place", "deadline", "clock", "clock-name"]);
// The statuses the player character knows a quest by (D-250).
const knownStatuses = ["open", "done", "failed"];

/** What a quest measures (D-367): its counters with a maximum, its clock with its name, its deadline with the game minutes left, and whether it is the main one. */
export interface QuestMeasures
{
    main: boolean;
    counters: { field: string; value: number; max: number; }[];
    clock?: { value: number; max: number; name?: string; };
    deadline?: { date: string; minutes?: number; };
}

/** What a quest measures, as its fields write it; a field that does not read is left out, and validate says why. */
export function questMeasures(page: Page, now: GameDate | undefined): QuestMeasures
{
    const counters = Object.entries(page.fields).filter(([field]) => !ownFields.has(field)).flatMap(([field, value]) => {
        const counter = readCounter(value);
        return counter?.max === undefined || counter.max < 1 ? [] : [{ field, value: counter.value, max: counter.max }];
    });
    const clock = readCounter(page.fields.clock);
    const name = typeof page.fields["clock-name"] === "string" && page.fields["clock-name"].trim() !== "" ? page.fields["clock-name"].trim() : undefined;
    const deadline = readGameDate(page.fields.deadline);
    return {
        main: (Array.isArray(page.fields.kind) ? page.fields.kind : [page.fields.kind]).some((kind) => comparableText(String(kind ?? "")) === "main"),
        counters,
        ...(clock?.max === undefined || clock.max < 1 ? {} : { clock: { value: clock.value, max: clock.max, ...(name === undefined ? {} : { name }) } }),
        ...(deadline === undefined ? {} : { deadline: { date: formatGameDate(deadline), ...(now === undefined ? {} : { minutes: minutesBetween(now, deadline) }) } }),
    };
}

/** "clues 3/5, I rapitori lasciano la torre 2/6, deadline day 27, 10:00 (in 1d 2h)": what a quest measures, in the chat's words; empty when nothing. */
export function measuresText(measures: QuestMeasures): string
{
    const deadline = measures.deadline;
    const left = deadline?.minutes === undefined ? "" : deadline.minutes <= 0 ? " (passed)" : ` (in ${formatDuration(deadline.minutes)})`;
    return [
        ...measures.counters.map((counter) => `${counter.field} ${counter.value}/${counter.max}`),
        ...(measures.clock === undefined ? [] : [`${measures.clock.name ?? "clock"} ${measures.clock.value}/${measures.clock.max}`]),
        ...(deadline === undefined ? [] : [`deadline ${deadline.date}${left}`]),
    ].join(", ");
}

/**
 * What status says of an open quest (D-239, D-369): whether it is the main one, what it measures, and what to do when every goal is ticked or its deadline
 * passed: the story's end is the master's to say, never the engine's.
 */
export function openQuestText(page: Page, now: GameDate | undefined): string
{
    const measures = questMeasures(page, now);
    const passed = measures.deadline?.minutes !== undefined && measures.deadline.minutes <= 0;
    const notes = [
        ...(measures.main ? ["main"] : []),
        ...(measuresText(measures) === "" ? [] : [measuresText(measures)]),
        ...(isTickedOpenQuest(page) ? [`every goal ticked: ${advice}`] : []),
        ...(passed ? ["deadline passed: if the story has ended it, write status failed"] : []),
    ];
    return notes.length === 0 ? page.name : `${page.name} (${notes.join("; ")})`;
}

/** Whether an adventure is under way or ready (D-530 (8)): a quest of the campaign open or planned, or written without a status, as a new one starts planned. */
export function adventureUnderWay(world: World): boolean
{
    return world.pages.some((page) => page.type === "quest" && page.system === undefined && !["done", "failed"].includes(comparableText(String(page.fields.status ?? ""))));
}

/** What write says when it makes a quest (D-239): every goal ticked. */
export function tickedQuestNotes(existing: Page | undefined, page: Page): string[]
{
    return isTickedOpenQuest(page) && !isTickedOpenQuest(existing) ? [tickedQuestNote(page)] : [];
}

/** What scene close says of each open quest whose goals are all ticked, and write of the one it leaves so. */
export function tickedQuestNote(page: Page): string
{
    return `Every goal of ${page.name} is ticked and it is still open: ${advice}.`;
}

/**
 * What write says as a quest opens, made open or opened from planned (D-367, D-369): what the player's journal shows of it, so that the master writes it there.
 * Kept in the output, never in the instructions, since only who opens a quest needs it.
 */
export function newQuestNotes(existing: Page | undefined, page: Page): string[]
{
    return page.type === "quest" && page.fields.status === "open" && existing?.fields.status !== "open"
        ? [
            "The player's journal shows this quest now. Give it only what the story has, and keep each up to date: goals as - [ ] lines in the character's words, "
            + "- [x] when done, new ones as they come up; a counter of steps the character can count, such as clues: 0/5; clock: 0/6 for a danger the character sees "
            + "growing, with clock-name saying what happens when it fills; deadline: the date the character was given, such as day 27, 10:00, with what happens then "
            + "as a planned event on that date; giver and place as links; kind: main for the one main quest; what was promised, in the text.",
        ]
        : [];
}

/** A public line as a quest the character knows is taken, done or failed (D-369): the story tells it. */
export function logQuestChange(root: string, context: Context, existing: Page | undefined, page: Page): void
{
    const status = String(page.fields.status ?? "");

    if (page.type === "quest" && knownStatuses.includes(status) && existing?.fields.status !== page.fields.status) {
        appendLogEntry(root, newDatedLogEntry(root, context, "quest-changed", "public", { quest: page.name, status }));
    }
}

/** The quests whose deadline or clock does not read (D-369): the journal leaves them out, so validate says how to write them. */
export function questProblems(world: World): Problem[]
{
    return world.pages.filter((page) => page.type === "quest").flatMap((page): Problem[] => [
        ...(!isEmptyField(page.fields.deadline) && readGameDate(page.fields.deadline) === undefined
            ? [{ path: page.path, message: `The deadline of ${page.name}, ${JSON.stringify(page.fields.deadline)}, is not a game date.`, fix: "write it as day 27, 10:00" }]
            : []),
        ...(!isEmptyField(page.fields.clock) && (readCounter(page.fields.clock)?.max ?? 0) < 1
            ? [{ path: page.path, message: `The clock of ${page.name}, ${JSON.stringify(page.fields.clock)}, has no maximum.`, fix: "write it as 0/6" }]
            : []),
    ]);
}

/** Whether a page is an open quest whose goals are all ticked. */
export function isTickedOpenQuest(page: Page | undefined): boolean
{
    return page?.type === "quest" && page.fields.status === "open" && everyGoalTicked(page.body);
}
