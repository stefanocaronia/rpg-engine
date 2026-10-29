// The planned events as several commands use them (D-100–D-107, D-117, D-130–D-135): when they come due, what sets them off, what links to what changed.
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import type { Problem } from "../../core/problem.ts";
import { comparableText } from "../../core/text.ts";
import { formatCounter, readCounter } from "../../counters/index.ts";
import {
    backlinks,
    containerFieldOf,
    isCountedItem,
    isEmptyField,
    isInParty,
    linksIn,
    locate,
    newPageFields,
    type Page,
    pagesWithName,
    type PageType,
    pageWithPath,
    parsePageReference,
    standardValues,
    systemLabel,
    systemPageNamed,
    withPage,
    type World,
    writePage,
} from "../../pages/index.ts";
import { formatDuration, formatGameDate, type GameDate, minutesBetween, readGameDate } from "../../time/index.ts";
import { formatTrigger, readTriggers, type Trigger, type TriggerFacts, triggerHolds } from "../../triggers/index.ts";
import { shortList } from "./notes.ts";
import { newDatedLogEntry } from "./time.ts";

/** A planned event of the world, with its game date when the engine can read one. */
export interface PlannedEvent
{
    page: Page;
    date?: GameDate;
}

/** A planned event with a game date: it comes due at that date. */
export type DatedEvent = PlannedEvent & { date: GameDate; };

/** What a command set off (EVT-4, EVT-5): the events it made due, with why, those set off that wait for the date it gave them, and the world as it left it. */
export interface FiredEvents
{
    due: { name: string; text: string; }[];
    held: string[];
    world: World;
}

/** The planned events: those with a game date first, in order of date, then those without one. */
export function plannedEvents(world: World): PlannedEvent[]
{
    const events = world.pages.filter((page) => isPlannedEvent(page.type, page.fields)).map(plannedEventOf);
    const dated = events.filter(isDated).sort((first, second) => minutesBetween(second.date, first.date));
    return [...dated, ...events.filter((event) => !isDated(event))];
}

export function isDated(event: PlannedEvent): event is DatedEvent
{
    return event.date !== undefined;
}

/** The party and the containers of the world, as conditions read them (EVT-3). */
export function worldFacts(world: World): TriggerFacts
{
    const byName = new Map<string, Page[]>();

    for (const page of world.pages) {
        byName.set(comparableText(page.name), [...(byName.get(comparableText(page.name)) ?? []), page]);
    }

    const single = (name: string): Page | undefined => {
        const pages = byName.get(comparableText(name)) ?? [];
        return pages.length === 1 ? pages[0] : undefined;
    };

    return {
        party: world.pages.filter(isInParty).map((page) => page.name),
        isPage: (name) => single(name) !== undefined,
        containersOf: (name) => {
            const page = single(name);
            return page === undefined ? [] : locate(world, page).chain.map((holder) => holder.name);
        },
        statusOf: (name) => {
            const page = single(name);
            return page === undefined ? undefined : statusOf(page);
        },
    };
}

/**
 * Whether a planned event is due (EVT-1): its date has come. Without a date it can read, or before the game has a date,
 * also when its clock is full or one of its conditions holds.
 */
export function isDue(event: PlannedEvent, now: GameDate | undefined, facts: TriggerFacts): boolean
{
    if (event.date !== undefined && now !== undefined) {
        return minutesBetween(now, event.date) <= 0;
    }

    return triggerOf(event.page, facts) !== undefined;
}

/** The planned events due now (EVT-1), in the order of plannedEvents. */
export function dueEvents(world: World, now: GameDate | undefined, facts = worldFacts(world)): PlannedEvent[]
{
    return plannedEvents(world).filter((event) => isDue(event, now, facts));
}

/** A due event as outputs name it, with where it happens, which tells who sees it: "Sparizione di Rosa (day 1, 23:00, at Guadoscuro)". */
export function dueText(event: PlannedEvent): string
{
    const place = typeof event.page.fields.place === "string" && !isEmptyField(event.page.fields.place) ? parsePageReference(event.page.fields.place).name : undefined;
    return withParts(event.page.name, [event.date === undefined ? undefined : formatGameDate(event.date), place === undefined ? undefined : `at ${place}`]);
}

