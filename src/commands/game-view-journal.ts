// The player's journal (D-367, VIEW-8, VIEW-9): the quests the player character knows, as a video game's quest log, with their goals, counters, clock and
// deadline; and the story by its scenes, as chapters, each with what the diary tells of it.
import { type LogEntry, readLog } from "../core/log.ts";
import { comparableText } from "../core/text.ts";
import { goalsIn, links, type Page, textsIn, type World } from "../pages/index.ts";
import type { GameDate } from "../time/index.ts";
import { type Knowledge, knownText } from "./game-knowledge.ts";
import { measuresText, questMeasures } from "./game-quests.ts";

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
    /** Its clock, with what happens when it fills when the master named it (clock-name, D-369). */
    clock?: { value: number; max: number; name?: string; };
    /** Its deadline, a game date, with the minutes still to come, below zero once passed; none before the game has a date. */
    deadline?: { date: string; minutes?: number; };
    /** Its picture, as the character knows the quest (D-388). */
    picture?: { file: string; version: number; };
}

/** A scene as a chapter of the story (VIEW-9); without a title, what happened between scenes. */
export interface ShownChapter
{
    title?: string;
    /** Its number among the scenes, from the first (D-384). */
    number?: number;
    type?: string;
    place?: string;
    /** The place's kind and picture, as the player character knows the place, else that of the nearest place that holds it (D-384). */
    kind?: string;
    picture?: { file: string; version: number; };
    date?: string;
    summary?: string;
    open: boolean;
    facts: string[];
}

const statuses = ["open", "done", "failed"] as const;
// Lines of the game, not of the story: the saves made have their own section, the mode is the setup's, the rolls have their column (D-369).
const outOfStory = new Set(["saved", "mode-changed", "roll", "roll-revealed"]);

/** A page as the journal shows it: its kind and picture, as the player character knows it; a place's, else that of the nearest place that holds it. */
export type PlaceLook = (name: unknown) => Pick<ShownChapter, "kind" | "picture">;

/**
 * The journal (VIEW-8, VIEW-9): the quests the character knows, open ones first, the main ones first among them, then those changed last; and the chapters, the
 * last first, numbered from the first. `fact` tells a public line of the log as the diary does; `named` names a page as the character knows it; `look` gives a
 * place's kind and picture.
 */
export function shownJournal(
    root: string,
    world: World,
    knowledge: Knowledge,
    now: GameDate | undefined,
    fact: (entry: LogEntry) => string[],
    named: (name: unknown) => string | undefined,
    look: PlaceLook,
): { quests: ShownQuest[]; chapters: ShownChapter[]; }
{
    // Changed last, as the player saw it: by the public lines alone, never by what the master wrote unseen.
    const log = readLog(root).filter((entry) => entry.visibility === "public");
    const changed = new Map<string, number>();
    log.forEach((entry, index) => typeof entry.data.quest === "string" && changed.set(comparableText(entry.data.quest), index));
    const order = (quest: ShownQuest): number[] => [statuses.indexOf(quest.status), quest.status === "open" && quest.main ? 0 : 1, -(changed.get(comparableText(quest.name)) ?? -1)];
    const quests = [...knowledge.pages]
        .filter((page) => page.type === "quest" && (statuses as readonly string[]).includes(String(page.fields.status)))
        .map((page) => shownQuest(world, knowledge, page, now, named, look))
        .sort((one, other) => compareOrders(order(one), order(other)) || one.name.localeCompare(other.name));
    return { quests, chapters: chaptersOf(log, fact, named, look) };
}

/** "Ritrovare gli scomparsi: open, main, 1/2 goals, clues 3/5, I rapitori 2/6, deadline day 5, 18:00 (in 2d 4h)": a quest in the chat's words. */
export function questText(quest: ShownQuest): string
{
    const done = quest.goals.filter((goal) => goal.done).length;
    const measures = measuresText(quest);
    return [
        `${quest.name}: ${quest.status}`,
        ...(quest.main ? ["main"] : []),
        ...(quest.goals.length === 0 ? [] : [`${done}/${quest.goals.length} goals`]),
        ...(measures === "" ? [] : [measures]),
    ].join(", ");
}

function shownQuest(world: World, knowledge: Knowledge, page: Page, now: GameDate | undefined, named: (name: unknown) => string | undefined, look: PlaceLook): ShownQuest
{
    const { goals, rest } = goalsIn(knownText(world, knowledge, page));
    const giver = shownLink(page.fields.giver, named);
    const place = shownLink(page.fields.place, named);
    const picture = look(page.name).picture;
    return {
        name: page.name,
        status: page.fields.status as ShownQuest["status"],
        ...questMeasures(page, now),
        ...(giver === undefined ? {} : { giver }),
        ...(place === undefined ? {} : { place }),
        ...(picture === undefined ? {} : { picture }),
        text: rest,
        goals,
    };
}

/**
 * Who gave a quest, where it is, as the character knows them (VIEW-4): a page it knows by its name, one it does not by the words the link shows instead, if
 * any; a field without a link as it is written.
 */
function shownLink(value: unknown, named: (name: unknown) => string | undefined): string | undefined
{
    const text = textsIn(value)[0]?.trim();

    if (text === undefined || text === "") {
        return undefined;
    }

    const link = links(text)[0];

    if (link === undefined) {
        return text;
    }

    const alias = /\|([^\]]+)\]\]/.exec(text)?.[1]?.trim();
    return named(link.page) === undefined ? alias : (alias ?? named(link.page));
}

/**
 * The story as chapters (VIEW-9): each scene, from its opening to its close, with its summary and the facts the diary tells of it; the facts between scenes in
 * chapters of their own, the saves and the modes left out. The last first.
 */
function chaptersOf(entries: LogEntry[], fact: (entry: LogEntry) => string[], named: (name: unknown) => string | undefined, look: PlaceLook): ShownChapter[]
{
    const chapters: ShownChapter[] = [];
    let scene: ShownChapter | undefined;
    let scenes = 0;

    for (const entry of entries) {
        const data = entry.data;

        if (entry.type === "scene-opened") {
            scene = chapter(String(data.title ?? ""), ++scenes, data, entry, named, look);
            chapters.push(scene);
            continue;
        }

        if (entry.type === "scene-closed") {
            const closed = scene ?? chapter(String(data.title ?? ""), ++scenes, data, entry, named, look);

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

function chapter(title: string, number: number, data: Record<string, unknown>, entry: LogEntry, named: (name: unknown) => string | undefined, look: PlaceLook): ShownChapter
{
    const place = named(data.place);
    return {
        title,
        number,
        ...(typeof data.type === "string" ? { type: data.type } : {}),
        ...(place === undefined ? {} : { place, ...look(data.place) }),
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
