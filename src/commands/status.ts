import { z } from "zod";
import { missingSettings, readSettings, requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { readCounter } from "../counters/index.ts";
import { isPartyMember, isStandardField, loadWorld, locate, type Page, type World } from "../pages/index.ts";
import { formatGameDate, minutesBetween } from "../time/index.ts";
import { dueAdvice, eventText, isDated, type PlannedEvent, plannedEvents, problemText, readPresent } from "./game-time.ts";
import { missingSettingsNote } from "./notes.ts";
import { campaignProblems } from "./problems.ts";

// Lists in the status show this many names, then say how many more there are and how to find them.
const shownNames = 3;

/** A member of the player's party as the status shows them. */
interface Member
{
    name: string;
    /** The containers the member is in, nearest first. */
    where: string[];
    /** Whether the member is where the first player character is. */
    withLead: boolean;
    counters: string[];
}

export const status = defineCommand({
    name: "status",
    description: "Show where the game stands. "
        + "It gives the campaign's settings, the player character and companions with their counters and whereabouts, who is with them, open quests, "
        + "the game date, the events due and planned, problems. "
        + "Call it right after instructions at the start of every chat and after a summary, and whenever you need to check where things stand. "
        + "It shows names and numbers only: read pages with show. Read-only, no parameters.",
    group: "game",
    readOnly: true,
    alwaysLoad: true,
    input: z.object({}),

    run(input, context)
    {
        const root = requireCampaign(context.folder);
        const settings = readSettings(root);
        const world = loadWorld(root);
        const characters = world.pages.filter((page) => page.type === "character");
        const players = characters.filter((page) => page.fields.role === "pc");
        const place = players.length > 0 ? placeOf(world, players[0]) : undefined;
        const withLead = (page: Page): boolean => place !== undefined && placeOf(world, page) === place;
        const member = (page: Page): Member => ({ name: characterName(page), where: locate(world, page).chain.map((holder) => holder.name), withLead: withLead(page), counters: countersOf(page) });
        const present = readPresent(root);
        const now = present.date;
        const events = plannedEvents(world);
        const isDue = (event: PlannedEvent): boolean => now !== undefined && isDated(event) && minutesBetween(now, event.date) <= 0;
        return {
            campaign: [settings.name, settings.language, settings.system].filter((part) => part !== undefined),
            missing: missingSettings(settings),
            lines: settings.lines ?? [],
            veils: settings.veils ?? [],
            players: players.map(member),
            companions: characters.filter((page) => page.fields.role === "companion").map(member),
            place,
            alsoThere: characters.filter((page) => !isPartyMember(page) && withLead(page)).map(characterName),
            openQuests: pagesWith(world, "quest", "open"),
            now: now === undefined ? undefined : formatGameDate(now),
            dateProblem: present.problem === undefined ? undefined : problemText(present.problem),
            datedEvents: events.some(isDated),
            dueEvents: events.filter(isDue).map((event) => eventText(event, now)),
            plannedEvents: events.filter((event) => !isDue(event)).map((event) => eventText(event, now)),
            problems: campaignProblems(root, world).length,
        };
    },

    format(result)
    {
        const lead = result.players[0]?.name;
        const companion = (member: Member): string => `${member.name}${member.withLead && lead !== undefined ? `, with ${lead}` : whereabouts(member)}${countersText(member)}`;
        const state = [
            result.campaign.join(" · "),
            missingSettingsNote(result.missing),
            boundariesLine(result.lines, result.veils),
            timeLine(result),
            ...(result.players.length === 0 ? ["No player character yet."] : result.players.map((member) => `PC: ${member.name}${whereabouts(member)}${countersText(member)}`)),
            namesLine("Companions", result.companions.map(companion), "find text companion, type character", "; "),
            namesLine("Also there", result.alsoThere, `show ${result.place}`),
            dueLine(result.dueEvents),
            namesLine("Open quests", result.openQuests, "find text open, type quest"),
            namesLine("Planned events", result.plannedEvents, "find text planned, type event"),
            result.problems === 0 ? "" : `${result.problems} ${result.problems === 1 ? "problem" : "problems"} in the campaign: validate lists them, with how to fix each.`,
        ];
        return state.filter((line) => line !== "").join("\n");
    },
});

/** The game date; or why it cannot be read; or, before there is one, a reminder to set it when some planned event has a date. */
function timeLine(result: { now?: string; dateProblem?: string; datedEvents: boolean; }): string
{
    if (result.now !== undefined) {
        return `Now: ${result.now}`;
    }

    if (result.dateProblem !== undefined) {
        return result.dateProblem;
    }

    return result.datedEvents ? "No game date yet: at the first scene, set it with advance to, at the scene's hour, such as day 1, 18:00." : "";
}

function boundariesLine(lines: string[], veils: string[]): string
{
    const listed = (items: string[]): string => (items.length > 0 ? items.join("; ") : "none");
    return lines.length === 0 && veils.length === 0 ? "" : `Lines: ${listed(lines)} · Veils: ${listed(veils)}`;
}

function characterName(page: Page): string
{
    return page.fields.status === "dead" ? `${page.name} (dead)` : page.name;
}

function placeOf(world: World, page: Page): string | undefined
{
    return locate(world, page).chain[0]?.name;
}

/** ", in Room › Building › Town", or nothing when the member is in no container. */
function whereabouts(member: Member): string
{
    return member.where.length === 0 ? "" : `, in ${member.where.join(" › ")}`;
}

function countersText(member: Member): string
{
    return member.counters.length === 0 ? "" : `: ${member.counters.join(" · ")}`;
}

/** "hp 5/12": the counters on a page as they are written, its fixed fields left out. */
function countersOf(page: Page): string[]
{
    return Object.keys(page.fields).filter((field) => !isStandardField(page.type, field) && readCounter(page.fields[field]) !== undefined).map((field) => `${field} ${String(page.fields[field]).trim()}`);
}

/** The planned events whose date has come: the master plays them first. */
function dueLine(events: string[]): string
{
    const line = namesLine("Due", events, "find text planned, type event");
    return line === "" ? "" : `${line}. ${dueAdvice(events.length)}`;
}

function pagesWith(world: World, type: Page["type"], wanted: string): string[]
{
    return world.pages.filter((page) => page.type === type && page.fields.status === wanted).map((page) => page.name);
}

/** "Label: A · B · C, and 2 more: find …", or nothing when there are none. */
function namesLine(label: string, names: string[], more: string, separator = " · "): string
{
    if (names.length === 0) {
        return "";
    }

    const shown = names.slice(0, shownNames).join(separator);
    return names.length > shownNames ? `${label}: ${shown}, and ${names.length - shownNames} more: ${more}` : `${label}: ${shown}`;
}
