// The scene command: input check, actions dispatched, results formatted; now, hostile and calm
import { z } from "zod";
import { requireCampaign } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { defineCommand } from "../../core/registry.ts";
import { sameName } from "../../core/text.ts";
import { isEmptyField, linkListItems, parsePageReference } from "../../pages/index.ts";
import { type Scene, sceneTypes } from "../../scene/index.ts";
import { campaignWorld } from "../shared/campaign/world.ts";
import { textList } from "../shared/inputs.ts";
import { openScene, updateScene } from "../shared/scene/scene.ts";
import { countersText } from "../shared/sheet/counters.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import { close, closedText } from "./close.ts";
import { memberNames, membersText } from "./members.ts";
import { addTo, openNew } from "./open.ts";
import { type Action, actions, type Brought, type SceneInput, type SceneResult } from "./result.ts";
import { leave, passTurn, setOrder, turnText, useOfTurn, withActing } from "./turns.ts";

// The parameters each action takes; any other is refused, so that nothing given is silently ignored.
const actionParameters: Record<Action, string[]> = {
    open: ["title", "type", "place", "with", "creatures", "now", "seen"],
    add: ["with", "creatures", "seen"],
    leave: ["who"],
    order: ["order"],
    next: [],
    use: ["who", "uses", "by"],
    now: ["now"],
    hostile: ["who"],
    calm: ["who"],
    close: ["summary"],
};

/** The input as given: a list may come as one text. */
type GivenInput = Omit<SceneInput, "with" | "creatures" | "who" | "order" | "seen"> & {
    with?: string | string[];
    creatures?: string | string[] | Record<string, number>;
    who?: string | string[];
    order?: string | string[];
    seen?: string | string[] | Record<string, string>;
};

