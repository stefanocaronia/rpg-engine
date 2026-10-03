import { z } from "zod";
import { missingSettings, readSettings, requireCampaign } from "../campaign/index.ts";
import { defineCommand } from "../core/registry.ts";
import { readCounter } from "../counters/index.ts";
import { masterInstructions } from "../instructions/index.ts";
import { isPartyMember, isStandardField, loadWorld, locate, type Page, type World } from "../pages/index.ts";
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
    description: "Show the campaign's state and your instructions as game master. "
        + "Call it before your first reply in every chat, and again after the conversation has been summarized. "
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
            plannedEvents: pagesWith(world, "event", "planned"),
            problems: campaignProblems(root, world).length,
            instructions: masterInstructions(),
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
            ...(result.players.length === 0 ? ["No player character yet."] : result.players.map((member) => `PC: ${member.name}${whereabouts(member)}${countersText(member)}`)),
            namesLine("Companions", result.companions.map(companion), "find text companion, type character", "; "),
            namesLine("Also there", result.alsoThere, `show ${result.place}`),
            namesLine("Open quests", result.openQuests, "find text open, type quest"),
            namesLine("Planned events", result.plannedEvents, "find text planned, type event"),
            result.problems === 0 ? "" : `${result.problems} ${result.problems === 1 ? "problem" : "problems"} in the campaign: validate lists them, with how to fix each.`,
        ];
        return [state.filter((line) => line !== "").join("\n"), `# Your instructions\n\n${result.instructions}`].join("\n\n");
    },
});

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