/** A planned event still to come, with what brings it (EVT-9): "La marcia della Confraternita (clock 2/4, day 3, 06:00, in 1d)", "I servitori si svegliano (when party in Ossario)". */
export function plannedText(event: PlannedEvent, now: GameDate | undefined): string
{
    const clock = clockOf(event.page.fields.clock);
    const until = now === undefined || event.date === undefined ? 0 : minutesBetween(now, event.date);
    const triggers = eventTriggers(event.page).map((trigger) => formatTrigger(trigger, false));
    return withParts(event.page.name, [
        clock === undefined ? undefined : `clock ${formatCounter(clock)}`,
        event.date === undefined ? undefined : formatGameDate(event.date),
        until > 0 ? `in ${formatDuration(until)}` : undefined,
        triggers.length === 0 ? undefined : `when ${triggers.join(" or ")}`,
    ]);
}

/** What to do with due events (D-106): seen or heard, a scene; out of sight, off screen; then their status, or a later date. */
export function dueAdvice(count: number): string
{
    const after = "happened if it went as written, cancelled if it never will; or give it a later date if it is put off or tried again. If what it needs is gone, cancel it, "
        + "or let whoever wanted it try another way; never bend the world back to the written story.";
    return count === 1
        ? `If the characters see or hear it, play it as a scene; if not, it happens off screen, and they will find its traces. Then set its status: ${after}`
        : `Play as scenes those the characters see or hear; the others happen off screen, and they will find their traces. Then set each one's status: ${after}`;
}

/**
 * Fires the planned events that a command set off (EVT-4): each gets the present date, unless it has one that has come, and a hidden line in the log.
 * `before` and `after` are the world before and after the command. Returns the events the command made due, fired or not (EVT-5).
 */
export function fireEvents(root: string, context: Context, before: World, after: World, now: GameDate | undefined): FiredEvents
{
    const { fired, held } = eventsToFire(before, after, now);
    let world = after;

    for (const { event, cause, date } of fired) {
        if (date !== undefined) {
            world = withPage(world, event.page, writePage(world, event.page.name, undefined, { set: { date } }).page);
        }

        const was = date === undefined || isEmptyField(event.page.fields.date) ? undefined : event.page.fields.date;
        appendLogEntry(root, newDatedLogEntry(root, context, "event-due", "hidden", { event: event.page.name, since: cause, date, was }));
    }

    const causes = new Map(fired.map(({ event, cause }) => [event.page.path, cause]));
    const wasDue = new Set(dueEvents(before, now).map((event) => event.page.path));
    const due = dueEvents(world, now).filter((event) => !wasDue.has(event.page.path)).map((event) => {
        const cause = causes.get(event.page.path);
        return { name: event.page.name, text: cause === undefined ? dueText(event) : `${dueText(event)}, since ${cause}` };
    });
    return { due, held: held.map((event) => plannedText(event, now)), world };
}

/**
 * The events that fire between the world before a command and the world after it (EVT-4): planned after it, set off after it and not before, and not due before it.
 * Each with what set it off and the date to write on it: the present one, when the game has one and the event has none that has come. An event whose name two pages
 * share never fires, since no write could pick it. An event given a date still to come by this very command waits for it: those are `held`.
 */
export function eventsToFire(before: World, after: World, now: GameDate | undefined): { fired: { event: PlannedEvent; cause: string; date?: string; }[]; held: PlannedEvent[]; }
{
    const factsBefore = worldFacts(before);
    const factsAfter = worldFacts(after);
    const fired: { event: PlannedEvent; cause: string; date?: string; }[] = [];
    const held: PlannedEvent[] = [];

    for (const event of plannedEvents(after)) {
        const cause = triggerOf(event.page, factsAfter);
        const old = pageWithPath(before, event.page.path);
        const wasPlanned = old !== undefined && isPlannedEvent(old.type, old.fields);
        const dateChanged = JSON.stringify(old?.fields.date) !== JSON.stringify(event.page.fields.date);
        // Due before, it already came; set off before with the same date, it waits for that date, put off or given by an earlier command.
        const cameOrWaits = wasPlanned && (isDue(plannedEventOf(old), now, factsBefore) || (triggerOf(old, factsBefore) !== undefined && !dateChanged));

        if (cause === undefined || cameOrWaits || !factsAfter.isPage(event.page.name)) {
            continue;
        }

        const comesLater = now !== undefined && event.date !== undefined && minutesBetween(now, event.date) > 0;

        if (comesLater && dateChanged) {
            held.push(event);
        } else {
            fired.push({ event, cause, date: now !== undefined && (event.date === undefined || comesLater) ? formatGameDate(now) : undefined });
        }
    }

    return { fired, held };
}

