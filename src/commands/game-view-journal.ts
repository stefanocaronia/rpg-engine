// The player's journal (D-367, VIEW-8, VIEW-9): the quests the player character knows, as a video game's quest log, with their goals, counters, clock and
// deadline; and the story by its scenes, as chapters, each with what the diary tells of it.
import { type LogEntry, readLog } from "../core/log.ts";
import { comparableText } from "../core/text.ts";
import { readCounter } from "../counters/index.ts";
import { goalsIn, links, type Page, textsIn, type World } from "../pages/index.ts";
import { formatGameDate, type GameDate, minutesBetween, readGameDate } from "../time/index.ts";
import { type Knowledge, knownText } from "./game-knowledge.ts";

/** A quest as the journal shows it (VIEW-8). */
export interface ShownQuest
{
    name: string;
    status: "open" | "done" | "failed";
    main: boolean;
    giver?: string;
    place?: string;
    /** Its text as the character knows it, without the goals. */
    text: string;
    goals: { text: string; done: boolean; }[];
    /** Its fields that are counters with a maximum, as clues: 3/5. */
    counters: { field: string; value: number; max: number; }[];
    clock?: { value: number; max: number; };
    /** Its deadline, a game date, with the minutes still to come, below zero once passed; none before the game has a date. */
    deadline?: { date: string; minutes?: number; };
}

/** A scene as a chapter of the story (VIEW-9); without a title, what happened between scenes. */
export interface ShownChapter
{
    title?: string;
    type?: string;
    place?: string;
    date?: string;
    summary?: string;
    open: boolean;
    facts: string[];
}

const statuses = ["open", "done", "failed"] as const;
// Lines of the game, not of the story: the saves have their own section, and the mode is the setup's.
const outOfStory = new Set(["saved", "mode-changed"]);
// The fields of a quest the card shows apart; any other counter is a bar.
const ownFields = new Set(["status", "kind", "giver", "place", "deadline", "clock"]);

/**
 * The journal (VIEW-8, VIEW-9): the quests the character knows, open ones first, the main ones first among them, then those changed last; and the chapters, the
 * last first. `fact` tells a public line of the log as the diary does; `named` names a page as the character knows it.
 */
export function shownJournal(
    root: string,
    world: World,
    knowledge: Knowledge,
    now: GameDate | undefined,
    fact: (entry: LogEntry) => string[],
    named: (name: unknown) => string | undefined,
): { quests: ShownQuest[]; chapters: ShownChapter[]; }
{
    const log = readLog(root);
    const changed = new Map<string, number>();
    log.forEach((entry, index) => typeof entry.data.page === "string" && changed.set(comparableText(entry.data.page), index));
    const order = (quest: ShownQuest): number[] => [statuses.indexOf(quest.status), quest.status === "open" && quest.main ? 0 : 1, -(changed.get(comparableText(quest.name)) ?? -1)];
    const quests = [...knowledge.pages]
        .filter((page) => page.type === "quest" && (statuses as readonly string[]).includes(String(page.fields.status)))
        .map((page) => shownQuest(world, knowledge, page, now))
        .sort((one, other) => compareOrders(order(one), order(other)) || one.name.localeCompare(other.name));
    return { quests, chapters: chaptersOf(log.filter((entry) => entry.visibility === "public"), fact, named) };
}

/** "Ritrovare gli scomparsi: open, main, 1/2 goals, clues 3/5, clock 2/6, deadline day 5, 18:00 (in 2d 4h)": a quest in the chat's words. */
export function questText(quest: ShownQuest): string
{
    const done = quest.goals.filter((goal) => goal.done).length;
    return [
        `${quest.name}: ${quest.status}`,
        ...(quest.main ? ["main"] : []),
        ...(quest.goals.length === 0 ? [] : [`${done}/${quest.goals.length} goals`]),
        ...quest.counters.map((counter) => `${counter.field} ${counter.value}/${counter.max}`),
        ...(quest.clock === undefined ? [] : [`clock ${quest.clock.value}/${quest.clock.max}`]),
        ...(quest.deadline === undefined ? [] : [`deadline ${quest.deadline.date}`]),
    ].join(", ");
}