export const scene = defineCommand({
    name: "scene",
    description: "Open, run and close a scene of the story. "
        + "Creatures come as numbered copies, such as Annegato 1: a copy holds only what changes, the rest is read from the creature. "
        + "At open, whoever of the party is elsewhere moves to the scene's place, except in a travel scene. "
        + "order sets who takes turns, after rolling for it if the game does; next passes the turn; use marks what one uses of a turn: the engine counts the uses the game declares and refuses one too many. "
        + "now is the line the player's dashboard shows: give it at open too, and change it as the scene turns. "
        + "hostile marks who attacks the party, calm takes the mark off; seen gives what the character sees of someone, which the player sees instead of the name, "
        + "even one they know, until the scene closes or reveal names them; the player's dashboard shows both. "
        + "close ends the scene with a summary the player may read. Change a copy's counters with change, as for a page. "
        + 'Example: action open, title "Scontro all\'ossario", type combat, creatures {"Annegato": 2}.',
    group: "game",
    positionals: ["action"],
    input: z.object({
        action: z.enum(actions).describe("open, add, leave, order, next, use, now, hostile, calm or close"),
        title: z.string().optional().describe("open: the scene's title"),
        type: z.enum(sceneTypes).optional().describe(`open: ${sceneTypes.join(", ")}`),
        place: z.string().optional().describe("open: the place, such as [[Ossario]]; the character's if left out"),
        with: textList.optional().describe("open, add: the characters in the scene, the player character included, such as [[Lena]]; at open, the character and the companions with them if left out"),
        creatures: z.union([textList, z.record(z.string(), z.number().int())]).optional().describe('open, add: creatures as numbered copies: Annegato=2 (Annegato alone is one), or through MCP an object such as {"Annegato": 2}'),
        who: textList.optional().describe("leave: who leaves the scene; hostile, calm: who attacks the party, or stops; use: who uses it; characters or copies, such as Annegato 2"),
        uses: z.string().optional().describe("use: what of a turn, by the game's names, such as {{uses}}"),
        by: z.string().optional().describe("use: what gives one more, or lets it in another's turn, such as a feature"),
        order: textList.optional().describe("order: who takes turns, in order; those left out (fallen, fled) take none"),
        now: z.string().optional().describe('open, now: what is happening now, in one line as the player sees it, such as "The bandits overturn the tables"; never what they cannot see'),
        summary: z.string().optional().describe("close: what happened, in one or two sentences, as the player saw it"),
        seen: z.union([textList, z.record(z.string(), z.string())]).optional().describe(
            "open, add: what the character sees of someone in the scene, by its page or creature, in two or three words, never its kind when that is a secret; the player sees it instead of the name: "
                + 'Bandito=brigante incappucciato, or through MCP an object such as {"Varro": "il mugnaio"}',
        ),
    }),

    run(given, context): SceneResult
    {
        const root = requireCampaign(context.folder);
        const input = asLists(given);
        checkParameters(input);
        const world = campaignWorld(root, context);

        if (input.action === "close") {
            return close(root, world, input.summary ?? "", context);
        }

        const current = openScene(root);

        if (input.action === "open") {
            return openNew(root, world, input, context, current);
        }

        if (current === undefined) {
            throw new Error("No scene is open: open one with scene open, giving its title and type.");
        }

        switch (input.action) {
            case "now":
                return tellNow(root, input.now ?? "", context, current);
            case "add":
                return addTo(root, world, input, context, current);
            case "leave":
                return withActing(root, context, current, leave(root, world, input.who ?? [], context, current));
            case "hostile":
            case "calm":
                return markHostile(root, input.who ?? [], input.action === "hostile", context, current);
            case "order":
                return withActing(root, context, current, setOrder(root, world, input.order ?? [], context, current));
            case "use":
                return useOfTurn(root, world, input, context, current);
            default:
                return withActing(root, context, current, passTurn(root, world, context, current));
        }
    },

    format(result)
    {
        switch (result.action) {
            case "open": {
                const when = result.opened === undefined ? "" : `, ${result.opened}`;
                const where = result.place === undefined ? "" : ` at ${result.place}`;
                const members = result.members.length === 0 ? "No one in it yet: add who is there with scene add." : `In it: ${membersText(result.members)}.`;
                const around = result.around === "" ? undefined : `Here: ${result.around}.`;
                const part = result.part === "" ? undefined : result.part;
                return `Scene opened${when}: ${result.title} (${result.type})${where}. ${members}${broughtText(result, result.place)}${lineOf(around)}${lineOf(part)}`;
            }

            case "add": {
                const last = result.ordered ? " They take their turns last: change the order with scene order if needed." : "";
                const added = result.members.length === 0 ? "" : `Added to ${result.title}: ${membersText(result.members)}.${last}`;
                const seen = result.seen === undefined ? "" : `Seen: ${Object.entries(result.seen).map(([name, said]) => `${name} as ${said}`).join(", ")}.`;
                return `${[added, seen].filter((line) => line !== "").join(" ")}${broughtText(result, result.place)}`;
            }

            case "leave": {
                const turns = result.turns === undefined ? (result.noTurns ? "\nNo one takes turns now." : "") : `\n${turnText(result.turns)}`;
                const left = result.left.map((member) => (Object.keys(member.counters).length === 0 ? member.name : `${member.name} (${countersText(member.counters)})`));
                return `${left.join(", ")} left the scene.${turns}${actingText(result.acting)}${endedText(result.ended)}`;
            }

            case "order":
                return `Order: ${result.order.join(" · ")}.${result.noTurn.length === 0 ? "" : ` No turn: ${result.noTurn.join(", ")}.`}\n${turnText(result)}${actingText(result.acting)}${endedText(result.ended)}`;
            case "next":
                return `${turnText(result)}${actingText(result.acting)}${endedText(result.ended)}`;
            // Who is in it, so that the master sees a scene the story has left (playtest 19): another place or other people make a new one.
            case "now":
                return `${result.title}, with ${result.members.length === 0 ? "no one" : result.members.join(", ")}: the player's dashboard now shows "${result.now}". `
                    + "If the story has moved elsewhere or to other people, close this scene and open the next.";
            case "use":
                return result.line;
            case "hostile":
            case "calm":
                return markedText(result);

            default:
                return closedText(result);
        }
    },
});

/** Lists as lists: one text is a list of one, or of its links when it gives them separated by commas; an empty text, list or object counts as left out (SCN-8). */
function asLists(given: GivenInput): SceneInput
{
    const items = (texts: string[]): string[] => texts.flatMap((text) => linkListItems(text) ?? [text]);

    const list = <Value extends object>(value: string | Value | undefined): Value | string[] | undefined => {
        if (isEmptyField(value) || (typeof value === "object" && Object.keys(value as object).length === 0)) {
            return undefined;
        }

        return typeof value === "string" ? items([value]) : Array.isArray(value) ? items(value) : value;
    };

    return { ...given, with: list(given.with), creatures: list(given.creatures), who: list(given.who), order: list(given.order), seen: list(given.seen) };
}

