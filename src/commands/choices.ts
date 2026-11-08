import { z } from "zod";
import { type ChoiceItem, type ChoiceSet, pickText, readChoices, readPick, requireCampaign, writeChoices } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, linkTargetName } from "../core/text.ts";
import { parseNotation } from "../dice/index.ts";
import { findPage, isPartyMember, type Page, playerCharacters, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { readOption } from "./ask.ts";
import { textList, textsOf } from "./shared/inputs.ts";
import { situationPart } from "./shared/parts.ts";
import { newDatedLogEntry } from "./shared/time.ts";
import { campaignWorld } from "./shared/world.ts";

// How many choices a set holds, and how many options a choice: the whole list the rules allow, such as every spell a class may learn.
const mostItems = 8;
const mostOptions = 200;
// A link to a page in an option's words: [[Name]], [[Name|words]] or [[Name#Section]].
const pageLink = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;

const itemInput = z.object({
    question: z.string(),
    options: textList,
    pick: z.union([z.number(), z.string()]).optional(),
});

/** What the call did: the set prepared, with how many answers it kept from the one it replaced and whether the player had confirmed that; or the set taken away. */
export type ChoicesResult =
    | { kind: "prepared"; who: string; title: string; replaced: boolean; reopened: boolean; kept: number; dashboard: string; }
    | { kind: "cancelled"; who: string; title: string; };

export const choices = defineCommand({
    name: "choices",
    description: "Prepare choices the player makes on their dashboard when they like, while the story goes on: all a moment asks them to choose, such as a new level. "
        + "One call holds them all, each an item with its question, its options and how many to pick: the whole list the rules allow, never a selection of yours. "
        + "An option that ends with its dice is a roll, rolled by the player as they pick it and logged as theirs; a link to a page opens that page for them to read.",
    group: "game",
    input: z.object({
        title: z.string().describe("what the choices are for, in the player's language, such as the level they reach"),
        who: z.string().optional().describe("who chooses: the player's character, or a companion the player made; the only player character, if left out"),
        items: z.preprocess(itemsInText, z.array(itemInput)).optional().describe(
            "the choices in order, each {question, options, pick}: pick is how many the player picks, 1 if left out, or a range such as 0-2 when some are optional",
        ),
        cancel: z.boolean().optional().describe("true to take away the set with this title and who"),
    }),

    run(input, context): ChoicesResult
    {
        const root = requireCampaign(context.folder);
        const title = input.title.trim();

        if (title === "") {
            throw new Error("Give the title: what the choices are for, in the player's language, such as the level they reach.");
        }

        if (context.dashboard === undefined) {
            throw new Error("The player has no dashboard here: ask each choice in the chat, with ask where it fits, as your instructions say. Nothing was prepared.");
        }

        const world = campaignWorld(root, context);
        const who = chooser(world, input.who);
        const sets = readChoices(root);
        const index = sets.findIndex((set) => comparableText(set.who) === comparableText(who) && comparableText(set.title) === comparableText(title));

        if (input.cancel === true) {
            if (index === -1) {
                throw new Error(`No choices of ${who} are titled ${title}: ${namesOf(sets, who)}. Nothing changed.`);
            }

            writeChoices(root, sets.filter((_, at) => at !== index));
            appendLogEntry(root, newDatedLogEntry(root, context, "choices-cancelled", "public", { who, title }));
            return { kind: "cancelled", who, title };
        }

        if (input.items === undefined || input.items.length === 0 || input.items.length > mostItems) {
            throw new Error(`Give from 1 to ${mostItems} items, each {question, options, pick}: all the choices of the moment in one call. Nothing was prepared.`);
        }

        const before = index === -1 ? undefined : sets[index];
        const items = input.items.map((item) => readItem(world, item));
        const kept = items.map((item) => keptAnswer(item, before)).filter((answer) => answer !== undefined).length;
        // A new id for a set that takes another's place: a page that shows the old one confirms nothing, and a chat that heard the old one hears this one.
        const set: ChoiceSet = {
            id: context.newId(),
            title,
            who,
            made: context.now().toISOString().slice(0, 10),
            items: items.map((item) => ({ ...item, ...keptAnswer(item, before) })),
        };
        writeChoices(root, index === -1 ? [...sets, set] : sets.map((other, at) => (at === index ? set : other)));
        appendLogEntry(root, newDatedLogEntry(root, context, "choices", "public", { who, title, items: items.map((item) => item.question) }));
        return { kind: "prepared", who, title, replaced: before !== undefined, reopened: before?.confirmed !== undefined, kept, dashboard: context.dashboard };
    },

    format(result)
    {
        if (result.kind === "cancelled") {
            return `The choices of ${result.who}, ${result.title}, are taken away from the dashboard.`;
        }

        const kept = result.replaced
            ? ` They take the place of the set of the same title, keeping ${result.kept} of the player's answers${result.reopened ? "; the player had confirmed it, and it waits for them again" : ""}.`
            : "";
        return `The choices of ${result.who}, ${result.title}, wait on the player's dashboard.${kept} Tell the player so in one line, out of the story, without listing them, `
            + `with the dashboard's link if they do not have it open: ${result.dashboard}. Then go on with the story; their answers reach you at the head of a later call. `
            + "Called again with this title, choices takes the place of this set, keeping the answers of the items that stay the same.";
    },
});

/**
 * What status says of the choices on the dashboard (D-556): those waiting, which the player knows of, to leave to them; those the player confirmed and this chat
 * has not heard of, with their answers to write.
 */
export function choicesNotes(root: string, context: Context, world: World, system: GameSystem | undefined): string[]
{
    const waiting = readChoices(root).filter((set) => set.confirmed === undefined);
    const dead = (who: string): boolean => findPage(world, who)?.fields.status === "dead";
    return [
        ...waiting.map((set) =>
            `Waiting on the dashboard since ${set.made}: ${set.who}'s choices, ${set.title}; `
            + (dead(set.who) ? `${set.who} is dead: take them away with choices, cancel true.` : "the player knows: leave them to them.")
        ),
        ...confirmedNotes(root, context, world, system),
    ];
}

/**
 * The answers of the sets the player confirmed, each once in a chat, with the part on what a level gives once (D-556): they stay in state.yaml, for a chat that
 * closes before the master writes them, until the character's level rises.
 */
export function confirmedNotes(root: string, context: Context, world: World, system: GameSystem | undefined): string[]
{
    const key = (set: ChoiceSet): string => `choices:${set.id}`;
    const untold = readChoices(root).filter((set) => set.confirmed !== undefined && context.told?.has(key(set)) !== true);
    untold.forEach((set) => context.told?.add(key(set)));
    // In a game without levels nothing rises to take them away: the master does, once written.
    const levels = world.system?.progression?.experience !== undefined;
    const part = untold.length === 0 ? "" : situationPart("level-up", context, system);
    return [...untold.map((set) => confirmedNote(set, levels)), ...(part === "" ? [] : [part])];
}

/**
 * The player's answers to a set they confirmed, for the master to write: "Bruna's choices for Livello 3, confirmed on the dashboard: Q: A; Q: A, B."; in a game
 * without levels, with how to take them away once written.
 */
export function confirmedNote(set: ChoiceSet, levels: boolean): string
{
    const answers = set.items.map((item) => `${item.question}: ${(item.answer ?? []).length === 0 ? "none" : (item.answer ?? []).join(", ")}${item.rolled === undefined ? "" : ` (${item.rolled})`}`)
        .join("; ");
    return `${set.who}'s choices for ${set.title}, confirmed on the dashboard: ${answers}. Write them on the sheet as the rules say, then tell it in the story; `
        + `an answer against the rules, ask the player about it.${levels ? "" : " Once written, take them away with choices, cancel true."}`;
}

/** The pages the options of the choices waiting name (VIEW-2): the player reads them on the dashboard to choose, whether the character knows them or not. */
export function offeredPages(root: string, world: World): Page[]
{
    const names = readChoices(root).filter((set) => set.confirmed === undefined).flatMap((set) => set.items.flatMap((item) => item.options.flatMap((option) => optionParts(option).pages)));
    return [...new Set(names.flatMap((name) => findPage(world, name) ?? []))];
}

/** The words the player sees for a set's options, its pages named and its rolls: what a roll's dice are, the pages its links name. */
export function optionParts(option: string): { label: string; notation?: string; pages: string[]; }
{
    const read = readOption(option);
    const pages = [...option.matchAll(pageLink)].map((found) => linkTargetName(found[1]));
    return { label: read.label, ...(read.notation === undefined ? {} : { notation: read.notation }), pages };
}

// The items as JSON text too, as an MCP client or a command line sends them, alone or as a list of one; anything else is left to the input's own check.
function itemsInText(value: unknown): unknown
{
    const text = typeof value === "string" ? value : Array.isArray(value) && value.length === 1 && typeof value[0] === "string" ? value[0] : undefined;

    if (text === undefined) {
        return value;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return value;
    }
}

/** The character who chooses: one of the party, the player's own or a companion; the only living player character when none is named. */
function chooser(world: World, who: string | undefined): string
{
    if (who === undefined || who.trim() === "") {
        const living = playerCharacters(world).filter((page) => page.fields.status !== "dead");

        if (living.length !== 1) {
            throw new Error(`Name who chooses: ${living.length === 0 ? "the campaign has no living player character" : living.map((page) => page.name).join(" or ")}.`);
        }

        return living[0].name;
    }

    const page: Page | undefined = findPage(world, who);

    if (page === undefined || !isPartyMember(page)) {
        const party = world.pages.filter(isPartyMember).map((member) => member.name);
        throw new Error(`${who} is no one of the party: the choices are for ${party.length === 0 ? "the player's character" : party.join(", ")}.`);
    }

    return page.name;
}

/** An item as the master gives it, checked: a question, options each once, a pick they allow, rolls only where one option is picked, pages that exist. */
function readItem(world: World, given: z.infer<typeof itemInput>): ChoiceItem
{
    const question = given.question.trim();
    const options = textsOf(given.options).map((option) => option.trim());

    if (question === "") {
        throw new Error("Give each item its question, in the player's language. Nothing was prepared.");
    }

    if (options.length < 2 || options.length > mostOptions) {
        throw new Error(
            options.length === 1
                ? `${question} has one option alone, ${options[0]}: that is no choice; write it yourself and tell the player. Nothing was prepared.`
                : `${question} has ${options.length} options: give from 2 to ${mostOptions}. Nothing was prepared.`,
        );
    }

    const repeated = options.find((option, index) => options.findIndex((other) => comparableText(other) === comparableText(option)) !== index);

    if (repeated !== undefined) {
        throw new Error(`${question} gives ${repeated} twice: each option once. Nothing was prepared.`);
    }

    const pick = readPick(given.pick);

    if (pick === undefined || pick.most === 0 || pick.most > options.length) {
        throw new Error(`${question}: pick ${given.pick ?? ""} does not fit ${options.length} options: give how many, such as 2, or a range such as 0-2. Nothing was prepared.`);
    }

    const parts = options.map(optionParts);

    if (parts.some((part) => part.notation !== undefined) && (pick.least !== 1 || pick.most !== 1)) {
        throw new Error(`${question} has a roll among its options: such an item picks one, so give pick 1. Nothing was prepared.`);
    }

    // Dice the dashboard cannot roll, such as a field of the sheet, refused now rather than at the player's click.
    for (const [index, part] of parts.entries()) {
        if (part.notation === undefined) {
            continue;
        }

        try {
            parseNotation(part.notation);
        } catch (error) {
            throw new Error(`${question}: ${options[index]}: ${error instanceof Error ? error.message : String(error)} Nothing was prepared.`);
        }
    }

    const missing = parts.flatMap((part) => part.pages).find((name) => findPage(world, name) === undefined);

    if (missing !== undefined) {
        throw new Error(`[[${missing}]] is no page of the campaign: link a page by the name find gives, before its title in «», or write it without brackets. Nothing was prepared.`);
    }

    return { question, options, pick };
}

/** The player's answer to an item of the set it replaces, when that item stays the same: its question, options and pick. */
function keptAnswer(item: ChoiceItem, before: ChoiceSet | undefined): Pick<ChoiceItem, "answer" | "rolled"> | undefined
{
    const same = before?.items.find((other) =>
        comparableText(other.question) === comparableText(item.question)
        && pickText(other.pick) === pickText(item.pick)
        && other.options.length === item.options.length
        && other.options.every((option, index) => option === item.options[index])
    );
    return same?.answer === undefined ? undefined : { answer: same.answer, ...(same.rolled === undefined ? {} : { rolled: same.rolled }) };
}

/** The titles of a character's sets, for a refusal. */
function namesOf(sets: ChoiceSet[], who: string): string
{
    const titles = sets.filter((set) => comparableText(set.who) === comparableText(who)).map((set) => set.title);
    return titles.length === 0 ? `${who} has none waiting` : `${who} has ${titles.join(", ")}`;
}