function shownQuest(world: World, knowledge: Knowledge, page: Page, now: GameDate | undefined): ShownQuest
{
    const { goals, rest } = goalsIn(knownText(world, knowledge, page));
    const counters = Object.entries(page.fields).filter(([field]) => !ownFields.has(field)).flatMap(([field, value]) => {
        const counter = readCounter(value);
        return counter?.max === undefined || counter.max < 1 ? [] : [{ field, value: counter.value, max: counter.max }];
    });
    const clock = readCounter(page.fields.clock);
    const deadline = readGameDate(page.fields.deadline);
    const giver = linkedName(page.fields.giver);
    const place = linkedName(page.fields.place);
    return {
        name: page.name,
        status: page.fields.status as ShownQuest["status"],
        main: comparableText(String(page.fields.kind ?? "")) === "main",
        ...(giver === undefined ? {} : { giver }),
        ...(place === undefined ? {} : { place }),
        text: rest,
        goals,
        counters,
        ...(clock?.max === undefined || clock.max < 1 ? {} : { clock: { value: clock.value, max: clock.max } }),
        ...(deadline === undefined ? {} : { deadline: { date: formatGameDate(deadline), ...(now === undefined ? {} : { minutes: minutesBetween(now, deadline) }) } }),
    };
}

/** The page a field links, else its text: who gave a quest, where it is. */
function linkedName(value: unknown): string | undefined
{
    const text = textsIn(value)[0];
    return text === undefined || text.trim() === "" ? undefined : (links(text)[0]?.page ?? text.trim());
}

/**
 * The story as chapters (VIEW-9): each scene, from its opening to its close, with its summary and the facts the diary tells of it; the facts between scenes in
 * chapters of their own, the saves and the modes left out. The last first.
 */
function chaptersOf(entries: LogEntry[], fact: (entry: LogEntry) => string[], named: (name: unknown) => string | undefined): ShownChapter[]
{
    const chapters: ShownChapter[] = [];
    let scene: ShownChapter | undefined;

    for (const entry of entries) {
        const data = entry.data;

        if (entry.type === "scene-opened") {
            scene = chapter(String(data.title ?? ""), data, entry, named);
            chapters.push(scene);
            continue;
        }

        if (entry.type === "scene-closed") {
            const closed = scene ?? chapter(String(data.title ?? ""), data, entry, named);

            if (scene === undefined) {
                chapters.push(closed);
            }

            closed.summary = typeof data.summary === "string" && data.summary !== "" ? data.summary : undefined;
            closed.open = false;
            scene = undefined;
            continue;
        }

        const told = outOfStory.has(entry.type) ? [] : fact(entry);

        if (told.length === 0) {
            continue;
        }

        const between = chapters.at(-1)?.title === undefined ? chapters.at(-1) : undefined;
        const holder = scene ?? between ?? { open: false, facts: [], ...(entry.date === undefined ? {} : { date: entry.date }) };

        if (holder !== scene && holder !== between) {
            chapters.push(holder);
        }

        holder.facts.push(...told);
    }

    return chapters.toReversed();
}

function chapter(title: string, data: Record<string, unknown>, entry: LogEntry, named: (name: unknown) => string | undefined): ShownChapter
{
    const place = named(data.place);
    return {
        title,
        ...(typeof data.type === "string" ? { type: data.type } : {}),
        ...(place === undefined ? {} : { place }),
        ...(entry.date === undefined ? {} : { date: entry.date }),
        open: true,
        facts: [],
    };
}

function compareOrders(one: number[], other: number[]): number
{
    const at = one.findIndex((value, index) => value !== other[index]);
    return at < 0 ? 0 : one[at] - other[at];
}