function checkParameters(input: SceneInput): void
{
    const allowed = actionParameters[input.action];

    const given = (name: string): boolean => {
        const value = input[name as keyof SceneInput];
        return !isEmptyField(value) && !(Array.isArray(value) && value.length === 0) && !(typeof value === "object" && Object.keys(value).length === 0);
    };

    const extra = Object.keys(input).filter((name) => name !== "action" && given(name) && !allowed.includes(name));

    if (extra.length > 0) {
        throw new Error(`scene ${input.action} does not take ${extra.join(", ")}: it takes ${allowed.length === 0 ? "nothing else" : allowed.join(", ")}.`);
    }
}

/** The line of what is happening now, which the player's dashboard shows (SCN-11): a public line of the log, out of the diary. */
function tellNow(root: string, now: string, context: Context, current: Scene): SceneResult
{
    if (now.trim() === "") {
        throw new Error('Give now: what is happening, in one line as the player sees it, such as "The bandits overturn the tables".');
    }

    updateScene(root, [[["now"], now.trim()]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-now", "public", { title: current.title, now: now.trim() }));
    return { action: "now", title: current.title, now: now.trim(), members: memberNames(current) };
}

/**
 * Marks who attacks the party, or takes the mark off (D-415): only in a fight, and only who is in the scene. The player's dashboard shows it, so that a token
 * changes only when the master says so.
 */
function markHostile(root: string, who: string[], hostile: boolean, context: Context, current: Scene): SceneResult
{
    if (current.type !== "combat") {
        throw new Error(`${current.title} is a ${current.type} scene: hostile and calm mark who fights in a combat scene. When a fight breaks out, close this one and open one of type combat.`);
    }

    if (who.length === 0) {
        throw new Error(`Give who ${hostile ? "attacks the party" : "stops attacking"}, such as who "Annegato 2".`);
    }

    const members = memberNames(current);
    const marked = [
        ...new Set(who.map((name) => {
            const member = sameName(members, parsePageReference(name).name);

            if (member === undefined) {
                throw new Error(`${name} is not in the scene. In it: ${members.length === 0 ? "no one" : members.join(", ")}.`);
            }

            return member;
        })),
    ];
    const before = current.hostile ?? [];
    const now = hostile ? [...before, ...marked.filter((name) => !before.includes(name))] : before.filter((name) => !marked.includes(name));
    updateScene(root, [[["hostile"], now.length === 0 ? undefined : now]]);
    appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: current.title, [hostile ? "hostile" : "calm"]: marked }));
    return { action: hostile ? "hostile" : "calm", title: current.title, marked, hostile: now };
}

/** "Marked hostile: Annegato 1. Hostile now: Annegato 1, Annegato 2." (D-415). */
function markedText(result: { action: "hostile" | "calm"; marked: string[]; hostile: string[]; }): string
{
    const now = result.hostile.length === 0 ? "No one is hostile now." : `Hostile now: ${result.hostile.join(", ")}.`;
    return `${result.action === "hostile" ? "Marked hostile" : "Calm"}: ${result.marked.join(", ")}. ${now}`;
}

/** "\nMoved into Ossario: Ennio, Lena.", with what that set off, or nothing when no one moved (CON-6). */
function broughtText(result: Brought, place: string | undefined): string
{
    const moved = result.moved.length === 0 ? [] : [`Moved into ${place ?? "the scene's place"}: ${result.moved.join(", ")}.`];
    return [...moved, ...result.notes].map((line) => `\n${line}`).join("");
}

function actingText(acting: string | undefined): string
{
    return acting === undefined ? "" : `\n${acting}`;
}

/** "\nEnded: Spaventato on Annegato 2.", or nothing when no effect ended. */
function endedText(ended: string[]): string
{
    return ended.length === 0 ? "" : `\nEnded: ${ended.join(" · ")}.`;
}

/** A note on a line of its own, or nothing. */
function lineOf(note: string | undefined): string
{
    return note === undefined ? "" : `\n${note}`;
}
