// What the World section shows besides the map (D-276, VIEW-11): the pages the player character knows, each as it knows it, the documents it has or read, and
// the calendar with the deadlines it knows and the days of its scenes.
import type { Context } from "../../core/context.ts";
import { firstSentence } from "../../core/text.ts";
import { isPartyMember, isPlayerCharacter, locate, type Page, withoutFencedBlocks, type World } from "../../pages/index.ts";
import { type CalendarMonth, formatGameDate, readGameDate } from "../../time/index.ts";
import { shownImage } from "./images.ts";
import { type Knowledge, knownIntroduction, knownText, knowsPage, pageKnownBy, writesKnownText } from "./knowledge.ts";
import { calendarDayOf, campaignCalendar, readPresent } from "./time.ts";
import { placeKind } from "./view-map.ts";

/** A page the player character knows, as the World section lists it (VIEW-11): its name and type, a place's kind and the places that hold it, the opening of its text. */
export interface KnownEntry
{
    name: string;
    type: string;
    /** A place's kind, as the map gives it (VIEW-7). */
    kind?: string;
    /** For a place, the places that hold it that the character knows, the nearest first (VIEW-7). */
    within?: string[];
    /** The first paragraph of its introduction as the character knows it (VIEW-3), as the page writes it. */
    summary: string;
    picture?: { file: string; version: number; };
    /** A companion of the party. */
    companion?: true;
    /** With more than one player character, those who know it, when not all of them do (VIEW-12). */
    knownBy?: string[];
}

/** A document the player character has or read (VIEW-11): an item with document, such as letter or map, its text as the character knows it (VIEW-3) and its picture. */
export interface ShownDocument
{
    name: string;
    /** What it is, as the page writes it: letter, notice, map… */
    document: string;
    text: string;
    picture?: { file: string; version: number; };
    /** The character carries it now; with more than one player character, one of them does. */
    carried: boolean;
    /** With more than one player character, the one who carries it (VIEW-12). */
    carrier?: string;
    /** With more than one player character, those who know it, when not all of them do (VIEW-12). */
    knownBy?: string[];
}

/** The calendar as the player character knows it (VIEW-11, TIM-8): today, the months when the story has a calendar, the deadlines of its quests and the days of its scenes. */
export interface ShownCalendar
{
    /** Now, as a game date: day 3, 14:20. */
    now?: string;
    /** Today's game day, from 1. */
    today?: number;
    /** The months in order, when the story has a calendar start. */
    months?: CalendarMonth[];
    /** Today as a day of the calendar: the day of its month, the month by its place in months, its season, the year when the start gave one. */
    date?: { day: number; month: number; season?: string; year?: number; };
    /** The deadlines of the open quests the character knows, the soonest first: each with its game day and the minutes left, below zero once passed. */
    deadlines: { quest: string; main: boolean; date: string; day: number; minutes?: number; }[];
    /** The scenes of the story, in order, by the game day they opened on: their number from the first, their title, and their place as the character knows it. */
    scenes: { day: number; number: number; title: string; place?: string; }[];
}

/**
 * The pages the character knows, out of itself, its quests, which the journal has, its documents, which have their own list, and the game system's (VIEW-11);
 * an item only when its own text tells something.
 */
export function knownEntries(root: string, context: Context, world: World, knowledge: Knowledge): KnownEntry[]
{
    const known = (base: Page): boolean => knowsPage(knowledge, base);
    return [...knowledge.pages]
        .filter((page) => !isPlayerCharacter(page) && page.system === undefined && page.type !== "quest")
        .filter((page) => page.type !== "item" || (documentOf(page) === undefined && writesKnownText(knowledge, page)))
        .map((page) => {
            const kind = page.type === "place" ? placeKind(page) : undefined;
            const within = page.type === "place" ? locate(world, page).chain.filter(known).map((holder) => holder.name) : [];
            const picture = shownImage(root, context, world, page, known);
            // The opening of its prose: a map's block says nothing as a line.
            const summary = withoutFencedBlocks(knownIntroduction(world, knowledge, page)).trim().split(/\n\s*\n/)[0].trim();
            const knownBy = pageKnownBy(knowledge, page);
            return {
                name: page.name,
                type: page.type ?? "page",
                ...(kind === undefined ? {} : { kind }),
                ...(within.length === 0 ? {} : { within }),
                summary,
                ...(picture === undefined ? {} : { picture }),
                ...(page.type === "character" && page.fields.role === "companion" && isPartyMember(page) ? { companion: true as const } : {}),
                ...(knownBy === undefined ? {} : { knownBy }),
            };
        })
        .sort((one, other) => one.name.localeCompare(other.name));
}