/** "Now due: …", with how to play them; empty when nothing came due. */
export function nowDueNote(due: FiredEvents["due"]): string
{
    return due.length === 0 ? "" : `Now due: ${due.map((event) => event.text).join(" · ")}. ${dueAdvice(due.length)}`;
}

/** The events set off that wait for the date this command gave them (EVT-4); empty when there are none. */
export function heldNote(held: string[]): string
{
    return held.length === 0 ? "" : `Set off, but given a date still to come, so waiting for it: ${held.join(" · ")}. To have it come now, unset its date.`;
}

/**
 * What a write changed that matters to the story (D-117, EVT-7): a page's status as the tools read it, or something leaving a container, but a living member of the party
 * moving, which is the game itself (D-146). The planned events and the planned or open quests that link to the page or to what left, as a note for the master to judge;
 * `skipped` are the events already said due.
 */
export function consequencesNotes(world: World, before: Page | undefined, after: Page, skipped: string[], now: GameDate | undefined): string[]
{
    if (before === undefined) {
        return [];
    }

    const party = new Set(world.pages.filter(isInParty).map((page) => comparableText(page.name)));
    const field = containerFieldOf(after.type);
    const kept = new Set(linksIn(field === undefined ? undefined : after.fields[field]).map(comparableText));
    const left = linksIn(field === undefined ? undefined : before.fields[field]).map(comparableText).filter((name) => !kept.has(name) && !party.has(name));
    const subjects = new Set([...(statusOf(before) === statusOf(after) ? [] : [comparableText(after.name)]), ...left]);
    return linkedStoryNotes(world, world.pages.filter((page) => subjects.has(comparableText(page.name))), skipped, now);
}

/**
 * For each page, the planned events and the planned or open quests linked to it, as a note for the master to judge (D-117, EVT-7, CON-5); `skipped` are the events
 * already said due.
 */
export function linkedStoryNotes(world: World, pages: Page[], skipped: string[], now: GameDate | undefined): string[]
{
    const shown = new Set(skipped.map(comparableText));

    return pages.flatMap((page) => {
        const linked = backlinks(world, page).map((link) => link.page).filter((other) => isOpenStory(other) && !shown.has(comparableText(other.name)));
        return linked.length === 0 ? [] : [`Linked to ${page.name}: ${shortList(linked.map((other) => storyText(other, now)), " · ")}. ${storyAdvice(linked)}`];
    });
}

/** The clocks of the planned events not due yet, with who carries them (EVT-8, D-135): "La marcia della Confraternita 2/4 (Fratello Odo)". */
export function clocksToMove(world: World, now: GameDate | undefined, facts = worldFacts(world)): string[]
{
    return plannedEvents(world).filter((event) => !isDue(event, now, facts)).flatMap((event) => {
        const clock = clockOf(event.page.fields.clock);
        const makers = linksIn(event.page.fields.by);
        return clock === undefined ? [] : [`${event.page.name} ${formatCounter(clock)}${makers.length === 0 ? "" : ` (${makers.join(", ")})`}`];
    });
}

/** Why the date of a planned event cannot be used: a planned event comes due at its date, so the engine must read it (D-100). Undefined for anything else. */
export function plannedEventDateProblem(type: PageType | undefined, fields: Record<string, unknown>): string | undefined
{
    if (!isPlannedEvent(type, fields) || isEmptyField(fields.date) || readGameDate(fields.date) !== undefined) {
        return undefined;
    }

    return `The date ${JSON.stringify(fields.date)} is not a game date: a planned event needs one the engine can read, such as day 1, 23:00. Words, such as two winters ago, fit only an event that has happened.`;
}

/** What is wrong with an event's clock or conditions, among the fields a write changed (EVT-10); undefined when they read. Statuses are checked on the pages that exist. */
export function eventFieldsProblem(world: World, fields: Record<string, unknown>, changed: string[]): string | undefined
{
    return (changed.includes("clock") ? clockProblem(fields.clock) : undefined) ?? (changed.includes("when") ? whenProblem(world, fields.when) : undefined);
}

/** Conditions on pages that do not exist yet: they cannot hold until a page has that name, which may be an alias of another (EVT-10). */
export function conditionNotes(world: World, when: unknown): string[]
{
    const read = isEmptyField(when) ? { triggers: [] } : readTriggers(when);
    const named = "triggers" in read ? read.triggers.flatMap(namedPages) : [];

    return [...new Set(named)].filter((name) => pagesWithName(world, name).length === 0).map((name) => {
        const system = systemPageNamed(world, name);

        if (system !== undefined) {
            return systemConditionText(system);
        }

        const aliased = world.pages.find((page) => textsOf(page.fields.aliases).some((alias) => comparableText(alias) === comparableText(name)));
        const hint = aliased === undefined ? "" : ` ${aliased.name} has ${name} among its aliases: write [[${aliased.name}]].`;
        return `[[${name}]] is not a page yet: the condition on it cannot hold until a page has that name.${hint}`;
    });
}