/** The documents the character knows, the items with document (VIEW-11): those it carries first, then by name. */
export function knownDocuments(root: string, context: Context, world: World, knowledge: Knowledge): ShownDocument[]
{
    const known = (base: Page): boolean => knowsPage(knowledge, base);
    return [...knowledge.pages].flatMap((page) => {
        const document = page.system === undefined ? documentOf(page) : undefined;

        if (document === undefined) {
            return [];
        }

        const picture = shownImage(root, context, world, page, known);
        // Who carries it, of the player characters (VIEW-12).
        const chain = locate(world, page).chain;
        const carrier = (knowledge.each?.map((one) => one.pc) ?? [knowledge.pc]).find((player) => chain.includes(player));
        const knownBy = pageKnownBy(knowledge, page);
        return [{
            name: page.name,
            document,
            text: knownText(world, knowledge, page),
            ...(picture === undefined ? {} : { picture }),
            carried: carrier !== undefined,
            ...(carrier === undefined || knowledge.each === undefined ? {} : { carrier: carrier.name }),
            ...(knownBy === undefined ? {} : { knownBy }),
        }];
    }).sort((one, other) => Number(other.carried) - Number(one.carried) || one.name.localeCompare(other.name));
}

/** The calendar of the World section (VIEW-11), from the journal: its quests, with their deadlines, and its chapters, the last first, with their numbers and dates. */
export function shownCalendar(
    root: string,
    context: Context,
    journal: {
        quests: { name: string; status: string; main: boolean; deadline?: { date: string; minutes?: number; }; }[];
        chapters: { title?: string; number?: number; date?: string; place?: string; }[];
    },
): ShownCalendar
{
    const now = readPresent(root).date;
    const today = now === undefined ? undefined : calendarDayOf(root, context, now.day);
    const { calendar } = campaignCalendar(root, context);
    const month = today === undefined ? -1 : calendar.months.findIndex((one) => one.name === today.month);
    const scenes = journal.chapters.toReversed().flatMap((chapter) => {
        const day = readGameDate(chapter.date)?.day;
        return day === undefined || chapter.number === undefined ? [] : [{ day, number: chapter.number, title: chapter.title ?? "", ...(chapter.place === undefined ? {} : { place: chapter.place }) }];
    });
    // The soonest first, by the hour of the day too, which the minutes left give only once the game has a date.
    const minute = (date: string): number => readGameDate(date)?.minute ?? 0;
    return {
        ...(now === undefined ? {} : { now: formatGameDate(now), today: now.day }),
        ...(today === undefined || month === -1
            ? {}
            : {
                months: calendar.months,
                date: { day: today.day, month, ...(today.season === undefined ? {} : { season: today.season }), ...(today.year === undefined ? {} : { year: today.year }) },
            }),
        deadlines: journal.quests.flatMap(({ name, status, main, deadline }) => {
            const date = status === "open" && deadline !== undefined ? readGameDate(deadline.date) : undefined;
            return date === undefined || deadline === undefined ? [] : [{ quest: name, main, date: deadline.date, day: date.day, ...(deadline.minutes === undefined ? {} : { minutes: deadline.minutes }) }];
        }).sort((one, other) => one.day - other.day || minute(one.date) - minute(other.date)),
        scenes,
    };
}

/** "Varro (character): An alchemist of the ford.": a known page in the chat's words, with the first sentence of what the character knows of it. */
export function knownEntryText(entry: KnownEntry): string
{
    const summary = firstSentence(entry.summary.replace(/\s*\n\s*/g, " "));
    const knownBy = entry.knownBy === undefined ? "" : `, known to ${entry.knownBy.join(" and ")} alone`;
    return `${entry.name} (${entry.kind ?? (entry.companion === true ? "companion" : entry.type)}${entry.within === undefined ? "" : `, in ${entry.within.join(" › ")}`}${knownBy})${summary === "" ? "" : `: ${summary}`}`;
}

/** What an item is as a document, such as letter: its document field; undefined for anything else. */
function documentOf(page: Page): string | undefined
{
    const value = page.type === "item" ? page.fields.document : undefined;
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}