/** The problems of the planned events (D-100, EVT-10, D-117): dates the engine cannot read, clocks and conditions that do not read, events made to happen by the dead. */
export function eventProblems(world: World): Problem[]
{
    return world.pages.filter((page) => page.type === "event").flatMap((page) => {
        const problem = (message: string | undefined, fix: string): Problem[] => (message === undefined ? [] : [{ path: page.path, message, fix }]);
        const dead = isPlannedEvent(page.type, page.fields) ? deadMakers(world, page) : [];
        const makers = dead.length === 1 ? `${dead[0]}, who makes it happen, is` : `${dead.join(" and ")}, who make it happen, are`;
        const date = plannedEventDateProblem(page.type, page.fields) === undefined ? undefined : `${page.name} is planned, but its date ${JSON.stringify(page.fields.date)} is not a game date.`;
        // A clock or conditions of the wrong kind of value are reported once, with the standard fields.
        const clock = typeof page.fields.clock === "string" || typeof page.fields.clock === "number" ? clockProblem(page.fields.clock) : undefined;
        const when = textsOf(page.fields.when).length === (Array.isArray(page.fields.when) ? page.fields.when.length : 1) ? whenProblem(world, page.fields.when) : undefined;
        return [
            ...problem(date, `write ${page.name}, set date to a game date such as day 1, 23:00, or status to happened if it already took place`),
            ...problem(clock === undefined ? undefined : `${page.name}: ${clock}`, `write ${page.name}, set clock to current/max, such as 0/4, or unset it`),
            ...problem(when === undefined ? undefined : `${page.name}: ${when}`, `write ${page.name}, set when to a condition such as party in [[Place]], or unset it`),
            ...problem(dead.length === 0 ? undefined : `${page.name} is planned, but ${makers} dead.`, "cancel it, give it to someone else with by, or write what happens instead"),
        ];
    });
}

/** What the master may write of the stories linked to a page: an event's status, date or by; a quest's status, when its story has ended. */
function storyAdvice(linked: Page[]): string
{
    const events = linked.some((page) => page.type !== "quest") ? "If an event no longer goes as planned, write it: its status, date or by." : "";
    const quests = linked.some((page) => page.type === "quest") ? "If the story of a quest has ended, set its status." : "";
    return [events, quests].filter((advice) => advice !== "").join(" ");
}

/** What sets an event off now: its full clock, or the first of its conditions that holds; undefined when nothing does (EVT-2, EVT-3). */
function triggerOf(page: Page, facts: TriggerFacts): string | undefined
{
    const clock = clockOf(page.fields.clock);

    if (clock !== undefined && clock.value >= clock.max) {
        return `clock ${formatCounter(clock)}`;
    }

    const holding = eventTriggers(page).find((trigger) => triggerHolds(trigger, facts));
    return holding === undefined ? undefined : formatTrigger(holding, false);
}

/** An event is planned when its status says so, or when it has none (D-107). */
function isPlannedEvent(type: PageType | undefined, fields: Record<string, unknown>): boolean
{
    return type === "event" && (fields.status === "planned" || isEmptyField(fields.status));
}

function plannedEventOf(page: Page): PlannedEvent
{
    return { page, date: readGameDate(page.fields.date) };
}

/** Why a clock does not read: it is current/max, with a maximum of at least 1 (EVT-2). */
function clockProblem(value: unknown): string | undefined
{
    return isEmptyField(value) || clockOf(value) !== undefined ? undefined : `The clock ${JSON.stringify(value)} is not a clock: write it as current/max, with a maximum of at least 1, such as 0/4.`;
}

/** Why conditions do not read, or ask a page for a status its type does not have. */
function whenProblem(world: World, when: unknown): string | undefined
{
    if (isEmptyField(when)) {
        return undefined;
    }

    const read = readTriggers(when);
    return "problem" in read ? read.problem : read.triggers.map((trigger) => statusProblem(world, trigger) ?? systemConditionProblem(world, trigger)).find((problem) => problem !== undefined);
}

/** A condition on a page of the game system, which no page of the campaign hides, or on a kind counted in stacks: it can never hold (SYS-2, STK-3). */
function systemConditionProblem(world: World, trigger: Trigger): string | undefined
{
    const system = namedPages(trigger)
        .filter((name) => pagesWithName(world, name).length === 0)
        .map((name) => systemPageNamed(world, name))
        .find((page) => page !== undefined);
    const kind = namedPages(trigger).flatMap((name) => pagesWithName(world, name).slice(0, 1)).find((page) => isCountedItem(world, page));

    if (system === undefined && kind !== undefined) {
        return `[[${kind.name}]] is a kind, counted in stacks: never anywhere, so the condition on it can never hold. Name a thing with a story of its own instead.`;
    }

    return system === undefined ? undefined : systemConditionText(system);
}

/** "[[Wolf]] is a creature of the system 5e, a kind: never anywhere, never dead, so the condition on it can never hold. …" */
function systemConditionText(page: Page): string
{
    return `[[${page.name}]] is ${systemLabel(page)}, a kind: never anywhere, never dead, so the condition on it can never hold. `
        + `Name a page of the campaign instead, such as one with ${page.type === "item" ? "item" : "creature"}=[[${page.name}]].`;
}

/** The characters an event names in by who are dead (EVT-6). */
function deadMakers(world: World, event: Page): string[]
{
    return linksIn(event.fields.by).flatMap((name) => {
        const pages = pagesWithName(world, name);
        return pages.length === 1 && pages[0].type === "character" && pages[0].fields.status === "dead" ? [pages[0].name] : [];
    });
}

/** A status condition on a page whose type has no such status, such as [[Ossario]] dead; pages that do not exist are left to the notes and the link check. */
function statusProblem(world: World, trigger: Trigger): string | undefined
{
    const pages = trigger.kind === "status" ? pagesWithName(world, trigger.page) : [];

    if (trigger.kind !== "status" || pages.length !== 1) {
        return undefined;
    }

    const page = pages[0];
    const values = standardValues(page.type, "status");

    if (values === undefined) {
        return `[[${page.name}]] ${trigger.status} can never hold: ${page.name} has no status. Conditions on it are "[[${page.name}]] in [[Place]]" or "[[${page.name}]] in party".`;
    }

    return values.includes(trigger.status) ? undefined : `[[${page.name}]] ${trigger.status} can never hold: the status of ${page.name} is one of ${values.join(", ")}.`;
}

/** A page's status as the tools read it (EVT-3): a character without one is alive, a quest or an event without one is planned; undefined for a type without statuses. */
function statusOf(page: Page): string | undefined
{
    if (page.type === undefined || standardValues(page.type, "status") === undefined) {
        return undefined;
    }

    return isEmptyField(page.fields.status) ? String(newPageFields(page.type).status ?? "alive") : String(page.fields.status);
}

function clockOf(value: unknown): { value: number; max: number; } | undefined
{
    const counter = readCounter(value);
    return counter?.max !== undefined && counter.max >= 1 ? { value: counter.value, max: counter.max } : undefined;
}

/** The conditions an event listens to; none when its when cannot be read, which validate reports (EVT-10). */
function eventTriggers(page: Page): Trigger[]
{
    if (isEmptyField(page.fields.when)) {
        return [];
    }

    const read = readTriggers(page.fields.when);
    return "triggers" in read ? read.triggers : [];
}

/** The pages a condition names. */
function namedPages(trigger: Trigger): string[]
{
    return trigger.kind === "status" ? [trigger.page] : [trigger.what, trigger.where].flatMap((subject) => ("page" in subject ? [subject.page] : []));
}

/** A planned event, or a planned or open quest: what a change in the story may change. */
function isOpenStory(page: Page): boolean
{
    return isPlannedEvent(page.type, page.fields) || (page.type === "quest" && ["planned", "open"].includes(statusOf(page) ?? ""));
}

function storyText(page: Page, now: GameDate | undefined): string
{
    return page.type === "quest" ? `${page.name} (quest, ${statusOf(page) ?? ""})` : plannedText(plannedEventOf(page), now);
}

/** The texts a field holds: itself when it is text, the texts in it when it is a list. */
function textsOf(value: unknown): string[]
{
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : typeof value === "string" ? [value] : [];
}

/** "Name (a, b)", or the name alone when there are no parts. */
function withParts(name: string, parts: (string | undefined)[]): string
{
    const given = parts.filter((part) => part !== undefined);
    return given.length === 0 ? name : `${name} (${given.join(", ")})`;
}
